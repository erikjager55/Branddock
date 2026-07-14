import { test, expect, type Page } from '@playwright/test';
import { navigateTo } from '../../helpers/navigation';
import { SECTIONS } from '../../fixtures/test-data';

/**
 * Onboarding technische pre-check — de geautomatiseerde variant van de 6
 * tester-taken uit `docs/playbooks/onboarding-test-protocol.md`, op een VERS
 * account. Draai dit vóór een sessie met externe testers zodat zij alleen op
 * UX struikelen, niet op kapotte techniek (task `onboarding-flow-test.md`).
 *
 * Scope-realiteit:
 *   - Taken 1-4 (signup → workspace → merk-asset invullen → persona aanmaken)
 *     en het bereiken van de content-generatie-entry zijn DB-only — die worden
 *     hier hard geassert.
 *   - Taak 5 (genereren) en 6 (on-brand-trace) hangen aan de Anthropic-API.
 *     De pre-check verifieert dat de generatie-INGANG rendert; de live-generatie
 *     zelf is een aparte gate (credits) die alleen tegen productie mét tegoed
 *     te bevestigen is. Zie de eind-samenvatting die de test print.
 *
 * Draaien:
 *   - Lokaal:  npm run test:e2e -- --grep "Onboarding pre-check"
 *   - Prod:    PLAYWRIGHT_BASE_URL=https://branddock-7y9n.vercel.app \
 *              npx playwright test --config e2e/playwright.config.ts \
 *                -g "Onboarding pre-check"
 *
 * Elke taak logt een rubric-regel (✅ zelfstandig / ⚠️ omweg / ❌ vast),
 * gespiegeld aan het observatie-protocol, plus een BLOCKED-markering voor de
 * credit-afhankelijke stap.
 */

type TaskScore = '✅' | '⚠️' | '❌' | '⛔';
const scores: Array<{ task: string; score: TaskScore; note?: string }> = [];
function record(task: string, score: TaskScore, note?: string) {
  scores.push({ task, score, note });
}

/** Dismiss de onboarding-tour-wizard indien zichtbaar (detacht zichzelf → bounded klik). */
async function dismissOnboardingWizard(page: Page) {
  const wizard = page.locator('[data-testid="onboarding-wizard"]');
  if (await wizard.isVisible({ timeout: 2_000 }).catch(() => false)) {
    const skip = wizard.locator('button', { hasText: /skip|get started|close|sluiten|overslaan/i });
    if (await skip.first().isVisible({ timeout: 1_000 }).catch(() => false)) {
      await skip.first().click({ timeout: 5_000 }).catch(() => {});
      await wizard.waitFor({ state: 'hidden', timeout: 5_000 }).catch(() => {});
    }
  }
}

test.describe('Onboarding pre-check (fresh account, tester-taken 1-6)', () => {
  // Meerdere sequentiële UI-stappen + verse registratie; ruimer dan de 30s-default.
  test.setTimeout(120_000);

  test('technische happy-path voor een verse gebruiker', async ({ page }) => {
    const uniqueEmail = `precheck-${Date.now()}@e2e-test.com`;

    // ── Taak 1: account aanmaken ────────────────────────────────────────
    await page.goto('/');
    await expect(page.locator('[data-testid="auth-page"]')).toBeVisible();
    await page.locator('[data-testid="register-tab"]').click();
    await expect(page.locator('[data-testid="register-form"]')).toBeVisible();
    await page.locator('[data-testid="register-name"]').fill('Onboarding Pre-check');
    await page.locator('[data-testid="register-email"]').fill(uniqueEmail);
    await page.locator('[data-testid="register-password"]').fill('SecurePassword123!');
    await page.locator('[data-testid="register-submit"]').click();
    await expect(page.locator('[data-testid="dashboard"]')).toBeVisible({ timeout: 20_000 });
    record('1. Account aanmaken', '✅');

    // ── Taak 2: workspace bestaat (verse account → eigen workspace + dashboard) ──
    await dismissOnboardingWizard(page);
    await expect(page.locator('[data-testid="sidebar"]')).toBeVisible();
    record('2. Workspace opgezet', '✅', 'auto-provisioned bij signup');

    // ── Taak 3: één merk-asset invullen (DB-only, geen AI) ──────────────
    await navigateTo(page, SECTIONS.brand);
    await expect(page.locator('[data-testid="brand-foundation-page"]')).toBeVisible({ timeout: 15_000 });
    const assetGrid = page.locator('[data-testid="asset-grid"]');
    await expect(assetGrid).toBeVisible({ timeout: 10_000 });
    const cards = assetGrid.locator('[data-testid="brand-asset-card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10_000 });
    // Verse account heeft de canonieke assets (11) als lege DRAFTs.
    expect(await cards.count()).toBeGreaterThan(0);

    await cards.first().click();
    await expect(page.locator('[data-testid="brand-asset-detail-page"]')).toBeVisible({ timeout: 10_000 });
    // Edit/Save + de framework-textarea hebben geen testid → target op rol/label
    // (bevestigd 2026-07-14; als deze faalt is de asset-editor-UI gewijzigd).
    const editBtn = page.getByRole('button', { name: /edit|bewerk/i }).first();
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    await editBtn.click();
    const firstField = page.getByRole('textbox').first();
    await expect(firstField).toBeVisible({ timeout: 10_000 });
    await firstField.fill('Pre-check: onze reden van bestaan is merken helder maken.');
    const saveBtn = page.getByRole('button', { name: /^save$|opslaan/i }).first();
    await expect(saveBtn).toBeVisible({ timeout: 5_000 });
    await saveBtn.click();
    // Save keert terug naar de read-mode: de Edit-knop is weer zichtbaar.
    await expect(editBtn).toBeVisible({ timeout: 10_000 });
    record('3. Merk-asset invullen', '✅', 'handmatig veld + opslaan, geen AI');

    // ── Taak 4: één persona aanmaken (DB-only, geen AI) ─────────────────
    await navigateTo(page, SECTIONS.personas);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });
    await page.locator('[data-testid="add-persona-button"]').click();
    // CreatePersonaPage auto-creëert een blanco "New Persona" → redirect naar detail.
    await expect(page.locator('[data-testid="persona-detail"]')).toBeVisible({ timeout: 15_000 });
    // De verse persona kan al in edit-mode openen (dan is er geen edit-knop, wel
    // een save-knop). Alleen klikken als de edit-knop er is.
    const personaEdit = page.locator('[data-testid="persona-edit-button"]');
    if (await personaEdit.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await personaEdit.click();
    }
    const personaSave = page.locator('[data-testid="persona-save-button"]');
    await expect(personaSave).toBeVisible({ timeout: 10_000 });
    // Naam-veld staat in de detail-header (bare input, geen testid).
    const personaName = page
      .locator('[data-testid="persona-detail-header"]')
      .getByRole('textbox')
      .first();
    await expect(personaName).toBeVisible({ timeout: 10_000 });
    await personaName.fill('Pre-check Persona — marketingmanager MKB');
    await personaSave.click();
    record('4. Persona aanmaken', '✅', 'create + naam, geen AI');

    // ── Taak 5-entry: content-generatie bereiken (generatie zelf = credit-gate) ──
    await navigateTo(page, SECTIONS.activeCampaigns);
    await expect(page.locator('[data-testid="page-shell"]')).toBeVisible({ timeout: 10_000 });
    const newCampaign = page.locator('[data-testid="new-campaign-button"]');
    await expect(newCampaign).toBeVisible({ timeout: 10_000 });
    await newCampaign.click();
    // De campagne-wizard is de ingang naar content-generatie; hij moet renderen.
    await expect(page.locator('[data-testid="campaign-wizard"]')).toBeVisible({ timeout: 15_000 });
    record(
      '5. Content genereren',
      '⛔',
      'generatie-ingang (campagne-wizard) rendert; de AI-generatie zelf vereist Anthropic-tegoed — live bevestigen op prod',
    );

    // ── Taak 6: on-brand-trace — pas zinvol ná een geslaagde generatie ──
    record(
      '6. On-brand terugvinden',
      '⛔',
      'fidelity/knowledge-context verschijnt pas na een geslaagde generatie (taak 5) — live bevestigen',
    );

    // ── Rubric-samenvatting (gespiegeld aan het observatie-protocol) ────
    const lines = scores.map((s) => `  ${s.score}  ${s.task}${s.note ? `  — ${s.note}` : ''}`);
    const blocked = scores.filter((s) => s.score === '⛔');
    console.log(
      `\n─── Onboarding pre-check (${uniqueEmail}) ───\n${lines.join('\n')}\n\n` +
        `Technische gate 1-4: GROEN (verse gebruiker doorloopt signup → workspace → asset → persona zonder AI).\n` +
        `Credit-gate 5-6 (${blocked.length}): live bevestigen op productie mét Anthropic-tegoed vóór de tester-sessie.\n`,
    );

    // De harde assertie: de vier AI-vrije technische taken zijn allemaal ✅.
    const technical = scores.slice(0, 4);
    expect(technical.every((s) => s.score === '✅')).toBe(true);
  });
});
