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
> Laatst bijgewerkt: 27 maart 2026

---

## CONTEXT: WAT IS BRANDDOCK EN WAT WORDT BRANDCLAW?

### Branddock (huidige staat)
Branddock is een Next.js 16 / React 19 / PostgreSQL SaaS-platform voor brand
strategy, research validatie en AI-gedreven content generatie. Het platform heeft:

- **76+ Prisma-modellen**, 200+ API endpoints, 300+ UI-componenten
- **12 canonical brand assets** per workspace (mission, vision, values, positioning, etc.)
- **OKR-module** (BusinessStrategy, Objective, KeyResult, FocusArea, Milestone)
- **Campaign module** (STRATEGIC/QUICK, deliverables, Content Studio)
- **Trend Radar, Brand Alignment scan, Research Hub, Knowledge Library**
- **Multi-model AI**: Claude (strategie), GPT (content), Gemini (multimodal)
- **Behavioral science** ingebakken: COM-B, Cialdini, Byron Sharp, Kahneman
- **Multi-tenant**: AGENCY + DIRECT client model, workspace-scoped data

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

## ACTUELE SPRINT-STAAT (per 27 maart 2026)

### Afgerond (niet aanraken tenzij expliciet gevraagd)
- Fase 1: Technische schuld & cleanup (grotendeels ✅)
- Fase 3: AI Features (grotendeels ✅ — S1/S2 consolidatie, product/brandstyle analyzer)
- Fase 4: Knowledge / Brand Foundation (grotendeels ✅ — AI Exploration, versioning, PDF export)
- AI Exploration systeem: end-to-end werkend voor alle 12 brand asset types
- ExplorationConfig systeem: 13 configs geseeded, admin UI volledig
- Lock/unlock: werkend op personas, deels op brand assets

### Openstaand — in volgorde van aanpak
Zie fasevolgorde hieronder. De exacte items per fase staan in TODO.md.
Dit document voegt specs toe die in TODO.md ontbreken.

---

## FASEVOLGORDE (herzien en volledig)

```
Fase A:  S11 — OAuth + E2E Testing + Performance
Fase B:  Content Studio Voltooien — generatie, kwaliteit, export
         Spec: CONTENT-STUDIO-SPEC.md
Fase B2: Content Canvas — orkestratie, goedkeuring, publicatie
         Spec: CONTENT-CANVAS-SPEC.md
Fase C:  S13 — Visual Regression Fix
Fase D:  S12 uitgebreid — Deployment + Agent-Fundament Infrastructure
Fase E:  Research & Validation Stubs (Fase 5 uit TODO.md)
Fase F:  Brandclaw Agent Core (NIEUW — eerste autonome loop)
Fase G:  Brandclaw Channel Activation (Google Ads + Reporting)
Fase H:  Brandclaw Full Platform (Meta + Social + CRM)
Fase I:  Media Assets Layer (voice, beeld, video — spec hieronder)
```

**Twee spec-bestanden voor de content-modules:**
- `CONTENT-STUDIO-SPEC.md` — per-deliverable generatie, kwaliteit, export (Fase B)
- `CONTENT-CANVAS-SPEC.md` — multi-deliverable orkestratie, goedkeuring, publicatie (Fase B2)

---

## FASE A: S11 — OAuth + E2E Testing + Performance

> Bron: TODO.md Fase 8 (Billing & Auth) + Fase 8.3 (Testing)
> Status: Niet gestart. Geen aanpassingen t.o.v. TODO.md.

### Deliverables
- Google OAuth + Microsoft OAuth via Better Auth
- Playwright E2E tests voor kritieke flows
- Performance benchmarks

### Succesvereisten
- Login via Google en Microsoft werkt end-to-end
- E2E tests draaien voor: login → dashboard → brand asset detail → AI exploration → campaign aanmaken
- OAuth tokens worden correct opgeslagen voor later gebruik bij Google Ads API

---

## FASE B: CONTENT STUDIO VOLTOOIEN

> **Spec-bestand**: CONTENT-STUDIO-SPEC.md bevat de volledige spec.
> Dit document geeft een samenvatting. Lees altijd de spec mee bij Fase B-sessies.

### Context
De Content Studio (Fase 6 in TODO.md) genereert deliverables voor campagnes.
De huidige staat: UI shells aanwezig, AI-generatie is stub/placeholder.
Fase B voltooit de generatie-laag. Fase B2 (Content Canvas) voegt
orkestratie, goedkeuring en publicatie toe.

De volledige herziening is gespecificeerd in CONTENT-STUDIO-SPEC.md.
Hieronder een samenvatting van de kernsecties.

### B.1 Content Type Matrix — volledig te ondersteunen

Elke content type heeft een `deliverableType` slug, een AI-prompt strategie,
vereiste brand context en een outputstructuur.

#### TEKST-CONTENT (direct uitvoerbaar met bestaande AI stack)

**LinkedIn Post**
- Slug: `linkedin-post`
- Output: tekst (max 3000 tekens), optioneel hashtags, optioneel CTA
- Brand context: brand voice (tone of voice uit brandstyle), persona (doelgroep),
  product (indien relevant), campagnedoel (uit campaign.objective)
- Varianten: 3 per generatie (kort/middel/lang)
- Specials: hooks (eerste zin), storytelling-structuur, engagement-triggers
- AI model: Claude Sonnet (redenering + brand alignment)

**Instagram Caption**
- Slug: `instagram-caption`
- Output: tekst (max 2200 tekens), hashtag blok (max 30), CTA
- Varianten: 3 per generatie
- Specials: emoji-gebruik afgestemd op brand personality, hashtag-strategie
- AI model: Claude Sonnet

**Facebook Post**
- Slug: `facebook-post`
- Output: tekst (max 63.206 tekens, optimaal 40-80 woorden), CTA, link-tekst
- Varianten: 3
- AI model: Claude Sonnet

**X (Twitter) Post / Thread**
- Slug: `x-post`
- Output: enkelvoudig tweet (max 280 tekens) of thread (max 10 tweets)
- Varianten: 3 single + 1 thread optie
- AI model: GPT-4o (kort en puntig)

**E-mail — Nieuwsbrief**
- Slug: `email-newsletter`
- Output: onderwerpregel, preheader, body HTML (via React Email template),
  CTA-knop tekst, afmeld-voettekst
- Brand context: brand voice, producten, campagnedoel, persona
- Varianten: 3 onderwerpregels, 1 body
- AI model: GPT-4o

**E-mail — Koude Outreach / Acquisitie**
- Slug: `email-outreach`
- Output: onderwerpregel, korte body (max 200 woorden), CTA, PS-regel
- Specials: Cialdini-principes als constraint (reciprocity, social proof, scarcity)
- Varianten: 3 complete versies
- AI model: Claude Sonnet (behavioral science integratie)

**SEO-geoptimaliseerde Pagina**
- Slug: `seo-page`
- Output: H1, meta title (max 60 tekens), meta description (max 160 tekens),
  introductie (150-200 woorden), 3-5 H2 secties met body tekst,
  interne linkingsuggesties, FAQ-sectie (3-5 vragen)
- Brand context: brand positioning, producten, doelzoekwoorden (user input)
- Specials: keyword-dichtheid bewaking, semantische varianten,
  E-E-A-T signalen (expertise, experience, authoritativeness, trust)
- AI model: GPT-4o (SEO-optimalisatie) + Claude (brand alignment check)
- Lengtes: kort (600-800 woorden), middel (1200-1500), lang (2000-2500)

**Blogpost / Artikel**
- Slug: `blog-post`
- Output: titel, intro, 4-8 secties met H2/H3, conclusie, CTA
- Specials: verhaalstructuur (Problem → Agitate → Solution),
  behavioral science frames (System 1 triggers), fact-check markers
- Varianten: 2 structuren per generatie
- AI model: Claude Sonnet

**Google Ads Advertentietekst**
- Slug: `google-ads-copy`
- Output: 3 headlines (max 30 tekens elk), 2 descriptions (max 90 tekens elk),
  display URL-pad, extensies (sitelinks, callouts)
- Specials: keyword-integratie, USP-hiërarchie, Quality Score-optimalisatie
- Varianten: 3 complete sets
- AI model: GPT-4o (karakter-precisie)

**Meta Advertentietekst (Facebook + Instagram)**
- Slug: `meta-ad-copy`
- Output: primaire tekst (max 125 tekens optimaal), headline (max 27 tekens),
  beschrijving (max 27 tekens), CTA-knop selectie
- Specials: pain-gain framing, social proof elementen, urgentie-triggers
- Varianten: 3 per generatie (awareness / consideration / conversion)
- AI model: Claude Sonnet

**Persbericht**
- Slug: `press-release`
- Output: kop, subkop, datumregel, lead (eerste alinea — de 5 W's),
  body (3-4 alinea's), quote (merkwoordvoerder), boilerplate, contactgegevens
- Specials: journalistieke schrijfstijl, inverted pyramid structuur
- Varianten: 1 (persberichten zijn niet A/B)
- AI model: Claude Sonnet

**TikTok Script**
- Slug: `tiktok-script`
- Output: haak (eerste 3 seconden), visuele regiebeschrijving per beat,
  gesproken tekst, ondertiteling-suggesties, trending audio-suggestie,
  hashtag-strategie
- Specials: aandachtsboog (hook → value → CTA in 15-60 sec),
  native TikTok gedrag (duet, stitch, trends)
- Varianten: 2 concepten per generatie
- AI model: Claude Sonnet
- **Noot**: Script + briefing voor creator/tool. Geen video-generatie in deze fase.

**YouTube Script**
- Slug: `youtube-script`
- Output: titel (SEO + klik-waardig), thumbnail concept, haak (eerste 30 sec),
  intro, hoofdinhoud (secties), CTA, eindscherm-tekst, beschrijving, tags
- Specials: retention-optimalisatie (pattern interrupts), chapters, SEO
- Varianten: 2 concepten (short < 3 min, long 8-15 min)
- AI model: Claude Sonnet

**Instagram/TikTok Reels Concept**
- Slug: `reels-concept`
- Output: concept-omschrijving, shot-list, tekst-overlays, muziek-richting,
  gesproken tekst (optioneel), hashtags
- Specials: vertical video formatting, native platform behavior
- Varianten: 2 per generatie
- AI model: Claude Sonnet

**Podcast Outline**
- Slug: `podcast-outline`
- Output: afleveringstitel, gasten-pitch (indien interview),
  intro-script, vragenlijst (10-15 vragen), segmentstructuur,
  outro-script, show notes
- Varianten: 1 (op aanvraag verfijnd)
- AI model: Claude Sonnet

**Whitepaper / Thought Leadership**
- Slug: `whitepaper`
- Output: titel, executive summary (500 woorden), inhoudsopgave,
  sectie-outlines met kernpunten, bronnen-aanbevelingen, conclusie
- Specials: data-gedreven argumentatie, autoriteitsopbouw, lead gen CTA
- AI model: Claude Opus (complexe redenering)

**Pitch Deck Outline**
- Slug: `pitch-deck-outline`
- Output: slide-voor-slide structuur (12-15 slides), kernboodschap per slide,
  speaker notes richting, data-placeholders
- Specials: investor / klant / partner varianten
- AI model: Claude Opus

**Case Study**
- Slug: `case-study`
- Output: challenge-oplossing-resultaat structuur, citaten-framework,
  metrics-sectie, visuele elementen-suggesties
- Varianten: kort (500 woorden) / lang (1500 woorden)
- AI model: Claude Sonnet

#### VISUELE BRIEFINGS (Fase B — geen beeld-generatie, wel briefs)

**Visual Brief — Sociale Media**
- Slug: `visual-brief-social`
- Output: beeldconcept (omschrijving), kleurgebruik (uit brandstyle),
  typografie-richtlijnen, model/setting-beschrijving, emotie/sfeer,
  formaat-specs per platform
- Brand context: brandstyle (kleuren, typografie), persona (model-type),
  campagnedoel
- AI model: Claude Sonnet
- **Noot**: Briefing voor Midjourney / Firefly / fotograaf. Geen beeld-generatie hier.

**Visual Brief — Advertentie**
- Slug: `visual-brief-ad`
- Output: primaire visual-beschrijving, tekst-overlay positionering,
  kleur- en contrastvereisten, CTA-knop ontwerp, formaat-varianten
- AI model: Claude Sonnet

#### SCRIPTS & AUDIO (Fase B — tekst-output)

**Radioscript / Audio Ad**
- Slug: `radio-script`
- Output: openingshaak, body (probleem → oplossing → brand), CTA, tijdsindicaties
- Duraties: 15 sec / 30 sec / 60 sec
- Specials: AIDA-structuur, gesproken ritme, brand voice enforcement
- AI model: Claude Sonnet

**Podcast Ad Script**
- Slug: `podcast-ad-script`
- Output: host-read script (authentiek), productintegratie, promo-code,
  URL-herhaling
- AI model: Claude Sonnet

### B.2 Content Generatie Architectuur

#### AI Context Hiërarchie (volgorde van prioriteit)
```
1. Brand Foundation (12 assets — altijd meegenomen)
   → Mission, Vision, Values, Brand Positioning, Brand Promise, etc.
2. Brand Styleguide (tone of voice, kleuren, typografie)
3. Actieve Persona (geselecteerde doelgroep)
4. Product/dienst (indien gekoppeld aan campagne)
5. Campagnedoel + KPIs (uit campaign.objective + business strategy)
6. Knowledge Assets (campagne-specifieke kennisbronnen)
7. Concurrentendata (indien beschikbaar)
8. Trend Radar (actuele trends als aanvullende context)
```

#### Kwaliteitscontrole per gegenereerde content
Na elke generatie voert het systeem automatisch uit:
- **Brand Voice Score** (0-100): past de toon bij brand personality?
- **Completeness Check**: zijn alle vereiste output-elementen aanwezig?
- **Platform Compliance**: voldoet de content aan platform-restricties
  (karakterlimieten, formaatvereisten)?
- **Behavioral Science Alignment**: welke persuasion principles zijn toegepast?

Deze scores worden opgeslagen in `ContentVersion.qualityMetrics` (JSON).

#### Versioning
Elke generatie maakt een nieuwe `ContentVersion`. De gebruiker kan:
- Terugkeren naar eerdere versies
- Versies naast elkaar vergelijken
- Een versie "vastzetten" als goedgekeurd

### B.3 Content Studio UI Herziening

De huidige Content Studio UI moet volledig worden herzien. Het nieuwe model:

**Stap 1: Deliverable Type Kiezen**
- Grid van content types met iconen en beschrijvingen
- Gegroepeerd: Sociaal / Advertentie / SEO & Blog / Video & Audio / Strategie & Thought Leadership
- Elk type toont: platform-icoon, gemiddelde generatietijd, AI-model badge

**Stap 2: Context Configureren**
- Automatisch ingeladen: brand context (altijd)
- Selecteerbaar: persona (dropdown), product (dropdown), kennisbronnen (multi-select)
- Aanpasbaar: campagnedoel (vrij tekst of uit campaign.objective)
- Optioneel: aanvullende instructies (vrij tekstveld, max 500 tekens)

**Stap 3: Genereren**
- Progressie-indicator per contextbron (brand ✓ → persona ✓ → strategy ✓ → generating...)
- Real-time streaming van gegenereerde content (SSE)
- Kwaliteitsscores verschijnen na afronding

**Stap 4: Reviewen & Bewerken**
- Rijke teksteditor (TipTap — al aanwezig)
- Inline AI-verbetersuggesties ("Maak korter" / "Verhoog urgentie" / "Meer brand voice")
- Side-by-side varianten (indien meerdere gegenereerd)

**Stap 5: Exporteren**
- Kopiëren naar klembord (altijd beschikbaar)
- Download als TXT / DOCX / PDF
- Publiceren (toekomstig: directe koppeling naar platform via Ayrshare)

### B.4 Media Assets Scope (Fase B — beslissingen vastleggen)

De volgende media-asset types worden in Fase B besloten en gepland,
maar pas in Fase I gebouwd:

**AI-Gegenereerde Beelden**
- Providers: Google Imagen 4 (al geïnstalleerd via Gemini), Flux, DALL-E 3
- Use cases: social media visuals, advertentie-achtergronden, hero images
- Consistentie-mechanisme: reference images + style prompts opgeslagen per workspace
  in `WorkspaceVisualStyle` Prisma model (nog te maken)
- **Beslissing nodig**: welke provider als primair (Imagen 4 meest logisch gezien
  bestaande Gemini-integratie)

**Consistente AI-Modellen (Fashion/People)**
- Techniek: LoRA fine-tuning of reference image injection (Flux preferred)
- Doel: een workspace kan "hun model" definiëren dat consistent terugkomt
  in alle gegenereerde beelden
- Opslag: reference images in cloud storage (R2), linked aan workspace
- **Beslissing nodig**: eigen fine-tuning pipeline vs. derde partij (Astria.ai, Photoroom)

**Brand Voices (Audio)**
- Provider: ElevenLabs API (al in Tier 3 integratielijst)
- Doel: workspace definieert één of meerdere brand voices (naam, gender, stijl)
- Use cases: podcast ads, radio scripts ingesproken, video voice-overs
- Opslag: `WorkspaceBrandVoice` Prisma model, ElevenLabs voice_id opgeslagen
- **Effort**: laag (ElevenLabs SDK + één UI-component). Fase I, Sprint 1.

**Geluidsbibliotheek**
- Provider: ElevenLabs Sound Effects API
- Doel: merkspecifieke geluiden (jingles, sound logos, sfx)
- Opslag: cloud storage, linked aan workspace
- **Effort**: laag. Fase I, Sprint 2.

**Video Generatie**
- Providers: Kling 1.6, Runway Gen-4, Luma Dream Machine
- Status: markt rijpt snel maar consistente branded video is nog niet productie-rijp
- **Beslissing**: Fase I, Sprint 3-4. Eerst scripts + briefings, dan video.

---

## FASE B2: CONTENT CANVAS

> **Spec-bestand**: CONTENT-CANVAS-SPEC.md bevat de volledige spec.
> Content Canvas is de multi-deliverable orkestratie- en publicatielaag
> die boven de Content Studio staat. Lees CONTENT-CANVAS-SPEC.md bij
> elke Fase B2-sessie.

### Wat Content Canvas doet

Waar Content Studio één deliverable genereert, orkestreert Content Canvas
alle deliverables van een campagne samen:

- **Orchestrate**: board-weergave van alle deliverables per status-kolom
- **Components**: goedkeuren op component-niveau (headlines, beschrijvingen)
- **Approval**: reviewer keurt content goed vóór publicatie (agency-model)
- **Publish**: exporteren als ZIP of (Fase H) directe publicatie via Ayrshare
- **Derive**: nieuw deliverable afleiden van bestaand (bv. LinkedIn → X-post)

### Prerequisite voor Fase B2

Fase B (Content Studio) moet volledig af zijn. Canvas bouwt voort op
de deliverables die Studio genereert.

### Wat in Fase B2 wordt gebouwd

-  — board per status-kolom
-  op Canvas (status, type, quick-acties)
-  — component-niveau weergave
-  — afleiden naar ander content type
-  — export als ZIP + klembord-kopieer
- API routes:  GET/POST,  GET/PATCH,  POST
- Deliverable status enum uitbreiden (PENDING_APPROVAL, APPROVED, PUBLISHED)
-  +  Prisma modellen

### Wat naar latere fases verschuift

- Volledige approval workflow met e-mailnotificaties → Fase D (Resend live)
- Directe publicatie via Ayrshare → Fase H
- Agent-gestuurde acties op Canvas → Fase F

### Succesvereisten na Fase B2

- Alle campagne-deliverables zijn zichtbaar in Canvas board-weergave
- Deliver-type kolommen tonen correcte status-verdeling
- Derive modal maakt werkend nieuw deliverable aan en opent in Studio
- Export als ZIP werkt voor alle goedgekeurde deliverables
- Approval UI is aanwezig (notificaties komen in Fase D)

---

## FASE C: S13 — VISUAL REGRESSION FIX

> Bron: TODO.md S13 (staat er impliciet in als "visual regression fix")
> Geen aanpassingen t.o.v. bestaande sprint-definitie.

---

## FASE D: S12 UITGEBREID — DEPLOYMENT + AGENT-FUNDAMENT

> TODO.md Fase 9 beschrijft de deployment. Dit document voegt vijf
> agent-fundament items toe die in TODO.md ontbreken maar kritiek zijn
> voor de overgang naar Brandclaw.

### D.1 Bestaande S12 items (uit TODO.md Fase 9)
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

### D.3 Stripe Live Billing (verschoven van S10 naar S12)

Stripe wordt onderdeel van de deployment-sprint zodat het platform
commercieel is op de dag van launch.

- Stripe account setup + API keys
- Twee minimale plannen bij launch:
  - `direct-monthly`: €X/maand (beslissing open — zie OPEN BESLISSINGEN)
  - `agency-monthly`: €Y/maand, max 5 workspaces (beslissing open)
- Checkout flow: plan selectie → Stripe Checkout → redirect
- Webhook handler: `src/app/api/stripe/webhook/route.ts`
  Events: `checkout.session.completed`, `invoice.payment_succeeded`,
  `invoice.payment_failed`, `customer.subscription.deleted`
- Plan enforcement: `WorkspacePlan` enum op `Workspace` model,
  middleware check `src/lib/middleware/plan-gate.ts`
- Subscription management in Settings > Billing

---

## FASE E: RESEARCH & VALIDATION STUBS

> Bron: TODO.md Fase 5. Geen aanpassingen.
> Vlak voor Campaign AI: research insights, validation flow,
> strategy↔campaign linking, billing stubs.

---

## FASE F: BRANDCLAW AGENT CORE

> **Nieuw — staat niet in TODO.md.**
> Dit is de eerste fase die Branddock omzet naar Brandclaw.
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
- Google OAuth (Fase A) wordt uitgebreid met Google Ads scope
- Token opslaan in `WorkspaceIntegration` model:
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

## FASE I: MEDIA ASSETS LAYER

> Voice, beeld en video integraties.
> Volgorde op basis van effort/impact ratio.

### I.1 Sprint 1: Brand Voices (ElevenLabs)
- ElevenLabs API koppeling: `src/lib/integrations/elevenlabs/`
- `WorkspaceBrandVoice` Prisma model (voice_id, naam, stijl, sample_url)
- UI in Settings > Brand Voices: aanmaken, beluisteren, instellen als default
- Content Studio: "Beluister" knop genereert audio preview van copy
- Gebruik: radio scripts, podcast ads, video voice-overs

### I.2 Sprint 2: Geluidsbibliotheek
- ElevenLabs Sound Effects API voor merkspecifieke geluiden
- Bibliotheek-UI: upload eigen audio + AI-gegenereerde varianten

### I.3 Sprint 3: AI-Gegenereerde Beelden
- Primair: Google Imagen 4 via Gemini API (al aanwezig)
- Fallback: DALL-E 3 via OpenAI API (al aanwezig)
- `WorkspaceVisualStyle` Prisma model: brand_colors, style_keywords,
  reference_image_urls, negative_prompts
- Consistentie: reference images + style prompts opgeslagen per workspace
- Cloud storage voor gegenereerde beelden: Cloudflare R2

### I.4 Sprint 4: Consistente AI-Modellen (Mensen/Producten)
- Fase I.3 moet volledig af zijn
- Evalueer: Flux LoRA fine-tuning vs. Astria.ai API vs. Photoroom
- Beslissing op basis van consistentie-tests in I.3

### I.5 Sprint 5: Video Generatie (conditioneel)
- Pas uitvoeren als markt rijp is (huidige inschatting: Q3 2027)
- Providers in volgorde van evaluatie: Kling → Runway → Luma
- Gebruik: TikTok scripts omzetten naar concept-video's voor review

---

## OPEN BESLISSINGEN

Deze beslissingen moeten genomen worden vóór de aangegeven fase.
Vastleggen in dit document zodra besloten.

### Vóór Fase D (S12 deployment)
1. **Redis provider**: Upstash (aanbevolen — serverless, geen infra) vs. self-hosted
2. **PostgreSQL provider**: Neon (aanbevolen — serverless, pgvector support) vs. Supabase vs. Railway
3. **Cloud storage**: Cloudflare R2 (aanbevolen — goedkoop, S3-compatible) vs. AWS S3

### Vóór Fase D Stripe-sectie
4. **Pricing tiers**: bedragen en limieten voor Direct-plan en Agency-plan
5. **Gratis tier**: wel of niet, en met welke limieten (assets, AI calls, workspaces)
6. **Agency pricing model**: per seat / per workspace / flat tier / hybrid

### Vóór Fase F
7. **Agent autonomie defaults**: wat is de default Autonomy Dial voor nieuwe workspaces?
   Aanbeveling: start op "always-ask" voor alle acties, laat gebruiker upgraden
8. **Wekelijks rapport timing**: vaste dag (maandag ochtend aanbevolen) of configureerbaar?

### Vóór Fase I.3
9. **Primaire beeld-provider**: Imagen 4 vs. Flux vs. DALL-E 3 (nader te besluiten na test)
10. **AI-model consistentie**: eigen LoRA pipeline vs. derde partij (Astria.ai aanbevolen voor eerste versie)

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
- **Content type config is data, niet code.** Sla content type configuraties
  op in een catalog (`src/lib/content-types/catalog.ts`) zodat nieuwe types
  zonder code-wijzigingen kunnen worden toegevoegd.
- **Platform character limits zijn harde grenzen.** Valideer altijd server-side,
  niet alleen client-side.

### Media assets constraints
- **Gegenereerde beelden zijn workspace-eigendom.** Sla op in cloud storage
  met workspace-scoped access. Nooit public URLs zonder authenticatie.
- **ElevenLabs voice_ids zijn stabiel maar kunnen deprecated worden.**
  Sla altijd de voice-naam op naast het ID voor fallback-selectie.
- **Video generatie is kostbaar.** Implementeer altijd een preview-stap
  (storyboard/thumbnail) vóór volledige video-generatie.

---

## SUCCESVEREISTEN PER FASE

### Na Fase B (Content Studio)
- Gebruiker kan een LinkedIn-post genereren in < 30 seconden
- Kwaliteitsscore is zichtbaar na elke generatie
- Drie varianten worden aangeboden voor elk text-type
- TipTap editor is volledig functioneel met inline verbetersugesties
- Export naar klembord en DOCX werkt voor alle types

### Na Fase B2 (Content Canvas)
- Alle campagne-deliverables zijn zichtbaar als board-weergave per status
- Derive modal maakt werkend nieuw deliverable aan en opent in Studio
- Export als ZIP werkt voor alle goedgekeurde deliverables
- Approval UI is aanwezig en werkend (e-mailnotificaties volgen in Fase D)
- CanvasLayout wordt persistent opgeslagen in de database

### Na Fase D (S12 + Agent Fundament)
- Platform is live op productie-URL
- Stripe checkout werkt end-to-end
- E-mail invite werkt (echte e-mail, niet DB-record)
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

### Na Fase I (Media Assets)
- Brand voice aanmaken en beluisteren werkt (ElevenLabs)
- AI-beeld generatie werkt voor social media formaten
- Gegenereerde beelden opgeslagen in cloud storage per workspace

---

## RELATIE TOT ANDERE DOCUMENTEN

| Document | Rol | Prioriteit |
|----------|-----|-----------|
| `BRANDCLAW-ROADMAP.md` (dit document) | Strategische roadmap + fasespecs | Hoogste |
| `CONTENT-STUDIO-SPEC.md` | Spec voor Content Studio — Fase B | Hoogste (bij Fase B) |
| `CONTENT-CANVAS-SPEC.md` | Spec voor Content Canvas — Fase B2 | Hoogste (bij Fase B2) |
| `CLAUDE.md` | Codebase patterns, gotchas, werkregels | Hoog |
| `TODO.md` | Gedetailleerde takenlijst per sprint | Hoog |
| `DESIGN-PATTERNS.md` | UI-component patterns | Middel |
| `ai-playbook.md` | AI-workflow regels | Middel |

**Bij conflicten**: BRANDCLAW-ROADMAP.md wint van TODO.md.
CLAUDE.md wint van beiden voor technische implementatie-beslissingen.

---

*Dit document wordt bijgewerkt na elke afgeronde fase.
Voeg je initialen en datum toe bij elke update: `[EJ 27-03-2026]`*