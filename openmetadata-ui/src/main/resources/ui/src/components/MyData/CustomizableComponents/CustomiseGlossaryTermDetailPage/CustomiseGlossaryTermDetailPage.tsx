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

import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import gridBgImg from '../../../../assets/img/grid-bg-img.png';
import { Page } from '../../../../generated/system/ui/page';
import { useGridLayoutDirection } from '../../../../hooks/useGridLayoutDirection';
import { WidgetConfig } from '../../../../pages/CustomizablePage/CustomizablePage.interface';
import { useCustomizeStore } from '../../../../pages/CustomizablePage/CustomizeStore';
import '../../../../pages/MyDataPage/my-data.less';
import customizeGlossaryTermPageClassBase from '../../../../utils/CustomiseGlossaryTermPage/CustomizeGlossaryTermPage';
import {
  getLayoutWithEmptyWidgetPlaceholder,
  getUniqueFilteredLayout,
} from '../../../../utils/CustomizableLandingPageUtils';
import { getEntityName } from '../../../../utils/EntityUtils';
import { CustomizeTabWidget } from '../../../Glossary/CustomiseWidgets/CustomizeTabWidget/CustomizeTabWidget';
import { GlossaryHeaderWidget } from '../../../Glossary/GlossaryHeader/GlossaryHeaderWidget';
import PageLayoutV1 from '../../../PageLayoutV1/PageLayoutV1';
import { CustomizablePageHeader } from '../CustomizablePageHeader/CustomizablePageHeader';
import { CustomizeMyDataProps } from '../CustomizeMyData/CustomizeMyData.interface';

function CustomizeGlossaryTermDetailPage({
  personaDetails,
  onSaveLayout,
  isGlossary,
}: Readonly<CustomizeMyDataProps>) {
  const { t } = useTranslation();
  const { currentPage, currentPageType } = useCustomizeStore();

  const [layout, setLayout] = useState<Array<WidgetConfig>>(
    (currentPage?.layout as WidgetConfig[]) ??
      customizeGlossaryTermPageClassBase.defaultLayout
  );

  const handleReset = useCallback(async () => {
    // Get default layout with the empty widget added at the end
    const newMainPanelLayout = getLayoutWithEmptyWidgetPlaceholder(
      customizeGlossaryTermPageClassBase.defaultLayout,
      2,
      4
    );
    setLayout(newMainPanelLayout);
    await onSaveLayout();
  }, []);

  const handleSave = async () => {
    await onSaveLayout({
      ...(currentPage ?? ({ pageType: currentPageType } as Page)),
      layout: getUniqueFilteredLayout(layout),
    });
  };

  // call the hook to set the direction of the grid layout
  useGridLayoutDirection();

  return (
    <PageLayoutV1
      mainContainerClassName="p-t-0"
      pageContainerStyle={{
        backgroundImage: `url(${gridBgImg})`,
      }}
      pageTitle={t('label.customize-entity', {
        entity: t('label.landing-page'),
      })}>
      <CustomizablePageHeader
        personaName={getEntityName(personaDetails)}
        onReset={handleReset}
        onSave={handleSave}
      />
      <GlossaryHeaderWidget isGlossary={isGlossary} />
      <CustomizeTabWidget />
    </PageLayoutV1>
  );
}

export default CustomizeGlossaryTermDetailPage;
