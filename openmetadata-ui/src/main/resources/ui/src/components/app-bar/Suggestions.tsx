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

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { AxiosError, AxiosResponse } from 'axios';
import { startCase } from 'lodash';
import React, { Fragment, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSuggestions } from '../../axiosAPIs/miscAPI';
import { FQN_SEPARATOR_CHAR } from '../../constants/char.constants';
import { FqnPart } from '../../enums/entity.enum';
import { SearchIndex } from '../../enums/search.enum';
import jsonData from '../../jsons/en';
import { getPartialNameFromTableFQN } from '../../utils/CommonUtils';
import { serviceTypeLogo } from '../../utils/ServiceUtils';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import { getEntityLink } from '../../utils/TableUtils';
import { showErrorToast } from '../../utils/ToastUtils';
import { Filter } from '../AdvanceSearch/AdvanceSearch.interface';

type SuggestionProp = {
  searchText: string;
  isOpen: boolean;
  filters: Array<string>;
  onFilterUpdateHandle: (filter: Filter) => void;
  setIsOpen: (value: boolean) => void;
};

type CommonSource = {
  fqdn: string;
  service_type: string;
  name: string;
};

type TableSource = {
  table_id: string;
  table_name: string;
} & CommonSource;

type DashboardSource = {
  dashboard_id: string;
  dashboard_name: string;
} & CommonSource;

type TopicSource = {
  topic_id: string;
  topic_name: string;
} & CommonSource;

type PipelineSource = {
  pipeline_id: string;
  pipeline_name: string;
} & CommonSource;

type Option = {
  _index: string;
  _source: TableSource & DashboardSource & TopicSource & PipelineSource;
};

const Suggestions = ({
  searchText,
  isOpen,
  setIsOpen,
  filters,
  onFilterUpdateHandle,
}: SuggestionProp) => {
  const [options, setOptions] = useState<Array<Option>>([]);
  const [tableSuggestions, setTableSuggestions] = useState<TableSource[]>([]);
  const [topicSuggestions, setTopicSuggestions] = useState<TopicSource[]>([]);
  const [dashboardSuggestions, setDashboardSuggestions] = useState<
    DashboardSource[]
  >([]);

  const [pipelineSuggestions, setPipelineSuggestions] = useState<
    PipelineSource[]
  >([]);
  const isMounting = useRef(true);

  const setSuggestions = (options: Array<Option>) => {
    setTableSuggestions(
      options
        .filter((option) => option._index === SearchIndex.TABLE)
        .map((option) => option._source)
    );
    setTopicSuggestions(
      options
        .filter((option) => option._index === SearchIndex.TOPIC)
        .map((option) => option._source)
    );
    setDashboardSuggestions(
      options
        .filter((option) => option._index === SearchIndex.DASHBOARD)
        .map((option) => option._source)
    );
    setPipelineSuggestions(
      options
        .filter((option) => option._index === SearchIndex.PIPELINE)
        .map((option) => option._source)
    );
  };

  const getGroupLabel = (index: string) => {
    let label = '';
    let icon = '';
    switch (index) {
      case SearchIndex.TOPIC:
        label = 'Topics';
        icon = Icons.TOPIC_GREY;

        break;
      case SearchIndex.DASHBOARD:
        label = 'Dashboards';
        icon = Icons.DASHBOARD_GREY;

        break;
      case SearchIndex.PIPELINE:
        label = 'Pipelines';
        icon = Icons.PIPELINE_GREY;

        break;
      case SearchIndex.TABLE:
      default:
        label = 'Tables';
        icon = Icons.TABLE_GREY;

        break;
    }

    return (
      <div className="tw-flex tw-items-center">
        <SVGIcons alt="icon" className="tw-h-4 tw-w-4 tw-ml-2" icon={icon} />
        <p className="tw-px-2 tw-py-2 tw-text-grey-muted tw-text-xs">{label}</p>
      </div>
    );
  };

  const getSuggestionElement = (
    fqdn: string,
    serviceType: string,
    name: string,
    index: string
  ) => {
    let database;
    let schema;
    if (index === SearchIndex.TABLE) {
      database = getPartialNameFromTableFQN(fqdn, [FqnPart.Database]);
      schema = getPartialNameFromTableFQN(fqdn, [FqnPart.Schema]);
    }

    return (
      <div
        className="tw-flex tw-items-center hover:tw-bg-body-hover"
        key={fqdn}>
        <img
          alt={serviceType}
          className="tw-inline tw-h-4 tw-w-4 tw-ml-2"
          src={serviceTypeLogo(serviceType)}
        />
        <Link
          className="tw-block tw-px-4 tw-py-2 tw-text-sm"
          data-testid="data-name"
          id={fqdn.replace(/\./g, '')}
          to={getEntityLink(index, fqdn)}
          onClick={() => setIsOpen(false)}>
          {database && schema
            ? `${database}${FQN_SEPARATOR_CHAR}${schema}${FQN_SEPARATOR_CHAR}${name}`
            : name}
        </Link>
      </div>
    );
  };

  const getEntitiesSuggestions = () => {
    return (
      <div className="py-1" role="none">
        {tableSuggestions.length > 0 && (
          <>
            {getGroupLabel(SearchIndex.TABLE)}

            {tableSuggestions.map((suggestion: TableSource) => {
              const fqdn = suggestion.fqdn;
              const name = suggestion.name;
              const serviceType = suggestion.service_type;

              return getSuggestionElement(
                fqdn,
                serviceType,
                name,
                SearchIndex.TABLE
              );
            })}
          </>
        )}
        {topicSuggestions.length > 0 && (
          <>
            {getGroupLabel(SearchIndex.TOPIC)}

            {topicSuggestions.map((suggestion: TopicSource) => {
              const fqdn = suggestion.fqdn;
              const name = suggestion.name;
              const serviceType = suggestion.service_type;

              return getSuggestionElement(
                fqdn,
                serviceType,
                name,
                SearchIndex.TOPIC
              );
            })}
          </>
        )}
        {dashboardSuggestions.length > 0 && (
          <>
            {getGroupLabel(SearchIndex.DASHBOARD)}

            {dashboardSuggestions.map((suggestion: DashboardSource) => {
              const fqdn = suggestion.fqdn;
              const name = suggestion.name;
              const serviceType = suggestion.service_type;

              return getSuggestionElement(
                fqdn,
                serviceType,
                name,
                SearchIndex.DASHBOARD
              );
            })}
          </>
        )}
        {pipelineSuggestions.length > 0 && (
          <>
            {getGroupLabel(SearchIndex.PIPELINE)}

            {pipelineSuggestions.map((suggestion: PipelineSource) => {
              const fqdn = suggestion.fqdn;
              const name = suggestion.name;
              const serviceType = suggestion.service_type;

              return getSuggestionElement(
                fqdn,
                serviceType,
                name,
                SearchIndex.PIPELINE
              );
            })}
          </>
        )}
      </div>
    );
  };

  const getAdvanceFilters = () => {
    return filters.map((filter, i) => {
      return (
        <div
          className="tw-inline tw-border tw-rounded-2xl tw-border-main tw-px-1.5 tw-py-1 tw-mr-2 tw-cursor-pointer tw-mb-1 tw-z-50"
          key={i}
          onMouseDown={(e) => {
            e.stopPropagation();
            onFilterUpdateHandle({ key: filter, value: '' });
          }}>
          <span>{startCase(filter)}</span>
          <FontAwesomeIcon
            className="tw-text-primary tw-ml-1.5 tw-text-lg tw-align-middle"
            icon="plus-circle"
          />
        </div>
      );
    });
  };

  useEffect(() => {
    if (!isMounting.current) {
      getSuggestions(searchText)
        .then((res: AxiosResponse) => {
          if (res.data) {
            setOptions(res.data.suggest['table-suggest'][0].options);
            setSuggestions(res.data.suggest['table-suggest'][0].options);
            setIsOpen(true);
          } else {
            throw jsonData['api-error-messages']['unexpected-server-response'];
          }
        })
        .catch((err: AxiosError) => {
          showErrorToast(
            err,
            jsonData['api-error-messages']['fetch-suggestions-error']
          );
        });
    }
  }, [searchText]);

  // alwyas Keep this useEffect at the end...
  useEffect(() => {
    isMounting.current = false;
  }, []);

  return (
    <Fragment>
      {isOpen && (options.length > 0 || filters.length > 0) ? (
        <Fragment>
          <button
            className="tw-z-10 tw-fixed tw-inset-0 tw-h-full tw-w-full tw-bg-black tw-opacity-0 "
            onClick={() => setIsOpen(false)}
          />
          <div
            aria-labelledby="menu-button"
            aria-orientation="vertical"
            className="tw-origin-top-right tw-absolute tw-z-20
          tw-w-600 tw-mt-1 tw-rounded-md tw-shadow-lg
        tw-bg-white tw-ring-1 tw-ring-black tw-ring-opacity-5 focus:tw-outline-none"
            role="menu">
            {getEntitiesSuggestions()}
            <div className="tw-flex tw-flex-wrap tw-my-3 tw-mx-2">
              {getAdvanceFilters()}
            </div>
          </div>
        </Fragment>
      ) : null}
    </Fragment>
  );
};

export default Suggestions;
