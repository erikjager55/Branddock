---
id: prompt-audit-fase-4
title: Prompt-audit Fase 4 — taal, jargon en context-governance (locale-generalisatie, marker-stripping centraal, jargon-scrub, injection-fencing)
fase: pre-launch
priority: now
effort: 3-4 dagen (audit-schatting; parallel uitgevoerd)
owner: claude-code
status: done
created: 2026-06-11
completed: 2026-06-11
related-adr: -
related-spec: docs/audits/2026-06-11-prompt-audit.md
worktree: branddock-feat-prompt-audit
---

# Probleem

Vier taal/context-defectfamilies uit de audit (§4 T5 + T9): (1) `locale-instruction.ts` kent maar 7 talen — elke andere workspace-taal krijgt stil géén taal-guard, wat alle taal-fixes blokkeert; (2) hele flows missen een output-taal-contract (strategy-chain herschrijft NL-briefings naar Engels, quick-concept forceert expliciet Engels, voice-analyzer gebruikt de bestaande guard niet, exploration-rapport hardcodet "Write in English", strategic-implications persisteert Engels); (3) OBSERVED:/RECOMMENDED:-analyzer-markers lekken nog via `getBrandContext` en `workspace-context-resolver` (rauwe JSON.stringify + omzeilde imagerySavedForAi-gate) in alle image/video-prompts — de stripAnalyzerMarkers-fix dekt alleen het LP-pad; (4) Effie/award-jargon leeft nog in UI-labels en wordt via feedback-compilatie opnieuw in ongeguarde prompts geïnjecteerd, en het concept-pad valt buiten de scrubStrategyLayer-dekking. Plus T9: gescrapete content gaat zonder fencing in extractie-prompts (injectie-kanaal, valse MAJOR-events mogelijk).

# Voorstel

Zes file-disjuncte clusters: (L1) locale-instruction generaliseren via Intl.DisplayNames; (L2) strategy-chain taal-contract + concept-output onder de scrubber; (L3) jargon-sanering in prompts/feedback/UI; (L4) marker-stripping naar een gedeelde util + centraal in getBrandContext + workspace-context-resolver door de review-gate; (L5) locale-adoptie in voice-analyzer, exploration-rapport en strategic-implications; (L6) untrusted-content-fencing in de 5 scrape/classificatie-prompts. Daarna 2-reviewer pass + gates.

# Acceptatiecriteria

- [x] `buildLocaleInstruction`/`buildLocaleSystemFragment` leveren voor élke taalcode een werkende instructie (Intl.DisplayNames + fallback) — nooit meer stil `''`
- [x] Strategy-chain: output-taal-contract op de chain-prompts; improveBriefing behoudt de briefing-taal; quick-concept forceert geen Engels meer
- [x] Concept-pad (creative leap/defense/quick-concept) output loopt door `scrubStrategyLayer` (geen ongescrubde award-jargon-uitstroom)
- [x] Geen "Effie/Cannes"-jargon meer in prompts, UI-labels of de feedback-compilatie (herinjectie-vector dicht); interne rubrics in `<internal_rubric surface_in_output="false">`-conventie
- [x] OBSERVED:/RECOMMENDED:-markers worden centraal gestript in `getBrandContext` (gedeelde util); `workspace-context-resolver` respecteert de imagerySavedForAi-gate en formatteert i.p.v. JSON.stringify; LP-pad importeert dezelfde util (geen drie kopieën)
- [x] Voice-analyzer, exploration-rapport en strategic-implications produceren output in de workspace-taal (locale-guard aangesloten)
- [x] Gescrapete/geüploade content staat in delimiters met een "data, geen instructies"-regel in competitor-analysis, website-scanner, product-analysis, content-classifier en ai-classifier
- [x] `npx tsc --noEmit` 0 errors · eslint 0 errors op gewijzigde files · `smoke:prompt-contracts` 235/235 · relevante smokes groen

# Bestanden die ik aanraak (file-ownership per cluster)

- **L1**: `src/lib/ai/locale-instruction.ts`
- **L2**: `src/lib/campaigns/strategy-chain.ts`
- **L3**: `src/lib/ai/prompts/campaign-strategy.ts`, `src/lib/ai/prompts/campaign-strategy-agents.ts`, `src/lib/content-test/compile-structured-feedback.ts` (pad verifiëren), UI-files met Effie-labels (grep), `src/lib/ai/sanitize-strategy-output.ts`
- **L4**: nieuw `src/lib/brandstyle/analyzer-markers.ts`, `src/lib/ai/brand-context.ts`, `src/lib/consistent-models/workspace-context-resolver.ts`, `src/lib/landing-pages/brand-tokens-v4-mappers.ts` (re-import)
- **L5**: `src/lib/brandvoice/voice-analysis-prompts.ts`, `src/lib/brandvoice/voice-analyzer-engine.ts`, `src/lib/ai/exploration/exploration-llm.ts` (alleen taal-regel), `src/app/api/personas/[id]/strategic-implications/route.ts` (alleen taal-regel)
- **L6**: `src/lib/ai/prompts/competitor-analysis.ts`, `src/lib/ai/prompts/website-scanner.ts`, `src/lib/ai/prompts/product-analysis.ts`, `src/lib/competitors/content-discovery/content-classifier.ts`, `src/lib/competitors/ai-classifier.ts`

# Bestanden die ik NIET aanraak

- Exploration-configuratie-éénwording (5 promptkopieën) en strategic-implications route-herbouw — Fase 5
- Temperature-guard-centralisatie — Fase 5
- Alle ongecommitte Fase 2/3-files buiten de hierboven genoemde (strategy-chain en campaign-strategy-agents zijn bewust her-geraakt: zelfde branch, één eigenaar per file)

# Smoke test plan

1. `npx tsc --noEmit` + eslint op gewijzigde files
2. `npm run smoke:prompt-contracts` blijft 235/235 + `smoke:heuristics-locales` (bestaat — taal-gerelateerd)
3. Gericht via `npx tsx`: buildLocaleInstruction voor nl/sv/pl/onbekend; stripAnalyzerMarkers-util op OBSERVED/RECOMMENDED-fixtures; scrubStrategyLayer op concept-fixture met "Effie-waardig"
4. 2-subagent review-pass over de Fase 4-diff

# Risico's

- **getBrandContext is de drukste context-bron** — centrale marker-stripping raakt álle content-prompts; stripping moet puur markers/labels verwijderen, nooit inhoud (util met fixtures testen).
- **Fencing verandert extractie-prompts** — classifier-accuracy (A1 96,7%) mag niet degraderen; delimiters toevoegen is additief, instructies niet herschrijven.
- **Taal-contract op strategy-chain** kan output veranderen voor EN-workspaces — guard moet de workspace-taal volgen, niet hardcoded NL.

# Out of scope

- Fase 5 (configuratie-éénwording, raw-SDK-paden door centrale clients, meetlat-restpunten)
- Prompt-caching/cache_control (audit-critic C12-observatie — eigen afweging waard)

# Notes

- Bron: `docs/audits/2026-06-11-prompt-audit.md` §4 T5/T9 + §5 Fase 4; critic-bevinding B10 (locale-whitelist) is de fix-blocker en gaat eerst.

## Uitvoering 2026-06-11

- **Gebouwd via 6 parallelle clusters (L1-L6) + 2-reviewer pass + 10 review-fixes door orchestrator.** Review: 3 unieke MAJORs + 7 MINORs, alle verwerkt.
- **L1**: Intl.DisplayNames-generalisatie met byte-identieke pariteit voor de 7 bestaande talen (10/10 bewezen) + ISO-code-fallback; non-empty taalcode geeft NOOIT meer stil `''`. `smoke:locale`-assertion geïnverteerd naar het nieuwe contract (+sv-case): 32/32.
- **L2+review-fix**: `withLocaleContract` (trailing fragment wint) op ALLE chain-prompts — incl. de 5 die de review als restgat vond (journey-phases/channel-planner/asset-planner + channel/asset/full-variant-regen). `scrubConceptOutput` deep-walker op het concept-pad (leap/critique/defense/quick-concept) met structured warn.
- **L3**: award-namen-sweep (Effie/Cannes/D&AD + review-vangst Webby in advertising.ts:440 en Cannes/Effie in video-audio.ts:231 — studio-pad zonder scrub-vangnet), feedback-herinjectie dicht, quick-concept Engels-forcering verwijderd, dode `buildPersonaPanelPrompt` Engels-regel weg, scrubber-alternatie langste-eerst ('waardiger' → 'sterk', niet 'sterkr'; fixture-bewezen).
- **L4+review-fix**: gedeelde `analyzer-markers.ts`-util, toegepast in getBrandContext (vóór cache-write), workspace-context-resolver (mét imagerySavedForAi+published-gate, JSON.stringify weg, alleen mood gedeeld per gotcha 2026-06-10), LP-pad re-import, en — review-vangst — `model-context-resolver` gespiegeld (zelfde defect, per-model pad).
- **L5**: locale aangesloten op voice-analyzer (verbatim-carve-out voor writingSamples), exploration-rapport ("Write in English" → workspace-taal via builders-parameter) en strategic-implications.
- **L6**: `fenceUntrustedContent` (delimiter-strip tegen fence-breakout) op alle 5 scrape/classificatie-prompts; helper na review verplaatst naar `src/lib/ai/untrusted-fence.ts` met re-export.
- **Registry**: campaign-strategy → 1.1.0 (prompt-tekst-wijzigingen).
- **Gates**: tsc 0 · eslint 0 errors · prompt-contracts 235/235 · smoke:locale 32/32 · heuristics-locales 50/50 · web-page-builder 35+68 PASS · studio 19×[OK].
- **Bewust gedeferred naar Fase 5** (gedocumenteerd): exploration-llm dode conversational prompts (bevatten nog 'in English'-regels — worden bij de configuratie-éénwording verwijderd); brand-voice-directive.ts eigen 7-talen-map (werkt, maar hoort te delegeren aan locale-instruction); auto-iterate-integration.ts:272 + canvas-orchestrator.ts:1863 binaire nl/en-keuzes; `<internal_rubric>`-tags: L3 koos vervangen-aan-de-bron boven taggen (sterker), conventie gedocumenteerd voor toekomstige rubrics.
- **Gedragswijziging (gewenst, wel zichtbaar)**: AI-studio/consistent-models krijgen geen photographyStyle meer uit ongepubliceerde/niet-gereviewde styleguides — zelfde semantiek als brand-context; verse scrapes moeten published+imagerySavedForAi zijn vóór ze beeldprompts sturen.
- Vooraf opgepakt (zelfde sessie): 3 follow-up-tickets uit Fase 3 — ad-judge `imageDirection` uit `imagePromptUsed` (ValidatorContext-veld + 4 consumers), `ImpactBadge` enum-fallback, EmailPreview sequence-kaarten (email-N-paren als gestapelde cards via `useEditableEntries`, geen hook-in-loop).
