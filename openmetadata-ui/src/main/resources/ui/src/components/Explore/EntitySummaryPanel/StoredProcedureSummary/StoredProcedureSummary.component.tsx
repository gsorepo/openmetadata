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

import { Col, Divider, Row, Typography } from 'antd';
import { ReactComponent as IconExternalLink } from 'assets/svg/external-links.svg';
import classNames from 'classnames';
import SummaryTagsDescription from 'components/common/SummaryTagsDescription/SummaryTagsDescription.component';
import SchemaEditor from 'components/schema-editor/SchemaEditor';
import SummaryPanelSkeleton from 'components/Skeleton/SummaryPanelSkeleton/SummaryPanelSkeleton.component';
import { CSMode } from 'enums/codemirror.enum';
import { ExplorePageTabs } from 'enums/Explore.enum';
import {
  StoredProcedure,
  StoredProcedureCodeObject,
} from 'generated/entity/data/storedProcedure';
import { isEmpty, isObject } from 'lodash';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  DRAWER_NAVIGATION_OPTIONS,
  getEntityOverview,
} from 'utils/EntityUtils';
import { StoredProcedureSummaryProps } from './StoredProcedureSummary.interface';

const StoredProcedureSummary = ({
  entityDetails,
  componentType = DRAWER_NAVIGATION_OPTIONS.explore,
  tags,
  isLoading,
}: StoredProcedureSummaryProps) => {
  const { t } = useTranslation();
  const [storedProcedureDetails, setStoredProcedureDetails] =
    useState<StoredProcedure>(entityDetails);

  const entityInfo = useMemo(
    () =>
      getEntityOverview(
        ExplorePageTabs.STORED_PROCEDURE,
        storedProcedureDetails
      ),
    [storedProcedureDetails]
  );

  useEffect(() => {
    if (!isEmpty(entityDetails)) {
      setStoredProcedureDetails(entityDetails);
    }
  }, [entityDetails]);

  return (
    <SummaryPanelSkeleton
      loading={isLoading || isEmpty(storedProcedureDetails)}>
      <>
        <Row className="m-md" gutter={[0, 4]}>
          <Col span={24}>
            <Row gutter={[0, 4]}>
              {entityInfo.map((info) => {
                const isOwner = info.name === t('label.owner');

                return info.visible?.includes(componentType) ? (
                  <Col key={info.name} span={24}>
                    <Row
                      className={classNames('', {
                        'p-b-md': isOwner,
                      })}
                      gutter={[16, 32]}>
                      {!isOwner ? (
                        <Col data-testid={`${info.name}-label`} span={8}>
                          <Typography.Text className="text-grey-muted">
                            {info.name}
                          </Typography.Text>
                        </Col>
                      ) : null}
                      <Col data-testid={`${info.name}-value`} span={16}>
                        {info.isLink ? (
                          <Link
                            component={Typography.Link}
                            target={info.isExternal ? '_blank' : '_self'}
                            to={{ pathname: info.url }}>
                            {info.value}
                            {info.isExternal ? (
                              <IconExternalLink className="m-l-xs" width={12} />
                            ) : null}
                          </Link>
                        ) : (
                          <Typography.Text
                            className={classNames('text-grey-muted', {
                              'text-grey-body': !isOwner,
                            })}>
                            {info.value}
                          </Typography.Text>
                        )}
                      </Col>
                    </Row>
                  </Col>
                ) : null;
              })}
            </Row>
          </Col>
        </Row>

        <Divider className="m-y-xs" />

        <SummaryTagsDescription
          entityDetail={entityDetails}
          tags={tags ? tags : []}
        />
        <Divider className="m-y-xs" />

        {isObject(entityDetails.storedProcedureCode) && (
          <Row className="m-md" gutter={[0, 8]}>
            <Col span={24}>
              <Typography.Text
                className="text-base text-grey-muted"
                data-testid="column-header">
                {t('label.code')}
              </Typography.Text>
            </Col>
            <Col span={24}>
              <SchemaEditor
                editorClass="custom-code-mirror-theme custom-query-editor"
                mode={{ name: CSMode.SQL }}
                options={{
                  styleActiveLine: false,
                  readOnly: 'nocursor',
                }}
                value={
                  (
                    entityDetails.storedProcedureCode as StoredProcedureCodeObject
                  ).code ?? ''
                }
              />
            </Col>
          </Row>
        )}
      </>
    </SummaryPanelSkeleton>
  );
};

export default StoredProcedureSummary;
