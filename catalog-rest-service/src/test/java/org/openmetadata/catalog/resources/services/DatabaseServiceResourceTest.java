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

package org.openmetadata.catalog.resources.services;

import org.apache.http.client.HttpResponseException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.openmetadata.catalog.CatalogApplicationTest;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.api.services.CreateDatabaseService;
import org.openmetadata.catalog.api.services.CreateDatabaseService.DatabaseServiceType;
import org.openmetadata.catalog.type.Schedule;
import org.openmetadata.catalog.api.services.UpdateDatabaseService;
import org.openmetadata.catalog.entity.services.DatabaseService;
import org.openmetadata.catalog.exception.CatalogExceptionMessage;
import org.openmetadata.catalog.type.JdbcInfo;
import org.openmetadata.catalog.util.RestUtil;
import org.openmetadata.catalog.util.TestUtils;

import javax.ws.rs.client.WebTarget;
import javax.ws.rs.core.Response.Status;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

import static javax.ws.rs.core.Response.Status.BAD_REQUEST;
import static javax.ws.rs.core.Response.Status.CONFLICT;
import static javax.ws.rs.core.Response.Status.FORBIDDEN;
import static javax.ws.rs.core.Response.Status.NOT_FOUND;
import static javax.ws.rs.core.Response.Status.OK;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.openmetadata.catalog.util.TestUtils.adminAuthHeaders;
import static org.openmetadata.catalog.util.TestUtils.authHeaders;

public class DatabaseServiceResourceTest extends CatalogApplicationTest {
  @Test
  public void post_databaseServiceWithLongName_400_badRequest(TestInfo test) {
    // Create database with mandatory name field empty
    CreateDatabaseService create = create(test).withName(TestUtils.LONG_ENTITY_NAME);
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            createService(create, adminAuthHeaders()));
    TestUtils.assertResponse(exception, BAD_REQUEST, "[name size must be between 1 and 64]");
  }

  @Test
  public void post_databaseServiceWithoutName_400_badRequest(TestInfo test) {
    // Create database with mandatory name field empty
    CreateDatabaseService create = create(test).withName("");
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            createService(create, adminAuthHeaders()));
    TestUtils.assertResponse(exception, BAD_REQUEST, "[name size must be between 1 and 64]");
  }

  @Test
  public void post_databaseServiceAlreadyExists_409(TestInfo test) throws HttpResponseException {
    CreateDatabaseService create = create(test);
    createService(create, adminAuthHeaders());
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            createService(create, adminAuthHeaders()));
    TestUtils.assertResponse(exception, CONFLICT, CatalogExceptionMessage.ENTITY_ALREADY_EXISTS);
  }

  @Test
  public void post_validDatabaseService_as_admin_200_ok(TestInfo test) throws HttpResponseException {
    // Create database service with different optional fields
    Map<String, String> authHeaders = adminAuthHeaders();
    createAndCheckService(create(test, 1).withDescription(null), authHeaders);
    createAndCheckService(create(test, 2).withDescription("description"), authHeaders);
    createAndCheckService(create(test, 3).withIngestionSchedule(null), authHeaders);
  }

  @Test
  public void post_validDatabaseService_as_non_admin_401(TestInfo test)  {
    // Create database service with different optional fields
    Map<String, String> authHeaders = authHeaders("test@open-metadata.org");

    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            createAndCheckService(create(test, 1).withDescription(null), authHeaders));
    TestUtils.assertResponse(exception, FORBIDDEN,
            "Principal: CatalogPrincipal{name='test'} is not admin");
  }

  @Test
  public void post_invalidDatabaseServiceNoJdbc_4xx(TestInfo test) {
    // No jdbc connection set
    CreateDatabaseService create = create(test).withJdbc(null);
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            createService(create, adminAuthHeaders()));
    TestUtils.assertResponseContains(exception, BAD_REQUEST, "jdbc must not be null");
  }

  @Test
  public void post_invalidIngestionSchedule_4xx(TestInfo test) {
    // No jdbc connection set
    CreateDatabaseService create = create(test);
    Schedule schedule = create.getIngestionSchedule();

    // Invalid format
    create.withIngestionSchedule(schedule.withRepeatFrequency("INVALID"));
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            createService(create, adminAuthHeaders()));
    TestUtils.assertResponse(exception, BAD_REQUEST, "Invalid ingestion repeatFrequency INVALID");

    // Duration that contains years, months and seconds are not allowed
    create.withIngestionSchedule(schedule.withRepeatFrequency("P1Y"));
    exception = assertThrows(HttpResponseException.class, () -> createService(create, adminAuthHeaders()));
    TestUtils.assertResponse(exception, BAD_REQUEST,
            "Ingestion repeatFrequency can only contain Days, Hours, " +
                    "and Minutes - example P{d}DT{h}H{m}M");

    create.withIngestionSchedule(schedule.withRepeatFrequency("P1M"));
    exception = assertThrows(HttpResponseException.class, () -> createService(create, adminAuthHeaders()));
    TestUtils.assertResponse(exception, BAD_REQUEST,
            "Ingestion repeatFrequency can only contain Days, Hours, " +
                    "and Minutes - example P{d}DT{h}H{m}M");

    create.withIngestionSchedule(schedule.withRepeatFrequency("PT1S"));
    exception = assertThrows(HttpResponseException.class, () -> createService(create, adminAuthHeaders()));
    TestUtils.assertResponse(exception, BAD_REQUEST,
            "Ingestion repeatFrequency can only contain Days, Hours, " +
                    "and Minutes - example P{d}DT{h}H{m}M");
  }

  @Test
  public void post_validIngestionSchedules_as_admin_200(TestInfo test) throws HttpResponseException {
    Schedule schedule = new Schedule().withStartDate(RestUtil.DATE_TIME_FORMAT.format(new Date()));
    schedule.withRepeatFrequency("PT60M");  // Repeat every 60M should be valid
    createAndCheckService(create(test, 1).withIngestionSchedule(schedule), adminAuthHeaders());

    schedule.withRepeatFrequency("PT1H49M");
    createAndCheckService(create(test, 2).withIngestionSchedule(schedule), adminAuthHeaders());

    schedule.withRepeatFrequency("P1DT1H49M");
    createAndCheckService(create(test, 3).withIngestionSchedule(schedule), adminAuthHeaders());
  }

  @Test
  public void post_ingestionScheduleIsTooShort_4xx(TestInfo test) {
    // No jdbc connection set
    CreateDatabaseService create = create(test);
    Schedule schedule = create.getIngestionSchedule();
    create.withIngestionSchedule(schedule.withRepeatFrequency("PT1M"));  // Repeat every 0 seconds
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            createService(create, adminAuthHeaders()));
    TestUtils.assertResponseContains(exception, BAD_REQUEST,
            "Ingestion repeatFrequency is too short and must be more than 60 minutes");

    create.withIngestionSchedule(schedule.withRepeatFrequency("PT59M"));  // Repeat every 50 minutes 59 seconds
    exception = assertThrows(HttpResponseException.class, () -> createService(create, adminAuthHeaders()));
    TestUtils.assertResponse(exception, BAD_REQUEST, "Ingestion repeatFrequency is too short and must " +
            "be more than 60 minutes");
  }

  @Test
  public void put_updateNonExistentService_404() {
    // Update database description and ingestion service that are null
    UpdateDatabaseService update = new UpdateDatabaseService().withDescription("description1");
    HttpResponseException exception = assertThrows(HttpResponseException.class, ()
            -> updateDatabaseService(TestUtils.NON_EXISTENT_ENTITY.toString(), update, OK, adminAuthHeaders()));
    TestUtils.assertResponse(exception, NOT_FOUND, CatalogExceptionMessage.entityNotFound("DatabaseService",
            TestUtils.NON_EXISTENT_ENTITY));
  }

  @Test
  public void put_updateDatabaseService_as_admin_2xx(TestInfo test) throws HttpResponseException {
    DatabaseService dbService = createAndCheckService(create(test).withDescription(null).withIngestionSchedule(null),
            adminAuthHeaders());
    String id = dbService.getId().toString();
    String startDate = RestUtil.DATE_TIME_FORMAT.format(new Date());

    // Update database description and ingestion service that are null
    UpdateDatabaseService update = new UpdateDatabaseService().withDescription("description1");
    updateAndCheckService(id, update, OK, adminAuthHeaders());
    // Update ingestion schedule
    Schedule schedule = new Schedule().withStartDate(startDate).withRepeatFrequency("P1D");
    update.withIngestionSchedule(schedule);
    updateAndCheckService(id, update, OK, adminAuthHeaders());

    // Update description and ingestion schedule again
    update.withDescription("description1").withIngestionSchedule(schedule.withRepeatFrequency("PT1H"));
    updateAndCheckService(id, update, OK, adminAuthHeaders());
  }

  @Test
  public void put_update_as_non_admin_401(TestInfo test) throws HttpResponseException {
    Map<String, String> authHeaders = adminAuthHeaders();
    DatabaseService dbService = createAndCheckService(create(test).withDescription(null).withIngestionSchedule(null),
            authHeaders);
    String id = dbService.getId().toString();
    RestUtil.DATE_TIME_FORMAT.format(new Date());

    // Update database description and ingestion service that are null
    UpdateDatabaseService update = new UpdateDatabaseService().withDescription("description1");

    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            updateAndCheckService(id, update, OK, authHeaders("test@open-metadata.org")));
    TestUtils.assertResponse(exception, FORBIDDEN, "Principal: CatalogPrincipal{name='test'} " +
            "is not admin");
  }

  @Test
  public void get_nonExistentTeam_404_notFound() {
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            getService(TestUtils.NON_EXISTENT_ENTITY, adminAuthHeaders()));
    TestUtils.assertResponse(exception, NOT_FOUND, CatalogExceptionMessage.entityNotFound(Entity.DATABASE_SERVICE,
            TestUtils.NON_EXISTENT_ENTITY));
  }

  @Test
  public void get_nonExistentTeamByName_404_notFound() {
    HttpResponseException exception = assertThrows(HttpResponseException.class, ()
            -> getServiceByName("invalidName", null, adminAuthHeaders()));
    TestUtils.assertResponse(exception, NOT_FOUND, CatalogExceptionMessage.entityNotFound(Entity.DATABASE_SERVICE,
            "invalidName"));
  }

  public static DatabaseService createAndCheckService(CreateDatabaseService create,
                                                      Map<String, String> authHeaders) throws HttpResponseException {
    DatabaseService service = createService(create, authHeaders);
    validateService(service, create.getName(), create.getDescription(), create.getJdbc(),
            create.getIngestionSchedule());

    // GET the newly created service and validate
    DatabaseService getService = getService(service.getId(), authHeaders);
    validateService(getService, create.getName(), create.getDescription(), create.getJdbc(),
            create.getIngestionSchedule());

    // GET the newly created service by name and validate
    getService = getServiceByName(service.getName(), null, authHeaders);
    validateService(getService, create.getName(), create.getDescription(), create.getJdbc(),
            create.getIngestionSchedule());
    return service;
  }

  public static DatabaseService createService(CreateDatabaseService create,
                                              Map<String, String> authHeaders) throws HttpResponseException {
    return TestUtils.post(CatalogApplicationTest.getResource("services/databaseServices"),
                          create, DatabaseService.class, authHeaders);
  }

  private static void validateService(DatabaseService service, String expectedName, String expectedDescription,
                                      JdbcInfo expectedJdbc, Schedule expectedIngestion) {
    assertNotNull(service.getId());
    assertNotNull(service.getHref());
    assertEquals(expectedName, service.getName());
    assertEquals(expectedDescription, service.getDescription());

    // Validate jdbc
    assertEquals(expectedJdbc, service.getJdbc());

    if (expectedIngestion != null) {
      assertEquals(expectedIngestion.getStartDate(), service.getIngestionSchedule().getStartDate());
      assertEquals(expectedIngestion.getRepeatFrequency(), service.getIngestionSchedule().getRepeatFrequency());
    }
  }

  public static DatabaseService getService(UUID id, Map<String, String> authHeaders) throws HttpResponseException {
    return getService(id, null, authHeaders);
  }

  public static DatabaseService getService(UUID id, String fields, Map<String, String> authHeaders)
          throws HttpResponseException {
    WebTarget target = CatalogApplicationTest.getResource("services/databaseServices/" + id);
    target = fields != null ? target.queryParam("fields", fields) : target;
    return TestUtils.get(target, DatabaseService.class, authHeaders);
  }

  public static DatabaseService getServiceByName(String name, String fields, Map<String, String> authHeaders)
          throws HttpResponseException {
    WebTarget target = CatalogApplicationTest.getResource("services/databaseServices/name/" + name);
    target = fields != null ? target.queryParam("fields", fields) : target;
    return TestUtils.get(target, DatabaseService.class, authHeaders);
  }

  public static String getName(TestInfo test) {
    return String.format("dbservice_%s", test.getDisplayName());
  }

  public static String getName(TestInfo test, int index) {
    return String.format("dbservice_%d_%s", index, test.getDisplayName());
  }

  @Test
  public void delete_ExistentDatabaseService_ad_admin_200(TestInfo test) throws HttpResponseException {
    Map<String, String> authHeaders = adminAuthHeaders();
    DatabaseService databaseService = createService(create(test), authHeaders);
    deleteService(databaseService.getId(), databaseService.getName(), authHeaders);
  }

  @Test
  public void delete_as_user_401(TestInfo test) throws HttpResponseException {
    Map<String, String> authHeaders = adminAuthHeaders();
    DatabaseService databaseService = createService(create(test), authHeaders);
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            deleteService(databaseService.getId(), databaseService.getName(),
                    authHeaders("test@open-metadata.org")));
    TestUtils.assertResponse(exception, FORBIDDEN,
            "Principal: CatalogPrincipal{name='test'} is not admin");
  }

  @Test
  public void delete_notExistentDatabaseService() {
    HttpResponseException exception = assertThrows(HttpResponseException.class, () ->
            getService(TestUtils.NON_EXISTENT_ENTITY, adminAuthHeaders()));
    TestUtils.assertResponse(exception, NOT_FOUND,
            CatalogExceptionMessage.entityNotFound(Entity.DATABASE_SERVICE, TestUtils.NON_EXISTENT_ENTITY));
  }

  private void deleteService(UUID id, String name, Map<String, String> authHeaders) throws HttpResponseException {
    TestUtils.delete(CatalogApplicationTest.getResource("services/databaseServices/" + id), authHeaders);

    // Ensure deleted service does not exist
    HttpResponseException exception = assertThrows(HttpResponseException.class, () -> getService(id, authHeaders));
    TestUtils.assertResponse(exception, NOT_FOUND, CatalogExceptionMessage.entityNotFound(Entity.DATABASE_SERVICE, id));

    // Ensure deleted service does not exist when getting by name
    exception = assertThrows(HttpResponseException.class, () -> getServiceByName(name, null, authHeaders));
    TestUtils.assertResponse(exception, NOT_FOUND,
            CatalogExceptionMessage.entityNotFound(Entity.DATABASE_SERVICE, name));
  }

  public static CreateDatabaseService create(TestInfo test) {
    String startDate = RestUtil.DATE_TIME_FORMAT.format(new Date());
    return new CreateDatabaseService().withName(getName(test)).withServiceType(DatabaseServiceType.Snowflake)
            .withJdbc(TestUtils.JDBC_INFO)
            .withIngestionSchedule(new Schedule().withStartDate(startDate).withRepeatFrequency("P1D"));
  }

  private static CreateDatabaseService create(TestInfo test, int index) {
    return new CreateDatabaseService().withName(getName(test, index)).withServiceType(DatabaseServiceType.Snowflake)
            .withJdbc(TestUtils.JDBC_INFO);
  }

  public static void updateAndCheckService(String id, UpdateDatabaseService update, Status status,
                                           Map<String, String> authHeaders) throws HttpResponseException {
    DatabaseService service = updateDatabaseService(id, update, status, authHeaders);
    validateService(service, service.getName(), update.getDescription(), service.getJdbc(),
            update.getIngestionSchedule());

    // GET the newly updated database and validate
    DatabaseService getService = getService(service.getId(), authHeaders);
    validateService(getService, service.getName(), update.getDescription(), service.getJdbc(),
            update.getIngestionSchedule());

    // GET the newly updated database by name and validate
    getService = getServiceByName(service.getName(), null, authHeaders);
    validateService(getService, service.getName(), update.getDescription(), service.getJdbc(),
            update.getIngestionSchedule());
  }

  public static DatabaseService updateDatabaseService(String id, UpdateDatabaseService updated,
                                                      Status status, Map<String, String> authHeaders)
          throws HttpResponseException {
    return TestUtils.put(CatalogApplicationTest.getResource("services/databaseServices/" + id), updated,
            DatabaseService.class, status, authHeaders);
  }
}
