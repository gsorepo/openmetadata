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
import { FilterOutlined } from '@ant-design/icons';
import { Button, Col, Row, Typography } from 'antd';
import Tooltip from 'antd/es/tooltip';
import { ColumnsType, TableProps } from 'antd/lib/table';
import { AxiosError } from 'axios';
import NextPrevious from 'components/common/next-previous/NextPrevious';
import Table from 'components/common/Table/Table';
import { ColumnFilter } from 'components/Table/ColumnFilter/ColumnFilter.component';
import { PRIMERY_COLOR } from 'constants/constants';
import cronstrue from 'cronstrue';
import {
  IngestionPipeline,
  PipelineType,
} from 'generated/entity/services/ingestionPipelines/ingestionPipeline';
import { Paging } from 'generated/type/paging';
import { isNil, map, startCase } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  deployIngestionPipelineById,
  getIngestionPipelines,
} from 'rest/ingestionPipelineAPI';
import { showPagination } from 'utils/CommonUtils';
import { getEntityName } from 'utils/EntityUtils';
import { showErrorToast, showSuccessToast } from 'utils/ToastUtils';
import { IngestionRecentRuns } from '../IngestionRecentRun/IngestionRecentRuns.component';

export const IngestionPipelineList = ({
  serviceName,
}: {
  serviceName: string;
}) => {
  const [pipelines, setPipelines] = useState<Array<IngestionPipeline>>();
  const [pipelinePaging, setPipelinePaging] = useState<Paging>({ total: 0 });
  const [selectedPipelines, setSelectedPipelines] =
    useState<Array<IngestionPipeline>>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<Array<React.Key>>([]);
  const [deploying, setDeploying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pipelineTypeFilter, setPipelineTypeFilter] =
    useState<PipelineType[]>();
  const [pageSize, setPageSize] = useState(10);
  const { t } = useTranslation();

  const renderNameField = (_: string, record: IngestionPipeline) => {
    return (
      <Tooltip
        title={t('label.view-entity', {
          entity: t('label.dag'),
        })}>
        <Typography.Link
          className="m-r-xs overflow-wrap-anywhere"
          data-testid="ingestion-dag-link"
          rel="noopener noreferrer"
          target="_blank">
          {getEntityName(record)}
        </Typography.Link>
      </Tooltip>
    );
  };

  const renderScheduleField = (_: string, record: IngestionPipeline) => {
    return record.airflowConfig?.scheduleInterval ? (
      <Tooltip
        placement="bottom"
        title={cronstrue.toString(record.airflowConfig.scheduleInterval, {
          use24HourTimeFormat: true,
          verbose: true,
        })}>
        {record.airflowConfig.scheduleInterval}
      </Tooltip>
    ) : (
      <span>--</span>
    );
  };

  const tableColumn: ColumnsType<IngestionPipeline> = useMemo(
    () => [
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        width: 500,
        render: renderNameField,
      },
      {
        title: t('label.type'),
        dataIndex: 'pipelineType',
        key: 'pipelineType',
        filterDropdown: ColumnFilter,
        filterIcon: (filtered: boolean) => (
          <FilterOutlined
            style={{ color: filtered ? PRIMERY_COLOR : undefined }}
          />
        ),
        filters: map(PipelineType, (value) => ({
          text: startCase(value),
          value,
        })),
        filtered: !isNil(pipelineTypeFilter),
        filteredValue: pipelineTypeFilter,
      },
      {
        title: t('label.schedule'),
        dataIndex: 'schedule',
        key: 'schedule',
        render: renderScheduleField,
      },
      {
        title: t('label.recent-run-plural'),
        dataIndex: 'recentRuns',
        key: 'recentRuns',
        width: 180,
        render: (_, record) => (
          <IngestionRecentRuns classNames="align-middle" ingestion={record} />
        ),
      },
    ],
    [renderScheduleField, renderNameField]
  );

  const handleBulkRedeploy = async () => {
    const selectedPipelines =
      pipelines?.filter(
        (p) =>
          p.fullyQualifiedName &&
          selectedRowKeys.indexOf(p.fullyQualifiedName) > -1
      ) ?? [];

    const promises = (selectedPipelines ?? [])?.map((pipeline) =>
      deployIngestionPipelineById(pipeline.id ?? '')
    );

    setDeploying(true);

    try {
      await Promise.all(promises);

      showSuccessToast(
        `${t('label.pipeline-plural')}  ${t('label.re-deploy')}  ${t(
          'label.successfully-lowercase'
        )}`
      );
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.ingestion-workflow-operation-error', {
          operation: 'updating',
          displayName: '',
        })
      );
    } finally {
      setPipelineTypeFilter(undefined);
      setSelectedRowKeys([]);
      setDeploying(false);
    }
  };

  const fetchPipelines = async ({
    cursor,
    pipelineType,
    limit,
  }: {
    cursor?: string;
    pipelineType?: PipelineType[];
    limit?: number;
  }) => {
    setLoading(true);
    try {
      const { data, paging } = await getIngestionPipelines({
        arrQueryFields: ['owner'],
        serviceType: serviceName,
        paging: cursor,
        pipelineType,
        limit,
      });

      setPipelines(data);
      setPipelinePaging(paging);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (cursor: string | number, activePage?: number) => {
    const pagingString = `&${cursor}=${pipelinePaging[cursor as keyof Paging]}`;

    fetchPipelines({ cursor: pagingString, limit: pageSize });
    setCurrentPage(activePage ?? 1);
  };

  useEffect(() => {
    fetchPipelines({ limit: pageSize });
  }, [serviceName]);

  const handleTableChange: TableProps<IngestionPipeline>['onChange'] = (
    _pagination,
    filters
  ) => {
    const pipelineType = filters.pipelineType as PipelineType[];
    setPipelineTypeFilter(pipelineType);
    fetchPipelines({
      pipelineType,
      limit: pageSize,
    });
  };

  const handlePageSizeChange = (size: number) => {
    setPageSize(size);
    fetchPipelines({ pipelineType: pipelineTypeFilter, limit: size });
  };

  return (
    <Row gutter={[16, 16]}>
      <Col className="text-right" span={24}>
        <Button
          disabled={selectedPipelines?.length === 0}
          loading={deploying}
          type="primary"
          onClick={handleBulkRedeploy}>
          {t('label.re-deploy')}
        </Button>
      </Col>
      <Col span={24}>
        <Table
          columns={tableColumn}
          dataSource={pipelines}
          loading={loading}
          pagination={false}
          rowKey="fullyQualifiedName"
          rowSelection={{
            type: 'checkbox',
            onChange: (
              selectedRowKeys: React.Key[],
              selectedRows: IngestionPipeline[]
            ) => {
              setSelectedPipelines(selectedRows);
              setSelectedRowKeys(selectedRowKeys);
            },
            getCheckboxProps: (record: IngestionPipeline) => ({
              name: record.fullyQualifiedName,
            }),
            selectedRowKeys,
          }}
          size="small"
          onChange={handleTableChange}
        />
      </Col>
      <Col span={24}>
        {showPagination(pipelinePaging) && (
          <NextPrevious
            showPageSize
            currentPage={currentPage}
            pageSize={pageSize}
            paging={pipelinePaging}
            pagingHandler={handlePageChange}
            onShowSizeChange={handlePageSizeChange}
          />
        )}
      </Col>
    </Row>
  );
};
