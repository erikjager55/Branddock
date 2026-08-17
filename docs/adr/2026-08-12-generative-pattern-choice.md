---
id: 2026-08-12-generative-pattern-choice
title: Generatieve pattern-keuze — per-sectie layout als additief structured-output-veld
status: accepted
date: 2026-08-12
supersedes: -
superseded-by: -
---

# Context

C1 leverde de sectie-patroonbibliotheek (`section-patterns.ts`: 2-4 layout-
patterns per sectie-type, gekozen via de instance-prop `patternKey`) en C2 de
handmatige "Wissel layout"-kiezer. De generatie zelf koos nog niets: elke
gegenereerde pagina rendert alle secties op `'default'`, waardoor varianten
alleen in copy verschillen — precies de §1.3-diagnose ("zelfde botten") die
Fase C moet oplossen. Het verbeterplan (2026-08-07 §5, Fase C taak C3)
definieert de vervolgstap: pattern-keuze ín de generatie, zodat varianten ook
in layout verschillen; §7 legt er een meetdrempel naast (>80% monocultuur per
sectie-type = C3 bijstellen). Status accepted: de user-opdracht "voer het plan
volledig uit" dekt de C-fasering.

Constraints die de vorm bepalen: (a) de W-regels per paginatype (volgorde,
verplichte secties, single-CTA) zijn harde contracten en mogen niet
onderhandelbaar worden; (b) het archetype-filter van de registry is dynamisch
(per workspace, lazy geclassificeerd via `ensureBrandArchetype`) en kan dus
niet in een statisch Zod-schema; (c) de gotcha-les "AI-JSON Zod
defense-in-depth" plus het imageBrief-precedent: een nice-to-have-veld mag een
variant-parse nooit laten falen; (d) C1 sloot `patternKey` al uit van de
judge-/gate-flatten (`puck-data-flatten` EXCLUDED_KEYS) — layout-config is
geen copy.

# Decision

1. **Additief veld in de structured output**: de variant-schemas (LP,
   product-page, faq-page, microsite) krijgen een optioneel
   `layoutPatterns`-object met veldnamen die op de sectie-sleutels van het
   type-schema aansluiten (LP: `features/testimonial/stats/faq/finalCta`;
   product: `features/faq/finalCta`; faq-page:
   `popularQuestions/categories/closingCta`; microsite: `quote/join`).
   `.catch(undefined)`-degradatie per key én op het object: een hallucinatie
   breekt nooit de parse. Long-form GEO heeft geen pattern-dragende
   mapper-componenten en krijgt het veld niet.
2. **Prompt**: een compact LAYOUT-PATTERNS-blok per type
   (`buildLayoutPatternPromptBlock` in `pattern-choice.ts`) met per sectie de
   archetype-toegestane keys (via `allowedPatternsFor`, dezelfde bron als de
   C2-kiezer) plus 1-regel-betekenis, de instructie te kiezen wat bij de
   CONTENT past, en een expliciet variatie-directief: varianten in dezelfde
   batch horen ook in layout te verschillen. Prompt-versie
   `LP_VARIANT_PROMPT_VERSION` minor gebumpt (2.1.0 → 2.2.0).
3. **Server-side validatie ná parse** (`sanitizeVariantLayoutPatterns`): elke
   gekozen key wordt gevalideerd via `allowedPatternsFor(sectionType,
   archetype, itemCount)` met de server-side archetype en de item-counts uit
   de gegenereerde content zelf. Ongeldig (onbekend, archetype-restrictie,
   minItems) → `'default'` + `console.warn`, nooit een fail. Het
   tell-rewrite-/silent-iterate-pad (herparse van LLM-output) hervalideert.
4. **Mappers**: de from-structured-builders zetten de gevalideerde keys als
   `patternKey`-prop op de betreffende component-instanties, alleen wanneer
   aanwezig — zonder `layoutPatterns` (alle bestaande variants) is de tree
   byte-identiek aan vóór C3. De W-regels blijven de harde
   volgorde-/verplicht-contracten: het veld kiest uitsluitend de layout
   BINNEN een sectie, nooit welke secties bestaan of in welke volgorde.
5. **Meting (§7)**: per generatie een compacte
   `console.info('[pattern-choice]', {type, variant, keys})` in de
   generate-route (JSON- én SSE-pad, vóór persist) zodat de
   monocultuur-drempel uit server-logs te meten is; het echte dashboard is
   post-pilot.

# Y-statement

In de context van **variant-generatie die na C1/C2 wél patterns kon renderen
maar ze nooit koos**, facing **varianten die alleen in copy verschillen en een
dynamisch archetype-filter dat niet in een statisch schema past**, I decided
**de pattern-keuze als additief, `.catch`-gedegradeerd veld in de bestaande
structured output op te nemen en server-side ná parse tegen
`allowedPatternsFor` te valideren met `'default'`-fallback** to achieve
**varianten die ook in layout divergeren zonder extra AI-call, met
gegarandeerd on-brand en parse-veilige output**, accepting tradeoff **dat de
layout-keuze de kwaliteit van één copy-call volgt (geen aparte design-call,
geen gegarandeerde disjunctie tussen slots) en dat een off-archetype-keuze
stilzwijgend naar 'default' degradeert i.p.v. te corrigeren via een retry**.

# Consequences

## Positief

- Varianten verschillen ook in layout; de conservative/creative-slots kunnen
  verschillende patterns kiezen (het variatie-directief stuurt daarop) —
  de kern van "varianten verschillen ook in layout" uit het plan.
- Nul extra AI-calls/latency: de keuze lift mee op de bestaande generatie.
- Prompt, C2-kiezer en validatie delen één bron (`allowedPatternsFor`), dus
  archetype-regels kunnen niet driften tussen UI en generatie.
- Fidelity-scoring blijft ongemoeid: `patternKey` is config, geen copy — al
  uitgesloten in `puck-data-flatten` (C1); `layoutPatterns` verlaat de
  variant alleen richting de mappers, `flattenPageVariantToText` leest er
  niet uit.
- Backward-/forward-compat: bestaande variants zonder veld renderen
  byte-identiek; onbekende keys degraderen op drie lagen (sanitize → mapper
  `resolveSectionPatternKey` → render-normalisatie).

## Negatief / tradeoffs

- De copy-LLM kiest layout op tekstuele beschrijvingen, niet op visueel
  begrip; een matige keuze is mogelijk. Vangnet: C2 laat de gebruiker per
  sectie wisselen zonder AI-call, en de §7-meting maakt monocultuur zichtbaar.
- Silent degradatie ('default' i.p.v. retry) kan een bewuste maar
  niet-toegestane keuze onzichtbaar neutraliseren — bewust: een layout-veld
  mag nooit een variant-batch kosten (imageBrief-filosofie).
- Prompt wordt per type ~10 regels langer (alleen wanneer er iets te kiezen
  valt; archetypen met maar één toegestaan pattern per sectie zien die sectie
  niet).

## Neutraal

- `LP_VARIANT_PROMPT_VERSION` 2.2.0 markeert de wissel in de learning-loop
  (AICallSnapshot), zodat pre-/post-C3-output te scheiden is.
- De trust-strip (MVP-workaround-FeatureGrid op de LP) doet bewust niet mee;
  die krijgt patterns pas als de echte TrustStrip-component in de mapping
  landt (C3-vervolg / anatomie-opname).

# Alternatives considered

- **Pattern-keuze in een aparte (design-)call**: schoner gescheiden
  verantwoordelijkheid en een kans op visueel-specialistische prompts, maar
  +1 AI-call per variant (latency + kosten ×N slots) terwijl de keuze júist
  van de content afhangt die de copy-call net bepaald heeft; de koppeling
  content→layout zou opnieuw geserialiseerd moeten worden. Afgewezen op
  kosten/latency zonder aantoonbare kwaliteitswinst.
- **Client-side random/heuristische spreiding**: gegarandeerde variatie
  zonder AI, maar de keuze is dan content-blind (bento bij drie gelijke
  features, spotlight bij een zwak citaat) en niet uitlegbaar; het plan
  vraagt expliciet keuze op inhoud. Hooguit een latere fallback wanneer §7
  monocultuur laat zien.
- **Niet doen (alleen C2 handmatig)**: veiligste optie, maar laat de
  §1.3-diagnose in stand — de eerste indruk van elke batch blijft
  "zelfde botten" en de kiezer wordt een verplicht handmatig nabewerkings-
  station i.p.v. een correctiemiddel.

# Notes

- Uitvoering: `tasks/done/lp-generative-pattern-choice.md`; plan §5 Fase C taak C3
  + §7 (pattern-spreiding-metriek). Bouwstenen: C1
  (`section-patterns.ts`, ADR-loos gedocumenteerd in
  `tasks/done/lp-section-pattern-library.md`) en C2 (`lp-pattern-swap-ui`).
- Nieuwe module: `src/lib/landing-pages/pattern-choice.ts` (slots per type,
  prompt-blok, sanitize, `patternProp`-mapper-helper,
  `variantLayoutPatterns`-accessor voor de meting).
- Smoke: `scripts/smoke-tests/web-page-builder-phase55-generative-patterns.ts`.
- Follow-ups expliciet buiten deze beslissing: anatomie-componenten
  (TrustStrip/PainBullets/ImpactStats) in de generatie-mapping; multi-quote
  testimonial-wand (quotes-array); §7-dashboard.
