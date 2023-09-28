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
Helper module to handle data sampling
for the profiler
"""
import json
import math
import random
from typing import cast

from metadata.data_quality.validations.table.pandas.tableRowInsertedCountToBeBetween import (
    TableRowInsertedCountToBeBetweenValidator,
)
from metadata.generated.schema.entity.data.table import (
    PartitionIntervalType,
    PartitionProfilerConfig,
    ProfileSampleType,
    TableData,
)
from metadata.ingestion.source.database.datalake.columns import _get_root_col
from metadata.profiler.processor.sampler.sampler_interface import SamplerInterface
from metadata.utils.constants import COMPLEX_COLUMN_SEPARATOR


class DatalakeSampler(SamplerInterface):
    """
    Generates a sample of the data to not
    run the query in the whole table.
    """

    def _partitioned_table(self):
        """Get partitioned table"""
        self._partition_details = cast(PartitionProfilerConfig, self._partition_details)
        partition_field = self._partition_details.partitionColumnName
        if (
            self._partition_details.partitionIntervalType
            == PartitionIntervalType.COLUMN_VALUE
        ):
            return [
                df[df[partition_field].isin(self._partition_details.partitionValues)]
                for df in self.table
            ]
        if (
            self._partition_details.partitionIntervalType
            == PartitionIntervalType.INTEGER_RANGE
        ):
            return [
                df[
                    df[partition_field].between(
                        self._partition_details.partitionIntegerRangeStart,
                        self._partition_details.partitionIntegerRangeEnd,
                    )
                ]
                for df in self.table
            ]
        return [
            df[
                df[partition_field]
                >= TableRowInsertedCountToBeBetweenValidator._get_threshold_date(  # pylint: disable=protected-access
                    self._partition_details.partitionIntervalUnit.value,
                    self._partition_details.partitionInterval,
                )
            ]
            for df in self.table
        ]

    def _fetch_sample_data_from_user_query(self) -> TableData:
        """Fetch sample data from user query"""
        cols, rows = self.get_col_row(data_frame=self._rdn_sample_from_user_query())
        return TableData(columns=cols, rows=rows)

    def _rdn_sample_from_user_query(self):
        """Generate sample from user query"""
        return [df.query(self._profile_sample_query) for df in self.table]

    def _get_sampled_dataframe(self):
        """
        returns sampled ometa dataframes
        """
        random.shuffle(self.table)  # we'll shuffle the list of dataframes
        # sampling data based on profiler config (if any)
        if self.profile_sample_type == ProfileSampleType.PERCENTAGE:
            try:
                profile_sample = self.profile_sample / 100
            except TypeError:
                # if the profile sample is not a number or is None
                # we'll set it to 100
                profile_sample = self.profile_sample = 100
            return [
                df.sample(
                    frac=profile_sample,
                    random_state=random.randint(0, 100),
                    replace=True,
                )
                for df in self.table
            ]

        # we'll distribute the sample size equally among the dataframes
        sample_rows_per_chunk: int = math.floor(self.profile_sample / len(self.table))
        num_rows = sum(len(df) for df in self.table)

        # if we have less rows than the sample size
        # we'll return the whole table
        if sample_rows_per_chunk > num_rows:
            return self.table
        return [
            df.sample(
                n=sample_rows_per_chunk,
                random_state=random.randint(0, 100),
                replace=True,
            )
            for df in self.table
        ]

    def random_sample(self):
        """Generate random sample from the table

        Returns:
            List[DataFrame]
        """
        if self._profile_sample_query:
            return self._rdn_sample_from_user_query()

        if self._partition_details:
            self.table = self._partitioned_table()

        if not self.profile_sample:
            return self.table

        return self._get_sampled_dataframe()

    def get_col_row(self, data_frame):
        """
        Fetches columns and rows from the data_frame
        """
        result_rows = []

        for chunk in data_frame:
            row_df = self._fetch_rows_df(chunk)
            result_rows.extend(row_df.values.tolist()[: self.sample_limit])
            if len(result_rows) >= self.sample_limit:
                break
        cols = row_df.columns.tolist()
        return cols, result_rows

    @staticmethod
    def unflatten_dict(flat_dict):
        unflattened_dict = {}
        for key, value in flat_dict.items():
            keys = key.split(".")
            current_dict = unflattened_dict

            for key in keys[:-1]:
                current_dict = current_dict.setdefault(key, {})

            current_dict[keys[-1]] = value

        return unflattened_dict

    def _fetch_rows_df(self, data_frame):
        # pylint: disable=import-outside-toplevel
        import numpy as np
        import pandas as pd

        complex_columns = list(
            set(
                _get_root_col(col)
                for col in data_frame.columns
                if COMPLEX_COLUMN_SEPARATOR in col
            )
        )
        for complex_col in complex_columns or []:
            for df_col in data_frame.columns:
                if complex_col in df_col:
                    complex_col_name = ".".join(
                        df_col.split(COMPLEX_COLUMN_SEPARATOR)[1:]
                    )
                    if complex_col_name:
                        data_frame.rename(
                            columns={df_col: complex_col_name},
                            inplace=True,
                        )
        return pd.json_normalize(
            [
                self.unflatten_dict(json.loads(row_values))
                for row_values in data_frame.apply(
                    lambda row: row.to_json(), axis=1
                ).values
            ],
            max_level=0,
        ).replace(np.nan, None)

    def fetch_sample_data(self) -> TableData:
        """Fetch sample data from the table

        Returns:
            TableData:
        """
        if self._profile_sample_query:
            return self._fetch_sample_data_from_user_query()

        cols, rows = self.get_col_row(data_frame=self.table)
        return TableData(columns=cols, rows=rows)
