/**
 * Re-score batch voor LP-variants met de nieuwe scoring (audit 2026-06-10,
 * fase 5 item 18). Pakt de meest recente landing-page deliverables met
 * structuredVariantOptions, scoort de eerste variant per deliverable opnieuw
 * via runFidelityScoring (mét F33-override + nieuwe drempel + detector-
 * uitbreiding) en rapporteert het verschil met de historische baseline.
 *
 * Kost 1 judge-LLM-call per variant (~$0.01-0.03). Default cap: 8 variants.
 * Persist gebeurt via het normale pad (incl. contentHash-dedupe).
 *
 * Run: npx tsx scripts/dev/rescore-lp-variants.ts [--limit=N]
 */
import 'dotenv/config';
import { prisma } from '../../src/lib/prisma';
import { assembleCanvasContext } from '../../src/lib/ai/canvas-context';
import { runFidelityScoring } from '../../src/lib/brand-fidelity/fidelity-runner';
import { flattenVariantToText } from '../../src/lib/landing-pages/flatten-variant';
import type { LandingPageVariantContent } from '../../src/lib/landing-pages/variant-schema';

async function run() {
  const limitArg = process.argv.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Math.max(1, parseInt(limitArg.split('=')[1], 10)) : 8;

  console.log(`=== LP re-score batch (max ${limit} variants) ===\n`);

  const deliverables = await prisma.deliverable.findMany({
    where: { contentType: 'landing-page' },
    select: {
      id: true,
      title: true,
      settings: true,
      updatedAt: true,
      campaign: { select: { workspaceId: true, workspace: { select: { name: true } } } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 40,
  });

  const candidates = deliverables
    .map((d) => {
      const settings = (d.settings ?? {}) as Record<string, unknown>;
      const options = settings.structuredVariantOptions as LandingPageVariantContent[] | undefined;
      return options && Array.isArray(options) && options.length > 0
        ? { deliverable: d, variant: options[0] }
        : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null)
    .slice(0, limit);

  console.log(`Kandidaten: ${candidates.length} deliverables met variant-copy\n`);

  const results: Array<{ name: string; ws: string; composite: number; judge: number | null; anti: number | null; met: boolean }> = [];
  for (const { deliverable, variant } of candidates) {
    const text = flattenVariantToText(variant);
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    try {
      const outcome = await runFidelityScoring({
        workspaceId: deliverable.campaign.workspaceId,
        deliverableId: deliverable.id,
        contentTypeId: 'landing-page',
        contentText: text,
        stack: await assembleCanvasContext(deliverable.id, deliverable.campaign.workspaceId),
        generatorProvider: 'anthropic',
        targetWordCountOverride: wordCount,
      });
      if (!outcome) {
        console.log(`SKIP ${deliverable.title} (insufficient/placeholder content)`);
        continue;
      }
      const r = outcome.result;
      const anti = r.pillars.judge?.result.scores?.antiPattern?.score ?? null;
      results.push({
        name: deliverable.title ?? deliverable.id,
        ws: deliverable.campaign.workspace.name,
        composite: r.compositeScore,
        judge: r.pillars.judge?.score ?? null,
        anti,
        met: r.thresholdMet,
      });
      console.log(
        `${deliverable.campaign.workspace.name} / ${deliverable.title}: composite ${r.compositeScore} | judge ${r.pillars.judge?.score ?? '-'} | antiPattern ${anti ?? '-'}/10 | threshold ${r.thresholdMet ? 'MET' : 'niet gehaald'} (${wordCount} woorden)`,
      );
    } catch (err) {
      console.warn(`FOUT ${deliverable.title}: ${(err as Error).message}`);
    }
  }

  if (results.length > 0) {
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
    console.log(`\n=== Samenvatting (n=${results.length}) ===`);
    console.log(`Composite gem.: ${avg(results.map((r) => r.composite)).toFixed(1)} (historische baseline vóór fix: 63.0)`);
    const judges = results.map((r) => r.judge).filter((j): j is number => j !== null);
    if (judges.length > 0) console.log(`Judge gem.: ${avg(judges).toFixed(1)} (was 46.2)`);
    console.log(`Threshold gehaald: ${results.filter((r) => r.met).length}/${results.length}`);
  }

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
