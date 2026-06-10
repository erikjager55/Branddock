/**
 * Deterministische regeneratie-poort voor LP feature-beelden (Fase 4,
 * audit 2026-06-10-lp-feature-image-diversity).
 *
 * Pure beslisfunctie — geëxporteerd zodat de gate-logica unit-smokebaar is
 * zonder gemockte routes (jury-graft uit het brief-first ontwerp). De route
 * voert de beslissing uit (regeneratie met aangescherpte prompt + nieuwe seed).
 */

/**
 * G4-rubric band 31-50 = "image is on-brand but doesn't visualize the message"
 * — daaronder regenereren we gericht. Bewust lager dan REFINE_TRIGGER_THRESHOLD
 * (65, refine-loop): een feature-beeld is klein; alleen echte missers kosten
 * een extra generatie.
 */
export const COHERENCE_REGEN_THRESHOLD = 50;

/** Hard kosten-plafond: max 2 regeneraties per pagina (worst-case +$0,26). */
export const MAX_REGENERATIONS_PER_PAGE = 2;

export interface FeatureGateSlot {
  /** Feature-index van het beeld. */
  index: number;
  /** G4 coherence-score 0-100; null = judge geskipt (geen key/fout) → geen signaal, geen regen. */
  coherenceScore: number | null;
}

export interface FeatureGateDecision {
  /** Feature-indices om te regenereren, ernstigste eerst, gecapt op budget. */
  regenerate: number[];
  /** Reden per index — voedt de prompt-aanscherping van de retry. */
  reasons: Map<number, "low-coherence" | "duplicate">;
}

/**
 * Beslis welke feature-beelden een gerichte regeneratie krijgen.
 *
 * Regels:
 * - coherence < COHERENCE_REGEN_THRESHOLD → kandidaat (reden 'low-coherence');
 * - per duplicate-paar: het lid met de LAAGSTE coherence → kandidaat (reden
 *   'duplicate'); bij gelijke/ontbrekende scores het tweede lid (het eerste
 *   beeld blijft staan — deterministisch);
 * - low-coherence weegt zwaarder dan duplicate (een irrelevant beeld is erger
 *   dan een dubbel beeld); binnen een reden: laagste score eerst;
 * - hard gecapt op `budget` (default MAX_REGENERATIONS_PER_PAGE).
 */
export function decideFeatureRegenerations(
  slots: FeatureGateSlot[],
  duplicatePairs: Array<[number, number]>,
  budget: number = MAX_REGENERATIONS_PER_PAGE,
): FeatureGateDecision {
  const scoreByIndex = new Map<number, number | null>(
    slots.map((s) => [s.index, s.coherenceScore]),
  );
  const reasons = new Map<number, "low-coherence" | "duplicate">();

  for (const slot of slots) {
    if (slot.coherenceScore !== null && slot.coherenceScore < COHERENCE_REGEN_THRESHOLD) {
      reasons.set(slot.index, "low-coherence");
    }
  }

  for (const [a, b] of duplicatePairs) {
    if (!scoreByIndex.has(a) || !scoreByIndex.has(b)) continue;
    const sa = scoreByIndex.get(a) ?? null;
    const sb = scoreByIndex.get(b) ?? null;
    // Laagste coherence verliest; tie/onbekend → tweede lid (b).
    const loser = sa !== null && sb !== null && sa !== sb ? (sa < sb ? a : b) : b;
    if (!reasons.has(loser)) reasons.set(loser, "duplicate");
  }

  const severity = (idx: number): number => {
    const reasonWeight = reasons.get(idx) === "low-coherence" ? 0 : 1000;
    return reasonWeight + (scoreByIndex.get(idx) ?? COHERENCE_REGEN_THRESHOLD + 1);
  };

  const regenerate = [...reasons.keys()]
    .sort((x, y) => severity(x) - severity(y))
    .slice(0, Math.max(0, budget));

  // Reasons beperken tot wat daadwerkelijk geregenereerd wordt (cap).
  const cappedReasons = new Map<number, "low-coherence" | "duplicate">();
  for (const idx of regenerate) {
    const r = reasons.get(idx);
    if (r) cappedReasons.set(idx, r);
  }
  return { regenerate, reasons: cappedReasons };
}
