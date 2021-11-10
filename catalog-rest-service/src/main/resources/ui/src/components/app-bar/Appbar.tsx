/*
  * Licensed to the Apache Software Foundation (ASF) under one or more
  * contributor license agreements. See the NOTICE file distributed with
  * this work for additional information regarding copyright ownership.
  * The ASF licenses this file to You under the Apache License, Version 2.0
  * (the "License"); you may not use this file except in compliance with
  * the License. You may obtain a copy of the License at

  * http://www.apache.org/licenses/LICENSE-2.0

  * Unless required by applicable law or agreed to in writing, software
  * distributed under the License is distributed on an "AS IS" BASIS,
  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  * See the License for the specific language governing permissions and
  * limitations under the License.
*/

import { AxiosResponse } from 'axios';
import { CookieStorage } from 'cookie-storage';
import { isEmpty } from 'lodash';
import { observer } from 'mobx-react';
import { Match } from 'Models';
import React, { useEffect, useState } from 'react';
import {
  NavLink,
  useHistory,
  useLocation,
  useRouteMatch,
} from 'react-router-dom';
import appState from '../../AppState';
import { getVersion } from '../../axiosAPIs/miscAPI';
import {
  getExplorePathWithSearch,
  // navLinkDevelop,
  navLinkSettings,
  ROUTES,
} from '../../constants/constants';
import { urlGitbookDocs, urlJoinSlack } from '../../constants/url.const';
import { useAuth } from '../../hooks/authHooks';
import { userSignOut } from '../../utils/AuthUtils';
import {
  inPageSearchOptions,
  isInPageSearchAllowed,
} from '../../utils/RouterUtils';
import { activeLink, normalLink } from '../../utils/styleconstant';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import DropDown from '../dropdown/DropDown';
import { WhatsNewModal } from '../Modals/WhatsNewModal';
import { COOKIE_VERSION } from '../Modals/WhatsNewModal/whatsNewData';
// import Tour from '../tour/Tour';
import { ReactComponent as IconDefaultUserProfile } from './../../assets/svg/ic-default-profile.svg';
import SearchOptions from './SearchOptions';
import Suggestions from './Suggestions';

const cookieStorage = new CookieStorage();

const Appbar: React.FC = (): JSX.Element => {
  const location = useLocation();
  const history = useHistory();
  const { isAuthenticatedRoute, isSignedIn, isFirstTimeUser, isAuthDisabled } =
    useAuth(location.pathname);
  const match: Match | null = useRouteMatch({
    path: ROUTES.EXPLORE_WITH_SEARCH,
  });
  const searchQuery = match?.params?.searchQuery;
  const [searchValue, setSearchValue] = useState(searchQuery);
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const [isFeatureModalOpen, setIsFeatureModalOpen] = useState<boolean>(() => {
    return !isFirstTimeUser && cookieStorage.getItem(COOKIE_VERSION) !== 'true';
  });

  const [version, setVersion] = useState<string>('');

  const navStyle = (value: boolean) => {
    if (value) return { color: activeLink };

    return { color: normalLink };
  };

  const openModal = () => {
    setIsFeatureModalOpen(true);
  };

  const supportLinks = [
    {
      name: `Docs`,
      to: urlGitbookDocs,
      isOpenNewTab: true,
      disabled: false,
      icon: (
        <SVGIcons
          alt="Doc icon"
          className="tw-align-middle tw--mt-0.5 tw-mr-0.5"
          icon={Icons.DOC}
          width="12"
        />
      ),
    },
    {
      name: `API`,
      to: ROUTES.SWAGGER,
      disabled: false,
      icon: (
        <SVGIcons
          alt="API icon"
          className="tw-align-middle tw--mt-0.5 tw-mr-0.5"
          icon={Icons.API}
          width="12"
        />
      ),
    },
    {
      name: `Slack`,
      to: urlJoinSlack,
      disabled: false,
      isOpenNewTab: true,
      icon: (
        <SVGIcons
          alt="slack icon"
          className="tw-align-middle tw-mr-0.5"
          icon={Icons.SLACK_GREY}
          width="12"
        />
      ),
    },
  ];

  const getUserDisplayName = () => {
    const name = isAuthDisabled
      ? appState.users?.length > 0
        ? appState.users[0].displayName
        : 'User'
      : appState.userDetails.displayName || appState.userDetails.name;

    return (
      <span data-testid="greeting-text">
        Welcome, <span className="tw-font-medium">{name?.split(' ')[0]}</span>
      </span>
    );
  };

  useEffect(() => {
    setSearchValue(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    setIsFeatureModalOpen(
      !isFirstTimeUser && cookieStorage.getItem(COOKIE_VERSION) !== 'true'
    );
  }, [isFirstTimeUser]);

  useEffect(() => {
    if (isAuthDisabled) {
      getVersion().then((res: AxiosResponse) => {
        setVersion(res.data.version);
      });
    } else {
      if (!isEmpty(appState.userDetails)) {
        getVersion().then((res: AxiosResponse) => {
          setVersion(res.data.version);
        });
      }
    }
  }, [appState.userDetails, isAuthDisabled]);

  return (
    <>
      {isAuthenticatedRoute && isSignedIn ? (
        <div className="tw-h-14 tw-py-2 tw-px-5 tw-border-b-2 tw-border-separator">
          <div className="tw-flex tw-items-center tw-flex-row tw-justify-between tw-flex-nowrap">
            <div className="tw-flex tw-items-center tw-flex-row tw-justify-between tw-flex-nowrap tw-mr-auto">
              <NavLink id="openmetadata_logo" to="/">
                <SVGIcons
                  alt="OpenMetadata Logo"
                  icon={Icons.LOGO_SMALL}
                  width="30"
                />
              </NavLink>
              <div
                className="tw-flex-none tw-relative tw-pl-5 "
                data-testid="appbar-item">
                <span className="fa fa-search tw-absolute tw-block tw-z-10 tw-w-9 tw-h-8 tw-leading-8 tw-text-center tw-pointer-events-none tw-text-gray-400" />
                <input
                  className="tw-relative search-grey tw-rounded tw-border tw-border-main tw-bg-body-main focus:tw-outline-none tw-pl-8 tw-py-1 tw-form-inputs"
                  data-testid="searchBox"
                  id="searchBox"
                  type="text"
                  value={searchValue || ''}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                  }}
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    const target = e.target as HTMLInputElement;
                    if (e.key === 'Enter') {
                      setIsOpen(false);
                      history.push(
                        getExplorePathWithSearch(
                          target.value,
                          // this is for if user is searching from another page
                          location.pathname.startsWith(ROUTES.EXPLORE)
                            ? appState.explorePageTab
                            : 'tables'
                        )
                      );
                    }
                  }}
                />
                {searchValue &&
                  (isInPageSearchAllowed(location.pathname) ? (
                    <SearchOptions
                      isOpen={isOpen}
                      options={inPageSearchOptions(location.pathname)}
                      searchText={searchValue}
                      selectOption={(text) => {
                        appState.inPageSearchText = text;
                      }}
                      setIsOpen={setIsOpen}
                    />
                  ) : (
                    <Suggestions
                      isOpen={isOpen}
                      searchText={searchValue}
                      setIsOpen={setIsOpen}
                    />
                  ))}
              </div>
              <div className="tw-ml-9">
                <NavLink
                  className="tw-nav focus:tw-no-underline"
                  data-testid="appbar-item"
                  id="explore"
                  style={navStyle(location.pathname.startsWith('/explore'))}
                  to={{
                    pathname: '/explore',
                  }}>
                  Explore
                </NavLink>
                <DropDown
                  dropDownList={navLinkSettings}
                  label="Settings"
                  type="link"
                />
              </div>
            </div>
            <button
              className="tw-nav focus:tw-no-underline hover:tw-underline"
              data-testid="whatsnew-modal"
              onClick={openModal}>
              <SVGIcons
                alt="Doc icon"
                className="tw-align-middle tw--mt-0.5 tw-mr-1"
                icon={Icons.WHATS_NEW}
                width="16"
              />
              <span>What&#39;s new</span>
            </button>
            {/* <NavLink
              className="tw-nav focus:tw-no-underline hover:tw-underline"
              data-testid="tour"
              style={navStyle(location.pathname.startsWith('/explore'))}
              to={{
                pathname: '/tour',
              }}>
              <SVGIcons
                alt="Doc icon"
                className="tw-align-middle tw--mt-0.5 tw-mr-1"
                icon={Icons.WHATS_NEW}
                width="16"
              />
              <span>Tour</span>
            </NavLink> */}
            <div>
              <DropDown
                dropDownList={supportLinks}
                icon={
                  <SVGIcons
                    alt="Doc icon"
                    className="tw-align-middle tw-mt-0.5 tw-mr-1"
                    icon={Icons.HELP_CIRCLE}
                    width="16"
                  />
                }
                label="Need Help"
                type="link"
              />
            </div>
            <div data-testid="dropdown-profile">
              <DropDown
                dropDownList={[
                  {
                    name: (
                      <span className="tw-text-grey-muted tw-cursor-text tw-text-xs">
                        {`Version ${version.split('-')[0]}`}
                        <hr className="tw--mr-12 tw--ml-2 tw-mt-1.5" />
                      </span>
                    ),
                    to: '',
                    disabled: false,
                    icon: <></>,
                    isVersion: true,
                  },
                  {
                    name: 'Logout',
                    to: '#/action-1',
                    disabled: false,
                    method: userSignOut,
                  },
                ]}
                icon={
                  <>
                    {appState?.userDetails?.profile?.images?.image512 ? (
                      <div className="profile-image tw-mr-1">
                        <img
                          alt="user"
                          src={appState.userDetails.profile.images.image512}
                        />
                      </div>
                    ) : (
                      <IconDefaultUserProfile
                        className="tw-mr-1"
                        style={{
                          height: '22px',
                          width: '22px',
                          borderRadius: '50%',
                        }}
                      />
                    )}
                  </>
                }
                label={getUserDisplayName()}
                type="link"
              />
            </div>
          </div>
          {isFeatureModalOpen && (
            <WhatsNewModal
              header="What’s new!"
              onCancel={() => setIsFeatureModalOpen(false)}
            />
          )}
        </div>
      ) : null}
      {/* <Tour /> */}
    </>
  );
};

export default observer(Appbar);
