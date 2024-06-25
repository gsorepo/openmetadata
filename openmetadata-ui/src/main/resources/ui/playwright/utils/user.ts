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

import { expect, Page } from '@playwright/test';
import { adjectives, nouns } from '../constant/user';
import { uuid } from './common';

export const getRandomFirstName = () => {
  return `${
    adjectives[Math.floor(Math.random() * adjectives.length)]
  }${uuid()}`;
};
export const getRandomLastName = () => {
  return `${nouns[Math.floor(Math.random() * nouns.length)]}${uuid()}`;
};
export const generateRandomUsername = () => {
  const firstName = getRandomFirstName();
  const lastName = getRandomLastName();

  return {
    firstName,
    lastName,
    email: `${firstName}.${lastName}@example.com`,
    password: 'User@OMD123',
  };
};

export const nonDeletedUserChecks = async (page: Page) => {
  await expect(page.locator('[data-testid="edit-displayName"]')).toBeVisible();

  await expect(
    page.locator(
      '[data-testid="user-profile-details"] [data-testid="edit-persona"]'
    )
  ).toBeVisible();

  await expect(page.locator('[data-testid="edit-teams-button"]')).toBeVisible();
  await expect(page.locator('[data-testid="edit-roles-button"]')).toBeVisible();
  await expect(
    page.locator('[data-testid="persona-list"] [data-testid="edit-persona"]')
  ).toBeVisible();

  await expect(page.locator('[data-testid="edit-description"]')).toBeVisible();
};

export const deletedUserChecks = async (page: Page) => {
  const deletedBadge = await page.locator('[data-testid="deleted-badge"]');

  await expect(deletedBadge).toHaveText('Deleted');

  await expect(
    page.locator('[data-testid="edit-displayName"]')
  ).not.toBeVisible();
  await expect(
    page.locator(
      '[data-testid="user-profile-details"] [data-testid="edit-persona"]'
    )
  ).not.toBeVisible();
  await expect(
    page.locator('[data-testid="change-password-button"]')
  ).not.toBeVisible();
  await expect(
    page.locator('[data-testid="edit-teams-button"]')
  ).not.toBeVisible();
  await expect(
    page.locator('[data-testid="edit-roles-button"]')
  ).not.toBeVisible();
  await expect(
    page.locator('[data-testid="persona-list"] [data-testid="edit-persona"]')
  ).not.toBeVisible();
  await expect(
    page.locator('[data-testid="edit-description"]')
  ).not.toBeVisible();
};

export const softDeleteUserProfilePage = async (
  page: Page,
  userName: string,
  displayName: string
) => {
  const userResponse = page.waitForResponse(
    '/api/v1/search/query?q=**&from=0&size=*&index=*'
  );
  await page.getByTestId('searchbar').fill(userName);
  await userResponse;
  await page.getByTestId(userName).click();

  await page.getByTestId('user-profile-details').click();

  await nonDeletedUserChecks(page);

  await page.click('[data-testid="manage-button"]');
  await page.click('[data-testid="delete-button"]');

  await page.waitForSelector('[role="dialog"].ant-modal');

  await expect(page.locator('[role="dialog"].ant-modal')).toBeVisible();
  await expect(page.locator('.ant-modal-title')).toContainText(displayName);

  await page.fill('[data-testid="confirmation-text-input"]', 'DELETE');

  const deleteResponse = page.waitForResponse(
    '/api/v1/users/*?hardDelete=false&recursive=true'
  );
  await page.click('[data-testid="confirm-button"]');

  await deleteResponse;

  await expect(page.locator('.Toastify__toast-body')).toHaveText(
    /deleted successfully!/
  );

  await page.click('.Toastify__close-button');

  await deletedUserChecks(page);
};

export const restoreUserProfilePage = async (page: Page, fqn: string) => {
  await page.click('[data-testid="manage-button"]');
  await page.click('[data-testid="restore-button"]');

  await page.waitForSelector('[role="dialog"].ant-modal');

  await expect(page.locator('[role="dialog"].ant-modal')).toBeVisible();
  await expect(page.locator('.ant-modal-title')).toContainText('Restore user');

  await expect(
    page.locator('[data-testid="restore-modal-body"]')
  ).toContainText(`Are you sure you want to restore ${fqn}?`);

  const restoreResponse = page.waitForResponse('/api/v1/users/restore');
  await page.click('.ant-modal-footer .ant-btn-primary');

  await restoreResponse;

  await expect(page.getByRole('alert').first()).toHaveText(
    /User restored successfully/
  );

  await page.getByLabel('close').first().click();

  await nonDeletedUserChecks(page);
};

export const hardDeleteUserProfilePage = async (
  page: Page,
  displayName: string
) => {
  await page.getByTestId('manage-button').click();
  await page.getByTestId('delete-button').click();

  await page.waitForSelector('[role="dialog"].ant-modal');

  await expect(page.locator('[role="dialog"].ant-modal')).toBeVisible();
  await expect(page.locator('.ant-modal-title')).toContainText(displayName);

  await page.click('[data-testid="hard-delete-option"]');
  await page.check('[data-testid="hard-delete"]');
  await page.fill('[data-testid="confirmation-text-input"]', 'DELETE');

  const deleteResponse = page.waitForResponse(
    '/api/v1/users/*?hardDelete=true&recursive=true'
  );
  await page.click('[data-testid="confirm-button"]');

  await deleteResponse;

  await expect(page.getByRole('alert').first()).toHaveText(
    /deleted successfully!/
  );

  await page.getByLabel('close').first().click();
};
