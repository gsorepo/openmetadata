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
import { expect, test } from '@playwright/test';

import { SERVICE_TYPE } from '../../constant/service';
import { GlobalSettingOptions } from '../../constant/settings';
import { EntityDataClass } from '../../support/entity/EntityDataClass';
import { TableClass } from '../../support/entity/TableClass';
import {
  createNewPage,
  descriptionBoxReadOnly,
  getApiContext,
  redirectToHomePage,
  toastNotification,
} from '../../utils/common';
import {
  createColumnRowDetails,
  createCustomPropertiesForEntity,
  createDatabaseRowDetails,
  createDatabaseSchemaRowDetails,
  createTableRowDetails,
  fillDescriptionDetails,
  fillGlossaryTermDetails,
  fillRowDetails,
  fillTagDetails,
  pressKeyXTimes,
  validateImportStatus,
} from '../../utils/importUtils';
import { visitServiceDetailsPage } from '../../utils/service';

// use the admin user to login
test.use({
  storageState: 'playwright/.auth/admin.json',
});

const glossaryDetails = {
  name: EntityDataClass.glossaryTerm1.data.name,
  parent: EntityDataClass.glossary1.data.name,
};

const databaseSchemaDetails1 = {
  ...createDatabaseSchemaRowDetails(),
  glossary: glossaryDetails,
};

const tableDetails1 = {
  ...createTableRowDetails(),
  glossary: glossaryDetails,
};

const columnDetails1 = {
  ...createColumnRowDetails(),
  glossary: glossaryDetails,
};

test.describe('Bulk Edit Entity', () => {
  test.beforeAll('setup pre-test', async ({ browser }, testInfo) => {
    const { apiContext, afterAction } = await createNewPage(browser);

    testInfo.setTimeout(90000);
    await EntityDataClass.preRequisitesForTests(apiContext);
    await afterAction();
  });

  test.afterAll('Cleanup', async ({ browser }, testInfo) => {
    const { apiContext, afterAction } = await createNewPage(browser);

    testInfo.setTimeout(90000);
    await EntityDataClass.postRequisitesForTests(apiContext);
    await afterAction();
  });

  test.beforeEach(async ({ page }) => {
    await redirectToHomePage(page);
  });

  test('Database service', async ({ page }) => {
    test.slow(true);

    const table = new TableClass();
    let customPropertyRecord: Record<string, string> = {};

    const { apiContext, afterAction } = await getApiContext(page);
    await table.create(apiContext);

    await test.step('create custom properties for extension edit', async () => {
      customPropertyRecord = await createCustomPropertiesForEntity(
        page,
        GlobalSettingOptions.DATABASES
      );
    });

    await test.step('Perform bulk edit action', async () => {
      const databaseDetails = {
        ...createDatabaseRowDetails(),
        domains: EntityDataClass.domain1.responseData,
        glossary: glossaryDetails,
      };

      await visitServiceDetailsPage(
        page,
        {
          name: table.service.name,
          type: SERVICE_TYPE.Database,
        },
        false
      );
      await page.click('[data-testid="bulk-edit-table"]');

      // Adding manual wait for the file to load
      await page.waitForTimeout(500);

      await page.waitForSelector('[data-testid="loader"]', {
        state: 'detached',
      });

      // Adding some assertion to make sure that CSV loaded correctly
      await expect(
        page.locator('.InovuaReactDataGrid__header-layout')
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Previous' })
      ).not.toBeVisible();

      // Click on first cell and edit

      await page.click(
        '.InovuaReactDataGrid__row--first > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
      );
      await fillRowDetails(
        {
          ...databaseDetails,
          name: table.database.name,
          owners: [
            EntityDataClass.user1.responseData?.['displayName'],
            EntityDataClass.user2.responseData?.['displayName'],
          ],
        },
        page,
        customPropertyRecord
      );

      await page.getByRole('button', { name: 'Next' }).click();

      await validateImportStatus(page, {
        passed: '2',
        processed: '2',
        failed: '0',
      });

      await page.getByRole('button', { name: 'Update' }).click();
      await page
        .locator('.inovua-react-toolkit-load-mask__background-layer')
        .waitFor({ state: 'detached' });

      await toastNotification(page, /details updated successfully/);

      await page.click('[data-testid="databases"]');

      await page.waitForLoadState('networkidle');

      // Verify Details updated
      await expect(page.getByTestId('column-name')).toHaveText(
        `${table.database.name}${databaseDetails.displayName}`
      );

      await expect(
        page.locator(`.ant-table-cell ${descriptionBoxReadOnly}`)
      ).toContainText('Playwright Database description.');

      // Verify Owners
      await expect(
        page.locator(`.ant-table-cell [data-testid="owner-label"]`)
      ).toContainText(EntityDataClass.user1.responseData?.['displayName']);
      await expect(
        page.locator(`.ant-table-cell [data-testid="owner-label"]`)
      ).toContainText(EntityDataClass.user2.responseData?.['displayName']);

      // Verify Tags
      await expect(
        page.getByRole('link', {
          name: 'Sensitive',
        })
      ).toBeVisible();

      await expect(
        page.getByRole('link', {
          name: 'Tier1',
        })
      ).toBeVisible();

      await expect(
        page.getByRole('link', {
          name: EntityDataClass.glossaryTerm1.data.displayName,
        })
      ).toBeVisible();
    });

    await table.delete(apiContext);
    await afterAction();
  });

  test('Database', async ({ page }) => {
    test.slow(true);

    let customPropertyRecord: Record<string, string> = {};

    const table = new TableClass();

    const { apiContext, afterAction } = await getApiContext(page);
    await table.create(apiContext);

    await test.step('create custom properties for extension edit', async () => {
      customPropertyRecord = await createCustomPropertiesForEntity(
        page,
        GlobalSettingOptions.DATABASE_SCHEMA
      );
    });

    await test.step('Perform bulk edit action', async () => {
      // visit entity Page
      await visitServiceDetailsPage(
        page,
        {
          name: table.service.name,
          type: SERVICE_TYPE.Database,
        },
        false
      );

      const databaseResponse = page.waitForResponse(
        `/api/v1/databases/name/*${table.database.name}?**`
      );
      await page.getByTestId(table.database.name).click();
      await databaseResponse;

      await page.click('[data-testid="bulk-edit-table"]');

      // Adding manual wait for the file to load
      await page.waitForTimeout(500);

      await page.waitForSelector('[data-testid="loader"]', {
        state: 'detached',
      });

      // Adding some assertion to make sure that CSV loaded correctly
      await expect(
        page.locator('.InovuaReactDataGrid__header-layout')
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Previous' })
      ).not.toBeVisible();

      // click on last row first cell
      await page.click(
        '.InovuaReactDataGrid__row--first > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
      );

      // Click on first cell and edit
      await fillRowDetails(
        {
          ...databaseSchemaDetails1,
          name: table.schema.name,
          owners: [
            EntityDataClass.user1.responseData?.['displayName'],
            EntityDataClass.user2.responseData?.['displayName'],
          ],
          domains: EntityDataClass.domain1.responseData,
        },
        page,
        customPropertyRecord
      );

      await page.getByRole('button', { name: 'Next' }).click();
      const loader = page.locator(
        '.inovua-react-toolkit-load-mask__background-layer'
      );

      await loader.waitFor({ state: 'hidden' });

      await validateImportStatus(page, {
        passed: '2',
        processed: '2',
        failed: '0',
      });

      await page.waitForSelector('.InovuaReactDataGrid__header-layout', {
        state: 'visible',
      });

      await page.getByRole('button', { name: 'Update' }).click();
      await page
        .locator('.inovua-react-toolkit-load-mask__background-layer')
        .waitFor({ state: 'detached' });

      await toastNotification(page, /details updated successfully/);

      // Verify Details updated
      await expect(page.getByTestId('column-name')).toHaveText(
        `${table.schema.name}${databaseSchemaDetails1.displayName}`
      );

      await expect(
        page.locator(`.ant-table-cell ${descriptionBoxReadOnly}`)
      ).toContainText('Playwright Database Schema description.');

      // Verify Owners
      await expect(
        page.locator(`.ant-table-cell [data-testid="owner-label"]`)
      ).toContainText(EntityDataClass.user1.responseData?.['displayName']);
      await expect(
        page.locator(`.ant-table-cell [data-testid="owner-label"]`)
      ).toContainText(EntityDataClass.user2.responseData?.['displayName']);

      await page.getByTestId('column-display-name').click();

      await page.waitForLoadState('networkidle');
      await page.waitForSelector('loader', { state: 'hidden' });

      // Verify Tags
      await expect(
        page.getByRole('link', {
          name: 'Sensitive',
        })
      ).toBeVisible();

      await expect(
        page.getByRole('link', {
          name: 'Tier1',
        })
      ).toBeVisible();

      await expect(
        page.getByRole('link', {
          name: EntityDataClass.glossaryTerm1.data.displayName,
        })
      ).toBeVisible();
    });

    await table.delete(apiContext);
    await afterAction();
  });

  test('Database Schema', async ({ page }) => {
    test.slow(true);

    let customPropertyRecord: Record<string, string> = {};
    const table = new TableClass();

    const { apiContext, afterAction } = await getApiContext(page);
    await table.create(apiContext);

    await test.step('create custom properties for extension edit', async () => {
      customPropertyRecord = await createCustomPropertiesForEntity(
        page,
        GlobalSettingOptions.TABLES
      );
    });

    await test.step('Perform bulk edit action', async () => {
      // visit entity page
      await visitServiceDetailsPage(
        page,
        {
          name: table.service.name,
          type: SERVICE_TYPE.Database,
        },
        false
      );

      const databaseResponse = page.waitForResponse(
        `/api/v1/databases/name/*${table.database.name}?**`
      );
      await page.getByTestId(table.database.name).click();
      await databaseResponse;
      const databaseSchemaResponse = page.waitForResponse(
        `/api/v1/databaseSchemas/name/*${table.schema.name}?*`
      );
      await page.getByTestId(table.schema.name).click();
      await databaseSchemaResponse;

      await page.click('[data-testid="bulk-edit-table"]');

      // Adding manual wait for the file to load
      await page.waitForTimeout(500);

      // Adding some assertion to make sure that CSV loaded correctly
      await expect(
        page.locator('.InovuaReactDataGrid__header-layout')
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Previous' })
      ).not.toBeVisible();

      // Click on first cell and edit
      await page.click(
        '.InovuaReactDataGrid__row--first > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
      );
      await fillRowDetails(
        {
          ...tableDetails1,
          name: table.entity.name,
          owners: [
            EntityDataClass.user1.responseData?.['displayName'],
            EntityDataClass.user2.responseData?.['displayName'],
          ],
          domains: EntityDataClass.domain1.responseData,
        },
        page,
        customPropertyRecord
      );

      await page.getByRole('button', { name: 'Next' }).click();

      await validateImportStatus(page, {
        passed: '2',
        processed: '2',
        failed: '0',
      });

      await page.getByRole('button', { name: 'Update' }).click();
      await toastNotification(page, /details updated successfully/);

      // Verify Details updated
      await expect(page.getByTestId('column-name')).toHaveText(
        `${table.entity.name}${tableDetails1.displayName}`
      );

      await expect(
        page.locator(`.ant-table-cell ${descriptionBoxReadOnly}`)
      ).toContainText('Playwright Table description');

      // Go to Table Page
      await page
        .getByTestId('column-display-name')
        .getByTestId(table.entity.name)
        .click();
      await page.waitForLoadState('networkidle');
      await page.waitForSelector('loader', { state: 'hidden' });

      // Verify Domain
      await expect(page.getByTestId('domain-link')).toContainText(
        EntityDataClass.domain1.responseData.displayName
      );

      // Verify Owners
      await expect(
        page
          .getByTestId('owner-label')
          .getByTestId(`${EntityDataClass.user1.responseData?.['displayName']}`)
      ).toBeVisible();

      await expect(
        page
          .getByTestId('owner-label')
          .getByTestId(`${EntityDataClass.user2.responseData?.['displayName']}`)
      ).toBeVisible();

      // Verify Tags
      await expect(
        page.getByRole('link', {
          name: 'Sensitive',
        })
      ).toBeVisible();

      await expect(
        page.getByRole('link', {
          name: 'Tier1',
        })
      ).toBeVisible();

      await expect(
        page.getByRole('link', {
          name: EntityDataClass.glossaryTerm1.data.displayName,
        })
      ).toBeVisible();
    });

    await table.delete(apiContext);
    await afterAction();
  });

  test('Table', async ({ page }) => {
    test.slow();

    const tableEntity = new TableClass();

    const { apiContext, afterAction } = await getApiContext(page);
    await tableEntity.create(apiContext);

    await test.step('Perform bulk edit action', async () => {
      await tableEntity.visitEntityPage(page);

      await page.click('[data-testid="bulk-edit-table"]');

      // Adding manual wait for the file to load
      await page.waitForTimeout(500);

      // Adding some assertion to make sure that CSV loaded correctly
      await expect(
        page.locator('.InovuaReactDataGrid__header-layout')
      ).toBeVisible();
      await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Previous' })
      ).not.toBeVisible();

      // click on row first cell
      await page.click(
        '.InovuaReactDataGrid__row--first > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
      );

      await page.click('.InovuaReactDataGrid__cell--cell-active');

      await pressKeyXTimes(page, 2, 'ArrowRight');

      await fillDescriptionDetails(page, columnDetails1.description);

      await pressKeyXTimes(page, 5, 'ArrowRight');

      await fillTagDetails(page, columnDetails1.tag);

      await page
        .locator('.InovuaReactDataGrid__cell--cell-active')
        .press('ArrowRight', { delay: 100 });
      await fillGlossaryTermDetails(page, columnDetails1.glossary);

      // Reverse traves to first cell to fill the details
      await page.click('.InovuaReactDataGrid__cell--cell-active');
      await page
        .locator('.InovuaReactDataGrid__cell--cell-active')
        .press('ArrowDown', { delay: 100 });

      await page.click('[type="button"] >> text="Next"', { force: true });

      await validateImportStatus(page, {
        passed: '7',
        processed: '7',
        failed: '0',
      });

      await page.click('[type="button"] >> text="Update"', { force: true });
      await page
        .locator('.inovua-react-toolkit-load-mask__background-layer')
        .waitFor({ state: 'detached' });

      await toastNotification(page, /details updated successfully/);

      // Verify Details updated
      await expect(
        page.getByRole('cell', { name: 'Playwright Table column' })
      ).toBeVisible();

      // Verify Tags
      await expect(
        page.getByRole('link', {
          name: 'Sensitive',
        })
      ).toBeVisible();

      await expect(
        page.getByRole('link', {
          name: EntityDataClass.glossaryTerm1.data.displayName,
        })
      ).toBeVisible();
    });

    await tableEntity.delete(apiContext);
    await afterAction();
  });
});
