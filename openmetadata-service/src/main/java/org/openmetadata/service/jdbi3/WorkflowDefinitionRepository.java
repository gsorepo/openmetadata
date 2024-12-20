package org.openmetadata.service.jdbi3;

import static org.openmetadata.service.util.EntityUtil.objectMatch;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.schema.governance.workflows.WorkflowDefinition;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.service.Entity;
import org.openmetadata.service.governance.workflows.Workflow;
import org.openmetadata.service.governance.workflows.WorkflowHandler;
import org.openmetadata.service.resources.governance.WorkflowDefinitionResource;
import org.openmetadata.service.util.EntityUtil;

@Slf4j
public class WorkflowDefinitionRepository extends EntityRepository<WorkflowDefinition> {

  public WorkflowDefinitionRepository() {
    super(
        WorkflowDefinitionResource.COLLECTION_PATH,
        Entity.WORKFLOW_DEFINITION,
        WorkflowDefinition.class,
        Entity.getCollectionDAO().workflowDefinitionDAO(),
        "",
        "");
  }

  @Override
  public List<WorkflowDefinition> getEntitiesFromSeedData() throws IOException {
    return getEntitiesFromSeedData(".*json/data/governance/workflows/.*\\.json$");
  }

  @Override
  protected void postCreate(WorkflowDefinition entity) {
    WorkflowHandler.getInstance().deploy(new Workflow(entity));
  }

  @Override
  protected void postUpdate(WorkflowDefinition original, WorkflowDefinition updated) {
    WorkflowHandler.getInstance().deploy(new Workflow(updated));
  }

  @Override
  protected void postDelete(WorkflowDefinition entity) {
    WorkflowHandler.getInstance().deleteWorkflowDefinition(entity.getName());
  }

  @Override
  protected void setFields(WorkflowDefinition entity, EntityUtil.Fields fields) {}

  @Override
  protected void clearFields(WorkflowDefinition entity, EntityUtil.Fields fields) {}

  @Override
  protected void prepare(WorkflowDefinition entity, boolean update) {}

  @Override
  public EntityUpdater getUpdater(
      WorkflowDefinition original, WorkflowDefinition updated, Operation operation) {
    return new WorkflowDefinitionRepository.WorkflowDefinitionUpdater(original, updated, operation);
  }

  public class WorkflowDefinitionUpdater extends EntityUpdater {
    public WorkflowDefinitionUpdater(
        WorkflowDefinition original, WorkflowDefinition updated, Operation operation) {
      super(original, updated, operation);
    }

    @Transaction
    @Override
    public void entitySpecificUpdate(boolean consolidatingChanges) {
      updateType();
      updateTrigger();
      updateNodes();
      updateEdges();
    }

    private void updateType() {
      if (original.getType() == updated.getType()) {
        return;
      }
      recordChange("type", original.getType(), updated.getType());
    }

    private void updateTrigger() {
      if (original.getTrigger() == updated.getTrigger()) {
        return;
      }
      recordChange("trigger", original.getTrigger(), updated.getTrigger());
    }

    private void updateNodes() {
      List<Object> addedNodes = new ArrayList<>();
      List<Object> deletedNodes = new ArrayList<>();
      recordListChange(
          "nodes",
          (List<Object>) original.getNodes(),
          (List<Object>) updated.getNodes(),
          addedNodes,
          deletedNodes,
          objectMatch);
    }

    private void updateEdges() {
      List<Object> addedEdges = new ArrayList<>();
      List<Object> deletedEdges = new ArrayList<>();
      recordListChange(
          "nodes",
          (List<Object>) original.getNodes(),
          (List<Object>) updated.getNodes(),
          addedEdges,
          deletedEdges,
          objectMatch);
    }
  }

  @Override
  protected void storeEntity(WorkflowDefinition entity, boolean update) {
    store(entity, update);
  }

  @Override
  protected void storeRelationships(WorkflowDefinition entity) {}

  public UUID getIdFromName(String workflowDefinitionName) {
    EntityReference workflowDefinitionReference =
        getByName(null, workflowDefinitionName, new EntityUtil.Fields(Set.of("*")))
            .getEntityReference();
    return workflowDefinitionReference.getId();
  }
}
