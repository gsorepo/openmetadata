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

import { Col, Row, Tabs, Typography } from 'antd';
import Card from 'antd/lib/card/Card';
import { noop } from 'lodash';
import { observer } from 'mobx-react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { ReactComponent as PersonaIcon } from '../../assets/svg/ic-personas.svg';
import ActivityFeedProvider from '../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import { ActivityFeedTab } from '../../components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import TabsLabel from '../../components/TabsLabel/TabsLabel.component';
import {
  getUserPath,
  NO_DATA_PLACEHOLDER,
  ROUTES,
} from '../../constants/constants';
import { myDataSearchIndex } from '../../constants/Mydata.constants';
import { EntityType } from '../../enums/entity.enum';
import { EntityReference } from '../../generated/entity/type';
import { useAuth } from '../../hooks/authHooks';
import { searchData } from '../../rest/miscAPI';
import { DEFAULT_ENTITY_PERMISSION } from '../../utils/PermissionsUtils';
import { useAuthContext } from '../authentication/auth-provider/AuthProvider';
import Chip from '../common/Chip/Chip.component';
import PageLayoutV1 from '../containers/PageLayoutV1';
import EntitySummaryPanel from '../Explore/EntitySummaryPanel/EntitySummaryPanel.component';
import { EntityDetailsObjectInterface } from '../Explore/explore.interface';
import AssetsTabs from '../Glossary/GlossaryTerms/tabs/AssetsTabs.component';
import {
  AssetNoDataPlaceholderProps,
  AssetsOfEntity,
} from '../Glossary/GlossaryTerms/tabs/AssetsTabs.interface';
import { PersonaSelectableList } from '../Persona/PersonaSelectableList/PersonaSelectableList.component';
import { Props, UserPageTabs } from './Users.interface';
import './Users.style.less';
import UserProfileDetails from './UsersProfile/UserProfileDetails/UserProfileDetails.component';
import UserProfileImage from './UsersProfile/UserProfileImage/UserProfileImage.component';
import UserProfileInheritedRoles from './UsersProfile/UserProfileInheritedRoles/UserProfileInheritedRoles.component';
import UserProfileRoles from './UsersProfile/UserProfileRoles/UserProfileRoles.component';
import UserProfileTeams from './UsersProfile/UserProfileTeams/UserProfileTeams.component';

const Users = ({
  userData,
  username,
  queryFilters,
  updateUserDetails,
}: Props) => {
  const { tab: activeTab = UserPageTabs.ACTIVITY } =
    useParams<{ tab: UserPageTabs }>();
  const [assetCount, setAssetCount] = useState<number>(0);
  const { isAdminUser } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const { currentUser } = useAuthContext();

  const isSelfProfileView = userData?.id === currentUser?.id;

  const [previewAsset, setPreviewAsset] =
    useState<EntityDetailsObjectInterface>();

  const { t } = useTranslation();

  const defaultPersona = useMemo(() => {
    return userData.personas?.find(
      (persona) => persona.id === userData.defaultPersona?.id
    );
  }, [userData]);

  const fetchAssetsCount = async (query: string) => {
    try {
      const res = await searchData('', 1, 0, query, '', '', myDataSearchIndex);

      setAssetCount(res.data.hits.total.value ?? 0);
    } catch (error) {
      setAssetCount(0);
    }
  };

  const activeTabHandler = (activeKey: string) => {
    // To reset search params appends from other page for proper navigation
    location.search = '';
    if (activeKey !== activeTab) {
      history.push({
        pathname: getUserPath(username, activeKey),
        search: location.search,
      });
    }
  };

  const handleAssetClick = useCallback((asset) => {
    setPreviewAsset(asset);
  }, []);

  const handlePersonaUpdate = useCallback(
    async (personas: EntityReference[]) => {
      await updateUserDetails({ ...userData, personas });
    },
    [updateUserDetails, userData]
  );

  const handleDefaultPersonaUpdate = useCallback(
    async (defaultPersona?: EntityReference) => {
      await updateUserDetails({ ...userData, defaultPersona });
    },
    [updateUserDetails, userData]
  );

  const tabDataRender = useCallback(
    (props: {
      queryFilter: string;
      type: AssetsOfEntity;
      noDataPlaceholder: AssetNoDataPlaceholderProps;
    }) => (
      <Row className="user-page-layout" wrap={false}>
        <Col className="user-layout-scroll" flex="auto">
          <AssetsTabs
            isSummaryPanelOpen
            assetCount={assetCount}
            permissions={{ ...DEFAULT_ENTITY_PERMISSION, Create: true }}
            onAddAsset={() => history.push(ROUTES.EXPLORE)}
            onAssetClick={handleAssetClick}
            {...props}
          />
        </Col>

        {previewAsset && (
          <Col className="user-page-layout-right-panel" flex="400px">
            <EntitySummaryPanel
              entityDetails={previewAsset}
              handleClosePanel={() => setPreviewAsset(undefined)}
            />
          </Col>
        )}
      </Row>
    ),
    [previewAsset, assetCount, handleAssetClick, setPreviewAsset]
  );

  const tabs = useMemo(
    () => [
      {
        label: (
          <TabsLabel
            id={UserPageTabs.ACTIVITY}
            isActive={activeTab === UserPageTabs.ACTIVITY}
            name={t('label.activity')}
          />
        ),
        key: UserPageTabs.ACTIVITY,
        children: (
          <ActivityFeedProvider user={userData.id}>
            <ActivityFeedTab
              entityType={EntityType.USER}
              fqn={username}
              onFeedUpdate={noop}
            />
          </ActivityFeedProvider>
        ),
      },
      {
        label: (
          <TabsLabel
            id={UserPageTabs.MY_DATA}
            isActive={activeTab === UserPageTabs.MY_DATA}
            name={t('label.my-data')}
          />
        ),
        key: UserPageTabs.MY_DATA,
        children: tabDataRender({
          queryFilter: queryFilters.myData,
          type: AssetsOfEntity.MY_DATA,
          noDataPlaceholder: {
            message: t('server.you-have-not-action-anything-yet', {
              action: t('label.owned-lowercase'),
            }),
          },
        }),
      },
      {
        label: (
          <TabsLabel
            id={UserPageTabs.FOLLOWING}
            isActive={activeTab === UserPageTabs.FOLLOWING}
            name={t('label.following')}
          />
        ),
        key: UserPageTabs.FOLLOWING,
        children: tabDataRender({
          queryFilter: queryFilters.following,
          type: AssetsOfEntity.FOLLOWING,
          noDataPlaceholder: {
            message: t('server.you-have-not-action-anything-yet', {
              action: t('label.followed-lowercase'),
            }),
          },
        }),
      },
    ],
    [activeTab, userData, username, setPreviewAsset, tabDataRender]
  );

  useEffect(() => {
    if ([UserPageTabs.MY_DATA, UserPageTabs.FOLLOWING].includes(activeTab)) {
      fetchAssetsCount(
        activeTab === UserPageTabs.MY_DATA
          ? queryFilters.myData
          : queryFilters.following
      );
    }
  }, [activeTab]);

  return (
    <PageLayoutV1 className="user-layout h-full" pageTitle={t('label.user')}>
      <div data-testid="table-container">
        <Row className="user-profile-container" data-testid="user-profile">
          <Col className="flex-center border-right" span={4}>
            <UserProfileImage
              userData={{
                id: userData.id,
                name: userData.name,
                displayName: userData.displayName,
                images: userData.profile?.images,
              }}
            />
          </Col>
          <Col className="p-x-sm border-right" span={5}>
            <UserProfileDetails
              updateUserDetails={updateUserDetails}
              userData={{
                email: userData.email,
                name: userData.name,
                displayName: userData.displayName,
                description: userData.description,
              }}
            />
          </Col>
          <Col className="p-x-sm border-right" span={5}>
            <UserProfileTeams
              teams={userData.teams}
              updateUserDetails={updateUserDetails}
            />
          </Col>
          <Col className="p-x-sm border-right" span={5}>
            <div className="d-flex flex-col justify-between h-full">
              <UserProfileRoles
                isUserAdmin={userData.isAdmin}
                updateUserDetails={updateUserDetails}
                userRoles={userData.roles}
              />
              <UserProfileInheritedRoles
                inheritedRoles={userData.inheritedRoles}
              />
            </div>
          </Col>
          <Col className="p-x-sm border-right" span={5}>
            <div className="d-flex flex-col justify-between h-full">
              <Card
                className="ant-card-feed relative card-body-border-none card-padding-y-0 m-b-md"
                title={
                  <Typography.Text
                    className="right-panel-label items-center d-flex gap-2"
                    data-testid="inherited-roles">
                    {t('label.persona')}
                    <PersonaSelectableList
                      multiSelect
                      hasPermission={Boolean(isAdminUser)}
                      selectedPersonas={userData.personas ?? []}
                      onUpdate={handlePersonaUpdate}
                    />
                  </Typography.Text>
                }>
                <Chip
                  showNoDataPlaceholder
                  data={userData.personas ?? []}
                  icon={<PersonaIcon height={18} />}
                  noDataPlaceholder={t('message.no-persona-assigned')}
                />
              </Card>
              <Card
                className="ant-card-feed relative card-body-border-none card-padding-y-0"
                title={
                  <Typography.Text
                    className="right-panel-label m-b-0 d-flex gap-2"
                    data-testid="inherited-roles">
                    {t('label.default-persona')}
                    <PersonaSelectableList
                      hasPermission={isAdminUser || isSelfProfileView}
                      multiSelect={false}
                      personaList={userData.personas}
                      selectedPersonas={defaultPersona ? [defaultPersona] : []}
                      onUpdate={handleDefaultPersonaUpdate}
                    />
                  </Typography.Text>
                }>
                <Chip
                  showNoDataPlaceholder
                  data={defaultPersona ? [defaultPersona] : []}
                  icon={<PersonaIcon height={18} />}
                  noDataPlaceholder={NO_DATA_PLACEHOLDER}
                />
              </Card>
            </div>
          </Col>
        </Row>
        <Tabs
          destroyInactiveTabPane
          activeKey={activeTab ?? UserPageTabs.ACTIVITY}
          className="user-page-tabs"
          data-testid="tabs"
          items={tabs}
          onChange={activeTabHandler}
        />
      </div>
    </PageLayoutV1>
  );
};

export default observer(Users);
