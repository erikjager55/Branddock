// =============================================================
// Meta publish-pipeline — facebook-ad → PAUSED ad on Meta.
//
// 4-step sequence per Marketing-API:
//   1. POST /act_{accountId}/campaigns          → campaign_id
//   2. POST /act_{accountId}/adsets             → adset_id
//   3. POST /act_{accountId}/adcreatives        → creative_id
//   4. POST /act_{accountId}/ads (PAUSED)       → ad_id
//
// All status='PAUSED' so the sandbox-test never spends budget.
// Caller (route handler) is responsible for AdCampaign row
// state-machine (draft → publishing → active|rejected|failed).
//
// References:
//   https://developers.facebook.com/docs/marketing-api/reference/
//   /ad-account-campaigns/
// =============================================================

import { getMetaConfig } from './config';
import { appSecretProof } from './oauth';
import { MetaApiError, type MetaErrorBody } from './types';

// ── Creative spec validation ───────────────────────────────

export interface FacebookAdCreativeSpec {
  primaryText: string; // ≤ 125 chars (truncation cliff)
  headline: string; // ≤ 40 chars
  description: string; // ≤ 30 chars
  ctaButton: string; // one of META_CTA_TYPES
  imageUrl: string; // hosted URL — must be HTTPS, ≥ 1080×1080 ideally
  landingPageUrl: string; // destination link
}

export const META_CTA_TYPES = [
  'LEARN_MORE',
  'SHOP_NOW',
  'SIGN_UP',
  'GET_OFFER',
  'BOOK_TRAVEL',
  'CONTACT_US',
  'DOWNLOAD',
  'GET_QUOTE',
  'SUBSCRIBE',
  'APPLY_NOW',
  'WATCH_MORE',
] as const;

export type MetaCtaType = (typeof META_CTA_TYPES)[number];

export interface CreativeValidationIssue {
  field: keyof FacebookAdCreativeSpec | 'general';
  message: string;
}

export interface CreativeValidationResult {
  ok: boolean;
  issues: CreativeValidationIssue[];
}

// Hard Meta-platform limits. These are publish-blockers (different
// from soft A.5 quality-warnings).
const FB_HARD_LIMITS = {
  primaryText: 125,
  headline: 40,
  description: 30,
} as const;

export function validateFacebookCreative(
  spec: Partial<FacebookAdCreativeSpec>,
): CreativeValidationResult {
  const issues: CreativeValidationIssue[] = [];

  for (const key of ['primaryText', 'headline', 'description'] as const) {
    const value = spec[key];
    if (!value || value.trim().length === 0) {
      issues.push({ field: key, message: `${key} is required` });
      continue;
    }
    const limit = FB_HARD_LIMITS[key];
    if (value.length > limit) {
      issues.push({
        field: key,
        message: `${key} is ${value.length} chars, Meta hard-limit is ${limit}`,
      });
    }
  }

  if (!spec.ctaButton || !META_CTA_TYPES.includes(spec.ctaButton as MetaCtaType)) {
    issues.push({
      field: 'ctaButton',
      message: `ctaButton must be one of: ${META_CTA_TYPES.join(', ')}`,
    });
  }

  if (!spec.imageUrl) {
    issues.push({ field: 'imageUrl', message: 'imageUrl is required for facebook-ad' });
  } else if (!spec.imageUrl.startsWith('https://')) {
    issues.push({ field: 'imageUrl', message: 'imageUrl must be HTTPS (Meta rejects http)' });
  }

  if (!spec.landingPageUrl) {
    issues.push({ field: 'landingPageUrl', message: 'landingPageUrl is required' });
  } else {
    try {
      const u = new URL(spec.landingPageUrl);
      if (u.protocol !== 'https:' && u.protocol !== 'http:') {
        issues.push({ field: 'landingPageUrl', message: 'landingPageUrl must be http(s)' });
      }
    } catch {
      issues.push({ field: 'landingPageUrl', message: 'landingPageUrl is not a valid URL' });
    }
  }

  return { ok: issues.length === 0, issues };
}

// ── Meta API wrappers ──────────────────────────────────────

export type CampaignObjective =
  | 'OUTCOME_AWARENESS'
  | 'OUTCOME_TRAFFIC'
  | 'OUTCOME_ENGAGEMENT'
  | 'OUTCOME_LEADS'
  | 'OUTCOME_APP_PROMOTION'
  | 'OUTCOME_SALES';

export interface PublishPlan {
  /** Meta ad-account ID, format `act_1234`. */
  externalAccountId: string;
  /** Long-lived access token (decrypted). */
  accessToken: string;
  /** Page ID that publishes the creative. */
  pageId: string;
  campaignName: string;
  objective: CampaignObjective;
  /** Daily budget in cents (e.g. 500 = $5/day). PAUSED so never spent. */
  dailyBudgetCents: number;
  /** Audience targeting blob — pass-through to Meta API. */
  targeting: Record<string, unknown>;
  creative: FacebookAdCreativeSpec;
}

export interface PublishResult {
  externalCampaignId: string;
  externalAdSetId: string;
  externalCreativeId: string;
  externalAdId: string;
  rawPayloadSent: Record<string, unknown>;
}

async function metaPost(
  path: string,
  accessToken: string,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const cfg = getMetaConfig();
  const url = new URL(`https://graph.facebook.com/${cfg.apiVersion}/${path.replace(/^\//, '')}`);
  const formBody = new URLSearchParams();
  for (const [key, value] of Object.entries(body)) {
    formBody.set(key, typeof value === 'string' ? value : JSON.stringify(value));
  }
  formBody.set('access_token', accessToken);
  formBody.set('appsecret_proof', appSecretProof(accessToken));

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody.toString(),
  });
  if (!res.ok) {
    let errBody: MetaErrorBody | undefined;
    try {
      errBody = (await res.json()) as MetaErrorBody;
    } catch {
      // non-JSON
    }
    if (errBody?.error) throw new MetaApiError(res.status, errBody);
    throw new MetaApiError(res.status, {
      error: { message: res.statusText, type: 'UnknownError', code: -1 },
    });
  }
  return (await res.json()) as Record<string, unknown>;
}

/**
 * Publish a facebook-ad to Meta as a PAUSED ad. Returns the 4
 * external-IDs needed to track + sync the campaign.
 *
 * Errors propagate as MetaApiError — caller is responsible for
 * mapping these to AdCampaign.status='rejected'|'failed' and writing
 * statusMessage.
 */
export async function publishFacebookAd(plan: PublishPlan): Promise<PublishResult> {
  const validation = validateFacebookCreative(plan.creative);
  if (!validation.ok) {
    throw new Error(
      `Creative validation failed: ${validation.issues.map((i) => `${i.field}: ${i.message}`).join('; ')}`,
    );
  }

  const accountPath = plan.externalAccountId.startsWith('act_')
    ? plan.externalAccountId
    : `act_${plan.externalAccountId}`;

  // Step 1: Campaign
  const campaign = await metaPost(`${accountPath}/campaigns`, plan.accessToken, {
    name: plan.campaignName,
    objective: plan.objective,
    status: 'PAUSED',
    special_ad_categories: [], // required field, empty for general advertising
    buying_type: 'AUCTION',
  });
  const externalCampaignId = String(campaign.id ?? '');
  if (!externalCampaignId) throw new Error('Meta did not return campaign id');

  // Step 2: Ad-set
  const adSet = await metaPost(`${accountPath}/adsets`, plan.accessToken, {
    name: `${plan.campaignName} — Ad set 1`,
    campaign_id: externalCampaignId,
    status: 'PAUSED',
    daily_budget: plan.dailyBudgetCents,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    targeting: plan.targeting,
    start_time: new Date(Date.now() + 60_000).toISOString(),
  });
  const externalAdSetId = String(adSet.id ?? '');
  if (!externalAdSetId) throw new Error('Meta did not return ad-set id');

  // Step 3: Creative
  const creative = await metaPost(`${accountPath}/adcreatives`, plan.accessToken, {
    name: `${plan.campaignName} — Creative`,
    object_story_spec: {
      page_id: plan.pageId,
      link_data: {
        message: plan.creative.primaryText,
        name: plan.creative.headline,
        description: plan.creative.description,
        link: plan.creative.landingPageUrl,
        picture: plan.creative.imageUrl,
        call_to_action: { type: plan.creative.ctaButton },
      },
    },
  });
  const externalCreativeId = String(creative.id ?? '');
  if (!externalCreativeId) throw new Error('Meta did not return creative id');

  // Step 4: Ad
  const ad = await metaPost(`${accountPath}/ads`, plan.accessToken, {
    name: `${plan.campaignName} — Ad`,
    adset_id: externalAdSetId,
    creative: { creative_id: externalCreativeId },
    status: 'PAUSED',
  });
  const externalAdId = String(ad.id ?? '');
  if (!externalAdId) throw new Error('Meta did not return ad id');

  return {
    externalCampaignId,
    externalAdSetId,
    externalCreativeId,
    externalAdId,
    rawPayloadSent: {
      campaign: { name: plan.campaignName, objective: plan.objective },
      adSet: { dailyBudgetCents: plan.dailyBudgetCents, targeting: plan.targeting },
      creative: plan.creative,
    },
  };
}

/**
 * Fetch the effective status of a Meta ad. Used by the status-sync
 * cron-job to flip AdCampaign.status from 'publishing' → 'active'
 * once Meta has finished its review.
 */
export interface MetaAdEffectiveStatus {
  status: string; // ACTIVE | PAUSED | DELETED | PENDING_REVIEW | DISAPPROVED | ...
  /** Reason if disapproved. */
  issuesInfo?: Array<{ error_summary: string; error_message?: string }>;
}

export async function fetchAdStatus(
  accessToken: string,
  externalAdId: string,
): Promise<MetaAdEffectiveStatus> {
  const cfg = getMetaConfig();
  const url = new URL(`https://graph.facebook.com/${cfg.apiVersion}/${externalAdId}`);
  url.searchParams.set('fields', 'effective_status,issues_info');
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('appsecret_proof', appSecretProof(accessToken));

  const res = await fetch(url.toString(), { method: 'GET' });
  if (!res.ok) {
    let errBody: MetaErrorBody | undefined;
    try {
      errBody = (await res.json()) as MetaErrorBody;
    } catch {
      // non-JSON
    }
    if (errBody?.error) throw new MetaApiError(res.status, errBody);
    throw new MetaApiError(res.status, {
      error: { message: res.statusText, type: 'UnknownError', code: -1 },
    });
  }
  const body = (await res.json()) as { effective_status?: string; issues_info?: Array<{ error_summary: string; error_message?: string }> };
  return {
    status: body.effective_status ?? 'UNKNOWN',
    issuesInfo: body.issues_info,
  };
}

/**
 * Map a Meta effective_status onto our AdCampaign.status enum.
 */
export function mapMetaStatusToInternal(metaStatus: string): {
  status: 'active' | 'paused' | 'rejected' | 'failed' | 'publishing';
  message?: string;
} {
  switch (metaStatus) {
    case 'ACTIVE':
      return { status: 'active' };
    case 'PAUSED':
    case 'CAMPAIGN_PAUSED':
    case 'ADSET_PAUSED':
      return { status: 'paused' };
    case 'DISAPPROVED':
    case 'WITH_ISSUES':
      return { status: 'rejected', message: 'Meta disapproved the ad' };
    case 'DELETED':
    case 'ARCHIVED':
      return { status: 'failed', message: `Meta marked ad as ${metaStatus.toLowerCase()}` };
    case 'PENDING_REVIEW':
    case 'IN_PROCESS':
      return { status: 'publishing' };
    default:
      return { status: 'publishing', message: `Unmapped Meta status: ${metaStatus}` };
  }
}
