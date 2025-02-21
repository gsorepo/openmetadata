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
import { Tooltip, Typography } from 'antd';
import classNames from 'classnames';
import { compare } from 'fast-json-patch';
import React, { useCallback, useMemo, useState } from 'react';
import { Thread } from '../../../generated/entity/feed/thread';
import {
  formatDateTime,
  getRelativeTime,
} from '../../../utils/date-time/DateTimeUtils';
import {
  getFrontEndFormat,
  MarkdownToHTMLConverter,
} from '../../../utils/FeedUtils';
import ProfilePicture from '../../common/ProfilePicture/ProfilePicture';
import RichTextEditorPreviewerV1 from '../../common/RichTextEditor/RichTextEditorPreviewerV1';
import FeedCardFooterNew from '../ActivityFeedCardV2/FeedCardFooter/FeedCardFooterNew';
import ActivityFeedEditor from '../ActivityFeedEditor/ActivityFeedEditorNew';
import { useActivityFeedProvider } from '../ActivityFeedProvider/ActivityFeedProvider';
import ActivityFeedActions from '../Shared/ActivityFeedActions';

interface CommentCardInterface {
  feed: Thread;
  post: any;
  isLastReply: boolean;
}

const CommentCard = ({ feed, post, isLastReply }: CommentCardInterface) => {
  const { updateFeed } = useActivityFeedProvider();
  const [isHovered, setIsHovered] = useState(false);
  const [isEditPost, setIsEditPost] = useState<boolean>(false);
  const [postMessage, setPostMessage] = useState<string>('');
  const seperator = '.';

  const onEditPost = () => {
    setIsEditPost(!isEditPost);
  };

  const onUpdate = async (message: string) => {
    const updatedPost = { ...feed, message };
    const patch = compare(feed, updatedPost);
    updateFeed(feed.id, post.id, false, patch);
    setIsEditPost(!isEditPost);
  };

  const handleSave = useCallback(() => {
    onUpdate?.(postMessage ?? '');
  }, [onUpdate, postMessage]);

  const defaultValue = useMemo(
    () => MarkdownToHTMLConverter.makeHtml(getFrontEndFormat(post.message)),
    [post.message]
  );

  const feedBodyRender = useMemo(() => {
    if (isEditPost) {
      return (
        <ActivityFeedEditor
          focused
          className="mb-8 reply-feed-editor"
          defaultValue={defaultValue}
          editorClass="is_edit_post"
          onSave={handleSave}
          onTextChange={(message) => setPostMessage(message)}
        />
      );
    }

    return (
      <RichTextEditorPreviewerV1
        className="text-wrap"
        markdown={getFrontEndFormat(post.message)}
      />
    );
  }, [isEditPost, postMessage, handleSave]);

  return (
    <div
      className={classNames('d-flex justify-start relative reply-card', {
        'reply-card-border-bottom': !isLastReply,
      })}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}>
      <div className="profile-picture m-r-xs">
        <ProfilePicture
          avatarType="outlined"
          key={feed.id}
          name={feed.updatedBy!}
          size={32}
        />
      </div>
      <div>
        <div className="d-flex items-center gap-2 flex-wrap">
          <Typography.Text className="activity-feed-user-name reply-card-user-name">
            {feed.updatedBy}
          </Typography.Text>
          <Typography.Text className="seperator">{seperator}</Typography.Text>
          <Typography.Text>
            <Tooltip
              color="white"
              overlayClassName="timestamp-tooltip"
              title={formatDateTime(post.postTs)}>
              <Typography.Text
                className="feed-card-header-v2-timestamp mr-2"
                data-testid="timestamp">
                {getRelativeTime(post.postTs)}
              </Typography.Text>
            </Tooltip>
          </Typography.Text>
        </div>
        {feedBodyRender}

        <FeedCardFooterNew isPost feed={feed} post={post} />
      </div>

      {isHovered && (
        <ActivityFeedActions
          isPost
          feed={feed}
          post={post}
          onEditPost={onEditPost}
        />
      )}
    </div>
  );
};

export default CommentCard;
