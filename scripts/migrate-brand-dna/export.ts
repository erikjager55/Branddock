/**
 * Merk-DNA EXPORT — leest de brand-DNA-set van één workspace uit de LOKALE DB
 * en schrijft een inspecteerbare JSON-bundle. Raakt productie niet.
 *
 * Run (tegen lokale DATABASE_URL uit .env.local):
 *   npx tsx scripts/migrate-brand-dna/export.ts "Better Brands" [out.json]
 *
 * Zie scripts/migrate-brand-dna/README.md voor de volledige runbook.
 */
import './load-env';
import { Prisma } from '@prisma/client';
import { prisma } from '../../src/lib/prisma';
import { BRAND_DNA_MODELS, BrandDnaModel, delegateFor } from './models';
import { BrandDnaBundle, collectLocalImageRefs, saveBundle } from './bundle';

/** Bouw de where-clause voor een model; null = niets te exporteren. */
function scopeWhere(
  model: BrandDnaModel,
  workspaceId: string,
  idsByAccessor: Record<string, string[]>,
): Record<string, unknown> | null {
  if (model.scope.kind === 'workspace') return { workspaceId };
  const parentIds = idsByAccessor[model.scope.parentAccessor] ?? [];
  if (parentIds.length === 0) return null;
  return { [model.scope.foreignKey]: { in: parentIds } };
}

/** Exporteer pgvector-kolommen via raw SQL (::text). */
async function exportVectors(
  model: BrandDnaModel,
  ids: string[],
): Promise<Record<string, Record<string, string>>> {
  const result: Record<string, Record<string, string>> = {};
  for (const col of model.vectorColumns ?? []) {
    const rows = await prisma.$queryRaw<{ id: string; v: string | null }[]>(Prisma.sql`
      SELECT "id"::text AS id, ${Prisma.raw(`"${col}"`)}::text AS v
      FROM ${Prisma.raw(`"${model.table}"`)}
      WHERE "id" IN (${Prisma.join(ids)})
    `);
    const map: Record<string, string> = {};
    for (const row of rows) if (row.v) map[row.id] = row.v;
    result[col] = map;
  }
  return result;
}

async function main(): Promise<void> {
  const nameArg = process.argv[2];
  const outArg = process.argv[3];
  if (!nameArg) {
    console.error('Usage: export.ts "<workspace-naam-bevat>" [out.json]');
    process.exit(1);
  }

  const ws = await prisma.workspace.findFirst({
    where: { name: { contains: nameArg, mode: 'insensitive' } },
    select: { id: true, name: true, slug: true },
  });
  if (!ws) {
    console.error(`Workspace met '${nameArg}' niet gevonden.`);
    process.exit(1);
  }
  console.log(`[export] workspace=${ws.id} (${ws.name})`);

  const records: BrandDnaBundle['records'] = {};
  const vectors: BrandDnaBundle['vectors'] = {};
  const idsByAccessor: Record<string, string[]> = {};
  const imageRefs = new Set<string>();

  for (const model of BRAND_DNA_MODELS) {
    const where = scopeWhere(model, ws.id, idsByAccessor);
    if (where === null) {
      records[model.accessor] = [];
      idsByAccessor[model.accessor] = [];
      continue;
    }
    const rows = await delegateFor(prisma, model.accessor).findMany({ where });
    records[model.accessor] = rows;
    idsByAccessor[model.accessor] = rows.map((r) => String(r.id));
    for (const row of rows) collectLocalImageRefs(row, imageRefs);
    if (model.vectorColumns?.length && rows.length > 0) {
      vectors[model.accessor] = await exportVectors(model, idsByAccessor[model.accessor]);
    }
    console.log(`[export] ${model.label}: ${rows.length}`);
  }

  const bundle: BrandDnaBundle = {
    meta: {
      version: 1,
      sourceWorkspaceId: ws.id,
      sourceWorkspaceName: ws.name,
      sourceSlug: ws.slug,
      note: 'Merk-DNA-export (alleen brand foundation; geen content/telemetrie/historie).',
    },
    records,
    vectors,
    localImageRefs: [...imageRefs].sort(),
  };

  const outPath = outArg ?? `brand-dna-${ws.slug}.json`;
  saveBundle(outPath, bundle);
  const totalRows = Object.values(records).reduce((n, r) => n + r.length, 0);
  console.log(`\n[export] ${totalRows} rijen → ${outPath}`);
  console.log(`[export] lokale beeld-referenties: ${imageRefs.size} (draai upload-images vóór import)`);
}

main()
  .catch((err) => {
    console.error('[export] Crashed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
