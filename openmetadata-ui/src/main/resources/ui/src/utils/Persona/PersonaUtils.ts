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
import { AppstoreAddOutlined } from '@ant-design/icons';
import { camelCase, capitalize, map } from 'lodash';
import { ReactComponent as GovernIcon } from '../../assets/svg/bank.svg';
import { ReactComponent as DashboardIcon } from '../../assets/svg/dashboard-colored.svg';
import { ReactComponent as DatabaseIcon } from '../../assets/svg/database-colored.svg';
import { ReactComponent as ExploreIcon } from '../../assets/svg/explore.svg';
import { ReactComponent as GlossaryIcon } from '../../assets/svg/glossary-colored.svg';
import { ReactComponent as DashboardDataModelIcon } from '../../assets/svg/ic-dashboard-data-model-colored.svg';
import { ReactComponent as SchemaIcon } from '../../assets/svg/ic-database-schema-colored.svg';
import { ReactComponent as MessagingIcon } from '../../assets/svg/messaging-colored.svg';
import { ReactComponent as PipelineIcon } from '../../assets/svg/pipeline-colored.svg';
import { ReactComponent as SearchIcon } from '../../assets/svg/search-colored.svg';
import { ReactComponent as StorageIcon } from '../../assets/svg/storage-colored.svg';
import { ReactComponent as StoredProcedureIcon } from '../../assets/svg/stored-procedure-colored.svg';
import { ReactComponent as TableIcon } from '../../assets/svg/table-colored.svg';
import { EntityType } from '../../enums/entity.enum';
import { PageType } from '../../generated/system/ui/uiCustomization';
import { SettingMenuItem } from '../GlobalSettingsUtils';
import i18n from '../i18next/LocalUtil';

const ENTITY_ICONS: Record<string, SvgComponent> = {
  [EntityType.TABLE]: TableIcon,
  [EntityType.CONTAINER]: StorageIcon,
  [EntityType.DASHBOARD]: DashboardIcon,
  [EntityType.DASHBOARD_DATA_MODEL]: DashboardDataModelIcon,
  [EntityType.DATABASE]: DatabaseIcon,
  [EntityType.DATABASE_SCHEMA]: SchemaIcon,
  [EntityType.DOMAIN]: SchemaIcon,
  [EntityType.GLOSSARY]: GlossaryIcon,
  [EntityType.GLOSSARY_TERM]: GlossaryIcon,
  [EntityType.PIPELINE]: PipelineIcon,
  [EntityType.SEARCH_INDEX]: SearchIcon,
  [EntityType.STORED_PROCEDURE]: StoredProcedureIcon,
  [EntityType.TOPIC]: MessagingIcon,
  [EntityType.GOVERN]: GovernIcon,
  ['Data assets']: ExploreIcon,
  ['Navigation']: AppstoreAddOutlined as SvgComponent,
  [PageType.LandingPage]: MessagingIcon,
};

export const getCustomizePageCategories = (): SettingMenuItem[] => {
  return [
    {
      key: 'navigation',
      label: i18n.t('label.navigation'),
      description: 'Navigation',
      icon: ENTITY_ICONS[camelCase('Navigation')],
    },
    {
      key: PageType.LandingPage,
      label: i18n.t('label.homepage'),
      description: 'Homepage',
      icon: ENTITY_ICONS[camelCase('Homepage')],
    },
    {
      key: 'governance',
      label: i18n.t('label.governance'),
      description: 'Governance',
      icon: ENTITY_ICONS[camelCase('GOVERN')],
    },
    {
      key: 'data-assets',
      label: 'Data assets',
      description: 'Data assets',
      icon: ENTITY_ICONS[camelCase('Data assets')],
    },
  ];
};

export const getCustomizePageOptions = (
  category: string
): SettingMenuItem[] => {
  const list = map(PageType);

  switch (category) {
    case 'governance':
      return list
        .filter((item) =>
          [PageType.Glossary, PageType.GlossaryTerm, PageType.Domain].includes(
            item
          )
        )
        .map((item) => ({
          key: item,
          label: capitalize(item),
          description: item,
          icon: ENTITY_ICONS[camelCase(item)],
        }));
    case 'data-assets':
      return list
        .filter(
          (item) =>
            ![
              PageType.Glossary,
              PageType.GlossaryTerm,
              PageType.Domain,
              PageType.LandingPage,
            ].includes(item)
        )
        .map((item) => ({
          key: item,
          label: capitalize(item),
          description: item,
          icon: ENTITY_ICONS[camelCase(item)],
        }));
    default:
      return [];
  }
};
