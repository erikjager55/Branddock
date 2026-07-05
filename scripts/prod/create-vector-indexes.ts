/**
 * Idempotente aanmaak van de pgvector-extension + HNSW-indexen op de 3
 * vector-kolommen.
 *
 * Draai dit ÉÉN keer tegen de productie-DB (Neon) NÁ `prisma db push`. db push
 * synct wél de kolommen maar maakt de raw-SQL vector-indexen NIET aan (Prisma
 * beheert het `Unsupported("vector")`-type niet). Zonder deze indexen doen de
 * cosine-similarity queries (ORDER BY embedding <=> $1) een seq-scan.
 *
 *   DATABASE_URL="postgres://..." npx tsx scripts/prod/create-vector-indexes.ts
 *
 * HNSW (pgvector >= 0.5) i.p.v. IVFFlat: hogere recall, geen lists-training +
 * geen data nodig bij aanmaak. Cosine-ops (<=> operator). Idempotent via
 * IF NOT EXISTS — veilig te herhalen.
 */
import pg from 'pg';

const INDEXES: Array<{ table: string; column: string; name: string }> = [
  { table: 'MediaAsset', column: 'embedding', name: 'MediaAsset_embedding_hnsw_idx' },
  { table: 'AgentMemory', column: 'embedding', name: 'AgentMemory_embedding_hnsw_idx' },
  {
    table: 'BrandVoiceguide',
    column: 'centroidEmbedding',
    name: 'BrandVoiceguide_centroidEmbedding_hnsw_idx',
  },
];

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL vereist');

  const pool = new pg.Pool({ connectionString, max: 1 });
  try {
    await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
    console.log('OK  extension vector');

    for (const ix of INDEXES) {
      await pool.query(
        `CREATE INDEX IF NOT EXISTS "${ix.name}" ON "${ix.table}" USING hnsw ("${ix.column}" vector_cosine_ops);`,
      );
      console.log(`OK  ${ix.name}`);
    }

    console.log('Klaar — alle vector-indexen aanwezig.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error('FOUT:', err instanceof Error ? err.message : err);
  process.exit(1);
});
