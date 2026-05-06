/**
 * scripts/fidelity/validate-all-criteria.ts
 *
 * Resolves the fidelity-config for every deliverable type defined in
 * `src/features/campaigns/lib/deliverable-types.ts` and runs the
 * `validateFidelityConfig` checker. Prints per-type pass/fail and a
 * summary verdict.
 *
 * Acceptance:
 *   - Every type resolves without error
 *   - Every config has exactly 3 pillars + 6 criteria
 *   - Pillar weights sum to 1.0 ± 0.001
 *   - Criterion weights within each pillar sum to 1.0 ± 0.001
 *   - Composite thresholds in [0, 100]
 *
 * Run:
 *   npx tsx scripts/fidelity/validate-all-criteria.ts
 *
 * No DB / API access — pure config validation.
 */

import {
  getFidelityConfig,
  validateFidelityConfig,
  KNOWN_CRITERION_KEYS,
} from '../../src/features/campaigns/lib/fidelity-criteria';
import { DELIVERABLE_TYPES } from '../../src/features/campaigns/lib/deliverable-types';

interface RowResult {
  contentTypeId: string;
  category: string;
  errors: string[];
  pillarWeights: string;
  criteriaCount: number;
  unknownCriteria: string[];
}

function summarizeWeights(config: ReturnType<typeof getFidelityConfig>): string {
  return config.pillars.map((p) => `${p.key}=${p.weight.toFixed(2)}`).join(' / ');
}

function main() {
  console.log('━━━ Validate fidelity-criteria for all 53 content types ━━━\n');

  const totalTypes = DELIVERABLE_TYPES.length;
  console.log(`Loaded ${totalTypes} content types from deliverable-types.ts\n`);

  const results: RowResult[] = [];
  const knownKeySet = new Set<string>(KNOWN_CRITERION_KEYS);

  for (const type of DELIVERABLE_TYPES) {
    const config = getFidelityConfig(type.id);
    const errors = validateFidelityConfig(config);

    const unknownCriteria = config.criteria
      .map((c) => c.key)
      .filter((k) => !knownKeySet.has(k));

    results.push({
      contentTypeId: type.id,
      category: type.category,
      errors,
      pillarWeights: summarizeWeights(config),
      criteriaCount: config.criteria.length,
      unknownCriteria,
    });
  }

  // Per-category summary
  const byCategory = new Map<string, RowResult[]>();
  for (const r of results) {
    if (!byCategory.has(r.category)) byCategory.set(r.category, []);
    byCategory.get(r.category)!.push(r);
  }

  console.log('Per category:');
  for (const [cat, rows] of [...byCategory.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const failing = rows.filter((r) => r.errors.length > 0).length;
    const sym = failing === 0 ? '✓' : '✗';
    console.log(`  ${sym} ${cat.padEnd(34)} ${rows.length} types, ${failing} failing`);
  }
  console.log();

  // Detail rows
  const failures = results.filter((r) => r.errors.length > 0);
  if (failures.length > 0) {
    console.log('Failures:');
    for (const r of failures) {
      console.log(`  ✗ ${r.contentTypeId} (${r.category})`);
      for (const e of r.errors) {
        console.log(`     - ${e}`);
      }
    }
    console.log();
  }

  // Unknown criteria check
  const unknownRows = results.filter((r) => r.unknownCriteria.length > 0);
  if (unknownRows.length > 0) {
    console.log('Types using criterion keys not in KNOWN_CRITERION_KEYS:');
    for (const r of unknownRows) {
      console.log(`  ⚠ ${r.contentTypeId}: ${r.unknownCriteria.join(', ')}`);
    }
    console.log();
  }

  // Distribution
  const byPillarWeights = new Map<string, number>();
  for (const r of results) {
    byPillarWeights.set(r.pillarWeights, (byPillarWeights.get(r.pillarWeights) ?? 0) + 1);
  }
  console.log('Pillar weight distribution (config × #types):');
  const sorted = [...byPillarWeights.entries()].sort((a, b) => b[1] - a[1]);
  for (const [weights, count] of sorted) {
    console.log(`  ${count.toString().padStart(3)} × ${weights}`);
  }
  console.log();

  // Verdict
  const totalErrors = failures.length;
  const totalUnknown = unknownRows.length;
  if (totalErrors === 0 && totalUnknown === 0) {
    console.log('━━━ PASS — all 53 content types resolve to valid configs ━━━');
    process.exit(0);
  } else {
    console.log(
      `━━━ FAIL — ${totalErrors} configs invalid, ${totalUnknown} use unknown criteria ━━━`,
    );
    process.exit(1);
  }
}

main();
