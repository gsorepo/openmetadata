/*
 *  Copyright 2022 Collate.
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

import { Col, Row, Skeleton, Tabs, TabsProps } from 'antd';
import { AxiosError } from 'axios';
import { compare, Operation } from 'fast-json-patch';
import { isEmpty, isUndefined } from 'lodash';
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { withActivityFeed } from '../../components/AppRouter/withActivityFeed';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../components/common/Loader/Loader';
import { GenericProvider } from '../../components/Customization/GenericProvider/GenericProvider';
import { DataAssetsHeader } from '../../components/DataAssets/DataAssetsHeader/DataAssetsHeader.component';
import ProfilerSettings from '../../components/Database/Profiler/ProfilerSettings/ProfilerSettings';
import { QueryVote } from '../../components/Database/TableQueries/TableQueries.interface';
import { EntityName } from '../../components/Modals/EntityNameModal/EntityNameModal.interface';
import PageLayoutV1 from '../../components/PageLayoutV1/PageLayoutV1';
import {
  getEntityDetailsPath,
  getVersionPath,
  INITIAL_PAGING_VALUE,
  INITIAL_TABLE_FILTERS,
  ROUTES,
} from '../../constants/constants';
import { FEED_COUNT_INITIAL_DATA } from '../../constants/entity.constants';
import { usePermissionProvider } from '../../context/PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../../context/PermissionProvider/PermissionProvider.interface';
import { ClientErrors } from '../../enums/Axios.enum';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import {
  EntityTabs,
  EntityType,
  TabSpecificField,
} from '../../enums/entity.enum';
import { Tag } from '../../generated/entity/classification/tag';
import { DatabaseSchema } from '../../generated/entity/data/databaseSchema';
import { PageType } from '../../generated/system/ui/page';
import { Include } from '../../generated/type/include';
import { useCustomPages } from '../../hooks/useCustomPages';
import { useFqn } from '../../hooks/useFqn';
import { useTableFilters } from '../../hooks/useTableFilters';
import { FeedCounts } from '../../interface/feed.interface';
import {
  getDatabaseSchemaDetailsByFQN,
  patchDatabaseSchemaDetails,
  restoreDatabaseSchema,
  updateDatabaseSchemaVotes,
} from '../../rest/databaseAPI';
import { getStoredProceduresList } from '../../rest/storedProceduresAPI';
import { getTableList } from '../../rest/tableAPI';
import { getEntityMissingError, getFeedCounts } from '../../utils/CommonUtils';
import {
  getDetailsTabWithNewLabel,
  getTabLabelMapFromTabs,
} from '../../utils/CustomizePage/CustomizePageUtils';
import databaseSchemaClassBase from '../../utils/DatabaseSchemaClassBase';
import entityUtilClassBase from '../../utils/EntityUtilClassBase';
import { getEntityName } from '../../utils/EntityUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { updateTierTag } from '../../utils/TagsUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';

const DatabaseSchemaPage: FunctionComponent = () => {
  const { t } = useTranslation();
  const { getEntityPermissionByFqn } = usePermissionProvider();

  const { setFilters, filters } = useTableFilters(INITIAL_TABLE_FILTERS);
  const { tab: activeTab = EntityTabs.TABLE } =
    useParams<{ tab: EntityTabs }>();
  const { fqn: decodedDatabaseSchemaFQN } = useFqn();
  const history = useHistory();

  const [isPermissionsLoading, setIsPermissionsLoading] = useState(true);
  const [databaseSchema, setDatabaseSchema] = useState<DatabaseSchema>(
    {} as DatabaseSchema
  );
  const [isSchemaDetailsLoading, setIsSchemaDetailsLoading] =
    useState<boolean>(true);
  const [feedCount, setFeedCount] = useState<FeedCounts>(
    FEED_COUNT_INITIAL_DATA
  );
  const { customizedPage } = useCustomPages(PageType.DatabaseSchema);
  const [databaseSchemaPermission, setDatabaseSchemaPermission] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);
  const [storedProcedureCount, setStoredProcedureCount] = useState(0);
  const [tableCount, setTableCount] = useState(0);

  const [updateProfilerSetting, setUpdateProfilerSetting] =
    useState<boolean>(false);

  const extraDropdownContent = useMemo(
    () =>
      entityUtilClassBase.getManageExtraOptions(
        EntityType.DATABASE_SCHEMA,
        decodedDatabaseSchemaFQN,
        databaseSchemaPermission
      ),
    [databaseSchemaPermission, decodedDatabaseSchemaFQN]
  );

  const { version: currentVersion, id: databaseSchemaId = '' } = useMemo(
    () => databaseSchema,
    [databaseSchema]
  );

  const fetchDatabaseSchemaPermission = useCallback(async () => {
    setIsPermissionsLoading(true);
    try {
      const response = await getEntityPermissionByFqn(
        ResourceEntity.DATABASE_SCHEMA,
        decodedDatabaseSchemaFQN
      );
      setDatabaseSchemaPermission(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsPermissionsLoading(false);
    }
  }, [decodedDatabaseSchemaFQN]);

  const viewDatabaseSchemaPermission = useMemo(
    () =>
      databaseSchemaPermission.ViewAll || databaseSchemaPermission.ViewBasic,
    [databaseSchemaPermission?.ViewAll, databaseSchemaPermission?.ViewBasic]
  );

  const handleFeedCount = useCallback((data: FeedCounts) => {
    setFeedCount(data);
  }, []);

  const getEntityFeedCount = () => {
    getFeedCounts(
      EntityType.DATABASE_SCHEMA,
      decodedDatabaseSchemaFQN,
      handleFeedCount
    );
  };

  const fetchDatabaseSchemaDetails = useCallback(async () => {
    try {
      setIsSchemaDetailsLoading(true);
      const response = await getDatabaseSchemaDetailsByFQN(
        decodedDatabaseSchemaFQN,
        {
          // eslint-disable-next-line max-len
          fields: `${TabSpecificField.OWNERS},${TabSpecificField.USAGE_SUMMARY},${TabSpecificField.TAGS},${TabSpecificField.DOMAIN},${TabSpecificField.VOTES},${TabSpecificField.EXTENSION},${TabSpecificField.DATA_PRODUCTS}`,
          include: Include.All,
        }
      );
      setDatabaseSchema(response);
      if (response.deleted) {
        setFilters({
          showDeletedTables: response.deleted,
        });
      }
    } catch (err) {
      // Error
      if ((err as AxiosError)?.response?.status === ClientErrors.FORBIDDEN) {
        history.replace(ROUTES.FORBIDDEN);
      }
    } finally {
      setIsSchemaDetailsLoading(false);
    }
  }, [decodedDatabaseSchemaFQN]);

  const saveUpdatedDatabaseSchemaData = useCallback(
    (updatedData: DatabaseSchema) => {
      let jsonPatch: Operation[] = [];
      if (databaseSchema) {
        jsonPatch = compare(databaseSchema, updatedData);
      }

      return patchDatabaseSchemaDetails(databaseSchemaId, jsonPatch);
    },
    [databaseSchemaId, databaseSchema]
  );

  const activeTabHandler = useCallback(
    (activeKey: string) => {
      if (activeKey !== activeTab) {
        history.push({
          pathname: getEntityDetailsPath(
            EntityType.DATABASE_SCHEMA,
            decodedDatabaseSchemaFQN,
            activeKey
          ),
        });
      }
    },
    [activeTab, decodedDatabaseSchemaFQN]
  );

  const handleUpdateOwner = useCallback(
    async (owners: DatabaseSchema['owners']) => {
      try {
        const updatedData = {
          ...databaseSchema,
          owners,
        };

        const response = await saveUpdatedDatabaseSchemaData(
          updatedData as DatabaseSchema
        );

        setDatabaseSchema(response);
      } catch (error) {
        showErrorToast(
          error as AxiosError,
          t('server.entity-updating-error', {
            entity: t('label.database-schema'),
          })
        );
      }
    },
    [databaseSchema, databaseSchema?.owners]
  );

  const handleUpdateTier = useCallback(
    async (newTier?: Tag) => {
      const tierTag = updateTierTag(databaseSchema?.tags ?? [], newTier);
      const updatedSchemaDetails = {
        ...databaseSchema,
        tags: tierTag,
      };

      const res = await saveUpdatedDatabaseSchemaData(
        updatedSchemaDetails as DatabaseSchema
      );
      setDatabaseSchema(res);
    },
    [saveUpdatedDatabaseSchemaData, databaseSchema]
  );

  const handleUpdateDisplayName = useCallback(
    async (data: EntityName) => {
      if (isUndefined(databaseSchema)) {
        return;
      }
      const updatedData = { ...databaseSchema, displayName: data.displayName };

      try {
        const res = await saveUpdatedDatabaseSchemaData(updatedData);
        setDatabaseSchema(res);
      } catch (error) {
        showErrorToast(error as AxiosError, t('server.api-error'));
      }
    },
    [databaseSchema, saveUpdatedDatabaseSchemaData]
  );

  const handleToggleDelete = (version?: number) => {
    history.replace({
      state: {
        cursorData: null,
        pageSize: null,
        currentPage: INITIAL_PAGING_VALUE,
      },
    });
    setDatabaseSchema((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        deleted: !prev?.deleted,
        ...(version ? { version } : {}),
      };
    });
  };

  const handleRestoreDatabaseSchema = useCallback(async () => {
    try {
      const { version: newVersion } = await restoreDatabaseSchema(
        databaseSchemaId
      );
      showSuccessToast(
        t('message.restore-entities-success', {
          entity: t('label.database-schema'),
        }),
        2000
      );
      handleToggleDelete(newVersion);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.restore-entities-error', {
          entity: t('label.database-schema'),
        })
      );
    }
  }, [databaseSchemaId]);

  const versionHandler = useCallback(() => {
    currentVersion &&
      history.push(
        getVersionPath(
          EntityType.DATABASE_SCHEMA,
          decodedDatabaseSchemaFQN,
          String(currentVersion),
          EntityTabs.TABLE
        )
      );
  }, [currentVersion, decodedDatabaseSchemaFQN]);

  const afterDeleteAction = useCallback(
    (isSoftDelete?: boolean, version?: number) =>
      isSoftDelete ? handleToggleDelete(version) : history.push('/'),
    []
  );

  const afterDomainUpdateAction = useCallback((data) => {
    const updatedData = data as DatabaseSchema;

    setDatabaseSchema((data) => ({
      ...(data ?? updatedData),
      version: updatedData.version,
    }));
  }, []);

  // Fetch stored procedure count to show it in Tab label
  const fetchStoreProcedureCount = useCallback(async () => {
    try {
      const { paging } = await getStoredProceduresList({
        databaseSchema: decodedDatabaseSchemaFQN,
        limit: 0,
      });
      setStoredProcedureCount(paging.total);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  }, [decodedDatabaseSchemaFQN]);

  const fetchTableCount = useCallback(async () => {
    try {
      const { paging } = await getTableList({
        databaseSchema: decodedDatabaseSchemaFQN,
        limit: 0,
        include: filters.showDeletedTables
          ? Include.Deleted
          : Include.NonDeleted,
      });
      setTableCount(paging.total);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  }, [decodedDatabaseSchemaFQN, filters.showDeletedTables]);

  useEffect(() => {
    fetchDatabaseSchemaPermission();
  }, [decodedDatabaseSchemaFQN]);

  useEffect(() => {
    if (viewDatabaseSchemaPermission) {
      fetchDatabaseSchemaDetails();
      fetchStoreProcedureCount();

      getEntityFeedCount();
    }
  }, [viewDatabaseSchemaPermission]);

  useEffect(() => {
    fetchTableCount();
  }, [filters.showDeletedTables]);

  const { editCustomAttributePermission, viewAllPermission } = useMemo(
    () => ({
      editCustomAttributePermission:
        (databaseSchemaPermission.EditAll ||
          databaseSchemaPermission.EditCustomFields) &&
        !databaseSchema.deleted,
      viewAllPermission: databaseSchemaPermission.ViewAll,
    }),

    [databaseSchemaPermission, databaseSchema]
  );

  const handleExtensionUpdate = async (schema: DatabaseSchema) => {
    const response = await saveUpdatedDatabaseSchemaData({
      ...databaseSchema,
      extension: schema.extension,
    });
    setDatabaseSchema((prev) => {
      if (!prev) {
        return prev;
      }

      return {
        ...prev,
        extension: response.extension,
      };
    });
  };

  const handleUpdateDatabaseSchema = async (data: DatabaseSchema) => {
    try {
      const response = await saveUpdatedDatabaseSchemaData(data);
      setDatabaseSchema(response);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-updating-error', {
          entity: t('label.database-schema'),
        })
      );
    }
  };

  const tabs: TabsProps['items'] = useMemo(() => {
    const tabLabelMap = getTabLabelMapFromTabs(customizedPage?.tabs);

    const tabs = databaseSchemaClassBase.getDatabaseSchemaPageTabs({
      feedCount,
      activeTab,
      editCustomAttributePermission,
      viewAllPermission,
      databaseSchemaPermission,
      storedProcedureCount,
      getEntityFeedCount,
      fetchDatabaseSchemaDetails,
      handleFeedCount,
      tableCount,
      labelMap: tabLabelMap,
    });

    return getDetailsTabWithNewLabel(
      tabs,
      customizedPage?.tabs,
      EntityTabs.TABLE
    );
  }, [
    feedCount,
    activeTab,
    databaseSchema,
    editCustomAttributePermission,
    tableCount,
    viewAllPermission,
    storedProcedureCount,
    databaseSchemaPermission,
    handleExtensionUpdate,
    getEntityFeedCount,
    fetchDatabaseSchemaDetails,
    handleFeedCount,
  ]);

  const updateVote = async (data: QueryVote, id: string) => {
    try {
      await updateDatabaseSchemaVotes(id, data);
      const response = await getDatabaseSchemaDetailsByFQN(
        decodedDatabaseSchemaFQN,
        {
          fields: [
            TabSpecificField.OWNERS,
            TabSpecificField.USAGE_SUMMARY,
            TabSpecificField.TAGS,
            TabSpecificField.VOTES,
          ],
          include: Include.All,
        }
      );
      setDatabaseSchema(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  if (isPermissionsLoading) {
    return <Loader />;
  }

  if (!viewDatabaseSchemaPermission) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  return (
    <PageLayoutV1
      className="bg-white"
      pageTitle={t('label.entity-detail-plural', {
        entity: getEntityName(databaseSchema),
      })}>
      {isEmpty(databaseSchema) && !isSchemaDetailsLoading ? (
        <ErrorPlaceHolder className="m-0">
          {getEntityMissingError(
            EntityType.DATABASE_SCHEMA,
            decodedDatabaseSchemaFQN
          )}
        </ErrorPlaceHolder>
      ) : (
        <Row gutter={[0, 12]}>
          <Col className="p-x-lg" span={24}>
            {isSchemaDetailsLoading ? (
              <Skeleton
                active
                className="m-b-md"
                paragraph={{
                  rows: 2,
                  width: ['20%', '80%'],
                }}
              />
            ) : (
              <DataAssetsHeader
                isRecursiveDelete
                afterDeleteAction={afterDeleteAction}
                afterDomainUpdateAction={afterDomainUpdateAction}
                dataAsset={databaseSchema}
                entityType={EntityType.DATABASE_SCHEMA}
                extraDropdownContent={extraDropdownContent}
                permissions={databaseSchemaPermission}
                onDisplayNameUpdate={handleUpdateDisplayName}
                onOwnerUpdate={handleUpdateOwner}
                onProfilerSettingUpdate={() => setUpdateProfilerSetting(true)}
                onRestoreDataAsset={handleRestoreDatabaseSchema}
                onTierUpdate={handleUpdateTier}
                onUpdateVote={updateVote}
                onVersionClick={versionHandler}
              />
            )}
          </Col>
          <GenericProvider<DatabaseSchema>
            data={databaseSchema}
            permissions={databaseSchemaPermission}
            type={EntityType.DATABASE_SCHEMA}
            onUpdate={handleUpdateDatabaseSchema}>
            <Col span={24}>
              <Tabs
                activeKey={activeTab}
                className="entity-details-page-tabs"
                data-testid="tabs"
                items={tabs}
                onChange={activeTabHandler}
              />
            </Col>
          </GenericProvider>
          {updateProfilerSetting && (
            <ProfilerSettings
              entityId={databaseSchemaId}
              entityType={EntityType.DATABASE_SCHEMA}
              visible={updateProfilerSetting}
              onVisibilityChange={(value) => setUpdateProfilerSetting(value)}
            />
          )}
        </Row>
      )}
    </PageLayoutV1>
  );
};

export default withActivityFeed(DatabaseSchemaPage);
