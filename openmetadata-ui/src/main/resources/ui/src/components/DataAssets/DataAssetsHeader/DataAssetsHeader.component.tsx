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
import Icon from '@ant-design/icons';
import { Button, Col, Divider, Row, Space, Tooltip, Typography } from 'antd';
import ButtonGroup from 'antd/lib/button/button-group';
import { ReactComponent as EditIcon } from 'assets/svg/edit-new.svg';
import { ReactComponent as IconExternalLink } from 'assets/svg/external-links.svg';
import { ReactComponent as TaskOpenIcon } from 'assets/svg/ic-open-task.svg';
import { ReactComponent as ShareIcon } from 'assets/svg/ic-share.svg';
import { ReactComponent as StarFilledIcon } from 'assets/svg/ic-star-filled.svg';
import { ReactComponent as StarIcon } from 'assets/svg/ic-star.svg';
import { ReactComponent as VersionIcon } from 'assets/svg/ic-version.svg';
import { AxiosError } from 'axios';
import { ActivityFeedTabs } from 'components/ActivityFeed/ActivityFeedTab/ActivityFeedTab.interface';
import AnnouncementCard from 'components/common/entityPageInfo/AnnouncementCard/AnnouncementCard';
import AnnouncementDrawer from 'components/common/entityPageInfo/AnnouncementDrawer/AnnouncementDrawer';
import ManageButton from 'components/common/entityPageInfo/ManageButton/ManageButton';
import { OwnerLabel } from 'components/common/OwnerLabel/OwnerLabel.component';
import TierCard from 'components/common/TierCard/TierCard';
import TitleBreadcrumb from 'components/common/title-breadcrumb/title-breadcrumb.component';
import EntityHeaderTitle from 'components/Entity/EntityHeaderTitle/EntityHeaderTitle.component';
import { useTourProvider } from 'components/TourProvider/TourProvider';
import { FQN_SEPARATOR_CHAR } from 'constants/char.constants';
import { DE_ACTIVE_COLOR } from 'constants/constants';
import { SERVICE_CATEGORIES } from 'constants/Services.constant';
import { EntityTabs, EntityType } from 'enums/entity.enum';
import { Container } from 'generated/entity/data/container';
import {
  Thread,
  ThreadTaskStatus,
  ThreadType,
} from 'generated/entity/feed/thread';
import { useClipboard } from 'hooks/useClipBoard';
import { isEmpty } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { getActiveAnnouncement, getFeedCount } from 'rest/feedsAPI';
import { getContainerByName } from 'rest/storageAPI';
import { getCurrentUserId, getEntityDetailLink } from 'utils/CommonUtils';
import { getDataAssetsHeaderInfo } from 'utils/DataAssetsHeader.utils';
import { getEntityFeedLink, getEntityName } from 'utils/EntityUtils';
import { serviceTypeLogo } from 'utils/ServiceUtils';
import { getTierTags } from 'utils/TableUtils';
import { showErrorToast } from 'utils/ToastUtils';
import {
  DataAssetHeaderInfo,
  DataAssetsHeaderProps,
  DataAssetsType,
  DataAssetsWithFollowersField,
  DataAssetsWithServiceField,
} from './DataAssetsHeader.interface';

export const ExtraInfoLabel = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <>
    <Divider className="self-center m-x-sm" type="vertical" />
    <Typography.Text className="self-center text-xs whitespace-nowrap">
      {!isEmpty(label) && (
        <span className="text-grey-muted">{`${label}: `}</span>
      )}
      <span className="font-medium">{value}</span>
    </Typography.Text>
  </>
);

export const ExtraInfoLink = ({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href: string;
}) => (
  <>
    <Divider className="self-center m-x-sm" type="vertical" />
    <div className="d-flex items-center text-xs">
      {!isEmpty(label) && (
        <span className="text-grey-muted m-r-xss">{`${label}: `}</span>
      )}
      <Typography.Link href={href} style={{ fontSize: '12px' }}>
        {value}{' '}
      </Typography.Link>
      <IconExternalLink className="m-l-xss " width={14} />{' '}
    </div>
  </>
);

export const DataAssetsHeader = ({
  allowSoftDelete = true,
  afterDeleteAction,
  dataAsset,
  onOwnerUpdate,
  onTierUpdate,
  permissions,
  onVersionClick,
  onFollowClick,
  entityType,
  isRecursiveDelete,
  onRestoreDataAsset,
  onDisplayNameUpdate,
}: DataAssetsHeaderProps) => {
  const USERId = getCurrentUserId();
  const { t } = useTranslation();
  const { isTourPage } = useTourProvider();
  const { onCopyToClipBoard } = useClipboard(window.location.href);
  const [taskCount, setTaskCount] = useState(0);
  const [parentContainers, setParentContainers] = useState<Container[]>([]);
  const [isBreadcrumbLoading, setIsBreadcrumbLoading] = useState(false);
  const history = useHistory();
  const icon = useMemo(
    () =>
      dataAsset?.serviceType ? (
        <img className="h-9" src={serviceTypeLogo(dataAsset.serviceType)} />
      ) : null,
    [dataAsset]
  );
  const [copyTooltip, setCopyTooltip] = useState<string>();

  const excludeEntityService = useMemo(
    () =>
      [
        EntityType.DATABASE,
        EntityType.DATABASE_SCHEMA,
        EntityType.DATABASE_SERVICE,
        EntityType.DASHBOARD_SERVICE,
        EntityType.MESSAGING_SERVICE,
        EntityType.PIPELINE_SERVICE,
        EntityType.MLMODEL_SERVICE,
        EntityType.METADATA_SERVICE,
        EntityType.STORAGE_SERVICE,
        ...SERVICE_CATEGORIES,
      ].includes(entityType),
    [entityType]
  );
  const hasFollowers = 'followers' in dataAsset;

  const { entityName, tier, isFollowing, version, followers } = useMemo(
    () => ({
      isFollowing: hasFollowers
        ? (dataAsset as DataAssetsWithFollowersField).followers?.some(
            ({ id }) => id === USERId
          )
        : false,
      followers: hasFollowers
        ? (dataAsset as DataAssetsWithFollowersField).followers?.length
        : 0,

      tier: getTierTags(dataAsset.tags ?? []),
      entityName: getEntityName(dataAsset),
      version: dataAsset.version,
    }),
    [dataAsset, USERId]
  );

  const [isAnnouncementDrawerOpen, setIsAnnouncementDrawer] =
    useState<boolean>(false);
  const [activeAnnouncement, setActiveAnnouncement] = useState<Thread>();

  const fetchActiveAnnouncement = async () => {
    try {
      const announcements = await getActiveAnnouncement(
        getEntityFeedLink(
          entityType,
          encodeURIComponent(dataAsset.fullyQualifiedName ?? '')
        )
      );

      if (!isEmpty(announcements.data)) {
        setActiveAnnouncement(announcements.data[0]);
      }
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  const fetchTaskCount = () => {
    // To get open tasks count
    getFeedCount(
      getEntityFeedLink(
        entityType,
        encodeURIComponent(dataAsset.fullyQualifiedName ?? '')
      ),
      ThreadType.Task,
      ThreadTaskStatus.Open
    )
      .then((res) => {
        if (res) {
          setTaskCount(res.totalCount);
        } else {
          throw t('server.entity-feed-fetch-error');
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(err, t('server.entity-feed-fetch-error'));
      });
  };

  const fetchContainerParent = async (
    parentName: string,
    parents = [] as Container[]
  ) => {
    if (isEmpty(parentName)) {
      return;
    }
    setIsBreadcrumbLoading(true);
    try {
      const response = await getContainerByName(parentName, 'parent');
      const updatedParent = [response, ...parents];
      if (response?.parent?.fullyQualifiedName) {
        await fetchContainerParent(
          response.parent.fullyQualifiedName,
          updatedParent
        );
      } else {
        setParentContainers(updatedParent);
      }
    } catch (error) {
      showErrorToast(error as AxiosError, t('server.unexpected-response'));
    } finally {
      setIsBreadcrumbLoading(false);
    }
  };

  useEffect(() => {
    if (dataAsset.fullyQualifiedName && !isTourPage && !excludeEntityService) {
      fetchActiveAnnouncement();
      fetchTaskCount();
    }
    if (entityType === EntityType.CONTAINER) {
      const asset = dataAsset as Container;
      fetchContainerParent(asset.parent?.fullyQualifiedName ?? '');
    }
  }, [dataAsset, excludeEntityService, isTourPage]);

  const { extraInfo, breadcrumbs }: DataAssetHeaderInfo = useMemo(
    () =>
      getDataAssetsHeaderInfo(
        entityType,
        dataAsset,
        entityName,
        parentContainers
      ),
    [entityType, dataAsset, entityName, parentContainers]
  );

  const handleOpenTaskClick = () => {
    if (!dataAsset.fullyQualifiedName) {
      return;
    }

    history.push(
      getEntityDetailLink(
        entityType,
        encodeURIComponent(dataAsset.fullyQualifiedName),
        EntityTabs.ACTIVITY_FEED,
        ActivityFeedTabs.TASKS
      )
    );
  };

  const handleShareButtonClick = async () => {
    await onCopyToClipBoard();
    setCopyTooltip(t('message.copy-to-clipboard'));
    setTimeout(() => setCopyTooltip(''), 2000);
  };

  const isDataAssetsWithServiceField = useCallback(
    (asset: DataAssetsType): asset is DataAssetsWithServiceField => {
      return (asset as DataAssetsWithServiceField).service !== undefined;
    },
    []
  );

  const dataAssetServiceName = useMemo(() => {
    if (isDataAssetsWithServiceField(dataAsset)) {
      return dataAsset.service?.name ?? '';
    } else {
      return 'service';
    }
  }, [isDataAssetsWithServiceField, dataAsset]);

  return (
    <>
      <Row gutter={[8, 12]}>
        {/* Heading Left side */}
        <Col className="self-center" span={18}>
          <Row gutter={[16, 12]}>
            <Col span={24}>
              <TitleBreadcrumb
                loading={isBreadcrumbLoading}
                titleLinks={breadcrumbs}
              />
            </Col>
            <Col span={24}>
              <EntityHeaderTitle
                deleted={dataAsset?.deleted}
                displayName={dataAsset.displayName}
                icon={icon}
                name={dataAsset?.name}
                serviceName={dataAssetServiceName}
              />
            </Col>
            <Col span={24}>
              <div className="d-flex no-wrap">
                <OwnerLabel
                  hasPermission={permissions.EditAll || permissions.EditOwner}
                  owner={dataAsset?.owner}
                  onUpdate={onOwnerUpdate}
                />
                <Divider className="self-center m-x-sm" type="vertical" />
                <TierCard currentTier={tier?.tagFQN} updateTier={onTierUpdate}>
                  <Space>
                    {tier ? (
                      <span className="font-medium text-xs" data-testid="Tier">
                        {tier.tagFQN.split(FQN_SEPARATOR_CHAR)[1]}
                      </span>
                    ) : (
                      <span className="font-medium text-xs" data-testid="Tier">
                        {t('label.no-entity', {
                          entity: t('label.tier'),
                        })}
                      </span>
                    )}

                    {(permissions.EditAll || permissions.EditTags) && (
                      <Button
                        className="flex-center p-0"
                        data-testid="edit-tier"
                        disabled={
                          !(permissions.EditAll || permissions.EditTags)
                        }
                        icon={<EditIcon color={DE_ACTIVE_COLOR} width="14px" />}
                        size="small"
                        type="text"
                      />
                    )}
                  </Space>
                </TierCard>
                {extraInfo}
              </div>
            </Col>
          </Row>
        </Col>
        {/* Heading Right side */}
        <Col span={6}>
          <Space className="items-end w-full" direction="vertical" size={16}>
            <Space>
              <ButtonGroup size="small">
                {!excludeEntityService && (
                  <>
                    <Button
                      className="w-16 p-0"
                      icon={<Icon component={TaskOpenIcon} />}
                      onClick={handleOpenTaskClick}>
                      <Typography.Text>{taskCount}</Typography.Text>
                    </Button>

                    <Button
                      className="w-16 p-0"
                      data-testid="version-button"
                      icon={<Icon component={VersionIcon} />}
                      onClick={onVersionClick}>
                      <Typography.Text>{version}</Typography.Text>
                    </Button>

                    <Button
                      className="w-16 p-0"
                      data-testid="entity-follow-button"
                      icon={
                        <Icon
                          component={isFollowing ? StarFilledIcon : StarIcon}
                        />
                      }
                      onClick={onFollowClick}>
                      <Typography.Text>{followers}</Typography.Text>
                    </Button>
                  </>
                )}

                <Tooltip
                  open={!isEmpty(copyTooltip)}
                  placement="bottomRight"
                  title={copyTooltip}>
                  <Button
                    icon={<Icon component={ShareIcon} />}
                    onClick={handleShareButtonClick}
                  />
                </Tooltip>
                <ManageButton
                  afterDeleteAction={afterDeleteAction}
                  allowSoftDelete={!dataAsset.deleted && allowSoftDelete}
                  canDelete={permissions.Delete}
                  deleted={dataAsset.deleted}
                  displayName={dataAsset.displayName}
                  editDisplayNamePermission={
                    permissions?.EditAll || permissions?.EditDisplayName
                  }
                  entityFQN={dataAsset.fullyQualifiedName}
                  entityId={dataAsset.id}
                  entityName={entityName}
                  entityType={entityType}
                  isRecursiveDelete={isRecursiveDelete}
                  onAnnouncementClick={
                    permissions?.EditAll
                      ? () => setIsAnnouncementDrawer(true)
                      : undefined
                  }
                  onEditDisplayName={onDisplayNameUpdate}
                  onRestoreEntity={onRestoreDataAsset}
                />
              </ButtonGroup>
            </Space>

            <div>
              {activeAnnouncement && (
                <AnnouncementCard
                  announcement={activeAnnouncement}
                  onClick={() => setIsAnnouncementDrawer(true)}
                />
              )}
            </div>
          </Space>
        </Col>
      </Row>

      {isAnnouncementDrawerOpen && (
        <AnnouncementDrawer
          createPermission={permissions?.EditAll}
          entityFQN={dataAsset.fullyQualifiedName ?? ''}
          entityName={entityName ?? ''}
          entityType={entityType}
          open={isAnnouncementDrawerOpen}
          onClose={() => setIsAnnouncementDrawer(false)}
        />
      )}
    </>
  );
};
