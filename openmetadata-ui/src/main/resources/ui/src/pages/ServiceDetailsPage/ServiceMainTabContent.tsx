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

import { Col, Row, Space, Switch, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { isUndefined } from 'lodash';
import { EntityTags, ServiceTypes } from 'Models';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import DescriptionV1 from '../../components/common/EntityDescription/DescriptionV1';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../components/common/Loader/Loader';
import NextPrevious from '../../components/common/NextPrevious/NextPrevious';
import { NextPreviousProps } from '../../components/common/NextPrevious/NextPrevious.interface';
import ResizablePanels from '../../components/common/ResizablePanels/ResizablePanels';
import EntityRightPanel from '../../components/Entity/EntityRightPanel/EntityRightPanel';
import { EntityName } from '../../components/Modals/EntityNameModal/EntityNameModal.interface';
import { COMMON_RESIZABLE_PANEL_CONFIG } from '../../constants/ResizablePanel.constants';
import { usePermissionProvider } from '../../context/PermissionProvider/PermissionProvider';
import { OperationPermission } from '../../context/PermissionProvider/PermissionProvider.interface';
import { EntityType } from '../../enums/entity.enum';
import { DatabaseService } from '../../generated/entity/services/databaseService';
import { Paging } from '../../generated/type/paging';
import { UsePagingInterface } from '../../hooks/paging/usePaging';
import { useFqn } from '../../hooks/useFqn';
import { ServicesType } from '../../interface/service.interface';
import {
  callServicePatchAPI,
  getServiceMainTabColumns,
} from '../../utils/ServiceMainTabContentUtils';
import { getEntityTypeFromServiceCategory } from '../../utils/ServiceUtils';
import { getTagsWithoutTier, getTierTags } from '../../utils/TableUtils';
import { createTagObject } from '../../utils/TagsUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import { ServicePageData } from './ServiceDetailsPage';

interface ServiceMainTabContentProps {
  serviceName: string;
  servicePermission: OperationPermission;
  serviceDetails: ServicesType;
  onDescriptionUpdate: (updatedHTML: string) => Promise<void>;
  showDeleted: boolean;
  onShowDeletedChange: (value: boolean) => void;
  data: ServicePageData[];
  isServiceLoading: boolean;
  paging: Paging;
  currentPage: number;
  pagingHandler: NextPreviousProps['pagingHandler'];
  saveUpdatedServiceData: (updatedData: ServicesType) => Promise<void>;
  pagingInfo: UsePagingInterface;
  isVersionPage?: boolean;
}

function ServiceMainTabContent({
  serviceName,
  servicePermission,
  onDescriptionUpdate,
  showDeleted,
  onShowDeletedChange,
  data,
  isServiceLoading,
  paging,
  pagingHandler,
  currentPage,
  serviceDetails,
  saveUpdatedServiceData,
  pagingInfo,
  isVersionPage = false,
}: Readonly<ServiceMainTabContentProps>) {
  const { t } = useTranslation();
  const { serviceCategory } = useParams<{
    serviceCategory: ServiceTypes;
  }>();

  const { fqn: serviceFQN } = useFqn();
  const { permissions } = usePermissionProvider();

  const [isEdit, setIsEdit] = useState(false);
  const [pageData, setPageData] = useState<ServicePageData[]>([]);

  const tier = getTierTags(serviceDetails?.tags ?? []);
  const tags = getTagsWithoutTier(serviceDetails?.tags ?? []);

  /**
   * Formulates updated tags and updates table entity data for API call
   * @param selectedTags
   */
  const onTagUpdate = async (selectedTags?: Array<EntityTags>) => {
    if (selectedTags) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedTable = { ...serviceDetails, tags: updatedTags };
      await saveUpdatedServiceData(updatedTable);
    }
  };

  const handleTagSelection = async (selectedTags: EntityTags[]) => {
    if (selectedTags) {
      const prevTags =
        tags?.filter((tag) =>
          selectedTags
            .map((selTag) => selTag.tagFQN)
            .includes(tag?.tagFQN as string)
        ) || [];
      const newTags = createTagObject(
        selectedTags.filter((tag) => {
          return !prevTags
            ?.map((prevTag) => prevTag.tagFQN)
            .includes(tag.tagFQN);
        })
      );

      await onTagUpdate([...prevTags, ...newTags]);
    }
  };

  const handleDescriptionUpdate = useCallback(async (updatedHTML: string) => {
    try {
      await onDescriptionUpdate(updatedHTML);
    } catch (e) {
      // Error
    } finally {
      setIsEdit(false);
    }
  }, []);

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };

  const onCancel = () => {
    setIsEdit(false);
  };

  const handleDisplayNameUpdate = useCallback(
    async (entityData: EntityName, id?: string) => {
      try {
        const pageDataDetails = pageData.find((data) => data.id === id);
        if (!pageDataDetails) {
          return;
        }
        const updatedData = {
          ...pageDataDetails,
          displayName: entityData.displayName || undefined,
        };
        const jsonPatch = compare(pageDataDetails, updatedData);
        await callServicePatchAPI(
          serviceCategory,
          pageDataDetails.id,
          jsonPatch
        );
        setPageData((prevData) =>
          prevData.map((data) =>
            data.id === id
              ? { ...data, displayName: entityData.displayName }
              : data
          )
        );
      } catch (error) {
        showErrorToast(error as AxiosError);
      }
    },
    [pageData, serviceCategory]
  );

  const editDisplayNamePermission = useMemo(() => {
    if (isVersionPage) {
      return false;
    }

    const servicePermissions = {
      databaseServices: permissions.databaseService,
      messagingServices: permissions.messagingService,
      dashboardServices: permissions.dashboardService,
      pipelineServices: permissions.pipelineService,
      mlmodelServices: permissions.mlmodelService,
      storageServices: permissions.storageService,
      searchServices: permissions.searchService,
      apiServices: permissions.apiService,
    };

    const currentPermission =
      servicePermissions[serviceCategory as keyof typeof servicePermissions];

    return (
      currentPermission?.EditAll || currentPermission?.EditDisplayName || false
    );
  }, [permissions, serviceCategory, isVersionPage]);

  const tableColumn: ColumnsType<ServicePageData> = useMemo(
    () =>
      getServiceMainTabColumns(
        serviceCategory,
        editDisplayNamePermission,
        handleDisplayNameUpdate
      ),
    [serviceCategory, handleDisplayNameUpdate, editDisplayNamePermission]
  );

  const entityType = useMemo(
    () => getEntityTypeFromServiceCategory(serviceCategory),
    [serviceCategory]
  );

  const {
    editTagsPermission,
    editGlossaryTermsPermission,
    editDescriptionPermission,
  } = useMemo(
    () => ({
      editTagsPermission:
        (servicePermission.EditTags || servicePermission.EditAll) &&
        !serviceDetails.deleted,
      editGlossaryTermsPermission:
        (servicePermission.EditGlossaryTerms || servicePermission.EditAll) &&
        !serviceDetails.deleted,
      editDescriptionPermission:
        (servicePermission.EditDescription || servicePermission.EditAll) &&
        !serviceDetails.deleted,
    }),
    [servicePermission, serviceDetails]
  );

  useEffect(() => {
    setPageData(data);
  }, [data]);

  return (
    <Row gutter={[0, 16]} wrap={false}>
      <Col className="tab-content-height-with-resizable-panel" span={24}>
        <ResizablePanels
          firstPanel={{
            className: 'entity-resizable-panel-container',
            children: (
              <div className="p-t-sm m-x-lg">
                <Row gutter={[16, 16]}>
                  <Col data-testid="description-container" span={24}>
                    <DescriptionV1
                      description={serviceDetails.description}
                      entityFqn={serviceFQN}
                      entityName={serviceName}
                      entityType={entityType}
                      hasEditAccess={editDescriptionPermission}
                      isEdit={isEdit}
                      showActions={!serviceDetails.deleted}
                      showCommentsIcon={false}
                      onCancel={onCancel}
                      onDescriptionEdit={onDescriptionEdit}
                      onDescriptionUpdate={handleDescriptionUpdate}
                    />
                  </Col>
                  <Col span={24}>
                    <Row justify="end">
                      <Col>
                        <Switch
                          checked={showDeleted}
                          data-testid="show-deleted"
                          onClick={onShowDeletedChange}
                        />
                        <Typography.Text className="m-l-xs">
                          {t('label.deleted')}
                        </Typography.Text>{' '}
                      </Col>
                    </Row>
                  </Col>
                  <Col data-testid="table-container" span={24}>
                    <Space
                      className="w-full m-b-md"
                      direction="vertical"
                      size="large">
                      {isServiceLoading ? (
                        <Loader />
                      ) : (
                        <Table
                          bordered
                          columns={tableColumn}
                          data-testid="service-children-table"
                          dataSource={pageData}
                          locale={{
                            emptyText: <ErrorPlaceHolder className="m-y-md" />,
                          }}
                          pagination={false}
                          rowKey="id"
                          size="small"
                        />
                      )}
                      {!isUndefined(pagingInfo) &&
                        pagingInfo.showPagination && (
                          <NextPrevious
                            currentPage={currentPage}
                            isLoading={isServiceLoading}
                            pageSize={pagingInfo.pageSize}
                            paging={paging}
                            pagingHandler={pagingHandler}
                            onShowSizeChange={pagingInfo.handlePageSizeChange}
                          />
                        )}
                    </Space>
                  </Col>
                </Row>
              </div>
            ),
            ...COMMON_RESIZABLE_PANEL_CONFIG.LEFT_PANEL,
          }}
          secondPanel={{
            children: (
              <div data-testid="entity-right-panel">
                <EntityRightPanel
                  dataProducts={
                    (serviceDetails as DatabaseService)?.dataProducts ?? []
                  }
                  domain={(serviceDetails as DatabaseService)?.domain}
                  editGlossaryTermsPermission={editGlossaryTermsPermission}
                  editTagPermission={editTagsPermission}
                  entityFQN={serviceFQN}
                  entityId={serviceDetails.id}
                  entityType={entityType}
                  selectedTags={tags}
                  showDataProductContainer={
                    entityType !== EntityType.METADATA_SERVICE
                  }
                  showTaskHandler={false}
                  onTagSelectionChange={handleTagSelection}
                />
              </div>
            ),
            ...COMMON_RESIZABLE_PANEL_CONFIG.RIGHT_PANEL,
            className:
              'entity-resizable-right-panel-container entity-resizable-panel-container',
          }}
        />
      </Col>
    </Row>
  );
}

export default ServiceMainTabContent;
