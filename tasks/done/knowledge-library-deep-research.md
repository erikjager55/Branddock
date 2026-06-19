---
id: knowledge-library-deep-research
title: Deep Research in de Knowledge Library
fase: post-launch
priority: next
effort: 4-6 dagen
owner: claude-code
status: done
created: 2026-06-19
completed: 2026-06-19
related-adr: docs/adr/2026-06-19-deep-research-pipeline.md
related-spec: -
worktree: branddock-feat-deep-research
---

# Probleem

De Knowledge Library laat kennisitems toevoegen via Manual Entry, Smart Import en File Upload, maar er is geen manier om zelf onderzoek te laten doen op een onderwerp. De openingsknop heet bovendien verwarrend "Upload" terwijl die alle tabs opent. Gebruikers willen een onderwerp opgeven en — zoals Claude's deep research — een gecit eerd rapport krijgen dat ze als kennisitem kunnen opslaan.

# Voorstel

Hernoem de knop naar "Add Item". Voeg een vierde tab "Deep Research" toe waar je een onderwerp typt; het systeem stelt eerst 2-3 verfijningsvragen en draait dan een meerstaps onderzoeksrun met live streaming-voortgang in de modal. Het resultaat is een markdown-rapport dat getoond wordt met bewerkbare velden (titel/categorie/tags/samenvatting) en als `RESEARCH`-resource kan worden opgeslagen. Een nieuwe viewer-modal toont opgeslagen rapporten. Backend = deterministische fan-out pipeline (Trend Radar-stijl) in `src/lib/knowledge-research/`.

# Acceptatiecriteria

- [ ] Knop heet "Add Item" (icoon `Plus`), `data-testid="add-resource-button"` behouden
- [ ] Vierde tab "Deep Research" in de Add Resource-modal
- [ ] Topic → 2-3 verfijningsvragen → live voortgang → rapport + bewerkbare velden → opslaan
- [ ] Opgeslagen rapport is leesbaar via "Read report" (viewer-modal) in grid + list
- [ ] Run schrijft niet naar de DB; opslaan via bestaande create-route; modal sluiten mid-run laat geen orphan achter
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] `npm run smoke:deep-research` PASS
- [ ] ADR + task-file aangemaakt

# Bestanden die ik aanraak

Foundation (gedaan):
- `prisma/schema.prisma` (ResourceSource.DEEP_RESEARCH)
- `src/lib/knowledge-research/types.ts` (contract)
- `src/lib/knowledge-resources/categories.ts` + `src/app/api/knowledge-resources/categories/route.ts`
- `src/app/api/knowledge-resources/route.ts` (createSchema + payload)
- `src/app/api/knowledge-resources/[id]/route.ts` (detail content/aiSummary/aiKeyTakeaways)
- `src/features/knowledge-library/types/knowledge-library.types.ts`

Backend pipeline:
- `src/lib/knowledge-research/{orchestrator,clarify,prompts}.ts` + `phases/*`
- `src/app/api/knowledge-resources/deep-research/{clarify,run}/route.ts`
- `src/lib/ai/feature-models.ts` (2 keys)

Frontend:
- `src/features/knowledge-library/components/KnowledgeLibraryPage.tsx`
- `src/features/knowledge-library/components/add/AddResourceModal.tsx` + nieuwe `DeepResearchTab.tsx`
- `src/stores/useKnowledgeLibraryStore.ts`
- `src/features/knowledge-library/api/knowledge-resources.api.ts` + `hooks/{index,useDeepResearch}.ts`
- `src/features/knowledge-library/components/ResourceReportModal.tsx`
- `src/components/shared/markdownComponents.tsx`
- `src/features/knowledge-library/components/{ResourceCardGrid,ResourceCardList}.tsx`

Smoke:
- `scripts/smoke-tests/deep-research.ts` + `package.json`

# Bestanden die ik NIET aanraak

- `BriefRenderView.tsx` — laat staan; gedeelde markdown-map wordt apart geëxtraheerd
- `SmartImportTab.tsx` / `ManualEntryTab.tsx` / `FileUploadTab.tsx` — ongemoeid (alleen de TABS-array + tab-body in AddResourceModal)

# Smoke test plan

1. `npm run smoke:deep-research` → PASS (deterministische fakes, geen API-kosten).
2. Dev-server: knop heet "Add Item"; tab "Deep Research" → onderwerp → vragen → live voortgang → rapport + bewerkbare velden → opslaan → RESEARCH-kaart verschijnt → "Read report" toont rapport.
3. Modal sluiten tijdens run → stream abort, geen orphan-resource in de DB.

# Risico's

- Helper-signatures (searchWithGrounding/scrape/getBrandContext/anthropicClient) verkeerd ingeschat → tsc + review vangen dit.
- Live SSE-run kan timen out bij trage bronnen → interne deadline + partieel resultaat + heartbeat.
- Kosten van een echte run → caps (maxSearchQueries/maxSourcesToScrape) + Sonnet i.p.v. Opus + trackEvent.

# Out of scope

- Background-job-modus met polling (orchestrator is wél zo ontworpen dat dit later kan)
- Markdown → PDF/Word export
- Per-workspace token-quota enforcement
- Perplexity/Sonar of Anthropic server-side web_search-tool

# Notes

- Bouwstrategie: foundation/contract sequentieel; backend + frontend parallel via workflow; smoke na backend; daarna tsc + 2-reviewer pass + browser-smoke.

## Status 2026-06-19 — gebouwd + 2-reviewer-pass + gates groen (ongecommit)

Adversariële 2-reviewer-pass; reële bevindingen gefixt:
- **Abort/deadline**: gecombineerd signaal (client-disconnect OF deadline-timer, opgeruimd in `finally`) doorgegeven aan elke fase + geforward naar de Anthropic-calls (nieuw `abortSignal`-optie op `anthropic-client`); abort-fouten genormaliseerd; deadline 540→480s marge onder `maxDuration=600`.
- **Citatie-integriteit**: `## Sources` wordt canoniek herbouwd uit de echte `SourceRef`s (model kan geen niet-bestaande nummers injecteren).
- **Grounding-fallback**: geen identieke tekst meer over meerdere bron-indices + geen nep-`search:grounding`-URL; één synthetische "Web search summary"-bron.
- **trackEvent**: alle 4 calls `.catch(()=>{})` zodat analytics nooit de SSE-stream/heartbeat omverhaalt.
- **Provider**: `deep-research-synthesis` is `supportedProviders: ['anthropic']` (matcht de `assertProvider`-lock).
- **Frontend**: SSE-reader geeft de lock vrij (`reader.cancel`) + herstelt de UI als de stream zonder terminaal event sluit; stale clarify-antwoorden gewist tussen runs; save/clarify-callbacks guarded met `mountedRef`.

Gates op `feat/deep-research`: `npx tsc --noEmit` 0 · `npm run smoke:deep-research` 30/30 · eslint changed-files 0.

## Live pipeline-test ✅ (2026-06-19, `scripts/dev/deep-research-live.ts`)
Echte Gemini grounding + Anthropic Sonnet 4.6 run, exit 0: 15k-char gecit rapport, inline `[n]` + canonieke `## Sources`, alle bronnen `used`, geldige titel/categorie/tags/takeaways/summary, 0 warnings.

Twee echte defecten gevonden die fakes niet dekken — beide gefixt + her-geverifieerd:
1. **gemini-2.5-flash thinking-truncatie**: thinking-tokens vraten het krappe `maxOutputTokens` van plan/clarify/finalize → MAX_TOKENS → JSON onparseerbaar → fallback-heuristieken (leeg tags/takeaways). Fix: `thinkingConfig: { thinkingBudget: 0 }` + ruimer budget (gotchas.md 2026-06-19).
2. **grounding-redirect-domein capte bronnen op 2**: domein-dedup draaide op het gedeelde `vertexaisearch…`-redirect-domein → max 2 bronnen/run + lelijke/vergankelijke opgeslagen URL's. Fix: redirect-links eerst resolven naar de eind-URL (parallel, 5s-timeout, fallback), dán dedupen op echt domein. Resultaat: echte bron-URL's + 3 diverse bronnen → verify-fase nu actief (≥3 bronnen).

## Open
- **Browser-smoke** (handmatig): worktree-`node_modules` is gesymlinkt → Turbopack-dev weigert (gotcha). Draai `npm run dev` vanuit een niet-gesymlinkte checkout óf na merge; klik de flow door.
- Kleine tuning-follow-up: verify flagde 10/10 claims in de live run — checken of de verify-prompt niet over-flagt (geen output-impact, dus niet-blokkerend).
- `scripts/dev/deep-research-live.ts` = dev-diagnostic (kost API-budget) — bewust behouden voor toekomstige live-verificatie.

## Bewust NIET gefixt (minor/out-of-scope)
Dode try/catch rond Exa, brand-boilerplate bij lege context, ongebonden `brandContextFn`-await, Gemini-calls zonder expliciete `timeoutMs`, dubbele error-reset, `createSchema.type` als vrije string. Grondiger "grounding-als-context"-herontwerp = follow-up.
