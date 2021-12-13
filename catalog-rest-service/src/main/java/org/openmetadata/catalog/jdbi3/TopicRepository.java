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

import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.entity.data.Topic;
import org.openmetadata.catalog.entity.services.MessagingService;
import org.openmetadata.catalog.exception.CatalogExceptionMessage;
import org.openmetadata.catalog.exception.EntityNotFoundException;
import org.openmetadata.catalog.jdbi3.MessagingServiceRepository.MessagingServiceEntityInterface;
import org.openmetadata.catalog.resources.topics.TopicResource;
import org.openmetadata.catalog.type.ChangeDescription;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.TagLabel;
import org.openmetadata.catalog.util.EntityInterface;
import org.openmetadata.catalog.util.EntityUtil;
import org.openmetadata.catalog.util.EntityUtil.Fields;
import org.openmetadata.catalog.util.JsonUtils;

import java.io.IOException;
import java.net.URI;
import java.text.ParseException;
import java.util.Date;
import java.util.List;
import java.util.UUID;

import static org.openmetadata.catalog.exception.CatalogExceptionMessage.entityNotFound;

public class TopicRepository extends EntityRepository<Topic> {
  private static final Fields TOPIC_UPDATE_FIELDS = new Fields(TopicResource.FIELD_LIST, "owner,tags");
  private static final Fields TOPIC_PATCH_FIELDS = new Fields(TopicResource.FIELD_LIST, "owner,tags");
  private final CollectionDAO dao;

  public static String getFQN(Topic topic) {
    return (topic.getService().getName() + "." + topic.getName());
  }

  public TopicRepository(CollectionDAO dao) {
    super(TopicResource.COLLECTION_PATH, Entity.TOPIC, Topic.class, dao.topicDAO(), dao, TOPIC_PATCH_FIELDS,
            TOPIC_UPDATE_FIELDS);
    this.dao = dao;
  }

  @Transaction
  public void delete(UUID id) {
    if (dao.relationshipDAO().findToCount(id.toString(), Relationship.CONTAINS.ordinal(), Entity.TOPIC) > 0) {
      throw new IllegalArgumentException("Topic is not empty");
    }
    dao.topicDAO().delete(id);
    dao.relationshipDAO().deleteAll(id.toString());
  }

  @Transaction
  public EntityReference getOwnerReference(Topic topic) throws IOException {
    return EntityUtil.populateOwner(dao.userDAO(), dao.teamDAO(), topic.getOwner());
  }

  @Override
  public void prepare(Topic topic) throws IOException {
    MessagingService messagingService = getService(topic.getService().getId(), topic.getService().getType());
    topic.setService(new MessagingServiceEntityInterface(messagingService).getEntityReference());
    topic.setServiceType(messagingService.getServiceType());
    topic.setFullyQualifiedName(getFQN(topic));
    EntityUtil.populateOwner(dao.userDAO(), dao.teamDAO(), topic.getOwner()); // Validate owner
    topic.setTags(EntityUtil.addDerivedTags(dao.tagDAO(), topic.getTags()));
  }

  @Override
  public void storeEntity(Topic topic, boolean update) throws IOException {
    // Relationships and fields such as href are derived and not stored as part of json
    EntityReference owner = topic.getOwner();
    List<TagLabel> tags = topic.getTags();
    EntityReference service = topic.getService();

    // Don't store owner, database, href and tags as JSON. Build it on the fly based on relationships
    topic.withOwner(null).withService(null).withHref(null).withTags(null);

    if (update) {
      dao.topicDAO().update(topic.getId(), JsonUtils.pojoToJson(topic));
    } else {
      dao.topicDAO().insert(topic);
    }

    // Restore the relationships
    topic.withOwner(owner).withService(service).withTags(tags);
  }

  @Override
  public void storeRelationships(Topic topic) throws IOException {
    setService(topic, topic.getService());
    setOwner(topic, topic.getOwner());
    applyTags(topic);
  }

  private void applyTags(Topic topic) throws IOException {
    // Add topic level tags by adding tag to topic relationship
    EntityUtil.applyTags(dao.tagDAO(), topic.getTags(), topic.getFullyQualifiedName());
    topic.setTags(getTags(topic.getFullyQualifiedName())); // Update tag to handle additional derived tags
  }

  public EntityReference getOwner(Topic topic) throws IOException {
    return topic != null ? EntityUtil.populateOwner(topic.getId(), dao.relationshipDAO(), dao.userDAO(),
            dao.teamDAO()) : null;
  }

  private void setOwner(Topic topic, EntityReference owner) {
    EntityUtil.setOwner(dao.relationshipDAO(), topic.getId(), Entity.TOPIC, owner);
  }

  @Override
  public Topic setFields(Topic topic, Fields fields) throws IOException {
    topic.setService(getService(topic));
    topic.setOwner(fields.contains("owner") ? getOwner(topic) : null);
    topic.setFollowers(fields.contains("followers") ? getFollowers(topic) : null);
    topic.setTags(fields.contains("tags") ? getTags(topic.getFullyQualifiedName()) : null);
    return topic;
  }

  @Override
  public void restorePatchAttributes(Topic original, Topic updated) throws IOException, ParseException {

  }

  @Override
  public EntityInterface<Topic> getEntityInterface(Topic entity) {
    return new TopicEntityInterface(entity);
  }

  private List<EntityReference> getFollowers(Topic topic) throws IOException {
    return topic == null ? null : EntityUtil.getFollowers(topic.getId(), dao.relationshipDAO(), dao.userDAO());
  }

  private List<TagLabel> getTags(String fqn) {
    return dao.tagDAO().getTags(fqn);
  }

  private EntityReference getService(Topic topic) throws IOException {
    if (topic == null) {
      return null;
    }
    // Find service by topic Id
    EntityReference service = EntityUtil.getService(dao.relationshipDAO(), topic.getId());
    return new MessagingServiceEntityInterface(getService(service.getId(), service.getType())).getEntityReference();
  }

  private MessagingService getService(UUID serviceId, String entityType) throws IOException {
    if (entityType.equalsIgnoreCase(Entity.MESSAGING_SERVICE)) {
      return dao.messagingServiceDAO().findEntityById(serviceId);
    }
    throw new IllegalArgumentException(CatalogExceptionMessage.invalidServiceEntity(entityType, Entity.TOPIC));
  }

  public void setService(Topic topic, EntityReference service) throws IOException {
    if (service != null && topic != null) {
      dao.relationshipDAO().insert(service.getId().toString(), topic.getId().toString(), service.getType(),
              Entity.TOPIC, Relationship.CONTAINS.ordinal());
      topic.setService(service);
    }
  }

  public static class TopicEntityInterface implements EntityInterface<Topic> {
    private final Topic entity;

    public TopicEntityInterface(Topic entity) {
      this.entity = entity;
    }

    @Override
    public UUID getId() {
      return entity.getId();
    }

    @Override
    public String getDescription() {
      return entity.getDescription();
    }

    @Override
    public String getDisplayName() {
      return entity.getDisplayName();
    }

    @Override
    public EntityReference getOwner() {
      return entity.getOwner();
    }

    @Override
    public String getFullyQualifiedName() {
      return entity.getFullyQualifiedName();
    }

    @Override
    public List<TagLabel> getTags() {
      return entity.getTags();
    }

    @Override
    public Double getVersion() { return entity.getVersion(); }

    @Override
    public String getUpdatedBy() { return entity.getUpdatedBy(); }

    @Override
    public Date getUpdatedAt() { return entity.getUpdatedAt(); }

    @Override
    public URI getHref() { return entity.getHref(); }

    @Override
    public List<EntityReference> getFollowers() { return entity.getFollowers(); }

    @Override
    public EntityReference getEntityReference() {
      return new EntityReference().withId(getId()).withName(getFullyQualifiedName()).withDescription(getDescription())
              .withDisplayName(getDisplayName()).withType(Entity.TOPIC);
    }

    @Override
    public Topic getEntity() { return entity; }

    @Override
    public void setId(UUID id) { entity.setId(id); }

    @Override
    public void setDescription(String description) {
      entity.setDescription(description);
    }

    @Override
    public void setDisplayName(String displayName) {
      entity.setDisplayName(displayName);
    }

    @Override
    public void setUpdateDetails(String updatedBy, Date updatedAt) {
      entity.setUpdatedBy(updatedBy);
      entity.setUpdatedAt(updatedAt);
    }

    @Override
    public void setChangeDescription(Double newVersion, ChangeDescription changeDescription) {
      entity.setVersion(newVersion);
      entity.setChangeDescription(changeDescription);
    }

    @Override
    public void setOwner(EntityReference owner) { entity.setOwner(owner); }

    @Override
    public Topic withHref(URI href) { return entity.withHref(href); }

    @Override
    public ChangeDescription getChangeDescription() { return entity.getChangeDescription(); }

    @Override
    public void setTags(List<TagLabel> tags) {
      entity.setTags(tags);
    }
  }
}
