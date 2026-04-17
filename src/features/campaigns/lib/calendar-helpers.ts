/**
 * Shared date helpers for calendar views.
 *
 * Used by:
 *  - DeploymentCalendarView (single campaign blueprint)
 *  - ContentLibraryCalendarView (workspace-wide deliverables)
 *  - CampaignsOverviewCalendarView (Gantt-style campaign bars)
 *
 * All helpers operate in local time to avoid UTC off-by-one issues
 * when parsing date-only strings (YYYY-MM-DD) from the database.
 */

/** Parse YYYY-MM-DD as local midnight to avoid UTC off-by-one */
export function parseLocalDate(iso: string): Date {
  return new Date(iso + "T00:00:00");
}

/** Strip time portion → midnight of same calendar day */
export function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Add days, returning a new Date (does not mutate input) */
export function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
}

/** ISO date key (YYYY-MM-DD) for Map lookups */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Format month label e.g. "March 2026" */
export function formatMonthLabel(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

/** Get the Monday of the week containing the given date */
export function getMondayOfWeek(d: Date): Date {
  const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

/** First day to show in the month grid (Monday of the week containing day 1) */
export function getCalendarGridStart(year: number, monthIdx: number): Date {
  const firstOfMonth = new Date(year, monthIdx, 1);
  return getMondayOfWeek(firstOfMonth);
}

/** Build a 6-week (42-cell) calendar grid for the given month */
export function buildCalendarDays(viewMonth: Date): Array<{
  date: Date;
  isCurrentMonth: boolean;
  key: string;
}> {
  const gridStart = getCalendarGridStart(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
  );
  const days: Array<{ date: Date; isCurrentMonth: boolean; key: string }> = [];
  for (let i = 0; i < 42; i++) {
    const d = addDays(gridStart, i);
    days.push({
      date: d,
      isCurrentMonth: d.getMonth() === viewMonth.getMonth(),
      key: dateKey(d),
    });
  }
  return days;
}

/** Weekday labels in Monday-first order */
export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Number of days between two dates (difference, not inclusive count).
 *  For inclusive count, add 1 to the result. */
export function daysBetween(start: Date, end: Date): number {
  const ms = stripTime(end).getTime() - stripTime(start).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}
