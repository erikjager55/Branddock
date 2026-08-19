/**
 * Smoke-test — elk bewakerbestand is BEWUST wel of niet aangehaakt.
 *
 * Waarom dit bestaat. De hele slapende-bewakers-survey van 2026-08-19 begon met
 * een telling uit `package.json`, en juist daardoor bleef `ssrf-guard.ts`
 * onzichtbaar: 65 asserties op een beveiligingsoppervlak, gecommit bij een
 * SSRF-fix eind juni, zónder npm-script. Een bewaker die niet meetelt als
 * bewaker vind je niet door beter naar je lijst te kijken — je moet naar de
 * schijf kijken.
 *
 * Deze bewaker legt de BESTANDSLIJST naast de gate-lijst. Een nieuw bestand in
 * `scripts/smoke-tests/` of `scripts/eval/` dat nergens draait, maakt CI rood.
 * Dat is de bedoeling: de fix is één regel — haak hem aan, of zet hem hieronder
 * met een reden.
 *
 * ⚠️ `NIET_AANGEHAAKT` is schuld, geen uitzonderingslijst. Elke regel is een
 * bewaker die bestaat en niet draait. De lijst hoort te krimpen; groeit hij,
 * dan is dat een beslissing die iemand expliciet neemt in plaats van vergeet.
 *
 * Geen DB, geen sleutels, geen netwerk.
 *
 * Run: npm run smoke:guard-wiring
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

/**
 * Bewakerbestanden die bewust NIET in een gate draaien, met de reden.
 *
 * De redenen zijn groepen, geen individuele excuses:
 *   sleutel   — vraagt een echte API-sleutel; kost geld per run
 *   database  — vraagt een echte, geseede database
 *   browser   — vraagt een chromium-binary
 *   netwerk   — haalt een externe host op
 *   cli       — is een gereedschap dat argumenten verwacht, geen bewaker
 *   gedekt    — junireeks-wees die alleen modules raakt die de ketting al dekt
 *   herschrijf — kan niet in CI draaien zonder eerst herschreven te worden
 */
const NIET_AANGEHAAKT: Record<string, string> = {
  // ── sleutel ───────────────────────────────────────────────────────────────
  'smoke-tests/competitor-ai-classifier.ts': 'sleutel — 401 zonder ANTHROPIC_API_KEY',
  'smoke-tests/competitor-activities.ts': 'sleutel + database',
  'smoke-tests/competitor-content-discovery.ts': 'sleutel + database',
  'smoke-tests/conversion-tweaks.ts': 'sleutel — volledig AI, geen gratis laag',
  'smoke-tests/longform-tweaks.ts': 'sleutel — volledig AI, geen gratis laag',
  'smoke-tests/structured-tweaks.ts': 'sleutel — volledig AI, geen gratis laag',
  'smoke-tests/google-vision-api-key.ts': 'sleutel — GOOGLE_VISION_API_KEY',
  'smoke-tests/seo-pipeline-wiring.ts': 'sleutel — 1 PASS / 19 FAIL zonder sleutel in CI',

  // ── database ──────────────────────────────────────────────────────────────
  'smoke-tests/claw-review-tool.ts': 'database — rood met nul asserties, vraagt meer dan een DB',
  'smoke-tests/competitor-refresh-dual-write.ts': 'database — idem',
  'smoke-tests/locale-picker-api.ts': 'database — idem',

  // ── cli / herschrijf ──────────────────────────────────────────────────────
  'eval/position-swap-judge.ts': 'cli — verwacht --candidateA/--candidateB/--rubric',
  'smoke-tests/agents-data-analyst.ts':
    'herschrijf — hardcodeert de dev-workspaces Zwarthout en Linfi, kan nooit in CI draaien',

};

let pass = 0;
const failures: string[] = [];

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    failures.push(name);
  }
}

/** npm-scripts die daadwerkelijk in een gate of workflow draaien. */
function aangehaakteNamen(): Set<string> {
  const namen = new Set<string>();

  for (const gate of ['scripts/ci/run-guards.sh', 'scripts/ci/run-db-guards.sh']) {
    let tekst = '';
    try {
      tekst = readFileSync(join(ROOT, gate), 'utf8');
    } catch {
      continue; // gate bestaat (nog) niet
    }
    // De entries dragen een assertie-ondergrens: `smoke:foo:42`. Die moet eraf,
    // anders matcht de opzoeking in package.json niets.
    for (const m of tekst.matchAll(/^ {2}((?:smoke|eval):[a-z0-9:-]+)/gm)) {
      namen.add(m[1].replace(/:\d+$/, ''));
    }
  }

  // ⚠️ ALLE workflows, niet alleen ci.yml — de nachtelijke productie-bewaker
  // staat in een eigen bestand.
  const workflows = execSync('ls .github/workflows/*.yml 2>/dev/null || true', {
    cwd: ROOT,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(Boolean);
  for (const wf of workflows) {
    const tekst = readFileSync(join(ROOT, wf), 'utf8');
    for (const m of tekst.matchAll(/npm run ((?:smoke|eval):[a-z0-9:-]+)/g)) {
      namen.add(m[1]);
    }
  }
  return namen;
}

console.log('\n── Elk bewakerbestand is bewust wel of niet aangehaakt ──\n');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>;
};

const namen = aangehaakteNamen();
assert('er zijn aangehaakte bewakers gevonden', namen.size > 0, `${namen.size} namen`);

const bereikbaar = new Set<string>();
const zonderScript: string[] = [];
for (const naam of namen) {
  const cmd = pkg.scripts[naam];
  if (!cmd) {
    zonderScript.push(naam);
    continue;
  }
  for (const m of cmd.matchAll(/\S+\.tsx?/g)) {
    bereikbaar.add(m[0].replace(/^\.\//, ''));
  }
}

// ⚠️ Faal hier LUID en met de juiste diagnose als de opzoeking stuk is.
//
// Zonder deze check komt een kapotte opzoeking eruit als "190 bestanden draaien
// nergens" — een uitkomst die leest als een ramp terwijl het gereedschap stuk is.
// Dat is niet theoretisch: mijn eerste versie van dezelfde extractie nam de
// assertie-ondergrens mee (`smoke:foo:42`), vond daardoor niets in package.json,
// en rapporteerde 7 bereikbare bestanden waar er 154 zijn.
//
// Generieker (dank aan een parallelle sessie die dezelfde val vond): elke bewaker
// die tegen een lijst toetst, hoort te controleren dát die lijst gevuld is.
assert(
  'elke aangehaakte naam bestaat in package.json',
  zonderScript.length === 0,
  zonderScript.length > 0
    ? `${zonderScript.length} gate-namen hebben geen npm-script: ${zonderScript.slice(0, 3).join(', ')}` +
      ' — waarschijnlijk is de naam-extractie stuk, niet de bedrading'
    : undefined,
);
assert(
  'de opzoeking levert een plausibel aantal bestanden',
  bereikbaar.size >= namen.size * 0.5,
  `${bereikbaar.size} bestanden voor ${namen.size} namen — te weinig om te kloppen`,
);

const bestanden = execSync(
  'ls scripts/smoke-tests/*.ts scripts/eval/*.ts scripts/eval/*/*.ts 2>/dev/null || true',
  { cwd: ROOT, encoding: 'utf8' },
)
  .split('\n')
  .filter(Boolean);

const onaangehaakt = bestanden
  .filter((p) => !bereikbaar.has(p))
  .map((p) => p.slice('scripts/'.length));

const onverklaard = onaangehaakt.filter((p) => !(p in NIET_AANGEHAAKT));
const verdwenen = Object.keys(NIET_AANGEHAAKT).filter((p) => !onaangehaakt.includes(p));

console.log(`  bewakerbestanden : ${bestanden.length}`);
console.log(`  aangehaakt       : ${bestanden.length - onaangehaakt.length}`);
console.log(`  bewust niet      : ${onaangehaakt.length - onverklaard.length}`);
console.log();

assert(
  'geen bewakerbestand draait nergens zónder reden',
  onverklaard.length === 0,
  onverklaard.length > 0
    ? `\n      ${onverklaard.join('\n      ')}\n` +
      '      Haak ze aan in scripts/ci/run-guards.sh, of zet ze in NIET_AANGEHAAKT\n' +
      '      met een reden. Een bewaker die nergens draait, verrot naar de\n' +
      '      verkeerde kant — zie gotchas.md 2026-08-19.'
    : undefined,
);

assert(
  'de NIET_AANGEHAAKT-lijst bevat geen dode regels',
  verdwenen.length === 0,
  verdwenen.length > 0
    ? `deze staan als "bewust niet aangehaakt" maar draaien inmiddels wél (of ` +
      `bestaan niet meer): ${verdwenen.join(', ')}`
    : undefined,
);

console.log(
  failures.length === 0
    ? `\n✓ guard-wiring-completeness: ${pass} checks groen ` +
      `(${onaangehaakt.length} bewakers staan bewust stil)\n`
    : `\n✗ guard-wiring-completeness: ${failures.length} fout\n`,
);
process.exit(failures.length === 0 ? 0 : 1);
