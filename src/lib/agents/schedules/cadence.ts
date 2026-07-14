// =============================================================
// Cadence-algebra voor AgentSchedule (agents-scheduling, slice 2).
//
// Eén pure module, gedeeld door de CRUD-routes én de cron-enqueue-
// stap — nextRunAt mag nooit uit twee verschillende berekeningen
// komen. Geen tz-library in de repo: de wall-clock→UTC-vertaling
// loopt via Intl.DateTimeFormat (two-pass offset, DST-veilig).
// =============================================================

export const SCHEDULE_CADENCES = ['EVERY_MINUTE', 'DAILY', 'WEEKLY', 'MONTHLY'] as const;
export type ScheduleCadence = (typeof SCHEDULE_CADENCES)[number];

export interface CadenceFields {
  cadence: string;
  /** "HH:MM" 24h wall-clock in `timezone`. */
  timeOfDay: string;
  /** ISO-weekdag 1-7 (ma-zo) — vereist bij WEEKLY. */
  dayOfWeek: number | null;
  /** 1-28 — vereist bij MONTHLY. */
  dayOfMonth: number | null;
  /** IANA-timezone. */
  timezone: string;
}

const DAY_MS = 86_400_000;
/** Ruim boven de grootste due-gap (MONTHLY dag-28 vanaf de 29e ≈ 30 dagen). */
const MAX_CANDIDATE_DAYS = 62;

/** Geldige IANA-timezone? (Intl throwt op onbekende zones.) */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset (ms) van `timeZone` t.o.v. UTC op moment `at`. */
function tzOffsetMs(timeZone: string, at: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes): number => {
    const value = parts.find((p) => p.type === type)?.value ?? '0';
    // Sommige ICU-versies formatteren middernacht als "24".
    return type === 'hour' && value === '24' ? 0 : Number(value);
  };
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - at.getTime();
}

/**
 * UTC-instant voor kalenderdatum y-m-d om hh:mm wall-clock in `timeZone`.
 * Two-pass: rond een DST-overgang wijkt de offset van de eerste gok af;
 * de tweede pass convergeert (niet-bestaande tijden bij spring-forward
 * landen deterministisch op het dichtstbijzijnde geldige instant).
 */
function zonedTimeToUtc(y: number, m: number, d: number, hh: number, mm: number, timeZone: string): Date {
  const wallClockAsUtc = Date.UTC(y, m - 1, d, hh, mm);
  const firstGuess = wallClockAsUtc - tzOffsetMs(timeZone, new Date(wallClockAsUtc));
  const secondOffset = tzOffsetMs(timeZone, new Date(firstGuess));
  return new Date(wallClockAsUtc - secondOffset);
}

/** Kalenderdatum (y/m/d) van `at` gezien in `timeZone`. */
function localDateParts(timeZone: string, at: Date): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  return { y: get('year'), m: get('month'), d: get('day') };
}

/** ISO-weekdag (1=ma … 7=zo) van een pure kalenderdatum. */
function isoWeekday(y: number, m: number, d: number): number {
  const sundayBased = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return ((sundayBased + 6) % 7) + 1;
}

/**
 * Eerstvolgende run-instant strikt ná `from`, volgens de cadence-velden.
 * Deterministisch en puur — de enqueue-claim (conditionele update op de
 * gelezen nextRunAt) leunt hierop voor exactly-once per due-slot.
 */
export function computeNextRunAt(fields: CadenceFields, from: Date): Date {
  const cadence = fields.cadence as ScheduleCadence;
  if (!SCHEDULE_CADENCES.includes(cadence)) {
    throw new Error(`Unknown cadence '${fields.cadence}'`);
  }
  if (cadence === 'EVERY_MINUTE') return new Date(from.getTime() + 60_000);

  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(fields.timeOfDay);
  if (!match) throw new Error(`Invalid timeOfDay '${fields.timeOfDay}' (verwacht "HH:MM")`);
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (cadence === 'WEEKLY' && (fields.dayOfWeek === null || fields.dayOfWeek < 1 || fields.dayOfWeek > 7)) {
    throw new Error('WEEKLY vereist dayOfWeek 1-7');
  }
  if (cadence === 'MONTHLY' && (fields.dayOfMonth === null || fields.dayOfMonth < 1 || fields.dayOfMonth > 28)) {
    throw new Error('MONTHLY vereist dayOfMonth 1-28');
  }

  const start = localDateParts(fields.timezone, from);
  // Kandidaat-dagen via UTC-middag-arithmetiek: +n·24h op 12:00 UTC kan
  // nooit een kalenderdag overslaan of dubbel tellen (DST bestaat niet in UTC).
  const startNoonUtc = Date.UTC(start.y, start.m - 1, start.d, 12);
  for (let i = 0; i <= MAX_CANDIDATE_DAYS; i++) {
    const dayRef = new Date(startNoonUtc + i * DAY_MS);
    const y = dayRef.getUTCFullYear();
    const m = dayRef.getUTCMonth() + 1;
    const d = dayRef.getUTCDate();
    if (cadence === 'WEEKLY' && isoWeekday(y, m, d) !== fields.dayOfWeek) continue;
    if (cadence === 'MONTHLY' && d !== fields.dayOfMonth) continue;
    const candidate = zonedTimeToUtc(y, m, d, hh, mm, fields.timezone);
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  // Onbereikbaar: DAILY matcht elke dag, WEEKLY elke 7, MONTHLY elke ≤31+28.
  throw new Error('computeNextRunAt: geen kandidaat gevonden (bug)');
}
