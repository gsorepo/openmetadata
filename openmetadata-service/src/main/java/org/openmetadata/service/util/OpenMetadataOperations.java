package org.openmetadata.service.util;

import static org.flywaydb.core.internal.info.MigrationInfoDumper.dumpToAsciiTable;
import static org.openmetadata.common.utils.CommonUtil.nullOrEmpty;
import static org.openmetadata.service.Entity.FIELD_OWNER;
import static org.openmetadata.service.util.AsciiTable.printOpenMetadataText;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.gson.Gson;
import com.google.gson.JsonElement;
import com.google.gson.JsonObject;
import io.dropwizard.configuration.EnvironmentVariableSubstitutor;
import io.dropwizard.configuration.FileConfigurationSourceProvider;
import io.dropwizard.configuration.SubstitutingSourceProvider;
import io.dropwizard.configuration.YamlConfigurationFactory;
import io.dropwizard.db.DataSourceFactory;
import io.dropwizard.jackson.Jackson;
import io.dropwizard.jersey.validation.Validators;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Scanner;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import javax.validation.Validator;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.MigrationVersion;
import org.jdbi.v3.core.Jdbi;
import org.jdbi.v3.sqlobject.SqlObjectPlugin;
import org.jdbi.v3.sqlobject.SqlObjects;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.ServiceEntityInterface;
import org.openmetadata.schema.entity.app.App;
import org.openmetadata.schema.entity.app.AppRunRecord;
import org.openmetadata.schema.entity.app.AppSchedule;
import org.openmetadata.schema.entity.app.ScheduleTimeline;
import org.openmetadata.schema.entity.app.ScheduledExecutionContext;
import org.openmetadata.schema.entity.services.ingestionPipelines.IngestionPipeline;
import org.openmetadata.schema.services.connections.metadata.OpenMetadataConnection;
import org.openmetadata.schema.system.EventPublisherJob;
import org.openmetadata.schema.type.Include;
import org.openmetadata.sdk.PipelineServiceClient;
import org.openmetadata.service.Entity;
import org.openmetadata.service.OpenMetadataApplicationConfig;
import org.openmetadata.service.apps.ApplicationHandler;
import org.openmetadata.service.apps.scheduler.AppScheduler;
import org.openmetadata.service.clients.pipeline.PipelineServiceClientFactory;
import org.openmetadata.service.exception.EntityNotFoundException;
import org.openmetadata.service.exception.UnhandledServerException;
import org.openmetadata.service.fernet.Fernet;
import org.openmetadata.service.jdbi3.AppRepository;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.jdbi3.EntityRepository;
import org.openmetadata.service.jdbi3.IngestionPipelineRepository;
import org.openmetadata.service.jdbi3.ListFilter;
import org.openmetadata.service.jdbi3.MigrationDAO;
import org.openmetadata.service.jdbi3.locator.ConnectionAwareAnnotationSqlLocator;
import org.openmetadata.service.jdbi3.locator.ConnectionType;
import org.openmetadata.service.migration.api.MigrationWorkflow;
import org.openmetadata.service.resources.CollectionRegistry;
import org.openmetadata.service.resources.databases.DatasourceConfig;
import org.openmetadata.service.search.SearchRepository;
import org.openmetadata.service.secrets.SecretsManager;
import org.openmetadata.service.secrets.SecretsManagerFactory;
import org.openmetadata.service.secrets.SecretsManagerUpdateService;
import org.openmetadata.service.util.jdbi.DatabaseAuthenticationProviderFactory;
import org.slf4j.LoggerFactory;
import picocli.CommandLine;
import picocli.CommandLine.Command;
import picocli.CommandLine.Option;

@Slf4j
@Command(
    name = "OpenMetadataSetup",
    mixinStandardHelpOptions = true,
    version = "OpenMetadataSetup 1.3",
    description =
        "Creates or Migrates Database/Search Indexes. ReIndex the existing data into Elastic Search "
            + "or OpenSearch. Re-Deploys the service pipelines.")
public class OpenMetadataOperations implements Callable<Integer> {

  private OpenMetadataApplicationConfig config;
  private Flyway flyway;
  private Jdbi jdbi;
  private SearchRepository searchRepository;
  private String nativeSQLScriptRootPath;
  private String extensionSQLScriptRootPath;
  private SecretsManager secretsManager;
  private CollectionDAO collectionDAO;

  @Option(
      names = {"-d", "--debug"},
      defaultValue = "false")
  private boolean debug;

  @Option(
      names = {"-c", "--config"},
      required = true)
  private String configFilePath;

  @Override
  public Integer call() {
    LOG.info(
        "Subcommand needed: 'info', 'validate', 'repair', 'check-connection', "
            + "'drop-create', 'migrate', 'reindex', 'deploy-pipelines'");
    return 0;
  }

  @Command(
      name = "info",
      description =
          "Shows the list of migrations applied and the pending migration "
              + "waiting to be applied on the target database")
  public Integer info() {
    try {
      parseConfig();
      LOG.info(dumpToAsciiTable(flyway.info().all()));
      return 0;
    } catch (Exception e) {
      LOG.error("Failed due to ", e);
      return 1;
    }
  }

  @Command(
      name = "validate",
      description =
          "Checks if the all the migrations haven been applied " + "on the target database.")
  public Integer validate() {
    try {
      parseConfig();
      flyway.validate();
      return 0;
    } catch (Exception e) {
      LOG.error("Database migration validation failed due to ", e);
      return 1;
    }
  }

  @Command(
      name = "repair",
      description =
          "Repairs the DATABASE_CHANGE_LOG table which is used to track"
              + "all the migrations on the target database This involves removing entries for the failed migrations and update"
              + "the checksum of migrations already applied on the target database")
  public Integer repair() {
    try {
      parseConfig();
      flyway.repair();
      return 0;
    } catch (Exception e) {
      LOG.error("Repair of CHANGE_LOG failed due to ", e);
      return 1;
    }
  }

  @Command(
      name = "check-connection",
      description =
          "Checks if a connection can be successfully " + "obtained for the target database")
  public Integer checkConnection() {
    try {
      parseConfig();
      flyway.getConfiguration().getDataSource().getConnection();
      return 0;
    } catch (Exception e) {
      LOG.error("Failed to check connection due to ", e);
      return 1;
    }
  }

  @Command(
      name = "drop-create",
      description =
          "Deletes any tables in configured database and creates a new tables "
              + "based on current version of OpenMetadata. This command also re-creates the search indexes.")
  public Integer dropCreate() {
    try {
      promptUserForDelete();
      parseConfig();
      LOG.info("Deleting all the OpenMetadata tables.");
      flyway.clean();
      LOG.info("Creating the OpenMetadata Schema.");
      flyway.migrate();
      validateAndRunSystemDataMigrations(true);
      LOG.info("OpenMetadata Database Schema is Updated.");
      LOG.info("create indexes.");
      searchRepository.createIndexes();
      Entity.cleanup();
      return 0;
    } catch (Exception e) {
      LOG.error("Failed to drop create due to ", e);
      return 1;
    }
  }

  @Command(
      name = "migrate",
      description = "Migrates the OpenMetadata database schema and search index mappings.")
  public Integer migrate(
      @Option(
              names = {"--force"},
              description = "Forces migrations to be run again, even if they have ran previously",
              defaultValue = "false")
          boolean force) {
    try {
      LOG.info("Migrating the OpenMetadata Schema.");
      parseConfig();
      flyway.migrate();
      validateAndRunSystemDataMigrations(force);
      LOG.info("Update Search Indexes.");
      searchRepository.updateIndexes();
      printChangeLog();
      // update entities secrets if required
      new SecretsManagerUpdateService(secretsManager, config.getClusterName()).updateEntities();
      Entity.cleanup();
      return 0;
    } catch (Exception e) {
      LOG.error("Failed to db migration due to ", e);
      return 1;
    }
  }

  @Command(name = "changelog", description = "Prints the change log of database migration.")
  public Integer changelog() {
    try {
      parseConfig();
      printChangeLog();
      return 0;
    } catch (Exception e) {
      LOG.error("Failed to fetch db change log due to ", e);
      return 1;
    }
  }

  @Command(name = "reindex", description = "Re Indexes data into search engine from command line.")
  public Integer reIndex(
      @Option(
              names = {"-b", "--batch-size"},
              defaultValue = "100")
          int batchSize,
      @Option(
              names = {"--recreate-indexes"},
              defaultValue = "true")
          boolean recreateIndexes) {
    try {
      parseConfig();
      CollectionRegistry.initialize();
      ApplicationHandler.initialize(config);
      // load seed data so that repositories are initialized
      CollectionRegistry.getInstance().loadSeedData(jdbi, config, null, null);
      ApplicationHandler.initialize(config);
      // creates the default search index application
      AppScheduler.initialize(config, collectionDAO, searchRepository);

      String appName = "SearchIndexingApplication";

      App searchIndexApp = getSearchIndexingApp(appName, batchSize, recreateIndexes);
      AppScheduler.getInstance().triggerOnDemandApplication(searchIndexApp);
      return waitAndReturnReindexingAppStatus(searchIndexApp);
    } catch (Exception e) {
      LOG.error("Failed to reindex due to ", e);
      return 1;
    }
  }

  private App getSearchIndexingApp(String appName, int batchSize, boolean recreateIndexes) {
    try {
      AppRepository appRepository = (AppRepository) Entity.getEntityRepository(Entity.APPLICATION);
      App searchApp =
          appRepository.getByName(null, "SearchIndexingApplication", appRepository.getFields("id"));
      return searchApp;
    } catch (EntityNotFoundException ex) {
      return new App()
          .withId(UUID.randomUUID())
          .withName(appName)
          .withFullyQualifiedName(appName)
          .withClassName("org.openmetadata.service.apps.bundles.searchIndex.SearchIndexApp")
          .withAppSchedule(new AppSchedule().withScheduleTimeline(ScheduleTimeline.DAILY))
          .withAppConfiguration(
              new EventPublisherJob()
                  .withEntities(new HashSet<>(List.of("all")))
                  .withRecreateIndex(recreateIndexes)
                  .withBatchSize(batchSize)
                  .withSearchIndexMappingLanguage(
                      config.getElasticSearchConfiguration().getSearchIndexMappingLanguage()))
          .withRuntime(new ScheduledExecutionContext().withEnabled(true));
    }
  }

  @SneakyThrows
  private int waitAndReturnReindexingAppStatus(App searchIndexApp) {
    AppRunRecord appRunRecord;
    do {
      try {
        AppRepository appRepository =
            (AppRepository) Entity.getEntityRepository(Entity.APPLICATION);
        appRunRecord = appRepository.getLatestAppRuns(searchIndexApp.getId());
        if (appRunRecord != null) {
          List<String> columns =
              new ArrayList<>(
                  List.of("status", "startTime", "endTime", "executionTime", "success", "failure"));
          List<List<String>> rows = new ArrayList<>();
          rows.add(
              Arrays.asList(
                  appRunRecord.getStatus().value(),
                  appRunRecord.getStartTime().toString(),
                  appRunRecord.getEndTime().toString(),
                  appRunRecord.getExecutionTime().toString(),
                  nullOrEmpty(appRunRecord.getSuccessContext())
                      ? "Unavailable"
                      : JsonUtils.pojoToJson(appRunRecord.getSuccessContext()),
                  nullOrEmpty(appRunRecord.getFailureContext())
                      ? "Unavailable"
                      : JsonUtils.pojoToJson(appRunRecord.getFailureContext())));
          printToAsciiTable(columns, rows, "Failed to run Search Reindexing");
        }
      } catch (UnhandledServerException e) {
        LOG.info(
            "Reindexing Status not available yet, waiting for 10 seconds to fetch the status again.");
        appRunRecord = null;
        Thread.sleep(10000);
      }
    } while (appRunRecord == null
        && (appRunRecord.getStatus().equals(AppRunRecord.Status.SUCCESS)
            || appRunRecord.getStatus().equals(AppRunRecord.Status.FAILED)));

    if (appRunRecord.getStatus().equals(AppRunRecord.Status.SUCCESS)
        || appRunRecord.getStatus().equals(AppRunRecord.Status.COMPLETED)) {
      LOG.debug("Reindexing Completed Successfully.");
      return 0;
    }
    LOG.error("Reindexing completed in Failure.");
    return 1;
  }

  @Command(name = "deploy-pipelines", description = "Deploy all the service pipelines.")
  public Integer deployPipelines() {
    try {
      LOG.info("Deploying Pipelines");
      parseConfig();
      PipelineServiceClient pipelineServiceClient =
          PipelineServiceClientFactory.createPipelineServiceClient(
              config.getPipelineServiceClientConfiguration());
      IngestionPipelineRepository pipelineRepository =
          (IngestionPipelineRepository) Entity.getEntityRepository(Entity.INGESTION_PIPELINE);
      List<IngestionPipeline> pipelines =
          pipelineRepository.listAll(
              new EntityUtil.Fields(Set.of(FIELD_OWNER, "service")),
              new ListFilter(Include.NON_DELETED));
      LOG.debug(String.format("Pipelines %d", pipelines.size()));
      List<String> columns = Arrays.asList("Name", "Type", "Service Name", "Status");
      List<List<String>> pipelineStatuses = new ArrayList<>();
      for (IngestionPipeline pipeline : pipelines) {
        deployPipeline(pipeline, pipelineServiceClient, pipelineStatuses);
      }
      printToAsciiTable(columns, pipelineStatuses, "No Pipelines Found");
      return 0;
    } catch (Exception e) {
      LOG.error("Failed to deploy pipelines due to ", e);
      return 1;
    }
  }

  @Command(
      name = "migrate-secrets",
      description =
          "Migrate secrets from DB to the configured Secrets Manager. "
              + "Note that this does not support migrating between external Secrets Managers")
  public Integer migrateSecrets() {
    try {
      LOG.info("Migrating Secrets from DB...");
      parseConfig();
      // update entities secrets if required
      new SecretsManagerUpdateService(secretsManager, config.getClusterName()).updateEntities();
      return 0;
    } catch (Exception e) {
      LOG.error("Failed to migrate secrets due to ", e);
      return 1;
    }
  }

  @Command(
      name = "analyze-tables",
      description =
          "Migrate secrets from DB to the configured Secrets Manager. "
              + "Note that this does not support migrating between external Secrets Managers")
  public Integer analyzeTables() {
    try {
      LOG.info("Analyzing Tables...");
      parseConfig();
      Entity.getEntityList().forEach(this::analyzeEntityTable);
      return 0;
    } catch (Exception e) {
      LOG.error("Failed to analyze tables due to ", e);
      return 1;
    }
  }

  private void analyzeEntityTable(String entity) {
    try {
      EntityRepository<? extends EntityInterface> repository = Entity.getEntityRepository(entity);
      LOG.info("Analyzing table for [{}] Entity", entity);
      repository.getDao().analyzeTable();
    } catch (EntityNotFoundException e) {
      LOG.debug("No repository for [{}] Entity", entity);
    }
  }

  private void deployPipeline(
      IngestionPipeline pipeline,
      PipelineServiceClient pipelineServiceClient,
      List<List<String>> pipelineStatuses) {
    try {
      LOG.debug(String.format("deploying pipeline %s", pipeline.getName()));
      pipeline.setOpenMetadataServerConnection(new OpenMetadataConnectionBuilder(config).build());
      secretsManager.decryptIngestionPipeline(pipeline);
      OpenMetadataConnection openMetadataServerConnection =
          new OpenMetadataConnectionBuilder(config).build();
      pipeline.setOpenMetadataServerConnection(
          secretsManager.encryptOpenMetadataConnection(openMetadataServerConnection, false));
      ServiceEntityInterface service =
          Entity.getEntity(pipeline.getService(), "", Include.NON_DELETED);
      pipelineServiceClient.deployPipeline(pipeline, service);
    } catch (Exception e) {
      LOG.error(
          String.format(
              "Failed to deploy pipeline %s of type %s for service %s",
              pipeline.getName(),
              pipeline.getPipelineType().value(),
              pipeline.getService().getName()),
          e);
      pipeline.setDeployed(false);
    } finally {
      LOG.debug("update the pipeline");
      collectionDAO.ingestionPipelineDAO().update(pipeline);
      pipelineStatuses.add(
          Arrays.asList(
              pipeline.getName(),
              pipeline.getPipelineType().value(),
              pipeline.getService().getName(),
              pipeline.getDeployed().toString()));
    }
  }

  private void parseConfig() throws Exception {
    if (debug) {
      Logger root = (Logger) LoggerFactory.getLogger(org.slf4j.Logger.ROOT_LOGGER_NAME);
      root.setLevel(Level.DEBUG);
    }
    ObjectMapper objectMapper = Jackson.newObjectMapper();
    Validator validator = Validators.newValidator();
    YamlConfigurationFactory<OpenMetadataApplicationConfig> factory =
        new YamlConfigurationFactory<>(
            OpenMetadataApplicationConfig.class, validator, objectMapper, "dw");
    config =
        factory.build(
            new SubstitutingSourceProvider(
                new FileConfigurationSourceProvider(), new EnvironmentVariableSubstitutor(false)),
            configFilePath);
    Fernet.getInstance().setFernetKey(config);
    DataSourceFactory dataSourceFactory = config.getDataSourceFactory();
    if (dataSourceFactory == null) {
      throw new IllegalArgumentException("No database in config file");
    }
    // Check for db auth providers.
    DatabaseAuthenticationProviderFactory.get(dataSourceFactory.getUrl())
        .ifPresent(
            databaseAuthenticationProvider -> {
              String token =
                  databaseAuthenticationProvider.authenticate(
                      dataSourceFactory.getUrl(),
                      dataSourceFactory.getUser(),
                      dataSourceFactory.getPassword());
              dataSourceFactory.setPassword(token);
            });

    String jdbcUrl = dataSourceFactory.getUrl();
    String user = dataSourceFactory.getUser();
    String password = dataSourceFactory.getPassword();
    assert user != null && password != null;

    String flywayRootPath = config.getMigrationConfiguration().getFlywayPath();
    String location =
        "filesystem:"
            + flywayRootPath
            + File.separator
            + config.getDataSourceFactory().getDriverClass();
    flyway =
        Flyway.configure()
            .encoding(StandardCharsets.UTF_8)
            .table("DATABASE_CHANGE_LOG")
            .sqlMigrationPrefix("v")
            .validateOnMigrate(false)
            .outOfOrder(false)
            .baselineOnMigrate(true)
            .baselineVersion(MigrationVersion.fromVersion("000"))
            .cleanOnValidationError(false)
            .locations(location)
            .dataSource(jdbcUrl, user, password)
            .cleanDisabled(false)
            .load();
    nativeSQLScriptRootPath = config.getMigrationConfiguration().getNativePath();
    extensionSQLScriptRootPath = config.getMigrationConfiguration().getExtensionPath();
    jdbi = Jdbi.create(jdbcUrl, user, password);
    jdbi.installPlugin(new SqlObjectPlugin());
    jdbi.getConfig(SqlObjects.class)
        .setSqlLocator(
            new ConnectionAwareAnnotationSqlLocator(
                config.getDataSourceFactory().getDriverClass()));

    searchRepository = new SearchRepository(config.getElasticSearchConfiguration());

    // Initialize secrets manager
    secretsManager =
        SecretsManagerFactory.createSecretsManager(
            config.getSecretsManagerConfiguration(), config.getClusterName());

    collectionDAO = jdbi.onDemand(CollectionDAO.class);
    Entity.setCollectionDAO(collectionDAO);
    Entity.initializeRepositories(config, jdbi);
  }

  private void promptUserForDelete() {
    LOG.info(
        """
                    You are about drop all the data in the database. ALL METADATA WILL BE DELETED.\s
                    This is not recommended for a Production setup or any deployment where you have collected\s
                    a lot of information from the users, such as descriptions, tags, etc.
                    """);
    String input = "";
    Scanner scanner = new Scanner(System.in);
    while (!input.equals("DELETE")) {
      LOG.info("Enter QUIT to quit. If you still want to continue, please enter DELETE: ");
      input = scanner.next();
      if (input.equals("QUIT")) {
        LOG.info("Exiting without deleting data");
        System.exit(1);
      }
    }
  }

  private void validateAndRunSystemDataMigrations(boolean force) {
    ConnectionType connType = ConnectionType.from(config.getDataSourceFactory().getDriverClass());
    DatasourceConfig.initialize(connType.label);
    MigrationWorkflow workflow =
        new MigrationWorkflow(
            jdbi, nativeSQLScriptRootPath, connType, extensionSQLScriptRootPath, force);
    workflow.loadMigrations();
    workflow.printMigrationInfo();
    workflow.runMigrationWorkflows();
  }

  public static void printToAsciiTable(
      List<String> columns, List<List<String>> rows, String emptyText) {
    LOG.info(new AsciiTable(columns, rows, true, "", emptyText).render());
  }

  private void printChangeLog() {
    MigrationDAO migrationDAO = jdbi.onDemand(MigrationDAO.class);
    List<MigrationDAO.ServerChangeLog> serverChangeLogs =
        migrationDAO.listMetricsFromDBMigrations();
    Set<String> columns = new LinkedHashSet<>(Set.of("version", "installedOn"));
    List<List<String>> rows = new ArrayList<>();
    try {
      for (MigrationDAO.ServerChangeLog serverChangeLog : serverChangeLogs) {
        List<String> row = new ArrayList<>();
        if (serverChangeLog.getMetrics() != null) {
          JsonObject metricsJson =
              new Gson().fromJson(serverChangeLog.getMetrics(), JsonObject.class);
          Set<String> keys = metricsJson.keySet();
          columns.addAll(keys);
          row.add(serverChangeLog.getVersion());
          row.add(serverChangeLog.getInstalledOn());
          row.addAll(
              metricsJson.entrySet().stream()
                  .map(Map.Entry::getValue)
                  .map(JsonElement::toString)
                  .toList());
          rows.add(row);
        }
      }
    } catch (Exception e) {
      LOG.warn("Failed to generate migration metrics due to", e);
    }
    printToAsciiTable(columns.stream().toList(), rows, "No Server Change log found");
  }

  public static void main(String... args) {
    LOG.info(printOpenMetadataText());
    int exitCode =
        new CommandLine(new org.openmetadata.service.util.OpenMetadataOperations()).execute(args);
    System.exit(exitCode);
  }
}
