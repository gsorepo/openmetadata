-- create domain entity table
CREATE TABLE IF NOT EXISTS domain_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> 'id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> 'name') STORED NOT NULL,
    fqnHash VARCHAR(256) NOT NULL,
    json JSONB NOT NULL,
    updatedAt BIGINT GENERATED ALWAYS AS ((json ->> 'updatedAt')::bigint) STORED NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> 'updatedBy') STORED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (fqnHash)
);

-- create data product entity table
CREATE TABLE IF NOT EXISTS data_product_entity (
    id VARCHAR(36) GENERATED ALWAYS AS (json ->> 'id') STORED NOT NULL,
    name VARCHAR(256) GENERATED ALWAYS AS (json ->> 'name') STORED NOT NULL,
    fqnHash VARCHAR(256) NOT NULL,
    json JSONB NOT NULL,
    updatedAt BIGINT GENERATED ALWAYS AS ((json ->> 'updatedAt')::bigint) STORED NOT NULL,
    updatedBy VARCHAR(256) GENERATED ALWAYS AS (json ->> 'updatedBy') STORED NOT NULL,
    PRIMARY KEY (id),
    UNIQUE (fqnHash)
);

-- Rename includeTempTables in snowflake to includeTransientTables 

UPDATE dbservice_entity
SET json = jsonb_set(json::jsonb #- '{connection,config,includeTempTables}', '{connection,config,includeTransientTables}',
json#>'{connection,config,includeTempTables}')
where serviceType in ('Snowflake') and json#>'{connection,config,includeTempTables}' is not null ;


update dbservice_entity
set json = jsonb_set(json::jsonb, '{connection,config,scheme}', '"hive"')
where json#>>'{connection,config,scheme}' in ('impala', 'impala4');

-- remove the dataModel references from Data Models
UPDATE dashboard_data_model_entity SET json = json #- '{dataModels}';
