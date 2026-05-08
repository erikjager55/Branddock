/**
 * scripts/heuristics/smoke-all-locales.ts
 *
 * Δ-2 sub-cluster B-2 / B-3 / B-4 — smoke for the 4 locale-packages.
 * Pure unit-test: validates registry-load + per-locale sample-term
 * detection + nl-BE whitelist behavior. No DB, no AI.
 *
 * Run: `npx tsx scripts/heuristics/smoke-all-locales.ts`
 */

import { getHeuristicsForLocale } from '@/lib/brand-fidelity/heuristics';
import type { HeuristicEntry, HeuristicPackage } from '@/lib/brand-fidelity/heuristics/types';

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

function hasTerm(pkg: HeuristicPackage | null, term: string): boolean {
  if (!pkg) return false;
  for (const cat of Object.values(pkg.categories)) {
    if (!cat) continue;
    if ((cat as HeuristicEntry[]).some((e) => e.term.toLowerCase() === term.toLowerCase())) return true;
  }
  return false;
}

function termsInCategory(pkg: HeuristicPackage | null, category: string): number {
  if (!pkg) return 0;
  const entries = (pkg.categories as Record<string, HeuristicEntry[] | undefined>)[category];
  return entries?.length ?? 0;
}

console.log('\n=== heuristics all-locales smoke ===\n');

// ── Registry coverage ──
console.log('## Registry coverage (all 4 v1 locales)\n');
const nlNL = getHeuristicsForLocale('nl-NL');
const enGB = getHeuristicsForLocale('en-GB');
const nlBE = getHeuristicsForLocale('nl-BE');
const deDE = getHeuristicsForLocale('de-DE');

assert('nl-NL package loads', nlNL !== null);
assert('en-GB package loads', enGB !== null);
assert('nl-BE package loads', nlBE !== null);
assert('de-DE package loads', deDE !== null);

// ── en-GB checks ──
console.log('\n## en-GB sample terms\n');
assert('en-GB has corporate-fluff entries', termsInCategory(enGB, 'corporate-fluff') >= 20);
assert('en-GB has ai-tells category (EN-only)', termsInCategory(enGB, 'ai-tells') >= 20);
assert('en-GB detects "delve" (classic AI-tell)', hasTerm(enGB, 'delve'));
assert('en-GB detects "tapestry"', hasTerm(enGB, 'tapestry'));
assert('en-GB detects "utilize" (Plain English)', hasTerm(enGB, 'utilize'));
assert('en-GB detects "leverage"', hasTerm(enGB, 'leverage'));
assert('en-GB detects "synergy"', hasTerm(enGB, 'synergy'));
assert('en-GB has fillers ("very", "really")', hasTerm(enGB, 'very') && hasTerm(enGB, 'really'));

// ── nl-BE checks ──
console.log('\n## nl-BE inheritance + whitelist + extras\n');
const NL_BE_WHITELIST = ['job', 'onthaal', 'verlof', 'dossier', 'kinesist', 'kader'];
const NL_NL_FLUFF_SAMPLE = ['stakeholder', 'leverage', 'synergie', 'ontzorgen']; // should still be flagged in BE

for (const term of NL_BE_WHITELIST) {
  // nl-NL might not have all of these; we only check that whitelist is honored
  const inNL = hasTerm(nlNL, term);
  const inBE = hasTerm(nlBE, term);
  assert(
    `nl-BE filters whitelisted "${term}" (was in nl-NL: ${inNL}; now in nl-BE: ${inBE})`,
    !inBE,
  );
}

for (const term of NL_NL_FLUFF_SAMPLE) {
  if (hasTerm(nlNL, term)) {
    assert(`nl-BE inherits non-whitelisted "${term}" from nl-NL`, hasTerm(nlBE, term));
  }
}

// BE-extras
assert('nl-BE has BE-specific "familiale sfeer"', hasTerm(nlBE, 'familiale sfeer'));
assert('nl-BE has BE-specific "marktconform salaris"', hasTerm(nlBE, 'marktconform salaris'));
assert('nl-BE has BE-intensifier "straf"', hasTerm(nlBE, 'straf'));
assert('nl-BE has BE-intensifier "machtig"', hasTerm(nlBE, 'machtig'));

// ── de-DE checks ──
console.log('\n## de-DE sample terms\n');
assert('de-DE has corporate-fluff entries', termsInCategory(deDE, 'corporate-fluff') >= 20);
assert('de-DE detects "Synergie"', hasTerm(deDE, 'Synergie'));
assert('de-DE detects "ganzheitlich"', hasTerm(deDE, 'ganzheitlich'));
assert('de-DE detects "kompetent" (vacature-cliché)', hasTerm(deDE, 'kompetent'));

// Denglisch (concat in corporate-fluff per index.ts comment)
assert('de-DE detects Denglisch "Mindset"', hasTerm(deDE, 'Mindset'));
assert('de-DE detects Denglisch "Kickoff"', hasTerm(deDE, 'Kickoff'));
assert('de-DE detects Denglisch "leveragen"', hasTerm(deDE, 'leveragen'));
assert('de-DE detects Denglisch "Stakeholder"', hasTerm(deDE, 'Stakeholder'));

// Superlatives
assert('de-DE detects "weltweit führend"', hasTerm(deDE, 'weltweit führend'));
assert('de-DE detects "innovativ"', hasTerm(deDE, 'innovativ'));

// Risky comparatives
assert('de-DE detects "besser"', hasTerm(deDE, 'besser'));
assert('de-DE detects "schneller"', hasTerm(deDE, 'schneller'));

// Fillers
assert('de-DE detects "eigentlich"', hasTerm(deDE, 'eigentlich'));
assert('de-DE detects "irgendwie"', hasTerm(deDE, 'irgendwie'));

// ── Cross-locale isolation ──
console.log('\n## Cross-locale isolation\n');
assert('en-GB does NOT contain "ontzorgen" (NL-only term)', !hasTerm(enGB, 'ontzorgen'));
assert('nl-NL does NOT contain "delve" (EN AI-tell)', !hasTerm(nlNL, 'delve'));
assert('de-DE does NOT contain "ontzorgen" (NL-only term)', !hasTerm(deDE, 'ontzorgen'));
assert('en-GB does NOT contain "kruisbestuiving" (NL-only)', !hasTerm(enGB, 'kruisbestuiving'));
assert('nl-NL does NOT contain "ai-tells" category (EN-only)', termsInCategory(nlNL, 'ai-tells') === 0);
assert('de-DE does NOT contain "ai-tells" category (EN-only)', termsInCategory(deDE, 'ai-tells') === 0);

// ── All packages frozen (Object.freeze) ──
console.log('\n## Hard-switch frozen packages\n');
assert('nl-NL package is frozen', Object.isFrozen(nlNL));
assert('en-GB package is frozen', Object.isFrozen(enGB));
assert('nl-BE package is frozen', Object.isFrozen(nlBE));
assert('de-DE package is frozen', Object.isFrozen(deDE));

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
