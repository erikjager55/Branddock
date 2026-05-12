# Content Generation — Test & Quality Improvement Plan

> Comprehensive plan for testing, validating en optimaliseren van Branddock's 53 content-types pipeline.
> **Status**: ✅ **accepted 2026-05-12 — Optie B (Full plan)** — synthese uit externe research (Jasper/Copy.ai/Anyword/Surfer/Anthropic/G-Eval/Promptfoo/LangSmith) + interne audit Branddock pipeline.
> **Owner**: claude-code + user (product decisions)
> **Sprint-fit**: Track A pre-launch sprint #5-7, gefaseerd.

---

## TL;DR

Het huidige playbook (`docs/playbooks/testplan-content-items.md`) test **UI-flow + structurele constraints** maar niet content-kwaliteit, brand-voice alignment, of de inhoudelijke 3-laagse architectuur die de schaal van 53 types vraagt. F-VAL is technisch klaar maar **read-only** — geen feedback-loop terug naar prompts. We bouwen een 3-laagse test-architectuur (generic / type-specific / item-specific), 4 sub-systemen (prompt-quality optimization / wiring-audit / automated feedback-loop / flow-analyse), gefaseerd over sprint #5-7.

**Industry-validated patterns we adopteren**:
- **Property evals** (deterministisch, 100% traffic) + **golden sets** (curated, CI/nightly) + **adversarial regression** (LearningEvent corpus)
- **G-Eval logprob-weighted judging** voor F-VAL judge-pijler
- **Position-swap calibration** tegen judge-bias (agreeableness TNR < 25% probleem)
- **Edit-distance + accept/reject signals** als feedback voor auto-iterate loop
- **Promptfoo** voor YAML-rubrics + **LangSmith** voor production trace-naar-dataset

---

## 1. Probleem-stelling

**Schaal-gat**:
- 53 content-types × 6-staps pipeline (brief → strategy → concept → 3 variants → canvas) = combinatoir test-vraagstuk
- Huidige playbook = handmatige 6-staps walkthrough × 8 representanten = niet schaalbaar naar 53 types
- 22 bestaande smoke-tests zijn utility-tests (locale-detect / language-detect), geen content-kwaliteit-tests

**Quality-gat**:
- Pass-criteria zijn UI-niveau ("preview chrome rendert", "geen placeholders") — niet content-kwaliteit ("matcht tone met brand voice", "is de claim verifieerbaar", "is de structuur SEO-correct")
- F-VAL geeft composite-score maar wordt niet gebruikt als auto-iterate signal
- Geen LLM-as-judge calibration; geen position-swap; geen edit-distance feedback

**Tool-gat**:
- Geen Promptfoo / LangSmith / DeepEval / G-Eval geïntegreerd
- Prompts zijn git-tracked, geen `promptVersion` op AICallSnapshot
- LearningEvent capture ≠ feedback-loop (signalen worden gelogd, niet teruggevoerd)
- Auto-regenerate infrastructure bestaat (regenerate-route) maar wordt alleen manueel getriggerd

---

## 2. 3-laagse test-architectuur

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Layer 1 — GENERIC PROPERTY EVALS                                         │
│ Deterministisch, 100% van traffic, runtime < 100ms per call              │
│                                                                          │
│ 10-15 checks over ALLE 53 content-types:                                 │
│ - Schema-valid (output matches expected structure)                       │
│ - Language-match (NL/EN consistent met workspace.contentLanguage)        │
│ - Length-bounds (min/max words per type per deliverable-types.ts)        │
│ - Banned-phrase list (corporate jargon, AI-tells)                        │
│ - Brand-name capitalization (Napking niet napking)                       │
│ - Placeholder detection ([PRICE], TBD, €XX, ${...})                      │
│ - PII/safety (geen e-mail, telefoon, BSN in output)                      │
│ - Heading hierarchy (H1 → H2 → H3, geen sprongen)                        │
│ - CTA presence (waar required: search-ad, landing-page, email)           │
│ - Hallucination flag op named entities (claims about brand/product)      │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Layer 2 — TYPE-SPECIFIC GOLDEN SETS                                      │
│ Curated, CI op prompt-change + nightly full-suite                        │
│                                                                          │
│ Per content-type: 5-10 golden examples (input → expected output)         │
│ Totaal ~300-500 items voor 53 types                                      │
│                                                                          │
│ Per type:                                                                │
│ - 3 human-authored seeds (uit eigen pilot-content)                       │
│ - 5 LLM-evolved variants (DeepEval Synthesizer style/length/tone shifts) │
│ - 2 adversarial cases (edge inputs die historisch breken)                │
│                                                                          │
│ G-Eval rubric per type — 4 dimensies + content-type-specifieke checks:   │
│ - Coherence (logical flow)                                               │
│ - Consistency (intern + met brand voice)                                 │
│ - Fluency (idiomatic NL/EN)                                              │
│ - Relevance (matcht brief)                                               │
│ - Type-specific (blog: SEO keyword in H1/meta; tweet: char-limit; etc.)  │
│                                                                          │
│ Judging: G-Eval logprob-weighted + position-swap calibration             │
└──────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ Layer 3 — ITEM-SPECIFIC REGRESSION                                       │
│ LearningEvent-driven, productie-feedback als test-corpus                 │
│                                                                          │
│ Bronnen:                                                                 │
│ - LearningEvent type=content.rejected (hard-negative examples)           │
│ - LearningEvent type=content.edited met edit-distance > 20% (soft-neg)   │
│ - BrandReviewFinding entries met severity = CRITICAL (regression-seeds)  │
│ - Manual-add cases via UI "report bad output" button (future)            │
│                                                                          │
│ Auto-promote naar Layer 2 wanneer:                                       │
│ - Pattern verschijnt ≥3× over verschillende types                        │
│ - Edit-distance pattern is taal-consistent (geen one-off typo)           │
│                                                                          │
│ Test-runs: nightly tegen latest prompt-version, alert bij regressie      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Layer-to-tool mapping

| Layer | Tool | Storage | Run-trigger |
|---|---|---|---|
| 1. Generic property evals | Custom heuristics + `franc-min` + Zod schemas | In-code | Per generation (100% traffic) |
| 2. Type-specific golden sets | **Promptfoo** YAML-rubrics + DeepEval Synthesizer | `tests/content-golden-sets/` | CI op prompt-change + nightly |
| 3. Item-specific regression | LearningEvent query + auto-promote logic | Database (existing tables) | Nightly + on-demand |

---

## 3. Vier sub-plannen

### 3.0 Chain-of-Prompts framework (cross-cutting pattern)

**Doel**: prompt-pipelines structureel ontwerpen als reasoning-chains ipv monolithische single-prompts. Industry-bewezen + onderzoek-validated; significante quality-uplift voor complexe content (long-form, whitepaper, case-study).

Branddock's pipeline (brief → strategy → concept → variants → canvas) IS al een chain-of-prompts op high-level, maar **elke stage is intern een single-prompt**. State-of-art is **chain-of-prompts INNER + OUTER**:

**Vijf bruikbare patronen** (gerangschikt op productie-readiness voor Branddock):

#### A. Chain-of-Thought (CoT)
Single-prompt reasoning waarbij model expliciet stappen verwoordt vóór de finale output.
- **Wei et al. 2022** (`Chain-of-Thought Prompting Elicits Reasoning in Large Language Models`)
- Werkt vooral bij Claude/GPT-4 class (emergent at scale)
- Implementatie: `<thinking>` blocks (Anthropic native), of "Let's denken stap-voor-stap" prefix
- **Branddock fit**: HOOG voor strategy-stage (analytical) + concept-stage (creative-rationale)
- Effort: ~1u per stage prompt-template tuning

#### B. Prompt-chaining / Sequential prompts
Explicit multi-step pipeline, output van stap N is input van stap N+1, met expliciete checkpoints + validation tussen stappen.
- Branddock's high-level pipeline IS dit, maar mist inner-chain
- **State-of-art**: LangChain Expression Language (LCEL), Anthropic's tool-use chains, OpenAI Assistants
- **Branddock fit**: HOOG — onze multi-stage pipeline kan baten van expliciete tussenliggende validators (al gedekt in sub-plan B Wiring checkpoint-gates)

#### C. Plan-and-Solve
Eerst expliciet PLAN-stap (outline / structure / decomposition) → daarna EXECUTE-stap per plan-item.
- **Wang et al. 2023** (`Plan-and-Solve Prompting: Improving Zero-Shot Chain-of-Thought Reasoning by Large Language Models`)
- Werkt **uitstekend** voor long-form content waar structuur cruciaal is (blog-post, whitepaper, case-study, landing-page, ebook)
- Branddock-implementatie:
  1. **Plan-stap**: AI genereert outline (H1/H2 structuur + sectie-doelen + word-budgets per sectie)
  2. **Execute-stap**: AI genereert per sectie afzonderlijk, met outline-context + voorgaande secties als anchor
- **Branddock fit**: ZEER HOOG voor 7 long-form types — verwachte quality-gain 15-30%

#### D. Self-Refine
Model genereert output → evalueert eigen output tegen criteria → genereert refined versie.
- **Madaan et al. 2023** (`Self-Refine: Iterative Refinement with Self-Feedback`)
- Iteraties: typisch 2-3, daarna diminishing returns
- **Branddock fit**: MEDIUM — F-VAL is al een externe judge, dus Self-Refine zou duplicatie zijn. Maar **bruikbaar voor stage-level refinement** (e.g. strategy-stage refines zijn rationale 1× vóór doorgeven aan concept)
- **Beter pas in automated feedback-loop sub-plan C** (gebruik F-VAL als externe judge ipv self-evaluation)

#### E. Tree-of-Thoughts (ToT)
Branching exploration met multiple parallel reasoning paths + evaluation om beste path te kiezen.
- **Yao et al. 2023** (`Tree of Thoughts: Deliberate Problem Solving with Large Language Models`)
- Veel meer compute (3-5× cost), gebruikt voor creative-divergence
- **Branddock fit**: HOOG voor concept-generation (`generateCreativeAngles` — produceert al 2 angles maar zonder evaluation). Kan upgraden naar 4-5 angles met zelf-evaluation → top-2 picks
- **Cost-impact**: ~2-3× concept-stage cost; alleen voor content-types met budget (whitepaper, case-study, niet voor tweet/search-ad)

#### Aanbevolen integratie per stage

| Stage | Patroon | Content-types | Effort |
|---|---|---|---|
| Strategy rationale | Chain-of-Thought | Alle 53 | ~1d (alle 8 prompt-templates) |
| Concept generation | Tree-of-Thoughts (4 angles + eval) | Long-form, landing-page, video | ~2d |
| Variant generation | Plan-and-Solve | Long-form (blog/whitepaper/case-study/ebook/article/thought-leadership/pillar-page) | ~2d (1 plan-prompt + N execute-prompts per type) |
| Variant generation | Single-prompt CoT | Social, advertising, email, sales, PR | ~1d |
| Canvas inline-edit | (geen chain — directe transform) | Alle | n.v.t. |

**Tools-keuze**:
- **Anthropic native `<thinking>` blocks** voor CoT (gratis, native API)
- **Sequential SSE-events** voor Plan-and-Solve (huidige pipeline al SSE)
- **Promise.all met evaluator-call** voor ToT (1 extra evaluation-call ≈ $0.001/concept)

**Acceptatiecriteria voor chain-of-prompts integration**:
- [ ] CoT toegevoegd aan 8 prompt-template files (strategy + variant stages)
- [ ] Plan-and-Solve voor 7 long-form types — separate plan-stage + execute-stage
- [ ] ToT voor concept-generation op 4 content-types (blog, whitepaper, landing-page, explainer-video)
- [ ] A/B test: vergelijk CoT vs single-prompt op golden-sets per type — quality-delta meten
- [ ] Cost-tracking: per-type cost-budget post-chain-upgrade ≤ +30% van pre-chain baseline
- [ ] Latency-budget: chain-overhead ≤ +5s p95 op long-form types

**Effort totaal chain-of-prompts upgrades**: ~7 dagen verspreid over sprint #5-6 — overlapt met sub-plan A.

**Sprint-fit**: integreren in **sub-sprint #5.B (golden sets)** — bouw golden-sets MET chain-upgraded prompts vanaf start, zodat baseline en upgrade gelijk gemeten worden. Anders meet je twee dingen tegelijk.

---

### 3.0.5 Multi-modal complexity — video + image quality

Tekst-content is maar de helft. Video- en image-output hebben hun eigen complexiteits-dimensies die chain-of-prompts uitbouwen naar **chain-of-modalities**. Branddock heeft al gedeeltelijke infrastructuur (`ContentVisualFidelityScore`, `scoreImageFidelity`, type-specific prompt-bundles voor `video-ad` / `explainer-video` / `tiktok-script` / `linkedin-video` / `promo-video`) maar mist de gestructureerde chain-of-prompts pipeline die multi-modal quality borgt.

#### Video pipeline complexity

Video-content is **multi-asset bundeled**:
- **Script** (text — voice-over of dialogue)
- **Storyboard** (visual frames per scene)
- **Shot-list** (camera-angles, timing, transitions)
- **Audio** (voice-over, music, SFX)
- **Subtitling / captions**

Huidige Branddock: per video-type 1 prompt-call produceert script-tekst inclusief globale storyboard-descriptions. Geen aparte storyboard-image generatie, geen scene-level chain.

**State-of-art chain voor video** (gebaseerd op Sora/Runway/Pika workflows + screenwriter-AI tools):

```
1. PLAN-stap: Story-beat outline
   Input: brief + brand context + duration target
   Output: { acts: [{name, secondsBudget, beats: [{beat, emotionalArc}]}] }

2. EXECUTE-stap A: Script-per-scene
   Input: act-outline + scene-N context (vorige scenes als anchor)
   Output: { sceneScript, vo, visualDirection }
   Loop over N scenes; gebruik Plan-and-Solve patroon

3. EXECUTE-stap B: Storyboard-per-scene (parallel met A waar mogelijk)
   Input: visualDirection uit stap 2A + style-chip + brand-visuals
   Output: { frameDescription, cameraAngle, lighting, subjectAction }
   → Naar image-gen pipeline (Gemini / Flux) voor frame-render

4. VALIDATE-stap: Coherence-check
   Input: alle scenes-pairs (script + frame)
   Output: { coherenceScore, mismatches: [{sceneN, issue}] }
   Bij low-coherence: re-prompt failing scene met diagnostic

5. ASSEMBLY-stap: Shot-list + timing-strip
   Input: scenes + storyboard + duration-budget
   Output: shooting-ready document
```

**Branddock-fit per video-type**:
- `tiktok-script` (15-30s): 3-4 scenes, lightweight chain — Plan-and-Solve volstaat
- `explainer-video` (60-180s): 5-7 scenes, **volledige 5-staps chain** — coreAnalogy als rode draad
- `video-ad` (15-30s): pattern-interrupt opening + payoff timing — **hook-focused chain** (hookSecond → middle → cta)
- `linkedin-video` (60-90s): authority + storytelling — **3-act chain**
- `promo-video` (30-60s): hook → demo → cta — **3-step chain**

#### Image quality complexity

Image-generatie heeft eigen kwaliteits-uitdagingen die single-prompt niet oplost:
- **Brand-consistency** (kleuren / typography / iconography match brandstyle)
- **Subject-identity** behoud (vooral bij Compose: people-recognition)
- **Text-in-image** (logo's, copy, kant van caption-overlay) — vaak hallucineert AI hier
- **Aspect-ratio + composition** (rule-of-thirds, focal point, whitespace)
- **Negative prompts** (wat NIET getoond moet worden — sponsor-logos van concurrenten, etc.)

**Image chain-of-prompts** (gebaseerd op Midjourney/Flux/Imagen workflows + DALL-E iteration patterns):

```
1. PROMPT-CONSTRUCT-stap
   Input: visualBrief + brand context + style-chip
   Output: { positivePrompt, negativePrompt, aspectRatio, refImages? }
   - positivePrompt structure: subject (who) + action (what) + setting (where) + lighting + mood + style
   - negativePrompt automatically populated: "competitor-logos, blurry, text artifacts, ..."

2. GENERATE-stap (multi-candidate)
   Genereer 3-4 candidates parallel (cost-tradeoff: meer = beter selecteren maar duurder)
   Voor compose: use nano-banana (gemini-2.5-flash-image-preview) — beter dan FAL Flux Pro Kontext

3. EVALUATE-stap (visual-fidelity scoring)
   Input: gegenereerde images
   Output: { compositeScore, dimensions: {brandConsistency, subjectIdentity, textAccuracy, composition, lighting} }
   Tools: CLIP-based image-text similarity + custom vision-prompt judge
   Branddock heeft al `scoreImageFidelity` — uitbreiden met dimension-breakdown

4. SELECT-of-REFINE-stap
   - Best candidate ≥ threshold → present aan user
   - Geen candidates ≥ threshold → REFINE: image-to-image regenerate met diagnostic-hint
     ("text in image was unreadable" → "remove all text from prompt; user adds via canvas overlay")
   - Max 2 refine-attempts, daarna escalate

5. POST-PROCESS-stap
   - Brand-color overlay check
   - Text-overlay positioning (titel via UI, niet in image-gen)
```

**Wat ontbreekt in Branddock** voor multi-modal quality:

| Capability | Status | Need |
|---|---|---|
| Visual fidelity scoring | ✅ `ContentVisualFidelityScore` + `scoreImageFidelity` | Dimension-breakdown (nu monolithic score) |
| Negative prompts | ❌ Niet geïmplementeerd | Add to `buildVisualBriefImagePrompts` |
| Multi-candidate selection | ⚠️ Genereert N maar UI toont alleen 1 | Show 3-4 in Step 2, user picks |
| Image-to-image refine loop | ❌ Geen | Add to compose route post-gemini-migration |
| Text-in-image guard | ❌ Geen | Negative-prompt template + post-gen text-detection (OCR) |
| Brand-color validation | ⚠️ Reads brandstyle maar geen validation | Post-gen color-palette extraction + compare |
| Storyboard-per-scene gen | ❌ Geen | Nieuwe pipeline voor 5 video-types |
| Script-storyboard coherence | ❌ Geen | Validate-stap stap 4 in video-chain |

#### Acceptance criteria multi-modal (subset)

**Video** (5 types):
- [ ] Plan-and-Solve chain voor `explainer-video` (5-7 scenes, coreAnalogy als anchor) — quality-baseline meten
- [ ] Hook-focused chain voor `video-ad` + `tiktok-script` (hookSecond/payoffMoment expliciet)
- [ ] Script-storyboard coherence-check als validate-stap
- [ ] Storyboard-per-scene image generation (post-gemini-migration)

**Image** (alle types met visual):
- [ ] Negative-prompts toegevoegd aan `buildVisualBriefImagePrompts` (8-10 default-excludes)
- [ ] Multi-candidate (3-4) selection UI in Step 2
- [ ] Visual-fidelity dimension-breakdown (5 dimensies ipv composite-only)
- [ ] Image-to-image refine-loop in compose-pipeline (max 2 iterations)
- [ ] Text-in-image OCR-check (`/api/internal/visual-fidelity-check` extension)
- [ ] Brand-color validation post-gen (palette-extract via color-thief of similar)

**Effort multi-modal**: ~10-12 dagen verspreid over sprint #5-7:
- Video chain-of-prompts: ~4d
- Image quality patterns: ~6d
- Visual-fidelity dimension-breakdown: ~2d

**Sprint-fit**: integreren in sub-sprints #5.B (chain-upgrades) + #6.B (auto-iterate, hier image-refine-loop) + #7.A (per-categorie analyse — video-categorie krijgt eigen flow-doc).

**Cost-impact**:
- Video chain: ~+50% compute per video-type (Plan + N execute calls). Acceptable voor expensive types (~$0.15 → $0.22 per explainer-video).
- Image multi-candidate: 3-4× cost per generation (~$0.04 → $0.12-0.16). Mitigatie: sample-based (alleen voor types met `multiCandidate: true` flag, defaults aan voor expensive types).

---

### 3.1 Prompt-quality optimization (sub-plan A)

**Doel**: prompts versioned, eval-gated, en iteratief verbeterd via golden-sets.

**Concrete acties**:

1. **Prompt versioning infra** (~1d):
   - Voeg `promptVersion` field (semver `vN.N.N`) toe aan elk prompt-template file in `src/lib/studio/prompt-templates/`
   - `AICallSnapshot.promptVersion` field toevoegen (DB migration)
   - Bij prompt-edit: bumped version triggert CI eval-run

2. **Prompt registry UI** (~2d):
   - Backend route bestaat (`/api/admin/prompt-registry`); frontend ontbreekt
   - Settings → Developer → AI Prompts: lijst per source-type + versies + change-history + recent calls (van AICallSnapshot)
   - Click op een prompt → diff-view tussen versies + golden-set pass-rate per versie

3. **Prompt-tuning loop**:
   - Per content-type: 5-10 golden examples + G-Eval rubric
   - Bij prompt-change: run rubric → score vs baseline → accept/reject change
   - Promptfoo YAML config in `tests/prompts/<type>.yaml`
   - Threshold: nieuwe prompt-versie moet ≥ baseline op alle 4 dimensies (Coherence / Consistency / Fluency / Relevance)

4. **Anti-bias measures**:
   - Position-swap: judge wordt 2× aangeroepen met geswapte order, accepteer alleen consistent vote
   - Multiple-evidence: judge moet ≥2 specifieke citaties uit content geven per finding
   - Human-in-the-loop spot-check op 5% van judge-output (handmatige review queue)

5. **Few-shot tuning per type**:
   - Voor types met lage pass-rate (e.g. blog-post < 80%): inject 3 best-performing historical examples als few-shot in system prompt
   - Examples uit `LearningEvent` type=content.approved met fidelity-score > 85

**Effort**: ~5 dagen verspreid over sprint #5-6.

---

### 3.2 Wiring-audit + checkpoint-gates (sub-plan B)

**Doel**: pipeline-checkpoints automatisch valideren tussen elke transition, fail-fast bij naden.

**Pipeline checkpoints** (uit interne audit, sectie 3):

```
[1] Brief input → assembleCanvasContext()
    Gate: required fields aanwezig + brand-context completeness ≥ 50%

[2] assembleCanvasContext → buildBrandVoiceDirective + detectAiTells
    Gate: voiceguide bestaat OF personality fallback OK

[3] generateCreativeAngles (Gemini Flash)
    Gate: ≥2 angles + semantic diversity score (cosine < 0.85)

[4] Per-angle variant generation (Claude/OpenAI/Gemini)
    Gate: structured output schema-valid + length in bounds

[5] sanitizeVariantContent
    Gate: 0 placeholders + 0 markdown leakage in plain-text types

[6] runFidelityScoring (F-VAL 3-pijler)
    Gate: composite ≥ workspace-threshold (default 65)

[7] STRICT mode rewrite (if applicable)
    Gate: rewrite-score > pre-rewrite-score

[8] persistDeliverableComponent
    Gate: DB-write success + invalidate cache
```

**Concrete acties**:

1. **Checkpoint-helper library** (~2d):
   - `src/lib/content-test/checkpoint-gates.ts` (nieuw)
   - Pure functions: `validateBriefInput(brief)`, `validateAngleDiversity(angles)`, `validateVariantOutput(variant, type)`, etc.
   - Returns `{ pass: boolean, reasons: string[], severity: 'block' | 'warn' }`

2. **Orchestrator wiring** (~1d):
   - `canvas-orchestrator.ts` consult checkpoint-helpers tussen stages
   - Block-severity → throw + SSE error-event → UI showt diagnostic
   - Warn-severity → log naar AICallTrace.gateWarnings, doe stage door

3. **Smoke-test per stage** (~2d):
   - `scripts/smoke-tests/pipeline-checkpoint-<stage>.ts` × 8 stages
   - Synthetic input → assert gate-result expected

4. **Production telemetry**:
   - Gate-pass-rate per stage als PostHog dashboard metric
   - Alert bij gate-pass-rate < 95% (signaal dat pipeline degraderet)

**Effort**: ~5 dagen verspreid over sprint #5-6.

---

### 3.3 Automated feedback-loop (sub-plan C)

**Doel**: F-VAL findings + LearningEvent signalen terugvoeren naar prompts + auto-iterate.

**Architectuur**:

```
Generation → F-VAL score
              ├─ score ≥ threshold → present to user
              └─ score < threshold → AUTO-ITERATE (max 2 attempts)
                                      ↓
                                      Compile feedback-hint uit findings:
                                      - Pijler 1 low → "tone is off"
                                      - Pijler 2 low → judge-rationale → "claim X is vague"
                                      - Pijler 3 low → rules-violations list
                                      ↓
                                      Regenerate met hint in system-prompt
                                      ↓
                                      Re-score → if still <threshold:
                                                  escalate to user with diagnostic
```

**Concrete acties**:

1. **Feedback-to-prompt compiler** (~1.5d):
   - `src/lib/content-test/feedback-compiler.ts` (nieuw)
   - Input: BrandReviewFinding[] + pijler-breakdown
   - Output: prompt-hint string per pijler-failure
   - Templates voor 8-10 common findings ("tone-too-formal" → "Use conversational tone, contractions allowed")

2. **Auto-iterate orchestrator** (~2d):
   - `src/lib/ai/auto-iterate.ts` (nieuw)
   - Max iterations: 2 (configurable per workspace)
   - Stop-conditions: threshold-met OR max-iterations OR user-cancel
   - Telemetry: per iteration cost + delta-score → LearningEvent

3. **Edit-distance signal capture** (~1d):
   - `LearningEvent` extension: nieuwe veld `editDistance` (Float, normalized 0-1)
   - Hook in inline-edit save: compute Levenshtein(original, edited) / max-length
   - Update `content.edited` event-type met edit-distance metric
   - Soft-negative threshold: > 20% delta = candidate voor regression-corpus

4. **Per-type threshold tuning UI** (~1d):
   - Settings → Validation → Per-type fidelity thresholds
   - press-release: 75 (stricter)
   - search-ad: 60 (looser)
   - default: 65

5. **Feedback-attribution dashboard**:
   - Brand Alignment Insights tab (al gebouwd) uitbreiden:
   - "Auto-iterate success rate per type"
   - "Most common findings → which hints worked"
   - "Edit-distance heatmap per content-type"

**Effort**: ~6 dagen verspreid over sprint #6-7.

---

### 3.4 Flow-analyse per content-type (sub-plan D)

**Doel**: identificeer waar in de 6-staps flow elke content-category breekt; fix categorie-brede issues vóór per-item polish.

**Methode**:

1. **Audit per categorie** (~3 uur/categorie × 8 = ~3 dagen):
   - Long-form (7 types): blog-post, pillar-page, whitepaper, case-study, ebook, article, thought-leadership
   - Social (13)
   - Advertising (6)
   - Email (5)
   - Website (5)
   - Video (5)
   - Sales (4)
   - PR/HR (8)

2. **Per categorie analyseren**:
   - Pipeline-doorloop: welke checkpoints zijn category-specific?
   - Prompt-quality: hoeveel few-shot examples per type?
   - Output-format: markdown vs HTML vs structured-JSON
   - Asset-pattern: hero / inline / carousel / no-asset
   - Recent gotchas voor deze categorie (uit `gotchas.md`)

3. **Per-categorie verbeterplan deliverable** in `docs/specs/content-flow-<categorie>.md`:
   - Bekende friction-points
   - Prompt-tuning aanbevelingen
   - Test-coverage status
   - Asset-generator integration status

4. **Cross-category patronen**:
   - Welke types delen prompt-templates en kunnen DRY'd worden?
   - Welke types hebben unieke pipelines (SEO-pipeline voor blog vs landing-page)?

**Effort**: ~3 dagen, parallel met sub-plans A/B/C.

---

## 4. Fasering — 4 sub-sprints

| Sub-sprint | Naam | Sprint | Effort | Deliverables |
|---|---|---|---|---|
| **#5.A** | Foundation — Generic property evals + prompt versioning | sprint #5 week 1 | ~3d | Layer 1 in productie (10-15 checks), `promptVersion` field, Prompt Registry UI v1 |
| **#5.B** | Chain-of-prompts upgrades + type-specific golden sets (8 representanten) | sprint #5 week 2-3 | ~7d (chain) + ~4d (goldens) = ~10d | CoT/Plan-and-Solve/ToT in 8 prompt-templates + 8 categorie-representanten × 5-10 goldens × G-Eval rubric in Promptfoo. A/B-baseline vs chain-upgraded prompts. |
| **#6.A** | Wiring checkpoint-gates + sub-plan B | sprint #6 week 1-2 | ~5d | Checkpoint-helper library + orchestrator integration + 8 stage-smokes |
| **#6.B** | Automated feedback-loop + sub-plan C | sprint #6 week 2-3 | ~6d | Feedback-compiler + auto-iterate orchestrator + edit-distance signals + per-type thresholds |
| **#7.A** | Flow-analyse 8 categorieën + sub-plan D | sprint #7 week 1 | ~3d | 8 categorie-rapporten in `docs/specs/content-flow-*.md` |
| **#7.B** | Item-specific regression (Layer 3) + polish | sprint #7 week 2 | ~3d | LearningEvent → regression-corpus auto-promote logic + nightly run |

**Totaal**: ~40-42 dagen (incl. chain-of-prompts + multi-modal video/image upgrades), verspreid over 6-7 weken pre-launch. Met 3 parallel tracks (Track A volledig + occasional Track B/C help) realistisch in ~7-8 weken.

> Belangrijke scope-realiteit: dit verbeterplan is **groter dan strategy-analyst-stub (20-27d)**. Beide samen pre-launch = stevige scope-druk. Zie sectie 7 voor scope-keuzes.

**Parallelisatie**: kan in Track A (Quality + Validation) lopen. Geen blocker voor Track B (Brandclaw) of Track C (Launch infra).

---

## 5. Tool-keuzes + integraties

| Tool | Doel | Effort | Phase |
|---|---|---|---|
| **Promptfoo** (`npm install promptfoo`) | YAML-rubrics voor Layer 2 golden sets + CI-runs | ~2d setup | #5.B |
| **DeepEval Synthesizer** (Python, of npm equivalent) | Synthetic golden-set evolutions (style-shift, adversarial) | ~1d | #5.B |
| **G-Eval implementation** (custom of via DeepEval) | Logprob-weighted scoring voor F-VAL judge-pijler | ~2d | #6.B (post-launch nice-to-have) |
| **LangSmith** (cloud, $39/mnd starter) of **Langfuse** (self-hosted) | Production trace-naar-dataset pipeline | ~3d setup | #7.B (na pilot-data) |
| **Levenshtein lib** (`fast-levenshtein` of native) | Edit-distance signal in LearningEvent | ~1u | #6.B |

**Cost-impact**:
- Promptfoo: $0 (open-source)
- DeepEval: $0
- LangSmith: $39/mnd Plus tier (na free 5k traces)
- G-Eval extra inference cost: ~+10% op judge-calls (logprobs vereisen specifieke API-calls)

---

## 6. Acceptance criteria per sub-sprint

**#5.A — Foundation**:
- [ ] 10-15 property-evals draaien op 100% van content-generation calls (runtime < 100ms cumulatief)
- [ ] Property-eval violations gelogd in AICallTrace + zichtbaar in Studio UI
- [ ] `promptVersion` field op AICallSnapshot + version-bumps in 8 prompt-template files
- [ ] Prompt Registry UI v1 toont per source-type alle versies + recent-calls

**#5.B — Type-specific golden sets**:
- [ ] Promptfoo `tests/content-golden-sets/<type>.yaml` voor 8 representanten
- [ ] Per representant: 3 human-authored + 5 synthetic + 2 adversarial = 10 goldens
- [ ] G-Eval rubric per type met 4-5 dimensies
- [ ] CI workflow draait golden-set bij PR die prompt-files raakt
- [ ] Baseline-pass-rate gemeten + gedocumenteerd

**#6.A — Wiring checkpoint-gates**:
- [ ] 8 checkpoint-functies geïmplementeerd
- [ ] Orchestrator consulteert gates tussen elke stage
- [ ] Block-severity gates triggeren SSE error met diagnostic
- [ ] Warn-severity gates loggen naar AICallTrace.gateWarnings
- [ ] 8 stage-smokes pass

**#6.B — Automated feedback-loop**:
- [ ] Feedback-compiler maps findings → prompt-hints (8-10 templates)
- [ ] Auto-iterate orchestrator met max-2 iterations + safety stops
- [ ] Edit-distance gecaptured in LearningEvent.editDistance (Float 0-1)
- [ ] Per-type fidelity threshold UI in Settings → Validation
- [ ] Auto-iterate success-rate metric in Insights tab

**#7.A — Flow-analyse**:
- [ ] 8 categorie-rapporten in `docs/specs/content-flow-<categorie>.md`
- [ ] Per rapport: friction-points + prompt-tuning recs + asset-status

**#7.B — Item-specific regression**:
- [ ] LearningEvent rejected/edited entries → regression-corpus auto-promote
- [ ] Nightly run tegen latest prompts + alert bij regressie > 5%
- [ ] Manual override "promote this to regression suite" via Studio UI

---

## 7. Open beslissingen — vereisen user-input vóór sub-sprint start

1. **Promptfoo vs LangSmith vs Langfuse als hoofdtool** — Promptfoo is simpler/free, LangSmith is best-in-class met cost ($39+/mnd), Langfuse self-hosted halfweg. Aanbeveling: Promptfoo voor #5.B (gratis, snel), LangSmith of Langfuse voor #7.B (na pilot-data).

2. **G-Eval implementation** — eigen bouwen of via DeepEval (Python, npm-bridge nodig)? Aanbeveling: eigen lightweight implementatie omdat we volledige controle willen over de logprob-weighting voor F-VAL.

3. **Per-content-type threshold defaults** — wat zijn de juiste numbers? Press-release stricter dan search-ad, maar exacte waardes vereisen pilot-data. Aanbeveling: start met conservative defaults, observe 2-4 weken, tune.

4. **Auto-iterate visibility** — moet user weten dat F-VAL re-genereerde? Of silent "magic"? Aanbeveling: subtle UI-indicator ("iterated 1× for fidelity") + opt-out toggle.

5. **Phase-A scope-cut** — alle 53 types in golden-sets, of alleen 8 representanten + uitbreiding post-pilot? Aanbeveling: 8 representanten in #5.B, full 53 over #7.B + post-launch sprint.

6. **Multi-modal video chain integratie** — alle 5 video-types in pre-launch chain, of alleen `explainer-video` als showcase + rest post-launch? Aanbeveling: explainer-video als full-chain showcase pre-launch, video-ad + tiktok-script lightweight chain, linkedin-video + promo-video deferred post-launch (afhankelijk van pilot-vraag).

7. **Image refine-loop max-iterations** — 1, 2 of 3 attempts? Cost-trade-off; gebruikers willen niet 30s wachten op image. Aanbeveling: max 2; eerste pre-launch test op pilot-data om optimale waarde te bepalen.

8. **Overall scope-confrontatie** — ✅ **Beslissing 2026-05-12: Optie B (Full plan pre-launch)**. Alle 6 sub-sprints + multi-modal chain-upgrades pre-launch. Pilot-projectie schuift van +6-8 → +9-11 weken. Rationale: content-quality is competitief differentiator; pilot start moet vanaf dag 1 op-niveau zijn ipv quality-iteration op pilot-klanten.

---

## 8. Risico's + mitigaties

| Risico | Mitigatie |
|---|---|
| **Judge-bias** (agreeableness TNR < 25%) maakt golden-set scores onbetrouwbaar | Position-swap calibration verplicht; multi-evidence cite requirement; 5% human spot-check queue |
| **Golden-set onderhoud** wordt lijfeigene last bij prompt-iteratie | LangSmith trace-to-dataset pipeline post-pilot; nu manueel + DeepEval synthesis |
| **Auto-iterate infinite loop** of cost-explosie | Max-iterations hard cap (2), cost-budget per call, cancel-button user |
| **Feedback-compiler hallucineert hints** | Whitelist van 8-10 templates eerst; alleen template-match toepassen, fallback naar generic re-prompt |
| **Promptfoo CI brengt dev velocity omlaag** | Subset op PR (only-touched prompts), full nightly; cache golden-set runs |
| **F-VAL judge cost stijgt door logprobs** | Sample-based: judge op 100% calls voor productie-content, op 10% voor draft-content |
| **Per-type thresholds te streng → users frustraties** | Pilot-tunable via Settings UI; default conservative; track override-rate as feedback |

---

## 9. Cross-references

**Bron-artefacten**:
- Externe research: `docs/audits/2026-05-12-external-content-test-patterns.md` (te maken, samenvatting in dit document)
- Interne audit: deze plan-document sectie 1-2 reflecteert audit-uitkomsten
- Current playbook: `docs/playbooks/testplan-content-items.md` (te updaten met Layer-references in #5.A)

**Related tasks**:
- `tasks/content-items-test-coverage.md` — handmatige testronde 8 representanten (sprint #4 nog te doen)
- `tasks/compose-pipeline-gemini-migration.md` — eerder vandaag aangemaakt
- `tasks/code-debt-pre-launch-cleanup.md` — Cluster A items (persist-TODOs) zijn dependencies voor #6.A

**Industry references**:
- Anthropic prompt-engineering: position-swap, structured outputs, XML-tags
- G-Eval paper (EMNLP 2023): logprob-weighted continuous scores
- DeepEval Synthesizer: golden-set evolution patterns
- Promptfoo `llm-rubric` config patterns
- Watershed multi-step pipeline framework
- RLUF (arxiv 2025): edit-distance + thumbs-down focused signals

---

## 10. Volgende stap

1. **User-review dit plan** — markeer scope-cuts, prioriteits-shifts, of open beslissingen
2. **Bevestig fasering** — sprint #5-7 fit OK of moet anders gefaseerd?
3. **Beslis open beslissingen** sectie 7 (Promptfoo/LangSmith/Langfuse keuze, etc.)
4. **Spawn sub-sprint #5.A task-file** als groen licht — task-file voor "Foundation: Generic property evals + prompt versioning"

Tot dan: handmatige testplan-content-items 8 representanten kan parallel doorgaan in sprint #4 als pre-meting (baseline-data voor Layer 2 goldens).
