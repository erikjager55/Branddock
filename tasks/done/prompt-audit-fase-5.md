---
id: prompt-audit-fase-5
title: Prompt-audit Fase 5 — configuratie-éénwording, client-centralisatie, fal-paden, meetlat-herstel en dead-code
fase: pre-launch
priority: now
effort: 4-5 dagen (audit-schatting; parallel uitgevoerd)
owner: claude-code
status: done
created: 2026-06-11
completed: 2026-06-11
related-adr: -
related-spec: docs/audits/2026-06-11-prompt-audit.md
worktree: branddock-feat-prompt-audit
---

# Probleem

De laatste fase van het audit-verbeterplan (§5 Fase 5 + §4 T6/T7/T8-restanten): (1) het exploration-systeem heeft vijf promptkopieën waarvan de admin-bewerkbare `reportPrompt` dood is — het live rapport gebruikt een hardcoded prompt (C12) en het sync-script overschrijft live prompts wholesale; de geseedde brand-personality-config exploreert voice-velden die BV-WIRE W-5 deprecate'de; (2) de temperature-guard bestaat als twee gedupliceerde inline-regexes zonder centrale helper, en raw-SDK/raw-fetch-paden (photo-brief, strategic-implications) omzeilen álle client-guards; (3) het hele trained-LoRA-pad heeft een stille `negative_prompt`-no-op, de consistent-models-generator draait op CFG 7,5 waar de endpoint-default 2,5 is, en twee media-routes omzeilen `truncatePromptForModel`/negative-defaults via directe `fal.subscribe`; (4) de golden-sets "merge-gate" kan nooit falen (`|| echo` slikt de exit-code) en de copy-image-coherence-judge is dood op het hero-pad; (5) dead code en dode settings (UniversalAIExploration, legacy trend-prompts, `DELIVERABLE_TYPE_SETTINGS` zonder importers, dode exploration-conversational-prompts) plus twee uit Fase 4 gedeferde locale-restjes.

# Voorstel

Zes file-disjuncte clusters: (M1) exploration-éénwording — config.reportPrompt echt consumeren, dead prompts weg, sync-script niet-destructief, BV-WIRE-conflict uit de seed; (M2) `isTempDeprecatedModel`-helper centraal + photo-brief en strategic-implications door `anthropicClient` (incl. brand-context voor implications); (M3) fal-paden — negative-fold voor trained-LoRA, guidance_scale-default + LoRA-scale-reset, media-routes door de centrale fal-client; (M4) meetlat — golden-sets-gate echt laten falen + hero-pad coherence-judge + registry-dekking; (M5) dead-code/settings-sanering; (M6) locale-restjes (brand-voice-directive delegatie, binaire nl/en-keuzes). Daarna 2-reviewer pass + gates.

# Acceptatiecriteria

- [x] Exploration-rapport gebruikt `config.reportPrompt` (admin-edits hebben echt effect); fallback = resolver-default; de hardcoded Engels-prompt en de dode conversational prompts (generateNextQuestion/generateFeedback/buildExplorationSystemPrompt) zijn weg; rapport blijft in workspace-taal (F4-gedrag behouden)
- [x] `scripts/seed-exploration-configs.ts` overschrijft bestaande configs niet meer wholesale (upsert met skip-bij-bestaand of expliciete --force vlag)
- [x] Geseedde brand-personality-config exploreert geen BV-WIRE-gedeprecate'de voice-velden meer (seed.ts; bestaande DB-rows gerapporteerd, niet gemuteerd)
- [x] `isTempDeprecatedModel(model)` bestaat als centrale export en alle inline temperature-guard-regexes gebruiken hem
- [x] photo-brief en strategic-implications lopen via `anthropicClient` (retry/tracking/guards); strategic-implications krijgt brand-context (geen beige consultant-output meer) en behoudt de F4-locale
- [x] Trained-LoRA: negatives bereiken het model effectief (fold-in-positive of werkend mechanisme) — geen stille no-op; consistent-models generate: guidance_scale-default endpoint-conform en user-instelling reset de LoRA-scale niet meer
- [x] media ai-videos/ai-images-optimize routes gebruiken de centrale fal-client prompt-cap + negative-defaults (geen directe `fal.subscribe` meer die guards omzeilt)
- [x] Golden-sets CI-gate faalt echt bij promptfoo-failure of score < threshold; copy-image-coherence-judge vindt sibling-tekst op het hero-pad
- [x] Dead code weg: UniversalAIExploration (+ ongebruikte import), legacy trend-prompts (trend-analysis.ts:366-507), `buildPersonaPanelPrompt`, `DELIVERABLE_TYPE_SETTINGS`-file (na importer-verificatie)
- [x] brand-voice-directive delegeert taalnamen aan locale-instruction; auto-iterate-integration + canvas-orchestrator binaire nl/en-keuzes vervangen door echte taal-resolutie
- [x] `npx tsc --noEmit` 0 errors · eslint 0 errors op gewijzigde files · `smoke:prompt-contracts` 235/235 · smoke:locale + relevante suites groen

# Bestanden die ik aanraak (file-ownership per cluster)

- **M1**: `src/lib/ai/exploration/exploration-llm.ts`, `src/lib/ai/exploration/config-resolver.ts`, exploration-builders (grep `generateReport`-callers), `scripts/seed-exploration-configs.ts`, `prisma/seed.ts` (ALLEEN de exploration-config-sectie)
- **M2**: `src/lib/ai/anthropic-client.ts`, `src/lib/ai/exploration/ai-caller.ts` (alleen guard-regel), `src/app/api/studio/[deliverableId]/photo-brief/route.ts`, `src/app/api/personas/[id]/strategic-implications/route.ts`
- **M3**: `src/app/api/studio/[deliverableId]/generate-visual-trained/route.ts`, `src/app/api/consistent-models/[id]/generate/route.ts`, `src/app/api/media/ai-videos/generate/route.ts`, `src/app/api/media/ai-images/optimize/route.ts`, `src/lib/integrations/fal/fal-client.ts` (alleen indien export nodig)
- **M4**: `.github/workflows/golden-sets.yml`, `src/lib/brand-fidelity/visual-fidelity-scorer.ts`, `src/lib/ai/prompt-version-registry.ts`
- **M5**: `src/components/strategy-tools/UniversalAIExploration.tsx` (verwijderen) + importer, `src/lib/ai/prompts/trend-analysis.ts`, `src/lib/ai/prompts/campaign-strategy-agents.ts` (alleen dode builder), deliverable-type-settings-file (verwijderen na verificatie)
- **M6**: `src/lib/studio/brand-voice-directive.ts`, `src/lib/ai/auto-iterate-integration.ts`, `src/lib/ai/canvas-orchestrator.ts` (alleen regel ~1863-familie), `src/lib/ai/locale-instruction.ts` (alleen indien export nodig)

# Bestanden die ik NIET aanraak

- `src/lib/ai/dam-auto-tagger.ts` — parallelle sessie werkt hieraan in de hoofdtree; raw-SDK-centralisatie daarvan = apart ticket na hun merge
- Live DB-rows (exploration-configs e.d.) — alleen seed/scripts; bestaande rows rapporteren
- Alle overige ongecommitte Fase 2-4-files

# Smoke test plan

1. `npx tsc --noEmit` + eslint op gewijzigde files
2. `smoke:prompt-contracts` 235/235 + `smoke:locale` 32/32
3. Gericht: exploration-rapport-pad met config.reportPrompt-fixture (tsx); isTempDeprecatedModel unit-cases; golden-sets.yml dry-check (yaml-lint + logica-review)
4. 2-subagent review-pass over de Fase 5-diff

# Risico's

- **Exploration-rapport van hardcoded → config**: de geseedde reportPrompts beloven framework-specifieke JSON-shapes die de parser (parseReportJSON) niet allemaal kent — de consumptie moet het bestaande parser-contract afdwingen (template levert de inhoud, het JSON-shape-contract blijft code-zijdig) of de parser moet toleranter; expliciete ontwerpkeuze vereist.
- **fal-routes door centrale client**: provider-specifieke input-mapping (Fase 0 C14-fix) mag niet breken.
- **File-deletes** (UniversalAIExploration, settings): importer-verificatie vóór delete; tsc is de vangrail.

# Out of scope

- dam-auto-tagger centralisatie (parallelle sessie)
- Prompt Registry volledige dekking van álle prompt-families (alleen de families die deze audit raakte; volledige dekking = eigen task)
- Prompt-caching/cache_control (critic C12-observatie)

# Notes

- Bron: `docs/audits/2026-06-11-prompt-audit.md` §3 C12 + §4 T6/T7/T8 + §5 Fase 5; gap-cluster-bevindingen (exploration-seed-drift, fal-image-paths, eval-baseline-locale) voor file:line.
- Fase 0+1 = commit `1039f0e2`; Fase 2-4 + tickets staan ongecommit in deze worktree.

## Uitvoering 2026-06-11

- **Gebouwd via 6 parallelle clusters (M1-M6) + 2-reviewer pass + 11 review-fixes door orchestrator** (4 unieke MAJORs: laatste inline temp-guard-regex, trained-LoRA-no-op op het media/training-pad, sync-script nog voice-laden, resolveReportModel-whitelist te smal — alle verwerkt).
- **M1**: config.reportPrompt wordt echt geconsumeerd (template = instructie, JSON-shape = code-zijdig, gedocumenteerd contract; live fixture-test 5/5 met sentinel-bewijs). Dead conversational prompts weg. Sync-script niet-destructief (default skip + --force). BV-WIRE voice-velden uit seed.ts ÉN sync-script. Resterende bronnen: DB-config + resolver-fallback (2, was 5). resolveReportModel honoreert nu ook de admin-UI-modellen (anthropic/google; openai → zichtbare warn, callLLM heeft geen openai-pad). Knowledge-dedup per variabele.
- **M2**: `isTempDeprecatedModel` centraal (alle 3 regex-duplicaten geconsolideerd, incl. de door review gevonden derde in exploration-llm); photo-brief + strategic-implications door `anthropicClient`/`createClaudeStructuredCompletion` met brand-context, locale, timeoutForTokens en learning-loop-tracking.
- **M3**: `foldNegativeIntoPrompt` geëxtraheerd en toegepast op ALLE LoRA-paden (generate-visual-trained, consistent-models/generate, media ai-images route + 3 training-pipeline-sites — laatste drie via review-vangst); guidance_scale endpoint-conform (param weggelaten = echte endpoint-default) + LoRA-scale-reset-bug gefixt; beide media-routes door truncatePromptForModel + negative-defaults (alleen op providers die het veld echt hebben).
- **M4**: golden-sets-gate faalt nu echt (aparte threshold-step ná de deterministische smokes: missing results/0 cases/<70% pass-rate → ::error:: + exit 1); copy-image-coherence hero-pad query gefixt (bewezen notIn-patroon); registry +3 categorieën (exploration/fidelity-judge/strategic-implications) — alle drie nu ook echt gewired in tracking (review-vangst: 2 routes misten de promptVersion).
- **M5**: −3.157 regels dead code: UniversalAIExploration (nep-AI), legacy trend-prompts, buildPersonaPanelPrompt, DELIVERABLE_TYPE_SETTINGS-file — alle zero-reference-geverifieerd; stale trend-analyzer-comment bijgewerkt.
- **M6**: `resolveLocaleLabel` geëxporteerd; brand-voice-directive delegeert (byte-identiek voor de 7 talen); binaire nl/en-keuzes in auto-iterate-integration + canvas-orchestrator vervangen door echte taal-resolutie.
- **Gates**: tsc 0 · eslint 0 errors · prompt-contracts 235/235 · smoke:locale 32/32 · web-page-builder 35+68 · studio 19×[OK] · delete-verificatie 0 restverwijzingen.
- **Open/gerapporteerd (geen blockers)**: (1) 3 bestaande workspaces (Demo/Napking/Linfi) hebben nog de oude voice-ladende brand-personality DB-config — handmatige admin-edit of `--force` (overschrijft dan ook admin-edits); (2) complete-route berekent een knowledgeContext die builders nu zelf resolven — signature-refactor via item-type-registry is een kleine follow-up; (3) dam-auto-tagger raw-SDK bewust gelaten (parallelle sessie); (4) eerste sub-70% live-LLM-run na merge zal de nieuwe CI-gate rood kleuren — dat is het ontwerp.
