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

const USE_RE = /useTranslation\(\s*(\[[^\]]*\]|['"][a-z0-9-]+['"])/g;
// Alleen echte t()-aanroepen: `t(` voorafgegaan door een niet-woordteken, zodat
// `format(`/`split(` niet meetellen. Cache-sleutels als `products:${id}` vallen
// af doordat we tegen de echte namespace-bestandsnamen filteren.
const REF_RE = /[^a-zA-Z0-9_]t\(\s*[`'"]([a-z0-9-]+):/g;

for (const file of files) {
  const src = readFileSync(file, 'utf8');

  for (const m of src.matchAll(USE_RE)) {
    for (const ns of m[1].matchAll(/['"]([a-z0-9-]+)['"]/g)) loaded.add(ns[1]);
  }
  for (const m of src.matchAll(REF_RE)) {
    const ns = m[1];
    if (!realNamespaces.has(ns)) continue; // geen namespace, dus geen i18n-verwijzing
    if (!referenced.has(ns)) referenced.set(ns, new Set());
    referenced.get(ns)!.add(file);
  }
}

const unreachable = [...referenced.entries()]
  .filter(([ns]) => !loaded.has(ns))
  .sort(([a], [b]) => a.localeCompare(b));

console.log(`\ni18n-namespace-reachability — ${files.length} bestanden gescand`);
console.log(`  namespaces met een locale-bestand : ${realNamespaces.size}`);
console.log(`  ergens geladen via useTranslation : ${loaded.size}`);
console.log(`  cross-namespace aangeroepen       : ${referenced.size}`);

if (unreachable.length === 0) {
  console.log('\n✓ Elke aangeroepen namespace wordt ergens geladen.');
  process.exit(0);
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
process.exit(1);
