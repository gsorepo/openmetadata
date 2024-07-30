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
import { Button, Card, Col, Row } from 'antd';
import { AxiosError } from 'axios';
import {
  first,
  groupBy,
  includes,
  last,
  map,
  round,
  sortBy,
  startCase,
  toLower,
} from 'lodash';
import {
  default as React,
  ReactNode,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ResponsiveContainer } from 'recharts';
import { ReactComponent as RightArrowIcon } from '../../assets/svg/right-arrow.svg';
import { getExplorePath } from '../../constants/constants';
import {
  DI_STRUCTURE,
  GRAPH_HEIGHT,
  TOTAL_ENTITY_CHART_COLOR,
} from '../../constants/DataInsight.constants';
import { INCOMPLETE_DESCRIPTION_ADVANCE_SEARCH_FILTER } from '../../constants/explore.constants';

import { SearchIndex } from '../../enums/search.enum';
import { DataInsightChart } from '../../generated/api/dataInsight/kpi/createKpiRequest';
import { useDataInsightProvider } from '../../pages/DataInsightPage/DataInsightProvider';
import {
  DataInsightCustomChartResult,
  getChartPreviewByName,
  SystemChartType,
} from '../../rest/DataInsightAPI';
import { updateActiveChartFilter } from '../../utils/ChartUtils';
import {
  getQueryFilterForDataInsightChart,
  isPercentageSystemGraph,
  renderDataInsightLineChart,
} from '../../utils/DataInsightUtils';
import searchClassBase from '../../utils/SearchClassBase';
import { showErrorToast } from '../../utils/ToastUtils';
import Searchbar from '../common/SearchBarComponent/SearchBar.component';
import PageHeader from '../PageHeader/PageHeader.component';
import DataInsightProgressBar from './DataInsightProgressBar';
import { EmptyGraphPlaceholder } from './EmptyGraphPlaceholder';
import EntitySummaryProgressBar from './EntitySummaryProgressBar.component';

interface DataInsightChartCardProps {
  type: SystemChartType;
  header: ReactNode;
  subHeader: ReactNode;
  listAssets?: boolean;
}

export const DataInsightChartCard = ({
  type,
  header,
  subHeader,
  listAssets,
}: DataInsightChartCardProps) => {
  const tabsInfo = searchClassBase.getTabsInfo();
  const [chartData, setChartData] = useState<DataInsightCustomChartResult>({
    results: [],
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeKeys, setActiveKeys] = useState<string[]>([]);
  const [activeMouseHoverKey, setActiveMouseHoverKey] = useState('');
  const [searchEntityKeyWord, setSearchEntityKeyWord] = useState('');
  const {
    chartFilter,
    selectedDaysFilter: selectedDays,
    kpi,
    entitiesSummary,
  } = useDataInsightProvider();
  const isPercentageGraph = isPercentageSystemGraph(type);

  const { rightSideEntityList, latestData, graphData, changeInValue } =
    useMemo(() => {
      const results = chartData.results ?? [];

      const groupedResults = groupBy(results, 'group');
      const latestData: Record<string, number> = {};
      let total = 0;

      let firstRecordTotal = 0;

      Object.entries(groupedResults).forEach(([key, value]) => {
        const newValues = sortBy(value, 'day');

        latestData[key] = last(newValues)?.count ?? 0;

        total += latestData[key];
        firstRecordTotal += first(newValues)?.count ?? 0;
      });

      const changeInValue = firstRecordTotal
        ? (total - firstRecordTotal) / firstRecordTotal
        : 0;

      const graphData = map(groupedResults, (value, key) => ({
        name: key,
        data: value,
      }));

      const labels = Object.keys(groupedResults);

      return {
        rightSideEntityList: labels.filter((entity) =>
          includes(toLower(entity), toLower(searchEntityKeyWord))
        ),
        latestData,
        graphData,
        changeInValue,
      };
    }, [chartData.results, searchEntityKeyWord]);

  const targetValue = useMemo(() => {
    if (
      [
        SystemChartType.PercentageOfDataAssetWithDescription,
        SystemChartType.PercentageOfDataAssetWithOwner,
        SystemChartType.PercentageOfServiceWithDescription,
        SystemChartType.PercentageOfServiceWithOwner,
      ].includes(type)
    ) {
      const kpiChart = [
        SystemChartType.PercentageOfDataAssetWithDescription,
        SystemChartType.PercentageOfServiceWithDescription,
      ].includes(type)
        ? DataInsightChart.PercentageOfDataAssetWithDescriptionKpi
        : DataInsightChart.PercentageOfDataAssetWithOwnerKpi;

      return kpi.data.find((value) => value.dataInsightChart.name === kpiChart)
        ?.targetValue;
    }

    return undefined;
  }, [kpi.data, type]);

  const totalValue = useMemo(() => {
    switch (type) {
      case SystemChartType.TotalDataAssets:
        return (
          entitiesSummary[SystemChartType.TotalDataAssetsSummaryCard]
            ?.results[0].count ?? 0
        );
      case SystemChartType.PercentageOfDataAssetWithDescription:
      case SystemChartType.PercentageOfServiceWithDescription:
        return (
          entitiesSummary[SystemChartType.DataAssetsWithDescriptionSummaryCard]
            ?.results[0].count ?? 0
        );
      case SystemChartType.PercentageOfDataAssetWithOwner:
      case SystemChartType.PercentageOfServiceWithOwner:
        return (
          entitiesSummary[SystemChartType.DataAssetsWithOwnerSummaryCard]
            ?.results[0].count ?? 0
        );
      case SystemChartType.TotalDataAssetsByTier:
        return (
          entitiesSummary[SystemChartType.TotalDataAssetsWithTierSummaryCard]
            ?.results[0].count ?? 0
        );
    }

    return 0;
  }, [type, entitiesSummary]);

  const { t } = useTranslation();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const filter = getQueryFilterForDataInsightChart(
        chartFilter.team,
        chartFilter.tier
      );
      const response = await getChartPreviewByName(type, {
        start: chartFilter.startTs,
        end: chartFilter.endTs,
        filter,
      });

      setChartData(response);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLegendClick = (entity: string) => {
    setActiveKeys((prevActiveKeys) =>
      updateActiveChartFilter(entity, prevActiveKeys)
    );
  };

  const handleLegendMouseEnter = (entity: string) => {
    setActiveMouseHoverKey(entity);
  };
  const handleLegendMouseLeave = () => {
    setActiveMouseHoverKey('');
  };

  useEffect(() => {
    fetchData();
  }, [chartFilter]);

  if (isLoading || kpi.isLoading || chartData.results.length === 0) {
    return (
      <Card
        className="data-insight-card"
        id={type}
        loading={isLoading}
        title={
          <PageHeader
            data={{
              header,
              subHeader: t('message.field-insight', {
                field: t('label.description-lowercase'),
              }),
            }}
          />
        }>
        <EmptyGraphPlaceholder />
      </Card>
    );
  }

  return (
    <Card
      className="data-insight-card"
      data-testid="entity-description-percentage-card"
      id={type}>
      <Row gutter={DI_STRUCTURE.rowContainerGutter}>
        <Col span={DI_STRUCTURE.leftContainerSpan}>
          <PageHeader
            data={{
              header,
              subHeader,
            }}
          />
          <ResponsiveContainer
            className="m-t-lg"
            debounce={1}
            height={GRAPH_HEIGHT}
            id={`${type}-graph`}>
            {renderDataInsightLineChart(
              graphData,
              activeKeys,
              activeMouseHoverKey,
              isPercentageGraph
            )}
          </ResponsiveContainer>
        </Col>
        <Col span={DI_STRUCTURE.rightContainerSpan}>
          <Row gutter={[8, 16]}>
            <Col span={24}>
              <DataInsightProgressBar
                changeInValue={changeInValue}
                duration={selectedDays}
                label={`${t('label.completed-entity', {
                  entity: t('label.description'),
                })}${isPercentageGraph ? ' %' : ''}`}
                progress={round(totalValue, 2)}
                showProgress={isPercentageGraph}
                suffix={isPercentageGraph ? '%' : ''}
                target={targetValue}
              />
            </Col>
            <Col span={24}>
              <Searchbar
                removeMargin
                searchValue={searchEntityKeyWord}
                onSearch={setSearchEntityKeyWord}
              />
            </Col>
            <Col className="chart-card-right-panel-container" span={24}>
              <Row gutter={[8, 8]}>
                {rightSideEntityList.map((entity, i) => {
                  return (
                    <Col
                      className="entity-summary-container"
                      key={entity}
                      span={24}
                      onClick={() => handleLegendClick(entity)}
                      onMouseEnter={() => handleLegendMouseEnter(entity)}
                      onMouseLeave={handleLegendMouseLeave}>
                      <EntitySummaryProgressBar
                        entity={startCase(entity)}
                        isActive={
                          activeKeys.length ? activeKeys.includes(entity) : true
                        }
                        label={`${round(latestData[entity] ?? 0, 2)}${
                          isPercentageGraph ? '%' : ''
                        }`}
                        pluralize={
                          ![
                            SystemChartType.TotalDataAssetsByTier,
                            SystemChartType.PercentageOfServiceWithDescription,
                            SystemChartType.PercentageOfServiceWithOwner,
                          ].includes(type)
                        }
                        progress={latestData[entity]}
                        strokeColor={TOTAL_ENTITY_CHART_COLOR[i]}
                      />
                    </Col>
                  );
                })}
              </Row>
            </Col>
            {activeKeys.length > 0 && (
              <Col className="flex justify-end" span={24}>
                <Button type="link" onClick={() => setActiveKeys([])}>
                  {t('label.clear')}
                </Button>
              </Col>
            )}
          </Row>
        </Col>
        {listAssets && (
          <Col className="d-flex justify-end" span={24}>
            <Link
              data-testid="explore-asset-with-no-description"
              to={getExplorePath({
                tab: tabsInfo[SearchIndex.TABLE].path,
                isPersistFilters: true,
                extraParameters: {
                  queryFilter: JSON.stringify(
                    INCOMPLETE_DESCRIPTION_ADVANCE_SEARCH_FILTER
                  ),
                },
              })}>
              <Button
                className="text-primary d-flex items-center gap-1"
                size="small"
                type="text">
                {t('label.explore-asset-plural-with-type', {
                  type:
                    type ===
                    SystemChartType.PercentageOfDataAssetWithDescription
                      ? t('label.no-description')
                      : t('label.no-owner'),
                })}
                <RightArrowIcon height={12} width={12} />
              </Button>
            </Link>
          </Col>
        )}
      </Row>
    </Card>
  );
};
