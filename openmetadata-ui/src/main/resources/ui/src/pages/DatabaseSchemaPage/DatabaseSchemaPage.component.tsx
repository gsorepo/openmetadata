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

import { Col, Row, Skeleton, Space, Tabs, TabsProps } from 'antd';
import { AxiosError } from 'axios';
import ActivityFeedProvider, {
  useActivityFeedProvider,
} from 'components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTab } from 'components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import ActivityThreadPanel from 'components/ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import ErrorPlaceHolder from 'components/common/error-with-placeholder/ErrorPlaceHolder';
import PageLayoutV1 from 'components/containers/PageLayoutV1';
import { DataAssetsHeader } from 'components/DataAssets/DataAssetsHeader/DataAssetsHeader.component';
import Loader from 'components/Loader/Loader';
import { EntityName } from 'components/Modals/EntityNameModal/EntityNameModal.interface';
import { usePermissionProvider } from 'components/PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from 'components/PermissionProvider/PermissionProvider.interface';
import { withActivityFeed } from 'components/router/withActivityFeed';
import TabsLabel from 'components/TabsLabel/TabsLabel.component';
import TagsContainerV2 from 'components/Tag/TagsContainerV2/TagsContainerV2';
import { DisplayType } from 'components/Tag/TagsViewer/TagsViewer.interface';
import { ERROR_PLACEHOLDER_TYPE } from 'enums/common.enum';
import { compare, Operation } from 'fast-json-patch';
import { ThreadType } from 'generated/entity/feed/thread';
import { Include } from 'generated/type/include';
import { LabelType, State, TagLabel, TagSource } from 'generated/type/tagLabel';
import { isEmpty, isString, isUndefined, toString } from 'lodash';
import { observer } from 'mobx-react';
import { EntityTags, PagingResponse } from 'Models';
import StoredProcedureTab from 'pages/StoredProcedure/StoredProcedureTab';
import React, {
  FunctionComponent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { ListDataModelParams } from 'rest/dashboardAPI';
import {
  getDatabaseSchemaDetailsByFQN,
  patchDatabaseSchemaDetails,
  restoreDatabaseSchema,
} from 'rest/databaseAPI';
import { getFeedCount, postThread } from 'rest/feedsAPI';
import { getStoredProceduresList } from 'rest/storedProceduresAPI';
import { getTableList, TableListParams } from 'rest/tableAPI';
import { getEntityMissingError } from 'utils/CommonUtils';
import { getDatabaseSchemaVersionPath } from 'utils/RouterUtils';
import { getDecodedFqn } from 'utils/StringsUtils';
import { default as appState } from '../../AppState';
import {
  getDatabaseSchemaDetailsPath,
  INITIAL_PAGING_VALUE,
  pagingObject,
} from '../../constants/constants';
import { EntityTabs, EntityType } from '../../enums/entity.enum';
import { CreateThread } from '../../generated/api/feed/createThread';
import { DatabaseSchema } from '../../generated/entity/data/databaseSchema';
import { Table } from '../../generated/entity/data/table';
import { getEntityFeedLink, getEntityName } from '../../utils/EntityUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { getTagsWithoutTier, getTierTags } from '../../utils/TableUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import { StoredProcedureData } from './DatabaseSchemaPage.interface';
import SchemaTablesTab from './SchemaTablesTab';

const DatabaseSchemaPage: FunctionComponent = () => {
  const { postFeed, deleteFeed, updateFeed } = useActivityFeedProvider();
  const { t } = useTranslation();
  const { getEntityPermissionByFqn } = usePermissionProvider();

  const { databaseSchemaFQN, tab: activeTab = EntityTabs.TABLE } =
    useParams<{ databaseSchemaFQN: string; tab: EntityTabs }>();
  const history = useHistory();
  const isMounting = useRef(true);

  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );
  const [isPermissionsLoading, setIsPermissionsLoading] = useState(true);
  const [databaseSchema, setDatabaseSchema] = useState<DatabaseSchema>(
    {} as DatabaseSchema
  );
  const [tableData, setTableData] = useState<PagingResponse<Table[]>>({
    data: [],
    paging: { total: 0 },
  });
  const [tableDataLoading, setTableDataLoading] = useState<boolean>(true);
  const [isSchemaDetailsLoading, setIsSchemaDetailsLoading] =
    useState<boolean>(true);
  const [isEdit, setIsEdit] = useState(false);
  const [description, setDescription] = useState('');
  const [feedCount, setFeedCount] = useState<number>(0);
  const [threadLink, setThreadLink] = useState<string>('');
  const [databaseSchemaPermission, setDatabaseSchemaPermission] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);
  const [showDeletedTables, setShowDeletedTables] = useState<boolean>(false);
  const [currentTablesPage, setCurrentTablesPage] =
    useState<number>(INITIAL_PAGING_VALUE);

  const [storedProcedure, setStoredProcedure] = useState<StoredProcedureData>({
    data: [],
    isLoading: false,
    deleted: false,
    paging: pagingObject,
    currentPage: INITIAL_PAGING_VALUE,
  });

  const handleShowDeletedTables = (value: boolean) => {
    setShowDeletedTables(value);
    setCurrentTablesPage(INITIAL_PAGING_VALUE);
  };

  const handleShowDeletedStoredProcedure = (value: boolean) => {
    setStoredProcedure((prev) => ({
      ...prev,
      currentPage: INITIAL_PAGING_VALUE,
      deleted: value,
    }));
  };
  const { version: currentVersion } = useMemo(
    () => databaseSchema,
    [databaseSchema]
  );

  const { tags, tier } = useMemo(
    () => ({
      tier: getTierTags(databaseSchema.tags ?? []),
      tags: getTagsWithoutTier(databaseSchema.tags ?? []),
    }),
    [databaseSchema]
  );

  const databaseSchemaId = useMemo(
    () => databaseSchema?.id ?? '',
    [databaseSchema]
  );

  const fetchDatabaseSchemaPermission = useCallback(async () => {
    setIsPermissionsLoading(true);
    try {
      const response = await getEntityPermissionByFqn(
        ResourceEntity.DATABASE_SCHEMA,
        databaseSchemaFQN
      );
      setDatabaseSchemaPermission(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsPermissionsLoading(false);
    }
  }, [databaseSchemaFQN]);

  const viewDatabaseSchemaPermission = useMemo(
    () =>
      databaseSchemaPermission.ViewAll || databaseSchemaPermission.ViewBasic,
    [databaseSchemaPermission]
  );

  const onThreadLinkSelect = useCallback(
    (link: string, threadType?: ThreadType) => {
      setThreadLink(link);
      if (threadType) {
        setThreadType(threadType);
      }
    },
    []
  );

  const onThreadPanelClose = useCallback(() => {
    setThreadLink('');
  }, []);

  const getEntityFeedCount = useCallback(async () => {
    try {
      const response = await getFeedCount(
        getEntityFeedLink(EntityType.DATABASE_SCHEMA, databaseSchemaFQN)
      );
      setFeedCount(response.totalCount);
    } catch (err) {
      // Error
    }
  }, [databaseSchemaFQN]);

  const fetchDatabaseSchemaDetails = useCallback(async () => {
    try {
      setIsSchemaDetailsLoading(true);
      const response = await getDatabaseSchemaDetailsByFQN(
        databaseSchemaFQN,
        ['owner', 'usageSummary', 'tags'],
        'include=all'
      );
      const { description: schemaDescription = '' } = response;
      setDatabaseSchema(response);
      setDescription(schemaDescription);
      setShowDeletedTables(response.deleted ?? false);
    } catch (err) {
      // Error
    } finally {
      setIsSchemaDetailsLoading(false);
    }
  }, [databaseSchemaFQN]);

  const fetchStoreProcedureDetails = useCallback(
    async (params?: ListDataModelParams) => {
      try {
        setStoredProcedure((prev) => ({ ...prev, isLoading: true }));
        const { data, paging } = await getStoredProceduresList({
          databaseSchema: getDecodedFqn(databaseSchemaFQN),
          fields: 'owner,tags,followers',
          include: storedProcedure.deleted
            ? Include.Deleted
            : Include.NonDeleted,
          ...params,
        });
        setStoredProcedure((prev) => ({ ...prev, data, paging }));
      } catch (error) {
        showErrorToast(error as AxiosError);
      } finally {
        setStoredProcedure((prev) => ({ ...prev, isLoading: false }));
      }
    },
    [databaseSchemaFQN, storedProcedure.deleted]
  );

  const getSchemaTables = useCallback(
    async (params?: TableListParams) => {
      setTableDataLoading(true);
      try {
        const res = await getTableList({
          ...params,
          databaseSchema: getDecodedFqn(databaseSchemaFQN),
          include: showDeletedTables ? Include.Deleted : Include.NonDeleted,
        });
        setTableData(res);
      } catch (err) {
        showErrorToast(err as AxiosError);
      } finally {
        setTableDataLoading(false);
      }
    },
    [databaseSchemaFQN, showDeletedTables]
  );

  const onDescriptionEdit = useCallback((): void => {
    setIsEdit(true);
  }, []);

  const onEditCancel = useCallback(() => {
    setIsEdit(false);
  }, []);

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

  const onDescriptionUpdate = useCallback(
    async (updatedHTML: string) => {
      if (description !== updatedHTML && databaseSchema) {
        const updatedDatabaseSchemaDetails = {
          ...databaseSchema,
          description: updatedHTML,
        };

        try {
          const response = await saveUpdatedDatabaseSchemaData(
            updatedDatabaseSchemaDetails
          );
          if (response) {
            setDatabaseSchema(response);
            setDescription(updatedHTML);
            getEntityFeedCount();
          } else {
            throw t('server.unexpected-response');
          }
        } catch (error) {
          showErrorToast(error as AxiosError);
        } finally {
          setIsEdit(false);
        }
      } else {
        setIsEdit(false);
      }
    },
    [description, databaseSchema, getEntityFeedCount]
  );

  const activeTabHandler = useCallback(
    (activeKey: string) => {
      if (activeKey !== activeTab) {
        history.push({
          pathname: getDatabaseSchemaDetailsPath(
            getDecodedFqn(databaseSchemaFQN),
            activeKey
          ),
        });
      }
    },
    [activeTab, databaseSchemaFQN]
  );

  const handleUpdateOwner = useCallback(
    (owner: DatabaseSchema['owner']) => {
      const updatedData = {
        ...databaseSchema,
        owner: owner ? { ...databaseSchema?.owner, ...owner } : undefined,
      };

      return new Promise<void>((_, reject) => {
        saveUpdatedDatabaseSchemaData(updatedData as DatabaseSchema)
          .then((res) => {
            if (res) {
              setDatabaseSchema(res);
              reject();
            } else {
              reject();

              throw t('server.unexpected-response');
            }
          })
          .catch((err: AxiosError) => {
            showErrorToast(
              err,
              t('server.entity-updating-error', {
                entity: t('label.database-schema'),
              })
            );
            reject();
          });
      });
    },
    [databaseSchema, databaseSchema?.owner]
  );

  const handleTagsUpdate = async (selectedTags?: Array<EntityTags>) => {
    if (selectedTags) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedData = { ...databaseSchema, tags: updatedTags };

      try {
        const res = await saveUpdatedDatabaseSchemaData(
          updatedData as DatabaseSchema
        );
        setDatabaseSchema(res);
        getEntityFeedCount();
      } catch (error) {
        showErrorToast(error as AxiosError, t('server.api-error'));
      }
    }
  };

  const handleTagSelection = async (selectedTags: EntityTags[]) => {
    const updatedTags: TagLabel[] | undefined = selectedTags?.map((tag) => {
      return {
        source: tag.source,
        tagFQN: tag.tagFQN,
        labelType: LabelType.Manual,
        state: State.Confirmed,
      };
    });
    await handleTagsUpdate(updatedTags);
  };

  const handleUpdateTier = useCallback(
    async (newTier?: string) => {
      const tierTag = newTier
        ? [
            ...getTagsWithoutTier(databaseSchema?.tags ?? []),
            {
              tagFQN: newTier,
              labelType: LabelType.Manual,
              state: State.Confirmed,
            },
          ]
        : getTagsWithoutTier(databaseSchema?.tags ?? []);
      const updatedSchemaDetails = {
        ...databaseSchema,
        tags: tierTag,
      };

      const res = await saveUpdatedDatabaseSchemaData(
        updatedSchemaDetails as DatabaseSchema
      );
      setDatabaseSchema(res);
      getEntityFeedCount();
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
        getEntityFeedCount();
      } catch (error) {
        showErrorToast(error as AxiosError, t('server.api-error'));
      }
    },
    [databaseSchema, saveUpdatedDatabaseSchemaData, getEntityFeedCount]
  );

  const createThread = useCallback(
    async (data: CreateThread) => {
      try {
        await postThread(data);
        getEntityFeedCount();
      } catch (error) {
        showErrorToast(
          error as AxiosError,
          t('server.create-entity-error', {
            entity: t('label.conversation'),
          })
        );
      }
    },
    [getEntityFeedCount]
  );

  const handleToggleDelete = () => {
    setDatabaseSchema((prev) => {
      if (!prev) {
        return prev;
      }

      return { ...prev, deleted: !prev?.deleted };
    });
  };

  const handleRestoreDatabaseSchema = useCallback(async () => {
    try {
      await restoreDatabaseSchema(databaseSchemaId);
      showSuccessToast(
        t('message.restore-entities-success', {
          entity: t('label.database-schema'),
        }),
        2000
      );
      handleToggleDelete();
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.restore-entities-error', {
          entity: t('label.database-schema'),
        })
      );
    }
  }, [databaseSchemaId]);

  const tablePaginationHandler = useCallback(
    (cursorValue: string | number, activePage?: number) => {
      if (isString(cursorValue)) {
        getSchemaTables({ [cursorValue]: tableData.paging[cursorValue] });
      }
      setCurrentTablesPage(activePage ?? INITIAL_PAGING_VALUE);
    },
    [tableData, getSchemaTables]
  );

  const versionHandler = useCallback(() => {
    currentVersion &&
      history.push(
        getDatabaseSchemaVersionPath(
          databaseSchemaFQN,
          toString(currentVersion)
        )
      );
  }, [currentVersion, databaseSchemaFQN]);

  const afterDeleteAction = useCallback(
    (isSoftDelete?: boolean) =>
      isSoftDelete ? handleToggleDelete() : history.push('/'),
    []
  );

  const storedProcedurePagingHandler = useCallback(
    async (cursorType: string | number, activePage?: number) => {
      const pagingString = {
        [cursorType]:
          storedProcedure.paging[
            cursorType as keyof typeof storedProcedure.paging
          ],
      };

      await fetchStoreProcedureDetails(pagingString);

      setStoredProcedure((prev) => ({
        ...prev,
        currentPage: activePage ?? INITIAL_PAGING_VALUE,
      }));
    },
    [storedProcedure.paging]
  );

  useEffect(() => {
    fetchDatabaseSchemaPermission();
  }, [databaseSchemaFQN]);

  useEffect(() => {
    if (viewDatabaseSchemaPermission) {
      fetchDatabaseSchemaDetails();
      fetchStoreProcedureDetails({ limit: 0 });
      getEntityFeedCount();
    }
  }, [viewDatabaseSchemaPermission, databaseSchemaFQN]);

  useEffect(() => {
    if (viewDatabaseSchemaPermission && databaseSchemaFQN) {
      getSchemaTables();
    }
  }, [showDeletedTables, databaseSchemaFQN, viewDatabaseSchemaPermission]);

  // always Keep this useEffect at the end...
  useEffect(() => {
    isMounting.current = false;
    appState.inPageSearchText = '';
  }, []);

  const editTagsPermission = useMemo(
    () =>
      (databaseSchemaPermission.EditTags || databaseSchemaPermission.EditAll) &&
      !databaseSchema?.deleted,
    [databaseSchemaPermission, databaseSchema]
  );

  const editDescriptionPermission = useMemo(
    () =>
      (databaseSchemaPermission.EditDescription ||
        databaseSchemaPermission.EditAll) &&
      !databaseSchema.deleted,
    [databaseSchemaPermission, databaseSchema]
  );

  const tabs: TabsProps['items'] = [
    {
      label: (
        <TabsLabel
          count={tableData.paging.total}
          id={EntityTabs.TABLE}
          isActive={activeTab === EntityTabs.TABLE}
          name={t('label.table-plural')}
        />
      ),
      key: EntityTabs.TABLE,
      children: (
        <Row gutter={[0, 16]} wrap={false}>
          <Col className="p-t-sm m-x-lg" flex="auto">
            <SchemaTablesTab
              currentTablesPage={currentTablesPage}
              databaseSchemaDetails={databaseSchema}
              description={description}
              editDescriptionPermission={editDescriptionPermission}
              isEdit={isEdit}
              showDeletedTables={showDeletedTables}
              tableData={tableData}
              tableDataLoading={tableDataLoading}
              tablePaginationHandler={tablePaginationHandler}
              onCancel={onEditCancel}
              onDescriptionEdit={onDescriptionEdit}
              onDescriptionUpdate={onDescriptionUpdate}
              onShowDeletedTablesChange={handleShowDeletedTables}
              onThreadLinkSelect={onThreadLinkSelect}
            />
          </Col>
          <Col
            className="entity-tag-right-panel-container"
            data-testid="entity-right-panel"
            flex="320px">
            <Space className="w-full" direction="vertical" size="large">
              <TagsContainerV2
                displayType={DisplayType.READ_MORE}
                entityFqn={databaseSchemaFQN}
                entityType={EntityType.DATABASE_SCHEMA}
                permission={editTagsPermission}
                selectedTags={tags}
                tagType={TagSource.Classification}
                onSelectionChange={handleTagSelection}
                onThreadLinkSelect={onThreadLinkSelect}
              />
              <TagsContainerV2
                displayType={DisplayType.READ_MORE}
                entityFqn={databaseSchemaFQN}
                entityType={EntityType.DATABASE_SCHEMA}
                permission={editTagsPermission}
                selectedTags={tags}
                tagType={TagSource.Glossary}
                onSelectionChange={handleTagSelection}
                onThreadLinkSelect={onThreadLinkSelect}
              />
            </Space>
          </Col>
        </Row>
      ),
    },
    {
      label: (
        <TabsLabel
          count={storedProcedure.paging.total}
          id={EntityTabs.STORED_PROCEDURE}
          isActive={activeTab === EntityTabs.STORED_PROCEDURE}
          name={t('label.stored-procedure-plural')}
        />
      ),
      key: EntityTabs.STORED_PROCEDURE,
      children: (
        <StoredProcedureTab
          fetchStoredProcedure={fetchStoreProcedureDetails}
          pagingHandler={storedProcedurePagingHandler}
          storedProcedure={storedProcedure}
          onShowDeletedStoreProcedureChange={handleShowDeletedStoredProcedure}
        />
      ),
    },
    {
      label: (
        <TabsLabel
          count={feedCount}
          id={EntityTabs.ACTIVITY_FEED}
          isActive={activeTab === EntityTabs.ACTIVITY_FEED}
          name={t('label.activity-feed-plural')}
        />
      ),
      key: EntityTabs.ACTIVITY_FEED,
      children: (
        <ActivityFeedProvider>
          <ActivityFeedTab
            entityType={EntityType.DATABASE_SCHEMA}
            fqn={databaseSchema.fullyQualifiedName ?? ''}
            onFeedUpdate={getEntityFeedCount}
            onUpdateEntityDetails={fetchDatabaseSchemaDetails}
          />
        </ActivityFeedProvider>
      ),
    },
  ];

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
          {getEntityMissingError(EntityType.DATABASE_SCHEMA, databaseSchemaFQN)}
        </ErrorPlaceHolder>
      ) : (
        <Row gutter={[0, 12]}>
          <Col className="p-x-lg" span={24}>
            {isSchemaDetailsLoading ? (
              <Skeleton
                active
                paragraph={{
                  rows: 3,
                  width: ['20%', '80%', '60%'],
                }}
              />
            ) : (
              <DataAssetsHeader
                isRecursiveDelete
                afterDeleteAction={afterDeleteAction}
                dataAsset={databaseSchema}
                entityType={EntityType.DATABASE_SCHEMA}
                permissions={databaseSchemaPermission}
                onDisplayNameUpdate={handleUpdateDisplayName}
                onOwnerUpdate={handleUpdateOwner}
                onRestoreDataAsset={handleRestoreDatabaseSchema}
                onTierUpdate={handleUpdateTier}
                onVersionClick={versionHandler}
              />
            )}
          </Col>
          <Col span={24}>
            <Tabs
              activeKey={activeTab}
              className="entity-details-page-tabs"
              data-testid="tabs"
              items={tabs}
              onChange={activeTabHandler}
            />
          </Col>
          <Col span={24}>
            {threadLink ? (
              <ActivityThreadPanel
                createThread={createThread}
                deletePostHandler={deleteFeed}
                open={Boolean(threadLink)}
                postFeedHandler={postFeed}
                threadLink={threadLink}
                threadType={threadType}
                updateThreadHandler={updateFeed}
                onCancel={onThreadPanelClose}
              />
            ) : null}
          </Col>
        </Row>
      )}
    </PageLayoutV1>
  );
};

export default observer(withActivityFeed(DatabaseSchemaPage));
