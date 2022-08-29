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

import { Button, Col, Empty, Row, Space, Switch } from 'antd';
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import BotListV1 from '../../components/BotListV1/BotListV1.component';
import { usePermissionProvider } from '../../components/PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../../components/PermissionProvider/PermissionProvider.interface';
import { getCreateUserPath } from '../../constants/constants';
import { Operation } from '../../generated/entity/policies/accessControl/rule';
import { checkPemission } from '../../utils/PermissionsUtils';

export const BotsPageV1 = () => {
  const { permissions } = usePermissionProvider();
  const history = useHistory();
  const [showDeleted, setShowDeleted] = useState(false);

  const handleAddBotClick = () => {
    history.push(getCreateUserPath(true));
  };

  const handleShowDeleted = (checked: boolean) => {
    setShowDeleted(checked);
  };

  const viewAllPermission = checkPemission(
    Operation.ViewAll,
    ResourceEntity.BOT,
    permissions
  );

  const createPermission = checkPemission(
    Operation.Create,
    ResourceEntity.BOT,
    permissions
  );

  return (
    <Row gutter={[16, 16]}>
      {viewAllPermission ? (
        <>
          <Col flex={1} />
          <Col>
            <Space size={16}>
              <Space align="end" size={5}>
                <Switch
                  checked={showDeleted}
                  id="switch-deleted"
                  size="small"
                  onClick={handleShowDeleted}
                />
                <label htmlFor="switch-deleted">Show deleted</label>
              </Space>

              {createPermission && (
                <Button type="primary" onClick={handleAddBotClick}>
                  Add Bot
                </Button>
              )}
            </Space>
          </Col>
          <Col span={24}>
            <BotListV1 showDeleted={showDeleted} />
          </Col>
        </>
      ) : (
        <Empty description="You do not have permission to view data" />
      )}
    </Row>
  );
};

export default BotsPageV1;
