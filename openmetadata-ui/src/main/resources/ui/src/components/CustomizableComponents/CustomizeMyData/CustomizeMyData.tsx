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

import { AxiosError } from 'axios';
import classNames from 'classnames';
import { isEmpty, isNil, uniqBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { useLocation } from 'react-router-dom';
import AppState from '../../../AppState';
import {
  LANDING_PAGE_LAYOUT,
  LANDING_PAGE_OUTER_WIDGETS,
  LANDING_PAGE_ROW_HEIGHT,
  LANDING_PAGE_WIDGET_MARGIN,
} from '../../../constants/CustomisePage.constants';
import { LandingPageWidgetKeys } from '../../../enums/CustomizablePage.enum';
import { AssetsType } from '../../../enums/entity.enum';
import { Document } from '../../../generated/entity/docStore/document';
import { EntityReference } from '../../../generated/entity/type';
import { useAuth } from '../../../hooks/authHooks';
import { WidgetConfig } from '../../../pages/CustomisablePages/CustomisablePage.interface';
import '../../../pages/MyDataPage/my-data.less';
import { getUserById } from '../../../rest/userAPI';
import {
  getAddWidgetHandler,
  getLayoutUpdateHandler,
  getRemoveWidgetHandler,
} from '../../../utils/CustomizableLandingPageUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import ActivityFeedProvider from '../../ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import KPIWidget from '../../KPIWidget/KPIWidget.component';
import { MyDataWidget } from '../../MyData/MyDataWidget/MyDataWidget.component';
import RightSidebar from '../../MyData/RightSidebar/RightSidebar.component';
import TotalDataAssetsWidget from '../../TotalDataAssetsWidget/TotalDataAssetsWidget.component';
import FeedsWidget from '../../Widgets/FeedsWidget/FeedsWidget.component';
import AddWidgetModal from '../AddWidgetModal/AddWidgetModal';
import EmptyWidgetPlaceholder from '../EmptyWidgetPlaceholder/EmptyWidgetPlaceholder';
import { CustomizeMyDataProps } from './CustomizeMyData.interface';

const ResponsiveGridLayout = WidthProvider(Responsive);

function CustomizeMyData({
  initialPageData,
  handlePageDataChange,
}: Readonly<CustomizeMyDataProps>) {
  const location = useLocation();
  const [layout, setLayout] = useState<Array<WidgetConfig>>([
    ...(initialPageData.data?.page?.layout ?? LANDING_PAGE_LAYOUT),
    {
      h: 2,
      i: 'ExtraWidget.EmptyWidgetPlaceholder',
      w: 3,
      x: 0,
      y: 100,
      isDraggable: false,
    },
  ]);
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState<boolean>(false);
  const { isAuthDisabled } = useAuth(location.pathname);
  const [followedData, setFollowedData] = useState<Array<EntityReference>>();
  const [followedDataCount, setFollowedDataCount] = useState(0);
  const [isLoadingOwnedData, setIsLoadingOwnedData] = useState<boolean>(false);

  const currentUser = useMemo(
    () => AppState.getCurrentUserDetails(),
    [AppState.userDetails, AppState.nonSecureUserDetails]
  );

  const handleLayoutChange = useCallback((newLayout: Array<WidgetConfig>) => {
    setLayout(newLayout);
  }, []);

  const handleRemoveWidget = useCallback((widgetKey: string) => {
    setLayout(getRemoveWidgetHandler(widgetKey, 3, 3.5));
  }, []);

  const handleAddWidget = useCallback(
    (newWidgetData: Document) => {
      setLayout(getAddWidgetHandler(newWidgetData));
      setIsWidgetModalOpen(false);
    },
    [layout]
  );

  const handleLayoutUpdate = useCallback(
    (updatedLayout: Layout[]) => {
      if (!isEmpty(layout) && !isEmpty(updatedLayout)) {
        setLayout(getLayoutUpdateHandler(updatedLayout));
      }
    },
    [layout]
  );

  const handleOpenAddWidgetModal = useCallback(() => {
    setIsWidgetModalOpen(true);
  }, []);

  const handleCloseAddWidgetModal = useCallback(() => {
    setIsWidgetModalOpen(false);
  }, []);

  const fetchMyData = async () => {
    if (!currentUser?.id) {
      return;
    }
    setIsLoadingOwnedData(true);
    try {
      const userData = await getUserById(currentUser?.id, 'follows, owns');

      if (userData) {
        const includeData = Object.values(AssetsType);
        const follows: EntityReference[] = userData.follows ?? [];
        const includedFollowsData = follows.filter((data) =>
          includeData.includes(data.type as AssetsType)
        );
        setFollowedDataCount(includedFollowsData.length);
        setFollowedData(includedFollowsData.slice(0, 8));
      }
    } catch (err) {
      setFollowedData([]);
      showErrorToast(err as AxiosError);
    } finally {
      setIsLoadingOwnedData(false);
    }
  };

  const getWidgetFromKey = useCallback(
    (widgetConfig: WidgetConfig) => {
      if (widgetConfig.i.endsWith('.EmptyWidgetPlaceholder')) {
        return (
          <EmptyWidgetPlaceholder
            handleOpenAddWidgetModal={handleOpenAddWidgetModal}
            handleRemoveWidget={handleRemoveWidget}
            isEditable={widgetConfig.isDraggable}
            widgetKey={widgetConfig.i}
          />
        );
      }

      switch (widgetConfig.i) {
        case LandingPageWidgetKeys.ACTIVITY_FEED:
          return (
            <FeedsWidget isEditView handleRemoveWidget={handleRemoveWidget} />
          );

        case LandingPageWidgetKeys.MY_DATA:
          return (
            <MyDataWidget isEditView handleRemoveWidget={handleRemoveWidget} />
          );

        case LandingPageWidgetKeys.KPI:
          return (
            <KPIWidget isEditView handleRemoveWidget={handleRemoveWidget} />
          );

        case LandingPageWidgetKeys.TOTAL_DATA_ASSETS:
          return (
            <TotalDataAssetsWidget
              isEditView
              handleRemoveWidget={handleRemoveWidget}
            />
          );

        case LandingPageWidgetKeys.RIGHT_PANEL:
          return (
            <div className="h-full border-left">
              <RightSidebar
                isEditView
                followedData={followedData ?? []}
                followedDataCount={followedDataCount}
                isLoadingOwnedData={isLoadingOwnedData}
                layoutConfigData={widgetConfig.data}
                parentLayoutData={layout}
                updateParentLayout={handleLayoutChange}
              />
            </div>
          );

        default:
          return;
      }
    },
    [
      handleOpenAddWidgetModal,
      handleRemoveWidget,
      followedData,
      followedDataCount,
      isLoadingOwnedData,
      layout,
      handleLayoutChange,
    ]
  );

  const addedWidgetsList = useMemo(
    () =>
      LANDING_PAGE_OUTER_WIDGETS.filter((widget) =>
        layout.some((item) => item.i === widget)
      ),
    [layout]
  );

  const widgets = useMemo(
    () =>
      layout.map((widget) => (
        <div
          className={classNames({
            'mt--1': widget.i === LandingPageWidgetKeys.RIGHT_PANEL,
          })}
          data-grid={widget}
          key={widget.i}>
          {getWidgetFromKey(widget)}
        </div>
      )),
    [layout, getWidgetFromKey]
  );

  useEffect(() => {
    handlePageDataChange({
      ...initialPageData,
      data: {
        page: {
          ...initialPageData.data.page,
          layout: uniqBy(
            layout.filter(
              (widget) => !widget.i.endsWith('.EmptyWidgetPlaceholder')
            ),
            'i'
          ),
        },
      },
    });
  }, [layout]);

  useEffect(() => {
    if (
      ((isAuthDisabled && AppState.users.length) ||
        !isEmpty(AppState.userDetails)) &&
      isNil(followedData)
    ) {
      fetchMyData();
    }
  }, [AppState.userDetails, AppState.users, isAuthDisabled]);

  return (
    <ActivityFeedProvider>
      <ResponsiveGridLayout
        autoSize
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        className="bg-white"
        cols={{ lg: 4, md: 4, sm: 4, xs: 4, xxs: 4 }}
        draggableHandle=".drag-widget-icon"
        isResizable={false}
        margin={[LANDING_PAGE_WIDGET_MARGIN, LANDING_PAGE_WIDGET_MARGIN]}
        rowHeight={LANDING_PAGE_ROW_HEIGHT}
        onLayoutChange={handleLayoutUpdate}>
        {widgets}
      </ResponsiveGridLayout>
      {isWidgetModalOpen && (
        <AddWidgetModal
          addedWidgetsList={addedWidgetsList}
          handleAddWidget={handleAddWidget}
          handleCloseAddWidgetModal={handleCloseAddWidgetModal}
          open={isWidgetModalOpen}
          widgetsToShow={LANDING_PAGE_OUTER_WIDGETS}
        />
      )}
    </ActivityFeedProvider>
  );
}

export default CustomizeMyData;
