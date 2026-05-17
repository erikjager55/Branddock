// =============================================================
// Strategy Analyst — alignment_gap dimension (Phase B).
//
// Detecteert "vast" alignment-issue: AlignmentScan severity-
// distributie verbeterd niet OR verslechtert over 60+ dagen
// terwijl manual-fix-rate laag is (<50%). Indicates: team weet
// dat er misalignment is, maar gat structureel niet dicht.
//
// Tools:
//  1. query_alignment_history voor severity-distribution-trend.
//  2. query_review_history of query_content_fidelity voor
//     corroborating signal dat misalignment doorwerkt in output.
// =============================================================

export const ALIGNMENT_GAP_PROMPT_FRAGMENT = `### Dimension: alignment_gap

**What you observe**: AlignmentScan misalignment-distribution is stabiel of verslechtert over 60+ dagen, en manual-fix-rate is laag (<50% van high-severity issues opgelost). Het team registreert het gat maar dicht het structureel niet — strategisch signaal.

**Two evidence-paths** (need BOTH for HIGH confidence; one of these for MEDIUM):
1. **Stagnant-or-worsening trend signal**: query_alignment_history over 60+ dagen toont (a) high-severity issue-count gelijk of stijgend, OR (b) manual-fix-rate <50% over ≥2 scans, OR (c) zelfde modules misaligned in opeenvolgende scans (regressie).
2. **Downstream signal**: query_review_history of query_content_fidelity toont dat misaligned-modules-content negatief scoort (content uit deze module-areas presteert onder benchmark).

**When to flag HIGH**: ≥3 scans over 60 dagen tonen geen verbetering AND high-severity count stabiel of stijgend AND downstream-content scoort slecht.
**When to flag MEDIUM**: trend stabiel zonder verslechtering OR strong single-path signal (e.g. 1 module 4+ scans onveranderd misaligned).
**When to skip (LOW evidence)**: <2 historische scans (te weinig data), of trend toont verbetering (geen "gap" maar progress), of slechts 1 scan met issue.

**Summary template** (1-2 zinnen, NL of EN per locale):
- "Module [X] is sinds [DATE] (4 scans, 60 dagen) misaligned op high-severity zonder fix. Content uit deze module scoort gemiddeld [Y] — gap heeft impact."
- "Manual-fix-rate [Z%] over laatste [N] scans — team identificeert issues maar lost ze niet structureel op."

**Severity-rubric** voor alignment_gap specifiek:
- HIGH: ≥3 onveranderde high-severity issues over 60+ dagen AND downstream-impact zichtbaar
- MEDIUM: trend stabiel maar zonder corroborating downstream-impact, OR 1-2 modules onveranderd
- LOW (skip): trend verbetert, of insufficient history (<2 scans)

**Important guardrails**:
- Compare AlignmentScan rows ALLEEN binnen dezelfde module-set (modules toegevoegd na scan-1 zijn geen "regressie").
- "Manual-fix-rate" = AlignmentIssue.status='resolved' / total high-severity issues in scan.
- Score-comparison: gebruik AlignmentScan.score absolute waarde + module-level severity-counts.

**Evidence-population**: cite alle AlignmentScan + AlignmentIssue snapshot-ids + minstens 1 downstream snapshot (review of fidelity).`;
