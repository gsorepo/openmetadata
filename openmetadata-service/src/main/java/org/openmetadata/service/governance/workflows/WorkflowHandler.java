package org.openmetadata.service.governance.workflows;

import static org.openmetadata.service.governance.workflows.elements.TriggerFactory.getTriggerWorkflowId;

import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.flowable.bpmn.converter.BpmnXMLConverter;
import org.flowable.common.engine.api.FlowableException;
import org.flowable.common.engine.api.FlowableObjectNotFoundException;
import org.flowable.engine.HistoryService;
import org.flowable.engine.ProcessEngine;
import org.flowable.engine.ProcessEngineConfiguration;
import org.flowable.engine.ProcessEngines;
import org.flowable.engine.RepositoryService;
import org.flowable.engine.RuntimeService;
import org.flowable.engine.TaskService;
import org.flowable.engine.history.HistoricProcessInstance;
import org.flowable.engine.impl.cfg.StandaloneProcessEngineConfiguration;
import org.flowable.engine.repository.ProcessDefinition;
import org.flowable.engine.runtime.Execution;
import org.flowable.engine.runtime.ProcessInstance;
import org.flowable.task.api.Task;
import org.openmetadata.schema.configuration.WorkflowSettings;
import org.openmetadata.service.Entity;
import org.openmetadata.service.OpenMetadataApplicationConfig;
import org.openmetadata.service.exception.UnhandledServerException;
import org.openmetadata.service.jdbi3.SystemRepository;
import org.openmetadata.service.jdbi3.locator.ConnectionType;

@Slf4j
public class WorkflowHandler {
  private ProcessEngine processEngine;
  private RepositoryService repositoryService;
  private RuntimeService runtimeService;
  private TaskService taskService;
  private HistoryService historyService;
  private static WorkflowHandler instance;
  private static volatile boolean initialized = false;

  private WorkflowHandler(OpenMetadataApplicationConfig config) {
    ProcessEngineConfiguration processEngineConfiguration =
        new StandaloneProcessEngineConfiguration()
            .setJdbcUrl(config.getDataSourceFactory().getUrl())
            .setJdbcUsername(config.getDataSourceFactory().getUser())
            .setJdbcPassword(config.getDataSourceFactory().getPassword())
            .setJdbcDriver(config.getDataSourceFactory().getDriverClass())
            .setDatabaseSchemaUpdate(ProcessEngineConfiguration.DB_SCHEMA_UPDATE_FALSE);

    if (ConnectionType.MYSQL.label.equals(config.getDataSourceFactory().getDriverClass())) {
      processEngineConfiguration.setDatabaseType(ProcessEngineConfiguration.DATABASE_TYPE_MYSQL);
    } else {
      processEngineConfiguration.setDatabaseType(ProcessEngineConfiguration.DATABASE_TYPE_POSTGRES);
    }

    initializeNewProcessEngine(processEngineConfiguration);
  }

  public void initializeNewProcessEngine(
      ProcessEngineConfiguration currentProcessEngineConfiguration) {
    ProcessEngines.destroy();
    SystemRepository systemRepository = Entity.getSystemRepository();
    WorkflowSettings workflowSettings = systemRepository.getWorkflowSettingsOrDefault();

    StandaloneProcessEngineConfiguration processEngineConfiguration =
        new StandaloneProcessEngineConfiguration();

    // Setting Database Configuration
    processEngineConfiguration
        .setJdbcUrl(currentProcessEngineConfiguration.getJdbcUrl())
        .setJdbcUsername(currentProcessEngineConfiguration.getJdbcUsername())
        .setJdbcPassword(currentProcessEngineConfiguration.getJdbcPassword())
        .setJdbcDriver(currentProcessEngineConfiguration.getJdbcDriver())
        .setDatabaseType(currentProcessEngineConfiguration.getDatabaseType())
        .setDatabaseSchemaUpdate(ProcessEngineConfiguration.DB_SCHEMA_UPDATE_FALSE);

    // Setting Async Executor Configuration
    processEngineConfiguration
        .setAsyncExecutorActivate(true)
        .setAsyncExecutorCorePoolSize(workflowSettings.getExecutorConfiguration().getCorePoolSize())
        .setAsyncExecutorMaxPoolSize(workflowSettings.getExecutorConfiguration().getMaxPoolSize())
        .setAsyncExecutorThreadPoolQueueSize(
            workflowSettings.getExecutorConfiguration().getQueueSize())
        .setAsyncExecutorMaxAsyncJobsDuePerAcquisition(
            workflowSettings.getExecutorConfiguration().getTasksDuePerAcquisition());

    // Setting History CleanUp
    processEngineConfiguration
        .setEnableHistoryCleaning(true)
        .setCleanInstancesEndedAfter(
            Duration.ofDays(
                workflowSettings.getHistoryCleanUpConfiguration().getCleanAfterNumberOfDays()));

    // Add Global Failure Listener
    processEngineConfiguration.setEventListeners(List.of(new WorkflowFailureListener()));

    ProcessEngine processEngine = processEngineConfiguration.buildProcessEngine();

    this.processEngine = processEngine;
    this.repositoryService = processEngine.getRepositoryService();
    this.runtimeService = processEngine.getRuntimeService();
    this.taskService = processEngine.getTaskService();
    this.historyService = processEngine.getHistoryService();
  }

  public static void initialize(OpenMetadataApplicationConfig config) {
    if (!initialized) {
      instance = new WorkflowHandler(config);
      initialized = true;
    } else {
      LOG.info("WorkflowHandler already initialized.");
    }
  }

  public static WorkflowHandler getInstance() {
    if (initialized) return instance;
    throw new UnhandledServerException("WorkflowHandler is not initialized.");
  }

  public ProcessEngineConfiguration getProcessEngineConfiguration() {
    if (processEngine != null) {
      return processEngine.getProcessEngineConfiguration();
    } else {
      return null;
    }
  }

  public void deploy(Workflow workflow) {
    BpmnXMLConverter bpmnXMLConverter = new BpmnXMLConverter();

    // Deploy Main Workflow
    byte[] bpmnMainWorkflowBytes =
        bpmnXMLConverter.convertToXML(workflow.getMainWorkflow().getModel());
    repositoryService
        .createDeployment()
        .addBytes(
            String.format("%s-workflow.bpmn20.xml", workflow.getMainWorkflow().getWorkflowName()),
            bpmnMainWorkflowBytes)
        .name(workflow.getMainWorkflow().getWorkflowName())
        .deploy();

    // Deploy Trigger Workflow
    byte[] bpmnTriggerWorkflowBytes =
        bpmnXMLConverter.convertToXML(workflow.getTriggerWorkflow().getModel());
    repositoryService
        .createDeployment()
        .addBytes(
            String.format(
                "%s-workflow.bpmn20.xml", workflow.getTriggerWorkflow().getWorkflowName()),
            bpmnTriggerWorkflowBytes)
        .name(workflow.getTriggerWorkflow().getWorkflowName())
        .deploy();
  }

  public void deleteWorkflowDefinition(String processDefinitionKey) {
    List<ProcessDefinition> processDefinitions =
        repositoryService
            .createProcessDefinitionQuery()
            .processDefinitionKey(processDefinitionKey)
            .list();

    for (ProcessDefinition processDefinition : processDefinitions) {
      String deploymentId = processDefinition.getDeploymentId();
      repositoryService.deleteDeployment(deploymentId, true);
    }

    // Also Delete the Trigger
    List<ProcessDefinition> triggerProcessDefinition =
        repositoryService
            .createProcessDefinitionQuery()
            .processDefinitionKey(getTriggerWorkflowId(processDefinitionKey))
            .list();

    for (ProcessDefinition processDefinition : triggerProcessDefinition) {
      String deploymentId = processDefinition.getDeploymentId();
      repositoryService.deleteDeployment(deploymentId, true);
    }
  }

  public ProcessInstance triggerByKey(
      String processDefinitionKey, String businessKey, Map<String, Object> variables) {
    return runtimeService.startProcessInstanceByKey(processDefinitionKey, businessKey, variables);
  }

  public void triggerWithSignal(String signal, Map<String, Object> variables) {
    runtimeService.signalEventReceived(signal, variables);
  }

  public void setCustomTaskId(String taskId, UUID customTaskId) {
    taskService.setVariable(taskId, "customTaskId", customTaskId.toString());
  }

  public void resolveTask(UUID taskId) {
    resolveTask(taskId, null);
  }

  public void resolveTask(UUID customTaskId, Map<String, Object> variables) {
    try {
      Optional<Task> oTask =
          Optional.ofNullable(
              taskService
                  .createTaskQuery()
                  .processVariableValueEquals("customTaskId", customTaskId.toString())
                  .singleResult());

      if (oTask.isPresent()) {
        Task task = oTask.get();
        Optional.ofNullable(variables)
            .ifPresentOrElse(
                variablesValue -> taskService.complete(task.getId(), variablesValue),
                () -> taskService.complete(task.getId()));
      } else {
        LOG.debug(String.format("Flowable Task for Task ID %s not found.", customTaskId));
      }
    } catch (FlowableObjectNotFoundException ex) {
      LOG.debug(String.format("Flowable Task for Task ID %s not found.", customTaskId));
    } catch (
        FlowableException
            ex) { // TODO: Remove this once we change the Task flow. Currently closeTask() is called
      // twice.
      LOG.debug(String.format("Flowable Exception: %s.", ex));
    }
  }

  public void terminateTaskProcessInstance(UUID customTaskId, String reason) {
    try {
      List<Task> tasks =
          taskService
              .createTaskQuery()
              .processVariableValueEquals("customTaskId", customTaskId.toString())
              .list();
      for (Task task : tasks) {
        Execution execution =
            runtimeService
                .createExecutionQuery()
                .processInstanceId(task.getProcessInstanceId())
                .messageEventSubscriptionName("terminateProcess")
                .singleResult();
        runtimeService.messageEventReceived("terminateProcess", execution.getId());
      }
    } catch (FlowableObjectNotFoundException ex) {
      LOG.debug(String.format("Flowable Task for Task ID %s not found.", customTaskId));
    } catch (
        FlowableException
            ex) { // TODO: Remove this once we change the Task flow. Currently closeTask() is called
      // twice.
      LOG.debug(String.format("Flowable Exception: %s.", ex));
    }
  }

  public static String getProcessDefinitionKeyFromId(String processDefinitionId) {
    return Arrays.stream(processDefinitionId.split(":")).toList().get(0);
  }

  public void updateBusinessKey(String processInstanceId, UUID workflowInstanceBusinessKey) {
    runtimeService.updateBusinessKey(processInstanceId, workflowInstanceBusinessKey.toString());
  }

  public boolean hasProcessInstanceFinished(String processInstanceId) {
    boolean hasFinished = false;

    HistoricProcessInstance historicProcessInstance =
        historyService
            .createHistoricProcessInstanceQuery()
            .processInstanceId(processInstanceId)
            .singleResult();

    if (historicProcessInstance != null && historicProcessInstance.getEndTime() != null) {
      hasFinished = true;
    }

    return hasFinished;
  }

  public boolean isActivityWithVariableExecuting(
      String activityName, String variableName, Object expectedValue) {
    List<Execution> executions =
        runtimeService.createExecutionQuery().activityId(activityName).list();

    for (Execution execution : executions) {
      Object variableValue = runtimeService.getVariable(execution.getId(), variableName);
      if (expectedValue.equals(variableValue)) {
        return true;
      }
    }
    return false;
  }

  public boolean triggerWorkflow(String workflowName) {
    try {
      runtimeService.startProcessInstanceByKey(getTriggerWorkflowId(workflowName));
      return true;
    } catch (FlowableObjectNotFoundException ex) {
      return false;
    }
  }

  public void suspendWorkflow(String workflowName) {
    repositoryService.suspendProcessDefinitionByKey(getTriggerWorkflowId(workflowName), true, null);
  }

  public void resumeWorkflow(String workflowName) {
    repositoryService.activateProcessDefinitionByKey(
        getTriggerWorkflowId(workflowName), true, null);
  }

  public void terminateWorkflow(String workflowName) {
    runtimeService
        .createProcessInstanceQuery()
        .processDefinitionKey(getTriggerWorkflowId(workflowName))
        .list()
        .forEach(
            instance -> {
              runtimeService.deleteProcessInstance(
                  instance.getId(), "Terminating all instances due to user request.");
            });
  }
}
