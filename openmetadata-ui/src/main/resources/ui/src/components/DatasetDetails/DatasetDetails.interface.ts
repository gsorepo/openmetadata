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

import { EntityTags, LeafNodes, LineagePos, LoadingNodeState } from 'Models';
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
import { TitleBreadcrumbProps } from '../common/title-breadcrumb/title-breadcrumb.interface';
import { Edge, EdgeData } from '../EntityLineage/EntityLineage.interface';

export interface DatasetOwner extends EntityReference {
  displayName?: string;
}

export interface DatasetDetailsProps {
  isNodeLoading: LoadingNodeState;
  lineageLeafNodes: LeafNodes;
  version?: string;
  joins: TableJoins;
  usageSummary: TypeUsedToReturnUsageDetailsOfAnEntity;
  users: Array<User>;
  tableDetails: Table;
  entityName: string;
  datasetFQN: string;
  dataModel?: Table['dataModel'];
  activeTab: number;
  owner: DatasetOwner;
  description: string;
  tableProfile: Table['tableProfile'];
  columns: Table['columns'];
  tier: TagLabel;
  sampleData: TableData;
  entityLineage: EntityLineage;
  followers: Array<User>;
  tableTags: Array<EntityTags>;
  slashedTableName: TitleBreadcrumbProps['titleLinks'];
  deleted?: boolean;
  setActiveTabHandler: (value: number) => void;
  followTableHandler: () => void;
  unfollowTableHandler: () => void;
  settingsUpdateHandler: (updatedTable: Table) => Promise<void>;
  columnsUpdateHandler: (updatedTable: Table) => void;
  descriptionUpdateHandler: (updatedTable: Table) => void;
  versionHandler: () => void;
  loadNodeHandler: (node: EntityReference, pos: LineagePos) => void;
  addLineageHandler: (edge: Edge) => Promise<void>;
  removeLineageHandler: (data: EdgeData) => void;
  entityLineageHandler: (lineage: EntityLineage) => void;
}
