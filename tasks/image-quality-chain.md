---
id: image-quality-chain
title: Multi-modal image quality — negative prompts + multi-candidate + refine-loop + visual-fidelity dimensions
fase: pre-launch
priority: now
effort: ~10 dagen (6d quality patterns + 4d image-sourcing strategie)
owner: claude-code
status: open
created: 2026-05-12
completed: -
related-adr: -
related-spec: docs/specs/content-test-improvement-plan.md §3.0.5
worktree: -
---

# Probleem

Image-generatie pipeline heeft single-prompt approach zonder negative prompts, single-candidate output, monolithic visual-fidelity score (geen dimension-breakdown), geen image-to-image refine-loop, geen text-in-image OCR-check, geen brand-color validation. Multiple industry-standard quality patterns ontbreken.

# Voorstel — 6 quality-patterns geïmplementeerd

## A. Negative prompts (~0.5d)
- Default negative-prompt template per content-type
- Excludes: "competitor-logos, blurry, text artifacts, low quality, watermarks, distorted faces"
- Brand-specific extension: per workspace mogelijkheid om eigen negatives toe te voegen (Settings → Brand → Negative Prompts)
- Inject in `buildVisualBriefImagePrompts` als `negativePrompt` field

## B. Multi-candidate selection (~1.5d)
- Genereer 3-4 candidates parallel (Promise.all)
- Cost-tradeoff: 3-4× per generation; default aan voor expensive types (long-form, video, landing-page), uit voor cheap (tweet, search-ad)
- Step 2 UI: grid van 3-4 candidates, user pickt beste
- LearningEvent capture: welke candidate werd gekozen + waarom (optioneel reason-field)

## C. Visual-fidelity dimension-breakdown (~1.5d)
- Huidige `ContentVisualFidelityScore` is monolithic. Splits in 5 dimensies:
  - **brandConsistency**: kleuren + typography + visual identity match
  - **subjectIdentity**: behoud van source-subject (vooral compose-output)
  - **textAccuracy**: tekst-in-image leesbaar + spelling correct + taal-correct
  - **composition**: rule-of-thirds, focal point, whitespace, hiërarchie
  - **lighting**: matched style-chip (natural / studio / dramatic / soft)
- Per dimensie 0-100 score + composite gewogen
- Studio UI: visual-fidelity bar uit te klappen naar 5 sub-scores

## D. Image-to-image refine-loop (~1.5d, post-gemini-migration)
- Trigger op `ContentVisualFidelityScore < threshold` (default 65)
- Diagnostic-hint extraction uit dimension-breakdown
- Re-generate via image-to-image met hint als prompt-modification
- Max 2 refine-attempts per beslissing 2026-05-12
- Latency-budget: total max 30s p95 inclusief refine

## E. OCR text-in-image check (~0.5d)
- Post-gen OCR via Google Vision API of Tesseract
- Detect text-artifacts in image die niet bedoeld zijn (logo/copy hallucinations)
- Flag in dimension `textAccuracy` als low-score driver

## F. Brand-color validation (~0.5d)
- Post-gen palette-extraction (`color-thief` of equivalent npm package)
- Compare against `Brandstyle.primaryColors[]`
- Cosine-similarity in LAB color-space (perceptueel correct)
- Flag in dimension `brandConsistency` als low-score driver

## G. Image sourcing strategie uitbreiding (~3-4d, integratie met §3.0.6 plan)

User-feedback 2026-05-12: image-generatie-kwaliteit is gedekt maar bredere
**sourcing-strategie** (vinden / genereren / illustreren / hergebruiken)
miste. Toegevoegd aan dit task-pakket:

- **Modality-fit defaults** per content-type in `deliverable-types.ts`
  (~0.5d): `recommendedModality: 'photo' | 'illustration' | 'infographic'
  | 'ugc' | 'none'` field. Step 1 Visual Brief UI toont "Suggested for
  {type}: {modality}" hint.
- **Reuse-detection** vóór generation (~1.5d): vector-search workspace
  MediaAsset via pgvector embedding; threshold ≥ 0.75 → Step 2 UI banner
  "Vergelijkbaar beeld in library — hergebruiken?" met skip-toggle.
- **Smart-search unified** (~2d): Insert Image modal toont één resultaten-
  grid met source-labels (workspace / Pexels / Unsplash) ipv aparte tabs.
  Per result: similarity-score + license-badge. Brandfetch deferred
  post-launch ($99/mnd, roadmap LATER).
- **Copy-image coherence-score** (~1d): AI-judge call (Haiku, ~$0.001)
  met variant content + image-url → coherence-score 0-100. Toegevoegd
  als 6e dimensie in visual-fidelity breakdown (naast brandConsistency
  / subjectIdentity / textAccuracy / composition / lighting).
- **Illustration-specifieke pipeline** (~1-2d): per content-type een
  illustration-template ("flat / 3D / hand-drawn / minimalist"); style-
  consistency via bestaande ConsistentModel LoRA's of prompt-templating.

# Acceptatiecriteria

- [ ] `buildVisualBriefImagePrompts` accepteert + injecteert `negativePrompt`
- [ ] Default negative-prompt template + per-workspace extension UI
- [ ] Multi-candidate generation (3-4 parallel) toggle per content-type
- [ ] Step 2 UI grid voor candidate-selection
- [ ] `ContentVisualFidelityScore` schema-extension: `dimensions Json` field met 5 sub-scores
- [ ] `scoreImageFidelity` produceert dimension-breakdown
- [ ] Studio UI: expandable visual-fidelity bar met 5 dimensies
- [ ] Image-to-image refine-loop in compose-pipeline (max 2 iterations)
- [ ] OCR-integratie: Google Vision API key in env + post-gen check
- [ ] Brand-color validation: palette-extract + LAB cosine-similarity
- [ ] Smoke-test alle 6 patronen op Goed-Bouw + better-brands workspaces

# Bestanden die ik aanraak (high-level)

**Nieuw**:
- `src/lib/ai/image-quality/negative-prompts.ts`
- `src/lib/ai/image-quality/multi-candidate-selector.ts`
- `src/lib/ai/image-quality/dimension-scorer.ts`
- `src/lib/ai/image-quality/ocr-check.ts`
- `src/lib/ai/image-quality/color-validator.ts`
- `src/lib/ai/image-quality/refine-loop.ts`
- `src/features/settings/components/NegativePromptsConfig.tsx`

**Modify**:
- `src/app/api/studio/[deliverableId]/generate-visual.ts` + `generate-visual-compose/route.ts` + `generate-visual-trained/route.ts`
- `src/lib/ai/canvas-orchestrator.ts` — multi-candidate dispatch
- `src/lib/brand-fidelity/visual-fidelity-scorer.ts` — dimension-breakdown
- `prisma/schema.prisma` — `ContentVisualFidelityScore.dimensions Json?` field
- `src/features/content-studio/components/canvas/visual-fidelity-bar.tsx` (of equivalent)

# Risico's, scope, notes

Zie plan-doc §3.0.5. **Cost-impact**: multi-candidate 3-4× per generation. Mitigatie: sample-based, alleen voor expensive types. OCR + color: ~+$0.001 per image, negligible.

**Dependency op compose-pipeline-gemini-migration**: image-to-image refine werkt beter met Gemini Image dan FAL Flux Pro Kontext.

**Google Vision API key**: nieuwe env-var nodig. Document in `.env.example` + vercel-deployment task.
