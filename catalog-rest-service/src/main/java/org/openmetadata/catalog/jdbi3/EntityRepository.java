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

import static org.openmetadata.catalog.Entity.FIELD_DESCRIPTION;
import static org.openmetadata.catalog.Entity.FIELD_OWNER;
import static org.openmetadata.catalog.Entity.helper;
import static org.openmetadata.catalog.type.Include.DELETED;
import static org.openmetadata.catalog.util.EntityUtil.entityReferenceMatch;
import static org.openmetadata.catalog.util.EntityUtil.nextMajorVersion;
import static org.openmetadata.catalog.util.EntityUtil.nextVersion;
import static org.openmetadata.catalog.util.EntityUtil.objectMatch;
import static org.openmetadata.catalog.util.EntityUtil.toBoolean;
import static org.openmetadata.common.utils.CommonUtil.listOrEmpty;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.net.URI;
import java.security.GeneralSecurityException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BiPredicate;
import java.util.regex.Pattern;
import javax.json.JsonPatch;
import javax.ws.rs.core.Response.Status;
import javax.ws.rs.core.UriInfo;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.maven.shared.utils.io.IOUtil;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.catalog.CatalogApplicationConfig;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.entity.data.Table;
import org.openmetadata.catalog.entity.teams.User;
import org.openmetadata.catalog.exception.CatalogExceptionMessage;
import org.openmetadata.catalog.exception.EntityNotFoundException;
import org.openmetadata.catalog.exception.UnhandledServerException;
import org.openmetadata.catalog.jdbi3.CollectionDAO.EntityVersionPair;
import org.openmetadata.catalog.jdbi3.TableRepository.TableUpdater;
import org.openmetadata.catalog.type.ChangeDescription;
import org.openmetadata.catalog.type.ChangeEvent;
import org.openmetadata.catalog.type.EntityHistory;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.EventType;
import org.openmetadata.catalog.type.FieldChange;
import org.openmetadata.catalog.type.Include;
import org.openmetadata.catalog.type.Relationship;
import org.openmetadata.catalog.type.TagLabel;
import org.openmetadata.catalog.util.EntityInterface;
import org.openmetadata.catalog.util.EntityUtil;
import org.openmetadata.catalog.util.EntityUtil.Fields;
import org.openmetadata.catalog.util.JsonUtils;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.RestUtil.DeleteResponse;
import org.openmetadata.catalog.util.RestUtil.PatchResponse;
import org.openmetadata.catalog.util.RestUtil.PutResponse;
import org.openmetadata.catalog.util.ResultList;
import org.openmetadata.common.utils.CipherText;
import org.openmetadata.common.utils.CommonUtil;

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
@Slf4j
public abstract class EntityRepository<T> {
  private final String collectionPath;
  private final Class<T> entityClass;
  private final String entityType;
  protected final EntityDAO<T> dao;
  protected final CollectionDAO daoCollection;
  protected boolean supportsSoftDelete = true;
  protected final boolean supportsTags;
  protected final boolean supportsOwner;
  protected final boolean supportsFollower;

  /** Fields that can be updated during PATCH operation */
  private final Fields patchFields;

  /** Fields that can be updated during PUT operation */
  private final Fields putFields;

  EntityRepository(
      String collectionPath,
      String entityType,
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
    this.entityType = entityType;
    this.supportsTags = supportsTags;
    this.supportsOwner = supportsOwner;
    this.supportsFollower = supportsFollower;
    Entity.registerEntity(entityClass, entityType, dao, this);
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
  public abstract void prepare(T entity) throws IOException, ParseException;

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
  public void restorePatchAttributes(T original, T updated) {
    /* Nothing to restore during PATCH */
  }

  /**
   * Initialize data from json files if seed data does not exist in corresponding tables. Seed data is stored under
   * catalog-rest-service/src/main/resources/json/data/{entityType}
   *
   * <p>This method needs to be explicitly called, typically from initialize method. See {@link
   * org.openmetadata.catalog.resources.teams.RoleResource#initialize(CatalogApplicationConfig)}
   */
  public void initSeedDataFromResources() throws IOException {
    Pattern pattern = Pattern.compile(String.format(".*json/data/%s/.*\\.json$", entityType));
    List<String> jsonDataFiles = CommonUtil.getResources(pattern);
    jsonDataFiles.forEach(
        jsonDataFile -> {
          try {
            String json =
                IOUtil.toString(Objects.requireNonNull(getClass().getClassLoader().getResourceAsStream(jsonDataFile)));
            initSeedData(JsonUtils.readValue(json, entityClass));
          } catch (IOException e) {
            LOG.warn("Failed to initialize the {} from file {}: {}", entityType, jsonDataFile, e.getMessage());
          }
        });
  }

  /** Initialize a given entity if it does not exist. */
  @Transaction
  public void initSeedData(T entity) throws IOException {
    EntityInterface<T> entityInterface = Entity.getEntityInterface(entity);
    String existingJson = dao.findJsonByFqn(entityInterface.getFullyQualifiedName(), Include.ALL);
    if (existingJson != null) {
      LOG.info("{} {} is already initialized", entityType, entityInterface.getFullyQualifiedName());
      return;
    }

    LOG.info("{} {} is not initialized", entityType, entityInterface.getFullyQualifiedName());
    entityInterface.setUpdateDetails("admin", System.currentTimeMillis());
    entityInterface.setId(UUID.randomUUID());
    storeEntity(entityInterface.getEntity(), false);
    LOG.info("Created a new {} {}", entityType, entityInterface.getFullyQualifiedName());
  }

  public EntityUpdater getUpdater(T original, T updated, Operation operation) {
    return new EntityUpdater(original, updated, operation);
  }

  @Transaction
  public final T get(UriInfo uriInfo, String id, Fields fields) throws IOException, ParseException {
    return withHref(uriInfo, setFields(dao.findEntityById(UUID.fromString(id)), fields));
  }

  @Transaction
  public final T get(UriInfo uriInfo, String id, Fields fields, Include include) throws IOException, ParseException {
    return withHref(uriInfo, setFields(dao.findEntityById(UUID.fromString(id), include), fields));
  }

  @Transaction
  public final T getByName(UriInfo uriInfo, String fqn, Fields fields) throws IOException, ParseException {
    return withHref(uriInfo, setFields(dao.findEntityByName(fqn), fields));
  }

  @Transaction
  public final T getByName(UriInfo uriInfo, String fqn, Fields fields, Include include)
      throws IOException, ParseException {
    return withHref(uriInfo, setFields(dao.findEntityByName(fqn, include), fields));
  }

  @Transaction
  public final ResultList<T> listAfter(
      UriInfo uriInfo, Fields fields, String fqnPrefix, int limitParam, String after, Include include)
      throws GeneralSecurityException, IOException, ParseException {
    // forward scrolling, if after == null then first page is being asked
    List<String> jsons =
        dao.listAfter(fqnPrefix, limitParam + 1, after == null ? "" : CipherText.instance().decrypt(after), include);

    List<T> entities = new ArrayList<>();
    for (String json : jsons) {
      T entity = withHref(uriInfo, setFields(JsonUtils.readValue(json, entityClass), fields));
      entities.add(entity);
    }
    int total = dao.listCount(fqnPrefix, include);

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
  public final ResultList<T> listBefore(
      UriInfo uriInfo, Fields fields, String fqnPrefix, int limitParam, String before, Include include)
      throws IOException, GeneralSecurityException, ParseException {
    // Reverse scrolling - Get one extra result used for computing before cursor
    List<String> jsons = dao.listBefore(fqnPrefix, limitParam + 1, CipherText.instance().decrypt(before), include);

    List<T> entities = new ArrayList<>();
    for (String json : jsons) {
      T entity = withHref(uriInfo, setFields(JsonUtils.readValue(json, entityClass), fields));
      entities.add(entity);
    }
    int total = dao.listCount(fqnPrefix, include);

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
    String extension = EntityUtil.getVersionExtension(entityType, requestedVersion);

    // Get previous version from version history
    String json = daoCollection.entityExtensionDAO().getEntityVersion(id, extension);
    if (json != null) {
      return JsonUtils.readValue(json, entityClass);
    }
    // If requested the latest version, return it from current version of the entity
    T entity = setFields(dao.findEntityById(UUID.fromString(id), Include.ALL), putFields);
    EntityInterface<T> entityInterface = getEntityInterface(entity);
    if (entityInterface.getVersion().equals(requestedVersion)) {
      return entity;
    }
    throw EntityNotFoundException.byMessage(
        CatalogExceptionMessage.entityVersionNotFound(entityType, id, requestedVersion));
  }

  @Transaction
  public EntityHistory listVersions(String id) throws IOException, ParseException {
    T latest = setFields(dao.findEntityById(UUID.fromString(id), Include.ALL), putFields);
    String extensionPrefix = EntityUtil.getVersionExtensionPrefix(entityType);
    List<EntityVersionPair> oldVersions = daoCollection.entityExtensionDAO().getEntityVersions(id, extensionPrefix);
    oldVersions.sort(EntityUtil.compareVersion.reversed());

    final List<Object> allVersions = new ArrayList<>();
    allVersions.add(JsonUtils.pojoToJson(latest));
    oldVersions.forEach(version -> allVersions.add(version.getEntityJson()));
    return new EntityHistory().withEntityType(entityType).withVersions(allVersions);
  }

  public final T create(UriInfo uriInfo, T entity) throws IOException, ParseException {
    return withHref(uriInfo, createInternal(entity));
  }

  @Transaction
  public final T createInternal(T entity) throws IOException, ParseException {
    prepare(entity);
    return createNewEntity(entity);
  }

  public final PutResponse<T> createOrUpdate(UriInfo uriInfo, T updated) throws IOException, ParseException {
    // By default, do not allow updates on original description or display names of entities
    return createOrUpdate(uriInfo, updated, false);
  }

  @Transaction
  public final PutResponse<T> createOrUpdate(UriInfo uriInfo, T updated, boolean allowEdits)
      throws IOException, ParseException {
    prepare(updated);
    EntityInterface<T> updatedInterface = getEntityInterface(updated);

    // Check if there is any original, deleted or not
    T original = JsonUtils.readValue(dao.findJsonByFqn(getFullyQualifiedName(updated), Include.ALL), entityClass);
    if (original == null) {
      return new PutResponse<>(Status.CREATED, withHref(uriInfo, createNewEntity(updated)), RestUtil.ENTITY_CREATED);
    }
    // Get all the fields in the original entity that can be updated during PUT operation
    setFields(original, putFields);

    // If the entity state is soft-deleted, recursively undelete the entity and it's children
    EntityInterface<T> origInterface = getEntityInterface(original);
    if (origInterface.isDeleted()) {
      restoreEntity(updatedInterface.getUpdatedBy(), entityType, origInterface.getId());
    }

    // Update the attributes and relationships of an entity
    EntityUpdater entityUpdater = getUpdater(original, updated, Operation.PUT);
    entityUpdater.update(allowEdits);
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
    updatedEntity.setUpdateDetails(user, System.currentTimeMillis());

    prepare(updated);
    restorePatchAttributes(original, updated);

    // Update the attributes and relationships of an entity
    EntityUpdater entityUpdater = getUpdater(original, updated, Operation.PATCH);
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
    int added = addRelationship(userId, entityId, Entity.USER, entityType, Relationship.FOLLOWS);

    ChangeDescription change = new ChangeDescription().withPreviousVersion(entityInterface.getVersion());
    change
        .getFieldsAdded()
        .add(new FieldChange().withName("followers").withNewValue(List.of(Entity.getEntityReference(user))));

    ChangeEvent changeEvent =
        new ChangeEvent()
            .withChangeDescription(change)
            .withEventType(EventType.ENTITY_UPDATED)
            .withEntityType(entityType)
            .withEntityId(entityId)
            .withEntityFullyQualifiedName(entityInterface.getFullyQualifiedName())
            .withUserName(updatedBy)
            .withTimestamp(System.currentTimeMillis())
            .withCurrentVersion(entityInterface.getVersion())
            .withPreviousVersion(change.getPreviousVersion());

    return new PutResponse<>(added > 0 ? Status.CREATED : Status.OK, changeEvent, RestUtil.ENTITY_FIELDS_CHANGED);
  }

  @Transaction
  public final DeleteResponse<T> delete(String updatedBy, String id) throws IOException, ParseException {
    return delete(updatedBy, id, false);
  }

  @Transaction
  public final DeleteResponse<T> delete(String updatedBy, String id, boolean recursive)
      throws IOException, ParseException {
    // Validate entity
    String json = dao.findJsonById(id, Include.NON_DELETED);
    if (json == null) {
      throw EntityNotFoundException.byMessage(CatalogExceptionMessage.entityNotFound(entityType, id));
    }

    T original = JsonUtils.readValue(json, entityClass);
    setFields(original, putFields);

    // If an entity being deleted contains other **non-deleted** children entities, it can't be deleted
    List<EntityReference> contains =
        daoCollection
            .relationshipDAO()
            .findTo(id, entityType, Relationship.CONTAINS.ordinal(), toBoolean(Include.NON_DELETED));

    if (!contains.isEmpty()) {
      if (!recursive) {
        throw new IllegalArgumentException(entityType + " is not empty");
      }
      // Soft delete all the contained entities
      for (EntityReference entityReference : contains) {
        LOG.info("Recursively deleting {} {}", entityReference.getType(), entityReference.getId());
        Entity.deleteEntity(updatedBy, entityReference.getType(), entityReference.getId(), recursive);
      }
    }

    String changeType;
    T updated = JsonUtils.readValue(json, entityClass);
    EntityInterface<T> entityInterface = getEntityInterface(updated);
    entityInterface.setUpdateDetails(updatedBy, System.currentTimeMillis());
    if (supportsSoftDelete) {
      entityInterface.setDeleted(true);
      EntityUpdater updater = getUpdater(original, updated, Operation.SOFT_DELETE);
      updater.update();
      daoCollection.relationshipDAO().softDeleteAll(id, entityType);
      changeType = RestUtil.ENTITY_SOFT_DELETED;
    } else {
      // Hard delete
      dao.delete(id);
      daoCollection.relationshipDAO().deleteAll(id, entityType);
      changeType = RestUtil.ENTITY_DELETED;
    }
    return new DeleteResponse<>(updated, changeType);
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
        .delete(userId.toString(), Entity.USER, entityId.toString(), entityType, Relationship.FOLLOWS.ordinal());

    ChangeDescription change = new ChangeDescription().withPreviousVersion(entityInterface.getVersion());
    change
        .getFieldsDeleted()
        .add(new FieldChange().withName("followers").withOldValue(List.of(Entity.getEntityReference(user))));

    ChangeEvent changeEvent =
        new ChangeEvent()
            .withChangeDescription(change)
            .withEventType(EventType.ENTITY_UPDATED)
            .withEntityFullyQualifiedName(entityInterface.getFullyQualifiedName())
            .withEntityType(entityType)
            .withEntityId(entityId)
            .withUserName(updatedBy)
            .withTimestamp(System.currentTimeMillis())
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

  public static final Fields FIELDS_OWNER = new Fields(List.of(FIELD_OWNER), FIELD_OWNER);

  public final EntityReference getOriginalOwner(T entity) throws IOException, ParseException {
    // Try to find the owner if entity exists
    try {
      String fqn = getFullyQualifiedName(entity);
      entity = getByName(null, fqn, FIELDS_OWNER);
      return helper(entity).validateOwnerOrNull();
    } catch (EntityNotFoundException e) {
      // If entity is not found, we can return null for owner and ignore this exception
    }
    return null;
  }

  protected EntityReference getOwner(T entity) throws IOException, ParseException {
    return helper(entity).getOwnerOrNull();
  }

  protected void setOwner(T entity, EntityReference owner) {
    if (supportsOwner) {
      EntityInterface<T> entityInterface = getEntityInterface(entity);
      setOwner(entityInterface.getId(), entityType, owner);
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
    return !supportsTags ? null : daoCollection.tagDAO().getTags(fqn);
  }

  protected List<EntityReference> getFollowers(T entity) throws IOException {
    EntityInterface<T> entityInterface = getEntityInterface(entity);
    return !supportsFollower || entity == null
        ? null
        : EntityUtil.getFollowers(
            entityInterface, entityType, daoCollection.relationshipDAO(), daoCollection.userDAO());
  }

  public T withHref(UriInfo uriInfo, T entity) {
    if (uriInfo == null) {
      return entity;
    }
    EntityInterface<T> entityInterface = getEntityInterface(entity);
    return entityInterface.withHref(getHref(uriInfo, entityInterface.getId()));
  }

  public Include toInclude(T entity) {
    EntityInterface<T> entityInterface = getEntityInterface(entity);
    return entityInterface.isDeleted() ? DELETED : Include.NON_DELETED;
  }

  public URI getHref(UriInfo uriInfo, UUID id) {
    return RestUtil.getHref(uriInfo, collectionPath, id);
  }

  public void restoreEntity(String updatedBy, String entityType, UUID id) throws IOException, ParseException {
    // If an entity being restored contains other **deleted** children entities, restore them
    List<EntityReference> contains =
        daoCollection
            .relationshipDAO()
            .findTo(id.toString(), entityType, Relationship.CONTAINS.ordinal(), toBoolean(Include.DELETED));

    if (!contains.isEmpty()) {
      // Restore all the contained entities
      for (EntityReference entityReference : contains) {
        LOG.info("Recursively restoring {} {}", entityReference.getType(), entityReference.getId());
        Entity.restoreEntity(updatedBy, entityReference.getType(), entityReference.getId());
      }
    }

    // Restore all the relationships from and to the entity as not deleted
    daoCollection.relationshipDAO().recoverSoftDeleteAll(id.toString());

    // Finally set entity deleted flag to false
    T entity = dao.findEntityById(id, DELETED);
    EntityInterface<T> entityInterface = getEntityInterface(entity);
    entityInterface.setDeleted(false);
    dao.update(entityInterface.getId(), JsonUtils.pojoToJson(entity));
  }

  /** Builder method for EntityHandler */
  public EntityHelper getEntityHandler(T entity) {
    return new EntityHelper(entity);
  }

  /** Decorator class for Entity. */
  public class EntityHelper {
    private final Include isDeleted;
    protected final EntityInterface<T> entityInterface;
    private final T entity;

    private EntityHelper(T entity) {
      this.entityInterface = getEntityInterface(entity);
      this.entity = entity;
      this.isDeleted = entityInterface.isDeleted() ? DELETED : Include.NON_DELETED;
    }

    public EntityReference toEntityReference() {
      return entityInterface.getEntityReference();
    }

    public Include isDeleted() {
      return isDeleted;
    }

    /**
     * Validate the owner if not null before creating this resource. Owner must exist, not being deleted, and must be
     * either User or Team.
     */
    public EntityReference validateOwnerOrNull() throws IOException, ParseException {
      EntityReference entityReference = validateFieldOrNull(FIELD_OWNER);
      if (entityReference == null) {
        return null;
      } else if (!List.of(Entity.USER, Entity.TEAM).contains(entityReference.getType())) {
        throw new IllegalArgumentException(String.format("Invalid type %s", entityReference.getType()));
      }
      return entityReference;
    }

    /**
     * Validate a field containing a EntityReference if not null before creating this resource. The target entity must
     * exist and not deleted.
     */
    @SneakyThrows({NoSuchMethodException.class, InvocationTargetException.class, IllegalAccessException.class})
    public EntityReference validateFieldOrNull(String fieldName) throws IOException, ParseException {
      Method method = entity.getClass().getMethod("get" + StringUtils.capitalize(fieldName));
      EntityReference entityReference = (EntityReference) method.invoke(entity);
      if (entityReference == null) {
        return null;
      }
      // this could be changed to Include.NON_DELETED because we validate only when creating entities linked to
      // non-deleted entities.
      return helper(Entity.getEntity(entityReference, Fields.EMPTY_FIELDS, isDeleted)).toEntityReference();
    }

    /**
     * When listing and getting resources, we need to get entities using the relationships. If the relationship exists
     * then the entity must exist.
     */
    public EntityReference getOwnerOrNull() throws IOException, ParseException {
      List<EntityReference> refs =
          daoCollection
              .relationshipDAO()
              .findFrom(
                  entityInterface.getId().toString(), entityType, Relationship.OWNS.ordinal(), toBoolean(isDeleted));
      if (refs.isEmpty()) {
        return null;
      } else if (refs.size() > 1) {
        LOG.warn(
            "Possible database issues - multiple owners found for entity {} with type {}",
            entityInterface.getId(),
            entityInterface.getEntityReference().getType());
      }
      if (!List.of(Entity.USER, Entity.TEAM).contains(refs.get(0).getType())) {
        throw new IllegalArgumentException(String.format("Invalid ownerType %s", refs.get(0).getType()));
      } else {
        return helper(Entity.getEntity(refs.get(0), Fields.EMPTY_FIELDS, Include.ALL)).toEntityReference();
      }
    }

    /**
     * An entity could have (HAS) another entity like in for table and location.
     *
     * @param leftEntityType the entity name of the target of HAS.
     */
    public EntityReference getHasOrNull(String leftEntityType) throws IOException, ParseException {
      List<EntityReference> refs =
          daoCollection
              .relationshipDAO()
              .findToReference(
                  entityInterface.getId().toString(),
                  entityType,
                  Relationship.HAS.ordinal(),
                  leftEntityType,
                  toBoolean(isDeleted));
      if (refs.isEmpty()) {
        return null;
      } else if (refs.size() > 1) {
        LOG.warn(
            "Possible database issues - multiple HAS relationships found for entity {} with type {}",
            entityInterface.getId(),
            entityInterface.getEntityReference().getType());
      }
      return helper(Entity.getEntity(refs.get(0), Fields.EMPTY_FIELDS, Include.ALL)).toEntityReference();
    }

    /**
     * Some entities like table must have a container
     *
     * @param containerEntityType entity name of the container. database for table, databaseService for database, and so
     *     on.
     */
    public EntityReference getContainer(String containerEntityType) throws IOException, ParseException {
      List<EntityReference> refs =
          daoCollection
              .relationshipDAO()
              .findFromEntity(
                  entityInterface.getId().toString(),
                  entityType,
                  Relationship.CONTAINS.ordinal(),
                  // FIXME: containerEntityName should be a property of the entity decorated.
                  containerEntityType,
                  null);
      if (refs.isEmpty()) {
        throw new UnhandledServerException(CatalogExceptionMessage.entityTypeNotFound(containerEntityType));
      } else if (refs.size() > 1) {
        LOG.warn(
            "Possible database issues - multiple containers found for entity {} with type {}",
            entityInterface.getId(),
            entityInterface.getEntityReference().getType());
      }
      return helper(Entity.getEntity(refs.get(0), Fields.EMPTY_FIELDS, Include.ALL)).toEntityReference();
    }

    public EntityReference getContainer() throws IOException, ParseException {
      return getContainer(Collections.emptyList());
    }

    public EntityReference getContainer(List<String> containerEntityTypes) throws IOException, ParseException {
      List<EntityReference> refs =
          daoCollection
              .relationshipDAO()
              .findFrom(
                  entityInterface.getId().toString(),
                  entityType,
                  Relationship.CONTAINS.ordinal(),
                  toBoolean(isDeleted));
      if (refs.isEmpty()) {
        throw new UnhandledServerException(
            CatalogExceptionMessage.entityTypeNotFound(String.join(" or ", containerEntityTypes)));
      } else if (refs.size() > 1) {
        LOG.warn(
            "Possible database issues - multiple containers found for entity {} with type {}",
            entityInterface.getId(),
            entityInterface.getEntityReference().getType());
      }
      if (containerEntityTypes.size() > 0 && !containerEntityTypes.contains(refs.get(0).getType())) {
        throw new IllegalArgumentException(String.format("Invalid type %s", refs.get(0).getType()));
      }
      return helper(Entity.getEntity(refs.get(0), Fields.EMPTY_FIELDS, Include.ALL)).toEntityReference();
    }

    /** Validate the type of the entity pointed by the field and return it. */
    public <S> S findEntity(String fieldName, String entityType) throws IOException, ParseException {
      return findEntity(fieldName, List.of(entityType));
    }

    /** Validate the type of the entity pointed by the field and return it. */
    public <S> S findEntity(String fieldName, List<String> entityTypes) throws IOException, ParseException {
      S entity = findEntity(fieldName);
      EntityReference entityReference = Entity.getEntityReference(entity);
      if (entityTypes.size() > 0 && !entityTypes.contains(entityReference.getType())) {
        throw new IllegalArgumentException(String.format("Invalid type %s", entityReference.getType()));
      }
      return entity;
    }

    /**
     * Find the entity whose EntityReference is stored in the field with name fieldName. It must include deleted and
     * non-deleted because if a field are set by setFields and setFields checks if the relationships are still valid
     * before storing the EntityReferences.
     *
     * @param fieldName the name of the field
     * @param <S> the class of the entity pointed by the field
     */
    @SneakyThrows({NoSuchMethodException.class, InvocationTargetException.class, IllegalAccessException.class})
    public <S> S findEntity(String fieldName) throws IOException, ParseException {
      Method method = entity.getClass().getMethod("get" + StringUtils.capitalize(fieldName));
      EntityReference entityReference = (EntityReference) method.invoke(entity);
      if (entityReference == null) {
        throw new UnhandledServerException(CatalogExceptionMessage.fieldIsNull(fieldName));
      }
      return Entity.getEntity(entityReference, Fields.EMPTY_FIELDS, Include.ALL);
    }
  }

  public int addRelationship(UUID fromId, UUID toId, String fromEntity, String toEntity, Relationship relationship) {
    return addRelationship(fromId, toId, fromEntity, toEntity, relationship, false);
  }

  public int addRelationship(
      UUID fromId, UUID toId, String fromEntity, String toEntity, Relationship relationship, boolean bidirectional) {
    UUID from = fromId;
    UUID to = toId;
    if (bidirectional && fromId.compareTo(toId) > 0) {
      // For bidirectional relationship, instead of adding two row fromId -> toId and toId -> fromId, just add one
      // row where fromId is alphabetically less than toId
      from = toId;
      to = fromId;
    }
    return daoCollection.relationshipDAO().insert(from, to, fromEntity, toEntity, relationship.ordinal());
  }

  public void setOwner(UUID ownedEntityId, String ownedEntityType, EntityReference owner) {
    // Add relationship owner --- owns ---> ownedEntity
    if (owner != null) {
      LOG.info("Adding owner {}:{} for entity {}:{}", owner.getType(), owner.getId(), ownedEntityType, ownedEntityId);
      addRelationship(owner.getId(), ownedEntityId, owner.getType(), ownedEntityType, Relationship.OWNS);
    }
  }

  public List<String> findBoth(
      UUID entity1, String entityType1, Relationship relationship, String entity2, Boolean deleted) {
    // Find bidirectional relationship
    List<String> ids = new ArrayList<>();
    ids.addAll(findFrom(entity1, entityType1, relationship, entity2, deleted));
    ids.addAll(findTo(entity1, entityType1, relationship, entity2, deleted));
    return ids;
  }

  public List<String> findFrom(
      UUID toId, String toEntityType, Relationship relationship, String fromEntityType, Boolean deleted) {
    List<String> ret =
        daoCollection
            .relationshipDAO()
            .findFrom(toId.toString(), toEntityType, relationship.ordinal(), fromEntityType, deleted);
    return ret;
  }

  public List<String> findTo(
      UUID fromId, String fromEntityType, Relationship relationship, String toEntityType, Boolean deleted) {
    List<String> ret =
        daoCollection
            .relationshipDAO()
            .findTo(fromId.toString(), fromEntityType, relationship.ordinal(), toEntityType, deleted);
    return ret;
  }

  public void deleteTo(UUID toId, String toEntityType, Relationship relationship, String fromEntityType) {
    daoCollection.relationshipDAO().deleteTo(toId.toString(), toEntityType, relationship.ordinal(), fromEntityType);
  }

  public void deleteFrom(UUID fromId, String fromEntityType, Relationship relationship, String toEntityType) {
    // Remove relationships from original
    daoCollection.relationshipDAO().deleteFrom(fromId.toString(), fromEntityType, relationship.ordinal(), toEntityType);
  }

  public void validateUsers(List<EntityReference> entityReferences) throws IOException {
    if (entityReferences != null) {
      entityReferences.sort(EntityUtil.compareEntityReference);
      for (EntityReference entityReference : entityReferences) {
        EntityReference ref = daoCollection.userDAO().findEntityReferenceById(entityReference.getId());
        entityReference.withType(ref.getType()).withName(ref.getName()).withDisplayName(ref.getDisplayName());
      }
    }
  }

  public void validateRoles(List<EntityReference> entityReferences) throws IOException {
    if (entityReferences != null) {
      entityReferences.sort(EntityUtil.compareEntityReference);
      for (EntityReference entityReference : entityReferences) {
        EntityReference ref = daoCollection.roleDAO().findEntityReferenceById(entityReference.getId());
        entityReference.withType(ref.getType()).withName(ref.getName()).withDisplayName(ref.getDisplayName());
      }
    }
  }

  enum Operation {
    PUT,
    PATCH,
    SOFT_DELETE;

    public boolean isPatch() {
      return this == PATCH;
    }

    public boolean isPut() {
      return this == PUT;
    }

    public boolean isDelete() {
      return this == SOFT_DELETE;
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
    protected final Operation operation;
    protected final ChangeDescription changeDescription = new ChangeDescription();
    protected boolean majorVersionChange = false;
    private boolean entityRestored = false;

    public EntityUpdater(T original, T updated, Operation operation) {
      this.original = getEntityInterface(original);
      this.updated = getEntityInterface(updated);
      this.operation = operation;
    }

    public final void update() throws IOException, ParseException {
      update(false);
    }

    /** Compare original and updated entities and perform updates. Update the entity version and track changes. */
    public final void update(boolean allowEdits) throws IOException, ParseException {
      if (operation.isDelete()) { // DELETE Operation
        updateDeleted();
      } else { // PUT or PATCH operations
        updated.setId(original.getId());
        updateDeleted();
        updateDescription(allowEdits);
        updateDisplayName(allowEdits);
        updateOwner();
        updateTags(updated.getFullyQualifiedName(), "tags", original.getTags(), updated.getTags());
        entitySpecificUpdate();
      }

      // Store the updated entity
      storeUpdate();
    }

    public void entitySpecificUpdate() throws IOException, ParseException {
      // Default implementation. Override this to add any entity specific field updates
    }

    private void updateDescription(boolean allowEdits) throws JsonProcessingException {
      if (operation.isPut()
          && original.getDescription() != null
          && !original.getDescription().isEmpty()
          && !allowEdits) {
        // Update description only when stored is empty to retain user authored descriptions
        updated.setDescription(original.getDescription());
        return;
      }
      recordChange(FIELD_DESCRIPTION, original.getDescription(), updated.getDescription());
    }

    private void updateDeleted() throws JsonProcessingException {
      if (operation.isPut() || operation.isPatch()) {
        // Update operation can't set delete attributed to true. This can only be done as part of delete operation
        if (updated.isDeleted() != original.isDeleted() && Boolean.TRUE.equals(updated.isDeleted())) {
          throw new IllegalArgumentException(CatalogExceptionMessage.readOnlyAttribute(entityType, "deleted"));
        }
        // PUT or PATCH is restoring the soft-deleted entity
        if (Boolean.TRUE.equals(original.isDeleted())) {
          updated.setDeleted(false);
          recordChange("deleted", true, false);
          entityRestored = true;
        }
      } else {
        recordChange("deleted", original.isDeleted(), updated.isDeleted());
      }
    }

    private void updateDisplayName(boolean allowEdits) throws JsonProcessingException {
      if (operation.isPut()
          && original.getDisplayName() != null
          && !original.getDisplayName().isEmpty()
          && !allowEdits) {
        // Update displayName only when stored is empty to retain user authored descriptions
        updated.setDisplayName(original.getDisplayName());
        return;
      }
      recordChange("displayName", original.getDisplayName(), updated.getDisplayName());
    }

    private void updateOwner() throws JsonProcessingException {
      EntityReference origOwner = original.getOwner();
      EntityReference updatedOwner = updated.getOwner();
      if (operation.isPatch() || updatedOwner != null) {
        // Update owner for all PATCH operations. For PUT operations, ownership can't be removed
        if (recordChange(FIELD_OWNER, origOwner, updatedOwner, true, entityReferenceMatch)) {
          EntityUtil.updateOwner(
              daoCollection.relationshipDAO(), origOwner, updatedOwner, original.getId(), entityType);
        }
      }
    }

    protected final void updateTags(String fqn, String fieldName, List<TagLabel> origTags, List<TagLabel> updatedTags)
        throws IOException {
      // Remove current entity tags in the database. It will be added back later from the merged tag list.
      origTags = listOrEmpty(origTags);
      // updatedTags cannot be immutable list, as we are adding the origTags to updatedTags even if its empty.
      updatedTags = Optional.ofNullable(updatedTags).orElse(new ArrayList<>());
      if (origTags.isEmpty() && updatedTags.isEmpty()) {
        return; // Nothing to update
      }

      // Remove current entity tags in the database. It will be added back later from the merged tag list.
      EntityUtil.removeTagsByPrefix(daoCollection.tagDAO(), fqn);
      if (operation.isPut()) {
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
        newVersion = nextMajorVersion(oldVersion);
      } else if (fieldsChanged()) {
        newVersion = nextVersion(oldVersion);
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

    public boolean isEntityRestored() {
      return entityRestored;
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
      origList = listOrEmpty(origList);
      updatedList = listOrEmpty(updatedList);
      for (K stored : origList) {
        // If an entry in the original list is not in updated list, then it is deleted during update
        K u = updatedList.stream().filter(c -> typeMatch.test(c, stored)).findAny().orElse(null);
        if (u == null) {
          deletedItems.add(stored);
        }
      }

      for (K U : updatedList) {
        // If an entry in the updated list is not in original list, then it is added during update
        K stored = origList.stream().filter(c -> typeMatch.test(c, U)).findAny().orElse(null);
        if (stored == null) { // New column added
          addedItems.add(U);
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

    /**
     * Remove `fromEntityType:fromId` -- `relationType` ---> `toEntityType:origToRefs` Add `fromEntityType:fromId` --
     * `relationType` ---> `toEntityType:updatedToRefs` and record it as change for entity field `field`.
     *
     * <p>When `bidirectional` is set to true, relationship from both side are replaced
     */
    public final void updateToRelationships(
        String field,
        String fromEntityType,
        UUID fromId,
        Relationship relationshipType,
        String toEntityType,
        List<EntityReference> origToRefs,
        List<EntityReference> updatedToRefs,
        boolean bidirectional)
        throws JsonProcessingException {
      List<EntityReference> added = new ArrayList<>();
      List<EntityReference> deleted = new ArrayList<>();
      if (!recordListChange(field, origToRefs, updatedToRefs, added, deleted, entityReferenceMatch)) {
        // No changes between original and updated.
        return;
      }
      // Remove relationships from original
      deleteFrom(fromId, fromEntityType, relationshipType, toEntityType);
      if (bidirectional) {
        deleteTo(fromId, fromEntityType, relationshipType, toEntityType);
      }
      // Add relationships from updated
      for (EntityReference ref : updatedToRefs) {
        addRelationship(fromId, ref.getId(), fromEntityType, toEntityType, relationshipType, bidirectional);
      }
      updatedToRefs.sort(EntityUtil.compareEntityReference);
      origToRefs.sort(EntityUtil.compareEntityReference);
    }

    /**
     * Remove `fromEntityType:origFromRefs` -- `relationType` ---> `toEntityType:toId` Add
     * `fromEntityType:updatedFromRefs` -- `relationType` ---> `toEntityType:toId` and record it as change for entity
     * field `field`.
     */
    public final void updateFromRelationships(
        String field,
        String fromEntityType,
        List<EntityReference> originFromRefs,
        List<EntityReference> updatedFromRefs,
        Relationship relationshipType,
        String toEntityType,
        UUID toId)
        throws JsonProcessingException {
      List<EntityReference> added = new ArrayList<>();
      List<EntityReference> deleted = new ArrayList<>();
      if (!recordListChange(field, originFromRefs, updatedFromRefs, added, deleted, entityReferenceMatch)) {
        // No changes between original and updated.
        return;
      }
      // Remove relationships from original
      deleteTo(toId, toEntityType, relationshipType, fromEntityType);

      // Add relationships from updated
      for (EntityReference ref : updatedFromRefs) {
        addRelationship(ref.getId(), toId, fromEntityType, toEntityType, relationshipType);
      }
      updatedFromRefs.sort(EntityUtil.compareEntityReference);
      originFromRefs.sort(EntityUtil.compareEntityReference);
    }

    public final void storeUpdate() throws IOException {
      if (updateVersion(original.getVersion())) { // Update changed the entity version
        storeOldVersion(); // Store old version for listing previous versions of the entity
        storeNewVersion(); // Store the update version of the entity
      } else { // Update did not change the entity version
        updated.setUpdateDetails(original.getUpdatedBy(), original.getUpdatedAt());
      }
    }

    private void storeOldVersion() throws JsonProcessingException {
      String extensionName = EntityUtil.getVersionExtension(entityType, original.getVersion());
      daoCollection
          .entityExtensionDAO()
          .insert(original.getId().toString(), extensionName, entityType, JsonUtils.pojoToJson(original.getEntity()));
    }

    private void storeNewVersion() throws IOException {
      EntityRepository.this.storeEntity(updated.getEntity(), true);
    }
  }
}
