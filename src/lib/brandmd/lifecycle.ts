// =============================================================
// brand.md lifecycle — welke mail mag er vandaag uit?
//
// Los van de cron-route zodat de vensterlogica zonder DB, mailer of
// HTTP te smoken is (`scripts/smoke-tests/brandmd-lifecycle.ts`). De
// route blijft dun: kandidaten ophalen, deze beslissing volgen,
// versturen, markeren.
//
// Regels (touchpoints fase 2):
//   - Hooguit één mail per draft per run.
//   - 2.2-2.4 zijn marketing: alleen met opt-in en zonder opt-out.
//   - 2.5 is een service-bericht over opgeslagen data (de draft
//     verloopt) en gaat ongeacht toestemming uit — en wint van de
//     reeks, want een TTL-melding is tijdgebonden.
//   - Een venster dat dicht is, gaat nooit alsnog open: te laat
//     versturen leest als spam. 2.2 wordt daarom stil afgemarkeerd
//     zodra dag 7 voorbij is.
// =============================================================

import type { LifecycleStage } from '@/lib/email/templates/brandmd-lifecycle';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

/** 2.5 gaat uit zodra de TTL binnen dit venster valt. */
export const EXPIRY_NOTICE_DAYS = 10;

/**
 * Vensters per opt-in-stage, gemeten vanaf de e-mail-capture.
 * Bewust aaneengesloten (7/21): een draft zit altijd in hooguit één
 * open venster, dus de volgorde van deze lijst bepaalt niets stiekems.
 */
export const OPT_IN_WINDOWS: ReadonlyArray<{
  stage: LifecycleStage;
  opensAt: number;
  closesAt: number;
}> = [
  { stage: '2.2', opensAt: 24 * HOUR, closesAt: 7 * DAY },
  { stage: '2.3', opensAt: 7 * DAY, closesAt: 21 * DAY },
  { stage: '2.4', opensAt: 21 * DAY, closesAt: 60 * DAY },
];

export interface LifecycleProfileState {
  now: Date;
  expiresAt: Date;
  createdAt: Date;
  emailCapturedAt: Date | null;
  lifecycleOptInAt: Date | null;
  lifecycleOptOutAt: Date | null;
  lifecycleStagesSent: string[];
}

export interface LifecycleDecision {
  /** De enige stage die deze run mag uitgaan (null = niets te doen). */
  stage: LifecycleStage | null;
  /** Stages die zonder verzending als "gehad" geboekt worden. */
  silentMarks: LifecycleStage[];
  /** `lifecycleStagesSent` inclusief de stille markeringen, exclusief `stage`. */
  stagesSentAfterSilentMarks: string[];
}

/**
 * Bepaalt deterministisch wat er voor één draft moet gebeuren.
 * Puur — geen IO, geen Date.now() — zodat de smoke elk venster kan
 * naspelen door alleen `now` te verschuiven.
 */
export function decideLifecycleStage(state: LifecycleProfileState): LifecycleDecision {
  const stagesSent = new Set(state.lifecycleStagesSent);
  const optedIn = state.lifecycleOptInAt !== null && state.lifecycleOptOutAt === null;

  // Oude drafts kunnen een e-mail hebben zonder capture-timestamp;
  // createdAt is dan de eerlijkste ondergrens voor de leeftijd.
  const anchor = state.emailCapturedAt ?? state.createdAt;
  const age = state.now.getTime() - anchor.getTime();

  const silentMarks: LifecycleStage[] = [];
  if (optedIn && !stagesSent.has('2.2') && age > 7 * DAY) {
    silentMarks.push('2.2');
    stagesSent.add('2.2');
  }

  const stagesSentAfterSilentMarks = [...stagesSent];
  const expiryCutoff = new Date(state.now.getTime() + EXPIRY_NOTICE_DAYS * DAY);

  let stage: LifecycleStage | null = null;
  if (!stagesSent.has('2.5') && state.expiresAt <= expiryCutoff) {
    stage = '2.5';
  } else if (optedIn) {
    for (const window of OPT_IN_WINDOWS) {
      if (stagesSent.has(window.stage)) continue;
      if (age >= window.opensAt && age <= window.closesAt) {
        stage = window.stage;
        break;
      }
    }
  }

  return { stage, silentMarks, stagesSentAfterSilentMarks };
}
