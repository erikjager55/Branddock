/**
 * tweaks-fixture-sync — bewaakt de invoer van de drie AI-tweaks-bewakers.
 *
 * WAAROM DIT BESTAAT
 *
 * `conversion-tweaks`, `longform-tweaks` en `structured-tweaks` bouwen hun invoer zo:
 *
 *     const fields = getContentTypeInputs(contentType);
 *     for (const f of fields) { const v = inputs[f.key]; if (v == null) continue; ... }
 *
 * Een sleutel die niet (meer) in de content-type-definitie staat, wordt daardoor
 * STIL overgeslagen. Hernoemt of verdwijnt er één, dan krijgt de "mét velden"-tak
 * minder mee en gaat hij lijken op de "zonder"-tak — waarna de bewaker faalt om
 * een reden die niets met kwaliteit te maken heeft.
 *
 * Die drie draaien alleen 's nachts en kosten elf AI-calls. Deze bewaker vangt de
 * breuk vóór die rekening, en kost niets: hij genereert niets en leest alleen.
 *
 * Aanleiding: `slapende-bewakers-survey` had "inhoudelijk verifiëren vraagt echte
 * AI-calls" als één blok. Dat klopt voor de kwaliteitsvraag, maar niet voor deze
 * helft — 2026-08-20.
 */
import fs from 'node:fs';
import path from 'node:path';
import { getContentTypeInputs } from '@/features/campaigns/lib/content-type-inputs';

const BEWAKERS = ['conversion-tweaks', 'longform-tweaks', 'structured-tweaks'];

let passed = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.error(`  ✗ ${label}${detail ? `\n      ${detail}` : ''}`);
  }
}

interface Fixture {
  types: string[];
  sleutels: string[];
}

/**
 * Leest de content-types en invoersleutels uit de bron van een bewaker.
 *
 * Twee vormen in omloop: een `testCases`-array met `contentType: '...'`, en inline
 * `generateForCase('type', taak, { ... })`. Beide worden gedekt — de tweede werd bij
 * het bouwen bijna gemist, en dat gaf nul treffers in plaats van een fout.
 */
function leesFixture(naam: string): Fixture {
  const src = fs.readFileSync(
    path.join('scripts', 'smoke-tests', `${naam}.ts`),
    'utf8',
  );

  const types = [
    ...src.matchAll(/contentType:\s*'([^']+)'/g),
    ...src.matchAll(/generateForCase\(\s*\n?\s*'([^']+)'/g),
  ].map((m) => m[1]);

  const sleutels = new Set<string>();
  for (const m of src.matchAll(/(?:with(?:out)?Inputs|inputs):\s*\{([\s\S]*?)\n\s*\},/g)) {
    for (const k of m[1].matchAll(/^\s*([a-zA-Z][a-zA-Z0-9_]*):/gm)) sleutels.add(k[1]);
  }
  for (const m of src.matchAll(/generateForCase\((?:[^()]|\([^()]*\))*?\{([\s\S]*?)\n\s*\},?\s*\);/g)) {
    for (const k of m[1].matchAll(/^\s*([a-zA-Z][a-zA-Z0-9_]*):/gm)) sleutels.add(k[1]);
  }

  return { types: [...new Set(types)], sleutels: [...sleutels] };
}

function main(): void {
  console.log('\n── Kalibratie: is de extractie zelf heel? ─────────────────');
  // Zonder deze sectie bewijst een schone uitslag niets: een kapotte regex geeft
  // nul sleutels, en nul sleutels hebben per definitie geen gaten.
  // Zie gotchas.md 2026-08-19 ("een lege lijst bewijst precies wat je zoekt").
  const fixtures = new Map<string, Fixture>();
  for (const naam of BEWAKERS) fixtures.set(naam, leesFixture(naam));

  for (const [naam, f] of fixtures) {
    check(`${naam}: content-types gevonden`, f.types.length >= 1,
      'Nul betekent dat de extractie stuk is, niet dat er niets gevoed wordt.');
    check(`${naam}: invoersleutels gevonden`, f.sleutels.length >= 3,
      `gevonden: ${f.sleutels.length}`);
  }

  const totaalSleutels = [...fixtures.values()].reduce((n, f) => n + f.sleutels.length, 0);
  check('samen minstens 20 sleutels (was 27 op 2026-08-20)', totaalSleutels >= 20,
    `gevonden: ${totaalSleutels}`);

  console.log('\n── Valt er een sleutel stil weg? ──────────────────────────');
  for (const [naam, f] of fixtures) {
    const bekend = new Set<string>();
    for (const t of f.types) {
      for (const veld of getContentTypeInputs(t) as Array<{ key: string }>) bekend.add(veld.key);
    }
    check(`${naam}: de content-types leveren velden op`, bekend.size > 0,
      `types: ${f.types.join(', ')} — nul velden betekent dat de opzoeking stuk is`);

    const ontbreekt = f.sleutels.filter((s) => !bekend.has(s));
    check(`${naam}: elke gevoede sleutel bestaat nog (${f.sleutels.length})`,
      ontbreekt.length === 0,
      ontbreekt.length
        ? `stil weggevallen: ${ontbreekt.join(', ')} — de bewaker voedt ze, ` +
          'getContentTypeInputs kent ze niet, dus ze bereiken de prompt nooit.'
        : undefined);
  }

  console.log('\n── Mutatietest ───────────────────────────────────────────');
  // Zou dit een echte breuk merken? Toets de vergelijking, niet de huidige stand.
  const bekend = new Set(
    (getContentTypeInputs('promotional-email') as Array<{ key: string }>).map((f) => f.key),
  );
  check('MUTATIETEST — een verzonnen sleutel wordt als gat herkend',
    !bekend.has('ditVeldBestaatNiet7Q'),
    'Zou dit slagen, dan matcht de vergelijking op iets anders dan de sleutel.');
  check('MUTATIETEST — een onbekend content-type levert nul velden',
    (getContentTypeInputs('bestaat-niet-7q') as unknown[]).length === 0,
    'Levert dit wél velden, dan is de nul-velden-check hierboven betekenisloos.');

  console.log('');
  if (failures.length > 0) {
    console.error(`✗ tweaks-fixture-sync: ${failures.length} van ${passed + failures.length} gefaald`);
    process.exit(1);
  }
  console.log(`✅ ${passed}/${passed} checks geslaagd`);
}

main();
