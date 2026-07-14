// =============================================================
// Ads-watchdog — pure signaal-functies (Fase 2, tasks/agent-ads-watchdog.md).
//
// Input: snapshot-reeks + campagne-metadata; output: getypeerde signalen.
// Geen API- of DB-afhankelijkheid — deterministisch testbaar (`now` wordt
// ingegeven). Drempels zijn constants met startwaarden uit de idea-file;
// kalibratie op de eerste 2 weken echte snapshots (ADR-note).
//
// Weekplafond (anti-alert-moeheid, ADR-productregel): max 3 refresh-
// PROPOSALs per workspace per week — de telling zelf is een DB-query
// (tools.ts); hier alleen de pure budget-berekening.
// =============================================================

/** Startwaarden (idea-file-hypotheses; herzien met echte snapshot-data). */
export const AD_FATIGUE_THRESHOLDS = {
  /** Gemiddelde frequency over het recente venster waarboven moeheid dreigt. */
  frequency: 3.5,
  /** Procentuele CTR-daling (recente helft van de reeks vs de oudere helft). */
  ctrDropPct: 25,
  /** Creative-leeftijd in dagen. */
  creativeAgeDays: 45,
} as const;

/** Weekplafond op refresh-PROPOSALs per workspace (ADR 2026-07-14). */
export const WEEKLY_PROPOSAL_CAP = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface AdSnapshotPoint {
  windowStart: Date;
  impressions: number | null;
  reach: number | null;
  ctr: number | null;
}

export interface AdSignalInput {
  /** Meta-naam van de ad (content-afgeleid — fencing gebeurt in de tool). */
  externalName: string | null;
  creativeCreatedAt: Date | null;
  /** Chronologisch oplopend op windowStart. */
  snapshots: AdSnapshotPoint[];
}

export type AdFatigueSignalType = 'frequency' | 'ctr-drop' | 'creative-age';

export interface AdFatigueSignal {
  type: AdFatigueSignalType;
  /** De gemeten waarde (frequency, daling-%, of leeftijd in dagen). */
  value: number;
  threshold: number;
}

/**
 * Signaal 1 — frequency over het recente venster (laatste 3 snapshot-dagen):
 * som(impressions)/som(reach). Aggregeren over dagen dempt dag-ruis; reach
 * per dag optellen is een benadering (unieke reach overlapt over dagen),
 * dus de echte frequency ligt eerder hóger — conservatief genoeg voor een
 * drempel-signaal. Bij ontbrekende reach: geen signaal (fail-soft).
 */
export function computeFrequencySignal(snapshots: AdSnapshotPoint[]): AdFatigueSignal | null {
  // Alleen punten met béide waarden — een dag met impressies maar zonder
  // reach zou de teller infleren zonder noemer (vals signaal, review M1).
  const recent = snapshots.slice(-3).filter((s) => s.impressions !== null && (s.reach ?? 0) > 0);
  if (recent.length === 0) return null;
  const impressions = recent.reduce((sum, s) => sum + (s.impressions ?? 0), 0);
  const reach = recent.reduce((sum, s) => sum + (s.reach ?? 0), 0);
  if (reach === 0) return null;
  const frequency = impressions / reach;
  if (frequency <= AD_FATIGUE_THRESHOLDS.frequency) return null;
  return {
    type: 'frequency',
    value: Math.round(frequency * 100) / 100,
    threshold: AD_FATIGUE_THRESHOLDS.frequency,
  };
}

/**
 * Signaal 2 — CTR-trend: gemiddelde CTR van de recente helft van de reeks
 * vs de oudere helft. Vereist ≥2 meetpunten per helft (anders te ruizig
 * voor een klantgericht signaal — geen signaal is dan het eerlijke antwoord).
 */
export function computeCtrDropSignal(snapshots: AdSnapshotPoint[]): AdFatigueSignal | null {
  const withCtr = snapshots.filter((s) => s.ctr !== null);
  if (withCtr.length < 4) return null;
  const mid = Math.floor(withCtr.length / 2);
  const older = withCtr.slice(0, mid);
  const recent = withCtr.slice(mid);
  const avg = (points: AdSnapshotPoint[]) =>
    points.reduce((sum, s) => sum + (s.ctr ?? 0), 0) / points.length;
  const olderAvg = avg(older);
  // Epsilon-vloer: op ruisniveau (CTR < 0,1%) is elke daling procentueel
  // groot maar betekenisloos (review M3).
  if (olderAvg < 0.1) return null;
  const dropPct = ((olderAvg - avg(recent)) / olderAvg) * 100;
  if (dropPct < AD_FATIGUE_THRESHOLDS.ctrDropPct) return null;
  return {
    type: 'ctr-drop',
    value: Math.round(dropPct * 10) / 10,
    threshold: AD_FATIGUE_THRESHOLDS.ctrDropPct,
  };
}

/** Signaal 3 — creative-leeftijd (ad.created_time uit de discovery-sync). */
export function computeCreativeAgeSignal(
  creativeCreatedAt: Date | null,
  now: Date,
): AdFatigueSignal | null {
  if (!creativeCreatedAt) return null;
  const ageDays = Math.floor((now.getTime() - creativeCreatedAt.getTime()) / DAY_MS);
  if (ageDays <= AD_FATIGUE_THRESHOLDS.creativeAgeDays) return null;
  return {
    type: 'creative-age',
    value: ageDays,
    threshold: AD_FATIGUE_THRESHOLDS.creativeAgeDays,
  };
}

/** Alle drie de signalen voor één ad — lege array = gezond. */
export function evaluateAdSignals(input: AdSignalInput, now: Date): AdFatigueSignal[] {
  return [
    computeFrequencySignal(input.snapshots),
    computeCtrDropSignal(input.snapshots),
    computeCreativeAgeSignal(input.creativeCreatedAt, now),
  ].filter((s): s is AdFatigueSignal => s !== null);
}

/** Resterend weekbudget voor refresh-PROPOSALs (nooit negatief). */
export function remainingWeeklyProposalBudget(usedThisWeek: number): number {
  return Math.max(0, WEEKLY_PROPOSAL_CAP - usedThisWeek);
}
