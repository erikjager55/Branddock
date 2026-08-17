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
const CAMPAIGN_TITLE = 'E2E Contentcampagne Napking';
const OUT_FILE = path.resolve(__dirname, '../../../campaign-generator-outcome.json');

const MAX_STEPS = 10;
/**
 * Hoe vaak de test de ingebouwde "verbeter met AI"-knop gebruikt als de briefing onder
 * de gate scoort. Dit is GEEN omzeiling van de gate: het is exact het herstelpad dat een
 * gebruiker krijgt aangeboden, en het was zelf nooit getest. Nodig omdat de validatie
 * ~5-10 punten varieert (kalibratie 2026-08-16) — dezelfde briefing haalt de ene run 85
 * en de andere 78, en dan meet je de variantie i.p.v. de wizard.
 */
const MAX_IMPROVE_ATTEMPTS = 2;
/** Ruim: elke stap kan een meerstaps AI-keten starten. */
const STEP_TIMEOUT = 12 * 60_000;
// 6 → 12 min (2026-08-16). De elaboratie (journey + kanaal- + assetplan) is een langere
// keten dan de fasen ervoor, die elk 87-150s deden. Met 6 min gaf de driver op terwijl
// `generating_journey` nog liep — en dat leest in het rapport als een vastloper terwijl
// het gewoon de klok was.

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
  /** Welke knop deze stap gebruikte. Apart veld: `note` wordt in de stall-tak
   *  overschreven, waardoor juist bij een vastloper onbekend bleef wát er geklikt was. */
  action?: 'approve-concept' | 'continue';
  /** True wanneer de driver eerst alle concept-elementen als goedgekeurd markeerde. */
  ratedAll?: boolean;
  /** True wanneer de driver zelf een deliverable moest kiezen (geen AI-aanbeveling). */
  pickedDeliverable?: boolean;
  /** `stap:fase` vóór en ná de klik — de echte voortgangsmeter. */
  positionBefore?: string;
  positionAfter?: string;
}

/** `stap:fase` van de wizard, of 'weg' als de wizard niet meer in de DOM staat. */
async function readPosition(page: import('@playwright/test').Page): Promise<string> {
  const root = page.getByTestId('campaign-wizard');
  if (!(await root.isVisible().catch(() => false))) return 'weg';
  const step = await root.getAttribute('data-wizard-step').catch(() => null);
  const phase = await root.getAttribute('data-strategy-phase').catch(() => null);
  // `elaborated` hoort in de positie: binnen `review_final_strategy` is dát het enige
  // dat verandert tussen de elaboratie-klik en de goedkeur-klik.
  const elaborated = await root.getAttribute('data-elaborated').catch(() => null);
  return `${step ?? '?'}:${phase ?? '?'}:${elaborated ?? '?'}`;
}

// De config staat op 15 min; dat is genoeg voor de content-type-sweep maar niet voor
// deze flow. Gemeten 2026-08-16: alleen al de Concept-fasen kosten 123 + 102 + 141 s,
// bovenop briefingvalidatie en eventueel het verbeter-pad. De run tikte de 15 min met
// een paar seconden aan — en een timeout ziet er in de rapportage uit als een
// vastloper, terwijl het gewoon de klok was.
test.setTimeout(35 * 60_000);

test('campagnegenerator: wizard end-to-end', async ({ authenticatedPage: page }) => {
  const steps: StepLog[] = [];
  const started = Date.now();

  // Browserconsole meelezen. `handleApprove` en `handleElaborate` loggen bij een stille
  // early-return exact WELKE strategie-bron ontbreekt (`[concept-approval]` /
  // `[concept-elaborate]`) — maar dat komt in de browser terecht, niet in de serverlog.
  // Die diagnostiek bestond dus al en werd door niemand gelezen; daardoor bleef een
  // knop-die-niets-doet drie runs lang onverklaard.
  const consoleLog: string[] = [];
  page.on('console', (msg) => {
    const text = msg.text();
    if (/\[concept-|\[campaign|error|warn/i.test(text)) {
      consoleLog.push(`${msg.type()}: ${text.slice(0, 300)}`);
    }
  });
  page.on('pageerror', (err) => consoleLog.push(`pageerror: ${err.message.slice(0, 300)}`));
  let finalNote = '';
  let improveAttempts = 0;

  try {
    const switched = await page.request.post('/api/workspace/switch', {
      data: { workspaceId: WORKSPACE_ID },
    });
    expect(switched.ok(), 'workspace switch moet slagen').toBeTruthy();
    await page.reload();
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 30_000 });

    // ── Eigen residu opruimen ───────────────────────────────────
    // Elke run maakt een nieuwe draft-campagne aan. Na vijf runs blokkeert de wizard
    // met "Max 5 drafts per user. Archive or launch one before creating a new draft."
    // en meet de suite haar eigen vervuiling i.p.v. het product — dat kostte een
    // debugronde (2026-08-16): de wizard leek vast te lopen op stap 5/6, maar de
    // enige zichtbare fout was de draft-limiet.
    const draftsRes = await page.request.get('/api/campaigns?status=DRAFT');
    if (draftsRes.ok()) {
      const { campaigns = [] } = (await draftsRes.json()) as { campaigns?: Array<{ id: string }> };
      for (const draft of campaigns) {
        await page.request.delete(`/api/campaigns/${draft.id}`).catch(() => {});
      }
      if (campaigns.length > 0) {
        console.log(`[campaign-generator] ${campaigns.length} oude draft(s) opgeruimd vóór de run`);
      }
    }

    // ── Naar Campagnes + wizard starten ─────────────────────────
    await page.click('[data-section-id="active-campaigns"]');
    await page.waitForSelector('[data-testid="page-shell"]', { timeout: 20_000 });
    await page.getByTestId('new-campaign-button').click();
    await expect(page.getByTestId('campaign-wizard')).toBeVisible({ timeout: 20_000 });

    // ── Stap 1: setup invullen ──────────────────────────────────
    await page.getByTestId('setup-name').fill(CAMPAIGN_TITLE);
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
      let log0PickedDeliverable = false;
      const stepperText = (await page.getByTestId('wizard-stepper').innerText().catch(() => '')) ?? '';
      // De echte positie: stap-nummer + strategyPhase. Het stepper-LABEL blijft binnen
      // de Concept-stap acht fasen lang onveranderd, dus daarop meten zou echt werk als
      // stilstand lezen (2026-08-16).
      const positionBefore = await readPosition(page);

      // Stap 5 laat Continue pas toe bij >= 1 geselecteerde deliverable
      // (DELIVERABLES_STEP.canProceed). Normaal preselecteert de wizard de
      // AI-aanbevelingen uit het assetplan, maar dat plan is leeg zolang
      // `elaborateResult` null is — zie de productbevinding in het task-file. De driver
      // kiest er daarom zelf één.
      //
      // MOET vóór de wacht-op-Continue: die wacht faalt juist omdát er niets geselecteerd
      // is, en de code erna wordt dan nooit bereikt.
      const deliverableCard = page.locator('[data-testid^="deliverable-card-"]').first();
      if (await deliverableCard.isVisible().catch(() => false)) {
        if (await continueBtn.isDisabled().catch(() => false)) {
          await deliverableCard.click();
          await page.waitForTimeout(1_000);
          log0PickedDeliverable = true;
        }
      }

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
        pickedDeliverable: log0PickedDeliverable || undefined,
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

          // Onder de gate? Doe wat de gebruiker doet: "verbeter met AI". Dat pad hoort
          // hier getest te worden — het is de enige uitweg die het product aanbiedt.
          const improveBtn = page.getByTestId('briefing-improve-with-ai');
          if (improveAttempts < MAX_IMPROVE_ATTEMPTS && (await improveBtn.isVisible().catch(() => false))) {
            improveAttempts++;
            log.note = `AI-score ${score ?? '?'} < 80 — "verbeter met AI" gebruikt (poging ${improveAttempts}/${MAX_IMPROVE_ATTEMPTS})`;
            log.briefingScore = score;
            steps.push(log);
            await improveBtn.click();
            // Wacht tot de verbeter-actie klaar is: de knop is disabled zolang hij loopt.
            await page
              .waitForFunction(
                () => {
                  const el = document.querySelector('[data-testid="briefing-improve-with-ai"]');
                  return !el || !(el as HTMLButtonElement).disabled;
                },
                undefined,
                { timeout: 3 * 60_000 },
              )
              .catch(() => {});
            await page.waitForTimeout(3_000);
            i--; // deze stap opnieuw beoordelen met de verbeterde briefing
            continue;
          }

          log.briefingScore = score;
          log.note =
            `briefing-gate niet gehaald — AI-score ${score ?? '?'} (drempel 80) na ` +
            `${improveAttempts} verbeterpoging(en). Correct productgedrag, geen storing.`;
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

      // Sommige fasen hebben een eigen primaire actie IN de pagina; de generieke
      // Continue rechtsonder is dan niet de bedoelde weg. Bij `review_final_strategy`
      // is dat "Approve Concept", dat volgens de code "everything in one click" doet
      // (ConceptStep.tsx:975). Alleen op Continue klikken liet de wizard daar eindeloos
      // staan — de driver kiest nu de primaire actie als die er is.
      // "Approve Concept" weigert zolang niet élk concept-element beoordeeld is — de
      // knop toont dan een toast en doet verder niets (ConceptReviewView:114-128). Dat
      // is correct productgedrag, geen bug: de wizard vraagt om een oordeel vóór hij
      // een concept vastlegt. Een gebruiker klikt daarvoor "markeer alles goedgekeurd";
      // deze driver doet hetzelfde. Zonder die stap bleef de wizard hier hangen zonder
      // zichtbare reden (de toast is geen [role=alert] en haalde de foutafvang niet).
      const markAllBtn = page.getByTestId('mark-all-approved');
      if (await markAllBtn.isVisible().catch(() => false)) {
        await markAllBtn.click();
        await page.waitForTimeout(1_000);
        log.ratedAll = true;
      }

      // Bij `review_final_strategy` is de volgorde belangrijk. "Approve Concept" bouwt de
      // blueprint met `elaborateResult?.assetPlan ?? {leeg}` — klik je hem vóór de
      // elaboratie, dan krijgt stap 5 nul aanbevelingen, selecteert de autoselectie niets
      // en blijft Continue daar disabled. Continue draait eerst `handleElaborate`.
      // Daarom: zolang `data-elaborated=false` in die fase → Continue; daarna pas Approve.
      const needsElaborateFirst =
        positionBefore.startsWith('4:review_final_strategy') && positionBefore.endsWith(':false');

      const approveBtn = page.getByTestId('approve-concept');
      const usedPrimary =
        !needsElaborateFirst && (await approveBtn.isVisible().catch(() => false));
      log.action = usedPrimary ? 'approve-concept' : 'continue';
      if (usedPrimary) {
        await approveBtn.click();
      } else {
        await continueBtn.click();
      }
      // Wacht tot de positie daadwerkelijk verandert i.p.v. een vaste 2s: een fase-
      // overgang binnen Concept start een AI-keten die minuten kan duren.
      await page
        .waitForFunction(
          (prev) => {
            const el = document.querySelector('[data-testid="campaign-wizard"]');
            if (!el) return true; // wizard weg = afgerond
            const now = `${el.getAttribute('data-wizard-step')}:${el.getAttribute('data-strategy-phase')}:${el.getAttribute('data-elaborated')}`;
            return now !== prev;
          },
          positionBefore,
          { timeout: STEP_TIMEOUT },
        )
        .catch(() => {});
      const positionAfter = await readPosition(page);
      log.positionBefore = positionBefore;
      log.positionAfter = positionAfter;
      log.advanced = positionAfter !== positionBefore;

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

      // Terug op stap 1 nadat we verder waren = de wizard is afgerond en heeft zichzelf
      // gereset voor een volgende campagne. Zonder deze detectie begint de driver
      // vrolijk aan een nieuwe wizard en rapporteert hij die tweede briefing-gate als
      // "vastgelopen" — een succes dat zich als mislukking voordoet.
      const posNow = await readPosition(page);
      if (posNow.startsWith('1:') && !positionBefore.startsWith('1:') && i > 2) {
        finalNote = `wizard afgerond na stap ${i} — terug op stap 1 (reset voor een nieuwe campagne)`;
        break;
      }

      // Wizard verdwenen betekent NIET automatisch "afgerond". Bij een test-timeout
      // breekt Playwright de pagina af en verdwijnt het element ook — die run werd
      // daardoor als succes gerapporteerd terwijl de campagne op DRAFT stond met nul
      // deliverables (2026-08-16). Vraag het aan de data, niet aan de DOM.
      if (!(await page.getByTestId('campaign-wizard').isVisible().catch(() => false))) {
        const check = await page.request.get('/api/campaigns?status=DRAFT');
        const stillDraft = check.ok()
          ? ((await check.json()) as { campaigns?: Array<{ title: string }> }).campaigns?.some(
              (c) => c.title === CAMPAIGN_TITLE,
            )
          : undefined;
        finalNote =
          stillDraft === false
            ? `wizard afgerond na stap ${i} — campagne is geen DRAFT meer`
            : `wizard-element weg na stap ${i}, maar campagne staat nog op DRAFT` +
              ` (stillDraft=${String(stillDraft)}) — NIET afgerond`;
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
        {
          totalElapsedMs: Date.now() - started,
          finalNote,
          stepsCompleted: steps.length,
          steps,
          // Laatste 40 relevante consoleregels — genoeg om een stille early-return te
          // verklaren zonder het rapport onleesbaar te maken.
          browserConsole: consoleLog.slice(-40),
        },
        null,
        2,
      ),
    );
  }
});
