'use client';

// =============================================================
// useBilling() — central billing hook for the entire app
//
// Feature-flag aware: when BILLING_ENABLED=false, returns
// "Free Beta" state with ENTERPRISE limits and no-op actions.
// When enabled, uses TanStack Query for real billing data.
// =============================================================

import { useQuery, useMutation } from '@tanstack/react-query';
import { isBillingEnabled } from '@/lib/stripe/feature-flags';
import { PLAN_CONFIGS, INFINITY_LIMITS, formatLimit } from '@/lib/constants/plan-limits';
import type { PlanTier, PlanLimits } from '@/types/billing';

// ─── Types ─────────────────────────────────────────────────

export interface BillingPlan {
  tier: PlanTier;
  name: string;
  monthlyPriceEur: number;
}

export interface BillingUsage {
  aiTokens: number;
  aiTokensLimit: number;
  percentage: number;
}

export interface BillingState {
  plan: BillingPlan;
  limits: PlanLimits;
  usage: BillingUsage;
  isFreeBeta: boolean;
  canUpgrade: boolean;
  isLoading: boolean;
  openCheckout: (planTier: PlanTier, billingCycle?: 'monthly' | 'yearly') => Promise<void>;
  openPortal: () => Promise<void>;
  formatLimit: (value: number) => string;
}

// ─── API fetchers ──────────────────────────────────────────

async function fetchBillingPlan(): Promise<{
  tier: PlanTier;
  name: string;
  monthlyPriceEur: number;
  usage: BillingUsage;
}> {
  const res = await fetch('/api/settings/billing');
  if (!res.ok) throw new Error('Failed to fetch billing');
  const data = await res.json();

  const sub = data.billing?.subscription;
  if (!sub) {
    return {
      tier: 'FREE',
      name: 'Free',
      monthlyPriceEur: 0,
      usage: { aiTokens: 0, aiTokensLimit: PLAN_CONFIGS.FREE.limits.AI_TOKENS, percentage: 0 },
    };
  }

  const slug = (sub.planSlug ?? 'free').toUpperCase() as PlanTier;
  const tier: PlanTier = ['FREE', 'PRO', 'AGENCY', 'ENTERPRISE'].includes(slug)
    ? slug
    : 'FREE';
  const config = PLAN_CONFIGS[tier];

  // Fetch usage data
  let aiTokens = 0;
  try {
    const usageRes = await fetch('/api/settings/billing/usage');
    if (usageRes.ok) {
      const usageData = await usageRes.json();
      aiTokens = usageData.usage?.aiGenerations?.used ?? 0;
    }
  } catch {
    // Usage fetch is non-critical
  }

  const aiTokensLimit = config.limits.AI_TOKENS;
  const percentage = aiTokensLimit > 0 && isFinite(aiTokensLimit)
    ? Math.round((aiTokens / aiTokensLimit) * 100)
    : 0;

  return {
    tier,
    name: config.name,
    monthlyPriceEur: config.monthlyPriceEur,
    usage: { aiTokens, aiTokensLimit, percentage },
  };
}

async function postCheckout(planTier: PlanTier, billingCycle: 'monthly' | 'yearly'): Promise<string> {
  const res = await fetch('/api/stripe/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planTier, billingCycle }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Checkout failed');
  }
  const data = await res.json();
  return data.url;
}

async function postPortal(): Promise<string> {
  const res = await fetch('/api/stripe/portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Portal failed');
  }
  const data = await res.json();
  return data.url;
}

// ─── Free Beta state (billing disabled) ────────────────────

const FREE_BETA_STATE: BillingState = {
  plan: { tier: 'ENTERPRISE', name: 'Free Beta', monthlyPriceEur: 0 },
  limits: INFINITY_LIMITS,
  usage: { aiTokens: 0, aiTokensLimit: Infinity, percentage: 0 },
  isFreeBeta: true,
  canUpgrade: false,
  isLoading: false,
  openCheckout: async () => { /* no-op */ },
  openPortal: async () => { /* no-op */ },
  formatLimit,
};

// ─── Hook ──────────────────────────────────────────────────

export function useBillingPlan(): BillingState {
  const billingEnabled = isBillingEnabled();

  const { data, isLoading } = useQuery({
    queryKey: ['billing', 'plan'],
    queryFn: fetchBillingPlan,
    enabled: billingEnabled,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const checkoutMutation = useMutation({
    mutationFn: ({ planTier, billingCycle }: { planTier: PlanTier; billingCycle: 'monthly' | 'yearly' }) =>
      postCheckout(planTier, billingCycle),
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  const portalMutation = useMutation({
    mutationFn: () => postPortal(),
    onSuccess: (url) => {
      window.location.href = url;
    },
  });

  // When billing is disabled, return Free Beta state
  if (!billingEnabled) {
    return FREE_BETA_STATE;
  }

  // When billing is enabled, return real data
  const tier = data?.tier ?? 'FREE';
  const config = PLAN_CONFIGS[tier];

  return {
    plan: {
      tier,
      name: data?.name ?? config.name,
      monthlyPriceEur: data?.monthlyPriceEur ?? config.monthlyPriceEur,
    },
    limits: config.limits,
    usage: data?.usage ?? { aiTokens: 0, aiTokensLimit: config.limits.AI_TOKENS, percentage: 0 },
    isFreeBeta: false,
    canUpgrade: tier !== 'ENTERPRISE',
    isLoading,
    openCheckout: async (planTier: PlanTier, billingCycle: 'monthly' | 'yearly' = 'monthly') => {
      checkoutMutation.mutate({ planTier, billingCycle });
    },
    openPortal: async () => {
      portalMutation.mutate();
    },
    formatLimit,
  };
}
