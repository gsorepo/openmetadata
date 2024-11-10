/* eslint-disable i18next/no-literal-string */
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

import { Col, Row, Space, Tabs, Tooltip } from 'antd';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import { compare } from 'fast-json-patch';
import { isEmpty, isEqual, isUndefined } from 'lodash';
import { EntityTags } from 'Models';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory, useParams } from 'react-router-dom';
import { ReactComponent as RedAlertIcon } from '../../assets/svg/ic-alert-red.svg';
import { useActivityFeedProvider } from '../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import ActivityThreadPanel from '../../components/ActivityFeed/ActivityThreadPanel/ActivityThreadPanel';
import { withActivityFeed } from '../../components/AppRouter/withActivityFeed';
import { withSuggestions } from '../../components/AppRouter/withSuggestions';
import DescriptionV1 from '../../components/common/EntityDescription/DescriptionV1';
import ErrorPlaceHolder from '../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import Loader from '../../components/common/Loader/Loader';
import ResizablePanels from '../../components/common/ResizablePanels/ResizablePanels';
import { DataAssetsHeader } from '../../components/DataAssets/DataAssetsHeader/DataAssetsHeader.component';
import SchemaTab from '../../components/Database/SchemaTab/SchemaTab.component';
import { QueryVote } from '../../components/Database/TableQueries/TableQueries.interface';
import EntityRightPanel from '../../components/Entity/EntityRightPanel/EntityRightPanel';
import { EntityName } from '../../components/Modals/EntityNameModal/EntityNameModal.interface';
import PageLayoutV1 from '../../components/PageLayoutV1/PageLayoutV1';
import { FQN_SEPARATOR_CHAR } from '../../constants/char.constants';
import {
  getEntityDetailsPath,
  getVersionPath,
  ROUTES,
} from '../../constants/constants';
import { FEED_COUNT_INITIAL_DATA } from '../../constants/entity.constants';
import { mockDatasetData } from '../../constants/mockTourData.constants';
import { COMMON_RESIZABLE_PANEL_CONFIG } from '../../constants/ResizablePanel.constants';
import { usePermissionProvider } from '../../context/PermissionProvider/PermissionProvider';
import {
  OperationPermission,
  ResourceEntity,
} from '../../context/PermissionProvider/PermissionProvider.interface';
import { useTourProvider } from '../../context/TourProvider/TourProvider';
import { ClientErrors } from '../../enums/Axios.enum';
import { ERROR_PLACEHOLDER_TYPE } from '../../enums/common.enum';
import {
  EntityTabs,
  EntityType,
  FqnPart,
  TabSpecificField,
} from '../../enums/entity.enum';
import { CreateThread } from '../../generated/api/feed/createThread';
import { Tag } from '../../generated/entity/classification/tag';
import { Table, TableType } from '../../generated/entity/data/table';
import { Suggestion } from '../../generated/entity/feed/suggestion';
import { ThreadType } from '../../generated/entity/feed/thread';
import { TestSummary } from '../../generated/tests/testCase';
import { TagLabel } from '../../generated/type/tagLabel';
import LimitWrapper from '../../hoc/LimitWrapper';
import { useApplicationStore } from '../../hooks/useApplicationStore';
import { useFqn } from '../../hooks/useFqn';
import { useSub } from '../../hooks/usePubSub';
import { FeedCounts } from '../../interface/feed.interface';
import { postThread } from '../../rest/feedsAPI';
import { getDataQualityLineage } from '../../rest/lineageAPI';
import { getQueriesList } from '../../rest/queryAPI';
import {
  addFollower,
  getTableDetailsByFQN,
  patchTableDetails,
  removeFollower,
  restoreTable,
  updateTablesVotes,
} from '../../rest/tableAPI';
import { getTestCaseExecutionSummary } from '../../rest/testAPI';
import {
  addToRecentViewed,
  getFeedCounts,
  getPartialNameFromTableFQN,
  sortTagsCaseInsensitive,
} from '../../utils/CommonUtils';
import { defaultFields } from '../../utils/DatasetDetailsUtils';
import EntityLink from '../../utils/EntityLink';
import entityUtilClassBase from '../../utils/EntityUtilClassBase';
import { getEntityName } from '../../utils/EntityUtils';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import tableClassBase from '../../utils/TableClassBase';
import {
  getJoinsFromTableJoins,
  getTagsWithoutTier,
  getTierTags,
} from '../../utils/TableUtils';
import { createTagObject, updateTierTag } from '../../utils/TagsUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import { FrequentlyJoinedTables } from './FrequentlyJoinedTables/FrequentlyJoinedTables.component';
import './table-details-page-v1.less';
import TableConstraints from './TableConstraints/TableConstraints';

const TableDetailsPageV1: React.FC = () => {
  const { isTourOpen, activeTabForTourDatasetPage, isTourPage } =
    useTourProvider();
  const { currentUser } = useApplicationStore();
  const [tableDetails, setTableDetails] = useState<Table>();
  const { tab: activeTab = EntityTabs.SCHEMA } =
    useParams<{ tab: EntityTabs }>();
  const { fqn: datasetFQN } = useFqn();
  const { t } = useTranslation();
  const history = useHistory();
  const USERId = currentUser?.id ?? '';
  const [feedCount, setFeedCount] = useState<FeedCounts>(
    FEED_COUNT_INITIAL_DATA
  );
  const [isEdit, setIsEdit] = useState(false);
  const [threadLink, setThreadLink] = useState<string>('');
  const [threadType, setThreadType] = useState<ThreadType>(
    ThreadType.Conversation
  );
  const [queryCount, setQueryCount] = useState(0);

  const [loading, setLoading] = useState(!isTourOpen);
  const [tablePermissions, setTablePermissions] = useState<OperationPermission>(
    DEFAULT_ENTITY_PERMISSION
  );
  const [testCaseSummary, setTestCaseSummary] = useState<TestSummary>();
  const [dqFailureCount, setDqFailureCount] = useState(0);

  const tableFqn = useMemo(
    () =>
      getPartialNameFromTableFQN(
        datasetFQN,
        [FqnPart.Service, FqnPart.Database, FqnPart.Schema, FqnPart.Table],
        FQN_SEPARATOR_CHAR
      ),
    [datasetFQN]
  );

  const alertBadge = useMemo(() => {
    return tableClassBase.getAlertEnableStatus() && dqFailureCount > 0 ? (
      <Tooltip
        placement="right"
        title={t('label.check-active-data-quality-incident-plural')}>
        <Link
          to={getEntityDetailsPath(
            EntityType.TABLE,
            tableFqn,
            EntityTabs.PROFILER
          )}>
          <RedAlertIcon height={24} width={24} />
        </Link>
      </Tooltip>
    ) : undefined;
  }, [dqFailureCount, tableFqn]);

  const extraDropdownContent = useMemo(
    () =>
      entityUtilClassBase.getManageExtraOptions(
        EntityType.TABLE,
        tableFqn,
        tablePermissions
      ),
    [tablePermissions, tableFqn]
  );

  const { viewUsagePermission, viewTestCasePermission } = useMemo(
    () => ({
      viewUsagePermission:
        tablePermissions.ViewAll || tablePermissions.ViewUsage,
      viewTestCasePermission:
        tablePermissions.ViewAll || tablePermissions.ViewTests,
    }),
    [tablePermissions]
  );

  const isViewTableType = useMemo(
    () => tableDetails?.tableType === TableType.View,
    [tableDetails?.tableType]
  );

  const fetchTableDetails = useCallback(async () => {
    setLoading(true);
    try {
      let fields = defaultFields;
      if (viewUsagePermission) {
        fields += `,${TabSpecificField.USAGE_SUMMARY}`;
      }
      if (viewTestCasePermission) {
        fields += `,${TabSpecificField.TESTSUITE}`;
      }

      const details = await getTableDetailsByFQN(tableFqn, { fields });

      setTableDetails(details);
      addToRecentViewed({
        displayName: getEntityName(details),
        entityType: EntityType.TABLE,
        fqn: details.fullyQualifiedName ?? '',
        serviceType: details.serviceType,
        timestamp: 0,
        id: details.id,
      });
    } catch (error) {
      if ((error as AxiosError)?.response?.status === ClientErrors.FORBIDDEN) {
        history.replace(ROUTES.FORBIDDEN);
      }
    } finally {
      setLoading(false);
    }
  }, [tableFqn, viewUsagePermission]);

  const fetchDQFailureCount = async () => {
    if (!tableClassBase.getAlertEnableStatus()) {
      setDqFailureCount(0);
    }

    // Todo: Remove this once we have support for count in API
    try {
      const data = await getDataQualityLineage(tableFqn, {
        upstreamDepth: 3,
      });
      const updatedNodes =
        data.nodes?.filter((node) => node.fullyQualifiedName !== tableFqn) ??
        [];
      setDqFailureCount(updatedNodes.length);
    } catch (error) {
      setDqFailureCount(0);
    }
  };

  const fetchTestCaseSummary = async () => {
    try {
      if (isUndefined(tableDetails?.testSuite?.id)) {
        await fetchDQFailureCount();

        return;
      }

      const response = await getTestCaseExecutionSummary(
        tableDetails?.testSuite?.id
      );
      setTestCaseSummary(response);

      const failureCount =
        response.columnTestSummary?.reduce((acc, curr) => {
          return acc + (curr.failed ?? 0);
        }, response.failed ?? 0) ??
        response.failed ??
        0;

      if (failureCount === 0) {
        await fetchDQFailureCount();
      } else {
        setDqFailureCount(failureCount);
      }
    } catch (error) {
      setTestCaseSummary(undefined);
    }
  };

  const fetchQueryCount = async () => {
    if (!tableDetails?.id) {
      return;
    }
    try {
      const response = await getQueriesList({
        limit: 0,
        entityId: tableDetails.id,
      });
      setQueryCount(response.paging.total);
    } catch (error) {
      setQueryCount(0);
    }
  };

  const onDescriptionEdit = (): void => {
    setIsEdit(true);
  };
  const onCancel = () => {
    setIsEdit(false);
  };

  const { postFeed, deleteFeed, updateFeed } = useActivityFeedProvider();
  const {
    tier,
    tableTags,
    deleted,
    version,
    followers = [],
    description,
    entityName,
    joinedTables = [],
    id: tableId = '',
  } = useMemo(() => {
    if (tableDetails) {
      const { tags } = tableDetails;

      const { joins } = tableDetails ?? {};

      return {
        ...tableDetails,
        tier: getTierTags(tags ?? []),
        tableTags: getTagsWithoutTier(tags ?? []),
        entityName: getEntityName(tableDetails),
        joinedTables: getJoinsFromTableJoins(joins),
      };
    }

    return {} as Table & {
      tier: TagLabel;
      tableTags: EntityTags[];
      entityName: string;
      joinedTables: Array<{
        fullyQualifiedName: string;
        joinCount: number;
        name: string;
      }>;
    };
  }, [tableDetails, tableDetails?.tags]);

  const { getEntityPermissionByFqn } = usePermissionProvider();

  const fetchResourcePermission = useCallback(
    async (tableFqn) => {
      try {
        const tablePermission = await getEntityPermissionByFqn(
          ResourceEntity.TABLE,
          tableFqn
        );

        setTablePermissions(tablePermission);
      } catch (error) {
        showErrorToast(
          t('server.fetch-entity-permissions-error', {
            entity: t('label.resource-permission-lowercase'),
          })
        );
      } finally {
        setLoading(false);
      }
    },
    [getEntityPermissionByFqn, setTablePermissions]
  );

  useEffect(() => {
    if (tableFqn) {
      fetchResourcePermission(tableFqn);
    }
  }, [tableFqn]);

  const handleFeedCount = useCallback((data: FeedCounts) => {
    setFeedCount(data);
  }, []);

  const getEntityFeedCount = () => {
    getFeedCounts(EntityType.TABLE, tableFqn, handleFeedCount);
  };

  const handleTabChange = (activeKey: string) => {
    if (activeKey !== activeTab) {
      if (!isTourOpen) {
        history.push(
          getEntityDetailsPath(EntityType.TABLE, tableFqn, activeKey)
        );
      }
    }
  };

  const saveUpdatedTableData = useCallback(
    (updatedData: Table) => {
      if (!tableDetails) {
        return updatedData;
      }
      const jsonPatch = compare(tableDetails, updatedData);

      return patchTableDetails(tableId, jsonPatch);
    },
    [tableDetails, tableId]
  );

  const onTableUpdate = async (updatedTable: Table, key: keyof Table) => {
    try {
      const res = await saveUpdatedTableData(updatedTable);

      setTableDetails((previous) => {
        if (!previous) {
          return;
        }
        if (key === 'tags') {
          return {
            ...previous,
            version: res.version,
            [key]: sortTagsCaseInsensitive(res.tags ?? []),
          };
        }

        const updatedObj = {
          ...previous,
          version: res.version,
          [key]: res[key],
        };

        // If operation was to remove let's remove the key itself
        if (res[key] === undefined) {
          delete updatedObj[key];
        }

        return updatedObj;
      });
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const handleUpdateOwner = useCallback(
    async (newOwners?: Table['owners']) => {
      if (!tableDetails) {
        return;
      }
      const updatedTableDetails = {
        ...tableDetails,
        owners: newOwners,
      };
      await onTableUpdate(updatedTableDetails, 'owners');
    },
    [tableDetails]
  );

  const handleUpdateRetentionPeriod = useCallback(
    async (newRetentionPeriod: Table['retentionPeriod']) => {
      if (!tableDetails) {
        return;
      }
      const updatedTableDetails = {
        ...tableDetails,
        retentionPeriod: newRetentionPeriod,
      };
      await onTableUpdate(updatedTableDetails, 'retentionPeriod');
    },
    [tableDetails]
  );

  const onDescriptionUpdate = async (updatedHTML: string) => {
    if (!tableDetails) {
      return;
    }
    if (description !== updatedHTML) {
      const updatedTableDetails = {
        ...tableDetails,
        description: updatedHTML,
      };
      await onTableUpdate(updatedTableDetails, 'description');
      setIsEdit(false);
    } else {
      setIsEdit(false);
    }
  };

  const onTableConstraintsUpdate = async (
    updatedTableConstraints: Table['tableConstraints']
  ) => {
    if (!tableDetails) {
      return;
    }
    const updatedTableDetails = {
      ...tableDetails,
      tableConstraints: updatedTableConstraints,
    };
    await onTableUpdate(updatedTableDetails, 'tableConstraints');
  };

  const onColumnsUpdate = async (updateColumns: Table['columns']) => {
    if (tableDetails && !isEqual(tableDetails.columns, updateColumns)) {
      const updatedTableDetails = {
        ...tableDetails,
        columns: updateColumns,
      };
      await onTableUpdate(updatedTableDetails, 'columns');
    }
  };

  const onThreadLinkSelect = (link: string, threadType?: ThreadType) => {
    setThreadLink(link);
    if (threadType) {
      setThreadType(threadType);
    }
  };

  const handleDisplayNameUpdate = async (data: EntityName) => {
    if (!tableDetails) {
      return;
    }
    const updatedTable = { ...tableDetails, displayName: data.displayName };
    await onTableUpdate(updatedTable, 'displayName');
  };

  /**
   * Formulates updated tags and updates table entity data for API call
   * @param selectedTags
   */
  const handleTagsUpdate = async (selectedTags?: Array<TagLabel>) => {
    if (selectedTags && tableDetails) {
      const updatedTags = [...(tier ? [tier] : []), ...selectedTags];
      const updatedTable = { ...tableDetails, tags: updatedTags };
      await onTableUpdate(updatedTable, 'tags');
    }
  };

  const handleTagSelection = async (selectedTags: EntityTags[]) => {
    const updatedTags: TagLabel[] | undefined = createTagObject(selectedTags);
    await handleTagsUpdate(updatedTags);
  };

  const onExtensionUpdate = async (updatedData: Table) => {
    tableDetails &&
      (await onTableUpdate(
        {
          ...tableDetails,
          extension: updatedData.extension,
        },
        'extension'
      ));
  };

  const {
    editTagsPermission,
    editDescriptionPermission,
    editCustomAttributePermission,
    editAllPermission,
    editLineagePermission,
    viewSampleDataPermission,
    viewQueriesPermission,
    viewProfilerPermission,
    viewAllPermission,
    viewBasicPermission,
  } = useMemo(
    () => ({
      editTagsPermission:
        (tablePermissions.EditTags || tablePermissions.EditAll) && !deleted,
      editDescriptionPermission:
        (tablePermissions.EditDescription || tablePermissions.EditAll) &&
        !deleted,
      editCustomAttributePermission:
        (tablePermissions.EditAll || tablePermissions.EditCustomFields) &&
        !deleted,
      editAllPermission: tablePermissions.EditAll && !deleted,
      editLineagePermission:
        (tablePermissions.EditAll || tablePermissions.EditLineage) && !deleted,
      viewSampleDataPermission:
        tablePermissions.ViewAll || tablePermissions.ViewSampleData,
      viewQueriesPermission:
        tablePermissions.ViewAll || tablePermissions.ViewQueries,
      viewProfilerPermission:
        tablePermissions.ViewAll ||
        tablePermissions.ViewDataProfile ||
        tablePermissions.ViewTests,
      viewAllPermission: tablePermissions.ViewAll,
      viewBasicPermission:
        tablePermissions.ViewAll || tablePermissions.ViewBasic,
    }),
    [tablePermissions, deleted]
  );

  const schemaTab = useMemo(
    () => (
      <Row
        className={classNames({
          'h-70vh overflow-hidden': isTourPage,
        })}
        gutter={[0, 16]}
        id="schemaDetails"
        wrap={false}>
        <Col className="tab-content-height-with-resizable-panel" span={24}>
          <ResizablePanels
            firstPanel={{
              className: 'entity-resizable-panel-container',
              children: (
                <div className="d-flex flex-col gap-4 p-t-sm m-l-lg p-r-lg">
                  <DescriptionV1
                    showSuggestions
                    description={tableDetails?.description}
                    entityFqn={tableFqn}
                    entityName={entityName}
                    entityType={EntityType.TABLE}
                    hasEditAccess={editDescriptionPermission}
                    isDescriptionExpanded={isEmpty(tableDetails?.columns)}
                    isEdit={isEdit}
                    owner={tableDetails?.owners}
                    showActions={!deleted}
                    onCancel={onCancel}
                    onDescriptionEdit={onDescriptionEdit}
                    onDescriptionUpdate={onDescriptionUpdate}
                    onThreadLinkSelect={onThreadLinkSelect}
                  />
                  <SchemaTab
                    hasDescriptionEditAccess={editDescriptionPermission}
                    hasTagEditAccess={editTagsPermission}
                    isReadOnly={deleted}
                    table={tableDetails}
                    testCaseSummary={testCaseSummary}
                    onThreadLinkSelect={onThreadLinkSelect}
                    onUpdate={onColumnsUpdate}
                  />
                </div>
              ),
              ...COMMON_RESIZABLE_PANEL_CONFIG.LEFT_PANEL,
            }}
            secondPanel={{
              children: (
                <div data-testid="entity-right-panel">
                  <EntityRightPanel<EntityType.TABLE>
                    afterSlot={
                      <Space
                        className="w-full m-t-lg"
                        direction="vertical"
                        size="large">
                        <TableConstraints
                          hasPermission={editAllPermission && !deleted}
                          tableDetails={tableDetails}
                          onUpdate={onTableConstraintsUpdate}
                        />
                      </Space>
                    }
                    beforeSlot={
                      !isEmpty(joinedTables) ? (
                        <FrequentlyJoinedTables joinedTables={joinedTables} />
                      ) : null
                    }
                    customProperties={tableDetails}
                    dataProducts={tableDetails?.dataProducts ?? []}
                    domain={tableDetails?.domain}
                    editCustomAttributePermission={
                      editCustomAttributePermission
                    }
                    editTagPermission={editTagsPermission}
                    entityFQN={tableFqn}
                    entityId={tableDetails?.id ?? ''}
                    entityType={EntityType.TABLE}
                    selectedTags={tableTags}
                    tablePartition={tableDetails?.tablePartition}
                    viewAllPermission={viewAllPermission}
                    onExtensionUpdate={onExtensionUpdate}
                    onTagSelectionChange={handleTagSelection}
                    onThreadLinkSelect={onThreadLinkSelect}
                  />
                </div>
              ),
              ...COMMON_RESIZABLE_PANEL_CONFIG.RIGHT_PANEL,
              className:
                'entity-resizable-panel-container entity-resizable-right-panel-container ',
            }}
          />
        </Col>
      </Row>
    ),
    [
      isTourPage,
      tableTags,
      joinedTables,
      tableFqn,
      isEdit,
      deleted,
      tableDetails,
      entityName,
      onDescriptionEdit,
      onDescriptionUpdate,
      testCaseSummary,
      editTagsPermission,
      editDescriptionPermission,
      editAllPermission,
      viewAllPermission,
      editCustomAttributePermission,
    ]
  );

  const tabs = useMemo(() => {
    return tableClassBase
      .getTableDetailPageTabs({
        schemaTab,
        queryCount,
        isTourOpen,
        tablePermissions,
        activeTab,
        deleted,
        tableDetails,
        totalFeedCount: feedCount.totalCount,
        onExtensionUpdate,
        getEntityFeedCount,
        handleFeedCount,
        viewAllPermission,
        editCustomAttributePermission,
        viewSampleDataPermission,
        viewQueriesPermission,
        viewProfilerPermission,
        editLineagePermission,
        fetchTableDetails,
        testCaseSummary,
        isViewTableType,
      })
      .filter((data) => !data.isHidden);
  }, [
    schemaTab,
    queryCount,
    isTourOpen,
    tablePermissions,
    activeTab,
    deleted,
    tableDetails,
    feedCount.totalCount,
    onExtensionUpdate,
    getEntityFeedCount,
    handleFeedCount,
    viewAllPermission,
    editCustomAttributePermission,
    viewSampleDataPermission,
    viewQueriesPermission,
    viewProfilerPermission,
    editLineagePermission,
    fetchTableDetails,
    testCaseSummary,
    isViewTableType,
  ]);

  const onTierUpdate = useCallback(
    async (newTier?: Tag) => {
      if (tableDetails) {
        const tierTag: Table['tags'] = updateTierTag(tableTags, newTier);
        const updatedTableDetails = {
          ...tableDetails,
          tags: tierTag,
        };

        await onTableUpdate(updatedTableDetails, 'tags');
      }
    },
    [tableDetails, onTableUpdate, tableTags]
  );

  const handleToggleDelete = (version?: number) => {
    setTableDetails((prev) => {
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

  const handleRestoreTable = async () => {
    try {
      const { version: newVersion } = await restoreTable(
        tableDetails?.id ?? ''
      );
      showSuccessToast(
        t('message.restore-entities-success', {
          entity: t('label.table'),
        }),
        2000
      );
      handleToggleDelete(newVersion);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('message.restore-entities-error', {
          entity: t('label.table'),
        })
      );
    }
  };

  const followTable = useCallback(async () => {
    try {
      const res = await addFollower(tableId, USERId);
      const { newValue } = res.changeDescription.fieldsAdded[0];
      const newFollowers = [...(followers ?? []), ...newValue];
      setTableDetails((prev) => {
        if (!prev) {
          return prev;
        }

        return { ...prev, followers: newFollowers };
      });
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-follow-error', {
          entity: entityName,
        })
      );
    }
  }, [USERId, tableId, entityName, setTableDetails]);

  const unFollowTable = useCallback(async () => {
    try {
      const res = await removeFollower(tableId, USERId);
      const { oldValue } = res.changeDescription.fieldsDeleted[0];
      setTableDetails((pre) => {
        if (!pre) {
          return pre;
        }

        return {
          ...pre,
          followers: pre.followers?.filter(
            (follower) => follower.id !== oldValue[0].id
          ),
        };
      });
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-unfollow-error', {
          entity: entityName,
        })
      );
    }
  }, [USERId, tableId, entityName, setTableDetails]);

  const { isFollowing } = useMemo(() => {
    return {
      isFollowing: followers?.some(({ id }) => id === USERId),
    };
  }, [followers, USERId]);

  const handleFollowTable = useCallback(async () => {
    isFollowing ? await unFollowTable() : await followTable();
  }, [isFollowing, unFollowTable, followTable]);

  const versionHandler = useCallback(() => {
    version &&
      history.push(getVersionPath(EntityType.TABLE, tableFqn, version + ''));
  }, [version, tableFqn]);

  const afterDeleteAction = useCallback(
    (isSoftDelete?: boolean, version?: number) =>
      isSoftDelete ? handleToggleDelete(version) : history.push('/'),
    []
  );

  const updateTableDetailsState = useCallback((data) => {
    const updatedData = data as Table;

    setTableDetails((data) => ({
      ...(data ?? updatedData),
      version: updatedData.version,
    }));
  }, []);

  const updateDescriptionFromSuggestions = useCallback(
    (suggestion: Suggestion) => {
      setTableDetails((prev) => {
        if (!prev) {
          return;
        }

        const activeCol = prev?.columns.find((column) => {
          return (
            EntityLink.getTableEntityLink(
              prev.fullyQualifiedName ?? '',
              column.name ?? ''
            ) === suggestion.entityLink
          );
        });

        if (!activeCol) {
          return {
            ...prev,
            description: suggestion.description,
          };
        } else {
          const updatedColumns = prev.columns.map((column) => {
            if (column.fullyQualifiedName === activeCol.fullyQualifiedName) {
              return {
                ...column,
                description: suggestion.description,
              };
            } else {
              return column;
            }
          });

          return {
            ...prev,
            columns: updatedColumns,
          };
        }
      });
    },
    []
  );

  useEffect(() => {
    if (isTourOpen || isTourPage) {
      setTableDetails(mockDatasetData.tableDetails as unknown as Table);
    } else if (viewBasicPermission) {
      fetchTableDetails();
      getEntityFeedCount();
    }
  }, [tableFqn, isTourOpen, isTourPage, tablePermissions]);

  useEffect(() => {
    if (tableDetails) {
      fetchQueryCount();
      fetchTestCaseSummary();
    }
  }, [tableDetails?.fullyQualifiedName]);

  useSub(
    'updateDetails',
    (suggestion: Suggestion) => {
      updateDescriptionFromSuggestions(suggestion);
    },
    [tableDetails]
  );

  const onThreadPanelClose = () => {
    setThreadLink('');
  };

  const createThread = async (data: CreateThread) => {
    try {
      await postThread(data);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.create-entity-error', {
          entity: t('label.conversation'),
        })
      );
    }
  };

  const updateVote = async (data: QueryVote, id: string) => {
    try {
      await updateTablesVotes(id, data);
      const details = await getTableDetailsByFQN(tableFqn, {
        fields: defaultFields,
      });
      setTableDetails(details);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (!(isTourOpen || isTourPage) && !viewBasicPermission) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  if (!tableDetails) {
    return <ErrorPlaceHolder className="m-0" />;
  }

  return (
    <PageLayoutV1
      className="bg-white"
      pageTitle={t('label.entity-detail-plural', {
        entity: t('label.table'),
      })}
      title="Table details">
      <Row gutter={[0, 12]}>
        {/* Entity Heading */}
        <Col className="p-x-lg" data-testid="entity-page-header" span={24}>
          <DataAssetsHeader
            isRecursiveDelete
            afterDeleteAction={afterDeleteAction}
            afterDomainUpdateAction={updateTableDetailsState}
            badge={alertBadge}
            dataAsset={tableDetails}
            entityType={EntityType.TABLE}
            extraDropdownContent={extraDropdownContent}
            openTaskCount={feedCount.openTaskCount}
            permissions={tablePermissions}
            onDisplayNameUpdate={handleDisplayNameUpdate}
            onFollowClick={handleFollowTable}
            onOwnerUpdate={handleUpdateOwner}
            onRestoreDataAsset={handleRestoreTable}
            onTierUpdate={onTierUpdate}
            onUpdateRetentionPeriod={handleUpdateRetentionPeriod}
            onUpdateVote={updateVote}
            onVersionClick={versionHandler}
          />
        </Col>
        {/* Entity Tabs */}
        <Col span={24}>
          <Tabs
            activeKey={
              isTourOpen
                ? activeTabForTourDatasetPage
                : activeTab ?? EntityTabs.SCHEMA
            }
            className="table-details-page-tabs entity-details-page-tabs"
            data-testid="tabs"
            items={tabs}
            onChange={handleTabChange}
          />
        </Col>
        <LimitWrapper resource="table">
          <></>
        </LimitWrapper>
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

export default withSuggestions(withActivityFeed(TableDetailsPageV1));
