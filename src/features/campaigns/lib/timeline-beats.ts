/**
 * Timeline beats — horizontal columns rendered in the Timeline view.
 *
 * A "beat" is one column. Its length depends on the selected zoom unit:
 *   - day    : one calendar day
 *   - week   : Monday-Sunday (ISO week)
 *   - month  : one calendar month
 *
 * Design goals:
 *  - Campaign `startDate` drives the first column when available.
 *  - Otherwise, first column is derived from the earliest scheduled item,
 *    falling back to "today".
 *  - End is driven by the latest scheduled item, clamped to startDate +
 *    `maxBeats` so the scroll extent stays manageable per zoom level.
 *  - At least `minBeats` columns are shown so the layout never looks
 *    cramped when there are only a few items.
 */

export type TimelineUnit = "day" | "week" | "month";

export interface TimelineBeat {
  /** Zero-based index (first beat = 0). */
  index: number;
  /** Local midnight of the beat's first day. */
  startDate: Date;
  /** Local 23:59:59.999 of the beat's last day. */
  endDate: Date;
  /** Short primary label ("Mon 21", "Apr 21", "Apr"). */
  label: string;
  /** Secondary label below the primary (e.g. date range for week unit, year for month). */
  secondary?: string;
  /** Long label for tooltips ("Apr 21 — Apr 27 · Week 17"). */
  longLabel: string;
  /** ISO week number — set only for week unit. */
  weekNumber?: number;
  /** Group label — e.g. month for day/week units, year for month units. */
  groupLabel?: string;
  /** True when this beat starts a new group (first-of-month, first-of-year). */
  isGroupStart?: boolean;
}

export interface BeatsResult {
  beats: TimelineBeat[];
  /** Index of the beat containing "today", or null if today is outside range. */
  todayBeatIndex: number | null;
}

/** Minimum beat count per unit — ensures the layout never looks cramped
 *  when the data range is small. The Timeline view extends past these
 *  minimums dynamically via an `extensionCount` prop so scrolling behaves
 *  effectively as "infinite" forward. */
const MIN_BEATS: Record<TimelineUnit, number> = {
  day: 14,
  week: 6,
  month: 3,
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/** Monday of the week containing `d` (local time). */
function mondayOf(d: Date): Date {
  const day = d.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() + offset);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

/** First of the month containing `d`. */
function firstOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/** Local midnight (00:00) of `d`. */
function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/** ISO week number (1-53). */
function isoWeekNumber(d: Date): number {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const diff = (target.getTime() - firstThursday.getTime()) / MS_PER_DAY;
  return 1 + Math.round((diff - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
}

/** Number of beats needed to cover `[start, end]` at the given unit. */
function beatsNeeded(start: Date, end: Date, unit: TimelineUnit): number {
  if (unit === "day") {
    return Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  }
  if (unit === "week") {
    return Math.ceil((end.getTime() - start.getTime()) / MS_PER_WEEK) + 1;
  }
  // month: count whole calendar months in the span
  return (
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth()) +
    1
  );
}

function generateBeat(start: Date, unit: TimelineUnit, index: number, prev?: TimelineBeat): TimelineBeat {
  if (unit === "day") {
    const endDate = new Date(start.getFullYear(), start.getMonth(), start.getDate(), 23, 59, 59, 999);
    const monthLabel = start.toLocaleDateString(undefined, { month: "short" });
    const dayLabel = start.toLocaleDateString(undefined, { weekday: "short" });
    const dayNum = start.getDate();
    const groupLabel = start.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    const isGroupStart = !prev || prev.groupLabel !== groupLabel;
    return {
      index,
      startDate: new Date(start),
      endDate,
      label: `${dayLabel} ${dayNum}`,
      secondary: isGroupStart ? monthLabel : undefined,
      longLabel: start.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      groupLabel,
      isGroupStart,
    };
  }
  if (unit === "week") {
    const monday = mondayOf(start);
    const sunday = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 6,
      23,
      59,
      59,
      999,
    );
    const weekNumber = isoWeekNumber(monday);
    const mondayLabel = monday.toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const sundayLabel = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + 6,
    ).toLocaleDateString(undefined, { day: "numeric", month: "short" });
    const groupLabel = monday.toLocaleDateString(undefined, { month: "short", year: "numeric" });
    const isGroupStart = !prev || prev.groupLabel !== groupLabel;
    return {
      index,
      startDate: monday,
      endDate: sunday,
      label: `W${weekNumber}`,
      secondary: `${mondayLabel} – ${sundayLabel}`,
      longLabel: `Week ${weekNumber} · ${mondayLabel} — ${sundayLabel}`,
      weekNumber,
      groupLabel,
      isGroupStart,
    };
  }
  // month
  const first = firstOfMonth(start);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthLabel = first.toLocaleDateString(undefined, { month: "short" });
  const yearLabel = String(first.getFullYear());
  const isGroupStart = !prev || prev.groupLabel !== yearLabel;
  return {
    index,
    startDate: first,
    endDate: last,
    label: monthLabel,
    secondary: isGroupStart ? yearLabel : undefined,
    longLabel: first.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
    groupLabel: yearLabel,
    isGroupStart,
  };
}

/** Step one beat forward given current start + unit. */
function advance(start: Date, unit: TimelineUnit): Date {
  if (unit === "day") {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
  }
  if (unit === "week") {
    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
  }
  return new Date(start.getFullYear(), start.getMonth() + 1, 1);
}

/** Snap `d` to the start of its beat for the given unit. */
function snapToBeatStart(d: Date, unit: TimelineUnit): Date {
  if (unit === "day") return startOfDay(d);
  if (unit === "week") return mondayOf(d);
  return firstOfMonth(d);
}

/**
 * Build the column grid for the timeline at the given unit.
 *
 * @param extensionCount Extra beats appended AFTER the natural end to
 *   support infinite-forward scrolling. Start at 0 and grow as the user
 *   scrolls toward the right edge of the viewport.
 */
export function buildTimelineBeats(
  anchorStart: Date | string | null | undefined,
  itemDates: (Date | string | null | undefined)[] = [],
  anchorEnd?: Date | string | null,
  unit: TimelineUnit = "week",
  extensionCount: number = 0,
): BeatsResult {
  const parsedItems = itemDates
    .map((d) => (d ? new Date(d) : null))
    .filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()));

  // Anchor start: prefer campaign startDate, else earliest item, else today.
  let startDate: Date;
  if (anchorStart) {
    startDate = new Date(anchorStart);
  } else if (parsedItems.length > 0) {
    startDate = new Date(Math.min(...parsedItems.map((d) => d.getTime())));
  } else {
    startDate = new Date();
  }
  const firstBeatStart = snapToBeatStart(startDate, unit);

  // Natural end from campaign endDate + latest item date.
  const endCandidates: Date[] = [...parsedItems];
  if (anchorEnd) endCandidates.push(new Date(anchorEnd));
  const naturalEnd =
    endCandidates.length > 0
      ? new Date(Math.max(...endCandidates.map((d) => d.getTime())))
      : firstBeatStart;

  const neededForData = beatsNeeded(firstBeatStart, naturalEnd, unit);
  const beatCount = Math.max(MIN_BEATS[unit], neededForData) + extensionCount;

  const beats: TimelineBeat[] = [];
  let cursor = new Date(firstBeatStart);
  for (let i = 0; i < beatCount; i++) {
    const prev = beats[beats.length - 1];
    const beat = generateBeat(cursor, unit, i, prev);
    beats.push(beat);
    cursor = advance(cursor, unit);
  }

  const todayMs = Date.now();
  const todayBeatIndex = beats.findIndex(
    (b) => b.startDate.getTime() <= todayMs && todayMs <= b.endDate.getTime(),
  );

  return {
    beats,
    todayBeatIndex: todayBeatIndex === -1 ? null : todayBeatIndex,
  };
}

/** Find the beat index that contains a given date, or null if outside range. */
export function findBeatIndexForDate(
  beats: TimelineBeat[],
  d: Date | string,
): number | null {
  const ts = new Date(d).getTime();
  for (const b of beats) {
    if (b.startDate.getTime() <= ts && ts <= b.endDate.getTime()) {
      return b.index;
    }
  }
  return null;
}
