/*
 *  Copyright 2022 Collate.
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

import { Empty } from 'antd';
import Input from 'antd/lib/input/Input';
import { AxiosError } from 'axios';
import { ExploreSearchIndex } from 'components/Explore/explore.interface';
import { FQN_SEPARATOR_CHAR } from 'constants/char.constants';
import { PAGE_SIZE } from 'constants/constants';
import { EntityType, FqnPart } from 'enums/entity.enum';
import { SearchIndex } from 'enums/search.enum';
import { EntityReference } from 'generated/entity/type';
import { capitalize, debounce } from 'lodash';
import { FormattedTableData } from 'Models';
import React, {
  FC,
  HTMLAttributes,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { searchData } from 'rest/miscAPI';
import { formatDataResponse } from 'utils/APIUtils';
import { getPartialNameFromTableFQN } from 'utils/CommonUtils';
import { serviceTypeLogo } from 'utils/ServiceUtils';
import { showErrorToast } from 'utils/ToastUtils';

interface EntitySuggestionProps extends HTMLAttributes<HTMLDivElement> {
  onSelectHandler: (value: EntityReference) => void;
  entityType: string;
}

const NodeSuggestions: FC<EntitySuggestionProps> = ({
  entityType,
  onSelectHandler,
}) => {
  const { t } = useTranslation();

  const [data, setData] = useState<Array<FormattedTableData>>([]);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>('');

  const getSuggestionLabelHeading = (fqn: string, type: string) => {
    if (type === EntityType.TABLE) {
      const database = getPartialNameFromTableFQN(fqn, [FqnPart.Database]);
      const schema = getPartialNameFromTableFQN(fqn, [FqnPart.Schema]);

      return database && schema
        ? `${database}${FQN_SEPARATOR_CHAR}${schema}`
        : '';
    } else {
      return '';
    }
  };

  const getSearchResults = async (value: string) => {
    try {
      const data = await searchData<ExploreSearchIndex>(
        value,
        1,
        PAGE_SIZE,
        '',
        '',
        '',
        SearchIndex[
          entityType as keyof typeof SearchIndex
        ] as ExploreSearchIndex
      );
      setData(formatDataResponse(data.data.hits.hits));
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-fetch-error', {
          entity: t('label.suggestion-lowercase-plural'),
        })
      );
    }
  };

  const debouncedOnSearch = useCallback((searchText: string): void => {
    getSearchResults(searchText);
  }, []);

  const debounceOnSearch = useCallback(debounce(debouncedOnSearch, 300), [
    debouncedOnSearch,
  ]);

  const handleChange = (e: React.ChangeEvent<{ value: string }>): void => {
    const searchText = e.target.value;
    setSearchValue(searchText);
    debounceOnSearch(searchText);
  };

  useEffect(() => {
    setIsOpen(data.length > 0);
  }, [data]);

  useEffect(() => {
    getSearchResults(searchValue);
  }, []);

  return (
    <div data-testid="suggestion-node">
      <Input
        className="w-full"
        data-testid="node-search-box"
        placeholder={`${t('label.search-for-type', {
          type: capitalize(entityType),
        })}s...`}
        type="search"
        value={searchValue}
        onChange={handleChange}
      />
      {data.length > 0 && isOpen ? (
        <div
          aria-labelledby="menu-button"
          aria-orientation="vertical"
          className="suggestion-node-item m-t-xss"
          role="menu">
          {data.map((entity) => (
            <>
              <div
                className="d-flex items-center p-xs text-sm"
                key={entity.fullyQualifiedName}
                onClick={() => {
                  setIsOpen(false);
                  onSelectHandler?.({
                    description: entity.description,
                    displayName: entity.displayName,
                    id: entity.id,
                    type: entity.entityType as string,
                    name: entity.name,
                    fullyQualifiedName: entity.fullyQualifiedName,
                  });
                }}>
                <img
                  alt={entity.serviceType}
                  src={serviceTypeLogo(entity.serviceType as string)}
                />
                <div className="flex-1 text-left">
                  {entity.entityType === EntityType.TABLE && (
                    <p className="d-block text-xs text-grey-muted w-max-400 truncate">
                      {getSuggestionLabelHeading(
                        entity.fullyQualifiedName,
                        entity.entityType as string
                      )}
                    </p>
                  )}
                  <p className="w-max-400 truncate">{entity.name}</p>
                </div>
              </div>
              <hr className="w-full" />
            </>
          ))}
        </div>
      ) : (
        searchValue && (
          <div>
            <Empty
              description={t('label.no-data-found')}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              style={{
                width: '326px',
                height: '70px',
              }}
            />
          </div>
        )
      )}
    </div>
  );
};

export default NodeSuggestions;
