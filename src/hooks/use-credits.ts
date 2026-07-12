'use client';

// =============================================================
// useCreditBalance / useTopup — credit-billing-UX-hooks (Fase 6)
//
// Feature-flag-aware: bij BILLING_ENABLED=false zijn de queries disabled
// (de app is dan gratis; geen credit-UI nodig). TanStack Query, spiegel van
// use-billing.ts.
// =============================================================

import { useQuery, useMutation } from '@tanstack/react-query';
import { isCreditsEnabled, isTopupEnabled } from '@/lib/stripe/feature-flags';
import type { PlanTier } from '@/types/billing';

export interface CreditBalance {
  billingEnabled: boolean;
  unlimited: boolean;
  balance: number;
  reserved: number;
  available: number;
  tier: PlanTier;
  monthlyCredits: number;
  trialEndsAt: string | null;
  trialDaysLeft: number | null;
  /** Fase 4: verlopen no-card trial zonder conversie → generatie + nieuwe items dicht. */
  isLocked: boolean;
  /** Trial loopt écht (onderscheidt geconverteerde orgs met rest-trialEndsAt). */
  isTrialing: boolean;
}

export interface TopupPack {
  id: string;
  credits: number;
  priceEur: number;
  discountPct: number;
}

async function fetchBalance(): Promise<CreditBalance> {
  const res = await fetch('/api/billing/balance');
  if (!res.ok) throw new Error('Failed to fetch credit balance');
  return res.json();
}

async function fetchPacks(): Promise<TopupPack[]> {
  const res = await fetch('/api/stripe/topup');
  if (!res.ok) throw new Error('Failed to fetch top-up packs');
  const data = await res.json();
  return (data.packs ?? []) as TopupPack[];
}

async function postTopup(packId: string): Promise<string> {
  const res = await fetch('/api/stripe/topup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Top-up failed');
  }
  const data = await res.json();
  return data.url as string;
}

/** Huidig credit-saldo + trial-status voor de actieve workspace-org. */
export function useCreditBalance() {
  return useQuery({
    queryKey: ['billing', 'credits', 'balance'],
    queryFn: fetchBalance,
    enabled: isCreditsEnabled(),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/** Top-up-pack-catalogus (alleen als kopen ook echt kan — pilotfase: uit). */
export function useTopupPacks() {
  return useQuery({
    queryKey: ['billing', 'credits', 'packs'],
    queryFn: fetchPacks,
    enabled: isCreditsEnabled() && isTopupEnabled(),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Start een pack-aankoop → redirect naar Stripe Checkout. */
export function useTopup() {
  return useMutation({
    mutationFn: (packId: string) => postTopup(packId),
    onSuccess: (url) => {
      window.location.href = url;
    },
  });
}
