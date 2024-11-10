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
import { Col, Form, Row } from 'antd';
import { FormProviderProps } from 'antd/lib/form/context';
import { isEmpty, isString } from 'lodash';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory } from 'react-router-dom';
import { DEFAULT_SCHEDULE_CRON_DAILY } from '../../../../constants/Schedular.constants';
import { TestCase } from '../../../../generated/tests/testCase';
import { useFqn } from '../../../../hooks/useFqn';
import {
  FieldProp,
  FieldTypes,
  FormItemLayout,
} from '../../../../interface/FormUtils.interface';
import { generateFormFields } from '../../../../utils/formUtils';
import { escapeESReservedCharacters } from '../../../../utils/StringsUtils';
import ScheduleInterval from '../../../Settings/Services/AddIngestion/Steps/ScheduleInterval';
import { WorkflowExtraConfig } from '../../../Settings/Services/AddIngestion/Steps/ScheduleInterval.interface';
import { AddTestCaseList } from '../../AddTestCaseList/AddTestCaseList.component';
import {
  AddTestSuitePipelineProps,
  TestSuiteIngestionDataType,
} from '../AddDataQualityTest.interface';
import './add-test-suite-pipeline.style.less';

const AddTestSuitePipeline = ({
  initialData,
  isLoading,
  onSubmit,
  onCancel,
  includePeriodOptions,
  testSuiteFQN,
}: AddTestSuitePipelineProps) => {
  const { t } = useTranslation();
  const history = useHistory();
  const { fqn, ingestionFQN } = useFqn();
  const [selectAllTestCases, setSelectAllTestCases] = useState(
    initialData?.selectAllTestCases
  );
  const isEditMode = !isEmpty(ingestionFQN);

  const formFields: FieldProp[] = [
    {
      name: 'name',
      label: t('label.name'),
      type: FieldTypes.TEXT,
      required: false,
      placeholder: t('label.enter-entity', {
        entity: t('label.name'),
      }),
      props: {
        'data-testid': 'pipeline-name',
      },
      id: 'root/name',
    },
  ];

  const testCaseFormFields: FieldProp[] = [
    {
      name: 'selectAllTestCases',
      label: t('label.select-all-entity', {
        entity: t('label.test-case-plural'),
      }),
      type: FieldTypes.SWITCH,
      required: false,
      props: {
        'data-testid': 'select-all-test-cases',
      },
      id: 'root/selectAllTestCases',
      formItemLayout: FormItemLayout.HORIZONTAL,
    },
  ];

  const handleCancelBtn = () => {
    history.goBack();
  };

  const onFinish = (
    values: WorkflowExtraConfig & TestSuiteIngestionDataType
  ) => {
    const { cron, enableDebugLog, testCases, name, selectAllTestCases } =
      values;
    onSubmit({
      cron,
      enableDebugLog,
      name,
      selectAllTestCases,
      testCases: testCases?.map((testCase: TestCase | string) =>
        isString(testCase) ? testCase : testCase.name
      ),
    });
  };

  const handleFromChange: FormProviderProps['onFormChange'] = (
    _,
    { forms }
  ) => {
    const form = forms['schedular-form'];
    const value = form.getFieldValue('selectAllTestCases');
    setSelectAllTestCases(value);
    if (value) {
      form.setFieldsValue({ testCases: undefined });
    }
  };

  return (
    <Form.Provider onFormChange={handleFromChange}>
      <ScheduleInterval
        debugLog={{ allow: true }}
        defaultSchedule={DEFAULT_SCHEDULE_CRON_DAILY}
        includePeriodOptions={includePeriodOptions}
        initialData={initialData}
        isEditMode={isEditMode}
        status={isLoading ? 'waiting' : 'initial'}
        topChildren={
          <>
            <Col span={24}>{generateFormFields(formFields)}</Col>
            <Col span={24}>
              {t('label.schedule-for-entity', {
                entity: t('label.test-case-plural'),
              })}
            </Col>
          </>
        }
        onBack={onCancel ?? handleCancelBtn}
        onDeploy={onFinish}>
        <Row className="add-test-case-container" gutter={[0, 16]}>
          <Col span={24}>{generateFormFields(testCaseFormFields)}</Col>
          {!selectAllTestCases && (
            <Col span={24}>
              <Form.Item
                label={t('label.test-case')}
                name="testCases"
                rules={[
                  {
                    required: true,
                    message: t('label.field-required', {
                      field: t('label.test-case'),
                    }),
                  },
                ]}
                valuePropName="selectedTest">
                <AddTestCaseList
                  filters={`testSuite.fullyQualifiedName:${escapeESReservedCharacters(
                    testSuiteFQN ?? fqn
                  )}`}
                  showButton={false}
                />
              </Form.Item>
            </Col>
          )}
        </Row>
      </ScheduleInterval>
    </Form.Provider>
  );
};

export default AddTestSuitePipeline;
