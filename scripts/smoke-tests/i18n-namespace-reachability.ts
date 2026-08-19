/**
 * i18n-namespace-reachability — vangt vertalingen die nooit renderen.
 *
 * Waarom dit bestaat: namespaces laden LAZY, alleen via `useTranslation(ns)`.
 * Een component mag `t('andere-ns:sleutel')` schrijven, maar dat werkt pas als
 * die andere namespace ergens geladen is. Gebeurt dat nergens, dan valt i18next
 * stil terug op de meegegeven `defaultValue` — de Engelse brontekst. Het scherm
 * ziet er dus correct uit terwijl een compleet vertaald bestand nooit gebruikt
 * wordt.
 *
 * Zo waren op 2026-08-18 ZES namespaces onbereikbaar (brand-dna,
 * campaigns-cards, campaigns-content-types, campaigns-pipeline, campaigns-setup,
 * claw-content-registry): 84 aanroepen die voor een Nederlandse gebruiker
 * allemaal Engels bleven. Geen enkele test kon dat zien, want `defaultValue`
 * maskeert het volledig — er is geen foutmelding, geen lege string, niets.
 *
 * SINDS 2026-08-19 toetst hij TWEE dingen:
 *   1. GLOBAAL — wordt elke aangeroepen namespace érgens geladen? Faalt dat, dan
 *      rendert die vertaling nooit. Bewijsbaar kapot.
 *   2. LOKAAL — laadt het bestand dat `t('ns:…')` schrijft die namespace ook zélf?
 *      Zo niet, dan werkt het alléén zolang een ánder scherm al gemount is
 *      geweest. Het gedrag hangt dan af van de volgorde waarin je door de app
 *      klikt: bewijsbaar fragiel, niet altijd kapot — en precies het soort bug
 *      dat in een demo opduikt en in een test nooit.
 *
 * Deze check is bewust statisch (geen DB, geen browser) zodat hij in CI kan.
 *
 * Draaien:
 *   node node_modules/.bin/tsx scripts/smoke-tests/i18n-namespace-reachability.ts
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const SRC = 'src';
const LOCALES_EN = 'src/lib/ui-i18n/locales/en';

/** Namespaces die `createI18n` altijd meebundelt — die hoeven niet geladen te worden. */
const PRELOADED = new Set(['common', 'navigation']);

/**
 * Bestanden die een `TFunction` DOORKRIJGEN in plaats van zelf `useTranslation`
 * aan te roepen (bijv. een helper die vanuit een component wordt aangeroepen).
 * Daar hoort de namespace bij de aanroeper, niet hier — de lokale check zou
 * anders ruis produceren.
 *
 * ⚠️ Leeg, en dat is een meting: op 2026-08-19 bestond er géén enkel zo'n geval.
 * Zet een pad hier pas neer als je hebt vastgesteld dat de aanroeper de
 * namespace laadt — anders verplaats je het probleem in plaats van het op te
 * lossen.
 */
const TFUNCTION_RECIPIENTS = new Set<string>([]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (p.includes('ui-i18n/locales')) continue; // de bronbestanden zelf
      walk(p, out);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

const realNamespaces = new Set(
  readdirSync(LOCALES_EN)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => f.slice(0, -3)),
);

const files = walk(SRC);

/** Namespaces die ergens via useTranslation(...) geladen worden. */
const loaded = new Set<string>(PRELOADED);
/** Namespace → bestanden die er cross-namespace naar verwijzen. */
const referenced = new Map<string, Set<string>>();
/** Bestand → namespaces die het ZELF laadt (voor de lokale check). */
const loadedPerFile = new Map<string, Set<string>>();
/** Bestand → namespaces die het aanroept maar niet zelf laadt. */
const nonLocal = new Map<string, string[]>();

const USE_RE = /useTranslation\(\s*(\[[^\]]*\]|['"][a-z0-9-]+['"])/g;
// Alleen echte t()-aanroepen: `t(` voorafgegaan door een niet-woordteken, zodat
// `format(`/`split(` niet meetellen. Cache-sleutels als `products:${id}` vallen
// af doordat we tegen de echte namespace-bestandsnamen filteren.
const REF_RE = /[^a-zA-Z0-9_]t\(\s*[`'"]([a-z0-9-]+):/g;

for (const file of files) {
  const src = readFileSync(file, 'utf8');

  const here = new Set<string>(PRELOADED);
  for (const m of src.matchAll(USE_RE)) {
    for (const ns of m[1].matchAll(/['"]([a-z0-9-]+)['"]/g)) {
      loaded.add(ns[1]);
      here.add(ns[1]);
    }
  }
  loadedPerFile.set(file, here);

  const refsHere = new Set<string>();
  for (const m of src.matchAll(REF_RE)) {
    const ns = m[1];
    if (!realNamespaces.has(ns)) continue; // geen namespace, dus geen i18n-verwijzing
    if (!referenced.has(ns)) referenced.set(ns, new Set());
    referenced.get(ns)!.add(file);
    refsHere.add(ns);
  }

  // Lokale check: het locale-bronbestand zelf verwijst naar zijn eigen naam en
  // is geen consument — daarom uitgesloten, net als de walk() dat al doet voor
  // de map. TFUNCTION_RECIPIENTS zijn bewust uitgezonderd (zie boven).
  if (TFUNCTION_RECIPIENTS.has(file)) continue;
  const missing = [...refsHere].filter((ns) => !here.has(ns)).sort();
  if (missing.length > 0) nonLocal.set(file, missing);
}

const unreachable = [...referenced.entries()]
  .filter(([ns]) => !loaded.has(ns))
  .sort(([a], [b]) => a.localeCompare(b));

console.log(`\ni18n-namespace-reachability — ${files.length} bestanden gescand`);
console.log(`  namespaces met een locale-bestand : ${realNamespaces.size}`);
console.log(`  ergens geladen via useTranslation : ${loaded.size}`);
console.log(`  cross-namespace aangeroepen       : ${referenced.size}`);
console.log(`  bestanden die niet-lokaal laden   : ${nonLocal.size}`);

/** Deel 2 — de lokale check. */
function reportNonLocal(): void {
  if (nonLocal.size === 0) return;
  console.log('\n✗ NIET-LOKAAL — deze bestanden roepen een namespace aan die ze zelf');
  console.log('  niet laden. Dat werkt alleen zolang een ander scherm die namespace al');
  console.log('  geladen heeft; anders valt de lookup terug op het Engels. Het gedrag');
  console.log('  hangt dus af van de klikvolgorde.');
  console.log('  Fix: zet de namespace in de eigen useTranslation(...), als array en met');
  console.log('  de bestaande namespace VOORAAN (die blijft de default voor kale sleutels).');
  console.log('  Krijgt dit bestand een TFunction door van zijn aanroeper? Zet het dan in');
  console.log('  TFUNCTION_RECIPIENTS bovenin dit script, met de reden erbij.\n');
  for (const [file, missing] of [...nonLocal.entries()].sort()) {
    const own = [...(loadedPerFile.get(file) ?? [])].filter((n) => !PRELOADED.has(n));
    console.log(`  ${file}`);
    console.log(`      laadt niet: ${missing.join(', ')}   (laadt wel: ${own.join(', ') || 'niets'})`);
  }
}

if (unreachable.length === 0 && nonLocal.size === 0) {
  console.log('\n✓ Elke aangeroepen namespace wordt ergens geladen, en lokaal.');
  process.exit(0);
}

if (unreachable.length === 0) {
  console.log('\n✓ Elke aangeroepen namespace wordt ergens geladen.');
  reportNonLocal();
  process.exit(1);
}

console.log('\n✗ ONBEREIKBAAR — deze namespaces worden aangeroepen maar nergens geladen.');
console.log('  Hun vertalingen renderen NOOIT; i18next valt terug op de defaultValue.');
console.log('  Fix: voeg de namespace toe aan de useTranslation(...) van het aanroepende');
console.log('  component — als array, met de bestaande namespace vóóraan (die blijft de');
console.log('  default voor kale sleutels).\n');
for (const [ns, where] of unreachable) {
  console.log(`  ${ns}`);
  for (const f of [...where].sort()) console.log(`      ${f}`);
}
reportNonLocal();
process.exit(1);
