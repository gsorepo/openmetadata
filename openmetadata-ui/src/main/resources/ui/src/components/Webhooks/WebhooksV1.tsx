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

import { Card, Col, Row, Select, Space } from 'antd';
import classNames from 'classnames';
import { isNil } from 'lodash';
import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  PAGE_SIZE,
  TITLE_FOR_NON_ADMIN_ACTION,
} from '../../constants/constants';
import {
  MS_TEAMS_LISTING_TEXT,
  SLACK_LISTING_TEXT,
  WEBHOOK_LISTING_TEXT,
} from '../../constants/HelperTextUtil';
import { WebhookType } from '../../generated/api/events/createWebhook';
import { Webhook } from '../../generated/entity/events/webhook';
import { useAuth } from '../../hooks/authHooks';
import { statuses } from '../AddWebhook/WebhookConstants';
import { Button } from '../buttons/Button/Button';
import ErrorPlaceHolder from '../common/error-with-placeholder/ErrorPlaceHolder';
import NextPrevious from '../common/next-previous/NextPrevious';
import NonAdminAction from '../common/non-admin-action/NonAdminAction';
import WebhookDataCard from '../common/webhook-data-card/WebhookDataCard';
import { leftPanelAntCardStyle } from '../containers/PageLayout';
import { WebhooksV1Props } from './WebhooksV1.interface';
import './webhookV1.less';

const LISTING_TEXT: { [key: string]: string } = {
  msteams: MS_TEAMS_LISTING_TEXT,
  slack: SLACK_LISTING_TEXT,
  generic: WEBHOOK_LISTING_TEXT,
};

const WEBHOOKS_INTEGRATION: { [key: string]: string } = {
  msteams: 'MS Teams',
  slack: 'Slack',
  generic: 'Webhook',
};

const WebhooksV1: FC<WebhooksV1Props> = ({
  data = [],
  webhookType = WebhookType.Generic,
  paging,
  selectedStatus = [],
  onAddWebhook,
  onClickWebhook,
  onPageChange,
  onStatusFilter,
  currentPage,
}) => {
  const { isAuthDisabled, isAdminUser } = useAuth();
  const [filteredData, setFilteredData] = useState<Array<Webhook>>(data);

  const getFilteredWebhooks = () => {
    return selectedStatus.length
      ? data.filter(
          (item) => item.status && selectedStatus.includes(item.status)
        )
      : data;
  };

  const rightPanel = useMemo(() => {
    return (
      <Card
        data-testid="data-summary-container"
        size="small"
        style={leftPanelAntCardStyle}>
        <div className="tw-my-2">{LISTING_TEXT[webhookType]}</div>
      </Card>
    );
  }, []);

  const fetchErrorPlaceHolder = useMemo(
    () => (message: string) => {
      return (
        <ErrorPlaceHolder>
          <p className="tw-text-center">{message}</p>
          <p className="tw-text-center">
            <NonAdminAction
              position="bottom"
              title={TITLE_FOR_NON_ADMIN_ACTION}>
              <Button
                className={classNames('tw-h-8 tw-rounded tw-my-3', {
                  'tw-opacity-40': !isAdminUser && !isAuthDisabled,
                })}
                data-testid="add-webhook-button"
                size="small"
                theme="primary"
                variant="contained"
                onClick={onAddWebhook}>
                Add {WEBHOOKS_INTEGRATION[webhookType]}
              </Button>
            </NonAdminAction>
          </p>
        </ErrorPlaceHolder>
      );
    },
    []
  );

  useEffect(() => {
    setFilteredData(getFilteredWebhooks());
  }, [data, selectedStatus]);

  if (data.length === 0) {
    return fetchErrorPlaceHolder(
      `No ${WEBHOOKS_INTEGRATION[webhookType]} found`
    );
  }

  return (
    <Row gutter={[16, 16]}>
      <Col flex="auto">
        <Row gutter={[16, 16]}>
          <Col xs={18}>
            <Select
              showArrow
              bordered={false}
              className="tw-text-body webhook-filter-select cursor-pointer"
              mode="multiple"
              options={statuses}
              placeholder="Filter by status"
              style={{ minWidth: '148px' }}
              onChange={onStatusFilter}
            />
          </Col>
          <Col xs={6}>
            <Space
              align="center"
              className="tw-w-full tw-justify-end"
              size={16}>
              {filteredData.length > 0 && (
                <NonAdminAction
                  position="bottom"
                  title={TITLE_FOR_NON_ADMIN_ACTION}>
                  <Button
                    className={classNames('tw-h-8 tw-rounded ', {
                      'tw-opacity-40': !isAdminUser && !isAuthDisabled,
                    })}
                    data-testid="add-webhook-button"
                    size="small"
                    theme="primary"
                    variant="contained"
                    onClick={onAddWebhook}>
                    Add {WEBHOOKS_INTEGRATION[webhookType]}
                  </Button>
                </NonAdminAction>
              )}
            </Space>
          </Col>
          <Col xs={24}>
            {filteredData.length ? (
              <>
                {filteredData.map((webhook, index) => (
                  <div className="tw-mb-3" key={index}>
                    <WebhookDataCard
                      description={webhook.description}
                      endpoint={webhook.endpoint}
                      name={webhook.name}
                      status={webhook.status}
                      type={webhook.webhookType}
                      onClick={onClickWebhook}
                    />
                  </div>
                ))}
                {Boolean(!isNil(paging.after) || !isNil(paging.before)) && (
                  <NextPrevious
                    currentPage={currentPage}
                    pageSize={PAGE_SIZE}
                    paging={paging}
                    pagingHandler={onPageChange}
                    totalCount={paging.total}
                  />
                )}
              </>
            ) : (
              fetchErrorPlaceHolder('No webhooks found for applied filters')
            )}
          </Col>
        </Row>
      </Col>
      <Col flex="312px">
        <div className="webhook-right-panel">{rightPanel}</div>
      </Col>
    </Row>
  );
};

export default WebhooksV1;
