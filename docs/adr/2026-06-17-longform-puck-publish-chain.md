---
id: 2026-06-17-longform-puck-publish-chain
title: Long-form GEO via aparte LONG_FORM_GEO_PUCK_TYPES-set + bestaande landing-pages-publish-keten
status: proposed
date: 2026-06-17
supersedes: -
superseded-by: -
---

# Context

Long-form GEO-content moet server-side gerenderd worden op `/p/[slug]` (citeerbaar/crawlbaar) en dus door de Puck-render-/publish-keten lopen. Geverifieerde feiten (2026-06-17): die keten is overal gegated op `isPuckWebpageType()`/`PUCK_WEBPAGE_TYPES` (Step2:311, Step4:140, CanvasPage:198, GenericConfigPanel:82, publish-timing:222, orchestrate-route:83, generate-structured-variant:122). Long-form aan die set toevoegen is contraproductief: de W1-dubbelpad-gate (`route.ts:83`) zou long-form juist SKIPPEN en de generate-structured-variant-guard (`route.ts:122`) zou 400'en. Publiceren loopt via `POST /api/landing-pages/publish` → leest `settings.puckData` (422 bij afwezig, `route.ts:73-79`) → `publishLandingPage` snapshot. De studio-route `/api/studio/[deliverableId]/publish` is een WordPress-state-machine die GEEN `LandingPage` maakt. `settings.structuredVariant` wordt geschreven door `LandingPageGenerateBlock.tsx`; `settings.puckData` via de studio-PATCH.

# Decision

1. **Aparte set `LONG_FORM_GEO_PUCK_TYPES`** + helper `isPuckRenderable(contentType, profile)` die NAAST `isPuckWebpageType` wordt geraadpleegd in alle 7 gate-sites. Long-form blijft BUITEN `PUCK_WEBPAGE_TYPES`.
2. **Hergebruik de landing-pages-publish-keten**: na orchestrate valideert long-form de `LongFormGeoVariantContent`, draait `variantToPuckDataFromStructured`, **persisteert `settings.puckData`** en wordt eligible voor `POST /api/landing-pages/publish`. De studio-state-machine wordt in sync gehouden (status/publishedAt) maar is NIET de LandingPage-bron.
3. **Discriminant `geoArticle`** op het long-form-schema, gecheckt vóór elke fallthrough: `getVariantSchemaForType`/`hasOwnVariantSchema` (contentType-switch), `isLandingPageVariant` (negatieve guard amenderen), `buildPageJsonLd` (vóór `return null`), `resolveTemplateBuilder` (vóór landing-page-fallback), `variant-to-puck-data` (vóór shape-checks).

Y-statement: *In de context van* server-rendered long-form GEO, *kozen we* een aparte renderable-set + hergebruik van de bestaande publish-route *boven* long-form in `PUCK_WEBPAGE_TYPES` zetten of een nieuwe publish-route, *om* de W1-gate/guard niet te breken en de geteste snapshot-keten te hergebruiken, *accepterend dat* we een expliciete `puckData`-persist-stap + een discriminant in 5 dispatch-punten moeten toevoegen.

# Alternatives

- **Long-form in `PUCK_WEBPAGE_TYPES`** — verworpen: breekt W1-gate (skip) + generate-structured-variant (400).
- **Nieuwe long-form publish-route** — verworpen: dupliceert de geteste `publishLandingPage`-snapshot-logica.
- **Publiceren via studio-state-machine** — verworpen: maakt geen `LandingPage`, dus `/p/[slug]` heeft geen snapshot.

# Consequences

- (+) Geen breaking change op bestaande page-type-flows (byte-identiek, smoke-bewaakt).
- (+) Hergebruik van geteste publish/snapshot-infra.
- (−) Gate-spread over 7 sites — pariteit-smoke vereist; vergeten site = stille skip/400.
- (−) De `puckData`-persist-stap voor long-form is nieuw werk dat het naïeve plan miste.
