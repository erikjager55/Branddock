// =============================================================
// Strategy Analyst — fidelity_decline dimension (Phase B).
//
// Detecteert dalende F-VAL composite-scores voor één specifiek
// contentType (blog / social / email / ad) over een window van
// 30 dagen. De Analyst combineert query_content_fidelity (de
// score-trend zelf) met query_review_history (corroborating
// human-feedback patterns) voor two-reasons-test.
//
// Threshold (per task-file): composite-decline ≥10 punten over
// 30 dagen voor ≥3 items binnen één contentType.
// =============================================================

export const FIDELITY_DECLINE_PROMPT_FRAGMENT = `### Dimension: fidelity_decline

**What you observe**: F-VAL composite-scores dalen significant over tijd voor één specifieke contentType (blog / social / email / ad / etc.) — content "drift" ondanks dat voiceguide stabiel blijft.

**Two evidence-paths** (need BOTH for HIGH confidence; one of these for MEDIUM):
1. **Score-trend signal**: query_content_fidelity returns ≥3 ContentFidelityScore rows binnen contentType X met composite-score in eerste helft van window 10+ punten hoger dan tweede helft.
2. **Corroborating review signal**: query_review_history toont voor dezelfde contentType repeated low-scoring runs OF query_alignment_history toont module-misalignment dat correleert met de gedaalde contentType.

**When to flag HIGH**: composite daalt ≥15 punten over 30 dagen voor ≥5 items AND review-history bevestigt het patroon.
**When to flag MEDIUM**: composite daalt 10-15 punten over 30 dagen voor 3-5 items OR strong single-path signal.
**When to skip (LOW evidence)**: minder dan 3 items dalend, of single contentType-item dalend (kan outlier zijn — niet trend).

**Summary template** (1-2 zinnen, NL of EN per locale):
- "Blog-content composite-score daalde van [X] naar [Y] over [N items] in laatste 30 dagen. Review-history bevestigt: [Z] runs scoren onder threshold."
- "Social ad fidelity in decline ([from]→[to]); [N] items in window scoren onder [threshold]."

**Severity-rubric** voor fidelity_decline specifiek:
- HIGH: ≥15 punten decline OR composite is <60 na decline (kritiek niveau)
- MEDIUM: 10-15 punten decline EN composite blijft ≥60
- LOW (skip): <10 punten decline OR <3 items in window

**Important guardrails**:
- ALLEEN binnen één contentType — vergelijk geen blog vs social (verschillende rubrics).
- Exclude items met agentVersion-mismatch (F-VAL judge versie-bump genereert artificial drift).
- Cite specific ContentFidelityScore.id values in evidence.snapshotIds.

**Evidence-population**: include ALL DataSnapshot ids voor de F-VAL queries + minimum 1 corroborating review-history snapshot.`;
