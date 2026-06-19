---
id: 2026-06-17-geo-seo-optimization-goals-field
title: optimizationGoals als checkbox-groep (SEO/GEO) i.p.v. nieuw contentType of Prisma-kolom
status: accepted
date: 2026-06-17
supersedes: -
superseded-by: -
---

> **Geïmplementeerd (Fase 1b, 2026-06-17)**: `"checkbox-group"`-veldtype + `defaultValue` + `optimizationGoals`-veld (SEO-optie, default `["seo"]`) geïnjecteerd voor long-form via `getContentTypeInputs`; `resolveOptimizationGoals` + `shouldRunSeoPipeline` gedeeld door orchestrator + smoke. GEO-optie volgt in Fase 2.
> **Beslissing Q1 (2026-06-17)**: 'SEO default-aan' voor long-form betekent dat de **volledige 8-staps SEO-pipeline de content genereert** (niet de normale generator). Uitvinken (`optimizationGoals: []`) slaat de SEO-pipeline over. Bewust gekozen boven een aparte lichte SEO-meta-pijplijn of opt-in-default.

# Context

We willen long-form content GEO- en/of SEO-optimaliseerbaar maken (zie spec `docs/specs/2026-06-17-geo-seo-longform-plan.md`). Er zijn drie manieren om "het doel" per content-item vast te leggen: (a) nieuwe contentType-IDs (`blog-post-geo`), (b) een Prisma-kolom op `Deliverable`, (c) een veld in het bestaande `settings.contentTypeInputs`-kanaal. De gebruiker wil checkboxes (SEO/GEO, beide aanvinkbaar = de combinatie) met slimme per-type defaults, en GEO bewust opt-in (geen automatische GEO-generatiekosten).

Geverifieerde codebase-feiten (2026-06-17): `content-type-inputs.ts` kent `text|textarea|tags|number|boolean|select|product-select` (wél losse `boolean`-checkboxes incl. een bestaand `seoFocus`-toggle, géén checkbox-groep en géén `defaultValue`-property). Per-type velden zitten in de `CONTENT_TYPE_INPUTS`-registry. De renderer `ContentTypeInputFields.tsx` leest `field.defaultValue` al, maar de property bestaat niet op het type. Nieuwe contentType-IDs zouden de W1-dubbelpad-gate (`route.ts:83`) en de generate-structured-variant-guard (`route.ts:122`) vervuilen.

# Decision

Adopteer een **per-content-item checkbox-groep `optimizationGoals: string[]`** (waarden `seo`/`geo`) in `settings.contentTypeInputs`, met een afgeleid intern profiel.

1. **Nieuw veldtype `"checkbox-group"`** in `InputFieldType` + renderer-case in `ContentTypeInputFields.tsx` (groep vinkjes die een `string[]` muteert). Plus `defaultValue?: unknown` op `ContentTypeInputField`.
2. **Afleiding**: `resolveOptimizationProfile(settings, contentType)` → `none | seo | geo | seo-geo` uit de goals-array. De rest van het systeem (gates/schema/JSON-LD/F-VAL) leest dit interne profiel; de checkboxes zijn puur UI/opslag.
3. **Default-on via per-type `defaultValue`**, met backend-fallback: de generatie-read-path valt terug op de per-type default uit `getContentTypeInputs(type)` wanneer geen waarde is opgeslagen (anders werkt default-aan alleen na handmatige interactie). SEO default-aan voor long-form + comparison + web-pages; **GEO overal opt-in**; veld afwezig voor social/ads/email/video.
4. **Reconciliatie**: het bestaande `seoFocus`-boolean op web-pages wordt opgenomen in/vervangen door de `seo`-checkbox (geen dubbele SEO-toggle).

Y-statement: *In de context van* GEO/SEO-optimalisatie van long-form, *kozen we* een checkbox-groep-veld met afgeleid profiel *boven* nieuwe contentType-IDs of een Prisma-kolom, *om* additief te blijven en "alleen SEO" + per-type defaults mogelijk te maken, *accepterend dat* we een nieuw veldtype + `defaultValue` + backend-resolutie moeten bouwen.

# Alternatives

- **Nieuwe contentType-IDs** — verworpen: vervuilt W1-gate + picker, niet-additief.
- **Prisma-kolom** — verworpen: `contentTypeInputs` is het bewezen per-deliverable config-kanaal; schema-mutatie onnodig.
- **Enkel `select` (none|geo|seo-geo)** — verworpen: geen "alleen SEO" (de meest voorkomende long-form-default) en zwakkere match op het mentale model.

# Consequences

- (+) Volledig additief, geen migratie, "alleen SEO" mogelijk, per-type defaults.
- (+) Eén afleidingspunt isoleert UI-representatie van interne pijplijn-logica.
- (−) Nieuw veldtype + renderer + backend-default-resolutie te bouwen (klein, in Fase 2).
- (−) `seoFocus` moet zorgvuldig gemigreerd worden om dubbele toggle te vermijden.
