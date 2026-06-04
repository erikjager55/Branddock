/**
 * Cross-brand verificatie — draait extractBrandTokensFromStyleguide tegen
 * ÁLLE workspace-styleguides in de DB en rapporteert de resulterende
 * brand-kleur + max-spacing per merk. Bewijst dat de Fase 1+2 wijzigingen
 * algemene verbeteringen zijn: nooit een Branddock-teal-lek, echte merken
 * behouden hun kleur, geen opgeblazen spacing.
 *
 * Run: npx tsx scripts/verify-cross-brand-tokens.ts
 */
import { prisma } from '../src/lib/prisma';
import { extractBrandTokensFromStyleguide } from '../src/lib/landing-pages/brand-tokens';

const TEAL = '#1fd1b2';
const AMBER = '#f59e0b';

async function main() {
  const guides = await prisma.brandStyleguide.findMany({
    select: {
      workspaceId: true,
      primaryFontName: true, layoutStyle: true, layoutStyleInferred: true, archetype: true,
      buttonProfile: true, typographyProfile: true, spacingProfile: true, spacingScale: true,
      elevationProfile: true, radiusProfile: true, motionProfile: true, photographyStyle: true,
      visualLanguage: true,
      colors: { select: { hex: true, category: true, sortOrder: true, tags: true, contrastWhite: true, contrastBlack: true, confidence: true } },
      fonts: { select: { name: true, role: true, fontFamily: true, sortOrder: true } },
      components: { select: { type: true, label: true, extractedStyles: true, confidence: true }, orderBy: [{ confidence: 'desc' }, { sortOrder: 'asc' }] },
      workspace: { select: { name: true } },
    },
  });

  let tealLeaks = 0;
  let amberLeaks = 0;
  let spacingBlowups = 0;
  const rows: string[] = [];

  for (const g of guides) {
    const name = (g as { workspace?: { name?: string } }).workspace?.name ?? g.workspaceId;
    const t = extractBrandTokensFromStyleguide(g as never);
    const brand = t.brand.toLowerCase();
    const accent = t.accent.toLowerCase();
    const maxSpacing = Math.max(...t.designSystem.spacing);
    const isTeal = brand === TEAL;
    const isAmber = accent === AMBER;
    const blowup = maxSpacing > 220; // ×16 van een rem-scale geeft >220
    if (isTeal) tealLeaks++;
    if (isAmber) amberLeaks++;
    if (blowup) spacingBlowups++;
    const flags = [isTeal ? 'TEAL-LEAK' : '', isAmber ? 'AMBER-LEAK' : '', blowup ? 'SPACING-BLOWUP' : ''].filter(Boolean).join(' ');
    rows.push(`  ${name.padEnd(22)} brand=${t.brand.padEnd(9)} accent=${t.accent.padEnd(9)} maxSpacing=${String(maxSpacing).padStart(3)}  ${flags}`);
  }

  console.log(`\nCross-brand token-verificatie (${guides.length} merken):\n`);
  console.log(rows.join('\n'));
  console.log(`\n  TEAL-leaks: ${tealLeaks} | AMBER-leaks: ${amberLeaks} | spacing-blowups: ${spacingBlowups}`);
  const ok = tealLeaks === 0 && amberLeaks === 0 && spacingBlowups === 0;
  console.log(`\n${ok ? 'OK — geen lek of blowup bij enig merk' : 'FAILED'}`);
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
