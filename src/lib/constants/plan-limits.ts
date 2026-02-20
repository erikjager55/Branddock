// =============================================================
// Plan limits — single source of truth for plan tiers & limits
//
// All numeric limits in base units. Infinity = unlimited.
// Storage in MB. AI tokens = raw token count.
// =============================================================

import type { PlanTier, FeatureKey, PlanLimits, PlanConfig } from '@/types/billing';

// ─── Limits per tier ────────────────────────────────────────

export const PLAN_LIMITS: Record<PlanTier, PlanLimits> = {
  FREE: {
    WORKSPACES: 1,
    TEAM_MEMBERS: 1,
    AI_TOKENS: 10_000,
    PERSONAS: 3,
    CAMPAIGNS: 2,
    BRAND_ASSETS: 5,
    PRODUCTS: 3,
    MARKET_INSIGHTS: 5,
    KNOWLEDGE_RESOURCES: 10,
    STORAGE_MB: 100,
    ALIGNMENT_SCANS_PER_WEEK: 1,
    CONTENT_STUDIO: 1,   // 1 = basic
    EXPORT_FORMATS: 0,   // 0 = none
  },
  PRO: {
    WORKSPACES: 3,
    TEAM_MEMBERS: 5,
    AI_TOKENS: 100_000,
    PERSONAS: 10,
    CAMPAIGNS: 10,
    BRAND_ASSETS: 20,
    PRODUCTS: 15,
    MARKET_INSIGHTS: 25,
    KNOWLEDGE_RESOURCES: 50,
    STORAGE_MB: 1_024,
    ALIGNMENT_SCANS_PER_WEEK: 7, // daily
    CONTENT_STUDIO: 2,   // 2 = full
    EXPORT_FORMATS: 1,   // 1 = PDF
  },
  AGENCY: {
    WORKSPACES: 10,
    TEAM_MEMBERS: 25,
    AI_TOKENS: 500_000,
    PERSONAS: 50,
    CAMPAIGNS: 50,
    BRAND_ASSETS: 100,
    PRODUCTS: 75,
    MARKET_INSIGHTS: 100,
    KNOWLEDGE_RESOURCES: 250,
    STORAGE_MB: 10_240,
    ALIGNMENT_SCANS_PER_WEEK: Infinity,
    CONTENT_STUDIO: 3,   // 3 = full + templates
    EXPORT_FORMATS: 2,   // 2 = PDF + DOCX
  },
  ENTERPRISE: {
    WORKSPACES: Infinity,
    TEAM_MEMBERS: Infinity,
    AI_TOKENS: 2_000_000,
    PERSONAS: Infinity,
    CAMPAIGNS: Infinity,
    BRAND_ASSETS: Infinity,
    PRODUCTS: Infinity,
    MARKET_INSIGHTS: Infinity,
    KNOWLEDGE_RESOURCES: Infinity,
    STORAGE_MB: 102_400,
    ALIGNMENT_SCANS_PER_WEEK: Infinity,
    CONTENT_STUDIO: 4,   // 4 = full + custom
    EXPORT_FORMATS: 3,   // 3 = all formats
  },
};

// ─── Full plan configs ──────────────────────────────────────

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  FREE: {
    tier: 'FREE',
    name: 'Free',
    slug: 'free',
    monthlyPriceEur: 0,
    limits: PLAN_LIMITS.FREE,
    aiOveragePer1kTokens: null, // blocked
    supportLevel: 'community',
    features: ['1 workspace', '1 team member', '10K AI tokens/month', 'Basic Content Studio'],
  },
  PRO: {
    tier: 'PRO',
    name: 'Pro',
    slug: 'pro',
    monthlyPriceEur: 29,
    limits: PLAN_LIMITS.PRO,
    aiOveragePer1kTokens: 0.02,
    supportLevel: 'email',
    features: ['3 workspaces', '5 team members', '100K AI tokens/month', 'Full Content Studio', 'PDF export', 'Daily alignment scans'],
  },
  AGENCY: {
    tier: 'AGENCY',
    name: 'Agency',
    slug: 'agency',
    monthlyPriceEur: 99,
    limits: PLAN_LIMITS.AGENCY,
    aiOveragePer1kTokens: 0.015,
    supportLevel: 'priority',
    features: ['10 workspaces', '25 team members', '500K AI tokens/month', 'Full + Templates', 'PDF + DOCX export', 'Unlimited alignment scans'],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    slug: 'enterprise',
    monthlyPriceEur: 249,
    limits: PLAN_LIMITS.ENTERPRISE,
    aiOveragePer1kTokens: 0.01,
    supportLevel: 'dedicated',
    features: ['Unlimited workspaces', 'Unlimited team members', '2M AI tokens/month', 'Full + Custom', 'All export formats', 'Dedicated support'],
  },
};

// ─── ALL_TIERS ordered by price ─────────────────────────────

export const ALL_TIERS: PlanTier[] = ['FREE', 'PRO', 'AGENCY', 'ENTERPRISE'];

// ─── ALL_FEATURE_KEYS ───────────────────────────────────────

export const ALL_FEATURE_KEYS: FeatureKey[] = [
  'WORKSPACES', 'TEAM_MEMBERS', 'AI_TOKENS', 'PERSONAS', 'CAMPAIGNS',
  'BRAND_ASSETS', 'PRODUCTS', 'MARKET_INSIGHTS', 'KNOWLEDGE_RESOURCES',
  'STORAGE_MB', 'ALIGNMENT_SCANS_PER_WEEK', 'CONTENT_STUDIO', 'EXPORT_FORMATS',
];

// ─── Infinity limits (used when billing is disabled) ────────

export const INFINITY_LIMITS: PlanLimits = PLAN_LIMITS.ENTERPRISE;

// ─── Helper: human-readable limit label ─────────────────────

export function formatLimit(value: number): string {
  if (!isFinite(value)) return 'Unlimited';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
  return String(value);
}

// ─── Helper: get limit for a tier + feature ─────────────────

export function getLimit(tier: PlanTier, feature: FeatureKey): number {
  return PLAN_LIMITS[tier][feature];
}
