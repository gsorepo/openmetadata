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
import { Card, Col, Row, Space, Tabs } from 'antd';
import AppState from 'AppState';
import { AxiosError } from 'axios';
import ActivityFeedProvider, {
  useActivityFeedProvider,
} from 'components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTab } from 'components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import ActivityThreadPanel from 'components/ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import { CustomPropertyTable } from 'components/common/CustomPropertyTable/CustomPropertyTable';
import { CustomPropertyProps } from 'components/common/CustomPropertyTable/CustomPropertyTable.interface';
import DescriptionV1 from 'components/common/description/DescriptionV1';
import ErrorPlaceHolder from 'components/common/error-with-placeholder/ErrorPlaceHolder';
import ContainerChildren from 'components/ContainerDetail/ContainerChildren/ContainerChildren';
import ContainerDataModel from 'components/ContainerDetail/ContainerDataModel/ContainerDataModel';
import PageLayoutV1 from 'components/containers/PageLayoutV1';
import { DataAssetsHeader } from 'components/DataAssets/DataAssetsHeader/DataAssetsHeader.component';
import EntityLineageComponent from 'components/EntityLineage/EntityLineage.component';
import {
  Edge,
  EdgeData,
  LeafNodes,
  LineagePos,
  LoadingNodeState,
} from 'components/EntityLineage/EntityLineage.interface';
import Loader from 'components/Loader/Loader';
import { EntityName } from 'components/Modals/EntityNameModal/EntityNameModal.interface';
import { usePermissionProvider } from 'components/PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from 'components/PermissionProvider/PermissionProvider.interface';
import TabsLabel from 'components/TabsLabel/TabsLabel.component';
import TagsContainerV1 from 'components/Tag/TagsContainerV1/TagsContainerV1';
import { getContainerDetailPath, getVersionPath } from 'constants/constants';
import { EntityField } from 'constants/Feeds.constants';
import { ERROR_PLACEHOLDER_TYPE } from 'enums/common.enum';
import { EntityTabs, EntityType } from 'enums/entity.enum';
import { compare } from 'fast-json-patch';
import { CreateThread, ThreadType } from 'generated/api/feed/createThread';
import { Container } from 'generated/entity/data/container';
import { EntityLineage } from 'generated/type/entityLineage';
import { EntityReference } from 'generated/type/entityReference';
import { Include } from 'generated/type/include';
import { LabelType, State, TagLabel, TagSource } from 'generated/type/tagLabel';
import { EntityFieldThreadCount } from 'interface/feed.interface';
import { isUndefined, omitBy, toString } from 'lodash';
import { observer } from 'mobx-react';
import { EntityTags } from 'Models';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useParams } from 'react-router-dom';
import { postThread } from 'rest/feedsAPI';
import { getLineageByFQN } from 'rest/lineageAPI';
import { addLineage, deleteLineageEdge } from 'rest/miscAPI';
import {
  addContainerFollower,
  getContainerByName,
  patchContainerDetails,
  removeContainerFollower,
  restoreContainer,
} from 'rest/storageAPI';
import {
  getCurrentUserId,
  getEntityMissingError,
  getFeedCounts,
  refreshPage,
  sortTagsCaseInsensitive,
} from 'utils/CommonUtils';
import {
  getEntityLineage,
  getEntityName,
  getEntityThreadLink,
} from 'utils/EntityUtils';
import { getEntityFieldThreadCounts } from 'utils/FeedUtils';
import { DEFAULT_ENTITY_PERMISSION } from 'utils/PermissionsUtils';
import { getLineageViewPath } from 'utils/RouterUtils';
import { getTagsWithoutTier, getTierTags } from 'utils/TableUtils';
import { showErrorToast, showSuccessToast } from 'utils/ToastUtils';

const ContainerPage = () => {
  const history = useHistory();
  const { t } = useTranslation();
  const { getEntityPermissionByFqn } = usePermissionProvider();
  const { postFeed, deleteFeed, updateFeed } = useActivityFeedProvider();
  const { entityFQN: containerName, tab = EntityTabs.SCHEMA } =
    useParams<{ entityFQN: string; tab: EntityTabs }>();

  // Local states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isChildrenLoading, setIsChildrenLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [isEditDescription, setIsEditDescription] = useState<boolean>(false);
  const [isLineageLoading, setIsLineageLoading] = useState<boolean>(false);

  const [, setParentContainers] = useState<Container[]>([]);
  const [containerData, setContainerData] = useState<Container>();
  const [containerChildrenData, setContainerChildrenData] = useState<
    Container['children']
  >([]);
  const [containerPermissions, setContainerPermissions] =
    useState<OperationPermission>(DEFAULT_ENTITY_PERMISSION);
  const [entityLineage, setEntityLineage] = useState<EntityLineage>(
    {} as EntityLineage
  );
  const [leafNodes, setLeafNodes] = useState<LeafNodes>({} as LeafNodes);
  const [isNodeLoading, setNodeLoading] = useState<LoadingNodeState>({
    id: undefined,
    state: false,
  });

  const [feedCount, setFeedCount] = useState<number>(0);
  const [entityFieldThreadCount, setEntityFieldThreadCount] = useState<
    EntityFieldThreadCount[]
  >([]);
  const [entityFieldTaskCount, setEntityFieldTaskCount] = useState<
    EntityFieldThreadCount[]
  >([]);

  const [threadLink, setThreadLink] = useState<string>('');
  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );

  // data fetching methods
  const fetchContainerParent = async (
    parentName: string,
    newContainer = false
  ) => {
    try {
      const response = await getContainerByName(parentName, 'parent');
      setParentContainers((prev) =>
        newContainer ? [response] : [response, ...prev]
      );
      if (response.parent && response.parent.fullyQualifiedName) {
        await fetchContainerParent(response.parent.fullyQualifiedName);
      }
    } catch (error) {
      showErrorToast(error as AxiosError, t('server.unexpected-response'));
    }
  };

  const fetchContainerDetail = async (containerFQN: string) => {
    setIsLoading(true);
    try {
      const response = await getContainerByName(
        containerFQN,
        'parent,dataModel,owner,tags,followers,extension',
        Include.All
      );
      setContainerData({
        ...response,
        tags: sortTagsCaseInsensitive(response.tags || []),
      });
      if (response.parent && response.parent.fullyQualifiedName) {
        await fetchContainerParent(response.parent.fullyQualifiedName, true);
      }
    } catch (error) {
      showErrorToast(error as AxiosError);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchContainerChildren = async (containerFQN: string) => {
    setIsChildrenLoading(true);
    try {
      const { children } = await getContainerByName(containerFQN, 'children');
      setContainerChildrenData(children);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsChildrenLoading(false);
    }
  };

  const fetchLineageData = async (containerFQN: string) => {
    setIsLineageLoading(true);
    try {
      const response = await getLineageByFQN(
        containerFQN,
        EntityType.CONTAINER
      );

      setEntityLineage(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLineageLoading(false);
    }
  };

  const fetchResourcePermission = async (containerFQN: string) => {
    setIsLoading(true);
    try {
      const entityPermission = await getEntityPermissionByFqn(
        ResourceEntity.CONTAINER,
        containerFQN
      );
      setContainerPermissions(entityPermission);
    } catch (error) {
      showErrorToast(
        t('server.fetch-entity-permissions-error', {
          entity: t('label.asset-lowercase'),
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const {
    hasViewPermission,
    hasEditDescriptionPermission,
    hasEditTagsPermission,
    hasEditCustomFieldsPermission,
    hasEditLineagePermission,
  } = useMemo(() => {
    return {
      hasViewPermission:
        containerPermissions.ViewAll || containerPermissions.ViewBasic,
      hasEditDescriptionPermission:
        containerPermissions.EditAll || containerPermissions.EditDescription,
      hasEditTagsPermission:
        containerPermissions.EditAll || containerPermissions.EditTags,
      hasEditCustomFieldsPermission:
        containerPermissions.EditAll || containerPermissions.EditCustomFields,
      hasEditLineagePermission:
        containerPermissions.EditAll || containerPermissions.EditLineage,
    };
  }, [containerPermissions]);

  const {
    deleted,
    owner,
    description,
    version,
    entityName,
    isUserFollowing,
    tags,
    tier,
  } = useMemo(() => {
    return {
      deleted: containerData?.deleted,
      owner: containerData?.owner,
      description: containerData?.description,
      version: containerData?.version,
      tier: getTierTags(containerData?.tags ?? []),
      tags: getTagsWithoutTier(containerData?.tags ?? []),
      entityId: containerData?.id,
      entityName: getEntityName(containerData),
      isUserFollowing: containerData?.followers?.some(
        ({ id }: { id: string }) => id === getCurrentUserId()
      ),
      followers: containerData?.followers ?? [],
      size: containerData?.size || 0,
      numberOfObjects: containerData?.numberOfObjects || 0,
      partitioned: containerData?.dataModel?.isPartitioned,
    };
  }, [containerData]);

  // get current user details
  const currentUser = useMemo(
    () => AppState.getCurrentUserDetails(),
    [AppState.userDetails, AppState.nonSecureUserDetails]
  );

  const getEntityFeedCount = () => {
    getFeedCounts(
      EntityType.CONTAINER,
      containerName,
      setEntityFieldThreadCount,
      setEntityFieldTaskCount,
      setFeedCount
    );
  };

  const handleTabChange = (tabValue: string) => {
    if (tabValue !== tab) {
      history.push({
        pathname: getContainerDetailPath(containerName, tabValue),
      });
    }
  };

  const handleUpdateContainerData = (updatedData: Container) => {
    const jsonPatch = compare(omitBy(containerData, isUndefined), updatedData);

    return patchContainerDetails(containerData?.id ?? '', jsonPatch);
  };

  const handleUpdateDescription = async (updatedDescription: string) => {
    try {
      const { description: newDescription, version } =
        await handleUpdateContainerData({
          ...(containerData as Container),
          description: updatedDescription,
        });

      setContainerData((prev) => ({
        ...(prev as Container),
        description: newDescription,
        version,
      }));
      getEntityFeedCount();
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsEditDescription(false);
    }
  };
  const handleUpdateDisplayName = async (data: EntityName) => {
    if (isUndefined(containerData)) {
      return;
    }
    try {
      const { displayName, version } = await handleUpdateContainerData({
        ...containerData,
        displayName: data.displayName,
      });

      setContainerData((prev) => {
        if (isUndefined(prev)) {
          return;
        }

        return {
          ...prev,
          displayName,
          version,
        };
      });
      getEntityFeedCount();
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleFollowContainer = async () => {
    const followerId = currentUser?.id ?? '';
    const containerId = containerData?.id ?? '';
    try {
      if (isUserFollowing) {
        const response = await removeContainerFollower(containerId, followerId);
        const { oldValue } = response.changeDescription.fieldsDeleted[0];

        setContainerData((prev) => ({
          ...(prev as Container),
          followers: (containerData?.followers || []).filter(
            (follower) => follower.id !== oldValue[0].id
          ),
        }));
      } else {
        const response = await addContainerFollower(containerId, followerId);
        const { newValue } = response.changeDescription.fieldsAdded[0];

        setContainerData((prev) => ({
          ...(prev as Container),
          followers: [...(containerData?.followers ?? []), ...newValue],
        }));
      }
      getEntityFeedCount();
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleUpdateOwner = useCallback(
    async (updatedOwner?: Container['owner']) => {
      try {
        const { owner: newOwner, version } = await handleUpdateContainerData({
          ...(containerData as Container),
          owner: updatedOwner ? updatedOwner : undefined,
        });

        setContainerData((prev) => ({
          ...(prev as Container),
          owner: newOwner,
          version,
        }));
        getEntityFeedCount();
      } catch (error) {
        showErrorToast(error as AxiosError);
      }
    },
    [containerData, containerData?.owner]
  );

  const handleUpdateTier = async (updatedTier?: string) => {
    try {
      if (updatedTier) {
        const { tags: newTags, version } = await handleUpdateContainerData({
          ...(containerData as Container),
          tags: [
            ...getTagsWithoutTier(containerData?.tags ?? []),
            {
              tagFQN: updatedTier,
              labelType: LabelType.Manual,
              state: State.Confirmed,
              source: TagSource.Classification,
            },
          ],
        });

        setContainerData((prev) => ({
          ...(prev as Container),
          tags: newTags,
          version,
        }));
        getEntityFeedCount();
      }
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleRestoreContainer = async () => {
    try {
      await restoreContainer(containerData?.id ?? '');
      showSuccessToast(
        t('message.restore-entities-success', {
          entity: t('label.container'),
        }),
        2000
      );
      refreshPage();
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.restore-entities-error', {
          entity: t('label.container'),
        })
      );
    }
  };

  // Lineage handlers
  const handleAddLineage = async (edge: Edge) => {
    try {
      await addLineage(edge);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleRemoveLineage = async (data: EdgeData) => {
    try {
      await deleteLineageEdge(
        data.fromEntity,
        data.fromId,
        data.toEntity,
        data.toId
      );
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleSetLeafNode = (val: EntityLineage, pos: LineagePos) => {
    if (pos === 'to' && val.downstreamEdges?.length === 0) {
      setLeafNodes((prev) => ({
        ...prev,
        downStreamNode: [...(prev.downStreamNode ?? []), val.entity.id],
      }));
    }
    if (pos === 'from' && val.upstreamEdges?.length === 0) {
      setLeafNodes((prev) => ({
        ...prev,
        upStreamNode: [...(prev.upStreamNode ?? []), val.entity.id],
      }));
    }
  };

  const handleLoadLineageNode = async (
    node: EntityReference,
    pos: LineagePos
  ) => {
    setNodeLoading({ id: node.id, state: true });

    try {
      const response = await getLineageByFQN(
        node.fullyQualifiedName ?? '',
        node.type
      );
      handleSetLeafNode(response, pos);
      setEntityLineage(getEntityLineage(entityLineage, response, pos));
      setTimeout(() => {
        setNodeLoading((prev) => ({ ...prev, state: false }));
      }, 500);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleFullScreenClick = () =>
    history.push(getLineageViewPath(EntityType.CONTAINER, containerName));

  const handleExtensionUpdate = async (updatedContainer: Container) => {
    try {
      const response = await handleUpdateContainerData(updatedContainer);
      setContainerData(response);
      getEntityFeedCount();
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleUpdateDataModel = async (
    updatedDataModel: Container['dataModel']
  ) => {
    try {
      const { dataModel: newDataModel, version } =
        await handleUpdateContainerData({
          ...(containerData as Container),
          dataModel: updatedDataModel,
        });

      setContainerData((prev) => ({
        ...(prev as Container),
        dataModel: newDataModel,
        version,
      }));
      getEntityFeedCount();
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const versionHandler = () => {
    history.push(
      getVersionPath(EntityType.CONTAINER, containerName, toString(version))
    );
  };

  const onThreadLinkSelect = (link: string, threadType?: ThreadType) => {
    setThreadLink(link);
    if (threadType) {
      setThreadType(threadType);
    }
  };

  const onThreadPanelClose = () => {
    setThreadLink('');
  };

  const createThread = async (data: CreateThread) => {
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

    if (updatedTags && containerData) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedContainer = { ...containerData, tags: updatedTags };
      await handleExtensionUpdate(updatedContainer);
    }
  };

  const tabs = useMemo(
    () => [
      {
        label: <TabsLabel id={EntityTabs.SCHEMA} name={t('label.schema')} />,
        key: EntityTabs.SCHEMA,
        children: (
          <Row gutter={[0, 16]} wrap={false}>
            <Col className="p-t-sm m-l-lg" flex="auto">
              <div className="d-flex flex-col gap-4">
                <DescriptionV1
                  description={description}
                  entityFieldThreads={getEntityFieldThreadCounts(
                    EntityField.DESCRIPTION,
                    entityFieldThreadCount
                  )}
                  entityFqn={containerName}
                  entityName={entityName}
                  entityType={EntityType.CONTAINER}
                  hasEditAccess={hasEditDescriptionPermission}
                  isEdit={isEditDescription}
                  isReadOnly={deleted}
                  owner={owner}
                  onCancel={() => setIsEditDescription(false)}
                  onDescriptionEdit={() => setIsEditDescription(true)}
                  onDescriptionUpdate={handleUpdateDescription}
                  onThreadLinkSelect={onThreadLinkSelect}
                />

                <ContainerDataModel
                  dataModel={containerData?.dataModel}
                  hasDescriptionEditAccess={hasEditDescriptionPermission}
                  hasTagEditAccess={hasEditTagsPermission}
                  isReadOnly={Boolean(deleted)}
                  onUpdate={handleUpdateDataModel}
                />
              </div>
            </Col>
            <Col
              className="entity-tag-right-panel-container"
              data-testid="entity-right-panel"
              flex="320px">
              <Space className="w-full" direction="vertical" size="large">
                <TagsContainerV1
                  entityFqn={containerName}
                  entityThreadLink={getEntityThreadLink(entityFieldThreadCount)}
                  entityType={EntityType.CONTAINER}
                  permission={
                    hasEditDescriptionPermission && !containerData?.deleted
                  }
                  selectedTags={tags}
                  tagType={TagSource.Classification}
                  onSelectionChange={handleTagSelection}
                  onThreadLinkSelect={onThreadLinkSelect}
                />
                <TagsContainerV1
                  entityFqn={containerName}
                  entityThreadLink={getEntityThreadLink(entityFieldThreadCount)}
                  entityType={EntityType.CONTAINER}
                  permission={
                    hasEditDescriptionPermission && !containerData?.deleted
                  }
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
            count={feedCount}
            id={EntityTabs.ACTIVITY_FEED}
            isActive={tab === EntityTabs.ACTIVITY_FEED}
            name={t('label.activity-feed-and-task-plural')}
          />
        ),
        key: EntityTabs.ACTIVITY_FEED,
        children: (
          <ActivityFeedProvider>
            <ActivityFeedTab
              entityType={EntityType.CONTAINER}
              fqn={containerName}
              onFeedUpdate={getEntityFeedCount}
              onUpdateEntityDetails={() => fetchContainerDetail(containerName)}
            />
          </ActivityFeedProvider>
        ),
      },
      {
        label: (
          <TabsLabel id={EntityTabs.CHILDREN} name={t('label.children')} />
        ),
        key: EntityTabs.CHILDREN,
        children: (
          <Row className="p-md" gutter={[0, 16]}>
            <Col span={24}>
              {isChildrenLoading ? (
                <Loader />
              ) : (
                <ContainerChildren childrenList={containerChildrenData} />
              )}
            </Col>
          </Row>
        ),
      },

      {
        label: <TabsLabel id={EntityTabs.LINEAGE} name={t('label.lineage')} />,
        key: EntityTabs.LINEAGE,
        children: (
          <Card className="lineage-card card-body-full m-md w-auto">
            <EntityLineageComponent
              addLineageHandler={handleAddLineage}
              deleted={deleted}
              entityLineage={entityLineage}
              entityLineageHandler={(lineage: EntityLineage) =>
                setEntityLineage(lineage)
              }
              entityType={EntityType.CONTAINER}
              hasEditAccess={hasEditLineagePermission}
              isLoading={isLineageLoading}
              isNodeLoading={isNodeLoading}
              lineageLeafNodes={leafNodes}
              loadNodeHandler={handleLoadLineageNode}
              removeLineageHandler={handleRemoveLineage}
              onFullScreenClick={handleFullScreenClick}
            />
          </Card>
        ),
      },
      {
        label: (
          <TabsLabel
            id={EntityTabs.CUSTOM_PROPERTIES}
            name={t('label.custom-property-plural')}
          />
        ),
        key: EntityTabs.CUSTOM_PROPERTIES,
        children: (
          <CustomPropertyTable
            entityDetails={
              containerData as CustomPropertyProps['entityDetails']
            }
            entityType={EntityType.CONTAINER}
            handleExtensionUpdate={handleExtensionUpdate}
            hasEditAccess={hasEditCustomFieldsPermission}
          />
        ),
      },
    ],
    [
      containerData,
      description,
      containerName,
      entityName,
      hasEditDescriptionPermission,
      hasEditTagsPermission,
      isEditDescription,
      hasEditLineagePermission,
      hasEditCustomFieldsPermission,
      deleted,
      owner,
      isNodeLoading,
      leafNodes,
      isLineageLoading,
      isChildrenLoading,
      entityFieldThreadCount,
      tags,
      entityLineage,
      entityFieldTaskCount,
      feedCount,
      containerChildrenData,
      handleAddLineage,
      handleUpdateDataModel,
      handleUpdateDescription,
      getEntityFieldThreadCounts,
      handleTagSelection,
      onThreadLinkSelect,
      handleLoadLineageNode,
      handleRemoveLineage,
      handleFullScreenClick,
      handleExtensionUpdate,
    ]
  );

  // Effects
  useEffect(() => {
    if (hasViewPermission) {
      fetchContainerDetail(containerName);
    }
  }, [containerName, containerPermissions]);

  useEffect(() => {
    fetchResourcePermission(containerName);
    // reset parent containers list on containername change
    setParentContainers([]);
  }, [containerName]);

  useEffect(() => {
    if (tab === EntityTabs.LINEAGE) {
      fetchLineageData(containerName);
    }
    if (tab === EntityTabs.CHILDREN) {
      fetchContainerChildren(containerName);
    }
  }, [tab, containerName]);

  useEffect(() => {
    getEntityFeedCount();
  }, [containerName]);

  // Rendering
  if (isLoading || !containerData) {
    return <Loader />;
  }

  if (hasError) {
    return (
      <ErrorPlaceHolder>
        {getEntityMissingError(t('label.container'), containerName)}
      </ErrorPlaceHolder>
    );
  }

  if (!hasViewPermission && !isLoading) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  return (
    <PageLayoutV1
      className="bg-white"
      pageTitle="Table details"
      title="Table details">
      <Row gutter={[0, 12]}>
        <Col className="p-x-lg" span={24}>
          <DataAssetsHeader
            dataAsset={containerData}
            entityType={EntityType.CONTAINER}
            permissions={containerPermissions}
            onDisplayNameUpdate={handleUpdateDisplayName}
            onFollowClick={handleFollowContainer}
            onOwnerUpdate={handleUpdateOwner}
            onRestoreDataAsset={handleRestoreContainer}
            onTierUpdate={handleUpdateTier}
            onVersionClick={versionHandler}
          />
        </Col>
        <Col span={24}>
          <Tabs
            activeKey={tab ?? EntityTabs.DETAILS}
            className="entity-details-page-tabs"
            data-testid="tabs"
            items={tabs}
            onChange={handleTabChange}
          />
        </Col>

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
      </Row>
    </PageLayoutV1>
  );
};

export default observer(ContainerPage);
