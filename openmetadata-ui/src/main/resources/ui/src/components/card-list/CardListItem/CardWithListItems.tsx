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
import RichTextEditorPreviewer from '../../common/rich-text-editor/RichTextEditorPreviewer';
import { Props } from './CardWithListItems.interface';
import { cardStyle } from './CardWithListItems.style';

const CardListItem: FunctionComponent<Props> = ({
  card,
  isActive,
  onSelect,
}: Props) => {
  return (
    <div
      className={classNames(
        cardStyle.base,
        isActive ? cardStyle.active : cardStyle.default
      )}
      data-testid="card-list"
      onClick={() => onSelect(card.id)}>
      <div
        className={classNames(
          cardStyle.header.base,
          isActive ? cardStyle.header.active : cardStyle.header.default
        )}>
        <div className="tw-flex tw-flex-col">
          <h4 className={cardStyle.header.title}>{card.title}</h4>
          <p className={cardStyle.header.description}>
            {card.description.replace(/\*/g, '')}
          </p>
        </div>
        <div data-testid="icon">
          {isActive && (
            <FontAwesomeIcon className="tw-text-h2" icon="check-circle" />
          )}
        </div>
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
