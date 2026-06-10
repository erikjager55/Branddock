/**
 * Baseline-recompute voor webpage-type ContentFidelityScore-rijen
 * (audit 2026-06-10, fase 1 item 5).
 *
 * Vóór de LP-target-fix kregen 46/47 landing-page-scores een ×0.6
 * "severely short" length-penalty op de judge-pijler (target 1550 woorden
 * vs ~650 reële variant-copy). Dit script herberekent deterministisch —
 * GEEN LLM-calls — de judge-pijler zonder penalty uit de opgeslagen
 * subCriteriaScores en daarmee de compositeScore, zodat dashboards en
 * type-gemiddelden een eerlijke baseline tonen.
 *
 * Werkwijze per rij (alle webpage-types, judgeIdentifier composition-engine):
 *  1. raw judge = Σ(subdim.score × rubric-default-weight) / Σweight × 10
 *  2. nieuwe judge-pijler = raw (multiplier 1.0 — target=actual per F33-fix)
 *  3. nieuwe composite = Σ(pillar.score × pillar.weight) met de nieuwe judge
 *  4. update compositeScore + pillarScores.judge.score + scorerVersion-suffix
 *
 * Veiligheid:
 *  - default DRY-RUN; pas --apply muteert
 *  - JSON-backup van alle te wijzigen rijen vóór de update
 *  - alleen rijen waar de implied multiplier < 0.95 (echte penalty-rijen)
 *
 * Run: npx tsx scripts/dev/recompute-lp-fidelity-baseline.ts [--apply]
 */
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { prisma } from '../../src/lib/prisma';

const WEBPAGE_TYPES = ['landing-page', 'product-page', 'faq-page', 'comparison-page', 'microsite'];

/** Default G-Eval rubric-weights (g-eval-rubric.ts DIMENSIONS). */
const RUBRIC_WEIGHTS: Record<string, number> = {
  strategicAnchoring: 0.2,
  audienceFit: 0.15,
  brandRecognition: 0.15,
  antiPattern: 0.3,
  coherence: 0.1,
  concreteness: 0.1,
};

interface PillarEntry { score: number; weight: number; [k: string]: unknown }

async function run() {
  const apply = process.argv.includes('--apply');
  console.log(`=== LP fidelity baseline-recompute (${apply ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  const rows = await prisma.contentFidelityScore.findMany({
    where: {
      judgeIdentifier: 'composition-engine-v1.0',
      contentVersion: { deliverable: { contentType: { in: WEBPAGE_TYPES } } },
    },
    select: {
      id: true,
      compositeScore: true,
      pillarScores: true,
      subCriteriaScores: true,
      scorerVersion: true,
      scoredAt: true,
      contentVersion: { select: { deliverable: { select: { contentType: true } } } },
    },
    orderBy: { scoredAt: 'asc' },
  });
  console.log(`Gevonden: ${rows.length} webpage-type score-rijen\n`);

  const updates: Array<{ id: string; newComposite: number; newJudge: number; oldComposite: number; oldJudge: number }> = [];
  const backup: unknown[] = [];

  for (const row of rows) {
    const pillars = row.pillarScores as Record<string, PillarEntry | null>;
    const judge = pillars?.judge;
    if (!judge || typeof judge.score !== 'number' || typeof judge.weight !== 'number') continue;

    const sub = row.subCriteriaScores as Record<string, { score?: number; pillar?: string }>;
    let weightedSum = 0;
    let weightTotal = 0;
    for (const [key, w] of Object.entries(RUBRIC_WEIGHTS)) {
      const dim = sub?.[key];
      if (dim && typeof dim.score === 'number') {
        weightedSum += dim.score * w;
        weightTotal += w;
      }
    }
    if (weightTotal === 0) continue;
    const rawJudge = Math.round((weightedSum / weightTotal) * 10);
    if (rawJudge <= 0) continue;

    const impliedMultiplier = judge.score / rawJudge;
    // Alleen penalty-rijen aanpassen; rijen die al ~1.0 zaten blijven onaangeroerd.
    if (impliedMultiplier >= 0.95) continue;

    // Composite herberekenen met de bestaande pillar-weights.
    let composite = 0;
    for (const [name, p] of Object.entries(pillars)) {
      if (!p || typeof p.score !== 'number' || typeof p.weight !== 'number') continue;
      composite += (name === 'judge' ? rawJudge : p.score) * p.weight;
    }
    const newComposite = Math.round(composite);

    backup.push({ id: row.id, scoredAt: row.scoredAt, compositeScore: row.compositeScore, pillarScores: row.pillarScores, scorerVersion: row.scorerVersion });
    updates.push({ id: row.id, newComposite, newJudge: rawJudge, oldComposite: row.compositeScore, oldJudge: judge.score });

    if (apply) {
      await prisma.contentFidelityScore.update({
        where: { id: row.id },
        data: {
          compositeScore: newComposite,
          pillarScores: { ...pillars, judge: { ...judge, score: rawJudge } },
          scorerVersion: `${row.scorerVersion ?? 'composition-engine'}+lp-length-penalty-recompute-2026-06-10`,
        },
      });
    }
  }

  if (backup.length > 0) {
    const backupPath = `scripts/dev/.backup-lp-fidelity-baseline-${Date.now()}.json`;
    writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    console.log(`Backup: ${backupPath} (${backup.length} rijen)\n`);
  }

  const avgOld = updates.reduce((s, u) => s + u.oldComposite, 0) / Math.max(1, updates.length);
  const avgNew = updates.reduce((s, u) => s + u.newComposite, 0) / Math.max(1, updates.length);
  console.log(`${apply ? 'Aangepast' : 'Zou aanpassen'}: ${updates.length} rijen`);
  console.log(`Composite gem. (deze rijen): ${avgOld.toFixed(1)} → ${avgNew.toFixed(1)}`);
  console.log(`Judge gem.: ${(updates.reduce((s, u) => s + u.oldJudge, 0) / Math.max(1, updates.length)).toFixed(1)} → ${(updates.reduce((s, u) => s + u.newJudge, 0) / Math.max(1, updates.length)).toFixed(1)}`);
  if (!apply) console.log('\nDraai met --apply om te muteren.');

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
