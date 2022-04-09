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

import { AxiosError, AxiosResponse } from 'axios';
import classNames from 'classnames';
import { isUndefined } from 'lodash';
import { EntityThread, Post } from 'Models';
import React, {
  FC,
  Fragment,
  HTMLAttributes,
  RefObject,
  useEffect,
  useState,
} from 'react';
import AppState from '../../../AppState';
import { getAllFeeds, getFeedById } from '../../../axiosAPIs/feedsAPI';
import { observerOptions } from '../../../constants/Mydata.constants';
import { CreateThread } from '../../../generated/api/feed/createThread';
import { Paging } from '../../../generated/type/paging';
import { useInfiniteScroll } from '../../../hooks/useInfiniteScroll';
import useToastContext from '../../../hooks/useToastContext';
import jsonData from '../../../jsons/en';
import {
  getEntityField,
  getFeedListWithRelativeDays,
  getReplyText,
} from '../../../utils/FeedUtils';
import Loader from '../../Loader/Loader';
import ActivityFeedCard, {
  FeedFooter,
} from '../ActivityFeedCard/ActivityFeedCard';
import ActivityFeedEditor from '../ActivityFeedEditor/ActivityFeedEditor';
import { FeedListSeparator } from '../ActivityFeedList/ActivityFeedList';
import {
  FeedPanelHeader,
  FeedPanelOverlay,
} from '../ActivityFeedPanel/ActivityFeedPanel';

interface ActivityThreadPanelProp extends HTMLAttributes<HTMLDivElement> {
  threadLink: string;
  open?: boolean;
  postFeedHandler: (value: string, id: string) => void;
  onCancel: () => void;
  createThread: (data: CreateThread) => void;
}

interface ActivityThreadListProp extends HTMLAttributes<HTMLDivElement> {
  threads: EntityThread[];
  selectedThreadId: string;
  postFeed: (value: string) => void;
  onThreadIdSelect: (value: string) => void;
  onThreadSelect: (value: string) => void;
}
interface ActivityThreadProp extends HTMLAttributes<HTMLDivElement> {
  selectedThread: EntityThread;
  postFeed: (value: string) => void;
}

const ActivityThreadList: FC<ActivityThreadListProp> = ({
  className,
  threads,
  selectedThreadId,
  postFeed,
  onThreadIdSelect,
  onThreadSelect,
}) => {
  const { updatedFeedList: updatedThreads, relativeDays } =
    getFeedListWithRelativeDays(threads);

  return (
    <div className={className}>
      {relativeDays.map((d, i) => {
        return (
          <Fragment key={i}>
            <FeedListSeparator
              className="tw-relative tw-mt-1 tw-mb-3.5"
              relativeDay={d}
            />
            {updatedThreads
              .filter((f) => f.relativeDay === d)
              .map((thread, index) => {
                const mainFeed = {
                  message: thread.message,
                  postTs: thread.threadTs,
                  from: thread.createdBy,
                };
                const postLength = thread.posts.length;
                const replies = thread.postsCount - 1;
                const repliedUsers = thread.posts
                  .map((f) => f.from)
                  .slice(1, 3);
                const lastPost = thread.posts[postLength - 1];

                return (
                  <Fragment key={index}>
                    <ActivityFeedCard
                      isEntityFeed
                      className="tw-mb-6"
                      entityLink={thread.about}
                      feed={mainFeed}
                    />
                    {postLength > 0 ? (
                      <Fragment>
                        {postLength > 1 ? (
                          <div className="tw-mb-6">
                            <div className="tw-ml-9 tw-flex tw-mb-6">
                              <FeedFooter
                                isFooterVisible
                                className="tw--mt-4"
                                lastReplyTimeStamp={lastPost?.postTs}
                                repliedUsers={repliedUsers}
                                replies={replies}
                                threadId={thread.id}
                                onThreadSelect={() => onThreadSelect(thread.id)}
                              />
                            </div>
                          </div>
                        ) : null}
                        <ActivityFeedCard
                          isEntityFeed
                          className="tw-mb-6 tw-ml-9"
                          feed={lastPost}
                        />
                        <p
                          className="link-text tw-text-xs tw-underline tw-ml-9 tw-pl-9 tw--mt-4 tw-mb-6"
                          onClick={() => {
                            onThreadIdSelect(thread.id);
                          }}>
                          Reply
                        </p>
                      </Fragment>
                    ) : (
                      <p
                        className="link-text tw-text-xs tw-underline tw-ml-9 tw--mt-4 tw-mb-6"
                        onClick={() => onThreadSelect(thread.id)}>
                        Reply
                      </p>
                    )}
                    {selectedThreadId === thread.id ? (
                      <ActivityFeedEditor
                        buttonClass="tw-mr-4"
                        className="tw-ml-5 tw-mr-2 tw-mb-6"
                        onSave={postFeed}
                      />
                    ) : null}
                  </Fragment>
                );
              })}
          </Fragment>
        );
      })}
    </div>
  );
};

const ActivityThread: FC<ActivityThreadProp> = ({
  className,
  selectedThread,
  postFeed,
}) => {
  const [threadData, setThreadData] = useState<EntityThread>(selectedThread);
  const repliesLength = threadData?.posts?.length ?? 0;
  const mainThread = {
    message: threadData.message,
    from: threadData.createdBy,
    postTs: threadData.threadTs,
  };

  useEffect(() => {
    getFeedById(selectedThread.id).then((res: AxiosResponse) => {
      setThreadData(res.data);
    });
  }, [selectedThread]);

  return (
    <Fragment>
      <div className={className}>
        {threadData ? (
          <ActivityFeedCard
            isEntityFeed
            className="tw-mb-3"
            feed={mainThread as Post}
          />
        ) : null}
        {repliesLength > 0 ? (
          <Fragment>
            <div className="tw-mb-3 tw-flex">
              <span>{getReplyText(repliesLength, 'reply', 'replies')}</span>
              <span className="tw-flex-auto tw-self-center tw-ml-1.5">
                <hr />
              </span>
            </div>
            {threadData?.posts?.map((reply, key) => (
              <ActivityFeedCard
                isEntityFeed
                className="tw-mb-3"
                feed={reply}
                key={key}
              />
            ))}
          </Fragment>
        ) : null}
        <ActivityFeedEditor
          buttonClass="tw-mr-4"
          className="tw-ml-5 tw-mr-2 tw-my-6"
          onSave={postFeed}
        />
      </div>
    </Fragment>
  );
};

const ActivityThreadPanel: FC<ActivityThreadPanelProp> = ({
  threadLink,
  className,
  onCancel,
  open,
  postFeedHandler,
  createThread,
}) => {
  const showToast = useToastContext();
  const [threads, setThreads] = useState<EntityThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<EntityThread>();
  const [selectedThreadId, setSelectedThreadId] = useState<string>('');
  const [showNewConversation, setShowNewConversation] =
    useState<boolean>(false);

  const [elementRef, isInView] = useInfiniteScroll(observerOptions);

  const [paging, setPaging] = useState<Paging>({} as Paging);

  const [isThreadLoading, setIsThreadLoading] = useState(false);

  const getThreads = (after?: string) => {
    setIsThreadLoading(true);
    getAllFeeds(threadLink, after)
      .then((res: AxiosResponse) => {
        const { data, paging: pagingObj } = res.data;
        setThreads((prevData) => {
          if (after) {
            return [...prevData, ...data];
          } else {
            return [...data];
          }
        });
        setPaging(pagingObj);
      })
      .catch((err: AxiosError) => {
        const message = err.response?.data?.message;
        showToast({
          variant: 'error',
          body: message || jsonData['api-error-messages']['fetch-thread-error'],
        });
      })
      .finally(() => {
        setIsThreadLoading(false);
      });
  };

  const entityField = getEntityField(threadLink);

  const onShowNewConversation = (value: boolean) => {
    setShowNewConversation(value);
  };

  const postFeed = (value: string) => {
    postFeedHandler?.(value, selectedThread?.id ?? selectedThreadId);
    setTimeout(() => {
      getThreads();
    }, 500);
  };

  const onThreadIdSelect = (id: string) => {
    setSelectedThreadId(id);
  };

  const onThreadSelect = (id: string) => {
    const thread = threads.find((f) => f.id === id);
    if (thread) {
      setSelectedThread(thread);
    }
  };

  const onBack = () => {
    setSelectedThread(undefined);
  };

  const onPostThread = (value: string) => {
    const currentUser = AppState.userDetails?.name ?? AppState.users[0]?.name;
    const data = {
      message: value,
      from: currentUser,
      about: threadLink,
    };
    createThread(data);
    setTimeout(() => {
      getThreads();
    }, 500);
  };

  const getLoader = () => {
    return isThreadLoading ? <Loader /> : null;
  };

  const fetchMoreThread = (
    isElementInView: boolean,
    pagingObj: Paging,
    isLoading: boolean
  ) => {
    if (isElementInView && pagingObj?.after && !isLoading) {
      getThreads(pagingObj.after);
    }
  };

  useEffect(() => {
    const escapeKeyHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', escapeKeyHandler);

    return () => {
      document.removeEventListener('keydown', escapeKeyHandler);
    };
  }, []);

  useEffect(() => {
    onThreadSelect(selectedThread?.id as string);
  }, [threads]);

  useEffect(() => {
    getThreads();
  }, [threadLink]);

  useEffect(() => {
    fetchMoreThread(isInView as boolean, paging, isThreadLoading);
  }, [paging, isThreadLoading, isInView]);

  return (
    <div className={classNames('tw-h-full', className)}>
      <FeedPanelOverlay
        className="tw-z-10 tw-fixed tw-inset-0 tw-top-16 tw-h-full tw-w-3/5 tw-bg-black tw-opacity-40"
        onCancel={onCancel}
      />
      <div
        className={classNames(
          'tw-top-16 tw-right-0 tw-bottom-0 tw-w-2/5 tw-bg-white tw-fixed tw-shadow-md tw-transform tw-ease-in-out tw-duration-1000 tw-overflow-y-auto',
          {
            'tw-translate-x-0': open,
            'tw-translate-x-full': !open,
          }
        )}>
        <FeedPanelHeader
          className="tw-px-4 tw-shadow-sm"
          entityField={entityField as string}
          noun="Conversations"
          onCancel={onCancel}
          onShowNewConversation={
            threads.length > 0 && isUndefined(selectedThread)
              ? onShowNewConversation
              : undefined
          }
        />

        {!isUndefined(selectedThread) ? (
          <Fragment>
            <p
              className="tw-py-3 tw-cursor-pointer link-text tw-pl-5"
              onClick={onBack}>
              {'< Back'}
            </p>
            <ActivityThread
              className="tw-pb-6 tw-pl-5"
              postFeed={postFeed}
              selectedThread={selectedThread}
            />
          </Fragment>
        ) : (
          <Fragment>
            {showNewConversation || threads.length === 0 ? (
              <div className="tw-pt-6">
                <p className="tw-ml-9 tw-mr-2 tw-my-2">
                  You are starting a new conversation
                </p>
                <ActivityFeedEditor
                  buttonClass="tw-mr-4"
                  className="tw-ml-5 tw-mr-2"
                  placeHolder="Enter a message"
                  onSave={onPostThread}
                />
              </div>
            ) : null}
            <ActivityThreadList
              className="tw-py-6 tw-pl-5"
              postFeed={postFeed}
              selectedThreadId={selectedThreadId}
              threads={threads}
              onThreadIdSelect={onThreadIdSelect}
              onThreadSelect={onThreadSelect}
            />
            <div
              data-testid="observer-element"
              id="observer-element"
              ref={elementRef as RefObject<HTMLDivElement>}>
              {getLoader()}
            </div>
          </Fragment>
        )}
      </div>
    </div>
  );
};

export default ActivityThreadPanel;
