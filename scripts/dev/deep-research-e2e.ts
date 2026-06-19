/**
 * E2E-smoke voor de Deep Research-feature tegen de LIVE dev-server (deze branch).
 * Mint een sessie-cookie en loopt de volledige HTTP-keten die de UI gebruikt:
 *   1. auth-check (GET /api/workspaces)
 *   2. POST .../deep-research/clarify  → 2-3 vragen
 *   3. POST .../deep-research/run (SSE) → fase/source/complete-events + rapport
 *   4. POST /api/knowledge-resources   → opslaan als RESEARCH/DEEP_RESEARCH (201)
 *   5. GET  /api/knowledge-resources/:id → content/aiSummary/aiKeyTakeaways terug
 *   6. DELETE opruimen
 *
 * Vereist een draaiende dev-server met DEZE branch-code (echte Gemini+Anthropic).
 * Run: BASE=http://localhost:3001 WS=<workspaceId> \
 *   npx tsx --env-file=.env.local scripts/dev/deep-research-e2e.ts
 */
import { prisma } from '../../src/lib/prisma';
import { makeSignature } from 'better-auth/crypto';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const WORKSPACE_ID = process.env.WS ?? 'cmn8wsls0000snamsnaetnuny';

interface DREvent { type: string; [k: string]: unknown }

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean) => { console.log(`  ${cond ? 'PASS' : 'FAIL'} ${label}`); cond ? pass++ : fail++; };

async function main(): Promise<void> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET ontbreekt — draai met --env-file=.env.local');

  const ws = await prisma.workspace.findUnique({ where: { id: WORKSPACE_ID }, select: { organizationId: true, name: true } });
  if (!ws) throw new Error(`Workspace ${WORKSPACE_ID} niet gevonden`);
  const members = await prisma.organizationMember.findMany({ where: { organizationId: ws.organizationId }, select: { userId: true } });
  const sess = await prisma.session.findFirst({
    where: { userId: { in: members.map((m) => m.userId) }, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' }, select: { token: true },
  });
  if (!sess) throw new Error('Geen geldige sessie voor een org-member');
  const signed = `${sess.token}.${await makeSignature(sess.token, secret)}`;
  const Cookie = `better-auth.session_token=${signed}; branddock-workspace-id=${WORKSPACE_ID}`;
  console.log(`workspace: ${ws.name} (${WORKSPACE_ID}) @ ${BASE}\n`);

  // 1. auth-check
  const auth = await fetch(`${BASE}/api/workspaces`, { headers: { Cookie } });
  ok(`auth-check GET /api/workspaces → 200 (was ${auth.status})`, auth.ok);
  if (!auth.ok) throw new Error('Cookie authenticeert niet');

  const topic = 'How are mid-market B2B SaaS brands using AI in their content marketing workflows in 2026?';

  // 2. clarify
  console.log('\n[clarify]…');
  const clarRes = await fetch(`${BASE}/api/knowledge-resources/deep-research/clarify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie }, body: JSON.stringify({ topic }),
  });
  ok(`clarify → 200 (was ${clarRes.status})`, clarRes.ok);
  const clar = (await clarRes.json()) as { questions?: Array<{ id: string; question: string }> };
  const questions = clar.questions ?? [];
  ok(`clarify levert 2-3 vragen (${questions.length})`, questions.length >= 2 && questions.length <= 3);
  questions.forEach((q) => console.log(`    Q: ${q.question}`));

  // 3. run (SSE)
  console.log('\n[run SSE] (~1-3 min, echte Gemini+Anthropic)…');
  const answers = questions.map((q) => ({ id: q.id, question: q.question, answer: 'Europe/Benelux mid-market B2B SaaS; practical workflows, not hype' }));
  const t0 = Date.now();
  const runRes = await fetch(`${BASE}/api/knowledge-resources/deep-research/run`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie }, body: JSON.stringify({ topic, answers }),
  });
  ok(`run → 200 text/event-stream (was ${runRes.status} ${runRes.headers.get('content-type')})`, runRes.ok && !!runRes.body);
  const events: DREvent[] = [];
  const decoder = new TextDecoder();
  let buf = '';
  const reader = (runRes.body as ReadableStream<Uint8Array>).getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const parts = buf.split('\n\n'); buf = parts.pop() ?? '';
    for (const p of parts) for (const line of p.split('\n')) {
      const t = line.trim();
      if (!t.startsWith('data:')) continue;
      const payload = t.slice(5).trim();
      if (!payload || payload === '[DONE]') continue;
      try { events.push(JSON.parse(payload) as DREvent); } catch { /* skip */ }
    }
  }
  const secs = Math.round((Date.now() - t0) / 1000);
  const phases = events.filter((e) => e.type === 'phase');
  const sources = events.filter((e) => e.type === 'source');
  const complete = events.find((e) => e.type === 'complete');
  const errorEv = events.find((e) => e.type === 'error');
  console.log(`    ${secs}s · ${events.length} events · ${phases.length} phase · ${sources.length} source`);
  ok('geen error-event', !errorEv);
  ok('phase-events voor alle 6 fasen (start)', new Set(phases.filter((e) => (e as DREvent).status === 'start').map((e) => e.phase)).size === 6);
  ok('>=1 source-event', sources.length >= 1);
  ok('precies 1 complete-event', events.filter((e) => e.type === 'complete').length === 1);
  const report = (complete?.report ?? {}) as { markdown?: string; suggestedTitle?: string; suggestedCategory?: string; suggestedTags?: string[]; summary?: string; keyTakeaways?: string[]; sources?: Array<{ index: number; url: string; used: boolean }> };
  ok('rapport heeft markdown (>500 chars)', (report.markdown?.length ?? 0) > 500);
  ok('rapport heeft `## Sources`-sectie', /^##\s+Sources\s*$/im.test(report.markdown ?? ''));
  ok('rapport heeft suggestedTitle + categorie', !!report.suggestedTitle && !!report.suggestedCategory);
  console.log(`    title: "${report.suggestedTitle}" | cat: ${report.suggestedCategory} | tags: ${(report.suggestedTags ?? []).join(', ')}`);
  console.log(`    sources: ${(report.sources ?? []).length} (used: ${(report.sources ?? []).filter((s) => s.used).length})`);

  // 4. save
  console.log('\n[save]…');
  const saveRes = await fetch(`${BASE}/api/knowledge-resources`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Cookie },
    body: JSON.stringify({
      title: report.suggestedTitle ?? 'E2E Deep Research', author: 'Deep Research',
      category: report.suggestedCategory ?? 'Research', type: 'RESEARCH', url: '',
      description: (report.summary ?? '').slice(0, 3000) || undefined,
      tags: report.suggestedTags ?? [], content: report.markdown, aiSummary: report.summary,
      aiKeyTakeaways: report.keyTakeaways, source: 'DEEP_RESEARCH',
      importedMetadata: { sources: report.sources, topic },
    }),
  });
  ok(`save → 201 (was ${saveRes.status})`, saveRes.status === 201);
  const saved = (await saveRes.json()) as { id?: string; type?: string };
  ok('opgeslagen resource type=RESEARCH', saved.type === 'RESEARCH');

  // 5. detail
  if (saved.id) {
    const detRes = await fetch(`${BASE}/api/knowledge-resources/${saved.id}`, { headers: { Cookie } });
    ok(`detail → 200 (was ${detRes.status})`, detRes.ok);
    const det = (await detRes.json()) as { content?: string | null; aiSummary?: string | null; aiKeyTakeaways?: string[] | null };
    ok('detail geeft content terug (viewer-bron)', (det.content?.length ?? 0) > 500);
    ok('detail geeft aiKeyTakeaways terug', Array.isArray(det.aiKeyTakeaways));

    // 6. cleanup
    const del = await fetch(`${BASE}/api/knowledge-resources/${saved.id}`, { method: 'DELETE', headers: { Cookie } });
    console.log(`\n[cleanup] DELETE → ${del.status}`);
  }

  console.log(`\nTotal: ${pass + fail} | PASS: ${pass} | FAIL: ${fail}`);
  await prisma.$disconnect();
  process.exit(fail > 0 ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
