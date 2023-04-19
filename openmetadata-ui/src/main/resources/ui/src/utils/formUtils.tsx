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
import {
  Divider,
  Form,
  FormRule,
  Input,
  InputNumber,
  Select,
  Space,
} from 'antd';
import FilterPattern from 'components/common/FilterPattern/FilterPattern';
import { FilterPatternProps } from 'components/common/FilterPattern/filterPattern.interface';
import RichTextEditor from 'components/common/rich-text-editor/RichTextEditor';
import { RichTextEditorProp } from 'components/common/rich-text-editor/RichTextEditor.interface';
import ToggleSwitchV1, {
  ToggleSwitchV1Props,
} from 'components/common/toggle-switch/ToggleSwitchV1';
import SliderWithInput from 'components/SliderWithInput/SliderWithInput';
import { SliderWithInputProps } from 'components/SliderWithInput/SliderWithInput.interface';
import React, { ReactNode } from 'react';
import i18n from './i18next/LocalUtil';

export enum FieldTypes {
  TEXT = 'text',
  FILTER_PATTERN = 'filter_pattern',
  SWITCH = 'switch',
  SELECT = 'select',
  NUMBER = 'number',
  SLIDER_INPUT = 'slider_input',
  DESCRIPTION = 'description',
}

export interface FieldProp {
  label: ReactNode;
  name: string;
  type: FieldTypes;
  required: boolean;
  id: string;
  props?: Record<string, unknown>;
  rules?: FormRule[];
  helperText?: string;
  placeholder?: string;
  hasSeparator?: boolean;
}

const HIDE_LABEL = [FieldTypes.SWITCH];

export const getField = (field: FieldProp) => {
  const {
    label,
    name,
    type,
    required,
    props,
    rules = [],
    placeholder,
    id,
    hasSeparator = false,
  } = field;

  let fieldElement: ReactNode = null;
  let fieldRules = [...rules];
  if (required) {
    fieldRules = [
      ...fieldRules,
      { required, message: i18n.t('label.field-required', { field: name }) },
    ];
  }

  switch (type) {
    case FieldTypes.TEXT:
      fieldElement = <Input {...props} placeholder={placeholder} />;

      break;
    case FieldTypes.NUMBER:
      fieldElement = <InputNumber {...props} placeholder={placeholder} />;

      break;

    case FieldTypes.FILTER_PATTERN:
      fieldElement = (
        <FilterPattern {...(props as unknown as FilterPatternProps)} />
      );

      break;

    case FieldTypes.SWITCH:
      fieldElement = (
        <Space>
          {label}
          <ToggleSwitchV1 {...(props as unknown as ToggleSwitchV1Props)} />
        </Space>
      );

      break;
    case FieldTypes.SELECT:
      fieldElement = <Select {...props} />;

      break;
    case FieldTypes.SLIDER_INPUT:
      fieldElement = (
        <SliderWithInput {...(props as unknown as SliderWithInputProps)} />
      );

      break;
    case FieldTypes.DESCRIPTION:
      fieldElement = (
        <RichTextEditor {...(props as unknown as RichTextEditorProp)} />
      );

      break;
    default:
      break;
  }

  return (
    <Form.Item
      id={id}
      key={id}
      label={!HIDE_LABEL.includes(type) ? label : null}
      name={name}
      rules={fieldRules}>
      <>
        {fieldElement}
        {hasSeparator && <Divider />}
      </>
    </Form.Item>
  );
};

export const generateFormFields = (fields: FieldProp[]) => {
  return <>{fields.map((field) => getField(field))}</>;
};
