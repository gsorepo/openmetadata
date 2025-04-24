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
import test, { expect } from '@playwright/test';
import { get } from 'lodash';
import { GlobalSettingOptions } from '../../constant/settings';
import { DashboardClass } from '../../support/entity/DashboardClass';
import { MlModelClass } from '../../support/entity/MlModelClass';
import { SearchIndexClass } from '../../support/entity/SearchIndexClass';
import { TableClass } from '../../support/entity/TableClass';
import { TopicClass } from '../../support/entity/TopicClass';
import { createNewPage, getApiContext } from '../../utils/common';
import {
  addPipelineBetweenNodes,
  fillLineageConfigForm,
  performExpand,
  performZoomOut,
  verifyColumnLayerActive,
  verifyNodePresent,
  visitLineageTab,
} from '../../utils/lineage';
import { settingClick } from '../../utils/sidebar';

test.describe('Lineage Settings Tests', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('Verify global lineage config', async ({ browser }) => {
    test.slow(true);

    const { page } = await createNewPage(browser);
    const { apiContext, afterAction } = await getApiContext(page);
    const table = new TableClass();
    const topic = new TopicClass();
    const dashboard = new DashboardClass();
    const mlModel = new MlModelClass();
    const searchIndex = new SearchIndexClass();

    try {
      await Promise.all([
        table.create(apiContext),
        topic.create(apiContext),
        dashboard.create(apiContext),
        mlModel.create(apiContext),
        searchIndex.create(apiContext),
      ]);

      await addPipelineBetweenNodes(page, table, topic);
      await addPipelineBetweenNodes(page, topic, dashboard);
      await addPipelineBetweenNodes(page, dashboard, mlModel);
      await addPipelineBetweenNodes(page, mlModel, searchIndex);

      await test.step(
        'Update global lineage config and verify lineage',
        async () => {
          await settingClick(page, GlobalSettingOptions.LINEAGE_CONFIG);
          await fillLineageConfigForm(page, {
            upstreamDepth: 1,
            downstreamDepth: 1,
            layer: 'Column Level Lineage',
          });

          await topic.visitEntityPage(page);
          await visitLineageTab(page);
          await verifyNodePresent(page, table);
          await verifyNodePresent(page, dashboard);
          const mlModelFqn = get(
            mlModel,
            'entityResponseData.fullyQualifiedName'
          );
          const mlModelNode = page.locator(
            `[data-testid="lineage-node-${mlModelFqn}"]`
          );

          await expect(mlModelNode).not.toBeVisible();

          await verifyColumnLayerActive(page);
        }
      );

      await test.step(
        'Verify Upstream and Downstream expand collapse buttons',
        async () => {
          await dashboard.visitEntityPage(page);
          await visitLineageTab(page);
          const closeIcon = page.getByTestId('entity-panel-close-icon');
          if (await closeIcon.isVisible()) {
            await closeIcon.click();
          }
          await performZoomOut(page);
          await verifyNodePresent(page, topic);
          await verifyNodePresent(page, mlModel);
          await performExpand(page, mlModel, false, searchIndex);
          await performExpand(page, topic, true);
        }
      );

      await test.step(
        'Reset global lineage config and verify lineage',
        async () => {
          await settingClick(page, GlobalSettingOptions.LINEAGE_CONFIG);
          await fillLineageConfigForm(page, {
            upstreamDepth: 2,
            downstreamDepth: 2,
            layer: 'Entity Lineage',
          });

          await dashboard.visitEntityPage(page);
          await visitLineageTab(page);

          await verifyNodePresent(page, table);
          await verifyNodePresent(page, dashboard);
          await verifyNodePresent(page, mlModel);
          await verifyNodePresent(page, searchIndex);
          await verifyNodePresent(page, topic);
        }
      );
    } finally {
      await Promise.all([
        table.delete(apiContext),
        topic.delete(apiContext),
        dashboard.delete(apiContext),
        mlModel.delete(apiContext),
        searchIndex.delete(apiContext),
      ]);

      await afterAction();
    }
  });
});
