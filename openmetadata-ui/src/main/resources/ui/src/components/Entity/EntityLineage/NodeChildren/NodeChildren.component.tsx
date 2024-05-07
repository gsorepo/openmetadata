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
import { Button, Collapse, Input, Space } from 'antd';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BORDER_COLOR } from '../../../../constants/constants';
import { LINEAGE_COLUMN_NODE_SUPPORTED } from '../../../../constants/Lineage.constants';
import { useLineageProvider } from '../../../../context/LineageProvider/LineageProvider';
import { LineageLayerView } from '../../../../context/LineageProvider/LineageProvider.interface';
import { EntityType } from '../../../../enums/entity.enum';
import { Column, Table } from '../../../../generated/entity/data/table';
import { getEntityChildrenAndLabel } from '../../../../utils/EntityLineageUtils';
import { getEntityName } from '../../../../utils/EntityUtils';
import { getEntityIcon } from '../../../../utils/TableUtils';
import { getColumnContent } from '../CustomNode.utils';
import TestSuiteSummaryWidget from '../TestSuiteSummaryWidget/TestSuiteSummaryWidget.component';
import { EntityChildren, NodeChildrenProps } from './NodeChildren.interface';

const NodeChildren = ({ node, isConnectable }: NodeChildrenProps) => {
  const { t } = useTranslation();
  const { Panel } = Collapse;
  const { tracedColumns, activeLayer, onColumnClick } = useLineageProvider();
  const { entityType } = node;
  const [searchValue, setSearchValue] = useState('');
  const [filteredColumns, setFilteredColumns] = useState<EntityChildren>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  const { showColumns, showDataQuality } = useMemo(() => {
    return {
      showColumns: activeLayer.includes(LineageLayerView.COLUMN),
      showDataQuality: activeLayer.includes(LineageLayerView.DATA_QUALITY),
      showPipeline: activeLayer.includes(LineageLayerView.PIPELINE),
    };
  }, [activeLayer]);

  const supportsColumns = useMemo(() => {
    return (
      node &&
      LINEAGE_COLUMN_NODE_SUPPORTED.includes(node.entityType as EntityType)
    );
  }, [node.id]);

  const { children, childrenHeading } = useMemo(
    () => getEntityChildrenAndLabel(node),
    [node.id]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      const value = e.target.value;
      setSearchValue(value);

      if (value.trim() === '') {
        // If search value is empty, show all columns
        const filterColumns = Object.values(children ?? {});
        setFilteredColumns(filterColumns);
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
    if (!isEmpty(children)) {
      setFilteredColumns(children);
    }
  }, [children]);

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
              if (['RECORD', 'STRUCT', 'ARRAY'].includes(dataType)) {
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
      if (['RECORD', 'STRUCT', 'ARRAY'].includes(dataType)) {
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

  if (supportsColumns && (showColumns || showDataQuality)) {
    return (
      <div className="column-container bg-grey-1 p-sm p-y-xs">
        <div className="d-flex justify-between items-center">
          <div>
            {showColumns && (
              <Button
                className="flex-center text-primary rounded-4 p-xss h-9"
                data-testid="expand-cols-btn"
                type="text"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded((prevIsExpanded: boolean) => !prevIsExpanded);
                }}>
                <Space>
                  <div className=" w-5 h-5 text-base-color">
                    {getEntityIcon(node.entityType ?? '')}
                  </div>
                  {childrenHeading}
                  {isExpanded ? (
                    <UpOutlined style={{ fontSize: '12px' }} />
                  ) : (
                    <DownOutlined style={{ fontSize: '12px' }} />
                  )}
                </Space>
              </Button>
            )}
          </div>
          {showDataQuality && entityType === EntityType.TABLE && (
            <TestSuiteSummaryWidget testSuite={(node as Table).testSuite} />
          )}
        </div>

        {showColumns && isExpanded && (
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
          </div>
        )}
      </div>
    );
  } else {
    return null;
  }
};

export default NodeChildren;
