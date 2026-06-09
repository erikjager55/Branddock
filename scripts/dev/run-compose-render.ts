/**
 * One-off: draait de ECHTE compose-generatie (fal.ai) tegen een landingspagina-
 * deliverable via de live dev-server-routes, met een geldige (gesigneerde)
 * sessie-cookie. Bewijst de image-source-fix #314 end-to-end mét AI-call:
 * gate passeert (geen 400) + de gegenereerde hero landt in puckData.BrandHero.
 *
 * Run: npx tsx --env-file=.env.local scripts/dev/run-compose-render.ts
 */
import { prisma } from '../../src/lib/prisma';
import { makeSignature } from 'better-auth/crypto';

const BASE = 'http://localhost:3000';
const DELIV = 'cmpk9hwma0000bpmsmayrp66t';
// 1 HERO_IMAGE + 2 LIFESTYLE refs uit de Linfi-workspace.
const REFS = ['cmnykjx1u001frbmsqh03nltv', 'cmnykjx9a001hrbmslhyk4hnf', 'cmnykjxfn001jrbmsgou6ys4h'];
const INSTRUCTION =
  'Een heldere, lichte hero-foto van een glazen vloerluik in een modern Nederlands interieur — daglicht, architecturaal, schoon gecomponeerd.';

type Settings = Record<string, unknown>;
function heroUrl(settings: Settings): unknown {
  const pd = settings.puckData as { content?: Array<{ type?: string; props?: Record<string, unknown> }> } | undefined;
  return pd?.content?.find((c) => c?.type === 'BrandHero')?.props?.heroVisualUrl ?? null;
}

async function main(): Promise<void> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET ontbreekt — draai met --env-file=.env.local');

  // Sessie van een user die LID is van de org van deze deliverable (anders 403/404).
  const dRow = await prisma.deliverable.findUnique({
    where: { id: DELIV },
    select: { campaign: { select: { workspaceId: true, workspace: { select: { organizationId: true } } } } },
  });
  const orgId = dRow!.campaign.workspace.organizationId;
  const workspaceId = dRow!.campaign.workspaceId;
  const members = await prisma.organizationMember.findMany({ where: { organizationId: orgId }, select: { userId: true } });
  const userIds = members.map((m) => m.userId);
  const sess = await prisma.session.findFirst({
    where: { userId: { in: userIds }, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' },
    select: { token: true, userId: true },
  });
  if (!sess) throw new Error(`Geen geldige sessie voor een member van org ${orgId}.`);
  console.log(`sessie-user: ${sess.userId} (org ${orgId})`);
  const signed = `${sess.token}.${await makeSignature(sess.token, secret)}`;
  // Expliciete workspace-cookie → resolveWorkspaceId kiest de Linfi-workspace
  // (membership wordt server-side gevalideerd) zodat de deliverable-access klopt.
  const cookie = `better-auth.session_token=${signed}; branddock-workspace-id=${workspaceId}`;

  // Auth-check tegen een bestaand endpoint.
  const authCheck = await fetch(`${BASE}/api/workspaces`, { headers: { Cookie: cookie } });
  console.log(`auth-check /api/workspaces → HTTP ${authCheck.status}`);
  if (!authCheck.ok) throw new Error('Cookie authenticeert niet — secret/cookie-naam mismatch.');

  const beforeRow = await prisma.deliverable.findUnique({ where: { id: DELIV }, select: { settings: true } });
  console.log(`vóór: heroVisualUrl = ${JSON.stringify(heroUrl((beforeRow!.settings ?? {}) as Settings))}`);

  // Stap 1 — compose-brief + source via de ECHTE PATCH-route (gate-fix-pad).
  const patch = await fetch(`${BASE}/api/studio/${DELIV}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      settings: { visualBrief: { source: 'compose', compose: { referenceIds: REFS, instruction: INSTRUCTION } } },
    }),
  });
  console.log(`PATCH visualBrief (source=compose) → HTTP ${patch.status}`);

  // Stap 2 — ECHTE compose-generatie met target:'hero'.
  console.log('generate-visual-compose draait (fal.ai, ~10-30s)…');
  const gen = await fetch(`${BASE}/api/studio/${DELIV}/generate-visual-compose`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ target: 'hero' }),
  });
  const genBody = await gen.json().catch(() => ({}));
  console.log(`generate-visual-compose → HTTP ${gen.status}`);
  console.log('respons:', JSON.stringify(genBody).slice(0, 500));

  // Stap 3 — bevestig dat de hero in puckData landde.
  const afterRow = await prisma.deliverable.findUnique({ where: { id: DELIV }, select: { settings: true } });
  const after = heroUrl((afterRow!.settings ?? {}) as Settings);
  console.log(`\nná: heroVisualUrl = ${JSON.stringify(after)}`);
  const landed = typeof after === 'string' && after.length > 0;
  console.log(landed ? 'RESULTAAT: ✅ hero gewired in puckData.BrandHero' : 'RESULTAAT: ❌ hero NIET gewired');

  await prisma.$disconnect();
  if (!gen.ok || !landed) process.exit(1);
}

main().catch(async (e) => {
  console.error('fout:', e);
  await prisma.$disconnect();
  process.exit(1);
});
