-- Add the supportsProfiler field to the MongoDB connection configuration
UPDATE dbservice_entity
SET json = jsonb_set(json::jsonb, '{connection,config,supportsProfiler}', 'true'
::jsonb)
WHERE serviceType = 'MongoDB';

ALTER TABLE query_entity ADD COLUMN checksum varchar
(32) GENERATED ALWAYS AS
(json ->> 'checksum') STORED NOT NULL,
ADD UNIQUE
(checksum);

UPDATE query_entity SET json = jsonb_set(json::jsonb, '{checksum}', MD5(json->'connection'));


-- Restructure dbServiceNames in ingestion_pipeline_entity
update ingestion_pipeline_entity ipe
set json
= JSONB_SET
(
    json::jsonb #- '{sourceConfig,config,dbServiceNames}',
    '{sourceConfig,config,lineageInformation}',
    jsonb_build_object
(
        'dbServiceNames',
        json#>'{sourceConfig,config,dbServiceNames}'
    )
)
WHERE
(json#>'{sourceConfig,config,type}')::varchar
(255) IN
('"DashboardMetadata"', '"PipelineMetadata"') 
and json#>'{sourceConfig,config,dbServiceNames}' is not null;

CREATE INDEX index_chart_entity_deleted ON chart_entity (fqnHash, deleted);
CREATE INDEX index_dashboard_data_model_entity_deleted ON dashboard_data_model_entity (fqnHash, deleted);
CREATE INDEX index_dashboard_entity_deleted ON dashboard_entity (fqnHash, deleted);
CREATE INDEX index_data_insight_chart_deleted ON data_insight_chart (fqnHash, deleted);
CREATE INDEX index_database_entity_deleted ON database_entity (fqnHash, deleted);
CREATE INDEX index_database_schema_entity_deleted ON database_schema_entity (fqnHash, deleted);
CREATE INDEX index_glossary_term_entity_deleted ON glossary_term_entity (fqnHash, deleted);
CREATE INDEX index_ingestion_pipeline_entity_deleted ON ingestion_pipeline_entity (fqnHash, deleted);
CREATE INDEX index_metric_entity_deleted ON metric_entity (fqnHash, deleted);
CREATE INDEX index_ml_model_entity_deleted ON ml_model_entity (fqnHash, deleted);
CREATE INDEX index_pipeline_entity_deleted ON pipeline_entity (fqnHash, deleted);
CREATE INDEX index_policy_entity_deleted ON policy_entity (fqnHash, deleted);
CREATE INDEX index_report_entity_deleted ON report_entity (fqnHash, deleted);
CREATE INDEX index_search_index_entity_deleted ON search_index_entity (fqnHash, deleted);
CREATE INDEX index_storage_container_entity_deleted ON storage_container_entity (fqnHash, deleted);
CREATE INDEX index_stored_procedure_entity_deleted ON stored_procedure_entity (fqnHash, deleted);
CREATE INDEX index_table_entity_deleted ON table_entity (fqnHash, deleted);
CREATE INDEX index_tag_deleted ON tag (fqnHash, deleted);
CREATE INDEX index_test_case_deleted ON test_case (fqnHash, deleted);
CREATE INDEX index_test_suite_deleted ON test_suite (fqnHash, deleted);
CREATE INDEX index_topic_entity_deleted ON topic_entity (fqnHash, deleted);
CREATE INDEX index_web_analytic_event_deleted ON web_analytic_event (fqnHash, deleted);

CREATE INDEX index_apps_marketplace_deleted ON apps_marketplace (nameHash, deleted);
CREATE INDEX index_bot_entity_deleted ON bot_entity (nameHash, deleted);
CREATE INDEX index_classification_deleted ON classification (nameHash, deleted);
CREATE INDEX index_dashboard_service_entity_deleted ON dashboard_service_entity (nameHash, deleted);
CREATE INDEX index_dbservice_entity_deleted ON dbservice_entity (nameHash, deleted);
CREATE INDEX index_glossary_entity_deleted ON glossary_entity (nameHash, deleted);
CREATE INDEX index_installed_apps_deleted ON installed_apps (nameHash, deleted);
CREATE INDEX index_knowledge_center_deleted ON knowledge_center (nameHash, deleted);
CREATE INDEX index_kpi_entity_deleted ON kpi_entity (nameHash, deleted);
CREATE INDEX index_messaging_service_entity_deleted ON messaging_service_entity (nameHash, deleted);
CREATE INDEX index_metadata_service_entity_deleted ON metadata_service_entity (nameHash, deleted);
CREATE INDEX index_mlmodel_service_entity_deleted ON mlmodel_service_entity (nameHash, deleted);
CREATE INDEX index_pipeline_service_entity_deleted ON pipeline_service_entity (nameHash, deleted);
CREATE INDEX index_role_entity_deleted ON role_entity (nameHash, deleted);
CREATE INDEX index_search_service_entity_deleted ON search_service_entity (nameHash, deleted);
CREATE INDEX index_storage_service_entity_deleted ON storage_service_entity (nameHash, deleted);
CREATE INDEX index_team_entity_deleted ON team_entity (nameHash, deleted);
CREATE INDEX index_user_entity_deleted ON user_entity (nameHash, deleted);

CREATE INDEX apps_extension_time_series_index ON apps_extension_time_series (appId);
CREATE INDEX index_suggestions_type ON suggestions (suggestionType);
CREATE INDEX index_suggestions_status ON suggestions (status);


-- Add the supportsProfiler field to the DynamoDB connection configuration
UPDATE dbservice_entity
SET json = jsonb_set(json::jsonb, '{connection,config,supportsProfiler}', 'true'::jsonb) 
WHERE serviceType = 'DynamoDB';

-- Migrate 'QlikSenseDataModel' & 'QlikCloudDataModel' into single entity 'QlikDataModel'
UPDATE dashboard_data_model_entity
SET json = jsonb_set(
    json, 
    '{dataModelType}', 
    '"QlikDataModel"', 
    true
)
WHERE json->>'dataModelType' IN ('QlikSenseDataModel', 'QlikCloudDataModel');

UPDATE dbservice_entity
SET json = jsonb_set(
  json #-'{connection,config,sslCA}',
  '{connection,config,sslConfig}',
  jsonb_build_object('caCertificate', json#>'{connection,config,sslCA}')
)
WHERE serviceType IN ('Mysql', 'Doris') AND json#>'{connection,config,sslCA}' IS NOT NULL;

UPDATE dbservice_entity
SET json = jsonb_set(
  json #-'{connection,config,sslCert}',
  '{connection,config,sslConfig}',
  json#>'{connection,config,sslConfig}' || jsonb_build_object('sslCertificate', json#>'{connection,config,sslCert}')
)
WHERE serviceType IN ('Mysql', 'Doris') AND json#>'{connection,config,sslCert}' IS NOT NULL;

UPDATE dbservice_entity
SET json = jsonb_set(
  json #-'{connection,config,sslKey}',
  '{connection,config,sslConfig}',
  json#>'{connection,config,sslConfig}' || jsonb_build_object('sslKey', json#>'{connection,config,sslKey}')
)
WHERE serviceType IN ('Mysql', 'Doris') AND json#>'{connection,config,sslKey}' IS NOT NULL;

UPDATE dbservice_entity
SET json = jsonb_set(
  json #-'{connection,config,metastoreConnection,sslCert}',
  '{connection,config,metastoreConnection,sslConfig}',
  jsonb_build_object('sslCertificate', json#>'{connection,config,metastoreConnection,sslCert}')
)
WHERE serviceType IN ('Hive') AND json#>'{connection,config,metastoreConnection,type}' = '"Mysql"' AND json#>'{connection,config,metastoreConnection,sslCert}' IS NOT NULL;

UPDATE dbservice_entity
SET json = jsonb_set(
  json #-'{connection,config,metastoreConnection,sslKey}',
  '{connection,config,metastoreConnection,sslConfig}',
  json#>'{connection,config,metastoreConnection,sslConfig}' || jsonb_build_object('sslKey', json#>'{connection,config,metastoreConnection,sslKey}')
)
WHERE serviceType IN ('Hive') AND json#>'{connection,config,metastoreConnection,type}' = '"Mysql"' AND json#>'{connection,config,metastoreConnection,sslKey}' IS NOT NULL;

UPDATE dbservice_entity
SET json = jsonb_set(
  json #-'{connection,config,metastoreConnection,sslCA}',
  '{connection,config,metastoreConnection,sslConfig}',
  json#>'{connection,config,metastoreConnection,sslConfig}' || jsonb_build_object('caCertificate', json#>'{connection,config,metastoreConnection,sslCA}')
)
WHERE serviceType IN ('Hive') AND json#>'{connection,config,metastoreConnection,type}' = '"Mysql"' AND json#>'{connection,config,metastoreConnection,sslCA}' IS NOT NULL;

UPDATE dbservice_entity
SET json = jsonb_set(
  json #-'{connection,config,metastoreConnection,sslConfig,certificatePath}',
  '{connection,config,metastoreConnection,sslConfig}',
  jsonb_build_object('caCertificate', json#>'{connection,config,metastoreConnection,sslConfig,certificatePath}')
)
WHERE serviceType IN ('Hive') AND json#>'{connection,config,metastoreConnection,type}' = '"Postgres"' AND json#>'{connection,config,metastoreConnection,sslConfig,certificatePath}' IS NOT NULL;

UPDATE dbservice_entity
SET json = jsonb_set(
  json #-'{connection,config,sslConfig,certificatePath}',
  '{connection,config,sslConfig}',
  jsonb_build_object('caCertificate', json#>'{connection,config,sslConfig,certificatePath}')
)
WHERE serviceType IN ('Redshift', 'Greenplum', 'Postgres') AND json#>'{connection,config,sslConfig,certificatePath}' IS NOT NULL;

UPDATE dashboard_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslConfig,certificatePath}',
  '{connection,config,connection,sslConfig}',
  jsonb_build_object('caCertificate', json#>'{connection,config,connection,sslConfig,certificatePath}')
)
WHERE serviceType IN ('Superset') AND json#>'{connection,config,connection,type}' = '"Postgres"' AND json#>'{connection,config,connection,sslConfig,certificatePath}' IS NOT NULL;

UPDATE dashboard_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslCert}',
  '{connection,config,connection,sslConfig}',
  jsonb_build_object('sslCertificate', json#>'{connection,config,connection,sslCert}')
)
WHERE serviceType IN ('Superset') AND json#>'{connection,config,connection,type}' = '"Mysql"' AND json#>'{connection,config,connection,sslCert}' IS NOT NULL;

UPDATE dashboard_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslKey}',
  '{connection,config,connection,sslConfig}',
  json#>'{connection,config,connection,sslConfig}' || jsonb_build_object('sslKey', json#>'{connection,config,connection,sslKey}')
)
WHERE serviceType IN ('Superset') AND json#>'{connection,config,connection,type}' = '"Mysql"' AND json#>'{connection,config,connection,sslKey}' IS NOT NULL;

UPDATE dashboard_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslCA}',
  '{connection,config,connection,sslConfig}',
  json#>'{connection,config,connection,sslConfig}' || jsonb_build_object('caCertificate', json#>'{connection,config,connection,sslCA}')
)
WHERE serviceType IN ('Superset') AND json#>'{connection,config,connection,type}' = '"Mysql"' AND json#>'{connection,config,connection,sslCA}' IS NOT NULL;

UPDATE metadata_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslConfig,certificatePath}',
  '{connection,config,connection,sslConfig}',
  jsonb_build_object('caCertificate', json#>'{connection,config,connection,sslConfig,certificatePath}')
)
WHERE serviceType IN ('Alation') AND json#>'{connection,config,connection,type}' = '"Postgres"' AND json#>'{connection,config,connection,sslConfig,certificatePath}' IS NOT NULL;

UPDATE metadata_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslCert}',
  '{connection,config,connection,sslConfig}',
  jsonb_build_object('sslCertificate', json#>'{connection,config,connection,sslCert}')
)
WHERE serviceType IN ('Alation') AND json#>'{connection,config,connection,type}' = '"Mysql"' AND json#>'{connection,config,connection,sslCert}' IS NOT NULL;

UPDATE metadata_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslKey}',
  '{connection,config,connection,sslConfig}',
  json#>'{connection,config,connection,sslConfig}' || jsonb_build_object('sslKey', json#>'{connection,config,connection,sslKey}')
)
WHERE serviceType IN ('Alation') AND json#>'{connection,config,connection,type}' = '"Mysql"' AND json#>'{connection,config,connection,sslKey}' IS NOT NULL;

UPDATE metadata_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslCA}',
  '{connection,config,connection,sslConfig}',
  json#>'{connection,config,connection,sslConfig}' || jsonb_build_object('caCertificate', json#>'{connection,config,connection,sslCA}')
)
WHERE serviceType IN ('Alation') AND json#>'{connection,config,connection,type}' = '"Mysql"' AND json#>'{connection,config,connection,sslCA}' IS NOT NULL;

UPDATE pipeline_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslCert}',
  '{connection,config,connection,sslConfig}',
  jsonb_build_object('sslCertificate', json#>'{connection,config,connection,sslCert}')
)
WHERE serviceType IN ('Airflow') AND json#>'{connection,config,connection,type}' = '"Mysql"' AND json#>'{connection,config,connection,sslCert}' IS NOT NULL;

UPDATE pipeline_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslKey}',
  '{connection,config,connection,sslConfig}',
  json#>'{connection,config,connection,sslConfig}' || jsonb_build_object('sslKey', json#>'{connection,config,connection,sslKey}')
)
WHERE serviceType IN ('Airflow') AND json#>'{connection,config,connection,type}' = '"Mysql"' AND json#>'{connection,config,connection,sslKey}' IS NOT NULL;

UPDATE pipeline_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,sslCA}',
  '{connection,config,connection,sslConfig}',
  json#>'{connection,config,connection,sslConfig}' || jsonb_build_object('caCertificate', json#>'{connection,config,connection,sslCA}')
)
WHERE serviceType IN ('Airflow') AND json#>'{connection,config,connection,type}' = '"Mysql"' AND json#>'{connection,config,connection,sslCA}' IS NOT NULL;

UPDATE pipeline_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,SSLCertificateLocation}',
  '{connection,config,connection,sslConfig}',
  jsonb_build_object('sslCertificate', json#>'{connection,config,connection,SSLCertificateLocation}')
)
WHERE serviceType IN ('OpenLineage') AND json#>'{connection,config,connection,SSLCertificateLocation}' IS NOT NULL;

UPDATE pipeline_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,SSLKeyLocation}',
  '{connection,config,connection,sslConfig}',
  json#>'{connection,config,connection,sslConfig}' || jsonb_build_object('sslKey', json#>'{connection,config,connection,SSLKeyLocation}')
)
WHERE serviceType IN ('OpenLineage') AND json#>'{connection,config,connection,SSLKeyLocation}' IS NOT NULL;

UPDATE pipeline_service_entity
SET json = jsonb_set(
  json #-'{connection,config,connection,SSLCALocation}',
  '{connection,config,connection,sslConfig}',
  json#>'{connection,config,connection,sslConfig}' || jsonb_build_object('caCertificate', json#>'{connection,config,connection,SSLCALocation}')
)
WHERE serviceType IN ('OpenLineage') AND json#>'{connection,config,connection,SSLCALocation}' IS NOT NULL;
