// =============================================================
// Eigenzinnigheid-dimensie + burstiness — metingscript 2026-08-21
//
// Draait de volledige G-Eval-judge (incl. de nieuwe, gewicht-0
// "eigenzinnigheid"-dimensie) en de burstiness-check op een steekproef
// bestaande content-items uit de lokale dev-DB. Doel: Erik een gemeten
// voorstel geven voor het eigenzinnigheid-gewicht, per de acceptatiecriteria
// in tasks/fval-eigenzinnigheid-en-burstiness.md — niets hiervan verandert
// een live score, dit is puur rapportage.
//
// ⚠️ Doet echte AI-judge-calls (1 call per content-item) — kost tokens/credits.
//
// Gebruik: npx tsx scripts/experiments/fval-eigenzinnigheid-burstiness-2026-08-21.ts [N]
// =============================================================

import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
loadEnv({ path: resolve(process.cwd(), '.env.local') });

const SAMPLE_SIZE = Number(process.argv[2] ?? 12);

// Kandidaat-gewichten voor de rapportage — puur hypothetisch, raakt de DB niet.
// De andere 6 dimensies worden proportioneel verlaagd zodat de som weer 1.0 is.
const CANDIDATE_WEIGHTS = [0.05, 0.1, 0.15];

async function main() {
  const { prisma } = await import('../../src/lib/prisma');
  const { getDeliverableContent } = await import('../../src/lib/content/deliverable-content');
  const { detectAiTells } = await import('../../src/lib/brand-fidelity/ai-tell-detector');
  const { runRubricJudge } = await import('../../src/lib/brand-fidelity/judge-dispatcher');
  const { DIMENSIONS } = await import('../../src/lib/brand-fidelity/g-eval-rubric');

  // ─── Steekproef samenstellen ──────────────────────────
  // Kandidaten: deliverables met óf generatedText (keten B/C) óf een
  // geselecteerde component met generatedContent (keten A) — dezelfde twee
  // bronnen die getDeliverableContent() al verenigt.
  const candidates = await prisma.deliverable.findMany({
    where: {
      OR: [
        { generatedText: { not: null } },
        { components: { some: { isSelected: true, generatedContent: { not: null } } } },
      ],
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      campaign: { select: { workspaceId: true, workspace: { select: { name: true } } } },
    },
    take: SAMPLE_SIZE * 4, // ruimer pakken, filteren op woordaantal na resolve
  });

  console.log(`Kandidaten gevonden: ${candidates.length}. Steekproef doel: ${SAMPLE_SIZE}.\n`);

  interface Row {
    id: string;
    title: string;
    contentType: string;
    workspace: string;
    wordCount: number;
    scores: Record<string, number>;
    weightedComposite: number;
    burstiness: string;
    burstinessCV: number;
  }
  const rows: Row[] = [];
  const voiceCache = new Map<string, string>();

  for (const c of candidates) {
    if (rows.length >= SAMPLE_SIZE) break;
    const workspaceId = c.campaign?.workspaceId;
    if (!workspaceId) continue;

    const res = await getDeliverableContent(workspaceId, c.id);
    if (!res.ok || !res.deliverable.text) continue;
    const text = res.deliverable.text;
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    if (wordCount < 100) continue; // te kort voor een zinvolle meting

    let brandVoiceSummary = voiceCache.get(workspaceId);
    if (brandVoiceSummary === undefined) {
      const vg = await prisma.brandVoiceguide.findUnique({
        where: { workspaceId },
        select: { voiceDescription: true },
      });
      brandVoiceSummary = vg?.voiceDescription?.slice(0, 400) ?? 'Geen voice-beschrijving beschikbaar.';
      voiceCache.set(workspaceId, brandVoiceSummary);
    }

    const detectorResult = detectAiTells(text);

    try {
      const judgeResult = await runRubricJudge(
        {
          contentText: text,
          brandName: c.campaign?.workspace?.name ?? 'Onbekend merk',
          brandVoiceSummary,
          detectorResult,
        },
        { generatorProvider: 'anthropic', targetWordCount: wordCount },
      );

      const scores: Record<string, number> = {};
      for (const d of DIMENSIONS) scores[d.key] = judgeResult.scores[d.key].score;

      rows.push({
        id: c.id,
        title: c.title,
        contentType: c.contentType,
        workspace: c.campaign?.workspace?.name ?? '-',
        wordCount,
        scores,
        weightedComposite: judgeResult.weightedComposite,
        burstiness: detectorResult.burstiness.classification,
        burstinessCV: detectorResult.burstiness.coefficientOfVariation,
      });
      process.stdout.write('.');
    } catch (err) {
      process.stdout.write('x');
      console.error(`\n  [skip] ${c.id}: ${(err as Error).message}`);
    }
  }
  console.log(`\n\n${rows.length} items succesvol gescoord.\n`);

  if (rows.length === 0) {
    console.log('Geen bruikbare content gevonden — niets te rapporteren.');
    process.exit(0);
  }

  // ─── Rapport: huidige vs. hypothetische composite ─────
  function hypotheticalComposite(scores: Record<string, number>, newWeight: number): number {
    const otherDims = DIMENSIONS.filter((d) => d.key !== 'eigenzinnigheid');
    const otherWeightSum = otherDims.reduce((s, d) => s + d.weight, 0);
    const scaleFactor = (1 - newWeight) / otherWeightSum;
    let weightedSum = 0;
    for (const d of otherDims) weightedSum += scores[d.key] * d.weight * scaleFactor;
    weightedSum += scores.eigenzinnigheid * newWeight;
    return Math.round(weightedSum * 10);
  }

  console.log('┌─────────────────────────────────────────────────────────────────────────');
  console.log('│ Item                          | huidig | eigenz. | +0.05 | +0.10 | +0.15 | burstiness');
  console.log('├─────────────────────────────────────────────────────────────────────────');
  let sumCurrent = 0;
  let sumEigen = 0;
  const sumsAtWeight: Record<number, number> = {};
  for (const w of CANDIDATE_WEIGHTS) sumsAtWeight[w] = 0;

  for (const r of rows) {
    const label = `${r.contentType}/${r.title}`.slice(0, 30).padEnd(30);
    const eigen = r.scores.eigenzinnigheid;
    const hyps = CANDIDATE_WEIGHTS.map((w) => hypotheticalComposite(r.scores, w));
    console.log(
      `│ ${label} | ${String(r.weightedComposite).padStart(6)} | ${String(eigen).padStart(7)} | ${hyps.map((h) => String(h).padStart(5)).join(' | ')} | ${r.burstiness} (CV ${r.burstinessCV.toFixed(2)})`,
    );
    sumCurrent += r.weightedComposite;
    sumEigen += eigen;
    hyps.forEach((h, i) => (sumsAtWeight[CANDIDATE_WEIGHTS[i]] += h));
  }
  console.log('└─────────────────────────────────────────────────────────────────────────\n');

  console.log(`Gemiddelde huidige composite (6 dim):        ${(sumCurrent / rows.length).toFixed(1)}`);
  console.log(`Gemiddelde eigenzinnigheid-score (1-10):      ${(sumEigen / rows.length).toFixed(1)}`);
  for (const w of CANDIDATE_WEIGHTS) {
    const avg = sumsAtWeight[w] / rows.length;
    const delta = avg - sumCurrent / rows.length;
    console.log(
      `Gemiddelde composite bij eigenzinnigheid=${w.toFixed(2)}: ${avg.toFixed(1)} (Δ ${delta >= 0 ? '+' : ''}${delta.toFixed(1)})`,
    );
  }

  const burstinessCounts = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.burstiness] = (acc[r.burstiness] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`\nBurstiness-verdeling: ${JSON.stringify(burstinessCounts)}`);

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
