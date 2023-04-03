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
import { Button, Col, Row, Space, Tooltip, Typography } from 'antd';
import DescriptionV1 from 'components/common/description/DescriptionV1';
import ProfilePicture from 'components/common/ProfilePicture/ProfilePicture';
import TitleBreadcrumb from 'components/common/title-breadcrumb/title-breadcrumb.component';
import { TitleBreadcrumbProps } from 'components/common/title-breadcrumb/title-breadcrumb.interface';
import { UserTeamSelectableList } from 'components/common/UserTeamSelectableList/UserTeamSelectableList.component';
import EntityDisplayNameModal from 'components/Modals/EntityDisplayNameModal/EntityDisplayNameModal.component';
import EntityNameModal from 'components/Modals/EntityNameModal/EntityNameModal.component';
import { OperationPermission } from 'components/PermissionProvider/PermissionProvider.interface';
import { FQN_SEPARATOR_CHAR } from 'constants/char.constants';
import { getUserPath } from 'constants/constants';
import { NO_PERMISSION_FOR_ACTION } from 'constants/HelperTextUtil';
import { Glossary } from 'generated/entity/data/glossary';
import { GlossaryTerm } from 'generated/entity/data/glossaryTerm';
import { cloneDeep } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { getEntityName } from 'utils/EntityUtils';
import { getGlossaryPath } from 'utils/RouterUtils';
import SVGIcons, { Icons } from 'utils/SvgUtils';
import GlossaryHeaderButtons from '../GlossaryHeaderButtons/GlossaryHeaderButtons.component';

export interface GlossaryHeaderProps {
  supportAddOwner?: boolean;
  selectedData: Glossary | GlossaryTerm;
  permissions: OperationPermission;
  isGlossary: boolean;
  onUpdate: (data: GlossaryTerm | Glossary) => void;
  onDelete: (id: string) => void;
  onAssetsUpdate?: () => void;
}

const GlossaryHeader = ({
  selectedData,
  permissions,
  onUpdate,
  onDelete,
  isGlossary,
  onAssetsUpdate,
}: GlossaryHeaderProps) => {
  const { t } = useTranslation();

  const [isNameEditing, setIsNameEditing] = useState<boolean>(false);
  const [isDisplayNameEditing, setIsDisplayNameEditing] =
    useState<boolean>(false);
  const [isDescriptionEditable, setIsDescriptionEditable] =
    useState<boolean>(false);
  const [breadcrumb, setBreadcrumb] = useState<
    TitleBreadcrumbProps['titleLinks']
  >([]);

  const editDisplayNamePermission = useMemo(() => {
    return permissions.EditAll || permissions.EditDisplayName;
  }, [permissions]);

  const onDisplayNameSave = (displayName: string) => {
    let updatedDetails = cloneDeep(selectedData);

    updatedDetails = {
      ...selectedData,
      displayName: displayName?.trim(),
    };

    onUpdate(updatedDetails);

    setIsDisplayNameEditing(false);
  };

  const onNameSave = (name: string) => {
    let updatedDetails = cloneDeep(selectedData);

    updatedDetails = {
      ...selectedData,
      name: name?.trim() || selectedData.name,
    };

    onUpdate(updatedDetails);

    setIsNameEditing(false);
  };

  /**
   * To create breadcrumb from the fqn
   * @param fqn fqn of glossary or glossary term
   */
  const handleBreadcrumb = (fqn: string) => {
    if (fqn) {
      const arr = fqn.split(FQN_SEPARATOR_CHAR);
      const dataFQN: Array<string> = [];
      const newData = arr.map((d, i) => {
        dataFQN.push(d);
        const isLink = i < arr.length - 1;

        return {
          name: d,
          url: isLink ? getGlossaryPath(dataFQN.join(FQN_SEPARATOR_CHAR)) : '',
          activeTitle: !isLink,
        };
      });
      setBreadcrumb(newData);
    }
  };

  const onDescriptionUpdate = async (updatedHTML: string) => {
    if (selectedData.description !== updatedHTML) {
      const updatedTableDetails = {
        ...selectedData,
        description: updatedHTML,
      };
      onUpdate(updatedTableDetails);
      setIsDescriptionEditable(false);
    } else {
      setIsDescriptionEditable(false);
    }
  };

  const handleUpdatedOwner = (newOwner: Glossary['owner']) => {
    if (newOwner) {
      const updatedData = {
        ...selectedData,
        owner: newOwner,
      };
      onUpdate(updatedData);
    }
  };

  useEffect(() => {
    const { fullyQualifiedName, name } = selectedData;

    if (!isGlossary) {
      handleBreadcrumb(fullyQualifiedName ? fullyQualifiedName : name);
    }
  }, [selectedData]);

  return (
    <>
      <Row gutter={[0, 16]}>
        <Col span={24}>
          <Row justify="space-between">
            <Col span={12}>
              {!isGlossary && (
                <div
                  className="tw-text-link tw-text-base glossary-breadcrumb"
                  data-testid="category-name">
                  <TitleBreadcrumb titleLinks={breadcrumb} />
                </div>
              )}

              <Space direction="vertical" size={0}>
                <Space>
                  <Typography.Text
                    className="text-grey-muted"
                    data-testid="glossary-name">
                    {selectedData.name}
                  </Typography.Text>
                  <Tooltip
                    title={
                      editDisplayNamePermission
                        ? t('label.edit-entity', { entity: t('label.name') })
                        : NO_PERMISSION_FOR_ACTION
                    }>
                    <Button
                      className="glossary-header-edit-btn"
                      data-testid="edit-name"
                      disabled={!editDisplayNamePermission}
                      icon={
                        <SVGIcons alt="icon-tag" icon={Icons.EDIT} width="16" />
                      }
                      size="small"
                      type="text"
                      onClick={() => setIsNameEditing(true)}
                    />
                  </Tooltip>
                </Space>
                <Space direction="horizontal">
                  <Typography.Title
                    className="m-b-0"
                    data-testid="glossary-display-name"
                    level={5}>
                    {getEntityName(selectedData)}
                  </Typography.Title>
                  <Tooltip
                    title={
                      editDisplayNamePermission
                        ? t('label.edit-entity', {
                            entity: t('label.display-name'),
                          })
                        : NO_PERMISSION_FOR_ACTION
                    }>
                    <Button
                      className="glossary-header-edit-btn"
                      disabled={!editDisplayNamePermission}
                      icon={
                        <SVGIcons alt="icon-tag" icon={Icons.EDIT} width="16" />
                      }
                      size="small"
                      type="text"
                      onClick={() => setIsDisplayNameEditing(true)}
                    />
                  </Tooltip>
                </Space>
              </Space>
            </Col>
            <Col span={12}>
              <div style={{ textAlign: 'right' }}>
                <GlossaryHeaderButtons
                  deleteStatus="success"
                  isGlossary={isGlossary}
                  permission={permissions}
                  selectedData={selectedData}
                  onAssetsUpdate={onAssetsUpdate}
                  onEntityDelete={onDelete}
                />
              </div>
            </Col>
          </Row>
        </Col>
        <Col span={24}>
          <Space className="flex-wrap" direction="horizontal">
            <div className="flex items-center">
              <Typography.Text className="text-grey-muted m-r-xs">
                {`${t('label.owner')}:`}
              </Typography.Text>

              {selectedData.owner && getEntityName(selectedData.owner) ? (
                <Space className="m-r-xss" size={4}>
                  <ProfilePicture
                    displayName={getEntityName(selectedData.owner)}
                    id={selectedData.owner?.id || ''}
                    name={selectedData.owner?.name || ''}
                    textClass="text-xs"
                    width="20"
                  />
                  <Link to={getUserPath(selectedData.owner.name ?? '')}>
                    {getEntityName(selectedData.owner)}
                  </Link>
                </Space>
              ) : (
                <span className="text-grey-muted">
                  {t('label.no-entity', {
                    entity: t('label.owner-lowercase'),
                  })}
                </span>
              )}
              <div className="tw-relative">
                <UserTeamSelectableList
                  hasPermission={permissions.EditOwner || permissions.EditAll}
                  owner={selectedData.owner}
                  onUpdate={handleUpdatedOwner}
                />
              </div>
            </div>
          </Space>
        </Col>
        <Col data-testid="updated-by-container" span={24}>
          <DescriptionV1
            description={selectedData?.description || ''}
            entityName={selectedData?.displayName ?? selectedData?.name}
            hasEditAccess={permissions.EditDescription || permissions.EditAll}
            isEdit={isDescriptionEditable}
            onCancel={() => setIsDescriptionEditable(false)}
            onDescriptionEdit={() => setIsDescriptionEditable(true)}
            onDescriptionUpdate={onDescriptionUpdate}
          />
        </Col>
      </Row>
      <EntityNameModal
        name={selectedData.name}
        visible={isNameEditing}
        onCancel={() => setIsNameEditing(false)}
        onSave={onNameSave}
      />
      <EntityDisplayNameModal
        displayName={selectedData.displayName || ''}
        visible={isDisplayNameEditing}
        onCancel={() => setIsDisplayNameEditing(false)}
        onSave={onDisplayNameSave}
      />
    </>
  );
};

export default GlossaryHeader;
