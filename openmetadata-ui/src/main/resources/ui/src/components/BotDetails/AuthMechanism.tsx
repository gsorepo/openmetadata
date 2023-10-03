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

import { Button, Divider, Input, Space, Typography } from 'antd';
import { t } from 'i18next';
import React, { FC } from 'react';
import { AuthenticationMechanism } from '../../generated/entity/teams/user';
import { getTokenExpiry } from '../../utils/BotsUtils';
import SVGIcons from '../../utils/SvgUtils';
import CopyToClipboardButton from '../buttons/CopyToClipboardButton/CopyToClipboardButton';
import './AuthMechanism.less';

interface Props {
  authenticationMechanism: AuthenticationMechanism;
  hasPermission: boolean;
  onEdit: () => void;
  onTokenRevoke: () => void;
}

const AuthMechanism: FC<Props> = ({
  authenticationMechanism,
  hasPermission,
  onEdit,
  onTokenRevoke,
}: Props) => {
  const JWTToken = authenticationMechanism.config?.JWTToken;
  const JWTTokenExpiresAt =
    authenticationMechanism.config?.JWTTokenExpiresAt ?? 0;

  // get the token expiry date
  const { tokenExpiryDate, isTokenExpired } = getTokenExpiry(JWTTokenExpiresAt);

  return (
    <>
      <Space className="w-full justify-between">
        <Typography.Text className="text-base">
          {t('label.om-jwt-token')}
        </Typography.Text>
        <Space>
          {JWTToken ? (
            <Button
              danger
              data-testid="revoke-button"
              disabled={!hasPermission}
              size="small"
              type="default"
              onClick={onTokenRevoke}>
              {t('label.revoke-token')}
            </Button>
          ) : (
            <Button
              disabled={!hasPermission}
              size="small"
              type="primary"
              onClick={onEdit}>
              {t('label.generate-new-token')}
            </Button>
          )}
        </Space>
      </Space>
      <Divider style={{ margin: '8px 0px' }} />
      <Typography.Paragraph>{t('message.jwt-token')}</Typography.Paragraph>

      {JWTToken ? (
        <>
          <Space className="w-full justify-between ant-space-authMechanism">
            <Input.Password
              readOnly
              autoComplete="off"
              data-testid="token"
              placeholder="Generate new token..."
              value={JWTToken}
            />
            <CopyToClipboardButton copyText={JWTToken} />
          </Space>
          <p className="text-grey-muted" data-testid="token-expiry">
            {JWTTokenExpiresAt ? (
              isTokenExpired ? (
                `Expired on ${tokenExpiryDate}.`
              ) : (
                `Expires on ${tokenExpiryDate}.`
              )
            ) : (
              <>
                <SVGIcons alt="warning" icon="error" />
                <span className="align-middle">
                  {t('message.token-has-no-expiry')}
                </span>
              </>
            )}
          </p>
        </>
      ) : (
        <div className="text-grey-muted text-sm" data-testid="no-token">
          {t('message.no-token-available')}
        </div>
      )}
    </>
  );
};

export default AuthMechanism;
