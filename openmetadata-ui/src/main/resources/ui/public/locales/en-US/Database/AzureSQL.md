# AzureSQL

In this section, we provide guides and references to use the AzureSQL connector.

## Requirements

Make sure if you have whitelisted ingestion container IP on Azure SQL firewall rules. Checkout [this](https://learn.microsoft.com/en-us/azure/azure-sql/database/firewall-configure?view=azuresql#use-the-azure-portal-to-manage-server-level-ip-firewall-rules) document on how to whitelist your IP using azure portal.

You can find further information on the Azure connector in the [docs](https://docs.open-metadata.org/connectors/database/azuresql).

## Connection Details

$$section
### Scheme $(id="scheme")

SQLAlchemy driver scheme options.
$$

$$section
### Username $(id="username")

Username to connect to AzureSQL. This user should have privileges to read the metadata.
$$

$$section
### Password $(id="password")

Password to connect to AzureSQL.
$$

$$section
### Host Port $(id="hostPort")

Host and port of the AzureSQL service. For example: `azure-sql-service-name.database.windows.net:1433`
$$

$$section
### Database $(id="database")

Database of the data source. This is optional parameter, if you would like to restrict the metadata reading to a single database. When left blank, OpenMetadata Ingestion attempts to scan all the databases.
$$

$$section
### Driver $(id="driver")

Connecting to AzureSQL requires ODBC driver to be installed. Specify ODBC driver name in the field.
You can download the ODBC driver from [here](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server?view=sql-server-ver16)

```
Note: In case of docker or kubernetes deployment this driver comes out of the box with version 
`ODBC Driver 18 for SQL Server`
```

$$

$$section
### Connection Options $(id="connectionOptions")

Additional connection options to build the URL that can be sent to service during the connection.
$$

$$section
### Connection Arguments $(id="connectionArguments")

Additional connection arguments such as security or protocol configs that can be sent to service during connection.
$$
