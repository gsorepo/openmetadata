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
import { DownOutlined, SearchOutlined, UpOutlined } from '@ant-design/icons';
import { Button, Collapse, Input } from 'antd';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BORDER_COLOR } from '../../../../constants/constants';
import { LINEAGE_COLUMN_NODE_SUPPORTED } from '../../../../constants/Lineage.constants';
import { useLineageProvider } from '../../../../context/LineageProvider/LineageProvider';
import { EntityType } from '../../../../enums/entity.enum';
import { Container } from '../../../../generated/entity/data/container';
import { Dashboard } from '../../../../generated/entity/data/dashboard';
import { Mlmodel } from '../../../../generated/entity/data/mlmodel';
import { Column, Table } from '../../../../generated/entity/data/table';
import { Topic } from '../../../../generated/entity/data/topic';
import { getEntityName } from '../../../../utils/EntityUtils';
import { getEntityIcon } from '../../../../utils/TableUtils';
import { getColumnContent, getTestSuiteSummary } from '../CustomNode.utils';
import { EntityChildren, NodeChildrenProps } from './NodeChildren.interface';

const NodeChildren = ({ node, isConnectable }: NodeChildrenProps) => {
  const { t } = useTranslation();
  const { Panel } = Collapse;
  const { isEditMode, tracedColumns, expandedNodes, onColumnClick } =
    useLineageProvider();
  const { entityType, id } = node;
  const [searchValue, setSearchValue] = useState('');
  const [filteredColumns, setFilteredColumns] = useState<EntityChildren>([]);
  const [showAllColumns, setShowAllColumns] = useState(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const supportsColumns = useMemo(() => {
    return (
      node &&
      LINEAGE_COLUMN_NODE_SUPPORTED.includes(node.entityType as EntityType)
    );
  }, [node.id]);

  const { children, childrenHeading } = useMemo(() => {
    const entityMappings: Record<
      string,
      { data: EntityChildren; label: string }
    > = {
      [EntityType.TABLE]: {
        data: (node as Table).columns ?? [],
        label: t('label.column-plural'),
      },
      [EntityType.DASHBOARD]: {
        data: (node as Dashboard).charts ?? [],
        label: t('label.chart-plural'),
      },
      [EntityType.MLMODEL]: {
        data: (node as Mlmodel).mlFeatures ?? [],
        label: t('label.feature-plural'),
      },
      [EntityType.DASHBOARD_DATA_MODEL]: {
        data: (node as Table).columns ?? [],
        label: t('label.column-plural'),
      },
      [EntityType.CONTAINER]: {
        data: (node as Container).dataModel?.columns ?? [],
        label: t('label.column-plural'),
      },
      [EntityType.TOPIC]: {
        data: (node as Topic).messageSchema?.schemaFields ?? [],
        label: t('label.field-plural'),
      },
    };

    const { data, label } = entityMappings[node.entityType as EntityType] || {
      data: [],
      label: '',
    };

    return {
      children: data,
      childrenHeading: label,
    };
  }, [node.id]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const value = e.target.value;
      setSearchValue(value);

      if (value.trim() === '') {
        // If search value is empty, show all columns or the default number of columns
        const filterColumns = Object.values(children ?? {});
        setFilteredColumns(
          showAllColumns ? filterColumns : filterColumns.slice(0, 5)
        );
      } else {
        // Filter columns based on search value
        const filtered = Object.values(children ?? {}).filter((column) =>
          getEntityName(column).toLowerCase().includes(value.toLowerCase())
        );
        setFilteredColumns(filtered);
      }
    },
    [children]
  );

  useEffect(() => {
    setIsExpanded(expandedNodes.includes(id ?? ''));
  }, [expandedNodes, id]);

  useEffect(() => {
    if (!isEmpty(children)) {
      setFilteredColumns(children.slice(0, 5));
    }
  }, [children]);

  useEffect(() => {
    if (!isExpanded) {
      setShowAllColumns(false);
    } else if (!isEmpty(children) && Object.values(children).length < 5) {
      setShowAllColumns(true);
    }
  }, [isEditMode, isExpanded, children]);

  const handleShowMoreClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setShowAllColumns(true);
      setFilteredColumns(children ?? []);
    },
    [children]
  );

  const renderRecord = useCallback(
    (record: Column) => {
      return (
        <Collapse
          destroyInactivePanel
          defaultActiveKey={record.fullyQualifiedName}>
          <Panel
            header={getEntityName(record)}
            key={record.fullyQualifiedName ?? ''}>
            {record?.children?.map((child) => {
              const { fullyQualifiedName, dataType } = child;
              if (['RECORD', 'STRUCT'].includes(dataType)) {
                return renderRecord(child);
              } else {
                const isColumnTraced = tracedColumns.includes(
                  fullyQualifiedName ?? ''
                );

                return getColumnContent(
                  child,
                  isColumnTraced,
                  isConnectable,
                  onColumnClick
                );
              }
            })}
          </Panel>
        </Collapse>
      );
    },
    [isConnectable, tracedColumns]
  );

  const renderColumnsData = useCallback(
    (column: Column) => {
      const { fullyQualifiedName, dataType } = column;
      if (['RECORD', 'STRUCT'].includes(dataType)) {
        return renderRecord(column);
      } else {
        const isColumnTraced = tracedColumns.includes(fullyQualifiedName ?? '');

        return getColumnContent(
          column,
          isColumnTraced,
          isConnectable,
          onColumnClick
        );
      }
    },
    [isConnectable, tracedColumns]
  );

  if (supportsColumns) {
    return (
      <div className="column-container bg-grey-1 p-sm p-y-xs">
        <div className="d-flex justify-between items-center">
          <Button
            className="flex-center text-primary rounded-4 p-xss"
            data-testid="expand-cols-btn"
            icon={
              <div className="d-flex w-5 h-5 m-r-xs text-base-color">
                {getEntityIcon(node.entityType ?? '')}
              </div>
            }
            type="text"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prevIsExpanded: boolean) => !prevIsExpanded);
            }}>
            {childrenHeading}
            {isExpanded ? (
              <UpOutlined style={{ fontSize: '12px' }} />
            ) : (
              <DownOutlined style={{ fontSize: '12px' }} />
            )}
          </Button>
          {entityType === EntityType.TABLE &&
            getTestSuiteSummary((node as Table).testSuite)}
        </div>

        {isExpanded && (
          <div className="m-t-md">
            <div className="search-box">
              <Input
                placeholder={t('label.search-entity', {
                  entity: childrenHeading,
                })}
                suffix={<SearchOutlined color={BORDER_COLOR} />}
                value={searchValue}
                onChange={handleSearchChange}
              />
            </div>

            <section className="m-t-md" id="table-columns">
              <div className="border rounded-4 overflow-hidden">
                {filteredColumns.map((column) =>
                  renderColumnsData(column as Column)
                )}
              </div>
            </section>

            {!showAllColumns && (
              <Button
                className="m-t-xs text-primary"
                data-testid="show-more-cols-btn"
                type="text"
                onClick={handleShowMoreClick}>
                {t('label.show-more-entity', {
                  entity: childrenHeading,
                })}
              </Button>
            )}
          </div>
        )}
      </div>
    );
  } else {
    return null;
  }
};

export default NodeChildren;
