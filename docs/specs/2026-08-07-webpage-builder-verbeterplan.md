# Webpage-builder verbeterplan — prompt-first bouwen op de design-library + publiceren als product

> **Datum**: 2026-08-07 · **v3** (v1: interactiemodel-diagnose; v2: Puck-exit-spoor E1-E3; v3: marktonderzoek verwerkt → nieuw Spoor P publish-pijplijn + herziene volgorde)
> **Aanleiding**: user-feedback: *"de regels per type website zijn goed, maar de editor voelt te statisch — nieuwe tools bouwen puur op prompts en de design-library"* + user-voorstel **van Puck afstappen** + user-vraag naar marktonderzoek bouw/publicatie ("hier valt meer uit te halen").
> **Scope**: de content-items die webpagina's bevatten (`landing-page`, `product-page`, `faq-page`, `comparison-page`, `microsite` + long-form GEO via `isPuckRenderable`).
> **Onderbouwing**: code-audit van de volledige keten + footprint-meting Puck-gebruik + **marktonderzoek over ~20 producten in 4 sporen** — zie [`docs/reports/webpage-bouw-en-publicatie-marktonderzoek-2026-08-07.md`](../reports/webpage-bouw-en-publicatie-marktonderzoek-2026-08-07.md). Hoofdconclusie daaruit: het sectie+token-bouwmodel dat Branddock al heeft ís het winnende model; de onbenutte waarde zit aan de **publiceer-kant** (statisch compileren, versies/rollback, formulieren, meting, kanalen).
> **Verhouding tot bestaande besluiten**: ADR [`2026-08-07-puck-exit-sectie-editor`](../adr/2026-08-07-puck-exit-sectie-editor.md) (**status: proposed**) herziet beslissing 2 (editor-stack) van ADR `2026-05-22-landing-page-builder-architectuur`; de overige beslissingen daaruit én de edit-architectuur (verplichte diff-preview + locks) blijven van kracht. `tasks/web-page-builder-acceptance-rest.md` wordt geabsorbeerd (bundle-restpunt vervalt bij E1/P2). Task `web-page-builder-v2-custom-domains` blijft de custom-domain-drager (P7).

---

## 1. Diagnose

### 1.1 Interactiemodel: bewerken is een modus, geen gesprek
De hoofdview van Step 3 is een read-only `<Render>` (`PuckPageBuilder.tsx:596`); elke aanpassing vereist de fullscreen "Bewerk layout"-modal of een alles-of-niets Auto-iterate. Inline tekst-editing (MVP-belofte "Laag 1") is nooit aangezet. De AI-laag bestaat server-side maar hangt niet aan de UI (**wees-code**): `strict-rewrite` (vrije instructie, "never skips"), `generate-page` (prompt → complete tree), `component-edit` + `ComponentDiffPreviewModal` — allemaal af, geen enkele caller. De 4 vaste AI-knoppen zijn destijds terecht verwijderd, maar er kwam geen vrij promptveld voor terug.

### 1.2 Vaste layout per paginatype
De 18 componenten + per-type templates zijn statische trees; de generator produceert alleen copy. De design-library (`BrandTokens` + provenance, `DesignSystem`, `brand-render-rules`, `render-constraints` per archetype) stuurt styling, geen structuurvariatie — elke pagina heeft dezelfde botten. Marktonderzoek-bevestiging: álle AI-features van de gevestigde platforms (Webflow AI, Framer Wireframer, Builder Visual Copilot) genereren binnen een constrained design-system; de code-generatoren (Lovable, v0) persen hun AI door hard-gecodeerde token-regels. Het model klopt — het wordt alleen niet generatief benut.

### 1.3 De Puck-dependency knelt structureel en wordt oppervlakkig gebruikt
Footprint (zie exit-ADR): 1× `<Puck>`, ~6× `<Render>`, 16 type-only imports, geen enkel geavanceerd editor-API. Frictie: external-field-bug, workaround-stapel, CSP-prod-incident 2026-07-16, editor-chunk-lek naar `/p/[slug]` (208 KB), upgrade-treadmill.

### 1.4 De publiceer-kant is het echte gat (marktonderzoek + in-code geverifieerd)

| Gap | Bewijs | Marktnorm |
|---|---|---|
| **ISR-cache vermoedelijk buiten werking** | `/p/[slug]` leest `searchParams` (`?workspace=`) → Dynamic API → route rendert dynamisch; `revalidate=3600` zonder effect; elke view = 5-7 Prisma-queries + volledige `assembleCanvasContext` + runtime React (= ook een kostenbug op Fluid CPU) | Webflow/Framer: statisch vanaf CDN, "no database queries on page load" |
| **Geen versiehistorie/rollback** | `publishLandingPage` upsert — elke publish overschrijft | Framer: elke publish immutable + versioned; domein = pointer; rollback = repoint |
| **Snapshot half-bevroren** | content bevriest, brand-tokens live geresolved per request — styleguide-wijziging herstijlt stilzwijgend alle live pagina's | Webflow bakt alles in bij publish; keuze hoort expliciet |
| **Geen formulier/lead-capture** | 0 form-secties; CTA's zijn links | Table-stakes bij álle marketing-suites (forms → CRM/webhook + bedankpagina + notificaties) |
| **Geen meting op live pagina's** | 0 analytics in `/p/[slug]` | Zelfs Mailchimps gratis pagina's tonen views/conversies; A/B is de betaalmuur (+$50-100/mnd) |
| **Geen preview-URL / scheduled publish / A/B** | ontbreekt | Standaard bij HubSpot/Instapage/Builder/Storyblok |
| **Publish-UI ontbreekt überhaupt** | Step 4 raakt `LandingPage` niet aan; `/api/landing-pages/publish` heeft geen caller | — |

**Kans in plaats van gap**: de 18 componenten zijn al bewust server-safe ("GEEN 'use client'", puck-config.tsx:1) met één client-eiland (`AnchorNavClient`, mét no-JS-fallback) — statische compilatie bij publish is direct binnen bereik. En AI-crawlers (GPTBot 569M req/mnd, ClaudeBot 370M — Vercel/MERJ-meting) voeren **geen JS uit**: statische HTML maakt het GEO-verhaal structureel onregresseerbaar.

---

## 2. Wat expliciet blijft

| Laag | Waarom |
|---|---|
| **Per-type contentregels** (`page-type-schemas.ts`, W-spec, gates) | Door user als sterk benoemd; wordt de vangrail voor álle AI-mutaties én wordt in de eigen sectie-editor afgedwongen (verplichte secties niet verwijderbaar) |
| **JSON-datamodel** (`settings.puckData` + `LandingPage`-snapshot) | Portable; exit vervangt renderer/editor, niet de data — geen migratie |
| **18 componenten + templates** | Eigen React-code; alleen de registry-wrapper verandert (→ formeel versioned contract, zie E1/E2) |
| **Brand-design-library** (tokens+provenance, design-system, render-rules, constraints, wcag) | Dít is de design-library waar de markt op bouwt; HubSpot prijst het equivalent op ~$450/mnd |
| **Kwaliteitspoorten** (F-VAL, fidelity/brand-fit-judges, diff-preview + locks) | Uniek t.o.v. álle onderzochte tools — niemand doet merkvalidatie |
| **Claw-tools** (pad-gevalideerde tekst-edits) | Kiem voor conversational editing (B1) |
| **Publish-backend** (`publish-page.ts`, host-router, JSON-LD/sitemap/llms.txt) | Basis voor Spoor P |

**Niet doen** (markt-onderbouwd): richting code-generatie bewegen (credit-metered edits, breakage-loops, geen governance — de prijs die Lovable/Bolt/Base44 betalen); zwaardere vendor-editor; vrije-vorm/nested drag-drop (sectie = de eenheid); gesplitste hosting over twee vendors; page-count-metering in pricing.

---

## 3. Doelbeeld (noordster)

> **"Praat met je pagina, binnen de vangrails van je merk en paginatype — en publiceer als product, niet als bijzaak."**

1. Elke wijziging kan via een **prompt** (pagina/sectie/element); daarnaast een **deterministische gratis edit-laag** (inline tekst, typed props, pattern-swap — het Lovable Visual Edits / v0 Design Mode-patroon: instant, geen AI-call, kan niets breken).
2. De **design-library is generatief**: generatie én "wissel layout" kiezen per sectie uit brand-toegestane patronen.
3. De **per-type regels zijn de vangrails**: server-side Zod + W-regels + F-VAL op elke AI-mutatie; de editor dwingt ze zelf af.
4. **Generatie is zichtbaar** (streaming, sectie voor sectie).
5. **Publish = compileren**: statische HTML + per-page critical CSS per versie; domein/kanaal = pointer naar een versie; rollback, preview-URL en scheduled publish zijn pointer-operaties.
6. **Pagina's zijn conversie-assets**: formulier → leads → webhook/CRM; views/conversies per pagina; publish-gate met merkvalidatie.
7. **Eén compiler, meerdere kanalen**: eigen subdomein → custom domain → WordPress-push → zip-export.
8. **Geen editor-vendor op het kritieke pad** (exit-ADR).

---

## 4. Sporen

- **Spoor E (Puck-exit, ADR proposed)**: E1 eigen render-loop → E2 eigen sectie-editor → E3 dependency eruit. Het onderzoek verzwaart E1's rol: de render-loop is tegelijk de **compiler-kern** met vier afnemers (editor-preview, publieke route, statische compiler, exports).
- **Spoor A/B/C (interactiemodel)**: prompt-first bewerken + streaming + design-library generatief (v1/v2 van dit plan).
- **Spoor P (publish-pijplijn, nieuw uit marktonderzoek)**: van "dood endpoint" naar product — versies, statisch, forms, meting, kanalen.

---

## 5. Fasering

### Fase 0 — Direct (~1-2 dagen, geen afhankelijkheden, geen ADR)

| # | Taak | Wat | Effort |
|---|---|---|---|
| P0 | `lp-isr-cache-fix` | **ISR-bug fixen**: `/p/[workspace]/[slug]` pad-params i.p.v. `?workspace=` (proxy-rewrite mee); on-demand revalidation primair, fallback-TTL naar dagen; verifieer `x-vercel-cache: HIT`. Lost latency + kosten op het hele live verkeer op. | ~0,5d |
| — | hygiëne-cluster | Orchestrate-dubbelpad gaten (dubbele generatiekosten); `canvas/medium/README.md` doc-sync (11→18 componenten, verwijderde flows); besluit `ai-edit-instructions.ts` (preset naast vrij veld óf weg). | ~1d |

### Fase A — Publiceren + ontkoppelen (~2-2,5 weken; ADR-acceptatie E-spoor vereist vóór E1)

| # | Taak | Wat | Effort |
|---|---|---|---|
| P1 | `page-publish-versioned` | **Versioned publishes + publish-UI** (absorbeert het eerdere A0): append-only `PagePublish`-snapshots + `livePublishId`-pointer per pagina; publish-UI in Step 4/Export (slug, status, live-URL, versielijst, rollback = pointer-swap + revalidate); preview-URL per versie (signed token); cache-tags keyed op snapshot-id (immutable → cache forever, alleen pointer-lookup invalideren — het Storyblok-`cv`-patroon). | 2,5-3,5d |
| E1 | `page-render-own-loop` | **Eigen `<PageRender>` + `PageData`-type + registry als formeel contract**: platte render-loop over `content[]`; stabiele sectie-type-id's + Zod-schema per versie + breaking-change-detectie (Makeswift/Plasmic-patroon — schema's dubbelen straks als AI-tool-definities én compiler-input); `data-section-id`-provenance in de output (Storyblok-patroon → click-to-select in B3). Vervangt Pucks `<Render>` op alle ~6 call-sites; type-swap 16 bestanden. Pariteit: screenshot-vergelijk per type + phase-smokes. | 2-3d |
| A2 | `lp-page-prompt-action` | **Vrij promptveld op paginaniveau**: bedraad bestaande `strict-rewrite`-route → bestaande `PageDiffPreviewModal`. | ~1d |
| P6 | `lp-publish-gate` | **Merkvalidatie ín de publish-actie**: F-VAL/brand-fit + link/SEO-checks als zichtbare, blokkeerbare stap (bestaande `PublishGate`-surface + bestaande judges). Niemand in de markt doet brand-validatie bij publish — differentiatie. | 1-2d |

**Acceptatie Fase A**: gebruiker publiceert vanuit de UI naar `<workspace>.branddock.app/<slug>` mét versielijst + rollback + preview-URL; publieke route serveert cache-hits; alle 5 types renderen pixel-gelijk via de eigen loop; eerste accept-ratio-data van A2 komt binnen.

### Fase B — Prompt-first editing + editor-vervanging (~3-4 weken; ADR-aanvulling §Edit-architectuur bij B1)

| # | Taak | Wat | Effort |
|---|---|---|---|
| A3 | `lp-inline-text-edit` | Inline tekst-edit in de preview (contentEditable op `collectEditableTextFields`-whitelist; autosave-pad bestaat). Deterministisch, geen AI-call. | 2-3d |
| A4 | `lp-section-hover-actions` | Sectie-hover-toolbar: verplaats/dupliceer/verwijder (met verplichte-sectie-guard), "regenereer sectie", "✏️ prompt op sectie" — herbedraad `component-edit`-route (vrije tekst) + `ComponentDiffPreviewModal`; per-sectie lock terug. | 2-3d |
| B1 | `lp-chat-dock` | Chat-dock op de Claw-agent-loop; write-tools structureel (`add/remove/reorder_section`, `set_section_props`, `swap_section_pattern`) — tool-schema's = de registry-schema's uit E1; batch-diff accept/reject; consolideert alle edit-paden op één server-validatielaag. | 5-7d |
| B2 | `lp-streaming-generation` | Streaming sectie-voor-sectie generatie in Step 2 (partial-JSON). | 3-4d |
| B3 | `lp-select-and-tell` | Element-selectie → contextuele promptbar (op `data-section-id`-provenance uit E1). | 3-4d |
| B4 | `lp-variant-merge` | Three-way merge (diff-merge.ts) rond `regenerate-puck-data` + confirm-modal; edits overleven variantwissel. | 2-3d |
| B5 | `lp-quality-dimensions-live` | `landing-page-quality.ts` (6 LP-dimensies) het productie-pad in; F-VAL deep-score-besluit op latency-meting. | 1-2d |
| E2 | `section-editor-own` | Eigen sectie-editor vervangt de `<Puck>`-modal: verticale sectie-lijst + reorder + toevoegen uit pattern-bibliotheek + props-paneel (ConfigFieldRenderer-patronen + PuckImageField as-is) + undo/redo-snapshotstack + viewport-toggle. **Checkpoint-per-AI-mutatie met restore-forward** (markt-standaard: v0/Bolt/Base44) op de snapshotstack. | 4-6d |
| E3 | `puck-dependency-removal` | Dependency + puck.css + CSP-allow rsms.me + workaround-stapel eruit; `FullscreenEditorModal` weg; keten-smoke. | 0,5-1d |

### Fase P-vervolg — Publiceren als product (~2-3 weken, deels parallel aan Fase B; ADR nodig voor P2)

| # | Taak | Wat | Effort |
|---|---|---|---|
| P2 | `publish-static-compile` | **Compile-to-static bij publish** (ná E1): sectie-tree + tokens → `renderToStaticMarkup` → HTML + per-page critical CSS (alleen de CSS van gebruikte sectietypes — het structurele voordeel t.o.v. Webflows groeiende site-stylesheet) → artefact per `PagePublish`-versie in R2 → dunne serving-route; islands alleen voor interactieve secties (AnchorNav bestaat al als eiland). **Token-freeze-besluit** (eigen ADR): tokens bevriezen per snapshot + batch-"republish alles met nieuw thema". Zero DB op het hot path; CWV groen by construction; AI-crawler-veilig (GEO). | 4-6d |
| P3 | `lp-forms-leads` | **Formulier-sectie + leads-pijplijn**: form-sectietype (registry) + `/api/f/[formId]` (honeypot + timing + Turnstile + rate-limit) → submissions per workspace + e-mailnotificatie + webhook (Zapier/CRM) + bedankgedrag per formulier; conversiedoel per pagina. CORS-open zodat subdomein/custom domain/zip/WP hetzelfde endpoint gebruiken. **AVG**: submissions = persoonsgegevens → retentie + verwerkersrol expliciet. | 4-6d |
| P4 | `lp-page-analytics` | **First-party meting per pagina** (cookieloos): views + conversies (form/CTA-doel) + dashboard per pagina/versie; voedt later agents ("Iris voor conversie"). | 2-3d |
| P5 | `publish-wordpress-channel` | **WordPress-kanaal (REST-MVP)**: site-URL + Application Password → `POST /wp/v2/pages` als draft (v1: gecompileerde HTML in één `wp:html`-blok) + media-sideload + preview-link terug. Instapage/StoryChief-patroon; past op NL-MKB. Gate: ≥2 pilot-klanten vragen erom. | 3-5d |

### Fase C — Design-library generatief (~3-4 weken, ongewijzigd t.o.v. v2; ADR bij C3)

C1 sectie-patroonbibliotheek (hero-pattern-mechanisme generaliseren; TrustStrip/PainBullets/ImpactStats mee; RSC-safe) → C2 "wissel layout" per sectie (thumbnails, alleen brand-toegestane patterns, geen AI-call) → C3 pattern-keuze ín de generatie (structured-output-veld; varianten verschillen dan ook in layout) → C4 (gated) merk-/domein-specifieke componenten.

### Fase D — Verdieping (post-pilot, go/no-go op meetdata)

- **D1** Meerdere design-richtingen per generatie + judge-panel.
- **D2** Edge A/B (varianten = `PagePublish`-rijen + middleware-cookie-bucket) → daarna **AI-verkeersallocatie** ("genereer 3 on-brand varianten, shift automatisch") — de Unbounce-Smart-Traffic-$249-laag als agent-feature; natuurlijke Brandclaw-use-case.
- **D3** DTR (URL-param → tekst-swap met fallback, ~1d), scheduled publish (cron-pointer-flip), HTML-zip-export (compiler + assets + werkend formulier, ~1d na P2/P3).
- **D4** Custom domains v1 (bestaande task `web-page-builder-v2-custom-domains`; Vercel Domains/Registrar API; Cloudflare for SaaS pas op agency-schaal) + evt. domein-verkoop in-app (Registrar API).
- **D5** Interne headless generation-API (prompt + workspace → gepubliceerde pagina; v0 Platform API/Gamma Generations-patroon) — aansluitend op agents + MCP-plan M3.
- **D6** (cosmetisch) `puckData` → `pageData` hernoemen.

---

## 6. Volgorde, launch-bewaking & effort

```
[vandaag]  P0 (ISR-fix) + hygiëne — geen enkele afhankelijkheid
[ADR-acceptatie E-spoor: user]
Fase A:    P1 (versies+publish-UI) ∥ E1 (render-kern) ∥ A2 (promptveld) → P6 (publish-gate)
Fase B:    E1 → A3/A4 → B1/B3 ; B2/B4/B5 parallel ; A3+A4 → E2 → E3
Spoor P:   E1 → P2 (statisch) ; P3 (forms) onafhankelijk ; P3 → P4 (meting) ; P2+P3 → P5 (WP, gated)
Fase C:    C1 → C2 → C3 (B1 → C3) ; C4 gated
Fase D:    alles data-/gate-gedreven
```

**Launch-bewaking**: `pricing-credits-billing` blijft dé launch-blocker (roadmap Track C) — dit plan mag dat kritieke pad niet verdringen. Aanbevolen pre-pilot-slice: **Fase 0 + Fase A** (~2,5-3 wk — daarmee is de keten heel: bouwen → valideren → gepubliceerd mét versies, cache en prompt-editing). Fase B/P-vervolg/C daarna, gestuurd door pilot-data (accept-ratio, leads-vraag, WP-vraag). Totale omvang volledig plan: ~9-12 weken; expliciet níet als één blok plannen.

**Effort-samenvatting**: Fase 0 ≈ 1,5-2d · Fase A ≈ 7-10d · Fase B ≈ 23-31d · P-vervolg ≈ 13-20d · Fase C ≈ 17-23d.

### 6.1 Doorgroeipad — van campagnepagina's naar een eenvoudige website (user-vraag 2026-08-07)

Een "eenvoudige website" (home, over-ons, diensten/product, FAQ, contact, evt. blog) is in dit model **geen nieuw product maar een dunne laag bovenop wat dit plan al bouwt**: een website = verzameling gepubliceerde pagina's onder één host (bestaat: `<workspace>.branddock.app/*` + per-workspace sitemap/robots/llms.txt) + gedeelde chrome + domein. De markt bevestigt de schaalbaarheid van het model: Gamma bouwt multi-page sites uit hetzelfde kaarten-model, Relume genereert complete sites uit sectie-patronen. Wat er t.z.t. bij moet (post-launch, eigen discovery — géén onderdeel van dit plan):

- **Site-laag per workspace**: homepage-pointer (root-pad → pagina; vandaag heeft de subdomein-root géén afhandeling, `host-router.ts:103-106`), menu-/nav-model (gepubliceerde pagina's + labels + volgorde), footer-config, favicon/meta-defaults, 404-pagina.
- **Nieuwe paginatypes** via de bestaande W-methode: homepage, over-ons/team, diensten-overzicht, contact (contact leunt op P3-forms). Blog bestaat de facto al: long-form GEO-artikelen publiceren door dezelfde keten.
- **Gedeelde chrome**: BrandNav/Footer voeden vanuit het site-menu-model i.p.v. per-pagina props; nav-/thema-wijziging → batch-republish van geraakte pagina's (zelfde primitief als de token-freeze-republish uit P2).

**Vangrails die de komende taken nú moeten respecteren** (goedkoop nu, duur later):
1. **E1/P2**: de render-loop/compiler neemt site-chrome (nav/footer) als aparte input naast de sectie-tree — niet hardwired per pagina.
2. **P1**: `PagePublish` groepeert op workspace (bestaat al als as); geen aanname "1 pagina = 1 eiland"; reserveer het homepage-pointer-concept (root-slug) in het model.
3. **P2**: de batch-republish-primitief generiek bouwen (thema-wijziging én nav-wijziging zijn dezelfde operatie).
4. **Slugs**: plat houden, maar geneste paden niet blokkeren in validatie/routing.
5. **BrandNav-links** als data (verwijzingen naar pagina's) modelleren zodra het menu-model er is — tot die tijd geen vrije-tekst-URL's dieper verankeren.

**Wat dit spoor bewust nooit wordt**: een generieke vrije-vorm websitebuilder of webshop (Webflow-terrein). Het onderzoek laat zien dat het constrained sectie+token-model voor MKB-merksites juist het sterkere product is; mocht de ambitie ooit verder reiken, dan is dat een aparte productbeslissing met eigen discovery.

---

## 7. Meting & go/no-go's

| Metriek | Bron | Drempel |
|---|---|---|
| Accept-ratio AI-voorstellen (per bron) | diff-modal events | <30% kwaliteitsprobleem; >90% frictie versoepelen (ADR-trigger 6) |
| Prompt-adoptie | % bewerkte pagina's met ≥1 prompt-edit | >50% na Fase B |
| Render-pariteit E1 | screenshot-diff 5 types | pixel-gelijk vóór verwijdering oude render |
| Cache-hit publieke route | `x-vercel-cache` | >95% HIT na P0; TTFB p95 < 200ms na P2 |
| Time-to-first-publish | created → eerste `PagePublish` | meetbaar vanaf P1; dalend na B2 |
| Leads per pagina | P3-submissions | bestaan = het punt; voedt D2 |
| Fidelity-delta na prompt-edits | F-VAL/brand-fit | niet structureel dalend |
| Pattern-spreiding (C) | verdeling per sectie-type | >80% monocultuur = C3 bijstellen |
| Editor-vervanging E2 | % sessies dat sectie-editor opent | laag = prompt+inline dekken het hoofdpad |

Credits: prompt-edits/regeneraties output-metered conform pricing-ADR; publish/hosting zelf credit-vrij (kostprofiel: statische views ≈ €0).

---

## 8. Risico's & mitigaties

| Risico | Mitigatie |
|---|---|
| E1-renderpariteit | Screenshot-vergelijk als acceptatiecriterium; smoke-suite; oude render pas weg ná pariteit |
| E2 loopt uit | Stop-and-ask >2wk (exit-ADR-trigger); A3/A4 dekken het hoofdpad al |
| P2 token-freeze verandert snapshot-semantiek | Eigen ADR vóór bouw; batch-republish als thema-wijzigingspad; provenance-panel toont bron |
| AI-edit breekt type-contract | Server-side Zod + W-guards + weigering-met-uitleg; don't-shrink/minWords; AI-JSON Zod defense-in-depth (gotchas) |
| Forms = persoonsgegevens (AVG) | Retentiebeleid + export/delete per workspace; verwerkersafspraken; Turnstile i.p.v. tracking-captcha; geen third-party scripts |
| Webhook-consumers traag | Async dispatch + retries; les van Instapage (≤20s-eis brak bedankpagina's) — bedankgedrag nooit op de webhook laten wachten |
| Chat-editing traag/duur | Targeted tool-calls per sectie/veld; latency-budget in ADR-aanvulling |
| Diff-moeheid | Deterministische laag (A3/C2/inline) zonder diff-modal; diff alleen op AI-mutaties |
| Nieuwe patterns breken publieke route/screenshotter | RSC-safe verplicht; phase-smoke per pattern |
| Scope-creep richting code-gen | Harde lijn: registry + patterns zijn de vocabulaire (markt-onderbouwd: de code-gen-tools betalen ervoor met breakage + governance-gaten) |
| Publish-spoor verdringt launch | Pre-pilot-slice = Fase 0+A; rest data-gedreven (§6) |

---

## 9. Samenvatting voor de retro

v1 stelde vast dat het interactiemodel het probleem is (niet het fundament) en dat de prompt-laag al half gebouwd maar onbedraad is. v2 voegde de Puck-exit toe: oppervlakkig gebruik, structurele frictie, eigen sectie-editor + render-loop op ongewijzigde JSON. v3 verwerkt het marktonderzoek (~20 producten, 4 sporen): het bouwmodel van Branddock is marktconform-winnend, maar **publiceren is het onbenutte product** — statisch compileren bij publish (Webflow/Framer-kamp; componenten zijn er al server-safe voor), versies met pointer-rollback (Framer-model), formulieren + meting (table-stakes overal), merkvalidatie als publish-gate (niemand doet het — differentiatie) en later kanalen (WordPress, zip, A/B met AI-allocatie). De exit-ADR wordt erdoor versterkt: E1's render-loop is tegelijk de compiler-kern, E2's registry-contract is tegelijk het AI-tool- en compilercontract. Eerste stap is niettemin banaal: een ISR-bug fixen die vandaag elke publieke paginaweergave dynamisch maakt.
