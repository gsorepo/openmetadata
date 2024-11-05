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

import { Col, Row, Tabs } from 'antd';
import { t } from 'i18next';
import { isEmpty } from 'lodash';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useHistory, useParams } from 'react-router-dom';
import { FQN_SEPARATOR_CHAR } from '../../../constants/char.constants';
import { getGlossaryTermDetailsPath } from '../../../constants/constants';
import { FEED_COUNT_INITIAL_DATA } from '../../../constants/entity.constants';
import { EntityField } from '../../../constants/Feeds.constants';
import { EntityTabs, EntityType } from '../../../enums/entity.enum';
import { SearchIndex } from '../../../enums/search.enum';
import {
  ChangeDescription,
  Glossary,
} from '../../../generated/entity/data/glossary';
import {
  GlossaryTerm,
  Status,
} from '../../../generated/entity/data/glossaryTerm';
import { Page, PageType } from '../../../generated/system/ui/page';
import { useApplicationStore } from '../../../hooks/useApplicationStore';
import { useFqn } from '../../../hooks/useFqn';
import { FeedCounts } from '../../../interface/feed.interface';
import { MOCK_GLOSSARY_NO_PERMISSIONS } from '../../../mocks/Glossary.mock';
import { getDocumentByFQN } from '../../../rest/DocStoreAPI';
import { searchData } from '../../../rest/miscAPI';
import { getCountBadge, getFeedCounts } from '../../../utils/CommonUtils';
import { getEntityVersionByField } from '../../../utils/EntityVersionUtils';
import {
  getGlossaryTermDetailTabs,
  getTabLabelMap,
} from '../../../utils/GlossaryTerm/GlossaryTermUtil';
import { getQueryFilterToExcludeTerm } from '../../../utils/GlossaryUtils';
import { getGlossaryTermsVersionsPath } from '../../../utils/RouterUtils';
import {
  escapeESReservedCharacters,
  getEncodedFqn,
} from '../../../utils/StringsUtils';
import { ActivityFeedTab } from '../../ActivityFeed/ActivityFeedTab/ActivityFeedTab.component';
import { CustomPropertyTable } from '../../common/CustomPropertyTable/CustomPropertyTable';
import TabsLabel from '../../common/TabsLabel/TabsLabel.component';
import { AssetSelectionModal } from '../../DataAssets/AssetsSelectionModal/AssetSelectionModal';
import { GenericProvider } from '../../GenericProvider/GenericProvider';
import GlossaryHeader from '../GlossaryHeader/GlossaryHeader.component';
import GlossaryTermTab from '../GlossaryTermTab/GlossaryTermTab.component';
import { useGlossaryStore } from '../useGlossary.store';
import { GlossaryTermsV1Props } from './GlossaryTermsV1.interface';
import AssetsTabs, { AssetsTabRef } from './tabs/AssetsTabs.component';
import { AssetsOfEntity } from './tabs/AssetsTabs.interface';
import GlossaryOverviewTab from './tabs/GlossaryOverviewTab.component';

const GlossaryTermsV1 = ({
  glossaryTerm,
  handleGlossaryTermUpdate,
  handleGlossaryTermDelete,
  permissions,
  refreshGlossaryTerms,
  onAssetClick,
  isSummaryPanelOpen,
  termsLoading,
  onAddGlossaryTerm,
  onEditGlossaryTerm,
  updateVote,
  refreshActiveGlossaryTerm,
  isVersionView,
  onThreadLinkSelect,
}: GlossaryTermsV1Props) => {
  const { tab, version } = useParams<{ tab: string; version: string }>();
  const { fqn: glossaryFqn } = useFqn();
  const history = useHistory();
  const assetTabRef = useRef<AssetsTabRef>(null);
  const [assetModalVisible, setAssetModalVisible] = useState(false);
  const [feedCount, setFeedCount] = useState<FeedCounts>(
    FEED_COUNT_INITIAL_DATA
  );
  const { selectedPersona } = useApplicationStore();
  const [assetCount, setAssetCount] = useState<number>(0);
  const { glossaryChildTerms } = useGlossaryStore();
  const childGlossaryTerms = glossaryChildTerms ?? [];
  const [customizedPage, setCustomizedPage] = useState<Page | null>(null);

  const assetPermissions = useMemo(() => {
    const glossaryTermStatus = glossaryTerm.status ?? Status.Approved;

    return glossaryTermStatus === Status.Approved
      ? permissions
      : MOCK_GLOSSARY_NO_PERMISSIONS;
  }, [glossaryTerm, permissions]);

  const activeTab = useMemo(() => {
    return tab ?? EntityTabs.OVERVIEW;
  }, [tab]);

  const activeTabHandler = (tab: string) => {
    history.push({
      pathname: version
        ? getGlossaryTermsVersionsPath(glossaryFqn, version, tab)
        : getGlossaryTermDetailsPath(glossaryFqn, tab),
    });
  };

  const handleFeedCount = useCallback((data: FeedCounts) => {
    setFeedCount(data);
  }, []);

  const getEntityFeedCount = () => {
    getFeedCounts(
      EntityType.GLOSSARY_TERM,
      glossaryTerm.fullyQualifiedName ?? '',
      handleFeedCount
    );
  };

  const fetchGlossaryTermAssets = async () => {
    if (glossaryTerm) {
      try {
        const encodedFqn = getEncodedFqn(
          escapeESReservedCharacters(glossaryTerm.fullyQualifiedName)
        );
        const res = await searchData(
          '',
          1,
          0,
          `(tags.tagFQN:"${encodedFqn}")`,
          '',
          '',
          SearchIndex.ALL
        );

        setAssetCount(res.data.hits.total.value ?? 0);
      } catch (error) {
        setAssetCount(0);
      }
    }
  };

  const handleAssetSave = useCallback(() => {
    fetchGlossaryTermAssets();
    assetTabRef.current?.refreshAssets();
    tab !== 'assets' && activeTabHandler('assets');
  }, [assetTabRef, tab]);

  const onExtensionUpdate = useCallback(
    async (updatedTable: GlossaryTerm) => {
      await handleGlossaryTermUpdate({
        ...glossaryTerm,
        extension: updatedTable.extension,
      });
    },
    [glossaryTerm, handleGlossaryTermUpdate]
  );

  const onTermUpdate = async (data: GlossaryTerm | Glossary) => {
    await handleGlossaryTermUpdate(data as GlossaryTerm);
    // For name change, do not update the feed. It will be updated when the page is redirected to
    // have the new value.
    if (glossaryTerm.name === data.name) {
      getEntityFeedCount();
    }
  };

  const tabItems = useMemo(() => {
    const tabLabelMap = getTabLabelMap(customizedPage?.tabs);

    const items = [
      {
        label: (
          <div data-testid="overview">
            {tabLabelMap[EntityTabs.OVERVIEW] ?? t('label.overview')}
          </div>
        ),
        key: EntityTabs.OVERVIEW,
        children: (
          <GlossaryOverviewTab
            editCustomAttributePermission={
              !isVersionView &&
              (permissions.EditAll || permissions.EditCustomFields)
            }
            onExtensionUpdate={onExtensionUpdate}
            onThreadLinkSelect={onThreadLinkSelect}
          />
        ),
      },
      ...(!isVersionView
        ? [
            {
              label: (
                <div data-testid="terms">
                  {tabLabelMap[EntityTabs.GLOSSARY_TERMS] ??
                    t('label.glossary-term-plural')}
                  <span className="p-l-xs ">
                    {getCountBadge(
                      childGlossaryTerms.length,
                      '',
                      activeTab === 'terms'
                    )}
                  </span>
                </div>
              ),
              key: EntityTabs.GLOSSARY_TERMS,
              children: (
                <GlossaryTermTab
                  className="p-md glossary-term-table-container"
                  isGlossary={false}
                  permissions={permissions}
                  refreshGlossaryTerms={refreshGlossaryTerms}
                  termsLoading={termsLoading}
                  onAddGlossaryTerm={onAddGlossaryTerm}
                  onEditGlossaryTerm={onEditGlossaryTerm}
                />
              ),
            },
            {
              label: (
                <div data-testid="assets">
                  {tabLabelMap[EntityTabs.ASSETS] ?? t('label.asset-plural')}
                  <span className="p-l-xs ">
                    {getCountBadge(assetCount ?? 0, '', activeTab === 'assets')}
                  </span>
                </div>
              ),
              key: EntityTabs.ASSETS,
              children: (
                <AssetsTabs
                  assetCount={assetCount}
                  entityFqn={glossaryTerm.fullyQualifiedName ?? ''}
                  isSummaryPanelOpen={isSummaryPanelOpen}
                  permissions={assetPermissions}
                  ref={assetTabRef}
                  onAddAsset={() => setAssetModalVisible(true)}
                  onAssetClick={onAssetClick}
                  onRemoveAsset={handleAssetSave}
                />
              ),
            },
            {
              label: (
                <TabsLabel
                  count={feedCount.totalCount}
                  id={EntityTabs.ACTIVITY_FEED}
                  isActive={activeTab === EntityTabs.ACTIVITY_FEED}
                  name={
                    tabLabelMap[EntityTabs.ACTIVITY_FEED] ??
                    t('label.activity-feed-and-task-plural')
                  }
                />
              ),
              key: EntityTabs.ACTIVITY_FEED,
              children: (
                <ActivityFeedTab
                  entityType={EntityType.GLOSSARY_TERM}
                  fqn={glossaryTerm.fullyQualifiedName ?? ''}
                  hasGlossaryReviewer={!isEmpty(glossaryTerm.reviewers)}
                  owners={glossaryTerm.owners}
                  onFeedUpdate={getEntityFeedCount}
                  onUpdateEntityDetails={refreshActiveGlossaryTerm}
                />
              ),
            },
            {
              label: (
                <TabsLabel
                  id={EntityTabs.CUSTOM_PROPERTIES}
                  name={
                    tabLabelMap[EntityTabs.CUSTOM_PROPERTIES] ??
                    t('label.custom-property-plural')
                  }
                />
              ),
              key: EntityTabs.CUSTOM_PROPERTIES,
              children: glossaryTerm && (
                <div className="m-sm">
                  <CustomPropertyTable<EntityType.GLOSSARY_TERM>
                    entityDetails={glossaryTerm}
                    entityType={EntityType.GLOSSARY_TERM}
                    handleExtensionUpdate={onExtensionUpdate}
                    hasEditAccess={
                      !isVersionView &&
                      (permissions.EditAll || permissions.EditCustomFields)
                    }
                    hasPermission={permissions.ViewAll}
                    isVersionView={isVersionView}
                  />
                </div>
              ),
            },
          ]
        : []),
    ];

    return getGlossaryTermDetailTabs(items, customizedPage?.tabs);
  }, [
    customizedPage?.tabs,
    glossaryTerm,
    permissions,
    termsLoading,
    activeTab,
    assetCount,
    feedCount.conversationCount,
    feedCount.totalTasksCount,
    isSummaryPanelOpen,
    isVersionView,
    assetPermissions,
    handleAssetSave,
    onExtensionUpdate,
  ]);

  useEffect(() => {
    // Adding manual wait for ES to update assets when glossary term is renamed
    setTimeout(() => {
      fetchGlossaryTermAssets();
    }, 500);
    getEntityFeedCount();
  }, [glossaryFqn]);

  const fetchDocument = useCallback(async () => {
    const pageFQN = `${EntityType.PERSONA}${FQN_SEPARATOR_CHAR}${selectedPersona.fullyQualifiedName}`;
    try {
      const doc = await getDocumentByFQN(pageFQN);
      setCustomizedPage(
        doc.data?.pages?.find((p: Page) => p.pageType === PageType.GlossaryTerm)
      );
    } catch (error) {
      // fail silent
    }
  }, [selectedPersona.fullyQualifiedName]);

  useEffect(() => {
    if (selectedPersona?.fullyQualifiedName) {
      fetchDocument();
    }
  }, [selectedPersona]);

  const updatedGlossaryTerm = useMemo(() => {
    const name = isVersionView
      ? getEntityVersionByField(
          glossaryTerm.changeDescription as ChangeDescription,
          EntityField.NAME,
          glossaryTerm.name
        )
      : glossaryTerm.name;

    const displayName = isVersionView
      ? getEntityVersionByField(
          glossaryTerm.changeDescription as ChangeDescription,
          EntityField.DISPLAYNAME,
          glossaryTerm.displayName
        )
      : glossaryTerm.displayName;

    return {
      ...glossaryTerm,
      name,
      displayName,
    };
  }, [glossaryTerm, isVersionView]);

  return (
    <GenericProvider
      data={updatedGlossaryTerm}
      isVersionView={isVersionView}
      permissions={permissions}
      type={EntityType.GLOSSARY_TERM}
      onUpdate={onTermUpdate}>
      <Row data-testid="glossary-term" gutter={[0, 8]}>
        <Col className="p-x-md" span={24}>
          <GlossaryHeader
            updateVote={updateVote}
            onAddGlossaryTerm={onAddGlossaryTerm}
            onAssetAdd={() => setAssetModalVisible(true)}
            onDelete={handleGlossaryTermDelete}
          />
        </Col>

        <Col span={24}>
          <Tabs
            destroyInactiveTabPane
            activeKey={activeTab}
            className="glossary-tabs custom-tab-spacing"
            items={tabItems}
            onChange={activeTabHandler}
          />
        </Col>
      </Row>
      {glossaryTerm.fullyQualifiedName && assetModalVisible && (
        <AssetSelectionModal
          entityFqn={glossaryTerm.fullyQualifiedName}
          open={assetModalVisible}
          queryFilter={getQueryFilterToExcludeTerm(
            glossaryTerm.fullyQualifiedName
          )}
          type={AssetsOfEntity.GLOSSARY}
          onCancel={() => setAssetModalVisible(false)}
          onSave={handleAssetSave}
        />
      )}
    </GenericProvider>
  );
};

export default GlossaryTermsV1;
