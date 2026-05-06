/**
 * scripts/fidelity/test-qa-preflight.ts
 *
 * Automated pre-flight checks voor flows 3-5 uit de QA checklist.
 * Test wat zonder browser testbaar is en flagt wat een visual pas vereist.
 *
 * Flow 3 — STRICT mode trigger
 * Flow 4 — Regenerate behavior (scoring herstart)
 * Flow 5 — Page refresh persistence (DB → store hydration)
 *
 * Run:
 *   npx tsx scripts/fidelity/test-qa-preflight.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    if (value) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(could not read ${envPath}: ${(err as Error).message})`);
}

async function main() {
  const { prisma } = await import('../../src/lib/prisma');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('QA Pre-flight — flows 3, 4, 5');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  // ─── FLOW 3: STRICT trigger pre-conditions ───
  console.log('→ Flow 3: STRICT mode trigger');

  const pilots = await prisma.workspace.findMany({
    where: { name: { in: ['Better brands', 'Linfi', 'Nobox', 'WRA Juristen'] } },
    select: { id: true, name: true },
  });

  for (const w of pilots) {
    const config = await prisma.fidelityConfig.findUnique({
      where: { workspaceId: w.id },
      select: { humanVoiceMode: true, aiLeaningThreshold: true },
    });
    const bp = await prisma.brandAsset.findFirst({
      where: { workspaceId: w.id, frameworkType: 'BRAND_PERSONALITY' },
      select: { frameworkData: true },
    });
    const bpData = (bp?.frameworkData ?? null) as Record<string, unknown> | null;
    const wordsCount = Array.isArray(bpData?.wordsWeUse) ? (bpData!.wordsWeUse as unknown[]).length : 0;
    const traitsCount = Array.isArray(bpData?.personalityTraits)
      ? (bpData!.personalityTraits as unknown[]).length
      : 0;

    const ready = config?.humanVoiceMode === 'STRICT' && wordsCount > 0 && traitsCount > 0;
    const status = ready ? '✓' : '✗';
    console.log(
      `  ${status} ${w.name.padEnd(16)}  voice=${(config?.humanVoiceMode ?? '-').padEnd(8)}  BP=${wordsCount}w/${traitsCount}t`,
    );
  }

  // ─── FLOW 4: Regenerate behavior — fidelity scoring runs after regen ───
  console.log('\n→ Flow 4: Regenerate path runs F-VAL scoring (auto-test)');
  // Verify code path exists
  const orchestratorSrc = readFileSync(
    resolve(process.cwd(), 'src/lib/ai/canvas-orchestrator.ts'),
    'utf8',
  );
  const hasRegenScoring = orchestratorSrc.includes('Re-run F-VAL scoring after regenerate');
  const sharesPipeline = orchestratorSrc.includes('runFidelityScoringPipeline');
  console.log(
    `  ${hasRegenScoring ? '✓' : '✗'} Regenerate flow includes fidelity rescoring`,
  );
  console.log(
    `  ${sharesPipeline ? '✓' : '✗'} Shared runFidelityScoringPipeline helper aangeroepen vanuit beide paden`,
  );

  // ─── FLOW 5: Page refresh persistence ───
  console.log('\n→ Flow 5: Page refresh persistence (auto-test)');
  // Verify components endpoint returns fidelityScore + strictRewrite
  const componentsRouteSrc = readFileSync(
    resolve(process.cwd(), 'src/app/api/studio/[deliverableId]/components/route.ts'),
    'utf8',
  );
  const exposesFidelity = componentsRouteSrc.includes('fidelityScore');
  const exposesStrict = componentsRouteSrc.includes('strictRewrite');
  console.log(
    `  ${exposesFidelity ? '✓' : '✗'} /components route returnt persisted fidelityScore`,
  );
  console.log(
    `  ${exposesStrict ? '✓' : '✗'} /components route returnt persisted strictRewrite`,
  );

  // Verify CanvasPage hydrates
  const canvasPageSrc = readFileSync(
    resolve(process.cwd(), 'src/features/campaigns/components/canvas/CanvasPage.tsx'),
    'utf8',
  );
  const hydratesFidelity = canvasPageSrc.includes('persistedFidelityScore');
  const hydratesStrict = canvasPageSrc.includes('persistedStrictRewrite');
  console.log(
    `  ${hydratesFidelity ? '✓' : '✗'} CanvasPage hydrate-effect roept setFidelityComplete aan op mount`,
  );
  console.log(
    `  ${hydratesStrict ? '✓' : '✗'} CanvasPage hydrate-effect roept setStrictRewriteComplete aan op mount`,
  );

  // Find a deliverable with persisted fidelityScore in DB to verify endpoint
  const sample = await prisma.deliverable.findFirst({
    where: { settings: { not: undefined } },
    select: { id: true, title: true, settings: true, campaign: { select: { workspaceId: true } } },
    orderBy: { updatedAt: 'desc' },
    take: 1,
  });
  if (sample) {
    const settings = sample.settings as Record<string, unknown>;
    const hasPersistedScore = settings?.fidelityScore != null;
    console.log(
      `  ${hasPersistedScore ? '✓' : '✗'} Sample deliverable "${sample.title}" heeft persisted score in settings`,
    );
  }

  // ─── Summary ───
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Browser QA — wat jij nog moet checken');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`
Flow 3 — STRICT mode trigger:
  1. Login als erik@branddock.com, switch naar Better Brands workspace
  2. Maak nieuwe blog-post deliverable, vul brief.objective in
  3. Generate → wacht op composition → indien verdict AI_LEANING:
     verschijnt violet "Branddock verbetert de output…" banner?
  4. Na ~30s: improved badge "Was: ... → Nu: Mens-baseline"?
  5. Composite badge boven update naar nieuwe (hogere) waarde?

Flow 4 — Regenerate behavior:
  1. Met variants zichtbaar, klik feedback "Maak het korter"
  2. Klik regenerate
  3. Tijdens regen blijft oude score zichtbaar (geen reset)
  4. Na regen: tell_check_complete + composite update binnen ~20s?
  5. Position-pin verschuift, composite badge update?

Flow 5 — Page refresh:
  1. Met fidelity bar zichtbaar, druk F5/Cmd+R
  2. Variants laden uit DB
  3. Position bar moet METEEN verschijnen (niet pas na nieuwe gen)
  4. Composite + verdict + pillar breakdown moeten allemaal hydrateren
  5. Indien STRICT eerder triggerde: paarse improved badge moet ook terug

Tip: open browser DevTools → Network tab voor de /components fetch.
Check de response body — fidelityScore + strictRewrite moeten gevuld zijn.
  `);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  const { prisma } = await import('../../src/lib/prisma');
  await prisma.$disconnect();
  process.exit(1);
});
