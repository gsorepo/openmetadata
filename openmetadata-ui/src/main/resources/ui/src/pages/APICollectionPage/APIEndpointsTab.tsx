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

import { Col, Row, Switch, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { AxiosError } from 'axios';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import NextPrevious from '../../components/common/NextPrevious/NextPrevious';
import { PagingHandlerParams } from '../../components/common/NextPrevious/NextPrevious.interface';
import RichTextEditorPreviewerV1 from '../../components/common/RichTextEditor/RichTextEditorPreviewerV1';
import TableAntd from '../../components/common/Table/Table';
import { useGenericContext } from '../../components/Customization/GenericProvider/GenericProvider';
import { NO_DATA, PAGE_SIZE } from '../../constants/constants';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import { EntityType, TabSpecificField } from '../../enums/entity.enum';
import { APICollection } from '../../generated/entity/data/apiCollection';
import { APIEndpoint } from '../../generated/entity/data/apiEndpoint';
import { Include } from '../../generated/type/include';
import { usePaging } from '../../hooks/paging/usePaging';
import { useFqn } from '../../hooks/useFqn';
import { useTableFilters } from '../../hooks/useTableFilters';
import {
  getApiEndPoints,
  GetApiEndPointsType,
} from '../../rest/apiEndpointsAPI';
import entityUtilClassBase from '../../utils/EntityUtilClassBase';
import { getEntityName } from '../../utils/EntityUtils';
import { showErrorToast } from '../../utils/ToastUtils';

interface APIEndpointsTabProps {
  isVersionView?: boolean;
}

function APIEndpointsTab({
  isVersionView = false,
}: Readonly<APIEndpointsTabProps>) {
  const { t } = useTranslation();
  const { fqn: decodedAPICollectionFQN } = useFqn();
  const { data: apiCollection } = useGenericContext<APICollection>();
  const [apiEndpoints, setAPIEndpoints] = useState<APIEndpoint[]>([]);
  const [apiEndpointsLoading, setAPIEndpointsLoading] =
    useState<boolean>(false);
  const {
    paging,
    handlePageChange,
    currentPage,
    showPagination,
    pageSize,
    handlePagingChange,
    handlePageSizeChange,
  } = usePaging(PAGE_SIZE);
  const { filters, setFilters } = useTableFilters({
    showDeletedEndpoints: false,
  });

  const getAPICollectionEndpoints = useCallback(
    async (params?: Pick<GetApiEndPointsType, 'paging'>) => {
      if (!apiCollection) {
        return;
      }

      setAPIEndpointsLoading(true);
      try {
        const res = await getApiEndPoints({
          ...params,
          fields: TabSpecificField.OWNERS,
          apiCollection: decodedAPICollectionFQN,
          service: apiCollection?.service?.fullyQualifiedName ?? '',
          include: filters.showDeletedEndpoints
            ? Include.Deleted
            : Include.NonDeleted,
        });
        setAPIEndpoints(res.data);
        handlePagingChange(res.paging);
      } catch (err) {
        showErrorToast(err as AxiosError);
      } finally {
        setAPIEndpointsLoading(false);
      }
    },
    [decodedAPICollectionFQN, filters.showDeletedEndpoints, apiCollection]
  );

  const tableColumn: ColumnsType<APIEndpoint> = useMemo(
    () => [
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        width: 400,
        render: (_, record: APIEndpoint) => {
          return (
            <div className="d-inline-flex w-max-90">
              <Link
                className="break-word"
                data-testid={record.name}
                to={entityUtilClassBase.getEntityLink(
                  EntityType.API_ENDPOINT,
                  record.fullyQualifiedName as string
                )}>
                {getEntityName(record)}
              </Link>
            </div>
          );
        },
      },
      {
        title: t('label.request-method'),
        dataIndex: 'requestMethod',
        key: 'requestMethod',

        render: (requestMethod: APIEndpoint['requestMethod']) => {
          return <Typography.Text>{requestMethod || NO_DATA}</Typography.Text>;
        },
      },
      {
        title: t('label.description'),
        dataIndex: 'description',
        key: 'description',
        render: (text: string) =>
          text?.trim() ? (
            <RichTextEditorPreviewerV1 markdown={text} />
          ) : (
            <span className="text-grey-muted">{t('label.no-description')}</span>
          ),
      },
    ],
    []
  );

  const handleEndpointsPagination = useCallback(
    ({ cursorType, currentPage }: PagingHandlerParams) => {
      if (cursorType) {
        getAPICollectionEndpoints({
          paging: {
            [cursorType]: paging[cursorType],
          },
        });
      }
      handlePageChange(currentPage);
    },
    [paging, getAPICollectionEndpoints]
  );

  useEffect(() => {
    getAPICollectionEndpoints();
  }, [apiCollection]);

  return (
    <Row gutter={[16, 16]}>
      {!isVersionView && (
        <Col span={24}>
          <Row justify="end">
            <Col>
              <Switch
                checked={filters.showDeletedEndpoints}
                data-testid="show-deleted"
                onClick={() =>
                  setFilters({
                    ...filters,
                    showDeletedEndpoints: !filters.showDeletedEndpoints,
                  })
                }
              />
              <Typography.Text className="m-l-xs">
                {t('label.deleted')}
              </Typography.Text>{' '}
            </Col>
          </Row>
        </Col>
      )}

      <Col span={24}>
        <TableAntd
          bordered
          columns={tableColumn}
          data-testid="databaseSchema-tables"
          dataSource={apiEndpoints}
          loading={apiEndpointsLoading}
          locale={{
            emptyText: (
              <ErrorPlaceHolder
                className="mt-0-important"
                type={ERROR_PLACEHOLDER_TYPE.NO_DATA}
              />
            ),
          }}
          pagination={false}
          rowKey="id"
          size="small"
        />
      </Col>
      {showPagination && (
        <Col span={24}>
          <NextPrevious
            currentPage={currentPage}
            isLoading={apiEndpointsLoading}
            pageSize={pageSize}
            paging={paging}
            pagingHandler={handleEndpointsPagination}
            onShowSizeChange={handlePageSizeChange}
          />
        </Col>
      )}
    </Row>
  );
}

export default APIEndpointsTab;
