// Smoke-harnas voor de publieke Brand-API Fase A (P3.2, ADR 2026-07-17).
//
// Run (server moet draaien mét PUBLIC_API_ENABLED=true):
//   node --env-file-if-exists=.env.local node_modules/.bin/tsx \
//     scripts/dev/public-api-smoke.ts
// Env: SMOKE_BASE (default http://localhost:3005)
//      SMOKE_WORKSPACE_ID (default lokale "Better brands")
//      SMOKE_FULL=1 → óók /api/v1/generate met echte AI-run
//
// Dekt: key-lifecycle (create → use → revoke → 401), 401 zonder key,
// brand-context, score (echte F-VAL-run), generate, en de metadata-only
// ApiCallLog-rijen.

import { prisma } from '../../src/lib/prisma';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3005';
const AUTH_ORIGIN = 'http://localhost:3000';
const WORKSPACE_ID = process.env.SMOKE_WORKSPACE_ID ?? 'cmnomsobx009q44msn0gpw7vb';

function assert(cond: boolean, label: string): void {
  if (cond) {
    console.log(`  PASS — ${label}`);
  } else {
    console.error(`  FAIL — ${label}`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  // ── Sessie + workspace-cookie ─────────────────────────────────────────────
  const login = await fetch(`${BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: AUTH_ORIGIN },
    body: JSON.stringify({ email: 'erik@branddock.com', password: 'Password123!' }),
  });
  if (!login.ok) throw new Error(`Login faalde: ${login.status}`);
  const sessionCookie = login.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const orgs = (await (
    await fetch(`${BASE}/api/auth/organization/list`, { headers: { cookie: sessionCookie } })
  ).json()) as Array<{ id: string }>;
  await fetch(`${BASE}/api/auth/organization/set-active`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: AUTH_ORIGIN, cookie: sessionCookie },
    body: JSON.stringify({ organizationId: orgs[0]?.id }),
  });
  const cookie = `${sessionCookie}; branddock-workspace-id=${WORKSPACE_ID}`;

  // ── 1. Key-beheer ─────────────────────────────────────────────────────────
  console.log('1. Key-beheer (sessie, owner/admin)');
  const createRes = await fetch(`${BASE}/api/workspace/api-keys`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ name: 'public-api-smoke' }),
  });
  const created = (await createRes.json()) as { id: string; key?: string; keyPrefix?: string };
  assert(createRes.status === 200 && typeof created.key === 'string', 'key aangemaakt, eenmalig teruggegeven');
  const apiKey = created.key ?? '';
  const listRes = (await (
    await fetch(`${BASE}/api/workspace/api-keys`, { headers: { cookie } })
  ).json()) as { keys: Array<{ id: string; keyPrefix: string }> };
  assert(
    listRes.keys.some((k) => k.id === created.id) && !JSON.stringify(listRes.keys).includes(apiKey.slice(20)),
    'lijst toont key-metadata maar nooit het geheim',
  );

  // ── 2. Auth-gedrag ────────────────────────────────────────────────────────
  console.log('\n2. Auth-gedrag /api/v1');
  const noKey = await fetch(`${BASE}/api/v1/brand-context`);
  assert(noKey.status === 401, 'zonder key → 401');
  const badKey = await fetch(`${BASE}/api/v1/brand-context`, {
    headers: { authorization: `Bearer bd_live_${'0'.repeat(48)}` },
  });
  assert(badKey.status === 401, 'onbekende key → 401');

  // ── 3. brand-context ──────────────────────────────────────────────────────
  console.log('\n3. GET /api/v1/brand-context');
  const ctxRes = await fetch(`${BASE}/api/v1/brand-context`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  const ctxBody = (await ctxRes.json()) as { workspaceId?: string; context?: Record<string, unknown> };
  assert(ctxRes.status === 200, 'status 200');
  assert(ctxBody.workspaceId === WORKSPACE_ID, 'key resolvet naar de juiste workspace');
  assert(!!ctxBody.context && Object.keys(ctxBody.context).length > 0, 'context-block gevuld');

  // ── 4. score (echte F-VAL-run) ────────────────────────────────────────────
  console.log('\n4. POST /api/v1/score');
  const sample =
    'Wij helpen ambitieuze merken om hun verhaal consistent te vertellen. ' +
    'Van strategie tot uitvoering bouwen we aan herkenbare communicatie die klanten raakt. ' +
    'Onze aanpak combineert data met creativiteit zodat elke uiting bijdraagt aan het merk. ' +
    'Zo groeit niet alleen de zichtbaarheid maar ook het vertrouwen in wat het merk belooft.';
  const tooShort = await fetch(`${BASE}/api/v1/score`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ content: 'te kort' }),
  });
  assert(tooShort.status === 400, 'te korte content → 400');
  const scoreRes = await fetch(`${BASE}/api/v1/score`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ content: sample }),
  });
  const scoreBody = (await scoreRes.json()) as {
    result?: { compositeScore?: number };
    findingsCount?: number;
  };
  assert(scoreRes.status === 200, 'status 200');
  assert(typeof scoreBody.result?.compositeScore === 'number', `compositeScore aanwezig (${scoreBody.result?.compositeScore})`);

  // ── 5. generate ───────────────────────────────────────────────────────────
  if (process.env.SMOKE_FULL === '1') {
    console.log('\n5. POST /api/v1/generate (echte AI-run)');
    const genRes = await fetch(`${BASE}/api/v1/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        contentType: 'linkedin-post',
        title: 'Public API smoke',
        brief: { objective: 'Bewijs de publieke generate-route end-to-end', keyMessage: 'Eén API-call, on-brand resultaat' },
      }),
    });
    const genBody = (await genRes.json()) as {
      deliverableId?: string;
      generated?: boolean;
      fidelityScore?: number | null;
    };
    assert(genRes.status === 200 && genBody.generated === true, 'generated:true');
    assert(typeof genBody.fidelityScore === 'number', `F-VAL aanwezig (${String(genBody.fidelityScore)})`);
    const components = await prisma.deliverableComponent.count({
      where: { deliverableId: String(genBody.deliverableId) },
    });
    assert(components > 0, `componenten gepersisteerd (${components})`);
  } else {
    console.log('\n5. POST /api/v1/generate met generate:false (zet SMOKE_FULL=1 voor echte run)');
    const genRes = await fetch(`${BASE}/api/v1/generate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        contentType: 'linkedin-post',
        title: 'Public API smoke (create-only)',
        brief: { objective: 'Route-check' },
        generate: false,
      }),
    });
    const genBody = (await genRes.json()) as { generated?: boolean; deliverableId?: string };
    assert(genRes.status === 200 && genBody.generated === false, 'create-only via route werkt');
  }

  // ── 6. Usage-log metadata-only ────────────────────────────────────────────
  console.log('\n6. ApiCallLog');
  const logs = await prisma.apiCallLog.findMany({
    where: { workspaceId: WORKSPACE_ID },
    orderBy: { createdAt: 'desc' },
    take: 5,
    select: { tool: true, authVia: true, success: true, latencyMs: true, credits: true },
  });
  assert(logs.length >= 3, `usage-rijen gelogd (${logs.length})`);
  assert(
    logs.every((l) => l.authVia === 'api_key' && typeof l.latencyMs === 'number'),
    'metadata-only velden gevuld (geen content-kolommen aanwezig in model)',
  );

  // ── 7. Revoke ─────────────────────────────────────────────────────────────
  console.log('\n7. Revoke');
  const revoke = await fetch(`${BASE}/api/workspace/api-keys`, {
    method: 'DELETE',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ id: created.id }),
  });
  assert(revoke.status === 200, 'revoke 200');
  const afterRevoke = await fetch(`${BASE}/api/v1/brand-context`, {
    headers: { authorization: `Bearer ${apiKey}` },
  });
  assert(afterRevoke.status === 401, 'ingetrokken key → 401');

  console.log('\nKlaar.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
