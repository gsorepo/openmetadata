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
import { Button, Card, Modal, Skeleton, Typography } from 'antd';
import { CookieStorage } from 'cookie-storage';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { ReactComponent as CloseIcon } from '../../../assets/svg/close.svg';
import { ReactComponent as StarGithubIcon } from '../../../assets/svg/ic-star-github.svg';
import { ReactComponent as StarIcon } from '../../../assets/svg/ic-start-filled-github.svg';

import Icon from '@ant-design/icons/lib/components/Icon';
import ButtonGroup from 'antd/lib/button/button-group';
import {
  ROUTES,
  STAR_OMD_USER,
  TEXT_GREY_MUTED,
} from '../../../constants/constants';
import { getRepositoryData } from '../../../rest/commonAPI';
import { getReleaseVersionExpiry } from '../../../utils/WhatsNewModal.util';
import { useAuthContext } from '../../Auth/AuthProviders/AuthProvider';
import './github-star-modal.style.less';

const cookieStorage = new CookieStorage();

const GithubStarModal = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { currentUser } = useAuthContext();
  const [showGithubStarPopup, setShowGithubStarPopup] = useState(false);
  const [starredCount, setStarredCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loggedInUserName = useMemo(() => currentUser?.name, [currentUser]);

  const userCookieName = useMemo(
    () => `${STAR_OMD_USER}_${loggedInUserName}`,
    [loggedInUserName]
  );

  const isHomePage = useMemo(
    () => location.pathname.includes(ROUTES.MY_DATA),
    [location.pathname]
  );

  const usernameExistsInCookie = useMemo(
    () => Boolean(cookieStorage.getItem(userCookieName)),
    [userCookieName]
  );

  const fetchOpenMetaData = async () => {
    try {
      const res = await getRepositoryData();
      setStarredCount(res.stargazers_count);
    } catch (err) {
      // Error
    } finally {
      setIsLoading(false);
    }
  };

  const updateGithubPopup = useCallback(
    (show: boolean) => {
      if (loggedInUserName && show) {
        fetchOpenMetaData();
        cookieStorage.setItem(userCookieName, 'true', {
          expires: getReleaseVersionExpiry(),
        });
      }
      setShowGithubStarPopup(show);
    },
    [
      loggedInUserName,
      usernameExistsInCookie,
      userCookieName,
      getReleaseVersionExpiry,
    ]
  );

  useEffect(() => {
    updateGithubPopup(!usernameExistsInCookie);

    return () => setShowGithubStarPopup(false);
  }, [usernameExistsInCookie, updateGithubPopup]);

  return (
    <>
      {showGithubStarPopup && isHomePage && (
        <Modal
          centered
          destroyOnClose
          keyboard
          open
          className="github-star-popup-modal"
          closeIcon={
            <CloseIcon
              color={TEXT_GREY_MUTED}
              data-testid="github-star-popup-close-button"
              height={12}
              width={12}
              onClick={() => setShowGithubStarPopup(false)}
            />
          }
          data-testid="github-star-popup-modal"
          footer={null}
          maskClosable={false}
          width={440}
          onCancel={() => setShowGithubStarPopup(false)}>
          <Card
            className="github-star-popup-card"
            data-testid="github-star-popup-card">
            <StarIcon className="github-star-icon" />

            <Typography.Text className="github-star-popup-header">
              {t('label.star-us-on-github')}
            </Typography.Text>

            <Typography.Paragraph className="github-star-popup-description">
              {t('message.star-on-github-description')}
            </Typography.Paragraph>

            <ButtonGroup className="github-action-button-group">
              <Link
                component={Typography.Link}
                target="_blank"
                to={{
                  pathname: 'https://github.com/open-metadata/OpenMetadata',
                }}>
                <Button
                  className="github-star-button github-modal-action-button"
                  icon={<Icon component={StarGithubIcon} size={12} />}>
                  {t('label.star')}
                </Button>
              </Link>

              <Link
                component={Typography.Link}
                target="_blank"
                to={{
                  pathname: 'https://github.com/open-metadata/OpenMetadata',
                }}>
                <Button className="github-modal-action-button">
                  {isLoading ? (
                    <Skeleton.Button active size="small" />
                  ) : (
                    starredCount
                  )}
                </Button>
              </Link>
            </ButtonGroup>
          </Card>
        </Modal>
      )}
    </>
  );
};

export default GithubStarModal;
