/**
 * content-chain-accessor-real-data — draait de accessor tegen ECHTE rijen uit de DB
 * en vergelijkt met wat de oude component-only-projectie zou opleveren.
 *
 * Aanleiding (gotcha 2026-07-12): "een fix is pas een fix na een echte run van de
 * getroffen laag". tsc bewijst hier per definitie niets — beide takken compileren.
 * Fixtures bewijzen de logica; deze run bewijst dat de logica op de werkelijke
 * opgeslagen vormen past (schema-drift, partials, oude schrijvers).
 *
 * Draaien:
 *   node --env-file-if-exists=.env.local node_modules/.bin/tsx \
 *     scripts/dev/content-chain-accessor-real-data.ts
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { resolveDeliverableContent } from '@/lib/content/resolve-deliverable-content';

const NON_TEXT = new Set(['image', 'video', 'voiceover']);

/** Wat de routes vóór de fix deden: alleen de component-keten. */
function legacyComponentOnlyText(
  components: Array<{ componentType: string; generatedContent: string | null; variantIndex: number }>,
): string {
  return components
    .filter((c) => c.variantIndex === 0 && !NON_TEXT.has(c.componentType))
    .map((c) => c.generatedContent ?? '')
    .filter((s) => s.trim().length > 0)
    .join('\n\n');
}

let repaired = 0;
let alreadyOk = 0;
let stillEmpty = 0;
let threw = 0;

(async () => {
  const deliverables = await prisma.deliverable.findMany({
    where: {
      OR: [
        { settings: { path: ['structuredVariant'], not: Prisma.DbNull } },
        { settings: { path: ['structuredVariantOptions'], not: Prisma.DbNull } },
      ],
    },
    select: {
      id: true,
      title: true,
      contentType: true,
      settings: true,
      generatedText: true,
      components: {
        select: {
          componentType: true,
          groupType: true,
          generatedContent: true,
          imageUrl: true,
          variantGroup: true,
          variantIndex: true,
          isSelected: true,
          order: true,
        },
      },
    },
    take: 50,
  });

  console.log(`\n${deliverables.length} keten-B-deliverables gevonden.\n`);

  for (const d of deliverables) {
    const before = legacyComponentOnlyText(
      d.components.map((c) => ({
        componentType: c.componentType,
        generatedContent: c.generatedContent,
        variantIndex: c.variantIndex,
      })),
    );

    let after: string;
    let kind: string;
    try {
      const resolved = resolveDeliverableContent(d);
      kind = resolved.kind;
      after =
        resolved.kind === 'structured' || resolved.kind === 'components' ? resolved.text : '';
    } catch (err) {
      // De accessor mág niet gooien — dat is de fail-soft-belofte.
      threw++;
      console.log(`  ✗ GOOIT  ${d.contentType} "${d.title.slice(0, 32)}" — ${String(err).slice(0, 80)}`);
      continue;
    }

    const beforeWords = before.split(/\s+/).filter(Boolean).length;
    const afterWords = after.split(/\s+/).filter(Boolean).length;

    if (beforeWords === 0 && afterWords > 0) {
      repaired++;
      console.log(
        `  ✓ HERSTELD  ${d.contentType.padEnd(14)} 0 → ${String(afterWords).padStart(5)} woorden  [${kind}]  "${d.title.slice(0, 30)}"`,
      );
    } else if (afterWords > 0) {
      alreadyOk++;
      console.log(
        `  · ok        ${d.contentType.padEnd(14)} ${String(beforeWords).padStart(5)} → ${String(afterWords).padStart(5)} woorden  [${kind}]`,
      );
    } else {
      stillEmpty++;
      console.log(`  – leeg      ${d.contentType.padEnd(14)} [${kind}]  "${d.title.slice(0, 30)}"`);
    }
  }

  console.log(
    `\nHERSTELD: ${repaired}  ·  al goed: ${alreadyOk}  ·  nog leeg: ${stillEmpty}  ·  exceptions: ${threw}`,
  );
  console.log(
    threw === 0
      ? 'Fail-soft belofte gehouden: geen enkele echte rij liet de accessor gooien.\n'
      : '⚠️ De accessor gooide op echte data — fail-soft is geschonden.\n',
  );

  await prisma.$disconnect();
  process.exit(threw > 0 ? 1 : 0);
})().catch((e) => {
  console.error('Mislukt:', e);
  process.exit(1);
});
