// =============================================================
// Strategy Analyst — publish_quality_trend dimension (Phase B).
//
// Detecteert dalende output-kwaliteit op het moment van publish:
// content scoort lager bij publish-gate, of F-VAL gemeten op
// gepubliceerde items toont declining trend. Dit is een
// "production-end" signaal — content die het haalt naar publish
// is slechter dan eerder. Onderscheidt zich van fidelity_decline
// door focus op publish-time scores ipv all-time content.
//
// NB: PublishGateOverride table is Δ-4 dependency. Indien tool-
// output deze data nog niet bevat, valt deze dimension terug op
// pure F-VAL-trend van content met publishedAt-stempel.
//
// Two-reasons-test:
//  1. F-VAL trend van published items dalend via query_content_fidelity.
//  2. Corroborating signal: query_review_history toont steeds meer
//     post-publish issues OR query_alignment_history toont matching
//     module-decline.
// =============================================================

export const PUBLISH_QUALITY_TREND_PROMPT_FRAGMENT = `### Dimension: publish_quality_trend

**What you observe**: de gemiddelde F-VAL-score van content op publish-moment daalt over tijd, OF publish-gate overrides nemen toe (team forceert publish ondanks lage scores). Dit is een productie-end signaal: wat het naar publish haalt is slechter dan eerder.

**Two evidence-paths** (need BOTH for HIGH confidence; one of these for MEDIUM):
1. **Publish-time score-trend signal**: query_content_fidelity met filter op items met publishedAt-stempel returns ≥4 rows in window, eerste-helft vs tweede-helft toont composite-decline ≥8 punten. Bij voorkeur via expliciete PublishGateOverride.count uit tool-output — daar waar Δ-4 data beschikbaar.
2. **Corroborating signal**: query_review_history toont post-publish review-runs steeds vaker low-scoring OR query_alignment_history toont overlap met betroffen module (content uit declining module wordt nog wel gepublished).

**When to flag HIGH**: composite-decline ≥10 punten op publish-time items AND ≥3 review-logs post-publish met issues OR PublishGateOverride frequency verdubbeld.
**When to flag MEDIUM**: composite-decline 8-10 punten OP publish-time items zonder strong post-publish signal, OR strong override-frequency signal zonder F-VAL trend.
**When to skip (LOW evidence)**: <4 published items in window (insufficient), of trend toont stabiele/stijgende kwaliteit.

**Summary template** (1-2 zinnen, NL of EN per locale):
- "Publish-time F-VAL composite daalde van [X] naar [Y] over [N] gepubliceerde items. Post-publish reviews bevestigen: [Z] runs scoren onder threshold na publish."
- "PublishGateOverride frequency [from→to] over [window] — team overschrijft kwaliteits-gate vaker. Coaching of brief-quality signal."

**Severity-rubric** voor publish_quality_trend specifiek:
- HIGH: ≥10 punten decline op publish-time items EN corroborating post-publish issues OR override-frequency >2x
- MEDIUM: 8-10 punten decline OR strong override-trend zonder F-VAL trend
- LOW (skip): <4 published items in window, of trend stabiel/stijgend

**Important guardrails**:
- ALLEEN content met publishedAt != null tellen — drafts vervuilen de trend.
- PublishGateOverride data is Δ-4 dependency: indien tool-output deze niet bevat, val terug op pure F-VAL-trend van published items. Markeer dit in summary ("zonder override-data, alleen F-VAL").
- Onderscheid van fidelity_decline: deze dimension focust op publish-time score; fidelity_decline kijkt naar alle content.

**Evidence-population**: cite alle ContentFidelityScore snapshot-ids van published items + minstens 1 corroborating snapshot (review of alignment OR PublishGateOverride).`;
