/*
 *  Copyright 2025 Collate.
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
import { PlusOutlined } from '@ant-design/icons';
import Icon from '@ant-design/icons/lib/components/Icon';
import { Button, Checkbox, Col, Dropdown, Row, Select, Typography } from 'antd';
import { AxiosError } from 'axios';
import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { ENTITY_PATH } from '../../../constants/constants';
import { GlobalSettingsMenuCategory } from '../../../constants/GlobalSettings.constants';
import { usePermissionProvider } from '../../../context/PermissionProvider/PermissionProvider';
import {
  BoostMode,
  ScoreMode,
  SearchSettings,
  TermBoost,
} from '../../../generated/configuration/searchSettings';
import { Settings, SettingType } from '../../../generated/settings/settings';
import { useAuth } from '../../../hooks/authHooks';
import { useApplicationStore } from '../../../hooks/useApplicationStore';
import { EntitySearchSettingsState } from '../../../pages/SearchSettingsPage/searchSettings.interface';
import { getEntityFields } from '../../../rest/metadataTypeAPI';
import {
  restoreSettingsConfig,
  updateSettingsConfig,
} from '../../../rest/settingConfigAPI';
import { getSettingPageEntityBreadCrumb } from '../../../utils/GlobalSettingsUtils';
import {
  boostModeOptions,
  getEntitySearchConfig,
  getSearchSettingCategories,
  scoreModeOptions,
} from '../../../utils/SearchSettingsUtils';
import { showErrorToast, showSuccessToast } from '../../../utils/ToastUtils';
import TitleBreadcrumb from '../../common/TitleBreadcrumb/TitleBreadcrumb.component';
import { TitleBreadcrumbProps } from '../../common/TitleBreadcrumb/TitleBreadcrumb.interface';
import PageLayoutV1 from '../../PageLayoutV1/PageLayoutV1';
import FieldConfiguration from '../FieldConfiguration/FieldConfiguration';
import SearchPreview from '../SearchPreview/SearchPreview';
import TermBoostList from '../TermBoostList/TermBoostList';
import './entity-search-settings.less';

const EntitySearchSettings = () => {
  const { t } = useTranslation();
  const { fqn } = useParams<{
    fqn: keyof typeof ENTITY_PATH;
  }>();

  const { permissions } = usePermissionProvider();
  const { isAdminUser } = useAuth();
  const {
    setAppPreferences,
    appPreferences: { searchConfig, ...appPreferences },
  } = useApplicationStore();

  const [isSaving, setIsSaving] = useState(false);
  const [searchSettings, setSearchSettings] =
    useState<EntitySearchSettingsState>({
      searchFields: [],
      fieldValueBoosts: [],
      boostMode: BoostMode.Multiply,
      scoreMode: ScoreMode.Avg,
      highlightFields: [],
      termBoosts: [],
      isUpdated: false,
    });
  const [previewSearchConfig, setPreviewSearchConfig] =
    useState<SearchSettings>(searchConfig ?? {});
  const [showNewTermBoost, setShowNewTermBoost] = useState<boolean>(false);
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  const entityType = useMemo(() => ENTITY_PATH[fqn], [fqn]);

  const getEntityConfiguration = useMemo(() => {
    return getEntitySearchConfig(searchConfig, entityType);
  }, [searchConfig, entityType]);

  const entityData = useMemo(() => {
    const settingCategories = getSearchSettingCategories(
      permissions,
      isAdminUser ?? false
    );

    return settingCategories?.find((data) => data.key.split('.')[2] === fqn);
  }, [permissions, isAdminUser, fqn]);

  const entitySearchFields = useMemo(() => {
    if (!searchSettings.searchFields) {
      return [];
    }

    return searchSettings.searchFields.map((field) => ({
      fieldName: field.field,
      weight: field.boost ?? 0,
    }));
  }, [searchSettings.searchFields]);

  const breadcrumbs: TitleBreadcrumbProps['titleLinks'] = useMemo(
    () =>
      getSettingPageEntityBreadCrumb(
        GlobalSettingsMenuCategory.PREFERENCES,
        t('label.search')
      ),
    []
  );

  const fetchEntityFields = async () => {
    try {
      const response = await getEntityFields(entityType);
      const fields = response.map((field: { name: string }) => field.name);
      setAvailableFields(fields);
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  useEffect(() => {
    fetchEntityFields();
  }, [entityType]);

  const menuItems = useMemo(
    () => ({
      items: availableFields.map((fieldName) => ({
        key: fieldName,
        label: (
          <Checkbox
            checked={searchSettings.searchFields?.some(
              (field) => field.field === fieldName
            )}
            onChange={() => handleFieldSelection(fieldName)}>
            {fieldName}
          </Checkbox>
        ),
      })),
      className: 'menu-items',
    }),
    [availableFields, searchSettings.searchFields]
  );

  const handleFieldSelection = (fieldName: string) => {
    setSearchSettings((prev) => {
      const isFieldSelected = prev.searchFields?.some(
        (field) => field.field === fieldName
      );

      if (isFieldSelected) {
        // Remove field if already selected
        return {
          ...prev,
          searchFields: prev.searchFields?.filter(
            (field) => field.field !== fieldName
          ),
          isUpdated: true,
        };
      } else {
        // Add new field with boost value 0
        return {
          ...prev,
          searchFields: [
            ...(prev.searchFields ?? []),
            { field: fieldName, boost: 0 },
          ],
          isUpdated: true,
        };
      }
    });
  };

  // Handle save changes - makes API call with all changes
  const updateSearchConfig = async (updatedData: EntitySearchSettingsState) => {
    if (!searchConfig || !getEntityConfiguration) {
      return;
    }

    try {
      setIsSaving(true);
      const updatedConfig = {
        ...searchConfig,
        assetTypeConfigurations: searchConfig.assetTypeConfigurations?.map(
          (config) =>
            config.assetType === entityType
              ? { ...config, ...updatedData }
              : config
        ),
      };

      const configData = {
        config_type: SettingType.SearchSettings,
        config_value: updatedConfig,
      };

      const { data } = await updateSettingsConfig(configData as Settings);
      const updatedSearchConfig = data.config_value as SearchSettings;

      // Update app preferences
      setAppPreferences({
        ...appPreferences,
        searchConfig: updatedSearchConfig,
      });

      showSuccessToast(
        t('server.update-entity-success', {
          entity: t('label.search-setting-plural'),
        })
      );

      setSearchSettings({
        ...searchSettings,
        ...updatedSearchConfig,
        isUpdated: false,
      });
    } catch (error) {
      showErrorToast(error as AxiosError);
    } finally {
      setIsSaving(false);
    }
  };

  // Use the common function for different updates
  const handleSaveChanges = () => {
    if (!getEntityConfiguration) {
      return;
    }

    const updates = {
      searchFields: searchSettings.searchFields,
      highlightFields: searchSettings.highlightFields,
      termBoosts: searchSettings.termBoosts,
      fieldValueBoosts: searchSettings.fieldValueBoosts,
      scoreMode: searchSettings.scoreMode,
      boostMode: searchSettings.boostMode,
    };

    updateSearchConfig(updates);
  };

  const handleModeUpdate = (
    mode: 'boostMode' | 'scoreMode',
    value: BoostMode | ScoreMode
  ) => {
    if (mode === 'boostMode') {
      setSearchSettings((prev) => ({
        ...prev,
        boostMode: value as BoostMode,
        isUpdated: true,
      }));
    } else {
      setSearchSettings((prev) => ({
        ...prev,
        scoreMode: value as ScoreMode,
        isUpdated: true,
      }));
    }
  };

  const handleFieldWeightChange = (fieldName: string, value: number) => {
    setSearchSettings((prev) => {
      const updatedFields = prev.searchFields?.map((field) =>
        field.field === fieldName ? { ...field, boost: value } : field
      );

      return {
        ...prev,
        searchFields: updatedFields,
        isUpdated: true,
      };
    });
  };

  const handleHighlightFieldsChange = (fieldName: string) => {
    const updatedHighlightFields = searchSettings.highlightFields?.includes(
      fieldName
    )
      ? searchSettings.highlightFields?.filter(
          (highlightField) => highlightField !== fieldName
        )
      : [...(searchSettings.highlightFields ?? []), fieldName];

    setSearchSettings((prev) => ({
      ...prev,
      highlightFields: updatedHighlightFields,
      isUpdated: true,
    }));
  };

  const handleDeleteSearchField = (fieldName: string) => {
    setSearchSettings((prev) => ({
      ...prev,
      searchFields: (prev.searchFields ?? []).filter(
        (field) => field.field !== fieldName
      ),
      isUpdated: true,
    }));
  };

  const handleAddNewTermBoost = () => {
    setShowNewTermBoost(true);
  };

  const handleTermBoostChange = (newTermBoost: TermBoost) => {
    if (!newTermBoost.value || !newTermBoost.boost) {
      return;
    }

    setSearchSettings((prev) => {
      const termBoosts = [...(prev.termBoosts || [])];
      const existingIndex = termBoosts.findIndex(
        (tb) => tb.value === newTermBoost.value
      );

      if (existingIndex >= 0) {
        termBoosts[existingIndex] = newTermBoost;
      } else {
        termBoosts.push(newTermBoost);
      }

      return {
        ...prev,
        termBoosts,
        isUpdated: true,
      };
    });

    setShowNewTermBoost(false);
  };

  const handleDeleteTermBoost = (value: string) => {
    // If deleting a new card (empty value), just hide it
    if (!value) {
      setShowNewTermBoost(false);

      return;
    }

    // For existing cards, update the state
    setSearchSettings((prev) => ({
      ...prev,
      termBoosts: prev.termBoosts?.filter((tb) => tb.value !== value) || [],
      isUpdated: true,
    }));
  };

  const handleRestoreDefaults = async () => {
    try {
      const { data } = await restoreSettingsConfig(SettingType.SearchSettings);

      const updatedSearchConfig = data as SearchSettings;

      setAppPreferences({
        ...appPreferences,
        searchConfig: updatedSearchConfig,
      });

      setSearchSettings({
        ...updatedSearchConfig,
        isUpdated: false,
      });

      showSuccessToast(
        t('server.update-entity-success', {
          entity: t('label.search-setting-plural'),
        })
      );
    } catch (error) {
      showErrorToast(error as AxiosError);
    }
  };

  useEffect(() => {
    if (getEntityConfiguration) {
      setSearchSettings({
        searchFields: getEntityConfiguration?.searchFields,
        boostMode: getEntityConfiguration?.boostMode,
        scoreMode: getEntityConfiguration?.scoreMode,
        highlightFields: getEntityConfiguration?.highlightFields,
        fieldValueBoosts: getEntityConfiguration?.fieldValueBoosts,
        termBoosts: getEntityConfiguration?.termBoosts,
        isUpdated: false,
      });
    }
  }, [getEntityConfiguration, searchConfig]);

  // Update preview config whenever searchSettings change
  useEffect(() => {
    if (!searchConfig || !entityType) {
      return;
    }

    // Create updated config for preview
    const updatedConfig: SearchSettings = {
      ...searchConfig,
      assetTypeConfigurations: searchConfig.assetTypeConfigurations?.map(
        (config) =>
          config.assetType === entityType
            ? {
                ...config,
                searchFields: searchSettings.searchFields,
                highlightFields: searchSettings.highlightFields,
                termBoosts: searchSettings.termBoosts,
                fieldValueBoosts: searchSettings.fieldValueBoosts,
                scoreMode: searchSettings.scoreMode,
                boostMode: searchSettings.boostMode,
              }
            : config
      ),
    };

    setPreviewSearchConfig(updatedConfig);
  }, [searchSettings, searchConfig, entityType]);

  return (
    <PageLayoutV1
      className="entity-search-settings"
      pageTitle={t('label.search')}>
      <Row
        className="entity-search-settings-header bg-white m-b-lg p-box"
        data-testid="entity-search-settings-header"
        gutter={[0, 16]}>
        <Col span={24}>
          <TitleBreadcrumb titleLinks={breadcrumbs} />
        </Col>
        <Col className="flex items-center gap-4" span={24}>
          <Icon component={entityData?.icon} style={{ fontSize: '55px' }} />
          <div
            className="page-header-container"
            data-testid="page-header-container">
            <Typography.Title
              className="heading"
              data-testid="heading"
              level={5}>
              {entityData?.label}
            </Typography.Title>
            <Typography.Paragraph
              className="sub-heading"
              data-testid="sub-heading">
              {entityData?.description}
            </Typography.Paragraph>
          </div>
        </Col>
      </Row>
      <Row className="entity-search-settings-header bg-white m-b-lg p-box">
        <Col span={24}>
          <Typography.Text className="text-sm font-semibold">
            {t('label.configure-term-boost')}
          </Typography.Text>
          <TermBoostList
            className="p-box m-t-md"
            handleAddNewTermBoost={handleAddNewTermBoost}
            handleDeleteTermBoost={handleDeleteTermBoost}
            handleTermBoostChange={handleTermBoostChange}
            showNewTermBoost={showNewTermBoost}
            termBoosts={searchSettings.termBoosts ?? []}
          />
        </Col>
      </Row>
      <Row
        className="d-flex gap-5 items-start entity-search-settings-content"
        gutter={0}>
        <Col
          className="bg-white border-radius-card h-full flex-1 p-box configuration-container"
          span={8}>
          <Typography.Title level={5}>
            {t('label.matching-fields')}
          </Typography.Title>
          <Row
            className="p-y-xs config-section"
            data-testid="field-configurations">
            {entitySearchFields.map((field, index) => (
              <Col key={field.fieldName} span={24}>
                <FieldConfiguration
                  field={field}
                  index={index}
                  key={field.fieldName}
                  searchSettings={searchSettings}
                  onDeleteSearchField={handleDeleteSearchField}
                  onFieldWeightChange={handleFieldWeightChange}
                  onHighlightFieldsChange={handleHighlightFieldsChange}
                />
              </Col>
            ))}
            <Col className="m-b-sm" span={24}>
              <Dropdown
                getPopupContainer={(triggerNode) => triggerNode.parentElement!}
                menu={menuItems}
                placement="bottomLeft"
                trigger={['click']}>
                <Button
                  className="add-field-btn"
                  data-testid="add-field-btn"
                  icon={<PlusOutlined />}
                  type="primary">
                  {t('label.add-matching-field')}
                </Button>
              </Dropdown>
            </Col>
            {/* Score Mode and Boost Mode Section */}
            <Col className="flex flex-col w-full">
              <div className="p-y-xs p-x-sm border-radius-card m-b-sm bg-white config-section-content">
                <Typography.Text className="text-grey-muted text-xs font-normal">
                  {t('label.score-mode')}
                </Typography.Text>
                <Select
                  bordered={false}
                  className="w-full border-none custom-select"
                  data-testid="score-mode-select"
                  options={scoreModeOptions}
                  value={searchSettings.scoreMode}
                  onChange={(value: ScoreMode) =>
                    handleModeUpdate('scoreMode', value)
                  }
                />
              </div>
              <div className="p-y-xs p-x-sm border-radius-card m-b-sm bg-white config-section-content">
                <Typography.Text className="text-grey-muted text-xs font-normal">
                  {t('label.boost-mode')}
                </Typography.Text>
                <Select
                  bordered={false}
                  className="w-full border-none custom-select"
                  data-testid="boost-mode-select"
                  options={boostModeOptions}
                  value={searchSettings.boostMode}
                  onChange={(value: BoostMode) =>
                    handleModeUpdate('boostMode', value)
                  }
                />
              </div>
            </Col>
          </Row>
        </Col>
        <Col
          className="bg-white border-radius-card p-box h-full d-flex flex-column preview-section"
          span={16}>
          <div className="preview-content d-flex flex-column flex-1">
            <SearchPreview searchConfig={previewSearchConfig} />
          </div>
          <div className="d-flex justify-end p-t-md">
            <Button
              className="restore-defaults-btn font-semibold"
              data-testid="restore-defaults-btn"
              onClick={handleRestoreDefaults}>
              {t('label.restore-default-plural')}
            </Button>
            <Button
              className="save-btn font-semibold m-l-md"
              data-testid="save-btn"
              disabled={!searchSettings.isUpdated || isSaving}
              loading={isSaving}
              onClick={handleSaveChanges}>
              {t('label.save')}
            </Button>
          </div>
        </Col>
      </Row>
    </PageLayoutV1>
  );
};

export default EntitySearchSettings;
