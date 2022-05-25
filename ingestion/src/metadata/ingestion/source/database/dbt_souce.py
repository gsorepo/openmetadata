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
DBT source methods.
"""
import traceback
from typing import Dict, List

from metadata.generated.schema.entity.data.table import (
    Column,
    DataModel,
    ModelType,
    Table,
)
from metadata.utils import fqn
from metadata.utils.column_type_parser import ColumnTypeParser
from metadata.utils.dbt_config import get_dbt_details
from metadata.utils.logger import ingestion_logger

logger = ingestion_logger()


class DBTSource:
    def __init__(self):
        dbt_details = get_dbt_details(self.source_config.dbtConfigSource)
        self.dbt_catalog = dbt_details[0] if dbt_details else None
        self.dbt_manifest = dbt_details[1] if dbt_details else None
        self.data_models: dict = {}

    def get_data_model(self, database: str, schema: str, table_name: str) -> DataModel:
        table_fqn = fqn.build(
            self.metadata,
            entity_type=Table,
            service_name=self.config.serviceName,
            database_name=database,
            schema_name=schema,
            table_name=table_name,
        )
        if table_fqn in self.data_models:
            model = self.data_models[table_fqn]
            return model
        return None

    def _parse_data_model(self):
        """
        Get all the DBT information and feed it to the Table Entity
        """
        if (
            self.source_config.dbtConfigSource
            and self.dbt_manifest
            and self.dbt_catalog
        ):
            logger.info("Parsing Data Models")
            manifest_entities = {
                **self.dbt_manifest["nodes"],
                **self.dbt_manifest["sources"],
            }
            catalog_entities = {
                **self.dbt_catalog["nodes"],
                **self.dbt_catalog["sources"],
            }

            for key, mnode in manifest_entities.items():
                try:
                    name = mnode["alias"] if "alias" in mnode.keys() else mnode["name"]
                    cnode = catalog_entities.get(key)
                    columns = (
                        self._parse_data_model_columns(name, mnode, cnode)
                        if cnode
                        else []
                    )

                    if mnode["resource_type"] == "test":
                        continue
                    upstream_nodes = self._parse_data_model_upstream(mnode)
                    model_name = (
                        mnode["alias"] if "alias" in mnode.keys() else mnode["name"]
                    )
                    database = mnode["database"]
                    schema = mnode["schema"]
                    raw_sql = mnode.get("raw_sql", "")
                    model = DataModel(
                        modelType=ModelType.DBT,
                        description=mnode.get("description", ""),
                        path=f"{mnode['root_path']}/{mnode['original_file_path']}",
                        rawSql=raw_sql,
                        sql=mnode.get("compiled_sql", raw_sql),
                        columns=columns,
                        upstream=upstream_nodes,
                    )
                    model_fqdn = fqn.build(
                        self.metadata,
                        entity_type=DataModel,
                        database_name=database,
                        schema_name=schema,
                        model_name=model_name,
                    )
                    self.data_models[model_fqdn] = model
                except Exception as err:
                    logger.debug(traceback.format_exc())
                    logger.error(err)

    def _parse_data_model_upstream(self, mnode):
        upstream_nodes = []
        if "depends_on" in mnode and "nodes" in mnode["depends_on"]:
            for node in mnode["depends_on"]["nodes"]:
                try:
                    _, database, table = node.split(".", 2)
                    table_fqn = fqn.build(
                        self.metadata,
                        entity_type=Table,
                        service_name=self.config.serviceName,
                        database_name=None,  # issue-5093 Read proper schema and db from manifest
                        schema_name=None,
                        table_name=table,
                    )
                    upstream_nodes.append(table_fqn)
                except Exception as err:  # pylint: disable=broad-except
                    logger.error(
                        f"Failed to parse the node {node} to capture lineage {err}"
                    )
                    continue
        return upstream_nodes

    def _parse_data_model_columns(
        self, model_name: str, mnode: Dict, cnode: Dict
    ) -> List[Column]:
        columns = []
        ccolumns = cnode.get("columns")
        manifest_columns = mnode.get("columns", {})
        for key in ccolumns:
            ccolumn = ccolumns[key]
            col_name = ccolumn["name"].lower()
            try:
                ctype = ccolumn["type"]
                col_type = ColumnTypeParser.get_column_type(ctype)
                description = manifest_columns.get(key.lower(), {}).get(
                    "description", None
                )
                if description is None:
                    description = ccolumn.get("comment", None)
                col = Column(
                    name=col_name,
                    description=description,
                    dataType=col_type,
                    dataLength=1,
                    ordinalPosition=ccolumn["index"],
                )
                columns.append(col)
            except Exception as err:  # pylint: disable=broad-except
                logger.error(f"Failed to parse column {col_name} due to {err}")

        return columns
