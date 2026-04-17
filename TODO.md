# BRANDDOCK / BRANDCLAW — Geconsolideerde Roadmap & TODO

> Geprioriteerde gids voor alle openstaande ontwikkelstappen.
> Geconsolideerd uit: TODO.md, BRANDCLAW-ROADMAP.md, CLAUDE.md, inline TODOs.
> Laatst bijgewerkt: 30 maart 2026

---

## Overzicht Fases

| Fase | Naam | Items | Prioriteit |
|------|------|-------|------------|
| 1 | Media Afronding (I-FIN) | ~5 | Hoog — eerst afronden |
| 2 | Content Afronding (B-FIN) | ~8 | Hoog — content pipeline voltooien |
| 3 | Production Launch (D.1 + D.3) | ~12 | Kritiek — blokkeert deployment |
| 4 | Agent Infrastructure (D.2) | ~10 | Hoog — fundament voor agents |
| 5 | Research Afronding (E-REST) | ~8 | Medium — stubs → echte executie |
| 6 | Brandclaw Agent Core (F) | ~12 | Hoog — eerste autonome loop |
| 7 | Channel Activation (G) | ~6 | Medium — executie-kanalen |
| 8 | Full Platform (H) | ~8 | Medium — Meta + Social + CRM |
| 9 | Technische Schuld + Polish | ~15 | Doorlopend |

**Totaal: ~84 items**

---

## Fase 1: Media Afronding (I-FIN)

> Afronden van de Media Assets Layer. I.1 (Brand Voices), I.3 (AI Images), I.4 (AI Videos) zijn af.

### 1.1 Geluidsbibliotheek (I.2) ✅ DONE

- [x] ElevenLabs Sound Effects API integratie voor merkspecifieke geluiden
- [x] Bibliotheek-UI: upload eigen audio + AI-gegenereerde varianten
- [x] Creative Hub tab "Sound Effects" toevoegen (naast Brand Voices, AI Images, AI Videos)

### 1.2 Brand Voice Generator (I.6) — verwijderd uit AI Trainer, moet opnieuw geplaatst worden

- [ ] Nieuwe standalone pagina of sectie voor Brand Voice generatie (was in AI Trainer > Voices tab)
- [ ] ElevenLabs TTS voice browsing, selectie en audio sample generatie (backend staat al: `src/lib/integrations/elevenlabs/`)
- [ ] Brand Voice CRUD (backend staat al: `/api/media/brand-voices/`)
- [ ] Voice preview player + TTS settings panel (componenten bestaan: `VoiceDetailPanel`, `VoicePreviewPlayer`, `TtsSettingsPanel`)
- [ ] Integratie met Content Canvas voor voice-over generatie bij video/audio deliverables

### 1.3 Sound Effects Generator (I.7) — verwijderd uit AI Trainer, moet opnieuw geplaatst worden

- [ ] Nieuwe standalone pagina of sectie voor Sound Effects (was in AI Trainer > Sound Effects tab)
- [ ] ElevenLabs Sound Effects API integratie (backend staat al)
- [ ] Bibliotheek-UI: upload eigen audio + AI-gegenereerde varianten
- [ ] Integratie met Content Canvas voor audio-elementen bij video deliverables

### 1.4 Video Generatie Uitgebreid (I.5) — ⏸️ ON HOLD

> Fundament gebouwd (17 april 2026), niet-actief tot video-first prioriteit.
> Alle code is werkend maar de volledige pipeline (per-scene generatie + compositie + voiceover) vereist significante UX-afronding.

**Wat er al staat (fundament):**
- [x] fal.ai video providers (5: Kling v3 Pro/Std, Veo 3.1 Fast, Seedance 2.0, LTX 2.0 Pro)
- [x] `VIDEO_ADJACENT_TYPES` constant (6 deliverable types)
- [x] Video prompt builder (`video-prompt-builder.ts` — Claude vertaalt script → visuele prompt, scene-aware)
- [x] SSE API route (`generate-video/route.ts` — text-to-video + image-to-video + existing video)
- [x] Voiceover API route (`generate-voiceover/route.ts` — ElevenLabs TTS per scene)
- [x] Video compositie API route (`compose-video/route.ts` — MVP: eerste scene als preview)
- [x] Canvas store: scene-based video state (hook/body/cta scenes + composedVideo)
- [x] `useVideoGeneration` hook (SSE consumer, scene-aware)
- [x] `VideoSceneEditor` component (per-scene video builder in Step 3)
- [x] Content-type-aware stepper registry (`canvas-flow-registry.ts`)
- [x] Step 2 SceneBreakdown (toont hook/body/cta splitsing voor script types)

**Wat nog moet voor volledige feature:**
- [ ] VideoSceneEditor UX polish (Media Library picker i.p.v. URL input voor image/video bron)
- [ ] Echte video compositie (ffmpeg of fal.ai workflow i.p.v. MVP eerste-scene preview)
- [ ] Voiceover: Brand Voice selector i.p.v. hardcoded 'default' voice ID
- [ ] Text overlay rendering op gegenereerde video's (logo, CTA tekst)
- [ ] Video preview in platform-specifiek chrome (TikTok/YouTube mockup met echte video)
- [ ] E2E testing van de volledige pipeline
- [ ] Kostenindicatie per scene + totaal vóór generatie

---

## Fase 2: Content Afronding (B-FIN) ✅ DONE

> Afronden van Content Studio + Content Canvas. Alle items afgerond.

### 2.1 Content Generatie naar Echte AI ✅ DONE

- [x] Per content type een AI prompt template bouwen met brand context hiërarchie (8 lagen)
- [x] SSE streaming toepassen op Content Studio generatie (bestaand SSE patroon uit AI Exploration)
- [x] Na generatie automatisch type-specifieke quality scoring uitvoeren (infra staat al: `quality-scorer.ts`)
- [x] 3 varianten per generatie voor tekst-types (infra staat al)

### 2.2 Canvas Restpunten ✅ DONE

- [x] Board-weergave: Kanban board van alle campagne-deliverables per status
- [x] ZIP export: alle goedgekeurde deliverables als ZIP
- [x] Derive modal verbetering: nieuw deliverable afleiden van bestaand, openen in Studio

### 2.3 TipTap Inline Suggesties ✅ DONE

- [x] "Maak korter" / "Verhoog urgentie" / "Meer brand voice" acties
- [x] Implementatie via floating toolbar + AI call

---

## Fase 3: Production Launch (D.1 + D.3)

> Zonder deze fase kan het platform niet live. Alle features zijn gebouwd maar draaien alleen lokaal.

### 3.1 Deployment (D.1)

- [ ] Vercel project setup
- [ ] Environment variables configureren (production)
- [ ] Database migratie naar production PostgreSQL (Neon aanbevolen — serverless, pgvector support)
- [ ] CI/CD pipeline (GitHub Actions → Vercel)
- [ ] Custom domain configuratie
- [ ] Sentry integratie (error tracking + source maps + alerts)
- [ ] PostHog integratie (key events tracking, feature usage dashboards)

### 3.2 Stripe Live Billing (D.3)

- [ ] Stripe account setup + API keys
- [ ] Twee minimale plannen: `direct-monthly` + `agency-monthly` (max 5 workspaces)
- [ ] Checkout flow: plan selectie → Stripe Checkout → redirect
- [ ] Webhook handler: `src/app/api/stripe/webhook/route.ts` (checkout.session.completed, invoice.*, subscription.deleted)
- [ ] Plan enforcement: `WorkspacePlan` enum op Workspace model, middleware `plan-gate.ts`
- [ ] Subscription management in Settings > Billing (UI staat al)

---

## Fase 4: Agent Infrastructure (D.2)

> Fundament voor Brandclaw agent-loops. Moet staan voordat Fase 6 (Agent Core) gebouwd kan worden.

### 4.1 Redis via Upstash (D.2.1)

- [ ] `@upstash/redis` SDK installeren
- [ ] In-memory rate limiter vervangen (`src/lib/ai/rate-limiter.ts`)
- [ ] Redis ook gebruiken voor sessie-cache
- [ ] Config: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` env vars

### 4.2 Resend E-mail (D.2.2)

- [ ] `resend` SDK (al geïnstalleerd), `src/lib/email/` service laag
- [ ] Templates via React Email: invite, wachtwoord-reset, weekly-report
- [ ] Echte invite emails (`src/app/api/organization/invite/route.ts`)
- [ ] Config: `RESEND_API_KEY` env var

### 4.3 pgvector voor Agent Memory (D.2.3)

- [ ] `vector` extensie aanzetten op production PostgreSQL
- [ ] Nieuw Prisma model: `AgentMemory` (content, embedding vector(1536), memoryType, confidence, decayWeight)
- [ ] Embedding via OpenAI `text-embedding-3-small`
- [ ] Service: `src/lib/agents/memory.ts` (storeMemory, recallRelevant, decayOldMemories)

### 4.4 Webhook Infrastructuur + Job Queue (D.2.4)

- [ ] BullMQ via Redis (Upstash-compatible) als job queue
- [ ] Nieuw Prisma model: `AgentJob` (jobType, status, payload, result, scheduledAt)
- [ ] Worker-architectuur in `src/lib/agents/workers/`
- [ ] Webhook endpoints voor externe triggers

### 4.5 PostHog als Feedback Engine (D.2.5)

- [ ] Uitgebreide event tracking (content_generated, agent_action_taken, user_approved, etc.)
- [ ] Custom properties per event (workspace_plan, brand_foundation_coverage)

---

## Fase 5: Research Afronding (E-REST)

> Research & Validation module bevat stubs die naar echte executie moeten.

### 5.1 Research Hub Stubs Vervangen

- [ ] Echte research insights `src/app/api/research/insights/route.ts` (nu: 3 hardcoded items)
- [ ] Echte pending validation `src/app/api/research/pending-validation/route.ts` (nu: 2 hardcoded items)
- [ ] Echte recommended actions `src/app/api/research/recommended-actions/route.ts` (nu: 3 hardcoded items)

### 5.2 Research Validation Flow

- [ ] Echte validation flow `src/app/api/research/validate/[assetId]/route.ts` (nu: 501)
- [ ] Koppel aan research methods + brand assets

### 5.3 Strategy ↔ Campaign Linking

- [ ] `src/app/api/strategies/[id]/link-campaign/route.ts` (nu: 501)
- [ ] `src/app/api/strategies/[id]/unlink-campaign/[campId]/route.ts` (nu: 501)
- [ ] UI: LinkedCampaignsSection in strategy detail (nu: EmptyState stub)

### 5.4 Billing + Connected Accounts Stubs

- [ ] Echte usage data in billing/usage (nu: demo stubs)
- [ ] Echte invoice download (nu: placeholder PDF)
- [ ] Echte OAuth connectie in connected-accounts (nu: demo user IDs)

---

## Fase 6: Brandclaw Agent Core (F)

> Eerste fase die Branddock omzet naar Brandclaw. Bouwt op Fase 4 infrastructuur.

### 6.1 LangGraph.js Agent Orchestratie (F.1)

- [ ] `@langchain/langgraph` + `@langchain/anthropic` + `@langchain/openai` installeren
- [ ] Marketing Loop state machine (6 nodes): Strategy Analyst → Campaign Builder → Content Generator → Measurement Agent → Evaluation Agent → Optimization Agent
- [ ] Conditionele edges (confidence ≥ 0.85 → autonoom, ≥ 0.60 → human approval, < 0.60 → meer onderzoek)
- [ ] Bestandslocatie: `src/lib/agents/marketing-loop/`

### 6.2 Human-in-the-Loop (F.2)

- [ ] Nieuw Prisma model: `AgentApproval` (approvalType, proposedAction, reasoning, confidenceScore, status, expiresAt)
- [ ] Notificatie flow: AgentApproval → Resend email → in-app badge → timeout auto-escalate
- [ ] Agent Activity Dashboard (`src/features/agent/AgentDashboard.tsx`)
- [ ] Autonomy Dial per workspace (always-ask / ask-above-threshold / always-auto)

### 6.3 Brand Context Snapshot (F.3)

- [ ] BrandContextSnapshot interface (frozen snapshot van brand foundation bij agent-cyclus start)
- [ ] Opslaan als JSON in `AgentJob.payload`

### 6.4 Wekelijks Rapport (F.4)

- [ ] Eerste Brandclaw output: Brand Health Score, Campagne Performance, Trend Alerts, Aanbevolen Actie
- [ ] Delivery: email (Resend) + PDF download + in-app dashboard

---

## Fase 7: Channel Activation (G)

> Voegt executie-kanalen toe aan de agent-loop.

### 7.1 Google Ads API (G.1)

- [ ] Google OAuth uitbreiden met Google Ads scope
- [ ] Token opslaan in `WorkspaceIntegration` model
- [ ] `src/lib/integrations/google-ads/` (getCampaignPerformance, updateBid, pauseCampaign)
- [ ] Performance metrics: impressies, clicks, CTR, CPC, conversies, ROAS

### 7.2 DataForSEO (G.2)

- [ ] SEO-intelligence voor Content Studio: zoekvolume, keyword difficulty, SERP tracking
- [ ] `src/lib/integrations/dataforseo/`

### 7.3 Uitgebreide Rapportage (G.3)

- [ ] Wekelijks rapport met echte ad-performance data
- [ ] Ad spend vs. budget, beste advertentietekst, aanbeveling (pause/scale/test)

---

## Fase 8: Full Platform (H)

> Meta Ads + Social Publishing + CRM loop.

### 8.1 Meta Ads API (H.1)

- [ ] Facebook + Instagram campagne-data + aanpassingen
- [ ] OAuth via Facebook Login
- [ ] Versie-pinning, retry-logica, async review-status

### 8.2 Social Publishing via Ayrshare (H.2)

- [ ] Publicatie naar LinkedIn, Instagram, Facebook, X, TikTok
- [ ] Content Studio "Publiceer" knop
- [ ] AgentJob type: CONTENT_PUBLISH (altijd human approval)

### 8.3 HubSpot CRM Loop (H.3)

- [ ] Leads uit campagnes automatisch naar HubSpot
- [ ] Contact properties verrijkt met persona-data
- [ ] Deal-tracking: welke campagne → welke deal

### 8.4 Cross-Workspace Benchmarks (H.4)

- [ ] Anonieme prestatiedata aggregeren
- [ ] `WorkspacePerformanceBenchmark` Prisma model
- [ ] Agents gebruiken benchmarks als context

---

## Fase 9: Technische Schuld + Polish (doorlopend)

> Items die geen blocker zijn maar de codebase verbeteren.

### 9.1 Deprecated Types Opruimen

- [ ] CampaignSummary, DeliverableResponse, KnowledgeAssetResponse, CampaignDetail in `src/types/campaign.ts` (6+ imports)
- [ ] DecisionStatus → DecisionQuality in `src/types/decision-status.ts` (20+ imports)

### 9.2 Adapter Pattern Afbouwen

- [ ] Migreer `BrandAssetsContext.tsx` om direct `BrandAssetWithMeta` te leveren (26 consumers)
- [ ] Delete `src/lib/api/mock-to-meta-adapter.ts` na migratie
- [ ] Evalueer of `brand-asset-adapter.ts` en `persona-adapter.ts` nog nodig zijn

### 9.3 UI Polish — Persona (PSR.6-8)

- [ ] PSR.6: Layout Optimalisatie Fase 2 (grid containment, sidebar volgorde, demographics 3×2, sub-grid)
- [ ] PSR.7: AI Persona Analysis Redesign (chat restyling, rapport, veldsuggesties)
- [ ] PSR.8: Foto Generatie Fix (echte Gemini API i.p.v. DiceBear stub)

### 9.4 Mock Data Fallbacks

- [ ] Overweeg mock fallback verwijderen wanneer API 100% betrouwbaar
- [ ] Per-page ErrorBoundary wrappers voor granulaire crash isolation

### 9.5 Hardcoded Kleuren

- [ ] Audit overige componenten op hardcoded kleuren buiten design tokens

### 9.6 Environment & Security

- [ ] Audit alle env vars en verwijder ongebruikte
- [ ] Zorg dat secrets niet in client-side code lekken
- [ ] Review rate limiting op auth endpoints

### 9.7 Orphaned Golden Circle Routes

- [ ] `src/app/api/brand-assets/[id]/golden-circle/route.ts` + `lock/route.ts` — geen frontend callers
- [ ] `src/features/golden-circle/` directory is leeg

### 9.8 Source Code TODOs

- [ ] `src/app/api/settings/billing/usage/route.ts` — demo stubs (→ Fase 3.2 Stripe)
- [ ] `src/app/api/settings/billing/invoices/[id]/download/route.ts` — placeholder PDF
- [ ] `src/app/api/settings/connected-accounts/[provider]/connect/route.ts` — demo user IDs
- [ ] `src/app/api/settings/notifications/channels/[channel]/connect/route.ts` — "coming soon" stub

---

## Open Beslissingen

### Urgent — blokkeert Fase 3 (Production Launch)

1. **Redis provider**: Upstash (aanbevolen — serverless) vs. self-hosted
2. **PostgreSQL provider**: Neon (aanbevolen — serverless, pgvector) vs. Supabase vs. Railway
3. **Cloud storage**: Cloudflare R2 (aanbevolen — goedkoop, S3-compatible) vs. AWS S3
4. **Pricing tiers**: bedragen en limieten voor Direct-plan en Agency-plan
5. **Gratis tier**: wel of niet, en met welke limieten
6. **Agency pricing model**: per seat / per workspace / flat tier / hybrid

### Vóór Fase 6 (Agent Core)

7. **Agent autonomie defaults**: default Autonomy Dial voor nieuwe workspaces (aanbeveling: always-ask)
8. **Wekelijks rapport timing**: vaste dag (maandag) of configureerbaar?

### Vóór Fase 1.2 (Video Extended)

9. **Video provider evaluatie**: Runway ML (al geïntegreerd) vs. Kling vs. Luma

---

## Volledig Afgerond (referentie)

<details>
<summary>35+ sprints/modules afgerond — klik om te openen</summary>

| Sprint/Module | Status |
|---|---|
| Fase 1: Technische schuld (47→2 `as any`, deprecated files, TODO comments) | ✅ |
| Fase A: OAuth + E2E + Performance | ✅ |
| Fase C: Visual Regression Fix (S13) | ✅ |
| Brand Foundation (12 canonical assets, auto-provisioning, PDF export) | ✅ |
| Brand Asset Detail (2-kolom layout, 13 framework canvases) | ✅ |
| AI Exploration (universeel systeem, 13 configs, admin UI, knowledge library) | ✅ |
| Brandstyle Analyzer (URL/PDF, 5-tab styleguide, Save for AI) | ✅ |
| Interviews (5-stap wizard, templates, approve & cascade) | ✅ |
| Golden Circle (canvas editor, versie historie) | ✅ |
| Workshops (purchase flow, 6-stap sessie, AI rapport, canvas) | ✅ |
| Business Strategy (OKR overview + detail, SWOT, AI review, PDF export) | ✅ |
| Personas (overview + create + detail, chat Claude Sonnet 4, AI analysis) | ✅ |
| Products & Services (22 categorieën, AI URL/PDF analyse, images) | ✅ |
| Competitors (AI URL analyse, detail, competitive score) | ✅ |
| Trend Radar (4-tab dashboard, AI scan pipeline, auto-scrape images) | ✅ |
| Brand Alignment (8-stap AI scan, 3 fix opties, DB write-back) | ✅ |
| Knowledge Library (15 componenten, featured carousel, grid/list) | ✅ |
| Research & Validation (Hub, bundles marketplace, custom builder) | ✅ |
| Campaigns (overview + quick content + wizard 6-stap + detail) | ✅ |
| Campaign Strategy (3-variant deep thinking, Effie Award, behavioral science) | ✅ |
| Content Library (cross-campaign overview, filters) | ✅ |
| Content Studio (3-kolom layout, 47 types, quality scoring, export) | ✅ |
| Content Item Canvas (multi-model orchestratie, 13 previews, approval) | ✅ |
| Dashboard (readiness %, stats, attention, onboarding wizard) | ✅ |
| Settings (account, team, billing UI, notifications, AI models, developer) | ✅ |
| Help & Support (22 componenten, FAQ, contact, system status) | ✅ |
| Pattern Library (design tokens, UI primitives, PATTERNS.md) | ✅ |
| I18N (UI vertaald naar Engels) | ✅ |
| Brand Voices I.1 (ElevenLabs TTS, voice browsing, audio samples) | ✅ |
| AI Images I.3 (Imagen 4 + DALL-E 3, Creative Hub tab) | ✅ |
| AI Videos I.4 (Runway ML Gen4 Turbo, Creative Hub tab) | ✅ |
| Per-feature LLM selectie (10 features via Settings) | ✅ |
| Developer-only autorisatie (DEVELOPER_EMAILS, API + UI bescherming) | ✅ |
| 3-Variant Deep Thinking Pipeline (Claude Opus + GPT-5.4 + Gemini) | ✅ |
| Marketing Framework Enrichment (Cialdini, IPA, Sharp, Kahneman, EAST, BCT) | ✅ |

</details>

---

## Relatie tot Andere Documenten

| Document | Rol | Prioriteit |
|----------|-----|-----------|
| `BRANDCLAW-ROADMAP.md` | Strategische roadmap + fasespecs | Hoogste |
| `CLAUDE.md` | Codebase patterns, gotchas, werkregels | Hoog |
| `PATTERNS.md` | UI-component patterns, design tokens | Hoog |
| `TODO.md` (dit document) | Geconsolideerde takenlijst | Middel |

**Bij conflicten**: BRANDCLAW-ROADMAP.md wint van TODO.md.
CLAUDE.md wint van beiden voor technische implementatie-beslissingen.

---

*Laatst bijgewerkt: 30 maart 2026 [EJ 30-03-2026]*
