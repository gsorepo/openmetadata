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

import com.fasterxml.jackson.core.JsonProcessingException;
import org.openmetadata.catalog.entity.teams.Team;
import org.openmetadata.catalog.entity.teams.User;
import org.openmetadata.catalog.exception.CatalogExceptionMessage;
import org.openmetadata.catalog.jdbi3.ChartRepository.ChartDAO;
import org.openmetadata.catalog.jdbi3.DashboardRepository.DashboardDAO;
import org.openmetadata.catalog.jdbi3.DatabaseRepository.DatabaseDAO;
import org.openmetadata.catalog.jdbi3.MetricsRepository.MetricsDAO;
import org.openmetadata.catalog.jdbi3.ModelRepository.ModelDAO;
import org.openmetadata.catalog.jdbi3.PipelineRepository.PipelineDAO;
import org.openmetadata.catalog.jdbi3.ReportRepository.ReportDAO;
import org.openmetadata.catalog.jdbi3.TableRepository.TableDAO;
import org.openmetadata.catalog.jdbi3.TaskRepository.TaskDAO;
import org.openmetadata.catalog.jdbi3.TeamRepository.TeamDAO;
import org.openmetadata.catalog.jdbi3.TopicRepository.TopicDAO;
import org.openmetadata.catalog.resources.teams.UserResource;
import org.openmetadata.catalog.resources.teams.UserResource.UserList;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.type.TagLabel;
import org.openmetadata.catalog.util.EntityInterface;
import org.openmetadata.catalog.util.EntityUpdater;
import org.openmetadata.catalog.util.EntityUtil;
import org.openmetadata.catalog.util.EntityUtil.Fields;
import org.openmetadata.catalog.util.JsonUtils;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.RestUtil.PutResponse;
import org.openmetadata.catalog.util.ResultList;
import org.skife.jdbi.v2.sqlobject.Bind;
import org.skife.jdbi.v2.sqlobject.CreateSqlObject;
import org.skife.jdbi.v2.sqlobject.SqlQuery;
import org.skife.jdbi.v2.sqlobject.SqlUpdate;
import org.skife.jdbi.v2.sqlobject.Transaction;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.json.JsonPatch;
import javax.ws.rs.core.Response;
import javax.ws.rs.core.Response.Status;
import java.io.IOException;
import java.io.UnsupportedEncodingException;
import java.security.GeneralSecurityException;
import java.text.ParseException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.openmetadata.catalog.jdbi3.Relationship.CONTAINS;
import static org.openmetadata.catalog.jdbi3.Relationship.FOLLOWS;
import static org.openmetadata.catalog.jdbi3.Relationship.OWNS;

public abstract class UserRepository {
  public static final Logger LOG = LoggerFactory.getLogger(UserRepository.class);
  static final Fields USER_PATCH_FIELDS = new Fields(UserResource.FIELD_LIST, "profile,teams");
  static final Fields USER_UPDATE_FIELDS = new Fields(UserResource.FIELD_LIST, "profile,teams");

  public static List<EntityReference> toEntityReference(List<Team> teams) {
    if (teams == null) {
      return null;
    }
    List<EntityReference> refList = new ArrayList<>();
    for (Team team : teams) {
      refList.add(EntityUtil.getEntityReference(team));
    }
    return refList;
  }

  @CreateSqlObject
  abstract UserDAO userDAO();

  @CreateSqlObject
  abstract EntityRelationshipDAO relationshipDAO();

  @CreateSqlObject
  abstract TeamDAO teamDAO();

  @CreateSqlObject
  abstract TableDAO tableDAO();

  @CreateSqlObject
  abstract DatabaseDAO databaseDAO();

  @CreateSqlObject
  abstract MetricsDAO metricsDAO();

  @CreateSqlObject
  abstract DashboardDAO dashboardDAO();

  @CreateSqlObject
  abstract ReportDAO reportDAO();

  @CreateSqlObject
  abstract TopicDAO topicDAO();

  @CreateSqlObject
  abstract ChartDAO chartDAO();

  @CreateSqlObject
  abstract TaskDAO taskDAO();

  @CreateSqlObject
  abstract PipelineDAO pipelineDAO();

  @CreateSqlObject
  abstract ModelDAO modelDAO();

  EntityRepository<User> entityRepository = new EntityRepository<User>() {
    @Override
    public List<String> listAfter(String fqnPrefix, int limitParam, String after) {
      return UserRepository.this.userDAO().listAfter(limitParam, after);
    }

    @Override
    public List<String> listBefore(String fqnPrefix, int limitParam, String before) {
      return UserRepository.this.userDAO().listBefore(limitParam, before);
    }

    @Override
    public int listCount(String fqnPrefix) {
      return UserRepository.this.userDAO().listCount();
    }

    @Override
    public String getFullyQualifiedName(User entity) {
      // User does not have a FullyQualifiedName but needs a valid field to paginate
      return entity.getName();
    }

    @Override
    public User setFields(User entity, Fields fields) throws IOException, ParseException {
      return UserRepository.this.setFields(entity, fields);
    }

    @Override
    public ResultList<User> getResultList(List<User> entities, String beforeCursor, String afterCursor,
                                          int total) throws GeneralSecurityException, UnsupportedEncodingException {
      return new UserList(entities, beforeCursor, afterCursor, total);
    }
  };

  @Transaction
  public ResultList<User> listAfter(Fields fields, int limitParam, String after) throws IOException, GeneralSecurityException, ParseException {
    return EntityUtil.listAfter(entityRepository, User.class, fields, null, limitParam, after);
  }

  @Transaction
  public ResultList<User> listBefore(Fields fields, int limitParam, String before) throws IOException, GeneralSecurityException, ParseException {
    return EntityUtil.listBefore(entityRepository, User.class, fields, null, limitParam, before);
  }

  @Transaction
  public User get(String id) throws IOException {
    return validateUser(id);
  }

  @Transaction
  public User get(String id, Fields fields) throws IOException {
    // Query 1 - get user for given user name
    return setFields(validateUser(id), fields);
  }

  @Transaction
  public User getByName(String name, Fields fields) throws IOException {
    User user = EntityUtil.validate(name, userDAO().findByName(name), User.class);
    return setFields(user, fields);
  }

  @Transaction
  public User getByEmail(String email, Fields fields) throws IOException {
    User user = EntityUtil.validate(email, userDAO().findByEmail(email), User.class);
    return setFields(user, fields);
  }

  @Transaction
  public User create(User user, List<UUID> teamIds) throws IOException {
    validateRelationships(user, teamIds);
    return createInternal(user);
  }

  @Transaction
  public void delete(String id) throws IOException {
    // Query - mark user as deactivated
    User user = markUserAsDeactivated(id);

    // Remove relationship membership to teams
    relationshipDAO().deleteTo(user.getId().toString(), CONTAINS.ordinal(), "team");

    // Remove follows relationship to entities
    relationshipDAO().deleteFrom(id, FOLLOWS.ordinal());
  }

  @Transaction
  public RestUtil.PutResponse<User> createOrUpdate(User updated) throws IOException {
    User stored = JsonUtils.readValue(userDAO().findByName(updated.getName()), User.class);

    // TODO why are we doing this?
    List<UUID> teamIds = new ArrayList<>();
    if (updated.getTeams() != null) {
      teamIds.addAll(EntityUtil.getIDList(updated.getTeams()));
    }
    validateRelationships(updated, teamIds);
    if (stored == null) {
      return new RestUtil.PutResponse<>(Response.Status.CREATED, createInternal(updated));
    }
    setFields(stored, USER_UPDATE_FIELDS);
    updated.setId(stored.getId());

    UserUpdater userUpdater = new UserUpdater(stored, updated, false);
    userUpdater.updateAll();
    userUpdater.store();
    return new PutResponse<>(Status.OK, updated);
  }

  @Transaction
  public User patch(String id, String user, JsonPatch patch) throws IOException {
    User original = setFields(validateUser(id), USER_PATCH_FIELDS);
    LOG.info("SURESH original {}", JsonUtils.pojoToJson(original, true));
    LOG.info("SURESH patch {}", patch);

    JsonUtils.getJsonStructure(original);
    User updated = JsonUtils.applyPatch(original, patch, User.class);
    updated.withUpdatedBy(user).withUpdatedAt(new Date());
    patch(original, updated);
    return updated;
  }

  @Transaction
  public EntityReference getOwnerReference(User user) {
    return EntityUtil.getEntityReference(user);
  }

  private void patch(User original, User updated) throws IOException {
    List<UUID> teamIds = new ArrayList<>();
    if (updated.getTeams() != null) {
      teamIds.addAll(EntityUtil.getIDList(updated.getTeams()));
    }
    // Patch can't make changes to following fields. Ignore the changes
    updated.withName(original.getName()).withId(original.getId());
    validateRelationships(updated, teamIds);
    UserRepository.UserUpdater userUpdater = new UserRepository.UserUpdater(original, updated, true);
    userUpdater.updateAll();
    userUpdater.store();
  }

  private User setFields(User user, Fields fields) throws IOException {
    user.setProfile(fields.contains("profile") ? user.getProfile() : null);
    user.setTeams(fields.contains("teams") ? getTeams(user) : null);
    user.setOwns(fields.contains("owns") ? getOwns(user) : null);
    user.setFollows(fields.contains("follows") ? getFollows(user) : null);
    return user;
  }

  private List<EntityReference> getOwns(User user) throws IOException {
    // Compile entities owned by the user
    List<EntityReference> ownedEntities = relationshipDAO().findTo(user.getId().toString(), OWNS.ordinal());

    // Compile entities owned by the team the user belongs to
    List<EntityReference> teams = user.getTeams() == null ? getTeams(user) : user.getTeams();
    for (EntityReference team : teams) {
      ownedEntities.addAll(relationshipDAO().findTo(team.getId().toString(), OWNS.ordinal()));
    }
    // Populate details in entity reference
    return EntityUtil.getEntityReference(ownedEntities, tableDAO(), databaseDAO(), metricsDAO(), dashboardDAO(),
            reportDAO(), topicDAO(), chartDAO(), taskDAO(), modelDAO(), pipelineDAO());
  }

  private List<EntityReference> getFollows(User user) throws IOException {
    return EntityUtil.getEntityReference(relationshipDAO().findTo(user.getId().toString(), FOLLOWS.ordinal()),
            tableDAO(), databaseDAO(), metricsDAO(), dashboardDAO(), reportDAO(), topicDAO(), chartDAO(), taskDAO(),
            modelDAO(), pipelineDAO());
  }

  private User validateUser(String userId) throws IOException {
    return EntityUtil.validate(userId, userDAO().findById(userId), User.class);
  }

  private User createInternal(User user) throws IOException {
    storeUser(user, false);
    addRelationships(user);
    return user;
  }

  private void validateRelationships(User user, List<UUID> teamIds) throws IOException {
    user.setTeams(validateTeams(teamIds));
  }

  private void addRelationships(User user) {
    assignTeams(user, user.getTeams());
  }

  private void storeUser(User user, boolean update) throws JsonProcessingException {
    // Relationships and fields such as href are derived and not stored as part of json
    List<EntityReference> teams = user.getTeams();

    // Don't store owner, database, href and tags as JSON. Build it on the fly based on relationships
    user.withTeams(null).withHref(null);

    if (update) {
      userDAO().update(user.getId().toString(), JsonUtils.pojoToJson(user));
    } else {
      userDAO().insert(JsonUtils.pojoToJson(user));
    }

    // Restore the relationships
    user.withTeams(teams);
  }

  private List<EntityReference> validateTeams(List<UUID> teamIds) throws IOException {
    if (teamIds == null) {
      return Collections.emptyList(); // Return empty team list
    }
    List<EntityReference> validatedTeams = new ArrayList<>();
    for (UUID teamId : teamIds) {
      validatedTeams.add(EntityUtil.getEntityReference(
              EntityUtil.validate(teamId.toString(), teamDAO().findById(teamId.toString()), Team.class)));
    }
    return validatedTeams;
  }

  /* Add all the teams that user belongs to to User entity */
  private List<EntityReference> getTeams(User user) throws IOException {
    List<String> teamIds = relationshipDAO().findFrom(user.getId().toString(), CONTAINS.ordinal(), "team");
    List<Team> teams = new ArrayList<>();
    for (String teamId : teamIds) {
      LOG.debug("Adding team {}", teamId);
      String json = teamDAO().findById(teamId);
      Team team = JsonUtils.readValue(json, Team.class);
      if (team != null) {
        teams.add(team);
      }
    }
    return toEntityReference(teams);
  }

  private void assignTeams(User user, List<EntityReference> teams) {
    // Query - add team to the user
    for (EntityReference team : teams) {
      relationshipDAO().insert(team.getId().toString(), user.getId().toString(),
              "team", "user", CONTAINS.ordinal());
    }
  }

  private User markUserAsDeactivated(String id) throws IOException {
    User user = validateUser(id);
    if (Optional.ofNullable(user.getDeactivated()).orElse(false)) {
      // User is already deactivated
      return user;
    }
    user.setDeactivated(true);
    user.setName("deactivated." +user.getName());
    user.setDisplayName("Deactivated " +user.getDisplayName());
    userDAO().update(id, JsonUtils.pojoToJson(user));
    return user;
  }

  public interface UserDAO {
    @SqlUpdate("INSERT INTO user_entity (json) VALUES (:json)")
    void insert(@Bind("json") String json);

    @SqlQuery("SELECT json FROM user_entity WHERE id = :id")
    String findById(@Bind("id") String id);

    @SqlQuery("SELECT json FROM user_entity WHERE name = :name")
    String findByName(@Bind("name") String name);

    @SqlQuery("SELECT json FROM user_entity WHERE email = :email")
    String findByEmail(@Bind("email") String email);

    @SqlQuery("SELECT json FROM user_entity")
    List<String> list();

    @SqlQuery("SELECT count(*) FROM user_entity")
    int listCount();

    @SqlQuery(
            "SELECT json FROM (" +
                    "SELECT name, json FROM user_entity WHERE " +
                    "name < :before " + // Pagination by user name
                    "ORDER BY name DESC " + // Pagination ordering by user name
                    "LIMIT :limit" +
                    ") last_rows_subquery ORDER BY name")
    List<String> listBefore(@Bind("limit") int limit, @Bind("before") String before);

    @SqlQuery("SELECT json FROM user_entity WHERE " +
            "name > :after " + // Pagination by user name
            "ORDER BY name " + // Pagination ordering by user name
            "LIMIT :limit")
    List<String> listAfter(@Bind("limit") int limit, @Bind("after") String after);

    @SqlUpdate("UPDATE user_entity SET json = :json WHERE id = :id")
    void update(@Bind("id") String id, @Bind("json") String json);

    @SqlQuery("SELECT EXISTS (SELECT * FROM user_entity where id = :id)")
    boolean exists(@Bind("id") String id);
  }

  static class UserEntityInterface implements EntityInterface {
    private final User user;

    UserEntityInterface(User User) {
      this.user = User;
    }

    @Override
    public UUID getId() {
      return user.getId();
    }

    @Override
    public String getDescription() {
      return null;
    }

    @Override
    public String getDisplayName() {
      return user.getDisplayName();
    }

    @Override
    public EntityReference getOwner() { return null; }

    @Override
    public String getFullyQualifiedName() { return null; }

    @Override
    public List<TagLabel> getTags() { return null; }

    @Override
    public void setDescription(String description) { }

    @Override
    public void setDisplayName(String displayName) { }

    @Override
    public void setTags(List<TagLabel> tags) { }
  }

  /**
   * Handles entity updated from PUT and POST operation.
   */
  public class UserUpdater extends EntityUpdater {
    final User orig;
    final User updated;

    public UserUpdater(User orig, User updated, boolean patchOperation) {
      super(new UserRepository.UserEntityInterface(orig), new UserRepository.UserEntityInterface(updated),
              patchOperation, relationshipDAO(), null);
      this.orig = orig;
      this.updated = updated;
    }

    public void updateAll() throws IOException {
      // Update operation can't undelete a user
      if (updated.getDeactivated() != orig.getDeactivated()) {
        throw new IllegalArgumentException(CatalogExceptionMessage.readOnlyAttribute("User", "deactivated"));
      }
      super.updateAll();
      updateTeams();
    }

    public void updateTeams() {
      // Remove teams from original and add teams from updated
      relationshipDAO().deleteTo(orig.getId().toString(), CONTAINS.ordinal(), "team");
      if (!updated.getTeams().isEmpty()) {
        assignTeams(updated, updated.getTeams());
      }
    }
    public void store() throws IOException {
      updated.setVersion(getNewVersion(orig.getVersion()));
      storeUser(updated, true);
    }
  }
}
