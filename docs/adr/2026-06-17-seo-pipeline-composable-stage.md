---
id: 2026-06-17-seo-pipeline-composable-stage
title: SEO-pipeline early-return omvormen tot composable stage voor seo-geo
status: proposed
date: 2026-06-17
supersedes: -
superseded-by: -
---

# Context

Het gecombineerde seo-geo-profiel vereist "draai de SEO-pipeline EN polish het resultaat met GEO-directives". Geverifieerd (2026-06-17): de SEO-gate in `canvas-orchestrator.ts:358-372` is een early-return — `yield* runSeoPipeline(...); return;` — die alle latere generatie kortsluit. Daardoor is "SEO daarna GEO" architectonisch onmogelijk zonder de orchestrator te herstructureren. Dit pad is productie-kritiek: de 5 `WEBSITE_DELIVERABLE_TYPES` (landing/product/faq/comparison/microsite) draaien hier vandaag doorheen.

# Decision

Vorm `runSeoPipeline` om tot een **composable stage** die de finale content TERUGGEEFT i.p.v. te `return`-en in de orchestrator. De orchestrator beslist daarna op basis van het optimizationProfile:

- **seo-only** → gedraag als nu (SEO-resultaat is het eindresultaat).
- **seo-geo** → SEO-resultaat → `runGeoPolish()` met expliciete trade-off-regel (answer-first wint van keyword-first).
- **geo-only** → GEO-directives in de gewone generatie, geen SEO-pipeline.

Kill-switch via de profile-check; bij `none`/seo-only verandert het gedrag aantoonbaar niet (regressie-smoke op de 5 website-types).

**Open vraag #2 (te beslissen in deze ADR bij promotie)**: blijft de composable stage beperkt tot long-form, of mogen page-types er ook van profiteren (groter blast-radius op het productie-SEO-pad)? Voorkeur: eerst long-form-only om het risico te beperken.

Y-statement: *In de context van* seo-geo-combinatie, *kozen we* het omvormen van de SEO-early-return tot een composable stage *boven* een tweede parallelle SEO-implementatie of het laten vallen van seo-geo, *om* "SEO daarna GEO-polish" mogelijk te maken zonder code te dupliceren, *accepterend dat* we het productie-kritieke SEO-pad aanraken en strakke regressie-smokes + een kill-switch nodig hebben.

# Alternatives

- **Tweede, parallelle SEO-implementatie voor long-form** — verworpen: dupliceert de 8-staps pipeline, drift-risico.
- **seo-geo laten vallen** — verworpen: dit is de aanbevolen default voor publiceerbare long-form.
- **GEO vóór SEO draaien** — verworpen: SEO-pipeline is de zwaardere, structuur-bepalende stap; polish hoort erna.

# Consequences

- (+) seo-geo wordt feitelijk mogelijk; geen code-duplicatie.
- (+) Eén orchestratiepunt voor alle profielen.
- (−) Refactor van een monolithische divert op een productie-kritiek pad — risico op regressie. Mitigatie: kill-switch + smoke op de 5 website-types.
- (−) Blast-radius-keuze (long-form-only vs ook page-types) moet bij promotie definitief.
