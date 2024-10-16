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
import { Button, Modal, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AxiosError } from 'axios';
import { EntityType } from '../../../enums/entity.enum';
import { GlossaryTerm } from '../../../generated/entity/data/glossaryTerm';
import { Type } from '../../../generated/entity/type';
import { getTypeByFQN } from '../../../rest/metadataTypeAPI';
import {
  convertCustomPropertyStringToEntityExtension,
  convertEntityExtensionToCustomPropertyString,
} from '../../../utils/CSV/CSV.utils';
import { showErrorToast } from '../../../utils/ToastUtils';
import { CustomPropertyTable } from '../../common/CustomPropertyTable/CustomPropertyTable';
import Loader from '../../common/Loader/Loader';
import {
  ExtensionDataProps,
  ModalWithCustomPropertyEditorProps,
} from './ModalWithMarkdownEditor.interface';

export const ModalWithCustomPropertyEditor = ({
  header,
  entityType,
  value,
  onSave,
  onCancel,
  visible,
}: ModalWithCustomPropertyEditorProps) => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaveLoading, setIsSaveLoading] = useState<boolean>(false);
  const [customPropertyValue, setCustomPropertyValue] =
    useState<ExtensionDataProps>();
  const [customPropertyTypes, setCustomPropertyTypes] = useState<Type>();

  const fetchTypeDetail = async () => {
    setIsLoading(true);
    try {
      const response = await getTypeByFQN(entityType);
      setCustomPropertyTypes(response);
      setCustomPropertyValue(
        convertCustomPropertyStringToEntityExtension(value ?? '', response)
      );
    } catch (err) {
      showErrorToast(err as AxiosError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveData = async () => {
    setIsSaveLoading(true);
    await onSave(
      convertEntityExtensionToCustomPropertyString(
        customPropertyValue,
        customPropertyTypes
      )
    );
    setIsSaveLoading(false);
  };

  const onExtensionUpdate = async (data: GlossaryTerm) => {
    setCustomPropertyValue(data.extension);
  };

  useEffect(() => {
    fetchTypeDetail();
  }, []);

  return (
    <Modal
      centered
      destroyOnClose
      className="description-markdown-editor"
      closable={false}
      data-testid="custom-property-editor"
      footer={[
        <Button
          data-testid="cancel"
          disabled={isSaveLoading}
          key="cancelButton"
          type="link"
          onClick={onCancel}>
          {t('label.cancel')}
        </Button>,
        <Button
          data-testid="save"
          key="saveButton"
          loading={isSaveLoading}
          type="primary"
          onClick={handleSaveData}>
          {t('label.save')}
        </Button>,
      ]}
      maskClosable={false}
      open={visible}
      title={<Typography.Text data-testid="header">{header}</Typography.Text>}
      width={650}
      onCancel={onCancel}>
      {isLoading ? (
        <Loader />
      ) : (
        <CustomPropertyTable
          hasEditAccess
          hasPermission
          isRenderedInRightPanel
          entityDetails={{ extension: customPropertyValue } as GlossaryTerm}
          entityType={EntityType.GLOSSARY_TERM}
          handleExtensionUpdate={onExtensionUpdate}
        />
      )}
    </Modal>
  );
};
