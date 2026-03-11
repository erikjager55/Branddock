# BRANDDOCK — Development Roadmap & TODO

> Geprioriteerde gids voor alle openstaande ontwikkelstappen.
> Laatst bijgewerkt: 11 maart 2026

---

## Fase 1: Technische Schuld & Cleanup

Verwijder ruis en maak de codebase schoon voordat nieuwe features worden gebouwd.

### 1.1 Deprecated & Backup Bestanden Verwijderen ✅

- [x] Delete `src/components/Dashboard.tsx` — backup, vervangen door `dashboard/DashboardPage`
- [x] Delete `src/components/BrandAssetsViewSimple.tsx` — backup, niet gerenderd
- [x] Delete `src/main.tsx` — niet gebruikt, Next.js App Router is entry point
- [x] Delete `src/examples/decision-layer-integration-example.tsx` — referentie-example, nooit geïmporteerd
- [x] Delete orphaned decision utilities (na import verificatie: alleen 2 van 6 waren echt orphaned):
  - `src/utils/dashboard-decision-transformer.ts` — verwijderd
  - `src/utils/platform-decision-aggregator.ts` — verwijderd
  - ~~4 andere~~ — nog actief geïmporteerd door strategy-tools componenten
- [x] Delete 4 deprecated persona create tabs (replaced by instant-create + detail edit):
  - `src/features/personas/components/create/PersonaFormTabs.tsx`
  - `src/features/personas/components/create/OverviewTab.tsx`
  - `src/features/personas/components/create/PsychographicsTab.tsx`
  - `src/features/personas/components/create/BackgroundTab.tsx`
- [x] Delete `src/components/decision-status/DecisionStatusPanel.tsx` — alleen geïmporteerd door verwijderd example

### 1.2 Deprecated Types Opruimen (deels)

- [x] Cleaned up `src/types/validation.ts` — ValidationMethodUIStatus alias opgeruimd, LegacyUnlockTier non-exported
- [ ] Remove deprecated type aliases in `src/types/campaign.ts` (CampaignSummary, DeliverableResponse, KnowledgeAssetResponse, CampaignDetail) — nog actief geïmporteerd door 6+ bestanden, deferred
- [ ] Remove deprecated type alias in `src/types/decision-status.ts` (DecisionStatus → DecisionQuality) — nog actief geïmporteerd door 20+ bestanden, deferred

### 1.3 `as any` Casts Elimineren ✅ (47 → 2)

Van 47 `as any` casts teruggebracht naar 2 (in help utilities). Alle fixes met proper types:

- [x] Fix `src/utils/asset-status.ts` — `ValidationMethodId` type cast
- [x] Fix `src/app/api/knowledge-resources/[id]/route.ts` — `DifficultyLevel` import
- [x] Fix `src/app/api/knowledge-resources/route.ts` — `DifficultyLevel` import
- [x] Fix `src/utils/logger.ts` — `declare global` Window extension
- [x] Fix `src/utils/component-validation.ts` — `declare global` + `ProtectedComponent` type
- [x] Fix `src/lib/lock-guard.ts` — `LockableDelegate` interface
- [x] Fix `src/lib/api/cache.ts` — `unknown as Record<string, ...>` type
- [x] Fix `src/contexts/KnowledgeContext.tsx` — `apiKnowledgeToMockFormatList` + proper cast
- [x] Fix `src/contexts/ChangeImpactContext.tsx` — removed unnecessary casts
- [x] Fix `src/components/Dashboard.tsx` — verwijderd (1.1)
- [x] Fix `src/components/strategy-tools/UniversalStrategyGenerator.tsx` — proper types
- [x] Fix `src/components/strategy-tools/CampaignStrategyGeneratorDetail.tsx` — proper types
- [x] Fix `src/components/strategy-tools/AddTrendModal.tsx` — proper types
- [x] Fix `src/components/strategy-tools/campaign-output/CampaignMetadataSections.tsx`
- [x] Fix `src/components/ActiveCampaignsPage.tsx` — proper types
- [x] Fix `src/components/ProductsServices.tsx`
- [x] Fix `src/components/TransformativeGoalsDashboard.tsx`
- [x] Fix `src/components/UniversalAssetDashboard.tsx`
- [x] Fix `src/components/StrategicResearchPlanner.tsx`
- [x] Fix `src/components/knowledge/AddResourceModal.tsx`
- [x] Fix `src/components/RelationshipsPage.tsx`
- [x] Fix `src/components/commercial/AdvisoryServices.tsx`
- [x] Fix `src/components/AssetUnlockDetailView.tsx`
- [x] Fix `src/components/templates/TemplateLibraryPage.tsx`
- [x] Fix `src/components/SocialRelevancyDashboard.tsx`
- [x] Fix `src/components/BreadcrumbNavigation.tsx`
- [x] Fix `src/components/ResearchPlansSectionGamified.tsx`
- [x] Fix `src/components/white-label/AgencySettingsPage.tsx`

### 1.4 TODO Comments Oplossen ✅

- [x] `src/utils/storage.ts` — "No migration needed" (client-side cache only)
- [x] `src/lib/ai/rate-limiter.ts` — Verwijst naar TODO.md Fase 2.1
- [x] `src/components/brand-assets/EnhancedAssetCardUnified.tsx` — Beschrijvend comment toegevoegd
- [x] `src/app/api/personas/[id]/generate-image/route.ts` — Verwijst naar TODO.md Fase 2.2

### 1.5 NEXT_PUBLIC_WORKSPACE_ID Deprecation Voltooien ✅

- [x] Remove `NEXT_PUBLIC_WORKSPACE_ID` fallback uit `src/hooks/use-workspace.ts`
- [x] Remove env var fallback uit `src/lib/auth-server.ts`
- [x] Remove uit `.env.local` en `.env.example`
- [ ] Documentatie bijwerken in CLAUDE.md (nog verwijzingen in grote context blok)

### 1.6 Adapter Pattern Afbouwen (deferred — te groot voor cleanup fase)

Geëvalueerd: `useBrandAssets()` heeft 26 consumers. Migratie vereist per-component wijzigingen.

- [ ] Migreer `BrandAssetsContext.tsx` om direct `BrandAssetWithMeta` te leveren (26 consumer files)
- [ ] Delete `src/lib/api/mock-to-meta-adapter.ts` na context migratie
- [ ] Evalueer of `src/lib/api/brand-asset-adapter.ts` nog nodig is
- [ ] Evalueer of `src/lib/api/persona-adapter.ts` nog nodig is
- [ ] Evalueer of andere `*-adapter.ts` bestanden verwijderd kunnen worden

### 1.7 Lock/Unlock Inconsistentie ✅

- [x] Geverifieerd: endpoint gebruikt al body-based `{ locked: boolean }`. CLAUDE.md was verouderd.

### 1.8 Mock Data Fallbacks Documenteren ✅

- [x] JSDoc "Intentional API fallback" comment aan `src/data/mock-brand-assets.ts`
- [x] JSDoc "Intentional API fallback" comment aan `src/data/mock-personas.ts`
- [x] JSDoc "Intentional API fallback" comment aan `src/data/mock-campaigns.ts`
- [ ] Overweeg op termijn mock fallback helemaal te verwijderen wanneer API 100% betrouwbaar is

### 1.9 Hardcoded Tailwind Colors Migreren ✅

- [x] `BrandFoundationHeader` — `text-gray-900` → `text-foreground`, `text-gray-500` → `text-muted-foreground`
- [x] `BrandAssetCard` — alle `text-gray-*` → design tokens (`text-foreground`, `text-muted-foreground`)
- [ ] Audit andere componenten op hardcoded kleuren buiten design tokens

### 1.10 Error Boundaries Toevoegen ✅

- [x] ErrorBoundary component beschikbaar via `src/components/shared/` barrel export (re-export van bestaande `src/components/ErrorBoundary.tsx`)
- [x] Top-level ErrorBoundary in App.tsx wrapt hele applicatie
- [ ] Per-page ErrorBoundary wrappers voor granulaire crash isolation (nice-to-have)

### 1.11 Vaste Set Brand Assets per Workspace ✅

Elke workspace krijgt automatisch 12 vaste brand assets (Branddock framework). Geen handmatig toevoegen/verwijderen.

- [x] `src/lib/constants/canonical-brand-assets.ts` — single source of truth (12 assets, 4 research methods, weights)
- [x] `prisma/schema.prisma` — AssetCategory enum (9 waarden incl. ESG), `@@unique([workspaceId, slug])`
- [x] `src/types/brand-asset.ts` — ESG in AssetCategory union type
- [x] `src/app/api/workspaces/route.ts` — auto-provisioning 12 assets + 48 research methods in $transaction
- [x] `src/lib/auth.ts` — provisionNewUser() auto-provisioning bij registratie
- [x] `prisma/seed.ts` — importeert canonical constant
- [x] UI: Add Asset button + BrandAssetCreateModal verwijderd
- [x] UI: Delete action + DeleteAssetDialog verwijderd
- [x] Zustand stores opgeschoond (geen create/delete modal state)

### 1.12 I18N: Codebase English Translation ✅

Alle Nederlands in `src/` vertaald naar Engels (~80+ bestanden). Buiten scope: CLAUDE.md, TODO.md, PATTERNS.md, `docs/`, `prisma/seed.ts`.

- [x] 5 parallelle vertaalagenten (~80+ bestanden)
- [x] 3 review-rondes met telkens 2 onafhankelijke review-agenten
- [x] TypeScript 0 errors na vertaling

### 1.13 TypeScript Errors Opgelost ✅

- [x] 3 pre-existing errors in `src/app/api/trend-radar/research/` en `src/lib/trend-radar/researcher.ts` (Prisma JSON type casting) — mee-opgelost in I18N commit

---

## Fase 2: Production Infrastructure

Blokkeert deployment; moet eerst opgelost worden.

### 2.1 Rate Limiter: In-Memory → Redis

- [ ] Kies Redis provider (Upstash/Redis Cloud/self-hosted)
- [ ] Implementeer Redis-backed rate limiter in `src/lib/ai/rate-limiter.ts`
- [ ] Verwijder in-memory sliding window implementatie
- [ ] Test met concurrent requests

### 2.2 Image/File Upload: Local → Cloud Storage

- [ ] Kies storage provider (S3/R2/Cloudflare Images)
- [ ] Implementeer upload utility in `src/lib/storage/`
- [ ] Update `src/app/api/personas/[id]/generate-image/route.ts` — persistent storage
- [ ] Update brandstyle logo upload indien van toepassing
- [ ] Update knowledge resource file upload (`/api/knowledge-resources/upload`)

### 2.3 Email Verzending

- [ ] Kies email provider (Resend/SendGrid/Postmark)
- [ ] Implementeer email service in `src/lib/email/`
- [ ] Verstuur echte invite emails (`src/app/api/organization/invite/route.ts`)
- [ ] Password reset flow (nog niet geïmplementeerd)

### 2.4 Environment & Security

- [ ] Audit alle env vars en verwijder ongebruikte
- [ ] Zorg dat secrets niet in client-side code lekken
- [ ] Implementeer CSRF bescherming indien nodig
- [ ] Review rate limiting op auth endpoints

---

## Fase 3: AI Features Voltooien

Core differentiator van Branddock — hoogste gebruikerswaarde.

### ~~3.1 Content Studio AI Generatie~~ → verplaatst naar Fase 5b (volledige herziening)

### 3.2 Product Analyzer AI (stubs → echt) ✅

- [x] Implementeer echte URL analyse in `src/app/api/products/analyze/url/route.ts`
- [x] Implementeer echte PDF analyse in `src/app/api/products/analyze/pdf/route.ts`
- [x] Implementeer polling endpoints
- [x] Gebruik AI om product data te extraheren uit URL/PDF

### 3.3 Brandstyle Analyzer AI (demo → echt) ✅

- [x] Implementeer echte website analyse in `src/app/api/brandstyle/analyze/url/route.ts`
- [x] Implementeer echte PDF analyse in `src/app/api/brandstyle/analyze/pdf/route.ts`
- [x] Update polling endpoint `src/app/api/brandstyle/analyze/status/[jobId]/route.ts`
- [x] Extraheer echte kleuren, typografie, tone-of-voice uit website/PDF

### 3.4 Market Insights AI Research (mock → echt) ✅

Vervangen door Trend Radar (TR sprint) met volledige AI research pipeline (Gemini + Claude, 5-fase).

- [x] AI research pipeline (Query→Extract→Synthesize→Score→Judge)
- [x] Brand context + focus areas voor gerichte research

### ~~3.5 Campaign Strategy AI Generatie~~ → verplaatst naar Fase 6 (eigen fase)

### ~~3.6 Persona Regenerate AI~~ — geschrapt

AI Exploration (S2) volstaat voor persona verrijking. One-click regenerate niet nodig.

### 3.7 S1 vs S2 AI Systeem Consolidatie ✅

S2 (ExplorationSession) heeft volledige feature parity. S1 volledig verwijderd:
- [x] Prisma modellen (AIBrandAnalysisSession, AIAnalysisMessage) + enum (AIAnalysisStatus) verwijderd
- [x] Feature directory (`src/features/ai-brand-analysis/`) verwijderd (~21 bestanden)
- [x] API routes (`/api/brand-assets/[id]/ai-analysis/`) verwijderd (8 route files)
- [x] Types, store, prompts verwijderd (3 bestanden)
- [x] App.tsx routing + lazy imports opgeschoond
- [x] Cross-referenties opgeschoond (brand-asset detail API, types, migration script)

---

## Fase 4: Knowledge / Brand Foundation Afronden

Integrale kwaliteitsslag op de Brand Foundation module: overzichtspagina, asset detail pagina's, AI Exploration flow, versioning, export en informatie-overlap.

### 4.1 Overzichtspagina Stats Fixen ✅

- [x] **Avg. Coverage berekenen uit research methods** — API compute nu gewogen validation % (AI 0.15 + Workshop 0.30 + Interviews 0.25 + Questionnaire 0.30) via shared `src/lib/validation-percentage.ts`
- [x] **Ready to Use** valideren — status komt correct uit API (BrandAsset.status), stats.ready = READY count
- [x] **Need Attention** review — DRAFT + NEEDS_ATTENTION + IN_PROGRESS in stats.needValidation (API + component aligned)
- [x] Coverage % op BrandAssetCard syncen met echte validation % uit API (coveragePercentage computed from researchMethods)

### 4.2 Completeness Score Verbeteren ✅

- [x] Try-catch toevoegen aan JSON parse in `getAssetCompletenessFields()` (crash bij malformed data)
- [x] Completeness % centraliseren — beide componenten gebruiken al dezelfde `getAssetCompletenessFields()` (geëxporteerd uit AssetCompletenessCard, geïmporteerd door BrandAssetCard)
- [x] Valideer per framework type of de juiste velden geteld worden — alle 11 canonical + 2 legacy types gedekt, veldchecks matchen type definities
- [x] Edge case: NaN voorkomen bij 0 velden — `fields.length > 0` guard in BrandAssetCard + AssetCompletenessCard

### 4.3 AI Exploration Interactie Fixen (KRITIEK) ✅

- [x] **Sessie ophalen i.p.v. altijd nieuw** — `GET /api/exploration/[itemType]/[itemId]/latest` endpoint + `fetchLatestExplorationSession()` client
- [x] **"Continue" moet hervatten** — `resumeSession` prop op AIExplorationPage, store pre-populated met bestaande berichten + progress
- [x] **"View Results" moet rapport tonen** — COMPLETED sessie met insightsData → direct rapport view, edge case COMPLETED+null insightsData → nieuwe sessie
- [x] **API endpoint toevoegen**: `GET /api/exploration/[itemType]/[itemId]/latest` — meest recente sessie voor een asset (incl. berichten + metadata)
- [x] **Pill tekst afstemmen op status**: AVAILABLE→"Start Exploration", IN_PROGRESS→"Continue", COMPLETED→"View Report" — configureerbaar per method via `startLabel`/`continueLabel`/`completedLabel` in beide sidebar cards
- [x] **Store reset verwijderen** bij mount — `resumeAppliedRef` guard, reset alleen bij expliciet `startNewSession()`
- [x] **Sessie persistentie** — wrapper components fetchen latest sessie via `useQuery` met `staleTime: 0`, cache invalidatie bij apply changes

### 4.4 Informatie Overlap Oplossen ✅

- [x] **Research methods weights geconsolideerd** — `validation-percentage.ts` importeert nu `RESEARCH_METHOD_WEIGHTS` uit `canonical-brand-assets.ts` (was duplicate). UI-specifieke configs (labels, icons, descriptions) blijven terecht lokaal per component.
- [x] **ResearchMethodsSection verwijderen uit main content** — orphaned component verwijderd (+ ResearchMethodCard)
- [x] **Hardcoded method count** `4` vervangen door `VALIDATION_METHODS.length` in `BrandAssetCard.tsx`
- [x] **Content vs Framework scheiding** — geëvalueerd: `asset.content` wordt nog op 5 plekken gelezen (asset-status, regenerate, snapshot-builders, PDF export, 2 legacy selectors). Refactoren is grotere wijziging, buiten scope Fase 4. `frameworkData` is de primaire databron voor alle moderne componenten.
- [x] **ValidationBreakdown component** — geëvalueerd: nog actief gebruikt in `BrandAssetDetailPanel` (modal op overview page). Andere UI is de sidebar card (`AssetResearchSidebarCard`). Beide hebben een eigen rol: ValidationBreakdown toont compact status, sidebar card biedt interactie. Behouden.

### 4.5 Version History Verbeteren

- [ ] **Duaal versioning systeem evalueren** — BrandAssetVersion (legacy) vs ResourceVersion (universal). Eén systeem kiezen.
- [ ] **Framework edits moeten BrandAssetVersion triggeren** — nu alleen ResourceVersion bij framework PATCH
- [ ] **Version history UI** verifiëren op alle 12 asset types (steekproef)

### 4.6 PDF Export Werkend Maken

- [ ] Kies PDF library (Puppeteer/jsPDF/react-pdf)
- [ ] **Brand asset PDF export** implementeren — nu produceert `.txt`, moet echte PDF worden
- [ ] **Framework-specifieke formatting** — elke asset type moet een leesbare PDF layout krijgen
- [ ] **Brandstyle PDF export** implementeren `src/app/api/brandstyle/export-pdf/route.ts` (nu: 501)
- [ ] **Persona PDF export** implementeren `src/app/api/personas/[id]/export/route.ts` (nu: 501)
- [ ] **Chat/session export** implementeren `src/app/api/personas/[id]/chat/[sessionId]/export/route.ts` (nu: 501)
- [ ] **AssetOverflowMenu integreren** — nu orphaned (nooit geïmporteerd in BrandAssetDetailPage)
- [ ] **QuickActionsCard Export knop** aansluiten op werkende export

> **Opmerking**: Content Studio export (`/api/studio/[deliverableId]/export`) is verplaatst naar Fase 6 (Campaign AI & Content).

### 4.7 Design & Interactie Consistency

- [ ] **Framework type checking refactoren** — 11 losse booleans → component map (`FRAMEWORK_COMPONENTS` Record)
- [ ] **Lock state uniformeren** — BrandAssetCard expansion buttons respecteren geen lock state
- [x] **AssetOverflowMenu** verwijderd (was orphaned, nooit geïmporteerd) + ContentEditorSection, ContentEditMode eveneens verwijderd
- [ ] **SWOT + PURPOSE_KOMPAS** evalueren — gebruiken legacy FrameworkRenderer fallback, niet modern canvas

### 4.8 Workshop, Interviews & Survey — Volgt Later

Status: UI shells aanwezig, functioneel zijn het stubs. Uitgebreide uitwerking in aparte fase.

- [ ] 🔜 **Workshop module** — volledige interactieve workshop flow (planning, uitvoer, rapport)
- [ ] 🔜 **Interviews module** — interview wizard (contact, planning, vragen, uitvoer, goedkeuring)
- [ ] 🔜 **Survey/Questionnaire module** — survey builder, distributie, response verzameling, analyse

> **Opmerking**: Deze drie research methods zijn de kern van de validation pipeline. Ze verdienen elk een eigen uitwerking vergelijkbaar met AI Exploration. Gepland voor latere fase wanneer de basis (4.1-4.7) is afgerond.

---

## Fase 5: Research & Validation Voltooien

Voltooit de research en validation flows die nu hardcoded stubs bevatten. Moet af voordat Campaign AI hierop kan bouwen.

### 5.1 Research Hub Stubs Vervangen

- [ ] Implementeer echte research insights `src/app/api/research/insights/route.ts` (nu: 3 hardcoded items)
- [ ] Implementeer echte pending validation `src/app/api/research/pending-validation/route.ts` (nu: 2 hardcoded items)
- [ ] Implementeer echte recommended actions `src/app/api/research/recommended-actions/route.ts` (nu: 3 hardcoded items)

### 5.2 Research Validation Flow

- [ ] Implementeer validation flow `src/app/api/research/validate/[assetId]/route.ts` (nu: 501)
- [ ] Koppel aan research methods + brand assets

### 5.3 Strategy ↔ Campaign Linking

- [ ] Implementeer campaign linking `src/app/api/strategies/[id]/link-campaign/route.ts` (nu: 501)
- [ ] Implementeer campaign unlinking `src/app/api/strategies/[id]/unlink-campaign/[campId]/route.ts` (nu: 501)
- [ ] UI: LinkedCampaignsSection in strategy detail (nu: EmptyState stub)

### 5.4 Billing Stubs

- [ ] Echte usage data in `src/app/api/settings/billing/usage/route.ts` (nu: "AI generations and storage are demo stubs")
- [ ] Echte invoice download in `src/app/api/settings/billing/invoices/[id]/download/route.ts` (nu: placeholder PDF)

### 5.5 Connected Accounts

- [ ] Echte OAuth connectie in `src/app/api/settings/connected-accounts/[provider]/connect/route.ts` (nu: demo user IDs)
- [ ] Slack integratie `src/app/api/settings/notifications/channels/[channel]/connect/route.ts` (nu: "coming soon" stub)

---

## Fase 6: Campaign AI Strategie & Content Generatie

Kern van de Branddock waardepropositie — AI-gedreven campagne-strategie en content generatie op basis van het complete merkfundament. Verdient uitgebreide aandacht.

### 6.1 Campaign Strategy AI Generatie

- [ ] Echte strategy generatie in `src/app/api/campaigns/[id]/strategy/generate/route.ts` (nu: placeholder 85% confidence)
- [ ] Brand context injectie (brand assets + personas + products + trends als AI input)
- [ ] Knowledge assets als aanvullende context (campaign-specifiek)
- [ ] Gestructureerde strategy output (doelgroep, kanalen, messaging, timing, KPIs)
- [ ] Confidence scoring op basis van beschikbare data (meer assets → hogere confidence)

### 6.2 Campaign Strategy Regeneratie & Iteratie

- [ ] Strategy regeneratie met aangepaste parameters
- [ ] Iteratieve verfijning (feedback loop: gebruiker past aan → AI verbetert)
- [ ] A/B strategie vergelijking (meerdere strategieën genereren en vergelijken)

### 6.3 Content Studio AI Generatie

- [ ] Echte AI content generatie (`/api/studio/[deliverableId]/generate`) — tekst, afbeeldingen, video scripts
- [ ] Echte AI content regeneratie (`/api/studio/[deliverableId]/regenerate`)
- [ ] Brand voice enforcement (tone of voice uit brandstyle als constraint)
- [ ] Persona-gerichte content (doelgroep-specifieke toon en messaging)
- [ ] Product context integratie (product features/benefits als content input)

### 6.4 Content Quality & Scoring

- [ ] Echte quality scoring (`/api/studio/[deliverableId]/quality`) — AI-gebaseerd
- [ ] Brand alignment score (past content bij merkwaarden?)
- [ ] Readability scoring (Flesch-Kincaid of equivalent)
- [ ] AI improve suggestions op basis van quality metrics

### 6.5 Content Studio Export

- [ ] Echte content export (`/api/studio/[deliverableId]/export`)
- [ ] Meerdere formaten (PDF, DOCX, PNG, MP4)

### 6.6 Content Studio UI Herziening

- [ ] Nieuw UI ontwerp en interactiemodel bepalen
- [ ] Bestaande Content Studio componenten evalueren (behouden/herschrijven/verwijderen)
- [ ] Nieuwe componentenstructuur opzetten

---

## Fase 7: UI Polish — Persona Restyling (PSR.6-8)

Visuele verfijning persona module op basis van Figma designs.

### 7.1 PSR.6: Layout Optimalisatie Fase 2 (6 prompts)

- [ ] Grid containment fix
- [ ] Quick Actions sidebar volgorde
- [ ] Research sidebar styling
- [ ] Demographics compact 3x2 grid
- [ ] Compact empty states
- [ ] Sub-grid columns

### 7.2 PSR.7: AI Persona Analysis Redesign (4 prompts)

- [ ] Chat restylen naar Brand Analysis stijl (teal kleuren, platte bubbels)
- [ ] Rapport fase (Executive Summary + Bevindingen + Aanbevelingen)
- [ ] Veldsuggesties per persona-veld (accept/reject/edit)
- [ ] FieldSuggestionCard component

### 7.3 PSR.8: Foto Generatie Fix

- [ ] Echte Gemini API implementatie (i.p.v. DiceBear placeholder stub)
- [ ] DiceBear als fallback wanneer GEMINI_API_KEY niet gezet
- [ ] Zichtbare Generate/Regenerate button onder hero foto

---

## Fase 8: Billing & Auth (S10-S11)

Commerciele features voor go-to-market.

### 8.1 S10: Stripe Billing

- [ ] Stripe account setup + API keys
- [ ] Checkout flow (plan selectie → Stripe Checkout)
- [ ] Webhook handler `src/app/api/stripe/webhook/route.ts` (nu: placeholder `whsec_placeholder`)
- [ ] Plan enforcement middleware (feature gates per tier)
- [ ] Agency model pricing (per seat / per workspace / flat tiers — open beslissing)
- [ ] Subscription management (upgrade/downgrade/cancel)
- [ ] Invoice generatie + download

### 8.2 S11: OAuth & SSO

- [ ] Google OAuth provider toevoegen aan Better Auth config
- [ ] Microsoft OAuth provider toevoegen
- [ ] Social login buttons op AuthPage
- [ ] Account linking (bestaand email+password account koppelen aan OAuth)

### 8.3 S11: Testing

- [ ] Playwright setup voor E2E tests
- [ ] Critical path tests: login → dashboard → asset detail → AI exploration
- [ ] API integration tests voor core endpoints
- [ ] Performance benchmarks

---

## Fase 9: Deployment & Monitoring (S12)

Go-live infrastructure.

### 9.1 Deployment

- [ ] Vercel project setup
- [ ] Environment variables configureren (production)
- [ ] Database migratie naar production PostgreSQL (Neon/Supabase/Railway)
- [ ] CI/CD pipeline (GitHub Actions → Vercel)
- [ ] Custom domain configuratie

### 9.2 Monitoring

- [ ] Sentry integratie voor error tracking
- [ ] Sentry source maps configuratie
- [ ] Alert rules voor kritieke errors

### 9.3 Analytics

- [ ] PostHog integratie
- [ ] Key events tracking (signup, asset create, AI exploration start, campaign create)
- [ ] Feature usage dashboards

---

## Samenvatting

| Fase | Items | Status | Prioriteit |
|------|-------|--------|------------|
| 1. Technische Schuld | ~75 items | Grotendeels ✅ (1.1-1.13 done, 1.2/1.6 deferred) | Hoog — schoon eerst op |
| 2. Production Infra | ~12 items | Niet gestart | Hoog — blokkeert deployment |
| 3. AI Features | ~6 items | Grotendeels ✅ (3.2-3.4 done, 3.5-3.7 verplaatst/done) | Hoog — core waarde |
| 4. Knowledge Afronden | ~32 items | Deels ✅ (4.2 try-catch, 4.3 resume 6/7, 4.4 orphans, 4.7 orphans) | Hoog — kwaliteitsslag + export (incl. PDF) |
| 5. Research & Validation | ~10 items | Niet gestart | Medium — prerequisite voor Fase 6 |
| 6. Campaign AI & Content | ~18 items | Niet gestart | Hoog — kern waardepropositie |
| 7. UI Polish (PSR) | ~11 items | Niet gestart | Medium |
| 8. Billing & Auth | ~10 items | Niet gestart | Medium-Laag |
| 9. Deployment | ~8 items | Niet gestart | Laag (laatste) |

**Totaal: ~146 items**

---

## Open Beslissingen (Onveranderd)

Zie CLAUDE.md sectie "OPEN BESLISSINGEN" voor:
- Agency pricing model
- Gratis tier limieten
- Workspace isolatie strategie
- Agency white-label scope
- Deployment provider keuze
