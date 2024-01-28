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

import { CloseOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Row,
  Select,
  Tabs,
  Typography,
} from 'antd';
import { isEmpty, isNil, map } from 'lodash';
import React, { ReactElement, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DESTINATION_DROPDOWN_TABS,
  DESTINATION_SOURCE_ITEMS,
} from '../../../constants/Alerts.constants';
import { WHITE_COLOR } from '../../../constants/constants';
import { CreateEventSubscription } from '../../../generated/events/api/createEventSubscription';
import { SubscriptionCategory } from '../../../generated/events/eventSubscription';
import {
  getDestinationConfigField,
  getSubscriptionTypeOptions,
  listLengthValidator,
} from '../../../utils/Alerts/AlertsUtil';
import { checkIfDestinationIsInternal } from '../../../utils/ObservabilityUtils';
import { ModifiedDestination } from '../AddObservabilityPage.interface';
import './destination-form-item.less';

function DestinationFormItem({
  heading,
  subHeading,
  buttonLabel,
}: Readonly<{
  heading: string;
  subHeading: string;
  buttonLabel: string;
}>) {
  const { t } = useTranslation();
  const form = Form.useFormInstance();
  const [activeTab, setActiveTab] = useState(
    DESTINATION_DROPDOWN_TABS.internal
  );
  const [destinationOptions, setDestinationOptions] = useState(
    DESTINATION_SOURCE_ITEMS.internal
  );

  const selectedDestinations = Form.useWatch<ModifiedDestination[]>(
    'destinations',
    form
  );

  const [selectedTrigger] =
    Form.useWatch<CreateEventSubscription['resources']>(['resources'], form) ??
    [];

  const filteredOptions = destinationOptions.map((o) => {
    return {
      ...o,
      disabled: selectedDestinations?.some((d) => d.type === o.value),
    };
  });

  const showAddDestination = useMemo(
    () => filteredOptions.some((o) => !o.disabled),
    [filteredOptions]
  );

  const handleTabChange = useCallback((key) => {
    setActiveTab(key);
    setDestinationOptions(
      DESTINATION_SOURCE_ITEMS[key as keyof typeof DESTINATION_SOURCE_ITEMS]
    );
  }, []);

  const getTabItems = useCallback(
    (children: ReactElement) =>
      map(DESTINATION_DROPDOWN_TABS, (tabName) => ({
        key: tabName,
        label: (
          <span data-testid={`tab-label-${tabName}`}>
            {t(`label.${tabName}`)}
          </span>
        ),
        children,
      })),
    []
  );

  const customDestinationDropdown = useCallback(
    (menu: ReactElement, name: number) => {
      return (
        <Tabs
          centered
          activeKey={activeTab}
          className="destination-select-dropdown"
          data-testid={`destination-category-dropdown-${name}`}
          defaultActiveKey={DESTINATION_DROPDOWN_TABS.internal}
          items={getTabItems(menu)}
          key={`destination-tabs-${name}`}
          tabBarStyle={{
            background: WHITE_COLOR,
          }}
          onTabClick={handleTabChange}
        />
      );
    },
    [handleTabChange, getTabItems, activeTab]
  );

  const afterDropdownVisibleChange = (isOpen: boolean) => {
    if (isOpen) {
      return;
    }
    setActiveTab(DESTINATION_DROPDOWN_TABS.internal);
    setDestinationOptions(DESTINATION_SOURCE_ITEMS.internal);
  };

  const getHiddenDestinationFields = (
    isInternalDestination: boolean,
    item: number,
    destinationType: string
  ) => (
    <>
      <Form.Item
        hidden
        initialValue={
          isInternalDestination
            ? destinationType
            : SubscriptionCategory.External
        }
        key={`${destinationType}-category`}
        name={[item, 'category']}
      />
      {!isInternalDestination && (
        <Form.Item
          hidden
          initialValue={destinationType}
          key={`${destinationType}-type`}
          name={[item, 'type']}
        />
      )}
    </>
  );

  return (
    <Card className="alert-form-item-container">
      <Row gutter={[8, 8]}>
        <Col span={24}>
          <Typography.Text className="font-medium">{heading}</Typography.Text>
        </Col>
        <Col span={24}>
          <Typography.Text className="text-xs text-grey-muted">
            {subHeading}
          </Typography.Text>
        </Col>
        <Col span={24}>
          <Form.List
            data-testid="destination-list"
            name={['destinations']}
            rules={[
              {
                validator: listLengthValidator(t('label.destination')),
              },
            ]}>
            {(fields, { add, remove }, { errors }) => {
              return (
                <>
                  {fields.map(({ key, name }) => {
                    const destinationType = form.getFieldValue([
                      'destinations',
                      name,
                      'destinationType',
                    ]);
                    const subscriptionType = form.getFieldValue([
                      'destinations',
                      name,
                      'type',
                    ]);

                    const isInternalDestinationSelected =
                      checkIfDestinationIsInternal(destinationType);

                    return (
                      <Row
                        className="p-b-md"
                        data-testid={`destination-${name}`}
                        gutter={[16, 16]}
                        justify="space-between"
                        key={key}>
                        <Col flex="1 1 auto">
                          <Form.Item
                            required
                            name={[name, 'destinationType']}
                            rules={[
                              {
                                required: true,
                                message: t('message.field-text-is-required', {
                                  fieldText: t('label.destination'),
                                }),
                              },
                            ]}>
                            <Select
                              className="w-full"
                              data-testid={`destination-category-select-${name}`}
                              dropdownRender={(menu) =>
                                customDestinationDropdown(menu, key)
                              }
                              options={destinationOptions}
                              placeholder={t('label.select-field', {
                                field: t('label.destination'),
                              })}
                              onDropdownVisibleChange={
                                afterDropdownVisibleChange
                              }
                              onSelect={(value) => {
                                form.setFieldValue(['destinations', name], {
                                  destinationType: value,
                                });
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col flex="1 1 40%">
                          {getHiddenDestinationFields(
                            isInternalDestinationSelected,
                            name,
                            destinationType
                          )}
                          {selectedDestinations &&
                            !isEmpty(selectedDestinations[name]) &&
                            selectedDestinations[name] &&
                            getDestinationConfigField(
                              selectedDestinations[name]?.destinationType,
                              name
                            )}
                        </Col>
                        <Col className="d-flex justify-end" flex="0 0 32px">
                          <Button
                            data-testid={`remove-destination-${name}`}
                            icon={<CloseOutlined />}
                            onClick={() => remove(name)}
                          />
                        </Col>
                        {destinationType &&
                          checkIfDestinationIsInternal(destinationType) && (
                            <Col span={24}>
                              <Form.Item
                                required
                                extra={
                                  destinationType &&
                                  subscriptionType && (
                                    <Alert
                                      closable
                                      className="m-t-sm"
                                      message={
                                        <Typography.Text className="font-medium text-sm">
                                          {t(
                                            'message.destination-selection-warning',
                                            {
                                              subscriptionCategory:
                                                destinationType,
                                              subscriptionType,
                                            }
                                          )}
                                        </Typography.Text>
                                      }
                                      type="warning"
                                    />
                                  )
                                }
                                name={[name, 'type']}
                                rules={[
                                  {
                                    required: true,
                                    message: t(
                                      'message.field-text-is-required',
                                      {
                                        fieldText: t('label.field'),
                                      }
                                    ),
                                  },
                                ]}>
                                <Select
                                  className="w-full"
                                  data-testid={`destination-type-select-${name}`}
                                  options={getSubscriptionTypeOptions(
                                    destinationType
                                  )}
                                  placeholder={t('label.select-field', {
                                    field: t('label.destination'),
                                  })}
                                />
                              </Form.Item>
                            </Col>
                          )}
                      </Row>
                    );
                  })}

                  {showAddDestination && (
                    <Col span={24}>
                      <Button
                        data-testid="add-destination-button"
                        disabled={
                          isEmpty(selectedTrigger) || isNil(selectedTrigger)
                        }
                        type="primary"
                        onClick={() => add({})}>
                        {buttonLabel}
                      </Button>
                    </Col>
                  )}
                  <Col span={24}>
                    <Form.ErrorList errors={errors} />
                  </Col>
                </>
              );
            }}
          </Form.List>
        </Col>
      </Row>
    </Card>
  );
}

export default DestinationFormItem;
