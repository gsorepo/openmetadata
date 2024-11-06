/*
 *  Copyright 2024 Collate.
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
import { TabProps } from '../components/common/TabsLabel/TabsLabel.interface';
import { OperationPermission } from '../context/PermissionProvider/PermissionProvider.interface';
import { EntityTabs } from '../enums/entity.enum';
import { Table } from '../generated/entity/data/table';
import { TestSummary } from '../generated/tests/testCase';
import { FeedCounts } from '../interface/feed.interface';
import { getTableDetailPageBaseTabs } from './TableUtils';

export interface TableDetailPageTabProps {
  queryCount: number;
  isTourOpen: boolean;
  activeTab: EntityTabs;
  totalFeedCount: number;
  schemaTab: JSX.Element;
  isViewTableType: boolean;
  viewAllPermission: boolean;
  viewQueriesPermission: boolean;
  editLineagePermission: boolean;
  viewProfilerPermission: boolean;
  viewSampleDataPermission: boolean;
  tablePermissions: OperationPermission;
  editCustomAttributePermission: boolean;
  deleted?: boolean;
  tableDetails?: Table;
  testCaseSummary?: TestSummary;
  getEntityFeedCount: () => void;
  fetchTableDetails: () => Promise<void>;
  onExtensionUpdate: (updatedData: Table) => Promise<void>;
  handleFeedCount: (data: FeedCounts) => void;
}

class TableClassBase {
  public getTableDetailPageTabs(
    tableDetailsPageProps: TableDetailPageTabProps
  ): TabProps[] {
    return getTableDetailPageBaseTabs(tableDetailsPageProps);
  }

  public getAlertEnableStatus() {
    return false;
  }
}

const tableClassBase = new TableClassBase();

export default tableClassBase;
export { TableClassBase };
