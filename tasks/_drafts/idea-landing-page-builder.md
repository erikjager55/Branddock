---
id: web-page-builder-canvas-step
title: Web-page builder als Canvas Step 3 — Puck-renderer voor 5 web-page content-types + publish-flow
status: pending-tech
created: 2026-05-22
verdict: ready-to-build
spike-resolved: 2026-05-23
---

# Probleemstelling (1 zin)

Branddock heeft **5 web-page content-types** (`landing-page`, `product-page`, `faq-page`, `comparison-page`, `microsite`) die vandaag via Canvas-flow Markdown-output produceren maar geen drag-drop-editor en geen publishable HTML — waardoor klanten complete campagnes ontwerpen in Branddock (met brand-context geïnjecteerd via Brief → Strategy → Concept → Step 2 variants) maar daarna naar Webflow/HubSpot moeten om de pagina daadwerkelijk te bouwen + publiceren, waarbij brand-consistency op het kritiekste touchpoint verdampt.

# WHO — Doelgebruiker

**Rol**: marketing-manager bij MKB-merk (zonder eigen dev-team) of agency-medewerker die voor meerdere klanten campagnes uitvoert.
**Schaal**: 10 pilot-merken × 3-5 landing pages per launch-campaign = 30-50 pages in eerste 3 maanden post-launch. Schat-eindstaat: 1-3 published landing pages per actieve workspace per maand.
**Acuut segment**: pilot-merk Better Brands — zelf-bedienende launch-campagne zonder Webflow/HubSpot-licentie.

## JTBD-narratief

> "Ik had de Strategy + Concept + Canvas-flow gebruikt om een complete campagne te ontwerpen voor onze nieuwe productlancering. Canvas Step 2 leverde keurige variant-content met persona-pijnpunten in de copy, BrandVoice-tone in de headlines. In Step 3 zag ik een statische Markdown-preview met kleur-config-vakjes — geen drag-drop, geen layout-controle, geen publish-knop. Dus ging ik naar Webflow, overtypend hex-codes uit Brandstyle, plakkend copy uit Canvas. Een uur na launch realiseerde ik me dat de CTA-knop niet bij onze brand-tone paste, want Webflow heeft geen weet van BrandVoice."

## Evidence

- `tasks/marketing-site-pricing.md` (Track C, 1 week effort, open) — beschrijft "marketing site + pricing pagina" zonder concrete tool-keuze; team verliest tijd aan vendor-evaluatie tijdens launch-sprint
- `src/features/campaigns/lib/content-type-inputs.ts` lines 2209-2370 — 5 web-page content-types al geregistreerd (`landing-page`, `product-page`, `faq-page`, `comparison-page`, `microsite`), allemaal mappend naar `platform: 'web', format: 'landing-page'` — feature-vraag bestaat dus al, alleen render-laag ontbreekt
- `src/features/campaigns/components/canvas/previews/preview-map.ts` — vandaag dispatcht web-page types naar `LandingPagePreview` (statische Markdown-render, geen editor)
- `src/features/campaigns/components/canvas/medium/WebPageLayout.tsx` — bestaande Step 3 medium-config UI biedt alleen dropdowns (hero-style, CTA-type, layout-mode) zonder visuele layout-controle
- `src/lib/ai/canvas-context.ts` — `assembleCanvasContext(deliverableId, workspaceId)` levert al alle brand-data die een visual editor nodig heeft (brand-tokens, personas, products, brief, concept) — infrastructuur staat klaar
- `prisma/schema.prisma` Deliverable.settings is jsonb — kan Puck-data direct hosten zonder nieuwe tabel voor draft-state
- HubSpot-architectuur-benchmark (gesprek 2026-05-22) — bewijs dat marketers subdomain + custom-domain CNAME-pattern verwachten; concurrentie-positionering HubSpot Professional $450/mnd
- Concurrentie-research mei 2026 (Plasmic AGPL-blokker, Builder.io Fusion AI, GrapesJS SDK pricing-onzekerheid) — geen externe SaaS-builder past op Branddock's brand-context-first model zonder vendor-lock-in of license-risico
- Canvas-architectuur-audit 2026-05-22 — **Pattern B (override Step 3 Medium-renderer voor web-page category)** identificeerd als minimal-invasive integratie-pad
- `docs/adr/2026-05-22-landing-page-builder-architectuur.md` — architectuur-keuze gedocumenteerd: Pattern B + Puck MIT + Vercel + custom domain CNAME (v2)

# WHAT — Probleem (niet oplossing)

Vier waarneembare gebreken vandaag:

1. **Canvas Step 3 stopt bij statische preview voor web-page types** — `LandingPagePreview` rendert variant-content als read-only Markdown met config-vakjes (hero-style, CTA-type, layout-mode). Geen drag-drop, geen visuele layout-controle, geen custom sections toevoegen. Marketeer kan niet itereren op de visuele kant.
2. **Geen publish-flow uit Branddock** — Export-step produceert vandaag PDF/ZIP downloads. Geen "publiceer naar URL"-actie. Web-page types eindigen dus altijd buiten Branddock voor de daadwerkelijke landing.
3. **Brand-context verdampt buiten Branddock** — bij verlaten van de app naar Webflow/HubSpot moeten BrandStyle-kleuren handmatig overgenomen, BrandVoice-copy heroverwogen, en persona-quotes opnieuw geselecteerd. Brand-consistency degradeert op het kritiekste touchpoint.
4. **`marketing-site-pricing` (Track C) heeft geen tool-keuze** — taak ligt open zonder concrete bouwwijze; risico op ad-hoc Webflow-account of hand-gecodeerde Next.js pages die niet schalen naar pilot-klanten. Met Pattern B kan deze taak Branddock's eigen builder dogfood-testen.

# WHY-NOW

- **`vercel-deployment` (Track C) wordt nu actief** — middleware-routing + custom domain infrastructuur is gunstig nu te ontwerpen, eenmalig opzetten, post-launch features erbovenop bouwen
- **`marketing-site-pricing` is eerste use-case (dogfooding)** — Branddock's eigen marketing-site bouwen *met* deze builder valideert de DX vóór klant-rollout
- **Pilot-pitch (+5-7 weken vanaf 2026-05-18)** — "build + publish landing pages with your own brand-DNA" is een tastbare USP-anker tegen HubSpot
- **Architectuur-benchmark gevalideerd** — HubSpot-research 2026-05-22 bevestigt dat onze beoogde architectuur (subdomain default + CNAME custom domain + auto-SSL) industriestandaard is, geen exotische gok

Triggers:
- ADR landing-page-builder-architectuur geaccepteerd (2026-05-22)
- Vercel-deployment task wordt komende sprint geactiveerd
- Pilot-klant (Better Brands) heeft launch-campagne in voorbereiding waarbij landing-page-as-feature meerwaarde levert
- Concurrentie-research toont dat geen externe SaaS-builder past op Branddock's brand-context-first model zonder vendor-trade-offs

# SUCCESS METRICS

**Primaire metric**: % pilot-klanten die binnen 30 dagen na go-live ≥ 1 web-page publiceren via Branddock builder (over alle 5 web-page-types) ipv externe tool. **Doel: ≥ 60%** (6 van 10 pilot-merken).

**Secundair**:
- Time-to-publish van Canvas Step 3 open → live page ≤ 15 min voor pilot-klanten met bestaande Brandstyle + reeds-gegenereerde Step 2 variants
- Variant-to-Puck seed-fidelity ≥ 80% — variant-content uit Step 2 moet zonder hand-werk leiden tot een correcte initial Puck-data-tree (gemeten via "% van eerste Puck-tree's die zonder structural changes published wordt")
- Brand-token-injectie correctheid: 100% van `<BrandHero>` rendert met workspace's primaryColor + headingFont uit `CanvasContextStack` zonder user-override
- Stepper-flow-consistentie: 0 regressies op overige content-types (52 non-web-page types blijven via bestaande LandingPagePreview / GenericPreview / etc.)
- **AI-edit-acceptatie-ratio**: % van AI-changes (component-level + page-level) waar user "Accept" klikt in diff-preview. Doel: 50-70%. Onder 30% = AI-quality issue; boven 90% = preview-modal voegt weinig waarde toe (kan v2 worden gestreamlined)
- **Auto-iterate-uptake**: % pilot-klanten die ≥ 1 keer Auto-iterate hebben gebruikt op een page-edit. Doel: ≥ 40%

**Counter-metrics** (mag NIET kapotgaan):
- Render-latency p95 ≤ 1.5s op published pages (SEO-regression)
- Canvas Step 3 mount-time ≤ 500ms (huidige baseline) — Puck-editor mag de stepper-perceived-performance niet trekken
- Bundle-size hoofdapp ≤ 50KB extra (editor-route lazy-loaded — alleen geladen wanneer user op Step 3 van web-page type komt)
- Bundle-size publieke render-route ≤ 100KB JS gzipped
- Geen regression op `marketing-site-pricing` deadline — als builder vertraagt, fall-back naar hand-coded Next.js pages voor Branddock's eigen site

# CONSTRAINTS

## Hard
- **Tijd**: MVP within 6-8 weken voor 1 dev (4-6 wkn basis + 1-2 wkn diff-preview + 1 wkn auto-iterate-mapper) — `marketing-site-pricing` Track C kan eerste use-case worden zodra builder MVP-klaar is
- **Tech**: Next.js 16 App Router + React 19 + Prisma 7 + Tailwind 4 + bestaande Anthropic-client
- **Data**: page-content portable JSON (geen vendor lock), opslag in PostgreSQL jsonb-kolom
- **Legal**: AGPL vermijden (geen Plasmic Studio self-host als SaaS-aanbod)
- **Cost**: license-fee ≤ $50/mnd ongoing (geen Plasmic Enterprise / Builder.io white-label tier)

## Soft
- Hergebruik bestaande `workspace-resolver`, `auth`, `anthropicClient`, `getBrandContext()` (5-min cache)
- Maximaal 10 nieuwe NPM-dependencies (Puck + dependencies dichtbij dat budget)
- Brand-context-injectie via React context-provider, niet props-drilling
- Architectuur volgt vastgelegd in ADR `docs/adr/2026-05-22-landing-page-builder-architectuur.md`

## Must NOT do
- Geen A/B testing framework in MVP (post-launch, eigen ADR)
- Geen form-builder met CRM-koppeling in MVP
- Geen DNS-provider OAuth auto-write (GoDaddy/Cloudflare API) in MVP — handmatige CNAME-instructies volstaan
- Geen smart-content / per-visitor personalization in MVP
- Geen multi-language sites in MVP
- Geen email-rendering uit zelfde editor (defer aan `email-builder` separate task)
- Geen Plasmic Enterprise als fallback bij Puck-blocker — eerst spike-bevindingen evalueren
- Geen Puck Cloud-AI subscription ($25-150/mnd) — bouw eigen AI-orchestrator op `anthropicClient`
- Geen page-revision-history in MVP (Puck data is JSON, simpel later toe te voegen)
- Geen pre-launch positionering — dit is post-launch feature, niet kritiek-pad pilot

# SCOPE

## In-Scope (MVP, 6-8 weken na groene spike — incl. edit-paradigma 3 lagen + auto-iterate)

**Canvas-integratie (Pattern B)**:
1. **`PuckPageBuilder` component** in `src/features/campaigns/components/canvas/medium/` — vervangt `LandingPagePreview` voor `platform: 'web'` types
2. **Step 3 dispatcher-uitbreiding** in `preview-map.ts` — alle 5 web-page types (`landing-page`, `product-page`, `faq-page`, `comparison-page`, `microsite`) routen naar `PuckPageBuilder`
3. **`variantToPuckData()` seed-mapper** — zet Step 2 variant-output (Markdown sections) om naar initial Puck-data-tree
4. **Auto-save** naar `deliverable.settings.puckData` (jsonb) elke 30s tijdens editing
5. **Canvas-store uitbreiding** — `puckData` slice in `useCanvasStore`

**Brand-aware custom components (8 totaal)**:
- `<BrandHero>` — full-width hero, consumeert `contextStack.brand.style.primaryColor + headingFont`
- `<BrandCTA>` — CTA button in brand-tone, consumeert `contextStack.brand.voice.tone`
- `<FeatureGrid>` — 2/3/4-kolom layout met icons + brand-typography
- `<Testimonial>` — quote met persona-referentie uit `contextStack.personas`
- `<PricingTable>` — 2/3-kolom pricing-card
- `<FAQ>` — collapsible accordion
- `<Footer>` — workspace-brand-logo + social-links
- `<RichText>` — Markdown-based content-block

**Per-type templates (5 totaal — één per content-type)**:
- `landing-page`: hero + features + CTA + FAQ + footer
- `product-page`: hero + features + pricing + testimonials + CTA
- `faq-page`: hero + accordion-list + CTA
- `comparison-page`: hero + comparison-table + features + CTA
- `microsite`: hero + 3 content-sections + nav + footer

**Publish-laag**:
- `LandingPage` + `DomainMapping` Prisma models (zie ADR voor schema)
- Publish-API: `POST /api/landing-pages/publish { deliverableId, slug }` (custom-domain v2)
- Middleware-routing in `src/middleware.ts` voor `<workspace>.branddock.app/<slug>` subdomain-pattern
- Public render-route: ISR-cached Puck `<Render>` met snapshot uit `LandingPage.puckData`
- **Export-step uitbreiding**: nieuwe "Publiceer als webpagina"-actie naast bestaande PDF/Markdown export

**Edit-paradigma + AI-iteratie (3 lagen, beslist 2026-05-22)**:

*Laag 1 — Direct visual editing (Puck-native, standaard mee)*:
- Drag-drop componenten reorderen + add/remove
- Inline text-edit direct in canvas (Puck v0.21 native)
- Sidebar-fields voor text/textarea/select-waarden
- Component duplicate/delete/reorder
- Geen prompt nodig; werkt zoals Webflow/HubSpot

*Laag 2 — Component-level AI-edit (nieuw, met diff-preview)*:
- Context-menu actie per component: "Maak korter", "Schrijf formeler", "Genereer 3 alternatieven"
- `anthropicClient`-call met component-props + `contextStack.brand.voice` als payload
- **Diff-preview-modal verplicht vóór commit** (Optie B uit edit-paradigma-keuze): side-by-side dual-render van current vs proposed component, met accept/reject. Geen silent overwrites.
- Edit-distance signal getoond ("AI wil 42% van text wijzigen") als context bij review

*Laag 3 — Page-level AI-regeneration (hergebruik bestaande Branddock-patronen, in MVP)*:
- **Auto-iterate op page-niveau** — F-VAL judge ≥ 70 op gerenderde page; bij score < 70 voorstel rewrite. Hergebruik `/api/auto-iterate/trigger` infrastructuur met nieuwe mapper voor Puck-data
- **Strict-rewrite per page of selectie** — user kan specifiek vragen om herschrijven
- **Diff-preview verplicht ook hier** (visual dual-render van twee Puck-trees side-by-side, met component-level accept/reject zodat user partiële changes kan accepteren)
- **Regenerate via Step 2 variants** — terug naar variants-step, andere variant selecteren → re-seed naar Puck via `variantToPuckData()`. Expliciete confirm-modal want visual-edits gaan verloren bij re-seed
- **Lock-toggle per component** — handmatig-bewerkte components kunnen "locked" worden zodat AI-changes hen overslaan. Lock-state opgeslagen in puckData metadata (niet in component-props zelf)

**Diff-preview implementatie pattern**:
- Component-level: render Puck-component met current props naast Puck-component met proposed props in modal
- Page-level: render twee `<Puck.Preview>` instances side-by-side; per component een accept/reject-knop in overlay
- Edit-distance-meting via bestaande `src/lib/auto-iterate/edit-distance.ts` voor metadata-display
- Defense-in-depth (lessen uit gotchas 2026-05-17): `variantIndex` filter, don't-shrink guard via registry minWords, diagnostic logging op silent-returns

**Dogfooding**:
- Branddock's eigen `marketing-site-pricing` pagina gebouwd via deze builder als eerste use-case (vóór pilot-rollout)

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

- Custom domains (Vercel Domains API integration) — v2 post-MVP
- Toepassen Pattern B op niet-web content-categorieën (email, social, video, blog) — eigen evaluatie per category
- A/B testing — eigen ADR + task post-launch
- Edit-history / revision-log buiten Puck's in-session undo (v2)
- AI-prompt-library / saved-prompts per workspace (v2)
- Form-builder met CRM-koppeling — `forms-builder` separate task
- Smart-content / per-visitor personalization
- Email-rendering uit zelfde editor
- Multi-language sites (alleen workspace `contentLocale`)
- Page-revision-history binnen LandingPage (v2; Puck-data is JSON-snapshot, simpel later)
- Page-templates marketplace / community-templates
- Webhooks on publish (Slack/Discord/email-notify)
- Page-level analytics dashboard (PostHog default volstaat; embed iframe in v2)
- Sitemap.xml auto-generation per workspace (v2)
- Robots.txt customization per workspace (v2)
- Image-CDN optimization beyond Next.js `<Image>` default
- Custom font upload per workspace (gebruikt BrandStyle.headingFont/bodyFont, geen extra upload)
- White-label editor branding removal — Puck is MIT, geen branding zichtbaar in editor
- DNS-provider OAuth integraties (GoDaddy/Route53/Cloudflare/Namecheap)
- Plasmic-route activeren als Puck-blocker — separate beslissing post-spike
- Pre-launch implementation — dit is post-launch feature, geen pilot-kritiek-pad
- Step 1-2 wijzigingen (Context + Variants) — die blijven ongewijzigd; alleen Step 3 + Export raken we aan
- Aparte Builder-tab in workspace-nav — bewust niet; geen UX-breuk met stepper-flow
- Aparte AI-generation-prompt-UI buiten Step 2 — bestaande variants-generation produceert al brand-aware content

> Out-of-Scope > In-Scope: ✓ (22 vs 14)

# AANNAMES

> **STATUS UPDATE 2026-05-23**: spike uitgevoerd ([`docs/audits/2026-05-22-landing-page-builder-puck-spike.md`](../../docs/audits/2026-05-22-landing-page-builder-puck-spike.md)), browser-smoke groen. Alle spike-blocker aannames bevestigd.

- **A1 — Puck's `external` field-type ondersteunt custom React components** ✅ groen via `select` fallback (browser-smoke 2026-05-23). `external` field heeft typing-issue in v0.21.2 (`mapRow` mismatch) — `select` werkt voor enum-like keuzes; voor MVP bug-report-overweging voor complexe pickers.
- **A2 — Puck-editor is in te bouwen als child-component in Canvas Step 3** ✅ groen (browser-smoke 2026-05-23). Geen state-conflicten met `useCanvasStore`, Puck undo/redo werkt naast stepper-navigation.
- **A3 — `CanvasContextStack` via prop is bruikbaar binnen Puck render-functies** ✅ groen (impliciet bevestigd in spike — closure-capture pattern werkt).
- **A4 — `variantToPuckData()` mapper levert bruikbare seed-tree** ✅ groen (browser-smoke 2026-05-23 bevestigde correcte seed van BrandHero + BrandCTA uit Step 2 variants). MVP-uitbreiding (5 fixtures + 8 components + edge-cases) in task-file.
- **A5 — Branddock SPA-bundle blijft acceptabel** ⚠️ geschat 200-400 KB editor / 50-100 KB render (binnen targets), exacte meting in MVP-build.
- **A6 — Marketer-grade drag-drop UX in Puck v0.21 is voldoende** ✅ groen (browser-smoke 2026-05-23 — drag-drop, inline edit, plugin-rail werken in stepper-context).
- **A7 — HubSpot's CNAME-pattern werkt 1-op-1 op Vercel Domains API** ⚠️ docs-validated, niet hands-on getest. **Validatie in v2 (custom domains buiten MVP)**.
- **A8 — Dual-render Puck-trees voor diff-preview is performance-haalbaar** ✅ groen op component-level (browser-smoke 2026-05-23). Page-level dual-render is MVP-werk; mitigatie-strategy (memoized statisch render i.p.v. `<Render>`) gedocumenteerd in spike-memo voor MVP-fallback.
- **A9 — Auto-iterate `/api/auto-iterate/trigger` is uitbreidbaar voor Puck-data** ⚠️ niet getest in spike. Mapper-functie `puckDataToAutoIterateInput()` + F-VAL judge tuning voor HTML-output (vs Markdown) is MVP-werk.

> Spike-blocker aannames (A1, A2, A4, A6, A8) **alle groen**. A5, A7, A9 zijn MVP-werk. Verdict: **ready-to-build**.

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een workspace-member opent Canvas Step 3 voor een `landing-page` deliverable, When de step mount, Then `PuckPageBuilder` rendert (niet `LandingPagePreview`) met initial data uit `variantToPuckData(step2variant, contextStack)` — geen blank canvas
- [ ] Given dezelfde flow voor `product-page` / `faq-page` / `comparison-page` / `microsite`, When Step 3 mount, Then `PuckPageBuilder` rendert met de juiste per-type template als initial data
- [ ] Given Step 3 met `PuckPageBuilder`, When user sleept `<BrandHero>` op canvas, Then heading rendert in workspace's `BrandStyle.headingFont` + achtergrond is `BrandStyle.primaryColor` automatisch (zonder dat user kleur kiest) — brand-tokens uit `contextStack.brand`
- [ ] Given Step 3 met edits, When 30s na laatste edit verstrijkt, Then `deliverable.settings.puckData` is bijgewerkt in DB; bij re-openen van Step 3 wordt deze state hydrateerd (geen variant-seed-overschrijving)
- [ ] Given een geconfigureerde page in Step 3, When user navigeert naar Export-step en klikt "Publiceer als webpagina" met slug `my-launch`, Then `LandingPage` record wordt aangemaakt met snapshot van puckData + `status = PUBLISHED` + `revalidatePath('/p/my-launch')` aangeroepen
- [ ] Given een gepubliceerde page, When bezoeker `<workspace>.branddock.app/my-launch` opent, Then page rendert via ISR met TTFB ≤ 200ms (cold) en brand-tokens correct ingespoten in HTML/CSS
- [ ] Given user wijzigt deliverable.puckData in Step 3 ná publish, When publish niet opnieuw wordt getriggerd, Then de live URL toont oude snapshot (immutable per publish) — wijziging is alleen draft
- [ ] Given een non-web-page content-type (bv. `linkedin-post`, `blog-article`), When user Step 3 opent, Then bestaande `LandingPagePreview` / `GenericPreview` / overige renderers ongewijzigd functioneren (0 regressie)
- [ ] Given user rechtsklik op `<BrandHero>` → "Maak korter", When AI response binnenkomt, Then diff-preview-modal opent met side-by-side current vs proposed render + accept/reject buttons; bij reject blijft puckData ongewijzigd
- [ ] Given diff-preview-modal voor component-level edit, When user klikt "Accept", Then puckData wordt geüpdatet met proposed waarden + auto-save trigger; oude waarden zijn herstelbaar via Puck's in-session undo (Ctrl+Z)
- [ ] Given user klikt "Auto-iterate" op page-niveau, When F-VAL judge score < 70 oplevert, Then dual-render preview opent met huidige Puck-tree vs proposed Puck-tree + per-component accept/reject buttons; partial accept mogelijk
- [ ] Given een component is "locked" via lock-toggle, When auto-iterate of strict-rewrite draait, Then dat component wordt overgeslagen + zichtbaar gemarkeerd in diff-preview als "locked, niet gewijzigd"
- [ ] Given auto-iterate flow met minWords-constraint voor `landing-page` type, When AI-output zou onder de minWords-floor komen, Then de change wordt geweigerd + diagnostic log geschreven (defense-in-depth uit gotchas 2026-05-17)
- [ ] Given user navigeert terug naar Step 2 en kiest andere variant, When ze weer naar Step 3 gaan, Then confirm-modal verschijnt: "Visual edits gaan verloren bij re-seed — doorgaan?"; bij confirm: `variantToPuckData()` overschrijft puckData met nieuwe seed
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test: 5 web-page-types × 2 workspaces (Better Brands + LINFI) = 10 pages, alle publish + render correct
- [ ] Smoke-test: 3 non-web content-types (linkedin-post, blog-article, instagram-post) × 1 workspace = baseline-regressie-check, alle previews ongewijzigd
- [ ] Bundle-size: Step 3 mount-delta op web-page types ≤ 350KB JS gzipped (lazy-loaded), publieke render-route ≤ 100KB JS gzipped
- [ ] Branddock's eigen `marketing-site-pricing` pagina gebouwd met deze builder als dogfooding-bewijs

# EERSTE TAAK (morgen startbaar)

**Spike-task** (1-2 dagen): `tasks/_drafts/idea-landing-page-builder-spike.md` — A1+A2+A4+A6 validatie via PoC: bouw `PuckPageBuilder` als Step 3 Medium-renderer voor één type (`landing-page`), wire `contextStack`-prop + `variantToPuckData` seed-mapper + auto-save naar `deliverable.settings.puckData`. Bij groene spike → technical-planner promotion naar `tasks/web-page-builder-canvas-step-mvp.md`.

---

# Red Team Review

## Zwakste schakel

**A2+A4 samen** — als Puck-editor zich niet schoon laat inbouwen in Step 3 (state-conflicten met `useCanvasStore`, mount-cycle issues, Puck's internal undo/redo conflicteert met stepper-navigation) of als `variantToPuckData()` te brittle blijkt bij content-type variatie (5 types × 5 templates × variants-variation = veel edge-cases), dan staat de hele Pattern B aanpak onder druk. Fallback-opties: (a) Puck in iframe ipv inline component (UX-loss maar isolation gewonnen), (b) per-type custom componenten zonder mapper (meer hand-werk, geen AI-seed), (c) terug naar buy-route met Plasmic Enterprise. Spike-bevindingen sturen die beslissing.

## Pleidooi tegen dit plan

Pre-launch capaciteit is overspannen — `marketing-site-pricing` is 1 week effort, een full landing-page-builder is 4-6 weken. Voor de eerste use-case (Branddock's eigen marketing-site) is een builder overkill: hand-coded Next.js pages met bestaande Tailwind-componenten zijn binnen 1 week live + leveren betere SEO/performance dan een general-purpose builder. Pilot-feedback zou bovendien beter informeren welke component-types marketers daadwerkelijk willen — bouwen vóór feedback risk een "Field-of-Dreams" feature die niemand precies zo wil. Alternatief: **defer naar post-launch maand-1, gebruik in `marketing-site-pricing` hand-coded pages, en bouw builder met pilot-evidence**.

## Wat zouden we leren door NIET te bouwen

- Welke landing-page-templates marketers werkelijk gebruiken (product-launch / webinar / lead-gen / other)
- Welke component-types essentieel zijn vs nice-to-have (PricingTable bij elke pilot? Of alleen B2B-SaaS?)
- Of klanten überhaupt zelf willen bouwen vs Branddock-services laten doen (managed service als alternatief businessmodel)
- Of brand-context-injectie het *grootste* pijnpunt is, of dat tijd-tot-publish / template-keuze / forms-handling zwaarder weegt

Risico van uitstel: HubSpot-killer USP niet beschikbaar in pilot-pitch; concurrentie-positionering verzwakt voor 1-2 maanden.

## Verdict van de planner

**ready-to-build (2026-05-23)** — spike uitgevoerd 2026-05-22, browser-smoke groen 2026-05-23. Alle 5 spike-blocker aannames (A1, A2, A4, A6, A8) bevestigd. MVP task-file `tasks/web-page-builder-canvas-step-mvp.md` opgesteld voor post-launch fasering.

Vier voorbehouden gehonoreerd in MVP-task:
1. **Builder is post-launch feature, niet pre-launch** — `marketing-site-pricing` (Track C) gebruikt hand-coded Next.js pages als eerste use-case zonder builder. Builder komt na pilot-feedback.
2. **Custom-domain in v2** — MVP alleen subdomain-routing; Vercel Domains API + DomainMapping schema komt v2.
3. **Stepper-flow blijft heilig** — Pattern B is minimal-invasive maar mag absoluut geen regressie veroorzaken op de 48 non-web-page content-types die door dezelfde Step 3 dispatcher gaan. Smoke-test op niet-web types is acceptatiecriterium.
4. **Pattern B is template** — als web-page-integratie slaagt, kan dezelfde aanpak post-MVP op email-builder of social-canvas worden toegepast. Niet vooraf committeren maar pattern gedocumenteerd in ADR voor toekomstig hergebruik.

# 5-Punts Stop-Conditie

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (≥ 60% pilot-klanten ≥ 1 published page binnen 30 dagen)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (22 vs 14)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [x] Eerste taak morgen startbaar (spike-task 1-2 dagen)

# Volgende stap

**2026-05-23**: spike groen, idea-doc gepromoot naar `ready-to-build`. MVP task-file [`tasks/web-page-builder-canvas-step-mvp.md`](../web-page-builder-canvas-step-mvp.md) opgesteld met 5-phase breakdown (Foundation → Templates → Publish → Edit-paradigma → Page-level AI). Effort 6-8 wkn voor 1 dev, post-launch positionering. Wanneer post-launch sprint #8 of maand-1 capacity vrijkomt: kickoff MVP via task-file.

# Cross-references

- ADR: [`docs/adr/2026-05-22-landing-page-builder-architectuur.md`](../../docs/adr/2026-05-22-landing-page-builder-architectuur.md)
- Spike-task: [`tasks/_drafts/idea-landing-page-builder-spike.md`](idea-landing-page-builder-spike.md)
- Canvas-architectuur-audit (Pattern B referentie): gesprek 2026-05-22 + Explore-agent rapport
- Eerste use-case (zonder builder, hand-coded): [`tasks/marketing-site-pricing.md`](../marketing-site-pricing.md)
- Pre-launch dependency (vercel + middleware-infra): [`tasks/vercel-deployment.md`](../vercel-deployment.md)
- Concurrentie-research bron: gesprek 2026-05-22 (Plasmic AGPL, Builder.io Fusion, GrapesJS, HubSpot benchmark)
- Web-page content-types: `src/features/campaigns/lib/content-type-inputs.ts` lines 2209-2370
- Step 3 dispatcher: `src/features/campaigns/components/canvas/previews/preview-map.ts`
- Canvas-context assembly: `src/lib/ai/canvas-context.ts`
