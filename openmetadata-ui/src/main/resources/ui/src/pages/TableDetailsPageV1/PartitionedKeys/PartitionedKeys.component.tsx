/*
 *  Copyright 2023 Collate.
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
import { Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { t } from 'i18next';
import React, { useMemo } from 'react';
import Table from '../../../components/common/Table/Table';
import { useGenericContext } from '../../../components/Customization/GenericProvider/GenericProvider';
import {
  PartitionColumnDetails,
  Table as TableType,
} from '../../../generated/entity/data/table';

export const PartitionedKeys = () => {
  const { data } = useGenericContext<TableType>();

  const partitionColumnDetails = useMemo(
    () =>
      data?.tablePartition?.columns?.map((column) => ({
        ...column,
        key: column.columnName,
      })),
    [data?.tablePartition?.columns]
  );

  const columns = useMemo(() => {
    const data: ColumnsType<PartitionColumnDetails> = [
      {
        title: t('label.column'),
        dataIndex: 'columnName',
        key: 'columnName',
        ellipsis: true,
        width: '50%',
      },
      {
        title: t('label.type'),
        dataIndex: 'intervalType',
        key: 'intervalType',
        ellipsis: true,
        width: '50%',
        render: (text) => {
          return text ?? '--';
        },
      },
    ];

    return data;
  }, []);

  if (!data?.tablePartition) {
    return null;
  }

  return (
    <>
      <Typography.Text className="right-panel-label">
        {t('label.table-partition-plural')}
      </Typography.Text>
      <Table
        bordered
        columns={columns}
        data-testid="partitioned-column-table"
        dataSource={partitionColumnDetails}
        pagination={false}
        rowKey="name"
        size="small"
      />
    </>
  );
};
