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

import classNames from 'classnames';
import { isUndefined } from 'lodash';
import { EntityFieldThreads } from 'Models';
import React from 'react';
import { Table } from '../../../generated/entity/data/table';
import { Operation } from '../../../generated/entity/policies/accessControl/rule';
import { getHtmlForNonAdminAction } from '../../../utils/CommonUtils';
import SVGIcons from '../../../utils/SvgUtils';
import { ModalWithMarkdownEditor } from '../../Modals/ModalWithMarkdownEditor/ModalWithMarkdownEditor';
import NonAdminAction from '../non-admin-action/NonAdminAction';
import RichTextEditorPreviewer from '../rich-text-editor/RichTextEditorPreviewer';

type Props = {
  entityName?: string;
  owner?: Table['owner'];
  hasEditAccess?: boolean;
  blurWithBodyBG?: boolean;
  removeBlur?: boolean;
  description: string;
  isEdit?: boolean;
  isReadOnly?: boolean;
  entityFieldThreads?: EntityFieldThreads[];
  onThreadLinkSelect?: (value: string) => void;
  onDescriptionEdit?: () => void;
  onCancel?: () => void;
  onDescriptionUpdate?: (value: string) => void;
  onSuggest?: (value: string) => void;
};

const Description = ({
  owner,
  hasEditAccess,
  onDescriptionEdit,
  description = '',
  isEdit,
  onCancel,
  onDescriptionUpdate,
  isReadOnly = false,
  blurWithBodyBG = false,
  removeBlur = false,
  entityName,
  entityFieldThreads,
  onThreadLinkSelect,
}: Props) => {
  const descriptionThread = entityFieldThreads?.[0];

  return (
    <div className="schema-description tw-relative">
      <div className="tw-px-3 tw-py-1 tw-flex">
        <div className="tw-relative">
          <div
            className="description tw-h-full tw-overflow-y-scroll tw-min-h-12 tw-relative tw-py-2.5"
            data-testid="description"
            id="center">
            {description?.trim() ? (
              <RichTextEditorPreviewer
                blurClasses={
                  blurWithBodyBG ? 'see-more-blur-body' : 'see-more-blur-white'
                }
                className="tw-p-2"
                enableSeeMoreVariant={!removeBlur}
                markdown={description}
                maxHtClass="tw-max-h-36"
                maxLen={800}
              />
            ) : (
              <span className="tw-no-description tw-p-2">
                No description added
              </span>
            )}
            {!isUndefined(descriptionThread) ? (
              <p
                className="tw-text-right link-text"
                onClick={() =>
                  onThreadLinkSelect?.(descriptionThread.entityLink)
                }>
                <i className="far fa-comment" /> {descriptionThread.count}{' '}
                threads
              </p>
            ) : null}
          </div>
          {isEdit && (
            <ModalWithMarkdownEditor
              header={`Edit description for ${entityName}`}
              placeholder="Enter Description"
              value={description}
              onCancel={onCancel}
              onSave={onDescriptionUpdate}
            />
          )}
        </div>
        {!isReadOnly ? (
          <div
            className={classNames(
              'tw-w-5 tw-min-w-max',
              description?.trim() ? 'tw-pt-4' : 'tw-pt-2.5'
            )}>
            <NonAdminAction
              html={getHtmlForNonAdminAction(Boolean(owner))}
              isOwner={hasEditAccess}
              permission={Operation.UpdateDescription}
              position="right">
              <button
                className="focus:tw-outline-none"
                data-testid="edit-description"
                onClick={onDescriptionEdit}>
                <SVGIcons
                  alt="edit"
                  icon="icon-edit"
                  title="Edit"
                  width="12px"
                />
              </button>
            </NonAdminAction>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Description;
