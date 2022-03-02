/*
 *  Licensed to the Apache Software Foundation (ASF) under one or more
 *  contributor license agreements. See the NOTICE file distributed with
 *  this work for additional information regarding copyright ownership.
 *  The ASF licenses this file to You under the Apache License, Version 2.0
 *  (the "License"); you may not use this file except in compliance with
 *  the License. You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

package org.openmetadata.catalog.jdbi3;

import static org.openmetadata.catalog.util.EntityUtil.stringMatch;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import java.net.URI;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.entity.data.GlossaryTerm;
import org.openmetadata.catalog.resources.glossary.GlossaryResource;
import org.openmetadata.catalog.resources.glossary.GlossaryTermResource;
import org.openmetadata.catalog.type.ChangeDescription;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.Relationship;
import org.openmetadata.catalog.type.TagLabel;
import org.openmetadata.catalog.util.EntityInterface;
import org.openmetadata.catalog.util.EntityUtil;
import org.openmetadata.catalog.util.EntityUtil.Fields;
import org.openmetadata.catalog.util.JsonUtils;

@Slf4j
public class GlossaryTermRepository extends EntityRepository<GlossaryTerm> {
  private static final Fields UPDATE_FIELDS = new Fields(GlossaryResource.ALLOWED_FIELDS, "tags,reviewers");
  private static final Fields PATCH_FIELDS = new Fields(GlossaryResource.ALLOWED_FIELDS, "tags,reviewers");

  public GlossaryTermRepository(CollectionDAO dao) {
    super(
        GlossaryTermResource.COLLECTION_PATH,
        Entity.GLOSSARY_TERM,
        GlossaryTerm.class,
        dao.glossaryTermDAO(),
        dao,
        PATCH_FIELDS,
        UPDATE_FIELDS,
        true,
        false,
        false);
  }

  @Override
  public GlossaryTerm setFields(GlossaryTerm entity, Fields fields) throws IOException, ParseException {
    entity.setGlossary(getGlossary(entity));
    entity.setParent(getParent(entity));
    entity.setChildren(fields.contains("children") ? getChildren(entity) : null);
    entity.setRelatedTerms(fields.contains("relatedTerms") ? getRelatedTerms(entity) : null);
    entity.setReviewers(fields.contains("reviewers") ? getReviewers(entity) : null);
    entity.setTags(fields.contains("tags") ? getTags(entity.getFullyQualifiedName()) : null);
    return entity;
  }

  private EntityReference getParent(GlossaryTerm entity) throws IOException {
    List<String> ids =
        findFrom(
            entity.getId(), Entity.GLOSSARY_TERM, Relationship.PARENT_OF, Entity.GLOSSARY_TERM, entity.getDeleted());
    return ids.size() == 1 ? Entity.getEntityReferenceById(Entity.GLOSSARY_TERM, UUID.fromString(ids.get(0))) : null;
  }

  private List<EntityReference> getChildren(GlossaryTerm entity) throws IOException {
    List<String> ids =
        findTo(entity.getId(), Entity.GLOSSARY_TERM, Relationship.PARENT_OF, Entity.GLOSSARY_TERM, entity.getDeleted());
    return EntityUtil.populateEntityReferences(ids, Entity.GLOSSARY_TERM);
  }

  private List<EntityReference> getRelatedTerms(GlossaryTerm entity) throws IOException {
    List<String> ids =
        findBoth(
            entity.getId(), Entity.GLOSSARY_TERM, Relationship.RELATED_TO, Entity.GLOSSARY_TERM, entity.getDeleted());
    return EntityUtil.populateEntityReferences(ids, Entity.GLOSSARY_TERM);
  }

  private List<EntityReference> getReviewers(GlossaryTerm entity) throws IOException {
    List<String> ids =
        findFrom(entity.getId(), Entity.GLOSSARY_TERM, Relationship.REVIEWS, Entity.USER, entity.getDeleted());
    return EntityUtil.populateEntityReferences(ids, Entity.USER);
  }

  @Override
  public void prepare(GlossaryTerm entity) throws IOException, ParseException {
    // Validate glossary
    EntityReference glossary = Entity.getEntityReference(entity.getGlossary());
    entity.setGlossary(glossary);

    // Validate parent
    if (entity.getParent() == null) {
      entity.setFullyQualifiedName(entity.getGlossary().getName() + "." + entity.getName());
    } else {
      EntityReference parent = Entity.getEntityReference(entity.getParent());
      entity.setFullyQualifiedName(parent.getName() + "." + entity.getName());
      entity.setParent(parent);
    }

    // Validate related terms
    EntityUtil.populateEntityReferences(entity.getRelatedTerms());

    // Validate reviewers
    EntityUtil.populateEntityReferences(entity.getReviewers());

    // Set tags
    entity.setTags(EntityUtil.addDerivedTags(daoCollection.tagDAO(), entity.getTags()));
  }

  @Override
  public void storeEntity(GlossaryTerm entity, boolean update) throws IOException {
    // Relationships and fields such as href are derived and not stored as part of json
    List<TagLabel> tags = entity.getTags();
    // TODO Add relationships for reviewers
    EntityReference glossary = entity.getGlossary();
    EntityReference parentTerm = entity.getParent();
    List<EntityReference> relatedTerms = entity.getRelatedTerms();
    List<EntityReference> reviewers = entity.getReviewers();

    // Don't store owner, dashboard, href and tags as JSON. Build it on the fly based on relationships
    entity
        .withGlossary(null)
        .withParent(null)
        .withRelatedTerms(relatedTerms)
        .withReviewers(null)
        .withHref(null)
        .withTags(null);

    if (update) {
      daoCollection.glossaryTermDAO().update(entity.getId(), JsonUtils.pojoToJson(entity));
    } else {
      daoCollection.glossaryTermDAO().insert(entity);
    }

    // Restore the relationships
    entity
        .withGlossary(glossary)
        .withParent(parentTerm)
        .withRelatedTerms(relatedTerms)
        .withReviewers(reviewers)
        .withTags(tags);
  }

  @Override
  public void storeRelationships(GlossaryTerm entity) {
    addRelationship(
        entity.getGlossary().getId(), entity.getId(), Entity.GLOSSARY, Entity.GLOSSARY_TERM, Relationship.CONTAINS);
    if (entity.getParent() != null) {
      addRelationship(
          entity.getParent().getId(),
          entity.getId(),
          Entity.GLOSSARY_TERM,
          Entity.GLOSSARY_TERM,
          Relationship.PARENT_OF);
    }
    for (EntityReference relTerm : Optional.ofNullable(entity.getRelatedTerms()).orElse(Collections.emptyList())) {
      // Make this bidirectional relationship
      addBidirectionalRelationship(
          entity.getId(), relTerm.getId(), Entity.GLOSSARY_TERM, Entity.GLOSSARY_TERM, Relationship.RELATED_TO);
    }
    for (EntityReference reviewer : Optional.ofNullable(entity.getReviewers()).orElse(Collections.emptyList())) {
      addRelationship(reviewer.getId(), entity.getId(), Entity.USER, Entity.GLOSSARY_TERM, Relationship.REVIEWS);
    }

    applyTags(entity);
  }

  protected EntityReference getGlossary(GlossaryTerm term) throws IOException {
    // TODO check deleted
    List<String> refs = findFrom(term.getId(), Entity.GLOSSARY_TERM, Relationship.CONTAINS, Entity.GLOSSARY, null);
    if (refs.size() != 1) {
      LOG.warn(
          "Possible database issues - multiple owners found for entity {} with type {}", term.getId(), Entity.GLOSSARY);
    }
    return getGlossary(refs.get(0));
  }

  public EntityReference getGlossary(String id) throws IOException {
    return daoCollection.glossaryDAO().findEntityReferenceById(UUID.fromString(id));
  }

  @Override
  public EntityInterface<GlossaryTerm> getEntityInterface(GlossaryTerm entity) {
    return new GlossaryTermEntityInterface(entity);
  }

  @Override
  public EntityUpdater getUpdater(GlossaryTerm original, GlossaryTerm updated, Operation operation) {
    return new GlossaryTermUpdater(original, updated, operation);
  }

  public static class GlossaryTermEntityInterface implements EntityInterface<GlossaryTerm> {
    private final GlossaryTerm entity;

    public GlossaryTermEntityInterface(GlossaryTerm entity) {
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
    public String getName() {
      return entity.getName();
    }

    @Override
    public Boolean isDeleted() {
      return entity.getDeleted();
    }

    @Override
    public EntityReference getOwner() {
      return null;
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
    public Double getVersion() {
      return entity.getVersion();
    }

    @Override
    public String getUpdatedBy() {
      return entity.getUpdatedBy();
    }

    @Override
    public long getUpdatedAt() {
      return entity.getUpdatedAt();
    }

    @Override
    public URI getHref() {
      return entity.getHref();
    }

    @Override
    public ChangeDescription getChangeDescription() {
      return entity.getChangeDescription();
    }

    @Override
    public EntityReference getEntityReference() {
      return new EntityReference()
          .withId(getId())
          .withName(getFullyQualifiedName())
          .withDescription(getDescription())
          .withDisplayName(getDisplayName())
          .withType(Entity.GLOSSARY_TERM);
    }

    @Override
    public GlossaryTerm getEntity() {
      return entity;
    }

    @Override
    public EntityReference getContainer() {
      return null;
    }

    @Override
    public void setId(UUID id) {
      entity.setId(id);
    }

    @Override
    public void setDescription(String description) {
      entity.setDescription(description);
    }

    @Override
    public void setDisplayName(String displayName) {
      entity.setDisplayName(displayName);
    }

    @Override
    public void setName(String name) {
      entity.setName(name);
    }

    @Override
    public void setUpdateDetails(String updatedBy, long updatedAt) {
      entity.setUpdatedBy(updatedBy);
      entity.setUpdatedAt(updatedAt);
    }

    @Override
    public void setChangeDescription(Double newVersion, ChangeDescription changeDescription) {
      entity.setVersion(newVersion);
      entity.setChangeDescription(changeDescription);
    }

    @Override
    public void setDeleted(boolean flag) {
      entity.setDeleted(flag);
    }

    @Override
    public GlossaryTerm withHref(URI href) {
      return entity.withHref(href);
    }

    @Override
    public void setTags(List<TagLabel> tags) {
      entity.setTags(tags);
    }
  }

  /** Handles entity updated from PUT and POST operation. */
  public class GlossaryTermUpdater extends EntityUpdater {
    public GlossaryTermUpdater(GlossaryTerm original, GlossaryTerm updated, Operation operation) {
      super(original, updated, operation);
    }

    @Override
    public void entitySpecificUpdate() throws IOException {
      updateSynonyms(original.getEntity(), updated.getEntity());
      updateReviewers(original.getEntity(), updated.getEntity());
    }

    private void updateSynonyms(GlossaryTerm origTerm, GlossaryTerm updatedTerm) throws JsonProcessingException {
      List<String> origSynonyms = Optional.ofNullable(origTerm.getSynonyms()).orElse(Collections.emptyList());
      List<String> updatedSynonyms = Optional.ofNullable(updatedTerm.getSynonyms()).orElse(Collections.emptyList());

      List<String> added = new ArrayList<>();
      List<String> deleted = new ArrayList<>();
      recordListChange("synonyms", origSynonyms, updatedSynonyms, added, deleted, stringMatch);
    }

    private void updateReviewers(GlossaryTerm origTerm, GlossaryTerm updatedTerm) throws JsonProcessingException {
      List<EntityReference> origUsers = Optional.ofNullable(origTerm.getReviewers()).orElse(Collections.emptyList());
      List<EntityReference> updatedUsers =
          Optional.ofNullable(updatedTerm.getReviewers()).orElse(Collections.emptyList());
      updateFromRelationships(
          "reviewers",
          Entity.USER,
          origUsers,
          updatedUsers,
          Relationship.REVIEWS,
          Entity.GLOSSARY_TERM,
          origTerm.getId());
    }
  }
}
