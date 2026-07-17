// =============================================================
// POST /api/ad-publish/meta
//
// Publishes a facebook-ad variant of a Deliverable to Meta as
// a PAUSED ad. Owns the AdCampaign state-machine:
//
//   draft ──(write row)──> publishing ──(meta returns ids)──> active
//                                   │
//                                   └──(meta error)──> failed | rejected
//
// Body:
//   {
//     deliverableId: string,
//     variantIndex: number,
//     connectedAccountId: string,
//     pageId: string,
//     campaignName: string,
//     objective: CampaignObjective,
//     dailyBudgetCents: number,
//     targeting: Record<string, unknown>,
//     landingPageUrl: string
//   }
//
// Creative-spec wordt afgeleid uit DeliverableComponent rows.
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession, resolveWorkspaceId } from '@/lib/auth-server';
import { parseJsonBody } from '@/lib/api/parse-json-body';
import { prisma } from '@/lib/prisma';
import { decryptToken, encryptToken } from '@/lib/ad-tokens/encryption';
import { invalidateCache } from '@/lib/api/cache';
import { cacheKeys } from '@/lib/api/cache-keys';
import {
  publishFacebookAd,
  validateFacebookCreative,
  refreshLongLivedToken,
  MetaApiError,
  MetaConfigError,
  type CampaignObjective,
  type FacebookAdCreativeSpec,
  type MetaCtaType,
} from '@/lib/ad-providers/meta';

const INLINE_REFRESH_WINDOW_MS = 5 * 60 * 1000;

// L8 Zod-sweep (audit 2026-06-26, batch 6): de required-loop checkte alleen
// presence, geen types — een string-`variantIndex` 500'de in Prisma en een
// niet-numeriek budget ging rauw de Meta-call in. `objective` blijft een
// capped string (de Meta-lib/API valideert de enum-semantiek zelf).
const publishBodySchema = z.object({
  deliverableId: z.string().min(1).max(100),
  variantIndex: z.number().int().min(0).max(50),
  connectedAccountId: z.string().min(1).max(100),
  pageId: z.string().min(1).max(100),
  campaignName: z.string().min(1).max(300),
  objective: z.string().min(1).max(100),
  dailyBudgetCents: z.number().int().positive().max(10_000_000),
  targeting: z.record(z.string(), z.unknown()),
  landingPageUrl: z.string().min(1).max(2000),
});

interface ComponentRow {
  componentType: string;
  generatedContent: string | null;
  imageUrl: string | null;
}

function buildCreativeSpec(
  components: ComponentRow[],
  landingPageUrl: string,
): { ok: true; spec: FacebookAdCreativeSpec } | { ok: false; reason: string } {
  const byType = new Map<string, ComponentRow>();
  for (const c of components) byType.set(c.componentType, c);

  const primary = byType.get('primary-text') ?? byType.get('body');
  const headline = byType.get('headline');
  const description = byType.get('description');
  const ctaButton = byType.get('cta-button') ?? byType.get('cta');
  const imageComponent =
    [...byType.values()].find((c) => c.imageUrl && c.imageUrl.length > 0) ?? null;

  if (!primary?.generatedContent) return { ok: false, reason: 'primary-text component missing or empty' };
  if (!headline?.generatedContent) return { ok: false, reason: 'headline component missing or empty' };
  if (!description?.generatedContent) return { ok: false, reason: 'description component missing or empty' };
  if (!ctaButton?.generatedContent) return { ok: false, reason: 'cta-button component missing or empty' };
  if (!imageComponent?.imageUrl) return { ok: false, reason: 'image is required' };

  return {
    ok: true,
    spec: {
      primaryText: primary.generatedContent,
      headline: headline.generatedContent,
      description: description.generatedContent,
      ctaButton: ctaButton.generatedContent.toUpperCase().replace(/\s+/g, '_') as MetaCtaType,
      imageUrl: imageComponent.imageUrl,
      landingPageUrl,
    },
  };
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace resolved' }, { status: 401 });

    const parsed = await parseJsonBody(request, publishBodySchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    // Load deliverable + components + connected account in parallel,
    // verifying workspace ownership of both.
    const [deliverable, account] = await Promise.all([
      prisma.deliverable.findFirst({
        where: { id: body.deliverableId, campaign: { workspaceId } },
        include: {
          components: {
            where: { variantIndex: body.variantIndex },
            select: { componentType: true, generatedContent: true, imageUrl: true },
          },
        },
      }),
      prisma.connectedAdAccount.findFirst({
        where: { id: body.connectedAccountId, workspaceId, platform: 'meta' },
      }),
    ]);

    if (!deliverable) {
      return NextResponse.json({ error: 'Deliverable not found in workspace' }, { status: 404 });
    }
    if (!account) {
      return NextResponse.json({ error: 'ConnectedAdAccount not found' }, { status: 404 });
    }
    if (account.status !== 'active') {
      return NextResponse.json(
        { error: `ConnectedAdAccount status is ${account.status} — reconnect required` },
        { status: 409 },
      );
    }

    // Build + validate creative spec from components
    const buildResult = buildCreativeSpec(deliverable.components, body.landingPageUrl);
    if (!buildResult.ok) {
      return NextResponse.json(
        { error: 'creative_incomplete', detail: buildResult.reason },
        { status: 422 },
      );
    }
    const validation = validateFacebookCreative(buildResult.spec);
    if (!validation.ok) {
      return NextResponse.json(
        { error: 'creative_validation_failed', issues: validation.issues },
        { status: 422 },
      );
    }

    // Inline token-refresh if expiry within 5min (spec §4.1.1).
    let accessToken: string;
    try {
      accessToken = decryptToken(account.accessTokenEncrypted);
    } catch {
      return NextResponse.json(
        { error: 'Stored token is unreadable — reconnect required' },
        { status: 409 },
      );
    }
    const willExpireSoon =
      account.tokenExpiresAt && account.tokenExpiresAt.getTime() - Date.now() < INLINE_REFRESH_WINDOW_MS;
    if (willExpireSoon) {
      try {
        const refreshed = await refreshLongLivedToken(accessToken);
        accessToken = refreshed.access_token;
        await prisma.connectedAdAccount.update({
          where: { id: account.id },
          data: {
            accessTokenEncrypted: encryptToken(refreshed.access_token),
            tokenExpiresAt: new Date(Date.now() + refreshed.expires_in * 1000),
            lastRefreshedAt: new Date(),
          },
        });
      } catch (err) {
        const detail = err instanceof MetaApiError ? err.message : 'inline_refresh_failed';
        await prisma.connectedAdAccount.update({
          where: { id: account.id },
          data: { status: 'expired', lastErrorMessage: detail },
        });
        invalidateCache(cacheKeys.prefixes.adAccounts(workspaceId));
        return NextResponse.json({ error: 'token_refresh_failed', detail }, { status: 401 });
      }
    }

    // Create AdCampaign row in 'publishing' state BEFORE Meta call.
    // Status transitions even if Meta call throws — we always end
    // in a terminal state ('active', 'rejected', 'failed').
    const campaign = await prisma.adCampaign.create({
      data: {
        deliverableId: deliverable.id,
        connectedAccountId: account.id,
        status: 'publishing',
        publishedAt: new Date(),
        publishedByUserId: session.user.id,
        // lastStatusSyncAt = NULL → cron picks it up within 5min
      },
      select: { id: true },
    });

    try {
      const result = await publishFacebookAd({
        externalAccountId: account.externalAccountId,
        accessToken,
        pageId: body.pageId,
        campaignName: body.campaignName,
        objective: body.objective as CampaignObjective,
        dailyBudgetCents: body.dailyBudgetCents,
        targeting: body.targeting,
        creative: buildResult.spec,
      });

      const updated = await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: {
          externalCampaignId: result.externalCampaignId,
          externalAdSetId: result.externalAdSetId,
          externalCreativeId: result.externalCreativeId,
          externalAdId: result.externalAdId,
          status: 'publishing', // Meta needs review — sync job will flip to 'active'
          publishedPayload: result.rawPayloadSent,
        },
        select: {
          id: true,
          status: true,
          externalCampaignId: true,
          externalAdSetId: true,
          externalCreativeId: true,
          externalAdId: true,
        },
      });

      invalidateCache(cacheKeys.prefixes.adCampaigns(workspaceId));

      return NextResponse.json({ campaign: updated });
    } catch (err) {
      const isMetaErr = err instanceof MetaApiError;
      const detail = isMetaErr ? err.message : err instanceof Error ? err.message : 'publish_failed';
      const terminalStatus = isMetaErr && err.isAuthError() ? 'rejected' : 'failed';
      await prisma.adCampaign.update({
        where: { id: campaign.id },
        data: { status: terminalStatus, statusMessage: detail },
      });
      invalidateCache(cacheKeys.prefixes.adCampaigns(workspaceId));
      return NextResponse.json(
        { error: 'publish_failed', detail, campaignId: campaign.id },
        { status: 502 },
      );
    }
  } catch (err) {
    if (err instanceof MetaConfigError) {
      return NextResponse.json(
        { error: 'Meta integration not configured', detail: err.message },
        { status: 503 },
      );
    }
    console.error('[ad-publish/meta]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
