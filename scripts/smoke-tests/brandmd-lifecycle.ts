// =============================================================
// Smoke: brand.md lifecycle-mails (touchpoints 2.2 t/m 2.5)
//
// Draait zonder DB, mailer of env-vars (pure functies + renderers).
// Bewaakt wat bij deze feature echt fout kán gaan:
//   1. Vensterlogica — nooit te vroeg, nooit inhalen, één mail per run
//   2. Toestemming — 2.2-2.4 alleen met opt-in; opt-out stopt ze;
//      2.5 gaat áltijd (service-bericht over opgeslagen data)
//   3. Uitschrijven — elke mail draagt een werkende unsubscribe-link
//   4. Copy-consistentie — de rapport-mail belooft exact wat de cron
//      stuurt (twee footer-varianten, geen "one-time email" meer)
//
// Run: npx tsx scripts/smoke-tests/brandmd-lifecycle.ts
// =============================================================

import {
  decideLifecycleStage,
  EXPIRY_NOTICE_DAYS,
  type LifecycleProfileState,
} from '../../src/lib/brandmd/lifecycle';
import {
  renderLifecycleEmail,
  type LifecycleStage,
} from '../../src/lib/email/templates/brandmd-lifecycle';
import { renderBrandMdReportEmail } from '../../src/lib/email/templates/brandmd-report';

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

let failures = 0;
function fail(message: string): void {
  console.error(`✗ ${message}`);
  failures += 1;
}
function check(condition: boolean, message: string): void {
  if (!condition) fail(message);
}

// ─── 1 + 2. Vensters en toestemming ───────────────────

const NOW = new Date('2026-08-15T07:00:00.000Z');
/** Ver buiten het TTL-venster, zodat 2.5 niet meespeelt. */
const FAR_EXPIRY = new Date(NOW.getTime() + 80 * DAY);

function state(overrides: Partial<LifecycleProfileState> = {}): LifecycleProfileState {
  const capturedAt = new Date(NOW.getTime() - 2 * DAY);
  return {
    now: NOW,
    expiresAt: FAR_EXPIRY,
    createdAt: capturedAt,
    emailCapturedAt: capturedAt,
    lifecycleOptInAt: new Date(capturedAt),
    lifecycleOptOutAt: null,
    lifecycleStagesSent: [],
    ...overrides,
  };
}

/** Draft met opt-in, `ageMs` oud, met de al verstuurde stages. */
function aged(ageMs: number, stagesSent: string[] = []): LifecycleProfileState {
  const capturedAt = new Date(NOW.getTime() - ageMs);
  return state({
    createdAt: capturedAt,
    emailCapturedAt: capturedAt,
    lifecycleOptInAt: capturedAt,
    lifecycleStagesSent: stagesSent,
  });
}

const windowCases: Array<{ name: string; input: LifecycleProfileState; expect: LifecycleStage | null }> = [
  { name: '12u na capture — te vroeg voor 2.2', input: aged(12 * HOUR), expect: null },
  { name: '25u na capture — 2.2 opent', input: aged(25 * HOUR), expect: '2.2' },
  { name: 'dag 3, 2.2 al verstuurd — 2.3 nog dicht', input: aged(3 * DAY, ['2.2']), expect: null },
  { name: 'dag 8 — 2.3 open', input: aged(8 * DAY, ['2.2']), expect: '2.3' },
  { name: 'dag 25 — 2.4 open', input: aged(25 * DAY, ['2.2', '2.3']), expect: '2.4' },
  { name: 'dag 70 — alle vensters dicht', input: aged(70 * DAY, ['2.2', '2.3', '2.4']), expect: null },
  {
    name: 'geen opt-in — geen enkele reeks-mail',
    input: { ...aged(25 * HOUR), lifecycleOptInAt: null },
    expect: null,
  },
  {
    name: 'uitgeschreven — stopt de reeks midden in het venster',
    input: { ...aged(25 * HOUR), lifecycleOptOutAt: new Date(NOW.getTime() - HOUR) },
    expect: null,
  },
];

for (const testCase of windowCases) {
  const decision = decideLifecycleStage(testCase.input);
  check(
    decision.stage === testCase.expect,
    `venster "${testCase.name}": verwacht ${testCase.expect ?? 'geen mail'}, kreeg ${decision.stage ?? 'geen mail'}`,
  );
}

// 2.2 haalt nooit in: venster dicht → stil markeren, niet versturen.
const missed = decideLifecycleStage(aged(10 * DAY));
check(missed.stage === '2.3', `gemiste 2.2 op dag 10 moet doorschuiven naar 2.3, kreeg ${missed.stage}`);
check(missed.silentMarks.includes('2.2'), '2.2 moet stil gemarkeerd worden zodra dag 7 voorbij is');
check(
  missed.stagesSentAfterSilentMarks.includes('2.2'),
  'stille markering moet in de te persisteren stage-lijst zitten',
);

// Een stil gemarkeerde 2.2 gaat daarna nooit alsnog uit.
const afterSilentMark = decideLifecycleStage(aged(10 * DAY, ['2.2', '2.3']));
check(afterSilentMark.stage === null, '2.2 mag na stille markering niet alsnog uitgaan');

// 2.5: TTL in zicht wint van de reeks, ongeacht toestemming.
const nearExpiry = new Date(NOW.getTime() + (EXPIRY_NOTICE_DAYS - 1) * DAY);
check(
  decideLifecycleStage(state({ expiresAt: nearExpiry })).stage === '2.5',
  '2.5 moet uitgaan zodra de TTL binnen het venster valt',
);
check(
  decideLifecycleStage(state({ expiresAt: nearExpiry, lifecycleOptInAt: null })).stage === '2.5',
  '2.5 moet óók uitgaan zonder opt-in (service-bericht)',
);
check(
  decideLifecycleStage(state({ expiresAt: nearExpiry, lifecycleOptOutAt: NOW })).stage === '2.5',
  '2.5 moet óók uitgaan na uitschrijven (service-bericht)',
);
check(
  decideLifecycleStage(state({ expiresAt: new Date(NOW.getTime() + 30 * DAY) })).stage !== '2.5',
  '2.5 mag niet uitgaan als de TTL nog ver weg is',
);

// 2.5 al verstuurd → de reeks krijgt weer voorrang, en 2.5 niet twee keer.
const afterExpiryNotice = decideLifecycleStage({
  ...aged(25 * HOUR),
  expiresAt: nearExpiry,
  lifecycleStagesSent: ['2.5'],
});
check(afterExpiryNotice.stage === '2.2', `na 2.5 moet de open reeks-stage volgen, kreeg ${afterExpiryNotice.stage}`);

// Ontbrekende capture-timestamp valt terug op createdAt (oude drafts).
const noCapture = decideLifecycleStage(
  state({
    emailCapturedAt: null,
    createdAt: new Date(NOW.getTime() - 25 * HOUR),
    lifecycleOptInAt: new Date(NOW.getTime() - 25 * HOUR),
  }),
);
check(noCapture.stage === '2.2', 'zonder emailCapturedAt moet createdAt de leeftijd bepalen');

// ─── 3. Elke mail draagt een werkende unsubscribe-link ─

const UNSUB = 'https://branddock.app/api/brandmd/unsubscribe?token=tok_abc123';
const DOWNLOAD = 'https://branddock.app/api/brandmd/download?token=tok_abc123';

const renderVars = {
  brandName: 'Acme & Co',
  domain: 'acme.com',
  score: 62,
  downloadUrl: DOWNLOAD,
  claimUrl: 'https://branddock.app/brandmd/claim/tok_abc123',
  useHubUrl: 'https://branddock.app/brandmd/use',
  generatorUrl: 'https://branddock.app/brandmd',
  unsubscribeUrl: UNSUB,
  generatedAt: new Date('2026-08-01T10:00:00.000Z'),
  expiresAt: new Date('2026-10-30T10:00:00.000Z'),
};

const TIPS_REASON = 'aangaf tips te willen ontvangen';

for (const stage of ['2.2', '2.3', '2.4', '2.5'] as LifecycleStage[]) {
  const mail = renderLifecycleEmail(stage, renderVars);
  check(mail.subject.length > 0, `${stage}: lege subject`);
  check(mail.html.includes('<!DOCTYPE html>'), `${stage}: html is geen volledig document`);
  check(mail.html.includes(UNSUB), `${stage}: unsubscribe-link ontbreekt in de HTML`);
  check(mail.html.includes(`<a href="${UNSUB}"`), `${stage}: unsubscribe staat niet als klikbare link`);
  check(mail.text.includes(UNSUB), `${stage}: unsubscribe-link ontbreekt in de plain-text`);
  check(mail.text.includes(`Uitschrijven: ${UNSUB}`), `${stage}: plain-text unsubscribe-regel ontbreekt`);
  check(!mail.html.includes('undefined'), `${stage}: "undefined" lekt in de HTML`);
  check(!mail.text.includes('undefined'), `${stage}: "undefined" lekt in de plain-text`);
}

// 2.5 is een service-bericht: het mag GEEN tips-opt-in claimen.
const expiryMail = renderLifecycleEmail('2.5', renderVars);
check(!expiryMail.html.includes(TIPS_REASON), '2.5 mag geen tips-opt-in claimen (footerOverride werkt niet)');
check(expiryMail.html.includes('laatste mail over deze scan'), '2.5 mist de service-bericht-footer');
check(expiryMail.html.includes('30 oktober'), '2.5 moet de echte vervaldatum noemen');

// 2.2-2.4 leggen wél uit waarom je ze krijgt.
for (const stage of ['2.2', '2.3', '2.4'] as LifecycleStage[]) {
  const mail = renderLifecycleEmail(stage, renderVars);
  check(mail.html.includes(TIPS_REASON), `${stage}: mist de reden-van-ontvangst in de footer`);
}

// Zonder claim-URL (verlopen claim) mag er geen kapotte CTA overblijven.
const noClaim = renderLifecycleEmail('2.2', { ...renderVars, claimUrl: undefined });
check(!noClaim.html.includes('href=""'), '2.2 zonder claimUrl laat een lege href achter');
check(!noClaim.text.includes('undefined'), '2.2 zonder claimUrl lekt undefined in de plain-text');

// Merknaam/domein met HTML-tekens mag niet als markup landen.
const nasty = renderLifecycleEmail('2.3', { ...renderVars, domain: 'a<script>b.com' });
check(!nasty.html.includes('<script>'), 'domein met HTML-tekens wordt niet ge-escaped in 2.3');

// ─── 4. Rapport-mail: twee footer-varianten ───────────

const reportBase = {
  brandName: 'Acme & Co',
  domain: 'acme.com',
  score: 62,
  findings: [{ positive: true, text: 'Your positioning is stated in plain language.' }],
  dimensions: [{ label: 'Completeness', score: 70, explanation: 'Most sections are present.' }],
  downloadUrl: DOWNLOAD,
  claimUrl: 'https://branddock.app/brandmd/claim/tok_abc123',
  useHubUrl: 'https://branddock.app/brandmd/use',
  expiresAt: new Date('2026-10-30T10:00:00.000Z'),
};

const optedInReport = renderBrandMdReportEmail({
  ...reportBase,
  lifecycleOptedIn: true,
  unsubscribeUrl: UNSUB,
});
const plainReport = renderBrandMdReportEmail({ ...reportBase, lifecycleOptedIn: false });

// De oude belofte mag nergens meer staan — die botste met de reeks.
for (const [name, mail] of [
  ['opt-in', optedInReport],
  ['zonder opt-in', plainReport],
] as const) {
  check(!mail.html.includes('one-time email'), `rapport-mail (${name}) belooft nog steeds "one-time email"`);
  check(!mail.text.includes('One-time email'), `rapport-tekst (${name}) belooft nog steeds "One-time email"`);
  // Beide varianten kondigen de eenmalige TTL-melding aan.
  check(
    mail.html.includes('2026-10-30'),
    `rapport-mail (${name}) noemt de vervaldatum niet`,
  );
  check(
    mail.html.includes('before your draft'),
    `rapport-mail (${name}) kondigt de TTL-melding niet aan`,
  );
}

check(
  optedInReport.html.includes('three short ones'),
  'opt-in-variant kondigt de tips-reeks niet aan',
);
check(optedInReport.html.includes(UNSUB), 'opt-in-variant mist de unsubscribe-link');
check(optedInReport.text.includes(UNSUB), 'opt-in-variant mist de unsubscribe-link in plain-text');
check(
  plainReport.html.includes('no tips sequence'),
  'variant zonder opt-in belooft niet expliciet géén reeks',
);
check(
  !plainReport.html.includes(UNSUB),
  'variant zonder opt-in hoort geen unsubscribe-link te tonen (er is niks om uit te schrijven)',
);

// ─── Uitkomst ─────────────────────────────────────────

if (failures > 0) {
  console.error(`\n✗ brand.md lifecycle smoke: ${failures} bevinding(en)`);
  process.exit(1);
}
console.log(
  '✓ brand.md lifecycle smoke: vensters, toestemming, unsubscribe-links en copy-consistentie OK',
);
