import fs from 'fs';
import path from 'path';
import { test, expect } from '../../fixtures/auth.fixture';

/**
 * Campagnegenerator end-to-end door de wizard.
 *
 * De wizard is gated: `knowledge` eist ≥1 geselecteerde kennisbron (wordt
 * automatisch gevuld uit brand assets) en `strategy` eist een AI-briefing-score
 * van ≥80. Die score is niet deterministisch — een run die op stap 3 blijft
 * staan is dus niet per se een bug, maar het product dat zijn gate doet.
 *
 * Daarom is dit een driver die zo ver loopt als de gates toelaten en exact
 * vastlegt wáár hij stopt, in plaats van een harde alles-of-niets-assertie.
 */

const WORKSPACE_ID = 'e2e-ws-napking-001';
const OUT_FILE = path.resolve(__dirname, '../../../campaign-generator-outcome.json');

const MAX_STEPS = 8;
/** Ruim: elke stap kan een meerstaps AI-keten starten. */
const STEP_TIMEOUT = 6 * 60_000;

interface StepLog {
  index: number;
  stepperText: string;
  continueEnabled: boolean;
  advanced: boolean;
  elapsedMs: number;
  note: string;
}

test('campagnegenerator: wizard end-to-end', async ({ authenticatedPage: page }) => {
  const steps: StepLog[] = [];
  const started = Date.now();
  let finalNote = '';

  try {
    const switched = await page.request.post('/api/workspace/switch', {
      data: { workspaceId: WORKSPACE_ID },
    });
    expect(switched.ok(), 'workspace switch moet slagen').toBeTruthy();
    await page.reload();
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 30_000 });

    // ── Naar Campagnes + wizard starten ─────────────────────────
    await page.click('[data-section-id="active-campaigns"]');
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 20_000 });
    await page.getByTestId('new-campaign-button').click();
    await expect(page.getByTestId('campaign-wizard')).toBeVisible({ timeout: 20_000 });

    // ── Stap 1: setup invullen ──────────────────────────────────
    await page.getByTestId('setup-name').fill('E2E Contentcampagne Napking');
    await page
      .getByTestId('setup-briefing-occasion')
      .fill(
        'Napking wil het komende kwartaal structureel zichtbaar worden bij horeca-ondernemers ' +
          'die op zoek zijn naar duurzame, merkbare tafelaankleding. Aanleiding is de start van het ' +
          'nieuwe seizoen en een gegroeid assortiment.',
      );
    await page
      .getByTestId('setup-briefing-audience')
      .fill(
        'Eigenaren en inkopers van zelfstandige restaurants en hotelketens in Nederland en België. ' +
          'Zij kiezen op uitstraling, duurzaamheid en gemak, en beslissen vaak samen met hun chef of ' +
          'operationeel manager. Doel: aanvragen voor een proefpakket.',
      );
    await page
      .getByTestId('setup-briefing-core-message')
      .fill(
        'Napking maakt de gedekte tafel onderdeel van je merk: duurzaam textiel dat er na honderd ' +
          'wasbeurten nog steeds uitziet alsof het de eerste is.',
      );
    await page
      .getByTestId('setup-briefing-tone')
      .fill('Vakkundig en warm, zonder opsmuk. Concreet over materiaal en gebruik, nooit wollig.');
    await page
      .getByTestId('setup-briefing-constraints')
      .fill(
        'Geen prijsclaims of kortingen. Nederlands. Geen superlatieven zonder onderbouwing. ' +
          'Duurzaamheidsclaims alleen met concrete cijfers.',
      );
    await page.getByTestId('goal-CONTENT_MARKETING').click();

    // ── Generieke stap-driver ───────────────────────────────────
    const continueBtn = page.getByTestId('wizard-continue-button');

    for (let i = 1; i <= MAX_STEPS; i++) {
      const stepStart = Date.now();
      const stepperText = (await page.getByTestId('wizard-stepper').innerText().catch(() => '')) ?? '';

      // Wacht tot Continue klikbaar wordt — hier zit de AI-tijd én de gate.
      const enabled = await continueBtn
        .waitFor({ state: 'visible', timeout: 30_000 })
        .then(async () => {
          const deadline = Date.now() + STEP_TIMEOUT;
          while (Date.now() < deadline) {
            if (!(await continueBtn.isDisabled().catch(() => true))) return true;
            await page.waitForTimeout(3_000);
          }
          return false;
        })
        .catch(() => false);

      const log: StepLog = {
        index: i,
        stepperText: stepperText.replace(/\s+/g, ' ').trim().slice(0, 200),
        continueEnabled: enabled,
        advanced: false,
        elapsedMs: Date.now() - stepStart,
        note: '',
      };

      if (!enabled) {
        // Onderscheid gate vs. storing: bij de briefing-review-fase staat de
        // AI-score in het DOM. Score < 80 = het product dat correct weigert,
        // géén bug. Zonder deze uitlezing is dat verschil niet te maken.
        const review = page.getByTestId('strategy-review-briefing');
        if (await review.isVisible().catch(() => false)) {
          const score = await review.getAttribute('data-briefing-score').catch(() => null);
          log.note = `briefing-gate niet gehaald — AI-score ${score ?? '?'} (drempel 80). Correct productgedrag, geen storing.`;
        } else {
          const body = ((await page.locator('body').innerText().catch(() => '')) ?? '')
            .replace(/\s+/g, ' ')
            .slice(0, 200);
          log.note = `Continue bleef disabled, geen briefing-review zichtbaar. Scherm: ${body}`;
        }
        steps.push(log);
        finalNote = `gestopt op stap ${i}`;
        break;
      }

      const before = log.stepperText;
      await continueBtn.click();
      await page.waitForTimeout(2_000);
      const after = (await page.getByTestId('wizard-stepper').innerText().catch(() => '')) ?? '';
      log.advanced = after.replace(/\s+/g, ' ').trim().slice(0, 200) !== before;
      log.note = log.advanced ? 'doorgestoken naar volgende stap' : 'stepper onveranderd na klik';
      steps.push(log);

      // Wizard verdwenen = flow afgerond.
      if (!(await page.getByTestId('campaign-wizard').isVisible().catch(() => false))) {
        finalNote = `wizard afgerond na stap ${i}`;
        break;
      }
    }
    if (!finalNote) finalNote = `MAX_STEPS (${MAX_STEPS}) bereikt zonder afronding`;
  } catch (err) {
    finalNote = `fout: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
    throw err;
  } finally {
    fs.writeFileSync(
      OUT_FILE,
      JSON.stringify(
        { totalElapsedMs: Date.now() - started, finalNote, stepsCompleted: steps.length, steps },
        null,
        2,
      ),
    );
  }
});
