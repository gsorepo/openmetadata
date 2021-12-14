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

import { isString } from 'lodash';
import { FormatedTableData } from 'Models';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { getDashboardByFqn } from '../../axiosAPIs/dashboardAPI';
import { getPipelineByFqn } from '../../axiosAPIs/pipelineAPI';
import { getTableDetailsByFQN } from '../../axiosAPIs/tableAPI';
import { getTopicByFqn } from '../../axiosAPIs/topicsAPI';
import { EntityType } from '../../enums/entity.enum';
import { SearchIndex } from '../../enums/search.enum';
import {
  getRecentlyViewedData,
  setRecentlyViewedData,
} from '../../utils/CommonUtils';
import { getOwnerFromId, getTierTags } from '../../utils/TableUtils';
import { getTableTags } from '../../utils/TagsUtils';
import TableDataCard from '../common/table-data-card/TableDataCard';
import Loader from '../Loader/Loader';
import Onboarding from '../onboarding/Onboarding';

const RecentlyViewed: FunctionComponent = () => {
  const recentlyViewedData = getRecentlyViewedData();
  const [data, setData] = useState<Array<FormatedTableData>>([]);
  const [isLoading, setIsloading] = useState<boolean>(false);

  const fetchRecentlyViewedEntity = async () => {
    setIsloading(true);
    const arrData: Array<FormatedTableData> = [];
    let filteredRecentData = [...recentlyViewedData];

    for (const oData of recentlyViewedData) {
      // for (let i = 0; i < recentlyViewedData.length; i++) {
      // const oData = recentlyViewedData[i];
      try {
        switch (oData.entityType) {
          case EntityType.DATASET: {
            const res = await getTableDetailsByFQN(
              oData.fqn,
              'usageSummary, tags, owner,columns'
            );

            const {
              description,
              id,
              name,
              columns,
              owner,
              usageSummary,
              fullyQualifiedName,
              tags,
            } = res.data;
            const tableTags = getTableTags(columns || []);
            arrData.push({
              description,
              fullyQualifiedName,
              id,
              index: SearchIndex.TABLE,
              name,
              owner: getOwnerFromId(owner?.id)?.name || '--',
              serviceType: oData.serviceType,
              tags: [...tableTags].filter((tag) => tag),
              tier: getTierTags(tags),
              weeklyPercentileRank:
                usageSummary?.weeklyStats.percentileRank || 0,
            });

            break;
          }
          case EntityType.TOPIC: {
            const res = await getTopicByFqn(oData.fqn, 'owner, tags');

            const { description, id, name, tags, owner, fullyQualifiedName } =
              res.data;
            arrData.push({
              description,
              fullyQualifiedName,
              id,
              index: SearchIndex.TOPIC,
              name,
              owner: getOwnerFromId(owner?.id)?.name || '--',
              serviceType: oData.serviceType,
              tags: tags,
              tier: getTierTags(tags),
            });

            break;
          }
          case EntityType.DASHBOARD: {
            const res = await getDashboardByFqn(
              oData.fqn,
              'owner, tags, usageSummary'
            );

            const {
              description,
              id,
              displayName,
              tags,
              owner,
              fullyQualifiedName,
            } = res.data;
            arrData.push({
              description,
              fullyQualifiedName,
              id,
              index: SearchIndex.DASHBOARD,
              name: displayName,
              owner: getOwnerFromId(owner?.id)?.name || '--',
              serviceType: oData.serviceType,
              tags: tags,
              tier: getTierTags(tags),
            });

            break;
          }

          case EntityType.PIPELINE: {
            const res = await getPipelineByFqn(
              oData.fqn,
              'owner, tags, usageSummary'
            );

            const {
              description,
              id,
              displayName,
              tags,
              owner,
              fullyQualifiedName,
            } = res.data;
            arrData.push({
              description,
              fullyQualifiedName,
              id,
              index: SearchIndex.PIPELINE,
              name: displayName,
              owner: getOwnerFromId(owner?.id)?.name || '--',
              serviceType: oData.serviceType,
              tags: tags,
              tier: getTierTags(tags),
            });

            break;
          }

          default:
            break;
        }
      } catch {
        filteredRecentData = filteredRecentData.filter(
          (data) => data.fqn !== oData.fqn
        );

        continue;
      }
    }
    if (filteredRecentData.length !== recentlyViewedData.length) {
      setRecentlyViewedData(filteredRecentData);
    }
    setIsloading(false);
    setData(arrData);
  };

  useEffect(() => {
    if (recentlyViewedData.length) {
      fetchRecentlyViewedEntity();
    }
  }, []);

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : (
        <>
          {data.length ? (
            data.map((item, index) => {
              return (
                <div className="tw-mb-3" key={index}>
                  <TableDataCard
                    description={item.description}
                    fullyQualifiedName={item.fullyQualifiedName}
                    indexType={item.index}
                    name={item.name}
                    owner={item.owner}
                    serviceType={item.serviceType || '--'}
                    tableType={item.tableType}
                    tags={item.tags}
                    tier={
                      isString(item.tier) ? item.tier?.split('.')[1] : item.tier
                    }
                    usage={item.weeklyPercentileRank}
                  />
                </div>
              );
            })
          ) : (
            <Onboarding />
          )}
        </>
      )}
    </>
  );
};

export default RecentlyViewed;
