/**
 * Backfill: hersynchroniseer BrandVoiceguide → BrandRule voor alle workspaces.
 *
 * Nodig omdat `vocabularyDont` tot 2026-08-14 nooit gesynct werd: die woorden
 * stuurden wél de generatie maar bereikten F-VAL's rules-pijler niet. De sync
 * draait normaal alleen bij een PATCH op de voiceguide; bestaande workspaces
 * hebben die trigger niet meer gehad.
 *
 * Dry-run by default — draai met `--apply` om te schrijven.
 *
 * Run:
 *   DATABASE_URL=... npx tsx scripts/sync-voiceguide-brand-rules.ts
 *   DATABASE_URL=... npx tsx scripts/sync-voiceguide-brand-rules.ts --apply
 *   DATABASE_URL=... npx tsx scripts/sync-voiceguide-brand-rules.ts --workspace="Barneveld" --apply
 */
import { prisma } from '../src/lib/prisma';
import { syncWorkspaceBrandRules } from '../src/lib/brand-fidelity/brand-rule-sync';

const APPLY = process.argv.includes('--apply');
/** Sta toe dat een lege voiceguide de legacy-regels alsnog wist (bewuste keuze). */
const FORCE_LEGACY_DROP = process.argv.includes('--force-legacy-drop');
const workspaceArg = process.argv.find((a) => a.startsWith('--workspace='));
const WORKSPACE_FILTER = workspaceArg ? workspaceArg.split('=')[1] : null;

async function main(): Promise<void> {
  const voiceguides = await prisma.brandVoiceguide.findMany({
    where: WORKSPACE_FILTER
      ? { workspace: { name: { contains: WORKSPACE_FILTER, mode: 'insensitive' } } }
      : {},
    select: {
      workspaceId: true,
      wordsWeAvoid: true,
      antiPatterns: true,
      vocabularyDont: true,
      vocabularySavedForAi: true,
      workspace: { select: { name: true } },
    },
    orderBy: { workspace: { name: 'asc' } },
  });

  if (voiceguides.length === 0) {
    console.log('Geen voiceguides gevonden.');
    return;
  }

  console.log(
    `${APPLY ? 'APPLY' : 'DRY-RUN'} — ${voiceguides.length} voiceguide(s)\n` +
      `${'workspace'.padEnd(26)} avoid  anti  vocabDont  gate   huidige BrandRules`,
  );

  let totalNew = 0;
  const stranded: Array<{ name: string; legacyCount: number }> = [];

  for (const vg of voiceguides) {
    const existing = await prisma.brandRule.count({
      where: { workspaceId: vg.workspaceId, source: { startsWith: 'auto:' } },
    });
    const vocabDontCount = vg.vocabularySavedForAi === false ? 0 : vg.vocabularyDont.length;

    console.log(
      `${vg.workspace.name.slice(0, 25).padEnd(26)} ` +
        `${String(vg.wordsWeAvoid.length).padStart(5)} ` +
        `${String(vg.antiPatterns.length).padStart(5)} ` +
        `${String(vg.vocabularyDont.length).padStart(10)} ` +
        `${(vg.vocabularySavedForAi ? 'aan' : 'UIT').padStart(5)} ` +
        `${String(existing).padStart(19)}`,
    );

    // `syncWorkspaceBrandRules` laat de voiceguide de legacy-bron overnemen en
    // wist daarbij alle `auto:wordsWeAvoid`-regels. Bij een lege voiceguide
    // betekent dat: regels weg, niets ervoor terug. Dat mag niet stil gebeuren.
    const legacyCount = await prisma.brandRule.count({
      where: { workspaceId: vg.workspaceId, source: 'auto:wordsWeAvoid' },
    });
    const wouldStrand =
      legacyCount > 0 &&
      vg.wordsWeAvoid.length === 0 &&
      vg.antiPatterns.length === 0 &&
      vocabDontCount === 0;
    if (wouldStrand) {
      stranded.push({ name: vg.workspace.name, legacyCount });
      console.log(
        `   ⚠️  ${legacyCount} legacy-regel(s) worden gewist zonder vervanging ` +
          `(voiceguide is leeg) — overgeslagen. Vul de voiceguide of draai met --force-legacy-drop.`,
      );
      if (!FORCE_LEGACY_DROP) continue;
    }

    if (!APPLY) {
      totalNew += vocabDontCount;
      continue;
    }

    const result = await syncWorkspaceBrandRules(vg.workspaceId);
    const created = Object.entries(result.changes)
      .filter(([k]) => k.endsWith('Created'))
      .reduce((sum, [, v]) => sum + v, 0);
    totalNew += created;
    console.log(`   → bron=${result.source}, ${JSON.stringify(result.changes)}`);
  }

  console.log(
    APPLY
      ? `\nKlaar — ${totalNew} BrandRule(s) aangemaakt.`
      : `\nDry-run: ~${totalNew} vocabularyDont-term(en) zouden regels worden. Draai met --apply.`,
  );

  if (stranded.length > 0) {
    console.log(
      `\n⚠️  ${stranded.length} workspace(s) overgeslagen omdat een lege voiceguide hun ` +
        `legacy-regels zou wissen:\n` +
        stranded.map((s) => `   - ${s.name} (${s.legacyCount} regels)`).join('\n'),
    );
  }
}

void main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
