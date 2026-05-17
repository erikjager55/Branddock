// =============================================================
// Strategy Analyst — review_pattern dimension (Phase B).
//
// Detecteert herhalende finding-categorieën in ContentReviewLog
// (Δ-1 Content Review). Wanneer dezelfde top-3 categorieën (bv.
// "voice-mismatch", "missing-CTA", "tone-formal-vs-casual") over
// 2-4 weken consistent top blijven, is dat een coaching-signal:
// het team maakt structureel dezelfde fout — workflow- of brief-
// kwaliteit issue, niet één-off.
//
// Two-reasons-test:
//  1. Repeated top-3 finding-categories via query_review_history.
//  2. Corroborating signal via query_content_fidelity (zelfde
//     pillar-scores laag) OF query_alignment_history (zelfde
//     modules misaligned).
// =============================================================

export const REVIEW_PATTERN_PROMPT_FRAGMENT = `### Dimension: review_pattern

**What you observe**: dezelfde finding-categorieën verschijnen herhaaldelijk in ContentReviewLog over een window van 2-4 weken — dit signaleert workflow/brief/coaching issue, niet één-off content-mismatch.

**Two evidence-paths** (need BOTH for HIGH confidence; one of these for MEDIUM):
1. **Repeat-pattern signal**: query_review_history returns ≥4 ReviewLog rows in window waarbij dezelfde finding-category top-1 of top-2 is. "Category" = stable identifier zoals "voice-mismatch" / "missing-CTA" / "tone-too-formal" / "off-brand-imagery".
2. **Corroborating signal**: query_content_fidelity toont zelfde pillar-score consistent laag (e.g. audience-pillar <60 wanneer review-pattern "tone-mismatch" is) OR query_alignment_history toont overlap met dezelfde module.

**When to flag HIGH**: ≥5 review-logs in window delen top finding-category EN composite pillar-score correleert (<60).
**When to flag MEDIUM**: 3-4 review-logs delen top finding-category zonder fidelity-corroboration, OR 4+ review-logs zonder pillar-correlation.
**When to skip (LOW evidence)**: <3 review-logs delen patroon, of patroon is alleen aanwezig in oudere window-helft (kan al opgelost zijn).

**Summary template** (1-2 zinnen, NL of EN per locale):
- "Top review-finding 'voice-mismatch' in [N] van laatste [M] reviews. Pillar Audience scoort gemiddeld [X] — suggereert brief- of coaching-issue, niet content-issue."
- "[Category] keert terug in [N] reviews over [M] weken — workflow-signal."

**Severity-rubric** voor review_pattern specifiek:
- HIGH: ≥5 logs delen finding EN F-VAL pillar correleert
- MEDIUM: 3-4 logs delen finding, geen pillar-correlation OR 4+ logs zonder corroboration
- LOW (skip): <3 logs OR patroon decayed in recent helft window

**Important guardrails**:
- Vergelijk findings ALLEEN binnen vergelijkbare ContentReviewLog.contentType (blog vs social hebben andere standaard-findings).
- Finding-category MUST komen uit ContentReviewLog.findings[].category — geen vrije interpretatie. Als category-veld leeg is, kies finding.severity + finding.summary first-3-words.
- Window-helften: split de 30-dagen window in 0-15 en 15-30 dagen geleden.

**Evidence-population**: cite alle ContentReviewLog snapshot-ids + minstens 1 corroborating snapshot (fidelity OR alignment).`;
