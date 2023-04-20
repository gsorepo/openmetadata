# Postgres

In this section, we provide guides and references to use the PostgreSQL connector.
### Step 1 : Requirements

To run the Ingestion via the UI you'll need to use the OpenMetadata Ingestion Container, which comes shipped with
custom Airflow plugins to handle the workflow deployment.

$$note
Note that we only support officially supported Postgres versions. You can check the version list [here](https://www.postgresql.org/support/versioning/).
$$

### Step 2 : Usage and Lineage considerations

When extracting lineage and usage information from Postgres we base our finding on the `pg_stat_statements` table.
You can find more information about it on the official [docs](https://www.postgresql.org/docs/current/pgstatstatements.html#id-1.11.7.39.6).

Another interesting consideration here is explained in the following SO [question](https://stackoverflow.com/questions/50803147/what-is-the-timeframe-for-pg-stat-statements).
As a summary:
- The `pg_stat_statements` has no time data embedded in it.
- It will show all queries from the last reset (one can call `pg_stat_statements_reset()`).

Then, when extracting usage and lineage data, the query log duration will have no impact, only the query limit.

- For usage and lineage grant your user `pg_read_all_stats` permission.

$$note
GRANT pg_read_all_stats TO your_user;
$$

## Connection Details

$$section
### Classification Name $(id="classificationName")

By default, the Postgres policy tags in OpenMetadata are classified under the name "PostgresPolicyTags". However, you can create a custom classification name of your choice for these tags. Once you have ingested Postgres data, the custom classification name will be visible in the Classifications list on the Tags page.
$$

$$section
### Connection Arguments $(id="connectionArguments")

Additional connection arguments such as security or protocol configs that can be sent to service during connection.
$$

$$section
### Connection Options $(id="connectionOptions")

Additional connection options to build the URL that can be sent to service during the connection.
$$

$$section
### Database $(id="database")

Initial Postgres database to connect to. If you want to ingest all databases, set `ingestAllDatabases` to true.
$$

$$section
### Host and Port $(id="hostPort")

Host and port of the Postgres service.
Example: `localhost:5432`
$$

$$section
### Ingest All Databases $(id="ingestAllDatabases")

If ticked, the workflow will be able to ingest all database in the cluster. If not ticked, the workflow will only ingest tables from the database set above.
$$

$$section
### Password $(id="password")

Password to connect to Postgres.
$$

$$section
### Connection Scheme $(id="scheme")

SQLAlchemy driver scheme options.
$$

$$section
### SSL Mode $(id="sslMode")

SSL Mode to connect to postgres database. E.g, prefer, verify-ca etc.
$$

$$section
### Username $(id="username")

Username to connect to Postgres. This user should have privileges to read all the metadata in Postgres.
$$