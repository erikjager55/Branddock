/**
 * Phase 7 — Backfill ContentVersion diff-tracking velden.
 *
 * Scans alle ContentVersion-records met `diffFromPrevious IS NULL` en een
 * voorgaande versie (zelfde deliverableId, lagere versionNumber).
 * Per record:
 *  1. Load previous + current contentSnapshot
 *  2. Compute structured diff via `buildDiff()`
 *  3. Compute aggregate `diffSummary` (charsAdded, charsRemoved, etc.)
 *  4. Auto-classify `editType` via heuristische `classifyEdit()`
 *  5. Persist diffFromPrevious + diffSummary + editType
 *
 * Idempotent: records met `diffFromPrevious IS NOT NULL` worden geskipt.
 * Veilig her-runnen.
 *
 * Niet-blokkerend: deze backfill heeft geen runtime-effect — het is puur
 * historische data-verrijking voor leerlus-analyses.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." \
 *     npx tsx prisma/scripts/backfill-content-version-diffs.ts
 *
 * Optionele env vars:
 *   BACKFILL_LIMIT=100     # max aantal records per run (default: 1000)
 *   BACKFILL_WORKSPACE_ID  # beperk tot één workspace (default: alle)
 *   BACKFILL_DRY_RUN=1     # toon counts zonder DB-writes
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

import { buildDiff } from "../../src/lib/learning-loop/diff-builder";
import { classifyEdit } from "../../src/lib/learning-loop/edit-classifier";

const LIMIT = Number(process.env.BACKFILL_LIMIT ?? "1000");
const WORKSPACE_ID = process.env.BACKFILL_WORKSPACE_ID ?? null;
const DRY_RUN = process.env.BACKFILL_DRY_RUN === "1";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL is required");
    process.exit(1);
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log("=".repeat(60));
  console.log("ContentVersion diff backfill");
  console.log("=".repeat(60));
  console.log(`Limit:        ${LIMIT}`);
  console.log(`Workspace:    ${WORKSPACE_ID ?? "(all)"}`);
  console.log(`Dry run:      ${DRY_RUN ? "yes" : "no"}`);
  console.log("");

  // Find versions to backfill: no diffFromPrevious AND not the first version.
  const candidates = await prisma.contentVersion.findMany({
    where: {
      diffFromPrevious: { equals: Prisma.JsonNull },
      versionNumber: { gt: 1 },
      ...(WORKSPACE_ID
        ? { deliverable: { campaign: { workspaceId: WORKSPACE_ID } } }
        : {}),
    },
    include: {
      deliverable: { select: { contentType: true } },
    },
    orderBy: [{ deliverableId: "asc" }, { versionNumber: "asc" }],
    take: LIMIT,
  });

  console.log(`Found ${candidates.length} candidate(s) to backfill`);
  console.log("");

  if (candidates.length === 0) {
    console.log("Nothing to do.");
    await prisma.$disconnect();
    return;
  }

  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const current of candidates) {
    try {
      // Find immediate previous version
      const previous = await prisma.contentVersion.findFirst({
        where: {
          deliverableId: current.deliverableId,
          versionNumber: { lt: current.versionNumber },
        },
        orderBy: { versionNumber: "desc" },
        select: { contentSnapshot: true },
      });

      if (!previous) {
        skipped++;
        console.log(
          `[skip] version ${current.id} (v${current.versionNumber}): no previous version`,
        );
        continue;
      }

      const beforeText = serializeSnapshot(previous.contentSnapshot);
      const afterText = serializeSnapshot(current.contentSnapshot);

      if (!beforeText || !afterText) {
        skipped++;
        console.log(
          `[skip] version ${current.id}: empty snapshot (before=${beforeText.length}, after=${afterText.length})`,
        );
        continue;
      }

      const diff = buildDiff(
        beforeText,
        afterText,
        current.deliverable.contentType,
      );
      const editType = classifyEdit(diff.summary);

      if (DRY_RUN) {
        console.log(
          `[dry] version ${current.id} (v${current.versionNumber}): ` +
            `${diff.summary.percentChanged}% changed, ` +
            `+${diff.summary.charsAdded}/-${diff.summary.charsRemoved}, ` +
            `editType=${editType ?? "uncategorized"}`,
        );
        succeeded++;
        continue;
      }

      await prisma.contentVersion.update({
        where: { id: current.id },
        data: {
          diffFromPrevious: { entries: diff.entries } as object,
          diffSummary: diff.summary as object,
          editType,
        },
      });

      succeeded++;
      console.log(
        `[ok]   version ${current.id}: editType=${editType ?? "—"}, ` +
          `${diff.summary.percentChanged}% changed`,
      );
    } catch (err) {
      failed++;
      console.error(
        `[fail] version ${current.id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  console.log("");
  console.log("=".repeat(60));
  console.log(`Done. succeeded=${succeeded} skipped=${skipped} failed=${failed}`);
  console.log("=".repeat(60));

  await prisma.$disconnect();
}

/**
 * Extract plain-text from a contentSnapshot Json blob. Handles common shapes:
 * - String (returned as-is)
 * - { text: ... } | { content: ... } | { html: ... } | { markdown: ... }
 * - Fallback: concatenate string values
 */
function serializeSnapshot(snapshot: unknown): string {
  if (!snapshot) return "";
  if (typeof snapshot === "string") return snapshot;
  if (typeof snapshot !== "object") return "";

  const obj = snapshot as Record<string, unknown>;
  if (typeof obj.text === "string") return obj.text;
  if (typeof obj.content === "string") return obj.content;
  if (typeof obj.markdown === "string") return obj.markdown;
  if (typeof obj.html === "string") return obj.html.replace(/<[^>]+>/g, "");

  return Object.values(obj)
    .filter((v): v is string => typeof v === "string")
    .join("\n\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
