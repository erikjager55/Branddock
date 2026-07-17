// Smoke-harnas voor Brand Assistant quick-create (P3.0b).
//
// Run: node --env-file-if-exists=.env.local node_modules/.bin/tsx \
//        scripts/dev/assistant-quick-create-smoke.ts
// Env: SMOKE_WORKSPACE (name-contains, default "Better brands")
//      SMOKE_FULL=1 → óók de generate:true-run (echte AI-call)
//
// Test de chat-tool-laag: buildProposal (context-namen op de confirm-card),
// execute → headless service (default-campagne, settings, generated-vlag),
// en met SMOKE_FULL de volledige generate:true-flow die de user na een
// chat-confirm doorloopt.

import { prisma } from '../../src/lib/prisma';
import { getToolByName } from '../../src/lib/claw/tools/registry';

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
  const user = await prisma.user.findFirst({ select: { id: true } });
  if (!user) throw new Error('Geen user in dev-DB');
  const ctx = { workspaceId: workspace.id, userId: user.id };
  console.log(`Workspace: "${workspace.name}" (${workspace.id})\n`);

  const tool = getToolByName('create_deliverable');
  if (!tool) throw new Error('create_deliverable-tool niet gevonden in registry');
  assert(tool.requiresConfirmation === true, 'tool vereist confirmation (geen ongevraagde credit-uitgave)');

  const [persona, product] = await Promise.all([
    prisma.persona.findFirst({ where: { workspaceId: workspace.id }, select: { id: true, name: true } }),
    prisma.product.findFirst({ where: { workspaceId: workspace.id }, select: { id: true, name: true } }),
  ]);

  console.log('\n1. buildProposal — confirm-card toont default-campagne + generate + context-namen');
  const proposal = await tool.buildProposal?.(
    {
      contentType: 'linkedin-post',
      title: 'Quick-create smoke',
      brief: { objective: 'Proposal-check' },
      generate: true,
      contextSelection: {
        ...(persona ? { personaIds: [persona.id] } : {}),
        ...(product ? { productIds: [product.id] } : {}),
      },
    },
    ctx,
  );
  const changeMap = new Map((proposal?.changes ?? []).map((c) => [c.field, String(c.proposedValue)]));
  assert(changeMap.get('campaign') === 'Quick Content (default)', 'campagne-rij toont default');
  assert((changeMap.get('generate') ?? '').startsWith('yes'), 'generate-rij aanwezig');
  assert(
    !persona || (changeMap.get('context') ?? '').includes(persona.name),
    'context-rij bevat persona-naam',
  );

  console.log('\n2. execute generate:false — create-only via service');
  const createOnly = (await tool.execute(
    {
      contentType: 'linkedin-post',
      title: 'Quick-create smoke (create-only)',
      brief: { objective: 'Create-only pad' },
      generate: false,
    },
    ctx,
  )) as Record<string, unknown>;
  assert(createOnly.success === true, 'execute succes');
  assert(createOnly.generated === false, 'generated-vlag false (agents-route zou zelf genereren)');
  assert(createOnly.clientAction === 'navigate_to_canvas', 'clientAction navigate_to_canvas intact');
  const stored = await prisma.deliverable.findUnique({
    where: { id: String(createOnly.deliverableId) },
    select: { campaign: { select: { slug: true } } },
  });
  assert(stored?.campaign.slug === 'quick-content', 'item landde in default-campagne');

  console.log('\n3. execute zonder brief + generate:false — briefloos aanmaken mag (UI-pariteit)');
  const briefless = (await tool.execute(
    { contentType: 'linkedin-post', title: 'Quick-create smoke (briefloos)', generate: false },
    ctx,
  )) as Record<string, unknown>;
  assert(briefless.success === true, 'briefloze create-only slaagt');

  if (process.env.SMOKE_FULL === '1') {
    console.log('\n4. execute generate:true — de volledige chat-confirm-flow (echte AI-run)');
    const full = (await tool.execute(
      {
        contentType: 'linkedin-post',
        title: 'Quick-create smoke (full)',
        brief: {
          objective: 'Bewijs dat de chat-flow een afgemaakte on-brand post oplevert',
          keyMessage: 'Van chatzin naar gegenereerde post in één confirm',
        },
        generate: true,
        ...(persona ? { contextSelection: { personaIds: [persona.id] } } : {}),
      },
      ctx,
    )) as Record<string, unknown>;
    assert(full.success === true && full.generated === true, 'generated:true na echte run');
    assert(typeof full.fidelityScore === 'number', `F-VAL aanwezig (${String(full.fidelityScore)})`);
    assert(String(full.message).startsWith('Generated'), 'message meldt Generated');
    const components = await prisma.deliverableComponent.count({
      where: { deliverableId: String(full.deliverableId) },
    });
    assert(components > 0, `componenten gepersisteerd (${components})`);
  } else {
    console.log('\n4. generate:true overgeslagen (zet SMOKE_FULL=1 voor de echte AI-run)');
  }

  console.log('\nKlaar.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
