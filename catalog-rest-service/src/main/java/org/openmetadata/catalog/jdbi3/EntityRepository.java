/*
 *  Copyright 2021 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.catalog.jdbi3;

import static org.openmetadata.catalog.util.EntityUtil.entityReferenceMatch;
import static org.openmetadata.catalog.util.EntityUtil.objectMatch;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.security.GeneralSecurityException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BiPredicate;
import javax.json.JsonPatch;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.UriInfo;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.entity.data.Table;
import org.openmetadata.catalog.entity.teams.User;
import org.openmetadata.catalog.exception.CatalogExceptionMessage;
import org.openmetadata.catalog.exception.EntityNotFoundException;
import org.openmetadata.catalog.jdbi3.CollectionDAO.EntityVersionPair;
import org.openmetadata.catalog.jdbi3.TableRepository.TableUpdater;
import org.openmetadata.catalog.type.ChangeDescription;
import org.openmetadata.catalog.type.ChangeEvent;
import org.openmetadata.catalog.type.EntityHistory;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.EventType;
import org.openmetadata.catalog.type.FieldChange;
import org.openmetadata.catalog.type.TagLabel;
import org.openmetadata.catalog.util.EntityInterface;
import org.openmetadata.catalog.util.EntityUtil;
import org.openmetadata.catalog.util.EntityUtil.Fields;
import org.openmetadata.catalog.util.JsonUtils;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.RestUtil.PatchResponse;
import org.openmetadata.catalog.util.RestUtil.PutResponse;
import org.openmetadata.catalog.util.ResultList;
import org.openmetadata.common.utils.CipherText;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * This is the base class used by Entity Resources to perform READ and WRITE operations to the backend database to
 * Create, Retrieve, Update, and Delete entities.
 *
 * <p>An entity has two types of fields - `attributes` and `relationships`.
 *
 * <ul>
 *   <li>The `attributes` are the core properties of the entity, example - entity id, name, fullyQualifiedName, columns
 *       for a table, etc.
 *   <li>The `relationships` are an associated between two entities, example - table belongs to a database, table has a
 *       tag, user owns a table, etc. All relationships are captured using {@code EntityReference}.
 * </ul>
 *
 * Entities are stored as JSON documents in the database. Each entity is stored in a separate table and is accessed
 * through a <i>Data Access Object</i> or <i>DAO</i> that corresponds to each of the entity. For example,
 * <i>table_entity</i> is the database table used to store JSON docs corresponding to <i>table</i> entity and {@link
 * org.openmetadata.catalog.jdbi3.CollectionDAO.TableDAO} is used as the DAO object to access the table_entity table.
 * All DAO objects for an entity are available in {@code daoCollection}. <br>
 * <br>
 * Relationships between entity is stored in a separate table that captures the edge - fromEntity, toEntity, and the
 * relationship name <i>entity_relationship</i> table and are supported by {@link
 * org.openmetadata.catalog.jdbi3.CollectionDAO.EntityRelationshipDAO} DAO object.
 *
 * <p>JSON document of an entity stores only <i>required</i> attributes of an entity. Some attributes such as
 * <i>href</i> are not stored and are created on the fly. <br>
 * <br>
 * Json document of an entity does not store relationships. As an example, JSON document for <i>table</i> entity does
 * not store the relationship <i>database</i> which is of type <i>EntityReference</i>. This is always retrieved from the
 * relationship table when required to ensure, the data stored is efficiently and consistently, and relationship
 * information does not become stale.
 */
public abstract class EntityRepository<T> {
  public static final Logger LOG = LoggerFactory.getLogger(EntityRepository.class);
  private final String collectionPath;
  private final Class<T> entityClass;
  private final String entityName;
  protected final EntityDAO<T> dao;
  protected final CollectionDAO daoCollection;
  protected boolean softDelete = true;
  protected final boolean supportsTags;
  protected final boolean supportsOwner;
  protected final boolean supportsFollower;

  /** Fields that can be updated during PATCH operation */
  private final Fields patchFields;

  /** Fields that can be updated during PUT operation */
  private final Fields putFields;

  EntityRepository(
      String collectionPath,
      String entityName,
      Class<T> entityClass,
      EntityDAO<T> entityDAO,
      CollectionDAO collectionDAO,
      Fields patchFields,
      Fields putFields,
      boolean supportsTags,
      boolean supportsOwner,
      boolean supportsFollower) {
    this.collectionPath = collectionPath;
    this.entityClass = entityClass;
    this.dao = entityDAO;
    this.daoCollection = collectionDAO;
    this.patchFields = patchFields;
    this.putFields = putFields;
    this.entityName = entityName;
    this.supportsTags = supportsTags;
    this.supportsOwner = supportsOwner;
    this.supportsFollower = supportsFollower;
    Entity.registerEntity(entityName, dao, this);
  }

  /** Entity related operations that should be implemented or overridden by entities */
  public abstract EntityInterface<T> getEntityInterface(T entity);

  /**
   * Set the requested fields in an entity. This is used for requesting specific fields in the object during GET
   * operations. It is also used during PUT and PATCH operations to set up fields that can be updated.
   */
  public abstract T setFields(T entity, Fields fields) throws IOException, ParseException;

  /**
   * This method is used for validating an entity to be created during POST, PUT, and PATCH operations and prepare the
   * entity with all the required attributes and relationships.
   *
   * <p>The implementation of this method must perform the following:
   *
   * <ol>
   *   <li>Prepare the values for attributes that are not required in the request but can be derived on the server side.
   *       Example - <i>>FullyQualifiedNames</i> of an entity can be derived from the hierarchy that an entity belongs
   *       to .
   *   <li>Validate all the attributes of an entity.
   *   <li>Validate all the relationships of an entity. As an example - during <i>table</i> creation, relationships such
   *       as <i>Tags</i>, <i>Owner</i>, <i>Database</i>a table belongs to are validated. During validation additional
   *       information that is not required in the create/update request are set up in the corresponding relationship
   *       fields.
   * </ol>
   *
   * At the end of this operation, entity is expected to be valid and fully constructed with all the fields that will be
   * sent as payload in the POST, PUT, and PATCH operations response.
   *
   * @see TableRepository#prepare(Table) for an example implementation
   */
  public abstract void prepare(T entity) throws IOException;

  /**
   * An entity is stored in the backend database as JSON document. The JSON includes some attributes of the entity and
   * does not include attributes such as <i>href</i>. The relationship fields of an entity is never stored in the JSON
   * document. It is always reconstructed based on relationship edges from the backend database. <br>
   * <br>
   * As an example, when <i>table</i> entity is stored, the attributes such as <i>href</i> and the relationships such as
   * <i>owner</i>, <i>database</i>, and <i>tags</i> are set to null. These attributes are restored back after the JSON
   * document is stored to be sent as response.
   *
   * @see TableRepository#storeEntity(Table, boolean) for an example implementation
   */
  public abstract void storeEntity(T entity, boolean update) throws IOException;

  /**
   * This method is called to store all the relationships of an entity. It is expected that all relationships are
   * already validated and completely setup before this method is called and no validation of relationships is required.
   *
   * @see TableRepository#storeRelationships(Table) for an example implementation
   */
  public abstract void storeRelationships(T entity);

  /**
   * PATCH operations can't overwrite certain fields, such as entity ID, fullyQualifiedNames etc. Instead of throwing an
   * error, we take lenient approach of ignoring the user error and restore those attributes based on what is already
   * stored in the original entity.
   */
  public abstract void restorePatchAttributes(T original, T updated);

  public EntityUpdater getUpdater(T original, T updated, boolean patchOperation) {
    return new EntityUpdater(original, updated, patchOperation);
  }

  @Transaction
  public final T get(UriInfo uriInfo, String id, Fields fields) throws IOException, ParseException {
    return withHref(uriInfo, setFields(dao.findEntityById(UUID.fromString(id)), fields));
  }

  @Transaction
  public final T getByName(UriInfo uriInfo, String fqn, Fields fields) throws IOException, ParseException {
    return withHref(uriInfo, setFields(dao.findEntityByName(fqn), fields));
  }

  @Transaction
  public final ResultList<T> listAfter(UriInfo uriInfo, Fields fields, String fqnPrefix, int limitParam, String after)
      throws GeneralSecurityException, IOException, ParseException {
    // forward scrolling, if after == null then first page is being asked
    List<String> jsons =
        dao.listAfter(fqnPrefix, limitParam + 1, after == null ? "" : CipherText.instance().decrypt(after));

    List<T> entities = new ArrayList<>();
    for (String json : jsons) {
      T entity = withHref(uriInfo, setFields(JsonUtils.readValue(json, entityClass), fields));
      entities.add(entity);
    }
    int total = dao.listCount(fqnPrefix);

    String beforeCursor;
    String afterCursor = null;
    beforeCursor = after == null ? null : getFullyQualifiedName(entities.get(0));
    if (entities.size() > limitParam) { // If extra result exists, then next page exists - return after cursor
      entities.remove(limitParam);
      afterCursor = getFullyQualifiedName(entities.get(limitParam - 1));
    }
    return getResultList(entities, beforeCursor, afterCursor, total);
  }

  @Transaction
  public final ResultList<T> listBefore(UriInfo uriInfo, Fields fields, String fqnPrefix, int limitParam, String before)
      throws IOException, GeneralSecurityException, ParseException {
    // Reverse scrolling - Get one extra result used for computing before cursor
    List<String> jsons = dao.listBefore(fqnPrefix, limitParam + 1, CipherText.instance().decrypt(before));

    List<T> entities = new ArrayList<>();
    for (String json : jsons) {
      T entity = withHref(uriInfo, setFields(JsonUtils.readValue(json, entityClass), fields));
      entities.add(entity);
    }
    int total = dao.listCount(fqnPrefix);

    String beforeCursor = null;
    String afterCursor;
    if (entities.size() > limitParam) { // If extra result exists, then previous page exists - return before cursor
      entities.remove(0);
      beforeCursor = getFullyQualifiedName(entities.get(0));
    }
    afterCursor = getFullyQualifiedName(entities.get(entities.size() - 1));
    return getResultList(entities, beforeCursor, afterCursor, total);
  }

  @Transaction
  public T getVersion(String id, String version) throws IOException, ParseException {
    Double requestedVersion = Double.parseDouble(version);
    String extension = EntityUtil.getVersionExtension(entityName, requestedVersion);

    // Get previous version from version history
    String json = daoCollection.entityExtensionDAO().getEntityVersion(id, extension);
    if (json != null) {
      return JsonUtils.readValue(json, entityClass);
    }
    // If requested the latest version, return it from current version of the entity
    T entity = setFields(dao.findEntityById(UUID.fromString(id)), putFields);
    EntityInterface<T> entityInterface = getEntityInterface(entity);
    if (entityInterface.getVersion().equals(requestedVersion)) {
      return entity;
    }
    throw EntityNotFoundException.byMessage(
        CatalogExceptionMessage.entityVersionNotFound(entityName, id, requestedVersion));
  }

  @Transaction
  public EntityHistory listVersions(String id) throws IOException, ParseException {
    T latest = setFields(dao.findEntityById(UUID.fromString(id)), putFields);
    String extensionPrefix = EntityUtil.getVersionExtensionPrefix(entityName);
    List<EntityVersionPair> oldVersions = daoCollection.entityExtensionDAO().getEntityVersions(id, extensionPrefix);
    oldVersions.sort(EntityUtil.compareVersion.reversed());

    final List<Object> allVersions = new ArrayList<>();
    allVersions.add(JsonUtils.pojoToJson(latest));
    oldVersions.forEach(version -> allVersions.add(version.getEntityJson()));
    return new EntityHistory().withEntityType(entityName).withVersions(allVersions);
  }

  public final T create(UriInfo uriInfo, T entity) throws IOException {
    return withHref(uriInfo, createInternal(entity));
  }

  @Transaction
  public final T createInternal(T entity) throws IOException {
    prepare(entity);
    return createNewEntity(entity);
  }

  @Transaction
  public final PutResponse<T> createOrUpdate(UriInfo uriInfo, T updated) throws IOException, ParseException {
    prepare(updated);
    // Check if there is any original, deleted or not
    T original = JsonUtils.readValue(dao.findDeletedOrExists(getFullyQualifiedName(updated)), entityClass);
    if (original == null) {
      return new PutResponse<>(Status.CREATED, withHref(uriInfo, createNewEntity(updated)), RestUtil.ENTITY_CREATED);
    }

    // Recover relationships if original was deleted before setFields
    recoverDeletedRelationships(original);
    // Get all the fields in the original entity that can be updated during PUT operation
    setFields(original, putFields);

    // Update the attributes and relationships of an entity
    EntityUpdater entityUpdater = getUpdater(original, updated, false);
    entityUpdater.update();
    String change = entityUpdater.fieldsChanged() ? RestUtil.ENTITY_UPDATED : RestUtil.ENTITY_NO_CHANGE;
    return new PutResponse<>(Status.OK, withHref(uriInfo, updated), change);
  }

  @Transaction
  public final PatchResponse<T> patch(UriInfo uriInfo, UUID id, String user, JsonPatch patch)
      throws IOException, ParseException {
    // Get all the fields in the original entity that can be updated during PATCH operation
    T original = setFields(dao.findEntityById(id), patchFields);

    // Apply JSON patch to the original entity to get the updated entity
    T updated = JsonUtils.applyPatch(original, patch, entityClass);
    EntityInterface<T> updatedEntity = getEntityInterface(updated);
    updatedEntity.setUpdateDetails(user, new Date());

    prepare(updated);
    restorePatchAttributes(original, updated);

    // Update the attributes and relationships of an entity
    EntityUpdater entityUpdater = getUpdater(original, updated, true);
    entityUpdater.update();
    String change = entityUpdater.fieldsChanged() ? RestUtil.ENTITY_UPDATED : RestUtil.ENTITY_NO_CHANGE;
    return new PatchResponse<>(Status.OK, withHref(uriInfo, updated), change);
  }

  @Transaction
  public PutResponse<T> addFollower(String updatedBy, UUID entityId, UUID userId) throws IOException {
    // Get entity
    T entity = dao.findEntityById(entityId);
    EntityInterface<T> entityInterface = getEntityInterface(entity);

    // Validate follower
    User user = daoCollection.userDAO().findEntityById(userId);
    if (Boolean.TRUE.equals(user.getDeleted())) {
      throw new IllegalArgumentException(CatalogExceptionMessage.deactivatedUser(userId));
    }

    // Add relationship
    int added =
        daoCollection
            .relationshipDAO()
            .insert(userId.toString(), entityId.toString(), Entity.USER, entityName, Relationship.FOLLOWS.ordinal());

    ChangeDescription change = new ChangeDescription().withPreviousVersion(entityInterface.getVersion());
    change
        .getFieldsAdded()
        .add(new FieldChange().withName("followers").withNewValue(List.of(Entity.getEntityReference(user))));

    ChangeEvent changeEvent =
        new ChangeEvent()
            .withChangeDescription(change)
            .withEventType(EventType.ENTITY_UPDATED)
            .withEntityType(entityName)
            .withEntityId(entityId)
            .withUserName(updatedBy)
            .withDateTime(new Date())
            .withCurrentVersion(entityInterface.getVersion())
            .withPreviousVersion(change.getPreviousVersion());

    return new PutResponse<>(added > 0 ? Status.CREATED : Status.OK, changeEvent, RestUtil.ENTITY_FIELDS_CHANGED);
  }

  @Transaction
  public final void delete(UUID id, boolean recursive) throws IOException {
    // If an entity being deleted contains other children entities, it can't be deleted
    List<EntityReference> contains =
        daoCollection.relationshipDAO().findTo(id.toString(), entityName, Relationship.CONTAINS.ordinal());

    if (!contains.isEmpty()) {
      if (!recursive) {
        throw new IllegalArgumentException(entityName + " is not empty");
      }
      // Soft delete all the contained entities
      for (EntityReference entityReference : contains) {
        LOG.info("Recursively deleting {} {}", entityReference.getType(), entityReference.getId());
        Entity.deleteEntity(entityReference.getType(), entityReference.getId(), recursive);
      }
    }

    if (softDelete) {
      T entity = dao.findEntityById(id);
      EntityInterface<T> entityInterface = getEntityInterface(entity);
      entityInterface.setDeleted(true);
      storeEntity(entity, true);
      daoCollection.relationshipDAO().softDeleteAll(id.toString(), entityName);
      return;
    }
    // Hard delete
    dao.delete(id);
    daoCollection.relationshipDAO().deleteAll(id.toString(), entityName);
  }

  @Transaction
  public PutResponse<T> deleteFollower(String updatedBy, UUID entityId, UUID userId) throws IOException {
    T entity = dao.findEntityById(entityId);
    EntityInterface<T> entityInterface = getEntityInterface(entity);

    // Validate follower
    User user = daoCollection.userDAO().findEntityById(userId);

    // Remove follower
    daoCollection
        .relationshipDAO()
        .delete(userId.toString(), Entity.USER, entityId.toString(), entityName, Relationship.FOLLOWS.ordinal());

    ChangeDescription change = new ChangeDescription().withPreviousVersion(entityInterface.getVersion());
    change
        .getFieldsDeleted()
        .add(new FieldChange().withName("followers").withOldValue(List.of(Entity.getEntityReference(user))));

    ChangeEvent changeEvent =
        new ChangeEvent()
            .withChangeDescription(change)
            .withEventType(EventType.ENTITY_UPDATED)
            .withEntityType(entityName)
            .withEntityId(entityId)
            .withUserName(updatedBy)
            .withDateTime(new Date())
            .withCurrentVersion(entityInterface.getVersion())
            .withPreviousVersion(change.getPreviousVersion());

    return new PutResponse<>(Status.OK, changeEvent, RestUtil.ENTITY_FIELDS_CHANGED);
  }

  public final String getFullyQualifiedName(T entity) {
    return getEntityInterface(entity).getFullyQualifiedName();
  }

  public final ResultList<T> getResultList(List<T> entities, String beforeCursor, String afterCursor, int total)
      throws GeneralSecurityException, UnsupportedEncodingException {
    return new ResultList<>(entities, beforeCursor, afterCursor, total);
  }

  private T createNewEntity(T entity) throws IOException {
    storeEntity(entity, false);
    storeRelationships(entity);
    return entity;
  }

  protected void store(UUID id, T entity, boolean update) throws JsonProcessingException {
    if (update) {
      dao.update(id, JsonUtils.pojoToJson(entity));
    } else {
      dao.insert(entity);
    }
  }

  protected EntityReference getOwner(T entity) throws IOException {
    EntityInterface entityInterface = getEntityInterface(entity);
    return supportsOwner && entity != null
        ? EntityUtil.populateOwner(
            entityInterface.getId(),
            entityName,
            daoCollection.relationshipDAO(),
            daoCollection.userDAO(),
            daoCollection.teamDAO())
        : null;
  }

  protected void setOwner(T entity, EntityReference owner) {
    if (supportsOwner) {
      EntityInterface<T> entityInterface = getEntityInterface(entity);
      EntityUtil.setOwner(daoCollection.relationshipDAO(), entityInterface.getId(), entityName, owner);
      entityInterface.setOwner(owner);
    }
  }

  protected void applyTags(T entity) {
    if (supportsTags) {
      // Add entity level tags by adding tag to the entity relationship
      EntityInterface<T> entityInterface = getEntityInterface(entity);
      EntityUtil.applyTags(daoCollection.tagDAO(), entityInterface.getTags(), entityInterface.getFullyQualifiedName());
      // Update tag to handle additional derived tags
      entityInterface.setTags(getTags(entityInterface.getFullyQualifiedName()));
    }
  }

  protected List<TagLabel> getTags(String fqn) {
    return !supportsOwner ? null : daoCollection.tagDAO().getTags(fqn);
  }

  protected List<EntityReference> getFollowers(T entity) throws IOException {
    EntityInterface<T> entityInterface = getEntityInterface(entity);
    return !supportsFollower || entity == null
        ? null
        : EntityUtil.getFollowers(
            entityInterface.getId(), entityName, daoCollection.relationshipDAO(), daoCollection.userDAO());
  }

  public T withHref(UriInfo uriInfo, T entity) {
    if (uriInfo == null) {
      return entity;
    }
    EntityInterface<T> entityInterface = getEntityInterface(entity);
    return entityInterface.withHref(getHref(uriInfo, entityInterface.getId()));
  }

  public URI getHref(UriInfo uriInfo, UUID id) {
    return RestUtil.getHref(uriInfo, collectionPath, id);
  }

  private void recoverDeletedRelationships(T original) {
    // If original is deleted, we need to recover the relationships before setting the fields
    // or we won't find the related services
    EntityInterface<T> originalRef = getEntityInterface(original);
    if (Boolean.TRUE.equals(originalRef.isDeleted())) {
      daoCollection.relationshipDAO().recoverSoftDeleteAll(originalRef.getId().toString());
    }
  }

  /**
   * Class that performs PUT and PATCH update operation. It takes an <i>updated</i> entity and <i>original</i> entity.
   * Performs comparison between then and updates the stored entity and also updates all the relationships. This class
   * also tracks the changes between original and updated to version the entity and produce change events. <br>
   * <br>
   * Common entity attributes such as description, displayName, owner, tags are handled by this class. Override {@code
   * entitySpecificUpdate()} to add additional entity specific fields to be updated.
   *
   * @see TableUpdater#entitySpecificUpdate() for example.
   */
  public class EntityUpdater {
    protected final EntityInterface<T> original;
    protected final EntityInterface<T> updated;
    protected final boolean patchOperation;
    protected final ChangeDescription changeDescription = new ChangeDescription();
    protected boolean majorVersionChange = false;

    public EntityUpdater(T original, T updated, boolean patchOperation) {
      this.original = getEntityInterface(original);
      this.updated = getEntityInterface(updated);
      this.patchOperation = patchOperation;
    }

    /** Compare original and updated entities and perform updates. Update the entity version and track changes. */
    public final void update() throws IOException {
      updated.setId(original.getId());
      updateDeleted();
      updateDescription();
      updateDisplayName();
      updateOwner();
      updateTags(updated.getFullyQualifiedName(), "tags", original.getTags(), updated.getTags());
      entitySpecificUpdate();

      // Store the updated entity
      storeUpdate();
    }

    public void entitySpecificUpdate() throws IOException {
      // Default implementation. Override this to add any entity specific field updates
    }

    private void updateDescription() throws JsonProcessingException {
      if (!patchOperation && original.getDescription() != null && !original.getDescription().isEmpty()) {
        // Update description only when stored is empty to retain user authored descriptions
        updated.setDescription(original.getDescription());
        return;
      }
      recordChange("description", original.getDescription(), updated.getDescription());
    }

    private void updateDeleted() throws JsonProcessingException {
      if (Boolean.TRUE.equals(original.isDeleted())) {
        updated.setDeleted(false);
        recordChange("deleted", true, false);
      }
    }

    private void updateDisplayName() throws JsonProcessingException {
      if (!patchOperation && original.getDisplayName() != null && !original.getDisplayName().isEmpty()) {
        // Update displayName only when stored is empty to retain user authored descriptions
        updated.setDisplayName(original.getDisplayName());
        return;
      }
      recordChange("displayName", original.getDisplayName(), updated.getDisplayName());
    }

    private void updateOwner() throws JsonProcessingException {
      EntityReference origOwner = original.getOwner();
      EntityReference updatedOwner = updated.getOwner();
      if (patchOperation || updatedOwner != null) {
        // Update owner for all PATCH operations. For PUT operations, ownership can't be removed
        if (recordChange("owner", origOwner, updatedOwner, true, entityReferenceMatch)) {
          EntityUtil.updateOwner(
              daoCollection.relationshipDAO(), origOwner, updatedOwner, original.getId(), entityName);
        }
      }
    }

    protected final void updateTags(String fqn, String fieldName, List<TagLabel> origTags, List<TagLabel> updatedTags)
        throws IOException {
      // Remove current entity tags in the database. It will be added back later from the merged tag list.
      origTags = Optional.ofNullable(origTags).orElse(Collections.emptyList());
      updatedTags = Optional.ofNullable(updatedTags).orElse(Collections.emptyList());
      if (origTags.isEmpty() && updatedTags.isEmpty()) {
        return; // Nothing to update
      }

      // Remove current entity tags in the database. It will be added back later from the merged tag list.
      EntityUtil.removeTagsByPrefix(daoCollection.tagDAO(), fqn);
      if (!patchOperation) {
        // PUT operation merges tags in the request with what already exists
        EntityUtil.mergeTags(updatedTags, origTags);
      }

      List<TagLabel> addedTags = new ArrayList<>();
      List<TagLabel> deletedTags = new ArrayList<>();
      recordListChange(fieldName, origTags, updatedTags, addedTags, deletedTags, EntityUtil.tagLabelMatch);
      updatedTags.sort(EntityUtil.compareTagLabel);
      EntityUtil.applyTags(daoCollection.tagDAO(), updatedTags, fqn);
    }

    public final boolean updateVersion(Double oldVersion) {
      Double newVersion = oldVersion;
      if (majorVersionChange) {
        newVersion = Math.round((oldVersion + 1.0) * 10.0) / 10.0;
      } else if (fieldsChanged()) {
        newVersion = Math.round((oldVersion + 0.1) * 10.0) / 10.0;
      }
      LOG.info(
          "{} {}->{} - Fields added {}, updated {}, deleted {}",
          original.getId(),
          oldVersion,
          newVersion,
          changeDescription.getFieldsAdded(),
          changeDescription.getFieldsUpdated(),
          changeDescription.getFieldsDeleted());
      changeDescription.withPreviousVersion(oldVersion);
      updated.setChangeDescription(newVersion, changeDescription);
      return !newVersion.equals(oldVersion);
    }

    public boolean fieldsChanged() {
      return !changeDescription.getFieldsAdded().isEmpty()
          || !changeDescription.getFieldsUpdated().isEmpty()
          || !changeDescription.getFieldsDeleted().isEmpty();
    }

    public final <K> boolean recordChange(String field, K orig, K updated) throws JsonProcessingException {
      return recordChange(field, orig, updated, false, objectMatch);
    }

    public final <K> boolean recordChange(String field, K orig, K updated, boolean jsonValue)
        throws JsonProcessingException {
      return recordChange(field, orig, updated, jsonValue, objectMatch);
    }

    public final <K> boolean recordChange(
        String field, K orig, K updated, boolean jsonValue, BiPredicate<K, K> typeMatch)
        throws JsonProcessingException {
      if (orig == null && updated == null) {
        return false;
      }
      FieldChange fieldChange =
          new FieldChange()
              .withName(field)
              .withOldValue(jsonValue ? JsonUtils.pojoToJson(orig) : orig)
              .withNewValue(jsonValue ? JsonUtils.pojoToJson(updated) : updated);
      if (orig == null) {
        changeDescription.getFieldsAdded().add(fieldChange);
        return true;
      } else if (updated == null) {
        changeDescription.getFieldsDeleted().add(fieldChange);
        return true;
      } else if (!typeMatch.test(orig, updated)) {
        changeDescription.getFieldsUpdated().add(fieldChange);
        return true;
      }
      return false;
    }

    public final <K> boolean recordListChange(
        String field,
        List<K> origList,
        List<K> updatedList,
        List<K> addedItems,
        List<K> deletedItems,
        BiPredicate<K, K> typeMatch)
        throws JsonProcessingException {
      origList = Optional.ofNullable(origList).orElse(Collections.emptyList());
      updatedList = Optional.ofNullable(updatedList).orElse(Collections.emptyList());
      for (K stored : origList) {
        // If an entry in the original list is not in updated list, then it is deleted during update
        K updated = updatedList.stream().filter(c -> typeMatch.test(c, stored)).findAny().orElse(null);
        if (updated == null) {
          deletedItems.add(stored);
        }
      }

      for (K updated : updatedList) {
        // If an entry in the updated list is not in original list, then it is added during update
        K stored = origList.stream().filter(c -> typeMatch.test(c, updated)).findAny().orElse(null);
        if (stored == null) { // New column added
          addedItems.add(updated);
        }
      }
      if (!addedItems.isEmpty()) {
        FieldChange fieldChange = new FieldChange().withName(field).withNewValue(JsonUtils.pojoToJson(addedItems));
        changeDescription.getFieldsAdded().add(fieldChange);
      }
      if (!deletedItems.isEmpty()) {
        FieldChange fieldChange = new FieldChange().withName(field).withOldValue(JsonUtils.pojoToJson(deletedItems));
        changeDescription.getFieldsDeleted().add(fieldChange);
      }
      return !addedItems.isEmpty() || !deletedItems.isEmpty();
    }

    public final void storeUpdate() throws IOException {
      if (updateVersion(original.getVersion())) { // Update changed the entity veresion
        // Store the old version
        String extensionName = EntityUtil.getVersionExtension(entityName, original.getVersion());
        daoCollection
            .entityExtensionDAO()
            .insert(original.getId().toString(), extensionName, entityName, JsonUtils.pojoToJson(original.getEntity()));

        // Store the new version
        EntityRepository.this.storeEntity(updated.getEntity(), true);
      } else { // Update did not change the entity version
        updated.setUpdateDetails(original.getUpdatedBy(), original.getUpdatedAt());
      }
    }
  }
}
