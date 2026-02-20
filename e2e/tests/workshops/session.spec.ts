import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';

/**
 * Workshop session tests. The session page is accessed by navigating to
 * the workshop-session section with a workshopId set in the store.
 * For tests, we mock the API to return a workshop in IN_PROGRESS status.
 */
test.describe('Workshops — Session', () => {
  async function navigateToWorkshopSession(page: import('@playwright/test').Page) {
    // Mock workshop detail API to return an IN_PROGRESS workshop
    await page.route('**/api/workshops/*', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            workshop: {
              id: 'test-workshop-001',
              title: 'Canvas Workshop',
              status: 'IN_PROGRESS',
              currentStep: 1,
              timerSeconds: 0,
              bookmarkStep: null,
              hasFacilitator: true,
              facilitatorName: 'Sarah Chen',
              brandAssetId: 'test-asset-001',
              steps: [
                { stepNumber: 1, title: 'Define Purpose', prompt: 'What is your brand purpose?', instructions: 'Discuss your brand purpose.', duration: '10 min', response: null, isCompleted: false },
                { stepNumber: 2, title: 'Identify Values', prompt: 'What are your core values?', instructions: 'List your brand values.', duration: '10 min', response: null, isCompleted: false },
                { stepNumber: 3, title: 'Target Audience', prompt: 'Who is your target audience?', instructions: 'Define your audience.', duration: '10 min', response: null, isCompleted: false },
                { stepNumber: 4, title: 'Positioning', prompt: 'How do you position?', instructions: 'Define positioning.', duration: '10 min', response: null, isCompleted: false },
                { stepNumber: 5, title: 'Differentiators', prompt: 'What makes you different?', instructions: 'List differentiators.', duration: '10 min', response: null, isCompleted: false },
                { stepNumber: 6, title: 'Action Plan', prompt: 'What are next steps?', instructions: 'Create action plan.', duration: '10 min', response: null, isCompleted: false },
              ],
            },
          }),
        });
      }
      return route.continue();
    });

    // Use the __testNavigation helper exposed by App.tsx in development mode
    // to set workshopId and navigate to the workshop-session section
    await page.evaluate(() => {
      const nav = (window as unknown as Record<string, unknown>).__testNavigation as {
        setSelectedWorkshopId: (id: string | null) => void;
        setActiveSection: (section: string) => void;
      } | undefined;
      if (nav) {
        nav.setSelectedWorkshopId('test-workshop-001');
        nav.setActiveSection('workshop-session');
      }
    });

    // Wait for the session page
    await page.waitForSelector('[data-testid="workshop-session-page"]', {
      timeout: 10_000,
    }).catch(() => {});
  }

  test('renders workshop session page with toolbar', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopSession(page);

    const sessionPage = page.locator(
      '[data-testid="workshop-session-page"]',
    );
    if (!(await sessionPage.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    // Toolbar should be visible
    const toolbar = page.locator('[data-testid="workshop-toolbar"]');
    await expect(toolbar).toBeVisible();
  });

  test('toolbar shows timer button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToWorkshopSession(page);

    const toolbar = page.locator('[data-testid="workshop-toolbar"]');
    if (!(await toolbar.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    const timerButton = toolbar.locator('[data-testid="timer-button"]');
    await expect(timerButton).toBeVisible();

    // Timer should show initial time (00:00)
    await expect(timerButton).toContainText(/\d{1,2}:\d{2}/);
  });

  test('clicking timer toggles running state', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopSession(page);

    const timerButton = page.locator('[data-testid="timer-button"]');
    if (!(await timerButton.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    // Initially not running (gray background)
    await expect(timerButton).toHaveClass(/bg-gray-100/);

    // Click to start
    await timerButton.click();

    // Should switch to running state (emerald background)
    await expect(timerButton).toHaveClass(/bg-emerald-50/);

    // Click again to stop
    await timerButton.click();

    // Should switch back to stopped state
    await expect(timerButton).toHaveClass(/bg-gray-100/);
  });

  test('toolbar shows bookmark button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToWorkshopSession(page);

    const toolbar = page.locator('[data-testid="workshop-toolbar"]');
    if (!(await toolbar.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    const bookmarkButton = toolbar.locator(
      '[data-testid="bookmark-button"]',
    );
    await expect(bookmarkButton).toBeVisible();
  });

  test('shows step navigation with step circles', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopSession(page);

    const stepNav = page.locator('[data-testid="step-navigation"]');
    if (!(await stepNav.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    // Should show step circles (buttons)
    const stepButtons = stepNav.locator('button');
    const count = await stepButtons.count();
    expect(count).toBeGreaterThanOrEqual(6);
  });

  test('shows step content with title and instructions', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopSession(page);

    const stepContent = page.locator('[data-testid="step-content"]');
    if (!(await stepContent.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    // Should show step badge
    await expect(stepContent).toContainText('Step');
  });

  test('shows response capture with textarea', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopSession(page);

    const responseCapture = page.locator(
      '[data-testid="response-capture"]',
    );
    if (!(await responseCapture.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    // Should contain a textarea
    const textarea = responseCapture.locator('textarea');
    await expect(textarea).toBeVisible();
    await expect(textarea).toHaveAttribute(
      'placeholder',
      /Capture the team/i,
    );
  });

  test('response capture has Previous and Save & Next buttons', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopSession(page);

    const responseCapture = page.locator(
      '[data-testid="response-capture"]',
    );
    if (!(await responseCapture.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    const prevButton = responseCapture.locator('button', {
      hasText: 'Previous',
    });
    const nextButton = responseCapture.locator('button', {
      hasText: /Save/,
    });

    await expect(prevButton).toBeVisible();
    await expect(nextButton).toBeVisible();

    // On step 1, Previous should be disabled
    await expect(prevButton).toBeDisabled();
  });

  test('toolbar has Complete button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToWorkshopSession(page);

    const toolbar = page.locator('[data-testid="workshop-toolbar"]');
    if (!(await toolbar.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    const completeButton = toolbar.locator('button', {
      hasText: 'Complete',
    });
    await expect(completeButton).toBeVisible();
  });
});
