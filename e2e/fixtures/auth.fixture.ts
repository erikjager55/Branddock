import { test as base, type Page } from '@playwright/test';
import { TEST_USERS } from './test-data';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  viewerPage: Page;
};

async function loginViaApi(page: Page, email: string, password: string) {
  await page.request.post('/api/auth/sign-in/email', {
    data: { email, password },
  });
  await page.goto('/');
  await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15_000 });

  // Dismiss onboarding wizard if it appears (overlay blocks sidebar clicks)
  const wizard = page.locator('[data-testid="onboarding-wizard"]');
  if (await wizard.isVisible({ timeout: 1_000 }).catch(() => false)) {
    // Click "Skip" or the last step's complete button to dismiss
    const skipBtn = page.locator('[data-testid="onboarding-wizard"] button', { hasText: /skip|get started|close/i });
    if (await skipBtn.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
      await skipBtn.first().click();
    }
  }
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    await loginViaApi(page, TEST_USERS.owner.email, TEST_USERS.owner.password);
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    // Uses owner account (highest role available in seed)
    await loginViaApi(page, TEST_USERS.owner.email, TEST_USERS.owner.password);
    await use(page);
  },

  viewerPage: async ({ page }, use) => {
    // Uses member account (closest to viewer available in seed)
    await loginViaApi(
      page,
      TEST_USERS.member.email,
      TEST_USERS.member.password,
    );
    await use(page);
  },
});

export { expect } from '@playwright/test';
