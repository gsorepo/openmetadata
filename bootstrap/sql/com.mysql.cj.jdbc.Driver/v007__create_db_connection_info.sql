-- Remove markDeletedTablesFromFilterOnly 
UPDATE ingestion_pipeline_entity
SET json = JSON_REMOVE(json ,'$.sourceConfig.config.markDeletedTablesFromFilterOnly');

UPDATE data_insight_chart 
SET json = JSON_INSERT(
	JSON_REMOVE(json, '$.dimensions'),
	'$.dimensions',
	JSON_ARRAY(
		JSON_OBJECT('name', 'entityFqn', 'chartDataType', 'STRING'),
		JSON_OBJECT('name', 'owner', 'chartDataType', 'STRING'),
		JSON_OBJECT('name', 'entityType', 'chartDataType', 'STRING'),
		JSON_OBJECT('name', 'entityHref', 'chartDataType', 'STRING')
		)
)
WHERE name = 'mostViewedEntities';

DROP TABLE webhook_entity;

CREATE TABLE IF NOT EXISTS alert_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    json JSON NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name)
    -- No versioning, updatedAt, updatedBy, or changeDescription fields for webhook
);

CREATE TABLE IF NOT EXISTS alert_action_def (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> '$.name') NOT NULL,
    alertActionType VARCHAR(36) GENERATED ALWAYS AS (json ->> '$.alertActionType') NOT NULL,
    deleted BOOLEAN GENERATED ALWAYS AS (json -> '$.deleted'),
    json JSON NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (name)
);
