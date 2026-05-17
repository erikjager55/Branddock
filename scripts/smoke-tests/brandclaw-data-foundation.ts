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
  assert(
    "v1 registry has alignment_scan registered",
    types.includes("alignment_scan"),
    `got: [${types.join(", ")}]`,
  );

  const source = registry.getSource("alignment_scan");
  assert("getSource('alignment_scan') returns accessor", source.sourceType === "alignment_scan");

  try {
    registry.getSource("review_log");
    assert("getSource('review_log') throws (not registered v1)", false, "did not throw");
  } catch (err) {
    assert(
      "getSource('review_log') throws (not registered v1)",
      err instanceof Error && err.message.includes("no accessor"),
    );
  }

  // ─ AlignmentScanSource query op fictieve workspace ─
  console.log("\n## AlignmentScanSource query (empty workspace)\n");

  const result = await source.query({
    workspaceId: "smoke-test-nonexistent-workspace",
    window: sinceNDaysAgo(30),
  });
  assert("empty workspace returns 0 rows", result.rows.length === 0);
  assert("empty workspace returns 0 snapshotIds", result.snapshotIds.length === 0);
  assert("meta.sourceType correct", result.meta.sourceType === "alignment_scan");
  assert("meta.windowLabel reflects input", result.meta.windowLabel === "last-30-days");

  console.log(`\n=== RESULT: ${pass} pass, ${fail} fail ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Smoke test crashed:", err);
  process.exit(1);
});
