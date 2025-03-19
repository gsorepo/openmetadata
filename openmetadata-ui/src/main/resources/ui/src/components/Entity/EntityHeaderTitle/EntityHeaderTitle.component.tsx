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
import Icon, { ExclamationCircleFilled } from '@ant-design/icons';
import { Badge, Button, Col, Divider, Row, Tooltip, Typography } from 'antd';
import classNames from 'classnames';
import { capitalize, isEmpty } from 'lodash';
import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ReactComponent as ShareIcon } from '../../../assets/svg/copy-right.svg';
import { ReactComponent as IconExternalLink } from '../../../assets/svg/external-link-grey.svg';
import { ReactComponent as StarFilledIcon } from '../../../assets/svg/ic-star-filled.svg';
import { TEXT_COLOR } from '../../../constants/Color.constants';
import { ROUTES } from '../../../constants/constants';
import { useClipboard } from '../../../hooks/useClipBoard';
import useCustomLocation from '../../../hooks/useCustomLocation/useCustomLocation';
import { stringToHTML } from '../../../utils/StringsUtils';
import CertificationTag from '../../common/CertificationTag/CertificationTag';
import './entity-header-title.less';
import { EntityHeaderTitleProps } from './EntityHeaderTitle.interface';

const EntityHeaderTitle = ({
  icon,
  name,
  displayName,
  link,
  openEntityInNewPage,
  deleted = false,
  serviceName,
  badge,
  isDisabled,
  className,
  color,
  showName = true,
  certification,
  excludeEntityService,
  isFollowing,
  isFollowingLoading,
  handleFollowingClick,
  entityType,
  nameClassName = '',
  displayNameClassName = '',
  isCustomizedView = false,
}: EntityHeaderTitleProps) => {
  const { t } = useTranslation();
  const location = useCustomLocation();
  const [copyTooltip, setCopyTooltip] = useState<string>();
  const { onCopyToClipBoard } = useClipboard(window.location.href);

  const handleShareButtonClick = async () => {
    await onCopyToClipBoard();
    setCopyTooltip(t('message.link-copy-to-clipboard'));
    setTimeout(() => setCopyTooltip(''), 2000);
  };

  const isTourRoute = useMemo(
    () => location.pathname.includes(ROUTES.TOUR),
    [location.pathname]
  );

  const content = (
    <Row
      align="middle"
      className={classNames('entity-header-title', className)}
      data-testid={`${serviceName}-${name}`}
      gutter={12}
      wrap={false}>
      {icon && <Col className="flex-center">{icon}</Col>}
      <Col
        className={`d-flex flex-col gap-2 ${
          deleted || badge ? 'w-max-full-140' : 'entity-header-content'
        }`}>
        {/* If we do not have displayName name only be shown in the bold from the below code */}
        {!isEmpty(displayName) && showName ? (
          <Tooltip placement="bottom" title={stringToHTML(name)}>
            <Typography.Text
              className={classNames(
                'entity-header-name',
                nameClassName,
                'm-b-0 d-block display-sm font-semibold'
              )}
              data-testid="entity-header-name"
              ellipsis={{ tooltip: true }}>
              {stringToHTML(name)}
            </Typography.Text>
          </Tooltip>
        ) : null}

        <div
          className="d-flex gap-3 items-center"
          data-testid="entity-header-title">
          <Tooltip placement="bottom" title={stringToHTML(displayName || name)}>
            <Typography.Text
              className={classNames(
                'entity-header-display-name',
                displayNameClassName,
                'm-b-0 text-md font-medium'
              )}
              data-testid="entity-header-display-name"
              ellipsis={{ tooltip: true }}
              style={{ color: color ?? TEXT_COLOR }}>
              {stringToHTML(displayName || name)}
              {openEntityInNewPage && (
                <IconExternalLink
                  className="anticon vertical-baseline m-l-xss"
                  height={14}
                  width={14}
                />
              )}
            </Typography.Text>
          </Tooltip>

          <Tooltip
            placement="topRight"
            title={copyTooltip ?? t('message.copy-to-clipboard')}>
            <Button
              className="remove-button-default-styling copy-button flex-center p-xss "
              icon={<Icon component={ShareIcon} />}
              onClick={handleShareButtonClick}
            />
          </Tooltip>
          {!excludeEntityService &&
            !deleted &&
            !isCustomizedView &&
            handleFollowingClick && (
              <Tooltip
                title={t('label.field-entity', {
                  field: t(`label.${isFollowing ? 'un-follow' : 'follow'}`),
                  entity: capitalize(entityType),
                })}>
                <Button
                  className="entity-follow-button flex-center gap-1 text-sm "
                  data-testid="entity-follow-button"
                  disabled={deleted}
                  icon={<Icon component={StarFilledIcon} />}
                  loading={isFollowingLoading}
                  onClick={handleFollowingClick}>
                  <Typography.Text>
                    {isFollowing ? 'Following' : 'Follow'}
                  </Typography.Text>
                </Button>
              </Tooltip>
            )}
        </div>
      </Col>
      {certification && (
        <Col className="text-xs">
          <div className="d-flex items-center">
            <Divider className="m-x-xs h-6 m-r-sm" type="vertical" />
            <CertificationTag certification={certification} />
          </div>
        </Col>
      )}
      {isDisabled && (
        <Badge
          className="m-l-xs badge-grey"
          count={t('label.disabled')}
          data-testid="disabled"
        />
      )}
      {deleted && (
        <Col className="text-xs" flex="100px">
          <span className="deleted-badge-button" data-testid="deleted-badge">
            <ExclamationCircleFilled className="m-r-xss font-medium text-xs" />
            {t('label.deleted')}
          </span>
        </Col>
      )}
      {badge && <Col>{badge}</Col>}
    </Row>
  );

  return link && !isTourRoute ? (
    <Link
      className="no-underline d-inline-block w-full"
      data-testid="entity-link"
      target={openEntityInNewPage ? '_blank' : '_self'}
      to={link}>
      {content}
    </Link>
  ) : (
    content
  );
};

export default EntityHeaderTitle;
