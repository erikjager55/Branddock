# BRANDCLAW-ROADMAP.md
# Strategische Roadmap & Fasespecs — Branddock → Brandclaw

> **Doel van dit document**: Volledig uitvoerbare briefing voor Claude Code.
> Dit document beschrijft de volledige roadmap van het huidige Branddock-platform
> naar Brandclaw — een autonoom strategisch verbeterplatform. Per fase staan
> exacte specs, deliverables, technische vereisten en succesvereisten.
>
> **Leesinstructie voor Claude Code**: Lees dit document bij elke sessie.
> Het heeft hogere prioriteit dan TODO.md waar ze conflicteren.
> Raadpleeg CLAUDE.md voor codebase-specifieke patterns en gotchas.
>
> Laatst bijgewerkt: 30 maart 2026 [EJ 30-03-2026]

---

## CONTEXT: WAT IS BRANDDOCK EN WAT WORDT BRANDCLAW?

### Branddock (huidige staat — maart 2026)
Branddock is een Next.js 16 / React 19 / PostgreSQL SaaS-platform voor brand
strategy, research validatie en AI-gedreven content generatie. Het platform heeft:

- **76+ Prisma-modellen**, ~90 API endpoints, 200+ UI-componenten, 160K+ LOC
- **12 canonical brand assets** per workspace (elk met dedicated canvas, AI Exploration, PDF export)
- **OKR-module** (BusinessStrategy, Objective, KeyResult, FocusArea, Milestone)
- **Campaign module** met 3-variant deep thinking pipeline (Claude Opus + GPT-5.4 + Gemini 3.1 Pro)
- **Content Studio** met 47 deliverable types, type-specifieke constraints/quality/export
- **Content Item Canvas** met multi-model orchestratie (Claude tekst + DALL-E 3 beelden), platform previews, approval flow
- **Trend Radar** met real-time AI-detectie (Gemini + Claude synthese)
- **Brand Alignment AI scan** met 8-stap Claude-analyse en 3 AI fix-opties per issue
- **Research Hub, Knowledge Library, Competitors module**
- **Multi-model AI**: Claude Opus 4.6 (strategie/deep thinking), GPT-5.4 (content), Gemini 3.1 Pro (multimodal/analyse)
- **Behavioral science** ingebakken: Cialdini, IPA, Byron Sharp, Kahneman, EAST, BCT frameworks
- **Enrichment bronnen**: Are.na (cultureel), Exa (semantisch zoeken), Semantic Scholar (research papers)
- **Multi-tenant**: AGENCY + DIRECT client model, workspace-scoped data, RBAC (owner/admin/member/viewer)
- **Per-feature LLM selectie** via Settings > AI Models (10 configureerbare features)
- **OAuth social login**: Google, Microsoft, Apple (Better Auth)
- **0 TypeScript errors**, clean codebase

### Brandclaw (evolutiedoel)
Brandclaw is de nieuwe naam voor het totale platform. De evolutie voegt toe:

- Autonome agent-loops die zelfstandig strategieën uitvoeren, meten en verbeteren
- Gesloten verbetercyclus: Strategie → Executie → Meting → Evaluatie → Optimalisatie
- Human-in-the-loop: gebruiker blijft betrokken bij relevante beslissingen
- Externe integraties voor executie (Google Ads, Meta) en meting (PostHog, GA4)
- Persistent agent-memory via pgvector (agents leren van eerdere cycli)

**Brandclaw is geen restart — het is een evolutie van Branddock.**
De bestaande architectuur, data en UI zijn de fundering. Er wordt bovenop gebouwd,
niet opnieuw begonnen.

---

## ACTUELE SPRINT-STAAT (per 30 maart 2026)

### Volledig afgerond (niet aanraken tenzij expliciet gevraagd)

| Sprint/Module | Status | Highlights |
|---|---|---|
| **Fase 1: Technische schuld** | ✅ 100% | 683→0 TS errors, adapter pattern, seed data |
| **Fase A: OAuth + E2E + Performance** | ✅ 100% | Google/Microsoft/Apple OAuth, Playwright E2E, performance benchmarks |
| **Fase C: Visual Regression Fix** | ✅ 100% | S13 afgerond |
| **Brand Foundation** | ✅ 100% | 12 canonical assets per workspace, auto-provisioning, PDF export, AI Exploration per asset |
| **Brand Asset Detail** | ✅ 100% | 2-kolom layout, 13 framework canvases (Purpose Wheel, Golden Circle, Brand Essence, Brand Promise, Mission/Vision, Brand Archetype, Transformative Goals, Brand Personality, Brand Story, Core Values, Social Relevancy, SWOT, Purpose Kompas) |
| **AI Exploration** | ✅ 100% | Universeel systeem, 13 backend-driven configs, admin UI, knowledge library, multi-provider (Claude/GPT/Gemini), session resume |
| **Brandstyle Analyzer** | ✅ 100% | URL/PDF analyse, 5-tab styleguide, Save for AI, PDF export |
| **Interviews** | ✅ 100% | 5-stap wizard, templates, approve & cascade |
| **Golden Circle** | ✅ 100% | Canvas editor, versie historie |
| **Workshops** | ✅ 100% | Purchase flow, 6-stap sessie, AI rapport, canvas |
| **Business Strategy** | ✅ 100% | OKR overview + detail, SWOT, AI review, PDF export, templates |
| **Personas** | ✅ 100% | Overview + create + detail, chat (Claude Sonnet 4), AI analysis, photo gen, strategic implications |
| **Products & Services** | ✅ 100% | 22 categorieën, AI URL/PDF analyse (Gemini), product images, persona koppeling |
| **Competitors** | ✅ 100% | AI URL analyse (Gemini), detail + linked products, competitive score |
| **Trend Radar** | ✅ 100% | 4-tab dashboard, AI scan pipeline (Gemini+Claude), auto-scrape images |
| **Brand Alignment** | ✅ 100% | 8-stap AI scan (Claude), 3 fix opties, DB write-back, sidebar badge |
| **Knowledge Library** | ✅ 100% | 15 componenten, featured carousel, grid/list, add modal |
| **Research & Validation** | ✅ 100% | Hub, bundles marketplace, custom validation builder |
| **Campaigns** | ✅ 100% | Overview + quick content + wizard (6-stap) + detail + strategy pipeline |
| **Campaign Strategy** | ✅ 100% | 3-variant deep thinking (Claude Opus/GPT-5.4/Gemini), Effie Award concepten, behavioral science enrichment, Are.na/Exa/Scholar integratie, 15 goal types, concept stap met element ratings |
| **Content Library** | ✅ 100% | Cross-campaign content overview met filters |
| **Content Studio** | ✅ 100% | 3-kolom layout, 47 types, type-specifieke quality scoring, constraints, export |
| **Content Item Canvas** | ✅ 100% | Multi-model orchestratie (Claude+DALL-E 3), 13 platform previews, approval flow, derivation |
| **Dashboard** | ✅ 100% | Readiness %, stats, attention list, onboarding wizard, quick start |
| **Settings** | ✅ 100% | Account, team, billing (UI), notifications, appearance, AI models, developer access |
| **Help & Support** | ✅ 100% | 22 componenten, FAQ, contact, system status |
| **Pattern Library** | ✅ 100% | Design tokens, UI primitives, PATTERNS.md |
| **I18N** | ✅ 100% | UI vertaald naar Engels |
| **Brand Voices (I.1)** | ✅ 100% | ElevenLabs TTS integratie, voice browsing, audio sample generatie |
| **AI Images (I.3)** | ✅ 100% | Google Imagen 4 + DALL-E 3 fallback, Creative Hub tab |
| **AI Videos (I.4)** | ✅ 100% | Runway ML Gen4 Turbo, Creative Hub tab |
| **Per-feature LLM selectie** | ✅ 100% | 10 features configureerbaar via Settings |
| **Developer-only autorisatie** | ✅ 100% | DEVELOPER_EMAILS env var, API + UI bescherming |

### Wat WEL gebouwd is maar NIET in originele roadmap stond

De volgende features zijn gebouwd maar werden niet specifiek benoemd in de oorspronkelijke roadmap:

1. **3-Variant Deep Thinking Pipeline** — 3 parallelle AI-varianten met provider-specifiek deep thinking (Claude extended_thinking, GPT reasoning_effort, Gemini thinkingConfig)
2. **6-stap Campaign Wizard met Concept stap** — Setup → Knowledge → Strategy → Concept → Deliverables → Review
3. **15 Campaign Goal Types** in 4 categorieën met time-binding en goal-specifieke AI guidance
4. **Per-feature LLM selectie** — workspace-beheerders kiezen per AI-feature welk model (10 features)
5. **Alle 12 Brand Asset canvas componenten** — elk met eigen framework, completeness, AI export
6. **Competitors module** — AI URL analyse, competitive scoring, product linking
7. **Content Item Canvas** — multi-model orchestratie, platform previews, approval flow, derivation
8. **Flow Connections** op campaign timeline — visuele pijlen tussen deliverables
9. **Marketing Framework Enrichment** — Cialdini, IPA, Byron Sharp, Kahneman, EAST, BCT als lokale data
10. **External Enrichment bronnen** — Are.na (cultureel), Exa (semantisch), Semantic Scholar (papers)
11. **Effie Award Creative Concepts** — strategy pipeline geüpgraded met Effie-criteria
12. **Deployment Grid/Timeline dual view** met drag & drop, persona lanes, priority sorting
13. **Brand Alignment AI Scanner** met DB write-back (niet alleen demo data)
14. **Universal Versioning** — ResourceVersion polymorphic model
15. **Trend Radar auto-scrape images** — bij AI research worden afbeeldingen automatisch bewaard
16. **Developer-only autorisatielaag** — afscherming van admin/developer-secties

### Gedeeltelijk af — restpunten per fase

**Fase B (Content Studio) — ~90% af**
- ✅ 47 deliverable types met constraints, quality criteria, export formats
- ✅ Type-specifieke quality scoring (AI-driven, gewogen criteria)
- ✅ Content constraints enforcement (char/word/sections/hashtags)
- ✅ Type-aware improve suggestions
- ✅ 3-kolom layout met left panel, canvas, right panel
- ✅ Version history + restore
- ✅ Auto-save + export (TXT/PDF/HTML)
- 📋 Echte AI content generatie (nu placeholder/stubs voor sommige types)
- 📋 TipTap inline AI-verbetersuggesties ("Maak korter" / "Verhoog urgentie")
- 📋 Real-time streaming van gegenereerde content via SSE (deels)

**Fase B2 (Content Canvas) — ~80% af**
- ✅ Content Item Canvas met multi-model orchestratie
- ✅ 13 platform-specifieke previews
- ✅ Approval flow (submit/approve/request changes/publish)
- ✅ Platform derivation
- ✅ Variant selectie + inline editing
- 📋 Board-weergave van alle campagne-deliverables per status-kolom
- 📋 Export als ZIP van alle goedgekeurde deliverables
- 📋 Derive modal (nieuw deliverable afleiden van bestaand)

**Fase E (Research & Validation) — ~70% af**
- ✅ Research Hub, bundles marketplace, custom validation builder
- ✅ AI Exploration end-to-end voor brand assets en personas
- 📋 Echte research execution (nu stubs voor Resume/Validate)
- 📋 Strategy↔campaign linking (stubs)
- 📋 Validation flow voor research resultaten

**Fase I (Media Assets) — ~50% af**
- ✅ I.1: Brand Voices (ElevenLabs TTS)
- ✅ I.3: AI Images (Imagen 4 + DALL-E 3)
- ✅ I.4: AI Videos (Runway ML Gen4 Turbo)
- 📋 I.2: Geluidsbibliotheek (ElevenLabs Sound Effects)
- 📋 I.5: Video Generatie conditioneel (marktrijpheid)

### Niet gestart — kritieke blocker

**Fase D (Deployment + Billing + Infra) — 0% af — KRITIEKE BLOCKER**
Dit is het enige dat het platform tegenhoudt van productie-launch.
Alle features zijn gebouwd maar draaien alleen lokaal.

---

## FASEVOLGORDE (herzien 30 maart 2026)

```
DONE    Fase A:  S11 — OAuth + E2E Testing + Performance
~90%    Fase B:  Content Studio Voltooien
~80%    Fase B2: Content Canvas
DONE    Fase C:  S13 — Visual Regression Fix
~70%    Fase E:  Research & Validation
~50%    Fase I:  Media Assets Layer (I.1 + I.3 + I.4 done)

── VOLGENDE STAPPEN (in volgorde van prioriteit) ──

NEXT    Fase B-FIN:  Content Studio + Canvas restpunten
BLOCKER Fase D:      Deployment + Billing + Agent-Fundament Infrastructure
        Fase D-AGT:  Agent Foundation (pgvector, BullMQ, webhooks)
        Fase E-AGT:  Agent Capability Layer (4 agents — chat hub, research, onboarding, monitor)
        Fase F:      Brandclaw Agent Core (marketing loop, F.2 backend only — UI via E-AGT.1)
        Fase G:      Brandclaw Channel Activation (Google Ads + Reporting)
        Fase H:      Brandclaw Full Platform (Meta + Social + CRM)
        Fase I-FIN:  Media Assets restpunten (I.2, I.5)
```

---

## FASE B-FIN: CONTENT STUDIO + CANVAS RESTPUNTEN (NIEUW)

> Afronding van de content-modules. Alles wat uit Fase B en B2 resteert.

### B-FIN.1 Content Generatie naar Echte AI

De Content Studio generatie endpoints zijn nu grotendeels stubs/placeholders.
De volgende items moeten worden omgezet naar echte AI generatie:

- **Text content generatie**: Per content type een AI prompt template bouwen
  die de brand context hiërarchie (8 lagen — zie B.2 hieronder) correct injecteert
- **SSE streaming**: Bestaande SSE patronen (zie AI Exploration) toepassen op
  Content Studio generatie
- **Kwaliteitscontrole**: Na generatie automatisch type-specifieke quality scoring
  uitvoeren (infra staat al — `quality-scorer.ts`)
- **Varianten**: 3 varianten per generatie voor tekst-types (infra staat al)

### B-FIN.2 Canvas Restpunten

- **Board-weergave**: Kanban board van alle campagne-deliverables per status
- **ZIP export**: Alle goedgekeurde deliverables als ZIP
- **Derive modal verbetering**: Nieuw deliverable afleiden van bestaand,
  openen in Studio

### B-FIN.3 TipTap Inline Suggesties

De TipTap editor is functioneel maar mist inline AI suggesties:
- "Maak korter" / "Verhoog urgentie" / "Meer brand voice"
- Implementatie via floating toolbar + AI call

### Succesvereisten na Fase B-FIN
- Echte AI-gegenereerde content voor minimaal de top 10 content types
- Board-weergave toont correcte status-verdeling
- Export als ZIP werkt
- TipTap inline suggesties werkend voor minimaal 3 acties

---

## FASE D: DEPLOYMENT + BILLING + AGENT-FUNDAMENT (KRITIEKE BLOCKER)

> Dit is de #1 prioriteit na B-FIN. Zonder Fase D kan het platform
> niet live en niet commercieel worden.

### D.1 Deployment (uit TODO.md Fase 9)
- Vercel project setup
- Environment variables configureren (production)
- Database migratie naar production PostgreSQL (Neon/Supabase/Railway)
- CI/CD pipeline (GitHub Actions → Vercel)
- Custom domain configuratie
- Sentry integratie (error tracking + source maps + alerts)
- PostHog integratie (key events tracking, feature usage dashboards)

### D.2 Aanvulling: Kritieke Agent-Fundament Items

**D.2.1 Redis via Upstash**
- Doel: vervangt in-memory rate limiter en cache voor horizontale schaling
- Implementatie: `@upstash/redis` SDK, update `src/lib/ai/rate-limiter.ts`
- Aanvulling: Redis ook gebruiken voor sessie-cache en toekomstige BullMQ queues
- Config: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env vars
- **Waarom nu**: agents draaien parallel en destabiliseren in-memory state

**D.2.2 Resend E-mail (transactioneel)**
- Doel: echte e-mail voor team-invites, notificaties, goedkeuringsverzoeken
- Implementatie: `resend` SDK (al geïnstalleerd), `src/lib/email/` service laag
- Templates via React Email: invite, wachtwoord-reset, weekly-report (placeholder)
- Config: `RESEND_API_KEY` env var
- **Waarom nu**: agents sturen goedkeuringsverzoeken via e-mail (Fase F)

**D.2.3 pgvector voor Agent Memory**
- Doel: persistent geheugen voor agents — wat werkte, wat niet, per workspace
- Implementatie:
  1. Zet `vector` extensie aan op production PostgreSQL
  2. Nieuw Prisma model: `AgentMemory`
  3. Embedding via OpenAI `text-embedding-3-small` (goedkoop, snel)
- Prisma model:
  ```
  model AgentMemory {
    id          String   @id @default(cuid())
    workspaceId String
    workspace   Workspace @relation(fields: [workspaceId], references: [id])
    content     String   // Tekst van de herinnering
    embedding   Unsupported("vector(1536)")? // pgvector
    memoryType  AgentMemoryType // CAMPAIGN_RESULT | STRATEGY_INSIGHT | USER_PREFERENCE
    sourceId    String?  // campagne-id, sessie-id, etc.
    confidence  Float    @default(1.0)
    decayWeight Float    @default(1.0) // daalt over tijd voor irrelevante memories
    createdAt   DateTime @default(now())
    updatedAt   DateTime @updatedAt

    @@index([workspaceId])
  }

  enum AgentMemoryType {
    CAMPAIGN_RESULT
    STRATEGY_INSIGHT
    USER_PREFERENCE
    CONTENT_PERFORMANCE
    CHANNEL_INSIGHT
  }
  ```
- Service: `src/lib/agents/memory.ts` — functies: `storeMemory()`, `recallRelevant()`,
  `decayOldMemories()`
- **Waarom nu**: agents in Fase F bouwen op dit fundament; later toevoegen is migratie-werk

**D.2.4 Webhook Infrastructuur + Job Queue**
- Doel: agents opereren event-driven (niet polling-based)
- Implementatie:
  1. `BullMQ` via Redis (Upstash-compatible) als job queue
  2. Nieuw Prisma model: `AgentJob`
  3. Worker-architectuur in `src/lib/agents/workers/`
  4. Webhook endpoints voor externe triggers (ad platform events, etc.)
- Prisma model:
  ```
  model AgentJob {
    id          String      @id @default(cuid())
    workspaceId String
    workspace   Workspace   @relation(fields: [workspaceId], references: [id])
    jobType     AgentJobType
    status      AgentJobStatus @default(PENDING)
    payload     Json
    result      Json?
    error       String?
    scheduledAt DateTime?
    startedAt   DateTime?
    completedAt DateTime?
    createdAt   DateTime    @default(now())

    @@index([workspaceId, status])
    @@index([scheduledAt])
  }

  enum AgentJobType {
    CAMPAIGN_ANALYZE
    CONTENT_GENERATE
    PERFORMANCE_REPORT
    STRATEGY_OPTIMIZE
    TREND_SCAN
    COMPETITOR_REFRESH
  }

  enum AgentJobStatus {
    PENDING
    RUNNING
    COMPLETED
    FAILED
    CANCELLED
  }
  ```
- Worker entry point: `src/lib/agents/workers/index.ts`
- Webhook endpoint: `src/app/api/webhooks/[provider]/route.ts`
- **Waarom nu**: zonder queue-systeem kunnen agents geen async taken uitvoeren

**D.2.5 PostHog als Feedback Engine (uitbreiding van D.1)**
- Doel: méér dan analytics — de meetlaag voor agent-feedback loops
- Extra events t.o.v. standaard tracking:
  - `content_generated` (type, quality_score, brand_alignment_score)
  - `content_exported` (type, destination)
  - `content_published` (type, platform — toekomstig)
  - `campaign_completed` (duration, deliverable_count)
  - `strategy_generated` (confidence_score, asset_coverage)
  - `agent_action_taken` (job_type, autonomy_level, escalated)
  - `agent_escalated` (reason, confidence_score)
  - `user_approved` (action_type, time_to_approve)
- Custom properties per event: `workspace_plan`, `brand_foundation_coverage`,
  `active_persona_count`
- **Waarom uitgebreid**: agents leren van deze events in Fase F

### D.3 Stripe Live Billing

Stripe wordt onderdeel van de deployment-sprint zodat het platform
commercieel is op de dag van launch.

- Stripe account setup + API keys
- Twee minimale plannen bij launch:
  - `direct-monthly`: prijs nader te bepalen (zie OPEN BESLISSINGEN)
  - `agency-monthly`: prijs nader te bepalen, max 5 workspaces
- Checkout flow: plan selectie → Stripe Checkout → redirect
- Webhook handler: `src/app/api/stripe/webhook/route.ts`
  Events: `checkout.session.completed`, `invoice.payment_succeeded`,
  `invoice.payment_failed`, `customer.subscription.deleted`
- Plan enforcement: `WorkspacePlan` enum op `Workspace` model,
  middleware check `src/lib/middleware/plan-gate.ts`
- Subscription management in Settings > Billing
- **NB**: Settings > Billing UI is al gebouwd (S9) maar verbindt nog niet met Stripe

---

## FASE E-AGT: AGENT CAPABILITY LAYER

> **Nieuwe capability laag bovenop bestaande modules.**
> Agents voegen waarde toe waar de stappen NIET vooraf bekend zijn.
> Bouwt op Fase D-AGT fundament (pgvector, BullMQ, webhooks).
>
> Laatst bijgewerkt: 9 april 2026

### E-AGT.1 Brand Chat + Agent Hub

**Doel**: Eén UI-laag die zowel input (chat/prompts/uploads) als output
(agent activity, approvals, rapportages) combineert. De chat is de
universele trigger-laag voor alle agents en modules.

> **Combineert**: Chat Assistant + F.2 Agent Activity Dashboard.
> F.2 wordt hiermee onderdeel van E-AGT.1 — het dashboard is de
> output-kant van dezelfde interface.

**Chat als input-laag**:
- Persistente sidebar of modale view, altijd bereikbaar
- Gebruiker kan typen, links plakken, bestanden uploaden (PDF/afbeeldingen)
- Agent herkent intentie en routeert naar juiste module:
  - "Hier is onze nieuwe brandguide PDF" → Brandstyle Analyzer
  - "Wat vind je van deze tagline?" → Brand Promise advies
  - "Analyseer concurrent X" → Competitor Analyzer
  - "Genereer een LinkedIn post over product Y" → Content Studio
  - "Hoe staat het met onze brand alignment?" → Alignment rapport
  - "Onderzoek merk X" → Brand Research Agent (E-AGT.2)
  - "Onboard klant Y" → Client Onboarding Agent (E-AGT.3)
  - "Verbeter mijn merk score" → Brand Alignment scan→fix→rescan loop
  - "Genereer alle content voor campagne Z" → batch content generatie
- Context-aware: agent heeft toegang tot volledige brand context
- Resultaten worden automatisch opgeslagen in de juiste module

**Agent Hub als output-laag** (vervangt F.2 Agent Activity Dashboard):
- Feed van recente agent-acties (wat heeft de agent gedaan?)
- Openstaande goedkeuringsverzoeken (approvals vanuit alle agents)
- Performance summary (wat heeft het opgeleverd?)
- Autonomieniveau configuratie per taaktype (Autonomy Dial)
- Agent memory browser (wat heeft de agent geleerd?)

**Technisch**:
- Bestandslocatie: `src/features/brand-chat/` (chat) + `src/features/agent-hub/` (dashboard)
- Claude Sonnet/Opus als backbone met function calling
- Tool definitions voor elke Branddock-module (brand assets, personas, products,
  competitors, campaigns, brandstyle, trends, alignment)
- Upload parsing: PDF via `unpdf`, afbeeldingen via Claude Vision
- Chat history: hergebruik bestaand `ExplorationSession` + `ExplorationMessage` patroon
- SSE streaming voor responses
- Agent Hub leest uit `AgentJob` + `AgentApproval` + `AgentMemory` (Fase D-AGT modellen)

**Impact op Fase F.2**:
F.2 (Human-in-the-Loop Infrastructuur) behoudt de backend-componenten
(ApprovalWorkflowEngine, AgentApproval model, notificatie flow, Autonomy Dial config)
maar de UI verschuift naar E-AGT.1 Agent Hub. F.2 hoeft geen apart dashboard
meer te bouwen.

---

### E-AGT.2 Open-ended Brand Research Agent

**Doel**: Autonome merkonderzoeker die zelfstandig een compleet beeld opbouwt
van een merk in een specifieke markt. Dit kan Branddock nu niet — de stappen
zijn NIET vooraf bekend.

> **Relatie met bestaande modules**: Hergebruikt infra uit Trend Radar (scraping,
> content-differ), Competitor Analyzer (URL analyse, Gemini), en enrichment
> bronnen (Exa, Gemini grounding). Maar de agent is fundamenteel anders:
> hij bepaalt ZELF welke stappen nodig zijn en wanneer genoeg data is.
> De bestaande modules zijn deterministische pipelines; deze agent is adaptief.

**Trigger**: Via Brand Chat ("Onderzoek merk X in de Nederlandse markt") of
dedicated knop in dashboard.

**Wat de agent autonoom doet**:
1. Websites van het merk scrapen (hoofdsite, socials, vacatures)
2. Concurrenten ontdekken via AI search (Exa/Perplexity)
3. Social media signalen oppikken (mentions, sentiment, tone of voice)
4. Nieuws en persberichten analyseren (NewsAPI, GNews)
5. Merkregistraties checken (Markerapi)
6. Visuele identiteit analyseren (kleuren, fonts, beeldtaal via Claude Vision)
7. **Zelf beslissen wanneer genoeg data is** (confidence scoring per dimensie)
8. Een gestructureerd rapport opleveren met:
   - Brand positioning map
   - Competitor landscape
   - Tone of voice analyse
   - Visuele identiteit profiel
   - Kansen en bedreigingen
   - Aanbevelingen

**Technisch**:
- Bestandslocatie: `src/lib/agents/brand-researcher/`
- LangGraph.js state machine met dynamische node-selectie
- Agent memory: opslaan van onderzoeksresultaten per stap in `AgentMemory`
- Confidence scoring: per dimensie (0-100%) bijhouden hoeveel data is verzameld
- Termination condition: alle dimensies > 70% confidence OF max 15 minuten
- Hergebruik bestaande infra:
  - `url-scraper.ts` (bestaand) voor website scraping
  - Exa API (bestaand) voor semantisch zoeken
  - Gemini grounding (bestaand) voor web search
  - `content-differ.ts` (bestaand) voor change detection
  - NewsAPI/GNews (nieuw, INT.33/INT.34) voor nieuws
  - Brandfetch API (nieuw, INT.4) voor merkdata
- Output: `BrandResearchReport` JSON opgeslagen als `KnowledgeResource`
- Optioneel: automatisch brand assets pre-fillen op basis van onderzoek
  (deelt dan `fillAssetFromResearch()` helper met E-AGT.3)

**Wat dit oplevert voor de gebruiker**:
- Progressie-indicatoren per onderzoeksdimensie
- Live feed van ontdekte informatie
- Eindrapport om te reviewen en goed te keuren
- One-click import van resultaten naar relevante modules

---

### E-AGT.3 Client Onboarding Agent

**Doel**: "Hier is de website van mijn klant, vul het complete merkprofiel in."
Agent scrapet de website, vult alle 12 brand assets, genereert personas,
analyseert producten — volledig autonoom.

> **Relatie met E-AGT.2**: Deelt scraping- en analyse-infra, maar verschilt
> fundamenteel in OUTPUT: E-AGT.2 levert een rapport, E-AGT.3 schrijft
> direct naar de database (12 brand assets, brandstyle, personas, producten).
> Gedeelde helper: `fillAssetFromResearch()` voor asset-invulling vanuit
> geanalyseerde data.

**Trigger**: Via Brand Chat ("Onboard klant X, website: ...") of knop in
Client Management (agency flow).

**Wat de agent autonoom doet**:
1. Website scrapen (alle pagina's: home, about, products, team, blog)
2. Visuele identiteit extraheren → Brandstyle vullen (kleuren, fonts, logo's, beeldtaal, vormentaal)
3. Brand assets invullen:
   - Purpose/Mission/Vision uit about/over-ons pagina
   - Brand Personality uit tone of voice analyse
   - Brand Archetype uit merkpositionering
   - Brand Story uit about/historie
   - Brand Essence uit tagline + positionering
   - Brand Promise uit USPs/value propositions
   - Core Values uit bedrijfscultuur/kernwaarden pagina
   - Social Relevancy uit MVO/duurzaamheid pagina
   - Transformative Goals uit visie/strategie
   - Golden Circle uit why/how/what structuur
4. Personas genereren op basis van doelgroepinformatie
5. Producten/diensten analyseren en aanmaken
6. Concurrenten identificeren en eerste analyse
7. Trend Radar bronnen voorstellen op basis van industrie

**Technisch**:
- Bestandslocatie: `src/lib/agents/client-onboarder/`
- LangGraph.js state machine: scrape → analyze → fill → validate → report
- Per brand asset: AI Exploration-achtige analyse maar dan automatisch (geen Q&A)
- Hergebruik bestaande infra:
  - `url-scraper.ts` voor website scraping
  - `visual-language-analyzer.ts` voor vormentaal
  - `css-visual-heuristics.ts` voor CSS extractie
  - `brand-context.ts` voor context assembly
  - Brandstyle analyzer pipeline voor kleuren/fonts
  - Competitor analyzer voor concurrenten
  - Product analyzer voor producten
- Output per stap opslaan in AgentJob.result
- Human review stap: gebruiker ziet alle ingevulde data en kan goedkeuren/aanpassen

**Wat dit oplevert voor de gebruiker**:
- Progressie-indicatoren per module (12 assets + brandstyle + personas + products)
- Resultaat om te reviewen: per asset een diff/preview
- One-click goedkeuring of per-asset aanpassing
- Van "lege workspace" naar "volledig merkprofiel" in 5-10 minuten

---

### E-AGT.4 Continuous Brand Monitor

**Doel**: Periodieke agent die zowel concurrenten monitort als de eigen
brand alignment bewaakt. Eén geautomatiseerde waakhond voor alles
wat verandert — extern en intern.

> **Combineert**: Competitor Monitoring + Brand Score Optimizer +
> Trend Radar cron infra. Draait op dezelfde BullMQ repeatable jobs
> als Trend Radar scanning. Hergebruikt bestaande pipelines:
> - Competitor: `url-scraper.ts` + `content-differ.ts` + Gemini analyse (bestaand)
> - Brand Alignment: `scanner.ts` + `fix-generator.ts` + `score-calculator.ts` (bestaand)
> - Trend Radar: cron job patroon + `researcher.ts` (bestaand)

**Trigger**: Toggle per concurrent ("Monitor"), toggle in Brand Alignment
("Auto-optimize"), of via Brand Chat.

**Wat de agent periodiek doet** (dagelijks/wekelijks configureerbaar):

**Externe monitoring (concurrenten)**:
1. Websites van gemonitorde concurrenten opnieuw scrapen
2. Vergelijken met vorige versie (`content-differ.ts`, bestaand)
3. Veranderingen classificeren (pricing, producten, positionering, visueel, content)
4. Impact assessment: hoe relevant is deze verandering voor ons merk?
5. Notificatie genereren met samenvatting en aanbeveling

**Interne monitoring (eigen merk)**:
1. Brand Alignment scan uitvoeren (8-stap AI analyse, bestaand)
2. Issues prioriteren op impact (CRITICAL → WARNING → SUGGESTION)
3. Bij auto-optimize AAN:
   - Fix-opties genereren (A/B/C, bestaand)
   - Beste fix selecteren op basis van brand context + agent memory
   - Fix toepassen (DB write-back, bestaand)
   - Opnieuw scannen om resultaat te valideren
   - Itereren tot target OF max 5 iteraties OF geen fixable issues
4. Bij auto-optimize UIT: alleen rapporteren, gebruiker past handmatig aan

**Technisch**:
- Bestandslocatie: `src/lib/agents/brand-monitor/`
- Cron-based via BullMQ repeatable jobs (Fase D-AGT, zelfde infra als Trend Radar)
- Prisma modellen:
  - `MonitorConfig` (workspaceId, monitorType COMPETITOR|ALIGNMENT, frequency,
    isActive, autoOptimize, targetScore, lastRunAt)
  - `MonitorEvent` (configId, eventType, changeData Json, impactScore,
    recommendation, isRead, createdAt)
- Hergebruik:
  - Competitor: `content-differ.ts` (sha256), `url-scraper.ts`, Gemini analyse,
    bestaande competitor refresh endpoint
  - Alignment: `scanner.ts`, `fix-generator.ts`, `score-calculator.ts`
  - Notificatie: bestaand `Notification` systeem + Resend e-mail
- Human approval: bij CRITICAL alignment fixes altijd vragen, bij WARNING configureerbaar

**Wat de gebruiker ziet**:
- Unified change feed in Agent Hub (E-AGT.1): concurrentwijzigingen en
  alignment-issues in één tijdlijn
- Per concurrent: change log met diff-weergave + impact score
- Brand Alignment: score stijgt in real-time bij auto-optimize, per-iteratie
  overzicht van gefikte issues
- Notificaties: "Concurrent X heeft pricing gewijzigd" /
  "Brand Alignment verbeterd van 72% naar 85% (4 issues gefixt)"

---

### Succesvereisten na Fase E-AGT

1. Brand Chat + Agent Hub werkend met minimaal 5 module-integraties als trigger
2. Agent Hub toont agent activity feed + openstaande approvals
3. Brand Research Agent levert gestructureerd rapport voor minimaal 3 test-merken
4. Client Onboarding Agent vult alle 12 brand assets + brandstyle voor een test-website
5. Continuous Brand Monitor stuurt correcte competitor-alerts bij gesimuleerde
   website-veranderingen EN verbetert alignment score met minimaal 10pp in test-workspace
6. Alle agents loggen naar AgentJob + AgentMemory
7. Human approval flow werkend voor high-impact acties (CRITICAL alignment fixes,
   budget-gerelateerde competitor-aanbevelingen)
8. Gedeelde `fillAssetFromResearch()` helper werkt vanuit zowel E-AGT.2 als E-AGT.3

---

## FASE F: BRANDCLAW AGENT CORE

> **Eerste fase die Branddock omzet naar Brandclaw.**
> Bouwt op de fundament-infrastructuur van Fase D.

### F.1 LangGraph.js Agent Orchestratie

**Installatie**
```bash
npm install @langchain/langgraph @langchain/anthropic @langchain/openai
```

**De Marketing Loop — State Machine**
Kern van Brandclaw: een cyclische graph met 6 nodes en conditionele edges.

```
[STRATEGY_ANALYST] → [CAMPAIGN_BUILDER] → [CONTENT_GENERATOR]
        ↑                                          ↓
[OPTIMIZATION_AGENT] ← [EVALUATION_AGENT] ← [MEASUREMENT_AGENT]
```

Bestandslocatie: `src/lib/agents/marketing-loop/`

Graph state definitie:
```typescript
interface MarketingLoopState {
  workspaceId: string;
  campaignId: string;
  brandContext: BrandContextSnapshot; // snapshot van brand foundation
  currentStrategy: CampaignStrategy | null;
  generatedContent: ContentItem[];
  performanceData: PerformanceSnapshot | null;
  evaluation: EvaluationResult | null;
  nextAction: AgentAction | null;
  humanApprovalRequired: boolean;
  approvalReason: string | null;
  cycleCount: number; // hoe vaak de loop al gedraaid heeft
  memories: AgentMemory[]; // relevante herinneringen uit pgvector
}
```

**Node Implementaties**

`strategy-analyst.ts` — Analyseert brand context + performance data,
formuleert strategische hypothesen. Input: brand foundation snapshot,
OKR-doelen, trend radar, agent memories. Output: strategische aanbevelingen
met confidence scores.

`campaign-builder.ts` — Vertaalt strategie naar concrete campagne-parameters:
doelgroep, kanalen, budget-verdeling, timing, content-types.

`content-generator.ts` — Roept bestaande Content Studio generatie aan.
Gebruikt `AgentJob` queue voor async uitvoering.

`measurement-agent.ts` — Haalt performance data op via PostHog API en
(toekomstig) Google Ads API, Meta API. Normaliseert metrics.

`evaluation-agent.ts` — Vergelijkt resultaten met strategie-doelen.
Formuleert lessen en opslaan als `AgentMemory`. Bepaalt volgende cyclus.

`optimization-agent.ts` — Formuleert concrete aanpassingen op basis van
evaluatie. Bepaalt of menselijke goedkeuring nodig is via confidence scoring.

**Conditionele Edges**
```typescript
// Na optimization-agent:
if (state.nextAction.confidence >= 0.85 && !state.nextAction.requiresHuman) {
  return "campaign-builder"; // autonoom doorgaan
} else if (state.nextAction.confidence >= 0.60) {
  return "await-human-approval"; // escaleer met voorstel
} else {
  return "strategy-analyst"; // begin opnieuw met meer onderzoek
}
```

### F.2 Human-in-the-Loop Infrastructuur

**Approval Workflow Engine**
- Bestandslocatie: `src/lib/agents/approvals/`
- Nieuw Prisma model:
  ```
  model AgentApproval {
    id              String         @id @default(cuid())
    workspaceId     String
    workspace       Workspace      @relation(...)
    jobId           String
    job             AgentJob       @relation(...)
    approvalType    ApprovalType
    proposedAction  Json           // wat de agent wil doen
    reasoning       String         // waarom de agent dit wil
    confidenceScore Float
    status          ApprovalStatus @default(PENDING)
    approvedBy      String?        // userId
    feedback        String?
    expiresAt       DateTime       // auto-escalate als niet beantwoord
    createdAt       DateTime       @default(now())
    resolvedAt      DateTime?
  }

  enum ApprovalType {
    STRATEGY_CHANGE     // nieuwe strategische richting
    BUDGET_ADJUSTMENT   // budgetwijziging
    NEW_CHANNEL         // nieuw platform activeren
    CONTENT_PUBLISH     // content publiceren
    CAMPAIGN_PAUSE      // campagne pauzeren
  }

  enum ApprovalStatus {
    PENDING
    APPROVED
    REJECTED
    EXPIRED
    AUTO_APPROVED // bij hoge confidence na timeout
  }
  ```

**Notificatie Flow**
1. Agent maakt `AgentApproval` aan met `status: PENDING`
2. E-mail via Resend: samenvatting + goedkeuringsknop (deep link naar approval page)
3. In-app: notificatie badge + `AgentActivityFeed` component
4. Timeout (48u): auto-escalate naar OWNER, of auto-approve bij confidence > 0.90

**Agent Activity Dashboard**
Nieuwe pagina in Settings of eigen sectie: `src/features/agent/AgentDashboard.tsx`
- Feed van recente agent-acties (wat heeft de agent gedaan?)
- Openstaande goedkeuringsverzoeken
- Performance summary (wat heeft het opgeleverd?)
- Autonomieniveau configuratie (Autonomy Dial per taaktype)

**Autonomy Dial**
Per workspace configureerbaar, opgeslagen in `WorkspaceAiConfig`:
```typescript
interface AutonomyConfig {
  strategyChanges: "always-ask" | "ask-above-threshold" | "always-auto";
  budgetChanges: "always-ask" | "ask-above-threshold" | "always-auto";
  contentPublish: "always-ask" | "ask-above-threshold" | "always-auto";
  budgetThreshold: number; // auto boven dit bedrag altijd vragen
  confidenceThreshold: number; // 0.0-1.0, default 0.85
}
```

### F.3 Brand Context Snapshot

De agent-loop werkt met een frozen snapshot van de brand context op het
moment van uitvoering. Dit voorkomt inconsistentie als de gebruiker
tijdens een agent-cyclus het merk aanpast.

```typescript
interface BrandContextSnapshot {
  snapshotAt: string; // ISO timestamp
  workspaceId: string;
  brandAssets: Record<string, BrandAssetContent>; // alle 12 assets
  styleguide: BrandStyleguideSnapshot;
  activePersonas: PersonaSnapshot[];
  products: ProductSnapshot[];
  currentOKRs: OKRSnapshot;
  trendRadarInsights: TrendSnapshot[];
  competitorOverview: CompetitorSnapshot[];
}
```

Snapshot wordt opgeslagen als JSON in `AgentJob.payload` en als
gearchiveerd JSON in `CampaignKnowledgeAsset` voor audit trail.

### F.4 Eerste Tastbare Output: Wekelijks Rapport

De eerste zichtbare Brandclaw-output voor gebruikers is het wekelijkse
agent-rapport. Dit is low-risk (alleen lezen en rapporteren, geen acties).

Rapport-inhoud:
- **Brand Health Score**: overall merk-score (o.b.v. alignment scan + trends)
- **Campagne Performance**: top 3 best/slechtst presterende deliverables
- **Trend Alerts**: nieuwe trends relevant voor het merk
- **Aanbevolen Volgende Stap**: één concrete actie met rationale
- **Agent Activity Log**: wat heeft de agent deze week gedaan?

Delivery: e-mail (Resend) + PDF download + in-app dashboard

---

## FASE G: BRANDCLAW CHANNEL ACTIVATION

> Bouwt op Fase F. Voegt executie-kanalen toe.

### G.1 Google Ads API Integratie

**OAuth Koppeling**
- Google OAuth (Fase A — al werkend) wordt uitgebreid met Google Ads scope
- Token opslaan in `WorkspaceIntegration` model (al aanwezig in schema):
  ```
  model WorkspaceIntegration {
    id            String   @id @default(cuid())
    workspaceId   String
    provider      IntegrationProvider
    accessToken   String   // encrypted
    refreshToken  String?  // encrypted
    expiresAt     DateTime?
    accountId     String?  // Google Ads customer ID
    metadata      Json?
    createdAt     DateTime @default(now())
    updatedAt     DateTime @updatedAt

    @@unique([workspaceId, provider])
  }

  enum IntegrationProvider {
    GOOGLE_ADS
    META_ADS
    LINKEDIN_ADS
    POSTHOG
    HUBSPOT
    NOTION
    AYRSHARE
  }
  ```

**Kampagne Beheer via API**
- Bestanden: `src/lib/integrations/google-ads/`
- Functies: `getCampaignPerformance()`, `updateBid()`, `pauseCampaign()`,
  `createCampaign()` (toekomstig)
- Measurement agent gebruikt `getCampaignPerformance()` in de loop
- Optimization agent kan `updateBid()` aanroepen (met human approval bij grote wijzigingen)

**Performance Metrics die worden bijgehouden**
- Impressies, clicks, CTR, CPC, conversies, ROAS
- Opgeslagen in `CampaignPerformanceSnapshot` (nieuw Prisma model)
- Historisch bewaard voor trend-analyse door agents

### G.2 DataForSEO Integratie

- SEO-intelligence voor Content Studio: zoekvolume, keyword difficulty,
  SERP-positie tracking
- Bestandslocatie: `src/lib/integrations/dataforseo/`
- Gebruik: bij generatie van SEO-pagina's en blogposts

### G.3 Uitgebreide Wekelijkse Rapportage

Met Google Ads data erbij bevat het wekelijkse rapport ook:
- Ad spend vs. budget (% benut)
- Beste advertentietekst deze week
- Aanbeveling: pause / scale / test

---

## FASE H: BRANDCLAW FULL PLATFORM

> Meta Ads + Social Publishing + CRM loop.

### H.1 Meta Ads API
- Facebook + Instagram campagne-data + aanpassingen
- OAuth via Facebook Login
- Implementatie parallel aan Google Ads maar met extra aandacht voor
  Meta's instabiele API (versie-pinning, retry-logica, async review-status)

### H.2 Social Publishing via Ayrshare
- Directe publicatie van goedgekeurde content naar LinkedIn, Instagram,
  Facebook, X, TikTok
- `POST /api/integrations/ayrshare/publish`
- Content Studio: "Publiceer" knop activeert Ayrshare
- AgentJob type: `CONTENT_PUBLISH` (altijd human approval vereist)

### H.3 HubSpot CRM Loop
- Leads uit campagnes automatisch naar HubSpot
- Contact properties verrijkt met Brandclaw persona-data
- Deal-tracking: welke campagne heeft welke deal opgeleverd?

### H.4 Cross-Workspace Data Flywheel (KRITIEK voor valuatie)
- Anonieme prestatiedata aggregeren over alle workspaces heen
- `WorkspacePerformanceBenchmark` Prisma model: sector, brand_type,
  content_type, avg_engagement, avg_conversion
- Agents gebruiken benchmarks als context: "Jouw CTR is 2,1%.
  De gemiddelde CTR voor fashion merken in jouw segment is 3,4%.
  Hier zijn drie hypothesen om het verschil te overbruggen."
- Dit is de data moat die de valuatie-multiple bepaalt.

---

## FASE I-FIN: MEDIA ASSETS RESTPUNTEN

> Wat nog resteert na I.1 (Brand Voices), I.3 (AI Images), I.4 (AI Videos).

### I.2 Geluidsbibliotheek
- ElevenLabs Sound Effects API voor merkspecifieke geluiden
- Bibliotheek-UI: upload eigen audio + AI-gegenereerde varianten

### I.5 Video Generatie Uitgebreid (conditioneel)
- Pas uitvoeren als markt rijp is (huidige inschatting: Q3 2027)
- Evalueer naast Runway ML ook: Kling, Luma Dream Machine
- Gebruik: TikTok scripts omzetten naar concept-video's voor review

---

## OPEN BESLISSINGEN (URGENT — blokkeren Fase D)

Deze beslissingen moeten genomen worden vóór de aangegeven fase.
Vastleggen in dit document zodra besloten.

### Vóór Fase D — URGENT (blokkeert productie-launch)
1. **Redis provider**: Upstash (aanbevolen — serverless, geen infra) vs. self-hosted
2. **PostgreSQL provider**: Neon (aanbevolen — serverless, pgvector support) vs. Supabase vs. Railway
3. **Cloud storage**: Cloudflare R2 (aanbevolen — goedkoop, S3-compatible) vs. AWS S3
4. **Pricing tiers**: bedragen en limieten voor Direct-plan en Agency-plan
5. **Gratis tier**: wel of niet, en met welke limieten (assets, AI calls, workspaces)
6. **Agency pricing model**: per seat / per workspace / flat tier / hybrid

### Vóór Fase F
7. **Agent autonomie defaults**: wat is de default Autonomy Dial voor nieuwe workspaces?
   Aanbeveling: start op "always-ask" voor alle acties, laat gebruiker upgraden
8. **Wekelijks rapport timing**: vaste dag (maandag ochtend aanbevolen) of configureerbaar?

### Vóór Fase I.5
9. **Video provider evaluatie**: Runway ML (al geïntegreerd) vs. Kling vs. Luma (nader testen)

---

## TECHNISCHE CONSTRAINTS & GOTCHAS

> Aanvulling op CLAUDE.md gotchas.md — Brandclaw-specifiek

### Agent-specifieke constraints
- **Nooit AI-gegenereerde agent-beslissingen direct in Prisma spreaden.**
  Altijd sanitizen via whitelist (zie gotchas.md principe 2).
- **Agents mogen nooit onomkeerbare acties uitvoeren zonder AgentApproval record.**
  Onomkeerbaar = publiceren, betalen, verwijderen, grote budgetwijzigingen.
- **pgvector queries zijn CPU-intensief.** Gebruik altijd `LIMIT` en
  cosine similarity threshold (>= 0.75) om irrelevante memories uit te sluiten.
- **BullMQ jobs moeten idempotent zijn.** Bij retry mag dezelfde job niet
  dubbele effecten hebben.
- **LangGraph state is immutable per stap.** Gebruik de reducer-pattern —
  elke node returnt een delta, niet de volledige state.

### Content Studio constraints
- **Streaming via SSE.** Gebruik bestaand SSE-patroon (zie AI Exploration
  implementatie voor referentie-implementatie).
- **Content type config is data, niet code.** Content type configuraties
  staan in `src/features/campaigns/lib/deliverable-types.ts` (47 types).
  Type-specifieke constraints, quality criteria en export formats zijn
  reeds gedefinieerd per type.
- **Platform character limits zijn harde grenzen.** Valideer altijd server-side
  via `content-validator.ts`, niet alleen client-side.

### Media assets constraints
- **Gegenereerde beelden zijn workspace-eigendom.** Opgeslagen als
  `GeneratedImage` Prisma records, gekoppeld aan workspace.
- **ElevenLabs voice_ids zijn stabiel maar kunnen deprecated worden.**
  Sla altijd de voice-naam op naast het ID voor fallback-selectie.
- **Video generatie is kostbaar.** Implementeer altijd een preview-stap
  (storyboard/thumbnail) vóór volledige video-generatie.
- **AI caller retry-logica**: OpenAI heeft `withRetry()` wrapper,
  Gemini heeft eigen retry-loop in `gemini-client.ts`. Geen dubbele wrapping.

---

## SUCCESVEREISTEN PER FASE

### Na Fase B-FIN (Content Studio + Canvas afronding)
- Echte AI-gegenereerde content voor top 10 content types in < 30 seconden
- Kwaliteitsscore is zichtbaar na elke generatie (al werkend)
- Board-weergave toont correcte status-verdeling
- Export als ZIP werkt voor alle goedgekeurde deliverables
- TipTap inline suggesties werkend

### Na Fase D (Deployment + Billing + Agent Fundament)
- Platform is live op productie-URL
- Stripe checkout werkt end-to-end
- E-mail invite werkt (echte e-mail via Resend, niet DB-record)
- Redis rate limiter vervangt in-memory implementatie volledig
- `AgentMemory`, `AgentJob`, `AgentApproval`, `WorkspaceIntegration`
  modellen bestaan in productie-database
- pgvector extensie actief op productie-PostgreSQL

### Na Fase F (Agent Core)
- Wekelijks rapport wordt automatisch gegenereerd en gemaild
- Agent Activity Dashboard toont recente acties
- Goedkeuringsverzoeken komen binnen via e-mail met werkende deep link
- Autonomy Dial is configureerbaar in Settings
- Één complete Marketing Loop cyclus doorloopt zonder errors
  (al is het met placeholder externe data)

### Na Fase G (Channel Activation)
- Google Ads koppeling werkt: performance data zichtbaar in dashboard
- Wekelijks rapport bevat echte ad-performance data
- Agent kan bid-aanpassing voorstellen (met human approval)

### Na Fase H (Full Platform)
- Meta Ads data zichtbaar in rapportage
- Social publishing werkt via Ayrshare (met human approval)
- Cross-workspace benchmark data beschikbaar voor agents
- HubSpot CRM ontvangt leads uit campagnes

### Na Fase I-FIN (Media Assets restpunten)
- Geluidsbibliotheek werkend (ElevenLabs Sound Effects)
- Video generatie evaluatie afgerond (marktrijpheid)

---

## CONTENT TYPE MATRIX (referentie — uit originele Fase B)

De volledige content type matrix is nu geïmplementeerd in
`src/features/campaigns/lib/deliverable-types.ts` met 47 types,
elk voorzien van constraints, quality criteria en export formats.

Categorieën:
- **Social Media** (8 types): LinkedIn Post, Instagram Caption, Facebook Post,
  X Post, TikTok Script, Reels Concept, YouTube Script, Podcast Outline
- **Advertising** (4 types): Google Ads Copy, Meta Ad Copy, LinkedIn Ad Copy,
  Display Ad Copy
- **Email** (3 types): Newsletter, Outreach, Drip Campaign
- **SEO & Long-form** (4 types): SEO Page, Blog Post, Whitepaper, Case Study
- **PR & HR & Communications** (7 types): Press Release, Pitch Deck Outline,
  Career Page, Job Ad Copy, Employee Story, Employer Brand Video, Impact Report
- **Sales & Conversion** (5 types): Landing Page, Product Description,
  Testimonial Script, Sales Email Sequence, Comparison Page
- **Video & Audio** (5 types): Video Script, Radio Script, Podcast Ad Script,
  Explainer Video Script, Brand Video Script
- **Visual Briefs** (2 types): Visual Brief Social, Visual Brief Ad
- **Website** (4 types): Homepage Copy, About Page, FAQ Page, Product Page

AI model per type is configureerbaar via Settings > AI Models (per-feature LLM selectie).

---

## RELATIE TOT ANDERE DOCUMENTEN

| Document | Rol | Prioriteit |
|----------|-----|-----------|
| `BRANDCLAW-ROADMAP.md` (dit document) | Strategische roadmap + fasespecs | Hoogste |
| `CLAUDE.md` | Codebase patterns, gotchas, werkregels | Hoog |
| `PATTERNS.md` | UI-component patterns, design tokens | Hoog |
| `TODO.md` | Gedetailleerde takenlijst per sprint | Middel |
| `gotchas.md` | Bugs en lessen | Middel |

**Bij conflicten**: BRANDCLAW-ROADMAP.md wint van TODO.md.
CLAUDE.md wint van beiden voor technische implementatie-beslissingen.

---

*Dit document wordt bijgewerkt na elke afgeronde fase.
Voeg je initialen en datum toe bij elke update: `[EJ 30-03-2026]`*
