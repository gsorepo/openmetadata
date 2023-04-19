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
import { Button, Space, Table, Typography } from 'antd';
import { ColumnsType } from 'antd/lib/table';
import { ReactComponent as EditIcon } from 'assets/svg/edit-new.svg';
import RichTextEditorPreviewer from 'components/common/rich-text-editor/RichTextEditorPreviewer';
import { CellRendered } from 'components/ContainerDetail/ContainerDataModel/ContainerDataModel.interface';
import { ModalWithMarkdownEditor } from 'components/Modals/ModalWithMarkdownEditor/ModalWithMarkdownEditor';
import TagsContainer from 'components/Tag/TagsContainer/tags-container';
import TagsViewer from 'components/Tag/TagsViewer/tags-viewer';
import { Column } from 'generated/entity/data/dashboardDataModel';
import { cloneDeep, isEmpty, isUndefined } from 'lodash';
import { EntityTags, TagOption } from 'Models';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  updateDataModelColumnDescription,
  updateDataModelColumnTags,
} from 'utils/DataModelsUtils';
import { getEntityName } from 'utils/EntityUtils';
import { fetchTagsAndGlossaryTerms } from 'utils/TagsUtils';
import { ModelTabProps } from './ModelTab.interface';

const ModelTab = ({
  data,
  isReadOnly,
  hasEditDescriptionPermission,
  hasEditTagsPermission,
  onUpdate,
}: ModelTabProps) => {
  const { t } = useTranslation();
  const [editColumnDescription, setEditColumnDescription] = useState<Column>();
  const [editContainerColumnTags, setEditContainerColumnTags] =
    useState<Column>();

  const [tagList, setTagList] = useState<TagOption[]>([]);
  const [isTagLoading, setIsTagLoading] = useState<boolean>(false);
  const [tagFetchFailed, setTagFetchFailed] = useState<boolean>(false);

  const fetchTags = useCallback(async () => {
    setIsTagLoading(true);
    try {
      const tagsAndTerms = await fetchTagsAndGlossaryTerms();
      setTagList(tagsAndTerms);
    } catch (error) {
      setTagList([]);
      setTagFetchFailed(true);
    } finally {
      setIsTagLoading(false);
    }
  }, [fetchTagsAndGlossaryTerms]);

  const handleFieldTagsChange = useCallback(
    async (selectedTags: EntityTags[] = [], columnName: string) => {
      const newSelectedTags: TagOption[] = selectedTags.map((tag) => ({
        fqn: tag.tagFQN,
        source: tag.source,
      }));

      const dataModelData = cloneDeep(data);

      updateDataModelColumnTags(dataModelData, columnName, newSelectedTags);

      await onUpdate(dataModelData);

      setEditContainerColumnTags(undefined);
    },
    [data, updateDataModelColumnTags]
  );

  const handleColumnDescriptionChange = useCallback(
    async (updatedDescription: string) => {
      if (!isUndefined(editColumnDescription)) {
        const dataModelColumns = cloneDeep(data);
        updateDataModelColumnDescription(
          dataModelColumns,
          editColumnDescription?.name,
          updatedDescription
        );
        await onUpdate(dataModelColumns);
      }
      setEditColumnDescription(undefined);
    },
    [editColumnDescription, data]
  );

  const handleAddTagClick = useCallback(
    (record: Column) => {
      if (isUndefined(editContainerColumnTags)) {
        setEditContainerColumnTags(record);
        // Fetch tags and terms only once
        if (tagList.length === 0 || tagFetchFailed) {
          fetchTags();
        }
      }
    },
    [editContainerColumnTags, tagList, tagFetchFailed]
  );

  const renderColumnDescription: CellRendered<Column, 'description'> =
    useCallback(
      (description, record, index) => {
        return (
          <Space
            className="custom-group w-full"
            data-testid="description"
            id={`field-description-${index}`}
            size={4}>
            <>
              {description ? (
                <RichTextEditorPreviewer markdown={description} />
              ) : (
                <Typography.Text className="tw-no-description">
                  {t('label.no-entity', {
                    entity: t('label.description'),
                  })}
                </Typography.Text>
              )}
            </>
            {isReadOnly && !hasEditDescriptionPermission ? null : (
              <Button
                className="p-0 opacity-0 group-hover-opacity-100"
                data-testid="edit-button"
                icon={<EditIcon width="16px" />}
                type="text"
                onClick={() => setEditColumnDescription(record)}
              />
            )}
          </Space>
        );
      },
      [isReadOnly, hasEditDescriptionPermission]
    );

  const renderColumnTags: CellRendered<Column, 'tags'> = useCallback(
    (tags, record: Column) => {
      const isSelectedField = editContainerColumnTags?.name === record.name;
      const isUpdatingTags = isSelectedField || !isEmpty(tags);

      return (
        <>
          {isReadOnly ? (
            <TagsViewer sizeCap={-1} tags={tags || []} />
          ) : (
            <Space
              align={isUpdatingTags ? 'start' : 'center'}
              className="justify-between"
              data-testid="tags-wrapper"
              direction={isUpdatingTags ? 'vertical' : 'horizontal'}
              onClick={() => handleAddTagClick(record)}>
              <TagsContainer
                editable={isSelectedField}
                isLoading={isTagLoading && isSelectedField}
                selectedTags={tags || []}
                showAddTagButton={hasEditTagsPermission}
                size="small"
                tagList={tagList}
                type="label"
                onCancel={() => setEditContainerColumnTags(undefined)}
                onSelectionChange={(tags) =>
                  handleFieldTagsChange(tags, record.name)
                }
              />
            </Space>
          )}
        </>
      );
    },
    [
      editContainerColumnTags,
      isReadOnly,
      isTagLoading,
      tagList,
      hasEditTagsPermission,
    ]
  );

  const tableColumn: ColumnsType<Column> = useMemo(
    () => [
      {
        title: t('label.name'),
        dataIndex: 'name',
        key: 'name',
        width: 250,
        render: (_, record) => (
          <Typography.Text>{getEntityName(record)}</Typography.Text>
        ),
      },
      {
        title: t('label.type'),
        dataIndex: 'dataType',
        key: 'dataType',
        width: 100,
        render: (dataType, record) => (
          <Typography.Text>
            {record.dataTypeDisplay || dataType}
          </Typography.Text>
        ),
      },
      {
        title: t('label.description'),
        dataIndex: 'description',
        key: 'description',
        accessor: 'description',
        render: renderColumnDescription,
      },
      {
        title: t('label.tag-plural'),
        dataIndex: 'tags',
        key: 'tags',
        accessor: 'tags',
        width: 350,
        render: renderColumnTags,
      },
    ],
    [
      editColumnDescription,
      hasEditDescriptionPermission,
      hasEditTagsPermission,
      editContainerColumnTags,
      isReadOnly,
      isTagLoading,
    ]
  );

  return (
    <>
      <Table
        bordered
        className="p-t-xs"
        columns={tableColumn}
        data-testid="data-model-column-table"
        dataSource={data}
        pagination={false}
        rowKey="name"
        size="small"
      />

      {editColumnDescription && (
        <ModalWithMarkdownEditor
          header={`${t('label.edit-entity', {
            entity: t('label.column'),
          })}: "${editColumnDescription.name}"`}
          placeholder={t('label.enter-field-description', {
            field: t('label.column'),
          })}
          value={editColumnDescription.description || ''}
          visible={Boolean(editColumnDescription)}
          onCancel={() => setEditColumnDescription(undefined)}
          onSave={handleColumnDescriptionChange}
        />
      )}
    </>
  );
};

export default ModelTab;
