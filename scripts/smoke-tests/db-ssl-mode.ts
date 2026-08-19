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

import { judgeDatabaseSslMode } from '../../src/lib/db-ssl-mode';

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
  // ⚠️ LET OP bij het lezen van deze assertie: `ok` betekent hier "wordt niet
  // zwakker door de pg-major", NIET "veilig". `no-verify` is de zwakste modus die
  // er is. Deze functie beoordeelt uitsluitend de verzwakking waar
  // `pg-major-sslmode-semantiek` over gaat, en binnen die lens is het antwoord
  // correct.
  //
  // GEVOLG dat je moet kennen voordat je hier iets "repareert": `env-validation.ts`
  // gebruikt `level === 'ok'` als "geen bezwaar", óók met DATABASE_SSL_STRICT=true.
  // Een prod-URL met `sslmode=no-verify` passeert dus stil, zelfs in de strengste
  // stand. Vandaag niet blootgesteld (de prod-URL draagt `require`), maar het is een
  // echt gat en het staat als open punt in tasks/pg-major-sslmode-semantiek.md.
  //
  // Zet deze assertie dus NIET om naar 'weakening' om dat gat te dichten — dan
  // liegt de functie over haar eigen onderwerp. De juiste fix is een apart niveau.
  check('no-verify telt niet als verzwakkend (was al zwak, wordt niet zwakker)',
    judgeDatabaseSslMode(`${NEON}?sslmode=no-verify`, true).level === 'ok');

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
