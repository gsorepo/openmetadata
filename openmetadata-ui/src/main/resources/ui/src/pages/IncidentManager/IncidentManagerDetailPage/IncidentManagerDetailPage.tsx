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
import { Col, Row, Tabs, TabsProps } from 'antd';
import { AxiosError } from 'axios';
import { compare } from 'fast-json-patch';
import { isUndefined } from 'lodash';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { ReactComponent as TestCaseIcon } from '../../../assets/svg/ic-checklist.svg';
import ActivityFeedProvider from '../../../components/ActivityFeed/ActivityFeedProvider/ActivityFeedProvider';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import TitleBreadcrumb from '../../../components/common/TitleBreadcrumb/TitleBreadcrumb.component';
import { TitleBreadcrumbProps } from '../../../components/common/TitleBreadcrumb/TitleBreadcrumb.interface';
import EntityHeaderTitle from '../../../components/Entity/EntityHeaderTitle/EntityHeaderTitle.component';
import IncidentManagerPageHeader from '../../../components/IncidentManager/IncidentManagerPageHeader/IncidentManagerPageHeader.component';
import TestCaseIncidentTab from '../../../components/IncidentManager/TestCaseIncidentTab/TestCaseIncidentTab.component';
import TestCaseResultTab from '../../../components/IncidentManager/TestCaseResultTab/TestCaseResultTab.component';
import Loader from '../../../components/Loader/Loader';
import PageLayoutV1 from '../../../components/PageLayoutV1/PageLayoutV1';
import { usePermissionProvider } from '../../../components/PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../../../components/PermissionProvider/PermissionProvider.interface';
import TabsLabel from '../../../components/TabsLabel/TabsLabel.component';
import { ROUTES } from '../../../constants/constants';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { EntityTabs, EntityType } from '../../../enums/entity.enum';
import { ThreadType } from '../../../generated/api/feed/createThread';
import { ThreadTaskStatus } from '../../../generated/entity/feed/thread';
import { Operation } from '../../../generated/entity/policies/policy';
import { EntityReference, TestCase } from '../../../generated/tests/testCase';
import { useFqn } from '../../../hooks/useFqn';
import { getFeedCount } from '../../../rest/feedsAPI';
import { getTestCaseByFqn, updateTestCaseById } from '../../../rest/testAPI';
import { getEntityFeedLink } from '../../../utils/EntityUtils';
import { checkPermission } from '../../../utils/PermissionsUtils';
import { getIncidentManagerDetailPagePath } from '../../../utils/RouterUtils';
import { getDecodedFqn } from '../../../utils/StringsUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import { IncidentManagerTabs } from '../IncidentManager.interface';
import { TestCaseData } from './IncidentManagerDetailPage.interface';

const IncidentManagerDetailPage = () => {
  const { t } = useTranslation();
  const history = useHistory();
  const location =
    useLocation<{ breadcrumbData: TitleBreadcrumbProps['titleLinks'] }>();

  const { tab: activeTab = IncidentManagerTabs.TEST_CASE_RESULTS } =
    useParams<{ tab: EntityTabs }>();

  const { fqn: testCaseFQN } = useFqn();

  const decodedTestCaseFQN = useMemo(
    () => getDecodedFqn(testCaseFQN),
    [testCaseFQN]
  );

  const [testCaseData, setTestCaseData] = useState<TestCaseData>({
    data: undefined,
    isLoading: true,
  });
  const [taskCount, setTaskCount] = useState(0);

  const { permissions } = usePermissionProvider();
  const hasViewPermission = useMemo(() => {
    return checkPermission(
      Operation.ViewAll,
      ResourceEntity.TEST_CASE,
      permissions
    );
  }, [permissions]);

  const onTestCaseUpdate = (data: TestCase) => {
    setTestCaseData((prev) => ({ ...prev, data }));
  };

  const tabDetails: TabsProps['items'] = useMemo(
    () => [
      {
        label: (
          <TabsLabel id="test-case-result" name={t('label.test-case-result')} />
        ),
        children: (
          <TestCaseResultTab
            testCaseData={testCaseData.data}
            onTestCaseUpdate={onTestCaseUpdate}
          />
        ),
        key: IncidentManagerTabs.TEST_CASE_RESULTS,
      },
      {
        label: (
          <TabsLabel
            count={taskCount}
            id="incident"
            name={t('label.incident')}
          />
        ),
        key: IncidentManagerTabs.ISSUES,
        children: <TestCaseIncidentTab owner={testCaseData.data?.owner} />,
      },
    ],
    [testCaseData, taskCount]
  );

  const fetchTestCaseData = async () => {
    setTestCaseData((prev) => ({ ...prev, isLoading: true }));
    try {
      const response = await getTestCaseByFqn(decodedTestCaseFQN, {
        fields: [
          'testSuite',
          'testCaseResult',
          'testDefinition',
          'owner',
          'incidentId',
        ],
      });
      setTestCaseData((prev) => ({ ...prev, data: response.data }));
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        t('server.entity-fetch-error', { entity: t('label.test-case') })
      );
    } finally {
      setTestCaseData((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const breadcrumb = useMemo(() => {
    const data: TitleBreadcrumbProps['titleLinks'] = location.state
      ?.breadcrumbData
      ? location.state.breadcrumbData
      : [
          {
            name: t('label.incident-manager'),
            url: ROUTES.INCIDENT_MANAGER,
          },
        ];

    return [
      ...data,
      {
        name: testCaseData?.data?.name ?? '',
        url: '',
        activeTitle: true,
      },
    ];
  }, [testCaseData]);

  const handleTabChange = (activeKey: string) => {
    if (activeKey !== activeTab) {
      history.push(
        getIncidentManagerDetailPagePath(
          decodedTestCaseFQN,
          activeKey as IncidentManagerTabs
        )
      );
    }
  };

  const handleOwnerChange = async (owner?: EntityReference) => {
    const data = testCaseData.data;
    if (data) {
      const updatedTestCase = {
        ...data,
        owner,
      };
      const jsonPatch = compare(data, updatedTestCase);

      if (jsonPatch.length) {
        try {
          const res = await updateTestCaseById(data.id ?? '', jsonPatch);
          onTestCaseUpdate(res);
        } catch (error) {
          showErrorToast(error as AxiosError);
        }
      }
    }
  };

  const getEntityFeedCount = useCallback(async () => {
    try {
      const response = await getFeedCount(
        getEntityFeedLink(EntityType.TEST_CASE, decodedTestCaseFQN),
        ThreadType.Task,
        ThreadTaskStatus.Open
      );
      setTaskCount(response.totalCount);
    } catch (err) {
      setTaskCount(0);
    }
  }, [decodedTestCaseFQN]);

  useEffect(() => {
    if (hasViewPermission && decodedTestCaseFQN) {
      fetchTestCaseData();
      getEntityFeedCount();
    } else {
      setTestCaseData((prev) => ({ ...prev, isLoading: false }));
    }
  }, [decodedTestCaseFQN, hasViewPermission]);

  if (testCaseData.isLoading) {
    return <Loader />;
  }

  if (!hasViewPermission) {
    return <ErrorPlaceHolder type={ERROR_PLACEHOLDER_TYPE.PERMISSION} />;
  }

  if (isUndefined(testCaseData.data)) {
    return <ErrorPlaceHolder />;
  }

  return (
    <PageLayoutV1 pageTitle="Incident Manager Detail Page">
      <ActivityFeedProvider>
        <Row
          data-testid="incident-manager-details-page-container"
          gutter={[0, 12]}>
          <Col className="p-x-lg" span={24}>
            <TitleBreadcrumb className="m-b-sm" titleLinks={breadcrumb} />
          </Col>
          <Col className="p-x-lg" data-testid="entity-page-header" span={24}>
            <EntityHeaderTitle
              className="w-max-full-45"
              displayName={testCaseData.data?.displayName}
              icon={<TestCaseIcon className="h-9" />}
              name={testCaseData.data?.name ?? ''}
              serviceName="testCase"
            />
          </Col>
          <Col className="p-x-lg">
            <IncidentManagerPageHeader
              fetchTaskCount={getEntityFeedCount}
              testCaseData={testCaseData.data}
              onOwnerUpdate={handleOwnerChange}
            />
          </Col>
          <Col span={24}>
            <Tabs
              destroyInactiveTabPane
              activeKey={activeTab}
              className="entity-details-page-tabs"
              data-testid="tabs"
              items={tabDetails}
              onChange={handleTabChange}
            />
          </Col>
        </Row>
      </ActivityFeedProvider>
    </PageLayoutV1>
  );
};

export default IncidentManagerDetailPage;
