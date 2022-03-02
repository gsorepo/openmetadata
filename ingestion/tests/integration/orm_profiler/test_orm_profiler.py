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
Test ORM Profiler workflow

To run this we need OpenMetadata server up and running.

No sample data is required beforehand
"""
from copy import deepcopy
from unittest import TestCase

import pytest
from sqlalchemy import Column, Integer, String, create_engine
from sqlalchemy.orm import declarative_base

from metadata.config.common import WorkflowExecutionError
from metadata.generated.schema.entity.data.table import Table
from metadata.ingestion.api.workflow import Workflow
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.ingestion.ometa.openmetadata_rest import MetadataServerConfig
from metadata.orm_profiler.api.workflow import ProfilerWorkflow
from metadata.orm_profiler.engines import create_and_bind_session

sqlite_shared = "file:cachedb?mode=memory&cache=shared"

ingestion_config = {
    "source": {
        "type": "sqlite",
        "config": {
            "service_name": "test_sqlite",
            "database": sqlite_shared,  # We need this to share the session
        },
    },
    "sink": {"type": "metadata-rest", "config": {}},
    "metadata_server": {
        "type": "metadata-server",
        "config": {
            "api_endpoint": "http://localhost:8585/api",
            "auth_provider_type": "no-auth",
        },
    },
}

Base = declarative_base()


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(256))
    fullname = Column(String(256))
    nickname = Column(String(256))
    age = Column(Integer)


class ProfilerWorkflowTest(TestCase):
    """
    Run the end to end workflow and validate
    """

    engine = create_engine(
        f"sqlite+pysqlite:///{sqlite_shared}", echo=True, future=True
    )
    session = create_and_bind_session(engine)

    server_config = MetadataServerConfig(api_endpoint="http://localhost:8585/api")
    metadata = OpenMetadata(server_config)

    @classmethod
    def setUpClass(cls) -> None:
        """
        Prepare Ingredients
        """
        cls.session.execute("DROP TABLE IF EXISTS USERS")
        User.__table__.create(bind=cls.engine)

        data = [
            User(name="John", fullname="John Doe", nickname="johnny b goode", age=30),
            User(name="Jane", fullname="Jone Doe", nickname=None, age=31),
        ]
        cls.session.add_all(data)
        cls.session.commit()

        ingestion_workflow = Workflow.create(ingestion_config)
        ingestion_workflow.execute()
        ingestion_workflow.raise_from_status()
        ingestion_workflow.print_status()
        ingestion_workflow.stop()

    def test_ingestion(self):
        """
        Validate that the ingestion ran correctly
        """

        table_entity: Table = self.metadata.get_by_name(
            entity=Table, fqdn="test_sqlite.main.users"
        )
        assert table_entity.fullyQualifiedName == "test_sqlite.main.users"

    def test_profiler_workflow(self):
        """
        Prepare and execute the profiler workflow
        on top of the Users table
        """
        workflow_config = deepcopy(ingestion_config)
        workflow_config["processor"] = {
            "type": "orm-profiler",
            "config": {
                "profiler": {
                    "name": "my_profiler",
                    "metrics": ["row_count", "min", "COUNT", "null_count"],
                },
                "tests": {
                    "name": "my_tests",
                    "table_tests": [
                        {
                            "name": "check row number",
                            "table": "test_sqlite.main.users",
                            "expression": "row_count == 2",
                        }
                    ],
                    "column_tests": [
                        {
                            "name": "some column tests",
                            "table": "test_sqlite.main.users",
                            "columns": [
                                {
                                    "name": "check name count",
                                    "column": "name",
                                    "expression": "count < 10",
                                },
                                {
                                    "name": "check null count",
                                    "column": "nickname",
                                    "expression": "null_count == 0",
                                },
                            ],
                        }
                    ],
                },
            },
        }

        profiler_workflow = ProfilerWorkflow.create(workflow_config)
        profiler_workflow.execute()
        status = profiler_workflow.print_status()
        profiler_workflow.stop()

        assert (
            status == 1
        )  # We have a test error, so we get a failure with exit status 1

        with pytest.raises(WorkflowExecutionError):
            profiler_workflow.raise_from_status()
