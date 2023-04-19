# Clickhouse

In this section, we provide guides and references to use the Clickhouse connector.

# Requirements
<!-- to be updated -->
You can find further information on the Kafka connector in the [docs](https://docs.open-metadata.org/connectors/database/clickhouse).

## Connection Details

$$section
### Scheme $(id="scheme")

SQLAlchemy driver scheme options.
<!-- scheme to be updated -->
$$

$$section
### Username $(id="username")

Username to connect to Clickhouse. This user should have privileges to read all the metadata in Clickhouse.
<!-- username to be updated -->
$$

$$section
### Password $(id="password")

Password to connect to Clickhouse.
<!-- password to be updated -->
$$

$$section
### Host Port $(id="hostPort")

Host and port of the Clickhouse service.
<!-- hostPort to be updated -->
$$

$$section
### Database Name $(id="databaseName")

Optional name to give to the database in OpenMetadata. If left blank, we will use default as the database name.
<!-- databaseName to be updated -->
$$

$$section
### Database Schema $(id="databaseSchema")

databaseSchema of the data source. This is optional parameter, if you would like to restrict the metadata reading to a single databaseSchema. When left blank, OpenMetadata Ingestion attempts to scan all the databaseSchema.
<!-- databaseSchema to be updated -->
$$

$$section
### Duration $(id="duration")

Clickhouse SQL connection duration.
<!-- duration to be updated -->
$$

$$section
### Secure $(id="secure")

Establish secure connection with clickhouse
<!-- secure to be updated -->
$$

$$section
### Keyfile $(id="keyfile")

Path to key file for establishing secure connection
<!-- keyfile to be updated -->
$$

$$section
### Connection Options $(id="connectionOptions")

Additional connection options to build the URL that can be sent to service during the connection.
<!-- connectionOptions to be updated -->
$$

$$section
### Connection Arguments $(id="connectionArguments")

Additional connection arguments such as security or protocol configs that can be sent to service during connection.
<!-- connectionArguments to be updated -->
$$
