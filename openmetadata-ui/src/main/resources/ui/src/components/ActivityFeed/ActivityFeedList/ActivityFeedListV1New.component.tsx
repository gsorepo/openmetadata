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
import { Typography } from 'antd';
import { isEmpty } from 'lodash';
import React, { ReactNode, useEffect, useMemo, useState } from 'react';
import { ReactComponent as FeedEmptyIcon } from '../../../assets/svg/activity-feed-no-data-placeholder.svg';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import { ERROR_PLACEHOLDER_TYPE, SIZE } from '../../../enums/common.enum';
import { Thread } from '../../../generated/entity/feed/thread';
import { getFeedListWithRelativeDays } from '../../../utils/FeedUtils';
import Loader from '../../common/Loader/Loader';
import FeedPanelBodyV1New from '../ActivityFeedPanel/FeedPanelBodyV1New';

interface ActivityFeedListV1Props {
  feedList: Thread[];
  isLoading: boolean;
  showThread?: boolean;
  onFeedClick?: (feed: Thread) => void;
  activeFeedId?: string;
  hidePopover: boolean;
  isForFeedTab?: boolean;
  emptyPlaceholderText: ReactNode;
  componentsVisibility?: {
    showThreadIcon?: boolean;
    showRepliesContainer?: boolean;
  };
  selectedThread?: Thread;
  onAfterClose?: () => void;
  onUpdateEntityDetails?: () => void;
}

const ActivityFeedListV1New = ({
  feedList,
  isLoading,
  showThread = true,
  componentsVisibility = {
    showThreadIcon: true,
    showRepliesContainer: true,
  },
  onFeedClick,
  activeFeedId,
  hidePopover = false,
  isForFeedTab = false,
  emptyPlaceholderText,
  selectedThread,
  onAfterClose,
  onUpdateEntityDetails,
}: ActivityFeedListV1Props) => {
  const [entityThread, setEntityThread] = useState<Thread[]>([]);

  useEffect(() => {
    const { updatedFeedList } = getFeedListWithRelativeDays(feedList);
    setEntityThread(updatedFeedList);
  }, [feedList]);

  useEffect(() => {
    if (onFeedClick) {
      onFeedClick(
        entityThread.find((feed) => feed.id === selectedThread?.id) ??
          entityThread[0]
      );
    }
  }, [entityThread, selectedThread, onFeedClick]);

  const feeds = useMemo(
    () =>
      entityThread.map((feed) => (
        <FeedPanelBodyV1New
          feed={feed}
          hidePopover={hidePopover}
          isActive={activeFeedId === feed.id}
          isForFeedTab={isForFeedTab}
          key={feed.id}
          showThread={showThread}
          onAfterClose={onAfterClose}
          onFeedClick={onFeedClick}
          onUpdateEntityDetails={onUpdateEntityDetails}
        />
      )),
    [
      entityThread,
      activeFeedId,
      componentsVisibility,
      hidePopover,
      isForFeedTab,
      showThread,
    ]
  );

  if (isLoading) {
    return <Loader />;
  }

  if (isEmpty(entityThread)) {
    return (
      <div
        className="h-full p-x-md"
        data-testid="no-data-placeholder-container"
        id="feedData">
        <ErrorPlaceHolder
          icon={<FeedEmptyIcon height={SIZE.X_SMALL} width={SIZE.X_SMALL} />}
          type={ERROR_PLACEHOLDER_TYPE.CUSTOM}>
          <Typography.Paragraph
            className="tw-max-w-md"
            style={{ marginBottom: '0' }}>
            {emptyPlaceholderText}
          </Typography.Paragraph>
        </ErrorPlaceHolder>
      </div>
    );
  }

  return <>{feeds}</>;
};

export default ActivityFeedListV1New;
