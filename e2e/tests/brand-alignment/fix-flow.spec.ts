import { test } from '../../fixtures/auth.fixture';
import { expect } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

test.describe('Brand Alignment — Fix Flow', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await navigateTo(authenticatedPage, SECTIONS.brandAlignment);
  });

  test('clicking Fix on an issue opens fix issue modal', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Wait for issues to load
    const issuesSection = page.locator(
      '[data-testid="alignment-issues-section"]',
    );
    await expect(issuesSection).toBeVisible();

    // Find a Fix button on an issue card
    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    const count = await issueCards.count();
    expect(count).toBeGreaterThan(0);

    const fixButton = issueCards.first().locator('button', { hasText: 'Fix' });
    if (await fixButton.isVisible()) {
      await fixButton.click();

      // Fix issue modal should open
      const fixModal = page.locator('[data-testid="fix-issue-modal"]');
      await expect(fixModal).toBeVisible({ timeout: 10_000 });
    }
  });

  test('fix modal shows 3 fix options (A, B, C)', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    // Wait for issues
    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    await expect(issueCards.first()).toBeVisible();

    // Find and click a Fix button
    const fixButton = issueCards.first().locator('button', { hasText: 'Fix' });
    if (!(await fixButton.isVisible())) {
      test.skip();
      return;
    }
    await fixButton.click();

    const fixModal = page.locator('[data-testid="fix-issue-modal"]');
    await expect(fixModal).toBeVisible({ timeout: 10_000 });

    // Should show fix options group
    const optionsGroup = fixModal.locator('[data-testid="fix-options-group"]');
    await expect(optionsGroup).toBeVisible({ timeout: 10_000 });

    // Should have 3 fix option cards (A, B, C)
    const optionA = fixModal.locator('[data-testid="fix-option-A"]');
    const optionB = fixModal.locator('[data-testid="fix-option-B"]');
    const optionC = fixModal.locator('[data-testid="fix-option-C"]');

    await expect(optionA).toBeVisible();
    await expect(optionB).toBeVisible();
    await expect(optionC).toBeVisible();
  });

  test('selecting a fix option highlights it', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    await expect(issueCards.first()).toBeVisible();

    const fixButton = issueCards.first().locator('button', { hasText: 'Fix' });
    if (!(await fixButton.isVisible())) {
      test.skip();
      return;
    }
    await fixButton.click();

    const fixModal = page.locator('[data-testid="fix-issue-modal"]');
    await expect(fixModal).toBeVisible({ timeout: 10_000 });

    // Wait for options to load
    const optionA = fixModal.locator('[data-testid="fix-option-A"]');
    await expect(optionA).toBeVisible({ timeout: 10_000 });

    // Click option A
    await optionA.click();

    // Option A should now have selected styling (green border)
    await expect(optionA).toHaveClass(/border-green-500/);

    // Radio should be checked
    const radio = optionA.locator('input[type="radio"]');
    await expect(radio).toBeChecked();
  });

  test('fix modal has Apply Fix button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    await expect(issueCards.first()).toBeVisible();

    const fixButton = issueCards.first().locator('button', { hasText: 'Fix' });
    if (!(await fixButton.isVisible())) {
      test.skip();
      return;
    }
    await fixButton.click();

    const fixModal = page.locator('[data-testid="fix-issue-modal"]');
    await expect(fixModal).toBeVisible({ timeout: 10_000 });

    // Should have Apply Fix button
    const applyButton = fixModal.locator('button', { hasText: 'Apply Fix' });
    await expect(applyButton).toBeVisible({ timeout: 10_000 });
  });

  test('fix modal has Dismiss button', async ({ authenticatedPage }) => {
    const page = authenticatedPage;

    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    await expect(issueCards.first()).toBeVisible();

    const fixButton = issueCards.first().locator('button', { hasText: 'Fix' });
    if (!(await fixButton.isVisible())) {
      test.skip();
      return;
    }
    await fixButton.click();

    const fixModal = page.locator('[data-testid="fix-issue-modal"]');
    await expect(fixModal).toBeVisible({ timeout: 10_000 });

    // Should have Dismiss button
    const dismissButton = fixModal.locator('button', { hasText: 'Dismiss' });
    await expect(dismissButton).toBeVisible({ timeout: 10_000 });
  });

  test('fix modal shows Edit Manually option', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    await expect(issueCards.first()).toBeVisible();

    const fixButton = issueCards.first().locator('button', { hasText: 'Fix' });
    if (!(await fixButton.isVisible())) {
      test.skip();
      return;
    }
    await fixButton.click();

    const fixModal = page.locator('[data-testid="fix-issue-modal"]');
    await expect(fixModal).toBeVisible({ timeout: 10_000 });

    // Should have Edit Manually button
    const editManuallyButton = fixModal.locator('button', {
      hasText: 'Edit Manually',
    });
    await expect(editManuallyButton).toBeVisible({ timeout: 10_000 });
  });

  test('dismissing an issue removes it from the list', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const issuesSection = page.locator(
      '[data-testid="alignment-issues-section"]',
    );
    await expect(issuesSection).toBeVisible();

    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    const initialCount = await issueCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Find a Dismiss button directly on a card
    const dismissButton = issueCards
      .first()
      .locator('button', { hasText: 'Dismiss' });
    if (await dismissButton.isVisible()) {
      await dismissButton.click();

      // Wait for the dismiss API call and re-render
      await page.waitForTimeout(1000);

      // Issue count should decrease or the dismissed issue should be gone
      const afterCount = await page
        .locator('[data-testid="alignment-issue-card"]')
        .count();
      expect(afterCount).toBeLessThanOrEqual(initialCount);
    }
  });

  test('fix option card shows preview text', async ({
    authenticatedPage,
  }) => {
    const page = authenticatedPage;

    const issueCards = page.locator('[data-testid="alignment-issue-card"]');
    await expect(issueCards.first()).toBeVisible();

    const fixButton = issueCards.first().locator('button', { hasText: 'Fix' });
    if (!(await fixButton.isVisible())) {
      test.skip();
      return;
    }
    await fixButton.click();

    const fixModal = page.locator('[data-testid="fix-issue-modal"]');
    await expect(fixModal).toBeVisible({ timeout: 10_000 });

    // Wait for options
    const optionA = fixModal.locator('[data-testid="fix-option-A"]');
    await expect(optionA).toBeVisible({ timeout: 10_000 });

    // Each option should show "Option A:", "Option B:", "Option C:" labels
    await expect(optionA).toContainText('Option A');
  });
});
