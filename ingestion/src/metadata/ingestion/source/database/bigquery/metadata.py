#  Copyright 2021 Collate
#  Licensed under the Apache License, Version 2.0 (the "License");
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#  http://www.apache.org/licenses/LICENSE-2.0
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
"""
We require Taxonomy Admin permissions to fetch all Policy Tags
"""
import os
import re
import traceback
from collections import defaultdict
from functools import lru_cache
from typing import Dict, Iterable, List, Optional, Tuple

from google import auth
from google.cloud.datacatalog_v1 import PolicyTagManagerClient
from sqlalchemy import inspect
from sqlalchemy.engine.reflection import Inspector
from sqlalchemy.sql.sqltypes import Interval
from sqlalchemy.types import String
from sqlalchemy_bigquery import BigQueryDialect, _types
from sqlalchemy_bigquery._types import _get_sqla_column_type

from metadata.generated.schema.api.data.createDatabaseSchema import (
    CreateDatabaseSchemaRequest,
)
from metadata.generated.schema.api.data.createQuery import CreateQueryRequest
from metadata.generated.schema.api.data.createStoredProcedure import (
    CreateStoredProcedureRequest,
)
from metadata.generated.schema.api.lineage.addLineage import AddLineageRequest
from metadata.generated.schema.entity.data.database import Database, EntityName
from metadata.generated.schema.entity.data.storedProcedure import StoredProcedureCode
from metadata.generated.schema.entity.data.table import (
    IntervalType,
    TablePartition,
    TableType,
)
from metadata.generated.schema.entity.services.connections.database.bigQueryConnection import (
    BigQueryConnection,
)
from metadata.generated.schema.entity.services.connections.metadata.openMetadataConnection import (
    OpenMetadataConnection,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    Source as WorkflowSource,
)
from metadata.generated.schema.security.credentials.gcpValues import (
    GcpCredentialsValues,
    SingleProjectId,
)
from metadata.generated.schema.type.basic import SourceUrl, SqlQuery, Timestamp
from metadata.generated.schema.type.entityLineage import Source as LineageSource
from metadata.generated.schema.type.entityReference import EntityReference
from metadata.generated.schema.type.tagLabel import TagLabel
from metadata.ingestion.api.models import Either, StackTraceError
from metadata.ingestion.api.steps import InvalidSourceException
from metadata.ingestion.lineage.models import ConnectionTypeDialectMapper
from metadata.ingestion.lineage.sql_lineage import get_lineage_by_query
from metadata.ingestion.models.ometa_classification import OMetaTagAndClassification
from metadata.ingestion.source.connections import get_connection
from metadata.ingestion.source.database.bigquery.models import (
    STORED_PROC_LANGUAGE_MAP,
    BigQueryStoredProcedure,
)
from metadata.ingestion.source.database.bigquery.queries import (
    BIGQUERY_GET_STORED_PROCEDURE_QUERIES,
    BIGQUERY_GET_STORED_PROCEDURES,
    BIGQUERY_SCHEMA_DESCRIPTION,
    BIGQUERY_TABLE_AND_TYPE,
)
from metadata.ingestion.source.database.column_type_parser import create_sqlalchemy_type
from metadata.ingestion.source.database.common_db_source import (
    CommonDbSourceService,
    TableNameAndType,
)
from metadata.ingestion.source.database.database_service import QueryByProcedure
from metadata.utils import fqn
from metadata.utils.bigquery_utils import get_bigquery_client
from metadata.utils.credentials import GOOGLE_CREDENTIALS
from metadata.utils.filters import filter_by_database
from metadata.utils.helpers import get_start_and_end
from metadata.utils.logger import ingestion_logger
from metadata.utils.sqlalchemy_utils import is_complex_type
from metadata.utils.stored_procedures import get_procedure_name_from_call
from metadata.utils.tag_utils import (
    get_ometa_tag_and_classification,
    get_tag_label,
    get_tag_labels,
)

_bigquery_table_types = {
    "BASE TABLE": TableType.Regular,
    "EXTERNAL": TableType.External,
}


class BQJSON(String):
    """The SQL JSON type."""

    def get_col_spec(self, **kw):  # pylint: disable=unused-argument
        return "JSON"


logger = ingestion_logger()
# pylint: disable=protected-access
_types._type_map.update(
    {
        "GEOGRAPHY": create_sqlalchemy_type("GEOGRAPHY"),
        "JSON": BQJSON,
        "INTERVAL": Interval,
    }
)


def _array_sys_data_type_repr(col_type):
    """clean up the repr of the array data type

    Args:
        col_type (_type_): column type
    """
    return (
        repr(col_type)
        .replace("(", "<")
        .replace(")", ">")
        .replace("=", ":")
        .replace("<>", "")
        .lower()
    )


def get_columns(bq_schema):
    """
    get_columns method overwritten to include tag details
    """
    col_list = []
    for field in bq_schema:
        col_type = _get_sqla_column_type(field)
        col_obj = {
            "name": field.name,
            "type": col_type,
            "nullable": field.mode in ("NULLABLE", "REPEATED"),
            "comment": field.description,
            "default": None,
            "precision": field.precision,
            "scale": field.scale,
            "max_length": field.max_length,
            "system_data_type": _array_sys_data_type_repr(col_type)
            if str(col_type) == "ARRAY"
            else str(col_type),
            "is_complex": is_complex_type(str(col_type)),
            "policy_tags": None,
        }
        try:
            if field.policy_tags:
                policy_tag_name = field.policy_tags.names[0]
                taxonomy_name = (
                    policy_tag_name.split("/policyTags/")[0] if policy_tag_name else ""
                )
                if not taxonomy_name:
                    raise NotImplementedError(
                        f"Taxonomy Name not present for {field.name}"
                    )
                col_obj["taxonomy"] = (
                    PolicyTagManagerClient()
                    .get_taxonomy(name=taxonomy_name)
                    .display_name
                )
                col_obj["policy_tags"] = (
                    PolicyTagManagerClient()
                    .get_policy_tag(name=policy_tag_name)
                    .display_name
                )
        except Exception as exc:
            logger.debug(traceback.format_exc())
            logger.warning(f"Skipping Policy Tag: {exc}")
        col_list.append(col_obj)
    return col_list


_types.get_columns = get_columns


@staticmethod
def _build_formatted_table_id(table):
    """We overide the methid as it returns both schema and table name if dataset_id is None. From our
    investigation, this method seems to be used only in `_get_table_or_view_names()` of bigquery sqalchemy
    https://github.com/googleapis/python-bigquery-sqlalchemy/blob/2b1f5c464ad2576e4512a0407bb044da4287c65e/sqlalchemy_bigquery/base.py
    """
    return f"{table.table_id}"


BigQueryDialect._build_formatted_table_id = (  # pylint: disable=protected-access
    _build_formatted_table_id
)


class BigquerySource(CommonDbSourceService):
    """
    Implements the necessary methods to extract
    Database metadata from Bigquery Source
    """

    def __init__(self, config, metadata_config):
        super().__init__(config, metadata_config)
        self.temp_credentials = None
        self.client = None
        self.project_ids = self.set_project_id()

    @classmethod
    def create(cls, config_dict, metadata_config: OpenMetadataConnection):
        config: WorkflowSource = WorkflowSource.parse_obj(config_dict)
        connection: BigQueryConnection = config.serviceConnection.__root__.config
        if not isinstance(connection, BigQueryConnection):
            raise InvalidSourceException(
                f"Expected BigQueryConnection, but got {connection}"
            )
        return cls(config, metadata_config)

    @staticmethod
    def set_project_id() -> List[str]:
        _, project_ids = auth.default()
        return project_ids if isinstance(project_ids, list) else [project_ids]

    def query_table_names_and_types(
        self, schema_name: str
    ) -> Iterable[TableNameAndType]:
        """
        Connect to the source database to get the table
        name and type. By default, use the inspector method
        to get the names and pass the Regular type.

        This is useful for sources where we need fine-grained
        logic on how to handle table types, e.g., external, foreign,...
        """

        return [
            TableNameAndType(
                name=table_name,
                type_=_bigquery_table_types.get(table_type, TableType.Regular),
            )
            for table_name, table_type in self.engine.execute(
                BIGQUERY_TABLE_AND_TYPE.format(
                    project_id=self.client.project, schema_name=schema_name
                )
            )
            or []
        ]

    def yield_tag(
        self, schema_name: str
    ) -> Iterable[Either[OMetaTagAndClassification]]:
        """
        Build tag context
        :param _:
        :return:
        """
        try:
            # Fetching labels on the databaseSchema ( dataset ) level
            dataset_obj = self.client.get_dataset(schema_name)
            if dataset_obj.labels:
                for key, value in dataset_obj.labels.items():
                    yield from get_ometa_tag_and_classification(
                        tags=[value],
                        classification_name=key,
                        tag_description="Bigquery Dataset Label",
                        classification_description="",
                    )
            # Fetching policy tags on the column level
            list_project_ids = [self.context.database.name.__root__]
            if not self.service_connection.taxonomyProjectID:
                self.service_connection.taxonomyProjectID = []
            list_project_ids.extend(self.service_connection.taxonomyProjectID)
            for project_ids in list_project_ids:
                taxonomies = PolicyTagManagerClient().list_taxonomies(
                    parent=f"projects/{project_ids}/locations/{self.service_connection.taxonomyLocation}"
                )
                for taxonomy in taxonomies:
                    policy_tags = PolicyTagManagerClient().list_policy_tags(
                        parent=taxonomy.name
                    )
                    yield from get_ometa_tag_and_classification(
                        tags=[tag.display_name for tag in policy_tags],
                        classification_name=taxonomy.display_name,
                        tag_description="Bigquery Policy Tag",
                        classification_description="",
                    )
        except Exception as exc:
            yield Either(
                left=StackTraceError(
                    name="Tags and Classifications",
                    error=f"Skipping Policy Tag ingestion due to: {exc}",
                    stack_trace=traceback.format_exc(),
                )
            )

    def get_schema_description(self, schema_name: str) -> Optional[str]:
        try:
            query_resp = self.client.query(
                BIGQUERY_SCHEMA_DESCRIPTION.format(
                    project_id=self.client.project,
                    region=self.service_connection.usageLocation,
                    schema_name=schema_name,
                )
            )

            query_result = [result.schema_description for result in query_resp.result()]
            return query_result[0]
        except IndexError:
            logger.debug(f"No dataset description found for {schema_name}")
        except Exception as err:
            logger.debug(traceback.format_exc())
            logger.debug(
                f"Failed to fetch dataset description for [{schema_name}]: {err}"
            )
        return ""

    def yield_database_schema(
        self, schema_name: str
    ) -> Iterable[CreateDatabaseSchemaRequest]:
        """
        From topology.
        Prepare a database schema request and pass it to the sink
        """

        database_schema_request_obj = CreateDatabaseSchemaRequest(
            name=schema_name,
            database=self.context.database.fullyQualifiedName,
            description=self.get_schema_description(schema_name),
            sourceUrl=self.get_source_url(
                database_name=self.context.database.name.__root__,
                schema_name=schema_name,
            ),
        )

        dataset_obj = self.client.get_dataset(schema_name)
        if dataset_obj.labels:
            database_schema_request_obj.tags = []
            for label_classification, label_tag_name in dataset_obj.labels.items():
                database_schema_request_obj.tags.append(
                    get_tag_label(
                        metadata=self.metadata,
                        tag_name=label_tag_name,
                        classification_name=label_classification,
                    )
                )
        yield Either(right=database_schema_request_obj)

    def get_table_obj(self, table_name: str):
        schema_name = self.context.database_schema.name.__root__
        database = self.context.database.name.__root__
        bq_table_fqn = fqn._build(database, schema_name, table_name)
        return self.client.get_table(bq_table_fqn)

    def yield_table_tag_details(self, table_name_and_type: Tuple[str, str]):
        table_name, _ = table_name_and_type
        table_obj = self.get_table_obj(table_name=table_name)
        if table_obj.labels:
            for key, value in table_obj.labels.items():
                yield from get_ometa_tag_and_classification(
                    tags=[value],
                    classification_name=key,
                    tag_description="Bigquery Table Label",
                    classification_description="",
                )

    def get_tag_labels(self, table_name: str) -> Optional[List[TagLabel]]:
        """
        This will only get executed if the tags context
        is properly informed
        """
        table_tag_labels = super().get_tag_labels(table_name) or []
        table_obj = self.get_table_obj(table_name=table_name)
        if table_obj.labels:
            for key, _ in table_obj.labels.items():
                tag_label = get_tag_label(
                    metadata=self.metadata,
                    tag_name=key,
                    classification_name=key,
                )
                if tag_label:
                    table_tag_labels.append(tag_label)
        return table_tag_labels

    def get_column_tag_labels(
        self, table_name: str, column: dict
    ) -> Optional[List[TagLabel]]:
        """
        This will only get executed if the tags context
        is properly informed
        """
        if column.get("policy_tags"):
            return get_tag_labels(
                metadata=self.metadata,
                tags=[column["policy_tags"]],
                classification_name=column["taxonomy"],
                include_tags=self.source_config.includeTags,
            )
        return None

    def set_inspector(self, database_name: str):
        # TODO support location property in JSON Schema
        # TODO support OAuth 2.0 scopes
        kwargs = {}
        if isinstance(
            self.service_connection.credentials.gcpConfig, GcpCredentialsValues
        ):
            self.service_connection.credentials.gcpConfig.projectId = SingleProjectId(
                __root__=database_name
            )
            if self.service_connection.credentials.gcpImpersonateServiceAccount:
                kwargs[
                    "impersonate_service_account"
                ] = (
                    self.service_connection.credentials.gcpImpersonateServiceAccount.impersonateServiceAccount
                )

                kwargs[
                    "lifetime"
                ] = (
                    self.service_connection.credentials.gcpImpersonateServiceAccount.lifetime
                )

        self.client = get_bigquery_client(project_id=database_name, **kwargs)
        self.engine = get_connection(self.service_connection)
        self.inspector = inspect(self.engine)

    def get_database_names(self) -> Iterable[str]:
        for project_id in self.project_ids:
            database_fqn = fqn.build(
                self.metadata,
                entity_type=Database,
                service_name=self.context.database_service.name.__root__,
                database_name=project_id,
            )
            if filter_by_database(
                self.source_config.databaseFilterPattern,
                database_fqn if self.source_config.useFqnForFiltering else project_id,
            ):
                self.status.filter(database_fqn, "Database Filtered out")
            else:
                try:
                    self.set_inspector(database_name=project_id)
                    yield project_id
                except Exception as exc:
                    logger.debug(traceback.format_exc())
                    logger.error(
                        f"Error trying to connect to database {project_id}: {exc}"
                    )

    def get_view_definition(
        self, table_type: str, table_name: str, schema_name: str, inspector: Inspector
    ) -> Optional[str]:
        if table_type == TableType.View:
            try:
                view_definition = inspector.get_view_definition(
                    fqn._build(
                        self.context.database.name.__root__, schema_name, table_name
                    )
                )
                view_definition = (
                    "" if view_definition is None else str(view_definition)
                )
            except NotImplementedError:
                logger.warning("View definition not implemented")
                view_definition = ""
            return f"CREATE VIEW {schema_name}.{table_name} AS {view_definition}"
        return None

    def get_table_partition_details(
        self, table_name: str, schema_name: str, inspector: Inspector
    ) -> Tuple[bool, TablePartition]:
        """
        check if the table is partitioned table and return the partition details
        """
        database = self.context.database.name.__root__
        table = self.client.get_table(fqn._build(database, schema_name, table_name))
        if table.time_partitioning is not None:
            if table.time_partitioning.field:
                table_partition = TablePartition(
                    interval=str(table.time_partitioning.type_),
                    intervalType=IntervalType.TIME_UNIT.value,
                )
                table_partition.columns = [table.time_partitioning.field]
                return True, table_partition

            return True, TablePartition(
                interval=str(table.time_partitioning.type_),
                intervalType=IntervalType.INGESTION_TIME.value,
            )
        if table.range_partitioning:
            table_partition = TablePartition(
                intervalType=IntervalType.INTEGER_RANGE.value,
            )
            if hasattr(table.range_partitioning, "range_") and hasattr(
                table.range_partitioning.range_, "interval"
            ):
                table_partition.interval = table.range_partitioning.range_.interval
            if (
                hasattr(table.range_partitioning, "field")
                and table.range_partitioning.field
            ):
                table_partition.columns = [table.range_partitioning.field]
            return True, table_partition
        return False, None

    def clean_raw_data_type(self, raw_data_type):
        return raw_data_type.replace(", ", ",").replace(" ", ":").lower()

    def close(self):
        super().close()
        if self.temp_credentials:
            os.unlink(self.temp_credentials)
        os.environ.pop("GOOGLE_CLOUD_PROJECT", "")
        if isinstance(
            self.service_connection.credentials.gcpConfig, GcpCredentialsValues
        ) and (GOOGLE_CREDENTIALS in os.environ):
            tmp_credentials_file = os.environ[GOOGLE_CREDENTIALS]
            os.remove(tmp_credentials_file)
            del os.environ[GOOGLE_CREDENTIALS]

    def _get_source_url(
        self,
        database_name: Optional[str] = None,
        schema_name: Optional[str] = None,
        table_name: Optional[str] = None,
        type_infix: str = "4m3",
    ) -> Optional[str]:
        """
        Method to get the source url for bigquery
        """
        try:
            bigquery_host = "https://console.cloud.google.com/"
            database_url = f"{bigquery_host}bigquery?project={database_name}"

            schema_table_url = None
            if schema_name:
                schema_table_url = f"&ws=!1m4!1m3!3m2!1s{database_name}!2s{schema_name}"
            if table_name:
                schema_table_url = (
                    f"&ws=!1m5!1m4!{type_infix}!1s{database_name}"
                    f"!2s{schema_name}!3s{table_name}"
                )
            if schema_table_url:
                return f"{database_url}{schema_table_url}"
            return database_url
        except Exception as exc:
            logger.debug(traceback.format_exc())
            logger.warning(f"Unable to get source url: {exc}")
        return None

    def get_source_url(
        self,
        database_name: Optional[str] = None,
        schema_name: Optional[str] = None,
        table_name: Optional[str] = None,
        table_type: Optional[TableType] = None,
    ) -> Optional[str]:
        return self._get_source_url(
            database_name=database_name,
            schema_name=schema_name,
            table_name=table_name,
            # This infix identifies tables in the URL
            type_infix="4m3",
        )

    def get_stored_procedure_url(
        self,
        database_name: Optional[str] = None,
        schema_name: Optional[str] = None,
        table_name: Optional[str] = None,
    ) -> Optional[str]:
        return self._get_source_url(
            database_name=database_name,
            schema_name=schema_name,
            table_name=table_name,
            # This infix identifies Stored Procedures in the URL
            type_infix="6m3",
        )

    def get_stored_procedures(self) -> Iterable[BigQueryStoredProcedure]:
        """List BigQuery Stored Procedures"""
        if self.source_config.includeStoredProcedures:
            results = self.engine.execute(
                BIGQUERY_GET_STORED_PROCEDURES.format(
                    database_name=self.context.database.name.__root__,
                    schema_name=self.context.database_schema.name.__root__,
                )
            ).all()
            for row in results:
                stored_procedure = BigQueryStoredProcedure.parse_obj(dict(row))
                yield stored_procedure

    def yield_stored_procedure(
        self, stored_procedure: BigQueryStoredProcedure
    ) -> Iterable[Either[CreateStoredProcedureRequest]]:
        """Prepare the stored procedure payload"""

        try:
            yield Either(
                right=CreateStoredProcedureRequest(
                    name=EntityName(__root__=stored_procedure.name),
                    storedProcedureCode=StoredProcedureCode(
                        language=STORED_PROC_LANGUAGE_MAP.get(
                            stored_procedure.language or "SQL",
                        ),
                        code=stored_procedure.definition,
                    ),
                    databaseSchema=self.context.database_schema.fullyQualifiedName,
                    sourceUrl=SourceUrl(
                        __root__=self.get_stored_procedure_url(
                            database_name=self.context.database.name.__root__,
                            schema_name=self.context.database_schema.name.__root__,
                            # Follow the same building strategy as tables
                            table_name=stored_procedure.name,
                        )
                    ),
                )
            )
        except Exception as exc:
            yield Either(
                left=StackTraceError(
                    name=stored_procedure.name,
                    error=f"Error yielding Stored Procedure [{stored_procedure.name}] due to [{exc}]",
                    stack_trace=traceback.format_exc(),
                )
            )

    @lru_cache
    def procedure_queries_dict(
        self, schema_name: str, database_name: str
    ) -> Dict[str, List[QueryByProcedure]]:
        """
        Cache the queries ran for the stored procedures in the last `queryLogDuration` days.

        We will run this for each different and db name.

        The dictionary key will be the case-insensitive procedure name.
        """
        start, _ = get_start_and_end(self.source_config.queryLogDuration)
        results = self.engine.execute(
            BIGQUERY_GET_STORED_PROCEDURE_QUERIES.format(
                start_date=start,
            )
        ).all()

        queries_dict = defaultdict(list)

        for row in results:
            try:
                query_by_procedure = QueryByProcedure.parse_obj(dict(row))
                procedure_name = get_procedure_name_from_call(
                    query_text=query_by_procedure.procedure_text,
                    schema_name=schema_name,
                    database_name=database_name,
                )
                queries_dict[procedure_name].append(query_by_procedure)
            except Exception as exc:
                self.status.failed(
                    StackTraceError(
                        name="Stored Procedure",
                        error=f"Error trying to get procedure name due to [{exc}]",
                        stack_trace=traceback.format_exc(),
                    )
                )

        return queries_dict

    @staticmethod
    def is_lineage_query(query_type: str, query_text: str) -> bool:
        """Check if it's worth it to parse the query for lineage"""

        if query_type in ("MERGE", "UPDATE", "CREATE_TABLE_AS_SELECT"):
            return True

        if query_type == "INSERT" and re.search(
            "^.*insert.*into.*select.*$", query_text, re.IGNORECASE
        ):
            return True

        return False

    def get_stored_procedure_queries(self) -> Iterable[QueryByProcedure]:
        """
        Pick the stored procedure name from the context
        and return the list of associated queries
        """
        queries_dict = self.procedure_queries_dict(
            schema_name=self.context.database_schema.name.__root__,
            database_name=self.context.database.name.__root__,
        )

        for query_by_procedure in (
            queries_dict.get(self.context.stored_procedure.name.__root__.lower()) or []
        ):
            yield query_by_procedure

    def yield_procedure_lineage(
        self, query_by_procedure: QueryByProcedure
    ) -> Iterable[Either[AddLineageRequest]]:
        """Add procedure lineage from its query"""

        self.update_context(key="stored_procedure_query_lineage", value=False)
        if self.is_lineage_query(
            query_type=query_by_procedure.query_type,
            query_text=query_by_procedure.query_text,
        ):
            self.update_context(key="stored_procedure_query_lineage", value=True)

            for either_lineage in get_lineage_by_query(
                self.metadata,
                query=query_by_procedure.query_text,
                service_name=self.context.database_service.name.__root__,
                database_name=self.context.database.name.__root__,
                schema_name=self.context.database_schema.name.__root__,
                dialect=ConnectionTypeDialectMapper.dialect_of(
                    self.context.database_service.serviceType.value
                ),
                timeout_seconds=self.source_config.queryParsingTimeoutLimit,
                lineage_source=LineageSource.QueryLineage,
            ):
                if either_lineage.right.edge.lineageDetails:
                    either_lineage.right.edge.lineageDetails.pipeline = EntityReference(
                        id=self.context.stored_procedure.id,
                        type="storedProcedure",
                    )

                yield either_lineage

    def yield_procedure_query(
        self, query_by_procedure: QueryByProcedure
    ) -> Iterable[Either[CreateQueryRequest]]:
        """Check the queries triggered by the procedure and add their lineage, if any"""

        yield Either(
            right=CreateQueryRequest(
                query=SqlQuery(__root__=query_by_procedure.query_text),
                query_type=query_by_procedure.query_type,
                duration=query_by_procedure.query_duration,
                queryDate=Timestamp(
                    __root__=int(query_by_procedure.query_start_time.timestamp()) * 1000
                ),
                triggeredBy=EntityReference(
                    id=self.context.stored_procedure.id,
                    type="storedProcedure",
                ),
                processedLineage=bool(self.context.stored_procedure_query_lineage),
            )
        )
