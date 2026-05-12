---
id: content-test-auto-iterate-6B
title: Content-test sub-sprint #6.B — Automated feedback-loop + auto-iterate + edit-distance signals
fase: pre-launch
priority: now
effort: ~6 dagen
owner: claude-code
status: open
created: 2026-05-12
completed: -
related-adr: -
related-spec: docs/specs/content-test-improvement-plan.md §3.3 + §4 #6.B
worktree: -
---

# Probleem

F-VAL composite-score draait al na elke generation maar wordt **niet** gebruikt als auto-iterate signaal. Score < threshold = present-aan-user (user moet manueel regenerate vragen). LearningEvent captures accept/reject signals maar geen edit-distance — soft-negative signal mist. Per-type fidelity thresholds zijn 1 global setting (geen press-release-stricter dan search-ad onderscheid).

# Voorstel

**Auto-iterate orchestrator** (max 2 attempts per beslissing 2026-05-12):

```
Generation → F-VAL score
  ├─ ≥ threshold → present to user (subtle "iterated N×" indicator)
  └─ < threshold → REGENERATE met feedback-hint
                    ↓ uit BrandReviewFinding (Pijler 1/2/3-specifieke hints)
                    ↓
                    Re-score. Bij still <threshold + iteration < 2: loop.
                    Bij iteration = 2 still <threshold: escalate to user met diagnostic.
```

**Edit-distance capture**: bij inline-edit save → Levenshtein(original, edited) / max-length → `LearningEvent.editDistance`. > 20% delta = soft-negative signal.

**Per-type threshold UI**: Settings → Validation → table met 53 types × threshold-slider (default 65, conservatief startend per beslissing).

**Image refine-loop** (multi-modal): zelfde patroon op compose-pipeline. Max 2 iterations. Trigger op `ContentVisualFidelityScore < threshold`.

# Acceptatiecriteria

**Feedback compiler**:
- [ ] `src/lib/content-test/feedback-compiler.ts` — input: `BrandReviewFinding[]` + pijler-breakdown, output: prompt-hint string
- [ ] 8-10 hint-templates voor common findings (tone-too-formal, claim-vague, structure-missing, etc.)
- [ ] Whitelist-based: alleen template-match wordt toegepast, generic re-prompt fallback voor unmapped

**Auto-iterate orchestrator**:
- [ ] `src/lib/ai/auto-iterate.ts` — orchestrator met max-iterations=2
- [ ] Stop-conditions: threshold-met OR max-iterations OR user-cancel
- [ ] Cost-tracking per iteration → LearningEvent
- [ ] Subtle UI-indicator in Step 4 ("Iterated 1× for fidelity")
- [ ] Opt-out toggle in Settings → Validation

**Edit-distance signal**:
- [ ] `LearningEvent.editDistance Float?` (additief migration)
- [ ] Hook in inline-edit save: compute Levenshtein, normalize
- [ ] `content.edited` event-type krijgt edit-distance metric
- [ ] Soft-negative threshold > 0.20 = regression-corpus kandidaat

**Per-type thresholds**:
- [ ] `WorkspaceContentTypeThreshold` table (workspaceId + contentType + threshold, with default 65)
- [ ] Settings → Validation UI met threshold-slider per type
- [ ] F-VAL gate gebruikt per-type threshold ipv global

**Image refine-loop** (post-gemini-migration):
- [ ] Compose-pipeline route extension: na ContentVisualFidelityScore < threshold → refine-prompt + regenerate (max 2)
- [ ] Diagnostic-hint extraction uit visual-fidelity dimensions (zie §3.0.5)

**Feedback dashboard**:
- [ ] Brand Alignment Insights tab uitbreiden met:
  - Auto-iterate success-rate per content-type
  - Top findings → hint-template effectiveness
  - Edit-distance heatmap per type

# Bestanden die ik aanraak (high-level)

**Nieuw**:
- `src/lib/content-test/feedback-compiler.ts`
- `src/lib/ai/auto-iterate.ts`
- `src/features/settings/pages/ValidationPage.tsx` (per-type thresholds UI)
- `src/features/settings/components/ThresholdsTable.tsx`

**Modify**:
- `src/lib/ai/canvas-orchestrator.ts` — auto-iterate integration
- `src/app/api/studio/[deliverableId]/generate-visual-compose/route.ts` — image refine-loop
- `prisma/schema.prisma` — `LearningEvent.editDistance Float?` + `WorkspaceContentTypeThreshold` model
- `src/features/brand-alignment/components/InsightsTab.tsx` — feedback-attribution panels

# Risico's, scope, notes

Zie plan-doc §3.3 + §8. Dependencies: #5.A (property-evals als feedback-signaal-bron) + #6.A (gates throw consistent errors voor feedback-compiler). **Auto-iterate visibility**: subtle indicator (beslissing 2026-05-12).
