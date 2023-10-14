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
import { isEmpty, isUndefined, uniqBy } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout, Responsive, WidthProvider } from 'react-grid-layout';
import { SIZE } from '../../../enums/common.enum';
import { LandingPageWidgetKeys } from '../../../enums/CustomizablePage.enum';
import { Document } from '../../../generated/entity/docStore/document';
import { WidgetConfig } from '../../../pages/CustomizablePage/CustomizablePage.interface';
import {
  getAddWidgetHandler,
  getLayoutUpdateHandler,
  getRemoveWidgetHandler,
} from '../../../utils/CustomizableLandingPageUtils';
import customizePageClassBase from '../../../utils/CustomizePageClassBase';
import AddWidgetModal from '../../CustomizableComponents/AddWidgetModal/AddWidgetModal';
import EmptyWidgetPlaceholder from '../../CustomizableComponents/EmptyWidgetPlaceholder/EmptyWidgetPlaceholder';
import './right-sidebar.less';
import { RightSidebarProps } from './RightSidebar.interface';

const ResponsiveGridLayout = WidthProvider(Responsive);

const RightSidebar = ({
  announcements,
  isAnnouncementLoading,
  parentLayoutData,
  isEditView = false,
  followedData,
  followedDataCount,
  isLoadingOwnedData,
  layoutConfigData,
  updateParentLayout,
  resetLayout = false,
  handleResetLayout,
}: RightSidebarProps) => {
  const [layout, setLayout] = useState<Array<WidgetConfig>>([
    ...(layoutConfigData?.page?.layout ?? []),
    ...(isEditView
      ? [
          {
            h: 2.3,
            i: LandingPageWidgetKeys.EMPTY_WIDGET_PLACEHOLDER,
            w: 1,
            x: 0,
            y: 100,
            isDraggable: false,
          },
        ]
      : []),
  ]);
  const [placeholderWidgetKey, setPlaceholderWidgetKey] = useState<string>(
    LandingPageWidgetKeys.EMPTY_WIDGET_PLACEHOLDER
  );
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState<boolean>(false);

  const handlePlaceholderWidgetKey = useCallback((value: string) => {
    setPlaceholderWidgetKey(value);
  }, []);

  const handleOpenAddWidgetModal = useCallback(() => {
    setIsWidgetModalOpen(true);
  }, []);

  const handleCloseAddWidgetModal = useCallback(() => {
    setIsWidgetModalOpen(false);
  }, []);

  const handleRemoveWidget = useCallback((widgetKey: string) => {
    setLayout(getRemoveWidgetHandler(widgetKey, 2.3, 2.5));
  }, []);

  const handleAddWidget = useCallback(
    (
      newWidgetData: Document,
      placeholderWidgetKey: string,
      widgetSize: number
    ) => {
      setLayout(
        getAddWidgetHandler(
          newWidgetData,
          placeholderWidgetKey,
          widgetSize,
          customizePageClassBase.landingPageRightContainerMaxGridSize
        )
      );
      setIsWidgetModalOpen(false);
    },
    [layout]
  );

  const getWidgetFromKey = useCallback(
    (widgetConfig: WidgetConfig) => {
      if (widgetConfig.i.endsWith('.EmptyWidgetPlaceholder')) {
        return (
          <div className="h-full">
            <EmptyWidgetPlaceholder
              handleOpenAddWidgetModal={handleOpenAddWidgetModal}
              handlePlaceholderWidgetKey={handlePlaceholderWidgetKey}
              handleRemoveWidget={handleRemoveWidget}
              iconHeight={SIZE.SMALL}
              iconWidth={SIZE.SMALL}
              isEditable={widgetConfig.isDraggable}
              widgetKey={widgetConfig.i}
            />
          </div>
        );
      }

      const Widget = customizePageClassBase.getWidgetsFromKey(widgetConfig.i);

      return (
        <Widget
          announcements={announcements}
          followedData={followedData ?? []}
          followedDataCount={followedDataCount}
          handleRemoveWidget={handleRemoveWidget}
          isEditView={isEditView}
          isLoadingOwnedData={isLoadingOwnedData}
          selectedGridSize={widgetConfig.w}
          widgetKey={widgetConfig.i}
        />
      );
    },
    [
      announcements,
      followedData,
      followedDataCount,
      isLoadingOwnedData,
      isEditView,
      handleRemoveWidget,
      handleOpenAddWidgetModal,
      handlePlaceholderWidgetKey,
    ]
  );

  const widgets = useMemo(
    () =>
      layout
        .filter((widget: WidgetConfig) =>
          !isAnnouncementLoading &&
          widget.i.startsWith(LandingPageWidgetKeys.ANNOUNCEMENTS) &&
          !isEditView
            ? !isEmpty(announcements)
            : true
        )
        .map((widget: WidgetConfig) => (
          <div data-grid={widget} key={widget.i}>
            {getWidgetFromKey(widget)}
          </div>
        )),
    [layout, announcements, getWidgetFromKey, isEditView, isAnnouncementLoading]
  );

  const handleLayoutUpdate = useCallback(
    (updatedLayout: Layout[]) => {
      if (!isEmpty(layout) && !isEmpty(updatedLayout)) {
        setLayout(getLayoutUpdateHandler(updatedLayout));
      }
    },
    [layout]
  );

  const addedWidgetsList = useMemo(
    () =>
      layout
        .filter((widget) => widget.i.startsWith('KnowledgePanel'))
        .map((widget) => widget.i),
    [layout]
  );

  useEffect(() => {
    if (isEditView && !isUndefined(updateParentLayout)) {
      updateParentLayout(
        (parentLayoutData ?? []).map((widget) => {
          if (widget.i === LandingPageWidgetKeys.RIGHT_PANEL) {
            return {
              ...widget,
              data: {
                page: {
                  layout: uniqBy(
                    layout.filter(
                      (widget) => !widget.i.endsWith('.EmptyWidgetPlaceholder')
                    ),
                    'i'
                  ),
                },
              },
            };
          } else {
            return widget;
          }
        })
      );
    }
  }, [layout]);

  useEffect(() => {
    if (resetLayout && handleResetLayout) {
      setLayout([
        ...customizePageClassBase.rightPanelDefaultLayout,
        ...(isEditView
          ? [
              {
                h: 2.3,
                i: LandingPageWidgetKeys.EMPTY_WIDGET_PLACEHOLDER,
                w: 1,
                x: 0,
                y: 100,
                isDraggable: false,
              },
            ]
          : []),
      ]);
      handleResetLayout(false);
    }
  }, [resetLayout]);

  return (
    <>
      <ResponsiveGridLayout
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 1, md: 1, sm: 1, xs: 1, xxs: 1 }}
        containerPadding={[0, customizePageClassBase.landingPageWidgetMargin]}
        draggableHandle=".drag-widget-icon"
        isResizable={false}
        margin={[
          customizePageClassBase.landingPageWidgetMargin,
          customizePageClassBase.landingPageWidgetMargin,
        ]}
        rowHeight={customizePageClassBase.landingPageRowHeight}
        onLayoutChange={handleLayoutUpdate}>
        {widgets}
      </ResponsiveGridLayout>
      {isWidgetModalOpen && (
        <AddWidgetModal
          addedWidgetsList={addedWidgetsList}
          handleAddWidget={handleAddWidget}
          handleCloseAddWidgetModal={handleCloseAddWidgetModal}
          maxGridSizeSupport={
            customizePageClassBase.landingPageRightContainerMaxGridSize
          }
          open={isWidgetModalOpen}
          placeholderWidgetKey={placeholderWidgetKey}
        />
      )}
    </>
  );
};

export default RightSidebar;
