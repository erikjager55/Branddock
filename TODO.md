# BRANDDOCK / BRANDCLAW — Geconsolideerde Roadmap & TODO

> Geprioriteerde gids voor alle openstaande ontwikkelstappen.
> Geconsolideerd uit: TODO.md, BRANDCLAW-ROADMAP.md, CLAUDE.md, inline TODOs.
> Laatst bijgewerkt: 19 april 2026

---

## Overzicht Fases

| Fase | Naam | Items | Prioriteit |
|------|------|-------|------------|
| 1 | Media Afronding (I-FIN) | ~5 | Hoog — eerst afronden |
| 2 | Content Afronding (B-FIN) | ~8 | Hoog — content pipeline voltooien |
| 3 | Production Launch (D.1 + D.3) | ~12 | Kritiek — blokkeert deployment |
| 4 | Agent Infrastructure (D.2) | ~10 | Hoog — fundament voor agents |
| 5 | Research Afronding (E-REST) | ~8 | ✅ DONE — behalve 5.4 billing (→ Fase 3) |
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

### 4.1 Redis via Upstash (D.2.1) ✅ DONE (2026-04-20)

- [x] `@upstash/redis` SDK al geïnstalleerd (v1.37), singleton client in `src/lib/redis.ts` (returnt `null` als env vars ontbreken)
- [x] In-memory rate limiter herschreven: `checkRateLimit()` + `checkGenericRateLimit()` nu async, gebruikt Redis ZSET sliding window als `redis !== null`, anders in-memory Map fallback. AI-tier rate limits (FREE/PRO/AGENCY minute + day) via single ZSET met 2 `ZCOUNT` queries op verschillende windows.
- [x] Redis ook gebruikt voor Better Auth `secondaryStorage` (session cache + per-IP rate limits via `rateLimit.storage: "secondary-storage"`). Graceful fallback: spread `...(redis ? {secondaryStorage} : {})` omit config als Redis niet geconfigureerd.
- [x] Config env vars gedocumenteerd in `.env.example`: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`.
- [x] Callers geüpgraded naar async: `withAiRateLimit()` middleware, `studio/inline-transform`, `checkAuthEmailRateLimit()`, Better Auth `hooks.before`. E2E getest: auth rate limit werkt nog steeds (11e attempt = 429 in dev/in-memory modus).

### 4.2 Emailit E-mail (D.2.2) ✅ DONE (2026-04-21)

> Emailit i.p.v. Resend gekozen (EU-hosted, GDPR-simpeler, server-side templates + audiences + suppressions API). Alle 4 stappen afgerond.

- [x] **Stap 1 — Client**: `src/lib/email/emailit-client.ts` (singleton, bearer auth, 30s timeout, `EmailitError` class, `isEmailitConfigured()` helper). Low-level methods voor emails, subscribers, suppressions. Geen SDK — plain fetch (Emailit heeft nog geen Node SDK).
- [x] **Stap 2 — Service laag + webhook**: `transactional.ts` (`sendTransactional()` + `trySendTransactional()` dev-mode stub als `EMAILIT_API_KEY` ontbreekt — logt payload), `audiences.ts` (addSubscriber/removeSubscriber), `suppressions.ts` (GDPR: suppress/isSuppressed/unsuppress), `webhook-handler.ts` (HMAC-SHA256 verify via `X-Emailit-Signature` of `X-Signature`, event normaliser die `delivered`/`bounced`/`opened`/`clicked`/`complained`/`unsubscribed`/`failed` mapt). Nieuwe route `src/app/api/email/webhook/route.ts` — auto-suppress bij bounce/complaint. E2E getest: 200 + "delivered test@example.com" gelogd.
- [x] **Stap 3 — Wiring**:
  - Templates in `src/lib/email/templates/` (`_layout.ts` branded teal/dark layout, `invite.ts`, `password-reset.ts`, `email-verification.ts`). Plain TS strings met HTML escape; geen React Email dep.
  - `POST /api/organization/invite` verstuurt nu echte uitnodiging via `trySendTransactional()` — faalt niet op mail-fout (invitation record blijft geldig), response bevat `emailSent` / `emailError`.
  - Better Auth callbacks: `emailAndPassword.sendResetPassword` en `emailVerification.sendVerificationEmail` roepen templates + transactional service aan.
  - Env vars in `.env.example`: `EMAILIT_API_KEY`, `EMAILIT_FROM_EMAIL` (default `noreply@branddock.app`), `EMAILIT_FROM_NAME`, `EMAILIT_WEBHOOK_SECRET`.

**Open (stap 4 — aparte sessie)**:
- [x] **Stap 4 — Canvas Send Campaign** (2026-04-21): `CampaignSend` Prisma model + `CampaignSendStatus` enum, 2 nieuwe routes (`POST /api/campaigns/[id]/deliverables/[did]/send` met 500-recipient cap + gates op email contentType + APPROVED status, `GET /send-status` voor polling), webhook extension die events mapt op counters (delivered/opened/clicked/bounced/complained/unsubscribed/failed) via `findFirst({emailitSendIds: {has: emailId}})` + atomic increment, UI componenten `SendCampaignModal` (recipient-textarea met parse + validatie + confirm-gate) + `CampaignSendStats` (6 stat-tiles met %), Step4Timeline integratie (alleen voor email-contentType + APPROVED), `useCampaignSendStatus` hook (TanStack Query met refetchInterval van 5s tijdens SENDING, 10s eerste 5min daarna, dan uit), `campaignId` toegevoegd aan canvas store.
- [ ] Weekly report email (wacht tot de weekly-report generator bestaat)
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

## Fase 5: Research Afronding (E-REST) ✅ DONE

> Research & Validation module stubs vervangen door echte implementaties (5.1–5.3). 5.4 verplaatst naar Fase 3 (Stripe).

### 5.1 Research Hub Stubs Vervangen ✅ DONE (2026-04-19)

- [x] Insights — depth (% explored), recent momentum (last 7 days), coverage balance (brand vs persona)
- [x] Pending validation — brand assets + personas with AI_EXPLORATION COMPLETED but not yet VALIDATED, sorted recent-first, capped at 10
- [x] Recommended actions — heuristic priority: unexplored brand asset → unexplored persona → empty active strategy; fallback "All caught up"

### 5.2 Research Validation Flow ✅ DONE (2026-04-19)

- [x] `/api/research/validate/[assetId]` POST — parses `ba-{methodId}` / `p-{methodId}` discriminator, transitions COMPLETED → VALIDATED on the right table, enforces workspace ownership
- [x] `validateMethod()` API client + `useValidateMethod()` mutation hook with cache invalidation across pending/insights/recommended/stats queries
- [x] `ValidationNeededSection` Validate button now calls the mutation with per-item loading state and error display

### 5.3 Strategy ↔ Campaign Linking ✅ DONE (2026-04-19)

- [x] `/api/strategies/[id]/link-campaign` POST — already implemented (Zod-validated, workspace-scoped, lock-guarded, upserts CampaignStrategy)
- [x] `/api/strategies/[id]/unlink-campaign/[campId]` DELETE — already implemented (workspace + lock check, deleteMany)
- [x] `LinkedCampaignsSection` UI — already wired with useLinkCampaign / useUnlinkCampaign / useSearchCampaigns. TODO entries were stale.

### 5.4 Billing + Connected Accounts Stubs → verplaatst naar Fase 3 (Stripe)

Deze stubs zijn onderdeel van de productie-launch fase en volgen wanneer Stripe wordt geïntegreerd. Zie Fase 3.2.

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

**✅ 9.1.1 Campaign deprecated types (2026-04-19)**
- [x] Verwijderd uit `src/types/campaign.ts`: `Campaign`, `CampaignDeliverable`, `CampaignAsset`, `CampaignWithMeta` (4 deprecated interfaces)
- [x] 6 orphan bestanden gewist die deze types gebruikten:
  - `src/lib/api/campaign-adapter.ts` — 0 consumers
  - `src/lib/api/campaigns.ts` — 0 consumers (vervangen door `src/features/campaigns/api/campaigns.api.ts`)
  - `src/hooks/use-campaigns.ts` — 0 consumers
  - `src/utils/campaign-helpers.ts` — 0 consumers
  - `src/components/campaign-strategy/CampaignDeliverableButton.tsx` — 0 consumers
  - `src/contexts/CampaignsContext.tsx` — `CampaignsProvider` in tree maar 0 consumers; fetchte `/api/campaigns` bij elke app-mount zonder gebruik
- [x] `CampaignsProvider` uit `src/contexts/index.tsx` verwijderd (3 refs: import, JSX, re-export)

**✅ 9.1.2 DecisionStatus → DecisionQuality (2026-04-20)**

- [x] Type geünificeerd op `DecisionQuality` uit `./validation` (`'safe' | 'at-risk' | 'blocked'`); `DecisionStatus` blijft als alias voor backward compat.
- [x] `DECISION_STATUS_CONFIG` keys hernoemd naar nieuwe waarden; `mapDecisionQuality()` bridge verwijderd.
- [x] `calculateDecisionStatus()` emit nu `'safe'/'at-risk'` i.p.v. `'safe-to-decide'/'decision-at-risk'`.
- [x] Hardcoded string literals bijgewerkt in `DecisionStatusBadge`, `RelationshipsPage`, `DecisionScanOnboarding`.
- [x] **14 orphan bestanden gewist** tijdens scope-analyse (origineel 17 consumers bleek na inspectie 11 live + 14 dood):
  - Utils: `campaign-decision-gate.ts`, `campaign-decision-calculator.ts`, `campaign-decision-calculator-v2.ts`
  - Components: `ShareableBrandReport.tsx`, `AssetUnlockDetailView.tsx`, `SocialRelevancyDashboard.tsx`, `UniversalAssetDashboard.tsx`, `ShareableCampaignReport.tsx`, `DecisionGateWarning.tsx`
  - decision-status internals: `SectionDecisionIndicator.tsx`, `CampaignDecisionHeader.tsx`, `DecisionSummaryPanel.tsx`, `DecisionWarningModal.tsx`, `index.ts`
  - `UniversalAssetDashboard` lazy-import uit `lazy-imports.ts` verwijderd; lege `stakeholder/` directory opgeruimd.

### 9.2 Adapter Pattern Afbouwen ✅ DONE — 2026-04-20

**Fase 1: mock-to-meta-adapter verwijderd** (commit `2c8b186`, 2026-04-20)
- [x] `src/lib/api/mock-to-meta-adapter.ts` gewist — `BrandAssetGrid.tsx` + `BrandFoundationPage.tsx` gemigreerd naar `useBrandAssetsQuery()` (direct BrandAssetWithMeta, geen round-trip).

**Fase 2: Context geflipt + brand-asset-adapter verwijderd** (2026-04-20)
- [x] `BrandAssetsContext` interface en state geflipt van `BrandAsset[]` naar `BrandAssetWithMeta[]`; `apiAssetsToMockFormat()` call verwijderd — context geeft nu de API-response direct door.
- [x] `src/lib/api/brand-asset-adapter.ts` gewist (0 consumers na context flip).
- [x] 12 consumers gemigreerd:
  - App.tsx: `asset.title` → `asset.name`; `researchMethods.some()` check → `validationMethods[key]` boolean lookup.
  - useBreadcrumbs, WorkshopPurchasePage: `title` → `name`.
  - ChangeImpactContext + ChangeImpactService: signatures naar WithMeta; `researchCoverage` → `coveragePercentage`; `status === 'validated'` → `status === 'READY'`; priority-check vervangen door coverage-heuristiek.
  - RelationshipService: `title` → `name`, `lastUpdated` → `updatedAt`, `type === 'Golden Circle'` → `slug === 'golden-circle'`, `content` → `description` (keyword heuristic), `status === 'ready-to-validate'` → `'NEEDS_ATTENTION'`, `isCritical` → status+coverage heuristiek.
  - StrategicResearchPlanner: `type`/`content` → `name`/`description`.
  - TransformativeGoalsDashboard: `type === '...'` → `slug === 'transformative-goals'`; `asset.researchMethods` → synthetische array uit `validationMethods` booleans (voor bestaande `calculateDecisionStatus` + UI).
  - SessionNavigator: prop type → WithMeta[].
- [x] Legacy `BrandAsset` + `ResearchMethod` interfaces uit `src/types/brand-asset.ts` verwijderd (alleen `ResearchMethodType`/`ResearchMethodStatus`/`CalculatedAssetStatus` + WithMeta behouden).
- [x] **16 orphan bestanden gewist** in cascade:
  - Utils: `brand-score-calculator.ts`, `entity-card-adapters.ts`, `status-card-adapters.ts`, `asset-status.ts`, `research-method-utils.ts`
  - Components: `ResearchStatusOverview.tsx`, `ResearchBundlesSection.tsx`, `ResearchFoundationMatrix.tsx`, `ResearchMethodBadge.tsx`, `CampaignCardUnified.tsx`, `DeliverableCardUnified.tsx`, `DeliverableCard.tsx`, `ValidationCardUnified.tsx`
  - Directories: `src/components/unified/` (README + design-system + EntityCard + StatusCard + types + index), `src/components/campaign-strategy/` (leeg geworden)
  - Services: `GlobalSearchService.ts`

**Fase 3: persona-adapter verwijderd** (2026-04-20)
- [x] `PersonasContext` interface en state geflipt van `MockPersona[]` naar API-native `Persona[]`; `apiPersonasToMockFormat()` call verwijderd.
- [x] `src/lib/api/persona-adapter.ts` gewist (0 consumers na context flip).
- [x] 2 consumers gemigreerd (`StrategicResearchPlanner.tsx` — `persona.avatar` → `persona.avatarUrl`); andere 5 hadden geen veld-verschillen (context-consumers gebruikten alleen `id`/`name`/`tagline` die overeen kwamen met de API-shape).
- [x] Deployment views (`DeploymentGridView`/`DeploymentCalendarView`/`DeploymentTimelineSection`) gebruiken al `usePersonas` uit `features/personas/hooks` (TanStack Query), niet de context — niet geraakt.

### 9.3 UI Polish — Persona (PSR.6-8) ✅ DONE (2026-04-19)

- [x] PSR.6: Layout Optimalisatie Fase 2 — sidebar volgorde (Research → Completeness → Implications → Quick Actions), `ResearchSidebarCard` border-dashed → solid met status-tints, `GoalsMotivationsCards` flex-col + flex-1 voor uniforme heights. min-w-0 + 3-col Demographics + empty-state early returns bleken al aanwezig.
- [x] PSR.7: AI Persona Analysis Redesign — inspectie wees uit dat de redesign al volledig in code zat: teal/emerald chat bubbles met asymmetrische radii, rapport met Executive Summary + Key Findings + Strategic Recommendations, FieldSuggestionCard met accept/reject/edit. TODO entry was stale.
- [x] PSR.8: Foto Generatie Fix — Gemini 2.5 Flash Image API al geïmplementeerd, DiceBear alleen als fallback bij geen key / API-error, in `/api/personas/[id]/generate-image`.

### 9.4 Mock Data Fallbacks + Error Isolation ✅ DONE (2026-04-20)

- [x] **Relationships demo-feature gewist** (2026-04-20) — de laatste `src/data/mock-*.ts` bron in de codebase. Whole chain verwijderd: `RelationshipsPage.tsx`, `RelationshipService.ts`, `mock-relationships.ts`, `types/relationship.ts`, route cases (App.tsx + lazy-imports + useBreadcrumbs + search/quick-actions). Page was niet in sidebar nav, alleen via search quick-action bereikbaar. `src/data/` directory leeg → verwijderd.
- [x] **Mock fallback verwijderd uit contexts** (2026-04-19) — `PersonasContext` en `ResearchPlanContext` losgekoppeld van localStorage/DEMO-fallbacks:
  - `PersonasContext`: `dataSource: "api" | "mock"` veld verwijderd (geen externe consumers), `migratePersonaStatus`/`migratePersonaData` legacy helpers weg, localStorage read/write van `StorageKeys.PERSONAS` weg. Op workspace-absent of API-fail → lege array + `isLoading=false` (zelfde patroon als `BrandAssetsContext` sinds maart '26).
  - `ResearchPlanContext`: `DEMO_PLAN` hardcoded constant weg (had mock asset-IDs `'1'-'5'` die niet matchten met DB-CUIDs → silent failures in `isAssetUnlocked`). `ACTIVE_RESEARCH_PLAN` localStorage-cache weg (was enkel voor demo-restore). Op workspace-absent of API-fail → `activeResearchPlan = null`; bestaande `isMethodUnlocked`/`isAssetUnlocked` returnen al `false` bij null.
  - `storage.ts`: 4 ongebruikte keys weg (`BRAND_ASSETS`, `PERSONAS`, `RESEARCH_PLAN`, `ACTIVE_RESEARCH_PLAN`). Behouden: `SHARED_ASSETS` (UI-selectie), `UI_STATE`, `VERSION`, `CHANGE_IMPACT`, `CAMPAIGN_WIZARD`.
  - Verificatie: `tsc --noEmit` 0 errors, dev server compile-clean (200 OK, 10ms recompile).
- [x] **Per-page ErrorBoundary wrappers** (2026-04-19) — `<ErrorBoundary resetKeys={[activeSection]}>` wrappt `renderContent()` in `App.tsx:1015`. Crash in één module laat sidebar + top-nav intact; navigatie naar andere sectie reset automatisch.

### 9.5 Hardcoded Kleuren ✅ DONE (2026-04-19)

- [x] **Teal prefix utilities** — 96 usages (13 unique combos) relied on `hover:/focus:/group-hover:` teal variants that were missing from the compiled `src/index.css`, so those styles rendered as noop. Added them: `hover:bg-teal-50/100`, `hover:text-teal-600/700`, `hover:border-teal-300/400/500`, `focus:border-teal-400/500`, `focus:ring-teal-400/500`, `group-hover:bg-teal-500`.
- [x] Arbitrary hex utilities (`bg-[#1FD1B2]` etc., 191 usages) audited — all present in compiled CSS, no action needed.
- [x] Inline `style={{ backgroundColor: '#hex' }}` (172 usages) audited — largely legitimate: either dynamic brand-data rendering (color swatches, visual system previews) or the documented Tailwind purge workaround. Not a batch-fix target.

### 9.6 Environment & Security Audit (2026-04-19)

> Brede audit uitgevoerd. 12 zaken al goed (SSRF guards, workspace-isolatie op 382/405 routes, geen `$queryRaw`, Zod op 140+ routes, Stripe idempotentie, cookies HttpOnly+SameSite, geen client-side secret leakage, lock guards, cache invalidatie).

**✅ Direct gefixt (2026-04-19)**
- [x] **C3 — Cross-workspace IDOR**: `POST /api/products/:id/personas` — persona moet zelfde workspace als product hebben (voorheen: alle personas linkbaar cross-tenant)
- [x] **H2 — Cookie Secure flag**: `branddock-workspace-id` cookie krijgt `secure: true` in productie (workspace/switch POST + DELETE)

**⏳ Launch-blockers — Fase D pre-launch checklist**

- [x] **C1** (2026-04-20) — Rate limiting op auth endpoints. Per-IP via Better Auth's native `rateLimit.customRules`: `/sign-in/email` + `/sign-in/social` 10 per 15min, `/sign-up/email` + `/forget-password` + `/reset-password` 5 per 15min. Per-email via `hooks.before` → `checkAuthEmailRateLimit()` (10 attempts per 15min per normalised email, credential-stuffing defense). Generieke `checkGenericRateLimit()` helper toegevoegd aan `rate-limiter.ts` (sliding window), hergebruikt de bestaande in-memory store. E2E getest: 1-9=401, 10+=429. **Let op**: in-memory store delen met AI-rate-limiter; M1 (Upstash Redis migratie) geldt voor beide.
- [x] **C2** (2026-04-20, uitgebreid 2026-04-21) — Rate limiting op alle AI endpoints via `withAiRateLimit()` middleware (proper 429 met `Retry-After` + `X-RateLimit-*` headers). Eerste pass (23 routes): `media/ai-images/generate`, `media/ai-images/optimize`, `media/ai-videos/generate`, `consistent-models/[id]/{train,generate,generate-references,analyze-style}`, `campaigns/wizard/strategy/*` (9 routes: validate-briefing, build-foundation, improve-briefing, mine-insights, generate-concepts, creative-debate, build-strategy, quick-concept, elaborate), `exploration/[itemType]/[itemId]/{analyze,sessions/[sessionId]/answer,complete}`, `competitors/analyze/url`, `competitors/[id]/refresh`, `products/analyze/{url,pdf}`. Tweede pass (2026-04-21, 15 extra routes): `brand-assets/[id]/regenerate`, `personas/chat`, `personas/[id]/strategic-implications`, `personas/[id]/chat/[sessionId]/insights` (POST), `strategies/[id]/ai-review`, `studio/[deliverableId]/{tone-check,orchestrate,generate-video,generate-voiceover,components/[componentId]/{consistency-check,persona-check}}`, `claw/chat`, `competitors/discover`, `brandstyle/analyze/{url,pdf}`. Tier resolved uit workspace.planTier (M8). Pre-existing `studio/inline-transform` gebruikt nog kale `checkRateLimit` (niet in scope — kan later uniform). "Expensive tier" suggestie verschoven naar post-launch tenzij billing feedback dit nodig maakt.
- [ ] **C5** — Rotate alle API keys in `.env.local` vóór productie-deploy (OpenAI, Anthropic, Gemini, ElevenLabs, fal.ai, Are.na, Pexels). Verwijder `.env` bestand (alleen `.env.local` gebruiken).
- [x] **H1** (2026-04-20) — Security headers in `next.config.ts` via `async headers()` op source `/(.*)`. Altijd actief: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`. Alleen productie (`NODE_ENV === 'production'`): `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` + volledige CSP (default-src 'self', script-src + Stripe, style-src + Google Fonts, font-src + gstatic, img-src permissive https:, connect-src 'self' + Stripe, frame-ancestors 'none', upgrade-insecure-requests). Dev skipt HSTS+CSP zodat Next.js HMR blijft werken. E2E getest: headers aanwezig op zowel pagina's als API routes. Post-launch hardening: nonce-based CSP (verwijder `'unsafe-inline'`/`'unsafe-eval'`), tighten img-src naar specifieke hosts, report-uri voor violations.
- [x] **H3** (2026-04-20) — `knowledge-resources/upload/route.ts` herschreven van stub naar echte implementatie: MIME whitelist (PDF, Office, MD, CSV, PNG/JPG/WEBP — 14 types), 20MB size limit, extensie-whitelist, filename sanitization, daadwerkelijke `writeFile` naar `public/uploads/knowledge-resources/{workspaceId}/`, workspace-scoped disk paths.
- [x] **H4** (2026-04-20) — Content-Length + post-download size caps op 5 AI-response fetches via shared helper `fetchWithSizeLimit()` in `src/lib/security/fetch-with-limit.ts`. Caps: 25 MB voor images, 500 MB voor videos. Toegepast in: `media/ai-images/generate` (2 fetch sites: LoRA + generic fal.ai), `media/ai-videos/generate`, `consistent-models/[id]/generate`, `consistent-models/[id]/generate-references`, `studio/[deliverableId]/generate-video`. `ResponseTooLargeError` class voor telemetry. Batch-loops (`continue` op fout), single-use paths (return 500 of SSE `video_error`).
- [x] **H5** (2026-04-20) — Magic-byte MIME validatie via nieuwe `file-type@22` library + shared helper `validateBinaryFile()` in `src/lib/security/file-validator.ts`. Toegepast op `products/[id]/images/upload` (PNG/JPG/WEBP) en `media/route` POST (alle binary types via `ACCEPTED_MIME_TYPES[mediaType]`, SVG skipt magic-byte check — is XML tekst). Fails closed: onbekende magic bytes → 400.
- [ ] **H6** — Stripe webhook: vervang `whsec_placeholder` door echte secret vóór productie.
- [x] **H7** (2026-04-20) — Prompt injection mitigatie. Shared helper `sanitizeAiInput()` + `sanitizeAiInputString()` in `src/lib/security/input-sanitizer.ts` strijkt ChatML/Llama/Anthropic control tokens (`<|system|>`, `<|user|>`, `<|assistant|>`, `<|im_start|>`, `<|im_end|>`, `[INST]`, `[/INST]`, `<s>`, `\n\nHuman:`, `\n\nAssistant:` etc.) + length-cap (default 50K chars). Toegepast in: `studio/[deliverableId]/inline-transform` (selectedText + fullContent) en `exploration/.../sessions/.../answer` (via Zod `.transform()` op content field). **Overige AI-routes (wizard/strategy/*, persona chat, etc.) nog niet expliciet gesanitized — helper beschikbaar voor bredere roll-out post-launch**. Voor Claw: tool-whitelist per sessie staat nog open tot agent-laag gebouwd is (Fase 6).
- [x] **M1** (2026-04-20) — Rate limiter gemigreerd naar Upstash Redis — zie Fase 4.1 voor details.
- [x] **M8** (2026-04-21) — `withAiRateLimit()` resolve nu tier via `resolveWorkspaceTier(workspaceId)` wanneer geen tier wordt meegegeven. Workspace.planTier (FREE/PRO/AGENCY/ENTERPRISE) wordt via `ai/tier-resolver.ts` (5 min cache) opgehaald; `withAi()` doet dit ook al. Alle AI endpoints uit C2 pakken automatisch de juiste limit op per plan.
- [ ] **M9** — `resolveWorkspaceForProduct` checkt nog geen `WorkspaceMemberAccess`: MEMBER met "no access to workspace B" kan via directe product-ID nog steeds in workspace B schrijven.
- [ ] **M10** — OAuth tokens (Google/Microsoft/Apple) in `Account` + `WorkspaceIntegration` opgeslagen als plaintext. Field-level encryption (envelope met KMS) toevoegen.

**📝 Lagere prioriteit (low risk, na launch OK)**
- [ ] **C4** — `api/campaigns/wizard/deliverable-types`: geen auth (statische JSON, low risk maar inconsistent)
- [ ] **M2** — `api/versions/[id]` PATCH: Zod validatie op `label`/`changeNote` met `.max(200)`
- [ ] **M3** — Expliciete field-whitelist in `data: { ...parsed.data }` calls (toekomst-proofing tegen mass assignment)
- [ ] **M4** — FAQ feedback endpoints: rate limit per IP tegen vote-pumping
- [x] **M5** (2026-04-19) — `/api/exploration/models` auth-check toegevoegd; endpoint onthult welke AI-provider keys gezet zijn, dat is reconnaissance-vector zonder auth.
- [x] **M6** (2026-04-19) — `/api/search/quick-actions` auth-check voor cache-wrapper; statische respons blijft gecached, auth draait per request.
- [ ] **L1-L7** — Diverse cleanup: dead env vars (`RUNWAYML_API_SECRET` in `.env.example` ongebruikt sinds fal.ai migratie), stale docs, CSRF tokens voor state-changing routes.

**📝 Env hygiene**
- [x] `.env.example` bijgewerkt (2026-04-19) — `NEXT_PUBLIC_BILLING_ENABLED` + Stripe keys + `PEXELS_API_KEY` toegevoegd, `RUNWAYML_API_SECRET` verwijderd (fal.ai migratie). Orphan `src/lib/integrations/runway/runway-client.ts` nog in codebase, kan later weg.

### 9.7 Orphaned Golden Circle Routes ✅ DONE (2026-04-19)

- [x] `src/app/api/brand-assets/[id]/golden-circle/route.ts` + `lock/route.ts` — verwijderd
- [x] `src/features/golden-circle/` directory bestond al niet meer

### 9.8 Source Code TODOs

- [ ] `src/app/api/settings/billing/usage/route.ts` — demo stubs (→ Fase 3.2 Stripe)
- [ ] `src/app/api/settings/billing/invoices/[id]/download/route.ts` — placeholder PDF
- [ ] `src/app/api/settings/connected-accounts/[provider]/connect/route.ts` — demo user IDs
- [ ] `src/app/api/settings/notifications/channels/[channel]/connect/route.ts` — "coming soon" stub

---

## Fase 10: Claude Design Integratie (uitgesteld)

> Claude Design gelanceerd 17 april 2026 (Anthropic Labs). Spoor 1 is af, Spoor 2 & 3 staan geparkeerd tot Anthropic een publieke API/MCP publiceert — anders is integratiewerk fragiel.

### 10.1 Spoor 1: Brand Kit PDF Export ✅ DONE (2026-04-19)

- [x] `GET /api/export/brand-kit/data` — aggregator endpoint (workspace + styleguide + 12 brand assets + personas + products + competitors)
- [x] `GET /api/export/proxy-image` — server-side image fetch met workspace whitelist + SSRF guard
- [x] `buildCompositeBrandPdf()` — one-shot jsPDF met cover, TOC, styleguide (kleurenstalen + embedded logo's), 12 framework-specifieke asset renderers, personas, products, competitors
- [x] "Export for Claude Design" knop in Brand Styleguide header
- [x] Getest: PDF wordt geaccepteerd door Claude Design design-system onboarding
- Commit: `534feb8`

### 10.2 Spoor 2: Claude Design Outputs Importeren (TODO)

> Laat gebruikers Claude Design output (PDF/PPTX/HTML) terugtrekken in Branddock zodat de brand-loop sluit.
> Start met Niveau 1, schaal alleen op naar 2/3 als gebruik dit rechtvaardigt.

**Niveau 1 — File import (2-3 dagen)**
- [ ] Media Library "Upload" dropdown uitbreiden met "Import from Claude Design"
- [ ] Accepteer PDF/PPTX/HTML, auto-tag met "Claude Design", auto-collectie "Claude Design exports"
- [ ] Bewaar bron-metadata (export-datum, bronformaat) op `MediaAsset`

**Niveau 2 — Slide/page extraction (1-2 weken)**
- [ ] PPTX: splitsen in individuele slides → losse `MediaAsset` records met thumbnail + extracted tekst (pptx skill beschikbaar)
- [ ] PDF: pagina-niveau extractie via `unpdf` (al in gebruik voor brandstyle)
- [ ] HTML: screenshot-per-section via headless Chromium
- [ ] Individuele slides/pagina's beschikbaar als image-variant in Content Canvas

**Niveau 3 — Brand refinement loop (3-4 weken)**
- [ ] Visuele analyse van geïmporteerde designs (kleuren/fonts/patterns) via Claude Vision
- [ ] "Refinement suggestion" banner in Brandstyle bij gedetecteerde afwijking van huidig profiel
- [ ] Optioneel: accepteer suggestie → update `BrandStyleguide`
- [ ] Sluit loop: Branddock brand → Claude Design ontwerp → verfijnd Branddock brand

### 10.3 Spoor 3: MCP/API Integratie (wachtspoor)

> Blokkerend: Anthropic heeft alleen "integraties komende weken" aangekondigd, geen docs of spec.

- [ ] Monitor https://support.claude.com/en/articles/14604397-set-up-your-design-system-in-claude-design voor API/MCP aankondiging
- [ ] Zodra beschikbaar: spec evalueren, bidirectionele koppeling ontwerpen
- [ ] Nieuw Prisma model `GeneratedDesign` (analoog aan `GeneratedImage`)
- [ ] Live push van Branddock brand context → Claude Design project
- [ ] Live pull van Claude Design outputs → Branddock content canvas

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
