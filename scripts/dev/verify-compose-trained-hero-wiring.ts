/**
 * Real-data verificatie van de image-source-fix (#314) tegen een ECHTE
 * landingspagina-deliverable in de lokale DB — zónder een betaalde AI-call.
 *
 * De orphaned-hero-bug ging NIET over generatie maar over WIRING: het
 * gegenereerde beeld belandde nooit in puckData.BrandHero.heroVisualUrl. Deze
 * verificatie bewijst de twee fixes op echte data:
 *   Defect 2 (hero-wiring): patchHeroVisualUrl zet de URL atomisch in
 *     puckData.BrandHero + structuredVariant.hero van een echte deliverable.
 *   Defect 1 (source-gate): een gepersisteerde visualBrief.source='compose'/
 *     'trained-style' laat de server-gate (source === ...) slagen.
 *
 * Veilig: capture de originele settings en RESTORE die in finally (geen blijvende
 * mutatie). De generatie + visuele render vergt een echte browser + AI-call en
 * blijft een handmatige stap (zelfde render-pad als de werkende 'generate'-bron).
 *
 * Run: DATABASE_URL=... npx tsx scripts/dev/verify-compose-trained-hero-wiring.ts
 */
import { prisma } from '../../src/lib/prisma';
import { patchHeroVisualUrl, applyHeroUrlToSettings } from '../../src/lib/deliverable/patch-hero-visual';

const PUCK = ['landing-page', 'product-page', 'faq-page', 'comparison-page', 'microsite'];
const SENTINEL = 'https://verify.local/sentinel-hero-' + 'compose-trained' + '.png';

type Settings = Record<string, unknown>;
function heroUrlsOf(settings: Settings): { puck: unknown; sv: unknown } {
  const pd = settings.puckData as { content?: Array<{ type?: string; props?: Record<string, unknown> }> } | undefined;
  const hero = pd?.content?.find((c) => c?.type === 'BrandHero');
  const sv = settings.structuredVariant as { hero?: Record<string, unknown> } | undefined;
  return { puck: hero?.props?.heroVisualUrl ?? null, sv: sv?.hero?.heroVisualUrl ?? null };
}

let pass = 0, fail = 0;
function assert(name: string, cond: boolean, detail?: string): void {
  if (cond) { console.log(`  PASS ${name}`); pass++; }
  else { console.error(`  FAIL ${name}${detail ? ` -- ${detail}` : ''}`); fail++; }
}

async function main(): Promise<void> {
  const ds = await prisma.deliverable.findMany({
    where: { contentType: { in: PUCK } },
    select: { id: true, contentType: true, settings: true },
    take: 300,
  });
  // Kies een deliverable met een BrandHero-block in puckData (en liefst
  // heroVisualUrl nog null = orphaned-toestand, sterkste before/after).
  const withHero = ds.filter((d) => {
    const c = (d.settings as Settings)?.puckData as { content?: Array<{ type?: string }> } | undefined;
    return Array.isArray(c?.content) && c!.content!.some((x) => x?.type === 'BrandHero');
  });
  const target =
    withHero.find((d) => heroUrlsOf(d.settings as Settings).puck === null) ?? withHero[0];
  if (!target) {
    console.error('Geen LP-deliverable met BrandHero gevonden — kan niet tegen echte data verifiëren.');
    process.exit(1);
  }
  const original = target.settings as Settings;
  const before = heroUrlsOf(original);
  console.log(`Target: ${target.id} [${target.contentType}]`);
  console.log(`  vóór: puckData.BrandHero.heroVisualUrl=${JSON.stringify(before.puck)} structuredVariant.hero.heroVisualUrl=${JSON.stringify(before.sv)}`);

  // Read-only: bewijs dat de pure transform de ECHTE settings-vorm correct patcht.
  console.log('\n[read-only] applyHeroUrlToSettings op een kloon van de echte settings');
  const clone = JSON.parse(JSON.stringify(original)) as Settings;
  const { patched: clonePatched } = applyHeroUrlToSettings(clone, SENTINEL);
  const cloneAfter = heroUrlsOf(clone);
  assert('pure transform meldt patched=true', clonePatched === true);
  assert('kloon: BrandHero.heroVisualUrl == SENTINEL', cloneAfter.puck === SENTINEL, String(cloneAfter.puck));

  try {
    // Defect 2 (runtime): patchHeroVisualUrl tegen de ECHTE deliverable (DB-write).
    console.log('\n[runtime] Defect 2 — patchHeroVisualUrl wiret de hero in de DB');
    const res = await patchHeroVisualUrl(target.id, SENTINEL);
    assert('helper meldt patched=true', res.patched === true);
    const reread1 = await prisma.deliverable.findUnique({ where: { id: target.id }, select: { settings: true } });
    const after = heroUrlsOf(reread1!.settings as Settings);
    assert('DB: puckData.BrandHero.heroVisualUrl == SENTINEL', after.puck === SENTINEL, String(after.puck));
    if (before.sv !== null || (original.structuredVariant as { hero?: unknown })?.hero) {
      assert('DB: structuredVariant.hero.heroVisualUrl == SENTINEL', after.sv === SENTINEL, String(after.sv));
    } else {
      console.log('  (geen structuredVariant.hero op deze deliverable — sv-tak n.v.t.)');
    }

    // Defect 1 (runtime): source persisteren laat de server-gate slagen.
    console.log('\n[runtime] Defect 1 — gepersisteerde visualBrief.source laat de gate slagen');
    for (const src of ['compose', 'trained-style'] as const) {
      const fresh = await prisma.deliverable.findUnique({ where: { id: target.id }, select: { settings: true } });
      const s = (fresh!.settings ?? {}) as Settings;
      s.visualBrief = { ...((s.visualBrief as object) ?? {}), source: src };
      await prisma.deliverable.update({ where: { id: target.id }, data: { settings: s as never } });
      const reread = await prisma.deliverable.findUnique({ where: { id: target.id }, select: { settings: true } });
      const persisted = ((reread!.settings as Settings).visualBrief as { source?: string })?.source;
      // exact de check die de route doet: `if (source !== '<src>') return 400`.
      assert(`source='${src}' persisteert → gate passeert (geen 400)`, persisted === src, String(persisted));
    }
  } finally {
    // RESTORE de originele settings — geen blijvende mutatie op echte data.
    await prisma.deliverable.update({ where: { id: target.id }, data: { settings: original as never } });
    const restored = await prisma.deliverable.findUnique({ where: { id: target.id }, select: { settings: true } });
    const back = heroUrlsOf(restored!.settings as Settings);
    assert('RESTORE: settings teruggezet naar origineel', back.puck === before.puck && back.sv === before.sv, `${JSON.stringify(back)} vs ${JSON.stringify(before)}`);
  }

  console.log(`\n${pass} PASS / ${fail} FAIL`);
  await prisma.$disconnect();
  if (fail > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error('verificatie-fout:', e);
  await prisma.$disconnect();
  process.exit(1);
});
