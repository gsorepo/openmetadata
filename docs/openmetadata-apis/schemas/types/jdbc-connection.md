# Jdbc Connection

JDBC connection information

**$id:** [**https://github.com/open-metadata/OpenMetadata/blob/main/catalog-rest-service/src/main/resources/json/schema/type/jdbcConnection.json**](https://github.com/open-metadata/OpenMetadata/blob/main/catalog-rest-service/src/main/resources/json/schema/type/jdbcConnection.json)

Type: `object`

## Properties

* **driverClass** `required`
  * JDBC driver class
  * $ref: [\#/definitions/driverClass](jdbc-connection.md#/definitions/driverClass)
* **connectionUrl** `required`
  * JDBC connection URL
  * $ref: [\#/definitions/connectionUrl](jdbc-connection.md#/definitions/connectionUrl)
* **userName** `required`
  * Login user name.
  * Type: `string`
* **password** `required`
  * Login password.
  * Type: `string`

## Types definitions in this schema

**driverClass**

* Type used for JDBC driver class
* Type: `string`

**connectionUrl**

* Type used for JDBC connection URL
* Type: `string`
* String format must be a "uri"

**jdbcInfo**

* Type for capturing JDBC connector information
* Type: `object`
* **Properties**
  * **driverClass** `required`
    * $ref: [\#/definitions/driverClass](jdbc-connection.md#/definitions/driverClass)
    * Default: _"com.amazon.redshift.jdbc42.Driver"_
  * **connectionUrl** `required`
    * $ref: [\#/definitions/connectionUrl](jdbc-connection.md#/definitions/connectionUrl)

