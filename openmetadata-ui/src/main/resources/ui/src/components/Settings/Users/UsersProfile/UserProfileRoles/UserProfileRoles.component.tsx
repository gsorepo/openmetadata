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

import { Divider, Select, Tooltip, Typography } from 'antd';
import { AxiosError } from 'axios';
import { isEmpty, toLower } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ReactComponent as EditIcon } from '../../../../../assets/svg/edit-new.svg';
import { ReactComponent as RoleIcon } from '../../../../../assets/svg/roles.svg';
import {
  DE_ACTIVE_COLOR,
  ICON_DIMENSION,
  PAGE_SIZE_LARGE,
  TERM_ADMIN,
} from '../../../../../constants/constants';
import { EntityType } from '../../../../../enums/entity.enum';
import { Role } from '../../../../../generated/entity/teams/role';
import { useAuth } from '../../../../../hooks/authHooks';
import { getRoles } from '../../../../../rest/rolesAPIV1';
import { handleSearchFilterOption } from '../../../../../utils/CommonUtils';
import { getEntityName } from '../../../../../utils/EntityUtils';
import { showErrorToast } from '../../../../../utils/ToastUtils';
import Chip from '../../../../common/Chip/Chip.component';
import InlineEdit from '../../../../common/InlineEdit/InlineEdit.component';
import UserProfileInheritedRoles from '../UserProfileInheritedRoles/UserProfileInheritedRoles.component';
import { UserProfileRolesProps } from './UserProfileRoles.interface';

const UserProfileRoles = ({
  userRoles,
  isDeletedUser,
  updateUserDetails,
  isUserAdmin,
  userData,
}: UserProfileRolesProps) => {
  const { t } = useTranslation();

  const { isAdminUser } = useAuth();
  const [isRolesEdit, setIsRolesEdit] = useState(false);
  const [isRolesLoading, setIsRolesLoading] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const useRolesOption = useMemo(() => {
    const options = roles?.map((role) => ({
      label: getEntityName(role),
      value: role.id,
    }));

    if (!isUserAdmin) {
      options.push({
        label: TERM_ADMIN,
        value: toLower(TERM_ADMIN),
      });
    }

    return options;
  }, [roles, isUserAdmin, getEntityName]);

  const fetchRoles = async () => {
    setIsRolesLoading(true);
    try {
      const response = await getRoles(
        '',
        undefined,
        undefined,
        false,
        PAGE_SIZE_LARGE
      );
      setRoles(response.data);
    } catch (err) {
      showErrorToast(
        err as AxiosError,
        t('server.entity-fetch-error', {
          entity: t('label.role-plural'),
        })
      );
    } finally {
      setIsRolesLoading(false);
    }
  };

  const setUserRoles = useCallback(() => {
    const defaultUserRoles = [
      ...(userRoles?.map((role) => role.id) ?? []),
      ...(isUserAdmin ? [toLower(TERM_ADMIN)] : []),
    ];

    setSelectedRoles(defaultUserRoles);
  }, [userRoles, isUserAdmin]);

  const handleRolesSave = async () => {
    setIsLoading(true);
    // filter out the roles , and exclude the admin one
    const updatedRoles = selectedRoles.filter(
      (roleId) => roleId !== toLower(TERM_ADMIN)
    );

    // get the admin role and send it as boolean value `isAdmin=Boolean(isAdmin)
    const isAdmin = selectedRoles.find(
      (roleId) => roleId === toLower(TERM_ADMIN)
    );
    await updateUserDetails(
      {
        roles: updatedRoles.map((roleId) => {
          const role = roles.find((r) => r.id === roleId);

          return { id: roleId, type: 'role', name: role?.name ?? '' };
        }),
        isAdmin: Boolean(isAdmin),
      },
      'roles'
    );
    setIsLoading(false);
    setIsRolesEdit(false);
  };

  const rolesRenderElement = useMemo(
    () => (
      <Chip
        data={[
          ...(isUserAdmin
            ? [{ id: 'admin', type: 'role', name: TERM_ADMIN }]
            : []),
          ...(userRoles ?? []),
        ]}
        entityType={EntityType.ROLE}
        noDataPlaceholder={t('message.no-roles-assigned')}
        showNoDataPlaceholder={!isUserAdmin}
      />
    ),
    [userRoles, isUserAdmin]
  );

  const handleCloseEditRole = useCallback(() => {
    setIsRolesEdit(false);
    setUserRoles();
  }, [setUserRoles]);

  useEffect(() => {
    setUserRoles();
  }, [setUserRoles]);

  useEffect(() => {
    if (isRolesEdit && isEmpty(roles)) {
      fetchRoles();
    }
  }, [isRolesEdit, roles]);

  return (
    <div className="d-flex flex-col mb-4 w-full  p-[20px]">
      <div
        className="d-flex  w-full grey-1 gap-2"
        data-testid="user-team-card-container"
        key="teams-card"
        style={{
          background: '#F5F5F5',
          padding: '20px',
          borderRadius: '12px 12px 0px 0px',
        }}>
        <div>
          <div className="d-flex flex-col h-full flex-center">
            <RoleIcon height={24} style={{ marginLeft: '8px' }} width={24} />
            <Divider
              style={{
                height: '100%',
                width: '2px',
                background: '#D9D9D9',
              }}
              type="vertical"
            />
          </div>
        </div>
        <div className="w-full">
          <div className="d-flex justify-between w-full">
            <Typography.Text className="profile-section-card-title">
              {t('label.role-plural')}
            </Typography.Text>
            {!isRolesEdit && isAdminUser && !isDeletedUser && (
              <Tooltip
                title={t('label.edit-entity', {
                  entity: t('label.role-plural'),
                })}>
                <EditIcon
                  className="cursor-pointer align-middle"
                  color={DE_ACTIVE_COLOR}
                  data-testid="edit-roles-button"
                  {...ICON_DIMENSION}
                  onClick={() => setIsRolesEdit(true)}
                />
              </Tooltip>
            )}
          </div>

          <div className="m-b-md">
            {isRolesEdit && isAdminUser ? (
              <InlineEdit
                direction="vertical"
                isLoading={isLoading}
                onCancel={handleCloseEditRole}
                onSave={handleRolesSave}>
                <Select
                  allowClear
                  showSearch
                  aria-label="Select roles"
                  className="w-full"
                  data-testid="select-user-roles"
                  filterOption={handleSearchFilterOption}
                  id="select-role"
                  loading={isRolesLoading}
                  maxTagCount={4}
                  mode="multiple"
                  options={useRolesOption}
                  placeholder={t('label.role-plural')}
                  value={!isRolesLoading ? selectedRoles : []}
                  onChange={setSelectedRoles}
                />
              </InlineEdit>
            ) : (
              rolesRenderElement
            )}
          </div>
        </div>
      </div>
      <UserProfileInheritedRoles inheritedRoles={userData?.inheritedRoles} />
    </div>
  );
};

export default UserProfileRoles;
