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
import { Button, Tooltip, Typography } from 'antd';
import { t } from 'i18next';
import { cloneDeep, includes, isEqual } from 'lodash';
import { default as React, useMemo } from 'react';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as PlusIcon } from '../../../assets/svg/plus-primary.svg';
import { DE_ACTIVE_COLOR } from '../../../constants/constants';
import { TabSpecificField } from '../../../enums/entity.enum';
import { Domain } from '../../../generated/entity/domains/domain';
import { EntityReference } from '../../../generated/tests/testCase';
import { getOwnerVersionLabel } from '../../../utils/EntityVersionUtils';
import TagButton from '../../common/TagButton/TagButton.component';
import { UserSelectableList } from '../../common/UserSelectableList/UserSelectableList.component';
import { useGenericContext } from '../../Customization/GenericProvider/GenericProvider';

export const DomainExpertWidget = () => {
  const {
    data: domain,
    permissions,
    onUpdate,
    isVersionView,
  } = useGenericContext<Domain>();

  const { editOwnerPermission, editAllPermission } = useMemo(
    () => ({
      editOwnerPermission: permissions.EditAll || permissions.EditOwners,
      editAllPermission: permissions.EditAll,
    }),
    [permissions]
  );

  const handleExpertsUpdate = async (data: Array<EntityReference>) => {
    if (!isEqual(data, domain.experts)) {
      let updatedDomain = cloneDeep(domain);
      const oldExperts = data.filter((d) => includes(domain.experts, d));
      const newExperts = data
        .filter((d) => !includes(domain.experts, d))
        .map((d) => ({
          id: d.id,
          type: d.type,
          name: d.name,
          displayName: d.displayName,
        }));
      updatedDomain = {
        ...updatedDomain,
        experts: [...oldExperts, ...newExperts],
      };
      await onUpdate(updatedDomain);
    }
  };

  return (
    <div data-testid="domain-expert-name">
      <div
        className={`d-flex items-center ${
          domain.experts && domain.experts.length > 0 ? 'm-b-xss' : ''
        }`}>
        <Typography.Text
          className="right-panel-label"
          data-testid="domain-expert-heading-name">
          {t('label.expert-plural')}
        </Typography.Text>
        {editOwnerPermission && domain.experts && domain.experts.length > 0 && (
          <UserSelectableList
            hasPermission
            popoverProps={{ placement: 'topLeft' }}
            selectedUsers={domain.experts ?? []}
            onUpdate={handleExpertsUpdate}>
            <Tooltip
              title={t('label.edit-entity', {
                entity: t('label.expert-plural'),
              })}>
              <Button
                className="cursor-pointer flex-center m-l-xss"
                data-testid="edit-expert-button"
                icon={<EditIcon color={DE_ACTIVE_COLOR} width="14px" />}
                size="small"
                type="text"
              />
            </Tooltip>
          </UserSelectableList>
        )}
      </div>
      <div>
        {getOwnerVersionLabel(
          domain,
          isVersionView ?? false,
          TabSpecificField.EXPERTS,
          editAllPermission
        )}
      </div>

      <div>
        {editOwnerPermission && domain.experts && domain.experts.length === 0 && (
          <UserSelectableList
            hasPermission={editOwnerPermission}
            popoverProps={{ placement: 'topLeft' }}
            selectedUsers={domain.experts ?? []}
            onUpdate={handleExpertsUpdate}>
            <TagButton
              className="tw-text-primary cursor-pointer"
              icon={<PlusIcon height={16} name="plus" width={16} />}
              label={t('label.add')}
              tooltip=""
            />
          </UserSelectableList>
        )}
      </div>
    </div>
  );
};
