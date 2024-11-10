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
import { Button, Tooltip, Typography } from 'antd';
import { t } from 'i18next';
import React, { useMemo } from 'react';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as PlusIcon } from '../../../assets/svg/plus-primary.svg';
import { DE_ACTIVE_COLOR } from '../../../constants/constants';
import { TabSpecificField } from '../../../enums/entity.enum';
import { Glossary } from '../../../generated/entity/data/glossary';
import { GlossaryTerm } from '../../../generated/entity/data/glossaryTerm';
import { EntityReference } from '../../../generated/entity/type';
import { getOwnerVersionLabel } from '../../../utils/EntityVersionUtils';
import TagButton from '../../common/TagButton/TagButton.component';
import { UserTeamSelectableList } from '../../common/UserTeamSelectableList/UserTeamSelectableList.component';
import { useGenericContext } from '../../GenericProvider/GenericProvider';

export const ReviewerLabelV2 = () => {
  const { data, onUpdate, permissions, isVersionView } = useGenericContext<
    GlossaryTerm | Glossary
  >();

  const hasEditReviewerAccess = useMemo(() => {
    return permissions.EditAll || permissions.EditReviewers;
  }, [permissions]);

  const { assignedReviewers, hasReviewers } = useMemo(() => {
    const inheritedReviewers: EntityReference[] = [];
    const assignedReviewers: EntityReference[] = [];

    data.reviewers?.forEach((item) => {
      if (item.inherited) {
        inheritedReviewers.push(item);
      } else {
        assignedReviewers.push(item);
      }
    });

    return {
      inheritedReviewers,
      assignedReviewers,
      hasReviewers: data.reviewers && data.reviewers.length > 0,
    };
  }, [data.reviewers]);

  const handleReviewerSave = async (updatedReviewers?: EntityReference[]) => {
    const updatedEntity = { ...data };
    updatedEntity.reviewers = updatedReviewers;
    await onUpdate(updatedEntity);
  };

  return (
    <div data-testid="glossary-reviewer">
      <div className={`d-flex items-center ${hasReviewers ? 'm-b-xss' : ''}`}>
        <Typography.Text
          className="right-panel-label"
          data-testid="heading-name">
          {t('label.reviewer-plural')}
        </Typography.Text>
        {hasEditReviewerAccess && hasReviewers && (
          <UserTeamSelectableList
            previewSelected
            hasPermission={hasEditReviewerAccess}
            label={t('label.reviewer-plural')}
            listHeight={200}
            multiple={{ user: true, team: false }}
            owner={assignedReviewers ?? []}
            popoverProps={{ placement: 'topLeft' }}
            onUpdate={handleReviewerSave}>
            <Tooltip
              title={t('label.edit-entity', {
                entity: t('label.reviewer-plural'),
              })}>
              <Button
                className="cursor-pointer flex-center m-l-xss"
                data-testid="edit-reviewer-button"
                icon={<EditIcon color={DE_ACTIVE_COLOR} width="14px" />}
                size="small"
                type="text"
              />
            </Tooltip>
          </UserTeamSelectableList>
        )}
      </div>
      <div>
        <div data-testid="glossary-reviewer-name">
          {getOwnerVersionLabel(
            data,
            isVersionView ?? false,
            TabSpecificField.REVIEWERS,
            hasEditReviewerAccess
          )}
        </div>

        {hasEditReviewerAccess && !hasReviewers && (
          <UserTeamSelectableList
            previewSelected
            hasPermission={hasEditReviewerAccess}
            label={t('label.reviewer-plural')}
            listHeight={200}
            multiple={{ user: true, team: false }}
            owner={assignedReviewers ?? []}
            popoverProps={{ placement: 'topLeft' }}
            onUpdate={handleReviewerSave}>
            <TagButton
              className="text-primary cursor-pointer"
              icon={<PlusIcon height={16} name="plus" width={16} />}
              label={t('label.add')}
              tooltip=""
            />
          </UserTeamSelectableList>
        )}
      </div>
    </div>
  );
};
