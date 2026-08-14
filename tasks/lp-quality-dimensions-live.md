---
id: lp-quality-dimensions-live
title: B5 — landing-page quality-dimensies (6 LP-dimensies) het productie-pad in
fase: pre-launch
priority: now
effort: 1-2 dagen (plan-schatting §5 Fase B)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: -
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md §5 Fase B taak B5
worktree: - (branch claude/puck-editor-improvement-y9ep4x, parallel-orkestratie)
---

# Probleem

De 6 type-specifieke landing-page-quality-dimensies in `src/lib/landing-pages/landing-page-quality.ts` (heroClarity, singleCtaDiscipline, readability, socialProofPresence, anatomyCompleteness, objectionCoverage) hadden **geen enkele productie-caller** — alleen de phase10-smoke gebruikte ze. De productie-routes `auto-iterate` en `strict-rewrite` scoorden elke pagina met de generieke 5-signal heuristic uit `page-quality.ts`, die bijna altijd gate-grade (≈70/70) scoort en nul verklaringskracht heeft. Het F-VAL deep-path bestaat maar staat default UIT (`AUTO_ITERATE_DEEP_SCORE`) wegens 90s+ latency per call.

# Voorstel

Een type-aware composer `evaluatePageQualityForType(tree, contentType)` in `page-quality.ts`: dispatch naar de 6 LP-dimensies (deterministisch, 0 AI-calls, geen vision/WCAG op het hot path) wanneer `contentType === 'landing-page'`, generieke heuristic voor alle andere types. Resultaat genormaliseerd naar het bestaande `PageQualityResult`-contract (`{ score, threshold, thresholdMet, signals }`) + additief `dimensions`. Beide routes swappen naar de composer; auto-iterate resolvet contentType uit `deliverableId` (cheap select, fail-soft), strict-rewrite krijgt een optioneel `contentType`-bodyveld (additief, backward-compatible). Proposal-responses dragen additief de dimensie-breakdown zodat de diff-modal later kan tonen WAAROM.

# Acceptatiecriteria

- [x] `evaluatePageQualityForType` bestaat in `page-quality.ts`, dispatcht op contentType en normaliseert naar het route-contract (threshold blijft 70)
- [x] Geen screenshots/AI/DB-calls in de composer zelf (vision-dim + WCAG-dim bewust uitgesloten op dit synchrone pad)
- [x] `auto-iterate` scoort before/projected type-aware; contentType via cheap `deliverable.findUnique({ select: { contentType } })` met fail-soft fallback naar generic
- [x] `strict-rewrite` accepteert optioneel `contentType` in de body (additief); zonder veld werkt het bestaande gedrag ongewijzigd (generieke heuristic)
- [x] Proposal-responses (beide routes) + skipped-response (auto-iterate) dragen additief `dimensions` (en `dimensionsProjected` waar projected berekend wordt); `undefined` valt weg in JSON → bestaande consumers ongemoeid
- [x] Product-page-besluit gedocumenteerd (zie Notes: OUT, met onderbouwing per dimensie)
- [x] Deep-score-besluitregel gedocumenteerd (zie Notes; geen metingen in deze task)
- [x] Phase10-smoke uitgebreid met dispatch-assertions (LP → dimensies-pad, product-page/onbekend/null → generic, shape-compatibiliteit)
- [x] `npx tsc --noEmit` 0 errors in eigen bestanden (2 pre-existing errors in `PuckLayoutWrapper.tsx` van parallelle sessie — buiten scope)
- [x] `npx eslint` 0 errors op eigen bestanden
- [x] Smoke-test uitgevoerd: phase10 48/48 PASS

# Bestanden die ik aanraak

- `src/lib/landing-pages/page-quality.ts` — composer + types + type-aware F-VAL-null-fallback
- `src/app/api/landing-pages/auto-iterate/route.ts` — contentType-resolve + type-aware scoring + additieve response-velden
- `src/app/api/landing-pages/strict-rewrite/route.ts` — optioneel `contentType`-bodyveld + type-aware scoring + additieve response-velden
- `scripts/smoke-tests/web-page-builder-phase10-quality-dimensions.ts` — B5-dispatch-assertions
- `tasks/lp-quality-dimensions-live.md` — deze task-file

# Bestanden die ik NIET aanraak

- `src/features/campaigns/components/canvas/medium/PuckPageBuilder.tsx` — eigendom parallelle sessie; de route leest `contentType` optioneel, de caller kan het later meesturen (fallback werkt zonder)
- Alles onder `canvas/medium/`, `LandingPageGenerateBlock`, `generate-structured-variant`, `regenerate-puck-data`, `publish*`, `prisma/**`, `package.json`, i18n-catalogi, roadmap/changelog/gotchas/CLAUDE.md
- `src/lib/landing-pages/landing-page-quality.ts` — de dimensie-module zelf blijft ongewijzigd; alleen de aanroep verandert

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase10-quality-dimensions.ts`
2. Verwacht: 48/48 PASS, incl. groep "B5 — evaluatePageQualityForType dispatch" (LP → dimensies-pad met score = LP-composite; product-page/onbekend/null → generieke fallback zonder `dimensions`; beide paden shape-compatibel met het route-contract)
3. `npx tsc --noEmit` + `npx eslint` op de 4 aangeraakte code-bestanden → 0 errors
4. Handmatig (dev): auto-iterate op een landing-page-deliverable → proposal-response bevat `dimensions` met 6 scores; strict-rewrite zonder `contentType` → response identiek aan voorheen (geen `dimensions`-veld)

# Risico's

- **Score-shift voor LP's**: de 6-dimensie-composite scoort strenger/informatiever dan de heuristic (die bijna alles ≈70+ gaf). Mitigatie: de skip-gate in auto-iterate vertrouwt de threshold alleen in deep-score-mode (bestaand gedrag, ongewijzigd); in default-mode wordt bij een klik altijd een rewrite geprobeerd — de score is informatief, niet blokkerend.
- **contentType-format-mismatch**: `Deliverable.contentType` bevat voor web-pages kebab-case id's (`'landing-page'`, bewezen door `isPuckRenderable(deliverable.contentType, …)` in generate-structured-variant + studio/orchestrate); legacy display-namen ("Blog Post") matchen nooit `'landing-page'` en vallen automatisch op de generieke heuristic terug — fail-soft by design.
- **Parallelle sessies op dezelfde branch**: alleen bovengenoemde bestanden aangeraakt; PuckPageBuilder + publish-bestanden expliciet vermeden.

# Out of scope

- UI die de `dimensions`-breakdown toont in `PageDiffPreviewModal` (de responses dragen het veld al; modal-werk is een vervolg-task)
- `PuckPageBuilder.handlePromptRewrite` het `contentType`-veld laten meesturen (1-regel-wijziging voor de eigenaar van dat bestand)
- WCAG-dimensie (7) en visual brand-fit (8) op het route-pad — vergen styleguide-fetch resp. screenshot + AI-call
- comparison-page op het dimensie-pad (zie Notes)
- Latency-metingen voor het deep-score-besluit (expliciet géén DB/AI-metingen in deze task)

# Notes

## Besluit: product-page NIET op het dimensie-pad (generieke heuristic blijft)

Geverifieerd tegen de canonieke product-tree uit `buildProductPageTemplateFromStructured` + `productPageVariantSchema`. 3 van de 6 dimensies misfiren structureel:

1. **anatomyCompleteness** (15-20% gewicht) eist ≥2 FeatureGrids (trust-strip + features, LP-spec §2-anatomie) + een Testimonial. Het product-template emit maximaal 1 FeatureGrid voor features (of een **FeatureSplit** = 0 grids wanneer alle features beeld hebben — juist het doel-scenario met echte ProductImages) en heeft **geen testimonial-slot** in het schema. Een schema-perfecte product-page blijft op 4/6 ≈ 67 hangen.
2. **socialProofPresence** (15%) geeft 50 van de 100 punten alleen bij een Testimonial-component → permanent gecapt op 50, en 0 bij FeatureSplit-rendering.
3. **objectionCoverage**: de 100-band eist 5+ FAQ-items; `productPageVariantSchema` capt `faq` op **max 4** → permanent gecapt op 60.

Deze deficits zitten in structuur die het type per eigen schema niet mág hebben; de text-only rewrite van auto-iterate kan ze nooit repareren → oneerlijk lage composite + zinloze rewrite-triggers + misleidende "WAAROM"-breakdowns. `heroClarity` en `singleCtaDiscipline` zouden wél passen (het product-schema enforcet single-CTA via superRefine, secondaryCta heeft geen BrandHero-slot), maar 3/6 misfirende dimensies is diskwalificerend. Volledige onderbouwing ook in de JSDoc van `evaluatePageQualityForType`.

**comparison-page** deelt het LP-generatieschema (`getVariantSchemaForType`-default) en zou vermoedelijk wél passen — bewust buiten B5-scope gehouden (task vroeg alleen om het product-page-besluit); kandidaat voor een vervolg zodra accept-ratio-data er is.

## Besluit: F-VAL deep-score blijft default UIT (besluitregel, geen meting)

- `AUTO_ITERATE_DEEP_SCORE` default OFF blijft van kracht: het deep-path kost ~90s+ per call (3-pillar composite + retries) tegen een client-cap van 3 min — de 2026-05-28-userfeedback (3-6 min hangs) blijft de bindende constraint.
- B5 levert het alternatief dat de afweging verandert: type-aware, deterministisch scoren met verklaringskracht (6 dimensies) tegen **0 AI-kosten en <5ms** — de belangrijkste reden om deep-score te willen (betekenisvolle scores i.p.v. gate-grade heuristic) is daarmee grotendeels afgedekt voor LP's.
- Besluitregel per plan (§5 B5 "F-VAL deep-score-besluit op latency-meting"): het deep-score-default wordt **heroverwogen zodra prod-latency-data beschikbaar is na livegang** — pas als p95 van het deep-path in productie-context onder een acceptabele drempel voor de auto-iterate-UX komt (richtwaarde: ruim binnen de 3-min client-cap incl. rewrite-call), is default-aan voor admin/QA-context bespreekbaar. Tot die data er is: opt-in env-flag, geen wijziging.
- Er is in deze task bewust **niets gemeten** (geen DB, geen AI) — conform opdracht.

## Wiring-details

- `evaluatePageQualityForType` roept `evaluateLandingPageQuality({ data })` aan **zonder** `brandTokens` (WCAG-gewicht wordt in de module proportioneel herverdeeld over de 6 dims) en **zonder** het vision-pad — hot path blijft synchroon en gratis. Threshold: beide modules definiëren 70, dus het route-contract wijzigt niet.
- `evaluatePageQualityViaFVAL` (deep-path) valt bij een null-outcome van de runner nu ook op de type-aware evaluator terug (`input.contentTypeId` was al beschikbaar) — deep-mode degradeert daarmee naar exact dezelfde evaluator als heuristic-mode.
- auto-iterate resolvet contentType **éénmalig** vóór het scoren en hergebruikt het voor de projected-score (voorkomt een tweede select op het opt-in `AUTO_ITERATE_PROJECTED_SCORE`-pad).
- Client-parsing in PuckPageBuilder is type-cast (geen strict Zod op de response) → additieve velden zijn bewezen veilig; `JSON.stringify` laat `undefined`-velden weg, dus niet-LP-responses zijn byte-compatibel met vóór B5.
