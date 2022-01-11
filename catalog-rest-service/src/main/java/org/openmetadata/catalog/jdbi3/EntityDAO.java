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

import static org.openmetadata.catalog.exception.CatalogExceptionMessage.entityNotFound;

import com.fasterxml.jackson.core.JsonProcessingException;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.jdbi.v3.sqlobject.customizer.Bind;
import org.jdbi.v3.sqlobject.customizer.Define;
import org.jdbi.v3.sqlobject.statement.SqlQuery;
import org.jdbi.v3.sqlobject.statement.SqlUpdate;
import org.openmetadata.catalog.Entity;
import org.openmetadata.catalog.exception.CatalogExceptionMessage;
import org.openmetadata.catalog.exception.EntityNotFoundException;
import org.openmetadata.catalog.type.EntityReference;
import org.openmetadata.catalog.util.JsonUtils;

public interface EntityDAO<T> {
  /** Methods that need to be overridden by interfaces extending this */
  String getTableName();

  Class<T> getEntityClass();

  String getNameColumn();

  EntityReference getEntityReference(T entity);

  /** Common queries for all entities implemented here. Do not override. */
  @SqlUpdate("INSERT INTO <table> (json) VALUES (:json)")
  void insert(@Define("table") String table, @Bind("json") String json);

  @SqlUpdate("UPDATE <table> SET  json = :json WHERE id = :id")
  void update(@Define("table") String table, @Bind("id") String id, @Bind("json") String json);

  @SqlQuery("SELECT json FROM <table> WHERE id = :id AND deleted IS NOT TRUE")
  String findById(@Define("table") String table, @Bind("id") String id);

  @SqlQuery("SELECT json FROM <table> WHERE <nameColumn> = :name AND deleted IS NOT TRUE")
  String findByName(@Define("table") String table, @Define("nameColumn") String nameColumn, @Bind("name") String name);

  @SqlQuery("SELECT json FROM <table> WHERE <nameColumn> = :name")
  String findByNameDeletedOrExists(
      @Define("table") String table, @Define("nameColumn") String nameColumn, @Bind("name") String name);

  @SqlQuery("SELECT json FROM <table> WHERE id = :id")
  String findByIdDeletedOrExists(
          @Define("table") String table, @Define("nameColumn") String nameColumn, @Bind("id") String id);

  @SqlQuery(
      "SELECT count(*) FROM <table> WHERE "
          + "(<nameColumn> LIKE CONCAT(:fqnPrefix, '.%') OR :fqnPrefix IS NULL) AND deleted IS NOT TRUE")
  int listCount(
      @Define("table") String table, @Define("nameColumn") String nameColumn, @Bind("fqnPrefix") String fqnPrefix);

  @SqlQuery(
      "SELECT json FROM ("
          + "SELECT <nameColumn>, json FROM <table> WHERE "
          + "(<nameColumn> LIKE CONCAT(:fqnPrefix, '.%') OR :fqnPrefix IS NULL) AND "
          + // Filter by service name
          "<nameColumn> < :before AND "
          + "deleted = false "
          + // Pagination by chart fullyQualifiedName
          "ORDER BY <nameColumn> DESC "
          + // Pagination ordering by chart fullyQualifiedName
          "LIMIT :limit"
          + ") last_rows_subquery ORDER BY <nameColumn>")
  List<String> listBefore(
      @Define("table") String table,
      @Define("nameColumn") String nameColumn,
      @Bind("fqnPrefix") String fqnPrefix,
      @Bind("limit") int limit,
      @Bind("before") String before);

  @SqlQuery(
      "SELECT json FROM <table> WHERE "
          + "(<nameColumn> LIKE CONCAT(:fqnPrefix, '.%') OR :fqnPrefix IS NULL) AND "
          + "<nameColumn> > :after AND "
          + "deleted = false "
          + "ORDER BY <nameColumn> "
          + "LIMIT :limit")
  List<String> listAfter(
      @Define("table") String table,
      @Define("nameColumn") String nameColumn,
      @Bind("fqnPrefix") String fqnPrefix,
      @Bind("limit") int limit,
      @Bind("after") String after);

  @SqlQuery("SELECT EXISTS (SELECT * FROM <table> WHERE id = :id)")
  boolean exists(@Define("table") String table, @Bind("id") String id);

  @SqlUpdate("DELETE FROM <table> WHERE id = :id")
  int delete(@Define("table") String table, @Bind("id") String id);

  /** Default methods that interfaces with implementation. Don't override */
  default void insert(T entity) throws JsonProcessingException {
    insert(getTableName(), JsonUtils.pojoToJson(entity));
  }

  default void update(UUID id, String json) {
    update(getTableName(), id.toString(), json);
  }

  default T getEntity(String json, String idOrName) throws IOException {
    Class<T> clz = getEntityClass();
    T entity = null;
    if (json != null) {
      entity = JsonUtils.readValue(json, clz);
    }
    if (entity == null) {
      String entityName = Entity.getEntityNameFromClass(clz);
      throw EntityNotFoundException.byMessage(CatalogExceptionMessage.entityNotFound(entityName, idOrName));
    }
    return entity;
  }

  default T findEntityById(UUID id) throws IOException {
    String json = findById(getTableName(), id.toString());
    return getEntity(json, id.toString());
  }

  default T findEntityByName(String fqn) throws IOException {
    String json = findByName(getTableName(), getNameColumn(), fqn);
    return getEntity(json, fqn);
  }

  default EntityReference findEntityReferenceById(UUID id) throws IOException {
    return getEntityReference(findEntityById(id));
  }

  default EntityReference findEntityReferenceByIdDeletedOrExists(UUID id) throws IOException {
    return getEntityReference(findEntityByIdDeletedOrExists(id));
  }

  default EntityReference findEntityReferenceByName(String fqn) throws IOException {
    return getEntityReference(findEntityByName(fqn));
  }

  default String findJsonById(String fqn) {
    return findById(getTableName(), fqn);
  }

  default String findJsonByFqn(String fqn) {
    return findByName(getTableName(), getNameColumn(), fqn);
  }

  default String findDeletedOrExists(String fqn) {
    return findByNameDeletedOrExists(getTableName(), getNameColumn(), fqn);
  }

  default T findEntityByIdDeletedOrExists(UUID id) throws IOException {
    String json = findByIdDeletedOrExists(getTableName(), getNameColumn(), id.toString());
    return getEntity(json, id.toString());
  }

  default int listCount(String databaseFQN) {
    return listCount(getTableName(), getNameColumn(), databaseFQN);
  }

  default List<String> listBefore(String parentFQN, int limit, String before) {
    return listBefore(getTableName(), getNameColumn(), parentFQN, limit, before);
  }

  default List<String> listAfter(String databaseFQN, int limit, String after) {
    return listAfter(getTableName(), getNameColumn(), databaseFQN, limit, after);
  }

  default boolean exists(UUID id) {
    return exists(getTableName(), id.toString());
  }

  default int delete(UUID id) {
    int rowsDeleted = delete(getTableName(), id.toString());
    if (rowsDeleted <= 0) {
      String entityName = Entity.getEntityNameFromClass(getEntityClass());
      throw EntityNotFoundException.byMessage(entityNotFound(entityName, id));
    }
    return rowsDeleted;
  }
}
