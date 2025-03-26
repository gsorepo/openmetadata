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

import { GlobalSettingOptions } from '../../constant/settings';
import { DatabaseClass } from '../../support/entity/DatabaseClass';
import { DatabaseSchemaClass } from '../../support/entity/DatabaseSchemaClass';
import { EntityDataClass } from '../../support/entity/EntityDataClass';
import { DatabaseServiceClass } from '../../support/entity/service/DatabaseServiceClass';
import { TableClass } from '../../support/entity/TableClass';
import {
  createNewPage,
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
  fillColumnDetails,
  fillRowDetails,
  pressKeyXTimes,
  validateImportStatus,
} from '../../utils/importUtils';

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

const databaseSchemaDetails2 = {
  ...createDatabaseSchemaRowDetails(),
  glossary: glossaryDetails,
};

const tableDetails1 = {
  ...createTableRowDetails(),
  glossary: glossaryDetails,
};

const tableDetails2 = {
  ...createTableRowDetails(),
  glossary: glossaryDetails,
};

const columnDetails1 = {
  ...createColumnRowDetails(),
  glossary: glossaryDetails,
};

const columnDetails2 = {
  ...createColumnRowDetails(),
  glossary: glossaryDetails,
};

test.describe('Bulk Import Export', () => {
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

  test.skip('Database service', async ({ page }) => {
    test.slow(true);

    let customPropertyRecord: Record<string, string> = {};

    const dbService = new DatabaseServiceClass();

    const { apiContext, afterAction } = await getApiContext(page);
    await dbService.create(apiContext);

    await test.step('create custom properties for extension edit', async () => {
      customPropertyRecord = await createCustomPropertiesForEntity(
        page,
        GlobalSettingOptions.DATABASES
      );
    });

    await test.step('should export data database service details', async () => {
      await dbService.visitEntityPage(page);

      const downloadPromise = page.waitForEvent('download');

      await page.click('[data-testid="manage-button"]');
      await page.click('[data-testid="export-button-description"]');
      await page.fill('#fileName', dbService.entity.name);
      await page.click('#submit-button');
      const download = await downloadPromise;

      // Wait for the download process to complete and save the downloaded file somewhere.
      await download.saveAs('downloads/' + download.suggestedFilename());
    });

    await test.step(
      'should import and edit with two additional database',
      async () => {
        const databaseDetails1 = {
          ...createDatabaseRowDetails(),
          domains: EntityDataClass.domain1.responseData,
          glossary: glossaryDetails,
        };

        const databaseDetails2 = {
          ...createDatabaseRowDetails(),
          glossary: glossaryDetails,
          domains: EntityDataClass.domain1.responseData,
        };

        await dbService.visitEntityPage(page);
        await page.click('[data-testid="manage-button"] > .anticon');
        await page.click('[data-testid="import-button-description"]');
        const fileInput = await page.$('[type="file"]');
        await fileInput?.setInputFiles([
          'downloads/' + dbService.entity.name + '.csv',
        ]);

        // Adding manual wait for the file to load
        await page.waitForTimeout(500);

        // Adding some assertion to make sure that CSV loaded correctly
        await expect(
          page.locator('.InovuaReactDataGrid__header-layout')
        ).toBeVisible();
        await expect(page.getByTestId('add-row-btn')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Previous' })
        ).toBeVisible();

        await page.click('[data-testid="add-row-btn"]');

        // click on last row first cell
        await page.click(
          '.InovuaReactDataGrid__row--last > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
        );

        // Click on first cell and edit
        await fillRowDetails(
          {
            ...databaseDetails1,
            owners: [
              EntityDataClass.user1.responseData?.['displayName'],
              EntityDataClass.user2.responseData?.['displayName'],
            ],
          },
          page,
          customPropertyRecord
        );

        await page.click('[data-testid="add-row-btn"]');

        // click on last row first cell
        await page.click(
          '.InovuaReactDataGrid__row--last > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
        );

        await fillRowDetails(
          {
            ...databaseDetails2,
            owners: [
              EntityDataClass.user1.responseData?.['displayName'],
              EntityDataClass.user2.responseData?.['displayName'],
            ],
          },
          page,
          customPropertyRecord
        );

        await page.waitForTimeout(100);
        await page.getByRole('button', { name: 'Next' }).click();

        const loader = page.locator(
          '.inovua-react-toolkit-load-mask__background-layer'
        );

        await loader.waitFor({ state: 'hidden' });

        await validateImportStatus(page, {
          passed: '3',
          processed: '3',
          failed: '0',
        });
        const rowStatus = ['Entity created', 'Entity created'];

        await expect(page.locator('[data-props-id="details"]')).toHaveText(
          rowStatus
        );

        await page.getByRole('button', { name: 'Update' }).click();
        await page
          .locator('.inovua-react-toolkit-load-mask__background-layer')
          .waitFor({ state: 'detached' });

        await page.waitForSelector('.message-banner-wrapper', {
          state: 'detached',
        });

        await toastNotification(page, /details updated successfully/);
      }
    );

    await dbService.delete(apiContext);
    await afterAction();
  });

  test.skip('Database', async ({ page }) => {
    test.slow(true);

    let customPropertyRecord: Record<string, string> = {};

    const dbEntity = new DatabaseClass();

    const { apiContext, afterAction } = await getApiContext(page);
    await dbEntity.create(apiContext);

    await test.step('create custom properties for extension edit', async () => {
      customPropertyRecord = await createCustomPropertiesForEntity(
        page,
        GlobalSettingOptions.DATABASE_SCHEMA
      );
    });

    await test.step('should export data database details', async () => {
      await dbEntity.visitEntityPage(page);

      const downloadPromise = page.waitForEvent('download');

      await page.click('[data-testid="manage-button"]');
      await page.click('[data-testid="export-button-description"]');
      await page.fill('#fileName', dbEntity.entity.name);
      await page.click('#submit-button');

      const download = await downloadPromise;

      // Wait for the download process to complete and save the downloaded file somewhere.
      await download.saveAs('downloads/' + download.suggestedFilename());
    });

    await test.step(
      'should import and edit with two additional database schema',
      async () => {
        await dbEntity.visitEntityPage(page);
        await page.click('[data-testid="manage-button"] > .anticon');
        await page.click('[data-testid="import-button-description"]');
        const fileInput = await page.$('[type="file"]');
        await fileInput?.setInputFiles([
          'downloads/' + dbEntity.entity.name + '.csv',
        ]);

        // Adding manual wait for the file to load
        await page.waitForTimeout(500);

        // Adding some assertion to make sure that CSV loaded correctly
        await expect(
          page.locator('.InovuaReactDataGrid__header-layout')
        ).toBeVisible();
        await expect(page.getByTestId('add-row-btn')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Previous' })
        ).toBeVisible();

        await page.click('[data-testid="add-row-btn"]');

        // click on last row first cell
        await page.click(
          '.InovuaReactDataGrid__row--last > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
        );
        // Click on first cell and edit
        await fillRowDetails(
          {
            ...databaseSchemaDetails1,
            owners: [
              EntityDataClass.user1.responseData?.['displayName'],
              EntityDataClass.user2.responseData?.['displayName'],
            ],
            domains: EntityDataClass.domain1.responseData,
          },
          page,
          customPropertyRecord
        );
        await page.click('[data-testid="add-row-btn"]');
        // click on last row first cell
        await page.click(
          '.InovuaReactDataGrid__row--last > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
        );
        await fillRowDetails(
          {
            ...databaseSchemaDetails2,
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
          passed: '4',
          processed: '4',
          failed: '0',
        });

        await page.waitForSelector('.InovuaReactDataGrid__header-layout', {
          state: 'visible',
        });

        const rowStatus = [
          'Entity updated',
          'Entity created',
          'Entity created',
        ];

        await expect(page.locator('[data-props-id="details"]')).toHaveText(
          rowStatus
        );

        await page.getByRole('button', { name: 'Update' }).click();
        await page
          .locator('.inovua-react-toolkit-load-mask__background-layer')
          .waitFor({ state: 'detached' });

        await page.waitForSelector('.message-banner-wrapper', {
          state: 'detached',
        });

        await toastNotification(page, /details updated successfully/);
      }
    );

    await dbEntity.delete(apiContext);
    await afterAction();
  });

  test.skip('Database Schema', async ({ page }) => {
    test.slow(true);

    let customPropertyRecord: Record<string, string> = {};

    const dbSchemaEntity = new DatabaseSchemaClass();

    const { apiContext, afterAction } = await getApiContext(page);
    await dbSchemaEntity.create(apiContext);

    await test.step('create custom properties for extension edit', async () => {
      customPropertyRecord = await createCustomPropertiesForEntity(
        page,
        GlobalSettingOptions.TABLES
      );
    });

    await test.step('should export data database schema details', async () => {
      await dbSchemaEntity.visitEntityPage(page);

      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="manage-button"]');
      await page.click('[data-testid="export-button-description"]');
      await page.fill('#fileName', dbSchemaEntity.entity.name);
      await page.click('#submit-button');

      const download = await downloadPromise;

      // Wait for the download process to complete and save the downloaded file somewhere.
      await download.saveAs('downloads/' + download.suggestedFilename());
    });

    await test.step(
      'should import and edit with two additional table',
      async () => {
        await dbSchemaEntity.visitEntityPage(page);

        await page.click('[data-testid="manage-button"] > .anticon');
        await page.click('[data-testid="import-button-description"]');
        const fileInput = await page.$('[type="file"]');
        await fileInput?.setInputFiles([
          'downloads/' + dbSchemaEntity.entity.name + '.csv',
        ]);

        // Adding manual wait for the file to load
        await page.waitForTimeout(500);

        // Adding some assertion to make sure that CSV loaded correctly
        await expect(
          page.locator('.InovuaReactDataGrid__header-layout')
        ).toBeVisible();
        await expect(page.getByTestId('add-row-btn')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Previous' })
        ).toBeVisible();

        await page.click('[data-testid="add-row-btn"]');

        // click on last row first cell
        await page.click(
          '.InovuaReactDataGrid__row--last > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
        );

        // Click on first cell and edit
        await fillRowDetails(
          {
            ...tableDetails1,
            owners: [
              EntityDataClass.user1.responseData?.['displayName'],
              EntityDataClass.user2.responseData?.['displayName'],
            ],
            domains: EntityDataClass.domain1.responseData,
          },
          page,
          customPropertyRecord
        );

        await page.click('[data-testid="add-row-btn"]');

        // click on last row first cell
        await page.click(
          '.InovuaReactDataGrid__row--last > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
        );

        await fillRowDetails(
          {
            ...tableDetails2,
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
          passed: '3',
          processed: '3',
          failed: '0',
        });

        const rowStatus = ['Entity created', 'Entity created'];

        await expect(page.locator('[data-props-id="details"]')).toHaveText(
          rowStatus
        );

        await page.getByRole('button', { name: 'Update' }).click();

        await page.waitForSelector('.message-banner-wrapper', {
          state: 'detached',
        });

        await toastNotification(page, /details updated successfully/);
      }
    );

    await dbSchemaEntity.delete(apiContext);
    await afterAction();
  });

  test('Table', async ({ page }) => {
    const tableEntity = new TableClass();

    const { apiContext, afterAction } = await getApiContext(page);
    await tableEntity.create(apiContext);

    await test.step('should export data table details', async () => {
      await tableEntity.visitEntityPage(page);

      const downloadPromise = page.waitForEvent('download');

      await page.click('[data-testid="manage-button"]');
      await page.click('[data-testid="export-button-description"]');
      await page.fill('#fileName', tableEntity.entity.name);
      await page.click('#submit-button');

      const download = await downloadPromise;

      // Wait for the download process to complete and save the downloaded file somewhere.
      await download.saveAs('downloads/' + download.suggestedFilename());
    });

    await test.step(
      'should import and edit with two additional columns',
      async () => {
        await tableEntity.visitEntityPage(page);
        await page.click('[data-testid="manage-button"]');
        await page.click('[data-testid="import-button-description"]');
        const fileInput = await page.$('[type="file"]');
        await fileInput?.setInputFiles([
          'downloads/' + tableEntity.entity.name + '.csv',
        ]);

        // Adding manual wait for the file to load
        await page.waitForTimeout(500);

        // Adding some assertion to make sure that CSV loaded correctly
        await expect(
          page.locator('.InovuaReactDataGrid__header-layout')
        ).toBeVisible();
        await expect(page.getByTestId('add-row-btn')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Next' })).toBeVisible();
        await expect(
          page.getByRole('button', { name: 'Previous' })
        ).toBeVisible();

        await page.click('[data-testid="add-row-btn"]');

        // click on last row first cell
        await page.click(
          '.InovuaReactDataGrid__row--last > .InovuaReactDataGrid__row-cell-wrap > .InovuaReactDataGrid__cell--first'
        );

        // Click on first cell and edit
        await fillColumnDetails(columnDetails1, page);

        await page.click('[data-testid="add-row-btn"]');

        // Reverse traves to first cell to fill the details
        await page.click('.InovuaReactDataGrid__cell--cell-active');
        await page
          .locator('.InovuaReactDataGrid__cell--cell-active')
          .press('ArrowDown', { delay: 100 });

        await pressKeyXTimes(page, 8, 'ArrowLeft');

        await fillColumnDetails(columnDetails2, page);

        await page.click('[type="button"] >> text="Next"', { force: true });

        await validateImportStatus(page, {
          passed: '9',
          processed: '9',
          failed: '0',
        });

        const rowStatus = [
          'Entity updated',
          'Entity updated',
          'Entity updated',
          'Entity updated',
          'Entity updated',
          'Entity updated',
          'Entity updated',
          'Entity updated',
        ];

        await expect(page.locator('[data-props-id="details"]')).toHaveText(
          rowStatus
        );

        await page.click('[type="button"] >> text="Update"', { force: true });
        await page
          .locator('.inovua-react-toolkit-load-mask__background-layer')
          .waitFor({ state: 'detached' });

        await page.waitForSelector('.message-banner-wrapper', {
          state: 'detached',
        });

        await toastNotification(page, /details updated successfully/);
      }
    );

    await tableEntity.delete(apiContext);
    await afterAction();
  });
});
