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

import { t } from 'i18next';
import {
  AsyncFetchListValues,
  AsyncFetchListValuesResult,
  BasicConfig,
  Fields,
  ListItem,
  SelectFieldSettings,
} from 'react-awesome-query-builder';
import AntdConfig from 'react-awesome-query-builder/lib/config/antd';
import { EntityFields, SuggestionField } from '../enums/AdvancedSearch.enum';
import { SearchIndex } from '../enums/search.enum';
import { getAggregateFieldOptions } from '../rest/miscAPI';
import { renderAdvanceSearchButtons } from './AdvancedSearchUtils';
import { getCombinedQueryFilterObject } from './ExplorePage/ExplorePageUtils';

class AdvancedSearchClassBase {
  baseConfig = AntdConfig as BasicConfig;

  mainWidgetProps = {
    fullWidth: true,
    valueLabel: t('label.criteria') + ':',
  };

  /**
   * Create an autocomplete function using elasctisearch's suggestion API
   * @param searchIndex Index to search
   * @param suggestField `suggest_` field to use
   */
  public autocomplete: (args: {
    searchIndex: SearchIndex | SearchIndex[];
    entityField: EntityFields;
    suggestField?: SuggestionField;
  }) => SelectFieldSettings['asyncFetch'] = ({ searchIndex, entityField }) => {
    return (search) => {
      return getAggregateFieldOptions(
        searchIndex,
        entityField,
        search ?? '',
        JSON.stringify(getCombinedQueryFilterObject())
      ).then((response) => {
        const buckets =
          response.data.aggregations[`sterms#${entityField}`].buckets;

        return {
          values: buckets.map((bucket) => ({
            value: bucket.key,
            title: bucket.label ?? bucket.key,
          })),
          hasMore: false,
        };
      });
    };
  };

  /**
   * Fields specific to tables
   */
  tableQueryBuilderFields: Fields = {
    'database.displayName.keyword': {
      label: t('label.database'),
      type: 'select',
      mainWidgetProps: this.mainWidgetProps,
      fieldSettings: {
        asyncFetch: this.autocomplete({
          searchIndex: SearchIndex.TABLE,
          entityField: EntityFields.DATABASE,
        }),
        useAsyncSearch: true,
      },
    },

    'databaseSchema.displayName.keyword': {
      label: t('label.database-schema'),
      type: 'select',
      mainWidgetProps: this.mainWidgetProps,
      fieldSettings: {
        asyncFetch: this.autocomplete({
          searchIndex: SearchIndex.TABLE,
          entityField: EntityFields.DATABASE_SCHEMA,
        }),
        useAsyncSearch: true,
      },
    },

    'columns.name.keyword': {
      label: t('label.column'),
      type: 'select',
      mainWidgetProps: this.mainWidgetProps,
      fieldSettings: {
        asyncFetch: this.autocomplete({
          searchIndex: SearchIndex.TABLE,
          entityField: EntityFields.COLUMN,
        }),
        useAsyncSearch: true,
      },
    },
  };

  /**
   * Overriding default configurations.
   * Basic attributes that fields inherit from.
   */
  public getInitialConfigWithoutFields = (isExplorePage = true) => {
    const initialConfigWithoutFields: BasicConfig = {
      ...this.baseConfig,
      types: {
        ...this.baseConfig.types,
        multiselect: {
          ...this.baseConfig.types.multiselect,
          widgets: {
            ...this.baseConfig.types.multiselect.widgets,
            // Adds the "Contains" and "Not contains" options for fields with type multiselect
            text: {
              operators: ['like', 'not_like'],
            },
          },
          // Limits source to user input values, not other fields
          valueSources: ['value'],
        },
        select: {
          ...this.baseConfig.types.select,
          widgets: {
            ...this.baseConfig.types.select.widgets,
            text: {
              operators: ['like', 'not_like'],
            },
          },
          valueSources: ['value'],
        },
        text: {
          ...this.baseConfig.types.text,
          valueSources: ['value'],
        },
      },
      widgets: {
        ...this.baseConfig.widgets,
        multiselect: {
          ...this.baseConfig.widgets.multiselect,
          showSearch: true,
          showCheckboxes: true,
          useAsyncSearch: true,
          useLoadMore: false,
        },
        select: {
          ...this.baseConfig.widgets.select,
          showSearch: true,
          showCheckboxes: true,
          useAsyncSearch: true,
          useLoadMore: false,
        },
        text: {
          ...this.baseConfig.widgets.text,
        },
      },
      operators: {
        ...this.baseConfig.operators,
        like: {
          ...this.baseConfig.operators.like,
          elasticSearchQueryType: 'wildcard',
        },
      },
      settings: {
        ...this.baseConfig.settings,
        showLabels: isExplorePage,
        canReorder: false,
        renderSize: 'medium',
        fieldLabel: t('label.field-plural') + ':',
        operatorLabel: t('label.condition') + ':',
        showNot: false,
        valueLabel: t('label.criteria') + ':',
        renderButton: renderAdvanceSearchButtons,
      },
    };

    return initialConfigWithoutFields;
  };

  public autoCompleteTier: (
    tierOptions: Promise<AsyncFetchListValues>
  ) => SelectFieldSettings['asyncFetch'] = (tierOptions) => {
    return async (search) => {
      const resolvedTierOptions = (await tierOptions) as ListItem[];

      return {
        values: !search
          ? resolvedTierOptions
          : resolvedTierOptions.filter((tier) =>
              tier.title?.toLowerCase()?.includes(search.toLowerCase())
            ),
        hasMore: false,
      } as AsyncFetchListValuesResult;
    };
  };

  /**
   * Common fields that exit for all searchable entities
   */
  public getQueryBuilderFields = ({
    entitySearchIndex = [SearchIndex.TABLE],
    tierOptions = Promise.resolve([]),
    shouldAddServiceField = true,
  }: {
    entitySearchIndex?: Array<SearchIndex>;
    tierOptions?: Promise<AsyncFetchListValues>;
    shouldAddServiceField?: boolean;
  }) => {
    const commonQueryBuilderFields: Fields = {
      deleted: {
        label: t('label.deleted'),
        type: 'boolean',
        defaultValue: true,
      },

      'owner.displayName.keyword': {
        label: t('label.owner'),
        type: 'select',
        mainWidgetProps: this.mainWidgetProps,

        fieldSettings: {
          asyncFetch: this.autocomplete({
            searchIndex: [SearchIndex.USER, SearchIndex.TEAM],
            entityField: EntityFields.OWNER,
          }),
          useAsyncSearch: true,
        },
      },

      'tags.tagFQN': {
        label: t('label.tag-plural'),
        type: 'select',
        mainWidgetProps: this.mainWidgetProps,
        fieldSettings: {
          asyncFetch: this.autocomplete({
            searchIndex: entitySearchIndex ?? [
              (SearchIndex.TAG, SearchIndex.GLOSSARY_TERM),
            ],
            entityField: EntityFields.TAG,
          }),
          useAsyncSearch: true,
        },
      },

      'tier.tagFQN': {
        label: t('label.tier'),
        type: 'select',
        mainWidgetProps: this.mainWidgetProps,
        fieldSettings: {
          asyncFetch: this.autoCompleteTier(tierOptions),
          useAsyncSearch: true,
        },
      },
      extension: {
        label: t('label.custom-property-plural'),
        type: '!group',
        mainWidgetProps: this.mainWidgetProps,
        subfields: {},
      },
      descriptionStatus: {
        label: t('label.description'),
        type: 'select',
        mainWidgetProps: this.mainWidgetProps,
        valueSources: ['value'],
        fieldSettings: {
          listValues: {
            INCOMPLETE: 'Incomplete',
            COMPLETE: 'Complete',
          },
        },
      },
    };

    const serviceQueryBuilderFields: Fields = {
      'service.displayName.keyword': {
        label: t('label.service'),
        type: 'select',
        mainWidgetProps: this.mainWidgetProps,
        fieldSettings: {
          asyncFetch: this.autocomplete({
            searchIndex: entitySearchIndex,
            entityField: EntityFields.SERVICE,
          }),
          useAsyncSearch: true,
        },
      },
    };

    return {
      ...commonQueryBuilderFields,
      ...(shouldAddServiceField ? serviceQueryBuilderFields : {}),
      ...(entitySearchIndex.includes(SearchIndex.TABLE)
        ? this.tableQueryBuilderFields
        : {}),
    };
  };

  /**
   * Builds search index specific configuration for the query builder
   */
  public getQbConfigs: (
    tierOptions: Promise<AsyncFetchListValues>,
    entitySearchIndex?: Array<SearchIndex>,
    isExplorePage?: boolean
  ) => BasicConfig = (tierOptions, entitySearchIndex, isExplorePage) => {
    const searchIndexWithServices = [
      SearchIndex.TABLE,
      SearchIndex.DASHBOARD,
      SearchIndex.PIPELINE,
      SearchIndex.MLMODEL,
      SearchIndex.TOPIC,
      SearchIndex.CONTAINER,
      SearchIndex.SEARCH_INDEX,
      SearchIndex.DATABASE,
      SearchIndex.DATABASE_SCHEMA,
      SearchIndex.DATABASE_SERVICE,
      SearchIndex.MESSAGING_SERVICE,
      SearchIndex.DASHBOARD_SERVICE,
      SearchIndex.PIPELINE_SERVICE,
      SearchIndex.ML_MODEL_SERVICE,
      SearchIndex.SEARCH_SERVICE,
      SearchIndex.STORAGE_SERVICE,
    ];

    const shouldAddServiceField =
      entitySearchIndex &&
      searchIndexWithServices.find((index) =>
        entitySearchIndex.includes(index)
      ) !== undefined;

    return {
      ...this.getInitialConfigWithoutFields(isExplorePage),
      fields: {
        ...this.getQueryBuilderFields({
          entitySearchIndex,
          tierOptions,
          shouldAddServiceField,
        }),
      },
    };
  };
}

const advancedSearchClassBase = new AdvancedSearchClassBase();

export default advancedSearchClassBase;

export { AdvancedSearchClassBase };
