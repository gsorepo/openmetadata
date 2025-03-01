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
import { Dropdown, Segmented } from 'antd';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import {
  default as React,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useHistory, useParams } from 'react-router-dom';
import { ReactComponent as TaskCloseIcon } from '../../../assets/svg/ic-check-circle-new.svg';
import { ReactComponent as TaskCloseIconBlue } from '../../../assets/svg/ic-close-task.svg';
import { ReactComponent as MentionIcon } from '../../../assets/svg/ic-mention.svg';
import { ReactComponent as TaskOpenIcon } from '../../../assets/svg/ic-open-task.svg';
import { ReactComponent as TaskFilterIcon } from '../../../assets/svg/ic-task-filter-button.svg';
import { ReactComponent as TaskIcon } from '../../../assets/svg/ic-task-new.svg';
import { ReactComponent as MyTaskIcon } from '../../../assets/svg/task.svg';

import { ICON_DIMENSION_USER_PAGE, ROUTES } from '../../../constants/constants';
import { FEED_COUNT_INITIAL_DATA } from '../../../constants/entity.constants';
import { observerOptions } from '../../../constants/Mydata.constants';
import { EntityTabs, EntityType } from '../../../enums/entity.enum';
import { FeedFilter } from '../../../enums/mydata.enum';
import {
  Thread,
  ThreadTaskStatus,
  ThreadType,
} from '../../../generated/entity/feed/thread';
import { useAuth } from '../../../hooks/authHooks';
import { useApplicationStore } from '../../../hooks/useApplicationStore';
import { useElementInView } from '../../../hooks/useElementInView';
import { useFqn } from '../../../hooks/useFqn';
import { FeedCounts } from '../../../interface/feed.interface';
import { getFeedCount } from '../../../rest/feedsAPI';
import { getFeedCounts, Transi18next } from '../../../utils/CommonUtils';
import entityUtilClassBase from '../../../utils/EntityUtilClassBase';
import {
  ENTITY_LINK_SEPARATOR,
  getEntityUserLink,
} from '../../../utils/EntityUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import Loader from '../../common/Loader/Loader';
import { TaskTabNew } from '../../Entity/Task/TaskTab/TaskTabNew.component';
import '../../MyData/Widgets/FeedsWidget/feeds-widget.less';
import ActivityFeedListV1New from '../ActivityFeedList/ActivityFeedListV1New.component';
import FeedPanelBodyV1New from '../ActivityFeedPanel/FeedPanelBodyV1New';
import { useActivityFeedProvider } from '../ActivityFeedProvider/ActivityFeedProvider';
import './activity-feed-tab.less';
import {
  ActivityFeedTabProps,
  ActivityFeedTabs,
} from './ActivityFeedTab.interface';

const componentsVisibility = {
  showThreadIcon: false,
  showRepliesContainer: true,
};

export const ActivityFeedTabNew = ({
  owners = [],
  columns,
  entityType,
  refetchFeed,
  hasGlossaryReviewer,
  entityFeedTotalCount,
  isForFeedTab = true,
  onUpdateFeedCount,
  onUpdateEntityDetails,
  subTab,
}: ActivityFeedTabProps) => {
  const history = useHistory();
  const { t } = useTranslation();
  const { currentUser } = useApplicationStore();
  const { isAdminUser } = useAuth();
  const initialRender = useRef(true);
  const { fqn } = useFqn();
  const [elementRef, isInView] = useElementInView({
    ...observerOptions,
    root: document.querySelector('#center-container'),
    rootMargin: '0px 0px 2px 0px',
  });
  const { tab = EntityTabs.ACTIVITY_FEED, subTab: activeTab = subTab } =
    useParams<{ tab: EntityTabs; subTab: ActivityFeedTabs }>();
  const [taskFilter, setTaskFilter] = useState<ThreadTaskStatus>(
    ThreadTaskStatus.Open
  );
  const [isFullWidth, setIsFullWidth] = useState<boolean>(false);
  const [countData, setCountData] = useState<{
    loading: boolean;
    data: FeedCounts;
  }>({
    loading: false,
    data: FEED_COUNT_INITIAL_DATA,
  });

  const {
    selectedThread,
    setActiveThread,
    entityThread,
    getFeedData,
    loading,
    entityPaging,
  } = useActivityFeedProvider();

  const isUserEntity = useMemo(
    () => entityType === EntityType.USER,
    [entityType]
  );

  const entityTypeTask = useMemo(
    () =>
      selectedThread?.about?.split(ENTITY_LINK_SEPARATOR)?.[1] as Exclude<
        EntityType,
        EntityType.TABLE
      >,
    [selectedThread]
  );

  const isTaskActiveTab = useMemo(
    () => activeTab === ActivityFeedTabs.TASKS,
    [activeTab]
  );
  useEffect(() => {
    setIsFullWidth(false);
  }, [isTaskActiveTab]);
  const isMentionTabSelected = useMemo(
    () => activeTab === ActivityFeedTabs.MENTIONS,
    [activeTab]
  );

  const handleTabChange = (subTab: string) => {
    history.push(
      entityUtilClassBase.getEntityLink(
        entityType,
        fqn,
        EntityTabs.ACTIVITY_FEED,
        subTab
      )
    );
    setActiveThread();
  };

  const placeholderText = useMemo(() => {
    if (activeTab === ActivityFeedTabs.ALL) {
      return (
        <Transi18next
          i18nKey="message.no-activity-feed"
          renderElement={<Link to={ROUTES.EXPLORE} />}
          values={{
            explored: t('message.have-not-explored-yet'),
          }}
        />
      );
    } else if (activeTab === ActivityFeedTabs.MENTIONS) {
      return t('message.no-mentions');
    } else {
      return t('message.no-open-tasks');
    }
  }, [activeTab]);

  const handleFeedCount = useCallback(
    (data: FeedCounts) => {
      setCountData((prev) => ({ ...prev, data }));
      onUpdateFeedCount?.(data);
    },
    [setCountData]
  );

  const fetchFeedsCount = async () => {
    setCountData((prev) => ({ ...prev, loading: true }));
    if (isUserEntity) {
      try {
        const res = await getFeedCount(getEntityUserLink(fqn));
        setCountData((prev) => ({
          ...prev,
          data: {
            conversationCount: res[0].conversationCount ?? 0,
            totalTasksCount: res[0].totalTaskCount,
            openTaskCount: res[0].openTaskCount ?? 0,
            closedTaskCount: res[0].closedTaskCount ?? 0,
            totalCount: res[0].conversationCount ?? 0 + res[0].totalTaskCount,
            mentionCount: res[0].mentionCount ?? 0,
          },
        }));
      } catch (err) {
        showErrorToast(err as AxiosError, t('server.entity-feed-fetch-error'));
      }
    } else {
      await getFeedCounts(entityType, fqn, handleFeedCount);
    }
    setCountData((prev) => ({ ...prev, loading: false }));
  };

  const getThreadType = useCallback((activeTab) => {
    if (activeTab === ActivityFeedTabs.TASKS) {
      return ThreadType.Task;
    } else if (activeTab === ActivityFeedTabs.ALL) {
      return ThreadType.Conversation;
    } else {
      return;
    }
  }, []);

  const isActivityFeedTab = useMemo(
    () => tab === EntityTabs.ACTIVITY_FEED,
    [tab]
  );

  useEffect(() => {
    fetchFeedsCount();
  }, []);

  const { feedFilter, threadType } = useMemo(() => {
    const currentFilter =
      isAdminUser &&
      currentUser?.name === fqn &&
      activeTab !== ActivityFeedTabs.TASKS
        ? FeedFilter.ALL
        : FeedFilter.OWNER_OR_FOLLOWS;
    const filter = isUserEntity ? currentFilter : undefined;

    return {
      threadType: getThreadType(activeTab),
      feedFilter: activeTab === 'mentions' ? FeedFilter.MENTIONS : filter,
    };
  }, [activeTab, isUserEntity, currentUser]);

  const handleFeedFetchFromFeedList = useCallback(
    (after?: string) => {
      getFeedData(feedFilter, after, threadType, entityType, fqn, taskFilter);
    },
    [threadType, feedFilter, entityType, fqn, taskFilter, getFeedData]
  );

  const refetchFeedData = useCallback(() => {
    if (
      entityFeedTotalCount !== countData.data.totalCount &&
      isActivityFeedTab &&
      refetchFeed
    ) {
      getFeedData(
        feedFilter,
        undefined,
        threadType,
        entityType,
        fqn,
        taskFilter
      );
    }
  }, [
    fqn,
    taskFilter,
    feedFilter,
    threadType,
    entityType,
    refetchFeed,
    countData.data.totalCount,
    entityFeedTotalCount,
    isActivityFeedTab,
  ]);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;

      return;
    }
    refetchFeedData();
  }, [refetchFeedData]);

  useEffect(() => {
    if (fqn) {
      getFeedData(
        feedFilter,
        undefined,
        threadType,
        entityType,
        fqn,
        taskFilter
      );
    }
  }, [feedFilter, threadType, fqn]);

  const handleFeedClick = useCallback(
    (feed: Thread) => {
      setActiveThread(feed);
    },
    [setActiveThread]
  );

  useEffect(() => {
    if (fqn && isInView && entityPaging.after && !loading) {
      handleFeedFetchFromFeedList(entityPaging.after);
    }
  }, [entityPaging, loading, isInView, fqn]);

  const loader = useMemo(() => (loading ? <Loader /> : null), [loading]);

  const handleUpdateTaskFilter = (filter: ThreadTaskStatus) => {
    setTaskFilter(filter);
    getFeedData(feedFilter, undefined, threadType, entityType, fqn, filter);
  };

  const handleAfterTaskClose = () => {
    handleFeedFetchFromFeedList();
    handleUpdateTaskFilter(ThreadTaskStatus.Closed);
    fetchFeedsCount();
  };
  const taskFilterOptions = useMemo(
    () => [
      {
        key: ThreadTaskStatus.Open,
        label: (
          <div
            className={classNames(
              'flex items-center justify-between px-4 py-2 gap-2',
              { active: taskFilter === ThreadTaskStatus.Open }
            )}>
            <div className="flex items-center space-x-2">
              {taskFilter === ThreadTaskStatus.Open ? (
                <TaskOpenIcon
                  className="m-r-xs"
                  {...ICON_DIMENSION_USER_PAGE}
                />
              ) : (
                <TaskIcon className="m-r-xs" {...ICON_DIMENSION_USER_PAGE} />
              )}
              <span
                className={classNames('task-tab-filter-item', {
                  selected: taskFilter === ThreadTaskStatus.Open,
                })}>
                {t('label.open')}
              </span>
            </div>
            <span
              className={classNames('task-count-container d-flex flex-center', {
                active: taskFilter === ThreadTaskStatus.Open,
              })}>
              <span className="task-count-text">
                {countData.data.openTaskCount}
              </span>
            </span>
          </div>
        ),
        onClick: () => {
          handleUpdateTaskFilter(ThreadTaskStatus.Open);
          setActiveThread();
        },
      },
      {
        key: ThreadTaskStatus.Closed,
        label: (
          <div
            className={classNames(
              'flex items-center justify-between px-4 py-2 gap-2',
              { active: taskFilter === ThreadTaskStatus.Closed }
            )}>
            <div className="flex items-center space-x-2">
              {taskFilter === ThreadTaskStatus.Closed ? (
                <TaskCloseIconBlue
                  className="m-r-xs"
                  {...ICON_DIMENSION_USER_PAGE}
                />
              ) : (
                <TaskCloseIcon
                  className="m-r-xs"
                  {...ICON_DIMENSION_USER_PAGE}
                />
              )}
              <span
                className={classNames('task-tab-filter-item', {
                  selected: taskFilter === ThreadTaskStatus.Closed,
                })}>
                {t('label.closed')}
              </span>
            </div>
            <span
              className={classNames('task-count-container d-flex flex-center', {
                active: taskFilter === ThreadTaskStatus.Closed,
              })}>
              <span className="task-count-text">
                {countData.data.closedTaskCount}
              </span>
            </span>
          </div>
        ),
        onClick: () => {
          handleUpdateTaskFilter(ThreadTaskStatus.Closed);
          setActiveThread();
        },
      },
    ],
    [taskFilter, countData.data, handleUpdateTaskFilter, setActiveThread, t]
  );

  const TaskToggle = useCallback(() => {
    return (
      <Segmented
        className="task-toggle"
        defaultValue={ActivityFeedTabs.TASKS}
        options={[
          {
            label: (
              <span className="toggle-item">
                <MyTaskIcon {...ICON_DIMENSION_USER_PAGE} />
                {t('label.my-task-plural')}
              </span>
            ),
            value: ActivityFeedTabs.TASKS,
          },
          {
            label: (
              <span className="toggle-item">
                <MentionIcon {...ICON_DIMENSION_USER_PAGE} />
                {t('label.mention-plural')}
              </span>
            ),
            value: ActivityFeedTabs.MENTIONS,
          },
        ]}
        onChange={(value) => handleTabChange(value as ActivityFeedTabs)}
      />
    );
  }, [t, handleTabChange]);

  const handlePanelResize = () => {
    setIsFullWidth(true);
  };

  return (
    <div className="activity-feed-tab">
      <div
        className={`center-container ${isFullWidth ? 'full-width' : ''}`}
        id="center-container">
        {(isTaskActiveTab || isMentionTabSelected) && (
          <div
            className="d-flex gap-4  p-b-xs justify-between items-center"
            style={{ marginTop: '6px' }}>
            <Dropdown
              menu={{
                items: taskFilterOptions,
                selectedKeys: [...taskFilter],
              }}
              overlayClassName="task-tab-custom-dropdown"
              trigger={['click']}>
              <TaskFilterIcon className="cursor-pointer task-filter-icon" />
            </Dropdown>
            {TaskToggle()}
          </div>
        )}
        <ActivityFeedListV1New
          hidePopover
          activeFeedId={selectedThread?.id}
          componentsVisibility={componentsVisibility}
          emptyPlaceholderText={placeholderText}
          feedList={entityThread}
          isForFeedTab={isForFeedTab}
          isLoading={false}
          selectedThread={selectedThread}
          showThread={false}
          onAfterClose={handleAfterTaskClose}
          onFeedClick={handleFeedClick}
        />
        {loader}
        <div
          className="w-full"
          data-testid="observer-element"
          id="observer-element"
          ref={elementRef as RefObject<HTMLDivElement>}
          style={{ height: '2px' }}
        />
      </div>

      <div className="right-container">
        {loader}
        {selectedThread &&
          !loading &&
          (activeTab !== ActivityFeedTabs.TASKS ? (
            <div id="feed-panel">
              <div>
                <FeedPanelBodyV1New
                  isOpenInDrawer
                  showActivityFeedEditor
                  showThread
                  componentsVisibility={{
                    showThreadIcon: true,
                    showRepliesContainer: true,
                  }}
                  feed={selectedThread}
                  handlePanelResize={handlePanelResize}
                  hidePopover={false}
                  isForFeedTab={isForFeedTab}
                  onAfterClose={handleAfterTaskClose}
                  onUpdateEntityDetails={onUpdateEntityDetails}
                />
              </div>
            </div>
          ) : (
            <div id="task-panel">
              {entityType === EntityType.TABLE ? (
                <TaskTabNew
                  columns={columns}
                  entityType={EntityType.TABLE}
                  handlePanelResize={handlePanelResize}
                  isForFeedTab={isForFeedTab}
                  owners={owners}
                  taskThread={selectedThread}
                  onAfterClose={handleAfterTaskClose}
                  onUpdateEntityDetails={onUpdateEntityDetails}
                />
              ) : (
                <TaskTabNew
                  entityType={isUserEntity ? entityTypeTask : entityType}
                  handlePanelResize={handlePanelResize}
                  hasGlossaryReviewer={hasGlossaryReviewer}
                  isForFeedTab={isForFeedTab}
                  owners={owners}
                  taskThread={selectedThread}
                  onAfterClose={handleAfterTaskClose}
                  onUpdateEntityDetails={onUpdateEntityDetails}
                />
              )}
            </div>
          ))}
      </div>
    </div>
  );
};
