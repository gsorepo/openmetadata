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

export const datasetTableTabs = [
  {
    name: 'Schema',
    path: 'schema',
  },
  {
    name: 'Profiler',
    path: 'profiler',
  },
  {
    name: 'Lineage',
    path: 'lineage',
  },
  {
    name: 'DBT',
    path: 'dbt',
  },
  {
    name: 'Sample Data',
    path: 'sample_data',
  },
  {
    name: 'Manage',
    path: 'manage',
  },
];

export const getCurrentDatasetTab = (tab: string) => {
  let currentTab = 1;
  switch (tab) {
    case 'profiler':
      currentTab = 2;

      break;
    case 'lineage':
      currentTab = 3;

      break;
    case 'dbt':
      currentTab = 4;

      break;

    case 'sample_data':
      currentTab = 5;

      break;

    case 'manage':
      currentTab = 6;

      break;

    case 'schema':
    default:
      currentTab = 1;

      break;
  }

  return currentTab;
};
