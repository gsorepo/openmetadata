import sys
import time
from os import path

import pytest

from _openmetadata_testutils.postgres.conftest import postgres_container
from metadata.generated.schema.api.services.createDatabaseService import (
    CreateDatabaseServiceRequest,
)
from metadata.generated.schema.entity.data.table import Table
from metadata.generated.schema.entity.services.connections.database.common.basicAuth import (
    BasicAuth,
)
from metadata.generated.schema.entity.services.connections.database.postgresConnection import (
    PostgresConnection,
)
from metadata.generated.schema.entity.services.databaseService import (
    DatabaseConnection,
    DatabaseService,
    DatabaseServiceType,
)
from metadata.generated.schema.metadataIngestion.databaseServiceProfilerPipeline import (
    DatabaseServiceProfilerPipeline,
)
from metadata.generated.schema.metadataIngestion.databaseServiceQueryLineagePipeline import (
    DatabaseServiceQueryLineagePipeline,
)
from metadata.generated.schema.metadataIngestion.databaseServiceQueryUsagePipeline import (
    DatabaseUsageConfigType,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    LogLevels,
    OpenMetadataWorkflowConfig,
    Processor,
    Sink,
    Source,
    SourceConfig,
    WorkflowConfig,
)
from metadata.ingestion.lineage.sql_lineage import search_cache
from metadata.ingestion.models.custom_pydantic import CustomSecretStr
from metadata.ingestion.ometa.client import APIError
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.workflow.metadata import MetadataWorkflow
from metadata.workflow.profiler import ProfilerWorkflow
from metadata.workflow.usage import UsageWorkflow

if not sys.version_info >= (3, 9):
    pytest.skip("requires python 3.9+", allow_module_level=True)


@pytest.fixture(scope="module")
def db_service(metadata, postgres_container):
    service = CreateDatabaseServiceRequest(
        name="docker_test_db",
        serviceType=DatabaseServiceType.Postgres,
        connection=DatabaseConnection(
            config=PostgresConnection(
                username=postgres_container.username,
                authType=BasicAuth(password=postgres_container.password),
                hostPort="localhost:"
                + postgres_container.get_exposed_port(postgres_container.port),
                database="dvdrental",
            )
        ),
    )
    service_entity = metadata.create_or_update(data=service)
    service_entity.connection.config.authType.password = CustomSecretStr(
        postgres_container.password
    )
    yield service_entity
    try:
        metadata.delete(
            DatabaseService, service_entity.id, recursive=True, hard_delete=True
        )
    except APIError as error:
        if error.status_code == 404:
            pass
        else:
            raise


@pytest.fixture(scope="module")
def ingest_metadata(db_service, metadata: OpenMetadata):
    search_cache.clear()
    workflow_config = OpenMetadataWorkflowConfig(
        source=Source(
            type=db_service.connection.config.type.value.lower(),
            serviceName=db_service.fullyQualifiedName.root,
            serviceConnection=db_service.connection,
            sourceConfig=SourceConfig(config={}),
        ),
        sink=Sink(
            type="metadata-rest",
            config={},
        ),
        workflowConfig=WorkflowConfig(openMetadataServerConfig=metadata.config),
    )
    metadata_ingestion = MetadataWorkflow.create(workflow_config)
    metadata_ingestion.execute()
    return


@pytest.fixture(scope="module")
def ingest_postgres_lineage(db_service, ingest_metadata, metadata: OpenMetadata):
    search_cache.clear()
    workflow_config = OpenMetadataWorkflowConfig(
        source=Source(
            type="postgres-lineage",
            serviceName=db_service.fullyQualifiedName.root,
            serviceConnection=db_service.connection,
            sourceConfig=SourceConfig(config=DatabaseServiceQueryLineagePipeline()),
        ),
        sink=Sink(
            type="metadata-rest",
            config={},
        ),
        workflowConfig=WorkflowConfig(
            loggerLevel=LogLevels.DEBUG, openMetadataServerConfig=metadata.config
        ),
    )
    metadata_ingestion = MetadataWorkflow.create(workflow_config)
    metadata_ingestion.execute()
    metadata_ingestion.raise_from_status()
    return


def test_ingest_query_log(db_service, ingest_metadata, metadata: OpenMetadata):
    search_cache.clear()
    reindex_search(
        metadata
    )  # since query cache is stored in ES, we need to reindex to avoid having a stale cache
    workflow_config = {
        "source": {
            "type": "query-log-lineage",
            "serviceName": db_service.fullyQualifiedName.root,
            "sourceConfig": {
                "config": {
                    "type": "DatabaseLineage",
                    "queryLogFilePath": path.dirname(__file__) + "/bad_query_log.csv",
                }
            },
        },
        "sink": {"type": "metadata-rest", "config": {}},
        "workflowConfig": {
            "loggerLevel": "DEBUG",
            "openMetadataServerConfig": metadata.config.model_dump(),
        },
    }
    metadata_ingestion = MetadataWorkflow.create(workflow_config)
    metadata_ingestion.execute()
    assert len(metadata_ingestion.source.status.failures) == 2
    for failure in metadata_ingestion.source.status.failures:
        assert "Table entity not found" in failure.error
    customer_table: Table = metadata.get_by_name(
        Table,
        f"{db_service.fullyQualifiedName.root}.dvdrental.public.customer",
        nullable=False,
    )
    actor_table: Table = metadata.get_by_name(
        Table,
        f"{db_service.fullyQualifiedName.root}.dvdrental.public.actor",
        nullable=False,
    )
    staff_table: Table = metadata.get_by_name(
        Table,
        f"{db_service.fullyQualifiedName.root}.dvdrental.public.staff",
        nullable=False,
    )
    edge = metadata.get_lineage_edge(
        str(customer_table.id.root), str(actor_table.id.root)
    )
    assert edge is not None
    edge = metadata.get_lineage_edge(
        str(customer_table.id.root), str(staff_table.id.root)
    )
    assert edge is not None


@pytest.fixture(scope="module")
def run_profiler_workflow(ingest_metadata, db_service, metadata):
    workflow_config = OpenMetadataWorkflowConfig(
        source=Source(
            type=db_service.connection.config.type.value.lower(),
            serviceName=db_service.fullyQualifiedName.root,
            serviceConnection=db_service.connection,
            sourceConfig=SourceConfig(config=DatabaseServiceProfilerPipeline()),
        ),
        processor=Processor(
            type="orm-profiler",
            config={},
        ),
        sink=Sink(
            type="metadata-rest",
            config={},
        ),
        workflowConfig=WorkflowConfig(
            loggerLevel=LogLevels.DEBUG, openMetadataServerConfig=metadata.config
        ),
    )
    metadata_ingestion = ProfilerWorkflow.create(workflow_config.model_dump())
    search_cache.clear()
    metadata_ingestion.execute()
    return


@pytest.fixture(scope="module")
def ingest_query_usage(ingest_metadata, db_service, metadata):
    search_cache.clear()
    workflow_config = {
        "source": {
            "type": "postgres-usage",
            "serviceName": db_service.fullyQualifiedName.root,
            "serviceConnection": db_service.connection.model_dump(),
            "sourceConfig": {
                "config": {"type": DatabaseUsageConfigType.DatabaseUsage.value}
            },
        },
        "processor": {"type": "query-parser", "config": {}},
        "stage": {
            "type": "table-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "bulkSink": {
            "type": "metadata-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "sink": {"type": "metadata-rest", "config": {}},
        "workflowConfig": {
            "loggerLevel": "DEBUG",
            "openMetadataServerConfig": metadata.config.model_dump(),
        },
    }
    workflow = UsageWorkflow.create(workflow_config)
    search_cache.clear()
    workflow.execute()
    workflow.raise_from_status()
    return


@pytest.fixture(scope="module")
def db_fqn(db_service: DatabaseService):
    return ".".join(
        [
            db_service.fullyQualifiedName.root,
            db_service.connection.config.database,
        ]
    )


def test_query_usage(
    ingest_query_usage,
    db_service,
    metadata,
    db_fqn,
):
    table = metadata.get_by_name(Table, ".".join([db_fqn, "public", "actor"]))
    queries = metadata.get_entity_queries(table.id)
    # TODO this should be retruning 2 queries but in CI sometimes it returns 1 *shrug*
    assert 1 <= len(queries) <= 2


def test_profiler(run_profiler_workflow):
    pass


def test_db_lineage(ingest_postgres_lineage):
    pass


def run_usage_workflow(db_service, metadata):
    workflow_config = {
        "source": {
            "type": "postgres-usage",
            "serviceName": db_service.fullyQualifiedName.root,
            "serviceConnection": db_service.connection.model_dump(),
            "sourceConfig": {
                "config": {"type": DatabaseUsageConfigType.DatabaseUsage.value}
            },
        },
        "processor": {"type": "query-parser", "config": {}},
        "stage": {
            "type": "table-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "bulkSink": {
            "type": "metadata-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "sink": {"type": "metadata-rest", "config": {}},
        "workflowConfig": {
            "loggerLevel": "DEBUG",
            "openMetadataServerConfig": metadata.config.model_dump(),
        },
    }
    workflow = UsageWorkflow.create(workflow_config)
    search_cache.clear()
    workflow.execute()
    workflow.raise_from_status()


@pytest.mark.xfail(
    reason="'metadata.ingestion.lineage.sql_lineage.search_cache' gets corrupted with invalid data."
    " See issue https://github.com/open-metadata/OpenMetadata/issues/16408"
)
def test_usage_delete_usage(db_service, ingest_postgres_lineage, metadata):
    workflow_config = {
        "source": {
            "type": "postgres-usage",
            "serviceName": db_service.fullyQualifiedName.root,
            "serviceConnection": db_service.connection.model_dump(),
            "sourceConfig": {
                "config": {"type": DatabaseUsageConfigType.DatabaseUsage.value}
            },
        },
        "processor": {"type": "query-parser", "config": {}},
        "stage": {
            "type": "table-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "bulkSink": {
            "type": "metadata-usage",
            "config": {
                "filename": "/tmp/postgres_usage",
            },
        },
        "sink": {"type": "metadata-rest", "config": {}},
        "workflowConfig": {
            "loggerLevel": "DEBUG",
            "openMetadataServerConfig": metadata.config.model_dump(),
        },
    }
    workflow = UsageWorkflow.create(workflow_config)
    search_cache.clear()
    workflow.execute()
    workflow.raise_from_status()
    run_usage_workflow(db_service, metadata)
    metadata.delete(DatabaseService, db_service.id, hard_delete=True, recursive=True)
    workflow_config = OpenMetadataWorkflowConfig(
        source=Source(
            type=db_service.connection.config.type.value.lower(),
            serviceName=db_service.fullyQualifiedName.root,
            serviceConnection=db_service.connection,
            sourceConfig=SourceConfig(config={}),
        ),
        sink=Sink(
            type="metadata-rest",
            config={},
        ),
        workflowConfig=WorkflowConfig(openMetadataServerConfig=metadata.config),
    )
    metadata_ingestion = MetadataWorkflow.create(workflow_config)
    metadata_ingestion.execute()
    metadata_ingestion.raise_from_status()
    run_usage_workflow(db_service, metadata)


def reindex_search(metadata: OpenMetadata, timeout=60):
    start = time.time()
    status = None
    while status is None or status == "running":
        response = metadata.client.get(
            "/apps/name/SearchIndexingApplication/status?offset=0&limit=1"
        )
        status = response["data"][0]["status"]
        if time.time() - start > timeout:
            raise TimeoutError("Timed out waiting for reindexing to start")
        time.sleep(1)
    time.sleep(
        0.5
    )  # app interactivity is not immediate (probably bc async operations), so we wait a bit
    metadata.client.post("/apps/trigger/SearchIndexingApplication")
    time.sleep(0.5)  # here too
    while status != "success":
        response = metadata.client.get(
            "/apps/name/SearchIndexingApplication/status?offset=0&limit=1"
        )
        status = response["data"][0]["status"]
        if time.time() - start > timeout:
            raise TimeoutError("Timed out waiting for reindexing to complete")
        time.sleep(1)
