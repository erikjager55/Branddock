# Content-flow analyse — PR, HR & Communications

> **Status**: ingevuld 2026-05-29 · sub-sprint **#7.A** · methode: code-audit
> **Types (8, "PR, HR & Communications")**: `press-release` · `media-pitch` · `internal-comms` · `career-page` · `job-ad-copy` · `employee-story` · `employer-brand-video` · `impact-report`
> Bron: `deliverable-types.ts:928-1017` · template-registry `prompt-templates/pr-hr.ts`

## 1. Pipeline-doorloop — category-specific checkpoints

Standaard angle-based dual-call pad (`canvas-orchestrator.ts:175`). Geen Plan-and-Solve, geen SEO.

- **Geen verhoogde drempel voor reputatie-kritische types**: `press-release` en `impact-report` zijn publiek/extern en duur bij fouten, maar lopen door dezelfde generieke gates (`checkpoint-gates.ts:62-388`) en F-VAL-threshold (default 65) als een `job-ad-copy`. Geen elevated review. Grootste category-specifieke risico.
- `impact-report` is lang (1000-5000w) maar krijgt geen Plan-and-Solve.

## 2. Prompt-quality

- **Bestand**: `src/lib/studio/prompt-templates/pr-hr.ts` — 568 regels, `PROMPT_VERSION 1.2.0`.
- **Alle 8 types hebben een dedicated template** (`press-release`, `media-pitch`, `internal-comms`, `career-page`, `job-ad-copy`, `employee-story`, `employer-brand-video`, `impact-report`) — geen generieke fallback. Template-set matcht 1-op-1 de deliverable-types.
- **Few-shot**: ≈9 example-referenties (≈1 per type) — matige dekking voor 8 uiteenlopende types.
- Gedeelde helper `buildPrHrUserPrompt`.

## 3. Output-format (geverifieerd)

`press-release`/`media-pitch`/`job-ad-copy`/`employer-brand-video` Text · `internal-comms`/`career-page`/`employee-story` Text+HTML · `impact-report` Text+PDF (`deliverable-types.ts:928-1017`).

## 4. Asset-pattern

- **Inline images**: `internal-comms`, `career-page`, `employee-story`.
- **No-asset**: `press-release`, `media-pitch`, `job-ad-copy`, `impact-report`.
- **Script**: `employer-brand-video` (hidden — video-pipeline afhankelijk).

## 5. Recente gotchas (categorie-relevant)

- Geen pr-hr-specifieke entry. Cross-cutting relevant: **2026-04-15 createPhaseSSE silent abort** (`gotchas.md:113-115`) raakt elke SSE-gedreven generatie-flow inclusief deze types.

## 6. Friction-points

- **High-stakes types ondergedimensioneerd**: `press-release`/`impact-report` (publiek-facing) missen verhoogde fidelity-drempel + review-gate. Een off-brand of feitelijk-onjuiste press-release is duurder dan elke andere content-fout.
- **`impact-report` lang maar single-pass** (geen Plan-and-Solve).
- **`employer-brand-video` hidden** pending video-pipeline.
- **Few-shot tekort** (≈1 per type) bij 8 sterk verschillende types.
- *pending Ronde 1* — geen pr-hr representant afgetekend.

## 7. Verbeter-aanbevelingen

1. **Verhoogde fidelity-threshold + human-review-flag voor `press-release` + `impact-report`** via per-type threshold (`per-type-thresholds.ts` ondersteunt dit al — alleen waarde + UX-flag instellen). → ticket CF-7.
2. **`impact-report` meenemen in `LONG_OUTPUT_TYPES`** voor Plan-and-Solve. → ticket CF-3.
3. **Few-shot uitbreiden**, met name press-release format-anchors (dateline/inverted-pyramid).

## 8. Cross-type patterns / DRY

- 8 types delen `buildPrHrUserPrompt`; system-prompts uniek → geen DRY.
- Publiek-facing types (`press-release`/`impact-report`) delen een elevated-review-behoefte → kandidaat gedeeld "elevated-review" profiel (synthesis §E).
- **Noot**: `TYPE_TO_CATEGORY` noemt voor pr-hr nog phantom-IDs (`company-announcement`, `job-description`, `recruitment-post`, `employee-newsletter`, `crisis-statement`, `thought-leadership-bio`) die **niet** als deliverable-types bestaan, en mist de echte (`internal-comms`, `career-page`, etc.). Stale map → `getCategoryForType()` geeft voor deze types de verkeerde fallback-categorie. Zie synthesis §C + ticket CF-4.

## Referenties (file:line)

- `canvas-orchestrator.ts:175`
- `src/lib/studio/prompt-templates/pr-hr.ts` (568r, v1.2.0, 8 templates)
- `src/lib/content-test/per-type-thresholds.ts` (per-type threshold-mechanisme)
- `deliverable-types.ts:928-1017`
- `gotchas.md:113-115`
