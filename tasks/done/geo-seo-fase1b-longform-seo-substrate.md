---
id: geo-seo-fase1b-longform-seo-substrate
title: GEO/SEO Fase 1b — SeoChecklist-velden + long-form SEO-eligibility
fase: pre-launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-06-17
completed: 2026-06-24
related-adr: docs/adr/2026-06-17-seo-pipeline-composable-stage.md
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: branddock-feat-geo-seo
---

# Probleem

Long-form-types (`blog-post`, `pillar-page`, `whitepaper`, `case-study`, `ebook`, `linkedin-article`, `thought-leadership`) staan NIET in `WEBSITE_DELIVERABLE_TYPES` (`seo-pipeline.types.ts:170`), dus `runSeoPipeline` draait er nooit voor → ze hebben geen `seoChecklist` en dus geen metadata-substrate voor Fase 1a. Bovendien mist `SeoChecklist` author/datePublished/dateModified — nodig voor BlogPosting-JSON-LD + E-E-A-T in Fase 3.

# Voorstel

Maak long-form SEO-eligible via een aparte set `LONG_FORM_SEO_TYPES` (laat `WEBSITE_DELIVERABLE_TYPES` ongewijzigd) + een opt-in `optimizationGoals`-checkbox (SEO default-aan, uitvinkbaar). **Beslissing 2026-06-17 (Q1): SEO default-aan voor long-form = de volledige 8-staps SEO-pipeline genereert de content** (i.p.v. de normale generator). De gedeelde regel zit in `shouldRunSeoPipeline`. Author/E-E-A-T verschuift naar Fase 3 (**Q2: bron = nieuw workspace author-profiel**); dates komen uit system-metadata (LandingPage.publishedAt/updatedAt) bij render, niet uit de AI-checklist.

# Acceptatiecriteria

- [x] `LONG_FORM_SEO_TYPES` set + PAGE_GOAL_MAP-entries (7 long-form types) in `seo-pipeline.types.ts`
- [x] `"checkbox-group"`-veldtype + `defaultValue`-property + renderer-case (`ContentTypeInputFields.tsx`)
- [x] `optimizationGoals`-veld (SEO opt-in, default `["seo"]`) geïnjecteerd voor long-form via `getContentTypeInputs` (één plek, alle 7)
- [x] `resolveOptimizationGoals` (default-fallback, expliciet `[]` = opt-out) + `shouldRunSeoPipeline` (gedeeld door orchestrator + smoke)
- [x] Orchestrator-gate gebruikt `shouldRunSeoPipeline`: website-types ongewijzigd; long-form draait de SEO-pipeline bij SEO-doel + keyword. `seoInput` wordt al auto-geseed uit `seoKeyword` (useCanvasOrchestration:93)
- [x] `npx tsc --noEmit` 0 · eslint 0 errors · smoke `geo-optimization-goals` 17/17 · page-types 176/176 (geen regressie)
- [ ] **E2E live-AI verificatie** (vereist `ANTHROPIC_API_KEY` + DB-data; kan niet in deze worktree): blog-post met SEO-doel → SEO-pipeline draait → `settings.seoChecklist` gepersisteerd → Fase 1a-metadata werkt voor long-form
- [~] SeoChecklist `author`/dates → **verplaatst naar Fase 3** (author-profiel Q2; dates system-sourced). GEEN deel meer van Fase 1b.

# Bestanden die ik aanraak

- `src/lib/ai/seo-pipeline.types.ts` — SeoChecklist-velden + LONG_FORM_SEO_TYPES + PAGE_GOAL_MAP-entries
- `src/lib/ai/prompts/seo-prompts.ts` — step-8 author/dates
- `src/lib/ai/canvas-orchestrator.ts` — SEO-gate uitbreiding (kleine, voorbereidende wijziging; de early-return→composable-stage-refactor zelf zit in Fase 3)

# Bestanden die ik NIET aanraak

- De Puck-render-/publish-keten — dat is Fase 2

# Smoke test plan

1. Genereer een blog-post met SEO-doel → controleer dat `settings.seoChecklist` wordt geschreven (psql/inspect)
2. Genereer een landing-page → SEO-gedrag identiek aan vóór (regressie-check)

# Risico's

- Bestaande gepubliceerde long-form heeft geen seoChecklist tot regeneratie → UI-copy moet dit communiceren (niet als bug ervaren). Geen migratie.

# Out of scope

- De composable SEO-stage (alleen nodig voor seo-geo-combinatie) → Fase 3
- GEO-directives → Fase 3

# Notes

- Levert pas zichtbare long-form-metadata NA Fase 2 (publish-keten). Fase 1b is het substraat, niet het eindresultaat.
- **Afgesloten 2026-06-24**: code-niveau af + smoke-gedekt. Live-AI E2E-verificatie opgetild naar opvolg-task `geo-seo-followup-live-ai-e2e`.
