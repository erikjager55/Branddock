/**
 * Smoke-test voor Brandclaw data-foundation (Fase 1).
 *
 * Verifieert:
 *   1. Time-window primitives produceren correcte Prisma where-clauses
 *   2. DataSource registry lookup werkt + isolation per source-type
 *   3. AlignmentScanSource query op een lege workspace returnt 0 rows
 *      zonder errors (geen DataSnapshots gecreeerd)
 *
 * Run: DATABASE_URL="postgresql://..." npx tsx scripts/smoke-tests/brandclaw-data-foundation.ts
 */

import { sinceNDaysAgo, between, sinceVersion, allTime } from "../../src/lib/brandclaw/time-window";
import { getDataSourceRegistry } from "../../src/lib/brandclaw/data-sources";

let pass = 0;
let fail = 0;

function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) {
    console.log(`  PASS ${name}`);
    pass++;
  } else {
    console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ""}`);
    fail++;
  }
}

async function main() {
  console.log("\n=== Brandclaw data-foundation smoke ===\n");

  // ─ Time-window primitives ─
  console.log("## Time-window primitives\n");

  const last30 = sinceNDaysAgo(30);
  assert(
    "sinceNDaysAgo(30) label",
    last30.label === "last-30-days",
  );
  const where30 = last30.toWhere("createdAt");
  assert(
    "sinceNDaysAgo(30) produces gte clause",
    !!where30.createdAt?.gte && where30.createdAt.gte instanceof Date,
  );
  assert(
    "sinceNDaysAgo(30) from-date ~30 days ago",
    Math.abs(Date.now() - (last30.fromDate()?.getTime() ?? 0) - 30 * 24 * 3600 * 1000) < 60 * 1000,
  );

  const today = sinceNDaysAgo(0);
  assert(
    "sinceNDaysAgo(0) sets time to start-of-day",
    today.fromDate()?.getHours() === 0 && today.fromDate()?.getMinutes() === 0,
  );

  try {
    sinceNDaysAgo(-1);
    assert("sinceNDaysAgo(-1) throws", false, "did not throw");
  } catch {
    assert("sinceNDaysAgo(-1) throws", true);
  }

  const from = new Date("2026-01-01T00:00:00Z");
  const to = new Date("2026-02-01T00:00:00Z");
  const win = between(from, to);
  assert("between produces gte+lte", !!win.toWhere("scoredAt").scoredAt?.gte && !!win.toWhere("scoredAt").scoredAt?.lte);

  try {
    between(to, from);
    assert("between(later, earlier) throws", false, "did not throw");
  } catch {
    assert("between(later, earlier) throws", true);
  }

  const verWin = sinceVersion(new Date("2026-03-01T12:00:00Z"));
  assert("sinceVersion label format", verWin.label.startsWith("since-version-"));

  const all = allTime();
  assert("allTime cap is ~5 years back", !!all.fromDate() && Date.now() - all.fromDate()!.getTime() > 4 * 365 * 24 * 3600 * 1000);

  // ─ DataSource registry ─
  console.log("\n## DataSource registry\n");

  const registry = await getDataSourceRegistry();
  const types = registry.listSourceTypes();
  for (const expected of ["alignment_scan", "content_fidelity", "review_log", "voiceguide"] as const) {
    assert(
      `v1 registry has ${expected} registered`,
      types.includes(expected),
      `got: [${types.join(", ")}]`,
    );
  }

  // ─ All 4 sources query op fictieve workspace ─
  console.log("\n## Source queries (empty workspace)\n");

  const window = sinceNDaysAgo(30);
  const fakeWorkspace = "smoke-test-nonexistent-workspace";

  for (const sourceType of ["alignment_scan", "content_fidelity", "review_log", "voiceguide"] as const) {
    const source = registry.getSource(sourceType);
    const result = await source.query({ workspaceId: fakeWorkspace, window });
    assert(`${sourceType}: empty workspace returns 0 rows`, result.rows.length === 0);
    assert(`${sourceType}: empty workspace returns 0 snapshotIds`, result.snapshotIds.length === 0);
    assert(`${sourceType}: meta.sourceType correct`, result.meta.sourceType === sourceType);
    assert(`${sourceType}: meta.windowLabel reflects input`, result.meta.windowLabel === "last-30-days");
  }

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
