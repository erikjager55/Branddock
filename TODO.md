# BRANDDOCK — Development Roadmap & TODO

> Geprioriteerde gids voor alle openstaande ontwikkelstappen.
> Laatst bijgewerkt: 6 maart 2026

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

### 3.2 Product Analyzer AI (stubs → echt)

- [ ] Implementeer echte URL analyse in `src/app/api/products/analyze/url/route.ts` (nu: mock)
- [ ] Implementeer echte PDF analyse in `src/app/api/products/analyze/pdf/route.ts` (nu: mock)
- [ ] Implementeer polling endpoints (`/url/[jobId]`, `/pdf/[jobId]`) — nu: altijd 404
- [ ] Gebruik AI om product data te extraheren uit URL/PDF

### 3.3 Brandstyle Analyzer AI (demo → echt) ✅

- [x] Implementeer echte website analyse in `src/app/api/brandstyle/analyze/url/route.ts`
- [x] Implementeer echte PDF analyse in `src/app/api/brandstyle/analyze/pdf/route.ts`
- [x] Update polling endpoint `src/app/api/brandstyle/analyze/status/[jobId]/route.ts`
- [x] Extraheer echte kleuren, typografie, tone-of-voice uit website/PDF

### 3.4 Market Insights AI Research (mock → echt)

- [ ] Implementeer echte AI research in `src/app/api/insights/ai-research/route.ts` (nu: mock insights)
- [ ] Gebruik brand context + focus areas voor gerichte research

### 3.5 Campaign Strategy AI Generatie (placeholder → echt)

- [ ] Implementeer echte strategy generatie in `src/app/api/campaigns/[id]/strategy/generate/route.ts`
- [ ] Gebruik brand assets + knowledge als context

### 3.6 Persona Regenerate AI

- [ ] Implementeer echte persona regeneratie in `src/app/api/personas/[id]/regenerate/route.ts` (nu: 501)
- [ ] Gebruik bestaande persona data als context voor AI enrichment

### 3.7 S1 vs S2 AI Systeem Consolidatie

- [ ] Evalueer of S1 (AIBrandAnalysisSession) deprecated kan worden
- [ ] Migreer gebruikers van S1 naar S2 (ExplorationSession) indien mogelijk
- [ ] Verwijder S1 code als S2 volledige feature parity heeft

---

## Fase 4: Export & Data Portability

Nodig voor echte gebruikers die data willen exporteren.

### 4.1 PDF Export

- [ ] Kies PDF library (Puppeteer/jsPDF/react-pdf)
- [ ] Implementeer brandstyle PDF export `src/app/api/brandstyle/export-pdf/route.ts` (nu: 501)
- [ ] Implementeer persona PDF export `src/app/api/personas/[id]/export/route.ts` (nu: 501)
- [ ] Implementeer brand asset PDF export (overflow menu in BrandAssetDetailPage)

### 4.2 Chat/Session Export

- [ ] Implementeer chat session export `src/app/api/personas/[id]/chat/[sessionId]/export/route.ts` (nu: 501)
- [ ] Formaat: JSON of PDF met gesprek + insights

### ~~4.3 Content Studio Export~~ → verplaatst naar Fase 5b (volledige herziening)

---

## Fase 5: Research & Validation Voltooien

Voltooit de research flow die nu hardcoded stubs bevat.

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

## Fase 5b: Content Studio Herziening

Volledige herziening van de Content Studio module — UI, AI generatie, export, en kwaliteitsscoring.

### 5b.1 Content Studio Redesign

- [ ] Nieuw UI ontwerp en interactiemodel bepalen
- [ ] Bestaande Content Studio componenten evalueren (behouden/herschrijven/verwijderen)
- [ ] Nieuwe componentenstructuur opzetten

### 5b.2 Content Studio AI Generatie

- [ ] Echte AI content generatie (`/api/studio/[deliverableId]/generate`)
- [ ] Echte AI content regeneratie (`/api/studio/[deliverableId]/regenerate`)
- [ ] Echte quality scoring (`/api/studio/[deliverableId]/quality`)
- [ ] Brand context integratie voor content generatie

### 5b.3 Content Studio Export

- [ ] Echte content export (`/api/studio/[deliverableId]/export`)
- [ ] Meerdere formaten (PDF, DOCX, PNG, MP4)

---

## Fase 6: UI Polish — Persona Restyling (PSR.6-8)

Visuele verfijning persona module op basis van Figma designs.

### 6.1 PSR.6: Layout Optimalisatie Fase 2 (6 prompts)

- [ ] Grid containment fix
- [ ] Quick Actions sidebar volgorde
- [ ] Research sidebar styling
- [ ] Demographics compact 3x2 grid
- [ ] Compact empty states
- [ ] Sub-grid columns

### 6.2 PSR.7: AI Persona Analysis Redesign (4 prompts)

- [ ] Chat restylen naar Brand Analysis stijl (teal kleuren, platte bubbels)
- [ ] Rapport fase (Executive Summary + Bevindingen + Aanbevelingen)
- [ ] Veldsuggesties per persona-veld (accept/reject/edit)
- [ ] FieldSuggestionCard component

### 6.3 PSR.8: Foto Generatie Fix

- [ ] Echte Gemini API implementatie (i.p.v. DiceBear placeholder stub)
- [ ] DiceBear als fallback wanneer GEMINI_API_KEY niet gezet
- [ ] Zichtbare Generate/Regenerate button onder hero foto

---

## Fase 7: Billing & Auth (S10-S11)

Commerciele features voor go-to-market.

### 7.1 S10: Stripe Billing

- [ ] Stripe account setup + API keys
- [ ] Checkout flow (plan selectie → Stripe Checkout)
- [ ] Webhook handler `src/app/api/stripe/webhook/route.ts` (nu: placeholder `whsec_placeholder`)
- [ ] Plan enforcement middleware (feature gates per tier)
- [ ] Agency model pricing (per seat / per workspace / flat tiers — open beslissing)
- [ ] Subscription management (upgrade/downgrade/cancel)
- [ ] Invoice generatie + download

### 7.2 S11: OAuth & SSO

- [ ] Google OAuth provider toevoegen aan Better Auth config
- [ ] Microsoft OAuth provider toevoegen
- [ ] Social login buttons op AuthPage
- [ ] Account linking (bestaand email+password account koppelen aan OAuth)

### 7.3 S11: Testing

- [ ] Playwright setup voor E2E tests
- [ ] Critical path tests: login → dashboard → asset detail → AI exploration
- [ ] API integration tests voor core endpoints
- [ ] Performance benchmarks

---

## Fase 8: Deployment & Monitoring (S12)

Go-live infrastructure.

### 8.1 Deployment

- [ ] Vercel project setup
- [ ] Environment variables configureren (production)
- [ ] Database migratie naar production PostgreSQL (Neon/Supabase/Railway)
- [ ] CI/CD pipeline (GitHub Actions → Vercel)
- [ ] Custom domain configuratie

### 8.2 Monitoring

- [ ] Sentry integratie voor error tracking
- [ ] Sentry source maps configuratie
- [ ] Alert rules voor kritieke errors

### 8.3 Analytics

- [ ] PostHog integratie
- [ ] Key events tracking (signup, asset create, AI exploration start, campaign create)
- [ ] Feature usage dashboards

---

## Samenvatting

| Fase | Items | Status | Prioriteit |
|------|-------|--------|------------|
| 1. Technische Schuld | ~75 items | Grotendeels ✅ (1.1-1.13 done, 1.2/1.6 deferred) | Hoog — schoon eerst op |
| 2. Production Infra | ~12 items | Niet gestart | Hoog — blokkeert deployment |
| 3. AI Features | ~14 items | Niet gestart | Hoog — core waarde |
| 4. Export | ~6 items | Niet gestart | Medium |
| 5. Research & Validation | ~10 items | Niet gestart | Medium |
| 6. UI Polish (PSR) | ~11 items | Niet gestart | Medium |
| 7. Billing & Auth | ~10 items | Niet gestart | Medium-Laag |
| 8. Deployment | ~8 items | Niet gestart | Laag (laatste) |

**Totaal: ~146 items**

---

## Open Beslissingen (Onveranderd)

Zie CLAUDE.md sectie "OPEN BESLISSINGEN" voor:
- Agency pricing model
- Gratis tier limieten
- Workspace isolatie strategie
- Agency white-label scope
- Deployment provider keuze
