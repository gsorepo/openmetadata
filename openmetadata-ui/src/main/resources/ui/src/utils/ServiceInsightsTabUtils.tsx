/*
 *  Copyright 2025 Collate.
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
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { isEmpty, isUndefined, round } from 'lodash';
import { ServiceTypes } from 'Models';
import React, { FunctionComponent } from 'react';
import { ReactComponent as SuccessIcon } from '../assets/svg/ic-check-circle-new.svg';
import { ReactComponent as DescriptionPlaceholderIcon } from '../assets/svg/ic-flat-doc.svg';
import { ReactComponent as TablePlaceholderIcon } from '../assets/svg/ic-large-table.svg';
import { ReactComponent as LoadingIcon } from '../assets/svg/ic-loader.svg';
import { ReactComponent as NoDataPlaceholderIcon } from '../assets/svg/ic-no-records.svg';
import { ReactComponent as WarningIcon } from '../assets/svg/incident-icon.svg';
import { ReactComponent as OwnersPlaceholderIcon } from '../assets/svg/key-hand.svg';
import { ReactComponent as TierPlaceholderIcon } from '../assets/svg/no-tier.svg';
import { ReactComponent as PiiPlaceholderIcon } from '../assets/svg/security-safe.svg';
import ErrorPlaceHolder from '../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import { ERROR_PLACEHOLDER_TYPE, SIZE } from '../enums/common.enum';
import { SystemChartType } from '../enums/DataInsight.enum';
import { EntityType } from '../enums/entity.enum';
import { ServiceInsightsWidgetType } from '../enums/ServiceInsights.enum';
import { ThemeConfiguration } from '../generated/configuration/uiThemePreference';
import { WorkflowStatus } from '../generated/governance/workflows/workflowInstance';
import { DataInsightCustomChartResult } from '../rest/DataInsightAPI';
import i18n from '../utils/i18next/LocalUtil';
import { Transi18next } from './CommonUtils';
import { getSevenDaysStartGMTArrayInMillis } from './date-time/DateTimeUtils';
import documentationLinksClassBase from './DocumentationLinksClassBase';

const { t } = i18n;

export const getAssetsByServiceType = (serviceType: ServiceTypes): string[] => {
  switch (serviceType) {
    case 'databaseServices':
      return [
        EntityType.DATABASE,
        EntityType.DATABASE_SCHEMA,
        EntityType.STORED_PROCEDURE,
        EntityType.TABLE,
      ];
    case 'messagingServices':
      return [EntityType.TOPIC];
    case 'dashboardServices':
      return [
        EntityType.CHART,
        EntityType.DASHBOARD,
        EntityType.DASHBOARD_DATA_MODEL,
      ];
    case 'pipelineServices':
      return [EntityType.PIPELINE];
    case 'mlmodelServices':
      return [EntityType.MLMODEL];
    case 'storageServices':
      return [EntityType.CONTAINER];
    case 'searchServices':
      return [EntityType.SEARCH_SERVICE];
    case 'apiServices':
      return [EntityType.API_COLLECTION, EntityType.API_ENDPOINT];
    default:
      return [];
  }
};

export const getTitleByChartType = (chartType: SystemChartType) => {
  switch (chartType) {
    case SystemChartType.DescriptionCoverage:
      return t('label.entity-coverage', {
        entity: t('label.description'),
      });
    case SystemChartType.OwnersCoverage:
      return t('label.entity-coverage', {
        entity: t('label.ownership'),
      });
    case SystemChartType.PIICoverage:
      return t('label.entity-coverage', {
        entity: t('label.pii-uppercase'),
      });
    case SystemChartType.TierCoverage:
      return t('label.entity-coverage', {
        entity: t('label.tier'),
      });
    default:
      return '';
  }
};

export const getPlatformInsightsChartDataFormattingMethod =
  (
    chartsData: Record<SystemChartType, DataInsightCustomChartResult>,
    startTime: number,
    endTime: number
  ) =>
  (chartType: SystemChartType) => {
    const summaryChartData = chartsData[chartType];

    // Get the seven days start GMT array in milliseconds
    const sevenDaysStartGMTArrayInMillis = getSevenDaysStartGMTArrayInMillis();

    // Get the data for the seven days
    // If the data is not available for a day, fill in the data with the count as 0
    const data = sevenDaysStartGMTArrayInMillis.map((day) => {
      const item = summaryChartData.results.find((item) => item.day === day);

      return item ?? { day, count: 0 };
    });

    // This is the data for the day 7 days ago
    const sevenDaysAgoData = data.find((item) => item.day === startTime)?.count;
    // This is the data for the current day
    const currentData = data.find((item) => item.day === endTime)?.count;

    // This is the percentage change for the last 7 days
    // This is undefined if the data is not available for all the days
    const percentageChangeInSevenDays =
      !isUndefined(currentData) && !isUndefined(sevenDaysAgoData)
        ? round(Math.abs(currentData - sevenDaysAgoData), 2)
        : undefined;

    // This is true if the current data is greater than the earliest day data
    // This is false if the data is not available for more than 1 day
    const isIncreased = !isUndefined(currentData)
      ? currentData >= (sevenDaysAgoData ?? 0)
      : false;

    return {
      chartType,
      data,
      isIncreased,
      percentageChange: percentageChangeInSevenDays,
      currentPercentage: round(currentData ?? 0, 2),
      noRecords: summaryChartData.results.every((item) => isEmpty(item)),
    };
  };

export const getStatusIconFromStatusType = (status?: WorkflowStatus) => {
  let Icon: FunctionComponent<any>;
  let message;
  let description;

  switch (status) {
    case WorkflowStatus.Exception:
      Icon = WarningIcon;
      message = t('message.workflow-status-exception');
      description = t('message.workflow-status-failure-description');

      break;
    case WorkflowStatus.Failure:
      Icon = ExclamationCircleOutlined;
      message = t('message.workflow-status-failure');
      description = t('message.workflow-status-failure-description');

      break;
    case WorkflowStatus.Finished:
      Icon = SuccessIcon;
      message = t('message.workflow-status-finished');
      description = t('message.workflow-status-finished-description');

      break;
    case WorkflowStatus.Running:
    default:
      Icon = LoadingIcon;
      message = t('message.workflow-status-running');
      description = t('message.workflow-status-running-description');

      break;
  }

  return {
    Icon,
    message,
    description,
  };
};

export const getServiceInsightsWidgetPlaceholder = ({
  chartType,
  iconClassName = 'text-grey-14',
  placeholderClassName = '',
  height = 60,
  width = 60,
  theme,
}: {
  chartType?: SystemChartType | ServiceInsightsWidgetType;
  iconClassName?: string;
  placeholderClassName?: string;
  height?: number;
  width?: number;
  theme: ThemeConfiguration;
}) => {
  let Icon = NoDataPlaceholderIcon;
  let localizationKey = `server.no-records-found`;

  switch (chartType) {
    case ServiceInsightsWidgetType.TOTAL_DATA_ASSETS:
      Icon = NoDataPlaceholderIcon;
      localizationKey = 'message.total-data-assets-widget-description';

      break;
    case SystemChartType.DescriptionCoverage:
      Icon = DescriptionPlaceholderIcon;
      localizationKey = 'message.description-coverage-widget-description';

      break;
    case SystemChartType.OwnersCoverage:
      Icon = OwnersPlaceholderIcon;
      localizationKey = 'message.owners-coverage-widget-description';

      break;
    case SystemChartType.PIICoverage:
      Icon = PiiPlaceholderIcon;
      localizationKey = 'message.pii-coverage-widget-description';

      break;
    case SystemChartType.PIIDistribution:
      Icon = PiiPlaceholderIcon;
      localizationKey = 'message.pii-distribution-widget-description';

      break;
    case SystemChartType.TierCoverage:
      Icon = TierPlaceholderIcon;
      localizationKey = 'message.tier-coverage-widget-description';

      break;
    case SystemChartType.TierDistribution:
      Icon = TierPlaceholderIcon;
      localizationKey = 'message.tier-distribution-widget-description';

      break;
    case ServiceInsightsWidgetType.COLLATE_AI:
      Icon = TablePlaceholderIcon;
      localizationKey = 'message.collate-ai-widget-description';

      break;
    case ServiceInsightsWidgetType.MOST_USED_ASSETS:
      Icon = TablePlaceholderIcon;
      localizationKey = 'message.most-used-assets-widget-description';

      break;
    case ServiceInsightsWidgetType.MOST_EXPENSIVE_QUERIES:
      Icon = TablePlaceholderIcon;
      localizationKey = 'message.most-expensive-queries-widget-description';
  }

  return (
    <ErrorPlaceHolder
      className={placeholderClassName}
      icon={<Icon className={iconClassName} height={height} width={width} />}
      size={SIZE.MEDIUM}
      type={ERROR_PLACEHOLDER_TYPE.CUSTOM}>
      <Typography.Paragraph className="w-max-350">
        <Transi18next
          i18nKey={localizationKey}
          renderElement={
            <a
              href={documentationLinksClassBase.getDocsBaseURL()}
              rel="noreferrer"
              style={{ color: theme.primaryColor }}
              target="_blank"
              title="learn-more"
            />
          }
        />
      </Typography.Paragraph>
    </ErrorPlaceHolder>
  );
};
