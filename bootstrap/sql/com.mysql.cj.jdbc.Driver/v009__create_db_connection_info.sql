-- Unique constraint for user email address
ALTER TABLE user_entity
ADD UNIQUE (email);


-- Remove classificationName in BigQuery
UPDATE dbservice_entity
SET json = JSON_REMOVE(json, '$.connection.config.classificationName') where serviceType in ('BigQuery');

-- migrate ingestAllDatabases in postgres 
UPDATE dbservice_entity de2 
SET json = JSON_REPLACE(
    JSON_INSERT(json, 
      '$.connection.config.database', 
      (select JSON_EXTRACT(json, '$.name') 
        from database_entity de 
        where id = (select er.toId 
            from entity_relationship er 
            where er.fromId = de2.id 
              and er.toEntity = 'database' 
            LIMIT 1
          ))
    ), '$.connection.config.ingestAllDatabases', 
    true
  ) 
where de2.serviceType = 'Postgres' 
  and JSON_EXTRACT(json, '$.connection.config.database') is NULL;

CREATE TABLE IF NOT EXISTS storage_container_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    fullyQualifiedName VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.fullyQualifiedName') NOT NULL,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (fullyQualifiedName)
);

CREATE TABLE IF NOT EXISTS test_connection_definition (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (name)
);

CREATE TABLE IF NOT EXISTS automations_workflow (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    workflowType VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.workflowType') STORED NOT NULL,
    status VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.status') STORED,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (name)
);

-- Do not store OM server connection, we'll set it dynamically on the resource
UPDATE ingestion_pipeline_entity
SET json = JSON_REMOVE(json, '$.openMetadataServerConnection');

CREATE TABLE IF NOT EXISTS query_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE(name),
    INDEX name_index (name)
);

CREATE TABLE IF NOT EXISTS temp_query_migration (
    tableId VARCHAR(36)NOT NULL,
    queryId VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') NOT NULL,
    queryName VARCHAR(255) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    json JSON NOT NULL
);


INSERT INTO temp_query_migration(tableId,json)
SELECT id,JSON_OBJECT('id',UUID(),'vote',vote,'query',query,'users',users,'checksum',checksum,'duration',duration,'name',checksum,'updatedAt',UNIX_TIMESTAMP(NOW()),'updatedBy','admin','deleted',false) as json from entity_extension d, json_table(d.json, '$[*]' columns (vote double path '$.vote', query varchar(200) path '$.query',users json path '$.users',checksum varchar(200) path '$.checksum',name varchar(255) path '$.checksum', duration double path '$.duration',queryDate varchar(200) path '$.queryDate')) AS j WHERE extension = "table.tableQueries";

INSERT INTO query_entity (json)
SELECT t.json from temp_query_migration t
ON DUPLICATE KEY UPDATE json = VALUES(json);

INSERT INTO entity_relationship(fromId,toId,fromEntity,toEntity,relation)
SELECT tmq.tableId, (select qe.id from query_entity qe where qe.name = tmq.queryName) ,"table","query",5 FROM temp_query_migration tmq;

DELETE FROM entity_extension WHERE id IN
 (SELECT DISTINCT tableId FROM temp_query_migration) AND extension = "table.tableQueries";

DROP Table temp_query_migration;

-- remove the audience if it was wrongfully sent from the UI after editing the OM service
UPDATE metadata_service_entity
SET json = JSON_REMOVE(json, '$.connection.config.securityConfig.audience')
WHERE name = 'OpenMetadata' AND JSON_EXTRACT(json, '$.connection.config.authProvider') != 'google';

ALTER TABLE user_tokens MODIFY COLUMN expiryDate BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.expiryDate');

CREATE TABLE IF NOT EXISTS event_subscription_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    json JSON NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name)
    -- No versioning, updatedAt, updatedBy, or changeDescription fields for webhook
);

drop table if exists alert_action_def;
drop table if exists alert_entity;
DELETE from entity_relationship where  fromEntity = 'alert' and toEntity = 'alertAction';

-- create data model table
CREATE TABLE IF NOT EXISTS dashboard_data_model_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    fullyQualifiedName VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.fullyQualifiedName') NOT NULL,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (fullyQualifiedName)
);

UPDATE dbservice_entity
SET json = JSON_INSERT(
        JSON_REMOVE(json, '$.connection.config.database'),
        '$.connection.config.databaseName', JSON_EXTRACT(json, '$.connection.config.database')
    )
where serviceType = 'Druid'
  and JSON_EXTRACT(json, '$.connection.config.database') is not null;

-- We were using the same jsonSchema for Pipeline Services and Ingestion Pipeline status
-- Also, we relied on the extension to store the run id
UPDATE entity_extension_time_series
SET jsonSchema = 'ingestionPipelineStatus', extension = 'ingestionPipeline.pipelineStatus'
WHERE jsonSchema = 'pipelineStatus' AND extension <> 'pipeline.PipelineStatus';

-- We are refactoring the storage service with containers. We'll remove the locations
DROP TABLE location_entity;
DELETE FROM entity_relationship WHERE fromEntity='location' OR toEntity='location';
TRUNCATE TABLE storage_service_entity;

UPDATE dbservice_entity
SET json = JSON_REMOVE(json, '$.connection.config.storageServiceName')
WHERE serviceType = 'Glue';

UPDATE chart_entity
SET json = JSON_REMOVE(json, '$.tables');

-- Updating the tableau authentication fields
UPDATE dashboard_service_entity  
SET json = JSON_INSERT(
JSON_REMOVE(json,'$.connection.config.username','$.connection.config.password'),
'$.connection.config.authType',
JSON_OBJECT(
	'username',JSON_EXTRACT(json,'$.connection.config.username'),
	'password',JSON_EXTRACT(json,'$.connection.config.password')
	)
)
WHERE serviceType = 'Tableau'
AND JSON_EXTRACT(json, '$.connection.config.username') is not null
AND JSON_EXTRACT(json, '$.connection.config.password') is not null;

UPDATE dashboard_service_entity  
SET json = JSON_INSERT(
JSON_REMOVE(json,'$.connection.config.personalAccessTokenName','$.connection.config.personalAccessTokenSecret'),
'$.connection.config.authType',
JSON_OBJECT(
	'personalAccessTokenName',JSON_EXTRACT(json,'$.connection.config.personalAccessTokenName'),
	'personalAccessTokenSecret',JSON_EXTRACT(json,'$.connection.config.personalAccessTokenSecret')
	)
)
WHERE serviceType = 'Tableau'
AND JSON_EXTRACT(json, '$.connection.config.personalAccessTokenName') is not null
AND JSON_EXTRACT(json, '$.connection.config.personalAccessTokenSecret') is not null;
