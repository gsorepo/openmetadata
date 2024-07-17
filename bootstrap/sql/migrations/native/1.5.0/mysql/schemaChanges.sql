-- Update DeltaLake service due to connection schema changes to enable DeltaLake ingestion from Storage
UPDATE dbservice_entity dbse
SET
  dbse.json = JSON_REMOVE(JSON_REMOVE(
  JSON_MERGE_PATCH(
    dbse.json,
    JSON_OBJECT(
      'connection', JSON_OBJECT(
        'config', JSON_OBJECT(
          'configSource', JSON_OBJECT(
            'connection', JSON_EXTRACT(dbse.json, '$.connection.config.metastoreConnection'),
            'appName', JSON_UNQUOTE(JSON_EXTRACT(dbse.json, '$.connection.config.appName'))
          )
        )
      )
    )
  )
  , '$.connection.config.appName'), '$.connection.config.metastoreConnection')
WHERE dbse.serviceType = 'DeltaLake';

-- Allow all bots to update the ingestion pipeline status
UPDATE policy_entity
SET json = JSON_ARRAY_APPEND(
    json,
    '$.rules',
    CAST('{
      "name": "BotRule-IngestionPipeline",
      "description": "A bot can Edit ingestion pipelines to pass the status",
      "resources": ["ingestionPipeline"],
      "operations": ["ViewAll","EditIngestionPipelineStatus"],
      "effect": "allow"
    }' AS JSON)
  )
WHERE name = 'DefaultBotPolicy';

-- create API service entity
CREATE TABLE IF NOT EXISTS api_service_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    nameHash VARCHAR(256)  NOT NULL COLLATE ascii_bin,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    serviceType VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.serviceType') NOT NULL,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (nameHash),
    INDEX (name)
);

-- create API collection entity
CREATE TABLE IF NOT EXISTS api_collection_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (fqnHash),
    INDEX (name)
);

-- create API Endpoint entity
CREATE TABLE IF NOT EXISTS api_endpoint_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (fqnHash),
    INDEX (name)
);


-- Clean dangling workflows not removed after test connection
truncate automations_workflow;

-- Remove date, dateTime, time from type_entity, as they are no more om-field-types, instead we have date-cp, time-cp, dateTime-cp as om-field-types
DELETE FROM type_entity
WHERE name IN ('date', 'dateTime', 'time');

-- Update BigQuery,Bigtable & Datalake model for gcpCredentials to move `gcpConfig` value to `gcpConfig.path`
UPDATE dbservice_entity
SET json = JSON_INSERT(
    JSON_REMOVE(json, '$.connection.config.credentials.gcpConfig'),
    '$.connection.config.credentials.gcpConfig',
    JSON_OBJECT(),
    '$.connection.config.credentials.gcpConfig.path',
    JSON_EXTRACT(json, '$.connection.config.credentials.gcpConfig')
) where serviceType in ('BigQuery', 'BigTable') and 
(JSON_EXTRACT(json, '$.connection.config.credentials.gcpConfig.type') OR 
JSON_EXTRACT(json, '$.connection.config.credentials.gcpConfig.externalType') OR 
JSON_EXTRACT(json, '$.connection.config.credentials.gcpConfig.path')) is NULL;

UPDATE dbservice_entity
SET json = JSON_INSERT(
    JSON_REMOVE(json, '$.connection.config.configSource.securityConfig.gcpConfig'),
    '$.connection.config.configSource.securityConfig.gcpConfig',
    JSON_OBJECT(),
    '$.connection.config.configSource.securityConfig.gcpConfig.path',
    JSON_EXTRACT(json, '$.connection.config.configSource.securityConfig.gcpConfig')
) where serviceType in ('Datalake') and 
(JSON_EXTRACT(json, '$.connection.config.configSource.securityConfig.gcpConfig.type') OR 
JSON_EXTRACT(json, '$.connection.config.configSource.securityConfig.gcpConfig.externalType') OR 
JSON_EXTRACT(json, '$.connection.config.configSource.securityConfig.gcpConfig.path')) is NULL and 
JSON_EXTRACT(json, '$.connection.config.configSource.securityConfig.gcpConfig') is NOT NULL;

-- Update Powerbi model for pbitFilesSource to move `gcpConfig` value to `gcpConfig.path`
UPDATE dashboard_service_entity 
SET json = JSON_INSERT(
    JSON_REMOVE(json, '$.connection.config.pbitFilesSource.securityConfig.gcpConfig'),
    '$.connection.config.pbitFilesSource.securityConfig.gcpConfig',
    JSON_OBJECT(),
    '$.connection.config.pbitFilesSource.securityConfig.gcpConfig.path',
    JSON_EXTRACT(json, '$.connection.config.pbitFilesSource.securityConfig.gcpConfig')
) where serviceType in ('PowerBI') and 
(JSON_EXTRACT(json, '$.connection.config.pbitFilesSource.securityConfig.gcpConfig.type') OR 
JSON_EXTRACT(json, '$.connection.config.pbitFilesSource.securityConfig.gcpConfig.externalType') OR 
JSON_EXTRACT(json, '$.connection.config.pbitFilesSource.securityConfig.gcpConfig.path')) is NULL AND 
JSON_EXTRACT(json, '$.connection.config.pbitFilesSource.securityConfig.gcpConfig') is not null;

UPDATE storage_service_entity
SET json = JSON_INSERT(
    JSON_REMOVE(json, '$.connection.config.credentials.gcpConfig'),
    '$.connection.config.credentials.gcpConfig',
    JSON_OBJECT(),
    '$.connection.config.credentials.gcpConfig.path',
    JSON_EXTRACT(json, '$.connection.config.credentials.gcpConfig')
) where serviceType in ('GCS') and 
(JSON_EXTRACT(json, '$.connection.config.credentials.gcpConfig.type') OR 
JSON_EXTRACT(json, '$.connection.config.credentials.gcpConfig.externalType') OR 
JSON_EXTRACT(json, '$.connection.config.credentials.gcpConfig.path')) is NULL;

UPDATE ingestion_pipeline_entity
SET json = JSON_INSERT(
    JSON_REMOVE(json, '$.sourceConfig.config.dbtConfigSource.dbtSecurityConfig.gcpConfig'),
    '$.sourceConfig.config.dbtConfigSource.dbtSecurityConfig.gcpConfig',
    JSON_OBJECT(),
    '$.sourceConfig.config.dbtConfigSource.dbtSecurityConfig.gcpConfig.path',
    JSON_EXTRACT(json, '$.sourceConfig.config.dbtConfigSource.dbtSecurityConfig.gcpConfig')
) where JSON_EXTRACT(json, '$.sourceConfig.config.type') = 'DBT' and (
JSON_EXTRACT(json, '$.sourceConfig.config.dbtConfigSource.dbtSecurityConfig.gcpConfig.type') OR 
JSON_EXTRACT(json, '$.sourceConfig.config.dbtConfigSource.dbtSecurityConfig.gcpConfig.externalType') OR 
JSON_EXTRACT(json, '$.sourceConfig.config.dbtConfigSource.dbtSecurityConfig.gcpConfig.path')
) is NULL AND JSON_EXTRACT(json, '$.sourceConfig.config.dbtConfigSource.dbtSecurityConfig.gcpConfig') is not null;
