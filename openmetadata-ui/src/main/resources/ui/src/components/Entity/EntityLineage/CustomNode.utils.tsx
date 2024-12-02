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
import { Button, Typography } from 'antd';
import classNames from 'classnames';
import React, { Fragment } from 'react';
import { Handle, HandleProps, HandleType, Position } from 'reactflow';
import { ReactComponent as MinusIcon } from '../../../assets/svg/control-minus.svg';
import { ReactComponent as PlusIcon } from '../../../assets/svg/plus-outlined.svg';
import { NODE_WIDTH } from '../../../constants/Lineage.constants';
import { EntityLineageNodeType } from '../../../enums/entity.enum';
import { Column } from '../../../generated/entity/data/table';
import { encodeLineageHandles } from '../../../utils/EntityLineageUtils';
import { getEntityName } from '../../../utils/EntityUtils';
import { getColumnDataTypeIcon } from '../../../utils/TableUtils';
import { EdgeTypeEnum } from './EntityLineage.interface';

export const getHandleByType = (
  isConnectable: HandleProps['isConnectable'],
  position: Position,
  type: HandleType,
  className?: string,
  id?: string
) => {
  return (
    <Handle
      className={className}
      id={id}
      isConnectable={isConnectable}
      position={position}
      type={type}
    />
  );
};

export const getColumnHandle = (
  nodeType: string,
  isConnectable: HandleProps['isConnectable'],
  className?: string,
  id?: string
) => {
  if (nodeType === EntityLineageNodeType.NOT_CONNECTED) {
    return null;
  } else {
    return (
      <Fragment>
        {getHandleByType(isConnectable, Position.Left, 'target', className, id)}
        {getHandleByType(
          isConnectable,
          Position.Right,
          'source',
          className,
          id
        )}
      </Fragment>
    );
  }
};

export const getExpandHandle = (
  direction: EdgeTypeEnum,
  onClickHandler: () => void
) => {
  return (
    <Button
      className={classNames(
        'absolute lineage-node-handle flex-center',
        direction === EdgeTypeEnum.DOWN_STREAM
          ? 'react-flow__handle-right'
          : 'react-flow__handle-left'
      )}
      icon={
        <PlusIcon className="lineage-expand-icon" data-testid="plus-icon" />
      }
      shape="circle"
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        onClickHandler();
      }}
    />
  );
};

export const getCollapseHandle = (
  direction: EdgeTypeEnum,
  onClickHandler: () => void
) => {
  return (
    <Button
      className={classNames(
        'absolute lineage-node-minus lineage-node-handle flex-center',
        direction === EdgeTypeEnum.DOWN_STREAM
          ? 'react-flow__handle-right'
          : 'react-flow__handle-left'
      )}
      data-testid={
        direction === EdgeTypeEnum.DOWN_STREAM
          ? 'downstream-collapse-handle'
          : 'upstream-collapse-handle'
      }
      icon={
        <MinusIcon className="lineage-expand-icon " data-testid="minus-icon" />
      }
      shape="circle"
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        onClickHandler();
      }}
    />
  );
};

export const getColumnContent = (
  column: Column,
  isColumnTraced: boolean,
  isConnectable: boolean,
  onColumnClick: (column: string) => void
) => {
  const { fullyQualifiedName } = column;

  return (
    <div
      className={classNames(
        'custom-node-column-container',
        isColumnTraced && 'custom-node-header-tracing'
      )}
      data-testid={`column-${fullyQualifiedName}`}
      key={fullyQualifiedName}
      onClick={(e) => {
        e.stopPropagation();
        onColumnClick(fullyQualifiedName ?? '');
      }}>
      {getColumnHandle(
        EntityLineageNodeType.DEFAULT,
        isConnectable,
        'lineage-column-node-handle',
        encodeLineageHandles(fullyQualifiedName ?? '')
      )}

      <span className="custom-node-name-container">
        <div className="custom-node-name-icon">
          {getColumnDataTypeIcon({
            dataType: column.dataType,
            width: '14px',
          })}
        </div>
        <Typography.Text
          ellipsis={{ tooltip: true }}
          style={{ maxWidth: NODE_WIDTH, color: 'inherit' }}>
          {getEntityName(column)}
        </Typography.Text>
      </span>
      <span className="custom-node-constraint">{column.constraint}</span>
    </div>
  );
};
