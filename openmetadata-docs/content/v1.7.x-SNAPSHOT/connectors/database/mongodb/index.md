---
title: MongoDB
slug: /connectors/database/mongodb
---

{% connectorDetailsHeader
name="MongoDB"
stage="PROD"
platform="OpenMetadata"
availableFeatures=["Metadata", "Data Profiler",]
unavailableFeatures=["Query Usage", "Data Quality", "dbt", "Owners", "Lineage", "Column-level Lineage", "Tags", "Stored Procedures"]
/ %}


In this section, we provide guides and references to use the MongoDB connector.

Configure and schedule MongoDB metadata workflows from the OpenMetadata UI:

- [Requirements](#requirements)
- [Metadata Ingestion](#metadata-ingestion)
- [Data Profiler](#data-profiler)

{% partial file="/v1.7/connectors/ingestion-modes-tiles.md" variables={yamlPath: "/connectors/database/mongodb/yaml"} /%}

## Ways to Authenticate:

Here are the methods to [authenticate](/connectors/database/mongodb/connections) user credentials with the MongoDB connector.

## Requirements

To fetch the metadata from MongoDB to OpenMetadata, the MongoDB user must have access to perform `find` operation on collection and `listCollection` operations on database available in MongoDB.

## Metadata Ingestion

{% partial 
  file="/v1.7/connectors/metadata-ingestion-ui.md" 
  variables={
    connector: "MongoDB", 
    selectServicePath: "/images/v1.7/connectors/mongodb/select-service.png",
    addNewServicePath: "/images/v1.7/connectors/mongodb/add-new-service.png",
    serviceConnectionPath: "/images/v1.7/connectors/mongodb/service-connection.png",
} 
/%}

{% stepsContainer %}

{% partial file="/v1.7/connectors/test-connection.md" /%}

{% partial file="/v1.7/connectors/database/configure-ingestion.md" /%}

{% partial file="/v1.7/connectors/ingestion-schedule-and-deploy.md" /%}

{% /stepsContainer %}

{% partial file="/v1.7/connectors/troubleshooting.md" /%}

{% partial file="/v1.7/connectors/database/related.md" /%}

## Data Profiler

{%inlineCallout icon="description" bold="OpenMetadata 1.3.1 or later" href="/deployment"%}
To deploy OpenMetadata, check the Deployment guides.
{%/inlineCallout%}

[Profiler deployment](/how-to-guides/data-quality-observability/profiler/workflow)

### Limitations

The MongodDB data profiler current supports only the following features:

1. **Row count**: The number of rows in the collection. Sampling or custom query is not supported.
2. **Sample data:** If a custom query is defined it will be used for sample data.
