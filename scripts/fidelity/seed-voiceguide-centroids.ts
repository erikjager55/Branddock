/**
 * scripts/fidelity/seed-voiceguide-centroids.ts
 *
 * Seeds BrandVoiceguide.centroidEmbedding for any voiceguide that has
 * writingSamples but no centroid yet. Mirrors the production logic in
 * /api/brandvoiceguide/recompute-centroid but runs server-side for
 * batch initialization.
 *
 * Required so the W-1-full Pillar 1 regression test has data to work
 * against — without a centroid the algo switch is a no-op.
 *
 * Cost: 1 OpenAI text-embedding-3-small call per writingSample
 * (~$0.0001 each at typical sample length).
 *
 * Run:
 *   DOTENV_CONFIG_PATH=.env.local npx tsx -r dotenv/config \
 *     scripts/fidelity/seed-voiceguide-centroids.ts [--force]
 *
 * --force: re-seed even when centroid already exists (default: skip).
 */

import OpenAI from 'openai';

const args = process.argv.slice(2);
const force = args.includes('--force');

const EMBED_MODEL = 'text-embedding-3-small';
const SAMPLE_CHAR_LIMIT = 8000;

interface VoiceguideRow {
  id: string;
  workspaceId: string;
  writingSamples: unknown;
  hasCentroid: boolean;
}

async function main() {
  console.log('━━━ BrandVoiceguide centroid seeding ━━━\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('  ✗ OPENAI_API_KEY missing');
    process.exit(2);
  }

  const { prisma } = await import('../../src/lib/prisma');

  // Fetch all voiceguides + check centroid presence via raw SQL
  type Row = {
    id: string;
    workspaceId: string;
    writingSamples: unknown;
    has_centroid: boolean;
  };
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT
      bvg.id,
      bvg."workspaceId",
      bvg."writingSamples",
      (bvg."centroidEmbedding" IS NOT NULL) AS has_centroid
    FROM "BrandVoiceguide" bvg
  `;

  type WsName = { id: string; name: string };
  const wsRows = await prisma.$queryRaw<WsName[]>`
    SELECT id, name FROM "Workspace"
  `;
  const wsName = new Map<string, string>();
  for (const w of wsRows) wsName.set(w.id, w.name);

  const candidates: VoiceguideRow[] = rows
    .map((r) => ({
      id: r.id,
      workspaceId: r.workspaceId,
      writingSamples: r.writingSamples,
      hasCentroid: r.has_centroid,
    }))
    .filter((r) => force || !r.hasCentroid);

  console.log(`Found ${rows.length} voiceguides total, ${candidates.length} need seeding (force=${force})\n`);
  if (candidates.length === 0) {
    console.log('  Nothing to do. All voiceguides have centroids.');
    process.exit(0);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let totalEmbeds = 0;
  let succeeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const guide of candidates) {
    const name = wsName.get(guide.workspaceId) ?? guide.workspaceId;
    const raw = guide.writingSamples;
    const samples = Array.isArray(raw)
      ? raw.filter((s): s is string => typeof s === 'string').map((s) => s.trim()).filter((s) => s.length > 0)
      : [];

    if (samples.length === 0) {
      console.log(`  [skip] ${name}: no writing samples`);
      skipped++;
      continue;
    }

    console.log(`  [seed] ${name}: ${samples.length} samples → embedding...`);
    const embeddings: number[][] = [];
    try {
      for (const sample of samples) {
        const response = await client.embeddings.create({
          model: EMBED_MODEL,
          input: sample.slice(0, SAMPLE_CHAR_LIMIT),
        });
        const vector = response.data[0]?.embedding;
        if (vector) {
          embeddings.push(vector);
          totalEmbeds++;
        }
      }
    } catch (err) {
      console.log(`         ✗ embed failed: ${err instanceof Error ? err.message : err}`);
      failed++;
      continue;
    }

    if (embeddings.length === 0) {
      console.log('         ✗ no vectors produced');
      failed++;
      continue;
    }

    const dim = embeddings[0].length;
    const centroid = new Array<number>(dim).fill(0);
    for (const vec of embeddings) {
      for (let i = 0; i < dim; i++) centroid[i] += vec[i];
    }
    for (let i = 0; i < dim; i++) centroid[i] /= embeddings.length;

    const vectorLiteral = `[${centroid.join(',')}]`;
    await prisma.$executeRawUnsafe(
      `UPDATE "BrandVoiceguide"
       SET "centroidEmbedding" = $1::vector,
           "centroidComputedAt" = NOW()
       WHERE "id" = $2`,
      vectorLiteral,
      guide.id,
    );
    console.log(`         ✓ centroid persisted (dim=${dim})`);
    succeeded++;
  }

  console.log();
  console.log(`━━━ Summary ━━━`);
  console.log(`  succeeded: ${succeeded}`);
  console.log(`  skipped:   ${skipped}`);
  console.log(`  failed:    ${failed}`);
  console.log(`  embeds:    ${totalEmbeds} (~$${(totalEmbeds * 0.0001).toFixed(4)})`);

  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('crashed:', err instanceof Error ? err.stack : err);
  const { prisma } = await import('../../src/lib/prisma');
  await prisma.$disconnect();
  process.exit(1);
});
