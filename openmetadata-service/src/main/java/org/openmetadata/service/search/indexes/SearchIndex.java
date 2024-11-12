package org.openmetadata.service.search.indexes;

import static org.openmetadata.common.utils.CommonUtil.nullOrEmpty;
import static org.openmetadata.schema.type.Include.NON_DELETED;
import static org.openmetadata.service.Entity.FIELD_DESCRIPTION;
import static org.openmetadata.service.Entity.FIELD_DISPLAY_NAME;
import static org.openmetadata.service.Entity.getEntityByName;
import static org.openmetadata.service.jdbi3.LineageRepository.buildRelationshipDetailsMap;
import static org.openmetadata.service.search.EntityBuilderConstant.DISPLAY_NAME_KEYWORD;
import static org.openmetadata.service.search.EntityBuilderConstant.FIELD_DISPLAY_NAME_NGRAM;
import static org.openmetadata.service.search.EntityBuilderConstant.FULLY_QUALIFIED_NAME;
import static org.openmetadata.service.search.EntityBuilderConstant.FULLY_QUALIFIED_NAME_PARTS;
import static org.openmetadata.service.util.FullyQualifiedName.getParentFQN;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.apache.commons.lang3.tuple.ImmutablePair;
import org.apache.commons.lang3.tuple.Pair;
import org.openmetadata.schema.EntityInterface;
import org.openmetadata.schema.entity.data.Table;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.schema.type.Include;
import org.openmetadata.schema.type.LineageDetails;
import org.openmetadata.schema.type.Relationship;
import org.openmetadata.schema.type.TableConstraint;
import org.openmetadata.service.Entity;
import org.openmetadata.service.exception.EntityNotFoundException;
import org.openmetadata.service.jdbi3.CollectionDAO;
import org.openmetadata.service.search.SearchClient;
import org.openmetadata.service.search.SearchIndexUtils;
import org.openmetadata.service.search.models.IndexMapping;
import org.openmetadata.service.search.models.SearchSuggest;
import org.openmetadata.service.util.FullyQualifiedName;
import org.openmetadata.service.util.JsonUtils;

public interface SearchIndex {
  Set<String> DEFAULT_EXCLUDED_FIELDS =
      Set.of("changeDescription", "lineage.pipeline.changeDescription", "connection");
  public static final SearchClient searchClient = Entity.getSearchRepository().getSearchClient();

  default Map<String, Object> buildSearchIndexDoc() {
    // Build Index Doc
    Map<String, Object> esDoc = this.buildSearchIndexDocInternal(JsonUtils.getMap(getEntity()));

    // Non Indexable Fields
    removeNonIndexableFields(esDoc);

    return esDoc;
  }

  default void removeNonIndexableFields(Map<String, Object> esDoc) {
    // Remove non indexable fields
    SearchIndexUtils.removeNonIndexableFields(esDoc, DEFAULT_EXCLUDED_FIELDS);

    // Remove Entity Specific Field
    SearchIndexUtils.removeNonIndexableFields(esDoc, getExcludedFields());
  }

  Object getEntity();

  default Set<String> getExcludedFields() {
    return Collections.emptySet();
  }

  Map<String, Object> buildSearchIndexDocInternal(Map<String, Object> esDoc);

  default List<SearchSuggest> getSuggest() {
    return null;
  }

  default Map<String, Object> getCommonAttributesMap(EntityInterface entity, String entityType) {
    Map<String, Object> map = new HashMap<>();
    List<SearchSuggest> suggest = getSuggest();
    map.put(
        "displayName",
        entity.getDisplayName() != null ? entity.getDisplayName() : entity.getName());
    map.put("entityType", entityType);
    map.put("owners", getEntitiesWithDisplayName(entity.getOwners()));
    map.put("domain", getEntityWithDisplayName(entity.getDomain()));
    map.put("followers", SearchIndexUtils.parseFollowers(entity.getFollowers()));
    map.put(
        "totalVotes",
        nullOrEmpty(entity.getVotes())
            ? 0
            : entity.getVotes().getUpVotes() - entity.getVotes().getDownVotes());
    map.put("descriptionStatus", getDescriptionStatus(entity));
    map.put("suggest", suggest);
    map.put(
        "fqnParts",
        getFQNParts(
            entity.getFullyQualifiedName(),
            suggest.stream().map(SearchSuggest::getInput).toList()));
    map.put("deleted", entity.getDeleted() != null && entity.getDeleted());

    Optional.ofNullable(entity.getCertification())
        .ifPresent(assetCertification -> map.put("certification", assetCertification));
    return map;
  }

  default Set<String> getFQNParts(String fqn, List<String> fqnSplits) {
    Set<String> fqnParts = new HashSet<>();
    fqnParts.add(fqn);
    String parent = FullyQualifiedName.getParentFQN(fqn);
    while (parent != null) {
      fqnParts.add(parent);
      parent = FullyQualifiedName.getParentFQN(parent);
    }
    fqnParts.addAll(fqnSplits);
    return fqnParts;
  }

  default List<EntityReference> getEntitiesWithDisplayName(List<EntityReference> entities) {
    if (nullOrEmpty(entities)) {
      return Collections.emptyList();
    }
    List<EntityReference> clone = new ArrayList<>();
    for (EntityReference entity : entities) {
      EntityReference cloneEntity = JsonUtils.deepCopy(entity, EntityReference.class);
      cloneEntity.setDisplayName(
          nullOrEmpty(cloneEntity.getDisplayName())
              ? cloneEntity.getName()
              : cloneEntity.getDisplayName());
      cloneEntity.setFullyQualifiedName(cloneEntity.getFullyQualifiedName().replace("\"", "\\'"));
      clone.add(cloneEntity);
    }
    return clone;
  }

  default EntityReference getEntityWithDisplayName(EntityReference entity) {
    if (entity == null) {
      return null;
    }
    EntityReference cloneEntity = JsonUtils.deepCopy(entity, EntityReference.class);
    cloneEntity.setDisplayName(
        nullOrEmpty(cloneEntity.getDisplayName())
            ? cloneEntity.getName()
            : cloneEntity.getDisplayName());
    return cloneEntity;
  }

  default String getDescriptionStatus(EntityInterface entity) {
    return nullOrEmpty(entity.getDescription()) ? "INCOMPLETE" : "COMPLETE";
  }

  static List<Map<String, Object>> getLineageData(EntityReference entity) {
    List<Map<String, Object>> data = new ArrayList<>();
    CollectionDAO dao = Entity.getCollectionDAO();
    List<CollectionDAO.EntityRelationshipRecord> toRelationshipsRecords =
        dao.relationshipDAO()
            .findTo(entity.getId(), entity.getType(), Relationship.UPSTREAM.ordinal());
    for (CollectionDAO.EntityRelationshipRecord entityRelationshipRecord : toRelationshipsRecords) {
      EntityReference ref =
          Entity.getEntityReferenceById(
              entityRelationshipRecord.getType(), entityRelationshipRecord.getId(), Include.ALL);
      LineageDetails lineageDetails =
          JsonUtils.readValue(entityRelationshipRecord.getJson(), LineageDetails.class);
      data.add(buildRelationshipDetailsMap(entity, ref, lineageDetails));
    }
    List<CollectionDAO.EntityRelationshipRecord> fromRelationshipsRecords =
        dao.relationshipDAO()
            .findFrom(entity.getId(), entity.getType(), Relationship.UPSTREAM.ordinal());
    for (CollectionDAO.EntityRelationshipRecord entityRelationshipRecord :
        fromRelationshipsRecords) {
      EntityReference ref =
          Entity.getEntityReferenceById(
              entityRelationshipRecord.getType(), entityRelationshipRecord.getId(), Include.ALL);
      LineageDetails lineageDetails =
          JsonUtils.readValue(entityRelationshipRecord.getJson(), LineageDetails.class);
      data.add(buildRelationshipDetailsMap(ref, entity, lineageDetails));
    }
    return data;
  }

  private static void processConstraints(
      Table entity,
      Table relatedEntity,
      List<Map<String, Object>> constraints,
      Boolean updateForeignTableIndex) {
    if (!nullOrEmpty(entity.getTableConstraints())) {
      for (TableConstraint tableConstraint : entity.getTableConstraints()) {
        if (!tableConstraint
            .getConstraintType()
            .value()
            .equalsIgnoreCase(TableConstraint.ConstraintType.FOREIGN_KEY.value())) {
          continue;
        }
        int columnIndex = 0;
        for (String referredColumn : tableConstraint.getReferredColumns()) {
          String relatedEntityFQN = getParentFQN(referredColumn);
          String destinationIndexName = null;
          try {
            if (updateForeignTableIndex) {
              relatedEntity = getEntityByName(Entity.TABLE, relatedEntityFQN, "*", NON_DELETED);
              IndexMapping destinationIndexMapping =
                  Entity.getSearchRepository()
                      .getIndexMapping(relatedEntity.getEntityReference().getType());
              destinationIndexName =
                  destinationIndexMapping.getIndexName(
                      Entity.getSearchRepository().getClusterAlias());
            }
            Map<String, Object> relationshipsMap = buildRelationshipsMap(entity, relatedEntity);
            int relatedEntityIndex =
                checkRelatedEntity(
                    entity.getFullyQualifiedName(),
                    relatedEntity.getFullyQualifiedName(),
                    constraints);
            if (relatedEntityIndex >= 0) {
              updateExistingConstraint(
                  entity,
                  tableConstraint,
                  constraints.get(relatedEntityIndex),
                  destinationIndexName,
                  relatedEntity,
                  referredColumn,
                  columnIndex,
                  updateForeignTableIndex);
            } else {
              addNewConstraint(
                  entity,
                  tableConstraint,
                  constraints,
                  relationshipsMap,
                  destinationIndexName,
                  relatedEntity,
                  referredColumn,
                  columnIndex,
                  updateForeignTableIndex);
            }
            columnIndex++;
          } catch (EntityNotFoundException ex) {
          }
        }
      }
    }
  }

  static List<Map<String, Object>> populateEntityRelationshipData(Table entity) {
    List<Map<String, Object>> constraints = new ArrayList<>();
    processConstraints(entity, null, constraints, true);

    // We need to query the table_entity table to find the references this current table
    // has with other tables. We pick this info from the ES however in case of re-indexing this info
    // needs to be picked from the db
    CollectionDAO dao = Entity.getCollectionDAO();
    List<String> json_array =
        dao.tableDAO().findRelatedTables(entity.getFullyQualifiedName() + "%");
    for (String json : json_array) {
      Table foreign_table = JsonUtils.readValue(json, Table.class);
      processConstraints(foreign_table, entity, constraints, false);
    }
    return constraints;
  }

  static int checkRelatedEntity(
      String entityFQN, String relatedEntityFQN, List<Map<String, Object>> constraints) {
    int index = 0;
    for (Map<String, Object> constraint : constraints) {
      Map<String, Object> relatedConstraintEntity =
          (Map<String, Object>) constraint.get("relatedEntity");
      Map<String, Object> constraintEntity = (Map<String, Object>) constraint.get("entity");
      if (relatedConstraintEntity.get("fqn").equals(relatedEntityFQN)
          && constraintEntity.get("fqn").equals(entityFQN)) {
        return index;
      }
      index++;
    }
    return -1;
  }

  private static Map<String, Object> buildRelationshipsMap(
      EntityInterface entity, Table relatedEntity) {
    Map<String, Object> relationshipsMap = new HashMap<>();
    relationshipsMap.put("entity", buildEntityRefMap(entity.getEntityReference()));
    relationshipsMap.put("relatedEntity", buildEntityRefMap(relatedEntity.getEntityReference()));
    relationshipsMap.put(
        "doc_id", entity.getId().toString() + "-" + relatedEntity.getId().toString());
    return relationshipsMap;
  }

  private static void updateRelatedEntityIndex(
      String destinationIndexName, Table relatedEntity, Map<String, Object> constraint) {
    Pair<String, String> to = new ImmutablePair<>("_id", relatedEntity.getId().toString());
    searchClient.updateEntityRelationship(destinationIndexName, to, constraint);
  }

  private static void updateExistingConstraint(
      EntityInterface entity,
      TableConstraint tableConstraint,
      Map<String, Object> presentConstraint,
      String destinationIndexName,
      Table relatedEntity,
      String referredColumn,
      int columnIndex,
      Boolean updateForeignTableIndex) {
    String columnFQN =
        FullyQualifiedName.add(
            entity.getFullyQualifiedName(), tableConstraint.getColumns().get(columnIndex));

    Map<String, Object> columnMap = new HashMap<>();
    columnMap.put("columnFQN", columnFQN);
    columnMap.put("relatedColumnFQN", referredColumn);
    columnMap.put("relationshipType", tableConstraint.getRelationshipType());

    List<Map<String, Object>> presentColumns =
        (List<Map<String, Object>>) presentConstraint.get("columns");
    presentColumns.add(columnMap);
    if (updateForeignTableIndex) {
      updateRelatedEntityIndex(destinationIndexName, relatedEntity, presentConstraint);
    }
  }

  private static void addNewConstraint(
      EntityInterface entity,
      TableConstraint tableConstraint,
      List<Map<String, Object>> constraints,
      Map<String, Object> relationshipsMap,
      String destinationIndexName,
      Table relatedEntity,
      String referredColumn,
      int columnIndex,
      Boolean updateForeignTableIndex) {
    List<Map<String, Object>> columns = new ArrayList<>();
    String columnFQN =
        FullyQualifiedName.add(
            entity.getFullyQualifiedName(), tableConstraint.getColumns().get(columnIndex));

    Map<String, Object> columnMap = new HashMap<>();
    columnMap.put("columnFQN", columnFQN);
    columnMap.put("relatedColumnFQN", referredColumn);
    columnMap.put("relationshipType", tableConstraint.getRelationshipType());
    columns.add(columnMap);
    relationshipsMap.put("columns", columns);
    constraints.add(JsonUtils.getMap(relationshipsMap));
    if (updateForeignTableIndex) {
      updateRelatedEntityIndex(destinationIndexName, relatedEntity, relationshipsMap);
    }
  }

  static Map<String, Object> buildEntityRefMap(EntityReference entityRef) {
    Map<String, Object> details = new HashMap<>();
    details.put("id", entityRef.getId().toString());
    details.put("type", entityRef.getType());
    details.put("fqn", entityRef.getFullyQualifiedName());
    details.put("fqnHash", FullyQualifiedName.buildHash(entityRef.getFullyQualifiedName()));
    return details;
  }

  static Map<String, Float> getDefaultFields() {
    Map<String, Float> fields = new HashMap<>();
    fields.put(DISPLAY_NAME_KEYWORD, 10.0f);
    fields.put(FIELD_DISPLAY_NAME_NGRAM, 1.0f);
    fields.put(FIELD_DISPLAY_NAME, 10.0f);
    fields.put(FIELD_DESCRIPTION, 2.0f);
    fields.put(FULLY_QUALIFIED_NAME, 5.0f);
    fields.put(FULLY_QUALIFIED_NAME_PARTS, 5.0f);
    return fields;
  }

  static Map<String, Float> getAllFields() {
    Map<String, Float> fields = getDefaultFields();
    fields.putAll(TableIndex.getFields());
    fields.putAll(StoredProcedureIndex.getFields());
    fields.putAll(DashboardIndex.getFields());
    fields.putAll(DashboardDataModelIndex.getFields());
    fields.putAll(PipelineIndex.getFields());
    fields.putAll(TopicIndex.getFields());
    fields.putAll(MlModelIndex.getFields());
    fields.putAll(ContainerIndex.getFields());
    fields.putAll(SearchEntityIndex.getFields());
    fields.putAll(GlossaryTermIndex.getFields());
    fields.putAll(TagIndex.getFields());
    fields.putAll(DataProductIndex.getFields());
    fields.putAll(APIEndpointIndex.getFields());
    return fields;
  }
}
