// =============================================================
// Emailit suppressions service (4.2)
//
// GDPR-friendly helpers for managing suppressed (do-not-email)
// addresses. Used when a user hits "unsubscribe" or a bounce/
// complaint webhook arrives.
// =============================================================

import { emailitClient, isEmailitConfigured } from './emailit-client';

/**
 * Add an email to the suppression list. No-op when Emailit is not configured.
 */
export async function suppress(
  email: string,
  reason: 'BOUNCE' | 'COMPLAINT' | 'UNSUBSCRIBE' | 'MANUAL' = 'MANUAL',
): Promise<void> {
  if (!isEmailitConfigured()) return;
  await emailitClient.createSuppression({
    email: email.trim().toLowerCase(),
    reason,
  });
}

/**
 * Lookup whether an email is currently on the suppression list.
 * Returns `false` when Emailit is not configured (so dev/tests don't block).
 */
export async function isSuppressed(email: string): Promise<boolean> {
  if (!isEmailitConfigured()) return false;
  const result = await emailitClient.listSuppressions({ email: email.trim().toLowerCase() });
  return Array.isArray(result?.data) && result.data.length > 0;
}

/**
 * Remove an email from the suppression list (admin / user re-opt-in).
 */
export async function unsuppress(suppressionId: string): Promise<void> {
  if (!isEmailitConfigured()) return;
  await emailitClient.deleteSuppression(suppressionId);
}
