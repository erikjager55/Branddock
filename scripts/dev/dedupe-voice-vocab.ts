/**
 * Eenmalige do/avoid-contradictie-fix + rules-pijler contradictie-rapport
 * (audit 2026-06-10, fase 3 item 12).
 *
 * Per workspace:
 *  1. Rapporteer termen die in zowel do- (vocabularyDo/wordsWeUse) als
 *     avoid-lijsten (vocabularyDont/wordsWeAvoid) staan.
 *  2. Met --apply: verwijder ze uit de do-lijsten (avoid wint — zelfde regel
 *     als de analyzer-write-guard in analysis-engine.ts).
 *  3. Rapporteer hoe vaak ruleViolations in ContentFidelityScore woorden
 *     bestraffen die de prompt zelf seedt (interne-tegenspraak-meting).
 *
 * Run: npx tsx scripts/dev/dedupe-voice-vocab.ts [--apply]
 */
import 'dotenv/config';
import { prisma } from '../../src/lib/prisma';
import { dedupeVocabularyAgainstAvoid } from '../../src/lib/brandvoice/vocab-dedupe';

async function run() {
  const apply = process.argv.includes('--apply');
  console.log(`=== Voice-vocab do/avoid-dedup (${apply ? 'APPLY' : 'DRY-RUN'}) ===\n`);

  const guides = await prisma.brandVoiceguide.findMany({
    select: {
      id: true,
      workspaceId: true,
      vocabularyDo: true,
      vocabularyDont: true,
      wordsWeUse: true,
      wordsWeAvoid: true,
      workspace: { select: { name: true } },
    },
  });

  let totalRemoved = 0;
  for (const g of guides) {
    const doDedupe = dedupeVocabularyAgainstAvoid(g.vocabularyDo, g.vocabularyDont, g.wordsWeAvoid);
    const useDedupe = dedupeVocabularyAgainstAvoid(g.wordsWeUse, g.vocabularyDont, g.wordsWeAvoid);
    const removed = [...doDedupe.removed, ...useDedupe.removed];
    if (removed.length === 0) continue;

    totalRemoved += removed.length;
    console.log(`${g.workspace.name} (${g.workspaceId}):`);
    if (doDedupe.removed.length > 0) console.log(`  vocabularyDo − [${doDedupe.removed.join(', ')}]`);
    if (useDedupe.removed.length > 0) console.log(`  wordsWeUse − [${useDedupe.removed.join(', ')}]`);

    if (apply) {
      await prisma.brandVoiceguide.update({
        where: { id: g.id },
        data: {
          ...(doDedupe.removed.length > 0 ? { vocabularyDo: doDedupe.cleanedDo } : {}),
          ...(useDedupe.removed.length > 0 ? { wordsWeUse: useDedupe.cleanedDo } : {}),
        },
      });
      console.log('  → opgeslagen');
    }
  }
  console.log(`\nTotaal contradictie-termen: ${totalRemoved}${apply ? ' (verwijderd uit do-lijsten)' : ''}`);
  if (!apply && totalRemoved > 0) console.log('Draai met --apply om te muteren.');

  // ── Rapport: rules-pijler vs geseede vocab ────────────────────────────
  console.log('\n=== Rules-violations die geseede do-woorden raken ===\n');
  for (const g of guides) {
    const seeded = [...g.vocabularyDo, ...g.wordsWeUse]
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length >= 3);
    if (seeded.length === 0) continue;

    const scores = await prisma.contentFidelityScore.findMany({
      where: { workspaceId: g.workspaceId },
      select: { ruleViolations: true },
      orderBy: { scoredAt: 'desc' },
      take: 100,
    });
    const hits = new Map<string, number>();
    for (const s of scores) {
      const violations = (s.ruleViolations as Array<{ message?: string; snippet?: string }>) ?? [];
      for (const v of violations) {
        const blob = `${v.message ?? ''} ${v.snippet ?? ''}`.toLowerCase();
        for (const term of seeded) {
          if (blob.includes(term)) hits.set(term, (hits.get(term) ?? 0) + 1);
        }
      }
    }
    if (hits.size > 0) {
      const top = Array.from(hits.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
      console.log(`${g.workspace.name}: ${top.map(([t, n]) => `${t}(${n}×)`).join(', ')}`);
    }
  }

  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
