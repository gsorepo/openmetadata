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

import { Button } from 'antd';
import classNames from 'classnames';
import { Change } from 'diff';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import TaskDescriptionPreviewer from '../../../components/common/RichTextEditor/TaskDescriptionPreviewer';
import {
  Thread,
  ThreadTaskStatus,
} from '../../../generated/entity/feed/thread';

export const DiffViewNew = ({
  diffArr,
  showDescTitle = false,
  task,
}: {
  diffArr: Change[];
  className?: string;
  showDescTitle?: boolean;
  task?: Thread;
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [shouldShowViewMore, setShouldShowViewMore] = useState<boolean>(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHeight = () => {
      if (contentRef.current) {
        const lineHeight = parseInt(
          window.getComputedStyle(contentRef.current).lineHeight,
          10
        );
        const twoLinesHeight = lineHeight * 2;

        // Get the actual content height without restrictions
        const clone = contentRef.current.cloneNode(true) as HTMLElement;
        clone.style.maxHeight = 'none';
        clone.style.position = 'absolute';
        clone.style.visibility = 'hidden';
        document.body.appendChild(clone);
        const fullHeight = clone.scrollHeight;
        document.body.removeChild(clone);

        // Compare the full height with two lines height
        setShouldShowViewMore(fullHeight > twoLinesHeight);
      }
    };

    // Small delay to ensure content is rendered
    const timer = setTimeout(checkHeight, 100);

    return () => clearTimeout(timer);
  }, [diffArr]);

  const getDiffKey = (diff: Change) => {
    if (diff.added) {
      return `diff-${diff.value}-${diff.removed}-${diff.added}-added`;
    }
    if (diff.removed) {
      return `diff-${diff.value}-${diff.removed}-${diff.added}-removed`;
    }

    return `diff-${diff.value}-${diff.removed}-${diff.added}-normal`;
  };

  const elements = useMemo(
    () =>
      diffArr.map((diff) => {
        const key = getDiffKey(diff);

        if (diff.added) {
          return (
            <ins className="diff-added-new" data-testid="diff-added" key={key}>
              <TaskDescriptionPreviewer
                enableSeeMoreVariant={false}
                markdown={diff.value}
                showReadMoreBtn={false}
              />
            </ins>
          );
        }
        if (diff.removed) {
          return (
            <del
              className="diff-removed-new"
              data-testid="diff-removed-new"
              key={key}>
              <TaskDescriptionPreviewer
                enableSeeMoreVariant={false}
                markdown={diff.value}
                showReadMoreBtn={false}
              />
            </del>
          );
        }

        return (
          <span
            className="diff-normal-new"
            data-testid="diff-normal-new"
            key={key}>
            <TaskDescriptionPreviewer
              enableSeeMoreVariant={false}
              markdown={diff.value}
              showReadMoreBtn={false}
            />
          </span>
        );
      }),
    [diffArr]
  );

  const getContentClassName = () => {
    if (expanded) {
      return '';
    }

    return showDescTitle
      ? 'clamp-text-3 overflow-hidden'
      : 'clamp-text-2 overflow-hidden';
  };

  return (
    <div
      className={classNames('w-full overflow-y-auto p-md border-radius-xs', {
        'diff-view-container-card': !showDescTitle,
        'diff-view-container-card-right-panel': showDescTitle,
      })}
      style={{
        ...(showDescTitle
          ? {
              background: 'rgba(239, 244, 250, 0.25)',
              borderRadius: '12px',
            }
          : {
              padding: '20px',
              borderRadius: '8px',
              background: 'white',
              margin: '16px 0px',
            }),
        ...(task?.task?.status === ThreadTaskStatus.Closed &&
          !showDescTitle && {
            margin: '16px 0px',
          }),
        ...(task?.task?.status === ThreadTaskStatus.Open && {
          borderRadius: '8px',
        }),
      }}>
      {showDescTitle && (
        <span className="task-tab-description-header">
          {t('label.description')}
        </span>
      )}
      <pre
        className="whitespace-pre-wrap m-b-0"
        data-testid="diff-container"
        style={showDescTitle ? { marginTop: '14px' } : {}}>
        {diffArr.length ? (
          <>
            <div
              className={classNames('relative', getContentClassName())}
              ref={contentRef}>
              {elements}
            </div>
            {shouldShowViewMore && (
              <div className="mt-2">
                <Button
                  className="view-more-less-button cursor-pointer remove-button-default-styling"
                  data-testid="view-more-button"
                  onClick={() => setExpanded(!expanded)}>
                  {expanded ? t('label.view-less') : t('label.view-more')}
                </Button>
              </div>
            )}
          </>
        ) : (
          <span className="text-grey-muted" data-testid="noDiff-placeholder">
            {t('label.no-diff-available')}
          </span>
        )}
      </pre>
    </div>
  );
};
