/**
 * Content publish-readiness check.
 *
 * Resolves the most recent ContentFidelityScore on the most recent
 * ContentVersion for a deliverable, compares against the type-specific
 * compositeThreshold from fidelity-criteria.ts, and returns a structured
 * gate-result that the publish-route + UI both consume.
 *
 * Failsafe-open by design: missing data (no ContentVersion yet, no score
 * yet, judge-call failure) returns canPublish=true with a `reason` flag
 * so the route doesn't brick on infrastructure outages. Override is
 * available for the actual blocked path (compositeScore < threshold).
 */

import { prisma } from '@/lib/prisma';
import { getFidelityConfig } from '@/features/campaigns/lib/fidelity-criteria';

export type ReadinessReason =
  | 'no-version' // no ContentVersion exists yet — never generated
  | 'no-score' // version exists but no fidelity score (judge call may have failed or be in-flight)
  | 'below-threshold' // compositeScore < type-specific threshold
  | 'ready'; // thresholdMet=true on most recent score

export interface ContentReadiness {
  canPublish: boolean;
  reason: ReadinessReason;
  contentVersionId: string | null;
  latestScore: {
    id: string;
    compositeScore: number;
    threshold: number;
    thresholdMet: boolean;
    judgeIdentifier: string;
    scoredAt: Date;
  } | null;
}

export async function getContentReadiness(
  deliverableId: string,
  workspaceId: string,
): Promise<ContentReadiness> {
  const deliverable = await prisma.deliverable.findFirst({
    where: { id: deliverableId, campaign: { workspaceId } },
    select: { id: true, contentType: true },
  });
  if (!deliverable) {
    throw new Error(`Deliverable ${deliverableId} not found in workspace ${workspaceId}`);
  }

  const latestVersion = await prisma.contentVersion.findFirst({
    where: { deliverableId },
    orderBy: { versionNumber: 'desc' },
    select: { id: true },
  });
  if (!latestVersion) {
    return { canPublish: true, reason: 'no-version', contentVersionId: null, latestScore: null };
  }

  // Look up the latest score across ALL versions of this deliverable, not
  // just the latest version. This handles the common case where the user
  // edits an AI-scored version into a USER-version (no score yet) — we
  // want the gate to use the most recent score we have, not silently
  // fail-open just because the topmost version isn't scored yet.
  const latestScore = await prisma.contentFidelityScore.findFirst({
    where: {
      workspaceId,
      contentVersion: { deliverableId },
    },
    orderBy: { scoredAt: 'desc' },
    select: {
      id: true,
      contentVersionId: true,
      compositeScore: true,
      thresholdMet: true,
      judgeIdentifier: true,
      scoredAt: true,
    },
  });
  if (!latestScore) {
    return {
      canPublish: true,
      reason: 'no-score',
      contentVersionId: latestVersion.id,
      latestScore: null,
    };
  }

  const config = getFidelityConfig(deliverable.contentType ?? 'generic');
  const threshold = config?.compositeThreshold ?? 70;

  return {
    canPublish: latestScore.thresholdMet,
    reason: latestScore.thresholdMet ? 'ready' : 'below-threshold',
    contentVersionId: latestScore.contentVersionId,
    latestScore: {
      id: latestScore.id,
      compositeScore: latestScore.compositeScore,
      threshold,
      thresholdMet: latestScore.thresholdMet,
      judgeIdentifier: latestScore.judgeIdentifier,
      scoredAt: latestScore.scoredAt,
    },
  };
}
