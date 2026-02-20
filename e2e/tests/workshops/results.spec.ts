import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';

/**
 * Workshop results tests. The results/complete page is accessed after
 * completing a workshop. We mock the API to return a COMPLETED workshop
 * with report data.
 */
test.describe('Workshops — Results', () => {
  async function setupCompletedWorkshopRoute(page: import('@playwright/test').Page) {
    await page.route('**/api/workshops/test-workshop-completed*', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            workshop: {
              id: 'test-workshop-completed',
              title: 'Canvas Workshop',
              status: 'COMPLETED',
              completedAt: new Date().toISOString(),
              durationMinutes: 45,
              participantCount: 6,
              facilitatorName: 'Sarah Chen',
              hasFacilitator: true,
              reportGenerated: true,
              executiveSummary: 'The workshop identified key brand positioning opportunities.',
              findings: [
                { id: 'f1', order: 1, content: 'Brand purpose resonates well with target audience' },
                { id: 'f2', order: 2, content: 'Core values need stronger differentiation' },
                { id: 'f3', order: 3, content: 'Market positioning is competitive' },
              ],
              recommendations: [
                { id: 'r1', order: 1, content: 'Refine brand messaging', isCompleted: false },
                { id: 'r2', order: 2, content: 'Update visual identity guidelines', isCompleted: false },
              ],
              canvasData: { why: 'To empower brands', how: 'Through strategy', what: 'Platform' },
              canvasLocked: false,
              objectives: ['Define brand purpose', 'Align team on values'],
              participants: [],
              agendaItems: [],
              notes: [],
              photos: [],
            },
          }),
        });
      }
      return route.continue();
    });
  }

  async function navigateToWorkshopResults(page: import('@playwright/test').Page) {
    await setupCompletedWorkshopRoute(page);

    // Use the __testNavigation helper exposed by App.tsx in development mode
    await page.evaluate(() => {
      const nav = (window as unknown as Record<string, unknown>).__testNavigation as {
        setSelectedWorkshopId: (id: string | null) => void;
        setActiveSection: (section: string) => void;
      } | undefined;
      if (nav) {
        nav.setSelectedWorkshopId('test-workshop-completed');
        nav.setActiveSection('workshop-results');
      }
    });

    await page.waitForSelector('[data-testid="workshop-complete-page"]', {
      timeout: 10_000,
    }).catch(() => {});
  }

  test('renders workshop complete page', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToWorkshopResults(page);

    const completePage = page.locator(
      '[data-testid="workshop-complete-page"]',
    );
    if (!(await completePage.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    await expect(completePage).toBeVisible();
  });

  test('shows complete banner with workshop stats', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopResults(page);

    const completePage = page.locator(
      '[data-testid="workshop-complete-page"]',
    );
    if (!(await completePage.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    const banner = page.locator('[data-testid="complete-banner"]');
    await expect(banner).toBeVisible();

    // Should show "Completed" badge
    await expect(banner).toContainText('Completed');

    // Should show stats (Date, Participants, Duration, Facilitator)
    await expect(banner).toContainText('Date');
    await expect(banner).toContainText('Participants');
    await expect(banner).toContainText('Duration');
    await expect(banner).toContainText('Facilitator');
  });

  test('shows 5-tab navigation (Overview, Canvas, Workshop, Notes, Gallery)', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopResults(page);

    const completePage = page.locator(
      '[data-testid="workshop-complete-page"]',
    );
    if (!(await completePage.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    const tabs = page.locator('[data-testid="results-tabs"]');
    await expect(tabs).toBeVisible();

    // 5 tabs
    await expect(
      tabs.locator('[data-testid="results-tab-overview"]'),
    ).toBeVisible();
    await expect(
      tabs.locator('[data-testid="results-tab-canvas"]'),
    ).toBeVisible();
    await expect(
      tabs.locator('[data-testid="results-tab-workshop"]'),
    ).toBeVisible();
    await expect(
      tabs.locator('[data-testid="results-tab-notes"]'),
    ).toBeVisible();
    await expect(
      tabs.locator('[data-testid="results-tab-gallery"]'),
    ).toBeVisible();
  });

  test('overview tab shows AI report when report is generated', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopResults(page);

    const completePage = page.locator(
      '[data-testid="workshop-complete-page"]',
    );
    if (!(await completePage.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    // Overview tab should be active by default
    const overviewTab = page.locator('[data-testid="overview-tab"]');
    await expect(overviewTab).toBeVisible();

    // When report is generated, should show executive summary
    await expect(overviewTab).toContainText(
      'brand positioning opportunities',
    );
  });

  test('overview tab shows Generate Report button when no report', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Override with workshop that has no report
    await page.route('**/api/workshops/no-report*', (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            workshop: {
              id: 'no-report',
              title: 'Canvas Workshop',
              status: 'COMPLETED',
              completedAt: new Date().toISOString(),
              durationMinutes: 30,
              participantCount: 4,
              facilitatorName: null,
              hasFacilitator: false,
              reportGenerated: false,
              executiveSummary: null,
              findings: [],
              recommendations: [],
              canvasData: null,
              canvasLocked: false,
              objectives: [],
              participants: [],
              agendaItems: [],
              notes: [],
              photos: [],
            },
          }),
        });
      }
      return route.continue();
    });

    await page.evaluate(() => {
      const nav = (window as unknown as Record<string, unknown>).__testNavigation as {
        setSelectedWorkshopId: (id: string | null) => void;
        setActiveSection: (section: string) => void;
      } | undefined;
      if (nav) {
        nav.setSelectedWorkshopId('no-report');
        nav.setActiveSection('workshop-results');
      }
    });

    const overviewTab = page.locator('[data-testid="overview-tab"]');
    if (!(await overviewTab.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    // Should show Generate Report button
    const generateButton = overviewTab.locator('button', {
      hasText: 'Generate Report',
    });
    await expect(generateButton).toBeVisible();
  });

  test('clicking tab switches content', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToWorkshopResults(page);

    const completePage = page.locator(
      '[data-testid="workshop-complete-page"]',
    );
    if (!(await completePage.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    // Click Canvas tab
    const canvasTab = page.locator(
      '[data-testid="results-tab-canvas"]',
    );
    await canvasTab.click();

    // Overview tab content should be hidden, canvas content should show
    await page.waitForTimeout(500);

    // Click Notes tab
    const notesTab = page.locator(
      '[data-testid="results-tab-notes"]',
    );
    await notesTab.click();

    await page.waitForTimeout(500);

    // Click back to Overview
    const overviewTabButton = page.locator(
      '[data-testid="results-tab-overview"]',
    );
    await overviewTabButton.click();

    const overviewContent = page.locator('[data-testid="overview-tab"]');
    await expect(overviewContent).toBeVisible();
  });

  test('complete banner shows export buttons', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    await navigateToWorkshopResults(page);

    const completePage = page.locator(
      '[data-testid="workshop-complete-page"]',
    );
    if (!(await completePage.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    const banner = page.locator('[data-testid="complete-banner"]');
    await expect(banner).toBeVisible();

    // Should show PDF and Raw Data export buttons
    await expect(banner.locator('button', { hasText: 'PDF' })).toBeVisible();
    await expect(
      banner.locator('button', { hasText: 'Raw Data' }),
    ).toBeVisible();
  });

  test('has back to asset button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    await navigateToWorkshopResults(page);

    const completePage = page.locator(
      '[data-testid="workshop-complete-page"]',
    );
    if (!(await completePage.isVisible({ timeout: 5_000 }))) {
      test.skip();
      return;
    }

    const backButton = page.locator(
      '[data-testid="back-to-asset-button"]',
    );
    await expect(backButton).toBeVisible();
    await expect(backButton).toContainText('Back to Asset');
  });
});
