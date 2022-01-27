/*
 *  Copyright 2021 Collate
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

import { AxiosError, AxiosResponse } from 'axios';
import { compare } from 'fast-json-patch';
import { observer } from 'mobx-react';
import { EntityTags, LeafNodes, LineagePos, LoadingNodeState } from 'Models';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import AppState from '../../AppState';
import { getLineageByFQN } from '../../axiosAPIs/lineageAPI';
import { addLineage, deleteLineageEdge } from '../../axiosAPIs/miscAPI';
import {
  addFollower,
  getTableDetailsByFQN,
  patchTableDetails,
  removeFollower,
} from '../../axiosAPIs/tableAPI';
import { TitleBreadcrumbProps } from '../../components/common/title-breadcrumb/title-breadcrumb.interface';
import DatasetDetails from '../../components/DatasetDetails/DatasetDetails.component';
import {
  Edge,
  EdgeData,
} from '../../components/EntityLineage/EntityLineage.interface';
import Loader from '../../components/Loader/Loader';
import {
  getDatabaseDetailsPath,
  getServiceDetailsPath,
  getTableTabPath,
  getVersionPath,
} from '../../constants/constants';
import { EntityType } from '../../enums/entity.enum';
import { ServiceCategory } from '../../enums/service.enum';
import {
  EntityReference,
  Table,
  TableData,
  TableJoins,
  TypeUsedToReturnUsageDetailsOfAnEntity,
} from '../../generated/entity/data/table';
import { User } from '../../generated/entity/teams/user';
import { EntityLineage } from '../../generated/type/entityLineage';
import { TagLabel } from '../../generated/type/tagLabel';
import useToastContext from '../../hooks/useToastContext';
import {
  addToRecentViewed,
  getCurrentUserId,
  getPartialNameFromFQN,
} from '../../utils/CommonUtils';
import {
  datasetTableTabs,
  getCurrentDatasetTab,
} from '../../utils/DatasetDetailsUtils';
import { getEntityLineage } from '../../utils/EntityUtils';
import { serviceTypeLogo } from '../../utils/ServiceUtils';
import { getOwnerFromId, getTierTags } from '../../utils/TableUtils';
import { getTableTags } from '../../utils/TagsUtils';

const DatasetDetailsPage: FunctionComponent = () => {
  const history = useHistory();
  const showToast = useToastContext();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLineageLoading, setIsLineageLoading] = useState<boolean>(true);
  const USERId = getCurrentUserId();
  const [tableId, setTableId] = useState('');
  const [tier, setTier] = useState<TagLabel>();
  const [name, setName] = useState('');
  const [followers, setFollowers] = useState<Array<User>>([]);
  const [slashedTableName, setSlashedTableName] = useState<
    TitleBreadcrumbProps['titleLinks']
  >([]);
  const [description, setDescription] = useState('');
  const [columns, setColumns] = useState<Table['columns']>([]);
  const [sampleData, setSampleData] = useState<TableData>({
    columns: [],
    rows: [],
  });
  const [tableTags, setTableTags] = useState<Array<EntityTags>>([]);
  const [owner, setOwner] = useState<
    Table['owner'] & { displayName?: string }
  >();
  const [joins, setJoins] = useState<TableJoins>({
    startDate: new Date(),
    dayCount: 0,
    columnJoins: [],
  });
  const [tableProfile, setTableProfile] = useState<Table['tableProfile']>([]);
  const [tableDetails, setTableDetails] = useState<Table>({} as Table);
  const { datasetFQN, tab } = useParams() as Record<string, string>;
  const [activeTab, setActiveTab] = useState<number>(getCurrentDatasetTab(tab));
  const [entityLineage, setEntityLineage] = useState<EntityLineage>(
    {} as EntityLineage
  );
  const [leafNodes, setLeafNodes] = useState<LeafNodes>({} as LeafNodes);
  const [usageSummary, setUsageSummary] =
    useState<TypeUsedToReturnUsageDetailsOfAnEntity>(
      {} as TypeUsedToReturnUsageDetailsOfAnEntity
    );
  const [currentVersion, setCurrentVersion] = useState<string>();
  const [isNodeLoading, setNodeLoading] = useState<LoadingNodeState>({
    id: undefined,
    state: false,
  });
  const [tableFQN, setTableFQN] = useState<string>(
    getPartialNameFromFQN(datasetFQN, ['service', 'database', 'table'], '.')
  );
  const [deleted, setDeleted] = useState<boolean>(false);

  const activeTabHandler = (tabValue: number) => {
    const currentTabIndex = tabValue - 1;
    if (datasetTableTabs[currentTabIndex].path !== tab) {
      setActiveTab(
        getCurrentDatasetTab(datasetTableTabs[currentTabIndex].path)
      );
      history.push({
        pathname: getTableTabPath(
          tableFQN,
          datasetTableTabs[currentTabIndex].path
        ),
      });
    }
  };

  useEffect(() => {
    if (datasetTableTabs[activeTab - 1].path !== tab) {
      setActiveTab(getCurrentDatasetTab(tab));
    }
  }, [tab]);

  const saveUpdatedTableData = (updatedData: Table): Promise<AxiosResponse> => {
    const jsonPatch = compare(tableDetails, updatedData);

    return patchTableDetails(
      tableId,
      jsonPatch
    ) as unknown as Promise<AxiosResponse>;
  };

  const descriptionUpdateHandler = (updatedTable: Table) => {
    saveUpdatedTableData(updatedTable).then((res: AxiosResponse) => {
      const { description, version } = res.data;
      setCurrentVersion(version);
      setTableDetails(res.data);
      setDescription(description);
    });
  };

  const columnsUpdateHandler = (updatedTable: Table) => {
    saveUpdatedTableData(updatedTable).then((res: AxiosResponse) => {
      const { columns, version } = res.data;
      setCurrentVersion(version);
      setTableDetails(res.data);
      setColumns(columns);
      setTableTags(getTableTags(columns || []));
    });
  };

  const settingsUpdateHandler = (updatedTable: Table): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      saveUpdatedTableData(updatedTable)
        .then((res) => {
          const { version, owner, tags } = res.data;
          setCurrentVersion(version);
          setTableDetails(res.data);
          setOwner(getOwnerFromId(owner?.id));
          setTier(getTierTags(tags));
          resolve();
        })
        .catch(() => reject());
    });
  };

  const followTable = () => {
    addFollower(tableId, USERId).then((res: AxiosResponse) => {
      const { newValue } = res.data.changeDescription.fieldsAdded[0];

      setFollowers([...followers, ...newValue]);
    });
  };
  const unfollowTable = () => {
    removeFollower(tableId, USERId).then((res: AxiosResponse) => {
      const { oldValue } = res.data.changeDescription.fieldsDeleted[0];

      setFollowers(
        followers.filter((follower) => follower.id !== oldValue[0].id)
      );
    });
  };

  const versionHandler = () => {
    history.push(
      getVersionPath(EntityType.TABLE, tableFQN, currentVersion as string)
    );
  };

  const setLeafNode = (val: EntityLineage, pos: LineagePos) => {
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

  const entityLineageHandler = (lineage: EntityLineage) => {
    setEntityLineage(lineage);
  };

  const loadNodeHandler = (node: EntityReference, pos: LineagePos) => {
    setNodeLoading({ id: node.id, state: true });
    getLineageByFQN(node.name, node.type).then((res: AxiosResponse) => {
      setLeafNode(res.data, pos);
      setEntityLineage(getEntityLineage(entityLineage, res.data, pos));
      setTimeout(() => {
        setNodeLoading((prev) => ({ ...prev, state: false }));
      }, 500);
    });
  };

  const addLineageHandler = (edge: Edge): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      addLineage(edge)
        .then(() => {
          resolve();
        })
        .catch(() => {
          showToast({
            variant: 'error',
            body: `Error while adding adding new edge`,
          });
          reject();
        });
    });
  };

  const removeLineageHandler = (data: EdgeData) => {
    deleteLineageEdge(
      data.fromEntity,
      data.fromId,
      data.toEntity,
      data.toId
    ).catch(() => {
      showToast({
        variant: 'error',
        body: `Error while removing edge`,
      });
    });
  };

  const getLineageData = () => {
    getLineageByFQN(tableFQN, EntityType.TABLE)
      .then((res: AxiosResponse) => {
        setEntityLineage(res.data);
      })
      .catch((err: AxiosError) => {
        showToast({
          variant: 'error',
          body: err.message ?? 'Error while fetching lineage data',
        });
      })
      .finally(() => {
        setIsLineageLoading(false);
      });
  };

  useEffect(() => {
    setIsLoading(true);
    getTableDetailsByFQN(
      tableFQN,
      'columns, usageSummary, followers, joins, tags, owner, sampleData, tableProfile, dataModel'
    )
      .then((res: AxiosResponse) => {
        const {
          description,
          id,
          name,
          columns,
          database,
          deleted,
          owner,
          usageSummary,
          followers,
          fullyQualifiedName,
          joins,
          tags,
          sampleData,
          tableProfile,
          version,
          service,
          serviceType,
        } = res.data;
        setTableDetails(res.data);
        setTableId(id);
        setCurrentVersion(version);
        setTier(getTierTags(tags));
        setOwner(getOwnerFromId(owner?.id));
        setFollowers(followers);
        setDeleted(deleted);
        setSlashedTableName([
          {
            name: service.name,
            url: service.name
              ? getServiceDetailsPath(
                  service.name,
                  serviceType,
                  ServiceCategory.DATABASE_SERVICES
                )
              : '',
            imgSrc: serviceType ? serviceTypeLogo(serviceType) : undefined,
          },
          {
            name: getPartialNameFromFQN(database.name, ['database']),
            url: getDatabaseDetailsPath(database.name),
          },
          {
            name: name,
            url: '',
            activeTitle: true,
          },
        ]);

        addToRecentViewed({
          entityType: EntityType.TABLE,
          fqn: fullyQualifiedName,
          serviceType: serviceType,
          timestamp: 0,
        });
        setName(name);

        setDescription(description);
        setColumns(columns || []);
        setSampleData(sampleData);
        setTableProfile(tableProfile || []);
        setTableTags(getTableTags(columns || []));
        setUsageSummary(usageSummary);
        setJoins(joins);

        if (!deleted) {
          getLineageData();
        } else {
          setIsLineageLoading(false);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    setActiveTab(getCurrentDatasetTab(tab));
  }, [tableFQN]);

  useEffect(() => {
    setTableFQN(
      getPartialNameFromFQN(datasetFQN, ['service', 'database', 'table'], '.')
    );
  }, [datasetFQN]);

  return (
    <>
      {isLoading || isLineageLoading ? (
        <Loader />
      ) : (
        <DatasetDetails
          activeTab={activeTab}
          addLineageHandler={addLineageHandler}
          columns={columns}
          columnsUpdateHandler={columnsUpdateHandler}
          dataModel={tableDetails.dataModel}
          datasetFQN={tableFQN}
          deleted={deleted}
          description={description}
          descriptionUpdateHandler={descriptionUpdateHandler}
          entityLineage={entityLineage}
          entityLineageHandler={entityLineageHandler}
          entityName={name}
          followTableHandler={followTable}
          followers={followers}
          isNodeLoading={isNodeLoading}
          joins={joins}
          lineageLeafNodes={leafNodes}
          loadNodeHandler={loadNodeHandler}
          owner={owner as Table['owner'] & { displayName: string }}
          removeLineageHandler={removeLineageHandler}
          sampleData={sampleData}
          setActiveTabHandler={activeTabHandler}
          settingsUpdateHandler={settingsUpdateHandler}
          slashedTableName={slashedTableName}
          tableDetails={tableDetails}
          tableProfile={tableProfile}
          tableTags={tableTags}
          tier={tier as TagLabel}
          unfollowTableHandler={unfollowTable}
          usageSummary={usageSummary}
          users={AppState.users}
          version={currentVersion}
          versionHandler={versionHandler}
        />
      )}
    </>
  );
};

export default observer(DatasetDetailsPage);
