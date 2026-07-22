// =============================================================
// Billing types — shared across Stripe, API routes, and UI
//
// Credit-model (ADR 2026-07-07-pricing-credits-launch): lage vaste basis +
// prepaid credit-bundel + on-demand top-up. `PRO` is een legacy vaste-prijs-tier
// die tot de cutover (Fase 3/5) blijft bestaan voor Stripe-compat; hij zit NIET
// in ALL_TIERS.
// =============================================================

// ─── Plan Tiers ─────────────────────────────────────────────

export type PlanTier = 'FREE' | 'PRO' | 'STARTER' | 'GROWTH' | 'AGENCY' | 'ENTERPRISE';

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
  monthlyPriceEur: number; // 0 voor FREE en contact-sales
  limits: PlanLimits;
  aiOveragePer1kTokens: number | null; // legacy (token-metering) — vervangen door credits
  supportLevel: 'community' | 'email' | 'priority' | 'dedicated';
  features: string[];

  // ── Credit-model velden (ADR 2026-07-07) ──
  monthlyCredits: number; // pooled maandtegoed (0 voor contact-sales)
  workspaces: number; // aantal merken; Infinity = unlimited
  seats: number; // aantal gebruikers; Infinity = unlimited
  platformFloorEur: number; // vaste floor die de basis dekt (€15 voor betaalde tiers)
  isContactSales?: boolean; // ENTERPRISE — geen publieke prijs
  isLegacy?: boolean; // PRO — niet in ALL_TIERS, alleen Stripe-compat tot cutover
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

// ─── Credit-model domein-types (ADR 2026-07-07) ─────────────

/** Mirror van prisma `CreditTransactionType`. */
export type CreditTransactionType =
  | 'TRIAL_GRANT'
  | 'PLAN_GRANT'
  | 'TOPUP'
  | 'DEDUCT'
  | 'RESERVE'
  | 'RECONCILE'
  | 'REFUND'
  | 'EXPIRY';

/** Credit-verbruikende acties (pre-flight-schatting). Gratis acties staan in ZERO_COST_ACTIONS. */
export type CreditAction =
  | 'short'
  | 'long-form'
  | 'image'
  | 'image-4k'
  | 'video-clip'
  | 'agent-deliverable';

/** Momentopname van het pooled saldo van een organisatie. */
export interface CreditBalanceSnapshot {
  organizationId: string;
  balance: number;
  reserved: number;
  available: number; // balance - reserved
  lifetimeGranted: number;
  lifetimeSpent: number;
}

/** Pre-flight-schatting die de UI toont vóór een generatie ("dit kost ~N credits"). */
export interface CreditCostEstimate {
  action: CreditAction | 'free';
  estimatedCredits: number;
  isFree: boolean;
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
// Legacy-velden (pro/agency/enterprise) blijven tot de cutover; de credit-model-
// velden (starter/growth + top-up-packs) worden gevuld in Fase 3/5.

export interface StripePriceIds {
  // Legacy vaste-prijs (reeds live)
  proMonthly: string | undefined;
  agencyMonthly: string | undefined;
  enterpriseMonthly: string | undefined;
  proYearly: string | undefined;
  agencyYearly: string | undefined;
  enterpriseYearly: string | undefined;
  aiOverage: string | undefined;
  // Credit-model (voorbereidend — waarden in Fase 3/5)
  starterMonthly: string | undefined;
  growthMonthly: string | undefined;
  starterYearly: string | undefined;
  growthYearly: string | undefined;
  topupSmall: string | undefined; // 500 credits
  topupMedium: string | undefined; // 1.500 credits
  topupLarge: string | undefined; // 5.000 credits
}
