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

package org.openmetadata.service.resources.databases;

import static javax.ws.rs.core.Response.Status.BAD_REQUEST;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.openmetadata.common.utils.CommonUtil.nullOrEmpty;
import static org.openmetadata.service.util.TestUtils.ADMIN_AUTH_HEADERS;
import static org.openmetadata.service.util.TestUtils.assertListNotNull;
import static org.openmetadata.service.util.TestUtils.assertListNull;
import static org.openmetadata.service.util.TestUtils.assertResponseContains;

import java.io.IOException;
import java.util.Map;
import javax.ws.rs.core.Response;
import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.HttpResponseException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInfo;
import org.openmetadata.schema.api.data.CreateDatabaseSchema;
import org.openmetadata.schema.api.data.CreateTable;
import org.openmetadata.schema.api.data.RestoreEntity;
import org.openmetadata.schema.entity.data.DatabaseSchema;
import org.openmetadata.schema.entity.data.Table;
import org.openmetadata.schema.type.EntityReference;
import org.openmetadata.service.Entity;
import org.openmetadata.service.resources.EntityResourceTest;
import org.openmetadata.service.resources.databases.DatabaseSchemaResource.DatabaseSchemaList;
import org.openmetadata.service.util.FullyQualifiedName;
import org.openmetadata.service.util.TestUtils;

@Slf4j
class DatabaseSchemaResourceTest extends EntityResourceTest<DatabaseSchema, CreateDatabaseSchema> {
  public DatabaseSchemaResourceTest() {
    super(
        Entity.DATABASE_SCHEMA,
        DatabaseSchema.class,
        DatabaseSchemaList.class,
        "databaseSchemas",
        DatabaseSchemaResource.FIELDS);
    supportedNameCharacters = "_'+#- .()$" + EntityResourceTest.RANDOM_STRING_GENERATOR.generate(1);
  }

  @Test
  void post_schemaWithoutRequiredDatabase_400(TestInfo test) {
    CreateDatabaseSchema create = createRequest(test).withDatabase(null);
    assertResponseContains(
        () -> createEntity(create, ADMIN_AUTH_HEADERS), BAD_REQUEST, "database must not be null");
  }

  @Test
  void delete_schemaWithTables_200(TestInfo test) throws IOException {
    CreateDatabaseSchema create =
        createRequest(test).withDatabase(DATABASE.getFullyQualifiedName());
    DatabaseSchema createdSchema = createAndCheckEntity(create, ADMIN_AUTH_HEADERS);
    TableResourceTest tableResourceTest = new TableResourceTest();
    CreateTable createTable =
        tableResourceTest
            .createRequest("t1", "", "", null)
            .withDatabaseSchema(createdSchema.getFullyQualifiedName());
    Table table1 = tableResourceTest.createEntity(createTable, ADMIN_AUTH_HEADERS);
    createTable =
        tableResourceTest
            .createRequest("t2", "", "", null)
            .withDatabaseSchema(createdSchema.getFullyQualifiedName());
    Table table2 = tableResourceTest.createEntity(createTable, ADMIN_AUTH_HEADERS);

    // recursively soft delete schema
    deleteAndCheckEntity(createdSchema, true, false, ADMIN_AUTH_HEADERS);

    // Restore one of the tables.
    tableResourceTest.restoreEntity(
        new RestoreEntity().withId(table2.getId()), Response.Status.OK, ADMIN_AUTH_HEADERS);

    // Restore Schema
    restoreEntity(
        new RestoreEntity().withId(createdSchema.getId()), Response.Status.OK, ADMIN_AUTH_HEADERS);
    DatabaseSchema schema = getEntity(createdSchema.getId(), ADMIN_AUTH_HEADERS);
    assertNotNull(schema);
  }

  @Override
  public DatabaseSchema validateGetWithDifferentFields(DatabaseSchema schema, boolean byName)
      throws HttpResponseException {
    // Add tables to the database schema
    if (nullOrEmpty(schema.getTables())) {
      TableResourceTest tableResourceTest = new TableResourceTest();
      CreateTable create =
          tableResourceTest
              .createRequest("t1", "", "", null)
              .withDatabaseSchema(schema.getFullyQualifiedName());
      tableResourceTest.createEntity(create, ADMIN_AUTH_HEADERS);

      create.withName("t2");
      tableResourceTest.createEntity(create, ADMIN_AUTH_HEADERS);
    }

    // Now query request different fields
    String fields = "";
    schema =
        byName
            ? getEntityByName(schema.getFullyQualifiedName(), fields, ADMIN_AUTH_HEADERS)
            : getEntity(schema.getId(), fields, ADMIN_AUTH_HEADERS);
    assertListNotNull(schema.getService(), schema.getServiceType(), schema.getDatabase());
    assertListNull(schema.getOwner(), schema.getTables());

    fields = "owner,tags,tables";
    schema =
        byName
            ? getEntityByName(schema.getFullyQualifiedName(), fields, ADMIN_AUTH_HEADERS)
            : getEntity(schema.getId(), fields, ADMIN_AUTH_HEADERS);
    assertListNotNull(schema.getService(), schema.getServiceType());
    // Fields usageSummary and location are not set during creation - tested elsewhere
    assertListNotNull(schema.getTables());
    TestUtils.validateEntityReferences(schema.getTables(), true);
    // Checks for other owner, tags, and followers is done in the base class
    return schema;
  }

  @Override
  public CreateDatabaseSchema createRequest(String name) {
    return new CreateDatabaseSchema()
        .withName(name)
        .withDatabase(getContainer().getFullyQualifiedName());
  }

  @Override
  public EntityReference getContainer() {
    return DATABASE.getEntityReference();
  }

  @Override
  public EntityReference getContainer(DatabaseSchema entity) {
    return entity.getDatabase();
  }

  @Override
  public void validateCreatedEntity(
      DatabaseSchema schema, CreateDatabaseSchema createRequest, Map<String, String> authHeaders) {
    // Validate service
    assertNotNull(schema.getServiceType());
    assertReference(createRequest.getDatabase(), schema.getDatabase());
    assertEquals(
        FullyQualifiedName.add(schema.getDatabase().getFullyQualifiedName(), schema.getName()),
        schema.getFullyQualifiedName());
  }

  @Override
  public void compareEntities(
      DatabaseSchema expected, DatabaseSchema updated, Map<String, String> authHeaders) {
    // Validate service
    assertReference(expected.getDatabase(), updated.getDatabase());
    assertEquals(
        FullyQualifiedName.add(updated.getDatabase().getFullyQualifiedName(), updated.getName()),
        updated.getFullyQualifiedName());
  }

  @Override
  public void assertFieldChange(String fieldName, Object expected, Object actual) {
    assertCommonFieldChange(fieldName, expected, actual);
  }
}
