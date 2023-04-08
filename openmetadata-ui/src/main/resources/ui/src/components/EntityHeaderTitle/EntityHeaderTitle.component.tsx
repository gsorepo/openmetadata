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
import { Space, Typography } from 'antd';
import React from 'react';

interface props {
  icon: React.ReactNode;
  name: string;
  displayName: string;
}

const EntityHeaderTitle = ({ icon, name, displayName }: props) => {
  return (
    <Space direction="vertical" size={0}>
      <Space align="center" size={8}>
        {icon}
        <div className="d-flex flex-col">
          <Typography.Text
            className="m-b-0 tw-text-xs tw-text-grey-muted"
            data-testid="entity-header-name">
            {name}
          </Typography.Text>
          <Typography.Text
            className="m-b-0 entity-header-display-name text-lg font-bold"
            data-testid="entity-header-display-name">
            {displayName}
          </Typography.Text>
        </div>
      </Space>
    </Space>
  );
};

export default EntityHeaderTitle;
