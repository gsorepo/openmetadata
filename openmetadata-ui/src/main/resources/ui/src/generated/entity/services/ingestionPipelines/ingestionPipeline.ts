/* eslint-disable @typescript-eslint/no-explicit-any */
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

/**
 * Ingestion Pipeline Config is used to setup a DAG and deploy. This entity is used to setup
 * metadata/quality pipelines on Apache Airflow.
 */
export interface IngestionPipeline {
  airflowConfig: AirflowConfig;
  /**
   * Change that led to this version of the entity.
   */
  changeDescription?: ChangeDescription;
  /**
   * When `true` indicates the entity has been soft deleted.
   */
  deleted?: boolean;
  /**
   * Indicates if the workflow has been successfully deployed to Airflow.
   */
  deployed?: boolean;
  /**
   * Description of the Pipeline.
   */
  description?: string;
  /**
   * Display Name that identifies this Pipeline.
   */
  displayName?: string;
  /**
   * Name that uniquely identifies a Pipeline.
   */
  fullyQualifiedName?: string;
  /**
   * Link to this ingestion pipeline resource.
   */
  href?: string;
  /**
   * Unique identifier that identifies this pipeline.
   */
  id?: string;
  /**
   * Name that identifies this pipeline instance uniquely.
   */
  name: string;
  openMetadataServerConnection: OpenMetadataConnection;
  /**
   * Owner of this Pipeline.
   */
  owner?: EntityReference;
  /**
   * List of executions and status for the Pipeline.
   */
  pipelineStatuses?: PipelineStatus[];
  pipelineType: PipelineType;
  /**
   * Link to the database service where this database is hosted in.
   */
  service?: EntityReference;
  source: Source;
  /**
   * Last update time corresponding to the new version of the entity in Unix epoch time
   * milliseconds.
   */
  updatedAt?: number;
  /**
   * User who made the update.
   */
  updatedBy?: string;
  /**
   * Metadata version of the entity.
   */
  version?: number;
}

/**
 * Properties to configure the Airflow pipeline that will run the workflow.
 */
export interface AirflowConfig {
  /**
   * Concurrency of the Pipeline.
   */
  concurrency?: number;
  /**
   * Email to notify workflow status.
   */
  email?: string;
  /**
   * End Date of the pipeline.
   */
  endDate?: Date;
  /**
   * Deploy the pipeline by overwriting existing pipeline with the same name.
   */
  forceDeploy?: boolean;
  /**
   * Maximum Number of active runs.
   */
  maxActiveRuns?: number;
  /**
   * pause the pipeline from running once the deploy is finished successfully.
   */
  pausePipeline?: boolean;
  /**
   * Run past executions if the start date is in the past.
   */
  pipelineCatchup?: boolean;
  /**
   * Timezone in which pipeline going to be scheduled.
   */
  pipelineTimezone?: string;
  /**
   * Retry pipeline in case of failure.
   */
  retries?: number;
  /**
   * Delay between retries in seconds.
   */
  retryDelay?: number;
  /**
   * Scheduler Interval for the pipeline in cron format.
   */
  scheduleInterval?: string;
  /**
   * Start date of the pipeline.
   */
  startDate: Date;
  /**
   * Default view in Airflow.
   */
  workflowDefaultView?: string;
  /**
   * Default view Orientation in Airflow.
   */
  workflowDefaultViewOrientation?: string;
  /**
   * Timeout for the workflow in seconds.
   */
  workflowTimeout?: number;
}

/**
 * Change that led to this version of the entity.
 *
 * Description of the change.
 */
export interface ChangeDescription {
  /**
   * Names of fields added during the version changes.
   */
  fieldsAdded?: FieldChange[];
  /**
   * Fields deleted during the version changes with old value before deleted.
   */
  fieldsDeleted?: FieldChange[];
  /**
   * Fields modified during the version changes with old and new values.
   */
  fieldsUpdated?: FieldChange[];
  /**
   * When a change did not result in change, this could be same as the current version.
   */
  previousVersion?: number;
}

export interface FieldChange {
  /**
   * Name of the entity field that changed.
   */
  name?: string;
  /**
   * New value of the field. Note that this is a JSON string and use the corresponding field
   * type to deserialize it.
   */
  newValue?: any;
  /**
   * Previous value of the field. Note that this is a JSON string and use the corresponding
   * field type to deserialize it.
   */
  oldValue?: any;
}

/**
 * OpenMetadata Connection Config
 */
export interface OpenMetadataConnection {
  /**
   * OpenMetadata server API version to use.
   */
  apiVersion?: string;
  /**
   * OpenMetadata Server Authentication Provider. Make sure configure same auth providers as
   * the one configured on OpenMetadaata server.
   */
  authProvider?: AuthProvider;
  /**
   * OpenMetadata Server Config. Must include API end point ex: http://localhost:8585/api
   */
  hostPort: string;
  /**
   * Include Dashboards for Indexing
   */
  includeDashboards?: boolean;
  /**
   * Include Glossary Terms for Indexing
   */
  includeGlossaryTerms?: boolean;
  /**
   * Include Pipelines for Indexing
   */
  includePipelines?: boolean;
  /**
   * Include Tables for Indexing
   */
  includeTables?: boolean;
  /**
   * Include Teams for Indexing
   */
  includeTeams?: boolean;
  /**
   * Include Topics for Indexing
   */
  includeTopics?: boolean;
  /**
   * Include Users for Indexing
   */
  includeUsers?: boolean;
  /**
   * Limit the number of records for Indexing.
   */
  limitRecords?: number;
  /**
   * OpenMetadata Client security configuration.
   */
  securityConfig?: SsoClientConfig;
  supportsMetadataExtraction?: boolean;
  /**
   * Service Type
   */
  type?: OpenmetadataType;
}

/**
 * OpenMetadata Server Authentication Provider. Make sure configure same auth providers as
 * the one configured on OpenMetadaata server.
 */
export enum AuthProvider {
  Auth0 = 'auth0',
  Azure = 'azure',
  CustomOidc = 'custom-oidc',
  Google = 'google',
  NoAuth = 'no-auth',
  Okta = 'okta',
}

/**
 * OpenMetadata Client security configuration.
 *
 * Google SSO client security configs.
 *
 * Okta SSO client security configs.
 *
 * Auth0 SSO client security configs.
 *
 * Azure SSO Client security config to connect to OpenMetadata.
 *
 * Custom OIDC SSO client security configs.
 */
export interface SsoClientConfig {
  /**
   * Google SSO audience URL
   */
  audience?: string;
  /**
   * Google SSO client secret key path or contents.
   *
   * Auth0 Client Secret Key.
   *
   * Custom OIDC Client Secret Key.
   */
  secretKey?: string;
  /**
   * Okta Client ID.
   *
   * Auth0 Client ID.
   *
   * Azure Client ID.
   *
   * Custom OIDC Client ID.
   */
  clientId?: string;
  /**
   * Okta Service account Email.
   */
  email?: string;
  /**
   * Okta org url.
   */
  orgURL?: string;
  /**
   * Okta Private Key.
   */
  privateKey?: string;
  /**
   * Okta client scopes.
   *
   * Azure Client ID.
   */
  scopes?: string[];
  /**
   * Auth0 Domain.
   */
  domain?: string;
  /**
   * Azure SSO Authority
   */
  authority?: string;
  /**
   * Azure SSO client secret key
   */
  clientSecret?: string;
  /**
   * Custom OIDC token endpoint.
   */
  tokenEndpoint?: string;
}

/**
 * Service Type
 *
 * OpenMetadata service type
 */
export enum OpenmetadataType {
  OpenMetadata = 'OpenMetadata',
}

/**
 * Owner of this Pipeline.
 *
 * This schema defines the EntityReference type used for referencing an entity.
 * EntityReference is used for capturing relationships from one entity to another. For
 * example, a table has an attribute called database of type EntityReference that captures
 * the relationship of a table `belongs to a` database.
 *
 * Link to the database service where this database is hosted in.
 */
export interface EntityReference {
  /**
   * If true the entity referred to has been soft-deleted.
   */
  deleted?: boolean;
  /**
   * Optional description of entity.
   */
  description?: string;
  /**
   * Display Name that identifies this entity.
   */
  displayName?: string;
  /**
   * Fully qualified name of the entity instance. For entities such as tables, databases
   * fullyQualifiedName is returned in this field. For entities that don't have name hierarchy
   * such as `user` and `team` this will be same as the `name` field.
   */
  fullyQualifiedName?: string;
  /**
   * Link to the entity resource.
   */
  href?: string;
  /**
   * Unique identifier that identifies an entity instance.
   */
  id: string;
  /**
   * Name of the entity instance.
   */
  name?: string;
  /**
   * Entity type/class name - Examples: `database`, `table`, `metrics`, `databaseService`,
   * `dashboardService`...
   */
  type: string;
}

/**
 * This defines runtime status of Pipeline.
 */
export interface PipelineStatus {
  /**
   * endDate of the pipeline run for this particular execution.
   */
  endDate?: string;
  /**
   * Pipeline unique run ID.
   */
  runId?: string;
  /**
   * startDate of the pipeline run for this particular execution.
   */
  startDate?: string;
  /**
   * Pipeline status denotes if its failed or succeeded.
   */
  state?: string;
}

/**
 * Type of Pipeline - metadata, usage
 */
export enum PipelineType {
  Metadata = 'metadata',
  Profiler = 'profiler',
  Usage = 'usage',
}

/**
 * Configuration for Source component in OpenMetadata Ingestion Framework.
 */
export interface Source {
  /**
   * Connection configuration for the source. ex: mysql , tableau connection.
   */
  serviceConnection: ServiceConnection;
  /**
   * Type of the source connector ex: mysql, snowflake, tableau etc..
   */
  serviceName: string;
  sourceConfig: SourceConfig;
  /**
   * Type of the source connector ex: mysql, snowflake, tableau etc..
   */
  type: string;
}

/**
 * Connection configuration for the source. ex: mysql , tableau connection.
 *
 * Supported services
 *
 * Dashboard Connection.
 *
 * Database Connection.
 *
 * Metadata Service Connection.
 */
export interface ServiceConnection {
  config?: Connection;
}

/**
 * Looker Connection Config
 *
 * Metabase Connection Config
 *
 * PowerBI Connection Config
 *
 * Redash Connection Config
 *
 * Superset Connection Config
 *
 * Tableau Connection Config
 *
 * Google BigQuery Connection Config
 *
 * AWS Athena Connection Config
 *
 * Azure SQL Connection Config
 *
 * Clickhouse Connection Config
 *
 * Databricks Connection Config
 *
 * Db2 Connection Config
 *
 * DeltaLake Database Connection Config
 *
 * Druid Connection Config
 *
 * DynamoDB Connection Config
 *
 * Glue Connection Config
 *
 * Hive SQL Connection Config
 *
 * MariaDB Database Connection Config
 *
 * Mssql Database Connection Config
 *
 * Mysql Database Connection Config
 *
 * SQLite Database Connection Config
 *
 * Oracle Database Connection Config
 *
 * Postgres Database Connection Config
 *
 * Presto Database Connection Config
 *
 * Redshift  Connection Config
 *
 * Salesforce Connection Config
 *
 * SingleStore Database Connection Config
 *
 * Snowflake Connection Config
 *
 * Trino Connection Config
 *
 * Vertica Connection Config
 *
 * Sample Data Connection Config
 *
 * Kafka Connection Config
 *
 * Pulsar Connection Config
 *
 * Amundsen Connection Config
 *
 * Metadata to ElasticSeach Connection Config
 *
 * OpenMetadata Connection Config
 */
export interface Connection {
  /**
   * Looker Environment
   *
   * Tableau Environment Name
   */
  env?: string;
  /**
   * URL to Looker instance.
   *
   * Host and Port of Metabase instance.
   *
   * Dashboard URL for the power BI.
   *
   * URL for the redash instance
   *
   * URL for the superset instance
   *
   * Tableau Server
   *
   * BigQuery APIs URL
   *
   * Host and port of the Athena
   *
   * Host and port of AzureSQL
   *
   * Host and port of the Clickhouse
   *
   * Host and port of the Databricks
   *
   * Host and port of the DB2
   *
   * Host and port of the Druid
   *
   * Host and port of the Hive.
   *
   * Host and port of the data source.
   *
   * Host and port of the MsSQL.
   *
   * Host and port of the data source. Blank for in-memory database.
   *
   * Host and port of the Oracle.
   *
   * Host and port of the Postgres.
   *
   * Host and port of the Redshift.
   *
   * Host and port of the Amundsen Neo4j Connection.
   *
   * OpenMetadata Server Config. Must include API end point ex: http://localhost:8585/api
   */
  hostPort?: string;
  /**
   * password to connect  to the Looker.
   *
   * password to connect  to the Metabase.
   *
   * password for the Superset
   *
   * password for the Tableau
   *
   * Password to connect to AzureSQL.
   *
   * password to connect to the Clickhouse.
   *
   * password to connect to the Databricks.
   *
   * password to connect to the DB2.
   *
   * password to connect to the Druid.
   *
   * password to connect  to the Hive.
   *
   * password to connect  to the MariaDB.
   *
   * password to connect  to the MsSQL.
   *
   * password to connect  to the Mysql.
   *
   * password to connect to SQLite. Blank for in-memory database.
   *
   * password to connect  to the Oracle.
   *
   * password to connect  to the Postgres.
   *
   * password to connect  to the Redshift.
   *
   * password to connect  to the MYSQL.
   *
   * password to connect  to the Snowflake.
   *
   * password to connect  to the Trino.
   *
   * password to connect  to the Vertica.
   *
   * password to connect to the Amundsen Neo4j Connection.
   */
  password?: string;
  supportsMetadataExtraction?: boolean;
  /**
   * Service Type
   */
  type?: Type;
  /**
   * username to connect  to the Looker. This user should have privileges to read all the
   * metadata in Looker.
   *
   * username to connect  to the Metabase. This user should have privileges to read all the
   * metadata in Metabase.
   *
   * username for the Redash
   *
   * username for the Superset
   *
   * username for the Tableau
   *
   * username to connect to the Bigquery. This user should have privileges to read all the
   * metadata in Bigquery.
   *
   * Username to connect to AzureSQL. This user should have privileges to read the metadata.
   *
   * username to connect  to the Clickhouse. This user should have privileges to read all the
   * metadata in Clickhouse.
   *
   * username to connect  to the Databricks. This user should have privileges to read all the
   * metadata in Databricks.
   *
   * username to connect  to the DB2. This user should have privileges to read all the
   * metadata in DB2.
   *
   * username to connect  to the Druid. This user should have privileges to read all the
   * metadata in Druid.
   *
   * username to connect  to the Athena. This user should have privileges to read all the
   * metadata in Hive.
   *
   * username to connect  to the MariaDB. This user should have privileges to read all the
   * metadata in MariaDB.
   *
   * username to connect  to the MsSQL. This user should have privileges to read all the
   * metadata in MsSQL.
   *
   * username to connect  to the Mysql. This user should have privileges to read all the
   * metadata in Mysql.
   *
   * username to connect  to the SQLite. Blank for in-memory database.
   *
   * username to connect  to the Oracle. This user should have privileges to read all the
   * metadata in Oracle.
   *
   * username to connect  to the Postgres. This user should have privileges to read all the
   * metadata in Postgres.
   *
   * username to connect  to the Redshift. This user should have privileges to read all the
   * metadata in Redshift.
   *
   * username to connect  to the MySQL. This user should have privileges to read all the
   * metadata in MySQL.
   *
   * username to connect  to the Snowflake. This user should have privileges to read all the
   * metadata in Snowflake.
   *
   * username to connect to Trino. This user should have privileges to read all the metadata
   * in Trino.
   *
   * username to connect  to the Vertica. This user should have privileges to read all the
   * metadata in Vertica.
   *
   * username to connect to the Amundsen Neo4j Connection.
   */
  username?: string;
  /**
   * Database Service Name for creation of lineage
   *
   * Database Service Name to create lineage
   *
   * Database Service Name in order to create a lineage
   */
  dbServiceName?: string;
  /**
   * client_id for the PowerBI.
   */
  clientId?: string;
  /**
   * clientSecret for the PowerBI.
   */
  clientSecret?: string;
  /**
   * Credentials for the PowerBI.
   *
   * GCS Credentials
   */
  credentials?: GCSCredentials | string;
  /**
   * Dashboard redirect URI for the PowerBI.
   */
  redirectURI?: string;
  /**
   * PowerBI secrets.
   */
  scope?: string[];
  /**
   * API key of the redash instance to access.
   */
  apiKey?: string;
  /**
   * Additional connection options that can be sent to service during the connection.
   */
  connectionOptions?: { [key: string]: any };
  /**
   * authenticaiton provider for the Superset
   */
  provider?: string;
  /**
   * Tableau API version
   *
   * OpenMetadata server API version to use.
   */
  apiVersion?: string;
  /**
   * Personal Access Token Name
   */
  personalAccessTokenName?: string;
  /**
   * Personal Access Token Secret
   */
  personalAccessTokenSecret?: string;
  /**
   * Tableau Site Name
   */
  siteName?: string;
  connectionArguments?: { [key: string]: string };
  /**
   * Database of the data source. This is optional parameter, if you would like to restrict
   * the metadata reading to a single database. When left blank, OpenMetadata Ingestion
   * attempts to scan all the databases.
   *
   * Database of the data source. This is optional parameter, if you would like to restrict
   * the metadata reading to a single database. When left blank , OpenMetadata Ingestion
   * attempts to scan all the databases in Databricks.
   *
   * Database of the data source. This is optional parameter, if you would like to restrict
   * the metadata reading to a single database. When left blank, OpenMetadata Ingestion
   * attempts to scan all the databases in the selected catalog.
   */
  database?: string;
  /**
   * Enable importing policy tags of BigQuery into OpenMetadata
   */
  enablePolicyTagImport?: boolean;
  /**
   * Column name on which the BigQuery table will be partitioned.
   */
  partitionField?: string;
  /**
   * Partitioning query for BigQuery tables.
   */
  partitionQuery?: string;
  /**
   * Duration for partitioning BigQuery tables.
   */
  partitionQueryDuration?: number;
  /**
   * BigQuery project ID. Only required if using credentials path instead of values.
   */
  projectId?: string;
  /**
   * SQLAlchemy driver scheme options.
   */
  scheme?: Scheme;
  supportsProfiler?: boolean;
  supportsUsageExtraction?: boolean;
  /**
   * OpenMetadata Tag category name if enablePolicyTagImport is set to true.
   */
  tagCategoryName?: string;
  awsConfig?: AWSCredentials;
  /**
   * S3 Staging Directory.
   */
  s3StagingDir?: string;
  /**
   * Athena workgroup.
   */
  workgroup?: string;
  /**
   * SQLAlchemy driver for AzureSQL
   */
  driver?: string;
  /**
   * Clickhouse SQL connection duration
   */
  duration?: number;
  /**
   * Databricks compute resources URL
   */
  httpPath?: string;
  /**
   * Generated Token to connect to Databricks
   */
  token?: string;
  /**
   * pySpark App Name
   */
  appName?: string;
  /**
   * File path of local Hive Metastore.
   */
  metastoreFilePath?: string;
  /**
   * Host and port of remote Hive Metastore.
   */
  metastoreHostPort?: string;
  /**
   * AWS pipelineServiceName Name.
   */
  pipelineServiceName?: string;
  /**
   * AWS storageServiceName Name.
   */
  storageServiceName?: string;
  /**
   * Authentication options to pass to Hive connector. These options are based on SQLAlchemy.
   */
  authOptions?: string;
  /**
   * Connection URI In case of pyodbc
   */
  uriString?: string;
  /**
   * How to run the SQLite database. :memory: by default.
   */
  databaseMode?: string;
  /**
   * Oracle Service Name to be passed. Note: either Database or Oracle service name can be
   * sent, not both.
   */
  oracleServiceName?: string;
  /**
   * Presto catalog
   *
   * Catalog of the data source.
   */
  catalog?: string;
  /**
   * Salesforce Security Token.
   */
  securityToken?: string;
  /**
   * Salesforce Object Name.
   */
  sobjectName?: string;
  /**
   * Snowflake Account.
   */
  account?: string;
  /**
   * Connection to Snowflake instance via Private Key
   */
  privateKey?: string;
  /**
   * Snowflake Role.
   */
  role?: string;
  /**
   * Snowflake warehouse.
   */
  warehouse?: string;
  /**
   * URL parameters for connection to the Trino data source
   */
  params?: { [key: string]: any };
  /**
   * Proxies for the connection to Trino data source
   */
  proxies?: { [key: string]: any };
  /**
   * Sample Data File Path
   */
  sampleDataFolder?: string;
  /**
   * Kafka bootstrap servers. add them in comma separated values ex: host1:9092,host2:9092
   */
  bootstrapServers?: string;
  /**
   * Confluent Kafka Consumer Config
   */
  consumerConfig?: { [key: string]: any };
  /**
   * Confluent Kafka Schema Registry Config.
   */
  schemaRegistryConfig?: { [key: string]: any };
  /**
   * Confluent Kafka Schema Registry URL.
   */
  schemaRegistryURL?: string;
  /**
   * Enable Encyption for the Amundsen Neo4j Connection.
   */
  encrypted?: boolean;
  /**
   * Maximum connection lifetime for the Amundsen Neo4j Connection.
   */
  maxConnectionLifeTime?: number;
  /**
   * Model Class for the Amundsen Neo4j Connection.
   */
  modelClass?: string;
  /**
   * Enable SSL validation for the Amundsen Neo4j Connection.
   */
  validateSSL?: boolean;
  /**
   * Include Dashboards for Indexing
   */
  includeDashboards?: boolean;
  /**
   * Include Glossary Terms for Indexing
   */
  includeGlossaryTerms?: boolean;
  /**
   * Include Pipelines for Indexing
   */
  includePipelines?: boolean;
  /**
   * Include Tables for Indexing
   */
  includeTables?: boolean;
  /**
   * Include Teams for Indexing
   */
  includeTeams?: boolean;
  /**
   * Include Topics for Indexing
   */
  includeTopics?: boolean;
  /**
   * Include Users for Indexing
   */
  includeUsers?: boolean;
  /**
   * Limit the number of records for Indexing.
   */
  limitRecords?: number;
  /**
   * OpenMetadata Server Authentication Provider. Make sure configure same auth providers as
   * the one configured on OpenMetadaata server.
   */
  authProvider?: AuthProvider;
  /**
   * OpenMetadata Client security configuration.
   */
  securityConfig?: SsoClientConfig;
}

/**
 * AWS credentials configs.
 */
export interface AWSCredentials {
  /**
   * AWS Access key ID.
   */
  awsAccessKeyId: string;
  /**
   * AWS Region
   */
  awsRegion: string;
  /**
   * AWS Secret Access Key.
   */
  awsSecretAccessKey: string;
  /**
   * AWS Session Token.
   */
  awsSessionToken?: string;
  /**
   * EndPoint URL for the AWS
   */
  endPointURL?: string;
}

/**
 * GCS Credentials
 *
 * GCS credentials configs.
 */
export interface GCSCredentials {
  /**
   * GCS configs.
   */
  gcsConfig: GCSCredentialsValues | string;
}

/**
 * GCS Credentials.
 */
export interface GCSCredentialsValues {
  /**
   * Google Cloud auth provider certificate.
   */
  authProviderX509CertUrl?: string;
  /**
   * Google Cloud auth uri.
   */
  authUri?: string;
  /**
   * Google Cloud email.
   */
  clientEmail?: string;
  /**
   * Google Cloud Client ID.
   */
  clientId?: string;
  /**
   * Google Cloud client certificate uri.
   */
  clientX509CertUrl?: string;
  /**
   * Google Cloud private key.
   */
  privateKey?: string;
  /**
   * Google Cloud private key id.
   */
  privateKeyId?: string;
  /**
   * Google Cloud project id.
   */
  projectId?: string;
  /**
   * Google Cloud token uri.
   */
  tokenUri?: string;
  /**
   * Google Cloud service account type.
   */
  type?: string;
}

/**
 * SQLAlchemy driver scheme options.
 */
export enum Scheme {
  AwsathenaREST = 'awsathena+rest',
  Bigquery = 'bigquery',
  ClickhouseHTTP = 'clickhouse+http',
  DatabricksConnector = 'databricks+connector',
  Db2IBMDB = 'db2+ibm_db',
  Druid = 'druid',
  Hive = 'hive',
  MssqlPymssql = 'mssql+pymssql',
  MssqlPyodbc = 'mssql+pyodbc',
  MssqlPytds = 'mssql+pytds',
  MysqlPymysql = 'mysql+pymysql',
  OracleCxOracle = 'oracle+cx_oracle',
  PostgresqlPsycopg2 = 'postgresql+psycopg2',
  Presto = 'presto',
  RedshiftPsycopg2 = 'redshift+psycopg2',
  Salesforce = 'salesforce',
  Snowflake = 'snowflake',
  SqlitePysqlite = 'sqlite+pysqlite',
  Trino = 'trino',
  VerticaVerticaPython = 'vertica+vertica_python',
}

/**
 * Service Type
 *
 * Looker service type
 *
 * Metabase service type
 *
 * PowerBI service type
 *
 * Redash service type
 *
 * Superset service type
 *
 * Tableau service type
 *
 * Service type.
 *
 * Kafka service type
 *
 * Pulsar service type
 *
 * Amundsen service type
 *
 * Metadata to Elastic Seach type
 *
 * OpenMetadata service type
 */
export enum Type {
  Amundsen = 'Amundsen',
  Athena = 'Athena',
  AzureSQL = 'AzureSQL',
  BigQuery = 'BigQuery',
  Clickhouse = 'Clickhouse',
  Databricks = 'Databricks',
  Db2 = 'Db2',
  DeltaLake = 'DeltaLake',
  Druid = 'Druid',
  DynamoDB = 'DynamoDB',
  Glue = 'Glue',
  Hive = 'Hive',
  Kafka = 'Kafka',
  Looker = 'Looker',
  MariaDB = 'MariaDB',
  Metabase = 'Metabase',
  MetadataES = 'MetadataES',
  Mssql = 'Mssql',
  Mysql = 'Mysql',
  OpenMetadata = 'OpenMetadata',
  Oracle = 'Oracle',
  Postgres = 'Postgres',
  PowerBI = 'PowerBI',
  Presto = 'Presto',
  Pulsar = 'Pulsar',
  Redash = 'Redash',
  Redshift = 'Redshift',
  SQLite = 'SQLite',
  Salesforce = 'Salesforce',
  SampleData = 'SampleData',
  SingleStore = 'SingleStore',
  Snowflake = 'Snowflake',
  Superset = 'Superset',
  Tableau = 'Tableau',
  Trino = 'Trino',
  Vertica = 'Vertica',
}

/**
 * Additional connection configuration.
 */
export interface SourceConfig {
  config?: any[] | boolean | ConfigClass | number | null | string;
}

export interface ConfigClass {
  /**
   * DBT Catalog file name
   */
  dbtCatalogFileName?: string;
  dbtConfig?: DbtConfig;
  /**
   * DBT Manifest file name
   */
  dbtManifestFileName?: string;
  /**
   * Method from which the DBT files will be fetched. Accepted values are: 's3'(Required aws
   * s3 credentials to be provided), 'gcs'(Required gcs credentials to be provided),
   * 'gcs-path'(path of the file containing gcs credentials), 'local'(path of dbt files on
   * local system), 'http'(url path of dbt files).
   */
  dbtProvider?: DbtProvider;
  /**
   * DBT configuration.
   */
  dbtSecurityConfig?: SCredentials;
  /**
   * Run data profiler as part of this metadata ingestion to get table profile data.
   */
  enableDataProfiler?: boolean;
  /**
   * Option to turn on/off generating sample data during metadata extraction.
   */
  generateSampleData?: boolean;
  /**
   * Optional configuration to turn off fetching metadata for tables.
   */
  includeTables?: boolean;
  /**
   * Optional configuration to turn off fetching metadata for views.
   */
  includeViews?: boolean;
  /**
   * Optional configuration to soft delete tables in OpenMetadata if the source tables are
   * deleted.
   */
  markDeletedTables?: boolean;
  /**
   * Sample data extraction query.
   */
  sampleDataQuery?: string;
  /**
   * Regex to only fetch tables or databases that matches the pattern.
   */
  schemaFilterPattern?: FilterPattern;
  /**
   * Regex exclude tables or databases that matches the pattern.
   */
  tableFilterPattern?: FilterPattern;
  /**
   * Pipeline type
   */
  type?: ConfigType;
  /**
   * Configuration to tune how far we want to look back in query logs to process usage data.
   */
  queryLogDuration?: number;
  /**
   * Configuration to set the limit for query logs
   */
  resultLimit?: number;
  /**
   * Temporary file name to store the query logs before processing. Absolute file path
   * required.
   */
  stageFileLocation?: string;
  /**
   * Regex exclude tables or databases that matches the pattern.
   */
  chartFilterPattern?: FilterPattern;
  /**
   * Regex to only fetch tables or databases that matches the pattern.
   */
  dashboardFilterPattern?: FilterPattern;
  /**
   * Regex to only fetch topics that matches the pattern.
   */
  topicFilterPattern?: FilterPattern;
  /**
   * Regex to only fetch tables with FQN matching the pattern.
   */
  fqnFilterPattern?: FilterPattern;
}

/**
 * Regex to only fetch tables or databases that matches the pattern.
 *
 * Regex to only fetch dashboards or charts that matches the pattern.
 *
 * Regex exclude tables or databases that matches the pattern.
 *
 * Regex to only fetch topics that matches the pattern.
 *
 * Regex to only fetch tables with FQN matching the pattern.
 */
export interface FilterPattern {
  /**
   * List of strings/regex patterns to match and exclude only database entities that match.
   */
  excludes?: string[];
  /**
   * List of strings/regex patterns to match and include only database entities that match.
   */
  includes?: string[];
}

/**
 * DBT Catalog and Manifest file path config.
 */
export interface DbtConfig {
  /**
   * DBT catalog file to extract dbt models with their column schemas.
   */
  dbtCatalogFilePath: string;
  /**
   * DBT manifest file path to extract dbt models and associate with tables.
   */
  dbtManifestFilePath: string;
}

/**
 * Method from which the DBT files will be fetched. Accepted values are: 's3'(Required aws
 * s3 credentials to be provided), 'gcs'(Required gcs credentials to be provided),
 * 'gcs-path'(path of the file containing gcs credentials), 'local'(path of dbt files on
 * local system), 'http'(url path of dbt files).
 */
export enum DbtProvider {
  Gcs = 'gcs',
  GcsPath = 'gcs-path',
  HTTP = 'http',
  Local = 'local',
  S3 = 's3',
}

/**
 * DBT configuration.
 *
 * GCS Credentials
 *
 * GCS credentials configs.
 *
 * AWS credentials configs.
 */
export interface SCredentials {
  /**
   * GCS configs.
   */
  gcsConfig?: GCSCredentialsValues | string;
  /**
   * AWS Access key ID.
   */
  awsAccessKeyId?: string;
  /**
   * AWS Region
   */
  awsRegion?: string;
  /**
   * AWS Secret Access Key.
   */
  awsSecretAccessKey?: string;
  /**
   * AWS Session Token.
   */
  awsSessionToken?: string;
  /**
   * EndPoint URL for the AWS
   */
  endPointURL?: string;
}

/**
 * Pipeline type
 *
 * Database Source Config Metadata Pipeline type
 *
 * Database Source Config Usage Pipeline type
 *
 * Dashboard Source Config Metadata Pipeline type
 *
 * Messaging Source Config Metadata Pipeline type
 *
 * Profiler Source Config Pipeline type
 */
export enum ConfigType {
  DashboardMetadata = 'DashboardMetadata',
  DatabaseMetadata = 'DatabaseMetadata',
  DatabaseUsage = 'DatabaseUsage',
  MessagingMetadata = 'MessagingMetadata',
  Profiler = 'Profiler',
}
