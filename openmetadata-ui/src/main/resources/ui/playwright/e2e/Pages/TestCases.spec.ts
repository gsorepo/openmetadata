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
import { expect, test } from '@playwright/test';
import { TableClass } from '../../support/entity/TableClass';
import { getApiContext, redirectToHomePage } from '../../utils/common';

// use the admin user to login
test.use({ storageState: 'playwright/.auth/admin.json' });

test('Table difference test case', async ({ page }) => {
  await redirectToHomePage(page);
  const { afterAction, apiContext } = await getApiContext(page);
  const table1 = new TableClass();
  const table2 = new TableClass();
  await table1.create(apiContext);
  await table2.create(apiContext);
  const testCase = {
    name: `${table1.entity.name}_test_case`,
    table2: table2.entity.name,
    threshold: '23',
  };

  await table1.visitEntityPage(page);
  await page.getByText('Profiler & Data Quality').click();

  await test.step('Create', async () => {
    await page.getByTestId('profiler-add-table-test-btn').click();
    await page.getByTestId('test-case').click();
    await page.getByTestId('test-case-name').fill(testCase.name);
    await page.getByTestId('test-type').click();
    await page.getByTitle('Compare 2 tables for').click();
    const tableSearchResponse = page.waitForResponse(
      `/api/v1/search/query?q=*${encodeURIComponent(
        testCase.table2
      )}*index=table_search_index*`
    );
    await page.click('#tableTestForm_params_table2');
    await page.fill(`#tableTestForm_params_table2`, testCase.table2);
    await tableSearchResponse;
    await page
      .getByTitle(table2.entityResponseData?.['fullyQualifiedName'])
      .click();

    await page.fill(`#tableTestForm_params_keyColumns_0_value`, 'user_id');
    await page.getByTitle('user_id').click();
    await page.fill('#tableTestForm_params_threshold', testCase.threshold);
    await page.fill('#tableTestForm_params_useColumns_0_value', 'user_id');

    await expect(page.getByTitle('user_id').nth(2)).toHaveClass(
      /ant-select-item-option-disabled/
    );

    await page.locator('#tableTestForm_params_useColumns_0_value').clear();
    await page.fill('#tableTestForm_params_useColumns_0_value', 'shop_id');
    await page.getByTitle('shop_id').click();

    await page.fill('#tableTestForm_params_where', 'test');
    const createTestCaseResponse = page.waitForResponse(
      `/api/v1/dataQuality/testCases`
    );
    await page.getByTestId('submit-test').click();
    await createTestCaseResponse;
    const tableTestResponse = page.waitForResponse(
      `/api/v1/dataQuality/testCases?fields=*`
    );
    await page.getByTestId('view-service-button').click();
    await tableTestResponse;
  });

  await test.step('Edit', async () => {
    await expect(
      page.getByTestId(testCase.name).getByRole('link')
    ).toBeVisible();

    await page.getByTestId(`edit-${testCase.name}`).click();

    await expect(page.locator('.ant-modal-title')).toHaveText(
      `Edit ${testCase.name}`
    );

    await page
      .locator('label')
      .filter({ hasText: 'Key Columns' })
      .getByRole('button')
      .click();
    await page.fill('#tableTestForm_params_keyColumns_1_value', 'email');
    await page.getByTitle('email', { exact: true }).click();

    await page
      .locator('label')
      .filter({ hasText: 'Use Columns' })
      .getByRole('button')
      .click();
    await page.fill('#tableTestForm_params_useColumns_1_value', 'name');
    await page.getByTitle('name', { exact: true }).click();
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByRole('alert')).toContainText(
      'Test case updated successfully.'
    );

    await page.getByTestId('content-wrapper').getByLabel('close').click();
  });

  await test.step('Delete', async () => {
    await page.getByTestId(`delete-${testCase.name}`).click();
    await page.fill('#deleteTextInput', 'DELETE');

    await expect(page.getByTestId('confirm-button')).toBeEnabled();

    await page.getByTestId('confirm-button').click();

    await expect(page.getByRole('alert')).toHaveText(/deleted successfully!/);
  });

  await table1.delete(apiContext);
  await table2.delete(apiContext);

  await afterAction();
});
