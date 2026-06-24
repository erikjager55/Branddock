---
id: geo-seo-fase3-geo-prompts-fval
title: GEO/SEO Fase 3 — GEO-prompt-pijplijn + composable seo-geo + F-VAL-pijler + meet-haak
fase: pre-launch
priority: next
effort: 2,5-3,5 weken (L-XL)
owner: claude-code
status: done
created: 2026-06-17
completed: 2026-06-24
worktree-real: branddock-feat-geo-fase2 (branch feat/geo-seo-fase3)
related-adr: docs/adr/2026-06-17-seo-pipeline-composable-stage.md
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: branddock-feat-geo-seo
---

# Probleem

Na Fase 2 bestaat de GEO-structuur (blokken/schema/publish) maar is de content nog niet inhoudelijk citeerbaar, is er geen meetbare kwaliteit, en is het gecombineerde seo-geo-profiel onmogelijk: de SEO-pipeline is een early-return (`canvas-orchestrator.ts:358-372: yield* runSeoPipeline(...); return;`) die alle latere generatie kortsluit, dus "eerst SEO dan GEO-polish" kan niet zonder refactor.

# Voorstel

Voeg GEO-prompt-directives + een lichte polish-stap toe, vorm de SEO-early-return om tot een composable stage (zodat seo-geo echt werkt), voeg een compute-gated/judge-vrije F-VAL GEO-pijler toe, en land een minimale meet-haak + recurrente freshness.

# Acceptatiecriteria

**GEBOUWD 2026-06-19 (branch feat/geo-seo-fase3, 5 increments):**
- [x] `buildGeoDirective()` (answer-first / atomic-chunking / cited-stats / entity-clarity / freshness + anti-patterns) als herbruikbare module `src/lib/ai/prompts/geo-directives.ts`, ingebed in de long-form GEO-prompt; `LP_VARIANT_PROMPT_VERSION` 2.0.0→2.1.0. Smoke `geo-directives` 13/13.
- [x] `runGeoPolish()` lichte single-call retrofit (geen judge, fail-soft) in `src/lib/ai/geo-polish.ts`, gegate via `shouldApplyGeoPolish` (seo-geo + long-form-only). Smoke `geo-polish` 12/12.
- [x] SEO-early-return → composable stage: `runSeoPipeline` kreeg optionele `optimizationGoals`-param en past de GEO-polish INTERN toe vóór persist (verfijning op de ADR — lager blast-radius dan return-naar-orchestrator; zie ADR-promotie). Open vraag #2 = long-form-only. Orchestrator geeft `resolveOptimizationGoals(...)` door.
- [x] F-VAL GEO-pijler: `computeGeoScore()` (`src/lib/brand-fidelity/geo-fidelity-scorer.ts`) deterministisch + judge-vrij + **compute-gated** (`geoOptimizationActive`; draait niet bij afwezig); `normalizeWeights` naar 4 pijlers met byte-identiek 3-pijler-gedrag wanneer uit. Smoke `geo-fidelity` 16/16.
- [x] `page-json-ld.ts`: entity-laag — author Person+sameAs (alléén bij verifieerbare identiteit), ImageObject, keywords/about/mentions uit definities, inLanguage. DefinedTermSet was er al. **QAPage bewust NIET** (UGC-semantiek; FAQPage is correct voor redactionele Q&A). Smoke `geo-blogposting-jsonld` 25/25.
- [x] Author-bron: `Workspace.authorProfile` Json (additieve db push, geen migratiefile) + `resolveAuthorProfile` + `/api/settings/author-profile` GET/PATCH + developer-only `AuthorProfileTab`. Smoke `geo-author-profile` 16/16.
- [x] Recurrent freshness: `dateModified` (LandingPage.updatedAt, @updatedAt) ≠ `datePublished` (publishedAt, eenmalig) — al gewired; `isContentStale(dateModified, now, 90)` helper voor de 90-dagen-flag (read/cron-tijd).
- [x] `settings.geoOptimizationAnalysis` meet-haak (`buildGeoOptimizationAnalysis`: geoScore + signalen + findings + geëmitte schema-types + canonical), fail-soft + race-bewust gepersisteerd bij landing-pages/publish. Smoke `geo-analysis` 11/11.
- [x] Claw-edit-tool gate (deferred uit Fase 2): 4 sites (read/write-tools + context-assembler + ClawPageContext) van `isPuckWebpageType` → `isPuckRenderable` + client-wiring (CanvasPage/InputBar/useClawStore). Smoke `geo-claw-gate` 12/12.
- [x] Smoke: GEO-pijler 0 extra LLM-calls bij geen GEO-doel (judge-vrij + compute-gated); F-VAL-baseline onveranderd (phase6.2-fval 14/14, phase67 15/15).
- [x] `npx tsc --noEmit` 0 · eslint 0 errors · alle GEO-smokes (226) + brede regressie (prompt-contracts 235, page-types, web-page-builder, page-seo 30, knowledge-context 8) groen. Stale Fase-2-smoke (16→18 Puck-componenten) gecorrigeerd.

**Deferred (niet in deze ronde):** live-AI E2E van GEO-generatie + polish (geen key in worktree, user lokaal/deploy); externe entity-reinforcement; GEO-dashboard-UI (alleen de data-haak gebouwd). **Productie-deploy vereist `prisma db push` (authorProfile-kolom).**

# Bewust geaccepteerde review-bevindingen (gedocumenteerd, niet gefixt)

- **Meet-haak race**: de geoOptimizationAnalysis-persist is een non-transactionele read-modify-write op `Deliverable.settings`; het verse-read narrow't de autosave-clobber-race maar elimineert 'm niet. Acceptabel: de analyse is niet-kritiek + wordt elke publish herberekend. (pre-launch; transactie = follow-up)
- **structuredVariant vs puckData**: de meet-haak scoort `settings.structuredVariant` (canonieke contentbron); na een latere Puck-builder/Claw-edit van `puckData` kan de geoScore de pre-edit-content beschrijven. Acceptabel voor Fase 3; puckData-scoring = follow-up.
- **Twee GEO-oppervlakken**: de composable GEO-polish verbetert de content-item BODY-varianten (SEO-pipeline-output); de gepubliceerde Puck-pagina komt uit de structured-variant-flow (geoArticle, met de GEO-generatie-directive). Beide krijgen GEO-behandeling via verschillende mechanismen — bewust.
- **F-VAL GEO-pijler = opt-in**: volledig gewired (compute-gating + serializers) maar geen productie-caller zet `geoOptimizationActive` (om de brand-fidelity-composite/threshold-semantiek niet stil te wijzigen). De live GEO-meting loopt via de `geoOptimizationAnalysis`-haak. Activatie in de runner = bewuste follow-up.
- **`isContentStale` + `measuredAt` nog niet geconsumeerd**: forward-looking data-haak (90-dagen-staleness); de consument is de GEO-dashboard/cron (out-of-scope deze ronde).

# Bestanden die ik aanraak

- `src/lib/studio/prompt-templates/long-form.ts` + nieuw `src/lib/ai/prompts/geo-directives.ts`
- `src/lib/ai/canvas-orchestrator.ts` (composable SEO-stage + GEO-gate)
- `src/lib/ai/geo-polish.ts` (nieuw)
- `src/lib/brand-fidelity/composition-engine.ts` + nieuw `geo-fidelity-scorer.ts`
- `src/lib/landing-pages/page-json-ld.ts` (entity-laag + freshness)
- meet-haak op `Deliverable.settings.geoOptimizationAnalysis`
- nieuwe smoke-suites

# Bestanden die ik NIET aanraak

- De website-page-type-SEO-pijplijn-semantiek (blast-radius beperken; zie open vraag #2)

# Smoke test plan

1. blog-post met SEO+GEO → SEO-pipeline draait + GEO-polish erna (composable), output bevat answer-first + TL;DR + [SOURCE]-markers
2. blog-post zonder GEO → 0 GEO-LLM-calls, GEO-score niet berekend (compute-gating)
3. F-VAL composite-thresholds identiek wanneer GEO-pijler uit

# Risico's

- SEO-early-return-refactor raakt het productie-kritieke website-SEO-pad → strakke regressie-smoke; kill-switch via doel-check. Open vraag #2: alléén long-form composabel maken of ook page-types?
- variant_index-bloat (GEO-polish + STRICT + plan-and-solve >2 variants) → cap op 4 / pruning. Open vraag #7.

# Out of scope

- Live AI-crawler-citation-meting + GEO-dashboard (alleen de data-haak)
- Externe entity-reinforcement (Wikidata/G2/Reddit)

# Notes

- Hard afhankelijk van Fase 2 (structuredVariant + publish-keten + optimizationGoals).
- **Beslissing Q2 (2026-06-17): E-E-A-T author-bron = nieuw workspace author-profiel** (naam + functie + sameAs-URLs zoals LinkedIn), niet OrganizationMember (vaak geen publieke sameAs + privacy). Voorkeur: additief opslaan als `Workspace.settings.authorProfile` (Json, geen migratie) i.p.v. een nieuw Prisma-model. `Person`+`sameAs` alleen emitten bij een ingevuld profiel, anders weglaten.
- **Refinement (Fase 1b → 3)**: `datePublished`/`dateModified` komen uit system-metadata (`LandingPage.publishedAt`/`updatedAt`) bij render, NIET uit de AI-`SeoChecklist`. `SeoChecklist.author` is daarmee de enige author-toevoeging en hoort bij Fase 3, niet 1b.
- **Afgesloten 2026-06-24**: gebouwd + adversarieel gereviewd. Deferred + bewust-geaccepteerde bevindingen opgetild: meet-haak zichtbaar maken / F-VAL-pijler activeren / puckData-scoring / settings-transactie → `geo-seo-followup-measurement-dashboard`; live-AI E2E → `geo-seo-followup-live-ai-e2e`; externe entity-reinforcement / citation-meting → `geo-seo-followup-later`.
