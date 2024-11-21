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
Base source for the data quality used to instantiate a data quality runner with its interface
"""
from copy import deepcopy
from typing import Optional, cast

from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeMeta

from metadata.data_quality.interface.test_suite_interface import TestSuiteInterface
from metadata.data_quality.runner.core import DataTestsRunner
from metadata.generated.schema.entity.data.table import Table
from metadata.generated.schema.entity.services.databaseService import DatabaseConnection
from metadata.generated.schema.entity.services.serviceType import ServiceType
from metadata.generated.schema.metadataIngestion.testSuitePipeline import (
    TestSuitePipeline,
)
from metadata.generated.schema.metadataIngestion.workflow import (
    OpenMetadataWorkflowConfig,
)
from metadata.generated.schema.type.entityReference import EntityReference
from metadata.ingestion.ometa.ometa_api import OpenMetadata
from metadata.profiler.orm.converter.base import ometa_to_sqa_orm
from metadata.sampler.models import SampleConfig
from metadata.sampler.sampler_interface import SamplerInterface
from metadata.utils.constants import NON_SQA_DATABASE_CONNECTIONS
from metadata.utils.profiler_utils import get_context_entities
from metadata.utils.service_spec.service_spec import (
    import_sampler_class,
    import_test_suite_class,
)


class BaseTestSuiteRunner:
    """Base class for the data quality runner"""

    def __init__(
        self,
        config: OpenMetadataWorkflowConfig,
        ometa_client: OpenMetadata,
        entity: Table,
    ):
        self._interface = None
        self._interface_type: str = config.source.type.lower()
        self.entity = entity
        self.service_conn_config = self._copy_service_config(config, self.entity.database)  # type: ignore
        self.source_config = TestSuitePipeline.model_validate(
            config.source.sourceConfig.config
        )
        self.ometa_client = ometa_client

    @property
    def interface(self) -> Optional[TestSuiteInterface]:
        return self._interface

    @interface.setter
    def interface(self, interface):
        self._interface = interface

    def _copy_service_config(
        self, config: OpenMetadataWorkflowConfig, database: EntityReference
    ) -> DatabaseConnection:
        """Make a copy of the service config and update the database name

        Args:
            database (_type_): a database entity

        Returns:
            DatabaseService.__config__
        """
        config_copy = deepcopy(
            config.source.serviceConnection.root.config  # type: ignore
        )
        if hasattr(
            config_copy,  # type: ignore
            "supportsDatabase",
        ):
            if hasattr(config_copy, "database"):
                config_copy.database = database.name  # type: ignore
            if hasattr(config_copy, "catalog"):
                config_copy.catalog = database.name  # type: ignore

        # we know we'll only be working with DatabaseConnection, we cast the type to satisfy type checker
        config_copy = cast(DatabaseConnection, config_copy)

        return config_copy

    def _build_table_orm(self, entity: Table) -> Optional[DeclarativeMeta]:
        """Build the ORM table if needed for the sampler and profiler interfaces"""
        if self.service_conn_config.type.value not in NON_SQA_DATABASE_CONNECTIONS:
            return ometa_to_sqa_orm(entity, self.ometa_client, MetaData())
        return None

    def create_data_quality_interface(self) -> TestSuiteInterface:
        """Create data quality interface

        Returns:
            TestSuiteInterface: a data quality interface
        """
        schema_entity, database_entity, _ = get_context_entities(
            entity=self.entity, metadata=self.ometa_client
        )
        test_suite_class = import_test_suite_class(
            ServiceType.Database,
            source_type=self._interface_type,
            source_config_type=self.service_conn_config.type.value,
        )
        sampler_class = import_sampler_class(
            ServiceType.Database,
            source_type=self._interface_type,
            source_config_type=self.service_conn_config.type.value,
        )
        # This is shared between the sampler and DQ interfaces
        _orm = self._build_table_orm(self.entity)
        sampler_interface: SamplerInterface = sampler_class.create(
            service_connection_config=self.service_conn_config,
            ometa_client=self.ometa_client,
            entity=self.entity,
            schema_entity=schema_entity,
            database_entity=database_entity,
            default_sample_config=SampleConfig(
                profile_sample=self.source_config.profileSample,
                profile_sample_type=self.source_config.profileSampleType,
                sampling_method_type=self.source_config.samplingMethodType,
            ),
            orm_table=_orm,
        )

        self.interface: TestSuiteInterface = test_suite_class.create(
            self.service_conn_config,
            self.ometa_client,
            sampler_interface,
            self.entity,
            orm_table=_orm,
        )
        return self.interface

    def get_data_quality_runner(self) -> DataTestsRunner:
        """Get a data quality runner

        Returns:
            DataTestsRunner: a data quality runner
        """
        return DataTestsRunner(self.create_data_quality_interface())
