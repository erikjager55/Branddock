// =============================================================
// Billing types — shared across Stripe, API routes, and UI
// =============================================================

// ─── Plan Tiers ─────────────────────────────────────────────

export type PlanTier = 'FREE' | 'PRO' | 'AGENCY' | 'ENTERPRISE';

// ─── Feature Keys (resource types that have plan limits) ────

export type FeatureKey =
  | 'WORKSPACES'
  | 'TEAM_MEMBERS'
  | 'AI_TOKENS'
  | 'PERSONAS'
  | 'CAMPAIGNS'
  | 'BRAND_ASSETS'
  | 'PRODUCTS'
  | 'MARKET_INSIGHTS'
  | 'KNOWLEDGE_RESOURCES'
  | 'STORAGE_MB'
  | 'ALIGNMENT_SCANS_PER_WEEK'
  | 'CONTENT_STUDIO'
  | 'EXPORT_FORMATS';

// ─── Plan Limits ────────────────────────────────────────────

export type PlanLimits = Record<FeatureKey, number>;

// ─── Subscription Status ────────────────────────────────────

export type SubscriptionStatus =
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELED'
  | 'PAUSED'
  | 'TRIALING'
  | 'INCOMPLETE';

// ─── Billing Mode ───────────────────────────────────────────

export type BillingMode = 'disabled' | 'test' | 'live';

// ─── Plan Config (full definition per tier) ─────────────────

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  slug: string;
  monthlyPriceEur: number;
  limits: PlanLimits;
  aiOveragePer1kTokens: number | null; // null = blocked
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  features: string[];
}

// ─── Effective Plan (what the app uses at runtime) ──────────

export interface EffectivePlan {
  tier: PlanTier;
  name: string;
  limits: PlanLimits;
  isFreeBeta: boolean;
}

// ─── Usage Record ───────────────────────────────────────────

export interface UsageRecord {
  feature: FeatureKey;
  current: number;
  limit: number;
  percentage: number;
  isAtLimit: boolean;
}

// ─── Checkout Session ───────────────────────────────────────

export interface CheckoutSessionRequest {
  planTier: PlanTier;
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}

// ─── Stripe Price IDs (env-based) ───────────────────────────

export interface StripePriceIds {
  proMonthly: string | undefined;
  agencyMonthly: string | undefined;
  enterpriseMonthly: string | undefined;
  aiOverage: string | undefined;
}
