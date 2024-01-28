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

import { Button, Card, Col, Form, Row, Select, Typography } from 'antd';
import { startCase } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFqn } from '../../../hooks/useFqn';
import { getEntityIcon } from '../../../utils/TableUtils';
import { ObservabilityFormTriggerItemProps } from './ObservabilityFormTriggerItem.interface';

function ObservabilityFormTriggerItem({
  filterResources,
}: Readonly<ObservabilityFormTriggerItemProps>) {
  const { t } = useTranslation();
  const form = Form.useFormInstance();
  const { fqn } = useFqn();
  const [selectedResource, setSelectedResource] = useState<string[]>([]);

  const [isEditMode, setIsEditMode] = useState(false);

  const handleAddTriggerClick = useCallback(() => {
    setIsEditMode(true);
  }, []);

  const resourcesOptions = useMemo(
    () =>
      filterResources.map((resource) => ({
        label: (
          <div
            className="d-flex items-center gap-2"
            data-testid={`${resource.name}-option`}>
            <div className="d-flex h-4 w-4">
              {getEntityIcon(resource.name ?? '')}
            </div>
            <span>{startCase(resource.name)}</span>
          </div>
        ),
        value: resource.name,
      })),
    [filterResources]
  );

  const handleTriggerChange = (value: string) => {
    form.setFieldValue('input', {});
    setSelectedResource([value]);
    form.setFieldValue('resources', [value]);
  };

  return (
    <Card className="alert-form-item-container">
      <Row gutter={[8, 8]}>
        <Col span={24}>
          <Typography.Text className="font-medium">
            {t('label.trigger')}
          </Typography.Text>
        </Col>
        <Col span={24}>
          <Typography.Text className="text-xs text-grey-muted">
            {t('message.alerts-trigger-description')}
          </Typography.Text>
        </Col>
        <Col span={24}>
          <Form.Item
            required
            initialValue={
              fqn
                ? form.getFieldValue(['filteringRules', 'resources'])
                : undefined
            }
            messageVariables={{
              fieldName: t('label.data-asset-plural'),
            }}
            name={['resources']}
            rules={[
              {
                required: true,
                message: t('label.please-select-entity', {
                  entity: t('label.data-asset'),
                }),
              },
            ]}>
            {isEditMode || fqn ? (
              <Select
                className="w-full"
                data-testid="trigger-select"
                options={resourcesOptions}
                placeholder={t('label.select-field', {
                  field: t('label.data-asset-plural'),
                })}
                value={selectedResource[0]}
                onChange={handleTriggerChange}
              />
            ) : (
              <Button
                data-testid="add-trigger-button"
                type="primary"
                onClick={handleAddTriggerClick}>
                {t('label.add-entity', {
                  entity: t('label.trigger'),
                })}
              </Button>
            )}
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}

export default ObservabilityFormTriggerItem;
