/**
 * Storage-URL-audit — welke rijen dragen een URL die niet (meer) bereikbaar is?
 *
 * Hoort bij `tasks/deferred-browser-smokes-unblocked.md` en de gotcha van
 * 2026-07-21. Beantwoordt precies één vraag die van buiten productie niet te
 * zien is: **bestaan er rijen met een verlopen/niet-publieke R2-URL, en zo ja
 * hoeveel en hoe oud?** Daar hangt de urgentie van de compose-/trainer-fix aan.
 *
 * Classificatie per URL:
 *   SIGNED    `…r2.cloudflarestorage.com…X-Amz-Signature=…` — vervalt na een uur.
 *             Dit is de kapotte klasse: previews 403'en en externe fetchers
 *             (fal, Gemini) kunnen het beeld niet ophalen.
 *   ENDPOINT  `…r2.cloudflarestorage.com…` zonder signature — het S3-endpoint is
 *             niet publiek leesbaar, dus even onbruikbaar (alleen niet vervallen).
 *   PUBLIC    `pub-….r2.dev/…` of de geconfigureerde `R2_PUBLIC_URL` — duurzaam, OK.
 *   LOCAL     `/uploads/…` — lokale dev-opslag, alleen op een dev-machine geldig.
 *   EXTERN    andere http(s)-host (Pexels, Unsplash, …) — niet van ons.
 *   LEEG      null of lege string.
 *
 * ⚠ STRIKT READ-ONLY. Alleen SELECT-statements; er wordt niets geschreven,
 * gewist of gemigreerd. Veilig om tegen productie te draaien.
 *
 * Run tegen productie (Neon):
 *   DATABASE_URL="postgresql://…neon…" npx tsx scripts/dev/storage-url-audit.ts
 *
 * Run lokaal (ter vergelijking):
 *   npx tsx --env-file=.env.local scripts/dev/storage-url-audit.ts
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

/**
 * Elke kolom die een storage-URL draagt, afgeleid uit `prisma/schema.prisma`.
 * Bewust een expliciete lijst en geen introspectie: als er een model bijkomt
 * hoort iemand daar bewust over na te denken — precies de les van de
 * onvolledige call-site-sweep (gotcha 2026-08-18).
 */
const TARGETS: Array<{ table: string; column: string; note?: string }> = [
  { table: 'MediaAsset', column: 'fileUrl', note: 'DAM — bron voor compose + brand-style-anchors' },
  { table: 'MediaAsset', column: 'thumbnailUrl' },
  { table: 'ReferenceImage', column: 'storageUrl', note: 'trainer-referenties — de flow van 21-07' },
  { table: 'ReferenceImage', column: 'thumbnailUrl' },
  { table: 'ConsistentModelGeneration', column: 'storageUrl' },
  { table: 'ConsistentModelGeneration', column: 'thumbnailUrl' },
  { table: 'ConsistentModel', column: 'thumbnailUrl' },
  { table: 'DeliverableComponent', column: 'imageUrl', note: 'bron voor refine-visual' },
  { table: 'GeneratedImage', column: 'fileUrl' },
  { table: 'GeneratedVideo', column: 'fileUrl' },
  { table: 'GeneratedVideo', column: 'thumbnailUrl' },
  { table: 'StyleguideLogo', column: 'fileUrl' },
  { table: 'StyleguideFont', column: 'fileUrl' },
  { table: 'KnowledgeResource', column: 'fileUrl' },
  { table: 'SoundEffect', column: 'fileUrl' },
  { table: 'ContentVisualFidelityScore', column: 'imageUrl' },
];

type Row = { klasse: string; aantal: bigint; oudste: Date | null; nieuwste: Date | null };

function buildSql(table: string, column: string, hasCreatedAt: boolean): string {
  const tijd = hasCreatedAt
    ? 'MIN("createdAt") AS oudste, MAX("createdAt") AS nieuwste'
    : 'NULL::timestamp AS oudste, NULL::timestamp AS nieuwste';
  return `
    SELECT klasse, COUNT(*) AS aantal, ${tijd}
    FROM (
      SELECT
        ${hasCreatedAt ? '"createdAt",' : ''}
        CASE
          WHEN "${column}" IS NULL OR "${column}" = '' THEN 'LEEG'
          WHEN "${column}" LIKE '%r2.cloudflarestorage.com%X-Amz-Signature%' THEN 'SIGNED'
          WHEN "${column}" LIKE '%r2.cloudflarestorage.com%' THEN 'ENDPOINT'
          WHEN "${column}" LIKE 'https://pub-%.r2.dev/%' THEN 'PUBLIC'
          WHEN "${column}" LIKE '/uploads/%' OR "${column}" LIKE 'uploads/%' THEN 'LOCAL'
          WHEN "${column}" LIKE 'http%' THEN 'EXTERN'
          ELSE 'ANDERS'
        END AS klasse
      FROM "${table}"
    ) t
    GROUP BY klasse
    ORDER BY 2 DESC
  `;
}

async function hasColumn(prisma: PrismaClient, table: string, column: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_name = $1 AND column_name = $2`,
    table,
    column,
  );
  return Number(rows[0]?.n ?? 0) > 0;
}

function fmtDate(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : '—';
}

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL ontbreekt. Zet hem expliciet of gebruik --env-file=.env.local');
    process.exit(1);
  }
  const host = (() => {
    try {
      return new URL(url).host;
    } catch {
      return '(onleesbaar)';
    }
  })();
  console.log('Storage-URL-audit — READ-ONLY');
  console.log(`  database: ${host}\n`);

  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });

  let totalSigned = 0;
  let totalEndpoint = 0;
  const affected: string[] = [];

  try {
    for (const { table, column, note } of TARGETS) {
      if (!(await hasColumn(prisma, table, column))) {
        console.log(`  ⏭  ${table}.${column} — kolom bestaat niet in dit schema`);
        continue;
      }
      const withCreated = await hasColumn(prisma, table, 'createdAt');
      let rows: Row[];
      try {
        rows = await prisma.$queryRawUnsafe<Row[]>(buildSql(table, column, withCreated));
      } catch (err) {
        console.log(`  ⚠  ${table}.${column} — query faalde: ${(err as Error).message}`);
        continue;
      }
      if (rows.length === 0) {
        console.log(`  ·  ${table}.${column} — leeg`);
        continue;
      }
      const label = note ? `${table}.${column}  (${note})` : `${table}.${column}`;
      console.log(`  ${label}`);
      for (const r of rows) {
        const n = Number(r.aantal);
        const stamp = withCreated ? `  ${fmtDate(r.oudste)} → ${fmtDate(r.nieuwste)}` : '';
        const mark = r.klasse === 'SIGNED' ? ' ⛔' : r.klasse === 'ENDPOINT' ? ' ⚠' : '';
        console.log(`      ${r.klasse.padEnd(9)} ${String(n).padStart(6)}${stamp}${mark}`);
        if (r.klasse === 'SIGNED') {
          totalSigned += n;
          affected.push(`${table}.${column} (${n})`);
        }
        if (r.klasse === 'ENDPOINT') {
          totalEndpoint += n;
          if (!affected.some((a) => a.startsWith(`${table}.${column}`))) {
            affected.push(`${table}.${column} (${n} endpoint)`);
          }
        }
      }
      console.log('');
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log('─'.repeat(60));
  if (totalSigned === 0 && totalEndpoint === 0) {
    console.log('✓ Geen SIGNED- of ENDPOINT-URL\'s gevonden.');
    console.log('  De verlopen-URL-klasse is op deze database niet aanwezig; de');
    console.log('  compose-/trainer-fix is dan preventief, niet herstellend.');
    return;
  }
  console.log(`⛔ ${totalSigned} SIGNED (vervallen na een uur) · ⚠ ${totalEndpoint} ENDPOINT (niet publiek)`);
  console.log('   Getroffen kolommen:');
  for (const a of affected) console.log(`     · ${a}`);
  console.log('');
  console.log('   Deze rijen zijn NIET stuk in de database — de fix zit in het leespad:');
  console.log('   `resolveStorageUrl()` normaliseert ze bij het lezen naar R2_PUBLIC_URL.');
  console.log('   Een migratie is dus niet nodig; wél is dit de bevestiging dat de');
  console.log('   compose-/refine-fix (PR #296) echt bestaande data raakt.');
}

void main();
