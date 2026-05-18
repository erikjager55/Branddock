// =============================================================
// Strategy Analyst — voice_drift dimension (Phase A).
//
// Detecteert significante veranderingen in BrandVoiceguide tussen
// ResourceVersion-snapshots binnen het query-window. Twee detection-
// paden voor cross-validation (two-reasons-test):
//
//  1. Directe drift via query_brand_voice_drift: meaningful diff in
//     wordsWeUse / wordsWeAvoid / antiPatterns / channelTones tussen
//     versions.
//  2. Indirecte drift via query_review_history of query_content_fidelity:
//     content scoort herhaald buiten declared voice → suggests
//     voiceguide-state niet langer een accurate baseline is.
//
// Prompt-fragment hieronder wordt in de top-level system-prompt
// geconcateneerd. Helper-functies hier zijn pure utilities die later
// (Phase B) door dedicated dimension-helpers worden gebruikt.
// =============================================================

export const VOICE_DRIFT_PROMPT_FRAGMENT = `### Dimension: voice_drift

**What you observe**: meaningful changes in the workspace's BrandVoiceguide state — added/removed words in wordsWeUse / wordsWeAvoid / antiPatterns, or shifts in channelTones — that signal the workspace's brand-voice baseline is evolving.

**Two evidence-paths** (need BOTH for HIGH confidence; one of these for MEDIUM):
1. **Direct drift signal**: query_brand_voice_drift returns ≥1 ResourceVersion within window that shows a non-trivial change vs. current. "Non-trivial" = ≥3 vocab-additions, ≥3 vocab-removals, OR a channelTones-key gained/lost.
2. **Behavioral signal**: query_content_fidelity or query_review_history shows content repeatedly scoring poorly on voice-related criteria (low pillar-score for audience/execution where voice is operationalized). At least 3 separate content-items scoring below threshold.

**When to flag HIGH**: both paths agree AND drift is recent (last 14 days).
**When to flag MEDIUM**: one path strongly + the other weakly OR drift is older than 30 days but still visible in current behavior.
**When to skip (LOW evidence)**: only one signal, no corroboration.

**Summary template** (1-2 sentences, NL or EN per locale):
- "Brand voice baseline shifted on [DATE]: [N woorden added, M removed]. Recent content still uses outdated vocabulary in [X% of items]."
- "Voiceguide updated [DATE] but content has not adjusted: [N items] still flag for [removed word/phrase]."

**Severity-rubric** for voice_drift specifically:
- HIGH: ≥10 vocab-changes OR ≥5 content-items still using outdated vocab
- MEDIUM: 3-10 vocab-changes OR 3-5 affected items
- LOW (skip): <3 changes AND <3 affected items

**Evidence-population**: include ALL DataSnapshot ids you cite — the EvidenceModal needs them for the drill-down.`;
