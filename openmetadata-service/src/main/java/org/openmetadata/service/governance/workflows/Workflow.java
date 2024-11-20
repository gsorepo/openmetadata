package org.openmetadata.service.governance.workflows;

import lombok.Getter;
import org.openmetadata.schema.governance.workflows.WorkflowDefinition;
import org.openmetadata.service.governance.workflows.flowable.MainWorkflow;
import org.openmetadata.service.governance.workflows.flowable.TriggerWorkflow;

@Getter
public class Workflow {
  public static final String RELATED_ENTITY_VARIABLE = "relatedEntity";
  public static final String RESULT_VARIABLE = "result";
  public static final String RESOLVED_BY_VARIABLE = "resolvedBy";
  public static final String STAGE_INSTANCE_STATE_ID_VARIABLE = "stageInstanceStateId";
  public static final String WORKFLOW_INSTANCE_EXECUTION_ID_VARIABLE =
      "workflowInstanceExecutionId";
  private final TriggerWorkflow triggerWorkflow;
  private final MainWorkflow mainWorkflow;

  public Workflow(WorkflowDefinition workflowDefinition) {
    this.triggerWorkflow = new TriggerWorkflow(workflowDefinition);
    this.mainWorkflow = new MainWorkflow(workflowDefinition);
  }

  public static String getFlowableElementId(String parentName, String elementName) {
    return String.format("%s.%s", parentName, elementName);
  }
}
