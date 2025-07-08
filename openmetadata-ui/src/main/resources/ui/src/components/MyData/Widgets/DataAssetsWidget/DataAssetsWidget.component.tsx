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
import Icon, { DragOutlined, MoreOutlined } from '@ant-design/icons';
import { Button, Card, Col, Dropdown, Row, Typography } from 'antd';
import { AxiosError } from 'axios';
import { isEmpty, isUndefined } from 'lodash';
import { Bucket } from 'Models';
import { MenuInfo } from 'rc-menu/lib/interface';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from 'react-grid-layout';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ReactComponent as NoDataAssetsPlaceholder } from '../../../../assets/svg/no-folder-data.svg';
import { ROUTES } from '../../../../constants/constants';
import {
  WIDGETS_MORE_MENU_KEYS,
  WIDGETS_MORE_MENU_OPTIONS,
} from '../../../../constants/Widgets.constant';
import { ERROR_PLACEHOLDER_TYPE, SIZE } from '../../../../enums/common.enum';
import { SearchIndex } from '../../../../enums/search.enum';
import {
  WidgetCommonProps,
  WidgetConfig,
} from '../../../../pages/CustomizablePage/CustomizablePage.interface';
import { searchData } from '../../../../rest/miscAPI';
import customizeMyDataPageClassBase from '../../../../utils/CustomizeMyDataPageClassBase';
import { showErrorToast } from '../../../../utils/ToastUtils';
import ErrorPlaceHolder from '../../../common/ErrorWithPlaceholder/ErrorPlaceHolder';
import './data-assets-widget.less';
import DataAssetCard from './DataAssetCard/DataAssetCard.component';

const DataAssetsWidget = ({
  isEditView = false,
  handleRemoveWidget,
  widgetKey,
  handleLayoutUpdate,
  currentLayout,
}: WidgetCommonProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState<boolean>(false);
  const [services, setServices] = useState<Bucket[]>([]);

  const widgetIcon = useMemo(() => {
    return customizeMyDataPageClassBase.getWidgetIconFromKey(widgetKey);
  }, [widgetKey]);

  const fetchDataAssets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await searchData('', 0, 0, '', 'updatedAt', '', [
        SearchIndex.TABLE,
        SearchIndex.TOPIC,
        SearchIndex.DASHBOARD,
        SearchIndex.PIPELINE,
        SearchIndex.MLMODEL,
        SearchIndex.CONTAINER,
        SearchIndex.SEARCH_INDEX,
        SearchIndex.API_ENDPOINT_INDEX,
      ]);
      setServices(res?.data.aggregations?.['sterms#serviceType'].buckets);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCloseClick = useCallback(() => {
    !isUndefined(handleRemoveWidget) && handleRemoveWidget(widgetKey);
  }, [widgetKey]);

  const handleSizeChange = useCallback(
    (value: number) => {
      if (handleLayoutUpdate) {
        const hasCurrentWidget = currentLayout?.find(
          (layout: WidgetConfig) => layout.i === widgetKey
        );

        const updatedLayout = hasCurrentWidget
          ? currentLayout?.map((layout: WidgetConfig) =>
              layout.i === widgetKey ? { ...layout, w: value } : layout
            )
          : [
              ...(currentLayout || []),
              {
                ...customizeMyDataPageClassBase.defaultLayout.find(
                  (layout: WidgetConfig) => layout.i === widgetKey
                ),
                i: widgetKey,
                w: value,
              },
            ];

        handleLayoutUpdate(updatedLayout as Layout[]);
      }
    },
    [currentLayout, handleLayoutUpdate, widgetKey]
  );

  const handleMoreClick = (e: MenuInfo) => {
    if (e.key === WIDGETS_MORE_MENU_KEYS.REMOVE_WIDGET) {
      handleCloseClick();
    } else if (e.key === WIDGETS_MORE_MENU_KEYS.HALF_SIZE) {
      handleSizeChange(1);
    } else if (e.key === WIDGETS_MORE_MENU_KEYS.FULL_SIZE) {
      handleSizeChange(2);
    }
  };

  useEffect(() => {
    fetchDataAssets();
  }, []);

  const header = useMemo(
    () => (
      <Row className="data-assets-header" justify="space-between">
        <Col className="d-flex items-center h-full min-h-8">
          <div className="d-flex h-6 w-6 m-r-xs">
            <Icon
              className="data-assets-widget-icon display-xs"
              component={widgetIcon as any}
            />
          </div>

          <Typography.Paragraph
            className="ant-typography-ellipsis ant-typography-single-line ant-typography-ellipsis-single-line"
            ellipsis={{ tooltip: true }}
            style={{
              maxWidth: '525px',
              fontWeight: 500,
              fontSize: '16px',
              lineHeight: '28px',
              marginBottom: 0,
            }}>
            {t('label.data-asset-plural')}
          </Typography.Paragraph>
        </Col>

        <Col>
          <div style={{ display: 'flex', gap: '8px' }}>
            {isEditView && (
              <>
                <DragOutlined
                  className="drag-widget-icon cursor-pointer widget-header-options"
                  data-testid="drag-widget-button"
                  size={20}
                />
                <Dropdown
                  className="widget-header-options"
                  data-testid="more-button"
                  menu={{
                    items: WIDGETS_MORE_MENU_OPTIONS,
                    selectable: true,
                    multiple: false,
                    onClick: handleMoreClick,
                    className: 'widget-header-menu',
                  }}
                  placement="bottomLeft"
                  trigger={['click']}>
                  <Button
                    className=""
                    data-testid="more-button"
                    icon={
                      <MoreOutlined
                        data-testid="more-widget-button"
                        size={20}
                      />
                    }
                  />
                </Dropdown>
              </>
            )}
          </div>
        </Col>
      </Row>
    ),
    [isEditView, widgetIcon, handleMoreClick]
  );

  const emptyState = useMemo(
    () => (
      <ErrorPlaceHolder
        className="border-none p-t-box"
        icon={
          <NoDataAssetsPlaceholder height={SIZE.LARGE} width={SIZE.LARGE} />
        }
        type={ERROR_PLACEHOLDER_TYPE.CUSTOM}>
        <div className="d-flex flex-col items-center">
          <Typography.Text className="text-md font-semibold m-b-sm">
            {t('message.no-data-assets-yet')}
          </Typography.Text>
          <Typography.Text className="placeholder-text text-sm font-regular">
            {t('message.no-data-assets-message')}
          </Typography.Text>
          <Button
            className="m-t-md"
            type="primary"
            onClick={() => {
              navigate(ROUTES.EXPLORE);
            }}>
            {t('label.add-entity', {
              entity: t('label.data-asset-plural'),
            })}
          </Button>
        </div>
      </ErrorPlaceHolder>
    ),
    [t, navigate]
  );

  const dataAssetsContent = useMemo(
    () => (
      <div className="cards-scroll-container flex-1 overflow-y-auto">
        <Row className="d-flex gap-4 flex-wrap flex-1" gutter={[16, 16]}>
          {services.map((service) => (
            <Col key={service.key} lg={6} md={8} sm={12} xl={6} xs={24} xxl={4}>
              <DataAssetCard service={service} />
            </Col>
          ))}
        </Row>
      </div>
    ),
    [services]
  );

  const bodyContent = useMemo(
    () => (
      <div className="data-assets-explore-widget-body">
        {isEmpty(services) ? emptyState : dataAssetsContent}
      </div>
    ),
    [services, emptyState, dataAssetsContent]
  );

  return (
    <Card
      className="data-assets-explore-widget-container card-widget"
      data-testid="data-assets-widget"
      loading={loading}>
      {header}
      {bodyContent}
    </Card>
  );
};

export default DataAssetsWidget;
