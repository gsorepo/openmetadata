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
import { compare } from 'fast-json-patch';
import { observer } from 'mobx-react';
import {
  EntityFieldThreadCount,
  EntityTags,
  EntityThread,
  TableDetail,
} from 'Models';
import React, { FunctionComponent, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import AppState from '../../AppState';
import {
  getAllFeeds,
  getFeedCount,
  postFeedById,
  postThread,
} from '../../axiosAPIs/feedsAPI';
import {
  addFollower,
  getTopicByFqn,
  patchTopicDetails,
  removeFollower,
} from '../../axiosAPIs/topicsAPI';
import ErrorPlaceHolder from '../../components/common/error-with-placeholder/ErrorPlaceHolder';
import { TitleBreadcrumbProps } from '../../components/common/title-breadcrumb/title-breadcrumb.interface';
import Loader from '../../components/Loader/Loader';
import TopicDetails from '../../components/TopicDetails/TopicDetails.component';
import {
  getServiceDetailsPath,
  getTopicDetailsPath,
  getVersionPath,
} from '../../constants/constants';
import { EntityType, TabSpecificField } from '../../enums/entity.enum';
import { ServiceCategory } from '../../enums/service.enum';
import { CreateThread } from '../../generated/api/feed/createThread';
import { Topic } from '../../generated/entity/data/topic';
import { User } from '../../generated/entity/teams/user';
import { TagLabel } from '../../generated/type/tagLabel';
import useToastContext from '../../hooks/useToastContext';
import jsonData from '../../jsons/en';
import {
  addToRecentViewed,
  getCurrentUserId,
  getEntityMissingError,
} from '../../utils/CommonUtils';
import { getEntityFeedLink } from '../../utils/EntityUtils';
import { deletePost, getUpdatedThread } from '../../utils/FeedUtils';
import { serviceTypeLogo } from '../../utils/ServiceUtils';
import { getTagsWithoutTier, getTierTags } from '../../utils/TableUtils';
import {
  getCurrentTopicTab,
  topicDetailsTabs,
} from '../../utils/TopicDetailsUtils';

const TopicDetailsPage: FunctionComponent = () => {
  const USERId = getCurrentUserId();
  const showToast = useToastContext();
  const history = useHistory();

  const { topicFQN, tab } = useParams() as Record<string, string>;
  const [topicDetails, setTopicDetails] = useState<Topic>({} as Topic);
  const [topicId, setTopicId] = useState<string>('');
  const [isLoading, setLoading] = useState<boolean>(true);
  const [description, setDescription] = useState<string>('');
  const [followers, setFollowers] = useState<Array<User>>([]);
  const [owner, setOwner] = useState<TableDetail['owner']>();
  const [tier, setTier] = useState<TagLabel>();
  const [schemaType, setSchemaType] = useState<string>('');
  const [tags, setTags] = useState<Array<EntityTags>>([]);
  const [activeTab, setActiveTab] = useState<number>(getCurrentTopicTab(tab));
  const [partitions, setPartitions] = useState<number>(0);
  const [cleanupPolicies, setCleanupPolicies] = useState<Array<string>>([]);
  const [maximumMessageSize, setMaximumMessageSize] = useState<number>(0);
  const [replicationFactor, setReplicationFactor] = useState<number>(0);
  const [retentionSize, setRetentionSize] = useState<number>(0);
  const [name, setName] = useState<string>('');
  const [deleted, setDeleted] = useState<boolean>(false);
  const [isError, setIsError] = useState(false);

  const [schemaText, setSchemaText] = useState<string>('{}');
  const [slashedTopicName, setSlashedTopicName] = useState<
    TitleBreadcrumbProps['titleLinks']
  >([]);
  const [currentVersion, setCurrentVersion] = useState<string>();
  const [entityThread, setEntityThread] = useState<EntityThread[]>([]);
  const [isentityThreadLoading, setIsentityThreadLoading] =
    useState<boolean>(false);
  const [feedCount, setFeedCount] = useState<number>(0);
  const [entityFieldThreadCount, setEntityFieldThreadCount] = useState<
    EntityFieldThreadCount[]
  >([]);

  const activeTabHandler = (tabValue: number) => {
    const currentTabIndex = tabValue - 1;
    if (topicDetailsTabs[currentTabIndex].path !== tab) {
      setActiveTab(getCurrentTopicTab(topicDetailsTabs[currentTabIndex].path));
      history.push({
        pathname: getTopicDetailsPath(
          topicFQN,
          topicDetailsTabs[currentTabIndex].path
        ),
      });
    }
  };

  const handleShowErrorToast = (errMessage: string) => {
    showToast({
      variant: 'error',
      body: errMessage,
    });
  };

  const handleShowSuccessToast = (message: string) => {
    showToast({
      variant: 'success',
      body: message,
    });
  };

  const getEntityFeedCount = () => {
    getFeedCount(getEntityFeedLink(EntityType.TOPIC, topicFQN))
      .then((res: AxiosResponse) => {
        if (res.data) {
          setFeedCount(res.data.totalCount);
          setEntityFieldThreadCount(res.data.counts);
        } else {
          handleShowErrorToast(
            jsonData['api-error-messages']['fetch-entity-feed-count-error']
          );
        }
      })
      .catch((err: AxiosError) => {
        const errMsg =
          err.response?.data?.message ||
          jsonData['api-error-messages']['fetch-entity-feed-count-error'];
        handleShowErrorToast(errMsg);
      });
  };

  const fetchActivityFeed = () => {
    setIsentityThreadLoading(true);
    getAllFeeds(getEntityFeedLink(EntityType.TOPIC, topicFQN))
      .then((res: AxiosResponse) => {
        const { data } = res.data;
        if (data) {
          setEntityThread(data);
        } else {
          handleShowErrorToast(
            jsonData['api-error-messages']['fetch-entity-feed-error']
          );
        }
      })
      .catch((err: AxiosError) => {
        const errMsg =
          err.response?.data?.message ||
          jsonData['api-error-messages']['fetch-entity-feed-error'];
        handleShowErrorToast(errMsg);
      })
      .finally(() => setIsentityThreadLoading(false));
  };

  const saveUpdatedTopicData = (updatedData: Topic): Promise<AxiosResponse> => {
    const jsonPatch = compare(topicDetails, updatedData);

    return patchTopicDetails(
      topicId,
      jsonPatch
    ) as unknown as Promise<AxiosResponse>;
  };

  const fetchTopicDetail = (topicFQN: string) => {
    setLoading(true);
    getTopicByFqn(topicFQN, ['owner', 'followers', 'tags'])
      .then((res: AxiosResponse) => {
        if (res.data) {
          const {
            id,
            deleted,
            description,
            followers,
            fullyQualifiedName,
            name,
            schemaType,
            schemaText,
            service,
            tags,
            owner,
            partitions,
            cleanupPolicies,
            maximumMessageSize,
            replicationFactor,
            retentionSize,
            serviceType,
            version,
          } = res.data;
          setName(name);
          setTopicDetails(res.data);
          setTopicId(id);
          setCurrentVersion(version);
          setDescription(description ?? '');
          setSchemaType(schemaType);
          setFollowers(followers);
          setOwner(owner);
          setTier(getTierTags(tags));
          setTags(getTagsWithoutTier(tags));
          setSchemaText(schemaText);
          setPartitions(partitions);
          setCleanupPolicies(cleanupPolicies);
          setMaximumMessageSize(maximumMessageSize);
          setReplicationFactor(replicationFactor);
          setRetentionSize(retentionSize);
          setDeleted(deleted);
          setSlashedTopicName([
            {
              name: service.name,
              url: service.name
                ? getServiceDetailsPath(
                    service.name,
                    ServiceCategory.MESSAGING_SERVICES
                  )
                : '',
              imgSrc: serviceType ? serviceTypeLogo(serviceType) : undefined,
            },
            {
              name: name,
              url: '',
              activeTitle: true,
            },
          ]);

          addToRecentViewed({
            entityType: EntityType.TOPIC,
            fqn: fullyQualifiedName,
            serviceType: serviceType,
            timestamp: 0,
          });
        } else {
          handleShowErrorToast(
            jsonData['api-error-messages']['fetch-table-details-error']
          );
          setIsError(true);
        }
      })
      .catch((err: AxiosError) => {
        if (err.response?.status === 404) {
          setIsError(true);
        } else {
          const errMsg =
            err.response?.data?.message ||
            jsonData['api-error-messages']['fetch-topic-details-error'];
          handleShowErrorToast(errMsg);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const followTopic = () => {
    addFollower(topicId, USERId)
      .then((res: AxiosResponse) => {
        if (res.data) {
          const { newValue } = res.data.changeDescription.fieldsAdded[0];

          setFollowers([...followers, ...newValue]);
        } else {
          handleShowErrorToast(
            jsonData['api-error-messages']['update-entity-follow-error']
          );
        }
      })
      .catch((err: AxiosError) => {
        const errMsg =
          err.response?.data?.message ||
          jsonData['api-error-messages']['update-entity-follow-error'];
        handleShowErrorToast(errMsg);
      });
  };

  const unfollowTopic = () => {
    removeFollower(topicId, USERId)
      .then((res: AxiosResponse) => {
        if (res.data) {
          const { oldValue } = res.data.changeDescription.fieldsDeleted[0];

          setFollowers(
            followers.filter((follower) => follower.id !== oldValue[0].id)
          );
        } else {
          handleShowErrorToast(
            jsonData['api-error-messages']['update-entity-unfollow-error']
          );
        }
      })
      .catch((err: AxiosError) => {
        const errMsg =
          err.response?.data?.message ||
          jsonData['api-error-messages']['update-entity-unfollow-error'];
        handleShowErrorToast(errMsg);
      });
  };

  const descriptionUpdateHandler = (updatedTopic: Topic) => {
    saveUpdatedTopicData(updatedTopic)
      .then((res: AxiosResponse) => {
        if (res.data) {
          const { description, version } = res.data;
          setCurrentVersion(version);
          setTopicDetails(res.data);
          setDescription(description);
          getEntityFeedCount();
        } else {
          handleShowErrorToast(
            jsonData['api-error-messages']['update-description-error']
          );
        }
      })
      .catch((err: AxiosError) => {
        const msg =
          err.response?.data?.message ||
          jsonData['api-error-messages']['update-description-error'];
        handleShowErrorToast(msg);
      });
  };

  const settingsUpdateHandler = (updatedTopic: Topic): Promise<void> => {
    return new Promise<void>((resolve, reject) => {
      saveUpdatedTopicData(updatedTopic)
        .then((res) => {
          if (res.data) {
            setTopicDetails(res.data);
            setCurrentVersion(res.data.version);
            setOwner(res.data.owner);
            setTier(getTierTags(res.data.tags));
            getEntityFeedCount();
            resolve();
          } else {
            handleShowErrorToast(
              jsonData['api-error-messages']['update-entity-error']
            );
          }
        })
        .catch((err: AxiosError) => {
          const msg =
            err.response?.data?.message ||
            jsonData['api-error-messages']['update-entity-error'];
          handleShowErrorToast(msg);
          reject();
        });
    });
  };

  const onTagUpdate = (updatedTopic: Topic) => {
    saveUpdatedTopicData(updatedTopic)
      .then((res: AxiosResponse) => {
        if (res.data) {
          setTier(getTierTags(res.data.tags));
          setCurrentVersion(res.data.version);
          setTags(getTagsWithoutTier(res.data.tags));
          getEntityFeedCount();
        } else {
          handleShowErrorToast(
            jsonData['api-error-messages']['update-tags-error']
          );
        }
      })
      .catch((err: AxiosError) => {
        const errMsg =
          err.response?.data?.message ||
          jsonData['api-error-messages']['update-tags-error'];
        handleShowErrorToast(errMsg);
      });
  };

  const versionHandler = () => {
    history.push(
      getVersionPath(EntityType.TOPIC, topicFQN, currentVersion as string)
    );
  };

  const postFeedHandler = (value: string, id: string) => {
    const currentUser = AppState.userDetails?.name ?? AppState.users[0]?.name;

    const data = {
      message: value,
      from: currentUser,
    };
    postFeedById(id, data)
      .then((res: AxiosResponse) => {
        if (res.data) {
          const { id, posts } = res.data;
          setEntityThread((pre) => {
            return pre.map((thread) => {
              if (thread.id === id) {
                return { ...res.data, posts: posts.slice(-3) };
              } else {
                return thread;
              }
            });
          });
          getEntityFeedCount();
        } else {
          handleShowErrorToast(
            jsonData['api-error-messages']['add-feed-error']
          );
        }
      })
      .catch((err: AxiosError) => {
        const errMsg =
          err.response?.data?.message ||
          jsonData['api-error-messages']['add-feed-error'];
        handleShowErrorToast(errMsg);
      });
  };

  const createThread = (data: CreateThread) => {
    postThread(data)
      .then((res: AxiosResponse) => {
        if (res.data) {
          setEntityThread((pre) => [...pre, res.data]);
          getEntityFeedCount();
          handleShowSuccessToast(
            jsonData['api-success-messages']['create-conversation']
          );
        } else {
          handleShowErrorToast(
            jsonData['api-error-messages']['create-conversation-error']
          );
        }
      })
      .catch((err: AxiosError) => {
        const errMsg =
          err.response?.data?.message ||
          jsonData['api-error-messages']['create-conversation-error'];
        handleShowErrorToast(errMsg);
      });
  };

  const deletePostHandler = (threadId: string, postId: string) => {
    deletePost(threadId, postId)
      .then(() => {
        getUpdatedThread(threadId)
          .then((data) => {
            if (data) {
              setEntityThread((pre) => {
                return pre.map((thread) => {
                  if (thread.id === data.id) {
                    return {
                      ...thread,
                      posts: data.posts.slice(-3),
                      postsCount: data.postsCount,
                    };
                  } else {
                    return thread;
                  }
                });
              });
            } else {
              handleShowErrorToast(
                jsonData['api-error-messages'][
                  'fetch-updated-conversation-error'
                ]
              );
            }
          })
          .catch((error: AxiosError) => {
            const message =
              error?.response?.data?.message ||
              jsonData['api-error-messages'][
                'fetch-updated-conversation-error'
              ];
            handleShowErrorToast(message);
          });

        handleShowSuccessToast(
          jsonData['api-success-messages']['delete-message']
        );
      })
      .catch((error: AxiosError) => {
        const message =
          error?.response?.data?.message ||
          jsonData['api-error-messages']['delete-message-error'];
        handleShowErrorToast(message);
      });
  };

  useEffect(() => {
    if (topicDetailsTabs[activeTab - 1].path !== tab) {
      setActiveTab(getCurrentTopicTab(tab));
    }
    if (TabSpecificField.ACTIVITY_FEED === tab) {
      fetchActivityFeed();
    }
  }, [tab]);

  useEffect(() => {
    getEntityFeedCount();
  }, []);

  useEffect(() => {
    fetchTopicDetail(topicFQN);
  }, [topicFQN]);

  return (
    <>
      {isLoading ? (
        <Loader />
      ) : isError ? (
        <ErrorPlaceHolder>
          {getEntityMissingError('topic', topicFQN)}
        </ErrorPlaceHolder>
      ) : (
        <TopicDetails
          activeTab={activeTab}
          cleanupPolicies={cleanupPolicies}
          createThread={createThread}
          deletePostHandler={deletePostHandler}
          deleted={deleted}
          description={description}
          descriptionUpdateHandler={descriptionUpdateHandler}
          entityFieldThreadCount={entityFieldThreadCount}
          entityName={name}
          entityThread={entityThread}
          feedCount={feedCount}
          followTopicHandler={followTopic}
          followers={followers}
          isentityThreadLoading={isentityThreadLoading}
          maximumMessageSize={maximumMessageSize}
          owner={owner}
          partitions={partitions}
          postFeedHandler={postFeedHandler}
          replicationFactor={replicationFactor}
          retentionSize={retentionSize}
          schemaText={schemaText}
          schemaType={schemaType}
          setActiveTabHandler={activeTabHandler}
          settingsUpdateHandler={settingsUpdateHandler}
          slashedTopicName={slashedTopicName}
          tagUpdateHandler={onTagUpdate}
          tier={tier as TagLabel}
          topicDetails={topicDetails}
          topicFQN={topicFQN}
          topicTags={tags}
          unfollowTopicHandler={unfollowTopic}
          users={AppState.users}
          version={currentVersion}
          versionHandler={versionHandler}
        />
      )}
    </>
  );
};

export default observer(TopicDetailsPage);
