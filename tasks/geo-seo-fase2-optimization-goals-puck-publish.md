---
id: geo-seo-fase2-optimization-goals-puck-publish
title: GEO/SEO Fase 2 — optimizationGoals-checkboxes + long-form GEO-variant + Puck-publish-keten
fase: pre-launch
priority: next
effort: 2,5-3,5 weken (XL)
owner: claude-code
status: in-progress
created: 2026-06-17
completed: -
related-adr: docs/adr/2026-06-17-geo-seo-optimization-goals-field.md, docs/adr/2026-06-17-longform-puck-publish-chain.md
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: branddock-feat-geo-seo
---

# Probleem

Long-form heeft geen GEO-output omdat (a) er geen doel-keuze per content-item bestaat, (b) de hele generate→render-keten op `PUCK_WEBPAGE_TYPES` gegated is (long-form daaraan toevoegen breekt de W1-dubbelpad-gate `route.ts:83` + generate-structured-variant-guard `route.ts:122`), en (c) long-form via een ander publish-pad zou moeten lopen (`settings.puckData` → `POST /api/landing-pages/publish`, 422 bij afwezig). Dit is de kritieke-pad-fase waar alle long-form-GEO-acceptatie van afhangt.

# Voorstel

Introduceer een checkbox-groep `optimizationGoals` (SEO/GEO, default-on per spec-tabel, GEO opt-in), een `LongFormGeoVariantContent`-schema + from-structured builder met nieuwe Puck-blokken, en overbrug de twee pijplijnen via de ECHTE publish-keten. **Begin met een spike + ADR** die de bridge (orchestrate → variant → puckData → publish) bewijst.

# Acceptatiecriteria

**Spike + foundation (gebouwd 2026-06-19):**
- [x] Nieuw `"checkbox-group"`-veldtype + `defaultValue` + renderer-case (Fase 1b)
- [x] `optimizationGoals`-veld + `resolveOptimizationGoals` met backend-fallback (Fase 1b); SEO-optie aanwezig. **GEO-optie nog toe te voegen aan de checkbox.**
- [x] `LongFormGeoVariantContent` Zod-schema met discriminant `geoArticle: z.literal(true)`; toegevoegd aan PageVariantContent + PageVariantSchema unions; cases in `getVariantSchemaForType`/`hasOwnVariantSchema` (via LONG_FORM_SEO_TYPES); `isLandingPageVariant` geamendeerd
- [x] `buildLongFormGeoTemplateFromStructured` (hergebruik BrandHero/RichText/StatsBlock/FAQ/BrandCTA) + `variant-to-puck-data.ts` geoArticle-dispatch vóór LP-fallthrough + `flatten-variant.ts` geoArticle-branch
- [x] Bestaande page-type-flows byte-identiek: page-types 176/176, geen regressie
- [x] `tsc --noEmit` 0 · eslint 0 errors · smoke `geo-longform-schema` 24/24 + `geo-longform-render` 11/11

**Resterend in Fase 2:**
- [ ] **GEO content-generatie**: orchestrator/prompt produceert een `LongFormGeoVariant` (structuredVariant) wanneer GEO-doel aanstaat (nieuw generatie-pad; nu genereert niets de geo-variant)
- [ ] **GEO-optie** toevoegen aan `optimizationGoals`-checkbox (`{value:'geo'}`)
- [x] `LONG_FORM_GEO_PUCK_TYPES` + `isPuckRenderable(contentType, contentTypeInputs)` (2026-06-19, `webpage-types.ts`) gewired in de **7 canvas/route-gate-sites** (Step2ContentVariants, Step4Timeline, GenericConfigPanel, Step1Context, publish-timing, orchestrate-route, generate-structured-variant). **Dormant tot de GEO-optie+generatie landen** (geen geo-goal in productie → `isPuckRenderable == isPuckWebpageType` → nul regressie). Smoke `geo-puck-renderable` 18/18; page-types 176 + web-page-builder groen. **Deferred**: de 3 Claw-edit-tool-sites (context-assembler, write-tools, read-tools) — die gaten Claw-editing van een al-gegenereerde GEO-pagina, dus gepaard met de generatie-increment.
- [x] Dedicated **ComparisonTable** (multi-kolom) + **Listicle** Puck-componenten (2026-06-19, brand-token-aware zoals SpecTable; builder herbedraad → géén RichText-markdown-placeholder meer; markdown-injectie-surface voor die blokken weg). Smoke `geo-longform-render` 20/20; web-page-builder + page-types 176 geen regressie.
- [ ] Publish-keten: long-form persisteert `settings.puckData` + eligible voor `/api/landing-pages/publish`; `/p/[slug]` rendert server-side
- [ ] `buildPageJsonLdForDeliverable` → `buildBlogPostingJsonLd` voor long-form (overlapt Fase 3 JSON-LD)
- [ ] `TEMPLATE_BY_CONTENT_TYPE`/`resolveTemplateBuilder`-pad checken (non-structured fallback) zodat long-form niet stil op landing-page terugvalt

# Bestanden die ik aanraak

- `src/features/campaigns/lib/content-type-inputs.ts` + `src/features/campaigns/components/shared/ContentTypeInputFields.tsx`
- `src/lib/landing-pages/webpage-types.ts` + 7 gate-call-sites (Step2ContentVariants:311, Step4Timeline:140, CanvasPage:198, GenericConfigPanel:82, publish-timing:222, orchestrate-route:83, generate-structured-variant:122)
- `src/lib/landing-pages/page-type-schemas.ts`
- `src/features/campaigns/components/canvas/medium/puck-templates/long-form-geo-from-structured.ts` (nieuw) + `index.ts`
- `src/features/campaigns/components/canvas/medium/variant-to-puck-data.ts`
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` (overweeg `puck-geo-config.tsx`)
- de long-form generate→persist puckData + `/api/landing-pages/publish`-eligibility

# Bestanden die ik NIET aanraak

- `PUCK_WEBPAGE_TYPES` set zelf (long-form gaat er bewust NIET in)
- `/api/studio/[deliverableId]/publish` als LandingPage-bron (alleen status/publishedAt sync)

# Smoke test plan

1. Spike eerst: bewijs de cross-pipeline-bridge end-to-end op één long-form deliverable
2. Genereer blog-post met GEO aangevinkt → structuredVariant (geoArticle) + puckData gepersisteerd → publiceren → `/p/[slug]` rendert + emit BlogPosting JSON-LD
3. Genereer faq-page → output byte-identiek aan vóór (regressie)
4. isPuckRenderable-gate-pariteit smoke over alle 7 sites

# Risico's

- Gate-spread (7 sites) — vergeten site = stille skip of 400. Mitigatie: pariteit-smoke.
- Stille misclassificatie via negatieve `isLandingPageVariant`-guard + `buildPageJsonLd` return-null + `resolveTemplateBuilder` landing-page-fallback. Mitigatie: discriminant `geoArticle` overal vóór de fallthrough.
- puckData-persist-stap is de stap die het naïeve plan miste — expliciet in de keten.

# Out of scope

- GEO-prompt-directives + polish + F-VAL-pijler → Fase 3
- seo-geo composable stage → Fase 3
- Migratie bestaande long-form

# Notes

- ADR's vereist: optimizationGoals-veld + long-form→Puck-publish-keten.
- Beslis vóór start: open vragen #1 (author-bron), #3 (GEO ook page-types?), #4 (welke Puck-blokken ronde 1).
