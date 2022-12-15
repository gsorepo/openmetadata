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

import { Card, Typography } from 'antd';
import { AxiosError } from 'axios';
import React, { FC, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CartesianGrid,
  Legend,
  LegendProps,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { getAggregateChartData } from '../../axiosAPIs/DataInsightAPI';
import {
  BAR_CHART_MARGIN,
  ENTITIES_BAR_COLO_MAP,
} from '../../constants/DataInsight.constants';
import { DataReportIndex } from '../../generated/dataInsight/dataInsightChart';
import {
  DataInsightChartResult,
  DataInsightChartType,
} from '../../generated/dataInsight/dataInsightChartResult';
import { ChartFilter } from '../../interface/data-insight.interface';
import { updateActiveChartFilter } from '../../utils/ChartUtils';
import {
  CustomTooltip,
  getGraphDataByEntityType,
  renderLegend,
} from '../../utils/DataInsightUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import './DataInsightDetail.less';
import { EmptyGraphPlaceholder } from './EmptyGraphPlaceholder';

interface Props {
  chartFilter: ChartFilter;
}

const TotalEntityInsight: FC<Props> = ({ chartFilter }) => {
  const [totalEntitiesByType, setTotalEntitiesByType] =
    useState<DataInsightChartResult>();

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);

  const { data, entities, total } = useMemo(() => {
    return getGraphDataByEntityType(
      totalEntitiesByType?.data ?? [],
      DataInsightChartType.TotalEntitiesByType
    );
  }, [totalEntitiesByType]);

  const { t } = useTranslation();

  const fetchTotalEntitiesByType = async () => {
    setIsLoading(true);
    try {
      const params = {
        ...chartFilter,
        dataInsightChartName: DataInsightChartType.TotalEntitiesByType,
        dataReportIndex: DataReportIndex.EntityReportDataIndex,
      };
      const response = await getAggregateChartData(params);

      setTotalEntitiesByType(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLegendClick: LegendProps['onClick'] = (event) => {
    setActiveKeys((prevActiveKeys) =>
      updateActiveChartFilter(event.dataKey, prevActiveKeys)
    );
  };

  useEffect(() => {
    fetchTotalEntitiesByType();
  }, [chartFilter]);

  return (
    <Card
      className="data-insight-card"
      data-testid="entity-summary-card"
      id={DataInsightChartType.TotalEntitiesByType}
      loading={isLoading}
      title={
        <>
          <Typography.Title level={5}>
            {t('label.data-insight-total-entity-summary')}
          </Typography.Title>
          <Typography.Text className="data-insight-label-text">
            {t('message.total-entity-insight')}
          </Typography.Text>
        </>
      }>
      {data.length ? (
        <ResponsiveContainer debounce={1} minHeight={400}>
          <LineChart data={data} margin={BAR_CHART_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="timestamp" />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              align="left"
              content={(props) =>
                renderLegend(props as LegendProps, `${total}`, activeKeys)
              }
              layout="vertical"
              verticalAlign="top"
              wrapperStyle={{ left: '0px', top: '0px' }}
              onClick={handleLegendClick}
            />
            {entities.map((entity) => (
              <Line
                dataKey={entity}
                hide={activeKeys.length ? !activeKeys.includes(entity) : false}
                key={entity}
                stroke={ENTITIES_BAR_COLO_MAP[entity]}
                type="monotone"
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <EmptyGraphPlaceholder />
      )}
    </Card>
  );
};

export default TotalEntityInsight;
