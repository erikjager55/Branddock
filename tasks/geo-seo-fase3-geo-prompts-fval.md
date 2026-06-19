---
id: geo-seo-fase3-geo-prompts-fval
title: GEO/SEO Fase 3 — GEO-prompt-pijplijn + composable seo-geo + F-VAL-pijler + meet-haak
fase: pre-launch
priority: next
effort: 2,5-3,5 weken (L-XL)
owner: claude-code
status: open
created: 2026-06-17
completed: -
related-adr: docs/adr/2026-06-17-seo-pipeline-composable-stage.md
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: branddock-feat-geo-seo
---

# Probleem

Na Fase 2 bestaat de GEO-structuur (blokken/schema/publish) maar is de content nog niet inhoudelijk citeerbaar, is er geen meetbare kwaliteit, en is het gecombineerde seo-geo-profiel onmogelijk: de SEO-pipeline is een early-return (`canvas-orchestrator.ts:358-372: yield* runSeoPipeline(...); return;`) die alle latere generatie kortsluit, dus "eerst SEO dan GEO-polish" kan niet zonder refactor.

# Voorstel

Voeg GEO-prompt-directives + een lichte polish-stap toe, vorm de SEO-early-return om tot een composable stage (zodat seo-geo echt werkt), voeg een compute-gated/judge-vrije F-VAL GEO-pijler toe, en land een minimale meet-haak + recurrente freshness.

# Acceptatiecriteria

- [ ] `buildGeoDirective()` (answer-first / atomic-chunking 2-4 zinnen / cited-stats / entity-clarity / freshness + anti-patterns) geïnjecteerd in long-form system-prompt; PROMPT_VERSION bumped
- [ ] `runGeoPolish()` lichte single-call retrofit (geen judge), gegate op GEO-doel
- [ ] SEO-early-return → composable stage: `runSeoPipeline` geeft finalContent terug i.p.v. te returnen; daarna GEO-polish met trade-off-regel (answer-first wint van keyword-first); ADR
- [ ] F-VAL GEO-pijler: `computeGeoScore()` deterministisch + compute-gated (draait NIET bij geen GEO-doel of pijler-uit, niet alleen weight 0); judge-vrij; inhaakt in `normalizeWeights`
- [ ] `page-json-ld.ts`: `buildBlogPostingJsonLd` (articleBody/dates/keywords/publisher; author Person+sameAs alléén bij verifieerbare identiteit), DefinedTerm, QAPage-optie, ImageObject, inLanguage, about/mentions
- [ ] Recurrent freshness: republish → `dateModified=now` (≠ datePublished) + 90-dagen-staleness-flag
- [ ] `settings.geoOptimizationAnalysis` meet-haak (GEO-score + findings + geëmitte schema-types + canonical URL)
- [ ] Smoke: GEO-pijler 0 extra LLM-calls bij geen GEO-doel; baseline thresholds/judge-kosten onveranderd
- [ ] `npx tsc --noEmit` 0 · lint 0 · smokes groen

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
