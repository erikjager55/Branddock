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
 *
 * ⚠️ De briefing hieronder is BEWUST overcompleet (2026-08-16). Kalibratie over
 * 7 briefings (`scripts/dev/briefing-gate-calibration.ts`) liet zien dat de
 * validatie ~5-10 punten run-op-run varieert. Een briefing die rond de 78-82
 * scoort flipt daardoor over de gate heen en er weer onder — dan test je de
 * variantie, niet de wizard. Alleen het niveau "expliciete doelgroep + meetbaar
 * doel + kanalen + timing + bewijs + wat-we-niet-doen" haalt stabiel 85-94.
 * Snoei dit dus niet in omdat het lang oogt; de lengte is de determinisme.
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
  /** AI-briefing-score wanneer de review-stap zichtbaar was (gate of niet). */
  briefingScore?: string | null;
  /** Zichtbare foutmeldingen op het moment dat de wizard bleef staan. */
  errors?: string[];
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
        'Start van het terrasseizoen: horeca-ondernemers stellen in maart hun textielbudget voor ' +
          'de zomer vast. Vorig jaar misten we die piek doordat we pas in mei zichtbaar waren; dit ' +
          'jaar starten we zes weken eerder. Tweede aanleiding: het assortiment is gegroeid met een ' +
          'lijn voor buitengebruik, en de aangescherpte regels rond wegwerpmateriaal maken het ' +
          'gesprek over herbruikbaar textiel urgenter dan vorig seizoen.',
      );
    await page
      .getByTestId('setup-briefing-audience')
      .fill(
        'Doelgroep: eigenaren en inkopers van zelfstandige restaurants (40-120 couverts) en kleine ' +
          'hotelketens in Nederland en Belgi\u00eb, die nu met wegwerp of met een goedkope textielleverancier ' +
          'werken. Mede-beslissers zijn de chef en de operationeel manager. THINK: per gedekt couvert ' +
          'is goed textiel goedkoper dan ik dacht, en het is zichtbaar onderdeel van mijn uitstraling. ' +
          'FEEL: dit past bij het niveau van mijn zaak; ik wil hier niet de laatste in zijn. DO: een ' +
          'proefpakket aanvragen via de site. Meetbaar doel: 40 proefpakket-aanvragen in acht weken, ' +
          'waarvan 15% doorstroomt naar een offerte.',
      );
    await page
      .getByTestId('setup-briefing-core-message')
      .fill(
        'Napking maakt de gedekte tafel onderdeel van je merk: duurzaam textiel dat er na honderd ' +
          'wasbeurten nog steeds uitziet alsof het de eerste is. De meeste zaken vergelijken de ' +
          'inkoopprijs per stuk; reken je per gedekt couvert over de levensduur, dan valt goed ' +
          'textiel goedkoper uit \u00e9n ziet je tafel er beter uit.',
      );
    await page
      .getByTestId('setup-briefing-tone')
      .fill(
        'Vakkundig en warm, zonder opsmuk. Concreet over materiaal, wasbeurten en gebruik; nooit ' +
          'wollig. Collegiaal van toon \u2014 een leverancier die de horeca van binnenuit kent, geen ' +
          'verkoper. Nederlands, u-vorm. Cijfers waar we ze hebben.',
      );
    await page
      .getByTestId('setup-briefing-constraints')
      .fill(
        'Kanalen: LinkedIn voor eigenaren, e-mail naar bestaande relaties, en \u00e9\u00e9n long-form pagina ' +
          'als anker. Timing: start 1 maart, piek half maart, uitloop tot eind april. Bewijs dat we ' +
          'mogen gebruiken: honderd wasbeurten uit eigen test, en de casus van een restaurantklant die ' +
          'zes uur per week bespaart op textielbeheer. NIET doen: prijsclaims of kortingen noemen ' +
          '(prijzen verschillen per volume \u2014 doorverwijzen naar de offertepagina), concurrenten bij ' +
          'naam noemen, stockfoto-restaurants gebruiken, superlatieven zonder onderbouwing, ' +
          'duurzaamheidsclaims zonder concrete cijfers, en geen druk-taal zoals "laatste kans".',
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

      // Score ook vastleggen als de gate WEL gehaald wordt — anders weet je niet of
      // stap 3 echt een verse validatie draaide of een herstelde concept-state hergebruikte.
      const reviewPass = page.getByTestId('strategy-review-briefing');
      if (await reviewPass.isVisible().catch(() => false)) {
        log.briefingScore = await reviewPass.getAttribute('data-briefing-score').catch(() => null);
      }

      const before = log.stepperText;
      await continueBtn.click();
      await page.waitForTimeout(2_000);
      const after = (await page.getByTestId('wizard-stepper').innerText().catch(() => '')) ?? '';
      log.advanced = after.replace(/\s+/g, ' ').trim().slice(0, 200) !== before;

      if (log.advanced) {
        log.note = 'doorgestoken naar volgende stap';
      } else {
        // Continue was klikbaar maar de stepper beweegt niet. Dat is geen gate — dat is
        // een knop die zegt dat je verder kunt terwijl dat niet zo is. Leg vast WAT er
        // op het scherm staat, anders is dit niet te diagnosticeren.
        // Eigen vangnet: een diagnose die de run sloopt die hij moet verklaren is erger
        // dan geen diagnose. Wat hier ook misgaat, het mag de driver niet afbreken.
        try {
          const screenRaw = await page
            .locator('main, [data-testid="campaign-wizard"]')
            .first()
            .innerText()
            .catch(() => '');
          const screen = String(screenRaw ?? '').replace(/\s+/g, ' ').trim().slice(0, 400);
          log.note = `Continue klikbaar maar stepper onveranderd. Scherm: ${screen}`;

          const errors = await page
            .locator('[role="alert"], [data-testid*="error"], .text-red-600, .text-red-500')
            .allInnerTexts()
            .catch(() => [] as string[]);
          const cleaned = (errors ?? [])
            .map((e) => String(e ?? '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .slice(0, 5);
          if (cleaned.length > 0) log.errors = cleaned;

          await page
            .screenshot({ path: path.resolve(__dirname, `../../../campaign-stall-step-${i}.png`), fullPage: true })
            .catch(() => {});
        } catch (diagErr) {
          log.note =
            'Continue klikbaar maar stepper onveranderd; diagnose zelf faalde: ' +
            (diagErr instanceof Error ? diagErr.message.split('\n')[0] : String(diagErr));
        }
      }
      steps.push(log);

      // Wizard verdwenen = flow afgerond.
      if (!(await page.getByTestId('campaign-wizard').isVisible().catch(() => false))) {
        finalNote = `wizard afgerond na stap ${i}`;
        break;
      }

      // Twee keer achter elkaar niet vooruit = vastgelopen. Doorklikken tot MAX_STEPS
      // levert alleen identieke regels op en verbergt waar het écht strandde.
      const stalled = steps.slice(-2);
      if (stalled.length === 2 && stalled.every((x) => !x.advanced)) {
        finalNote = `vastgelopen op stap ${i} — Continue klikbaar maar geen voortgang`;
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
