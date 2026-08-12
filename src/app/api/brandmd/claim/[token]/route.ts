// =============================================================
// brand.md claim-flow — draft-profiel → voor-ingevulde workspace
//
// GET  → preview (wat staat er klaar) — token is de capability,
//        geen sessie nodig; drafts blijven verder onvindbaar.
// POST → materialisatie: workspace + canonical assets (zelfde
//        transactiepatroon als POST /api/workspaces) + brand-DNA uit
//        het scan-payload via de normale domeinmodellen
//        (tweede-deur-principe) + content-locale-anker (les #411).
//        Idempotent: nogmaals claimen door dezelfde gebruiker geeft
//        dezelfde workspace terug. Token is single-use daarna.
//
// E-mail-binding: hing er een e-mail aan de run, dan is het draft
// alleen claimbaar via een account met dat adres (§Ontwerp
// claim-borging).
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';
import {
  CANONICAL_BRAND_ASSETS,
  ACTIVE_RESEARCH_METHOD_TYPES,
} from '@/lib/constants/canonical-brand-assets';
import { invalidateBrandContext } from '@/lib/ai/brand-context';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import {
  ensureBrandWithDefaultProfile,
  localeForLanguage,
} from '@/lib/content-locale/default-profile';
import { enforceOrgPlanLimit, getOrgPlanTier } from '@/lib/stripe/enforcement';
import { DRAFT_PAYLOAD_VERSION } from '@/lib/brandmd/constants';
import type { BrandMdDraftPayload } from '@/lib/brandmd/scan';

export const dynamic = 'force-dynamic';

const VALID_LANGUAGES = new Set(['en', 'nl', 'de', 'fr', 'es', 'pt', 'it']);

interface RouteContext {
  params: Promise<{ token: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const profile = await findByToken(token);
    if (!profile) {
      return NextResponse.json({ error: 'Unknown or expired draft' }, { status: 404 });
    }
    const payload = parsePayload(profile.payload);
    const prepared: string[] = [];
    if (payload) {
      const s = payload.strategy;
      const strategyCount = [s.purpose, s.positioning, s.personality, s.promise].filter(Boolean).length;
      if (strategyCount > 0) prepared.push(`${strategyCount} strategy assets`);
      if (payload.voice.description || payload.voice.wordsWeUse.length) prepared.push('voice profile');
      if (payload.colors.length) prepared.push(`${payload.colors.length} brand colors`);
      if (payload.fonts.length) prepared.push('typography');
      if (payload.audience.length) prepared.push(`${payload.audience.length} personas`);
      if (payload.products.length) prepared.push(`${payload.products.length} products`);
    }
    return NextResponse.json({
      brandName: profile.brandName,
      domain: profile.domain,
      score: profile.score,
      status: profile.status,
      expiresAt: profile.expiresAt.toISOString(),
      emailBound: !!profile.email,
      prepared,
      supportedPayload: !!payload,
    });
  } catch (error) {
    console.error('[GET /api/brandmd/claim]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(_req: NextRequest, context: RouteContext) {
  try {
    const { token } = await context.params;
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Sign in to claim this brand', code: 'UNAUTHENTICATED' }, { status: 401 });
    }
    const activeOrgId = (session.session as Record<string, unknown>).activeOrganizationId as
      | string
      | undefined;
    if (!activeOrgId) {
      return NextResponse.json({ error: 'No active organization', code: 'NO_ACTIVE_ORG' }, { status: 400 });
    }

    const profile = await findByToken(token);
    if (!profile) {
      return NextResponse.json({ error: 'Unknown or expired draft' }, { status: 404 });
    }

    // Idempotent: dezelfde gebruiker die opnieuw klikt krijgt zijn workspace.
    if (profile.status === 'CLAIMED') {
      if (profile.claimedByUserId === session.user.id && profile.claimedWorkspaceId) {
        return NextResponse.json({ workspaceId: profile.claimedWorkspaceId, alreadyClaimed: true });
      }
      return NextResponse.json({ error: 'This draft was already claimed' }, { status: 409 });
    }

    if (profile.email && profile.email.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This draft is bound to the email address it was generated with', code: 'EMAIL_MISMATCH' },
        { status: 403 },
      );
    }

    const membership = await prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId: session.user.id, organizationId: activeOrgId } },
    });
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Only owners and admins can claim a brand into this organization' },
        { status: 403 },
      );
    }

    const limited = await enforceOrgPlanLimit(activeOrgId, 'WORKSPACES');
    if (limited) return limited;

    const payload = parsePayload(profile.payload);
    if (!payload) {
      return NextResponse.json(
        { error: 'This draft uses an unsupported version — please re-scan', code: 'PAYLOAD_VERSION' },
        { status: 422 },
      );
    }

    const contentLanguage = VALID_LANGUAGES.has(payload.language) ? payload.language : 'en';
    const slug = await uniqueWorkspaceSlug(profile.brandName, profile.domain);
    const inheritedTier = await getOrgPlanTier(activeOrgId);

    const workspace = await prisma.$transaction(async (tx) => {
      const ws = await tx.workspace.create({
        data: {
          name: profile.brandName,
          slug,
          organizationId: activeOrgId,
          contentLanguage,
          planTier: inheritedTier,
        },
      });

      await ensureBrandWithDefaultProfile(tx, ws.id, localeForLanguage(contentLanguage));

      // Canonical assets — met scan-content voor-ingevuld waar de scan iets vond.
      const seeded = strategySeedBySlug(payload);
      for (const asset of CANONICAL_BRAND_ASSETS) {
        const seed = seeded[asset.slug];
        await tx.brandAsset.create({
          data: {
            name: asset.name,
            slug: asset.slug,
            description: asset.description,
            category: asset.category as never,
            status: 'DRAFT',
            frameworkType: asset.frameworkType,
            content: seed ? { statement: seed, source: 'brandmd-scan', unvalidated: true } : undefined,
            workspaceId: ws.id,
            researchMethods: {
              create: ACTIVE_RESEARCH_METHOD_TYPES.map((method) => ({
                method: method as never,
                status: 'AVAILABLE' as never,
                progress: 0,
              })),
            },
          },
        });
      }

      // Voiceguide-concept uit de scan.
      await tx.brandVoiceguide.create({
        data: {
          workspaceId: ws.id,
          voiceDescription: payload.voice.description ?? null,
          wordsWeUse: payload.voice.wordsWeUse,
          wordsWeAvoid: payload.voice.wordsWeAvoid,
          contentGuidelines: payload.voice.tonalRules,
        },
      });

      // Styleguide-draft met bron-URL — re-scan werkt hierdoor direct.
      await tx.brandStyleguide.create({
        data: {
          workspaceId: ws.id,
          status: 'DRAFT',
          sourceType: 'URL',
          sourceUrl: payload.sourceUrl,
        } as never,
      });

      for (const persona of payload.audience) {
        await tx.persona.create({
          data: {
            workspaceId: ws.id,
            name: persona.name,
            tagline: persona.description,
            createdById: session.user.id,
          },
        });
      }

      for (const product of payload.products) {
        await tx.product.create({
          data: {
            workspaceId: ws.id,
            name: product.name,
            slug: await uniqueProductSlug(tx, slug, product.name),
            description: product.description,
            status: 'DRAFT',
            source: 'MANUAL',
            sourceUrl: payload.sourceUrl,
          },
        });
      }

      await tx.generatedBrandProfile.update({
        where: { id: profile.id },
        data: {
          status: 'CLAIMED',
          claimedAt: new Date(),
          claimedByUserId: session.user.id,
          claimedWorkspaceId: ws.id,
        },
      });

      return ws;
    });

    // Server-side caches — verplicht na mutaties (verboden patroon #10).
    invalidateBrandContext(workspace.id);
    invalidateCache(cacheKeys.personas.list(workspace.id));
    invalidateCache(cacheKeys.products.list(workspace.id));

    return NextResponse.json({ workspaceId: workspace.id, slug: workspace.slug }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/brandmd/claim]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────

async function findByToken(token: string) {
  if (!token || token.length < 10) return null;
  const tokenHash = createHash('sha256').update(token).digest('hex');
  const profile = await prisma.generatedBrandProfile.findUnique({
    where: { claimTokenHash: tokenHash },
  });
  if (!profile) return null;
  if (profile.status === 'EXPIRED' || profile.expiresAt < new Date()) return null;
  return profile;
}

function parsePayload(raw: unknown): BrandMdDraftPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Partial<BrandMdDraftPayload>;
  if (p.version !== DRAFT_PAYLOAD_VERSION) return null;
  if (typeof p.sourceUrl !== 'string' || typeof p.name !== 'string') return null;
  return {
    version: DRAFT_PAYLOAD_VERSION,
    sourceUrl: p.sourceUrl,
    domain: typeof p.domain === 'string' ? p.domain : '',
    name: p.name,
    tagline: typeof p.tagline === 'string' ? p.tagline : undefined,
    language: typeof p.language === 'string' ? p.language : 'en',
    colors: Array.isArray(p.colors) ? p.colors.filter((c): c is string => typeof c === 'string') : [],
    fonts: Array.isArray(p.fonts) ? p.fonts.filter((f): f is string => typeof f === 'string') : [],
    strategy: {
      purpose: strOrUndef(p.strategy?.purpose),
      positioning: strOrUndef(p.strategy?.positioning),
      personality: strOrUndef(p.strategy?.personality),
      promise: strOrUndef(p.strategy?.promise),
    },
    voice: {
      description: strOrUndef(p.voice?.description),
      tonalRules: strArr(p.voice?.tonalRules),
      wordsWeUse: strArr(p.voice?.wordsWeUse),
      wordsWeAvoid: strArr(p.voice?.wordsWeAvoid),
    },
    audience: pairArr(p.audience),
    products: pairArr(p.products),
  };
}

function strategySeedBySlug(payload: BrandMdDraftPayload): Record<string, string> {
  const out: Record<string, string> = {};
  if (payload.strategy.purpose) out['purpose-statement'] = payload.strategy.purpose;
  if (payload.strategy.promise) out['brand-promise'] = payload.strategy.promise;
  if (payload.strategy.personality) out['brand-personality'] = payload.strategy.personality;
  if (payload.strategy.positioning) out['brand-essence'] = payload.strategy.positioning;
  return out;
}

async function uniqueWorkspaceSlug(name: string, domain: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || domain.replace(/[^a-z0-9]+/g, '-');
  const RESERVED = new Set(['app', 'www', 'api', 'admin', 'p', 'static', 'assets']);
  let candidate = RESERVED.has(base) ? `${base}-brand` : base;
  for (let i = 0; i < 20; i++) {
    const existing = await prisma.workspace.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function uniqueProductSlug(
  tx: { product: { findUnique: (args: { where: { slug: string }; select: { id: boolean } }) => Promise<{ id: string } | null> } },
  wsSlug: string,
  name: string,
): Promise<string> {
  const base = `${wsSlug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`.slice(0, 80);
  let candidate = base;
  for (let i = 0; i < 10; i++) {
    const existing = await tx.product.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!existing) return candidate;
    candidate = `${base}-${i + 2}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function strOrUndef(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [];
}

function pairArr(v: unknown): Array<{ name: string; description: string }> {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (e): e is { name: string; description: string } =>
      !!e &&
      typeof e === 'object' &&
      typeof (e as Record<string, unknown>).name === 'string' &&
      typeof (e as Record<string, unknown>).description === 'string',
  );
}
