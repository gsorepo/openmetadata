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

package org.openmetadata.service.secrets.converter;

import java.util.List;
import org.openmetadata.schema.services.connections.database.CassandraConnection;
import org.openmetadata.schema.services.connections.database.cassandra.CloudConfig;
import org.openmetadata.schema.services.connections.database.common.basicAuth;
import org.openmetadata.schema.utils.JsonUtils;

/**
 * Converter class to get an `CassandraConnection` object.
 */
public class CassandraConnectionClassConverter extends ClassConverter {

  private static final List<Class<?>> CONFIG_SOURCE_CLASSES =
      List.of(basicAuth.class, CloudConfig.class);

  public CassandraConnectionClassConverter() {
    super(CassandraConnection.class);
  }

  @Override
  public Object convert(Object object) {
    CassandraConnection cassandraConnection =
        (CassandraConnection) JsonUtils.convertValue(object, this.clazz);

    tryToConvert(cassandraConnection.getAuthType(), CONFIG_SOURCE_CLASSES)
        .ifPresent(cassandraConnection::setAuthType);

    return cassandraConnection;
  }
}
