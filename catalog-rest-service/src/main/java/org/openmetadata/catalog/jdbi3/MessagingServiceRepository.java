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

import com.fasterxml.jackson.core.JsonProcessingException;
import org.jdbi.v3.sqlobject.transaction.Transaction;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.entity.services.MessagingService;
import org.openmetadata.catalog.resources.services.messaging.MessagingServiceResource;
import org.openmetadata.catalog.type.ChangeDescription;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.Schedule;
import org.openmetadata.catalog.type.TagLabel;
import org.openmetadata.catalog.util.EntityInterface;
import org.openmetadata.catalog.util.EntityUtil;
import org.openmetadata.catalog.util.EntityUtil.Fields;
import org.openmetadata.catalog.util.JsonUtils;

import java.io.IOException;
import java.net.URI;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.UUID;

public class MessagingServiceRepository extends EntityRepository<MessagingService> {
  private final CollectionDAO dao;

  public MessagingServiceRepository(CollectionDAO dao) {
    super(MessagingServiceResource.COLLECTION_PATH, Entity.MESSAGING_SERVICE, MessagingService.class,
            dao.messagingServiceDAO(), dao, Fields.EMPTY_FIELDS, Fields.EMPTY_FIELDS);
    this.dao = dao;
  }

  @Transaction
  public void delete(UUID id) {
    dao.messagingServiceDAO().delete(id);
    dao.relationshipDAO().deleteAll(id.toString());
  }

  @Override
  public MessagingService setFields(MessagingService entity, Fields fields) throws IOException, ParseException {
    return entity;
  }

  @Override
  public void restorePatchAttributes(MessagingService original, MessagingService updated) throws IOException,
          ParseException {
    // Not implemented
  }

  @Override
  public EntityInterface<MessagingService> getEntityInterface(MessagingService entity) {
    return new MessagingServiceEntityInterface(entity);
  }

  @Override
  public void prepare(MessagingService entity) throws IOException {
    EntityUtil.validateIngestionSchedule(entity.getIngestionSchedule());
  }

  @Override
  public void storeEntity(MessagingService service, boolean update) throws IOException {
    if (update) {
      dao.messagingServiceDAO().update(service.getId(), JsonUtils.pojoToJson(service));
    } else {
      dao.messagingServiceDAO().insert(service);
    }
  }

  @Override
  public void storeRelationships(MessagingService entity) throws IOException { }

  @Override
  public EntityUpdater getUpdater(MessagingService original, MessagingService updated, boolean patchOperation) throws IOException {
    return new MessagingServiceUpdater(original, updated, patchOperation);
  }

  public static class MessagingServiceEntityInterface implements EntityInterface<MessagingService> {
    private final MessagingService entity;

    public MessagingServiceEntityInterface(MessagingService entity) {
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
    public EntityReference getOwner() { return null; }

    @Override
    public String getFullyQualifiedName() { return entity.getName(); }

    @Override
    public List<TagLabel> getTags() { return null; }

    @Override
    public Double getVersion() { return entity.getVersion(); }

    @Override
    public String getUpdatedBy() { return entity.getUpdatedBy(); }

    @Override
    public Date getUpdatedAt() { return entity.getUpdatedAt(); }

    @Override
    public URI getHref() { return entity.getHref(); }

    @Override
    public List<EntityReference> getFollowers() {
      throw new UnsupportedOperationException("Messaging service does not support followers");
    }

    @Override
    public ChangeDescription getChangeDescription() { return entity.getChangeDescription(); }

    @Override
    public EntityReference getEntityReference() {
      return new EntityReference().withId(getId()).withName(getFullyQualifiedName()).withDescription(getDescription())
              .withDisplayName(getDisplayName()).withType(Entity.MESSAGING_SERVICE);
    }

    @Override
    public MessagingService getEntity() { return entity; }

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
    public void setOwner(EntityReference owner) { }

    @Override
    public MessagingService withHref(URI href) { return entity.withHref(href); }

    @Override
    public void setTags(List<TagLabel> tags) { }
  }

  public class MessagingServiceUpdater extends EntityUpdater {
    public MessagingServiceUpdater(MessagingService original, MessagingService updated, boolean patchOperation) {
      super(original, updated, patchOperation);
    }

    @Override
    public void entitySpecificUpdate() throws IOException {
      updateSchemaRegistry();
      updateIngestionSchedule();
      updateBrokers();
    }

    private void updateSchemaRegistry() throws JsonProcessingException {
      recordChange("schemaRegistry", original.getEntity().getSchemaRegistry(), updated.getEntity().getSchemaRegistry());
    }

    private void updateIngestionSchedule() throws JsonProcessingException {
      Schedule origSchedule = original.getEntity().getIngestionSchedule();
      Schedule updatedSchedule = updated.getEntity().getIngestionSchedule();
      recordChange("ingestionSchedule", origSchedule, updatedSchedule, true);
    }

    private void updateBrokers() throws JsonProcessingException {
      List<String> origBrokers = original.getEntity().getBrokers();
      List<String> updatedBrokers = updated.getEntity().getBrokers();

      List<String> addedBrokers = new ArrayList<>();
      List<String> deletedBrokers = new ArrayList<>();
      recordListChange("brokers", origBrokers, updatedBrokers, addedBrokers, deletedBrokers, EntityUtil.stringMatch);
    }
  }
}