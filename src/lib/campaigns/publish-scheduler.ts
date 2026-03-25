// =============================================================
// Publication Date Suggestion Engine
//
// Calculates optimal publish dates for deliverables based on:
// - Campaign timeline (startDate + weekInCampaign)
// - Journey phase windows (awareness early, advocacy late)
// - Platform-specific optimal times (from MediumEnrichment)
// - Anti-clustering (min 4h between items on same platform)
//
// Uses date-fns for date arithmetic (already installed).
// =============================================================

import { addWeeks, addDays, setHours, setMinutes, setSeconds, setMilliseconds, isAfter, isBefore, differenceInHours } from 'date-fns';
import type { JourneyPhase } from './journey-phase';

export interface PublishSuggestion {
  date: Date;
  reasoning: string;
}

interface OptimalPublishTimes {
  dayOfWeek: number[];   // 0=Sunday, 1=Monday, ..., 6=Saturday
  hourRange: number[];   // e.g. [9, 12] = between 9:00 and 12:00
  timezone: string;      // e.g. "Europe/Amsterdam"
}

// ─── Phase Windows ──────────────────────────────────────────
// Each phase maps to a percentage range of the campaign duration.
// Allows overlap between adjacent phases.

const PHASE_WINDOWS: Record<JourneyPhase, { start: number; end: number }> = {
  awareness:     { start: 0.0,  end: 0.35 },
  consideration: { start: 0.2,  end: 0.6 },
  decision:      { start: 0.45, end: 0.8 },
  retention:     { start: 0.65, end: 0.95 },
  advocacy:      { start: 0.8,  end: 1.0 },
};

const MIN_CLUSTER_GAP_HOURS = 4;

// ─── Helpers ─────────────────────────────────────────────────

function findNearestOptimalDay(
  baseDate: Date,
  optimalDays: number[],
): Date {
  if (optimalDays.length === 0) return baseDate;

  const currentDay = baseDate.getDay();
  let bestAbsDistance = Infinity;
  let bestOffset = 0;

  for (const targetDay of optimalDays) {
    // Forward offset (0-6 days ahead)
    const forwardOffset = (targetDay - currentDay + 7) % 7;
    if (forwardOffset < bestAbsDistance) {
      bestAbsDistance = forwardOffset;
      bestOffset = forwardOffset;
    }

    // Backward offset (allow up to 2 days back)
    const backOffset = (currentDay - targetDay + 7) % 7;
    if (backOffset > 0 && backOffset <= 2 && backOffset < bestAbsDistance) {
      bestAbsDistance = backOffset;
      bestOffset = -backOffset;
    }
  }

  return addDays(baseDate, bestOffset);
}

function applyOptimalHour(date: Date, hourRange: number[]): Date {
  const hour = hourRange.length >= 2 ? Math.round((hourRange[0] + hourRange[1]) / 2) : 10;
  return setMilliseconds(setSeconds(setMinutes(setHours(date, hour), 0), 0), 0);
}

function hasClusterConflict(candidate: Date, existingScheduled: Date[]): boolean {
  for (const existing of existingScheduled) {
    const gap = Math.abs(differenceInHours(candidate, existing));
    if (gap < MIN_CLUSTER_GAP_HOURS) return true;
  }
  return false;
}

function nudgeAwayFromCluster(candidate: Date, existingScheduled: Date[]): Date {
  let nudged = candidate;
  let attempts = 0;
  while (hasClusterConflict(nudged, existingScheduled) && attempts < 12) {
    nudged = addDays(nudged, 1);
    attempts++;
  }
  return nudged;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Calculate an optimal publish date for a deliverable.
 *
 * @returns A suggested date with reasoning, or null if campaign dates are missing.
 */
export function calculateOptimalPublishDate(
  campaign: { startDate: Date | null; endDate: Date | null },
  journeyPhase: JourneyPhase | null,
  weekInCampaign: number | null,
  optimalPublishTimes: OptimalPublishTimes | null,
  existingScheduled: Date[],
): PublishSuggestion | null {
  if (!campaign.startDate) return null;

  const start = campaign.startDate;
  const end = campaign.endDate ?? addWeeks(start, 12); // default 12-week campaign
  const reasons: string[] = [];

  // 1. Base date from weekInCampaign
  let candidate: Date;
  if (weekInCampaign != null && weekInCampaign > 0) {
    candidate = addWeeks(start, weekInCampaign - 1);
    reasons.push(`Week ${weekInCampaign} of campaign`);
  } else if (journeyPhase) {
    // Derive from phase window midpoint
    const window = PHASE_WINDOWS[journeyPhase];
    const campaignDurationMs = end.getTime() - start.getTime();
    const midpointRatio = (window.start + window.end) / 2;
    candidate = new Date(start.getTime() + campaignDurationMs * midpointRatio);
    reasons.push(`${journeyPhase} phase midpoint`);
  } else {
    candidate = start;
    reasons.push('Campaign start date (no phase data)');
  }

  // 2. Clamp to phase window if phase is known
  if (journeyPhase) {
    const window = PHASE_WINDOWS[journeyPhase];
    const campaignDurationMs = end.getTime() - start.getTime();
    const windowStart = new Date(start.getTime() + campaignDurationMs * window.start);
    const windowEnd = new Date(start.getTime() + campaignDurationMs * window.end);

    if (isBefore(candidate, windowStart)) {
      candidate = windowStart;
      reasons.push('Clamped to phase window start');
    } else if (isAfter(candidate, windowEnd)) {
      candidate = windowEnd;
      reasons.push('Clamped to phase window end');
    }
  }

  // 3. Optimize to nearest optimal day/time
  if (optimalPublishTimes) {
    if (optimalPublishTimes.dayOfWeek.length > 0) {
      candidate = findNearestOptimalDay(candidate, optimalPublishTimes.dayOfWeek);
      reasons.push(`Optimal day: ${optimalPublishTimes.dayOfWeek.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join('/')}`);
    }
    candidate = applyOptimalHour(candidate, optimalPublishTimes.hourRange);
    reasons.push(`Optimal hour: ${optimalPublishTimes.hourRange.join('-')}h`);
  } else {
    candidate = setMilliseconds(setSeconds(setMinutes(setHours(candidate, 10), 0), 0), 0);
  }

  // 4. Avoid clustering
  if (existingScheduled.length > 0 && hasClusterConflict(candidate, existingScheduled)) {
    candidate = nudgeAwayFromCluster(candidate, existingScheduled);
    reasons.push(`Nudged to avoid clustering (min ${MIN_CLUSTER_GAP_HOURS}h gap)`);
  }

  return {
    date: candidate,
    reasoning: reasons.join('. ') + '.',
  };
}
