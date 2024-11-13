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

import { DownOutlined } from '@ant-design/icons';
import Icon from '@ant-design/icons/lib/components/Icon';
import {
  Button,
  Checkbox,
  Col,
  Dropdown,
  Modal,
  Row,
  Space,
  TableProps,
  Tooltip,
} from 'antd';
import {
  ColumnsType,
  ColumnType,
  ExpandableConfig,
} from 'antd/lib/table/interface';
import { AxiosError } from 'axios';
import classNames from 'classnames';
import { compare } from 'fast-json-patch';
import { cloneDeep, isEmpty, isUndefined } from 'lodash';
import React, { useCallback, useMemo, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ReactComponent as IconDrag } from '../../../assets/svg/drag.svg';
import { ReactComponent as EditIcon } from '../../../assets/svg/edit-new.svg';
import { ReactComponent as IconDown } from '../../../assets/svg/ic-arrow-down.svg';
import { ReactComponent as IconRight } from '../../../assets/svg/ic-arrow-right.svg';
import { ReactComponent as DownUpArrowIcon } from '../../../assets/svg/ic-down-up-arrow.svg';
import { ReactComponent as UpDownArrowIcon } from '../../../assets/svg/ic-up-down-arrow.svg';
import { ReactComponent as PlusOutlinedIcon } from '../../../assets/svg/plus-outlined.svg';
import ErrorPlaceHolder from '../../../components/common/ErrorWithPlaceholder/ErrorPlaceHolder';
import { OwnerLabel } from '../../../components/common/OwnerLabel/OwnerLabel.component';
import RichTextEditorPreviewer from '../../../components/common/RichTextEditor/RichTextEditorPreviewer';
import StatusBadge from '../../../components/common/StatusBadge/StatusBadge.component';
import {
  API_RES_MAX_SIZE,
  DE_ACTIVE_COLOR,
  NO_DATA_PLACEHOLDER,
  TEXT_BODY_COLOR,
} from '../../../constants/constants';
import { GLOSSARIES_DOCS } from '../../../constants/docs.constants';
import { TABLE_CONSTANTS } from '../../../constants/Teams.constants';
import { ERROR_PLACEHOLDER_TYPE } from '../../../enums/common.enum';
import { TabSpecificField } from '../../../enums/entity.enum';
import {
  EntityReference,
  GlossaryTerm,
  Status,
} from '../../../generated/entity/data/glossaryTerm';
import {
  getFirstLevelGlossaryTerms,
  getGlossaryTerms,
  GlossaryTermWithChildren,
  patchGlossaryTerm,
} from '../../../rest/glossaryAPI';
import { Transi18next } from '../../../utils/CommonUtils';
import { getEntityName } from '../../../utils/EntityUtils';
import Fqn from '../../../utils/Fqn';
import {
  buildTree,
  findExpandableKeysForArray,
  findGlossaryTermByFqn,
  StatusClass,
} from '../../../utils/GlossaryUtils';
import { getGlossaryPath } from '../../../utils/RouterUtils';
import { showErrorToast } from '../../../utils/ToastUtils';
import { DraggableBodyRowProps } from '../../common/Draggable/DraggableBodyRowProps.interface';
import Loader from '../../common/Loader/Loader';
import Table from '../../common/Table/Table';
import TagButton from '../../common/TagButton/TagButton.component';
import DraggableMenuItem from '../GlossaryColumnsSelectionDropdown/DraggableMenuItem.component';
import { ModifiedGlossary, useGlossaryStore } from '../useGlossary.store';
import {
  GlossaryTermTabProps,
  ModifiedGlossaryTerm,
  MoveGlossaryTermType,
} from './GlossaryTermTab.interface';

const GlossaryTermTab = ({
  refreshGlossaryTerms,
  permissions,
  isGlossary,
  termsLoading,
  onAddGlossaryTerm,
  onEditGlossaryTerm,
  className,
}: GlossaryTermTabProps) => {
  const { activeGlossary, glossaryChildTerms, setGlossaryChildTerms } =
    useGlossaryStore();
  const { t } = useTranslation();

  const glossaryTerms = (glossaryChildTerms as ModifiedGlossaryTerm[]) ?? [];

  const [movedGlossaryTerm, setMovedGlossaryTerm] =
    useState<MoveGlossaryTermType>();
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [isTableHovered, setIsTableHovered] = useState(false);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [isStatusDropdownVisible, setIsStatusDropdownVisible] =
    useState<boolean>(false);
  const statusOptions = useMemo(
    () =>
      Object.values(Status).map((status) => ({ value: status, label: status })),
    []
  );
  const [statusDropdownSelection, setStatusDropdownSelections] = useState<
    string[]
  >(['Approved', 'Draft']);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([
    ...statusDropdownSelection,
  ]);

  const glossaryTermStatus: Status | null = useMemo(() => {
    if (!isGlossary) {
      return (activeGlossary as GlossaryTerm).status ?? Status.Approved;
    }

    return null;
  }, [isGlossary, activeGlossary]);

  const expandableKeys = useMemo(() => {
    return findExpandableKeysForArray(glossaryTerms);
  }, [glossaryTerms]);

  const columns = useMemo(() => {
    const data: ColumnsType<ModifiedGlossaryTerm> = [
      {
        title: t('label.term-plural'),
        dataIndex: 'name',
        key: 'name',
        className: 'glossary-name-column',
        ellipsis: true,
        width: '40%',
        render: (_, record) => {
          const name = getEntityName(record);

          return (
            <>
              {record.style?.iconURL && (
                <img
                  className="m-r-xss vertical-baseline"
                  data-testid="tag-icon"
                  height={12}
                  src={record.style.iconURL}
                />
              )}
              <Link
                className="cursor-pointer vertical-baseline"
                data-testid={name}
                style={{ color: record.style?.color }}
                to={getGlossaryPath(record.fullyQualifiedName || record.name)}>
                {name}
              </Link>
            </>
          );
        },
      },
      {
        title: t('label.description'),
        dataIndex: 'description',
        key: 'description',
        width: permissions.Create ? '21%' : '33%',
        render: (description: string) =>
          description.trim() ? (
            <RichTextEditorPreviewer
              enableSeeMoreVariant
              markdown={description}
              maxLength={120}
            />
          ) : (
            <span className="text-grey-muted">{t('label.no-description')}</span>
          ),
      },
      {
        title: t('label.reviewer'),
        dataIndex: 'reviewers',
        key: 'reviewers',
        width: '33%',
        render: (reviewers: EntityReference[]) => (
          <OwnerLabel owners={reviewers} />
        ),
      },
      {
        title: t('label.synonym-plural'),
        dataIndex: 'synonyms',
        key: 'synonyms',
        width: '33%',
        render: (synonyms: string[]) => {
          return isEmpty(synonyms) ? (
            <div>{NO_DATA_PLACEHOLDER}</div>
          ) : (
            <div className="d-flex flex-wrap">
              {synonyms.map((synonym: string) => (
                <TagButton
                  className="glossary-synonym-tag"
                  key={synonym}
                  label={synonym}
                />
              ))}
            </div>
          );
        },
      },
      {
        title: t('label.owner-plural'),
        dataIndex: 'owners',
        key: 'owners',
        width: '17%',
        render: (owners: EntityReference[]) => <OwnerLabel owners={owners} />,
      },
      {
        title: t('label.status'),
        dataIndex: 'status',
        key: 'status',
        width: '12%',
        render: (_, record) => {
          const status = record.status ?? Status.Approved;

          return (
            <StatusBadge
              dataTestId={record.fullyQualifiedName + '-status'}
              label={status}
              status={StatusClass[status]}
            />
          );
        },
        onFilter: (value, record) => record.status === value,
      },
    ];
    if (permissions.Create) {
      data.push({
        title: t('label.action-plural'),
        key: 'new-term',
        width: '10%',
        render: (_, record) => {
          const status = record.status ?? Status.Approved;
          const allowAddTerm = status === Status.Approved;

          return (
            <div className="d-flex items-center">
              {allowAddTerm && (
                <Tooltip
                  title={t('label.add-entity', {
                    entity: t('label.glossary-term'),
                  })}>
                  <Button
                    className="add-new-term-btn text-grey-muted flex-center"
                    data-testid="add-classification"
                    icon={
                      <PlusOutlinedIcon color={DE_ACTIVE_COLOR} width="14px" />
                    }
                    size="small"
                    type="text"
                    onClick={() => {
                      onAddGlossaryTerm(record as GlossaryTerm);
                    }}
                  />
                </Tooltip>
              )}

              <Tooltip
                title={t('label.edit-entity', {
                  entity: t('label.glossary-term'),
                })}>
                <Button
                  className="cursor-pointer flex-center"
                  data-testid="edit-button"
                  icon={<EditIcon color={DE_ACTIVE_COLOR} width="14px" />}
                  size="small"
                  type="text"
                  onClick={() => onEditGlossaryTerm(record as GlossaryTerm)}
                />
              </Tooltip>
            </div>
          );
        },
      });
    }

    return data;
  }, [glossaryTerms, permissions]);

  const listOfVisibleColumns = useMemo(() => {
    return ['name', 'description', 'owners', 'status', 'new-term'];
  }, []);

  const defaultCheckedList = useMemo(
    () =>
      columns.reduce<string[]>(
        (acc, column) =>
          listOfVisibleColumns.includes(column.key as string)
            ? [...acc, column.key as string]
            : acc,
        []
      ),
    [columns, listOfVisibleColumns]
  );

  const [selectedColumns, setSelectedColumns] =
    useState<string[]>(defaultCheckedList);
  const [columnDropdownSelections, setColumnDropdownSelections] = useState<
    string[]
  >([...selectedColumns]);

  const [isDropdownVisible, setIsDropdownVisible] = useState<boolean>(false);

  const [options, setOptions] = useState<{ value: string; label: string }[]>(
    columns.reduce<{ value: string; label: string }[]>(
      (acc, { key, title }) =>
        key !== 'name'
          ? [...acc, { label: title as string, value: key as string }]
          : acc,
      []
    )
  );

  const newColumns = useMemo(() => {
    return columns.map((item) => ({
      ...item,
      hidden: !selectedColumns.includes(item.key as string),
    }));
  }, [columns, selectedColumns]);

  const rearrangedColumns = useMemo(
    () =>
      newColumns
        .filter((column) => !column.hidden)
        .sort((a, b) => {
          const aIndex = options.findIndex(
            (option: { value: string; label: string }) => option.value === a.key
          );
          const bIndex = options.findIndex(
            (option: { value: string; label: string }) => option.value === b.key
          );

          return aIndex - bIndex;
        }),
    [newColumns]
  );

  const handleColumnSelectionDropdownSave = useCallback(() => {
    setSelectedColumns(columnDropdownSelections);
    setIsDropdownVisible(false);
  }, [columnDropdownSelections]);

  const handleColumnSelectionDropdownCancel = useCallback(() => {
    setColumnDropdownSelections(selectedColumns);
    setIsDropdownVisible(false);
  }, [selectedColumns]);

  const handleMoveItem = (updatedList: { value: string; label: string }[]) => {
    setOptions(updatedList);
    setColumnDropdownSelections((prevCheckedList) => {
      const updatedCheckedList = prevCheckedList.map((item) => {
        const index = updatedList.findIndex((option) => option.value === item);

        return updatedList[index]?.value || item;
      });

      return updatedCheckedList;
    });
  };
  const handleCheckboxChange = useCallback(
    (key: string, checked: boolean, type: 'columns' | 'status') => {
      const setCheckedList =
        type === 'columns'
          ? setColumnDropdownSelections
          : setStatusDropdownSelections;

      const optionsToUse =
        type === 'columns'
          ? (columns as ColumnType<ModifiedGlossaryTerm>[])
          : (statusOptions as { value: string }[]);

      if (key === 'all') {
        if (checked) {
          const newCheckedList = [
            'all',
            ...optionsToUse.map((option) => {
              return type === 'columns'
                ? String((option as ColumnType<ModifiedGlossaryTerm>).key)
                : (option as { value: string }).value ?? '';
            }),
          ];
          setCheckedList(newCheckedList);
        } else {
          setCheckedList([type === 'columns' ? 'name' : 'Draft']);
        }
      } else {
        setCheckedList((prev: string[]) => {
          const newCheckedList = checked
            ? [...prev, key]
            : prev.filter((item) => item !== key);

          const allChecked =
            type === 'columns'
              ? (optionsToUse as ColumnType<ModifiedGlossaryTerm>[]).every(
                  (opt) => newCheckedList.includes(String(opt.key))
                )
              : (optionsToUse as { value: string }[]).every((opt) =>
                  newCheckedList.includes(opt.value ?? '')
                );

          if (allChecked) {
            return ['all', ...newCheckedList];
          }

          return newCheckedList.filter((item) => item !== 'all');
        });
      }
    },
    [
      columns,
      statusOptions,
      setColumnDropdownSelections,
      setStatusDropdownSelections,
    ]
  );

  const menu = useMemo(
    () => ({
      items: [
        {
          key: 'addColumn',
          label: (
            <div className="glossary-col-sel-dropdown-title">
              <p className="m-l-md">{t('label.add-column')}</p>
              <Checkbox.Group
                className="glossary-col-sel-checkbox-group"
                value={columnDropdownSelections}>
                <Checkbox
                  checked={columns
                    .filter((col) => col.key === 'name')
                    .every(({ key }) =>
                      columnDropdownSelections.includes(key as string)
                    )}
                  className="custom-glossary-col-sel-checkbox m-l-lg p-l-md"
                  key="all"
                  value="all"
                  onChange={(e) =>
                    handleCheckboxChange('all', e.target.checked, 'columns')
                  }>
                  {t('label.all')}
                </Checkbox>
                {options.map(
                  (option: { value: string; label: string }, index: number) => (
                    <div
                      className="d-flex justify-start items-center"
                      key={option.value}>
                      <DraggableMenuItem
                        index={index}
                        option={option}
                        options={options}
                        selectedOptions={columnDropdownSelections}
                        onMoveItem={handleMoveItem}
                        onSelect={handleCheckboxChange}
                      />
                    </div>
                  )
                )}
              </Checkbox.Group>
            </div>
          ),
        },
        {
          key: 'divider',
          type: 'divider',
        },
        {
          key: 'actions',
          label: (
            <div className="flex-center">
              <Space>
                <Button
                  type="primary"
                  onClick={handleColumnSelectionDropdownSave}>
                  {t('label.save')}
                </Button>
                <Button
                  type="default"
                  onClick={handleColumnSelectionDropdownCancel}>
                  {t('label.cancel')}
                </Button>
              </Space>
            </div>
          ),
        },
      ],
    }),
    [
      columnDropdownSelections,
      columns,
      options,
      handleCheckboxChange,
      handleColumnSelectionDropdownSave,
      handleColumnSelectionDropdownCancel,
    ]
  );
  const handleStatusSelectionDropdownSave = () => {
    setSelectedStatus(statusDropdownSelection);
    setIsStatusDropdownVisible(false);
  };

  const handleStatusSelectionDropdownCancel = () => {
    setStatusDropdownSelections(selectedStatus);
    setIsStatusDropdownVisible(false);
  };
  const statusDropdownMenu = useMemo(
    () => ({
      items: [
        {
          key: 'statusSelection',
          label: (
            <div className="status-selection-dropdown">
              <Checkbox.Group
                className="glossary-col-sel-checkbox-group"
                value={statusDropdownSelection}>
                <Checkbox
                  className="custom-glossary-col-sel-checkbox"
                  key="all"
                  value="all"
                  onChange={(e) =>
                    handleCheckboxChange('all', e.target.checked, 'status')
                  }>
                  <p className="glossary-dropdown-label">{t('label.all')}</p>
                </Checkbox>
                {statusOptions.map((option) => (
                  <div key={option.value}>
                    <Checkbox
                      className="custom-glossary-col-sel-checkbox"
                      value={option.value}
                      onChange={(e) =>
                        handleCheckboxChange(
                          option.value,
                          e.target.checked,
                          'status'
                        )
                      }>
                      <p className="glossary-dropdown-label">{option.label}</p>
                    </Checkbox>
                  </div>
                ))}
              </Checkbox.Group>
            </div>
          ),
        },
        {
          key: 'divider',
          type: 'divider',
        },
        {
          key: 'actions',
          label: (
            <div className="flex-center">
              <Space>
                <Button
                  type="primary"
                  onClick={handleStatusSelectionDropdownSave}>
                  {t('label.save')}
                </Button>
                <Button
                  type="default"
                  onClick={handleStatusSelectionDropdownCancel}>
                  {t('label.cancel')}
                </Button>
              </Space>
            </div>
          ),
        },
      ],
    }),
    [
      statusDropdownSelection,
      statusOptions,
      handleStatusSelectionDropdownSave,
      handleStatusSelectionDropdownCancel,
    ]
  );

  const handleAddGlossaryTermClick = () => {
    onAddGlossaryTerm(
      !isGlossary ? (activeGlossary as GlossaryTerm) : undefined
    );
  };

  const expandableConfig: ExpandableConfig<ModifiedGlossaryTerm> = useMemo(
    () => ({
      expandIcon: ({ expanded, onExpand, record }) => {
        const { children, childrenCount } = record;

        return childrenCount ?? children?.length ?? 0 > 0 ? (
          <>
            <IconDrag className="m-r-xs drag-icon" height={12} width={8} />
            <Icon
              className="m-r-xs vertical-baseline"
              component={expanded ? IconDown : IconRight}
              data-testid="expand-icon"
              style={{ fontSize: '10px', color: TEXT_BODY_COLOR }}
              onClick={(e) => onExpand(record, e)}
            />
          </>
        ) : (
          <>
            <IconDrag className="m-r-xs drag-icon" height={12} width={8} />
            <span className="expand-cell-empty-icon-container" />
          </>
        );
      },
      expandedRowKeys: expandedRowKeys,
      onExpand: async (expanded, record) => {
        if (expanded) {
          let children = record.children as GlossaryTermWithChildren[];
          if (!children?.length) {
            const { data } = await getFirstLevelGlossaryTerms(
              record.fullyQualifiedName || ''
            );
            const terms = cloneDeep(glossaryTerms) ?? [];

            const item = findGlossaryTermByFqn(
              terms,
              record.fullyQualifiedName ?? ''
            );

            (item as ModifiedGlossary).children = data;

            setGlossaryChildTerms(terms as ModifiedGlossary[]);

            children = data;
          }
          setExpandedRowKeys([
            ...expandedRowKeys,
            record.fullyQualifiedName || '',
          ]);

          return children;
        } else {
          setExpandedRowKeys(
            expandedRowKeys.filter((key) => key !== record.fullyQualifiedName)
          );
        }

        return <Loader />;
      },
    }),
    [glossaryTerms, setGlossaryChildTerms, expandedRowKeys]
  );

  const handleMoveRow = useCallback(
    async (dragRecord: GlossaryTerm, dropRecord?: GlossaryTerm) => {
      const dropRecordFqnPart =
        Fqn.split(dragRecord.fullyQualifiedName ?? '').length === 2;

      if (isUndefined(dropRecord) && dropRecordFqnPart) {
        return;
      }
      if (dragRecord.id === dropRecord?.id) {
        return;
      }

      setMovedGlossaryTerm({
        from: dragRecord,
        to: dropRecord,
      });
      setIsModalOpen(true);
    },
    []
  );

  const handleTableHover = (value: boolean) => setIsTableHovered(value);

  const handleChangeGlossaryTerm = async () => {
    if (movedGlossaryTerm) {
      setIsTableLoading(true);
      const newTermData = {
        ...movedGlossaryTerm.from,
        parent: isUndefined(movedGlossaryTerm.to)
          ? null
          : {
              fullyQualifiedName: movedGlossaryTerm.to.fullyQualifiedName,
            },
      };
      const jsonPatch = compare(movedGlossaryTerm.from, newTermData);

      try {
        await patchGlossaryTerm(movedGlossaryTerm.from?.id || '', jsonPatch);
        refreshGlossaryTerms && refreshGlossaryTerms();
      } catch (error) {
        showErrorToast(error as AxiosError);
      } finally {
        setIsTableLoading(false);
        setIsModalOpen(false);
        setIsTableHovered(false);
      }
    }
  };

  const onTableRow: TableProps<ModifiedGlossaryTerm>['onRow'] = (
    record,
    index
  ) =>
    ({
      index,
      handleMoveRow,
      handleTableHover,
      record,
    } as DraggableBodyRowProps<GlossaryTerm>);

  const onTableHeader: TableProps<ModifiedGlossaryTerm>['onHeaderRow'] = () =>
    ({
      handleMoveRow,
      handleTableHover,
    } as DraggableBodyRowProps<GlossaryTerm>);

  const onDragConfirmationModalClose = useCallback(() => {
    setIsModalOpen(false);
    setIsTableHovered(false);
  }, []);

  const fetchAllTerms = async () => {
    setIsTableLoading(true);
    const key = isGlossary ? 'glossary' : 'parent';
    const { data } = await getGlossaryTerms({
      [key]: activeGlossary?.id || '',
      limit: API_RES_MAX_SIZE,
      fields: [
        TabSpecificField.OWNERS,
        TabSpecificField.PARENT,
        TabSpecificField.CHILDREN,
      ],
    });
    setGlossaryChildTerms(buildTree(data) as ModifiedGlossary[]);
    const keys = data.reduce((prev, curr) => {
      if (curr.children?.length) {
        prev.push(curr.fullyQualifiedName ?? '');
      }

      return prev;
    }, [] as string[]);

    setExpandedRowKeys(keys);

    setIsTableLoading(false);
  };

  const toggleExpandAll = () => {
    if (expandedRowKeys.length === expandableKeys.length) {
      setExpandedRowKeys([]);
    } else {
      fetchAllTerms();
    }
  };

  const isAllExpanded = useMemo(() => {
    return expandedRowKeys.length === expandableKeys.length;
  }, [expandedRowKeys, expandableKeys]);

  if (termsLoading) {
    return <Loader />;
  }

  if (isEmpty(glossaryTerms)) {
    return (
      <ErrorPlaceHolder
        className="m-t-xlg"
        doc={GLOSSARIES_DOCS}
        heading={t('label.glossary-term')}
        permission={permissions.Create}
        placeholderText={t('message.no-glossary-term')}
        type={
          permissions.Create && glossaryTermStatus === Status.Approved
            ? ERROR_PLACEHOLDER_TYPE.CREATE
            : ERROR_PLACEHOLDER_TYPE.NO_DATA
        }
        onClick={handleAddGlossaryTermClick}
      />
    );
  }

  return (
    <Row className={className} gutter={[0, 16]}>
      <Col span={24}>
        <div className="d-flex justify-end">
          <Button
            className="text-primary m-b-sm"
            data-testid="expand-collapse-all-button"
            size="small"
            type="text"
            onClick={toggleExpandAll}>
            <Space align="center" size={4}>
              {isAllExpanded ? (
                <DownUpArrowIcon color={DE_ACTIVE_COLOR} height="14px" />
              ) : (
                <UpDownArrowIcon color={DE_ACTIVE_COLOR} height="14px" />
              )}

              {isAllExpanded ? t('label.collapse-all') : t('label.expand-all')}
            </Space>
          </Button>
          <Dropdown
            className="custom-glossary-dropdown-menu status-dropdown"
            getPopupContainer={(trigger) => {
              const customContainer = trigger.closest(
                '.custom-glossary-dropdown-menu.status-dropdown'
              );

              return customContainer as HTMLElement;
            }}
            menu={statusDropdownMenu}
            open={isStatusDropdownVisible}
            trigger={['click']}
            onOpenChange={setIsStatusDropdownVisible}>
            <Button
              className="custom-status-dropdown-btn m-r-sm"
              data-testid="glossary-status-dropdown">
              <Space>
                {t('label.status')}
                <DownOutlined />
              </Space>
            </Button>
          </Dropdown>
          <DndProvider backend={HTML5Backend}>
            <Dropdown
              className="mb-4 custom-glossary-dropdown-menu"
              getPopupContainer={(trigger) => {
                const customContainer = trigger.closest(
                  '.custom-glossary-dropdown-menu'
                );

                return customContainer as HTMLElement;
              }}
              menu={menu}
              open={isDropdownVisible}
              trigger={['click']}
              onOpenChange={setIsDropdownVisible}>
              <Button
                className="custom-status-dropdown-btn m-r-xs"
                data-testid="glossary-column-dropdown">
                <Space>
                  {t('label.column-plural')}
                  <DownOutlined />
                </Space>
              </Button>
            </Dropdown>
          </DndProvider>
        </div>

        {glossaryTerms.length > 0 ? (
          <DndProvider backend={HTML5Backend}>
            <Table
              bordered
              className={classNames('drop-over-background', {
                'drop-over-table': isTableHovered,
              })}
              columns={rearrangedColumns.filter((col) => !col.hidden)}
              components={TABLE_CONSTANTS}
              data-testid="glossary-terms-table"
              dataSource={glossaryTerms.filter((term) =>
                selectedStatus.includes(term.status as string)
              )}
              expandable={expandableConfig}
              loading={isTableLoading}
              pagination={false}
              rowKey="fullyQualifiedName"
              size="small"
              tableLayout="fixed"
              onHeaderRow={onTableHeader}
              onRow={onTableRow}
            />
          </DndProvider>
        ) : (
          <ErrorPlaceHolder />
        )}
        <Modal
          centered
          destroyOnClose
          closable={false}
          confirmLoading={isTableLoading}
          data-testid="confirmation-modal"
          maskClosable={false}
          okText={t('label.confirm')}
          open={isModalOpen}
          title={t('label.move-the-entity', {
            entity: t('label.glossary-term'),
          })}
          onCancel={onDragConfirmationModalClose}
          onOk={handleChangeGlossaryTerm}>
          <Transi18next
            i18nKey="message.entity-transfer-message"
            renderElement={<strong />}
            values={{
              from: movedGlossaryTerm?.from.name,
              to:
                movedGlossaryTerm?.to?.name ??
                (activeGlossary && getEntityName(activeGlossary)),
              entity: isUndefined(movedGlossaryTerm?.to)
                ? ''
                : t('label.term-lowercase'),
            }}
          />
        </Modal>
      </Col>
    </Row>
  );
};

export default GlossaryTermTab;
