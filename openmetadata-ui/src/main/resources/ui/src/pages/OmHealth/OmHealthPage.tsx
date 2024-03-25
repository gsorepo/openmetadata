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
import { Button, Col, List, Row } from 'antd';
import { AxiosError } from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Loader from '../../components/common/Loader/Loader';
import TitleBreadcrumb from '../../components/common/TitleBreadcrumb/TitleBreadcrumb.component';
import { TitleBreadcrumbProps } from '../../components/common/TitleBreadcrumb/TitleBreadcrumb.interface';
import PageHeader from '../../components/PageHeader/PageHeader.component';
import PageLayoutV1 from '../../components/PageLayoutV1/PageLayoutV1';
import { GlobalSettingsMenuCategory } from '../../constants/GlobalSettings.constants';
import { PAGE_HEADERS } from '../../constants/PageHeaders.constant';

import { startCase } from 'lodash';
import axiosClient from '../../rest';
import { getSettingPageEntityBreadCrumb } from '../../utils/GlobalSettingsUtils';
import { showErrorToast } from '../../utils/ToastUtils';

interface ValidationItem {
  description: string;
  passed: boolean;
}
const OmHealthPage = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<Record<string, ValidationItem>>({});
  const breadcrumbs: TitleBreadcrumbProps['titleLinks'] = useMemo(
    () =>
      getSettingPageEntityBreadCrumb(
        GlobalSettingsMenuCategory.OPEN_METADATA,
        t('label.om-health')
      ),
    []
  );

  const getHealthData = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get<Record<string, ValidationItem>>(
        '/system/validate'
      );
      setData(response.data);
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    getHealthData();
  }, []);

  if (loading) {
    return <Loader />;
  }

  return (
    <PageLayoutV1 pageTitle={t('label.om-health')}>
      <Row className="page-container" gutter={[0, 16]}>
        <Col span={24}>
          <TitleBreadcrumb titleLinks={breadcrumbs} />
        </Col>
        <Col span={24}>
          <Row align="middle" justify="space-between">
            <Col>
              <PageHeader data={PAGE_HEADERS.OM_HEALTH} />
            </Col>
            <Col>
              <Button type="primary" onClick={getHealthData}>
                {t('label.refresh')}
              </Button>
            </Col>
          </Row>
        </Col>
        <Col span={24}>
          <List
            bordered
            dataSource={Object.entries(data)}
            renderItem={([key, validation]) => (
              <List.Item className="d-block">
                <p>
                  <strong>{startCase(key)}</strong>
                </p>
                <p>
                  <strong>Description: </strong>
                  {validation.description}
                </p>
                <p>
                  <strong>Status:</strong>{' '}
                  {validation.passed ? 'Passed' : 'Failed'}
                </p>
              </List.Item>
            )}
          />
        </Col>
      </Row>
    </PageLayoutV1>
  );
};

export default OmHealthPage;
