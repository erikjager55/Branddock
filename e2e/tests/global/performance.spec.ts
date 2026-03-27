import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../../fixtures/test-data';

/**
 * Performance benchmarks using Playwright's built-in Performance API.
 * Measures CLS and LCP for critical pages.
 *
 * Targets:
 * - CLS  < 0.1
 * - LCP  < 2500ms
 *
 * Note: FID/INP cannot be reliably measured in automated Playwright tests
 * because they require real user input events. FID observation is included
 * below as best-effort but will typically be null.
 */

async function loginViaApi(page: import('@playwright/test').Page) {
  await page.request.post('/api/auth/sign-in/email', {
    data: { email: TEST_USERS.owner.email, password: TEST_USERS.owner.password },
  });
  // Navigate to root so the page picks up the session cookie
  await page.goto('/');
  await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });
}

async function measureWebVitals(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    return new Promise<{
      lcp: number | null;
      cls: number | null;
      fid: number | null;
    }>((resolve) => {
      const results: { lcp: number | null; cls: number | null; fid: number | null } = {
        lcp: null,
        cls: null,
        fid: null,
      };

      // LCP
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          results.lcp = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      // CLS
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          if (!(entry as any).hadRecentInput) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            clsValue += (entry as any).value;
          }
        }
        results.cls = clsValue;
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });

      // FID
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results.fid = (entries[0] as any).processingStart - entries[0].startTime;
        }
      });
      fidObserver.observe({ type: 'first-input', buffered: true });

      // Collect after a delay to ensure all observers have fired
      setTimeout(() => {
        lcpObserver.disconnect();
        clsObserver.disconnect();
        fidObserver.disconnect();
        resolve(results);
      }, 3000);
    });
  });
}

test.describe('Performance Benchmarks', () => {
  test.beforeEach(async ({ page }) => {
    await loginViaApi(page);
  });

  test('dashboard loads within performance budget', async ({ page }) => {
    const vitals = await measureWebVitals(page);

    console.log('Dashboard Performance:', JSON.stringify(vitals, null, 2));

    // LCP should be under 2500ms
    if (vitals.lcp !== null) {
      expect(vitals.lcp).toBeLessThan(2500);
    }

    // CLS should be under 0.1
    if (vitals.cls !== null) {
      expect(vitals.cls).toBeLessThan(0.1);
    }

    // FID should be under 200ms (if captured)
    if (vitals.fid !== null) {
      expect(vitals.fid).toBeLessThan(200);
    }
  });

  test('brand foundation page loads within performance budget', async ({ page }) => {
    // Navigate to brand foundation
    await page.click('[data-section-id="brand"]');
    await expect(page.locator('[data-testid="brand-foundation-page"]')).toBeVisible({
      timeout: 10_000,
    });

    const vitals = await measureWebVitals(page);

    console.log('Brand Foundation Performance:', JSON.stringify(vitals, null, 2));

    if (vitals.lcp !== null) {
      expect(vitals.lcp).toBeLessThan(2500);
    }

    if (vitals.cls !== null) {
      expect(vitals.cls).toBeLessThan(0.1);
    }
  });

  test('campaigns page loads within performance budget', async ({ page }) => {
    // Navigate to campaigns
    await page.click('[data-section-id="active-campaigns"]');
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });

    const vitals = await measureWebVitals(page);

    console.log('Campaigns Performance:', JSON.stringify(vitals, null, 2));

    if (vitals.lcp !== null) {
      expect(vitals.lcp).toBeLessThan(2500);
    }

    if (vitals.cls !== null) {
      expect(vitals.cls).toBeLessThan(0.1);
    }
  });

  test('navigation timing — auth to dashboard', async ({ page }) => {
    // loginViaApi already navigated to dashboard in beforeEach
    // Re-navigate to measure a fresh load with session
    const start = Date.now();
    await page.goto('/');
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 15_000 });

    const loadTime = Date.now() - start;
    console.log(`Auth→Dashboard load time: ${loadTime}ms`);

    // Full page load with active session should be under 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test('sidebar navigation is responsive (< 1000ms)', async ({ page }) => {
    // Dismiss onboarding if present
    const wizard = page.locator('[data-testid="onboarding-wizard"]');
    if (await wizard.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const skipBtn = page.locator('[data-testid="onboarding-wizard"] button', {
        hasText: /skip|get started|close/i,
      });
      if (await skipBtn.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
        await skipBtn.first().click();
      }
    }

    // Measure sidebar navigation times
    const sections = ['brand', 'personas', 'products', 'active-campaigns', 'dashboard'];
    const timings: Record<string, number> = {};

    for (const section of sections) {
      const navStart = Date.now();
      await page.click(`[data-section-id="${section}"]`);
      await page.waitForSelector('[data-testid="page-shell"], [data-testid="dashboard"], [data-testid="brand-foundation-page"]', {
        timeout: 5_000,
      });
      const navTime = Date.now() - navStart;
      timings[section] = navTime;
    }

    console.log('Sidebar Navigation Timings:', JSON.stringify(timings, null, 2));

    // Each navigation should be under 1000ms (includes first-load data fetching)
    for (const [section, time] of Object.entries(timings)) {
      expect(time, `Navigation to ${section} took ${time}ms`).toBeLessThan(1000);
    }
  });
});
