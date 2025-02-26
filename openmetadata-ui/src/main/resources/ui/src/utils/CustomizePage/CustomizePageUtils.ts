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
import { TabsProps } from 'antd';
import { noop } from 'lodash';
import { CommonWidgetType } from '../../constants/CustomizeWidgets.constants';
import { EntityTabs } from '../../enums/entity.enum';
import { PageType, Tab } from '../../generated/system/ui/page';
import { WidgetConfig } from '../../pages/CustomizablePage/CustomizablePage.interface';
import apiCollectionClassBase from '../APICollection/APICollectionClassBase';
import apiEndpointClassBase from '../APIEndpoints/APIEndpointClassBase';
import containerDetailsClassBase from '../ContainerDetailsClassBase';
import customizeGlossaryPageClassBase from '../CustomizeGlossaryPage/CustomizeGlossaryPage';
import customizeGlossaryTermPageClassBase from '../CustomizeGlossaryTerm/CustomizeGlossaryTermBaseClass';
import dashboardDataModelClassBase from '../DashboardDataModelClassBase';
import dashboardDetailsClassBase from '../DashboardDetailsClassBase';
import databaseClassBase from '../Database/DatabaseClassBase';
import databaseSchemaClassBase from '../DatabaseSchemaClassBase';
import domainClassBase from '../Domain/DomainClassBase';
import { getEntityName } from '../EntityUtils';
import i18n from '../i18next/LocalUtil';
import metricDetailsClassBase from '../MetricEntityUtils/MetricDetailsClassBase';
import mlModelClassBase from '../MlModel/MlModelClassBase';
import pipelineClassBase from '../PipelineClassBase';
import searchIndexClassBase from '../SearchIndexDetailsClassBase';
import storedProcedureClassBase from '../StoredProcedureClassBase';
import tableClassBase from '../TableClassBase';
import topicClassBase from '../TopicClassBase';

export const getGlossaryTermDefaultTabs = () => {
  return [
    {
      id: EntityTabs.OVERVIEW,
      displayName: 'Overview',
      layout: customizeGlossaryTermPageClassBase.getDefaultWidgetForTab(
        EntityTabs.OVERVIEW
      ),
      name: EntityTabs.OVERVIEW,
      editable: true,
    },
    {
      id: EntityTabs.GLOSSARY_TERMS,
      displayName: 'Glossary Terms',
      layout: customizeGlossaryTermPageClassBase.getDefaultWidgetForTab(
        EntityTabs.GLOSSARY_TERMS
      ),
      name: EntityTabs.GLOSSARY_TERMS,
      editable: false,
    },
    {
      id: EntityTabs.ASSETS,
      displayName: 'Assets',
      layout: customizeGlossaryTermPageClassBase.getDefaultWidgetForTab(
        EntityTabs.ASSETS
      ),
      name: EntityTabs.ASSETS,
      editable: false,
    },
    {
      displayName: 'Activity Feeds & Tasks',
      name: EntityTabs.ACTIVITY_FEED,
      id: EntityTabs.ACTIVITY_FEED,
      layout: customizeGlossaryTermPageClassBase.getDefaultWidgetForTab(
        EntityTabs.ACTIVITY_FEED
      ),
      editable: false,
    },
    {
      id: EntityTabs.CUSTOM_PROPERTIES,
      name: EntityTabs.CUSTOM_PROPERTIES,
      displayName: 'Custom Property',
      layout: customizeGlossaryTermPageClassBase.getDefaultWidgetForTab(
        EntityTabs.CUSTOM_PROPERTIES
      ),
      editable: false,
    },
  ];
};

export const getGlossaryDefaultTabs = () => {
  return [
    {
      id: EntityTabs.TERMS,
      name: EntityTabs.TERMS,
      displayName: 'Terms',
      layout: customizeGlossaryPageClassBase.getDefaultWidgetForTab(
        EntityTabs.TERMS
      ),
      editable: true,
    },
    {
      displayName: 'Activity Feeds & Tasks',
      name: EntityTabs.ACTIVITY_FEED,
      id: EntityTabs.ACTIVITY_FEED,
      layout: customizeGlossaryTermPageClassBase.getDefaultWidgetForTab(
        EntityTabs.ACTIVITY_FEED
      ),
      editable: false,
    },
  ];
};

export const getTabLabelFromId = (tab: EntityTabs) => {
  switch (tab) {
    case EntityTabs.OVERVIEW:
      return i18n.t('label.overview');
    case EntityTabs.GLOSSARY_TERMS:
      return i18n.t('label.glossary-terms');
    case EntityTabs.ASSETS:
      return i18n.t('label.asset-plural');
    case EntityTabs.ACTIVITY_FEED:
      return i18n.t('label.activity-feed-and-task-plural');
    case EntityTabs.CUSTOM_PROPERTIES:
      return i18n.t('label.custom-property-plural');
    case EntityTabs.TERMS:
      return i18n.t('label.terms');
    case EntityTabs.SCHEMA:
      return i18n.t('label.schema');
    case EntityTabs.SAMPLE_DATA:
      return i18n.t('label.sample-data');
    case EntityTabs.TABLE_QUERIES:
      return i18n.t('label.query-plural');
    case EntityTabs.PROFILER:
      return i18n.t('label.profiler-amp-data-quality');
    case EntityTabs.INCIDENTS:
      return i18n.t('label.incident-plural');
    case EntityTabs.LINEAGE:
      return i18n.t('label.lineage');
    case EntityTabs.VIEW_DEFINITION:
      return i18n.t('label.view-definition');
    case EntityTabs.DBT:
      return i18n.t('label.dbt-lowercase');
    case EntityTabs.CHILDREN:
      return i18n.t('label.children');
    case EntityTabs.DETAILS:
      return i18n.t('label.detail-plural');
    case EntityTabs.SUBDOMAINS:
      return i18n.t('label.sub-domain-plural');
    case EntityTabs.DATA_PRODUCTS:
      return i18n.t('label.data-product-plural');
    case EntityTabs.DOCUMENTATION:
      return i18n.t('label.documentation');

    default:
      return '';
  }
};

export const getDefaultTabs = (pageType?: string): Tab[] => {
  switch (pageType) {
    case PageType.GlossaryTerm:
      return getGlossaryTermDefaultTabs();
    case PageType.Glossary:
      return getGlossaryDefaultTabs();
    case PageType.Table:
      return tableClassBase.getTableDetailPageTabsIds();
    case PageType.Topic:
      return topicClassBase.getTopicDetailPageTabsIds();
    case PageType.StoredProcedure:
      return storedProcedureClassBase.getStoredProcedureDetailPageTabsIds();
    case PageType.DashboardDataModel:
      return dashboardDataModelClassBase.getDashboardDataModelDetailPageTabsIds();
    case PageType.Container:
      return containerDetailsClassBase.getContainerDetailPageTabsIds();
    case PageType.Database:
      return databaseClassBase.getDatabaseDetailPageTabsIds();
    case PageType.SearchIndex:
      return searchIndexClassBase.getSearchIndexDetailPageTabsIds();
    case PageType.DatabaseSchema:
      return databaseSchemaClassBase.getDatabaseSchemaPageTabsIds();
    case PageType.Pipeline:
      return pipelineClassBase.getPipelineDetailPageTabsIds();
    case PageType.Dashboard:
      return dashboardDetailsClassBase.getDashboardDetailPageTabsIds();
    case PageType.Domain:
      return domainClassBase.getDomainDetailPageTabsIds();
    case PageType.APICollection:
      return apiCollectionClassBase.getAPICollectionDetailPageTabsIds();
    case PageType.APIEndpoint:
      return apiEndpointClassBase.getEndpointDetailPageTabsIds();
    case PageType.Metric:
      return metricDetailsClassBase.getMetricDetailPageTabsIds();
    case PageType.MlModel:
      return mlModelClassBase.getMlModelDetailPageTabsIds();
    default:
      return [
        {
          id: EntityTabs.CUSTOM_PROPERTIES,
          name: EntityTabs.CUSTOM_PROPERTIES,
          displayName: 'Custom Property',
          layout: customizeGlossaryTermPageClassBase.getDefaultWidgetForTab(
            EntityTabs.CUSTOM_PROPERTIES
          ),
        },
      ];
  }
};

export const getDefaultWidgetForTab = (pageType: PageType, tab: EntityTabs) => {
  switch (pageType) {
    case PageType.GlossaryTerm:
    case PageType.Glossary:
      return customizeGlossaryTermPageClassBase.getDefaultWidgetForTab(tab);
    case PageType.Table:
      return tableClassBase.getDefaultLayout(tab);
    case PageType.Topic:
      return topicClassBase.getDefaultLayout(tab);
    case PageType.DashboardDataModel:
      return dashboardDataModelClassBase.getDefaultLayout(tab);
    case PageType.StoredProcedure:
      return storedProcedureClassBase.getDefaultLayout(tab);
    case PageType.Database:
      return databaseClassBase.getDefaultLayout(tab);
    case PageType.DatabaseSchema:
      return databaseSchemaClassBase.getDefaultLayout(tab);
    case PageType.Pipeline:
      return pipelineClassBase.getDefaultLayout(tab);
    case PageType.SearchIndex:
      return searchIndexClassBase.getDefaultLayout(tab);
    case PageType.Container:
      return containerDetailsClassBase.getDefaultLayout(tab);
    case PageType.Domain:
      return domainClassBase.getDefaultLayout(tab);
    case PageType.Dashboard:
      return dashboardDetailsClassBase.getDefaultLayout(tab);
    case PageType.APICollection:
      return apiCollectionClassBase.getDefaultLayout(tab);
    case PageType.APIEndpoint:
      return apiEndpointClassBase.getDefaultLayout(tab);
    case PageType.Metric:
      return metricDetailsClassBase.getDefaultLayout(tab);
    case PageType.MlModel:
      return mlModelClassBase.getDefaultLayout(tab);
    default:
      return [];
  }
};

export const sortTabs = (tabs: TabsProps['items'], order: string[]) => {
  return [...(tabs ?? [])].sort((a, b) => {
    const orderA = order.indexOf(a.key);
    const orderB = order.indexOf(b.key);

    if (orderA !== -1 && orderB !== -1) {
      return orderA - orderB;
    }
    if (orderA !== -1) {
      return -1;
    }
    if (orderB !== -1) {
      return 1;
    }

    const ia = tabs?.indexOf(a) ?? 0;
    const ib = tabs?.indexOf(b) ?? 0;

    return ia - ib;
  });
};

export const getCustomizableWidgetByPage = (
  pageType: PageType
): CommonWidgetType[] => {
  switch (pageType) {
    case PageType.GlossaryTerm:
    case PageType.Glossary:
      return customizeGlossaryTermPageClassBase.getCommonWidgetList(
        pageType === PageType.Glossary
      );

    case PageType.Table:
      return tableClassBase.getCommonWidgetList();
    case PageType.Topic:
      return topicClassBase.getCommonWidgetList();
    case PageType.Dashboard:
      return dashboardDetailsClassBase.getCommonWidgetList();
    case PageType.Container:
      return containerDetailsClassBase.getCommonWidgetList();
    case PageType.Database:
      return databaseClassBase.getCommonWidgetList();
    case PageType.DatabaseSchema:
      return databaseSchemaClassBase.getCommonWidgetList();
    case PageType.Pipeline:
      return pipelineClassBase.getCommonWidgetList();
    case PageType.SearchIndex:
      return searchIndexClassBase.getCommonWidgetList();
    case PageType.Domain:
      return domainClassBase.getCommonWidgetList();
    case PageType.APICollection:
      return apiCollectionClassBase.getCommonWidgetList();
    case PageType.APIEndpoint:
      return apiEndpointClassBase.getCommonWidgetList();
    case PageType.Metric:
      return metricDetailsClassBase.getCommonWidgetList();
    case PageType.MlModel:
      return mlModelClassBase.getCommonWidgetList();
    case PageType.LandingPage:
    default:
      return [];
  }
};

export const getDummyDataByPage = (pageType: PageType) => {
  switch (pageType) {
    case PageType.Table:
      return tableClassBase.getDummyData();
    case PageType.Topic:
      return topicClassBase.getDummyData();
    case PageType.StoredProcedure:
      return storedProcedureClassBase.getDummyData();
    case PageType.DashboardDataModel:
      return dashboardDataModelClassBase.getDummyData();
    case PageType.Container:
      return containerDetailsClassBase.getDummyData();
    case PageType.Database:
      return databaseClassBase.getDummyData();
    case PageType.DatabaseSchema:
      return databaseSchemaClassBase.getDummyData();
    case PageType.Pipeline:
      return pipelineClassBase.getDummyData();
    case PageType.SearchIndex:
      return searchIndexClassBase.getDummyData();
    case PageType.Dashboard:
      return dashboardDetailsClassBase.getDummyData();
    case PageType.Domain:
      return domainClassBase.getDummyData();
    case PageType.APICollection:
      return apiCollectionClassBase.getDummyData();
    case PageType.APIEndpoint:
      return apiEndpointClassBase.getDummyData();
    case PageType.Metric:
      return metricDetailsClassBase.getDummyData();
    case PageType.MlModel:
      return mlModelClassBase.getDummyData();

    case PageType.LandingPage:
    default:
      return {};
  }
};

export const getWidgetsFromKey = (
  pageType: PageType,
  widgetConfig: WidgetConfig
): JSX.Element | null => {
  switch (pageType) {
    case PageType.Table:
      return tableClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.Topic:
      return topicClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.StoredProcedure:
      return storedProcedureClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.DashboardDataModel:
      return dashboardDataModelClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.Container:
      return containerDetailsClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.Database:
      return databaseClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.DatabaseSchema:
      return databaseSchemaClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.Pipeline:
      return pipelineClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.SearchIndex:
      return searchIndexClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.Dashboard:
      return dashboardDetailsClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.Domain:
      return domainClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.APICollection:
      return apiCollectionClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.APIEndpoint:
      return apiEndpointClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.Metric:
      return metricDetailsClassBase.getWidgetsFromKey(widgetConfig);
    case PageType.MlModel:
      return mlModelClassBase.getWidgetsFromKey(widgetConfig);
    default:
      return null;
  }
};

export const getDetailsTabWithNewLabel = (
  defaultTabs: Array<
    NonNullable<TabsProps['items']>[number] & { isHidden?: boolean }
  >,
  customizedTabs?: Tab[],
  defaultTabId: EntityTabs = EntityTabs.OVERVIEW
) => {
  if (!customizedTabs) {
    return defaultTabs.filter((data) => !data.isHidden);
  }
  const overviewTab = defaultTabs?.find((t) => t.key === defaultTabId);

  const newTabs =
    customizedTabs?.map((t) => {
      const tabItemDetails = defaultTabs?.find((i) => i.key === t.id);

      return (
        tabItemDetails ?? {
          label: getEntityName(t),
          key: t.id,
          children: overviewTab?.children,
        }
      );
    }) ?? defaultTabs;

  return newTabs.filter((data) => !data.isHidden);
};

export const getTabLabelMapFromTabs = (
  tabs?: Tab[]
): Record<EntityTabs, string> => {
  const labelMap = {} as Record<EntityTabs, string>;

  return (
    tabs?.reduce((acc: Record<EntityTabs, string>, item) => {
      if (item.id && item.displayName) {
        const tab = item.id as EntityTabs;
        acc[tab] = item.displayName;
      }

      return acc;
    }, labelMap) ?? labelMap
  );
};

export const asyncNoop = async () => {
  noop();
};
