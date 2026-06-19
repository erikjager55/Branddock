# GEO & SEO+GEO optimalisatie voor long-form content — implementatieplan

> **Datum**: 2026-06-17
> **Status**: plan (nog niet gestart) — output van een 13-agent workflow (5 codebase-readers + 3 research-agents + synthese + 3-lens adversariële review + revisie)
> **Aanname**: "GEO" = **Generative Engine Optimization** (citeerbaarheid voor AI answer-engines: ChatGPT/SearchGPT, Perplexity, Google AI Overviews & AI Mode, Gemini, Claude, Copilot). NIET geografisch/lokaal. "SEO/GEO-combinatie" = pagina's die zowel klassiek ranken als geciteerd worden.

---

## Doel

Voeg GEO- en gecombineerde SEO+GEO-optimalisatie toe aan **long-form content** (geverifieerde IDs: `blog-post`, `pillar-page`, `whitepaper`, `case-study`, `ebook`, `linkedin-article`, `thought-leadership`), volledig **additief** en trouw aan Branddock-conventies (geen nieuwe contentType-IDs, geen Prisma-base-mutatie, geen breaking change).

## Kernbeslissing: doel-checkboxes `optimizationGoals` (SEO / GEO)

Per content-item een **checkbox-groep "Optimalisatiedoel"** met twee onafhankelijke vinkjes — **SEO** en **GEO**. Geen vinkje = `none`, beide aangevinkt = de gecombineerde SEO+GEO-pijplijn. Opgeslagen als string-array (`optimizationGoals: ["seo","geo"]`) in het bewezen `settings.contentTypeInputs`-kanaal.

Intern wordt hieruit het profiel afgeleid — `[] → none`, `["seo"] → seo`, `["geo"] → geo`, `["seo","geo"] → seo-geo` — zodat alle gates, schema's, JSON-LD en de F-VAL-pijler uit dit plan **ongewijzigd** blijven werken. De checkboxes zijn puur de UI/opslag-representatie; één helper `resolveOptimizationProfile(settings, contentType)` levert het interne profiel.

Gekozen **boven** een enkel select-veld (`none|geo|seo-geo`) omdat checkboxes ook **"alleen SEO"** toelaten (de meest voorkomende long-form-default) en beter matchen op het mentale model "kies je doelen". Gekozen **boven** nieuwe contentType-IDs (vervuilen de W1-dubbelpad-gate + picker) en **boven** een Prisma-kolom (`contentTypeInputs` is het bestaande per-deliverable config-kanaal).

**Default-on voor relevante content-items:** het veld krijgt een per-content-type `defaultValue`, zodat relevante items al aangevinkt binnenkomen (zie defaults-tabel onder Fase 2). Niet-relevante types (social, ads, e-mail, video) krijgen het veld niet.

### Wat het inputs-systeem hiervoor nog mist (geverifieerd 2026-06-17)
`content-type-inputs.ts` kent vandaag `text|textarea|tags|number|boolean|select|product-select` — wél losse `boolean`-checkboxes (incl. een bestaand `seoFocus`-toggle op web-pages), maar **geen checkbox-groep en geen `defaultValue`-property**. Toe te voegen (allemaal additief, klein):
1. `"checkbox-group"` in de `InputFieldType`-union.
2. `defaultValue?: unknown` op `ContentTypeInputField` (de renderer leest `field.defaultValue` al op regel 22 van `ContentTypeInputFields.tsx`, maar de property bestaat nog niet → defaults werken nu niet voor dit veld).
3. Een renderer-case voor `checkbox-group` in `ContentTypeInputFields.tsx` (groep van vinkjes die een `string[]` muteert).
4. **Backend default-resolutie**: de generatie-read-path mag niet alléén op de UI-default vertrouwen (een gebruiker die de config-panel nooit opent → geen opgeslagen waarde). `resolveOptimizationProfile()` valt terug op de per-type `defaultValue` uit `getContentTypeInputs(type)` wanneer `settings.contentTypeInputs.optimizationGoals` ontbreekt. Anders werkt "default-on" alleen na handmatige interactie.
5. Reconciliatie met het bestaande `seoFocus`-boolean op web-pages: opnemen in / vervangen door de `seo`-checkbox (geen dubbele SEO-toggle).

## Architecturale kern-inzichten uit de review (waarom v1 niet werkte)

1. **Publish loopt via een ander pad.** Page-types publiceren via `settings.puckData` → `POST /api/landing-pages/publish` (leest puckData, **422 bij afwezig**). NIET via de studio-WordPress-state-machine. Long-form moet dus eerst `puckData` persisten.
2. **De hele keten is gegated op `PUCK_WEBPAGE_TYPES`.** Long-form daaraan toevoegen breekt: de W1-dubbelpad-gate (`route.ts:83-104`) zou ze juist *skippen* en de generate-structured-variant-guard (`route.ts:122`) zou 400'en. Oplossing: aparte set `LONG_FORM_GEO_PUCK_TYPES` + helper `isPuckRenderable(contentType, profile)`, geraadpleegd náást `isPuckWebpageType` in **7 gate-sites**.
3. **Schema-dispatch IS contentType-keyed** (`getVariantSchemaForType`/`hasOwnVariantSchema`, regel 251-267) — long-form-cases worden daar expliciet toegevoegd; dit is het bestaande correcte patroon.
4. **Stille misclassificatie-valkuilen**: `isLandingPageVariant` is een *negatieve* guard (regel 278), `buildPageJsonLd` valt door naar `return null` (regel 99-102), `resolveTemplateBuilder` valt terug op landing-page (index.ts:30-32) — alle drie moeten een expliciete long-form-discriminant (`geoArticle`) vóór de fallthrough krijgen.
5. **seo-geo vereist een échte refactor**: de SEO-pipeline is vandaag een early-return (`yield* runSeoPipeline(...); return;`, `canvas-orchestrator.ts:358-372`) die alle latere generatie kortsluit. Voor "SEO daarna GEO-polish" moet dit een composable stage worden. Plus: long-form staat niet in `WEBSITE_DELIVERABLE_TYPES`, dus een aparte `LONG_FORM_SEO_TYPES` set is nodig.
6. **E-E-A-T moet echt zijn**: `Person`/`sameAs` wordt alléén geëmit bij een verifieerbare auteur (koppeling aan `OrganizationMember` of workspace-author-profiel), anders weggelaten — holle/verzonnen author-markup is contraproductief.

---

## Nieuw te bouwen (concepten)

**Configuratie & gating**
- `optimizationGoals` — per-content-item checkbox-groep (SEO / GEO, beide aanvinkbaar) in `content-type-inputs.ts`, met per-type `defaultValue`; vereist nieuw `"checkbox-group"`-veldtype + `defaultValue`-property + renderer-case
- `resolveOptimizationProfile(settings, contentType)` — leidt het interne profiel (none|seo|geo|seo-geo) af uit de goals-array, met fallback op de per-type default (backend, niet alleen UI)
- `LONG_FORM_GEO_PUCK_TYPES` + `isPuckRenderable(contentType, profile)` — render-eligibiliteit zonder long-form in `PUCK_WEBPAGE_TYPES`
- `LONG_FORM_SEO_TYPES` — maakt seo-geo op long-form mogelijk zonder website-SEO-gedrag te wijzigen

**Schema & builders**
- `LongFormGeoVariantContent` (Zod, discriminant `geoArticle`): answerFirstIntro, tldr, qa[], citeableStats[], comparison{columns,rows}, listItems[], definitions[], author{name,credentials,sameAs[],organizationMemberId?}, sources[], datePublished/dateModified, inLanguage
- `buildLongFormGeoTemplateFromStructured` — mapt variant → Puck-tree met hergebruik (HighlightCards=TL;DR, RichText=answer-first/sources, StatsBlock=stats, FAQ=Q&A, BrandCTA) + nieuwe blokken

**Nieuwe Puck-componenten** (RSC-safe)
- `ComparisonTable` (echt multi-kolom `<table>` → ItemList/Table JSON-LD) + `Listicle/ItemList` (genummerd → ItemList) — de twee hoogst-geciteerde AI-formats
- `DefinitionList` (→ DefinedTerm), `AuthorBox` (→ Person/E-E-A-T), `CitationList` (→ sources)

**Prompt-pipeline**
- `buildGeoDirective()` — answer-first / atomic-chunking (2-4 zinnen) / cited-stats / entity-clarity / freshness + GEO anti-patterns; bump `PROMPT_VERSION`
- `runGeoPolish()` — lichte single-call retrofit (géén judge)
- SEO-early-return → **composable SEO-stage** (runSeoPipeline geeft content terug i.p.v. te returnen)

**Kwaliteit & meting**
- F-VAL **GEO-pijler** — compute-gated (draait niet bij profile=none) én **judge-vrij/deterministisch** (answer-first, claim-citatie-ratio, chunk-lengte, TL;DR, freshness); baseline-kosten aantoonbaar onveranderd
- `settings.geoOptimizationAnalysis` — meet-haak (score + findings + geëmitte schema-types + canonical URL) voor latere citation-tracking

**Structured-data & discovery**
- `buildBlogPostingJsonLd` + entity-laag (WebPage.about/mentions, Organization sameAs, DefinedTerm, QAPage-optie, ImageObject, inLanguage, BreadcrumbList, geneste howToSchema)
- Recurrent freshness (dateModified=now bij republish + 90-dagen-staleness-flag)
- Root `src/app/sitemap.ts` + `robots.ts` op canonieke `/sitemap.xml` + `/robots.txt` (gereconcilieerd met bestaande `marketing/*`) + experimentele `/llms.txt`

---

## Fasering

### Fase 1a — Quick-win: structured-data + metadata + discovery voor BESTAANDE page-types — **S-M (2-4 dagen)**
Maak reeds-gepubliceerde page-types (faq/product, die al een LandingPage hebben) AI-citeerbaar via de head/JSON-LD/discovery-laag die nu ontbreekt. Raakt **geen** generatie, niet geblokkeerd door de publish-keten. Long-form bewust hier buiten.
- `p/[slug]/page.tsx`: async `generateMetadata()` uit `settings.seoChecklist` (title/description/og/canonical/dates/robots)
- `page-json-ld.ts`: BreadcrumbList + Organization-publisher sameAs + WebPage.about/mentions; howToSchema wiren; faq/product backward-compat (smoke)
- nieuw root `sitemap.ts` + `robots.ts` (canoniek, gereconcilieerd met marketing/*) + `llms.txt`

### Fase 1b — SeoChecklist-velden + long-form SEO-eligibility (raakt generatie) — **S (1-2 dagen)**
- `seo-pipeline.types.ts`: SeoChecklist + author/datePublished/dateModified; nieuwe `LONG_FORM_SEO_TYPES`
- `seo-prompts.ts` (step 8): author + datePublished in checklist (alleen indien verifieerbaar)
- `canvas-orchestrator.ts`: SEO-gate consulteert WEBSITE_DELIVERABLE_TYPES **of** LONG_FORM_SEO_TYPES
> Long-form-meta is leeg tot content geregenereerd is → UI-copy-discipline; zichtbaar pas ná Fase 2.

### Fase 2 — Structured: optimizationProfile + long-form GEO-variant + de ECHTE Puck-publish-keten — **XL (2,5-3,5 weken)**
Grootste architecturale stap; overbrugt twee niet-overlappende pijplijnen. **Begin met een spike + ADR.**
- `content-type-inputs.ts` + `ContentTypeInputFields.tsx`: nieuw `"checkbox-group"`-veldtype + `defaultValue`-property + renderer; `optimizationGoals`-veld met per-type defaults (zie tabel); `resolveOptimizationProfile()`-helper met backend default-fallback; `seoFocus`-toggle reconciliëren
- `webpage-types.ts` + **7 gate-call-sites**: `LONG_FORM_GEO_PUCK_TYPES` + `isPuckRenderable` (Step2:311, Step4:140, CanvasPage:198, GenericConfigPanel:82, publish-timing:222, orchestrate-route:83, generate-structured-variant:122) — dominante kost
- `page-type-schemas.ts`: `LongFormGeoVariantContent` + long-form-cases in getVariantSchemaForType/hasOwnVariantSchema + `isLandingPageVariant`-guard amenderen (`&& !('geoArticle' in variant)`)
- `puck-templates/long-form-geo-from-structured.ts` (nieuw) + registratie in TEMPLATE_BY_CONTENT_TYPE vóór de DEFAULT-fallback
- `variant-to-puck-data.ts:459-466`: geoArticle-discriminant-check vóór bestaande shape-checks
- `puck-config.tsx`: ComparisonTable/Listicle/DefinitionList/AuthorBox/CitationList (overweeg `puck-geo-config.tsx`)
- **Publish-keten (kritieke correctie)**: na orchestrate variant valideren → `variantToPuckDataFromStructured` → `settings.puckData` PERSISTEN → eligible maken voor `/api/landing-pages/publish`; studio-state-machine in sync houden; `buildBlogPostingJsonLd` vóór return-null; cache-invalidation + `revalidatePath('/p/<slug>')`. **ADR vereist.**

#### Per-type defaults (`optimizationGoals.defaultValue`)

**Besluit 2026-06-17: GEO is overal opt-in.** SEO mag default-aan voor relevante types; GEO komt nooit voorgevinkt binnen (geen automatische GEO-generatiekosten).

| Content-type(s) | Default vinkjes | Reden |
|---|---|---|
| `blog-post`, `pillar-page`, `linkedin-article`, `whitepaper`, `case-study`, `ebook`, `thought-leadership`, `comparison-page` | **SEO** aangevinkt · **GEO opt-in** | citeerbare formats, maar GEO bewust handmatig i.v.m. generatiekosten |
| `landing-page`, `product-page`, `faq-page`, `microsite` | **SEO** aangevinkt · **GEO opt-in** | draaien al SEO-pipeline; GEO optioneel per pagina |
| social, ads, e-mail, video, korte types | *(veld afwezig)* | SEO/GEO niet relevant → `none` |

> **Kosten-lever (afgehandeld):** GEO draait nu alleen wanneer een gebruiker het GEO-vinkje zelf aanzet → `runGeoPolish` (+ bij SEO+GEO de 8-staps SEO-pipeline) op de baseline-generatie van niemand. Het GEO-vinkje levert pas zichtbare output ná Fase 2/3 (daarvóór inert).

### Fase 3 — Full: GEO-prompt-pijplijn, composable seo-geo, opt-in F-VAL-pijler, meet-haak, freshness — **L-XL (2,5-3,5 weken)**
- `long-form.ts` + nieuw `prompts/geo-directives.ts`: `buildGeoDirective()`; bump PROMPT_VERSION
- `canvas-orchestrator.ts`: GEO-gate op profile + **SEO-early-return → composable stage** (ADR); kill-switch via profile-check
- nieuw `geo-polish.ts`: `runGeoPolish()` (single-call, geen judge)
- `composition-engine.ts` + nieuw `geo-fidelity-scorer.ts`: `computeGeoScore()` deterministisch, compute-gated, judge-vrij; inhaken in normalizeWeights
- `page-json-ld.ts` + freshness: buildBlogPostingJsonLd, DefinedTerm, QAPage, ImageObject, inLanguage, about/mentions; recurrent dateModified + staleness-flag
- `Deliverable.settings.geoOptimizationAnalysis`: meet-haak-blob
- nieuwe smoke-suites: profile-dispatch, gate-pariteit, schema-validatie, JSON-LD byte-identiek vóór/na, GEO-pijler compute-gating (0 extra LLM-calls op none)

**Totale effort: ~6-8 weken** gefaseerd.

---

## Acceptatiecriteria

- Long-form met `optimizationProfile=geo` genereert + persisteert gevalideerde `structuredVariant` (geoArticle): answer-first intro, TL;DR (2-5 bullets), ≥2 Q&A, ≥1 citeable-stat-met-bron, ≥1 definition, comparison-table OF listicle, sources-lijst.
- Diezelfde deliverable persisteert `settings.puckData` en is publiceerbaar via `/api/landing-pages/publish` (NIET de studio-state-machine); `/p/[slug]` rendert server-side via de bestaande Puck Render-route.
- `isPuckRenderable` geraadpleegd in alle 7 gate-sites; long-form NIET in `PUCK_WEBPAGE_TYPES`; bestaande page-type-flows byte-identiek (smoke).
- `/p/[slug]` emit geldige BlogPosting/Article JSON-LD (datePublished/dateModified, keywords, publisher, geneste FAQPage/QAPage/howTo, DefinedTerm, about/mentions, ImageObject, inLanguage, BreadcrumbList); author Person+sameAs alléén bij verifieerbare identiteit; faq/product JSON-LD byte-identiek.
- `generateMetadata()` zet pagina-specifieke title/description/og/canonical/dates (page-types uit seoChecklist; long-form na Fase 1b+2).
- Root `sitemap.ts`/`robots.ts` serveren canonieke paden, workspace-aware, coëxisterend met marketing/*; `/llms.txt` adverteert high-value URLs.
- `seo-geo` draait runSeoPipeline (via LONG_FORM_SEO_TYPES + composable stage) ÉN GEO-directives/polish met gedocumenteerde trade-off (answer-first wint van keyword-first); website-page-type-SEO blijft ongewijzigd.
- F-VAL GEO-pijler compute-gated + judge-vrij: bij profile=none 0 extra LLM-calls (smoke); thresholds/judge-kosten onveranderd.
- Geen nieuwe contentType-IDs, geen Prisma-base-mutatie; bestaande non-GEO long-form blijft valide.
- `tsc --noEmit` 0 errors, lint groen, nieuwe + bestaande smokes groen; ADR's voor optimizationProfile, long-form→Puck-publish-keten, SEO-early-return→composable-stage.

## Buiten scope

Nieuwe contentType-IDs; long-form in PUCK_WEBPAGE_TYPES; migratie/backfill bestaande long-form; custom-domain/hreflang; live AI-crawler-citation-meting + GEO-dashboard (alleen de data-haak); OG-image-generatie; de overige ~46 content-types; GEO uitrollen naar bestaande page-types; Redis/ISR metadata-cache; externe entity-reinforcement (Wikidata/G2/Reddit); Speakable als kernfeature (gedegradeerd tot optionele laag).

## Open beslissingen

1. **Author/E-E-A-T-bron**: `OrganizationMember` vs expliciet workspace-author-profiel met sameAs-URLs? (emit alléén bij verifieerbare identiteit — welk model wordt de bron, te kiezen in ADR)
2. **SEO-refactor-blast-radius**: composable stage alléén voor long-form, of mogen page-types ook profiteren (groter risico op productie-kritiek SEO-pad)?
3. **GEO ook naar page-types?** (vooral comparison-page, al SEO-eligible en hoog-citerend voor B2B) of long-form-only deze ronde?
4. **Welke Puck-blokken in ronde 1?** Alle 5, of starten met ComparisonTable+Listicle (hoogst-citerend) + hergebruik en AuthorBox/DefinitionList/CitationList later?
5. ~~Long-form GEO-default~~ — **BESLOTEN 2026-06-17**: GEO overal opt-in, SEO default-aan voor relevante types. UI = checkbox-groep.
6. **Sitemap multi-tenant strategie**: globale root-sitemap met namespacing vs per-workspace sitemap-index (privacy/slug-enumeratie + schaal 1000+ pagina's)?
7. **variant_index-bloat**: GEO-polish + STRICT-rewrite + plan-and-solve kunnen >2 variants per group geven — cappen op 4 of pruning?

---

## Uitvoering (worktree `branddock-feat-geo-seo`, branch `feat/geo-seo-longform`)

Task-files: [`geo-seo-fase1a-structured-data`](../../tasks/geo-seo-fase1a-structured-data.md) · [`geo-seo-fase1b-longform-seo-substrate`](../../tasks/geo-seo-fase1b-longform-seo-substrate.md) · [`geo-seo-fase2-optimization-goals-puck-publish`](../../tasks/geo-seo-fase2-optimization-goals-puck-publish.md) · [`geo-seo-fase3-geo-prompts-fval`](../../tasks/geo-seo-fase3-geo-prompts-fval.md)
ADR-drafts: [`optimization-goals-field`](../adr/2026-06-17-geo-seo-optimization-goals-field.md) · [`longform-puck-publish-chain`](../adr/2026-06-17-longform-puck-publish-chain.md) · [`seo-pipeline-composable-stage`](../adr/2026-06-17-seo-pipeline-composable-stage.md)

**Fase 1a AFGEROND op code-niveau 2026-06-17** (alleen deploy-time browser-smoke open, vereist echte subdomeinen → bij `vercel-deployment`):
- `generateMetadata` op `/p/[slug]` leest `settings.seoChecklist` → pagina-specifieke `<title>`/description/OpenGraph; **canonical-fallback** `https://<ws>.branddock.app/<slug>`. Pure mapping `page-metadata.ts`.
- **Per-workspace discovery** (host-aware route-handlers, geen cross-tenant lek): `app/sitemap.xml`, `app/robots.txt`, `app/llms.txt` + `host-router` exemptions + `workspaceSlugFromHost` + pure builders `sitemap-host.ts`. **Open vraag #6 opgelost**: per-workspace op subdomein i.p.v. globale root-sitemap.
- JSON-LD: Organization-`publisher` op FAQPage (additief).
- Geverifieerd: tsc 0, lint 0, smokes `page-seo-metadata` 30/30 + `geo-discovery` 28/28 + volledige `page-types` 176/176; 2-lens adversariële review (security clean, nextjs-fixes verwerkt).

## Aanbevolen vervolg

1. **Fase 1a deploy-time browser-smoke** bij `vercel-deployment` (echte subdomeinen): pagina-specifieke `<title>`/OG via view-source + `<ws>.branddock.app/sitemap.xml`.
2. Beslis open vraag #1 (author-bron), #3 (GEO ook page-types?), #4 (welke Puck-blokken ronde 1) vóór Fase 2.
3. **Spike + ADR** voor de cross-pipeline-bridge (orchestrate → variant → puckData → publish) als poort vóór Fase 2.
