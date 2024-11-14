package org.openmetadata.service.apps.bundles.searchIndex;

import static org.openmetadata.common.utils.CommonUtil.nullOrEmpty;
import static org.openmetadata.service.Entity.API_COLLCECTION;
import static org.openmetadata.service.Entity.API_ENDPOINT;
import static org.openmetadata.service.Entity.API_SERVICE;
import static org.openmetadata.service.Entity.CHART;
import static org.openmetadata.service.Entity.CLASSIFICATION;
import static org.openmetadata.service.Entity.CONTAINER;
import static org.openmetadata.service.Entity.DASHBOARD;
import static org.openmetadata.service.Entity.DASHBOARD_DATA_MODEL;
import static org.openmetadata.service.Entity.DASHBOARD_SERVICE;
import static org.openmetadata.service.Entity.DATABASE;
import static org.openmetadata.service.Entity.DATABASE_SCHEMA;
import static org.openmetadata.service.Entity.DATABASE_SERVICE;
import static org.openmetadata.service.Entity.DATA_PRODUCT;
import static org.openmetadata.service.Entity.DOMAIN;
import static org.openmetadata.service.Entity.ENTITY_REPORT_DATA;
import static org.openmetadata.service.Entity.GLOSSARY;
import static org.openmetadata.service.Entity.GLOSSARY_TERM;
import static org.openmetadata.service.Entity.INGESTION_PIPELINE;
import static org.openmetadata.service.Entity.MESSAGING_SERVICE;
import static org.openmetadata.service.Entity.METADATA_SERVICE;
import static org.openmetadata.service.Entity.METRIC;
import static org.openmetadata.service.Entity.MLMODEL;
import static org.openmetadata.service.Entity.MLMODEL_SERVICE;
import static org.openmetadata.service.Entity.PIPELINE;
import static org.openmetadata.service.Entity.PIPELINE_SERVICE;
import static org.openmetadata.service.Entity.QUERY;
import static org.openmetadata.service.Entity.SEARCH_INDEX;
import static org.openmetadata.service.Entity.SEARCH_SERVICE;
import static org.openmetadata.service.Entity.STORAGE_SERVICE;
import static org.openmetadata.service.Entity.STORED_PROCEDURE;
import static org.openmetadata.service.Entity.TABLE;
import static org.openmetadata.service.Entity.TAG;
import static org.openmetadata.service.Entity.TEAM;
import static org.openmetadata.service.Entity.TEST_CASE;
import static org.openmetadata.service.Entity.TEST_CASE_RESOLUTION_STATUS;
import static org.openmetadata.service.Entity.TEST_CASE_RESULT;
import static org.openmetadata.service.Entity.TEST_SUITE;
import static org.openmetadata.service.Entity.TOPIC;
import static org.openmetadata.service.Entity.USER;
import static org.openmetadata.service.Entity.WEB_ANALYTIC_ENTITY_VIEW_REPORT_DATA;
import static org.openmetadata.service.Entity.WEB_ANALYTIC_USER_ACTIVITY_REPORT_DATA;
import static org.openmetadata.service.apps.scheduler.AbstractOmAppJobListener.APP_RUN_STATS;
import static org.openmetadata.service.apps.scheduler.AbstractOmAppJobListener.WEBSOCKET_STATUS_CHANNEL;
import static org.openmetadata.service.apps.scheduler.AppScheduler.ON_DEMAND_JOB;
import static org.openmetadata.service.socket.WebSocketManager.SEARCH_INDEX_JOB_BROADCAST_CHANNEL;
import static org.openmetadata.service.workflows.searchIndex.ReindexingUtil.ENTITY_TYPE_KEY;
import static org.openmetadata.service.workflows.searchIndex.ReindexingUtil.isDataInsightIndex;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang.exception.ExceptionUtils;
import org.jetbrains.annotations.NotNull;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.EntityTimeSeriesInterface;
import org.openmetadata.schema.analytics.ReportData;
import org.openmetadata.schema.entity.app.App;
import org.openmetadata.schema.entity.app.AppRunRecord;
import org.openmetadata.schema.entity.app.FailureContext;
import org.openmetadata.schema.entity.app.SuccessContext;
import org.openmetadata.schema.service.configuration.elasticsearch.ElasticSearchConfiguration;
import org.openmetadata.schema.system.EventPublisherJob;
import org.openmetadata.schema.system.IndexingError;
import org.openmetadata.schema.system.Stats;
import org.openmetadata.schema.system.StepStats;
import org.openmetadata.service.Entity;
import org.openmetadata.service.apps.AbstractNativeApplication;
import org.openmetadata.service.exception.SearchIndexException;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.jdbi3.EntityRepository;
import org.openmetadata.service.jdbi3.EntityTimeSeriesRepository;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.search.SearchRepository;
import org.openmetadata.service.search.models.IndexMapping;
import org.openmetadata.service.socket.WebSocketManager;
import org.openmetadata.service.util.FullyQualifiedName;
import org.openmetadata.service.util.JsonUtils;
import org.openmetadata.service.util.RestUtil;
import org.openmetadata.service.util.ResultList;
import org.openmetadata.service.workflows.interfaces.Source;
import org.openmetadata.service.workflows.searchIndex.PaginatedEntitiesSource;
import org.openmetadata.service.workflows.searchIndex.PaginatedEntityTimeSeriesSource;
import org.quartz.JobExecutionContext;

@Slf4j
public class SearchIndexApp extends AbstractNativeApplication {

  private static final String ALL = "all";
  public static final Set<String> ALL_ENTITIES =
      Set.of(
          TABLE,
          DASHBOARD,
          TOPIC,
          PIPELINE,
          INGESTION_PIPELINE,
          SEARCH_INDEX,
          USER,
          TEAM,
          GLOSSARY,
          GLOSSARY_TERM,
          MLMODEL,
          TAG,
          CLASSIFICATION,
          QUERY,
          CONTAINER,
          DATABASE,
          DATABASE_SCHEMA,
          TEST_CASE,
          TEST_SUITE,
          CHART,
          DASHBOARD_DATA_MODEL,
          DATABASE_SERVICE,
          MESSAGING_SERVICE,
          DASHBOARD_SERVICE,
          PIPELINE_SERVICE,
          MLMODEL_SERVICE,
          STORAGE_SERVICE,
          METADATA_SERVICE,
          SEARCH_SERVICE,
          ENTITY_REPORT_DATA,
          WEB_ANALYTIC_ENTITY_VIEW_REPORT_DATA,
          WEB_ANALYTIC_USER_ACTIVITY_REPORT_DATA,
          DOMAIN,
          STORED_PROCEDURE,
          DATA_PRODUCT,
          TEST_CASE_RESOLUTION_STATUS,
          TEST_CASE_RESULT,
          API_SERVICE,
          API_ENDPOINT,
          API_COLLCECTION,
          METRIC);

  public static final Set<String> TIME_SERIES_ENTITIES =
      Set.of(
          ReportData.ReportDataType.ENTITY_REPORT_DATA.value(),
          ReportData.ReportDataType.RAW_COST_ANALYSIS_REPORT_DATA.value(),
          ReportData.ReportDataType.WEB_ANALYTIC_USER_ACTIVITY_REPORT_DATA.value(),
          ReportData.ReportDataType.WEB_ANALYTIC_ENTITY_VIEW_REPORT_DATA.value(),
          ReportData.ReportDataType.AGGREGATED_COST_ANALYSIS_REPORT_DATA.value(),
          TEST_CASE_RESOLUTION_STATUS,
          TEST_CASE_RESULT);

  // Constants to replace magic numbers
  private BulkSink searchIndexSink;

  @Getter private EventPublisherJob jobData;
  private final Object jobDataLock = new Object();
  private volatile boolean stopped = false;
  private ExecutorService consumerExecutor;
  private ExecutorService producerExecutor;
  private ExecutorService jobExecutor = Executors.newFixedThreadPool(2);
  private BlockingQueue<IndexingTask<?>> taskQueue = new LinkedBlockingQueue<>(100);
  private final AtomicReference<Stats> searchIndexStats = new AtomicReference<>();
  private final AtomicReference<Integer> batchSize = new AtomicReference<>(5);

  public SearchIndexApp(CollectionDAO collectionDAO, SearchRepository searchRepository) {
    super(collectionDAO, searchRepository);
  }

  @Override
  public void init(App app) {
    super.init(app);
    EventPublisherJob request =
        JsonUtils.convertValue(app.getAppConfiguration(), EventPublisherJob.class)
            .withStats(new Stats());

    if (request.getEntities().contains(ALL)) {
      request.setEntities(ALL_ENTITIES);
    }

    jobData = request;
    LOG.info("Initialized SearchIndexApp with entities: {}", jobData.getEntities());
  }

  @Override
  public void startApp(JobExecutionContext jobExecutionContext) {
    try {
      initializeJob(jobExecutionContext);
      String runType =
          (String) jobExecutionContext.getJobDetail().getJobDataMap().get("triggerType");
      if (!ON_DEMAND_JOB.equals(runType)) {
        jobData.setRecreateIndex(false);
      }

      performReindex(jobExecutionContext);
    } catch (InterruptedException ex) {
      Thread.currentThread().interrupt();
      handleJobFailure(ex);
    } catch (Exception ex) {
      handleJobFailure(ex);
    } finally {
      sendUpdates(jobExecutionContext);
    }
  }

  /**
   * Cleans up stale jobs from previous runs.
   */
  private void cleanUpStaleJobsFromRuns() {
    try {
      collectionDAO
          .appExtensionTimeSeriesDao()
          .markStaleEntriesStopped(getApp().getId().toString());
      LOG.debug("Cleaned up stale jobs.");
    } catch (Exception ex) {
      LOG.error("Failed in marking stale entries as stopped.", ex);
    }
  }

  private void initializeJob(JobExecutionContext jobExecutionContext) {
    cleanUpStaleJobsFromRuns();

    LOG.info("Executing Reindexing Job with JobData: {}", jobData);
    batchSize.set(jobData.getBatchSize());
    jobData.setStatus(EventPublisherJob.Status.RUNNING);

    LOG.debug("Initializing job statistics.");
    searchIndexStats.set(initializeTotalRecords(jobData.getEntities()));
    jobData.setStats(searchIndexStats.get());
    sendUpdates(jobExecutionContext);

    ElasticSearchConfiguration.SearchType searchType = searchRepository.getSearchType();
    LOG.info("Initializing searchIndexSink with search type: {}", searchType);

    if (searchType.equals(ElasticSearchConfiguration.SearchType.OPENSEARCH)) {
      this.searchIndexSink =
          new OpenSearchIndexSink(
              searchRepository.getSearchClient(),
              jobData.getPayLoadSize(),
              jobData.getMaxConcurrentRequests(),
              jobData.getMaxRetries(),
              jobData.getInitialBackoff(),
              jobData.getMaxBackoff());
      LOG.info("Initialized OpenSearchIndexSink.");
    } else {
      this.searchIndexSink =
          new ElasticSearchIndexSink(
              searchRepository.getSearchClient(),
              jobData.getPayLoadSize(),
              jobData.getMaxConcurrentRequests(),
              jobData.getMaxRetries(),
              jobData.getInitialBackoff(),
              jobData.getMaxBackoff());
      LOG.info("Initialized ElasticSearchIndexSink.");
    }
  }

  public void updateRecordToDbAndNotify(JobExecutionContext jobExecutionContext) {
    AppRunRecord appRecord = getJobRecord(jobExecutionContext);

    appRecord.setStatus(AppRunRecord.Status.fromValue(jobData.getStatus().value()));
    if (jobData.getFailure() != null) {
      appRecord.setFailureContext(
          new FailureContext().withAdditionalProperty("failure", jobData.getFailure()));
    }
    if (jobData.getStats() != null) {
      appRecord.setSuccessContext(
          new SuccessContext().withAdditionalProperty("stats", jobData.getStats()));
    }

    if (WebSocketManager.getInstance() != null) {
      WebSocketManager.getInstance()
          .broadCastMessageToAll(
              SEARCH_INDEX_JOB_BROADCAST_CHANNEL, JsonUtils.pojoToJson(appRecord));
      LOG.debug("Broad-casted job updates via WebSocket.");
    }

    pushAppStatusUpdates(jobExecutionContext, appRecord, true);
    LOG.debug("Updated AppRunRecord in DB: {}", appRecord);
  }

  private void performReindex(JobExecutionContext jobExecutionContext) throws InterruptedException {
    int numProducers = jobData.getProducerThreads();
    int numConsumers = jobData.getConsumerThreads();
    LOG.info("Starting reindexing with {} producers and {} consumers.", numProducers, numConsumers);

    taskQueue = new LinkedBlockingQueue<>(jobData.getQueueSize());
    consumerExecutor =
        new ThreadPoolExecutor(
            numConsumers,
            numConsumers,
            0L,
            TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<>(jobData.getQueueSize()));
    producerExecutor =
        new ThreadPoolExecutor(
            numProducers,
            numProducers,
            0L,
            TimeUnit.MILLISECONDS,
            new LinkedBlockingQueue<>(jobData.getQueueSize()),
            new ThreadPoolExecutor.CallerRunsPolicy());

    try {
      processEntityReindex(jobExecutionContext);
    } catch (Exception e) {
      LOG.error("Error during reindexing process.", e);
      throw e;
    } finally {
      shutdownExecutor(jobExecutor, "JobExecutor", 20, TimeUnit.SECONDS);
      shutdownExecutor(producerExecutor, "ReaderExecutor", 1, TimeUnit.MINUTES);
      shutdownExecutor(consumerExecutor, "ConsumerExecutor", 20, TimeUnit.SECONDS);
    }
  }

  private void processEntityReindex(JobExecutionContext jobExecutionContext)
      throws InterruptedException {
    int numConsumers = jobData.getConsumerThreads();
    CountDownLatch producerLatch = new CountDownLatch(getTotalLatchCount(jobData.getEntities()));
    jobExecutor.submit(() -> submitProducerTask(producerLatch));
    jobExecutor.submit(() -> submitConsumerTask(jobExecutionContext));

    producerLatch.await();
    sendPoisonPills(numConsumers);
  }

  private void submitProducerTask(CountDownLatch producerLatch) {
    for (String entityType : jobData.getEntities()) {
      try {
        reCreateIndexes(entityType);
        int totalEntityRecords = getTotalEntityRecords(entityType);
        Source<?> source = createSource(entityType);
        int noOfThreads = calculateNumberOfThreads(totalEntityRecords);
        if (totalEntityRecords > 0) {
          for (int i = 0; i < noOfThreads; i++) {
            int currentOffset = i * batchSize.get();
            producerExecutor.submit(
                () -> {
                  try {
                    processReadTask(entityType, source, currentOffset);
                  } catch (Exception e) {
                    LOG.error("Error processing entity type {}", entityType, e);
                  } finally {
                    producerLatch.countDown();
                  }
                });
          }
        }
      } catch (Exception e) {
        LOG.error("Error processing entity type {}", entityType, e);
      }
    }
  }

  private void submitConsumerTask(JobExecutionContext jobExecutionContext) {
    for (int i = 0; i < jobData.getConsumerThreads(); i++) {
      consumerExecutor.submit(
          () -> {
            try {
              consumeTasks(jobExecutionContext);
            } catch (InterruptedException e) {
              Thread.currentThread().interrupt();
              LOG.warn("Consumer thread interrupted.");
            }
          });
    }
  }

  private void consumeTasks(JobExecutionContext jobExecutionContext) throws InterruptedException {
    while (true) {
      IndexingTask<?> task = taskQueue.take();
      LOG.info(
          "Consuming Indexing Task for entityType: {}, entity offset : {}",
          task.entityType(),
          task.currentEntityOffset());
      if (task == IndexingTask.POISON_PILL) {
        LOG.debug("Received POISON_PILL. Consumer thread terminating.");
        break;
      }
      processTask(task, jobExecutionContext);
    }
  }

  /**
   * Sends POISON_PILLs to signal consumer threads to terminate.
   *
   * @param numConsumers The number of consumers to signal.
   * @throws InterruptedException If the thread is interrupted while waiting.
   */
  private void sendPoisonPills(int numConsumers) throws InterruptedException {
    for (int i = 0; i < numConsumers; i++) {
      taskQueue.put(IndexingTask.POISON_PILL);
    }
    LOG.debug("Sent {} POISON_PILLs to consumers.", numConsumers);
  }

  /**
   * Shuts down an executor service gracefully.
   *
   * @param executor The executor service to shut down.
   * @param name     The name of the executor for logging.
   * @param timeout  The timeout duration.
   * @param unit     The time unit of the timeout.
   */
  private void shutdownExecutor(
      ExecutorService executor, String name, long timeout, TimeUnit unit) {
    if (executor != null && !executor.isShutdown()) {
      executor.shutdown();
      try {
        if (!executor.awaitTermination(timeout, unit)) {
          executor.shutdownNow();
          LOG.warn("{} did not terminate within the specified timeout.", name);
        } else {
          LOG.info("{} terminated successfully.", name);
        }
      } catch (InterruptedException e) {
        LOG.error("Interrupted while waiting for {} to terminate.", name, e);
        executor.shutdownNow();
        Thread.currentThread().interrupt();
      }
    }
  }

  private void handleJobFailure(Exception ex) {
    IndexingError indexingError =
        new IndexingError()
            .withErrorSource(IndexingError.ErrorSource.JOB)
            .withMessage(
                String.format(
                    "Reindexing Job Has Encountered an Exception.%nJob Data: %s,%nStack: %s",
                    jobData.toString(), ExceptionUtils.getStackTrace(ex)));
    LOG.error(indexingError.getMessage(), ex);
    jobData.setStatus(EventPublisherJob.Status.FAILED);
    jobData.setFailure(indexingError);
  }

  public synchronized void updateStats(String entityType, StepStats currentEntityStats) {
    Stats jobDataStats = jobData.getStats();
    if (jobDataStats.getEntityStats() == null) {
      jobDataStats.setEntityStats(new StepStats());
    }

    StepStats existingEntityStats =
        (StepStats) jobDataStats.getEntityStats().getAdditionalProperties().get(entityType);
    if (existingEntityStats == null) {
      jobDataStats.getEntityStats().getAdditionalProperties().put(entityType, currentEntityStats);
      LOG.debug("Initialized StepStats for entityType '{}': {}", entityType, currentEntityStats);
    } else {
      accumulateStepStats(existingEntityStats, currentEntityStats);
      LOG.debug(
          "Accumulated StepStats for entityType '{}': Success - {}, Failed - {}",
          entityType,
          existingEntityStats.getSuccessRecords(),
          existingEntityStats.getFailedRecords());
    }

    StepStats jobStats = jobDataStats.getJobStats();
    if (jobStats == null) {
      jobStats = new StepStats();
      jobDataStats.setJobStats(jobStats);
    }

    accumulateStepStats(jobStats, currentEntityStats);
    LOG.debug(
        "Updated jobStats: Success - {}, Failed - {}",
        jobStats.getSuccessRecords(),
        jobStats.getFailedRecords());

    jobData.setStats(jobDataStats);
  }

  private void accumulateStepStats(StepStats target, StepStats source) {
    if (target == null || source == null) {
      return;
    }
    target.setTotalRecords(target.getTotalRecords() + source.getTotalRecords());
    target.setSuccessRecords(target.getSuccessRecords() + source.getSuccessRecords());
    target.setFailedRecords(target.getFailedRecords() + source.getFailedRecords());
  }

  public synchronized Stats initializeTotalRecords(Set<String> entities) {
    Stats jobDataStats = jobData.getStats();
    if (jobDataStats.getEntityStats() == null) {
      jobDataStats.setEntityStats(new StepStats());
      LOG.debug("Initialized entityStats map.");
    }

    int total = 0;
    for (String entityType : entities) {
      int entityTotal = getEntityTotal(entityType);
      total += entityTotal;

      StepStats entityStats = new StepStats();
      entityStats.setTotalRecords(entityTotal);
      entityStats.setSuccessRecords(0);
      entityStats.setFailedRecords(0);

      jobDataStats.getEntityStats().getAdditionalProperties().put(entityType, entityStats);
      LOG.debug("Set Total Records for entityType '{}': {}", entityType, entityTotal);
    }

    StepStats jobStats = jobDataStats.getJobStats();
    if (jobStats == null) {
      jobStats = new StepStats();
      jobDataStats.setJobStats(jobStats);
      LOG.debug("Initialized jobStats.");
    }
    jobStats.setTotalRecords(total);
    LOG.debug("Set job-level Total Records: {}", jobStats.getTotalRecords());

    jobData.setStats(jobDataStats);
    return jobDataStats;
  }

  private int getEntityTotal(String entityType) {
    try {
      if (!TIME_SERIES_ENTITIES.contains(entityType)) {
        EntityRepository<?> repository = Entity.getEntityRepository(entityType);
        return repository.getDao().listTotalCount();
      } else {
        EntityTimeSeriesRepository<?> repository;
        ListFilter listFilter = new ListFilter(null);
        if (isDataInsightIndex(entityType)) {
          listFilter.addQueryParam("entityFQNHash", FullyQualifiedName.buildHash(entityType));
          repository = Entity.getEntityTimeSeriesRepository(Entity.ENTITY_REPORT_DATA);
        } else {
          repository = Entity.getEntityTimeSeriesRepository(entityType);
        }
        return repository.getTimeSeriesDao().listCount(listFilter);
      }
    } catch (Exception e) {
      LOG.debug("Error while getting total entities to index for '{}'", entityType, e);
      return 0;
    }
  }

  private void sendUpdates(JobExecutionContext jobExecutionContext) {
    try {
      jobExecutionContext.getJobDetail().getJobDataMap().put(APP_RUN_STATS, jobData.getStats());
      jobExecutionContext
          .getJobDetail()
          .getJobDataMap()
          .put(WEBSOCKET_STATUS_CHANNEL, SEARCH_INDEX_JOB_BROADCAST_CHANNEL);
      updateRecordToDbAndNotify(jobExecutionContext);
    } catch (Exception ex) {
      LOG.error("Failed to send updated stats with WebSocket", ex);
    }
  }

  private void reCreateIndexes(String entityType) throws SearchIndexException {
    if (Boolean.FALSE.equals(jobData.getRecreateIndex())) {
      LOG.debug("RecreateIndex is false. Skipping index recreation for '{}'.", entityType);
      return;
    }

    try {
      IndexMapping indexType = searchRepository.getIndexMapping(entityType);
      searchRepository.deleteIndex(indexType);
      searchRepository.createIndex(indexType);
      LOG.info("Recreated index for entityType '{}'.", entityType);
    } catch (Exception e) {
      LOG.error("Failed to recreate index for entityType '{}'.", entityType, e);
      throw new SearchIndexException(e);
    }
  }

  @SuppressWarnings("unused")
  public void stopJob() {
    LOG.info("Stopping reindexing job.");
    stopped = true;
    shutdownExecutor(producerExecutor, "ProducerExecutor", 60, TimeUnit.SECONDS);
    shutdownExecutor(consumerExecutor, "ConsumerExecutor", 60, TimeUnit.SECONDS);
  }

  private void processTask(IndexingTask<?> task, JobExecutionContext jobExecutionContext) {
    String entityType = task.entityType();
    ResultList<?> entities = task.entities();
    Map<String, Object> contextData = new HashMap<>();
    contextData.put(ENTITY_TYPE_KEY, entityType);

    try {
      if (!TIME_SERIES_ENTITIES.contains(entityType)) {
        @SuppressWarnings("unchecked")
        List<EntityInterface> entityList = (List<EntityInterface>) entities.getData();
        searchIndexSink.write(entityList, contextData);
      } else {
        @SuppressWarnings("unchecked")
        List<EntityTimeSeriesInterface> entityList =
            (List<EntityTimeSeriesInterface>) entities.getData();
        searchIndexSink.write(entityList, contextData);
      }

      // After successful write, create a new StepStats for the current batch
      StepStats currentEntityStats = new StepStats();
      currentEntityStats.setSuccessRecords(entities.getData().size());
      currentEntityStats.setFailedRecords(entities.getErrors().size());
      // Do NOT set Total Records here

      // Update statistics in a thread-safe manner
      synchronized (jobDataLock) {
        if (!entities.getErrors().isEmpty()) {
          jobData.setStatus(EventPublisherJob.Status.ACTIVE_ERROR);
          jobData.setFailure(
              new IndexingError()
                  .withErrorSource(IndexingError.ErrorSource.READER)
                  .withSubmittedCount(batchSize.get())
                  .withSuccessCount(entities.getData().size())
                  .withFailedCount(entities.getErrors().size())
                  .withMessage(
                      "Issues in Reading A Batch For Entities. Check Errors Corresponding to Entities.")
                  .withFailedEntities(entities.getErrors()));
        }
        updateStats(entityType, currentEntityStats);
      }

    } catch (Exception e) {
      synchronized (jobDataLock) {
        jobData.setStatus(EventPublisherJob.Status.FAILED);
        jobData.setFailure(
            new IndexingError()
                .withErrorSource(IndexingError.ErrorSource.JOB)
                .withMessage(e.getMessage()));

        StepStats failedEntityStats = new StepStats();
        failedEntityStats.setSuccessRecords(0);
        failedEntityStats.setFailedRecords(entities.getData().size());
        updateStats(entityType, failedEntityStats);
      }
      LOG.error("Unexpected error during processing task for entity {}", entityType, e);
    } finally {
      sendUpdates(jobExecutionContext);
    }
  }

  @NotNull
  private Source<?> createSource(String entityType) {
    List<String> fields = List.of("*");
    Source<?> source;

    if (!TIME_SERIES_ENTITIES.contains(entityType)) {
      PaginatedEntitiesSource paginatedSource =
          new PaginatedEntitiesSource(entityType, batchSize.get(), fields);
      if (!nullOrEmpty(jobData.getAfterCursor())) {
        paginatedSource.getCursor().set(jobData.getAfterCursor());
      }
      source = paginatedSource;
    } else {
      PaginatedEntityTimeSeriesSource paginatedSource =
          new PaginatedEntityTimeSeriesSource(entityType, batchSize.get(), fields);
      if (!nullOrEmpty(jobData.getAfterCursor())) {
        paginatedSource.getCursor().set(jobData.getAfterCursor());
      }
      source = paginatedSource;
    }

    return source;
  }

  private int getTotalLatchCount(Set<String> entities) {
    int totalCount = 0;
    for (String entityType : entities) {
      int totalEntityRecords = getTotalEntityRecords(entityType);
      int noOfThreads = calculateNumberOfThreads(totalEntityRecords);
      totalCount += noOfThreads;
    }
    return totalCount;
  }

  private int getTotalEntityRecords(String entityType) {
    return ((StepStats)
            searchIndexStats.get().getEntityStats().getAdditionalProperties().get(entityType))
        .getTotalRecords();
  }

  private void processReadTask(String entityType, Source<?> source, int offset) {
    try {
      Object resultList = source.readWithCursor(RestUtil.encodeCursor(String.valueOf(offset)));
      if (resultList != null) {
        ResultList<?> entities = extractEntities(entityType, resultList);
        if (!nullOrEmpty(entities.getData())) {
          LOG.info(
              "Creating Indexing Task for entityType: {}, current offset: {}", entityType, offset);
          createIndexingTask(entityType, entities, offset);
        }
      }
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      LOG.warn("Reader thread interrupted for entityType: {}", entityType);
    } catch (SearchIndexException e) {
      LOG.error("Error while reading source for entityType: {}", entityType, e);
      synchronized (jobDataLock) {
        jobData.setStatus(EventPublisherJob.Status.ACTIVE_ERROR);
        jobData.setFailure(e.getIndexingError());
        int remainingRecords = getRemainingRecordsToProcess(entityType);
        if (remainingRecords - batchSize.get() <= 0) {
          updateStats(
              entityType,
              new StepStats().withSuccessRecords(0).withFailedRecords(remainingRecords));
        } else {
          updateStats(
              entityType, new StepStats().withSuccessRecords(0).withFailedRecords(batchSize.get()));
        }
      }
    }
  }

  private void createIndexingTask(String entityType, ResultList<?> entities, int offset)
      throws InterruptedException {
    IndexingTask<?> task = new IndexingTask<>(entityType, entities, offset);
    taskQueue.put(task);
  }

  private synchronized int calculateNumberOfThreads(int totalEntityRecords) {
    int mod = totalEntityRecords % batchSize.get();
    if (mod == 0) {
      return totalEntityRecords / batchSize.get();
    } else {
      return (totalEntityRecords / batchSize.get()) + 1;
    }
  }

  @SuppressWarnings("unchecked")
  private ResultList<?> extractEntities(String entityType, Object resultList) {
    if (!TIME_SERIES_ENTITIES.contains(entityType)) {
      return ((ResultList<? extends EntityInterface>) resultList);
    } else {
      return ((ResultList<? extends EntityTimeSeriesInterface>) resultList);
    }
  }

  private synchronized int getRemainingRecordsToProcess(String entityType) {
    StepStats entityStats =
        ((StepStats)
            searchIndexStats.get().getEntityStats().getAdditionalProperties().get(entityType));
    return entityStats.getTotalRecords()
        - entityStats.getFailedRecords()
        - entityStats.getSuccessRecords();
  }

  private record IndexingTask<T>(
      String entityType, ResultList<T> entities, int currentEntityOffset) {
    public static final IndexingTask<?> POISON_PILL =
        new IndexingTask<>(null, new ResultList<>(), -1);
  }
}
