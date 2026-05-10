/**
 * Brand-language backfill — workspace-iteratie audit + optional apply.
 *
 * Default: report-only. Toont per-workspace `current → detected` diff.
 * Met --apply: schrijft updates voor workspaces met `confidence='high'`
 * mismatch. Idempotent — herhaalde runs zijn no-op zodra correct.
 *
 * Logic:
 *   - `Workspace.contentLanguage` updated wanneer detected.language verschilt
 *     EN confidence='high'. Low/medium confidence wordt geskipped.
 *   - `BrandVoiceguide.contentLocale` updated wanneer NULL én detected.locale
 *     beschikbaar én confidence='high'. Bestaande non-NULL waarden worden
 *     respected (user-keuze heeft voorrang).
 *   - Workspaces zonder voldoende tekstuele content (insufficient signal)
 *     worden geskipped met log "no signal".
 *
 * Veiligheid:
 *   - Productie-guard: refuse run if NODE_ENV=production tenzij
 *     --i-know-what-im-doing flag aanwezig
 *   - `--workspace-slug=...` om een specifieke workspace te targeten (handig
 *     voor stapsgewijze validatie)
 *
 * Run:
 *   npx tsx scripts/backfill-brand-language.ts             # report-only
 *   npx tsx scripts/backfill-brand-language.ts --apply     # writes
 *   npx tsx scripts/backfill-brand-language.ts --apply --workspace-slug=linfi
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  detectBrandLanguage,
  type BrandLanguageDetection,
} from '../src/lib/i18n/detect-brand-language';

interface WorkspaceState {
  id: string;
  slug: string;
  name: string;
  contentLanguage: string;
  /** null = no voiceguide row exists; '<value>' = exists with value; '' = exists but empty */
  voiceguideContentLocale: string | null;
  /** True if BrandVoiceguide row exists for this workspace */
  hasVoiceguide: boolean;
}

interface RowReport {
  ws: WorkspaceState;
  detection: BrandLanguageDetection;
  action:
    | 'skip-no-signal'
    | 'skip-low-conf'
    | 'skip-medium-conf'
    | 'skip-match'
    | 'update-ws'
    | 'update-locale'
    | 'update-both';
  reason: string;
}

async function main() {
  // Production-guard
  if (process.env.NODE_ENV === 'production') {
    if (!process.argv.includes('--i-know-what-im-doing')) {
      console.error('Refusing in production. Pass --i-know-what-im-doing to override.');
      process.exit(1);
    }
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL required');
    process.exit(1);
  }

  const apply = process.argv.includes('--apply');
  const slugFlag = process.argv.find((a) => a.startsWith('--workspace-slug='));
  const targetSlug = slugFlag ? slugFlag.split('=')[1] : null;

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const workspaces = await prisma.workspace.findMany({
    where: targetSlug ? { slug: targetSlug } : undefined,
    select: {
      id: true,
      slug: true,
      name: true,
      contentLanguage: true,
      brandVoiceguide: { select: { contentLocale: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  if (workspaces.length === 0) {
    console.log('No workspaces matched.');
    await prisma.$disconnect();
    return;
  }

  console.log(`\nBackfill brand-language ${apply ? '(APPLY MODE)' : '(report-only)'} — ${workspaces.length} workspaces\n`);

  const reports: RowReport[] = [];

  for (const ws of workspaces) {
    const wsState: WorkspaceState = {
      id: ws.id,
      slug: ws.slug,
      name: ws.name,
      contentLanguage: ws.contentLanguage,
      voiceguideContentLocale: ws.brandVoiceguide?.contentLocale ?? null,
      hasVoiceguide: ws.brandVoiceguide !== null,
    };
    const detection = await detectBrandLanguage(ws.id);
    reports.push(planAction(wsState, detection));
  }

  // Print summary table
  console.log(
    'slug'.padEnd(28) +
      'current.lang'.padEnd(14) +
      'vg.locale'.padEnd(12) +
      'detected'.padEnd(12) +
      'conf'.padEnd(8) +
      'action',
  );
  console.log('-'.repeat(110));
  for (const r of reports) {
    console.log(
      r.ws.slug.padEnd(28) +
        r.ws.contentLanguage.padEnd(14) +
        (r.ws.voiceguideContentLocale ?? '-').padEnd(12) +
        (r.detection.language ?? 'null').padEnd(12) +
        r.detection.confidence.padEnd(8) +
        `${r.action} — ${r.reason}`,
    );
  }

  if (!apply) {
    const updateCount = reports.filter((r) => r.action.startsWith('update')).length;
    const mediumCount = reports.filter((r) => r.action === 'skip-medium-conf').length;
    console.log(
      `\n[report-only] ${updateCount} workspace(s) would be updated. ` +
        `${mediumCount > 0 ? `${mediumCount} skipped voor medium-confidence (manual review aanbevolen). ` : ''}` +
        `Re-run with --apply to write.\n`,
    );
    await prisma.$disconnect();
    return;
  }

  // Apply mode — atomic per-workspace update
  console.log('\nApplying updates...\n');
  let applied = 0;
  for (const r of reports) {
    if (!r.action.startsWith('update')) continue;
    const updates: Promise<unknown>[] = [];
    if (r.action === 'update-ws' || r.action === 'update-both') {
      updates.push(
        prisma.workspace.update({
          where: { id: r.ws.id },
          data: { contentLanguage: r.detection.language! },
        }),
      );
    }
    if (r.action === 'update-locale' || r.action === 'update-both') {
      updates.push(
        prisma.brandVoiceguide.updateMany({
          where: { workspaceId: r.ws.id, contentLocale: null },
          data: { contentLocale: r.detection.locale! },
        }),
      );
    }
    await Promise.all(updates);
    applied++;
    console.log(`  ✓ ${r.ws.slug} → ${r.action}`);
  }

  console.log(`\nApplied ${applied} update(s).\n`);
  await prisma.$disconnect();
}

function planAction(ws: WorkspaceState, detection: BrandLanguageDetection): RowReport {
  // No signal — geen voiceguide of brand-assets met tekst
  if (detection.language === null) {
    return {
      ws,
      detection,
      action: 'skip-no-signal',
      reason: `no signal (${detection.totalChars} chars, ${detection.sourcesUsed.length} sources)`,
    };
  }

  // Low confidence — auto-update is te riskant
  if (detection.confidence === 'low') {
    return {
      ws,
      detection,
      action: 'skip-low-conf',
      reason: `low confidence (${detection.totalChars} chars, ${detection.sourcesUsed.length} sources)`,
    };
  }

  // Medium confidence: alleen rapport, geen auto-update (user kan via UI)
  if (detection.confidence === 'medium') {
    return {
      ws,
      detection,
      action: 'skip-medium-conf',
      reason: `medium confidence — manual review aanbevolen`,
    };
  }

  const needsWsUpdate = ws.contentLanguage !== detection.language;
  // BrandVoiceguide.contentLocale update vereist een bestaande voiceguide
  // row. Workspaces zonder voiceguide (meeste in DB) krijgen alleen de
  // workspace.contentLanguage correctie — de voiceguide-locale wordt
  // automatisch correct gezet wanneer de gebruiker later een voiceguide
  // aanmaakt (default-locale resolver picks workspace.contentLanguage).
  const needsLocaleUpdate =
    ws.hasVoiceguide &&
    ws.voiceguideContentLocale === null &&
    detection.locale !== null;

  if (!needsWsUpdate && !needsLocaleUpdate) {
    return { ws, detection, action: 'skip-match', reason: 'already correct' };
  }
  if (needsWsUpdate && needsLocaleUpdate) {
    return {
      ws,
      detection,
      action: 'update-both',
      reason: `ws ${ws.contentLanguage}→${detection.language}, vg locale ∅→${detection.locale}`,
    };
  }
  if (needsWsUpdate) {
    return {
      ws,
      detection,
      action: 'update-ws',
      reason: `ws ${ws.contentLanguage}→${detection.language}`,
    };
  }
  return {
    ws,
    detection,
    action: 'update-locale',
    reason: `vg locale ∅→${detection.locale}`,
  };
}

main().catch(async (err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
