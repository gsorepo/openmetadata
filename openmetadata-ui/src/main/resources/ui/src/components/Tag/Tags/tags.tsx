/*
 *  Copyright 2022 Collate.
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

import { CloseOutlined } from '@ant-design/icons';
import { Space, Tooltip } from 'antd';
import classNames from 'classnames';
import RichTextEditorPreviewer from 'components/common/rich-text-editor/RichTextEditorPreviewer';
import { FQN_SEPARATOR_CHAR } from 'constants/char.constants';
import { ROUTES } from 'constants/constants';
import { TagSource } from 'generated/type/tagLabel';
import { isEmpty } from 'lodash';
import React, { FunctionComponent, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { getTagDisplay } from 'utils/TagsUtils';
import { ReactComponent as IconPage } from '../../../assets/svg/ic-flat-doc.svg';
import { ReactComponent as PlusIcon } from '../../../assets/svg/plus-primary.svg';
import { ReactComponent as IconTag } from '../../../assets/svg/tag-grey.svg';

import { TAG_START_WITH } from 'constants/Tag.constants';
import { TagProps } from './tags.interface';
import { tagStyles } from './tags.styles';

const Tags: FunctionComponent<TagProps> = ({
  className,
  editable,
  tag,
  startWith,
  type = 'contained',
  showOnlyName = false,
  removeTag,
  isRemovable,
}: TagProps) => {
  const { t } = useTranslation();
  const history = useHistory();
  const baseStyle = tagStyles.base;
  const layoutStyles = tagStyles[type];
  const textBaseStyle = tagStyles.text.base;
  const textLayoutStyles = tagStyles.text[type] || tagStyles.text.default;
  const textEditStyles = editable ? tagStyles.text.editable : '';

  const getTagString = (tag: string) => {
    return tag.startsWith('#') ? tag.slice(1) : tag;
  };

  const isGlossaryTag = useMemo(
    () => tag.source === TagSource.Glossary,
    [tag.source]
  );

  const startIcon = useMemo(() => {
    switch (startWith) {
      case TAG_START_WITH.PLUS:
        return <PlusIcon height={16} name="plus" width={16} />;
      case TAG_START_WITH.SOURCE_ICON:
        return isGlossaryTag ? (
          <IconPage
            data-testid="glossary-icon"
            height={12}
            name="glossary-icon"
            width={12}
          />
        ) : (
          <IconTag
            data-testid="tags-icon"
            height={12}
            name="tag-icon"
            width={12}
          />
        );
      default:
        return startWith;
    }
  }, [startWith, isGlossaryTag]);

  const tagChip = useMemo(() => {
    const tagName = showOnlyName
      ? tag.tagFQN.split(FQN_SEPARATOR_CHAR).slice(-2).join(FQN_SEPARATOR_CHAR)
      : tag.tagFQN;

    return (
      <div
        className={classNames(baseStyle, layoutStyles, className, 'tags-item')}
        data-testid="tags"
        onClick={() => {
          if (tag.source && startWith !== TAG_START_WITH.PLUS) {
            tag.source === TagSource.Glossary
              ? history.push(`${ROUTES.GLOSSARY}/${tag.tagFQN}`)
              : history.push(`${ROUTES.TAGS}/${tag.tagFQN.split('.')[0]}`);
          }
        }}>
        <Space
          align="center"
          className={classNames(
            textBaseStyle,
            textLayoutStyles,
            textEditStyles,
            'd-flex items-center cursor-pointer'
          )}
          data-testid={editable ? `tag-${tag.tagFQN}` : 'add-tag'}
          size={4}>
          {startIcon}
          <span
            className={classNames(
              'text-xs font-medium',
              startWith === '+' && 'text-primary'
            )}>
            {getTagDisplay(tagName)}

            {editable && isRemovable && (
              <span
                className="tw-py-0.5 tw-px-2 tw-rounded tw-cursor-pointer"
                data-testid={`remove-${tag}-tag`}
                onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                  e.preventDefault();
                  e.stopPropagation();
                  removeTag && removeTag(e, getTagString(tag.tagFQN));
                }}>
                <CloseOutlined className="tw-text-primary" />
              </span>
            )}
          </span>
        </Space>
      </div>
    );
  }, [startIcon, tag, editable]);

  return (
    <>
      {startWith === TAG_START_WITH.PLUS ? (
        tagChip
      ) : (
        <Tooltip
          className="cursor-pointer"
          placement="bottomLeft"
          title={
            <div className="text-left p-xss">
              <div className="m-b-xs">
                <RichTextEditorPreviewer
                  enableSeeMoreVariant={false}
                  markdown={
                    !isEmpty(tag.description)
                      ? `**${tag.tagFQN}**\n${tag.description}`
                      : t('label.no-entity', {
                          entity: t('label.description'),
                        })
                  }
                  textVariant="white"
                />
              </div>
            </div>
          }
          trigger="hover">
          {tagChip}
        </Tooltip>
      )}
    </>
  );
};

export default Tags;
