/**
 * Smoke voor de sslmode-beoordeling (`pg-major-sslmode-semantiek`).
 *
 * De bug die dit voorkomt is er een van stilte: na de pg-major betekent
 * `sslmode=require` alleen nog "versleuteld", zónder certificaat- en
 * hostnaamcontrole. Dezelfde string, zwakkere garantie, geen foutmelding.
 *
 * ⚠ De MUTATIETEST onderaan is de belangrijkste check. Een oordeel dat alles
 * "ok" noemt zou de eerste zes checks óók halen als we ze verkeerd om lazen.
 * Daarom toetsen we expliciet dat de functie discrimineert: verschillende
 * invoer moet verschillende niveaus opleveren, en de naïeve lezing ("er stáát
 * een sslmode, dus goed") moet aantoonbaar een ander antwoord geven.
 *
 * Puur, geen database. Run: npx tsx scripts/smoke-tests/db-ssl-mode.ts
 */

import { judgeDatabaseSslMode, shouldFailStartup } from '../../src/lib/db-ssl-mode';

let passed = 0;
const failures: string[] = [];
function check(label: string, ok: boolean, detail?: string): void {
  if (ok) { passed++; console.log(`  ✓ ${label}`); }
  else { failures.push(label); console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ''}`); }
}

const NEON = 'postgresql://u:p@ep-x.eu-central-1.aws.neon.tech/db';
const LOCAL = 'postgresql://erikjager:@localhost:5432/branddock';

function main(): void {
  console.log('\n── A. Productie ──────────────────────────────────────────');
  check('sslmode=require wordt gevlagd als verzwakkend',
    judgeDatabaseSslMode(`${NEON}?sslmode=require`, true).level === 'weakening');
  check('sslmode=prefer ook', judgeDatabaseSslMode(`${NEON}?sslmode=prefer`, true).level === 'weakening');
  check('sslmode=verify-ca ook', judgeDatabaseSslMode(`${NEON}?sslmode=verify-ca`, true).level === 'weakening');
  check('sslmode=verify-full is ok', judgeDatabaseSslMode(`${NEON}?sslmode=verify-full`, true).level === 'ok');
  check('géén sslmode wordt gevlagd als ontbrekend',
    judgeDatabaseSslMode(NEON, true).level === 'missing');
  // `no-verify` is GEEN 'weakening': hij wordt niet zwakker door de pg-major,
  // hij ís al zwak. Dat onderscheid is het hele punt van het aparte `weak`-niveau
  // (toegevoegd 2026-08-19). Tot die dag gaf deze modus `ok`, en `env-validation`
  // las dat als "geen bezwaar" — óók onder DATABASE_SSL_STRICT=true. De strengste
  // stand liet daarmee de zwakste modus door.
  check('no-verify is zwak, maar niet VERZWAKKEND — eigen niveau',
    judgeDatabaseSslMode(`${NEON}?sslmode=no-verify`, true).level === 'weak');
  check('disable telt óók als zwak', judgeDatabaseSslMode(`${NEON}?sslmode=disable`, true).level === 'weak');
  check('allow telt óók als zwak', judgeDatabaseSslMode(`${NEON}?sslmode=allow`, true).level === 'weak');
  check('een typfout in de modus wordt niet stil goedgekeurd',
    judgeDatabaseSslMode(`${NEON}?sslmode=verifyfull`, true).level === 'unknown');
  check('de zwak-melding legt uit WAT er zwak aan is',
    (() => { const v = judgeDatabaseSslMode(`${NEON}?sslmode=disable`, true);
             return v.level === 'weak' && v.message.includes('niet eens versleuteld'); })());

  console.log('\n── B. Lokaal ─────────────────────────────────────────────');
  check('localhost zonder sslmode in dev = geen bezwaar',
    judgeDatabaseSslMode(LOCAL, false).level === 'not-applicable');
  check('maar localhost mét NODE_ENV=production wordt wél beoordeeld',
    judgeDatabaseSslMode(LOCAL, true).level === 'missing');
  check('geen DATABASE_URL = niet van toepassing',
    judgeDatabaseSslMode(undefined, true).level === 'not-applicable');
  check('onparseerbare URL valt buiten dit oordeel',
    judgeDatabaseSslMode('dit-is-geen-url', true).level === 'not-applicable');

  console.log('\n── C. Bruikbaarheid van de melding ───────────────────────');
  const v = judgeDatabaseSslMode(`${NEON}?sslmode=require`, true);
  check('de melding noemt de gevonden modus', v.level === 'weakening' && v.message.includes('require'));
  check('en noemt wat je moet zetten', v.level === 'weakening' && v.message.includes('verify-full'));

  console.log('\n── D2. Startup-poort (het ECHTE beslispad) ───────────────');
  // Dit is de sectie die er het meest toe doet. Het oordeel klopte al vóór
  // 2026-08-19; wat níet klopte was wat de aanroeper ermee deed. `no-verify`
  // gaf 'ok' en passeerde daardoor stil, óók met DATABASE_SSL_STRICT=true.
  // Deze checks toetsen `shouldFailStartup` — dezelfde functie die
  // `env-validation.ts` aanroept, geen replica ervan.
  const poort = (mode: string | null, strict: boolean) =>
    shouldFailStartup(judgeDatabaseSslMode(mode ? `${NEON}?sslmode=${mode}` : NEON, true), strict);

  for (const slecht of ['no-verify', 'disable', 'allow', 'require', 'prefer', 'verify-ca', 'verifyfull']) {
    check(`STRICT=true weigert sslmode=${slecht}`, poort(slecht, true) === true);
  }
  check('STRICT=true weigert een ontbrekende sslmode', poort(null, true) === true);
  check('STRICT=true laat verify-full door', poort('verify-full', true) === false);

  // Tegenproef: zónder de vlag mag NIETS de startup breken. Deze kant is even
  // belangrijk als de andere — de vlag bestaat juist omdat een throw by default
  // de eerstvolgende deploy zou laten omvallen (Neon deelt `require` uit).
  for (const slecht of ['no-verify', 'disable', 'require', 'verifyfull']) {
    check(`ZONDER strict blijft sslmode=${slecht} een waarschuwing, geen crash`, poort(slecht, false) === false);
  }
  check('lokale dev-URL breekt nooit, ook niet met STRICT aan',
    shouldFailStartup(judgeDatabaseSslMode(LOCAL, false), true) === false);

  console.log('\n── D. Mutatietest ────────────────────────────────────────');
  const levels = new Set([
    judgeDatabaseSslMode(`${NEON}?sslmode=require`, true).level,
    judgeDatabaseSslMode(`${NEON}?sslmode=verify-full`, true).level,
    judgeDatabaseSslMode(NEON, true).level,
    judgeDatabaseSslMode(LOCAL, false).level,
  ]);
  check('MUTATIETEST — vier soorten invoer geven vier VERSCHILLENDE oordelen (anders discrimineert de functie niet)',
    levels.size === 4, `gevonden niveaus: ${[...levels].join(', ')}`);

  // De naïeve lezing waar dit hele item tegen beschermt: "er staat een sslmode
  // in de string, dus het zit goed". Die zou `require` goedkeuren.
  const naiefOk = `${NEON}?sslmode=require`.includes('sslmode=');
  const echtOk = judgeDatabaseSslMode(`${NEON}?sslmode=require`, true).level === 'ok';
  check('MUTATIETEST — de naïeve "er stáát een sslmode"-lezing geeft een ANDER antwoord',
    naiefOk === true && echtOk === false);

  console.log(`\n${failures.length === 0 ? '✅' : '❌'} ${passed}/${passed + failures.length} checks geslaagd`);
  if (failures.length) { failures.forEach((f) => console.error(`   - ${f}`)); process.exit(1); }
}

main();
