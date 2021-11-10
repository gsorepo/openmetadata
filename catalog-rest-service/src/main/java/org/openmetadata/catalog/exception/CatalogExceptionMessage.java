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

package org.openmetadata.catalog.exception;

import org.apache.commons.lang.StringUtils;

import java.util.UUID;

public final class CatalogExceptionMessage {
  public static final String ENTITY_ALREADY_EXISTS = "Entity already exists";
  public static final String ENTITY_NAME_EMPTY = "Entity name can't be empty";

  private CatalogExceptionMessage() {

  }

  public static String entityNotFound(String entity, String id) {
    return String.format("%s instance for %s not found", StringUtils.capitalize(entity), id);
  }

  public static String entityNotFound(String entity, UUID id) {
    return entityNotFound(entity, id.toString());
  }

  public static String readOnlyAttribute(String entity, String attribute) {
    return String.format("%s attribute %s can't be modified", StringUtils.capitalize(entity), attribute);
  }

  public static String invalidField(String field) {
    return String.format("Invalid field name %s", field);
  }

  public static String entityTypeNotFound(String entity) {
    return String.format("Entity type %s not found", StringUtils.capitalize(entity));
  }

  public static String deactivatedUser(UUID id) {
    return String.format("User %s is deactivated", id);
  }

  public static String invalidColumnFQN(String fqn) {
    return String.format("Invalid fully qualified column name %s", fqn);
  }

  public static String entityVersionNotFound(String entity, String id, Double version) {
    return String.format("%s instance for %s and version %s not found", StringUtils.capitalize(entity), id, version);
  }
}
