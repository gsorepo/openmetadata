/*
 *  Copyright 2023 Collate.
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
import { Button, List, Modal, Space, Typography } from 'antd';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { EntityDetailUnion } from 'Models';
import VirtualList from 'rc-virtual-list';
import {
  default as React,
  UIEventHandler,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { PAGE_SIZE_MEDIUM } from '../../../constants/constants';
import { SearchIndex } from '../../../enums/search.enum';
import { Table } from '../../../generated/entity/data/table';
import { DataProduct } from '../../../generated/entity/domains/dataProduct';
import { Domain } from '../../../generated/entity/domains/domain';
import {
  getDataProductByName,
  patchDataProduct,
} from '../../../rest/dataProductAPI';
import { getDomainByName } from '../../../rest/domainAPI';
import { searchQuery } from '../../../rest/searchAPI';
import {
  getAPIfromSource,
  getAssetsFields,
  getEntityAPIfromSource,
} from '../../../utils/Assets/AssetsUtils';
import { getEntityReferenceFromEntity } from '../../../utils/EntityUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import ErrorPlaceHolder from '../../common/error-with-placeholder/ErrorPlaceHolder';
import Searchbar from '../../common/searchbar/Searchbar';
import TableDataCardV2 from '../../common/table-data-card-v2/TableDataCardV2';
import { AssetsOfEntity } from '../../Glossary/GlossaryTerms/tabs/AssetsTabs.interface';
import Loader from '../../Loader/Loader';
import { SearchedDataProps } from '../../searched-data/SearchedData.interface';
import './asset-selection-model.style.less';
import { AssetSelectionModalProps } from './AssetSelectionModal.interface';

export const AssetSelectionModal = ({
  entityFqn,
  onCancel,
  onSave,
  open,
  type = AssetsOfEntity.GLOSSARY,
  queryFilter = {},
  emptyPlaceHolderText,
}: AssetSelectionModalProps) => {
  const { t } = useTranslation();
  const ES_UPDATE_DELAY = 500;
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<SearchedDataProps['data']>([]);
  const [selectedItems, setSelectedItems] =
    useState<Map<string, EntityDetailUnion>>();
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<SearchIndex>(
    type === AssetsOfEntity.GLOSSARY ? SearchIndex.DATA_ASSET : SearchIndex.ALL
  );
  const [activeEntity, setActiveEntity] = useState<Domain | DataProduct>();
  const [pageNumber, setPageNumber] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isSaveLoading, setIsSaveLoading] = useState<boolean>(false);

  const fetchEntities = useCallback(
    async ({ searchText = '', page = 1, index = activeFilter }) => {
      try {
        setIsLoading(true);
        const res = await searchQuery({
          pageNumber: page,
          pageSize: PAGE_SIZE_MEDIUM,
          searchIndex: index,
          query: searchText,
          queryFilter: queryFilter,
        });
        const hits = res.hits.hits as SearchedDataProps['data'];
        setTotalCount(res.hits.total.value ?? 0);
        setItems(page === 1 ? hits : (prevItems) => [...prevItems, ...hits]);
        setPageNumber(page);
      } catch (_) {
        // Nothing here
      } finally {
        setIsLoading(false);
      }
    },
    [setActiveFilter]
  );

  const fetchCurrentEntity = useCallback(async () => {
    if (type === AssetsOfEntity.DOMAIN) {
      const data = await getDomainByName(encodeURIComponent(entityFqn), '');
      setActiveEntity(data);
    } else if (type === AssetsOfEntity.DATA_PRODUCT) {
      const data = await getDataProductByName(
        encodeURIComponent(entityFqn),
        'domain,assets'
      );
      setActiveEntity(data);
    }
  }, [type, entityFqn]);

  useEffect(() => {
    if (open) {
      fetchEntities({ index: activeFilter, searchText: search });
    }
  }, [open, activeFilter, search, type]);

  useEffect(() => {
    if (open) {
      fetchCurrentEntity();
    }
  }, [open, fetchCurrentEntity]);

  const handleCardClick = (
    details: SearchedDataProps['data'][number]['_source']
  ) => {
    const id = details.id;
    if (!id) {
      return;
    }
    if (selectedItems?.has(id ?? '')) {
      setSelectedItems((prevItems) => {
        const selectedItemMap = new Map();

        prevItems?.forEach(
          (item) => item.id !== id && selectedItemMap.set(item.id, item)
        );

        return selectedItemMap;
      });
    } else {
      setSelectedItems((prevItems) => {
        const selectedItemMap = new Map();

        prevItems?.forEach((item) => selectedItemMap.set(item.id, item));

        selectedItemMap.set(
          id,
          items.find(({ _source }) => _source.id === id)?._source
        );

        return selectedItemMap;
      });
    }
  };

  const getJsonPatchObject = (entity: Table) => {
    if (!activeEntity) {
      return [];
    }
    const { id, description, fullyQualifiedName, name, displayName } =
      activeEntity;
    const patchObj = {
      id,
      description,
      fullyQualifiedName,
      name,
      displayName,
      type: type === AssetsOfEntity.DATA_PRODUCT ? 'dataProduct' : 'domain',
    };

    if (type === AssetsOfEntity.DATA_PRODUCT) {
      const jsonPatch = compare(entity, {
        ...entity,
        dataProducts: [...(entity.dataProducts ?? []), patchObj],
      });

      return jsonPatch;
    } else {
      const jsonPatch = compare(entity, {
        ...entity,
        domain: patchObj,
      });

      return jsonPatch;
    }
  };

  const dataProductsSave = async () => {
    try {
      setIsSaveLoading(true);
      if (!activeEntity) {
        return;
      }

      const entities = [...(selectedItems?.values() ?? [])].map((item) => {
        return getEntityReferenceFromEntity(item, item.entityType);
      });

      const newEntities = entities.filter((entity) => {
        const entityKey = entity.id;

        return !((activeEntity as DataProduct).assets ?? []).some(
          (asset) => asset.id === entityKey
        );
      });

      if (newEntities.length === 0) {
        onSave?.();
        onCancel();
        setIsSaveLoading(false);

        return;
      }

      const updatedActiveEntity = {
        ...activeEntity,
        assets: [
          ...((activeEntity as DataProduct).assets ?? []),
          ...newEntities,
        ],
      };

      const jsonPatch = compare(activeEntity, updatedActiveEntity);
      await patchDataProduct(activeEntity.id, jsonPatch);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve('');
          onSave?.();
        }, ES_UPDATE_DELAY);
      });
    } catch (err) {
      showErrorToast(err as AxiosError);
    } finally {
      setIsSaveLoading(false);
      onCancel();
    }
  };

  const domainAndDataProductsSave = async () => {
    if (type === AssetsOfEntity.DATA_PRODUCT) {
      dataProductsSave();
    } else {
      try {
        setIsSaveLoading(true);
        const entityDetails = [...(selectedItems?.values() ?? [])].map((item) =>
          getEntityAPIfromSource(item.entityType)(
            item.fullyQualifiedName,
            getAssetsFields(type)
          )
        );
        const entityDetailsResponse = await Promise.allSettled(entityDetails);
        const map = new Map();

        entityDetailsResponse.forEach((response) => {
          if (response.status === 'fulfilled') {
            const entity = response.value;
            entity && map.set(entity.fullyQualifiedName, entity);
          }
        });
        const patchAPIPromises = [...(selectedItems?.values() ?? [])]
          .map((item) => {
            if (map.has(item.fullyQualifiedName) && activeEntity) {
              const entity = map.get(item.fullyQualifiedName);
              const jsonPatch = getJsonPatchObject(entity);
              const api = getAPIfromSource(item.entityType);

              return api(item.id, jsonPatch);
            }

            return;
          })
          .filter(Boolean);

        await Promise.all(patchAPIPromises);
        await new Promise((resolve) => {
          setTimeout(() => {
            resolve('');
            onSave?.();
          }, ES_UPDATE_DELAY);
        });
      } catch (err) {
        showErrorToast(err as AxiosError);
      } finally {
        setIsSaveLoading(false);
        onCancel();
      }
    }
  };

  const handleSave = async () => {
    setIsSaveLoading(true);
    const entityDetails = [...(selectedItems?.values() ?? [])].map((item) =>
      getEntityAPIfromSource(item.entityType)(
        item.fullyQualifiedName,
        getAssetsFields(type)
      )
    );

    try {
      const entityDetailsResponse = await Promise.allSettled(entityDetails);
      const map = new Map();

      entityDetailsResponse.forEach((response) => {
        if (response.status === 'fulfilled') {
          const entity = response.value;
          entity && map.set(entity.fullyQualifiedName, (entity as Table).tags);
        }
      });
      const patchAPIPromises = [...(selectedItems?.values() ?? [])]
        .map((item) => {
          if (map.has(item.fullyQualifiedName)) {
            const jsonPatch = compare(
              { tags: map.get(item.fullyQualifiedName) },
              {
                tags: [
                  ...(item.tags ?? []),
                  {
                    tagFQN: entityFqn,
                    source: 'Glossary',
                    labelType: 'Manual',
                  },
                ],
              }
            );
            const api = getAPIfromSource(item.entityType);

            return api(item.id, jsonPatch);
          }

          return;
        })
        .filter(Boolean);

      await Promise.all(patchAPIPromises);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve('');
          onSave?.();
        }, ES_UPDATE_DELAY);
      });
    } catch (err) {
      showErrorToast(err as AxiosError);
    } finally {
      setIsSaveLoading(false);
      onCancel();
    }
  };

  const onSaveAction = useCallback(() => {
    if (type === AssetsOfEntity.GLOSSARY) {
      handleSave();
    } else {
      domainAndDataProductsSave();
    }
  }, [type, handleSave, domainAndDataProductsSave]);

  const onScroll: UIEventHandler<HTMLElement> = useCallback(
    (e) => {
      const scrollHeight =
        e.currentTarget.scrollHeight - e.currentTarget.scrollTop;

      if (
        scrollHeight > 499 &&
        scrollHeight < 501 &&
        items.length < totalCount
      ) {
        !isLoading &&
          fetchEntities({
            searchText: search,
            page: pageNumber + 1,
            index: activeFilter,
          });
      }
    },
    [
      pageNumber,
      activeFilter,
      search,
      totalCount,
      items,
      isLoading,
      fetchEntities,
    ]
  );

  return (
    <Modal
      destroyOnClose
      closable={false}
      closeIcon={null}
      footer={
        <>
          <Button onClick={onCancel}>{t('label.cancel')}</Button>
          <Button
            disabled={isLoading}
            loading={isSaveLoading}
            type="primary"
            onClick={onSaveAction}>
            {t('label.save')}
          </Button>
        </>
      }
      open={open}
      style={{ top: 40 }}
      title={t('label.add-entity', { entity: t('label.asset-plural') })}
      width={750}
      onCancel={onCancel}>
      <Space className="w-full h-full" direction="vertical" size={16}>
        <Searchbar
          removeMargin
          showClearSearch
          placeholder={t('label.search-entity', {
            entity: t('label.asset-plural'),
          })}
          searchValue={search}
          onSearch={setSearch}
        />

        {isLoading && <Loader />}

        {!isLoading && items.length > 0 && (
          <List>
            <VirtualList
              data={items}
              height={500}
              itemKey="id"
              onScroll={onScroll}>
              {({ _source: item }) => (
                <TableDataCardV2
                  openEntityInNewPage
                  showCheckboxes
                  checked={selectedItems?.has(item.id ?? '')}
                  className="m-b-sm asset-selection-model-card cursor-pointer"
                  handleSummaryPanelDisplay={handleCardClick}
                  id={`tabledatacard-${item.id}`}
                  key={item.id}
                  source={{ ...item, tags: [] }}
                />
              )}
            </VirtualList>
          </List>
        )}
        {!isLoading && items.length === 0 && (
          <ErrorPlaceHolder>
            {emptyPlaceHolderText && (
              <Typography.Paragraph>
                {emptyPlaceHolderText}
              </Typography.Paragraph>
            )}
          </ErrorPlaceHolder>
        )}
      </Space>
    </Modal>
  );
};
