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

package org.openmetadata.service.util;

import static org.openmetadata.schema.entity.services.ingestionPipelines.PipelineType.METADATA;

import java.util.List;
import org.openmetadata.schema.entity.services.ingestionPipelines.IngestionPipeline;
import org.openmetadata.schema.metadataIngestion.DatabaseServiceMetadataPipeline;
import org.openmetadata.schema.metadataIngestion.dbtconfig.DbtCloudConfig;
import org.openmetadata.schema.metadataIngestion.dbtconfig.DbtGCSConfig;
import org.openmetadata.schema.metadataIngestion.dbtconfig.DbtHttpConfig;
import org.openmetadata.schema.metadataIngestion.dbtconfig.DbtLocalConfig;
import org.openmetadata.schema.metadataIngestion.dbtconfig.DbtS3Config;
import org.openmetadata.service.Entity;

public class IngestionPipelineBuilder {

  private static final List<Class<?>> DBT_CONFIG_CLASSES =
      List.of(DbtCloudConfig.class, DbtGCSConfig.class, DbtHttpConfig.class, DbtLocalConfig.class, DbtS3Config.class);

  /**
   * Build `IngestionPipeline` object with concrete class for the config which by definition it is a `Object`.
   *
   * @param ingestionPipeline the ingestion pipeline object
   * @return ingestion pipeline with concrete classes
   */
  public static IngestionPipeline build(IngestionPipeline ingestionPipeline) {
    if (METADATA.equals(ingestionPipeline.getPipelineType())
        && ingestionPipeline.getService().getType().equals(Entity.DATABASE_SERVICE)
        && ingestionPipeline.getSourceConfig() != null) {
      DatabaseServiceMetadataPipeline databaseServiceMetadataPipeline =
          JsonUtils.convertValue(
              ingestionPipeline.getSourceConfig().getConfig(), DatabaseServiceMetadataPipeline.class);
      ingestionPipeline
          .getSourceConfig()
          .setConfig(
              databaseServiceMetadataPipeline.withDbtConfigSource(
                  buildDbtConfigSource(databaseServiceMetadataPipeline.getDbtConfigSource())));
    }
    return ingestionPipeline;
  }

  private static Object buildDbtConfigSource(Object config) {
    if (config != null) {
      for (Class<?> clazz : DBT_CONFIG_CLASSES) {
        try {
          return JsonUtils.convertValue(config, clazz);
        } catch (Exception ignored) {
        }
      }
      throw new IllegalArgumentException("Impossible to parse the config of the source config.");
    }
    return null;
  }
}
