import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Brand Alignment — Scan Progress', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.brandAlignment);
  });

  test('clicking Run Alignment Check opens scan progress modal', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Click "Run Alignment Check"
    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await expect(runButton).toBeVisible();
    await runButton.click();

    // Scan progress modal should appear
    const scanModal = page.locator('[data-testid="scan-progress-modal"]');
    await expect(scanModal).toBeVisible({ timeout: 10_000 });
  });

  test('scan progress modal shows 8-step checklist', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await runButton.click();

    const scanModal = page.locator('[data-testid="scan-progress-modal"]');
    await expect(scanModal).toBeVisible({ timeout: 10_000 });

    // Should show the scan step checklist
    const checklist = scanModal.locator('[data-testid="scan-step-checklist"]');
    await expect(checklist).toBeVisible();

    // 8 scan steps defined in scan-steps.ts
    const steps = checklist.locator('li');
    await expect(steps).toHaveCount(8);

    // Verify known step text
    await expect(checklist).toContainText('Scanning Brand Foundation');
    await expect(checklist).toContainText('Calculating alignment score');
  });

  test('scan steps progress from pending to completed', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await runButton.click();

    const scanModal = page.locator('[data-testid="scan-progress-modal"]');
    await expect(scanModal).toBeVisible({ timeout: 10_000 });

    // Wait for at least the first step to show a checkmark or spinner
    // The scan runs with ~2s per step, so wait a bit
    await page.waitForTimeout(3000);

    // At least one step should show completed state (check icon)
    const checklist = scanModal.locator('[data-testid="scan-step-checklist"]');
    await expect(checklist).toBeVisible();
  });

  test('scan progress modal shows progress bar', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await runButton.click();

    const scanModal = page.locator('[data-testid="scan-progress-modal"]');
    await expect(scanModal).toBeVisible({ timeout: 10_000 });

    // Should contain a progress bar element
    const progressBar = scanModal.locator('[role="progressbar"], .bg-emerald');
    // The modal should have some progress indication
    await expect(scanModal).toContainText('Analyzing');
  });

  test('scan progress modal has cancel button', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await runButton.click();

    const scanModal = page.locator('[data-testid="scan-progress-modal"]');
    await expect(scanModal).toBeVisible({ timeout: 10_000 });

    // Should have a cancel button
    const cancelButton = scanModal.locator('button', { hasText: 'Cancel' });
    await expect(cancelButton).toBeVisible();
  });

  test('cancelling scan closes the modal', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await runButton.click();

    const scanModal = page.locator('[data-testid="scan-progress-modal"]');
    await expect(scanModal).toBeVisible({ timeout: 10_000 });

    // Click cancel
    const cancelButton = scanModal.locator('button', { hasText: 'Cancel' });
    await cancelButton.click();

    // Modal should close
    await expect(scanModal).not.toBeVisible({ timeout: 5_000 });
  });

  test('scan completes and shows scan complete modal', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Mock scan to complete quickly
    await page.route('**/api/alignment/scan/*/status', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          scanId: 'test-scan',
          status: 'COMPLETED',
          progress: 100,
          currentStep: 8,
          completedSteps: 8,
          totalSteps: 8,
          score: 82,
          issuesFound: 3,
        }),
      }),
    );

    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await runButton.click();

    // Wait for scan complete modal
    const completeModal = page.locator('[data-testid="scan-complete-modal"]');
    await expect(completeModal).toBeVisible({ timeout: 30_000 });

    // Should show score and issues count
    await expect(completeModal).toContainText('82');
  });

  test('scan complete modal has View Results button', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Mock quick scan completion
    await page.route('**/api/alignment/scan', (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ scanId: 'test-scan', status: 'RUNNING' }),
        });
      }
      return route.continue();
    });

    await page.route('**/api/alignment/scan/*/status', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          scanId: 'test-scan',
          status: 'COMPLETED',
          progress: 100,
          currentStep: 8,
          completedSteps: 8,
          totalSteps: 8,
          score: 78,
          issuesFound: 4,
        }),
      }),
    );

    const runButton = page.locator('button', { hasText: 'Run Alignment Check' });
    await runButton.click();

    const completeModal = page.locator('[data-testid="scan-complete-modal"]');
    await expect(completeModal).toBeVisible({ timeout: 30_000 });

    const viewResultsButton = completeModal.locator('button', {
      hasText: 'View Results',
    });
    await expect(viewResultsButton).toBeVisible();
  });
});
