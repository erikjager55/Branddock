// =============================================================
// Plan limits — single source of truth for plan tiers & limits
//
// Credit-model (ADR 2026-07-07-pricing-credits-launch): lage vaste basis +
// prepaid credit-bundel + on-demand top-up. Prijs = €15 platform-floor +
// credits × incl.-tarief. `PRO` is legacy (vaste-prijs, reeds live in Stripe) —
// behouden voor compat tot de cutover (Fase 3/5), NIET in ALL_TIERS.
//
// All numeric limits in base units. Infinity = unlimited.
// Storage in MB. AI_TOKENS is vestigial (credit-model vervangt token-metering
// in Fase 1); credits leven pooled op Organization-niveau.
// =============================================================

import type { PlanTier, FeatureKey, PlanLimits, PlanConfig } from '@/types/billing';

// ─── Credit-model constanten (ADR 2026-07-07) ───────────────

/** Vaste platform-floor per betaalde tier — dekt infra + eenmalige merk-DNA-setup + achtergrond-AI + Stripe-fee + marge. */
export const PLATFORM_FLOOR_EUR = 15;

/** On-demand top-up-tarief per credit (premium boven het inbegrepen tarief). */
export const TOPUP_RATE_EUR_PER_CREDIT = 0.1;

/** 28-daagse no-card trial: éénmalige bundel (niet resettend). */
export const TRIAL_CREDITS = 300;
export const TRIAL_DAYS = 28;

/** Prepaid top-up-packs (Stripe-price-objecten volgen in Fase 3/5). */
export const TOPUP_PACKS: { credits: number; priceEur: number; discountPct: number }[] = [
  { credits: 500, priceEur: 50, discountPct: 0 },
  { credits: 1_500, priceEur: 135, discountPct: 10 },
  { credits: 5_000, priceEur: 400, discountPct: 20 },
];

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
    CONTENT_STUDIO: 1,
    EXPORT_FORMATS: 0,
  },
  // PRO = legacy vaste-prijs (€29). Behouden voor Stripe-compat tot de cutover.
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
    ALIGNMENT_SCANS_PER_WEEK: 7,
    CONTENT_STUDIO: 2,
    EXPORT_FORMATS: 1,
  },
  STARTER: {
    WORKSPACES: 2,
    TEAM_MEMBERS: 2,
    AI_TOKENS: 100_000,
    PERSONAS: 10,
    CAMPAIGNS: 10,
    BRAND_ASSETS: 20,
    PRODUCTS: 15,
    MARKET_INSIGHTS: 25,
    KNOWLEDGE_RESOURCES: 50,
    STORAGE_MB: 1_024,
    ALIGNMENT_SCANS_PER_WEEK: 7,
    CONTENT_STUDIO: 2,
    EXPORT_FORMATS: 1,
  },
  GROWTH: {
    WORKSPACES: 5,
    TEAM_MEMBERS: 5,
    AI_TOKENS: 300_000,
    PERSONAS: 25,
    CAMPAIGNS: 25,
    BRAND_ASSETS: 50,
    PRODUCTS: 40,
    MARKET_INSIGHTS: 50,
    KNOWLEDGE_RESOURCES: 150,
    STORAGE_MB: 5_120,
    ALIGNMENT_SCANS_PER_WEEK: Infinity,
    CONTENT_STUDIO: 3,
    EXPORT_FORMATS: 2,
  },
  AGENCY: {
    WORKSPACES: 15,
    TEAM_MEMBERS: 10,
    AI_TOKENS: 500_000,
    PERSONAS: 50,
    CAMPAIGNS: 50,
    BRAND_ASSETS: 100,
    PRODUCTS: 75,
    MARKET_INSIGHTS: 100,
    KNOWLEDGE_RESOURCES: 250,
    STORAGE_MB: 10_240,
    ALIGNMENT_SCANS_PER_WEEK: Infinity,
    CONTENT_STUDIO: 3,
    EXPORT_FORMATS: 2,
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
    CONTENT_STUDIO: 4,
    EXPORT_FORMATS: 3,
  },
};

// ─── Full plan configs ──────────────────────────────────────

export const PLAN_CONFIGS: Record<PlanTier, PlanConfig> = {
  FREE: {
    tier: 'FREE',
    name: 'Free trial',
    slug: 'free',
    monthlyPriceEur: 0,
    limits: PLAN_LIMITS.FREE,
    aiOveragePer1kTokens: null,
    supportLevel: 'community',
    monthlyCredits: 0, // 28-daagse trial krijgt TRIAL_CREDITS éénmalig
    workspaces: 1,
    seats: 1,
    platformFloorEur: 0,
    features: [`28-daagse trial`, `${TRIAL_CREDITS} credits eenmalig`, '1 merk', 'Geen betaalmethode nodig'],
  },
  // Legacy vaste-prijs — niet in ALL_TIERS, alleen Stripe-compat tot de cutover.
  PRO: {
    tier: 'PRO',
    name: 'Pro (legacy)',
    slug: 'pro',
    monthlyPriceEur: 29,
    limits: PLAN_LIMITS.PRO,
    aiOveragePer1kTokens: 0.02,
    supportLevel: 'email',
    monthlyCredits: 400,
    workspaces: 3,
    seats: 5,
    platformFloorEur: PLATFORM_FLOOR_EUR,
    isLegacy: true,
    features: ['Legacy vaste-prijs-tier — vervangen door Starter'],
  },
  STARTER: {
    tier: 'STARTER',
    name: 'Starter',
    slug: 'starter',
    monthlyPriceEur: 39,
    limits: PLAN_LIMITS.STARTER,
    aiOveragePer1kTokens: null,
    supportLevel: 'email',
    monthlyCredits: 400,
    workspaces: 2,
    seats: 2,
    platformFloorEur: PLATFORM_FLOOR_EUR,
    features: ['400 credits/maand', '2 merken', '2 gebruikers', 'On-demand top-up €0,10/credit', 'PDF-export'],
  },
  GROWTH: {
    tier: 'GROWTH',
    name: 'Growth',
    slug: 'growth',
    monthlyPriceEur: 89,
    limits: PLAN_LIMITS.GROWTH,
    aiOveragePer1kTokens: null,
    supportLevel: 'priority',
    monthlyCredits: 1_200,
    workspaces: 5,
    seats: 5,
    platformFloorEur: PLATFORM_FLOOR_EUR,
    features: ['1.200 credits/maand', '5 merken', '5 gebruikers', 'On-demand top-up', 'PDF + DOCX export'],
  },
  AGENCY: {
    tier: 'AGENCY',
    name: 'Agency',
    slug: 'agency',
    monthlyPriceEur: 299,
    limits: PLAN_LIMITS.AGENCY,
    aiOveragePer1kTokens: null,
    supportLevel: 'priority',
    monthlyCredits: 4_000,
    workspaces: 15,
    seats: 10,
    platformFloorEur: PLATFORM_FLOOR_EUR,
    features: ['4.000 credits/maand (pooled)', '15 merken', '10 gebruikers', 'Gepoolde credits over alle merken', 'Alle export-formaten'],
  },
  ENTERPRISE: {
    tier: 'ENTERPRISE',
    name: 'Enterprise',
    slug: 'enterprise',
    monthlyPriceEur: 0, // contact sales — geen publieke prijs
    limits: PLAN_LIMITS.ENTERPRISE,
    aiOveragePer1kTokens: null,
    supportLevel: 'dedicated',
    monthlyCredits: 0, // custom
    workspaces: Infinity,
    seats: Infinity,
    platformFloorEur: 0,
    isContactSales: true,
    features: ['Custom credit-volume', 'Unlimited merken', 'SSO + dedicated support', 'Custom F-VAL-packs'],
  },
};

// ─── ALL_TIERS — publiek getoonde tiers, op prijs (PRO = legacy, uitgesloten) ──

export const ALL_TIERS: PlanTier[] = ['FREE', 'STARTER', 'GROWTH', 'AGENCY', 'ENTERPRISE'];

// ─── NEXT_TIER — de eerstvolgende tier in de ladder, voor "Upgrade"-knoppen
// die vanaf de huidige tier moeten upgraden i.p.v. altijd naar een vaste tier
// te springen. PRO (legacy) heeft geen ladder-plek; ENTERPRISE is de top.
export const NEXT_TIER: Partial<Record<PlanTier, PlanTier>> = {
  FREE: 'STARTER',
  STARTER: 'GROWTH',
  GROWTH: 'AGENCY',
  AGENCY: 'ENTERPRISE',
};

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
