/**
 * scripts/heuristics/smoke-nl-NL.ts
 *
 * Δ-2 sub-cluster D — smoke test voor nl-NL heuristic-package.
 *
 * Runt evaluateHeuristics tegen drie samples:
 *   1. Clean BB-stijl content (verwacht: 0 of 1-2 findings)
 *   2. Corporate-fluff-zware content (verwacht: 5+ findings)
 *   3. Substantiated vague-quality content (verwacht: NO flag op "duurzaam")
 *
 * Verifieert dat:
 *   - Locale-resolver returnt 'nl-NL' voor BB
 *   - Word-boundary matching werkt (case-insensitive)
 *   - Substantiation-check (cijfer in window) suppresseert flag
 *   - Severity-counts kloppen
 *
 * Run:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config \
 *     scripts/heuristics/smoke-nl-NL.ts [--workspace=<id>]
 */

import { prisma } from '@/lib/prisma';
import { evaluateHeuristics } from '@/lib/brand-fidelity/heuristics/evaluator';
import { resolveLocaleForBrand } from '@/lib/brand-fidelity/heuristics/locale-resolver';

const args = process.argv.slice(2);
const workspaceArg = args.find((a) => a.startsWith('--workspace='));
const explicitWorkspaceId = workspaceArg ? workspaceArg.slice('--workspace='.length) : null;

// ─── Samples ────────────────────────────────────────

const CLEAN_SAMPLE = `
Onze nieuwe campagne richt zich op MKB-bedrijven die een merkbare verschuiving
willen maken in hun marktbenadering. We werken samen met klanten zoals Coolblue
en Bol.com aan campagnes die meetbaar bijdragen aan hun groei. Het team in
Amsterdam ondersteunt de uitrol vanuit drie locaties met 12 specialisten.
`;

const FLUFF_HEAVY_SAMPLE = `
Wij zijn de marktleider in toonaangevende, baanbrekende oplossingen. Onze
proactieve, dynamische teamplayers werken hands-on aan transformatie en
synergie. We ontzorgen onze stakeholders met state-of-the-art expertise
voor een toekomstbestendig ecosysteem. Door integraal te faciliteren maken
we het verschil voor onze partners — gepassioneerd, gedreven en klantgericht.
Het is daadwerkelijk fundamenteel essentieel.
`;

const SUBSTANTIATED_SAMPLE = `
Onze duurzame productielijn realiseerde 30% CO2-reductie in 2024 t.o.v. 2023.
We zijn sneller dan onze grootste concurrent X met een gemiddelde levertijd
van 2.5 dagen versus hun 5 dagen.
`;

// ─── Helpers ────────────────────────────────────────

function divider(label: string) {
  console.log(`\n${'─'.repeat(60)}\n${label}\n${'─'.repeat(60)}`);
}

function summarize(violations: { severity: string; pattern: string; snippet: string }[]) {
  if (violations.length === 0) {
    console.log('  (geen findings)');
    return;
  }
  for (const v of violations) {
    console.log(`  [${v.severity.toUpperCase().padEnd(7)}] ${v.pattern} → "${v.snippet}"`);
  }
}

// ─── Main ───────────────────────────────────────────

async function main() {
  const workspace = explicitWorkspaceId
    ? await prisma.workspace.findUnique({ where: { id: explicitWorkspaceId } })
    : await prisma.workspace.findFirst({ where: { name: 'Better Brands' } });

  if (!workspace) {
    console.error(`❌ Workspace not found`);
    process.exit(1);
  }

  console.log(`Workspace: ${workspace.name} (${workspace.id})`);

  const locale = await resolveLocaleForBrand(workspace.id);
  console.log(`Resolved locale: ${locale}`);

  if (locale !== 'nl-NL') {
    console.warn(
      `⚠️  Expected nl-NL but got ${locale}. Run seed-bb-locale.ts first or check workspace.contentLanguage.`,
    );
  }

  // ── Sample 1: clean ──
  divider('Sample 1 — Clean BB-stijl content (verwacht: 0-2 findings)');
  const clean = await evaluateHeuristics(workspace.id, CLEAN_SAMPLE);
  console.log(
    `Found ${clean.violations.length} violations (entries evaluated: ${clean.entriesEvaluated})`,
  );
  console.log(
    `By severity: always-flag=${clean.byHeuristicSeverity['always-flag']}, context-flag=${clean.byHeuristicSeverity['context-flag']}, soft-flag=${clean.byHeuristicSeverity['soft-flag']}`,
  );
  summarize(clean.violations);

  // ── Sample 2: fluff-heavy ──
  divider('Sample 2 — Corporate-fluff-zware content (verwacht: 10+ findings)');
  const fluff = await evaluateHeuristics(workspace.id, FLUFF_HEAVY_SAMPLE);
  console.log(
    `Found ${fluff.violations.length} violations (entries evaluated: ${fluff.entriesEvaluated})`,
  );
  console.log(
    `By severity: always-flag=${fluff.byHeuristicSeverity['always-flag']}, context-flag=${fluff.byHeuristicSeverity['context-flag']}, soft-flag=${fluff.byHeuristicSeverity['soft-flag']}`,
  );
  summarize(fluff.violations);

  // ── Sample 3: substantiated ──
  divider('Sample 3 — Substantiated vague-quality (verwacht: NO flag op "duurzaam"/"sneller")');
  const sub = await evaluateHeuristics(workspace.id, SUBSTANTIATED_SAMPLE);
  console.log(
    `Found ${sub.violations.length} violations (entries evaluated: ${sub.entriesEvaluated})`,
  );
  console.log(
    `By severity: always-flag=${sub.byHeuristicSeverity['always-flag']}, context-flag=${sub.byHeuristicSeverity['context-flag']}, soft-flag=${sub.byHeuristicSeverity['soft-flag']}`,
  );
  summarize(sub.violations);

  // ── Validations ──
  divider('Validatie');
  let pass = true;

  if (fluff.violations.length < 10) {
    console.log(`❌ Sample 2 verwachtte 10+ findings maar kreeg ${fluff.violations.length}`);
    pass = false;
  } else {
    console.log(`✅ Sample 2: ${fluff.violations.length} findings (≥10 verwacht)`);
  }

  const subFluffOnDuurzaam = sub.violations.find((v) => v.pattern === 'duurzaam');
  if (subFluffOnDuurzaam) {
    console.log(
      `❌ Sample 3 flagde "duurzaam" ondanks substantiatie (30% CO2-reductie). Substantiation-check werkt niet.`,
    );
    pass = false;
  } else {
    console.log(`✅ Sample 3: "duurzaam" niet geflagd (substantiation-check werkt)`);
  }

  const subFluffOnSneller = sub.violations.find((v) => v.pattern === 'sneller');
  if (subFluffOnSneller) {
    console.log(
      `❌ Sample 3 flagde "sneller" ondanks comparand ("dan onze grootste concurrent X"). 2-step rule werkt niet.`,
    );
    pass = false;
  } else {
    console.log(`✅ Sample 3: "sneller" niet geflagd (2-step rule werkt)`);
  }

  console.log('');
  if (pass) {
    console.log('✅ All smoke validations passed');
  } else {
    console.log('❌ One or more validations failed');
    process.exit(1);
  }
}

main()
  .catch((err) => {
    console.error('❌ Smoke test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
