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
import { Button } from 'antd';
import classNames from 'classnames';
import { isEmpty } from 'lodash';
import React, { Fragment } from 'react';
import { Handle, HandleProps, HandleType, Position } from 'reactflow';
import { ReactComponent as MinusIcon } from '../../../assets/svg/control-minus.svg';
import { ReactComponent as PlusIcon } from '../../../assets/svg/plus-outlined.svg';
import { EntityLineageNodeType } from '../../../enums/entity.enum';
import { Column, TestSuite } from '../../../generated/entity/data/table';
import { formTwoDigitNumber } from '../../../utils/CommonUtils';
import { getEntityName } from '../../../utils/EntityUtils';
import { getConstraintIcon } from '../../../utils/TableUtils';
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
      icon={<PlusIcon className="lineage-expand-icon" />}
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
      icon={<MinusIcon className="lineage-expand-icon" />}
      shape="circle"
      size="small"
      onClick={(e) => {
        e.stopPropagation();
        onClickHandler();
      }}
    />
  );
};

export const getTestSuiteSummary = (testSuite?: TestSuite) => {
  if (isEmpty(testSuite)) {
    return null;
  }

  return (
    <div className="d-flex justify-between">
      <div className="profiler-item green" data-testid="test-passed">
        <div className="font-medium" data-testid="test-passed-value">
          {formTwoDigitNumber(testSuite?.summary?.success ?? 0)}
        </div>
      </div>
      <div className="profiler-item amber" data-testid="test-aborted">
        <div className="font-medium" data-testid="test-aborted-value">
          {formTwoDigitNumber(testSuite?.summary?.aborted ?? 0)}
        </div>
      </div>
      <div className="profiler-item red" data-testid="test-failed">
        <div className="font-medium" data-testid="test-failed-value">
          {formTwoDigitNumber(testSuite?.summary?.failed ?? 0)}
        </div>
      </div>
    </div>
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
        isColumnTraced
          ? 'custom-node-header-tracing'
          : 'custom-node-column-lineage-normal bg-white'
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
        fullyQualifiedName
      )}
      {getConstraintIcon({
        constraint: column.constraint,
      })}
      <p className="p-xss">{getEntityName(column)}</p>
    </div>
  );
};
