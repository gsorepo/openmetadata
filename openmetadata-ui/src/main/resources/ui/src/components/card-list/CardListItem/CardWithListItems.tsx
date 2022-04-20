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

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import classNames from 'classnames';
import React, { FunctionComponent } from 'react';
import { Button } from '../../buttons/Button/Button';
import RichTextEditorPreviewer from '../../common/rich-text-editor/RichTextEditorPreviewer';
import Loader from '../../Loader/Loader';
import { Props } from './CardWithListItems.interface';
import { cardStyle } from './CardWithListItems.style';

const CardListItem: FunctionComponent<Props> = ({
  card,
  isActive,
  isSelected,
  onSelect,
  onSave,
  tierStatus,
}: Props) => {
  const getCardBodyStyle = () => {
    return isSelected
      ? cardStyle.selected
      : isActive
      ? cardStyle.active
      : cardStyle.default;
  };

  const getCardHeaderStyle = () => {
    return isSelected
      ? cardStyle.header.selected
      : isActive
      ? cardStyle.header.active
      : cardStyle.header.default;
  };

  const getTierSelectButton = (tier: string) => {
    return tierStatus === 'waiting' ? (
      <Loader
        className="tw-inline-block"
        size="small"
        style={{ marginBottom: '-4px' }}
        type="default"
      />
    ) : tierStatus === 'success' ? (
      <FontAwesomeIcon icon="check" />
    ) : (
      <Button
        data-testid="select-tier-buuton"
        size="small"
        theme="primary"
        onClick={() => onSave(tier)}>
        Select
      </Button>
    );
  };

  const getCardIcon = (cardId: string) => {
    if (isSelected && isActive) {
      return <FontAwesomeIcon className="tw-text-h4" icon="check-circle" />;
    } else if (isSelected) {
      return <FontAwesomeIcon className="tw-text-h4" icon="check-circle" />;
    } else if (isActive) {
      return getTierSelectButton(cardId);
    } else {
      return null;
    }
  };

  return (
    <div
      className={classNames(cardStyle.base, getCardBodyStyle())}
      data-testid="card-list"
      onClick={() => onSelect(card.id)}>
      <div className={classNames(cardStyle.header.base, getCardHeaderStyle())}>
        <div className="tw-flex">
          <div className="tw-self-start tw-mr-2">
            <FontAwesomeIcon
              className="tw-text-xs"
              icon={isActive ? 'chevron-down' : 'chevron-right'}
            />
          </div>
          <div className="tw-flex tw-flex-col">
            <h4 className={cardStyle.header.title}>{card.title}</h4>
            <p className={cardStyle.header.description}>
              {card.description.replace(/\*/g, '')}
            </p>
          </div>
        </div>
        <div data-testid="icon">{getCardIcon(card.id)}</div>
      </div>
      <div
        className={classNames(
          cardStyle.body.base,
          isActive ? cardStyle.body.active : cardStyle.body.default
        )}>
        <RichTextEditorPreviewer
          enableSeeMoreVariant={false}
          markdown={card.data}
        />
      </div>
    </div>
  );
};

export default CardListItem;
