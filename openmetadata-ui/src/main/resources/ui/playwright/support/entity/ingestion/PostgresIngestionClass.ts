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

import { Page } from '@playwright/test';
import { POSTGRES } from '../../../constant/service';
import { redirectToHomePage } from '../../../utils/common';
import { visitEntityPage } from '../../../utils/entity';
import { visitServiceDetailsPage } from '../../../utils/service';
import {
  checkServiceFieldSectionHighlighting,
  Services,
} from '../../../utils/serviceIngestion';
import ServiceBaseClass from './ServiceBaseClass';

class PostgresIngestionClass extends ServiceBaseClass {
  name: string;
  filterPattern: string;
  queryLogFilePath: string;

  constructor() {
    super(
      Services.Database,
      POSTGRES.serviceName,
      POSTGRES.serviceType,
      POSTGRES.tableName
    );

    this.filterPattern = 'sales';
    this.queryLogFilePath =
      '/home/airflow/ingestion/examples/sample_data/usage/query_log.csv';
  }

  async createService(page: Page) {
    await super.createService(page);
  }

  async updateService(page: Page) {
    await super.updateService(page);
  }

  async fillConnectionDetails(page: Page) {
    const postgresUsername = process.env.PLAYWRIGHT_POSTGRES_USERNAME ?? '';
    const postgresPassword = process.env.PLAYWRIGHT_POSTGRES_PASSWORD ?? '';
    const postgresHostPort = process.env.PLAYWRIGHT_POSTGRES_HOST_PORT ?? '';
    const postgresDatabase = process.env.PLAYWRIGHT_POSTGRES_DATABASE ?? '';

    await page.fill('#root\\/username', postgresUsername);
    await checkServiceFieldSectionHighlighting(page, 'username');
    await page.fill('#root\\/authType\\/password', postgresPassword);
    await checkServiceFieldSectionHighlighting(page, 'password');
    await page.fill('#root\\/hostPort', postgresHostPort);
    await checkServiceFieldSectionHighlighting(page, 'hostPort');
    await page.fill('#root\\/database', postgresDatabase);
    await checkServiceFieldSectionHighlighting(page, 'database');
  }

  async fillIngestionDetails(page: Page) {
    await page
      .locator('#root\\/schemaFilterPattern\\/includes')
      .fill(this.filterPattern);

    await page.locator('#root\\/schemaFilterPattern\\/includes').press('Enter');
  }

  async runAdditionalTests(test) {
    if (process.env.PLAYWRIGHT_IS_OSS) {
      test('Add Usage ingestion', async ({ page }) => {
        await redirectToHomePage(page);
        await visitServiceDetailsPage(
          page,
          {
            type: this.category,
            name: this.serviceName,
            displayName: this.serviceName,
          },
          true
        );

        await page.click('[data-testid="ingestions"]');
        await page.waitForSelector(
          '[data-testid="ingestion-details-container"]'
        );
        await page.click('[data-testid="add-new-ingestion-button"]');
        await page.waitForTimeout(1000);
        await page.click('[data-menu-id*="usage"]');
        await page.fill('#root\\/queryLogFilePath', this.queryLogFilePath);

        const deployResponse = page.waitForResponse(
          '/api/v1/services/ingestionPipelines/deploy/*'
        );

        await page.click('[data-testid="submit-btn"]');
        await page.click('[data-testid="deploy-button"]');

        await deployResponse;

        await page.click('[data-testid="view-service-button"]');

        await page.waitForResponse(
          '**/api/v1/services/ingestionPipelines/status'
        );

        await this.handleIngestionRetry('usage', page);
      });

      test('Verify if usage is ingested properly', async ({ page }) => {
        const entityResponse = page.waitForResponse(
          `/api/v1/tables/name/*.order_items?**`
        );

        await visitEntityPage({
          page,
          searchTerm: this.entityName,
          dataTestId: `${this.serviceName}-${this.entityName}`,
        });

        await entityResponse;

        await page.getByRole('tab', { name: 'Queries' }).click();

        await page.waitForSelector(
          '[data-testid="queries-container"] >> text=selectQuery'
        );

        await page.click('[data-testid="schema"]');
        await page.waitForSelector('[data-testid="related-tables-data"]');
        await page.waitForSelector('[data-testid="frequently-joined-columns"]');
      });
    }
  }

  async deleteService(page: Page) {
    await super.deleteService(page);
  }
}

// eslint-disable-next-line jest/no-export
export default PostgresIngestionClass;
