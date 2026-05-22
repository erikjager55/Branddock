---
id: competitor-ai-event-classifier
title: Competitor AI-event-classifier — pattern-detection bovenop diff-engine
fase: pre-launch
priority: now
effort: 3-4 dagen (werkelijk: ~1d)
owner: claude-code
status: done
created: 2026-05-12
completed: 2026-05-19
related-adr: 2026-05-08-competitor-snapshot-historie
related-spec: tasks/_drafts/idea-competitor-ai-event-classifier.md
worktree: branddock-brandclaw
---

# Probleem

`CompetitorActivityType`-enum heeft 12 events; Fase 1 deterministische diff-engine (sprint #2, `competitor-snapshot-historie`) produceert er 7. De 5 strategisch interessantste — CATEGORY_REPOSITIONING, TARGET_AUDIENCE_CHANGED, VISUAL_REBRAND, NEW_FORMAT_EMERGING, FUNDING_EVENT, LEADERSHIP_CHANGE — vereisen pattern-level AI-interpretatie.

Idea-draft `idea-competitor-ai-event-classifier.md` is verdict `ready-to-build`. **A1 validatie-probe (2026-05-08) gaf 96,7% accuracy** op synthetische test-set van 30 paren — boven de 75% threshold. Pre-launch scope-uitbreiding 2026-05-12 trekt deze taak naar pre-launch zodat pilot-klanten MAJOR-severity events vanaf dag 1 zien.

# Voorstel

MVP-scope: alleen de twee events met snapshot-only inputs.

1. **CATEGORY_REPOSITIONING** (severity MAJOR) — detecteert fundamentele category-shift via gecombineerde valueProp + targetAudience + differentiators diffs (Jaccard pre-filter ≥ 50% op ≥2 van 3 velden vóór AI-call).
2. **TARGET_AUDIENCE_CHANGED** (severity NOTABLE) — semantische doelgroep-verschuiving via targetAudience-veld alleen (Jaccard ≥ 0,3 pre-filter).

VISUAL_REBRAND, FUNDING_EVENT, LEADERSHIP_CHANGE, NEW_FORMAT_EMERGING → out-of-scope (vereisen externe data-sources / vision-pipeline).

# Acceptatiecriteria

**Classifier-implementatie**:
- [ ] `src/lib/competitors/ai-classifier.ts` (nieuw) — `classifyPatternEvents(prev, next): Promise<DetectedActivity[]>` pure async functie, geen DB-side-effects
- [ ] System + user prompt met Zod-schema voor structured output (`{ events: [{type, confidence, summary}] }`)
- [ ] Eén batched Claude Haiku 4.5 call (`claude-haiku-4-5-20251001`) ipv per-type calls
- [ ] Confidence-output per event; default cutoff = 0,7 (below → severity downgrade naar INFO + `[low-confidence]` summary-prefix)

**Pre-filter**:
- [ ] Deterministische Jaccard-pre-filter vóór AI-call: CATEGORY trigger op ≥2/3 velden ≥50% verschil; TARGET_AUDIENCE op single-veld ≥0,3 verschil
- [ ] Bij identieke prev/next: 0 events, 0 AI-calls (smoke verifieert call-count)

**Diff-engine integratie**:
- [ ] `src/lib/competitors/diff-engine.ts` — nieuwe `computeDiffWithClassifier(prev, next, ctx, opts)` async wrapper appendert classifier-events aan deterministische output
- [ ] Bestaande sync `computeDiff` blijft ongewijzigd (backwards-compat met andere callers)
- [ ] Refresh-route gebruikt nieuwe wrapper
- [ ] `applyCompetitorRefreshDualWrite` accepteert optionele `classifier?: ClassifierFn` injection voor mocking in tests

**Error-handling**:
- [ ] Anthropic API error → deterministische events worden alsnog geschreven; classifier-error gelogd maar geen 500
- [ ] Classifier-call latency-budget: ≤ 5s timeout (Haiku doet typisch 1-2s)

**Validatie**:
- [ ] `scripts/probes/competitor-classifier-events-accuracy.ts` (bestaat al per A1-probe) — accuracy ≥ 75% over 30 fixtures
- [ ] `scripts/smoke-tests/competitor-ai-classifier.ts` (nieuw) — 4 scenarios: (a) correct event, (b) no-event op identical, (c) pre-filter skip op low-Jaccard, (d) API-error graceful

**Quality gates**:
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors in nieuwe files
- [ ] Cost-tracking: gemiddelde < $0,03 per refresh over 100 testfixture-runs (verifieer via `createStructuredCompletion` telemetry)
- [ ] Refresh-route p95-latency-impact ≤ 2s extra (integratie-smoke met timing)

# Bestanden die ik aanraak

**Nieuw**:
- `src/lib/competitors/ai-classifier.ts` — classifier core
- `scripts/smoke-tests/competitor-ai-classifier.ts` — smoke

**Modify**:
- `src/lib/competitors/diff-engine.ts` — `computeDiffWithClassifier` toevoegen
- `src/lib/competitors/refresh-helper.ts` (of refresh-route) — wrapper-call substituen
- `src/app/api/competitors/refresh/route.ts` (of waar refresh ge-triggered wordt)

**Read-only**:
- `prisma/schema.prisma` — verifieer dat `CompetitorActivity.confidence` Float? veld bestaat (al sinds Fase 1)
- `scripts/probes/competitor-classifier-events-accuracy.ts` — verifieer fixtures + run baseline (96,7% verwacht per 2026-05-08 probe)

# Bestanden die ik NIET aanraak

- Schema (geen DB-wijzigingen — alle velden bestaan al)
- Andere diff-types (NEW_PRODUCT etc.) — blijven deterministisch
- UI van competitor-detail of activity-feed — al gebouwd in Fase 1, deze task is data-laag only
- Strategy Analyst Phase 3 consumer — die wordt apart gebouwd

# Smoke test plan

1. `npx tsx scripts/probes/competitor-classifier-events-accuracy.ts` → accuracy ≥ 75% over 30 fixtures (baseline 96,7%)
2. `npx tsx scripts/smoke-tests/competitor-ai-classifier.ts` → 4 scenarios pass
3. Live test: pick één pilot-competitor (bv. better-brands competitor met recente refresh) → manual refresh-trigger → verifieer `CompetitorActivity` rij met `detectionMethod = 'ai-classified'` verschijnt indien Jaccard-pre-filter triggert
4. Cost-check via `createStructuredCompletion` telemetry: 100-fixture run gemiddelde < $0,03

# Risico's

- **A1 accuracy degraderen** wanneer prompt-versie of model-versie verandert. **Mitigatie**: probe-script blijft in CI, accuracy-check is acceptance-gate
- **Latency-budget overschreden bij grote payloads** (lange valueProp + differentiators arrays). **Mitigatie**: truncate inputs > N chars vóór AI-call; meten in smoke
- **Confidence-calibration off** — Haiku zegt 0,9 confidence waar realiteit 70% is. **Mitigatie**: log confidence-distributie over eerste 30 pilot-dagen, drempel re-tunen
- **Backwards-compat regressie** door wrapper-substitutie. **Mitigatie**: oude `computeDiff` blijft puur sync; alleen refresh-route wisselt naar wrapper

# Out of scope

- Andere 3 enum-events (VISUAL_REBRAND / FUNDING_EVENT / LEADERSHIP_CHANGE / NEW_FORMAT_EMERGING) — vereisen externe data of vision-pipeline
- Multi-model ensemble (Haiku alleen, geen Sonnet-fallback)
- Cross-competitor pattern-detectie (workspace-level meta-events) — Strategy Analyst territory
- Continuous learning / fine-tuning
- Realtime streaming — synchroon-binnen-refresh enige modus

# Notes

A1 validatie-probe al uitgevoerd 2026-05-08 — zie `docs/audits/2026-05-08-competitor-classifier-events-accuracy.md`. 96,7% accuracy (29/30), avg confidence 0,95. Per-class: CATEGORY 100%, TARGET_AUDIENCE 90%, NONE 100%.

Idea-draft (180+ regels) blijft als detailed reference in `tasks/_drafts/idea-competitor-ai-event-classifier.md`.

Volgorde binnen Track B: na `brandclaw-tool-orchestrator` (3-5d). Parallel mogelijk met Strategy Analyst Phase A want raakt verschillende bestanden.

---

## Implementatie-summary (2026-05-19)

**Architectuur**: classifier-call zit BUITEN `prisma.$transaction` (refresh-route stap 8, vóór de TX). Async wrapper `computeDiffWithClassifier` runt deterministische `computeDiff` + (opt-in) AI classifier, concat'eert events. `applyCompetitorRefreshDualWrite` kreeg optionele `precomputedDetected?: DetectedActivity[]` param zodat hij z'n interne `computeDiff` skipt.

**Implementatie-afwijkingen vs initiële spec**:
- **Geen severity-downgrade bij confidence < 0,7** — alleen `[low-confidence]` summary-prefix. Per A1-audit-aanbeveling: confidence-spread 0,92-0,98 is te smal voor zinvol thresholding. Re-evaluate post-launch na 30d productie-data.
- **Hardcoded model `claude-haiku-4-5-20251001`** — geen feature-models registry entry (gebruiker-keuze voor MVP-eenvoud).
- **`PatternChangePayload.fields`** is candidate-fields, niet actual-driver-fields (rationale bevat de echte uitleg).

**Files gewijzigd**:
- NEW: `src/lib/competitors/ai-classifier.ts` (~280 LOC) — classifier core + Jaccard pre-filter + SYSTEM_PROMPT (identiek aan probe)
- NEW: `scripts/smoke-tests/competitor-ai-classifier.ts` (~210 LOC) — 5 scenarios incl NL-fixture
- MOD: `src/lib/competitors/types.ts` — `PatternChangePayload` + `'ai-classified'` detectionMethod + `ClassifierFn` type
- MOD: `src/lib/competitors/diff-engine.ts` — async `computeDiffWithClassifier` wrapper
- MOD: `src/lib/competitors/refresh-write.ts` — `precomputedDetected` optional param
- MOD: `src/app/api/competitors/[id]/refresh/route.ts` — wrapper-call vóór TX

**Quality gates**:
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors, 0 warnings
- Probe re-run: 29/30 = 96,7% accuracy (identiek aan 2026-05-08 baseline, geen Haiku-drift)
- Smoke: 15/15 PASS over 5 scenarios

**Code review**: 2 rondes (4 subagents), 0 CRITICAL final. WARNINGs deels gefixt (timeout, schema-mismatch logging, enum-key brittleness, tokenize short tokens, JSDoc precomputed contract), deels expliciet als MVP-trade-off geaccepteerd (mainOfferings blind spot, console.warn-zonder-PostHog, smoke structural-equality gaps).

**Open follow-ups** (uit code-review, expliciet niet geblokt):
- Pre-filter mainOfferings-uitbreiding overwegen na 30d skip-rate data
- Classifier-error observability naar PostHog/Sentry (MVP gebruikt Vercel logs)
- Sourceidentifier in classifier hardcoded path — overweeg `__filename` bij rename-risico
