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
import test, { expect } from '@playwright/test';
import { get } from 'lodash';
import { SidebarItem } from '../../constant/sidebar';
import { ApiEndpointClass } from '../../support/entity/ApiEndpointClass';
import { ContainerClass } from '../../support/entity/ContainerClass';
import { DashboardClass } from '../../support/entity/DashboardClass';
import { DashboardDataModelClass } from '../../support/entity/DashboardDataModelClass';
import { EntityTypeEndpoint } from '../../support/entity/Entity.interface';
import { MlModelClass } from '../../support/entity/MlModelClass';
import { PipelineClass } from '../../support/entity/PipelineClass';
import { SearchIndexClass } from '../../support/entity/SearchIndexClass';
import { StoredProcedureClass } from '../../support/entity/StoredProcedureClass';
import { TableClass } from '../../support/entity/TableClass';
import { TopicClass } from '../../support/entity/TopicClass';
import { Glossary } from '../../support/glossary/Glossary';
import { GlossaryTerm } from '../../support/glossary/GlossaryTerm';
import { getApiContext, redirectToHomePage } from '../../utils/common';
import { updateDisplayNameForEntity } from '../../utils/entity';
import {
  validateBucketsForIndex,
  verifyDatabaseAndSchemaInExploreTree,
} from '../../utils/explore';
import { sidebarClick } from '../../utils/sidebar';

// use the admin user to login
test.use({ storageState: 'playwright/.auth/admin.json' });

test.beforeEach(async ({ page }) => {
  await redirectToHomePage(page);
  await sidebarClick(page, SidebarItem.EXPLORE);
});

test.describe('Explore Tree scenarios ', () => {
  test('Explore Tree', async ({ page }) => {
    await test.step('Check the explore tree', async () => {
      await page.waitForLoadState('networkidle');

      await page.waitForSelector('[data-testid="loader"]', {
        state: 'detached',
      });

      await expect(page.getByRole('tree')).toContainText('Databases');
      await expect(page.getByRole('tree')).toContainText('Dashboards');
      await expect(page.getByRole('tree')).toContainText('Pipelines');
      await expect(page.getByRole('tree')).toContainText('Topics');
      await expect(page.getByRole('tree')).toContainText('ML Models');
      await expect(page.getByRole('tree')).toContainText('Containers');
      await expect(page.getByRole('tree')).toContainText('Search Indexes');
      await expect(page.getByRole('tree')).toContainText('Governance');
      await expect(page.getByRole('tree')).toContainText('APIs');

      await page
        .locator('div')
        .filter({ hasText: /^Governance$/ })
        .locator('svg')
        .first()
        .click();

      await expect(page.getByRole('tree')).toContainText('Glossaries');
      await expect(page.getByRole('tree')).toContainText('Tags');

      // APIs
      await page
        .locator('div')
        .filter({ hasText: /^APIs$/ })
        .locator('svg')
        .first()
        .click();

      await expect(page.getByRole('tree')).toContainText('rest');
    });

    await test.step('Check the quick filters', async () => {
      await expect(
        page.getByTestId('search-dropdown-Domains').locator('span')
      ).toContainText('Domains');
      await expect(page.getByTestId('search-dropdown-Owners')).toContainText(
        'Owners'
      );
      await expect(
        page.getByTestId('search-dropdown-Tag').locator('span')
      ).toContainText('Tag');

      await page.getByRole('button', { name: 'Tier' }).click();

      await expect(
        page.getByTestId('search-dropdown-Tier').locator('span')
      ).toContainText('Tier');
      await expect(
        page.getByTestId('search-dropdown-Service').locator('span')
      ).toContainText('Service');
      await expect(
        page.getByTestId('search-dropdown-Service Type').locator('span')
      ).toContainText('Service Type');
    });

    await test.step('Click on tree item and check quick filter', async () => {
      await page.getByTestId('explore-tree-title-Glossaries').click();

      await expect(
        page.getByTestId('search-dropdown-Data Assets')
      ).toContainText('Data Assets: glossaryTerm');

      await page.getByTestId('explore-tree-title-Tags').click();

      await expect(
        page.getByTestId('search-dropdown-Data Assets')
      ).toContainText('Data Assets: tag');
    });

    await test.step(
      'Click on tree item metrics and check quick filter',
      async () => {
        await page.getByTestId('explore-tree-title-Metrics').click();

        await expect(
          page.getByTestId('search-dropdown-Data Assets')
        ).toContainText('Data Assets: metric');
      }
    );
  });

  test('Verify Database and Database Schema available in explore tree', async ({
    page,
  }) => {
    const { apiContext, afterAction } = await getApiContext(page);
    const table1 = new TableClass();
    const table2 = new TableClass();

    try {
      await table1.create(apiContext);
      await table2.create(apiContext);

      const schemaName1 = get(table1.schemaResponseData, 'name', '');
      const dbName1 = get(table1.databaseResponseData, 'name', '');
      const serviceName1 = get(table1.serviceResponseData, 'name', '');
      const schemaName2 = get(table2.schemaResponseData, 'name', '');
      const dbName2 = get(table2.databaseResponseData, 'name', '');
      const serviceName2 = get(table2.serviceResponseData, 'name', '');

      await sidebarClick(page, SidebarItem.EXPLORE);
      await page.waitForLoadState('networkidle');

      // Verify first table's database and schema
      await test.step('Verify first table database and schema', async () => {
        await verifyDatabaseAndSchemaInExploreTree(
          page,
          serviceName1,
          dbName1,
          schemaName1
        );
      });

      // Verify second table's database and schema
      await test.step('Verify second table database and schema', async () => {
        await verifyDatabaseAndSchemaInExploreTree(
          page,
          serviceName2,
          dbName2,
          schemaName2,
          true
        );
      });
    } finally {
      await table1.delete(apiContext);
      await table2.delete(apiContext);
      await afterAction();
    }
  });

  test('Verify Database and Database schema after rename', async ({ page }) => {
    const { apiContext, afterAction } = await getApiContext(page);
    const table = new TableClass();
    await table.create(apiContext);
    await table.visitEntityPage(page);
    const schemaName = get(table.schemaResponseData, 'name', '');
    const dbName = get(table.databaseResponseData, 'name', '');
    const serviceName = get(table.serviceResponseData, 'name', '');
    const updatedSchemaName = `Test ${schemaName} updated`;
    const updatedDbName = `Test ${dbName} updated`;

    // Step 1: Visit explore page and check existing values before rename
    await test.step(
      'Visit explore page and verify existing values',
      async () => {
        await sidebarClick(page, SidebarItem.EXPLORE);
        await page.waitForLoadState('networkidle');

        // Verify original database and schema names using utility function
        await verifyDatabaseAndSchemaInExploreTree(
          page,
          serviceName,
          dbName,
          schemaName
        );
      }
    );

    // Step 2: Perform rename operations
    await test.step('Rename schema and database', async () => {
      // Navigate back to the table page for renaming
      await table.visitEntityPage(page);

      const schemaRes = page.waitForResponse('/api/v1/databaseSchemas/name/*');
      await page.getByRole('link', { name: schemaName }).click();
      // Rename Schema Page
      await schemaRes;
      await updateDisplayNameForEntity(
        page,
        updatedSchemaName,
        EntityTypeEndpoint.DatabaseSchema
      );

      const dbRes = page.waitForResponse('/api/v1/databases/name/*');
      await page.getByRole('link', { name: dbName }).click();
      // Rename Database Page
      await dbRes;
      await updateDisplayNameForEntity(
        page,
        updatedDbName,
        EntityTypeEndpoint.Database
      );
    });

    // Step 3: Verify the changes are reflected in explore page
    await test.step('Verify renamed values in explore page', async () => {
      await sidebarClick(page, SidebarItem.EXPLORE);
      await page.waitForLoadState('networkidle');

      // Verify updated database and schema names using utility function
      await verifyDatabaseAndSchemaInExploreTree(
        page,
        serviceName,
        updatedDbName,
        updatedSchemaName
      );
    });

    await table.delete(apiContext);
    await afterAction();
  });
});

test.describe('Explore page', () => {
  const table = new TableClass();
  const glossary = new Glossary();
  const glossaryTerm = new GlossaryTerm(glossary);
  const dashboard = new DashboardClass();
  const storedProcedure = new StoredProcedureClass();
  const pipeline = new PipelineClass();
  const container = new ContainerClass();
  const apiEndpoint = new ApiEndpointClass();
  const topic = new TopicClass();
  const searchIndex = new SearchIndexClass();
  const dashboardDataModel = new DashboardDataModelClass();
  const mlModel = new MlModelClass();

  test.beforeEach('Setup pre-requisits', async ({ page }) => {
    const { apiContext, afterAction } = await getApiContext(page);
    await table.create(apiContext);
    await glossary.create(apiContext);
    await glossaryTerm.create(apiContext);
    await dashboard.create(apiContext);
    await storedProcedure.create(apiContext);
    await pipeline.create(apiContext);
    await container.create(apiContext);
    await apiEndpoint.create(apiContext);
    await topic.create(apiContext);
    await searchIndex.create(apiContext);
    await dashboardDataModel.create(apiContext);
    await mlModel.create(apiContext);
    await afterAction();
  });

  test.afterEach('Cleanup', async ({ page }) => {
    const { apiContext, afterAction } = await getApiContext(page);
    await table.delete(apiContext);
    await glossary.delete(apiContext);
    await glossaryTerm.delete(apiContext);
    await dashboard.delete(apiContext);
    await storedProcedure.delete(apiContext);
    await pipeline.delete(apiContext);
    await container.delete(apiContext);
    await apiEndpoint.delete(apiContext);
    await topic.delete(apiContext);
    await searchIndex.delete(apiContext);
    await dashboardDataModel.delete(apiContext);
    await mlModel.delete(apiContext);
    await afterAction();
  });

  test('Check the listing of tags', async ({ page }) => {
    await page
      .locator('div')
      .filter({ hasText: /^Governance$/ })
      .locator('svg')
      .first()
      .click();

    await expect(page.getByRole('tree')).toContainText('Glossaries');
    await expect(page.getByRole('tree')).toContainText('Tags');

    const res = page.waitForResponse(
      '/api/v1/search/query?q=&index=dataAsset*'
    );
    // click on tags
    await page.getByTestId('explore-tree-title-Tags').click();

    const response = await res;
    const jsonResponse = await response.json();

    expect(jsonResponse.hits.hits.length).toBeGreaterThan(0);
  });

  test('Check listing of entities when index is dataAsset', async ({
    page,
  }) => {
    await validateBucketsForIndex(page, 'dataAsset');
  });

  test('Check listing of entities when index is all', async ({ page }) => {
    await validateBucketsForIndex(page, 'all');
  });
});
