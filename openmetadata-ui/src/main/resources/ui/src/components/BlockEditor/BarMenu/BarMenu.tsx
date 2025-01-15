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
import classNames from 'classnames';
import { uniqueId } from 'lodash';
import React, { FC, Fragment } from 'react';
import BlockQuoteIcon from '../../../assets/svg/ic-format-block-quote.svg';
import BoldIcon from '../../../assets/svg/ic-format-bold.svg';
import UnorderedListIcon from '../../../assets/svg/ic-format-bullet-list.svg';
import CodeBlockIcon from '../../../assets/svg/ic-format-code-block.svg';
import HorizontalLineIcon from '../../../assets/svg/ic-format-horizontal-line.svg';
import ImageIcon from '../../../assets/svg/ic-format-image-inline.svg';
import InlineCodeIcon from '../../../assets/svg/ic-format-inline-code.svg';
import ItalicIcon from '../../../assets/svg/ic-format-italic.svg';
import LinkIcon from '../../../assets/svg/ic-format-link.svg';
import OrderedListIcon from '../../../assets/svg/ic-format-numbered-list.svg';
import StrikeIcon from '../../../assets/svg/ic-format-strike.svg';
import { BarMenuProps } from '../BlockEditor.interface';
import './bar-menu.less';

const BarMenu: FC<BarMenuProps> = ({ editor, onLinkToggle }) => {
  const formats = [
    [
      {
        name: 'bold',
        icon: BoldIcon,
        command: () => editor.chain().focus().toggleBold().run(),
        isActive: () => editor.isActive('bold'),
      },
      {
        name: 'italic',
        icon: ItalicIcon,
        command: () => editor.chain().focus().toggleItalic().run(),
        isActive: () => editor.isActive('italic'),
      },
      {
        name: 'strike',
        icon: StrikeIcon,
        command: () => editor.chain().focus().toggleStrike().run(),
        isActive: () => editor.isActive('strike'),
      },
    ],
    [
      {
        name: 'inline-code',
        icon: InlineCodeIcon,
        command: () => editor.chain().focus().toggleCode().run(),
        isActive: () => editor.isActive('code'),
      },
    ],
    [
      {
        name: 'unordered-list',
        icon: UnorderedListIcon,
        command: () => editor.chain().focus().toggleBulletList().run(),
        isActive: () => editor.isActive('bulletList'),
      },
      {
        name: 'ordered-list',
        icon: OrderedListIcon,
        command: () => editor.chain().focus().toggleOrderedList().run(),
        isActive: () => editor.isActive('orderedList'),
      },
    ],
    [
      {
        name: 'link',
        icon: LinkIcon,
        command: () => {
          editor.chain().focus().setLink({ href: '' }).run();
          onLinkToggle?.();
        },
        isActive: () => editor.isActive('link'),
      },
      {
        name: 'image',
        icon: ImageIcon,
        command: () => editor.chain().focus().setImage({ src: '' }).run(),
        isActive: () => editor.isActive('image'),
      },
      {
        name: 'code-block',
        icon: CodeBlockIcon,
        command: () => editor.chain().focus().toggleCodeBlock().run(),
        isActive: () => editor.isActive('codeBlock'),
      },
      {
        name: 'block-quote',
        icon: BlockQuoteIcon,
        command: () => editor.chain().focus().toggleBlockquote().run(),
        isActive: () => editor.isActive('blockquote'),
      },
      {
        name: 'horizontal-line',
        icon: HorizontalLineIcon,
        command: () => editor.chain().focus().setHorizontalRule().run(),
        isActive: () => false,
      },
    ],
  ];

  return (
    <div className="bar-menu-wrapper">
      {formats.map((format, index) => {
        return (
          <Fragment key={`format-group-${uniqueId()}`}>
            <div className="bar-menu-wrapper--format-group">
              {format.map((item) => {
                return (
                  <button
                    className={classNames(
                      'bar-menu-wrapper--format-group--button',
                      { active: item.isActive() }
                    )}
                    key={item.name}
                    title={item.name}
                    onClick={item.command}>
                    <img
                      alt={item.name}
                      className="bar-menu-wrapper--format--button--icon"
                      src={item.icon}
                    />
                  </button>
                );
              })}
            </div>
            {index !== formats.length - 1 && (
              <div className="bar-menu-wrapper--format-group--separator" />
            )}
          </Fragment>
        );
      })}
    </div>
  );
};

export default BarMenu;
