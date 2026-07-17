// Smoke-harnas voor de headless content-service (P3.0a).
//
// Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
//        scripts/dev/headless-create-smoke.ts
// Env: SMOKE_WORKSPACE (name-contains, default "Better brands")
//      SMOKE_FULL=1  → óók een echte generatie-run (kost AI-calls; de enige
//                      manier om de hele keten te bewijzen — zie gotcha
//                      2026-07-12 "pas gefixt na een echte run")
//
// Valideert: default-campagne find-or-create, settings-persistentie van
// contextSelection, de drie pre-gates, en (met SMOKE_FULL) de volledige
// create+generate-keten incl. componenten + F-VAL-score.

import { prisma } from '../../src/lib/prisma';
import { createAndGenerateDeliverable } from '../../src/lib/content/headless-create';

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  PASS — ${label}`);
  } else {
    console.error(`  FAIL — ${label}`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const nameContains = process.env.SMOKE_WORKSPACE ?? 'Better brands';
  const workspace = await prisma.workspace.findFirst({
    where: { name: { contains: nameContains, mode: 'insensitive' } },
    select: { id: true, name: true },
  });
  if (!workspace) throw new Error(`Geen workspace met naam ~"${nameContains}"`);
  console.log(`Workspace: "${workspace.name}" (${workspace.id})\n`);

  console.log('1. Pre-gates');
  const noBrief = await createAndGenerateDeliverable({
    workspaceId: workspace.id,
    contentType: 'linkedin-post',
    brief: {},
  });
  assert(!noBrief.ok && noBrief.code === 'BRIEF_INCOMPLETE', 'lege brief → BRIEF_INCOMPLETE');

  const badType = await createAndGenerateDeliverable({
    workspaceId: workspace.id,
    contentType: 'bestaat-niet-xyz',
    brief: { objective: 'test' },
  });
  assert(!badType.ok && badType.code === 'CONTENT_TYPE_UNKNOWN', 'onbekend type → CONTENT_TYPE_UNKNOWN');

  const badIds = await createAndGenerateDeliverable({
    workspaceId: workspace.id,
    contentType: 'linkedin-post',
    brief: { objective: 'test' },
    contextSelection: { personaIds: ['nep-persona-id'] },
    generate: false,
  });
  assert(!badIds.ok && badIds.code === 'CONTEXT_IDS_INVALID', 'onbekend persona-id → CONTEXT_IDS_INVALID');

  console.log('\n2. Create zonder campaignId (default-campagne) + contextSelection-persistentie');
  const [persona, product, competitor] = await Promise.all([
    prisma.persona.findFirst({ where: { workspaceId: workspace.id }, select: { id: true, name: true } }),
    prisma.product.findFirst({ where: { workspaceId: workspace.id }, select: { id: true, name: true } }),
    prisma.competitor.findFirst({ where: { workspaceId: workspace.id }, select: { id: true, name: true } }),
  ]);
  console.log(
    `  context: persona=${persona?.name ?? '—'} product=${product?.name ?? '—'} competitor=${competitor?.name ?? '—'}`,
  );

  const created = await createAndGenerateDeliverable({
    workspaceId: workspace.id,
    contentType: 'linkedin-post',
    title: 'Headless smoke (create-only)',
    brief: { objective: 'Smoke-test van de headless service', keyMessage: 'Eén functie-aanroep volstaat' },
    contextSelection: {
      ...(persona ? { personaIds: [persona.id] } : {}),
      ...(product ? { productIds: [product.id] } : {}),
      ...(competitor ? { competitorIds: [competitor.id] } : {}),
    },
    generate: false,
  });
  if (!created.ok) throw new Error(`create-only faalde: ${created.error}`);

  const stored = await prisma.deliverable.findUnique({
    where: { id: created.deliverableId },
    select: { settings: true, campaign: { select: { slug: true, type: true, workspaceId: true } } },
  });
  const settings = (stored?.settings ?? {}) as Record<string, unknown>;
  const items = (settings.additionalContextItems ?? []) as Array<{ sourceType: string; sourceId: string }>;
  assert(stored?.campaign.slug === 'quick-content' && stored.campaign.type === 'CONTENT', 'default-campagne quick-content/CONTENT gebruikt');
  assert(stored?.campaign.workspaceId === workspace.id, 'campagne in juiste workspace');
  assert(
    !persona || (Array.isArray(settings.targetPersonas) && (settings.targetPersonas as string[]).includes(persona.id)),
    'personaId in settings.targetPersonas',
  );
  assert(
    !product || (settings.contentTypeInputs as Record<string, unknown> | undefined)?.productId === product.id,
    'productId in settings.contentTypeInputs',
  );
  assert(
    !competitor || items.some((i) => i.sourceType === 'competitor' && i.sourceId === competitor.id),
    'competitor in settings.additionalContextItems',
  );

  const second = await createAndGenerateDeliverable({
    workspaceId: workspace.id,
    contentType: 'linkedin-post',
    title: 'Headless smoke (tweede — zelfde default-campagne)',
    brief: { objective: 'Idempotentie-check default-campagne' },
    generate: false,
  });
  assert(second.ok && second.campaignId === created.campaignId, 'tweede aanroep hergebruikt dezelfde default-campagne');

  if (process.env.SMOKE_FULL === '1') {
    console.log('\n3. Volledige create+generate (echte AI-run)');
    const full = await createAndGenerateDeliverable({
      workspaceId: workspace.id,
      contentType: 'linkedin-post',
      title: 'Headless smoke (full generate)',
      brief: {
        objective: 'Laat zien dat één headless aanroep een compleet on-brand content-item oplevert',
        keyMessage: 'Van API-call naar gegenereerde post zonder UI',
      },
      ...(persona ? { contextSelection: { personaIds: [persona.id] } } : {}),
    });
    if (!full.ok) throw new Error(`full generate faalde: ${full.error}`);
    console.log(`  deliverable: ${full.deliverableId} · fidelity: ${full.fidelityScore} · error: ${full.generationError}`);
    const components = await prisma.deliverableComponent.count({ where: { deliverableId: full.deliverableId } });
    assert(full.generationError === null, 'generatie zonder error');
    assert(components > 0, `componenten gepersisteerd (${components})`);
    assert(typeof full.fidelityScore === 'number', 'F-VAL-score aanwezig');
  } else {
    console.log('\n3. Volledige generate overgeslagen (zet SMOKE_FULL=1 voor de echte AI-run)');
  }

  console.log('\nKlaar.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
