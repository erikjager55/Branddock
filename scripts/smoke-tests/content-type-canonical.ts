/**
 * Bewaakt dat code geen deliverable-`contentType` schrijft die niet bestaat.
 *
 * WAAROM: `POST /api/campaigns/[id]/deliverables` valideert het veld als
 * `z.string().min(1)` — élke string wordt geaccepteerd. Daardoor kwamen er twee
 * niet-bestaande types in de database: `Landing Page` (de *display-naam* van
 * `landing-page`, geschreven door drie smoke-scripts, nog op 2026-08-18) en
 * `document_one-pager` (één rij uit april, herkomst onbekend).
 *
 * Vandaag zonder gevolg op productie — daar staan alleen canonieke waarden — maar
 * `evaluatePageQualityForType` splitst op exact `'landing-page'` en valt anders
 * stil terug op de generieke heuristiek. Een verkeerd gespeld type test dus een
 * ander pad dan productie neemt, met groen resultaat.
 *
 * Deze bewaker faalt bij VERGETEN, niet bij toevoegen: wie een nieuw type
 * introduceert voegt het toe aan `DELIVERABLE_TYPES` en is klaar. Wie een
 * display-naam of typfout schrijft, krijgt rood.
 *
 * Puur: leest de bestandsboom, geen database, geen sleutels, geen netwerk.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const WORTEL = process.cwd();
const MAPPEN = ['src', 'scripts', 'e2e'];

/**
 * Uitzonderingen, elk met een reden. Zonder reden hoort een regel hier niet:
 * een allowlist zonder motivering groeit stil tot hij niets meer bewaakt.
 */
const TOEGESTAAN = new Map<string, string>([
  // MIME-types: een ander veld met dezelfde naam (HTTP/storage), geen deliverable.
  // Die filteren we op de `/`-vorm, niet per stuk — zie MIME_VORM hieronder.

  // `blog-article` is een FORMAT (medium-config-registry: → 'long-form'), geen
  // type-id. `wizard/launch/route.ts` gebruikt het bewust als fallback wanneer
  // een blueprint-item geen type draagt. Zou strikte runtime-validatie breken.
  ['blog-article', 'format-aanduiding + bewuste fallback in wizard/launch'],
  // Bewust ongeldige waarden: deze smokes toetsen juist het foutpad.
  ['bestaat-niet', 'negatieve testdata — toetst afwijzing van een onbekend type'],
  ['bestaat-niet-xyz', 'negatieve testdata — idem'],
  ['geo-artikel-onbekend', 'negatieve testdata — publish-gate bij onbekend type'],
]);

/** Een ander domein: brand-asset-weergave, niet Deliverable.contentType. */
const ANDER_DOMEIN = [/^src\/config\/asset-dashboard-configs\.ts$/, /^src\/lib\/ui-i18n\/locales\//];
const MIME_VORM = /^(application|image|audio|video|text|multipart|font)\//i;

function canoniekeIds(): Set<string> {
  const bron = readFileSync(join(WORTEL, 'src/features/campaigns/lib/deliverable-types.ts'), 'utf8');
  const ids = [...bron.matchAll(/^\s*id:\s*['"]([^'"]+)['"],/gm)].map((m) => m[1]);
  return new Set(ids);
}

function tsBestanden(map: string, uit: string[] = []): string[] {
  for (const naam of readdirSync(join(WORTEL, map))) {
    const pad = join(map, naam);
    const vol = join(WORTEL, pad);
    if (statSync(vol).isDirectory()) {
      if (naam === 'node_modules' || naam === '.next') continue;
      tsBestanden(pad, uit);
    } else if (/\.tsx?$/.test(naam)) uit.push(pad);
  }
  return uit;
}

function main(): void {
  const canoniek = canoniekeIds();
  console.log(`\n── contentType-bewaker ───────────────────────────────────`);
  console.log(`  canonieke type-ids: ${canoniek.size}`);

  // Kalibratie: een lege of onvolledige lijst zou álles goedkeuren. Faal luid.
  if (canoniek.size < 40 || !canoniek.has('landing-page')) {
    console.error(`  ✗ KALIBRATIE: de canonieke lijst is onbruikbaar (${canoniek.size} ids). ` +
      `Is het formaat van deliverable-types.ts gewijzigd?`);
    process.exit(1);
  }
  console.log(`  ✓ kalibratie — de lijst is gevuld en bevat 'landing-page'`);

  const overtredingen: string[] = [];
  let gecontroleerd = 0;

  for (const map of MAPPEN) {
    for (const pad of tsBestanden(map)) {
      if (ANDER_DOMEIN.some((re) => re.test(pad))) continue;
      const tekst = readFileSync(join(WORTEL, pad), 'utf8');
      const regels = tekst.split('\n');
      regels.forEach((regel, i) => {
        // Commentaar overslaan. Proza dat een waarde ILLUSTREERT is geen gebruik,
        // en een comment draait niet — dit kost dus geen dekking.
        // Gevonden 2026-08-20: een JSDoc die `contentType: '...'` noemde om een
        // patroon uit te leggen, werd gemeld als niet-canoniek type. Dezelfde
        // klasse als de grep die commentaarregels meetelde (gotcha 20-08): een
        // controle die niet weet wat code is.
        // ⚠️ Dekt `//`, `/*` en JSDoc-vervolgregels (` * `), want zo schrijft deze
        // codebase ze. Een waarde in een blok-comment zónder sterretje glipt er
        // langs; dat is bewust niet opgelost, want die vorm komt hier niet voor.
        const kaal = regel.trim();
        if (kaal.startsWith('//') || kaal.startsWith('*') || kaal.startsWith('/*')) return;

        const m = regel.match(/contentType:\s*['"]([^'"]+)['"]/);
        if (!m) return;
        const waarde = m[1];
        if (MIME_VORM.test(waarde)) return;
        // Identity-mapping (`contentType: "contentType"`) is een kolomnaam in een
        // sorteer-/filtertabel, geen waarde. Gevonden als vals-positief bij de
        // eerste run tegen content-library/route.ts.
        if (waarde === 'contentType') return;
        gecontroleerd++;
        if (canoniek.has(waarde) || TOEGESTAAN.has(waarde)) return;
        overtredingen.push(`${relative('.', pad)}:${i + 1}  →  "${waarde}"`);
      });
    }
  }

  console.log(`  ✓ ${gecontroleerd} contentType-literals gecontroleerd`);
  for (const [w, reden] of TOEGESTAAN) console.log(`  ✓ uitzondering "${w}" — ${reden}`);

  if (overtredingen.length) {
    console.error(`\n  ✗ ${overtredingen.length} niet-bestaande contentType(s):`);
    for (const o of overtredingen) console.error(`      ${o}`);
    console.error(`\n  Een contentType hoort een id uit DELIVERABLE_TYPES te zijn, niet de`);
    console.error(`  display-naam ("Landing Page") en geen typfout. Klopt de waarde wél,`);
    console.error(`  voeg hem dan toe aan deliverable-types.ts — of aan TOEGESTAAN mét reden.`);
    process.exit(1);
  }
  console.log(`\n✅ alle contentType-literals bestaan\n`);
}

main();
