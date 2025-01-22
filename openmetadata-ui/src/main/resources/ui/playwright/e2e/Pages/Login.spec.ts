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
import { JWT_EXPIRY_TIME_MAP, LOGIN_ERROR_MESSAGE } from '../../constant/login';
import { UserClass } from '../../support/user/UserClass';
import { performAdminLogin } from '../../utils/admin';
import { redirectToHomePage } from '../../utils/common';
import { updateJWTTokenExpiryTime } from '../../utils/login';
import { visitUserProfilePage } from '../../utils/user';

const user = new UserClass();
const CREDENTIALS = user.data;
const invalidEmail = 'userTest@openmetadata.org';
const invalidPassword = 'testUsers@123';

test.describe.configure({
  // 5 minutes max for refresh token tests
  timeout: 5 * 60 * 1000,
});

test.describe('Login flow should work properly', () => {
  test.afterAll('Cleanup', async ({ browser }) => {
    const { apiContext, afterAction, page } = await performAdminLogin(browser);
    const response = await page.request.get(
      `/api/v1/users/name/${user.getUserName()}`
    );

    // reset token expiry to 4 hours
    await updateJWTTokenExpiryTime(apiContext, JWT_EXPIRY_TIME_MAP['4 hours']);

    user.responseData = await response.json();
    await user.delete(apiContext);
    await afterAction();
  });

  test.beforeAll(
    'Update token timer to be 3 minutes for new token created',
    async ({ browser }) => {
      const { apiContext, afterAction } = await performAdminLogin(browser);

      // update expiry for 3 mins
      await updateJWTTokenExpiryTime(
        apiContext,
        JWT_EXPIRY_TIME_MAP['3 minutes']
      );

      await afterAction();
    }
  );

  test('Signup and Login with signed up credentials', async ({ page }) => {
    await page.goto('/');

    await expect(page).toHaveURL(`/signin`);

    // Click on create account button
    await page.locator('[data-testid="signup"]').click();

    // Enter credentials
    await page.locator('#firstName').fill(CREDENTIALS.firstName);

    await expect(page.locator('#firstName')).toHaveValue(CREDENTIALS.firstName);

    await page.locator('#lastName').fill(CREDENTIALS.lastName);

    await expect(page.locator('#lastName')).toHaveValue(CREDENTIALS.lastName);

    await page.locator('#email').fill(CREDENTIALS.email);

    await expect(page.locator('#email')).toHaveValue(CREDENTIALS.email);

    await page.locator('#password').fill(CREDENTIALS.password);

    await expect(page.locator('#password')).toHaveAttribute('type', 'password');

    await page.locator('#confirmPassword').fill(CREDENTIALS.password);
    // Click on create account button
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(`/signin`);

    // Login with the created user
    await page.fill('#email', CREDENTIALS.email);
    await page.fill('#password', CREDENTIALS.password);
    await page.locator('[data-testid="login"]').click();

    await expect(page).toHaveURL(`/my-data`);

    // Verify user profile
    await page.locator('[data-testid="dropdown-profile"]').click();

    await expect(page.getByTestId('user-name')).toContainText(
      `${CREDENTIALS.firstName}${CREDENTIALS.lastName}`
    );
  });

  test('Signin using invalid credentials', async ({ page }) => {
    await page.goto(`/signin`);
    // Login with invalid email
    await page.fill('#email', invalidEmail);
    await page.fill('#password', CREDENTIALS.password);
    await page.locator('[data-testid="login"]').click();

    await expect(
      page.locator('[data-testid="login-error-container"]')
    ).toHaveText(LOGIN_ERROR_MESSAGE);

    // Login with invalid password
    await page.fill('#email', CREDENTIALS.email);
    await page.fill('#password', invalidPassword);
    await page.locator('[data-testid="login"]').click();

    await expect(
      page.locator('[data-testid="login-error-container"]')
    ).toHaveText(LOGIN_ERROR_MESSAGE);
  });

  test('Forgot password and login with new password', async ({ page }) => {
    await page.goto('/');
    // Click on Forgot button
    await page.locator('[data-testid="forgot-password"]').click();

    await expect(page).toHaveURL(`/forgot-password`);

    // Enter email
    await page.locator('#email').fill(CREDENTIALS.email);
    // Click on Forgot button
    await page.getByRole('button', { name: 'Submit' }).click();
    await page.locator('[data-testid="go-back-button"]').click();
  });

  test.fixme('Refresh should work', async ({ browser }) => {
    const browserContext = await browser.newContext();
    const { apiContext, afterAction } = await performAdminLogin(browser);
    const page1 = await browserContext.newPage(),
      page2 = await browserContext.newPage();

    const testUser = new UserClass();
    await testUser.create(apiContext);

    await afterAction();

    await test.step('Login and wait for refresh call is made', async () => {
      // User login

      await testUser.login(page1);
      await redirectToHomePage(page1);
      await redirectToHomePage(page2);

      const refreshCall = page1.waitForResponse('**/refresh', {
        timeout: 3 * 60 * 1000,
      });

      await refreshCall;

      await redirectToHomePage(page1);

      await visitUserProfilePage(page1, testUser.responseData.name);
      await redirectToHomePage(page2);
      await visitUserProfilePage(page2, testUser.responseData.name);
    });
  });
});
