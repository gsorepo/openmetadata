---
title: SAS
slug: /connectors/database/sas
---

{% connectorDetailsHeader
name="SAS"
stage="BETA"
platform="OpenMetadata"
availableFeatures=["Metadata"]
unavailableFeatures=["Query Usage", "Data Profiler", "Data Quality", "Lineage", "Column-level Lineage", "dbt", "Stored Procedures", "Owners", "Tags"]
/ %}

In this section, we provide guides and references to use the SAS connector.

Configure and schedule SAS metadata workflow from the OpenMetadata UI:

- [Requirements](#requirements)
- [Metadata Ingestion](#metadata-ingestion)

{% partial file="/v1.7/connectors/ingestion-modes-tiles.md" variables={yamlPath: "/connectors/database/sas/yaml"} /%}

## Ways to Authenticate:

Here are the methods to [authenticate](/connectors/database/sas/connections) user credentials with the SAS connector.

## Requirements

{%inlineCallout icon="description" bold="OpenMetadata 1.3 or later" href="/deployment"%}
To deploy OpenMetadata, check the Deployment guides.
{%/inlineCallout%}

## Metadata Ingestion

Prepare the SAS Service and configure the Ingestion:

{% partial 
  file="/v1.7/connectors/metadata-ingestion-ui.md" 
  variables={
    connector: "SAS", 
    selectServicePath: "/images/v1.7/connectors/sas/select-service.png",
    addNewServicePath: "/images/v1.7/connectors/sas/add-new-service.png",
    serviceConnectionPath: "/images/v1.7/connectors/sas/service-connection.png",
} 
/%}

{% stepsContainer %}

{% partial file="/v1.7/connectors/test-connection.md" /%}

{% partial file="/v1.7/connectors/metadata/configure-ingestion.md" /%}

{% partial file="/v1.7/connectors/ingestion-schedule-and-deploy.md" /%}

{% /stepsContainer %}

{% partial file="/v1.7/connectors/troubleshooting.md" /%}
