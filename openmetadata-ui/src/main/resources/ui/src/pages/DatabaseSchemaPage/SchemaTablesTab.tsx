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
import { compare } from 'fast-json-patch';
import { isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import DisplayName from '../../components/common/DisplayName/DisplayName';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import NextPrevious from '../../components/common/NextPrevious/NextPrevious';
import { PagingHandlerParams } from '../../components/common/NextPrevious/NextPrevious.interface';
import RichTextEditorPreviewerV1 from '../../components/common/RichTextEditor/RichTextEditorPreviewerV1';
import TableAntd from '../../components/common/Table/Table';
import { useGenericContext } from '../../components/Customization/GenericProvider/GenericProvider';
import { EntityName } from '../../components/Modals/EntityNameModal/EntityNameModal.interface';
import {
  INITIAL_PAGING_VALUE,
  INITIAL_TABLE_FILTERS,
  PAGE_SIZE,
} from '../../constants/constants';
import { usePermissionProvider } from '../../context/PermissionProvider/PermissionProvider';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import { EntityType } from '../../enums/entity.enum';
import { DatabaseSchema } from '../../generated/entity/data/databaseSchema';
import { Table } from '../../generated/entity/data/table';
import { Include } from '../../generated/type/include';
import { usePaging } from '../../hooks/paging/usePaging';
import { useFqn } from '../../hooks/useFqn';
import { useTableFilters } from '../../hooks/useTableFilters';
import {
  getTableList,
  patchTableDetails,
  TableListParams,
} from '../../rest/tableAPI';
import entityUtilClassBase from '../../utils/EntityUtilClassBase';
import { showErrorToast } from '../../utils/ToastUtils';

interface SchemaTablesTabProps {
  isVersionView?: boolean;
}

function SchemaTablesTab({
  isVersionView = false,
}: Readonly<SchemaTablesTabProps>) {
  const { t } = useTranslation();
  const [tableData, setTableData] = useState<Array<Table>>([]);
  const [tableDataLoading, setTableDataLoading] = useState<boolean>(true);
  const { permissions } = usePermissionProvider();
  const { fqn: decodedDatabaseSchemaFQN } = useFqn();
  const pagingInfo = usePaging(PAGE_SIZE);
  const { data: databaseSchemaDetails, permissions: databaseSchemaPermission } =
    useGenericContext<DatabaseSchema>();

  const { filters: tableFilters, setFilters } = useTableFilters(
    INITIAL_TABLE_FILTERS
  );

  const {
    paging,
    pageSize,
    handlePagingChange,
    currentPage,
    handlePageChange,
    pagingCursor,
  } = pagingInfo;

  const allowEditDisplayNamePermission = useMemo(() => {
    return (
      !isVersionView &&
      (permissions.table.EditAll || permissions.table.EditDisplayName)
    );
  }, [permissions, isVersionView]);

  const { viewDatabaseSchemaPermission } = useMemo(
    () => ({
      viewDatabaseSchemaPermission:
        databaseSchemaPermission.ViewAll || databaseSchemaPermission.ViewBasic,
    }),
    [databaseSchemaPermission?.ViewAll, databaseSchemaPermission?.ViewBasic]
  );

  const handleDisplayNameUpdate = useCallback(
    async (data: EntityName, id?: string) => {
      try {
        const tableDetails = tableData.find((table) => table.id === id);
        if (!tableDetails) {
          return;
        }
        const updatedData = {
          ...tableDetails,
          displayName: data.displayName || undefined,
        };
        const jsonPatch = compare(tableDetails, updatedData);
        const response = await patchTableDetails(tableDetails.id, jsonPatch);

        setTableData((prevData) =>
          prevData.map((table) => (table.id === id ? response : table))
        );
      } catch (error) {
        showErrorToast(error as AxiosError);
      }
    },
    [tableData]
  );

  const handleShowDeletedTables = (value: boolean) => {
    setFilters({ showDeletedTables: value });
    handlePageChange(INITIAL_PAGING_VALUE);
  };

  const getSchemaTables = useCallback(
    async (params?: TableListParams) => {
      setTableDataLoading(true);
      try {
        const res = await getTableList({
          ...params,
          databaseSchema: decodedDatabaseSchemaFQN,
          limit: pageSize,
          include: tableFilters.showDeletedTables
            ? Include.Deleted
            : Include.NonDeleted,
        });
        setTableData(res.data);
        handlePagingChange(res.paging);
      } catch (err) {
        showErrorToast(err as AxiosError);
      } finally {
        setTableDataLoading(false);
      }
    },
    [decodedDatabaseSchemaFQN, tableFilters.showDeletedTables, pageSize]
  );

  const tablePaginationHandler = useCallback(
    ({ cursorType, currentPage }: PagingHandlerParams) => {
      if (cursorType && paging[cursorType]) {
        getSchemaTables({ [cursorType]: paging[cursorType] });
        handlePageChange(
          currentPage,
          {
            cursorType: cursorType,
            cursorValue: paging[cursorType],
          },
          pageSize
        );
      }
      handlePageChange(currentPage);
    },
    [paging, getSchemaTables, handlePageChange]
  );

  const tableColumn: ColumnsType<Table> = useMemo(
    () => [
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        width: 500,
        render: (_, record: Table) => {
          return (
            <DisplayName
              allowRename={allowEditDisplayNamePermission}
              displayName={record.displayName}
              id={record.id}
              key={record.id}
              link={entityUtilClassBase.getEntityLink(
                EntityType.TABLE,
                record.fullyQualifiedName as string
              )}
              name={record.name}
              onEditDisplayName={handleDisplayNameUpdate}
            />
          );
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
    [handleDisplayNameUpdate, allowEditDisplayNamePermission]
  );

  useEffect(() => {
    if (viewDatabaseSchemaPermission && decodedDatabaseSchemaFQN) {
      if (pagingCursor?.cursorData?.cursorType) {
        // Fetch data if cursorType is present in state with cursor Value to handle browser back navigation
        getSchemaTables({
          [pagingCursor?.cursorData?.cursorType]:
            pagingCursor?.cursorData?.cursorValue,
        });
      } else {
        // Otherwise, just fetch the data without cursor value
        getSchemaTables({ limit: pageSize });
      }
    }
  }, [
    tableFilters.showDeletedTables,
    decodedDatabaseSchemaFQN,
    viewDatabaseSchemaPermission,

    pageSize,
  ]);

  useEffect(() => {
    setFilters({ showDeletedTables: databaseSchemaDetails.deleted ?? false });
  }, [databaseSchemaDetails.deleted]);

  return (
    <Row gutter={[16, 16]}>
      {!isVersionView && (
        <Col span={24}>
          <Row justify="end">
            <Col>
              <Switch
                checked={tableFilters.showDeletedTables}
                data-testid="show-deleted"
                onClick={handleShowDeletedTables}
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
          dataSource={tableData}
          loading={tableDataLoading}
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
      {!isUndefined(pagingInfo) && pagingInfo.showPagination && (
        <Col span={24}>
          <NextPrevious
            currentPage={currentPage}
            isLoading={tableDataLoading}
            pageSize={pagingInfo.pageSize}
            paging={pagingInfo.paging}
            pagingHandler={tablePaginationHandler}
            onShowSizeChange={pagingInfo.handlePageSizeChange}
          />
        </Col>
      )}
    </Row>
  );
}

export default SchemaTablesTab;
