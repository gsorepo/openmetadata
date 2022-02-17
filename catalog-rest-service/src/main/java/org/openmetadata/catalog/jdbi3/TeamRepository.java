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
import static org.openmetadata.catalog.util.EntityUtil.toBoolean;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.entity.teams.Team;
import org.openmetadata.catalog.resources.teams.TeamResource;
import org.openmetadata.catalog.type.ChangeDescription;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.Relationship;
import org.openmetadata.catalog.util.EntityInterface;
import org.openmetadata.catalog.util.EntityUtil;
import org.openmetadata.catalog.util.EntityUtil.Fields;

public class TeamRepository extends EntityRepository<Team> {
  static final Fields TEAM_UPDATE_FIELDS = new Fields(TeamResource.FIELD_LIST, "profile,users");
  static final Fields TEAM_PATCH_FIELDS = new Fields(TeamResource.FIELD_LIST, "profile,users");

  public TeamRepository(CollectionDAO dao) {
    super(
        TeamResource.COLLECTION_PATH,
        Entity.TEAM,
        Team.class,
        dao.teamDAO(),
        dao,
        TEAM_PATCH_FIELDS,
        TEAM_UPDATE_FIELDS,
        false,
        false,
        false);
  }

  public List<EntityReference> getUsers(List<UUID> userIds) {
    if (userIds == null) {
      return null;
    }
    List<EntityReference> users = new ArrayList<>();
    for (UUID id : userIds) {
      users.add(new EntityReference().withId(id));
    }
    return users;
  }

  public void validateUsers(List<EntityReference> users) throws IOException {
    if (users != null) {
      users.sort(EntityUtil.compareEntityReference);
      for (EntityReference user : users) {
        EntityReference ref = daoCollection.userDAO().findEntityReferenceById(user.getId());
        user.withType(ref.getType()).withName(ref.getName()).withDisplayName(ref.getDisplayName());
      }
    }
  }

  @Override
  public Team setFields(Team team, Fields fields) throws IOException {
    if (!fields.contains("profile")) {
      team.setProfile(null);
    }
    team.setUsers(fields.contains("users") ? getUsers(team) : null);
    team.setOwns(fields.contains("owns") ? getOwns(team) : null);
    return team;
  }

  @Override
  public void restorePatchAttributes(Team original, Team updated) {
    // Patch can't make changes to following fields. Ignore the changes
    updated.withName(original.getName()).withId(original.getId());
  }

  @Override
  public EntityInterface<Team> getEntityInterface(Team entity) {
    return new TeamEntityInterface(entity);
  }

  @Override
  public void prepare(Team team) throws IOException {
    validateUsers(team.getUsers());
  }

  @Override
  public void storeEntity(Team team, boolean update) throws IOException {
    // Relationships and fields such as href are derived and not stored as part of json
    List<EntityReference> users = team.getUsers();

    // Don't store users, href as JSON. Build it on the fly based on relationships
    team.withUsers(null).withHref(null);

    store(team.getId(), team, update);

    // Restore the relationships
    team.withUsers(users);
  }

  @Override
  public void storeRelationships(Team team) {
    for (EntityReference user : Optional.ofNullable(team.getUsers()).orElse(Collections.emptyList())) {
      addRelationship(team.getId(), user.getId(), Entity.TEAM, Entity.USER, Relationship.HAS);
    }
  }

  @Override
  public EntityUpdater getUpdater(Team original, Team updated, Operation operation) {
    return new TeamUpdater(original, updated, operation);
  }

  private List<EntityReference> getUsers(Team team) throws IOException {
    List<String> userIds = findTo(team.getId(), Entity.TEAM, Relationship.HAS, Entity.USER, toBoolean(toInclude(team)));
    List<EntityReference> users = new ArrayList<>();
    for (String userId : userIds) {
      users.add(daoCollection.userDAO().findEntityReferenceById(UUID.fromString(userId)));
    }
    return users;
  }

  private List<EntityReference> getOwns(Team team) throws IOException {
    // Compile entities owned by the team
    return EntityUtil.populateEntityReferences(
        daoCollection
            .relationshipDAO()
            .findTo(team.getId().toString(), Entity.TEAM, Relationship.OWNS.ordinal(), toBoolean(toInclude(team))));
  }

  public static class TeamEntityInterface implements EntityInterface<Team> {
    private final Team entity;

    public TeamEntityInterface(Team entity) {
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
    public String getFullyQualifiedName() {
      return entity.getName();
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
    public EntityReference getEntityReference() {
      return new EntityReference()
          .withId(getId())
          .withName(getFullyQualifiedName())
          .withDescription(getDescription())
          .withDisplayName(getDisplayName())
          .withType(Entity.TEAM)
          .withHref(getHref());
    }

    @Override
    public Team getEntity() {
      return entity;
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
    public Team withHref(URI href) {
      return entity.withHref(href);
    }

    @Override
    public ChangeDescription getChangeDescription() {
      return entity.getChangeDescription();
    }
  }

  /** Handles entity updated from PUT and POST operation. */
  public class TeamUpdater extends EntityUpdater {
    public TeamUpdater(Team original, Team updated, Operation operation) {
      super(original, updated, operation);
    }

    @Override
    public void entitySpecificUpdate() throws IOException {
      recordChange("profile", original.getEntity().getProfile(), updated.getEntity().getProfile());
      updateUsers(original.getEntity(), updated.getEntity());
    }

    private void updateUsers(Team origTeam, Team updatedTeam) throws JsonProcessingException {
      List<EntityReference> origUsers = Optional.ofNullable(origTeam.getUsers()).orElse(Collections.emptyList());
      List<EntityReference> updatedUsers = Optional.ofNullable(updatedTeam.getUsers()).orElse(Collections.emptyList());

      List<EntityReference> added = new ArrayList<>();
      List<EntityReference> deleted = new ArrayList<>();
      if (recordListChange("users", origUsers, updatedUsers, added, deleted, entityReferenceMatch)) {
        // Remove users from original and add users from updated
        daoCollection
            .relationshipDAO()
            .deleteFrom(origTeam.getId().toString(), Entity.TEAM, Relationship.HAS.ordinal(), "user");
        // Add relationships
        for (EntityReference user : updatedUsers) {
          addRelationship(updatedTeam.getId(), user.getId(), Entity.TEAM, Entity.USER, Relationship.HAS);
        }

        updatedUsers.sort(EntityUtil.compareEntityReference);
        origUsers.sort(EntityUtil.compareEntityReference);
      }
    }
  }
}
