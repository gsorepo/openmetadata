---
title: Table Schema | OpenMetadata Table Schema and API Guide
description: Connect Table to enable streamlined access, monitoring, or search of enterprise data using secure and scalable integrations.
slug: /main-concepts/metadata-standard/schemas/entity/data/table
---

# Table

*A `Table` entity organizes data in rows and columns and is defined in a `Database Schema`.*

## Properties

- **`id`**: Unique identifier of this table instance. Refer to *[../../type/basic.json#/definitions/uuid](#/../type/basic.json#/definitions/uuid)*.
- **`name`**: Name of a table. Expected to be unique within a database. Refer to *[../../type/basic.json#/definitions/entityName](#/../type/basic.json#/definitions/entityName)*.
- **`displayName`** *(string)*: Display Name that identifies this table. It could be title or label from the source services.
- **`fullyQualifiedName`**: Fully qualified name of a table in the form `serviceName.databaseName.tableName`. Refer to *[../../type/basic.json#/definitions/fullyQualifiedEntityName](#/../type/basic.json#/definitions/fullyQualifiedEntityName)*.
- **`description`**: Description of a table. Refer to *[../../type/basic.json#/definitions/markdown](#/../type/basic.json#/definitions/markdown)*.
- **`version`**: Metadata version of the entity. Refer to *[../../type/entityHistory.json#/definitions/entityVersion](#/../type/entityHistory.json#/definitions/entityVersion)*.
- **`updatedAt`**: Last update time corresponding to the new version of the entity in Unix epoch time milliseconds. Refer to *[../../type/basic.json#/definitions/timestamp](#/../type/basic.json#/definitions/timestamp)*.
- **`updatedBy`** *(string)*: User who made the update.
- **`href`**: Link to this table resource. Refer to *[../../type/basic.json#/definitions/href](#/../type/basic.json#/definitions/href)*.
- **`tableType`**: Refer to *[#/definitions/tableType](#definitions/tableType)*.
- **`columns`** *(array)*: Columns in this table. Default: `null`.
  - **Items**: Refer to *[#/definitions/column](#definitions/column)*.
- **`tableConstraints`** *(array)*: Table constraints. Default: `null`.
  - **Items**: Refer to *[#/definitions/tableConstraint](#definitions/tableConstraint)*.
- **`tablePartition`**: Refer to *[#/definitions/tablePartition](#definitions/tablePartition)*.
- **`owners`**: Owners of this table. Refer to *[../../type/entityReferenceList.json](#/../type/entityReferenceList.json)*. Default: `null`.
- **`databaseSchema`**: Reference to database schema that contains this table. Refer to *[../../type/entityReference.json](#/../type/entityReference.json)*.
- **`database`**: Reference to Database that contains this table. Refer to *[../../type/entityReference.json](#/../type/entityReference.json)*.
- **`service`**: Link to Database service this table is hosted in. Refer to *[../../type/entityReference.json](#/../type/entityReference.json)*.
- **`serviceType`**: Service type this table is hosted in. Refer to *[../services/databaseService.json#/definitions/databaseServiceType](#/services/databaseService.json#/definitions/databaseServiceType)*.
- **`location`**: Reference to the Location that contains this table. Refer to *[../../type/entityReference.json](#/../type/entityReference.json)*.
- **`locationPath`** *(string)*: Full storage path in case of external and managed tables. Default: `null`.
- **`schemaDefinition`**: DDL for Tables and Views. Refer to *[../../type/basic.json#/definitions/sqlQuery](#/../type/basic.json#/definitions/sqlQuery)*.
- **`tags`** *(array)*: Tags for this table. Default: `null`.
  - **Items**: Refer to *[../../type/tagLabel.json](#/../type/tagLabel.json)*.
- **`usageSummary`**: Latest usage information for this table. Refer to *[../../type/usageDetails.json](#/../type/usageDetails.json)*. Default: `null`.
- **`followers`**: Followers of this table. Refer to *[../../type/entityReferenceList.json](#/../type/entityReferenceList.json)*.
- **`joins`**: Details of other tables this table is frequently joined with. Refer to *[#/definitions/tableJoins](#definitions/tableJoins)*. Default: `null`.
- **`sampleData`**: Sample data for a table. Refer to *[#/definitions/tableData](#definitions/tableData)*. Default: `null`.
- **`tableProfilerConfig`**: Table Profiler Config to include or exclude columns from profiling. Refer to *[#/definitions/tableProfilerConfig](#definitions/tableProfilerConfig)*.
- **`customMetrics`** *(array)*: List of Custom Metrics registered for a table. Default: `null`.
  - **Items**: Refer to *[../../tests/customMetric.json](#/../tests/customMetric.json)*.
- **`profile`**: Latest Data profile for a table. Refer to *[#/definitions/tableProfile](#definitions/tableProfile)*. Default: `null`.
- **`testSuite`**: Executable test suite associated with this table. Refer to *[../../type/entityReference.json](#/../type/entityReference.json)*.
- **`dataModel`**: This captures information about how the table is modeled. Currently only DBT model is supported. Refer to *[#/definitions/dataModel](#definitions/dataModel)*.
- **`changeDescription`**: Change that lead to this version of the entity. Refer to *[../../type/entityHistory.json#/definitions/changeDescription](#/../type/entityHistory.json#/definitions/changeDescription)*.
- **`deleted`** *(boolean)*: When `true` indicates the entity has been soft deleted. Default: `false`.
- **`retentionPeriod`**: Retention period of the data in the table. Period is expressed as duration in ISO 8601 format in UTC. Example - `P23DT23H`. When not set, the retention period is inherited from the parent database schema, if it exists. Refer to *[../../type/basic.json#/definitions/duration](#/../type/basic.json#/definitions/duration)*.
- **`extension`**: Entity extension data with custom attributes added to the entity. Refer to *[../../type/basic.json#/definitions/entityExtension](#/../type/basic.json#/definitions/entityExtension)*.
- **`sourceUrl`**: Source URL of table. Refer to *[../../type/basic.json#/definitions/sourceUrl](#/../type/basic.json#/definitions/sourceUrl)*.
- **`domain`**: Domain the asset belongs to. When not set, the asset inherits the domain from the parent it belongs to. Refer to *[../../type/entityReference.json](#/../type/entityReference.json)*.
- **`dataProducts`**: List of data products this entity is part of. Refer to *[../../type/entityReferenceList.json](#/../type/entityReferenceList.json)*.
- **`fileFormat`**: File format in case of file/datalake tables. Refer to *[#/definitions/fileFormat](#definitions/fileFormat)*.
- **`votes`**: Votes on the entity. Refer to *[../../type/votes.json](#/../type/votes.json)*.
- **`lifeCycle`**: Life Cycle of the entity. Refer to *[../../type/lifeCycle.json](#/../type/lifeCycle.json)*.
- **`certification`**: Refer to *[../../type/assetCertification.json](#/../type/assetCertification.json)*.
- **`sourceHash`** *(string)*: Source hash of the entity.
## Definitions

- **`profileSampleType`** *(string)*: Type of Profile Sample (percentage or rows). Must be one of: `["PERCENTAGE", "ROWS"]`. Default: `"PERCENTAGE"`.
- **`samplingMethodType`** *(string)*: Type of Sampling Method (BERNOULLI or SYSTEM). Must be one of: `["BERNOULLI", "SYSTEM"]`.
- **`tableType`** *(string)*: This schema defines the type used for describing different types of tables. Must be one of: `["Regular", "External", "Dynamic", "View", "SecureView", "MaterializedView", "Iceberg", "Local", "Partitioned", "Foreign", "Transient"]`.
- **`dataType`** *(string)*: This enum defines the type of data stored in a column. Must be one of: `["NUMBER", "TINYINT", "SMALLINT", "INT", "BIGINT", "BYTEINT", "BYTES", "FLOAT", "DOUBLE", "DECIMAL", "NUMERIC", "TIMESTAMP", "TIMESTAMPZ", "TIME", "DATE", "DATETIME", "INTERVAL", "STRING", "MEDIUMTEXT", "TEXT", "CHAR", "LONG", "VARCHAR", "BOOLEAN", "BINARY", "VARBINARY", "ARRAY", "BLOB", "LONGBLOB", "MEDIUMBLOB", "MAP", "STRUCT", "UNION", "SET", "GEOGRAPHY", "ENUM", "JSON", "UUID", "VARIANT", "GEOMETRY", "BYTEA", "AGGREGATEFUNCTION", "ERROR", "FIXED", "RECORD", "NULL", "SUPER", "HLLSKETCH", "PG_LSN", "PG_SNAPSHOT", "TSQUERY", "TXID_SNAPSHOT", "XML", "MACADDR", "TSVECTOR", "UNKNOWN", "CIDR", "INET", "CLOB", "ROWID", "LOWCARDINALITY", "YEAR", "POINT", "POLYGON", "TUPLE", "SPATIAL", "TABLE", "NTEXT", "IMAGE", "IPV4", "IPV6", "DATETIMERANGE", "HLL", "LARGEINT", "QUANTILE_STATE", "AGG_STATE", "BITMAP", "UINT", "BIT", "MONEY"]`.
- **`constraint`** *(string)*: This enum defines the type for column constraint. Must be one of: `["NULL", "NOT_NULL", "UNIQUE", "PRIMARY_KEY"]`. Cannot contain additional properties. Default: `null`.
- **`tableConstraint`** *(object)*: This enum defines the type for table constraint. Cannot contain additional properties.
  - **`constraintType`** *(string)*: Must be one of: `["UNIQUE", "PRIMARY_KEY", "FOREIGN_KEY", "SORT_KEY", "DIST_KEY"]`.
  - **`columns`** *(array)*: List of column names corresponding to the constraint.
    - **Items** *(string)*
  - **`referredColumns`** *(array)*: List of referred columns for the constraint. Default: `null`.
    - **Items**: Refer to *[../../type/basic.json#/definitions/fullyQualifiedEntityName](#/../type/basic.json#/definitions/fullyQualifiedEntityName)*.
  - **`relationshipType`** *(string)*: Must be one of: `["ONE_TO_ONE", "ONE_TO_MANY", "MANY_TO_ONE", "MANY_TO_MANY"]`.
- **`columnName`** *(string)*: Local name (not fully qualified name) of the column. ColumnName is `-` when the column is not named in struct dataType. For example, BigQuery supports struct with unnamed fields.
- **`partitionIntervalTypes`** *(string)*: type of partition interval. Must be one of: `["TIME-UNIT", "INTEGER-RANGE", "INGESTION-TIME", "COLUMN-VALUE", "INJECTED", "ENUM", "OTHER"]`.
- **`tablePartition`** *(object)*: This schema defines the partition column of a table and format the partition is created. Cannot contain additional properties.
  - **`columns`** *(array)*: List of column partitions with their type and interval.
    - **Items**: Refer to *[#/definitions/partitionColumnDetails](#definitions/partitionColumnDetails)*.
- **`partitionColumnDetails`** *(object)*: This schema defines the partition column of a table and format the partition is created. Cannot contain additional properties.
  - **`columnName`** *(string)*: List of column names corresponding to the partition.
  - **`intervalType`**: Refer to *[#/definitions/partitionIntervalTypes](#definitions/partitionIntervalTypes)*.
  - **`interval`** *(string)*: partition interval , example hourly, daily, monthly.
- **`column`** *(object)*: This schema defines the type for a column in a table. Cannot contain additional properties.
  - **`name`**: Refer to *[#/definitions/columnName](#definitions/columnName)*.
  - **`displayName`** *(string)*: Display Name that identifies this column name.
  - **`dataType`**: Data type of the column (int, date etc.). Refer to *[#/definitions/dataType](#definitions/dataType)*.
  - **`arrayDataType`**: Data type used array in dataType. For example, `array<int>` has dataType as `array` and arrayDataType as `int`. Refer to *[#/definitions/dataType](#definitions/dataType)*.
  - **`dataLength`** *(integer)*: Length of `char`, `varchar`, `binary`, `varbinary` `dataTypes`, else null. For example, `varchar(20)` has dataType as `varchar` and dataLength as `20`.
  - **`precision`** *(integer)*: The precision of a numeric is the total count of significant digits in the whole number, that is, the number of digits to both sides of the decimal point. Precision is applicable Integer types, such as `INT`, `SMALLINT`, `BIGINT`, etc. It also applies to other Numeric types, such as `NUMBER`, `DECIMAL`, `DOUBLE`, `FLOAT`, etc.
  - **`scale`** *(integer)*: The scale of a numeric is the count of decimal digits in the fractional part, to the right of the decimal point. For Integer types, the scale is `0`. It mainly applies to non Integer Numeric types, such as `NUMBER`, `DECIMAL`, `DOUBLE`, `FLOAT`, etc.
  - **`dataTypeDisplay`** *(string)*: Display name used for dataType. This is useful for complex types, such as `array<int>`, `map<int,string>`, `struct<>`, and union types.
  - **`description`**: Description of the column. Refer to *[../../type/basic.json#/definitions/markdown](#/../type/basic.json#/definitions/markdown)*.
  - **`fullyQualifiedName`**: Refer to *[../../type/basic.json#/definitions/fullyQualifiedEntityName](#/../type/basic.json#/definitions/fullyQualifiedEntityName)*.
  - **`tags`** *(array)*: Tags associated with the column. Default: `[]`.
    - **Items**: Refer to *[../../type/tagLabel.json](#/../type/tagLabel.json)*.
  - **`constraint`**: Column level constraint. Refer to *[#/definitions/constraint](#definitions/constraint)*.
  - **`ordinalPosition`** *(integer)*: Ordinal position of the column.
  - **`jsonSchema`** *(string)*: Json schema only if the dataType is JSON else null.
  - **`children`** *(array)*: Child columns if dataType or arrayDataType is `map`, `struct`, or `union` else `null`. Default: `null`.
    - **Items**: Refer to *[#/definitions/column](#definitions/column)*.
  - **`profile`**: Latest Data profile for a Column. Refer to *[#/definitions/columnProfile](#definitions/columnProfile)*. Default: `null`.
  - **`customMetrics`** *(array)*: List of Custom Metrics registered for a table. Default: `null`.
    - **Items**: Refer to *[../../tests/customMetric.json](#/../tests/customMetric.json)*.
- **`joinedWith`** *(object)*: Fully qualified names of the fields/entities that this field/entity is joined with. Cannot contain additional properties.
  - **`fullyQualifiedName`**: Refer to *[../../type/basic.json#/definitions/fullyQualifiedEntityName](#/../type/basic.json#/definitions/fullyQualifiedEntityName)*.
  - **`joinCount`** *(integer, required)*
- **`columnJoins`** *(object)*: This schema defines the type to capture how frequently a column is joined with columns in the other tables. Cannot contain additional properties.
  - **`columnName`**: Refer to *[#/definitions/columnName](#definitions/columnName)*.
  - **`joinedWith`** *(array)*: Fully qualified names of the columns that this column is joined with.
    - **Items**: Refer to *[#/definitions/joinedWith](#definitions/joinedWith)*.
- **`tableJoins`** *(object)*: This schema defines the type to capture information about how this table is joined with other tables and columns. Cannot contain additional properties.
  - **`startDate`**: Date can be only from today going back to last 29 days. Refer to *[../../type/basic.json#/definitions/date](#/../type/basic.json#/definitions/date)*.
  - **`dayCount`** *(integer)*: Default: `1`.
  - **`columnJoins`** *(array)*
    - **Items**: Refer to *[#/definitions/columnJoins](#definitions/columnJoins)*.
  - **`directTableJoins`** *(array)*: Joins with other tables that are not on a specific column (e.g: UNION join).
    - **Items**: Refer to *[#/definitions/joinedWith](#definitions/joinedWith)*.
- **`tableData`** *(object)*: This schema defines the type to capture rows of sample data for a table. Cannot contain additional properties.
  - **`columns`** *(array)*: List of local column names (not fully qualified column names) of the table.
    - **Items**: Refer to *[#/definitions/columnName](#definitions/columnName)*.
  - **`rows`** *(array)*: Data for multiple rows of the table.
    - **Items** *(array)*: Data for a single row of the table within the same order as columns fields.
- **`customMetricProfile`** *(object)*: Profiling results of a Custom Metric. Cannot contain additional properties.
  - **`name`** *(string)*: Custom metric name.
  - **`value`** *(number)*: Profiling results for the metric.
- **`columnProfile`** *(object)*: This schema defines the type to capture the table's column profile. Cannot contain additional properties.
  - **`name`** *(string, required)*: Column Name.
  - **`timestamp`**: Timestamp on which profile is taken. Refer to *[../../type/basic.json#/definitions/timestamp](#/../type/basic.json#/definitions/timestamp)*.
  - **`valuesCount`** *(number)*: Total count of the values in this column.
  - **`valuesPercentage`** *(number)*: Percentage of values in this column with respect to row count.
  - **`validCount`** *(number)*: Total count of valid values in this column.
  - **`duplicateCount`** *(number)*: No.of Rows that contain duplicates in a column.
  - **`nullCount`** *(number)*: No.of null values in a column.
  - **`nullProportion`** *(number)*: No.of null value proportion in columns.
  - **`missingPercentage`** *(number)*: Missing Percentage is calculated by taking percentage of validCount/valuesCount.
  - **`missingCount`** *(number)*: Missing count is calculated by subtracting valuesCount - validCount.
  - **`uniqueCount`** *(number)*: No. of unique values in the column.
  - **`uniqueProportion`** *(number)*: Proportion of number of unique values in a column.
  - **`distinctCount`** *(number)*: Number of values that contain distinct values.
  - **`distinctProportion`** *(number)*: Proportion of distinct values in a column.
  - **`min`**: Minimum value in a column.
    - **One of**
      - *number*
      - *integer*
      - : Refer to *[../../type/basic.json#/definitions/dateTime](#/../type/basic.json#/definitions/dateTime)*.
      - : Refer to *[../../type/basic.json#/definitions/time](#/../type/basic.json#/definitions/time)*.
      - : Refer to *[../../type/basic.json#/definitions/date](#/../type/basic.json#/definitions/date)*.
      - *string*
  - **`max`**: Maximum value in a column.
    - **One of**
      - *number*
      - *integer*
      - : Refer to *[../../type/basic.json#/definitions/dateTime](#/../type/basic.json#/definitions/dateTime)*.
      - : Refer to *[../../type/basic.json#/definitions/time](#/../type/basic.json#/definitions/time)*.
      - : Refer to *[../../type/basic.json#/definitions/date](#/../type/basic.json#/definitions/date)*.
      - *string*
  - **`minLength`** *(number)*: Minimum string length in a column.
  - **`maxLength`** *(number)*: Maximum string length in a column.
  - **`mean`** *(number)*: Avg value in a column.
  - **`sum`** *(number)*: Median value in a column.
  - **`stddev`** *(number)*: Standard deviation of a column.
  - **`variance`** *(number)*: Variance of a column.
  - **`median`** *(number)*: Median of a column.
  - **`firstQuartile`** *(number)*: First quartile of a column.
  - **`thirdQuartile`** *(number)*: First quartile of a column.
  - **`interQuartileRange`** *(number)*: Inter quartile range of a column.
  - **`nonParametricSkew`** *(number)*: Non parametric skew of a column.
  - **`histogram`**: Histogram of a column. Cannot contain additional properties.
    - **`boundaries`** *(array)*: Boundaries of Histogram.
    - **`frequencies`** *(array)*: Frequencies of Histogram.
  - **`customMetrics`** *(array)*: Custom Metrics profile list bound to a column. Default: `null`.
    - **Items**: Refer to *[#/definitions/customMetricProfile](#definitions/customMetricProfile)*.
- **`dmlOperationType`** *(string)*: This schema defines the type of DML operation. Must be one of: `["UPDATE", "INSERT", "DELETE"]`.
- **`systemProfile`** *(object)*: This schema defines the System Profile object holding profile data from system tables.
  - **`timestamp`**: Timestamp on which profile is taken. Refer to *[../../type/basic.json#/definitions/timestamp](#/../type/basic.json#/definitions/timestamp)*.
  - **`operation`**: Operation performed. Refer to *[#/definitions/dmlOperationType](#definitions/dmlOperationType)*.
  - **`rowsAffected`** *(integer)*: Number of rows affected.
- **`columnProfilerConfig`** *(object)*: This schema defines the type for Table profile config include Columns.
  - **`columnName`** *(string)*: Column Name of the table to be included.
  - **`metrics`** *(array)*: Include only following metrics. Default: `null`.
    - **Items** *(string)*
- **`partitionProfilerConfig`** *(object)*: This schema defines the partition configuration used by profiler.
  - **`enablePartitioning`** *(boolean)*: whether to use partition. Default: `false`.
  - **`partitionColumnName`** *(string)*: name of the column to use for the partition.
  - **`partitionIntervalType`**: Refer to *[#/definitions/partitionIntervalTypes](#definitions/partitionIntervalTypes)*.
  - **`partitionInterval`** *(integer)*: The interval to use for the partitioning.
  - **`partitionIntervalUnit`** *(string)*: unit used for the partition interval. Must be one of: `["YEAR", "MONTH", "DAY", "HOUR"]`.
  - **`partitionValues`** *(array)*: unit used for the partition interval.
  - **`partitionIntegerRangeStart`** *(integer)*: start of the integer range for partitioning. Default: `null`.
  - **`partitionIntegerRangeEnd`** *(integer)*: end of the integer range for partitioning. Default: `null`.
- **`tableProfilerConfig`** *(object)*: This schema defines the type for Table profile config.
  - **`profileSampleType`**: Refer to *[#/definitions/profileSampleType](#definitions/profileSampleType)*.
  - **`profileSample`** *(number)*: Percentage of data or no. of rows used to compute the profiler metrics and run data quality tests. Default: `null`.
  - **`samplingMethodType`**: Refer to *[#/definitions/samplingMethodType](#definitions/samplingMethodType)*.
  - **`sampleDataCount`** *(integer)*: Number of sample rows to ingest when 'Generate Sample Data' is enabled. Default: `50`.
  - **`profileQuery`** *(string)*: Users' raw SQL query to fetch sample data and profile the table. Default: `null`.
  - **`excludeColumns`** *(array)*: column names to exclude from profiling. Default: `null`.
    - **Items** *(string)*
  - **`includeColumns`** *(array)*: Only run profiler on included columns with specific metrics. Default: `null`.
    - **Items**: Refer to *[#/definitions/columnProfilerConfig](#definitions/columnProfilerConfig)*.
  - **`partitioning`**: Partitioning configuration. Refer to *[#/definitions/partitionProfilerConfig](#definitions/partitionProfilerConfig)*.
  - **`computeTableMetrics`** *(boolean)*: Option to turn on/off table metric computation. If enabled, profiler will compute table level metrics. Default: `true`.
  - **`computeColumnMetrics`** *(boolean)*: Option to turn on/off column metric computation. If enabled, profiler will compute column level metrics. Default: `true`.
- **`tableProfile`** *(object)*: This schema defines the type to capture the table's data profile. Cannot contain additional properties.
  - **`timestamp`**: Timestamp on which profile is taken. Refer to *[../../type/basic.json#/definitions/timestamp](#/../type/basic.json#/definitions/timestamp)*.
  - **`profileSample`** *(number)*: Percentage of data or no. of rows we want to execute the profiler and tests on. Default: `null`.
  - **`profileSampleType`**: Refer to *[#/definitions/profileSampleType](#definitions/profileSampleType)*.
  - **`samplingMethodType`**: Refer to *[#/definitions/samplingMethodType](#definitions/samplingMethodType)*.
  - **`columnCount`** *(number)*: No.of columns in the table.
  - **`rowCount`** *(number)*: No.of rows in the table. This is always executed on the whole table.
  - **`sizeInByte`** *(number)*: Table size in GB.
  - **`createDateTime`** *(string, format: date-time)*: Table creation time.
  - **`customMetrics`** *(array)*: Custom Metrics profile list bound to a column. Default: `null`.
    - **Items**: Refer to *[#/definitions/customMetricProfile](#definitions/customMetricProfile)*.
- **`modelType`**: Must be one of: `["DBT", "DDL"]`.
- **`dataModel`** *(object)*: This captures information about how the table is modeled. Currently only DBT and DDL model is supported. Cannot contain additional properties.
  - **`modelType`**: Refer to *[#/definitions/modelType](#definitions/modelType)*.
  - **`resourceType`** *(string)*: Resource Type of the model.
  - **`description`**: Description of the Table from the model. Refer to *[../../type/basic.json#/definitions/markdown](#/../type/basic.json#/definitions/markdown)*.
  - **`path`** *(string)*: Path to sql definition file.
  - **`rawSql`**: This corresponds to rws SQL from `<model_name>.sql` in DBT. This might be null when SQL query need not be compiled as done in DBT. Refer to *[../../type/basic.json#/definitions/sqlQuery](#/../type/basic.json#/definitions/sqlQuery)*.
  - **`sql`**: This corresponds to compile SQL from `<model_name>.sql` in DBT. In cases where compilation is not necessary, this corresponds to SQL that created the table. Refer to *[../../type/basic.json#/definitions/sqlQuery](#/../type/basic.json#/definitions/sqlQuery)*.
  - **`upstream`** *(array)*: Fully qualified name of Models/tables used for in `sql` for creating this table.
    - **Items** *(string)*
  - **`owners`**: Owners of this Table. Refer to *[../../type/entityReferenceList.json](#/../type/entityReferenceList.json)*. Default: `null`.
  - **`tags`** *(array)*: Tags for this data model. Default: `[]`.
    - **Items**: Refer to *[../../type/tagLabel.json](#/../type/tagLabel.json)*.
  - **`columns`** *(array)*: Columns from the schema defined during modeling. In case of DBT, the metadata here comes from `schema.yaml`. Default: `null`.
    - **Items**: Refer to *[#/definitions/column](#definitions/column)*.
  - **`generatedAt`**: Refer to *[../../type/basic.json#/definitions/dateTime](#/../type/basic.json#/definitions/dateTime)*.
- **`fileFormat`** *(string)*: File format in case of file/datalake tables. Must be one of: `["csv", "tsv", "avro", "parquet", "json", "json.gz", "json.zip", "jsonl", "jsonl.gz", "jsonl.zip"]`.


Documentation file automatically generated at 2025-01-15 09:05:41.923720+00:00.
