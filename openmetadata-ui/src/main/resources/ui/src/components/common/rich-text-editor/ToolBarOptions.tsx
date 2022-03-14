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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { EditorState, Modifier, SelectionState } from 'draft-js';
import {
  faLink,
  faListUl,
  faListOl,
  faItalic,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import PopOver from '../popover/PopOver';

const getSelectedText = (editorState: any) => {
  const selection = editorState.getSelection();
  const anchorKey = selection.getAnchorKey();
  const currentContent = editorState.getCurrentContent();
  const currentBlock = currentContent.getBlockForKey(anchorKey);

  const start = selection.getStartOffset();
  const end = selection.getEndOffset();
  const selectedText = currentBlock.getText().slice(start, end);

  return selectedText;
};

const updateEditorSelection = (eState: any, offsetDiff: any) => {
  const selection = eState.getSelection();
  const newFocusOffset = selection.focusOffset + offsetDiff;

  const newSelection = new SelectionState({
    anchorKey: selection.anchorKey,
    anchorOffset: newFocusOffset,
    focusKey: selection.focusKey,
    focusOffset: newFocusOffset,
  });
  const newEditorState = EditorState.forceSelection(eState, newSelection);

  return EditorState.push(newEditorState, newEditorState.getCurrentContent());
};

export class Bold extends Component {
  static propTypes = {
    onChange: PropTypes.func,
    editorState: PropTypes.object,
  };

  makeBold = () => {
    const { editorState, onChange } = this.props as any;
    const selectedText = getSelectedText(editorState);

    const contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      `${
        selectedText.startsWith('**') && selectedText.endsWith('**')
          ? selectedText.replaceAll('**', '')
          : `**${selectedText}**`
      }`,
      editorState.getCurrentInlineStyle()
    );

    const eState = EditorState.push(
      editorState,
      contentState,
      'insert-characters'
    );

    onChange(updateEditorSelection(eState, -2));
  };

  render() {
    return (
      <div
        className="rdw-option-wrapper tw-font-bold"
        data-testid="boldButton"
        onClick={this.makeBold}>
        <PopOver
          arrow={false}
          position="bottom"
          size="small"
          title="Add bold text"
          trigger="mouseenter">
          <p>B</p>
        </PopOver>
      </div>
    );
  }
}

export class Link extends Component {
  static propTypes = {
    onChange: PropTypes.func,
    editorState: PropTypes.object,
  };

  makeLink = () => {
    const { editorState, onChange } = this.props as any;

    const selectedText = getSelectedText(editorState);

    const contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      `${
        selectedText.startsWith('[') && selectedText.endsWith(')')
          ? selectedText.replace(/ *\([^)]*\) */g, '').replace(/[\])}[{(]/g, '')
          : `[${selectedText}](url)`
      }`,
      editorState.getCurrentInlineStyle()
    );
    const eState = EditorState.push(
      editorState,
      contentState,
      'insert-characters'
    );
    onChange(updateEditorSelection(eState, -6));
  };

  render() {
    return (
      <div
        className="rdw-option-wrapper "
        data-testid="linkButton"
        onClick={this.makeLink}>
        <PopOver
          arrow={false}
          position="bottom"
          size="small"
          title="Add link"
          trigger="mouseenter">
          <FontAwesomeIcon icon={faLink} />
        </PopOver>
      </div>
    );
  }
}

export class Italic extends Component {
  static propTypes = {
    onChange: PropTypes.func,
    editorState: PropTypes.object,
  };

  makeItalic = () => {
    const { editorState, onChange } = this.props as any;
    const selectedText = getSelectedText(editorState);

    const contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      `${
        selectedText.startsWith('_') && selectedText.endsWith('_')
          ? selectedText.replaceAll('_', '')
          : `_${selectedText}_`
      }`,
      editorState.getCurrentInlineStyle()
    );
    const eState = EditorState.push(
      editorState,
      contentState,
      'insert-characters'
    );

    onChange(updateEditorSelection(eState, -1));
  };

  render() {
    return (
      <div
        className="rdw-option-wrapper "
        data-testid="italicButton"
        onClick={this.makeItalic}>
        <PopOver
          arrow={false}
          position="bottom"
          size="small"
          title="Add italic text"
          trigger="mouseenter">
          <FontAwesomeIcon icon={faItalic} />
        </PopOver>
      </div>
    );
  }
}
export class Heading extends Component {
  static propTypes = {
    onChange: PropTypes.func,
    editorState: PropTypes.object,
  };

  makeHeading = () => {
    const { editorState, onChange } = this.props as any;
    const selectedText = getSelectedText(editorState);

    const contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      `${
        selectedText.startsWith('### ')
          ? selectedText.replaceAll('### ', '')
          : `### ${selectedText}`
      }`,
      editorState.getCurrentInlineStyle()
    );
    const eState = EditorState.push(
      editorState,
      contentState,
      'insert-characters'
    );
    onChange(updateEditorSelection(eState, 0));
  };

  render() {
    return (
      <div className="rdw-option-wrapper" onClick={this.makeHeading}>
        <PopOver
          position="bottom"
          size="small"
          title="Add header text"
          trigger="mouseenter">
          <p>H</p>
        </PopOver>
      </div>
    );
  }
}

export class ULLIST extends Component {
  static propTypes = {
    onChange: PropTypes.func,
    editorState: PropTypes.object,
  };

  makeLIST = () => {
    const { editorState, onChange } = this.props as any;
    const selectedText = getSelectedText(editorState);
    const selection = editorState.getSelection();
    const text = selectedText.startsWith('- ')
      ? selectedText.replaceAll('- ', '')
      : `${
          selection.anchorOffset > 0 && selectedText.length <= 0
            ? `\n\n- ${selectedText}`
            : `- ${selectedText}`
        }`;
    const contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      editorState.getSelection(),
      text,
      editorState.getCurrentInlineStyle()
    );
    onChange(EditorState.push(editorState, contentState, 'insert-characters'));
  };

  render() {
    return (
      <div className="rdw-option-wrapper " onClick={this.makeLIST}>
        <PopOver
          position="bottom"
          size="small"
          title="Add unordered list"
          trigger="mouseenter">
          <FontAwesomeIcon icon={faListUl} />
        </PopOver>
      </div>
    );
  }
}
export class OLLIST extends Component {
  static propTypes = {
    onChange: PropTypes.func,
    editorState: PropTypes.object,
  };

  makeLIST = () => {
    const { editorState, onChange } = this.props as any;
    const selection = editorState.getSelection();
    const currentKey = selection.getStartKey();
    const currentBlock = editorState
      .getCurrentContent()
      .getBlockForKey(currentKey);
    const textArr = currentBlock.getText().split('\n') || [];
    const lastText = textArr[textArr.length - 1];
    const match = lastText.match(/(\d+)/)?.[0];
    let len = 0;
    for (const txt of textArr) {
      len += txt.length;
      if (len >= selection.focusOffset) {
        break;
      }
      len++;
    }

    const newSelection = new SelectionState({
      anchorKey: selection.anchorKey,
      anchorOffset: textArr.join(',').length,
      focusKey: selection.focusKey,
      focusOffset: textArr.join(',').length,
    });

    const contentState = Modifier.replaceText(
      editorState.getCurrentContent(),
      newSelection,
      `${
        selection.anchorOffset > 0
          ? `\n${match ? parseInt(match) + 1 : 1}. `
          : `${match ? parseInt(match) + 1 : 1}. `
      }`,
      editorState.getCurrentInlineStyle()
    );

    onChange(EditorState.push(editorState, contentState, 'insert-characters'));
  };

  render() {
    return (
      <div className="rdw-option-wrapper " onClick={this.makeLIST}>
        <PopOver
          position="bottom"
          size="small"
          title="Add unordered list"
          trigger="mouseenter">
          <FontAwesomeIcon icon={faListOl} />
        </PopOver>
      </div>
    );
  }
}

export class Info extends Component {
  static propTypes = {
    onChange: PropTypes.func,
    editorState: PropTypes.object,
  };

  render() {
    return (
      <div className="rdw-option-wrapper tw-order-5 tw-font-bold tw-ml-auto">
        <PopOver
          arrow={false}
          html={
            <div className="tw-flex tw-pb-1 tw-text-white tw-text-left">
              <div>
                <p className="tw-pt-2">
                  Using headings in markdown is not allowed.
                </p>
                <p className="tw-pt-2">
                  Use{' '}
                  <span className=" tw-py-0.5 tw-px-1 tw-ml-1 tw-border tw-rounded tw-text-xs">{`<br/>`}</span>{' '}
                  tag to add empty lines.
                </p>
              </div>
            </div>
          }
          position="left"
          size="small"
          trigger="mouseenter">
          <FontAwesomeIcon icon={faInfoCircle} />
        </PopOver>
      </div>
    );
  }
}
