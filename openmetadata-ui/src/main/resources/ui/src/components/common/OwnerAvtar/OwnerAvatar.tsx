/*
 *  Copyright 2025 Collate.
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
import Icon from '@ant-design/icons';
import { Typography } from 'antd';
import React from 'react';
import { ReactComponent as IconTeamsGrey } from '../../../assets/svg/teams-grey.svg';
import { OwnerType } from '../../../enums/user.enum';
import { EntityReference } from '../../../generated/entity/data/table';
import { getEntityName } from '../../../utils/EntityUtils';
import ProfilePicture from '../ProfilePicture/ProfilePicture';
import './owner-avtar.less';
interface OwnerAvatarProps {
  owner: EntityReference;
  isCompactView: boolean;
  inheritedIcon?: React.ReactNode;
}

export const OwnerAvatar: React.FC<OwnerAvatarProps> = ({
  owner,
  isCompactView,
  inheritedIcon,
}) => {
  const displayName = getEntityName(owner);

  return owner.type === OwnerType.TEAM ? (
    <div className="d-flex gap-2 items-center">
      <Icon
        className="owner-team-icon"
        component={IconTeamsGrey}
        data-testid={!isCompactView && getEntityName(owner)}
        style={{ fontSize: isCompactView ? '16px' : '32px' }}
      />
      {!isCompactView && (
        <Typography.Text className=" text-sm">{displayName}</Typography.Text>
      )}
    </div>
  ) : (
    <div
      className="owner-avatar-icon"
      data-testid={!isCompactView && getEntityName(owner)}
      key={owner.id}
      style={{ flexBasis: '32px' }}>
      <ProfilePicture
        displayName={displayName}
        key="profile-picture"
        name={owner.name ?? ''}
        type="circle"
        width={isCompactView ? '18' : '32'}
      />

      {inheritedIcon && !isCompactView && (
        <div className="inherited-icon-styling flex-center">
          {inheritedIcon}
        </div>
      )}
    </div>
  );
};
