/**
 * Phase-based scheduler — computes a suggested publish date per deliverable,
 * used during campaign launch to pre-populate the timeline with AI-suggested
 * dates (not user-committed scheduled dates).
 *
 * Algorithm:
 *  - Campaign length in weeks comes from `startDate`/`endDate`, otherwise
 *    defaults to `max(phases * 2, 8)` weeks so every phase has breathing room.
 *  - Weeks are distributed evenly across phases (by orderIndex).
 *  - Within a phase, items are spread uniformly over the phase's weeks.
 *  - Days cycle through Mon/Wed/Fri for cadence variety.
 *
 * The result is a Map<title, Date>. Callers should persist these as
 * `suggestedPublishDate` (NOT `scheduledPublishDate`) so users can still
 * accept/override via drag or the "Accept all suggestions" button.
 */

import type {
  AssetPlanDeliverable,
  JourneyPhase,
} from "./strategy-blueprint.types";

/** Days of week used for cadence variety within a phase (0=Sun..6=Sat). */
const CADENCE_DAYS = [1, 3, 5]; // Mon, Wed, Fri
const DEFAULT_HOUR = 10;
const MIN_CAMPAIGN_WEEKS = 6;
const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/** Parse an ISO/string/Date into a Date, stripping time to local midnight. */
function toLocalMidnight(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Compute Monday (local) of the week containing `d`. */
function mondayOf(d: Date): Date {
  const day = d.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const offset = day === 0 ? -6 : 1 - day;
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
}

/**
 * Distribute a total week count across N phases. Simple equal split with
 * remainders given to earlier phases so phase 0 is never shorter than phase 1.
 */
function distributeWeeks(totalWeeks: number, phaseCount: number): number[] {
  if (phaseCount <= 0) return [];
  const base = Math.floor(totalWeeks / phaseCount);
  const remainder = totalWeeks - base * phaseCount;
  const out: number[] = [];
  for (let i = 0; i < phaseCount; i++) {
    out.push(base + (i < remainder ? 1 : 0));
  }
  return out;
}

export interface PhaseScheduleResult {
  /** title → Date map (suggested publish date per deliverable). */
  byTitle: Map<string, Date>;
  /** Monday of week 1 (first campaign beat). */
  scheduleStart: Date;
  /** Total weeks the schedule covers. */
  totalWeeks: number;
}

/**
 * Compute suggested publish dates for a set of deliverables grouped by
 * blueprint journey phase. Deterministic: same inputs → same outputs.
 */
export function computePhaseSchedule(
  deliverables: AssetPlanDeliverable[],
  phases: JourneyPhase[],
  options: {
    campaignStart?: Date | string | null;
    campaignEnd?: Date | string | null;
  } = {},
): PhaseScheduleResult {
  // Anchor: campaign start, or Monday of this week if unknown.
  const anchor = toLocalMidnight(options.campaignStart) ?? new Date();
  const scheduleStart = mondayOf(anchor);

  // Derive total weeks: from range if known, else default spread.
  const end = toLocalMidnight(options.campaignEnd);
  let totalWeeks: number;
  if (end) {
    totalWeeks = Math.max(
      MIN_CAMPAIGN_WEEKS,
      Math.ceil((end.getTime() - scheduleStart.getTime()) / MS_PER_WEEK),
    );
  } else {
    totalWeeks = Math.max(MIN_CAMPAIGN_WEEKS, phases.length * 2);
  }

  // Phase ordering & week allocation.
  const orderedPhases = [...phases].sort((a, b) => a.orderIndex - b.orderIndex);
  const phaseNames = orderedPhases.map((p) => p.name);
  const weekAllocation = distributeWeeks(totalWeeks, Math.max(1, orderedPhases.length));

  // Compute cumulative phase start weeks.
  const phaseStartWeeks: number[] = [];
  let cursor = 0;
  for (const w of weekAllocation) {
    phaseStartWeeks.push(cursor);
    cursor += w;
  }

  const byTitle = new Map<string, Date>();

  // Group deliverables per phase (by exact phase-name match, case-insensitive).
  const phaseIndexByName = new Map<string, number>();
  phaseNames.forEach((n, i) => phaseIndexByName.set(n.toLowerCase(), i));

  interface Grouped { items: AssetPlanDeliverable[]; phaseIdx: number }
  const grouped: Grouped[] = orderedPhases.map((_, idx) => ({ items: [], phaseIdx: idx }));
  const unmatched: AssetPlanDeliverable[] = [];

  for (const d of deliverables) {
    const key = (d.phase ?? "").trim().toLowerCase();
    const idx = phaseIndexByName.get(key);
    if (idx === undefined) {
      unmatched.push(d);
    } else {
      grouped[idx].items.push(d);
    }
  }

  // Unmatched deliverables — spread evenly across the whole campaign as a
  // fallback so they still appear somewhere rather than all on day 1.
  if (unmatched.length > 0) {
    // Treat as pseudo-phase 0 (or the last phase) to avoid dropping items.
    grouped[0].items.push(...unmatched);
  }

  for (const { items, phaseIdx } of grouped) {
    if (items.length === 0) continue;
    // Stable sort: suggestedOrder first, then title alphabetical.
    const sorted = [...items].sort((a, b) => {
      const ao = a.suggestedOrder ?? Number.MAX_SAFE_INTEGER;
      const bo = b.suggestedOrder ?? Number.MAX_SAFE_INTEGER;
      if (ao !== bo) return ao - bo;
      return a.title.localeCompare(b.title);
    });

    const phaseStartWeek = phaseStartWeeks[phaseIdx] ?? 0;
    const phaseWeekCount = weekAllocation[phaseIdx] ?? 1;

    // Spread items across the phase: step = weekCount / itemCount. Each
    // item lands at startWeek + floor(i * step). Days cycle M/W/F for
    // rhythm. If multiple items share the same week, later items take later
    // days of that cycle.
    for (let i = 0; i < sorted.length; i++) {
      const item = sorted[i];
      const step = phaseWeekCount / sorted.length;
      const weekOffset = phaseStartWeek + Math.floor(i * step);
      const dayOfWeek = CADENCE_DAYS[i % CADENCE_DAYS.length];

      const date = new Date(
        scheduleStart.getFullYear(),
        scheduleStart.getMonth(),
        scheduleStart.getDate() + weekOffset * 7 + (dayOfWeek - 1),
        DEFAULT_HOUR,
        0,
        0,
        0,
      );
      byTitle.set(item.title, date);
    }
  }

  return { byTitle, scheduleStart, totalWeeks };
}
