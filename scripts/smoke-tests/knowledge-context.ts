/**
 * One-off verification for the knowledge-context feature (knowledge-context-inline-add).
 * - F3: getAvailableContextItems emits the knowledge_resource group even when empty.
 * - F2: the serializer surfaces `content` via the 'fulltext' hint beyond 500 chars.
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/knowledge-context.ts
 */
import { prisma } from '@/lib/prisma';
import { getAvailableContextItems } from '@/lib/ai/context/fetcher';
import { serializeToText } from '@/lib/ai/context/serializer';
import { CONTEXT_REGISTRY } from '@/lib/ai/context/registry';

async function main() {
  let pass = 0;
  let fail = 0;
  const ok = (label: string, cond: boolean) => {
    console.log(`  ${cond ? 'PASS' : 'FAIL'} ${label}`);
    cond ? pass++ : fail++;
  };

  // ── F3: group emission (empty + populated workspaces) ──
  const wsWithKnowledge = await prisma.knowledgeResource.findFirst({ select: { workspaceId: true } });
  const wsEmpty = await prisma.workspace.findFirst({
    where: { knowledgeResources: { none: {} } },
    select: { id: true, name: true },
  });

  if (wsWithKnowledge) {
    const groups = await getAvailableContextItems(wsWithKnowledge.workspaceId);
    const kg = groups.find((g) => g.key === 'knowledge_resource');
    ok('populated ws: knowledge_resource group present', !!kg);
    ok('populated ws: group has items', !!kg && kg.items.length > 0);
    console.log(`     → ${kg?.items.length ?? 0} knowledge items in ${wsWithKnowledge.workspaceId}`);
  } else {
    console.log('  SKIP populated-ws check (no KnowledgeResource rows in DB)');
  }

  if (wsEmpty) {
    const groups = await getAvailableContextItems(wsEmpty.id);
    const kg = groups.find((g) => g.key === 'knowledge_resource');
    ok('empty ws: knowledge_resource group STILL present (not silently dropped)', !!kg);
    ok('empty ws: group is empty', !!kg && kg.items.length === 0);
    console.log(`     → workspace "${wsEmpty.name}" groups: ${groups.map((g) => `${g.key}(${g.items.length})`).join(', ')}`);
  } else {
    console.log('  SKIP empty-ws check (every workspace has knowledge rows)');
  }

  // ── F2: serializer 'fulltext' surfaces content beyond 500 chars ──
  const config = CONTEXT_REGISTRY.find((c) => c.key === 'knowledge_resource')!;
  const longBody = 'BRANDDOCK-MARKER ' + 'lorem ipsum dolor sit amet. '.repeat(120); // ~3.3k chars
  const text = serializeToText({
    config,
    record: {
      id: 'x', title: 'Test Whitepaper', description: 'A test resource',
      content: longBody, url: 'https://example.com', type: 'WEBSITE',
      category: 'Content', status: 'active', author: 'Manual',
      aiSummary: 'SHOULD-NOT-APPEAR', rating: 4.5,
    },
  });
  ok('serializer emits the Content field label', text.includes('**Content:**'));
  ok('serializer keeps >500 chars of content (fulltext budget)', text.length > 1500);
  ok('serializer excludes legacy aiSummary noise', !text.includes('SHOULD-NOT-APPEAR'));
  ok('serializer still includes url + title', text.includes('Test Whitepaper') && text.includes('example.com'));
  console.log(`     → serialized length: ${text.length} chars (record cap ${config.maxSerializedLength})`);

  console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
