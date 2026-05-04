# Branddock — Functionaliteitenoverzicht & Roadmap

> **Laatst bijgewerkt**: 4 mei 2026
> **Doel**: Volledig schema van huidige functionaliteiten t.b.v. grondige review
> **Bron**: CLAUDE.md (~206 voltooide actielijst-items)

---

## Inhoudsopgave

1. [Authenticatie & Multi-Tenancy](#1-authenticatie--multi-tenancy)
2. [Brand Foundation (Brand Assets)](#2-brand-foundation-brand-assets)
3. [AI Exploration (Universal)](#3-ai-exploration-universal)
4. [Personas](#4-personas)
5. [Products & Services](#5-products--services)
6. [Competitors Analysis](#6-competitors-analysis)
7. [Trend Radar](#7-trend-radar-vervangt-market-insights)
8. [Knowledge Library](#8-knowledge-library)
9. [Research & Validation](#9-research--validation)
10. [Brand Alignment](#10-brand-alignment)
11. [Business Strategy](#11-business-strategy)
12. [Brandstyle (Styleguide)](#12-brandstyle-styleguide)
13. [Workshops](#13-workshops-canvas-workshop)
14. [Interviews](#14-interviews)
15. [Campaigns](#15-campaigns)
16. [Content Library + Content Canvas](#16-content-library--content-canvas)
17. [Media Library + AI Trainer + AI Studio](#17-media-library--ai-trainer--ai-studio)
18. [Dashboard + Global Components](#18-dashboard--global-components)
19. [Settings](#19-settings)
20. [Help & Support](#20-help--support)
21. [Infrastructuur & Tooling](#21-infrastructuur--tooling)
22. [Niet aanwezig / Backlog](#22-niet-aanwezig--backlog)
23. [Technische Schuld](#23-technische-schuld)
24. [Roadmap](#24-roadmap)
25. [Open Beslissingen](#25-open-beslissingen)
26. [Genomen Beslissingen](#26-genomen-beslissingen)

---

## 1. Authenticatie & Multi-Tenancy

| Feature | Status | Locatie |
|---|---|---|
| Email/password login + register | ✅ | Better Auth, `lib/auth.ts` |
| OAuth (Google/Microsoft/Apple) | ✅ | Code compleet, vereist credentials |
| Session management | ✅ | Better Auth + Prisma adapter |
| Organization model (DIRECT/AGENCY) | ✅ | 4 rollen: owner/admin/member/viewer |
| Workspace switching | ✅ | Cookie-based, OrganizationSwitcher |
| Invite flow (token-based) | ✅ | Geen email-verzending |
| Developer-only autorisatie | ✅ | `DEVELOPER_EMAILS` env |
| Stripe billing | ❌ | Backlog |
| Email verzending (invites) | ❌ | Records aangemaakt, geen mail |

---

## 2. Brand Foundation (Brand Assets)

| Feature | Status |
|---|---|
| 12 canonical assets per workspace (auto-provisioned) | ✅ |
| Asset detail page (2-kolom layout, 8/4 split) | ✅ |
| Lock/unlock + ResourceVersion (universal versioning) | ✅ |
| PDF export (~590 regels jsPDF, 13 frameworks) | ✅ |
| Completeness berekening (server-side shared utility) | ✅ |
| 2-kolom sidebar (QuickActions, Completeness, Validation) | ✅ |

### 11 Framework Canvas Componenten

| Framework | Beschrijving |
|---|---|
| Purpose Wheel | IDEO model, 5 dimensies (Impact Type, Mechanism, Pressure Test) |
| Golden Circle | WHY/HOW/WHAT (Sinek) |
| Brand Essence | 8+ velden, identity-lens |
| Brand Promise | 11 velden (Keller/Aaker/Onlyness) |
| Mission Statement | Mission + Vision tension |
| Vision Statement | Future state articulation |
| Brand Archetype | 12 Jung archetypen, 25+ velden, 6 secties |
| Transformative Goals | BHAG/MTP, 5-sectie canvas, 19 completeness velden |
| Brand Personality | Aaker 5 dimensies + NN/g tone, 20+ velden |
| Brand Story | 18+ velden incl. audience adaptations |
| BrandHouse Values | Roots/Wings/Fire (BetterBrands.nl) |
| Social Relevancy | Vervangt ESG, 6-kaarten canvas (TBL/B Corp/SDGs) |

**Research methods**: Alleen `AI_EXPLORATION` actief. INTERVIEWS/WORKSHOP/QUESTIONNAIRE gedeactiveerd (code behouden).

---

## 3. AI Exploration (Universal)

| Feature | Status |
|---|---|
| Generic ExplorationSession systeem (per item type) | ✅ |
| Backend-driven config (13 records, auto-provisioned) | ✅ |
| Multi-provider (Anthropic Sonnet 4.6, OpenAI, Gemini) | ✅ |
| Custom Knowledge per config | ✅ |
| Field suggestions (accept/reject/edit) | ✅ |
| Resume IN_PROGRESS / view COMPLETED | ✅ |
| Admin UI (4-tab editor: General/Dimensions/Prompts/Knowledge) | ✅ |
| Item types ondersteund | persona, brand_asset (alle 12 frameworks) |

**Architectuur**: Config-driven dimensions, prompts, AI model selectie via `ExplorationConfig` Prisma model. Hardcoded fallbacks als safety net.

---

## 4. Personas

| Feature | Status |
|---|---|
| CRUD + lock + duplicate | ✅ |
| Detail page (hero header, 2-kolom, 4 sidebars) | ✅ |
| 3-tab create form | ✅ |
| Chat with persona (Claude Sonnet 4) | ✅ |
| AI Persona Analysis (4-dim, field suggestions) | ✅ |
| Strategic Implications (AI gegenereerd) | ✅ |
| Photo generation (Gemini + DiceBear fallback) | ✅ |
| PDF export | ✅ |

---

## 5. Products & Services

| Feature | Status |
|---|---|
| 22 categorieën in 5 groepen | ✅ |
| AI URL analyzer (Gemini 3.1 Pro + scraper, fallback via Gemini search grounding) | ✅ |
| AI PDF analyzer (Gemini, 20MB limit) | ✅ |
| Manual entry | ✅ |
| Inline edit detail page | ✅ |
| Persona koppeling (link/unlink) | ✅ |
| Product images (13 categorieën, max 20, auto-scrape) | ✅ |
| Lock/unlock | ✅ |

---

## 6. Competitors Analysis

| Feature | Status |
|---|---|
| URL analyzer (Gemini 3.1 Pro, 8-step modal) | ✅ |
| Manual entry | ✅ |
| Detail page (2-kolom, 5 secties + 4 sidebar) | ✅ |
| Refresh analysis (re-scrape + re-analyze) | ✅ |
| Linked products | ✅ |
| Lock/unlock | ✅ |

---

## 7. Trend Radar (vervangt Market Insights)

| Feature | Status |
|---|---|
| 4-tab dashboard (Sources/Feed/Alerts/Activate) | ✅ |
| Source CRUD + pause/resume | ✅ |
| 5-fase research pipeline (Query→Extract→Synthesize→Score→Judge) | ✅ |
| Multi-model (Gemini 3.1 Pro + Claude Sonnet 4.5) | ✅ |
| Auto-scrape images per trend | ✅ |
| Manual trend entry | ✅ |
| Activate/dismiss trends | ✅ |
| Cron route voor scheduled scans | ✅ |

---

## 8. Knowledge Library

| Feature | Status |
|---|---|
| 12 resource types, 9 categorieën | ✅ |
| Featured carousel | ✅ |
| Grid/List view + filters | ✅ |
| Add modal (Manual/URL Import/File Upload) | ✅ |
| Favorite/Archive/Featured toggles | ✅ |

---

## 9. Research & Validation

| Feature | Status |
|---|---|
| Research Hub (stats, methods, recommended actions) | ✅ |
| Bundles marketplace (10 bundles: 6 Foundation + 4 Specialized) | ✅ |
| Custom validation builder | ✅ |
| Pricing calculator | ✅ |
| Validation plans (DRAFT→PURCHASED→IN_PROGRESS) | ✅ |
| Studies tracking | ✅ |

---

## 10. Brand Alignment

| Feature | Status |
|---|---|
| AI-powered scanner (Claude Sonnet, 8-stap, 6 modules) | ✅ |
| AI fix-generatie (3 opties A/B/C met DB write-back) | ✅ |
| Issue management (severity, dismiss, resolve) | ✅ |
| ResourceVersion snapshots bij fixes | ✅ |
| Sidebar badge (open issues count) | ✅ |
| "Edit Manually" navigatie naar source entity | ✅ |

---

## 11. Business Strategy

| Feature | Status |
|---|---|
| 6 strategy types (Growth, Product Launch, Brand Building, etc.) | ✅ |
| OKR objectives + Key Results | ✅ |
| Focus Areas + Milestones (timeline) | ✅ |
| SWOT section | ✅ |
| AI Strategy Review (Claude) | ✅ |
| PDF Export | ✅ |
| Strategy Templates | ✅ |
| Linked campaigns | ❌ Stub |

---

## 12. Brandstyle (Styleguide)

| Feature | Status |
|---|---|
| Analyzer (URL/PDF, Gemini, 6-step polling) | ✅ |
| 6-tab styleguide (Logo/Colors/Typography/Tone/Imagery/Visual System) | ✅ |
| Visual Language detectie (Claude + CSS heuristics, 9 dimensies) | ✅ |
| Save for AI per sectie | ✅ |
| Hex extractie (8 CSS formats incl. oklch/lch/color-mix) | ✅ |
| Tailwind filtering (~270 framework colors) | ✅ |
| PDF export | ✅ |

---

## 13. Workshops (Canvas Workshop)

| Feature | Status |
|---|---|
| Purchase flow (bundles + individual + facilitator) | ✅ |
| Session UI (6-step, timer, bookmark, notes) | ✅ |
| Results (5-tab: Overview/Canvas/Details/Notes/Gallery) | ✅ |
| AI rapport generatie | ✅ |
| Research method cascade (gewicht 0.30) | ⚠️ Code aanwezig, gedeactiveerd |

---

## 14. Interviews

| Feature | Status |
|---|---|
| 5-step wizard (Contact/Schedule/Questions/Conduct/Review) | ✅ |
| Question templates (20, 5 categorieën) | ✅ |
| 5 question types | ✅ |
| Approve & Lock cascade (gewicht 0.25) | ⚠️ Code aanwezig, gedeactiveerd |

---

## 15. Campaigns

### Pipeline (Creative Quality Pipeline — CQP)

1. **Briefing Validation** — Claude, score-gated ≥80
2. **Strategy Foundation** — Deterministische frameworks (Cialdini/IPA/Sharp/Kahneman/EAST/BCT)
3. **Insight Mining** — 3 LLMs × 3 lenzen
4. **Creative Leap** — Goldenberg templates × bisociation domains, AI-driven selection
5. **Creative Debate** — Critic + Defense, max 3 rondes, quality gate ≥75 met early stop
6. **Strategy Build** — Concept-driven
7. **Hooks generation**
8. **Concept review**
9. **Journey elaboration**

### Features

| Feature | Status |
|---|---|
| 6-step wizard (campaign mode) + 5-step (content mode) | ✅ |
| 3 campaign types (Brand/Content/Activation) | ✅ |
| 16 goal types in 4 categorieën | ✅ |
| Per-element rating systeem (thumbs + comments) | ✅ |
| Concept comparison view (3-koloms) | ✅ |
| Quick concept mode (single Gemini Flash call) | ✅ |
| Multi-provider thinking (Claude extended_thinking, GPT reasoning_effort, Gemini thinkingConfig) | ✅ |
| Multi-source enrichment (Cialdini/IPA/Sharp/Kahneman/EAST/BCT lokaal + optioneel Are.na/Exa/Scholar) | ✅ |
| Feedback loop (regenerate met failed concepts) | ✅ |
| Light mode (Quick Pipeline) | ✅ |
| Strategy Result tabs (Timeline/Strategy/Channel Plan) | ✅ |
| Deployment timeline (drag & drop, persona lanes, flow connections, traffic lights) | ✅ |
| Deployment grid view (flat table, channel colors) | ✅ |
| Deliverables auto-populate vanuit blueprint | ✅ |
| Add Deliverable modal (auto-fill brief vanuit strategy) | ✅ |
| Calendar views + Gantt | ✅ |
| Stoplicht systeem (rood/oranje/groen) | ✅ |

---

## 16. Content Library + Content Canvas

| Feature | Status |
|---|---|
| Content Library (Grid/List/Calendar views) | ✅ |
| Filter pills (All/In Progress/Complete/Favorites) | ✅ |
| Content Canvas (3-panel: Context/Workspace/Preview) | ✅ |
| 8-layer context (brand/concept/journey/medium/brief/personas/products/type) | ✅ |
| Multi-model orchestratie (Claude text + DALL-E images) | ✅ |
| Type-specifieke prompts (53 templates: SOAPBOX/AIDA/Inverted Pyramid/etc.) | ✅ |
| Variant selectie (3 per group) | ✅ |
| Per-sectie editing (Medium tab) | ✅ |
| Inline TipTap editor (XSS sanitized) | ✅ |
| Inline AI transforms (rewrite/shorten/expand/improve) | ✅ |
| Brand Voice Directive (~300 tokens, system-wide) | ✅ |
| Tone checker (Claude + brand personality + personas) | ✅ |
| Content Type Specific Inputs (47 types × 2-6 velden, 6 categorieën) | ✅ |
| Approval flow (DRAFT→PENDING_REVIEW→APPROVED→PUBLISHED) | ✅ |
| Platform derivation | ✅ |
| 13 platform previews (LinkedIn/Instagram/Facebook/X/Email/Landing/Video/Podcast/etc.) | ✅ |
| Content Studio (oude module) | ❌ Verwijderd |

---

## 17. Media Library + AI Trainer + AI Studio

### MEDIA sectie (3 top-level items)

| Module | Sub-tabs | Status |
|---|---|---|
| Media Library | Library / Collections / Tags | ✅ |
| AI Trainer | AI Models / Voices / Sound Effects (BRAND_STYLE/STYLE/PHOTOGRAPHY/ANIMATION verborgen) | ✅ |
| AI Studio | Images / Videos | ✅ |

### AI Models (Consistent AI Models)

- Replicate Flux LoRA training (vervangt Astria.ai)
- 7 model types: Person, Product, Object, Style, Brand Style, Photography, Animation, Illustration
- Auto brand context resolution (per type)
- AI reference image generation (Imagen 4/DALL-E 3, 20→curate 10)
- Style analysis voor ILLUSTRATION (Claude Vision + node-vibrant + sharp, 50 params)
- Training progress indicator (3 plekken, queue detection)

### Brand Voices

- ElevenLabs TTS integratie
- Voice library browse (5-min cache)
- Generate audio sample (max 500 chars)
- TtsSettingsPanel (provider selector, voice browser)

### AI Images

- 5 providers: Imagen 4, DALL-E 3, Flux Pro v1.1, Recraft V3, Ideogram V2
- Smart provider questionnaire (3 vragen → score-matrix)
- Multi-model combinatie (max 3 LoRAs)
- Optimize Image (13 modellen in 5 categorieën)
- Send to Library + Link to Product

### AI Videos

- 5 fal.ai providers (Kling v3 Pro/Std, Veo 3.1 Fast, Seedance 2.0, LTX 2.0 Pro)
- Text-to-Video + Image-to-Video
- Send to Library

---

## 18. Dashboard + Global Components

| Feature | Status |
|---|---|
| Decision Readiness (gewogen 5-module %) | ✅ |
| Stats cards (5 KPIs, clickable) | ✅ |
| Attention list (max 5, priority sorted) | ✅ |
| Recommended Action (AI gegenereerd) | ✅ |
| Active Campaigns Preview | ✅ |
| Onboarding Wizard (3-step) | ✅ |
| Quick Start Widget (4-item checklist) | ✅ |
| Global Search (multi-module) | ✅ |
| Notifications (filter, mark read) | ✅ |
| Floating Chat Widget | ✅ |

---

## 19. Settings

| Tab | Status |
|---|---|
| Account (profile, password, email prefs, connected accounts) | ✅ |
| Team Management (members, invites, roles) | ✅ |
| Agency Settings | ✅ |
| Client Management | ✅ |
| Billing | ⚠️ UI klaar, geen Stripe |
| Notifications preferences | ✅ |
| Appearance | ✅ |
| AI Models (per-feature provider selection, 10 features) | ✅ Developer-only |
| AI Configuration (Exploration configs CRUD) | ✅ Developer-only |

---

## 20. Help & Support

| Feature | Status |
|---|---|
| Search + Quick tags + Action cards | ✅ |
| Browse by topic | ✅ |
| Video tutorials | ✅ |
| FAQ accordion + feedback | ✅ |
| Contact support + Submit request | ✅ |
| System status, Feature requests, Platform rating | ✅ |

---

## 21. Infrastructuur & Tooling

| Component | Status |
|---|---|
| Server-side cache (in-memory Map, TTL, prefix invalidation) | ✅ |
| Rate limiter (3 tiers: FREE/PRO/AGENCY) | ✅ |
| Brand context aggregator (5 modules, 5-min cache) | ✅ |
| Multi-provider AI (OpenAI/Anthropic/Gemini singleton clients) | ✅ |
| Multi-provider retry logic | ✅ |
| Universal versioning (ResourceVersion polymorphic) | ✅ |
| Storage provider (R2 + lokaal) | ✅ |
| PDF parsing (unpdf, geen worker) | ✅ |
| URL scraper (cheerio + SSRF protection + Gemini fallback) | ✅ |
| Playwright E2E tests | ✅ |
| Performance benchmarks (CLS, LCP, sidebar nav) | ✅ |

### Tech Stack

- **Framework**: Next.js 16.1.6 (hybride SPA), React 19
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL 17, Prisma 7.4
- **Auth**: Better Auth (emailAndPassword, Prisma adapter, organization plugin)
- **State**: Zustand 5 (~30 stores), React Context (~12 providers)
- **Data fetching**: TanStack Query 5
- **Icons**: Lucide React 0.564
- **AI**: OpenAI + Anthropic + Google Gemini

### Schaal

- 76+ Prisma modellen
- ~28 enums
- ~250+ API endpoints
- ~15 features met eigen feature directory

---

## 22. Niet aanwezig / Backlog

- Stripe billing (UI klaar, geen integratie)
- Email verzending (invites/notifications) — Resend SDK al geïnstalleerd
- OAuth productie credentials (code klaar)
- Server-side rendering
- Externe integraties Tier 1-5 (zie Roadmap > INT)
- Sentry monitoring + PostHog analytics
- Vercel deployment

---

## 23. Technische Schuld

| Schuld | Impact | Voorgestelde aanpak |
|---|---|---|
| Adapter pattern (DB→mock format) | Medium | Vervang per module door direct DB-model |
| 146 `: any` annotations in 68 bestanden | Medium | Type-safety pass |
| Orphaned golden-circle API routes | Laag | Verwijder (geen frontend callers) |
| BrandAssetVersion Prisma tabel | Laag | Drop tabel (data preservation) |
| ExplorationConfig hardcoded fallbacks | Laag | Alleen relevant buiten admin route |
| Research methods (3/4) gedeactiveerd | Medium | Re-activate via `ACTIVE_RESEARCH_METHOD_TYPES` |

---

## 24. Roadmap

### Status legenda

- ✅ Volledig
- 🚧 In progress
- 📋 Pending / Geplanned
- ⏸️ Uitgesteld
- ❌ Niet gestart

### R0-S9: Voltooide Sprints

| Sprint | Naam | Status |
|---|---|---|
| R0 | Retroactieve Foundation (R0.1-R0.9) | ✅ |
| S1 | Brand Asset Detail + AI Brand Analysis | ✅ |
| S2a | Canvas Workshop | ✅ |
| S2b | Brandstyle + Interviews + Golden Circle | ✅ |
| S3a | Business Strategy | ✅ |
| S3b | Personas | ✅ |
| S4 | Products & Services + Market Insights | ✅ |
| S5 | Knowledge Library + Research & Validation | ✅ |
| S6 | Campaigns + Content Library + Content Studio | ✅ |
| S7 | Brand Alignment | ✅ |
| S8 | Dashboard & Global Components | ✅ |
| S9 | Settings + Help & Support | ✅ |
| PLS | Pattern Library Sprint | ✅ |
| PSR | Persona Restyling & AI Features | 🚧 (34/52 prompts) |
| AE | AI Exploration Sprint | ✅ |
| BAD | Brand Asset Detail Sprint | ✅ |
| PW | Purpose Statement IDEO Verbetering | ✅ |
| TR | Trend Radar (vervangt Market Insights) | ✅ |
| I18N | Codebase English Translation | ✅ |
| FBA | Vaste Set Brand Assets per Workspace | ✅ |
| BA | Brand Archetype Asset | ✅ |
| COMP | Competitors Analysis | ✅ |

### S10-S12: Production Ready

| Sprint | Naam | Status |
|---|---|---|
| S10 | Stripe Billing (checkout, webhooks, plan enforcement, agency model) | ❌ |
| S11 | OAuth + E2E + Performance | ✅ Fase A Done |
| S12 | Deployment (Vercel) + Monitoring (Sentry) + Analytics (PostHog) | ❌ |

### INT: Externe Integraties (keuze pending)

#### Tier 1 — Direct implementeren (hoog ROI, lage inspanning)

| ID | Integratie | Doel | Kosten |
|---|---|---|---|
| INT.1 | Resend (Email API) | Invite flow, notificatie-emails | Gratis 3K/maand |
| INT.2 | Perplexity Sonar API | Real-time web search met citaten | ~$1/M tokens |
| INT.3 | Pexels API | Stock foto's + video's | Gratis |
| INT.4 | Brandfetch | Logo's, kleuren, fonts (60M+ merken) | $99/maand |
| INT.5 | Ayrshare | Unified social publishing (15+ platforms) | Vanaf $10/maand |
| INT.6 | OpenAI Image / Imagen 4 | Beeldgeneratie in Content Studio | $0.02-0.19/beeld |

#### Tier 2 — Hoge strategische waarde (gemiddelde inspanning)

| ID | Integratie | Doel | Kosten |
|---|---|---|---|
| INT.7 | HubSpot CRM + Marketing Hub | Persona validatie, ROI tracking | Gratis CRM |
| INT.8 | Google Analytics 4 | Content performance tracking | Gratis |
| INT.9 | DataForSEO | SERP, keywords, backlinks | ~$0.60/1K SERPs |
| INT.10 | Writer.com | AI Brand Voice (Knowledge Graph RAG) | $0.60/1M tokens |
| INT.11 | Canva Connect API | Brandstyle sync, visuele verfijning | Gratis |
| INT.12 | Typeform | Survey & Research | Gratis 10 resp/maand |
| INT.13 | Slack | Real-time alerts | Gratis |
| INT.14 | WordPress REST API | One-click publishing | Gratis |

#### Tier 3 — Bouwen bij vraag

| ID | Integratie | Status |
|---|---|---|
| INT.15 | ElevenLabs (AI Audio) | ✅ Geïmplementeerd |
| INT.16 | Marker API (Document Parsing) | 📋 |
| INT.17 | Visualping (Website Monitoring) | 📋 |
| INT.18 | Meta Marketing API (Ads) | 📋 |
| INT.19 | Semrush (SEO) | 📋 |
| INT.20 | Shopify GraphQL | 📋 |
| INT.21 | Asana / Linear (PM) | 📋 |
| INT.22 | Audiense (Audience Intelligence) | 📋 |
| INT.41 | Apify (Web Scraping) | 📋 |

#### Tier 4 — Niet aanbevolen

- ⏸️ Buffer (API gesloten), Brand24 (te duur), SparkToro (geen API), Attest (geen API), The Color API (overlap), Microsoft Clarity (verkeerde use case), Clarity.ai (enterprise-only), Mailchimp (overlap HubSpot), Figma REST API (read-only), Frontify/Bynder (enterprise)

#### Tier 5 — Public API Kandidaten

| ID | API | Module | Kosten |
|---|---|---|---|
| INT.33 | NewsAPI | Trend Radar | 500 req/dag gratis |
| INT.34 | GNews | Trend Radar | 100 req/dag gratis |
| INT.35 | Unsplash | Content Studio + personas | 50 req/uur gratis |
| INT.36 | Clearbit Logo API | Competitor logos | Gratis |
| INT.37 | Markerapi | Trademark check | Gratis |
| INT.38 | JSON2Video | Video generatie | Betaald |
| INT.39 | Aylien Text Analysis | Sentiment + NLP | Betaald |
| INT.40 | Colormind | Kleurenpalet AI | Gratis |

**Architectuur-aanbeveling**: Bouw een Integration Hub (`src/lib/integrations/`, `IntegrationConfig` Prisma model, generieke OAuth handler + webhook receiver, Settings > Integrations UI) voordat individuele integraties worden gebouwd.

### PSR: Persona Restyling — Open Items

| Item | Status |
|---|---|
| PSR.6: Layout Optimalisatie Fase 2 | 📋 6 prompts pending |
| PSR.7: AI Persona Analysis Redesign | 📋 4 prompts pending |
| PSR.8: Foto Generatie Fix | 📋 |

---

## 25. Open Beslissingen

| Beslissing | Opties |
|---|---|
| Agency pricing | Per seat / per workspace / flat tiers |
| Gratis tier limieten | TBD |
| Workspace isolatie | Soft (filter op orgId) vs hard (row-level security) |
| Agency white-label | Eigen logo/domein vs alleen Branddock branding |
| Deployment | Vercel / Railway / self-hosted |

---

## 26. Genomen Beslissingen

| Onderwerp | Beslissing |
|---|---|
| Auth provider | Better Auth (open-source, native Prisma) |
| Organization model | Better Auth organization plugin op bestaande tabellen |
| Role storage | String (lowercase), validatie in applicatielaag |
| Workspace resolution | Cookie > activeOrganizationId > first workspace > org > env |
| Workspace switching | Cookie `branddock-workspace-id` |
| Password hashing | scrypt via better-auth/crypto |
| AI Exploration architectuur | Generic systeem met DB-driven config + hardcoded fallbacks |
| Template engine | `{{variable}}` syntax, geen externe library |
| Multi-provider AI | Generic caller met provider string, singleton clients |
| AI providers in gebruik | OpenAI (content) + Anthropic Sonnet 4.6 (exploration/chat/analysis) + Gemini 3.1 Pro (product/foto) |
| Foto generatie | Gemini primair, DiceBear fallback |
| Product analysis | Gemini 3.1 Pro via `@google/genai` SDK |

---

## Referenties

- **PATTERNS.md** — UI primitives, verboden patronen, design tokens (verplicht lezen)
- **CLAUDE.md** — Volledige actielijst met implementatie-details
- **TODO.md** — 8 fases, ~146 items prioriteringsroadmap
- **gotchas.md** — Lessons learned per sessie
- **Figma**: https://www.figma.com/make/WTXNV6zhzsTyYLUOdkFGge/Branddock
- **GitHub ref**: https://github.com/erikjager55/branddock-figma-reference
- **Notion Backlog**: b7dc92fa-1455-440a-845f-2808f409a9b9
- **HANDOVER-BETTER-AUTH.md** — Better Auth implementatie + Fase B plan
- **ROADMAP-API-EN-AGENCY-MODEL.md** — Gedetailleerd plan API laag + agency model

---

## Review Checklist

Gebruik dit document om de volgende gebieden te evalueren:

- [ ] **Architectuur consistentie** — Volgen alle modules de feature directory pattern (components/hooks/stores/api/types/constants)?
- [ ] **Adapter pattern** — Welke modules kunnen direct DB-model gebruiken zonder breaking changes?
- [ ] **AI cost optimization** — Zijn alle pipelines geoptimaliseerd voor token gebruik (gelaagde brand context)?
- [ ] **Performance** — CLS/LCP benchmarks, sidebar nav responsiveness
- [ ] **Type safety** — 146 `: any` annotations elimineren
- [ ] **Cache invalidation** — Alle mutaties invalideren juiste prefixes
- [ ] **Error handling** — Loading + error states in alle UI componenten
- [ ] **Workspace isolatie** — Alle API routes valideren workspace ownership
- [ ] **AI fallbacks** — Graceful degradation bij API failures
- [ ] **Mobile responsiveness** — Pattern compliance per pagina
- [ ] **Accessibility** — ARIA labels, keyboard navigation, focus management
- [ ] **Test coverage** — Playwright E2E voor kritieke flows
- [ ] **Design tokens compliance** — Geen hardcoded Tailwind colors waar tokens beschikbaar zijn
- [ ] **Documentatie** — JSDoc op exported functies/componenten
