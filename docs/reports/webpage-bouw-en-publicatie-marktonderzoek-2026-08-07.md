# Marktonderzoek — hoe moderne applicaties webpagina's bouwen én publiceren

> **Datum**: 2026-08-07
> **Aanleiding**: user-vraag bij het Puck-exit-voorstel (ADR `2026-08-07-puck-exit-sectie-editor`, proposed): *"Doe eerst online onderzoek naar hoe andere applicaties webpagina's bouwen en publiceren. Ik heb het gevoel dat met het opheffen van Puck hier meer uit te halen valt."*
> **Methode**: 4 parallelle onderzoekssporen over ~20 producten/platforms — (1) AI-native builders (Lovable, v0, Bolt.new, Base44, Gamma), (2) marketing-suites (HubSpot, Unbounce, Instapage, Leadpages, Mailchimp, Klaviyo, Swipe Pages), (3) professionele visual-platforms (Builder.io, Framer, Webflow, Plasmic, Makeswift, Storyblok), (4) publish-/hosting-architectuurpatronen (Vercel multi-tenant, Cloudflare for SaaS, statische compilatie, AI-crawlers, forms, WordPress-kanaal). Aangevuld met in-code verificatie van Branddocks eigen keten.
> **Sourcing-caveat**: veel vendor-docdomeinen zijn door de egress-proxy geblokkeerd; feiten komen dan uit search-geïndexeerde snippets van officiële docs + third-party writeups (bronnen per claim in de deelrapporten; belangrijkste hieronder inline). Prijzen zijn third-party-gerapporteerd — herverifiëren vóór extern gebruik.

---

## 0. Hoofdconclusie

**Het gevoel klopt.** De Puck-exit maakt méér mogelijk dan een schonere editor — hij ontgrendelt de publiceer-kant, en dáár zit de grootste onbenutte waarde. Drie samenvattende bevindingen:

1. **De markt is het eens over het bouwmodel dat Branddock al heeft.** Sectie-/blok-gebaseerd bouwen binnen een design-token-systeem heeft overal gewonnen: de free-form-pioniers (Unbounce, Instapage) bouwden achteraf blokkensystemen; de AI-code-generatoren (Lovable, v0) persen hun AI door hard-gecodeerde token-regels ("never custom styles", "exactly 3-5 colors"); de AI-features van Webflow/Framer/Builder genereren *binnen* het design-system, nooit vrije HTML. Gamma — het sterkste analog voor "AI-document → gepubliceerde site" — bewijst dat een constrained sectie-model sneller genereert, goedkoper bewerkt en beter meet dan code-generatie. **De eigen sectie-editor + registry uit de exit-ADR is dus geen inhaalslag maar het winnende model.**
2. **Het verschil zit in publiceren.** Webflow en Framer compileren bij publicatie naar statische HTML op een CDN ("geen database-queries bij page load"); elke publish is een onveranderlijke versie; domeinen zijn pointers naar versies (staging + instant rollback = pointer-swap). Branddock rendert nu elke publieke paginaweergave runtime met React + volledige context-assembly — en door een bug werkt zelfs de ISR-cache vermoedelijk niet (§4.1). Zonder Pucks `<Render>` op het publieke pad kan Branddock naar het Webflow/Framer-kamp: **publish = compileren**.
3. **Conversie + meting zijn table-stakes die Branddock volledig mist.** Elke marketing-suite levert formulieren → CRM/webhook, per-pagina views/conversies en A/B (de betaalmuur, +$50-100/mnd); Klaviyo lanceerde er februari 2026 nog native landing pages bij. Branddock heeft geen formulier-sectie, geen meting op live pagina's, geen versiehistorie. Tegelijk heeft géén van de onderzochte tools merkcontext + validatieregels + een agent-laag — precies de combinatie waarmee Branddock de premium-laag (AI-gestuurde variant-allocatie, Unbounce's $249-tier) kan overtreffen.

---

## 1. Spoor 1 — AI-native builders (Lovable, v0, Bolt.new, Base44, Gamma)

**Kernbevindingen**

- **Zelfs code-generatoren regeren via tokens.** Lovables agent-prompt verbiedt custom styles en dwingt semantic HSL-tokens af; v0 pint "exactly 3-5 colors, max 2 fonts, Tailwind-spacing only" en laat merk-governance via shadcn-registries lopen. AI vrijlaten op HTML en hem daarna terugfluiten bleek voor beiden onhoudbaar — het contract zit vóór de generatie.
- **Beide bouwden achteraf een gratis, deterministische edit-laag naast de chat**: Lovable "Visual Edits" en v0 "Design Mode" — element selecteren → getypte prop/token-wijziging, instant, zonder credits, kan de pagina niet breken. Gebruikers eisten credit-vrije micro-edits.
- **Checkpoint-per-AI-mutatie met restore-forward** is overal standaard (v0-versies, Bolt-checkpoints, Base44 per-prompt "Revert this"). Bolts les: iteratieve "fix"-loops op vrije code stapelen fouten ("na 6-8 pogingen slechter dan ervoor") — op een geschema'd sectie-tree zijn validatiefouten gestructureerd en fixes convergent.
- **Lovable draait een validatie-scan ín de publish-actie** (~10-15s security-scan per publish). Niemand doet mérk-validatie bij publish — dat is voor Branddock differentiatie, geen pariteit.
- **Gamma (dichtstbijzijnde analog)**: kaarten/secties-model, per-kaart AI-layout-keuze, workspace-thema's met brand-kit, publicatie als snapshot naar `<naam>.gamma.site`/custom domain met expliciete re-publish per pagina, ingebouwde engagement-analytics per kaart + API, en een **Generations API** (`POST /generations`: prompt + themeId + format → gehoste pagina). Wat Gamma mist: A/B, conversie-funnel, approval-flows, versie-rollback.
- **v0 Platform API**: "prompt in → productieklare code + live preview-URL uit" als embeddable dienst — het patroon voor een interne headless generation-API (relevant voor agents/Brandclaw en het bestaande MCP-plan M3).
- Anti-patroon: Bolts gesplitste hosting (bolt.host Pro + Netlify betaald voor custom domains) — houd publiceren single-stack.

**Bronnen (selectie)**: geleakte system-prompts Lovable/v0 (github x1xhlol mirror), docs.lovable.dev (visual-edit, publish, custom-domain), v0.app docs (design-mode, versions, deployments, platform-API + vercel/v0-sdk), stackblitz/bolt.new prompts.ts, docs.base44.com, help.gamma.app + developers.gamma.app (generations, analytics).

## 2. Spoor 2 — Marketing-suites (HubSpot, Unbounce, Instapage, Leadpages, Mailchimp, Klaviyo, Swipe Pages)

**Kernbevindingen**

- **Sectie-gebaseerd won het argument.** Unbounce (free-form pionier) bouwde de sectie-gebaseerde Smart Builder "based on landing page best practices"; Instapage legde Instablocks/Global Blocks over z'n canvas. Free-form overleeft als power-user-uitlaatklep voor pixel-perfect werk + custom code. Restdruk voor later: per-sectie style-overrides en een custom-HTML-sectietype.
- **HubSpots theme-settings zijn de blauwdruk voor merk-gebonden bewerken**: globale kleur/font/spacing-tokens, structuur vergrendeld in theme-gedefinieerde gebieden, secties→rijen→kolommen→modules als grammatica — architectonisch identiek aan Branddocks token+sectie-model, geprijsd op ~$450-500/mnd (Professional). HubSpots Brand Voice (AI-copy gebonden aan getrainde merkstem) is Branddocks eigen these in smaller vorm.
- **Table-stakes conversie-primitieven** (iedereen): formulier-blok + conversiedoel per pagina; lead-routing (minimaal webhook + Zapier, ideaal 3-5 native CRM/ESP-koppelingen; let op: Instapage eist ≤20s webhook-response); bedankboodschap/redirect; e-mail-leadnotificaties; views/conversies/conversieratio per pagina (zelfs Mailchimps gratis pagina's). Volgende ring: popups/sticky bars; **Dynamic Text Replacement** (URL-param → tekst-swap met fallback) is bijna gratis op een JSON-tree en een marquee PPC-feature.
- **Publish-ladder overal gelijk**: instant vendor-subdomein → CNAME custom domain met auto-SSL als betaalde stap (bewust als monetisatie/trust-hefboom ingezet: Unbounce laat het gratis subdomein zónder SSL, Mailchimp randomiseert de gratis URL, Klaviyo gate't custom domains).
- **Draft/live-scheiding met expliciete "Republish"-knop + versieherstel** is het verwachte contract (Unbounce Republish, Instapage oranje Update + History-checkpoints, HubSpot restore-as-draft + Content Staging op sandbox-domein).
- **A/B is de betaalmuur (+$50-100/mnd); AI-allocatie de premium-laag**: Unbounce Smart Traffic ($249, per-bezoeker ML-routing na ~50 visits, "~30% meer conversies"), Instapage AI Experiments, HubSpot adaptive testing (Enterprise, multi-armed bandit). Voor een prompt-first product is "genereer 3 on-brand varianten + auto-shift verkeer" de logische sprong.
- **Prijs op volume, niet op pagina's**: unlimited pages/metered visitors (Unbounce, Instapage) of unlimited traffic/metered domains (Leadpages). Instapages 30-paginacap wordt universeel als zwakte genoemd.
- **In-editor conversie-advies werkt** (Leadpages Leadmeter: live scoring op 14 best practices, templates gesorteerd op conversieratio) — Branddocks F-VAL + chat kan dit conversationeel én merk-gegrond.

**Bronnen (selectie)**: developers.hubspot.com (dnd-areas, themes), knowledge.hubspot.com (theme settings, smart content, adaptive testing, staging), documentation.unbounce.com (builders, webhook, DTR, republish, SSL), unbounce.com (Smart Traffic), help.instapage.com (publishing, webhooks, history), instapage.com (Instablocks, AdMap, heatmaps), leadpages.com (Leadmeter, pricing), mailchimp.com/help (blocks, URLs, reports), help.klaviyo.com (landing pages feb 2026, form A/B), swipepages.com (AMP-compile-at-publish).

## 3. Spoor 3 — Professionele visual-platforms (Builder.io, Framer, Webflow, Plasmic, Makeswift, Storyblok)

**Kernbevindingen (het architectuur-draaiboek)**

- **Twee kampen voor renderen**: compile-at-publish (Webflow: design → statische HTML/CSS/JS op Fastly, CMS-content in de HTML gebakken, "no database queries on page load"; Framer: meest-bezochte pagina's prerendered bij publish, rest on-first-request, daarna globaal gecached) versus SDK-rendert-JSON-runtime (Builder, Plasmic-loader, Makeswift, Storyblok). Builders eigen stelling — "hydration is pure overhead" (daarom bouwden ze Qwik/Partytown; "99% minder JS") — geldt maximaal voor marketingpagina's met ~nul interactie.
- **Framer is het referentie-publishmodel**: elke publish onveranderlijk + versioned; domeinen zijn *pointers naar versies*; staging = domein pinnen; rollback = repoint, instant. Webflows gebreken zijn de anti-patronen: single-page-publish zonder rollback (Enterprise-only), whole-site backup-restore als enige herstel, scheduled publishing zo beperkt dat third-party apps het gat vullen.
- **De component-registry is overal een formeel contract**: `registerComponent(stabiel-type-id, getypte inputs, defaults)`; Makeswift verbiedt expliciet ooit het `type`-id te wijzigen; Plasmic semvert publishes en vlagt renames/deleties van componenten/slots/tokens als breaking; Storyblok verplaatst schema's naar code als single source of truth (met TS-typegen). **Die schema's zijn tegelijk de tool-definities voor prompt-edits.**
- **Editor↔preview-protocol**: iframe + postMessage + JSON-patches (Builder), met Storybloks cruciale omgekeerde mapping — draft-renders dragen `_editable`/`_uid` per blok zodat klikken in de preview het juiste veld opent. Voor Branddock: `data-section-id`-provenance in de eigen render = click-to-select + scoping van prompt-edits ("herschrijf déze sectie").
- **Tokens = getypte variabelen als CSS custom properties**, met modes (Webflow Variables: zelfde token resolvet anders in light/dark/brand-thema) en strict mode (Builder `styleStrictMode`: editors kunnen alleen tokens kiezen). Expliciete keuze nodig: token-waarden **bevriezen per snapshot** (Webflow-stijl, behoudt immutabiliteit) of live verwijzen (één CSS-emit herstijlt alles); veiligste hybride: bevriezen bij publish + batch-"republish alles met nieuw thema".
- **Scheduling valt bijna gratis uit pointer-flip-publishing** (Builder: webhooks op go-live-moment; Storyblok: Releases/Pipelines).
- **Cache als versioned cache, niet als TTL**: Storybloks `cv`-parameter (cache-key bevat contentversie → publishes instant, hits perfect); Branddock-equivalent: ISR-tags keyed op `snapshotId` (immutable → cache forever), alleen de kleine slug→snapshot-pointer invalideren.
- **CWV wordt gewonnen/verloren op beeld-pijplijn + CSS-discipline**: Webflow genereert 7 responsive varianten + WebP/AVIF per upload, maar hun één-site-stylesheet groeit onbeperkt (340 KB render-blocking op een 200-paginasite). Branddock-voordeel: per pagina is exact bekend welke sectietypes gebruikt worden → **per-page critical CSS by construction**.

**Bronnen (selectie)**: builder.io docs (how-builder-works, content-API, design-tokens, scheduling, webhooks) + blogs (Qwik/Partytown, resumability), framer.com/help (hosting-infrastructure, staging-and-versions) + Grœnn/Goodspeed writeups, werun.dev Webflow-architectuur, help.webflow.com (variables, code components, page branching, single-page publish, backups), docs.plasmic.app (app-hosting, versioned-sync), docs.makeswift.com (registerComponent, publishing), storyblok.com docs (visual editor, cv-caching, releases/pipelines, image service).

## 4. Spoor 4 — Publish-/hosting-architectuur + gap-analyse Branddock

### 4.1 In-code geverifieerde gaps (Branddock vandaag)

| Gap | Bewijs | Ernst |
|---|---|---|
| **ISR werkt vermoedelijk niet op de publieke route** | `/p/[slug]/page.tsx` leest `searchParams` (`?workspace=`) — een Dynamic API die de route naar dynamische rendering schakelt; `revalidate = 3600` is dan zonder effect. Elke publieke view draait de volledige keten: 5-7 Prisma-queries + `assembleCanvasContext` + runtime React. Verifieer met `x-vercel-cache`-header; fix = workspace als pad-parameter (`/p/[workspace]/[slug]`) via de proxy-rewrite. | Hoog (kosten + latency, live) |
| **Geen versiehistorie/rollback** | `publishLandingPage` = upsert per `(workspace, locale, slug)` — elke publish overschrijft de snapshot; "immutable" geldt alleen t.o.v. draft-edits. | Hoog |
| **Snapshot is half-bevroren** | puckData (content) bevriest, maar brand-tokens worden per request live geresolved uit workspace-data — een styleguide-wijziging herstijlt stilzwijgend alle gepubliceerde pagina's. | Middel (semantiek + kosten) |
| **Geen formulier-sectie, geen lead-capture** | 0 hits op form/lead in de component-registry; CTA's zijn links. | Hoog (product) |
| **Geen meting op live pagina's** | 0 analytics/tracking in `/p/[slug]`. | Hoog (product) |
| **Geen preview-URL, geen scheduled publish, geen A/B** | Ontbreekt in schema + routes. | Middel |
| **Componenten zijn al statisch-compileerbaar** | `puck-config.tsx` regel 1: "GEEN 'use client' — pure render-functies"; één client-eiland (`AnchorNavClient`) mét no-JS-fallback. | — (kans, geen gap) |

### 4.2 Architectuurfeiten uit het spoor

- **AI-crawlers voeren geen JavaScript uit**: Vercel+MERJ maten 500M+ fetches — GPTBot 569M req/mnd, ClaudeBot 370M, nul bewijs van JS-executie; content moet in de initiële HTML. Branddocks RSC-pagina's zijn vandaag crawlbaar; statische compilatie maakt dat **structureel onregresseerbaar** en strookt met het GEO-verhaal. (llms.txt: bewust houden — kost niets — maar de evidentie voor citation-lift is zwak; wat aantoonbaar werkt zijn statistieken/quotes/citaties + extraheerbare structuur in de content, +30-41% AI-visibility per de Princeton GEO-studie — dat zit al in de generatie-kant.)
- **Statische compilatie is voor Branddock triviaal dichtbij**: flat sectie-JSON + tokens → `renderToStaticMarkup` → HTML + inline critical CSS → per versie in R2 → uitleveren; islands alleen voor interactieve widgets (accordion/form); geen framework nodig (Qwik/Astro-resumability is overkill voor marketingpagina's).
- **Vercel multi-tenant is de juiste schaal**: wildcard-subdomeinen via Vercel-nameservers; Pro soft-cap 100K custom domains; Domains **Registrar** API (nieuw; oude Domains API sunset nov 2025) maakt zelfs "koop je domein in Branddock" mogelijk. Cloudflare for SaaS ($0,10/hostname/mnd tot 50K) pas relevant op agency-schaal of bij serving uit R2/Workers.
- **Kostenprofiel**: gecachte/statische views kosten ~niets; elke dynamische render kost CPU + DB (Fluid: $0,128/uur actieve CPU; ISR-reads $0,40/1M) — de ISR-bug is dus ook een geldbug.
- **Forms op statische pagina's**: standaardpatroon = `POST` naar één endpoint (`/api/f/[formId]`), honeypot + timing-check + Turnstile + rate-limit, opslag per workspace + e-mail + webhook (Slack/Zapier/CRM); CORS-open zodat hetzelfde endpoint subdomein-, custom-domain-, zip-export- én WordPress-pagina's bedient.
- **WordPress als publicatiekanaal is bewezen** (Instapage-plugin: platform-gehoste pagina onder klant-URL; StoryChief: REST-push): Application Passwords (core sinds WP 5.6) + `POST /wp/v2/pages` met block-markup (v1 pragmatisch: één `wp:html`-blok met gecompileerde HTML), media side-loaden, als draft + preview-link. Past exact op de NL-MKB-doelgroep. Shopify: alleen via GraphQL Admin API (REST legacy), lagere prioriteit.
- **HTML-zip-export** is bijna gratis zodra de compiler bestaat — Framer biedt het niet, Webflow paywallt het en exporteert kapot (CMS/forms vallen weg): goedkoop anti-lock-in-signaal voor agencies.

**Bronnen (selectie)**: vercel.com (multi-tenant docs, limits, Registrar API changelog, AI-crawler-rapport, A/B edge middleware, instant rollback, ISR-guide), Netlify (atomic/immutable deploys, instant rollbacks), react.dev (renderToStaticMarkup), docs.astro.build (islands), Cloudflare for SaaS docs + pricing changelog, make.wordpress.org (Application Passwords), wordpress.org/plugins (instapage, story-chief), searchengineland/rumvision/Wix AI Search Lab (CWV/GEO/llms.txt-evidentie).

---

## 5. Geconsolideerde aanbevelingen (gerangschikt op waarde/inspanning)

| # | Aanbeveling | Waarde | Effort | Patroonbron |
|---|---|---|---|---|
| 1 | **ISR-bug fixen**: `/p/[workspace]/[slug]` pad-params i.p.v. `?workspace=`; on-demand revalidation primair (fallback-TTL dagen). Direct, los van alles. | Hoog | ~0,5d | Next.js ISR-docs |
| 2 | **Versioned publishes + pointer**: append-only `PagePublish` + `livePublishId`; rollback/republish = pointer-swap + revalidate; preview-URL per versie (signed token); scheduled publish = cron-pointer-flip. Bouw de publish-UI (die sowieso ontbreekt) meteen hierop. | Hoog | 2-3d | Framer versions, Netlify atomic deploys |
| 3 | **Formulier-sectie + leads-pijplijn**: form-sectietype + `/api/f/[formId]` (honeypot/timing/Turnstile/rate-limit) → submissions per workspace + e-mailnotificatie + webhook; conversiedoel per pagina. | Hoog | 4-6d | Table-stakes alle suites; staticforms-patroon |
| 4 | **Compile-to-static bij publish** (ná eigen render-loop E1): secties+tokens → `renderToStaticMarkup` + per-page critical CSS → R2 per versie → dunne serving; islands per interactieve sectie; tokens bevriezen per snapshot + batch-republish-optie. | Zeer hoog | 4-6d | Webflow/Framer compile-at-publish; Builder "hydration is overhead" |
| 5 | **Per-pagina analytics**: views/conversies (first-party, cookieloos) + dashboard per pagina; conversie = form-submit/CTA-doel. Voedt later de agent-loop. | Hoog | 2-3d | Alle suites; Gamma per-kaart-analytics |
| 6 | **Sectie-registry als versioned contract**: stabiele type-id's, Zod-schema per versie, load-time-migraties, breaking-change-detectie; schema's dubbelen als AI-tool-definities én compiler-input. | Hoog (fundament) | in E1/E2 | Makeswift/Plasmic/Storyblok |
| 7 | **Publish-gate met merkvalidatie**: F-VAL/brand-fit + link/SEO-checks als zichtbare, blokkeerbare stap in de publish-actie (PublishGate bestaat al als surface). | Middel-hoog | 1-2d | Lovable security-scan-per-publish; niemand doet bránd-validatie |
| 8 | **WordPress-publicatiekanaal (REST-MVP)**: site-URL + Application Password → draft-push van gecompileerde HTML + media-sideload + preview-link. | Hoog (commercieel) | 3-5d | Instapage/StoryChief |
| 9 | **DTR (dynamic text replacement)**: URL-param → tekst-swap met fallback op de sectie-tree; PPC-marquee-feature, bijna gratis op JSON. | Middel | ~1d | Unbounce/Instapage |
| 10 | **Edge A/B + AI-allocatie**: varianten = publish-rijen (uit #2) + middleware-cookie-bucket; daarna "genereer 3 on-brand varianten + auto-shift" als premium/agent-feature. | Middel (later hoog) | 2-3d + later | Vercel edge-A/B; Unbounce Smart Traffic ($249-tier) |
| 11 | **HTML-zip-export** (na #4): zelfde compiler, assets + werkend formulier naar #3-endpoint. | Middel | ~1d | Webflow-paywall-gat |
| 12 | **Custom domains v1 activeren** (bestaande `DomainMapping`-schema; bestaande post-launch-task): Vercel Domains/Registrar API; Cloudflare for SaaS pas op agency-schaal. | Hoog (monetisatie) | 1-2w | Alle suites (CNAME-ladder); bestaand task `web-page-builder-v2-custom-domains` |

**Wat het onderzoek afraadt**: richting code-generatie bewegen (credit-metered edits, breakage-loops, geen governance — de prijs die Lovable/Bolt/Base44 betalen); een zwaardere vendor-editor; gesplitste hosting over twee vendors; page-count-metering in pricing.

---

## 6. Betekenis voor het Puck-exit-besluit

Het onderzoek **versterkt de exit-ADR op elk punt** en voegt er een strategische verdieping aan toe:

1. **E1 (eigen render-loop) wordt belangrijker dan gedacht**: het is niet alleen de vervanging van Pucks `<Render>`, het is de **compiler-kern** voor statische publicatie, de zip-export en het WordPress-kanaal. Eén render-implementatie, vier afnemers (editor-preview, publieke route, compiler, export).
2. **E2 (eigen sectie-editor) krijgt een tweede bestaansreden**: het sectie-registry-contract (stabiele id's + Zod + tokens) dat de editor nodig heeft, is hetzelfde contract dat AI-tools, compiler en validatie nodig hebben — één schema, vijf afnemers.
3. **De "meer eruit halen"-winst zit in een nieuw Spoor P (publish-pijplijn)**: versioned publishes, statische compilatie, forms, analytics, kanalen. Zonder de exit was P2 (statisch compileren) onbereikbaar; mét de exit is het een logisch vervolg op E1.
4. Verwerkt in **verbeterplan v3** (`docs/specs/2026-08-07-webpage-builder-verbeterplan.md`): Spoor P toegevoegd, volgorde herzien (ISR-fix eerst), en de launch-context bewaakt (het publish-spoor mag `pricing-credits-billing` niet verdringen).
