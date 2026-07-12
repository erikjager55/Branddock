---
id: 2026-07-12-type-category-derivation-plan-and-solve
title: TYPE_TO_CATEGORY afgeleid uit template-collecties + expliciete Plan-and-Solve-eligibility
status: accepted
date: 2026-07-12
supersedes: -
superseded-by: -
revises: -
---

# Context

De #7.A flow-analyse (`docs/specs/content-flow-synthesis.md`, tickets CF-3/CF-4 in
`tasks/content-flow-improvements-7a.md`) vond dat de handgeschreven
`TYPE_TO_CATEGORY`-map in `src/lib/ai/prompt-version-registry.ts` was gedivergeerd van de
werkelijke type-registries: **9 phantom-IDs** die nergens anders bestaan (`battle-card`,
`objection-handler`, `product-demo`, `company-announcement`, `job-description`,
`recruitment-post`, `employee-newsletter`, `crisis-statement`, `thought-leadership-bio`) en
**11 echte types die ontbraken** (o.a. `facebook-ad`, `linkedin-video-ad`,
`testimonial-video`, `proposal-template`, `product-description`, `internal-comms`,
`impact-report`). Ontbrekende types vielen via `getCategoryForType()` terug op `'long-form'`.

Blast-radius op het moment van fixen (geverifieerd 2026-07-12):

1. **Plan-and-Solve-dispatch** (`canvas-orchestrator.ts`): eligibility was
   `getCategoryForType(id) === 'long-form'`. Door de fallback waren de 11 ontbrekende types
   *per ongeluk* eligible — inclusief korte-output-types (`facebook-ad`) waarvoor de
   single-body-markdown-assembly onbruikbare output zou geven. Dormant: `usePlanAndSolve`
   heeft (nog) geen UI-toggle.
2. **PromptVersion-tracking**: `getPromptVersionForType()` had nul call-sites; de map was
   daar dus alleen latent fout. De divergentie zou pas echt schade doen zodra een nieuwe
   consumer de map vertrouwt.

Model-routing (`canvas-model-routing.ts`) gebruikt de **UI-categorie** uit
`deliverable-types.ts`, niet deze map — die bleef buiten schot.

# Decision

1. **`TYPE_TO_CATEGORY` wordt afgeleid, niet onderhouden.** De map wordt opgebouwd uit de 8
   template-collecties (`LONG_FORM_TEMPLATES` … `PR_HR_TEMPLATES`) — dezelfde bron als
   `TEMPLATE_REGISTRY` in `src/lib/studio/prompt-templates/index.ts`. Een type hoort bij de
   categorie van het bestand waarin zijn template leeft. Divergentie is daarmee structureel
   onmogelijk; `smoke:prompt-contracts` sectie (g) bewaakt aanvullend dat élk canoniek
   deliverable-type een dedicated template heeft (geen generic-fallback, CF-1) én dat de
   afleiding klopt tegen een onafhankelijk opgebouwde verwachting.
2. **Plan-and-Solve-eligibility wordt expliciet** (CF-3): `long-form`-categorie **plus** een
   benoemde `EXTRA_PLAN_AND_SOLVE_TYPES`-set (`proposal-template`, `impact-report`) — de twee
   long-output-types buiten long-form die vóór de mapfix alleen per ongeluk eligible waren.
   **Website-types worden bewust uitgesloten**, hoewel het CF-3-ticket ze noemde: sinds het
   Puck-paradigma (ADR `2026-05-22-landing-page-builder-architectuur`) lopen alle 5
   `PUCK_WEBPAGE_TYPES` via de structured-variant-flow en zou de single-body-markdown van
   Plan-and-Solve dat contract breken (W1-dubbelpad-gate).
3. **De `'long-form'`-runtime-fallback in `getCategoryForType()` blijft** (orchestrator mag
   niet crashen op een onbekend type), maar is nu een bewaakt vangnet: de smoke faalt zodra
   een canoniek type erop zou leunen, en `getPromptTemplate()` waarschuwt luid bij een
   generic-template-hit.

# Y-statement

In de context van **een handgeschreven type→categorie-map die aantoonbaar was gedivergeerd
(9 phantoms, 11 ontbrekend) en een categorie-gebaseerde chain-dispatch die daardoor
per ongeluk korte-output-types toeliet**, facing **het risico dat elke toekomstige consumer
van de map onjuiste tracking of routing erft**, kozen we voor **afleiding van de map uit de
template-collecties zelf + een expliciete eligibility-set voor Plan-and-Solve + een
CI-smoke-guard**, to achieve **een structureel niet-divergeerbare bron van waarheid met effectief
gelijkblijvend runtime-gedrag voor alle zichtbare types (enige delta:
facebook-ad's dormante Plan-and-Solve-eligibility vervalt — de bedoelde
bugfix)**, accepting tradeoff **dat de
prompt-version-registry nu de (server-only) template-bestanden importeert en dat
website-types bewust buiten de Plan-and-Solve-scope blijven totdat het Puck-paradigma
heroverwogen wordt**.

# Consequences

## Positief
- Map kán niet meer divergeren; nieuwe types erven hun categorie automatisch van hun
  template-bestand.
- CF-1-klasse-regressies ("type valt stil terug op generieke prompt") breken voortaan CI
  (smoke sectie g) en loggen runtime een warn.
- De accidental Plan-and-Solve-eligibility van korte-output-types is weg; de twee bedoelde
  long-output-types zijn nu expliciet en gedocumenteerd.

## Negatief / tradeoffs
- `prompt-version-registry.ts` importeert nu de volledige prompt-teksten. Alle consumers
  zijn server-side (2 API-routes, visual-fidelity-scorer, canvas-orchestrator); bij een
  toekomstige client-side consumer zou dit prompt-IP naar de bundle lekken — dan moet de
  map naar een licht gedeeld module verhuizen.
- `linkedin-ad`/`facebook-ad`/`linkedin-article` volgen het template-bestand
  (`social-media`) terwijl hun UI-categorie afwijkt (CF-8) — bewust: prompt-versie-categorie
  volgt het bestand dat de prompt bevat; model-routing volgt de UI-categorie. Gedocumenteerd
  in beide bestanden.

## Neutraal
- `facebook-ad` krijgt bij tracking voortaan `social-media`-versies i.p.v. de foutieve
  `long-form`-fallback — er waren nog geen consumers, dus geen datamigratie nodig.
