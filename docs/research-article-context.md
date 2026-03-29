# Branddock — Technisch & Functioneel Referentiedocument voor Research Artikel

> **Doel**: Diepgaand overzichtsdocument voor het schrijven van een research artikel over de uitbreiding van Branddock als AI-gedreven brand strategy platform.
> **Datum**: 27 maart 2026
> **Versie**: 1.0

---

## 1. Product Visie & Positionering

### 1.1 Wat is Branddock?

Branddock is een SaaS-platform voor **brand strategy, research validatie en AI-gedreven content generatie**. Het platform stelt merkstrategen, marketeers en agencies in staat om een compleet merkfundament op te bouwen, te valideren via meerdere research methoden, en vervolgens AI in te zetten om strategisch onderbouwde campagnes en content te genereren.

De kernthese is: **hoe rijker en gevalideerder het merkfundament, hoe beter de AI-gegenereerde output**. Branddock fungeert als een "brand intelligence layer" — een gestructureerde kennisbank van merkwaarden, persona's, producten en marktinzichten die als context dient voor alle AI-operaties.

### 1.2 Historische context

Het platform is geëvolueerd vanuit eerdere iteraties (Brandshift.ai / ULTIEM) naar de huidige naam Branddock. De ontwikkeling is volledig gedaan door één developer (Erik Jager) met behulp van Claude Code als AI-assisted development tool.

### 1.3 Doelgroepen

| Doelgroep | Model | Beschrijving |
|-----------|-------|-------------|
| **Direct clients** | Organization type `DIRECT` | Bedrijven die hun eigen merk managen |
| **Agencies** | Organization type `AGENCY` | Marketing/branding bureaus die meerdere klantmerken beheren |

Het agency model ondersteunt multi-tenant architectuur: één agency-organisatie met meerdere workspaces (één per klant), waarbij medewerkers verschillende rollen hebben per workspace.

---

## 2. Technische Architectuur

### 2.1 Technology Stack

| Laag | Technologie | Versie | Rol |
|------|-------------|--------|-----|
| **Framework** | Next.js | 16.1.6 | Hybride SPA (App Router voor API, client-side voor UI) |
| **UI** | React | 19.2.3 | Component rendering |
| **Styling** | Tailwind CSS | 4 | Utility-first CSS |
| **Database** | PostgreSQL | 17 | Primaire datastore |
| **ORM** | Prisma | 7.4 | Type-safe database access |
| **Auth** | Better Auth | 1.4.18 | Authenticatie, sessie-management, organisatie-plugin |
| **State (client)** | Zustand | 5.0.11 | 18+ stores voor UI state |
| **State (server)** | TanStack Query | 5.90.21 | Server state caching, optimistic updates |
| **AI — Text** | Anthropic Claude | Sonnet 4.5/4.6, Opus 4.6 | Strategie, analyse, chat, exploration |
| **AI — Text** | OpenAI | GPT-4o, GPT-5.4 | Content generatie, rapportage |
| **AI — Multimodal** | Google Gemini | 3.1 Pro/Flash | Product analyse, trend research, beeldgeneratie |
| **Rich Text** | TipTap | 3.20.4 | Inline content editor |
| **PDF** | jsPDF | 4.2.0 | Client-side PDF export |
| **Icons** | Lucide React | 0.564.0 | Consistent icon systeem |
| **Validatie** | Zod | 4.3.6 | Runtime type validatie (API input) |
| **Package manager** | npm | — | Dependency management |

### 2.2 Architectuurpatroon: Hybride SPA

Branddock gebruikt een **onconventioneel architectuurpatroon**: Next.js als framework, maar de UI is volledig client-side gerenderd.

```
Browser → Next.js App Router
  ├── src/app/layout.tsx          (Root layout met QueryProvider)
  ├── src/app/page.tsx            ('use client' → AuthGate → App.tsx)
  │     └── src/App.tsx           (Switch statement op activeSection)
  │           ├── case 'dashboard'       → DashboardPage
  │           ├── case 'brand'           → BrandFoundationPage
  │           ├── case 'personas'        → PersonasPage
  │           ├── case 'campaign-detail' → CampaignDetailPage
  │           └── ... (40+ routes)
  └── src/app/api/**              (Server-side API routes via App Router)
```

**Navigatie** werkt via een `setActiveSection(id)` functie die een state-variabele wijzigt, niet via URL-based routing. Dit betekent:
- Geen server-side rendering voor pagina's
- Geen URL-gebaseerde navigatie (geen deep links)
- Snelle navigatie zonder page loads
- API routes gebruiken wél standaard Next.js App Router

### 2.3 Database Architectuur

De PostgreSQL database bevat **76+ tabellen** gemanaged door Prisma 7. Kernmodellen:

**Organisatie & Auth:**
- `User`, `Session`, `Account`, `Verification` (Better Auth)
- `Organization` (type DIRECT/AGENCY), `OrganizationMember`, `Invitation`
- `Workspace` (kernentiteit voor multi-tenancy)

**Merkfundament (12 vaste assets per workspace):**
- `BrandAsset` (12 canonical assets, compound unique `[workspaceId, slug]`)
- `BrandAssetResearchMethod` (4 methods per asset: AI_EXPLORATION, WORKSHOP, INTERVIEWS, QUESTIONNAIRE)
- `ResourceVersion` (polymorphic versioning)

**Persona's & Producten:**
- `Persona` (20+ velden: demographics, psychographics, strategic)
- `Product` (22 categorieën, AI-analyse via URL/PDF)
- `Competitor` (30+ velden, Gemini-powered analyse)
- `ProductPersona`, `CompetitorProduct` (join tables)

**Campaigns & Content:**
- `Campaign` (STRATEGIC/QUICK), `Deliverable`, `DeliverableComponent`
- `CampaignKnowledgeAsset`, `ContentVersion`, `ImproveSuggestion`
- `CampaignTemplate`

**AI & Research:**
- `ExplorationSession`, `ExplorationMessage` (universal AI chat)
- `ExplorationConfig`, `ExplorationKnowledgeItem` (admin-configurable AI)
- `DetectedTrend`, `TrendSource`, `TrendScanJob` (trend radar)
- `AlignmentScan`, `ModuleScore`, `AlignmentIssue` (brand alignment)

**Configuratie:**
- `WorkspaceAiConfig` (per-feature LLM model selectie)
- `BrandStyleguide`, `StyleguideColor` (brand style)
- `BusinessStrategy`, `Objective`, `KeyResult`, `FocusArea`, `Milestone` (OKR)

### 2.4 Multi-Tenant Architectuur

```
Agency (Organization type=AGENCY)
├── User: agency-eigenaar (OWNER)
├── User: medewerker (MEMBER)
├── Workspace: Klant A    ← alle data is workspace-scoped
└── Workspace: Klant B

Direct Client (Organization type=DIRECT)
├── User: eigenaar (OWNER)
└── Workspace: eigen merk
```

**Workspace isolation**: Elke API route resolvet de `workspaceId` uit de sessie via `resolveWorkspaceId()`. Alle queries filteren op workspace. Er is geen env-var fallback — de sessie is verplicht.

**Role-based access**: 4 rollen (owner, admin, member, viewer) via Better Auth's organization plugin met `createAccessControl`.

### 2.5 Data Flow Patroon

```
PostgreSQL → Prisma → API Route (src/app/api/*)
  → Server-side cache (in-memory, 30s lists / 60s details)
  → JSON response
  → TanStack Query (client cache + optimistic updates)
  → Zustand store (UI state)
  → React component
```

**Server-side caching**: In-memory Map met TTL (`src/lib/api/cache.ts`). Elke mutatie route moet `invalidateCache()` aanroepen na DB writes.

**Client-side state**: TanStack Query beheert server-state (data fetching, caching, invalidation). Zustand beheert UI-state (filters, modals, geselecteerde items, wizard stappen).

### 2.6 API Omvang

Het platform heeft **200+ API endpoints** verdeeld over ~60 route files:

| Module | Endpoints | Beschrijving |
|--------|-----------|-------------|
| Auth | 7 | Login, register, session, org management |
| Brand Assets | 25+ | CRUD, framework data, lock, duplicate, versions |
| Workshops | 13 | Purchase, session, steps, report, canvas, notes |
| Interviews | 12 | Wizard steps, questions, templates, approve |
| Golden Circle | 4 | Canvas editor, lock, history |
| Brandstyle | 20 | Analyzer (URL/PDF), styleguide sections, AI context |
| Personas | 21+ | CRUD, chat, AI analysis, avatar, implications |
| Products | 16 | CRUD, AI analyze (URL/PDF), images, persona linking |
| Competitors | 12 | CRUD, AI analyze, refresh, product linking |
| Business Strategy | 23 | OKR CRUD, milestones, focus areas, recalculate |
| Campaigns | 20+ | CRUD, quick content, knowledge, deliverables, strategy |
| Content Studio | 18 | Generate, quality, improve, versions, export |
| Content Canvas | 6 | Orchestrate, components, approval, publish, derive |
| Trend Radar | 14 | Trends, sources, scan, stats, manual |
| Brand Alignment | 11 | Scan, issues, fix options, modules |
| Knowledge Library | 13 | CRUD, featured, archive, favorite, import |
| Research | 20 | Hub, bundles, custom validation, studies |
| Dashboard | 9 | Readiness, stats, attention, preferences |
| AI Exploration | 8 | Analyze, answer, complete, config CRUD |
| Settings | 36 | Account, team, billing, notifications, AI models |
| Search & Notifications | 7 | Global search, quick actions, notifications |

---

## 3. Functionele Modules — Gebouwd

### 3.1 Brand Foundation (12 Canonical Assets)

Elke workspace krijgt automatisch 12 vaste brand assets — het Branddock merkframework. Deze zijn gebaseerd op gevestigde branding-modellen:

| # | Asset | Framework/Model | Kernvelden |
|---|-------|----------------|------------|
| 1 | **Purpose Statement** | IDEO Purpose Wheel (Kelly & Carter, 2019) | Impact type, mechanism, pressure test |
| 2 | **Golden Circle** | Simon Sinek | WHY/HOW/WHAT met statements + details |
| 3 | **Brand Essence** | Aaker & Joachimsthaler's Brand Identity Model | Essence statement (2-5 woorden), emotioneel/functioneel voordeel |
| 4 | **Brand Promise** | Keller's CBBE + Aaker's drielagen + Neumeier's Onlyness Test | Promise, value architecture (3 lagen), differentiator |
| 5 | **Mission & Vision** | Collins & Porras "Built to Last" | Mission (wat/voor wie/hoe), Vision (BHAG, tijdshorizon) |
| 6 | **Brand Archetype** | Jung → Pearson & Mark (2001), 12 archetypen | Dominant archetype, core psychology, voice, visual expression |
| 7 | **Transformative Goals** | Collins BHAG + Ismail MTP + Stengel Brand Ideal + Google X | MTP, 1-5 goals met impact domains, authenticiteit, SDG alignment |
| 8 | **Brand Personality** | Aaker's 5 Dimensions (1997) + Nielsen Norman Tone of Voice | 5 dimensie-scores, spectrum sliders, voice & tone, kanaalspecifiek |
| 9 | **Brand Story** | StoryBrand + Hero's Journey + Audience Adaptation | Origin story, conflict, transformation, audience adaptations |
| 10 | **Core Values (BrandHouse)** | BetterBrands.nl BrandHouse/Brandstar | Roots (anchor values), Wings (aspiration), Fire (own value) |
| 11 | **Social Relevancy** | Triple Bottom Line + B Corp + Brand Activism (Kotler & Sarkar) | 3 pilaren (Milieu/Mens/Maatschappij), authenticiteit, SDG alignment |
| 12 | **Brand Style** | — | Logo, kleuren, typografie, tone of voice, imagery |

Elk asset heeft:
- **Framework-specifiek canvas**: Interactief formulier met velddefinities per model
- **Completeness score**: Veld-voor-veld berekening (percentage ingevulde velden)
- **AI Exploration**: Configurable AI-chat die het asset verdiept (zie §3.10)
- **Versioning**: Elke wijziging creëert een `ResourceVersion` snapshot
- **Lock/unlock**: Voorkomt onbedoelde wijzigingen
- **PDF export**: Client-side jsPDF met framework-specifieke formatting

### 3.2 Persona's

Uitgebreid persona-management met 20+ velden per persona:

- **Demographics**: leeftijd, locatie, opleiding, inkomen, beroep
- **Psychographics**: persoonlijkheid, waarden, interesses, levensstijl
- **Goals & Motivations**: doelen, motivaties, frustraties
- **Behaviors**: koopgedrag, mediagedrag, tech-stack
- **Strategic**: buying triggers, decision criteria, preferred channels

**AI Features**:
- **Persona Chat** (Claude Sonnet 4): Converseer met een persona alsof het een echt persoon is, met 4 chat-modi en dynamische context-injectie
- **AI Exploration**: Gestructureerde vraag-antwoord sessie om persona te verdiepen
- **Strategic Implications**: AI-gegenereerde strategische implicaties
- **Photo Generation**: Gemini-powered avatar generatie

### 3.3 Products & Services

Product catalogus met 22 categorieën in 5 groepen (Physical, Digital, Services, Experience & Lifestyle, General).

**AI Product Analyzer**: Gebruikers voeren een URL of PDF in → Gemini 3.1 Pro scraped en analyseert → gestructureerde productdata (naam, beschrijving, features, benefits, pricing, doelgroep, use cases) + automatisch gescrapede product-afbeeldingen.

### 3.4 Competitors Analysis

Concurrentie-analyse module met URL-gebaseerde AI-analyse (Gemini 3.1 Pro):

- Competitive tier (DIRECT/INDIRECT/ASPIRATIONAL)
- Company overview, positioning, offerings, strengths/weaknesses
- Brand signals (tone of voice, messaging themes, visual style)
- Competitive score (0-100)
- Linked products

### 3.5 Trend Radar

Real-time trend monitoring dashboard dat de oude Market Insights module vervangt:

**5-fase AI Research Pipeline**:
1. **Query**: Zoekqueries bouwen op basis van brand context
2. **Extract**: Webpagina's scrapen, signalen extraheren (Gemini)
3. **Synthesize**: Signalen samensmelten tot trends (Claude Sonnet 4.5)
4. **Score**: Relevantie scoren + evidence evalueren
5. **Judge**: Kwaliteitscontrole (Claude) met fallback

**Bronbeheer**: RSS feeds, websites, social media monitoring.
**4-tab dashboard**: Sources | Feed | Alerts | Activation.

### 3.6 Brand Alignment

Automatische consistentie-checker die 6 kennismodules scant op inconsistenties:

- **8-stap progressive scan** met Claude AI per module
- Issues met severity levels (CRITICAL/WARNING/SUGGESTION)
- **AI Fix Generator**: 3 fix-opties (A/B/C) per issue met preview en directe toepassing
- Cross-module: leest uit Personas/Products/BrandAssets, schrijft fixes terug

### 3.7 Business Strategy (OKR)

Strategiebeheer op basis van het OKR-model (Objectives & Key Results):

- Strategie-types (Growth, Market Entry, Product, Brand Building, Innovation, Digital Transformation)
- Objectives met Key Results en status tracking (ON_TRACK/COMPLETE/BEHIND)
- Focus areas, milestones (Q1-Q4 timeline)
- SWOT-analyse sectie
- AI Strategy Review (Claude-powered analyse met score en bevindingen)
- PDF export

### 3.8 Campaign Strategy Builder

**Het hart van Branddock's waardepropositie** — een 6-staps wizard die het volledige merkfundament gebruikt om AI-gedreven campagnestrategie te genereren.

#### 6-Staps Wizard:
1. **Setup**: Campagnenaam, doeltype (15 types in 4 categorieën), datums, externe enrichment toggle
2. **Knowledge**: Selectie van brand assets, persona's, producten en trends als AI-context
3. **Strategy**: AI-generatie van strategisch fundament + variant review
4. **Concept**: Creatieve concept-uitwerking met hooks en elementaire ratings
5. **Deliverables**: Content deliverables met brief auto-fill
6. **Review**: Overzicht + lancering

#### 3-Variant Deep Thinking Pipeline:

De strategie wordt gegenereerd door **3 parallelle AI-modellen**, elk met provider-specifiek deep thinking:

| Variant | Model | Rol | Deep Thinking |
|---------|-------|-----|---------------|
| **A** (Expected) | Claude Opus 4.6 | Evidence-based strategist | `extended_thinking` met budgetTokens |
| **B** (Unexpected) | GPT-5.4 | Creative provocateur | `reasoning_effort: 'high'` |
| **C** (Data-Driven) | Gemini 3.1 Pro | Data-driven innovator | `thinkingConfig` met thinkingBudget |

#### 9-Staps Pipeline:
1. **Briefing Validation** — AI evalueert completeness van de brief
2. **Strategy Foundation** — Strategisch fundament (behavioral diagnosis, audience insights)
3. **Variant A + B + C** — 3 parallelle strategievarianten
4. **Persona Validation** — Elke persona beoordeelt alle 3 varianten
5. **Strategy Synthesis** — Eén winnende strategie samengesteld
6. **Creative Hooks** — Creatieve concepten genereren
7. **Hook Refinement** — Verfijning op basis van feedback
8. **Journey Elaboration** — Klantreis uitwerken per fase
9. **Channel + Asset Planning** — Kanaalplan + deployment schedule

#### Enrichment Bronnen:

De pipeline wordt verrijkt met meerdere data-lagen:

**Lokale frameworks (altijd actief)**:
- **BCT Taxonomy** (32 gedragsveranderingstechnieken, COM-B model)
- **Cialdini's 7 Overtuigingsprincipes**
- **IPA Effectiveness Rules** (7 advertising effectiveness principes)
- **Byron Sharp Growth Principles** (8 principes)
- **Kahneman System 1/2 Framing** (12 principes)
- **EAST Framework** (Easy, Attractive, Social, Timely)

**Externe bronnen (opt-in)**:
- **Are.na API** — Culturele/strategische context (3 parallelle zoeklagen: strategic, human, creative)
- **Exa API** — Neural semantic search voor cross-industry analogieën
- **Semantic Scholar API** — Academische papers voor evidence-based strategie

#### Effie Award-Kwaliteit:

Prompts zijn herschreven met focus op creatieve kwaliteit:
- Insight Mining → Creative Angle → Anti-Generic Guardrails
- Per-variant creatieve profielen
- Persona validatie met 4 creatieve scores (originality, memorability, cultural relevance, talkability)
- Synthesis prompt: "Elevation, Not Combination"

### 3.9 Content Canvas & Studio

**Content Canvas**: 3-panel workspace voor content generatie per deliverable:

- **Context Panel** (links): 4-laags context stack (brand/campaign/journey/medium)
- **Variant Workspace** (midden): AI-gegenereerde varianten met inline editing (TipTap)
- **Preview Panel** (rechts): Platform-specifieke previews (Instagram, LinkedIn, Email, etc.)

**AI Orchestrator**: Multi-model generatie:
- Claude voor tekst (3 varianten per groep)
- DALL-E 3 voor afbeeldingen (3 varianten)
- SSE (Server-Sent Events) voor real-time progress

**Approval Flow**: DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED
**Platform Derivation**: AI-powered content aanpassing voor andere platforms

**Content Studio** (legacy, parallel systeem): 3-kolom editor met quality scoring, improve suggestions, research insights, version history.

### 3.10 AI Exploration (Universal)

Generiek, configureerbaar AI-chatsysteem dat werkt voor alle item types (brand assets, persona's):

**Backend-driven configuratie**:
- `ExplorationConfig` per item type/subtype in database
- Configureerbare dimensies (vragen), volgorde, iconen
- Configureerbare AI model + temperature per config
- System/feedback/report prompts met template variabelen (`{{brandContext}}`, `{{customKnowledge}}`, `{{itemName}}`)
- Custom knowledge library per config

**Multi-provider**: Anthropic Claude Sonnet 4.6 (default) + OpenAI + Google Gemini

**Flow**: Start → Vragen per dimensie → AI feedback per antwoord → Rapport generatie → Field suggestions → Apply changes

**Admin UI**: Settings > Developer > AI Configuration (list/detail pattern, 4 tabs: Algemeen/Dimensies/Prompts/Kennisbronnen)

### 3.11 Dashboard

- **Decision Readiness**: Gewogen percentage over 5 modules (assets, personas, strategies, campaigns, products)
- **5 KPI Cards**: Module counts met klikbare navigatie
- **Attention List**: Items die aandacht nodig hebben (max 5, priority sorted)
- **AI Recommended Action**: Één geprioriteerde actie
- **Active Campaigns Preview**: Top 3 campagnes met progress
- **Onboarding Wizard**: 3-stap introductie voor nieuwe gebruikers
- **Quick Start Widget**: 4-item persistent checklist

### 3.12 Overige Modules

- **Knowledge Library**: 12 resource types, featured carousel, grid/list view, favorites, archief
- **Research & Validation**: Hub + bundles marketplace + custom validation builder
- **Brandstyle Analyzer**: URL/PDF → AI-extractie van kleuren, typografie, tone of voice, imagery
- **Settings**: Account, Team, Billing (stub), Notifications, Appearance, AI Models, Developer
- **Notifications**: Real-time notificaties met categorieën en read status
- **Global Search**: Multi-module zoekfunctie

---

## 4. AI Architectuur — Gedetailleerd

### 4.1 Multi-Provider Strategie

Branddock gebruikt **3 AI-providers** met specifieke rollen:

| Provider | Modellen | Gebruik |
|----------|---------|--------|
| **Anthropic** | Claude Sonnet 4.5/4.6, Opus 4.6 | Strategie, analyse, chat, exploration, brand alignment, trend synthesis |
| **OpenAI** | GPT-4o, GPT-5.4 | Content generatie, workshop rapporten, variant B strategie |
| **Google** | Gemini 3.1 Pro/Flash | Product/competitor analyse, trend research, beeldgeneratie, variant C strategie |

### 4.2 Per-Feature LLM Selectie

Workspace-beheerders kunnen per AI-feature kiezen welk model wordt gebruikt via Settings > AI Models:

| Feature | Default | Ondersteunde Providers |
|---------|---------|----------------------|
| Persona Chat | Claude Sonnet 4.5 | Anthropic, OpenAI |
| Campaign Strategy — Variant A | Claude Opus 4.6 | Anthropic |
| Campaign Strategy — Variant B | GPT-5.4 | Anthropic, OpenAI, Google |
| Campaign Strategy — Variant C | Gemini 3.1 Pro | Anthropic, OpenAI, Google |
| Content Generate | Claude Sonnet 4.5 | Anthropic, OpenAI, Google |
| Content Quality | Claude Sonnet 4.5 | Anthropic, OpenAI |
| Content Improve | Claude Sonnet 4.5 | Anthropic, OpenAI |
| Trend Synthesis | Claude Sonnet 4.5 | Anthropic |
| Product Analysis | Gemini 3.1 Pro | Google |
| Competitor Analysis | Gemini 3.1 Pro | Google |

### 4.3 AI Middleware & Rate Limiting

- **Rate limiter**: In-memory sliding window, 3 tiers (FREE 20/min, PRO 60/min, AGENCY 120/min)
- **Brand context aggregator**: Automatisch 5 Prisma models samenstellen als AI context (met 5 min cache)
- **Retry logica**: Per-provider exponential backoff (3 retries, 2s→4s→8s), `isTransientError()` per provider
- **Streaming**: SSE helpers (`createStreamingResponse`, `parseSSEStream`) voor real-time output

### 4.4 Brand Context als AI Foundation

Alle AI-operaties ontvangen een samengestelde "brand context" die automatisch wordt opgebouwd uit:

```
Brand Context = {
  Brand Assets (12 assets, framework data per type)
  + Persona's (demographics, psychographics, strategic)
  + Products (features, benefits, pricing, target audience)
  + Competitors (positioning, strengths, differentiators)
  + Trends (activated trends, relevance scores, data points)
  + Brandstyle (kleuren, typografie, tone of voice)
}
```

Dit is het kernprincipe: **de kwaliteit van AI-output is direct proportioneel aan de rijkheid van de brand context**.

### 4.5 Prompt Engineering Strategie

Branddock's prompts volgen een gelaagd patroon:

1. **System prompt**: Rolbeschrijving (bijv. "Senior Brand Strategist at a Top-5 Agency")
2. **Brand context injection**: Automatisch samengestelde merkdata
3. **Enrichment data**: Framework-specifieke data (BCT, Cialdini, etc.)
4. **Task-specifieke instructies**: Wat de AI moet doen
5. **Output schema**: Zod-gevalideerde JSON structuur
6. **Anti-generic guardrails**: Instructies om generieke output te voorkomen

---

## 5. Design System & UI Architectuur

### 5.1 Design Tokens

Gecentraliseerd in `src/lib/constants/design-tokens.ts` (740+ regels):

- **Module themes**: Per module unieke gradient + icoon
- **Spacing**: Consistent padding/gap systeem
- **Typography**: 4 niveaus (page title, section title, card title, body)
- **Colors**: CSS variabele `--primary` (#1FD1B2), `bg-background` (wit)

### 5.2 Component Hiërarchie

```
PageShell (max-width wrapper)
└── PageHeader (moduleKey → gradient, titel, acties)
    └── StatGrid → StatCard (KPI kaarten)
    └── FilterBar (search + dropdowns + view toggle)
    └── Grid/List (responsive card layout)
        └── Card → Badge, ProgressBar, Button
```

### 5.3 Shared Primitives (11 componenten)

`Button` (5 varianten), `Badge` (6 varianten), `Input`, `Select`, `SearchInput` (debounced), `Modal` (focus trap), `Card` (compound), `EmptyState`, `Skeleton` (5 varianten), `StatCard`, `ProgressBar`.

### 5.4 Feature-Based Directory Structuur

Elke module volgt het patroon:
```
src/features/[module]/
├── components/           ← UI componenten
├── hooks/index.ts        ← TanStack Query hooks + queryKeys
├── stores/               ← Zustand store(s)
├── api/                  ← Fetch functies
├── types/                ← TypeScript interfaces
├── constants/            ← Statische configuratie
└── lib/ of utils/        ← Module-specifieke helpers
```

---

## 6. Nog Uit Te Werken Features (Roadmap)

### 6.1 Fase 2: Production Infrastructure (Blokkeert Deployment)

| Item | Status | Beschrijving |
|------|--------|-------------|
| Rate Limiter → Redis | Niet gestart | In-memory werkt niet bij meerdere server instances |
| Cloud Storage | Niet gestart | Afbeeldingen/bestanden naar S3/R2 i.p.v. lokaal |
| Email Verzending | Niet gestart | Resend SDK geïnstalleerd, nog niet geïmplementeerd |
| CSRF & Security Audit | Niet gestart | Security review voor productie |

### 6.2 Fase 5: Research & Validation Voltooien

| Item | Status | Beschrijving |
|------|--------|-------------|
| Research Hub echte data | Stubs | 3 hardcoded insights, 2 pending validation, 3 recommended actions |
| Validation flow | Stub (501) | Echte research validation pipeline |
| Strategy ↔ Campaign linking | Stub (501) | Koppeling business strategy aan campagnes |
| Workshop module (echt) | UI shell | Volledige interactieve workshop flow |
| Interviews module (echt) | UI shell | Interview wizard met echte data |
| Survey/Questionnaire | Niet gebouwd | Survey builder, distributie, analyse |

### 6.3 Fase 6: Campaign AI & Content (Kern Waardepropositie)

| Item | Status | Beschrijving |
|------|--------|-------------|
| Strategy regeneratie | Deels | Iteratieve verfijning met feedback loop |
| A/B/C strategie vergelijking | ✅ Gebouwd | 3 parallelle varianten met deep thinking |
| Content Studio AI generatie | Deels | Canvas orchestrator werkt, studio is legacy |
| Brand voice enforcement | Deels | Tone checker bestaat, enforcement in generatie beperkt |
| Quality scoring (echt) | Deels | Type-specifieke scoring gebouwd, nog niet alle types |
| Content export | Stub | PDF/DOCX/PNG/MP4 formaten |

### 6.4 Fase 7: UI Polish

| Item | Status | Beschrijving |
|------|--------|-------------|
| Persona layout optimalisatie fase 2 | 6 prompts pending | Grid fix, sidebar, demographics, empty states |
| AI Persona Analysis redesign | 4 prompts pending | Chat restyling, rapport fase, veldsuggesties |
| Foto generatie fix | Niet gestart | Echte Gemini API i.p.v. DiceBear stub |

### 6.5 Fase 8: Billing & Auth (S10-S11)

| Item | Status | Beschrijving |
|------|--------|-------------|
| Stripe Billing | SDK geïnstalleerd | Checkout, webhooks, plan enforcement, agency pricing |
| OAuth (Google/Microsoft) | Niet gestart | Social login + account linking |
| E2E Testing | Setup aanwezig | Playwright config, geen tests geschreven |

### 6.6 Fase 9: Deployment & Monitoring (S12)

| Item | Status | Beschrijving |
|------|--------|-------------|
| Vercel deployment | Niet gestart | Project setup, env vars, CI/CD |
| Production database | Niet gestart | Neon/Supabase/Railway |
| Sentry error tracking | Niet gestart | Monitoring + alerts |
| PostHog analytics | Niet gestart | Feature usage tracking |

### 6.7 Externe Integraties (40+ kandidaten onderzocht)

**Tier 1 — Direct implementeerbaar (hoog ROI)**:
- **Resend** (email, SDK geïnstalleerd)
- **Perplexity Sonar** (AI search)
- **Pexels** (stock media)
- **Brandfetch** (brand data voor 60M+ merken)
- **Ayrshare** (social publishing naar 15+ platforms)
- **OpenAI Image / Imagen 4** (beeldgeneratie)

**Tier 2 — Hoge strategische waarde**:
- HubSpot CRM, Google Analytics 4, DataForSEO, Writer.com, Canva Connect, Typeform, Slack, WordPress

**Tier 3 — Bij vraag**:
- ElevenLabs (audio), Marker API (document parsing), Meta Marketing API, Semrush, Shopify

---

## 7. Ontwikkelstatistieken

### 7.1 Omvang

| Metric | Waarde |
|--------|--------|
| **Prisma modellen** | 76+ |
| **Prisma enums** | 28 basis + 15 uitgebreid |
| **API endpoints** | 200+ |
| **API route files** | ~60 |
| **Feature directories** | 15+ |
| **Zustand stores** | 18+ |
| **TanStack Query hook files** | 15+ |
| **UI componenten** | ~300+ |
| **TypeScript errors** | 0 (strict mode) |
| **Afgeronde sprints** | 158+ (zie CLAUDE.md actielijst) |

### 7.2 Codebase Structuur

```
src/
├── app/api/          ← ~60 route files, 200+ endpoints
├── components/       ← ~80 shared + module componenten
├── features/         ← 15 feature directories (elk 5-30 bestanden)
├── contexts/         ← 12 React context providers
├── hooks/            ← Globale hooks (workspace, dashboard, search, etc.)
├── lib/              ← Utilities, AI clients, catalogs, constants
├── stores/           ← 14 Zustand stores
├── types/            ← Gecentraliseerde type definities
├── services/         ← 9 service bestanden
├── utils/            ← Utility functies
└── providers/        ← QueryProvider wrapper

prisma/
├── schema.prisma     ← 76+ modellen
├── prisma.config.ts  ← Prisma 7 configuratie
└── seed.ts           ← Demo data (multi-tenant)
```

### 7.3 Ontwikkelproces

- **Ontwikkelaar**: Eén persoon (Erik Jager)
- **AI-assisted development**: Claude Code in Warp terminal
- **Review proces**: Per feature 2-4 onafhankelijke review-agenten, meerdere review-rondes
- **Quality gates**: TypeScript strict mode (0 errors), Zod runtime validatie op alle API inputs
- **Database**: Lokale PostgreSQL, schema push via Prisma
- **Geen CI/CD**: Handmatige builds, dev server via `npm run dev`

---

## 8. Kernconcepten voor Research Artikel

### 8.1 Het "Brand Intelligence Layer" Concept

Branddock's centrale innovatie is het idee van een **gestructureerde merkkennis-laag** die als fundament dient voor alle AI-operaties. In tegenstelling tot losse AI-tools die generieke output produceren, bouwt Branddock een cumulatief merkprofiel op dat:

1. **Structureel is**: 12 assets gebaseerd op bewezen branding-frameworks
2. **Valideerbaar is**: Research methods (AI exploration, workshops, interviews, surveys)
3. **Contextueel is**: Persona's, producten, concurrenten, trends als aanvullende lagen
4. **Accumulerend is**: Elke interactie verrijkt het profiel

### 8.2 Multi-Model AI Strategie

Het gebruik van 3 AI-providers (Anthropic, OpenAI, Google) met specifieke rollen per feature is een bewuste architecturale keuze:

- **Diversiteit in output**: 3 varianten voorkomen "model bias"
- **Deep thinking per provider**: Elke provider heeft eigen reasoning-capaciteiten
- **Fallback**: Als één provider faalt, blijft het systeem functioneel
- **Feature-specifieke optimalisatie**: Gemini voor multimodal (product analyse), Claude voor redenering (strategie), GPT voor creatieve tekst

### 8.3 Behavioral Science als Differentiator

De campagne-strategie pipeline integreert wetenschappelijke frameworks als structurele verrijking:

- **COM-B Model** + **BCT Taxonomy** (32 technieken) voor gedragsverandering
- **Cialdini's Overtuigingsprincipes** voor communicatiestrategie
- **IPA Advertising Effectiveness** voor media-effectiviteit
- **Byron Sharp Growth Principles** voor merkgroei
- **Kahneman System 1/2** voor framing en besluitvorming
- **EAST Framework** voor gedragsactivatie

### 8.4 Agency-Model & Multi-Tenancy

Het platform is ontworpen voor zowel individuele merken als agencies die meerdere klantmerken beheren. Dit vereist:

- Strikte data-isolatie per workspace
- Role-based access control
- Workspace switching
- Per-workspace AI configuratie

### 8.5 Open Architectuurvragen

| Vraag | Status | Opties |
|-------|--------|--------|
| Agency pricing model | Open | Per seat / per workspace / flat tiers |
| Gratis tier limieten | Open | Aantal assets, AI calls, workspaces |
| Workspace isolatie | Soft (filter) | Alternatief: row-level security |
| White-label | Open | Eigen logo/domein vs Branddock branding |
| Deployment platform | Open | Vercel, Railway, self-hosted |

---

## 9. Technische Schuld & Bekende Beperkingen

### 9.1 Actieve Technische Schuld

- **Adapter pattern**: Tijdelijke mappers tussen DB-model en legacy mock-formaat (26 consumers voor brand assets)
- **Client-side routing**: Geen deep links, geen URL-based navigatie
- **In-memory cache & rate limiter**: Werkt niet bij horizontaal schalen
- **Geen server-side rendering**: Alles client-side, impact op SEO/initial load
- **Stub endpoints**: ~10 API endpoints retourneren hardcoded data of 501
- **Geen echte email**: Invites maken DB records maar versturen niets
- **Geen echte billing**: Stripe SDK geïnstalleerd maar niet geconfigureerd

### 9.2 Geleerde Lessen (uit gotchas.md)

1. **AI prompt ↔ TypeScript mismatch**: AI-response keys moeten exact matchen met TypeScript interfaces — er is geen runtime validatie
2. **Nooit AI-data direct in Prisma spreaden**: Altijd sanitizen door een whitelist
3. **`validateOrWarn()` throws nooit**: Alle downstream componenten moeten defensieve null guards gebruiken
4. **AI retourneert objecten waar strings verwacht worden**: Altijd een `toDisplayString()` helper gebruiken
5. **AI retourneert nummers als strings**: Altijd `Number()` coercen vóór type-checks
6. **React strict mode + SSE auto-start**: Cleanup moet `autoStartedRef` resetten

---

## 10. Toekomstige Richting

### 10.1 Korte termijn (Q2 2026)

- Production infrastructure (Redis, cloud storage, email)
- Deployment op Vercel + production database
- Stripe billing integratie
- Eerste externe integraties (Resend, Pexels, Brandfetch)

### 10.2 Middellange termijn (Q3-Q4 2026)

- Volledige Research & Validation pipeline (workshops, interviews, surveys)
- Content Studio herziening
- OAuth (Google/Microsoft)
- Externe integraties Tier 2 (HubSpot, GA4, Canva)
- E2E testing

### 10.3 Lange termijn

- Real-time social publishing (Ayrshare)
- Video/audio content generatie (ElevenLabs)
- Competitive intelligence (Crayon/Brandwatch)
- Integration Hub architectuur
- White-label voor agencies

---

*Dit document is gegenereerd op basis van de volledige codebase-documentatie (CLAUDE.md, TODO.md, PATTERNS.md, gotchas.md) en reflecteert de staat van het Branddock platform per 27 maart 2026.*
