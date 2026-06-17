/**
 * Smoke: knowledge-context priority framing + per-item note (task
 * knowledge-context-priority-annotation-preselect, wens 2 + 3).
 * Asserts serializeContextForPrompt:
 *  - emits "## PRIORITY SOURCE MATERIAL" (ground-in framing) for a primary item;
 *  - falls back to the unchanged "## ADDITIONAL CONTEXT ... shared for discussion"
 *    for reference-only items (regression guard for golden sets);
 *  - renders a per-item note as "**User guidance on this source:**";
 *  - never double-stacks the heading.
 * Run: DATABASE_URL=... npx tsx scripts/smoke-tests/context-priority.ts
 */
import { prisma } from '@/lib/prisma';
import { serializeContextForPrompt } from '@/lib/ai/context/fetcher';

async function main() {
  let pass = 0;
  let fail = 0;
  const ok = (label: string, cond: boolean) => {
    console.log(`  ${cond ? 'PASS' : 'FAIL'} ${label}`);
    cond ? pass++ : fail++;
  };

  const res = await prisma.knowledgeResource.findFirst({ select: { id: true, workspaceId: true, title: true } });
  if (!res) {
    console.log('  SKIP — no KnowledgeResource rows in DB to exercise serialization');
    console.log('\nTotal: 0 | PASS: 0 | FAIL: 0');
    await prisma.$disconnect();
    return;
  }

  const NOTE = 'BRANDDOCK-NOTE emphasize the contrast with the status quo';

  // (a) primary + note → PRIORITY framing + guidance line
  const primary = await serializeContextForPrompt(
    [{ sourceType: 'knowledge_resource', sourceId: res.id, priority: 'primary', note: NOTE }],
    res.workspaceId,
  );
  ok('primary item emits PRIORITY SOURCE MATERIAL heading', primary.includes('## PRIORITY SOURCE MATERIAL'));
  ok('primary framing says ground your output in it', /ground your output in it/i.test(primary));
  ok('note renders as User guidance on this source', primary.includes('**User guidance on this source:**') && primary.includes(NOTE));
  ok('primary block does NOT use the discussion framing', !primary.includes('shared with you for discussion'));

  // (b) reference (default) → unchanged ADDITIONAL CONTEXT framing, no PRIORITY block
  const reference = await serializeContextForPrompt(
    [{ sourceType: 'knowledge_resource', sourceId: res.id }],
    res.workspaceId,
  );
  ok('reference item keeps ## ADDITIONAL CONTEXT framing', reference.includes('## ADDITIONAL CONTEXT'));
  ok('reference item keeps "shared ... for discussion" (golden-set regression guard)', reference.includes('shared with you for discussion'));
  ok('reference item produces NO PRIORITY heading', !reference.includes('## PRIORITY SOURCE MATERIAL'));

  // (c) no accidental double heading
  const priorityHeadingCount = (primary.match(/## PRIORITY SOURCE MATERIAL/g) || []).length;
  const additionalHeadingCount = (reference.match(/## ADDITIONAL CONTEXT/g) || []).length;
  ok('single PRIORITY heading (no double-stack)', priorityHeadingCount === 1);
  ok('single ADDITIONAL CONTEXT heading (no double-stack)', additionalHeadingCount === 1);

  console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
