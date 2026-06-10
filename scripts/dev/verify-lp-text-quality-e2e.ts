/**
 * E2E-lakmoesproef LP-tekstkwaliteit (audit 2026-06-10): genereert een ECHTE
 * verse variant-batch via de live generate-structured-variant route (incl.
 * HVD, model-routing, locale-precedentie, tracking, evt. STRICT-rewrite) en
 * beoordeelt de opgeleverde teksten op de PO-klachten:
 *   - glued em-dashes ("over—zodat") = 0
 *   - drieslag "geen X, geen Y, geen/alleen Z" <= 1 per pagina
 *   - detector-verdict niet AI_LEANING/PURE_AI
 *   - taal = Nederlands (locale-fix: workspace stond op 'en'-default)
 *   - AICallTrace/Snapshot rows aangemaakt (learning-loop zichtbaarheid)
 *
 * Vereist een draaiende dev-server met DEZE branch-code.
 * Run: BASE=http://localhost:3001 npx tsx --env-file=.env.local scripts/dev/verify-lp-text-quality-e2e.ts
 */
import { prisma } from '../../src/lib/prisma';
import { makeSignature } from 'better-auth/crypto';
import { flattenVariantToText } from '../../src/lib/landing-pages/flatten-variant';
import { detectAiTells } from '../../src/lib/brand-fidelity/ai-tell-detector';
import type { LandingPageVariantContent } from '../../src/lib/landing-pages/variant-schema';

const BASE = process.env.BASE ?? 'http://localhost:3001';
const GLUED = /[a-zà-öø-ÿ]—[a-zà-öø-ÿ]/g;
const TRIPLE = /geen\s+[^.,;]{2,40},\s*geen\s+[^.,;]{2,40}[,—-]\s*(geen|alleen)/gi;
const NL_MARKERS = /\b(de|het|een|en|voor|met|van|jouw|onze|geen|wij)\b/gi;

async function main(): Promise<void> {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error('BETTER_AUTH_SECRET ontbreekt — draai met --env-file=.env.local');

  // Zwarthout LP-deliverable (workspace stond op en-default → test locale-fix mee)
  const deliv = await prisma.deliverable.findFirst({
    where: { contentType: 'landing-page', campaign: { workspace: { name: { contains: 'Zwarthout' } } } },
    select: { id: true, title: true, campaign: { select: { workspaceId: true, workspace: { select: { organizationId: true, name: true } } } } },
    orderBy: { updatedAt: 'desc' },
  });
  if (!deliv) throw new Error('Geen Zwarthout landing-page deliverable gevonden');
  const workspaceId = deliv.campaign.workspaceId;
  console.log(`deliverable: ${deliv.title} (${deliv.id}) @ ${deliv.campaign.workspace.name}`);

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: deliv.campaign.workspace.organizationId },
    select: { userId: true },
  });
  const sess = await prisma.session.findFirst({
    where: { userId: { in: members.map((m) => m.userId) }, expiresAt: { gt: new Date() } },
    orderBy: { expiresAt: 'desc' },
    select: { token: true },
  });
  if (!sess) throw new Error('Geen geldige sessie voor een org-member');
  const signed = `${sess.token}.${await makeSignature(sess.token, secret)}`;
  const cookie = `better-auth.session_token=${signed}; branddock-workspace-id=${workspaceId}`;

  const authCheck = await fetch(`${BASE}/api/workspaces`, { headers: { Cookie: cookie } });
  console.log(`auth-check → HTTP ${authCheck.status}`);
  if (!authCheck.ok) throw new Error('Cookie authenticeert niet');

  const tracesBefore = await prisma.aICallTrace.count({
    where: { workspaceId, aiCallSnapshot: { sourceIdentifier: 'landing-pages.variant-generator' } },
  });

  console.log('generate-structured-variant draait (2 variants, sonnet-4-6, ~30-60s)…');
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/landing-pages/${deliv.id}/generate-structured-variant`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      userPrompt: 'Landing page voor Shou Sugi Ban verkoold gevelhout, gericht op architecten die een onderhoudsarme zwarte gevel zoeken. Doel: stalen-aanvragen.',
      count: 2,
    }),
  });
  console.log(`→ HTTP ${res.status} in ${Math.round((Date.now() - t0) / 1000)}s`);
  if (!res.ok) throw new Error(`Route faalde: ${await res.text()}`);
  const body = (await res.json()) as { variants: LandingPageVariantContent[]; variantLabels: (string | null)[] };

  let fails = 0;
  body.variants.forEach((v, i) => {
    const text = flattenVariantToText(v);
    const glued = (text.match(GLUED) ?? []).length;
    const triple = (text.match(TRIPLE) ?? []).length;
    const nlHits = (text.match(NL_MARKERS) ?? []).length;
    const det = detectAiTells(text);
    const ok = glued === 0 && triple <= 1 && det.verdict !== 'AI_LEANING' && det.verdict !== 'PURE_AI' && nlHits > 20;
    if (!ok) fails++;
    console.log(`\n— Variant ${i} (${body.variantLabels?.[i] ?? 'geen label'}) ${ok ? 'OK' : 'NIET OK'}`);
    console.log(`  glued em-dashes: ${glued} | drieslag: ${triple} | verdict: ${det.verdict} (${det.scorePer1000Words.toFixed(1)}/1000) | NL-markers: ${nlHits}`);
    console.log(`  headline: "${v.hero.headline}"`);
    console.log(`  subhead:  "${v.hero.subhead}"`);
    console.log(`  riskReducer: "${v.finalCta.riskReducer}"`);
    console.log(`  testimonial-author: "${v.socialProof.testimonials[0]?.authorName}" (${v.socialProof.testimonials[0]?.authorRole})`);
  });

  const tracesAfter = await prisma.aICallTrace.count({
    where: { workspaceId, aiCallSnapshot: { sourceIdentifier: 'landing-pages.variant-generator' } },
  });
  console.log(`\nAICallTrace (variant-generator): ${tracesBefore} → ${tracesAfter} ${tracesAfter > tracesBefore ? 'OK' : 'NIET OK (tracking schreef niets)'}`);
  if (tracesAfter <= tracesBefore) fails++;

  console.log(`\n${fails === 0 ? 'E2E-LAKMOESPROEF GESLAAGD' : `E2E: ${fails} onderdeel/onderdelen NIET OK`}`);
  await prisma.$disconnect();
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
