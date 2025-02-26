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
import { Layout } from 'react-grid-layout';
import { TabProps } from '../components/common/TabsLabel/TabsLabel.interface';
import {
  CUSTOM_PROPERTIES_WIDGET,
  DATA_PRODUCTS_WIDGET,
  DESCRIPTION_WIDGET,
  GLOSSARY_TERMS_WIDGET,
  GridSizes,
  TAGS_WIDGET,
} from '../constants/CustomizeWidgets.constants';
import { STORED_PROCEDURE_DUMMY_DATA } from '../constants/Table.constants';
import { DetailPageWidgetKeys } from '../enums/CustomizeDetailPage.enum';
import { EntityTabs } from '../enums/entity.enum';
import { StoredProcedure } from '../generated/entity/data/storedProcedure';
import { EntityReference } from '../generated/entity/type';
import { Tab } from '../generated/system/ui/uiCustomization';
import { FeedCounts } from '../interface/feed.interface';
import { WidgetConfig } from '../pages/CustomizablePage/CustomizablePage.interface';
import { getTabLabelFromId } from './CustomizePage/CustomizePageUtils';
import i18n from './i18next/LocalUtil';
import {
  getStoredProcedureDetailsPageTabs,
  getStoredProcedureWidgetsFromKey,
} from './StoredProceduresUtils';

export interface StoredProcedureDetailPageTabProps {
  activeTab: EntityTabs;
  feedCount: {
    totalCount: number;
  };
  decodedStoredProcedureFQN: string;
  entityName: string;
  code: string;
  deleted: boolean;
  owners: EntityReference[];
  storedProcedure: StoredProcedure;
  editLineagePermission: boolean;
  editCustomAttributePermission: boolean;
  viewAllPermission: boolean;
  labelMap?: Record<EntityTabs, string>;
  onExtensionUpdate: (value: StoredProcedure) => Promise<void>;
  getEntityFeedCount: () => void;
  fetchStoredProcedureDetails: () => Promise<void>;
  handleFeedCount: (data: FeedCounts) => void;
}

class StoredProcedureClassBase {
  tabs = [];

  constructor() {
    this.tabs = [];
  }

  public getStoredProcedureDetailPageTabs(
    tabsProps: StoredProcedureDetailPageTabProps
  ): TabProps[] {
    return getStoredProcedureDetailsPageTabs(tabsProps);
  }

  public getStoredProcedureDetailPageTabsIds(): Tab[] {
    return [
      EntityTabs.CODE,
      EntityTabs.ACTIVITY_FEED,
      EntityTabs.LINEAGE,
      EntityTabs.CUSTOM_PROPERTIES,
    ].map((tab: EntityTabs) => ({
      id: tab,
      name: tab,
      displayName: getTabLabelFromId(tab),
      layout: this.getDefaultLayout(tab),
      editable: [EntityTabs.CODE].includes(tab),
    }));
  }

  public getDefaultLayout(tab?: EntityTabs): Layout[] {
    if (tab && tab !== EntityTabs.CODE) {
      return [];
    }

    return [
      {
        h: 2,
        i: DetailPageWidgetKeys.DESCRIPTION,
        w: 6,
        x: 0,
        y: 0,
        static: false,
      },
      {
        h: 7,
        i: DetailPageWidgetKeys.STORED_PROCEDURE_CODE,
        w: 6,
        x: 0,
        y: 0,
        static: false,
      },
      {
        h: 1,
        i: DetailPageWidgetKeys.DATA_PRODUCTS,
        w: 2,
        x: 6,
        y: 1,
        static: false,
      },
      {
        h: 2,
        i: DetailPageWidgetKeys.TAGS,
        w: 2,
        x: 6,
        y: 2,
        static: false,
      },
      {
        h: 2,
        i: DetailPageWidgetKeys.GLOSSARY_TERMS,
        w: 2,
        x: 6,
        y: 3,
        static: false,
      },
      {
        h: 4,
        i: DetailPageWidgetKeys.CUSTOM_PROPERTIES,
        w: 2,
        x: 6,
        y: 6,
        static: false,
      },
    ];
  }

  public getAlertEnableStatus() {
    return false;
  }

  public getDummyData(): StoredProcedure {
    return STORED_PROCEDURE_DUMMY_DATA;
  }

  public getCommonWidgetList() {
    return [
      DESCRIPTION_WIDGET,
      {
        fullyQualifiedName: DetailPageWidgetKeys.STORED_PROCEDURE_CODE,
        name: i18n.t('label.stored_procedure_code'),
        data: {
          gridSizes: ['large'] as GridSizes[],
        },
      },
      DATA_PRODUCTS_WIDGET,
      TAGS_WIDGET,
      GLOSSARY_TERMS_WIDGET,
      CUSTOM_PROPERTIES_WIDGET,
    ];
  }

  public getWidgetsFromKey(widgetConfig: WidgetConfig) {
    return getStoredProcedureWidgetsFromKey(widgetConfig);
  }
}

const storedProcedureClassBase = new StoredProcedureClassBase();

export default storedProcedureClassBase;
export { StoredProcedureClassBase };
