// Shared API-error type + i18n mapping for entitlement/authorization
// failures. Routes that opt in return a stable `code` alongside the
// (log-only, English) `error` string — see `buildLimitResponse()` in
// src/lib/stripe/enforcement.ts for the plan-limit 402s, and the 403/409
// branches in src/app/api/workspaces/route.ts + organization/invite/route.ts.
//
// `throwApiError()` reads that shape off a failed Response; `translateApiError()`
// turns a `code` into a localized string via the `entitlement-errors`
// namespace, falling back to the raw English `error` for routes that haven't
// been migrated to `code` yet.

import type { TFunction } from 'i18next';
import type { FeatureKey, PlanTier } from '@/types/billing';

export class ApiError extends Error {
  status: number;
  code?: string;
  feature?: FeatureKey;
  current?: number;
  limit?: number;
  tier?: PlanTier;
  upgradeRequired?: boolean;

  constructor(status: number, body: Record<string, unknown>) {
    super(typeof body.error === 'string' ? body.error : `Request failed (${status})`);
    this.name = 'ApiError';
    this.status = status;
    this.code = typeof body.code === 'string' ? body.code : undefined;
    this.feature = typeof body.feature === 'string' ? (body.feature as FeatureKey) : undefined;
    this.current = typeof body.current === 'number' ? body.current : undefined;
    this.limit = typeof body.limit === 'number' ? body.limit : undefined;
    this.tier = typeof body.tier === 'string' ? (body.tier as PlanTier) : undefined;
    this.upgradeRequired = body.upgradeRequired === true;
  }
}

/** Throws an {@link ApiError} built from a failed fetch Response's JSON body. */
export async function throwApiError(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}));
  throw new ApiError(res.status, body);
}

/**
 * Translates an {@link ApiError} into a localized string via the
 * `entitlement-errors` namespace, keyed on `code`. Falls back to the raw
 * English `error` message for errors without a `code` (routes not yet
 * migrated) so nothing renders blank.
 */
export function translateApiError(t: TFunction, err: ApiError): string {
  if (!err.code) return err.message;
  return t(`code.${err.code}`, {
    ns: 'entitlement-errors',
    limit: err.limit !== undefined && isFinite(err.limit) ? err.limit : undefined,
    tier: err.tier,
    defaultValue: err.message,
  });
}
