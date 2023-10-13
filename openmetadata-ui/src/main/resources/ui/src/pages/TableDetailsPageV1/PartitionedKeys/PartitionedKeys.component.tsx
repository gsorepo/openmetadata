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
import { Space, Typography } from 'antd';
import { t } from 'i18next';
import React from 'react';
import { TablePartition } from '../../../generated/entity/data/table';

interface PartitionedKeysProps {
  tablePartition: TablePartition;
}

export const PartitionedKeys = ({ tablePartition }: PartitionedKeysProps) => {
  return (
    <Space className="p-b-sm" direction="vertical">
      <Typography.Text className="right-panel-label">
        {t('label.table-partitioned')}
      </Typography.Text>
      <Typography.Text>
        {`${t('label.interval')} - ${tablePartition.intervalType}`}
      </Typography.Text>
      <Space>
        {`${t('label.column-plural')} -
        ${tablePartition.columns?.map((column) => column)}`}
      </Space>
    </Space>
  );
};
