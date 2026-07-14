/**
 * Smoke voor computeNextRunAt (agents-scheduling, slice 2) — puur, geen DB.
 * Dekt de DST-grenzen van Europe/Amsterdam (2026: spring-forward 29 mrt,
 * fall-back 25 okt) + cadence-basisgevallen + monotoniciteit.
 *
 * Run: npx tsx scripts/smoke-tests/agent-schedule-cadence.ts
 */

import { computeNextRunAt, isValidTimezone, type CadenceFields } from '../../src/lib/agents/schedules/cadence';

let failures = 0;

function check(label: string, actual: string, expected: string) {
  if (actual === expected) {
    console.log(`✓ ${label}`);
  } else {
    console.error(`❌ ${label}\n   verwacht ${expected}\n   kreeg    ${actual}`);
    failures++;
  }
}

const AMS = 'Europe/Amsterdam';
const daily = (timeOfDay: string): CadenceFields => ({
  cadence: 'DAILY',
  timeOfDay,
  dayOfWeek: null,
  dayOfMonth: null,
  timezone: AMS,
});

// ── DAILY basis (CEST = UTC+2) ──────────────────────────────────────────────
check(
  'DAILY 08:00 — vóór het slot (07:00 lokaal) → zelfde dag 08:00 CEST',
  computeNextRunAt(daily('08:00'), new Date('2026-07-13T05:00:00Z')).toISOString(),
  '2026-07-13T06:00:00.000Z',
);
check(
  'DAILY 08:00 — ná het slot (09:00 lokaal) → volgende dag',
  computeNextRunAt(daily('08:00'), new Date('2026-07-13T07:00:00Z')).toISOString(),
  '2026-07-14T06:00:00.000Z',
);
check(
  'DAILY 08:00 — exact óp het slot → strikt ná from, dus volgende dag',
  computeNextRunAt(daily('08:00'), new Date('2026-07-13T06:00:00Z')).toISOString(),
  '2026-07-14T06:00:00.000Z',
);

// ── WEEKLY / MONTHLY ────────────────────────────────────────────────────────
check(
  'WEEKLY ma 08:00 — vanaf di 14 jul → ma 20 jul 06:00Z',
  computeNextRunAt(
    { cadence: 'WEEKLY', timeOfDay: '08:00', dayOfWeek: 1, dayOfMonth: null, timezone: AMS },
    new Date('2026-07-14T12:00:00Z'),
  ).toISOString(),
  '2026-07-20T06:00:00.000Z',
);
check(
  'MONTHLY dag 1 08:00 — vanaf 15 jan (CET=+1) → 1 feb 07:00Z',
  computeNextRunAt(
    { cadence: 'MONTHLY', timeOfDay: '08:00', dayOfWeek: null, dayOfMonth: 1, timezone: AMS },
    new Date('2026-01-15T12:00:00Z'),
  ).toISOString(),
  '2026-02-01T07:00:00.000Z',
);

// ── DST spring-forward: zo 29 mrt 2026, 02:00→03:00 (CET→CEST) ─────────────
check(
  'DST spring — za 28 mrt ná het slot → zo 29 mrt 08:00 CEST (06:00Z, was 07:00Z)',
  computeNextRunAt(daily('08:00'), new Date('2026-03-28T09:00:00Z')).toISOString(),
  '2026-03-29T06:00:00.000Z',
);

// ── DST fall-back: zo 25 okt 2026, 03:00→02:00 (CEST→CET) ──────────────────
check(
  'DST fall — za 24 okt ná het slot → zo 25 okt 08:00 CET (07:00Z, was 06:00Z)',
  computeNextRunAt(daily('08:00'), new Date('2026-10-24T09:00:00Z')).toISOString(),
  '2026-10-25T07:00:00.000Z',
);

// ── EVERY_MINUTE + monotoniciteit ───────────────────────────────────────────
check(
  'EVERY_MINUTE → +60s',
  computeNextRunAt(
    { cadence: 'EVERY_MINUTE', timeOfDay: '08:00', dayOfWeek: null, dayOfMonth: null, timezone: AMS },
    new Date('2026-07-13T05:00:00Z'),
  ).toISOString(),
  '2026-07-13T05:01:00.000Z',
);

let cursor = new Date('2026-03-25T00:00:00Z'); // keten over de DST-grens heen
for (let i = 0; i < 10; i++) {
  const next = computeNextRunAt(daily('02:30'), cursor); // 02:30 bestaat niet op 29 mrt
  if (next.getTime() <= cursor.getTime()) {
    console.error(`❌ monotoniciteit geschonden op iteratie ${i}: ${next.toISOString()} <= ${cursor.toISOString()}`);
    failures++;
    break;
  }
  cursor = next;
}
if (failures === 0) console.log('✓ monotoniciteit over de DST-grens (10 iteraties, 02:30-slot)');

// ── timezone-validatie ──────────────────────────────────────────────────────
if (!isValidTimezone('Europe/Amsterdam') || isValidTimezone('Mars/Olympus_Mons')) {
  console.error('❌ isValidTimezone faalt');
  failures++;
} else {
  console.log('✓ isValidTimezone');
}

if (failures > 0) {
  console.error(`\n❌ ${failures} case(s) gefaald`);
  process.exit(1);
}
console.log('\n✅ agent-schedule-cadence smoke geslaagd');
