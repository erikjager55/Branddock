# Branddock — Onderzoekssamenvatting

## 1. Wat is Branddock?

Branddock is een SaaS-platform voor **brand strategy, research-validatie en AI-gestuurde content generatie**. Het positioneert zich als een geïntegreerde werkplek waarin merkstrategen, agencies en marketingteams (a) een merkfundament bouwen, (b) dat fundament valideren met onderzoek, en (c) op basis daarvan campagnes en content produceren met AI die de merkcontext begrijpt.

Voorheen bekend als *Brandshift.ai* / *ULTIEM*. Huidige naam: **Branddock**.

**Kernpropositie:** AI-content die niet generiek is, maar getraind op het volledige merkdossier (waarden, archetype, persoonlijkheid, persona's, producten, concurrenten, trends, visuele taal).

---

## 2. Doelgroepen en Bedrijfsmodel

Branddock ondersteunt twee organisatie-types via een multi-tenant architectuur:

- **Direct customer** (`Organization.type = DIRECT`): één bedrijf dat zijn eigen merk beheert.
- **Agency** (`Organization.type = AGENCY`): een bureau met meerdere medewerkers dat workspaces beheert voor verschillende klanten.

**Rolmodel:** OWNER, ADMIN, MEMBER, VIEWER (lowercase strings, niet enum).
**Workspace-isolatie:** alle data is gescoped per `workspaceId`, opgelost via sessie (`activeOrganizationId` → workspace-resolver).

---

## 3. Architectuur (op hoofdlijnen)

| Laag | Keuze | Reden |
|---|---|---|
| Framework | Next.js 16.1.6 | App Router voor API routes, hybride SPA voor UI |
| UI-routing | Client-side via `activeSection` state in `App.tsx` | Snelle navigatie, geen full page reloads |
| Database | PostgreSQL 17 + Prisma 7.4 | 76+ modellen, 28+ enums |
| Auth | Better Auth (email + OAuth Google/Microsoft/Apple) | Open-source, native Prisma, organization plugin |
| State | Zustand (18 stores) + TanStack Query 5 | UI-state lokaal, server-state in Query |
| Styling | Tailwind CSS 4 + design tokens | Single source of truth in `design-tokens.ts` |
| AI | Multi-provider (Anthropic Claude / OpenAI / Google Gemini / fal.ai / Replicate / ElevenLabs) | Per feature de beste keuze |

**Belangrijk architectuurprincipe:** *adapter pattern* tussen DB en UI om migraties geleidelijk te doen — DB-modellen worden gemapped naar bestaande mock-formaten via `*-adapter.ts`-bestanden.

---

## 4. Functionele Modules

Branddock bestaat uit ~15 hoofdmodules, elk met eigen schema, API, state en UI. De pipeline is bewust opgezet als trechter van strategie → validatie → activatie:

### A. Brand Foundation (12 vaste assets per workspace)
Canonical set van merk-assets die automatisch wordt aangemaakt bij workspace-creatie:
1. Purpose Wheel (IDEO-model)
2. Golden Circle (Sinek)
3. Brand Essence
4. Brand Promise (Keller / Aaker / Neumeier)
5. Mission Statement
6. Vision Statement
7. Brand Archetype (12 Jungiaanse archetypen)
8. Transformative Goals (BHAG / MTP / Brand Ideal)
9. Brand Personality (Aaker 5-dim + NN/g tone)
10. Brand Story
11. BrandHouse Values (Roots/Wings/Fire model)
12. Social Relevancy (TBL / B Corp / Brand Activism, vervangt ESG)

Elk asset heeft een eigen canvas-component, AI Exploration-flow en field suggestions.

### B. Brandstyle (Visual Identity)
Geautomatiseerde extractie uit URL of PDF: logo, kleuren (incl. moderne CSS-formaten zoals `oklch`), typografie, tone of voice, imagery, **Visual System** (vormentaal, corners, shadows, lines, spacing).

### C. Personas (3-tab create + AI-analyse)
20+ velden per persona, 4-dimensie AI-analyse, persona-chat met Claude Sonnet, strategic implications generator, AI-foto-generatie (Gemini + DiceBear fallback).

### D. Products & Services
22 categorieën in 5 groepen, AI URL/PDF analyse via Gemini 3.1 Pro, ProductImage-model met 13 categorieën, automatische image-scraping (max 20 per product), persona-koppeling.

### E. Competitors
Tier (DIRECT/INDIRECT/ASPIRATIONAL), AI URL-analyse via Gemini, 5 secties (Company/Positioning/Offerings/SWOT/Brand Signals), competitive score, product-koppeling.

### F. Trend Radar (vervangt Market Insights)
Eigen 5-fase research pipeline (Query → Extract → Synthesize → Score → Judge). Bronnen-management (RSS/web), automatische scans, image-scraping, dedup via sha256, 4-tab dashboard (Sources/Feed/Alerts/Activate).

### G. Knowledge Library + Research & Validation
Resources (12 types: book/podcast/article/etc), Research Bundles (10 voorgedefinieerd), Custom Validation Plans met pricing calculator, Research Studies tracking.

### H. Brand Alignment
AI-aangedreven 8-stap scan over 6 modules met Claude Sonnet, 3 fix-opties per issue (A/B/C), AI fix-generatie met DB write-back via $transaction + ResourceVersion-snapshots.

### I. Business Strategy (OKR)
6 strategy types, Objectives + Key Results + Milestones, focus areas, multi-segment progress bars, AI strategy review, PDF export, SWOT.

### J. Campaigns (Effie-quality pipeline)
**Creative Quality Pipeline (CQP)**: Insight Mining (3 LLMs × 3 lenzen) → Vote → Creative Leap (Goldenberg template × bisociatie-domein) → Creative Debate (Critic vs Defense, max 3 rondes met quality gate ≥75) → Concept Visuals (fal.ai Flux 2 Pro met LoRA's) → Strategy Build → Hooks & Refinement → Journey Elaboration.

Onderbouwd door: Effie Awards, Goldenberg's 8 creativity templates (89% van award-winnende ads), Koestler's bisociation, Heath & Heath SUCCESs, Binet & Field IPA, Byron Sharp, Cialdini, Kahneman framing, BCT (Behavior Change Techniques).

15 campaign goal types in 4 categorieën, 3 campaign types (Brand/Content/Activation), 47 deliverable types met type-specifieke quality criteria + constraints + export formats.

### K. Content Canvas
3-panel workspace voor content-generatie: 4-laags context stack (brand/concept/journey/medium), multi-model orchestratie, variant-selectie, 13 platform-specifieke previews (LinkedIn/Instagram/Email/Landing/etc), approval flow, cross-platform derivatie.

### L. Media (3 hoofdsecties: Library / AI Trainer / AI Studio)
- **Media Library**: assets, collections, tags, ProductImages, brand voice samples
- **AI Trainer**: Consistent AI Models via Replicate (LoRA fine-tuning), Brand Voices (ElevenLabs TTS), Sound Effects
- **AI Studio**: Image generation (5 providers: Imagen 4, DALL-E 3, Flux Pro, Recraft V3, Ideogram V2) + Image optimization (13 modellen) + Video generation (5 fal.ai providers: Kling, Veo, Seedance, LTX, etc.)

### M. Dashboard
Decision Readiness % (gewogen 5-module score), 5 KPI cards, Attention items, AI Recommended Action, Active Campaigns Preview, Quick Start checklist (4 items), Onboarding wizard.

### N. Settings (Account / Team / Billing / Notifications / Appearance / Developer)
Developer-sectie afgeschermd via `DEVELOPER_EMAILS` env var (per-feature LLM provider selectie + AI Exploration Configuration).

### O. Workshops & Interviews
Canvas Workshop met purchase flow (3 bundles), 6-stap sessie, AI rapport, 5-tab results. Interview wizard met 5 stappen + 20 question templates.

---

## 5. AI-Strategie

### Multi-provider per use case
| Provider | Modellen | Hoofdgebruik |
|---|---|---|
| Anthropic | Claude Sonnet 4.5, Opus 4.6 | Exploration, Personas chat, Brand Alignment, Variant A campaign |
| OpenAI | GPT-4o, GPT-5.4, DALL-E 3 | Content generation (variant B), images |
| Google | Gemini 3.1 Pro / Flash, Imagen 4 | Product/Competitor analyse, Trend signals, Variant C, images |
| fal.ai | Flux Pro 1.1, Flux 2 Pro, Recraft V3, Kling, Veo 3.1 | Image en video generatie |
| Replicate | Flux LoRA trainer | Custom AI models (consistent personen/producten/illustraties) |
| ElevenLabs | TTS | Brand voice samples |

### Per-feature model-selectie (workspace setting)
10+ AI-features hebben configureerbare provider+model in `WorkspaceAiConfig`. Whitelist-validatie (`assertProvider`), default fallback per feature.

### Backend-driven Exploration Configuration
13 ExplorationConfigs in DB (1 persona + 12 brand-assets). Per config: prompts, dimensies, AI model, custom knowledge library. Auto-provisioning bij eerste GET call. Admin UI met list/detail pattern + 4 tabs.

### Brand Context Injection (4-laags)
Alle AI-prompts ontvangen automatisch brand context via `getFullBrandContext()`:
1. **Brand layer**: assets, archetype, personality, voice, visual system
2. **Concept/Strategy layer**: campaign blueprint, journey, persona's
3. **Medium layer**: platform-specifieke constraints en best practices
4. **Brief layer**: deliverable-specifieke briefing

Met **gelaagde tier-systeem** (full / medium / light / summary) om token-gebruik te optimaliseren.

### 3-Variant Deep Thinking Pipeline (Campaign Strategy)
Parallelle generatie met provider-specifieke deep thinking:
- Variant A: Claude Opus + `extended_thinking`
- Variant B: GPT-5.4 + `reasoning_effort: 'high'`
- Variant C: Gemini 3.1 Pro + `thinkingConfig`

Met retry-logica per provider, multi-round debate, persona-validatie met creatieve scores (originality/memorability/cultural relevance/talkability), automatische selectie van Goldenberg templates × bisociatie-domeinen.

### Externe Enrichment (opt-in)
- **Are.na** API (culturele context)
- **Exa** (neural search, creatieve provocaties)
- **Semantic Scholar** (academic citations)
- Lokale frameworks (default-aan): Cialdini, IPA Effectiveness, Byron Sharp, Kahneman framing, EAST checklist, BCT, MINDSPACE

---

## 6. Data Model (hoogtepunten)

- **76+ Prisma-modellen**, **28+ enums**
- **Universal Versioning** via polymorf `ResourceVersion`-model (vervangt module-specifieke versie-tabellen)
- **Multi-tenant**: alles gescoped op `workspaceId` + `Organization` met `OrganizationMember` + `WorkspaceMemberAccess`
- **Auth tabellen** (Better Auth): `Session`, `Account`, `Verification`, met `activeOrganizationId` op Session
- **AI Exploration**: `ExplorationSession`, `ExplorationMessage`, `ExplorationConfig`, `ExplorationKnowledgeItem`
- **Server-side cache** in-memory met TTL (30s lists, 60s details), prefix-based invalidation per module

---

## 7. Architectuurpatronen

### Verplichte patronen (in `PATTERNS.md`)
- Elke pagina gebruikt `PageShell` + `PageHeader`
- Shared primitives uit `src/components/shared/` (11 componenten: Button, Badge, Modal, Card, Select, SearchInput, EmptyState, Skeleton, StatCard, ProgressBar, etc.)
- Design tokens als single source of truth
- Geen emoji's, alleen Lucide icons
- TypeScript strict, 0 errors target

### Reference implementatie
**Brand Foundation** is de blueprint voor alle modules: Page → Header + Stats + Filters + Grid + Detail + Create. Shared primitives, context hooks voor data, Zustand voor UI-state, mockToMeta adapter voor data conversie.

### Workflow Rules
- Plan-first voor 3+ stap taken
- Verification-gedreven (run tsc, tests, manual check)
- Bug fixes via root cause (geen workarounds)
- Self-improvement via `gotchas.md` lessen-log

---

## 8. Innovaties / Onderscheidende Keuzes

1. **Universele AI Exploration**: één generiek systeem voor alle item-types (assets, personas) met backend-driven configs.
2. **Effie-quality campaign pipeline**: 3-variant deep thinking met onafhankelijke creative debate i.p.v. één AI-call.
3. **Brand-aware content**: 4-laags context stack zorgt dat AI-output altijd merkconsistent is.
4. **AI-driven creative selection**: Goldenberg templates × bisociatie-domeinen worden door AI gekozen op basis van campagne-context (niet random).
5. **Per-feature model selection**: workspace-beheerders kiezen zelf per AI-feature welke LLM wordt gebruikt.
6. **Auto-provisioning**: 12 brand assets + 13 exploration configs verschijnen automatisch bij workspace-creatie.
7. **Universal versioning**: één polymorf model voor alle module-versies.
8. **Strict design system**: PATTERNS.md + design-tokens als enforcement-laag.
9. **Multi-tenant agency model**: één agency owner kan meerdere klant-workspaces beheren met seat-validatie.
10. **Behavioral science substrate**: campaign generatie put expliciet uit Cialdini, Sharp, Binet & Field, Kahneman, BCT, MINDSPACE i.p.v. generieke marketing-prompts.

---

## 9. Wat Branddock NIET (nog) is

- **Geen Stripe billing** geïmplementeerd (BILLING-01 t/m -04 in backlog)
- **Geen SSR**: alles client-side
- **OAuth productie-klaar code aanwezig**, maar credentials in env vars vereist
- **Geen echte email-verzending** (invite flow maakt records, geen SMTP integratie nog)
- **Geen native publishing** (Ayrshare integratie staat in roadmap)
- **Geen analytics dashboard** voor content performance (GA4 integratie pending)

---

## 10. Status (peildatum 17 april 2026)

- **~205+ implementatie-mijlpalen** afgerond (genummerd in CLAUDE.md actielijst)
- **TypeScript: 0 errors** (van 683 → 0 in feb 2026)
- **Database: 76+ modellen, schema in sync**
- **API: ~250+ endpoints actief**
- **UI: ~400+ React-componenten**
- **AI: 6 providers geïntegreerd, 10+ workspace-configureerbare features**
- **E2E: Playwright suite met kritieke flow + performance benchmarks**

---

## 11. Bronvermelding voor onderzoek

- **Codebase**: `/home/user/Branddock`
- **Hoofd-context document**: `CLAUDE.md` (project-instructies)
- **Patterns**: `PATTERNS.md` (UI primitives + verboden patronen)
- **Roadmap**: `BRANDCLAW-ROADMAP.md` (volledige fasevolgorde)
- **Backlog**: `TODO.md` (~146 items in 8 fases)
- **Behavioral science onderzoek**: `docs/campaign-science-research.md`
- **Brand assets veld-spec**: `docs/brand-assets-field-specifications.md`
- **Performance**: `PERFORMANCE.md` (E2E benchmarks)

### Externe referenties
- Figma: https://www.figma.com/make/WTXNV6zhzsTyYLUOdkFGge/Branddock
- Notion Context Library: 2ff48b9c-6dc9-81a9-8b04-f1c0d1e14e40
- Notion Backlog: b7dc92fa-1455-440a-845f-2808f409a9b9
