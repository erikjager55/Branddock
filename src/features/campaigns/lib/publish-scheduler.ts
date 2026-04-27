/**
 * Publish-shortcut scheduling helpers — Sprint A · Step 3.
 *
 * Small pure-date utilities that power the hover/popover "Quick publish"
 * menu on content cards. Keep these framework-free so they can be unit-
 * tested independently from the TanStack mutations that consume them.
 */

/**
 * Next business day at 10:00 local time — the default for
 * "Approve + Schedule" when the user hasn't picked a time yet.
 *
 * "Next" means at least one calendar day after `from`, skipping
 * Saturdays and Sundays. Seconds and milliseconds are zeroed.
 */
export function nextBusinessDay10am(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setHours(10, 0, 0, 0);
  do {
    d.setDate(d.getDate() + 1);
  } while (d.getDay() === 0 || d.getDay() === 6);
  return d;
}

/**
 * "Schedule same as last" — given a set of items with optional
 * `scheduledPublishDate`, returns the most recent scheduled datetime
 * plus one calendar day. Returns null if no prior item is scheduled.
 *
 * We intentionally do NOT skip weekends here: a power user scheduling
 * two posts in a row probably wants the cadence honored, even across
 * a weekend. If that causes issues we can layer a business-day skip.
 */
export function sameTimeAsLast(
  items: ReadonlyArray<{ scheduledPublishDate: string | null }>,
): Date | null {
  let latest: Date | null = null;
  for (const item of items) {
    if (!item.scheduledPublishDate) continue;
    const d = new Date(item.scheduledPublishDate);
    if (Number.isNaN(d.getTime())) continue;
    if (latest === null || d > latest) latest = d;
  }
  if (latest === null) return null;
  const next = new Date(latest);
  next.setDate(next.getDate() + 1);
  return next;
}

/** Split a Date into the `yyyy-MM-dd` and `HH:mm` strings <input> elements expect. */
export function splitDateForInput(date: Date): { date: string; time: string } {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}:${mi}` };
}
