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
import { isEmpty, isNil, isUndefined } from 'lodash';
import { observer } from 'mobx-react';
import {
  EntityCounts,
  EntityThread,
  FormatedTableData,
  SearchResponse,
} from 'Models';
import React, { Fragment, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import AppState from '../../AppState';
import { getAirflowPipelines } from '../../axiosAPIs/airflowPipelineAPI';
import { getFeedsWithFilter, postFeedById } from '../../axiosAPIs/feedsAPI';
import { fetchSandboxConfig, searchData } from '../../axiosAPIs/miscAPI';
import PageContainerV1 from '../../components/containers/PageContainerV1';
import GithubStarButton from '../../components/GithubStarButton/GithubStarButton';
import Loader from '../../components/Loader/Loader';
import MyData from '../../components/MyData/MyData.component';
import {
  myDataEntityCounts,
  myDataSearchIndex,
} from '../../constants/Mydata.constants';
import { FeedFilter, Ownership } from '../../enums/mydata.enum';
import { useAuth } from '../../hooks/authHooks';
import useToastContext from '../../hooks/useToastContext';
import jsonData from '../../jsons/en';
import { formatDataResponse } from '../../utils/APIUtils';
import { getEntityCountByType } from '../../utils/EntityUtils';
import { getMyDataFilters } from '../../utils/MyDataUtils';
import { getAllServices } from '../../utils/ServiceUtils';
import { getErrorText } from '../../utils/StringsUtils';

const MyDataPage = () => {
  const location = useLocation();
  const showToast = useToastContext();
  const { isAuthDisabled } = useAuth(location.pathname);
  const [error, setError] = useState<string>('');
  const [countServices, setCountServices] = useState<number>();
  const [ingestionCount, setIngestionCount] = useState<number>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchResult, setSearchResult] = useState<SearchResponse>();
  const [entityCounts, setEntityCounts] = useState<EntityCounts>();

  const [ownedData, setOwnedData] = useState<Array<FormatedTableData>>();
  const [followedData, setFollowedData] = useState<Array<FormatedTableData>>();

  const [feedFilter, setFeedFilter] = useState<FeedFilter>(FeedFilter.ALL);
  const [entityThread, setEntityThread] = useState<EntityThread[]>([]);
  const [isFeedLoading, setIsFeedLoading] = useState<boolean>(false);
  const [isSandbox, setIsSandbox] = useState<boolean>(false);
  const feedFilterHandler = (filter: FeedFilter) => {
    setFeedFilter(filter);
  };

  const handleShowErrorToast = (msg: string) => {
    showToast({
      variant: 'error',
      body: msg,
    });
  };

  const fetchData = (fetchService = false) => {
    setError('');

    searchData('', 1, 0, '', '', '', myDataSearchIndex)
      .then((res: SearchResponse) => {
        setSearchResult(res);
        if (isUndefined(entityCounts)) {
          setEntityCounts(
            getEntityCountByType(
              res.data.aggregations?.['sterms#EntityType']?.buckets
            )
          );
        }
      })
      .catch((err: AxiosError) => {
        setError(err.response?.data?.responseMessage);
        setEntityCounts(myDataEntityCounts);
      });

    if (fetchService) {
      getAllServices()
        .then((res) => setCountServices(res.length))
        .catch(() => setCountServices(0));
      getAirflowPipelines([], '', '?limit=1000000')
        .then((res) => setIngestionCount(res.data.data.length))
        .catch(() => setIngestionCount(0));
    }
    setIsLoading(false);
  };

  const fetchMyData = () => {
    const ownedEntity = searchData(
      '',
      1,
      8,
      getMyDataFilters(Ownership.OWNER, AppState.userDetails),
      '',
      '',
      myDataSearchIndex
    );

    const followedEntity = searchData(
      '',
      1,
      8,
      getMyDataFilters(Ownership.FOLLOWERS, AppState.userDetails),
      '',
      '',
      myDataSearchIndex
    );

    Promise.allSettled([ownedEntity, followedEntity]).then(
      ([resOwnedEntity, resFollowedEntity]) => {
        if (resOwnedEntity.status === 'fulfilled') {
          setOwnedData(formatDataResponse(resOwnedEntity.value.data.hits.hits));
        }
        if (resFollowedEntity.status === 'fulfilled') {
          setFollowedData(
            formatDataResponse(resFollowedEntity.value.data.hits.hits)
          );
        }
      }
    );
  };

  const getFeedData = (feedFilter: FeedFilter) => {
    setIsFeedLoading(true);
    const currentUserId = AppState.userDetails?.id;
    getFeedsWithFilter(currentUserId, feedFilter)
      .then((res: AxiosResponse) => {
        const { data } = res.data;
        setEntityThread(data);
      })
      .catch((err: AxiosError) => {
        handleShowErrorToast(
          getErrorText(
            err,
            jsonData['api-error-messages']['fetch-activity-feed-error']
          )
        );
      })
      .finally(() => {
        setIsFeedLoading(false);
      });
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
        }
      })
      .catch(() => {
        showToast({
          variant: 'error',
          body: 'Error while posting feed',
        });
      });
  };

  const fetchOMDMode = () => {
    fetchSandboxConfig()
      .then((res) => {
        if (res.data) {
          setIsSandbox(Boolean(res.data.sandboxModeEnabled));
        } else {
          throw '';
        }
      })
      .catch((err: AxiosError) => {
        showToast({
          variant: 'error',
          body:
            err.response?.data?.message ||
            jsonData['api-error-messages']['unexpected-server-response'],
        });
        setIsSandbox(false);
      });
  };

  useEffect(() => {
    fetchOMDMode();
    fetchData(true);
  }, []);

  useEffect(() => {
    getFeedData(feedFilter);
  }, [feedFilter]);

  useEffect(() => {
    if (
      ((isAuthDisabled && AppState.users.length) ||
        !isEmpty(AppState.userDetails)) &&
      (isNil(ownedData) || isNil(followedData))
    ) {
      fetchMyData();
    }
  }, [AppState.userDetails, AppState.users, isAuthDisabled]);

  return (
    <PageContainerV1>
      {!isUndefined(countServices) &&
      !isUndefined(entityCounts) &&
      !isUndefined(ingestionCount) &&
      !isLoading ? (
        <Fragment>
          <MyData
            countServices={countServices}
            entityCounts={entityCounts}
            error={error}
            feedData={entityThread || []}
            feedFilter={feedFilter}
            feedFilterHandler={feedFilterHandler}
            followedData={followedData || []}
            ingestionCount={ingestionCount}
            isFeedLoading={isFeedLoading}
            ownedData={ownedData || []}
            postFeedHandler={postFeedHandler}
            searchResult={searchResult}
          />
          {isSandbox ? <GithubStarButton /> : null}
        </Fragment>
      ) : (
        <Loader />
      )}
    </PageContainerV1>
  );
};

export default observer(MyDataPage);
