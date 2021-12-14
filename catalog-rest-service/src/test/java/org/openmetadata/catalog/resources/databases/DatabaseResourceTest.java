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

package org.openmetadata.catalog.resources.databases;

import org.apache.http.client.HttpResponseException;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.api.data.CreateDatabase;
import org.openmetadata.catalog.entity.data.Database;
import org.openmetadata.catalog.exception.CatalogExceptionMessage;
import org.openmetadata.catalog.jdbi3.DatabaseRepository.DatabaseEntityInterface;
import org.openmetadata.catalog.resources.EntityResourceTest;
import org.openmetadata.catalog.resources.databases.DatabaseResource.DatabaseList;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.util.EntityInterface;
import org.openmetadata.catalog.util.ResultList;
import org.openmetadata.catalog.util.TestUtils;

import java.io.IOException;
import java.net.URISyntaxException;
import java.util.HashMap;
import java.util.Map;

import static javax.ws.rs.core.Response.Status.BAD_REQUEST;
import static javax.ws.rs.core.Response.Status.CONFLICT;
import static javax.ws.rs.core.Response.Status.FORBIDDEN;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.openmetadata.catalog.util.TestUtils.adminAuthHeaders;
import static org.openmetadata.catalog.util.TestUtils.assertResponse;
import static org.openmetadata.catalog.util.TestUtils.authHeaders;

public class DatabaseResourceTest extends EntityResourceTest<Database> {
  public DatabaseResourceTest() {
    super(Entity.DATABASE, Database.class, DatabaseList.class, "databases",
            DatabaseResource.FIELDS, false, true, false);
  }

  @BeforeAll
  public static void setup(TestInfo test) throws IOException, URISyntaxException {
    EntityResourceTest.setup(test);
  }

  @Test
  public void post_validDatabases_as_admin_200_OK(TestInfo test) throws IOException {
    // Create team with different optional fields
    CreateDatabase create = create(test);
    createAndCheckEntity(create, adminAuthHeaders());

    create.withName(getEntityName(test, 1)).withDescription("description");
    createAndCheckEntity(create, adminAuthHeaders());
  }

  @Test
  public void post_databaseFQN_as_admin_200_OK(TestInfo test) throws IOException {
    // Create team with different optional fields
    CreateDatabase create = create(test);
    create.setService(new EntityReference().withId(SNOWFLAKE_REFERENCE.getId()).withType("databaseService"));
    Database db = createAndCheckEntity(create, adminAuthHeaders());
    String expectedFQN = SNOWFLAKE_REFERENCE.getName()+"."+create.getName();
    assertEquals(expectedFQN, db.getFullyQualifiedName());

  }

  @Test
  public void post_databaseWithUserOwner_200_ok(TestInfo test) throws IOException {
    createAndCheckEntity(create(test).withOwner(USER_OWNER1), adminAuthHeaders());
  }

  @Test
  public void post_databaseWithTeamOwner_200_ok(TestInfo test) throws IOException {
    createAndCheckEntity(create(test).withOwner(TEAM_OWNER1), adminAuthHeaders());
  }

  @Test
  public void post_database_as_non_admin_401(TestInfo test) {
    CreateDatabase create = create(test);
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            createDatabase(create, authHeaders("test@open-metadata.org")));
    assertResponse(exception, FORBIDDEN, "Principal: CatalogPrincipal{name='test'} is not admin");
  }

  @Test
  public void post_databaseWithoutRequiredService_4xx(TestInfo test) {
    CreateDatabase create = create(test).withService(null);
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            createDatabase(create, adminAuthHeaders()));
    TestUtils.assertResponseContains(exception, BAD_REQUEST, "service must not be null");
  }

  @Test
  public void post_databaseWithDifferentService_200_ok(TestInfo test) throws IOException {
    EntityReference[] differentServices = {MYSQL_REFERENCE, REDSHIFT_REFERENCE, BIGQUERY_REFERENCE,
            SNOWFLAKE_REFERENCE};

    // Create database for each service and test APIs
    for (EntityReference service : differentServices) {
      createAndCheckEntity(create(test).withService(service), adminAuthHeaders());

      // List databases by filtering on service name and ensure right databases are returned in the response
      Map<String, String> queryParams = new HashMap<>(){{put("service", service.getName());}};
      ResultList<Database> list = listEntities(queryParams, adminAuthHeaders());
      for (Database db : list.getData()) {
        assertEquals(service.getName(), db.getService().getName());
      }
    }
  }

  @Test
  public void get_databaseWithDifferentFields_200_OK(TestInfo test) throws IOException {
    CreateDatabase create = create(test).withDescription("description").withOwner(USER_OWNER1)
            .withService(SNOWFLAKE_REFERENCE);
    Database database = createAndCheckEntity(create, adminAuthHeaders());
    validateGetWithDifferentFields(database, false);
  }

  @Test
  public void get_databaseByNameWithDifferentFields_200_OK(TestInfo test) throws IOException {
    CreateDatabase create = create(test).withDescription("description").withOwner(USER_OWNER1)
            .withService(SNOWFLAKE_REFERENCE);
    Database database = createAndCheckEntity(create, adminAuthHeaders());
    validateGetWithDifferentFields(database, true);
  }

  @Test
  public void delete_emptyDatabase_200_ok(TestInfo test) throws HttpResponseException {
    Database database = createDatabase(create(test), adminAuthHeaders());
    deleteEntity(database.getId(), adminAuthHeaders());
  }

  @Test
  public void delete_nonEmptyDatabase_4xx() {
    // TODO
  }

  public static Database createDatabase(CreateDatabase create,
                                        Map<String, String> authHeaders) throws HttpResponseException {
    return TestUtils.post(getResource("databases"), create, Database.class, authHeaders);
  }

  /** Validate returned fields GET .../databases/{id}?fields="..." or GET .../databases/name/{fqn}?fields="..." */
  private void validateGetWithDifferentFields(Database database, boolean byName) throws HttpResponseException {
    // .../databases?fields=owner
    String fields = "owner";
    database = byName ? getEntityByName(database.getFullyQualifiedName(), fields, adminAuthHeaders()) :
            getEntity(database.getId(), fields, adminAuthHeaders());
    assertNotNull(database.getOwner());
    assertNotNull(database.getService()); // We always return the service
    assertNotNull(database.getServiceType());
    assertNull(database.getTables());
    assertNull(database.getUsageSummary());

    // .../databases?fields=owner,tables,usageSummary
    fields = "owner,tables,usageSummary";
    database = byName ? getEntityByName(database.getFullyQualifiedName(), fields, adminAuthHeaders()) :
            getEntity(database.getId(), fields, adminAuthHeaders());
    assertNotNull(database.getOwner());
    assertNotNull(database.getService()); // We always return the service
    assertNotNull(database.getServiceType());
    assertNotNull(database.getTables());
    TestUtils.validateEntityReference(database.getTables());
    assertNotNull(database.getUsageSummary());

  }

  public CreateDatabase create(TestInfo test) {
    return create(getEntityName(test));
  }

  private CreateDatabase create(String entityName) {
    return new CreateDatabase().withName(entityName).withService(SNOWFLAKE_REFERENCE);
  }

  @Override
  public Object createRequest(String name, String description, String displayName, EntityReference owner) {
    return create(name).withDescription(description).withOwner(owner);
  }

  @Override
  public void validateCreatedEntity(Database database, Object request, Map<String, String> authHeaders) {
    CreateDatabase createRequest = (CreateDatabase) request;
    validateCommonEntityFields(getEntityInterface(database), createRequest.getDescription(),
            TestUtils.getPrincipal(authHeaders), createRequest.getOwner());

    // Validate service
    assertNotNull(database.getServiceType());
    assertService(createRequest.getService(), database.getService());
  }

  @Override
  public void validateUpdatedEntity(Database updatedEntity, Object request, Map<String, String> authHeaders) {
    validateCreatedEntity(updatedEntity, request, authHeaders);
  }

  @Override
  public void compareEntities(Database expected, Database updated, Map<String, String> authHeaders) {
    validateCommonEntityFields(getEntityInterface(updated), expected.getDescription(),
            TestUtils.getPrincipal(authHeaders), expected.getOwner());
    // Validate service
    assertService(expected.getService(), updated.getService());
  }

  @Override
  public EntityInterface<Database> getEntityInterface(Database entity) {
    return new DatabaseEntityInterface(entity);
  }

  @Override
  public void assertFieldChange(String fieldName, Object expected, Object actual) throws IOException {
    assertCommonFieldChange(fieldName, expected, actual);
  }
}
