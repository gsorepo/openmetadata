/*
 *  Copyright 2024 Collate.
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
import Icon from '@ant-design/icons';
import { Input, Modal, Tooltip } from 'antd';
import { isEmpty, isNil, toString, uniqueId } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import RGL, { Layout, WidthProvider } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { ReactComponent as EditIcon } from '../../../../assets/svg/edit-new.svg';
import { CommonWidgetType } from '../../../../constants/CustomizeWidgets.constants';
import { EntityTabs } from '../../../../enums/entity.enum';
import { Document } from '../../../../generated/entity/docStore/document';
import { Page, Tab } from '../../../../generated/system/ui/page';
import { PageType } from '../../../../generated/system/ui/uiCustomization';
import { useGridLayoutDirection } from '../../../../hooks/useGridLayoutDirection';
import {
  WidgetCommonProps,
  WidgetConfig,
} from '../../../../pages/CustomizablePage/CustomizablePage.interface';
import { useCustomizeStore } from '../../../../pages/CustomizablePage/CustomizeStore';
import customizeGlossaryTermPageClassBase from '../../../../utils/CustomiseGlossaryTermPage/CustomizeGlossaryTermPage';
import {
  getAddWidgetHandler,
  getLayoutUpdateHandler,
  getLayoutWithEmptyWidgetPlaceholder,
  getRemoveWidgetHandler,
  getUniqueFilteredLayout,
} from '../../../../utils/CustomizableLandingPageUtils';
import {
  getCustomizableWidgetByPage,
  getDefaultTabs,
  getDefaultWidgetForTab,
} from '../../../../utils/CustomizePage/CustomizePageUtils';
import { getEntityName } from '../../../../utils/EntityUtils';
import { getWidgetFromKey } from '../../../../utils/GlossaryTerm/GlossaryTermUtil';
import { DraggableTabs } from '../../../common/DraggableTabs/DraggableTabs';
import AddDetailsPageWidgetModal from '../../../MyData/CustomizableComponents/AddDetailsPageWidgetModal/AddDetailsPageWidgetModal';

const ReactGridLayout = WidthProvider(RGL);

export type CustomizeTabWidgetProps = WidgetCommonProps;

type TargetKey = React.MouseEvent | React.KeyboardEvent | string;

export const CustomizeTabWidget = () => {
  const { currentPage, currentPageType, updateCurrentPage } =
    useCustomizeStore();
  const [items, setItems] = useState<Tab[]>(
    currentPage?.tabs ?? getDefaultTabs(currentPageType as PageType)
  );
  const [activeKey, setActiveKey] = useState<string | null>(
    (items[0]?.id as EntityTabs) ?? null
  );
  const { t } = useTranslation();

  const [editableItem, setEditableItem] = useState<Tab | null>(null);
  const [tabLayouts, setTabLayouts] = useState<WidgetConfig[]>(
    getLayoutWithEmptyWidgetPlaceholder(
      (items.find((item) => item.id === activeKey)?.layout as WidgetConfig[]) ??
        getDefaultWidgetForTab(
          currentPageType as PageType,
          (activeKey as EntityTabs) ?? EntityTabs.OVERVIEW
        ),
      2,
      3
    )
  );
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState<boolean>(false);
  const [placeholderWidgetKey, setPlaceholderWidgetKey] = useState<string>('');

  const onChange = (tabKey: string) => {
    const key = tabKey as EntityTabs;
    setActiveKey(key);
    const newTab = items.find((item) => item.id === key);
    setTabLayouts(
      getLayoutWithEmptyWidgetPlaceholder(
        isEmpty(newTab?.layout)
          ? getDefaultWidgetForTab(currentPageType as PageType, key)
          : (newTab?.layout as WidgetConfig[]),
        2,
        3
      )
    );
  };

  const add = () => {
    const newActiveKey = uniqueId(`newTab`);
    setItems((items) => [
      ...items,
      {
        name: 'New Tab',
        layout: [],
        id: newActiveKey,
        editable: true,
      } as Tab,
    ]);
    onChange(newActiveKey);
  };

  const remove = (targetKey: TargetKey) => {
    let newActiveKey = activeKey;
    let lastIndex = -1;
    items.forEach((item, i) => {
      if (item.id === targetKey) {
        lastIndex = i - 1;
      }
    });
    const newPanes = items.filter((item) => item.id !== targetKey);
    if (newPanes.length && newActiveKey === targetKey) {
      if (lastIndex >= 0) {
        newActiveKey = newPanes[lastIndex].id as EntityTabs;
      } else {
        newActiveKey = newPanes[0].id as EntityTabs;
      }
    }
    setItems(newPanes);
    onChange(newActiveKey ?? EntityTabs.OVERVIEW);
  };

  const onEdit = (
    targetKey: React.MouseEvent | React.KeyboardEvent | string,
    action: 'add' | 'remove'
  ) => {
    if (action === 'add') {
      add();
    } else {
      remove(targetKey);
    }
  };

  const handleTabEditClick = (key: string) => {
    setEditableItem(items.find((item) => item.id === key) || null);
  };

  const handleRenameSave = () => {
    if (editableItem) {
      const newItems = items.map((item) =>
        item.id === editableItem.id ? editableItem : item
      );
      setItems(newItems);
      updateCurrentPage({
        ...currentPage,
        tabs: newItems,
      } as Page);
      setEditableItem(null);
    }
  };

  const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    editableItem &&
      setEditableItem({
        ...editableItem,
        displayName: event.target.value ?? '',
      });
  };

  const handleOpenAddWidgetModal = () => {
    setIsWidgetModalOpen(true);
  };

  const handlePlaceholderWidgetKey = (value: string) => {
    setPlaceholderWidgetKey(value);
  };

  const handleRemoveWidget = (widgetKey: string) => {
    setTabLayouts(getRemoveWidgetHandler(widgetKey, 3, 3.5));
  };

  const widgets = useMemo(
    () =>
      tabLayouts.map((widget) => (
        <div data-grid={widget} id={widget.i} key={widget.i}>
          {getWidgetFromKey({
            widgetConfig: widget,
            handleOpenAddWidgetModal: handleOpenAddWidgetModal,
            handlePlaceholderWidgetKey: handlePlaceholderWidgetKey,
            handleRemoveWidget: handleRemoveWidget,
            isEditView: true,
          })}
        </div>
      )),
    [tabLayouts]
  );

  const handleLayoutUpdate = useCallback(
    (updatedLayout: Layout[]) => {
      if (!isEmpty(tabLayouts) && !isEmpty(updatedLayout)) {
        setTabLayouts(getLayoutUpdateHandler(updatedLayout));
        updateCurrentPage({
          ...currentPage,
          tabs: items.map((item) =>
            item.id === activeKey
              ? { ...item, layout: getUniqueFilteredLayout(updatedLayout) }
              : item
          ),
        } as Page);
      }
    },
    [tabLayouts]
  );

  const handleMainPanelAddWidget = useCallback(
    (
      newWidgetData: CommonWidgetType,
      placeholderWidgetKey: string,
      widgetSize: number
    ) => {
      setTabLayouts(
        getAddWidgetHandler(
          newWidgetData as unknown as Document,
          placeholderWidgetKey,
          widgetSize,
          customizeGlossaryTermPageClassBase.detailPageMaxGridSize
        )
      );
      setIsWidgetModalOpen(false);
    },
    []
  );

  const onTabPositionChange = (newOrder: React.Key[]) => {
    const newItems = newOrder.map(
      (key) => items.find((item) => item.id === key) as Tab
    );
    setItems(newItems);

    updateCurrentPage({
      ...currentPage,
      tabs: newItems,
    } as Page);
  };

  // eslint-disable-next-line no-console
  console.log('widgets', tabLayouts, currentPage);

  // call the hook to set the direction of the grid layout
  useGridLayoutDirection();

  return (
    <>
      <DraggableTabs
        activeKey={activeKey ?? undefined}
        items={items.map((item) => ({
          key: item.id,
          label: (
            <span
              onClick={(event) => {
                event.stopPropagation();
                item.editable && onChange(item.id);
              }}>
              <Tooltip
                title={
                  item.editable ? '' : t('message.no-customization-available')
                }>
                {getEntityName(item)}
                <Icon
                  className="m-l-xs "
                  component={EditIcon}
                  onClick={(event) => {
                    event.stopPropagation();
                    handleTabEditClick(item.id);
                  }}
                />
              </Tooltip>
            </span>
          ),
          closable: true,
        }))}
        size="small"
        tabBarGutter={2}
        type="editable-card"
        onChange={onChange}
        onEdit={onEdit}
        onTabChange={onTabPositionChange}
      />

      <ReactGridLayout
        className="grid-container"
        cols={8}
        draggableHandle=".drag-widget-icon"
        margin={[
          customizeGlossaryTermPageClassBase.detailPageWidgetMargin,
          customizeGlossaryTermPageClassBase.detailPageWidgetMargin,
        ]}
        rowHeight={customizeGlossaryTermPageClassBase.detailPageRowHeight}
        onLayoutChange={handleLayoutUpdate}>
        {widgets}
      </ReactGridLayout>

      {currentPageType && (
        <AddDetailsPageWidgetModal
          addedWidgetsList={[]}
          handleAddWidget={handleMainPanelAddWidget}
          handleCloseAddWidgetModal={() => setIsWidgetModalOpen(false)}
          maxGridSizeSupport={8}
          open={isWidgetModalOpen}
          placeholderWidgetKey={placeholderWidgetKey}
          widgetsList={getCustomizableWidgetByPage(currentPageType)}
        />
      )}
      {editableItem && (
        <Modal
          maskClosable
          open={!isNil(editableItem)}
          title="Rename tab"
          onCancel={() => setEditableItem(null)}
          onOk={handleRenameSave}>
          <Input
            value={toString(getEntityName(editableItem))}
            onChange={handleChange}
          />
        </Modal>
      )}
    </>
  );
};
