-- column deleted not needed for entities that don't support soft delete
ALTER TABLE query_entity DROP COLUMN deleted;
ALTER TABLE event_subscription_entity DROP COLUMN deleted;

-- create domain entity table
CREATE TABLE IF NOT EXISTS domain_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (fqnHash)
    );

-- create data product entity table
CREATE TABLE IF NOT EXISTS data_product_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (fqnHash)
    );

-- create search service entity
CREATE TABLE IF NOT EXISTS search_service_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    nameHash VARCHAR(256)  NOT NULL COLLATE ascii_bin,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    serviceType VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.serviceType') NOT NULL,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (nameHash)
    );

-- create search index entity
CREATE TABLE IF NOT EXISTS search_index_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (fqnHash)
    );

-- We were hardcoding retries to 0. Since we are now using the IngestionPipeline to set them, keep existing ones to 0.
UPDATE ingestion_pipeline_entity
SET json = JSON_REPLACE(json, '$.airflowConfig.retries', 0)
WHERE JSON_EXTRACT(json, '$.airflowConfig.retries') IS NOT NULL;


-- create stored procedure entity
CREATE TABLE IF NOT EXISTS stored_procedure_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    fqnHash VARCHAR(256) NOT NULL COLLATE ascii_bin,
    json JSON NOT NULL,
    updatedAt BIGINT UNSIGNED GENERATED ALWAYS AS (json ->> '$.updatedAt') NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.updatedBy') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    PRIMARY KEY (id),
    UNIQUE (fqnHash)
);

ALTER TABLE entity_relationship ADD INDEX from_entity_type_index(fromId, fromEntity), ADD INDEX to_entity_type_index(toId, toEntity);
ALTER TABLE tag DROP CONSTRAINT fqnHash, ADD CONSTRAINT UNIQUE(fqnHash), ADD PRIMARY KEY(id);


-- rename viewParsingTimeoutLimit for queryParsingTimeoutLimit
UPDATE ingestion_pipeline_entity
SET json = JSON_INSERT(
    JSON_REMOVE(json, '$.sourceConfig.config.viewParsingTimeoutLimit'),
    '$.sourceConfig.config.queryParsingTimeoutLimit',
    JSON_EXTRACT(json, '$.sourceConfig.config.viewParsingTimeoutLimit')
)
WHERE JSON_EXTRACT(json, '$.pipelineType') = 'metadata';

-- Rename sandboxDomain for instanceDomain
UPDATE dbservice_entity
SET json = JSON_INSERT(
    JSON_REMOVE(json, '$.connection.config.sandboxDomain'),
    '$.connection.config.instanceDomain',
    JSON_EXTRACT(json, '$.connection.config.sandboxDomain')
)
WHERE serviceType = 'DomoDatabase';

UPDATE dashboard_service_entity
SET json = JSON_INSERT(
    JSON_REMOVE(json, '$.connection.config.sandboxDomain'),
    '$.connection.config.instanceDomain',
    JSON_EXTRACT(json, '$.connection.config.sandboxDomain')
)
WHERE serviceType = 'DomoDashboard';

UPDATE pipeline_service_entity
SET json = JSON_INSERT(
    JSON_REMOVE(json, '$.connection.config.sandboxDomain'),
    '$.connection.config.instanceDomain',
    JSON_EXTRACT(json, '$.connection.config.sandboxDomain')
)
WHERE serviceType = 'DomoPipeline';

-- Query Entity supports service, which requires FQN for name
ALTER TABLE query_entity CHANGE COLUMN nameHash fqnHash VARCHAR(256);