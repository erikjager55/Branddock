# BRANDDOCK — Claude Code Context
## Laatst bijgewerkt: 5 maart 2026 (Product Categories 5→22 + Product Images + Market Insights Fully Functional)

> ⚠️ **VERPLICHT**: Lees `PATTERNS.md` in project root voor UI primitives, verboden patronen, en design tokens. Elke pagina MOET PageShell + PageHeader gebruiken.

> 📋 **TODO**: Zie `TODO.md` in project root voor de geprioriteerde development roadmap (8 fases, ~146 items). Raadpleeg dit bij het plannen van nieuwe werk.

> Brand Assets: 12 assets met elk een eigen frameworkType (PURPOSE_WHEEL, GOLDEN_CIRCLE, BRAND_ESSENCE, BRAND_PROMISE, MISSION_STATEMENT, VISION_STATEMENT, BRAND_ARCHETYPE, TRANSFORMATIVE_GOALS, BRAND_PERSONALITY, BRAND_STORY, BRANDHOUSE_VALUES, ESG). Veldspecificaties per asset: zie `docs/brand-assets-field-specifications.md`

---

## Project
Branddock is een SaaS platform voor brand strategy, research validatie en AI content generatie.
Voorheen: Brandshift.ai / ULTIEM. Huidige naam: **Branddock**.

## Tech Stack
- **Framework**: Next.js 16.1.6 (hybride SPA), React 19
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL 17, Prisma 7.4
- **Auth**: Better Auth (emailAndPassword, Prisma adapter, organization plugin)
- **State**: Zustand 5 (17 stores), React Context (12 providers)
- **Data fetching**: TanStack Query 5 (brand-assets, personas, market-insights, brand-alignment, knowledge-resources, product-personas, brandstyle, research, campaigns, studio)
- **Icons**: Lucide React 0.564
- **Package manager**: npm

## Architectuur — BELANGRIJK
Dit is een **hybride Next.js SPA** — Next.js als framework, maar de UI is volledig client-side:

- Entry: `src/app/layout.tsx` → `src/app/page.tsx` ('use client') → `<AuthGate>` → `src/App.tsx`
- **AuthGate**: wrapt hele app, toont AuthPage (login/register) als geen sessie, App als ingelogd
- Routing: `activeSection` state → `renderContent()` switch statement in App.tsx
- GEEN App Router routing voor pagina's — navigatie via `setActiveSection('id')`
- Nieuwe pagina = case toevoegen in switch statement
- `src/main.tsx` bestaat maar wordt NIET gebruikt
- API routes gebruiken wél Next.js App Router (`src/app/api/`)

## Auth — Better Auth

### Status
- **Fase A ✅ Done**: Login/register/session met emailAndPassword
- **Fase B ✅ Done**: Organization plugin + multi-tenant (access control, schema merge, session-based workspace)
- **Fase C ✅ Done**: Agency flows (organization switcher, workspace switching, invite flow, workspace creation)

### Configuratie
- `src/lib/auth.ts` — betterAuth() server config met prismaAdapter, emailAndPassword, organization plugin, nextCookies()
- `src/lib/auth-client.ts` — createAuthClient() uit `better-auth/react` + organizationClient() plugin
- `src/lib/auth-server.ts` — getServerSession(), requireAuth(), resolveWorkspaceId() helpers voor API routes
- `src/lib/auth-permissions.ts` — createAccessControl met 4 rollen (owner, admin, member, viewer)
- `src/lib/workspace-resolver.ts` — getWorkspaceForOrganization(), getWorkspaceForUser()
- `src/hooks/use-workspace.ts` — useWorkspace() hook (workspaceId uit sessie, fallback naar env var)
- `src/app/api/auth/[...all]/route.ts` — catch-all auth API route (GET + POST)
- `src/components/auth/AuthGate.tsx` — useSession() check + auto-set active organization bij login
- `src/components/auth/AuthPage.tsx` — login/register tabs met teal-600 branding
- `src/components/auth/OrganizationSwitcher.tsx` — org/workspace dropdown in TopNavigationBar

### Environment variables
```
BETTER_AUTH_SECRET=<base64 secret>
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://erikjager:@localhost:5432/branddock
OPENAI_API_KEY=           # Vereist voor AI features
ANTHROPIC_API_KEY=        # Vereist voor AI Exploration + persona chat (Claude Sonnet 4.6)
GEMINI_API_KEY=           # Vereist voor AI product analyse + foto generatie
# BRANDDOCK_AI_MODEL=     # Default: gpt-4o (content gen), Claude Sonnet 4.6 (exploration/analysis)
```

### Database tabellen (Better Auth)
- **Session** (@@map "session"): token, expiresAt, ipAddress, userAgent, userId, activeOrganizationId (Fase B)
- **Account** (@@map "account"): accountId, providerId, password, accessToken, refreshToken, timestamps
- **Verification** (@@map "verification"): identifier, value, expiresAt

### User model uitbreidingen
- `emailVerified Boolean @default(false)`
- `image String?`
- `sessions Session[]` en `accounts Account[]` relaties

### Bekende beperkingen
- `NEXT_PUBLIC_WORKSPACE_ID` is verwijderd — workspace komt volledig uit sessie/cookie.
- nextCookies() plugin MOET laatste in plugins array staan.
- Role velden zijn nu String (lowercase: "owner", "admin", "member", "viewer") — niet meer MemberRole enum.
- Workspace switching via `branddock-workspace-id` cookie (set door POST /api/workspace/switch).

## Data Flow

### Modules op de database (via API)
```
PostgreSQL → Prisma → /api/[module] (route.ts)
  → fetch[Module]() (src/lib/api/[module].ts)
  → api[Module]ToMockFormat() (src/lib/api/[module]-adapter.ts)
  → [Module]Context (src/contexts/[Module]Context.tsx)
  → UI componenten (ongewijzigd)
```

Workspace resolution: sessie-based (activeOrganizationId → workspace resolution)
- `NEXT_PUBLIC_WORKSPACE_ID` env var is volledig verwijderd — geen fallback meer
- Adapter mapt DB formaat → mock formaat zodat UI ongewijzigd blijft
- Alle contexts gebruiken `useWorkspace()` hook

**Live op database:**
- Brand Assets (13 assets, 3 met content+framework, 52 research methods, 6 versions) — `/api/brand-assets` GET + POST
- AI Brand Analysis (1 demo session REPORT_READY, 10 messages) — `/api/brand-assets/:id/ai-analysis` POST (start) + `/:sessionId` GET + `/answer` POST + `/complete` POST + `/generate-report` POST + `/report` GET + `/report/raw` GET + `/lock` PATCH (8 endpoints)
- AI Exploration (generic) — `/api/exploration/[itemType]/[itemId]` POST (start) + `/sessions/[sessionId]/answer` POST + `/sessions/[sessionId]/complete` POST (3 endpoints per item type). Ondersteunt: persona, brand_asset. Backend-driven config via ExplorationConfig model.
- AI Exploration Config (admin) — `/api/admin/exploration-configs` GET + POST, `/api/admin/exploration-configs/[id]` GET + PUT + DELETE (5 endpoints). Beheer van prompts, dimensies, AI modellen per item type/subtype.
- Universal Versioning — `/api/versions` GET (polymorphic ResourceVersion). Werkt voor brand assets, personas, en toekomstige modules.
- Personas (3 personas) — `/api/personas` GET + POST, `/api/personas/:id` GET + PATCH + DELETE, `/api/personas/:id/{duplicate,lock,avatar,generate-image,regenerate,generate-implications,export}`, `/api/personas/:id/research-methods/:method` PATCH, `/api/personas/:id/chat` POST + `/:sessionId/message` POST + `/:sessionId/insights` GET + `/:sessionId/export` GET, `/api/personas/:id/ai-analysis` POST + `/:sessionId` GET + `/answer` POST + `/complete` POST (21+ endpoints). **AI integrations**: Chat via Claude Sonnet 4 (`/api/personas/:id/chat/:sessionId/message`), Strategic Implications AI generatie (`/api/personas/:id/generate-implications`), Photo generatie via Gemini (`/api/personas/:id/generate-image`, fallback DiceBear).
- Products & Services (3 products) — `/api/products` GET + POST, `/api/products/:id` GET + PATCH, `/api/products/:id/lock` PATCH, `/api/products/analyze/url` POST (Gemini AI), `/api/products/analyze/pdf` POST (Gemini AI), `/api/products/:id/personas` GET + POST + DELETE, `/api/products/:id/images` POST, `/api/products/:id/images/[imageId]` PATCH + DELETE, `/api/products/:id/images/reorder` PATCH (16 endpoints). **AI integrations**: URL + PDF product analysis via Gemini 3.1 Pro (`@google/genai`). **Product Images**: ProductImage model met 13 categorieën, auto-scrape bij URL analyse, max 20 per product.
- Research Plans (1 active plan) — `/api/research-plans` GET + POST + PATCH
- Purchased Bundles — `/api/purchased-bundles` GET + POST
- Campaigns (6 campaigns) — `/api/campaigns` GET + POST + DELETE, `/api/campaigns/stats` GET, `/api/campaigns/[id]` GET + PATCH + DELETE, `/api/campaigns/[id]/archive` PATCH, `/api/campaigns/quick` POST, `/api/campaigns/quick/prompt-suggestions` GET, `/api/campaigns/quick/[id]/convert` POST, `/api/campaigns/[id]/knowledge` GET + POST, `/api/campaigns/[id]/knowledge/[assetId]` DELETE, `/api/campaigns/[id]/coverage` GET, `/api/campaigns/[id]/deliverables` GET + POST, `/api/campaigns/[id]/deliverables/[did]` PATCH + DELETE, `/api/campaigns/[id]/strategy` GET, `/api/campaigns/[id]/strategy/generate` POST + feature: `src/features/campaigns/` (TanStack Query, campaignKeys, 20+ hooks, Zustand store)
- Knowledge Library (10 resources) — `/api/knowledge` GET + POST + PATCH + `/api/knowledge/featured` GET + `/api/knowledge/:id/{favorite,archive,featured}` PATCH + `/api/knowledge-resources` (13 endpoints: CRUD, featured, archive/favorite/featured toggles, import-url, upload, types, categories)
- Trends (5 trends) — `/api/trends` GET + POST
- Market Insights (7 insights) — `/api/insights` CRUD (12 endpoints: CRUD + stats + sources + ai-research + categories + providers) + feature: `src/features/market-insights/` (TanStack Query, insightKeys, 10 hooks, Zustand store)
- Brand Alignment (1 scan, 6 modules, 4 issues) — `/api/alignment` (10 endpoints) + context: `BrandAlignmentContext` (TanStack Query, scan polling, dismiss)
- Brandstyle (1 styleguide, 9 kleuren) — `/api/brandstyle` (20 endpoints) + feature: `src/features/brandstyle/` (TanStack Query, Zustand store, 16 analyzer+styleguide componenten)
- Dashboard (preferences, 15 notifications) — `/api/dashboard` GET, `/api/dashboard/readiness` GET, `/api/dashboard/stats` GET, `/api/dashboard/attention` GET, `/api/dashboard/recommended` GET, `/api/dashboard/campaigns-preview` GET, `/api/dashboard/preferences` GET + PATCH, `/api/dashboard/quick-start/[key]/complete` POST (9 endpoints)
- Notifications — `/api/notifications` GET, `/api/notifications/count` GET, `/api/notifications/[id]/read` PATCH, `/api/notifications/mark-all-read` POST, `/api/notifications/clear` DELETE (5 endpoints)
- Search — `/api/search` GET, `/api/search/quick-actions` GET (2 endpoints)

**Nog op mock data (alleen fallback in contexts):**
- `BrandAssetsContext.tsx` — importeert `mockBrandAssets` als API fallback (by design)
- `PersonasContext.tsx` — importeert `mockPersonas` als API fallback (by design)
- `RelationshipService.ts` — `mockRelationships` (wacht op module implementatie)

**Product catalogs (statische configuratie, geen mock data):**
- `src/lib/catalogs/research-bundles.ts` — research bundle definities + helper functies
- `src/lib/catalogs/strategy-tools.ts` — strategy tool definities

### Adapter Pattern (tijdelijk)
Elke gemigreerde module heeft een adapter die DB data mapt naar het bestaande mock formaat. Dit voorkomt breaking changes in downstream componenten. Op termijn worden componenten herschreven om direct het DB-model te gebruiken.

### Brand Alignment (S7)
- **Route:** `/knowledge/alignment`
- **Database:** AlignmentScan, ModuleScore, AlignmentIssue + enums: ScanStatus, AlignmentModule, IssueSeverity, IssueStatus
- **Store:** useBrandAlignmentStore
- **API:** `/api/brand-alignment` GET, `/api/brand-alignment/scan` POST, `/api/brand-alignment/scan/[id]` GET, `/api/brand-alignment/scan/[id]/status` GET, `/api/brand-alignment/issues` GET, `/api/brand-alignment/issues/[id]` PATCH, `/api/brand-alignment/issues/[id]/fix` POST + GET + PATCH, `/api/brand-alignment/issues/[id]/dismiss` PATCH, `/api/brand-alignment/score` GET, `/api/brand-alignment/modules` GET (11 endpoints)
- **Componenten:** ~19 in src/components/brand-alignment/
- **Helpers:** src/lib/brand-alignment/ (scanner.ts, fix-generator.ts, score-calculator.ts, scan-steps.ts, module-config.ts, navigation.ts)
- **Cross-module:** Leest uit 6 Knowledge modules, schrijft fixes naar Personas/Products/BrandAssets
- **Sidebar:** Badge count met aantal open issues

### AI Exploration (Universal — S2 nieuw generiek systeem)

⚠️ **Er zijn twee AI chat systemen voor brand assets. S2 (nieuw) is het juiste:**

| Systeem | Model | API Route | Component | Status |
|---------|-------|-----------|-----------|--------|
| **S1 (oud)** | `AIBrandAnalysisSession` | `/api/brand-assets/[id]/ai-analysis` | `AIBrandAnalysisPage` | Actief, legacy |
| **S2 (nieuw)** | `ExplorationSession` | `/api/exploration/[itemType]/[itemId]` | `AIExplorationPage` / `AIBrandAssetExplorationPage` | Actief, generiek |

- **Backend-driven config**: `ExplorationConfig` Prisma model met prompts, dimensies, AI provider/model per item type/subtype
- **Config resolution**: DB lookup → hardcoded fallback → system defaults (`src/lib/ai/exploration/config-resolver.ts`)
- **Template engine**: `{{brandContext}}`, `{{customKnowledge}}`, `{{itemName}}`, `{{userAnswer}}`, `{{currentDimension}}` variabelen (`src/lib/ai/exploration/prompt-engine.ts`)
- **Multi-provider**: Anthropic Claude Sonnet 4.6 (default) + OpenAI GPT modellen via generic AI caller
- **Registry**: Per item type builder registratie (`src/lib/ai/exploration/item-type-registry.ts`)
- **Admin UI**: Settings → Administrator → AI Exploration Configuration (CRUD, per-config model/prompt/dimension editor)
- **Custom Knowledge**: Per config een kennisbibliotheek (ExplorationKnowledgeItem) — wordt als `{{customKnowledge}}` geïnjecteerd in prompts
- **Ondersteunde item types**: `persona`, `brand_asset` (alle 12 framework types)

### AI Exploration Configuration System (maart 2026)

**Config resolver prioriteit** (`src/lib/ai/exploration/config-resolver.ts`):
1. DB config exact match (workspace + itemType + itemSubType) — bijv. `brand_asset` + `golden-circle`
2. DB config type-only match (workspace + itemType, subtype null)
3. System defaults via `getDefaultDimensions()` — alleen fallback

**DB is leidend** — system defaults worden alleen gebruikt als er geen DB config bestaat.

**Framework Type → SubType mapping** (`src/lib/ai/exploration/constants.ts` → `resolveItemSubType()`):
`PURPOSE_WHEEL` → `purpose-statement`, `GOLDEN_CIRCLE` → `golden-circle`, `BRAND_ESSENCE` → `brand-essence`, `BRAND_PROMISE` → `brand-promise`, `MISSION_STATEMENT` → `mission-statement`, `VISION_STATEMENT` → `vision-statement`, `BRAND_ARCHETYPE` → `brand-archetype`, `TRANSFORMATIVE_GOALS` → `transformative-goals`, `BRAND_PERSONALITY` → `brand-personality`, `BRAND_STORY` → `brand-story`, `BRANDHOUSE_VALUES` → `brandhouse-values`

**Exploration Config in DB** (13 records): Alle 11 brand asset framework types + Social Relevancy + Persona hebben eigen configs met dimensies (vragen, volgorde, iconen), AI model + temperature, system/feedback/report prompts, context sources, en custom knowledge items.

**Progress bar sync**: De analyze route slaat dimensies op in `ExplorationSession.metadata`. Frontend leest deze uit voor progress bar labels via `mapBackendDimensions()`. Fallback naar `getDimensionsForSlug()` in `src/features/brand-asset-detail/constants/brand-asset-exploration-config.ts`.

**Belangrijke bestanden**:
- `src/lib/ai/exploration/config-resolver.ts` — Config resolve + system defaults
- `src/lib/ai/exploration/constants.ts` — FRAMEWORK_TO_SUBTYPE mapping
- `src/lib/ai/exploration/builders/brand-asset-builder.ts` — Rapport + field suggestions
- `src/app/api/exploration/[itemType]/[itemId]/analyze/route.ts` — Sessie start (resolvet config, slaat dimensies op in metadata)
- `src/app/api/admin/exploration-configs/route.ts` — Admin CRUD API
- `src/features/settings/components/administrator/ConfigListView.tsx` — Config lijst (gegroepeerd per item type, zoekfunctie)
- `src/features/settings/components/administrator/ConfigDetailView.tsx` — Config detail (4 tabs: Algemeen/Dimensies/Prompts/Kennisbronnen)
- `src/features/settings/components/administrator/ConfigCard.tsx` — Config kaart (model, dimensies, status)
- `src/features/settings/components/administrator/tabs/GeneralTab.tsx` — Targeting + AI model + context bronnen
- `src/features/settings/components/administrator/tabs/DimensionsTab.tsx` — Dimensie-editor
- `src/features/settings/components/administrator/tabs/PromptsTab.tsx` — Prompt editor met variable chips
- `src/features/settings/components/administrator/tabs/KnowledgeTab.tsx` — Kennisbronnen CRUD
- `src/features/settings/components/administrator/DimensionCard.tsx` — Enkele dimensie kaart
- `src/features/settings/components/administrator/IconPicker.tsx` — Visuele icon selector (30 Lucide icons)
- `src/features/settings/components/administrator/PromptEditor.tsx` — Herbruikbare textarea met variable chips
- `src/features/brand-asset-detail/constants/brand-asset-exploration-config.ts` — Frontend dimensie fallbacks
- `src/components/ai-exploration/utils/map-backend-dimensions.ts` — Backend→frontend dimensie mapper

**End-to-end flow**:
1. Admin configureert vragen + volgorde in Settings > AI Configuration
2. Gebruiker start AI Exploration vanuit asset detail page
3. Backend resolvet DB config → maakt sessie met dimensies in `metadata`
4. Frontend toont vragen + progress bar labels uit sessie metadata
5. Antwoorden → AI feedback per dimensie → rapport + field suggestions
6. Accept/Apply → framework velden bijgewerkt + versie snapshot (AI_GENERATED)

**Versioning triggers**: Persona PATCH → MANUAL_SAVE, Persona lock → LOCK_BASELINE, Brand asset framework PATCH → MANUAL_SAVE, AI Exploration complete → AI_GENERATED.

### Brand Asset Detail (lock/unlock + 2-kolom layout)
- **Component**: `src/features/brand-asset-detail/components/BrandAssetDetailPage.tsx`
- **Layout**: 2-kolom grid matching Persona structuur (8/4 split)
- **Sidebar**: QuickActionsCard, CompletenessCard, ValidationCard
- **Lock/unlock**: Via `/api/brand-assets/[id]/lock` PATCH, met versioning
- **Export PDF**: Beschikbaar via overflow menu
- **Frameworks**: ESG → vervangen door Purpose Kompas (Mens/Milieu/Maatschappij) + Purpose Statement als apart asset type

## Conventies
- Documentatie: Nederlands | Code/interfaces: Engels
- ALTIJD Lucide React iconen, geen emoji's
- Design tokens: `src/lib/constants/design-tokens.ts` (649 regels) is SINGLE SOURCE OF TRUTH
- Alle nieuwe componenten MOETEN design tokens importeren
- Nieuwe componenten MOETEN shared primitives gebruiken uit `src/components/shared/` (Button, Badge, Modal, Card, Select, SearchInput, EmptyState, Skeleton, StatCard, ProgressBar)
- **Brand Foundation is de referentie-implementatie** voor alle module views. Patroon: Page → Header + Stats + Filters + Grid + Detail + Create. Shared primitives, context hooks voor data, Zustand store voor UI state, mockToMeta adapter voor data conversie.
- AI calls gaan via `src/lib/ai/` — gebruik `openaiClient` of `geminiClient`, NOOIT direct OpenAI/Gemini SDK importeren in componenten
- Kleuren: #1FD1B2 primary (via CSS var --primary), bg-background (wit). Zie PATTERNS.md voor volledige tokens.
- Sidebar: w-72 (288px), flex-shrink-0, active state: bg-emerald-50 text-emerald-700
- Componenten: functioneel React, TypeScript strict
- **Tailwind purge workaround**: `min-h-0` klassen werken niet door Tailwind CSS 4 purge. Gebruik inline styles: `style={{ minHeight: 0 }}`. Zelfde geldt voor custom colors die niet in de safelist staan.

### Key Principles
8. **Function size:** Keep functions under 50 lines, break into smaller units if longer
9. **Loading & error states:** Always handle loading and error states in UI components
10. **No fetch loops:** Never fetch data in loops, batch requests instead
11. **Performance:** Use React.memo for expensive re-renders, lazy load components that aren't immediately visible
12. **Workarounds:** If adding a workaround, document why with a TODO comment

### Component Conventions
- Add JSDoc comments to all exported functions and components
- Never commit without confirming changes with the user first

### API Conventions
- All API responses must include loading and error state handling in consuming UI components
- Use the existing API client helpers, never raw fetch calls in components

## Sidebar Section IDs → Componenten
Navigatie in de sidebar stuurt `setActiveSection(id)`. Mapping:

**Werkend:**
dashboard→DashboardPage, brand→BrandFoundationPage, brand-asset-detail→BrandAssetDetailPage, workshop-purchase→WorkshopPurchasePage, workshop-session→WorkshopSessionPage, workshop-results→WorkshopCompletePage, brandstyle→BrandstyleAnalyzerPage, brandstyle-guide→BrandStyleguidePage, interviews→InterviewsPage, golden-circle→GoldenCirclePage, personas→PersonasPage, products→ProductsOverviewPage, trends→MarketInsightsPage, knowledge→KnowledgeLibraryPage, new-strategy→NewStrategyPage, active-campaigns→ActiveCampaignsPage, research/research-hub→ResearchHubPage, research-bundles→ResearchBundlesPage, research-custom/custom-validation→CustomValidationPage, settings-account→AccountSettingsPage, settings-team→TeamManagementPage, settings-agency→AgencySettingsPage, settings-clients→ClientManagementPage, settings-billing→BillingSettingsPage, settings-notifications→NotificationsSettingsPage, settings-appearance→AppearanceSettingsPage, brand-alignment→BrandAlignmentPage, ai-brand-analysis→AIBrandAnalysisPage, business-strategy→BusinessStrategyPage, settings-admin→AdministratorTab (via SettingsPage initialTab='admin')

**ComingSoonPage:** help

**Campaigns module:** active-campaigns→ActiveCampaignsPage (features/campaigns), campaign-detail→CampaignDetailPage (useCampaignStore.selectedCampaignId), quick-content-detail→QuickContentDetailPage (useCampaignStore.selectedCampaignId), content-studio→ContentStudioPage (useCampaignStore.selectedCampaignId+selectedDeliverableId), content-library→ContentLibraryPage, campaign-wizard→CampaignWizardPage

**Detail pages (via store):** strategy-detail→StrategyDetailPage (useBusinessStrategyStore.selectedStrategyId), persona-detail→PersonaDetailPage (usePersonaDetailStore.selectedPersonaId), persona-create→CreatePersonaPage, persona-ai-analysis→AIPersonaAnalysisPage, product-detail→ProductDetailPage (useProductsStore.selectedProductId), product-analyzer→ProductAnalyzerPage, insight-detail→InsightDetailPage (useMarketInsightsStore.selectedInsightId), research-bundle-detail→BundleDetailPage (useResearchStore.selectedBundleId), brand-asset-ai-exploration→AIBrandAssetExplorationPage (via selectedResearchOption='ai-exploration' in App.tsx)

**Default** (onbekende IDs): rendert Dashboard.

## Directory Structuur
```
src/
├── App.tsx                              ← HOOFD ROUTING (switch statement)
├── app/
│   ├── layout.tsx                       ← Root layout met QueryProvider
│   ├── page.tsx                         ← Entry point ('use client'), wrapt App in <AuthGate>
│   └── api/
│       ├── auth/[...all]/route.ts       ← Better Auth catch-all (GET + POST)
│       ├── workspaces/route.ts          ← GET (list) + POST (create)
│       ├── workspace/switch/route.ts    ← POST (switch active workspace)
│       ├── organization/
│       │   ├── invite/route.ts          ← POST (send invite)
│       │   ├── invite/accept/route.ts   ← POST (accept invite via token)
│       │   └── members/route.ts         ← GET (list members + pending invites)
│       ├── brand-assets/
│       │   ├── route.ts                 ← GET + POST (live)
│       │   └── [id]/
│       │       ├── route.ts             ← GET (detail) + DELETE
│       │       ├── content/route.ts     ← PATCH (inline edit + version)
│       │       ├── status/route.ts      ← PATCH (status update)
│       │       ├── lock/route.ts        ← PATCH (lock/unlock)
│       │       ├── duplicate/route.ts   ← POST (deep copy)
│       │       ├── regenerate/route.ts  ← POST (AI regeneration)
│       │       ├── versions/route.ts    ← GET (versie historie)
│       │       ├── framework/route.ts   ← PATCH (framework data)
│       │       └── workshops/
│       │           ├── route.ts         ← GET (list + bundles)
│       │           ├── bundles/route.ts ← GET (bundle lijst)
│       │           ├── purchase/route.ts ← POST (workshop aankoop)
│       │           └── preview-impact/route.ts ← POST (impact preview)
│       │       ├── interviews/
│       │       │   ├── route.ts             ← GET (list+stats) + POST (create)
│       │       │   ├── templates/route.ts   ← GET (templates per category)
│       │       │   └── [interviewId]/
│       │       │       ├── route.ts         ← GET (detail) + PATCH (update) + DELETE
│       │       │       ├── duplicate/route.ts ← POST (deep copy)
│       │       │       ├── questions/route.ts ← POST (add question)
│       │       │       ├── questions/[questionId]/route.ts ← PATCH + DELETE
│       │       │       ├── complete/route.ts ← POST (complete interview)
│       │       │       └── approve/route.ts ← POST (approve + cascade)
│       │       └── golden-circle/
│       │           ├── route.ts             ← GET (data) + PATCH (update)
│       │           ├── lock/route.ts        ← PATCH (lock/unlock)
│       │           └── history/route.ts     ← GET (version history)
│       ├── workshops/
│       │   └── [workshopId]/
│       │       ├── route.ts             ← GET (workshop detail)
│       │       ├── start/route.ts       ← POST (start session)
│       │       ├── steps/[stepNumber]/route.ts ← PATCH (step response)
│       │       ├── timer/route.ts       ← PATCH (timer sync)
│       │       ├── bookmark/route.ts    ← PATCH (bookmark)
│       │       ├── complete/route.ts    ← POST (complete + cascade)
│       │       ├── report/route.ts      ← GET (AI rapport)
│       │       ├── report/raw/route.ts  ← GET (raw export)
│       │       ├── canvas/route.ts      ← PATCH (canvas data)
│       │       ├── notes/route.ts       ← GET + POST (notes)
│       │       └── generate-report/route.ts ← POST (AI generatie)
│       ├── personas/route.ts            ← GET + POST (live)
│       ├── products/
│       │   ├── route.ts                 ← GET + POST (live)
│       │   ├── [id]/
│       │   │   ├── route.ts             ← GET + PATCH (detail + update)
│       │   │   ├── lock/route.ts        ← PATCH (lock/unlock)
│       │   │   └── personas/
│       │   │       ├── route.ts         ← GET + POST (koppel persona)
│       │   │       └── [personaId]/route.ts ← DELETE (ontkoppel)
│       │   └── analyze/
│       │       ├── url/route.ts         ← POST (Gemini AI URL analyse)
│       │       └── pdf/route.ts         ← POST (Gemini AI PDF analyse)
│       ├── research-plans/route.ts      ← GET + POST + PATCH (live)
│       ├── purchased-bundles/route.ts   ← GET + POST (live)
│       ├── campaigns/route.ts           ← GET + POST + PATCH (live)
│       ├── knowledge/
│       │   ├── route.ts                 ← GET + POST (live)
│       │   ├── featured/route.ts        ← GET (featured carousel)
│       │   └── [id]/
│       │       ├── route.ts             ← PATCH (update fields)
│       │       ├── favorite/route.ts    ← PATCH (toggle)
│       │       ├── archive/route.ts     ← PATCH (toggle)
│       │       └── featured/route.ts    ← PATCH (toggle)
│       ├── trends/route.ts             ← GET + POST (live)
│       ├── insights/
│       │   ├── route.ts                 ← GET (list+filters+stats) + POST (Zod)
│       │   ├── stats/route.ts           ← GET {active, highImpact, newThisMonth}
│       │   └── [id]/
│       │       ├── route.ts             ← GET + PATCH (Zod) + DELETE (cascade)
│       │       └── sources/
│       │           ├── route.ts         ← POST (add source URL)
│       │           └── [sourceId]/route.ts ← DELETE (remove source)
│       └── alignment/
│           ├── route.ts                 ← GET (latest scan overview)
│           ├── modules/route.ts         ← GET (per-module scores)
│           ├── history/route.ts         ← GET (scan geschiedenis)
│           ├── scan/
│           │   ├── route.ts             ← POST (start scan, demo data)
│           │   └── [scanId]/route.ts    ← GET (poll status)
│           └── issues/
│               ├── route.ts             ← GET (list+filters, default OPEN)
│               └── [id]/
│                   ├── route.ts         ← GET (detail)
│                   ├── dismiss/route.ts ← POST (Zod, optional reason)
│                   ├── fix-options/route.ts ← GET (3 AI fix options A/B/C)
│                   └── fix/route.ts     ← POST (apply fix, Zod optionKey)
│       ├── knowledge-resources/
│       │   ├── route.ts                 ← GET (list+filters) + POST (Zod create)
│       │   ├── [id]/
│       │   │   ├── route.ts             ← GET + PATCH + DELETE
│       │   │   ├── archive/route.ts     ← PATCH (toggle)
│       │   │   ├── favorite/route.ts    ← PATCH (toggle)
│       │   │   └── featured/route.ts    ← PATCH (toggle)
│       │   ├── import-url/route.ts      ← POST (URL import stub)
│       │   ├── upload/route.ts          ← POST (file upload stub)
│       │   ├── featured/route.ts        ← GET (featured resources)
│       │   ├── types/route.ts           ← GET (ResourceType enum)
│       │   └── categories/route.ts      ← GET (static categories)
│       ├── brandstyle/
│       │   ├── route.ts                 ← GET (styleguide) + PATCH (update)
│       │   ├── analyze/url/route.ts     ← POST (start URL analysis, 8s demo)
│       │   ├── analyze/pdf/route.ts     ← POST (start PDF analysis)
│       │   ├── analyze/status/[jobId]/route.ts ← GET (polling, progressive steps)
│       │   ├── logo/route.ts            ← GET + PATCH
│       │   ├── colors/route.ts          ← GET + PATCH + POST
│       │   ├── colors/[colorId]/route.ts ← DELETE
│       │   ├── typography/route.ts      ← GET + PATCH
│       │   ├── tone-of-voice/route.ts   ← GET + PATCH
│       │   ├── imagery/route.ts         ← GET + PATCH
│       │   ├── export-pdf/route.ts      ← POST (stub 501)
│       │   ├── ai-context/route.ts      ← GET (saved sections)
│       │   └── [section]/save-for-ai/route.ts ← POST (5 sections)
│       ├── ai/
│       │   ├── health/route.ts        ← GET (config check, geen API call)
│       │   └── completion/route.ts    ← POST (streaming + JSON, brand context toggle)
│       ├── ai-context/
│       │   └── brand-summary/route.ts ← GET (asset/persona/product counts)
│       ├── dashboard/
│       │   ├── route.ts               ← GET (combined dashboard response)
│       │   ├── readiness/route.ts     ← GET (readiness % + breakdown)
│       │   ├── stats/route.ts         ← GET (5 module counts)
│       │   ├── attention/route.ts     ← GET (attention items, max 5)
│       │   ├── recommended/route.ts   ← GET (AI recommended action)
│       │   ├── campaigns-preview/route.ts ← GET (active campaigns, max 3)
│       │   ├── preferences/route.ts   ← GET + PATCH (dashboard preferences)
│       │   └── quick-start/[key]/complete/route.ts ← POST
│       ├── notifications/
│       │   ├── route.ts               ← GET (list + filters)
│       │   ├── count/route.ts         ← GET (unread count)
│       │   ├── [id]/read/route.ts     ← PATCH (mark read)
│       │   ├── mark-all-read/route.ts ← POST
│       │   └── clear/route.ts         ← DELETE
│       ├── search/
│       │   ├── route.ts               ← GET (global search, multi-module)
│       │   └── quick-actions/route.ts ← GET (static quick actions)
│       ├── exploration/
│       │   └── [itemType]/[itemId]/
│       │       ├── analyze/route.ts           ← POST: start exploration session
│       │       └── sessions/[sessionId]/
│       │           ├── answer/route.ts        ← POST: submit answer, get AI feedback
│       │           └── complete/route.ts      ← POST: complete session, generate report
│       ├── admin/
│       │   └── exploration-configs/
│       │       ├── route.ts                   ← GET (list all) + POST (create)
│       │       └── [id]/
│       │           ├── route.ts               ← GET + PUT + DELETE
│       │           └── knowledge/
│       │               ├── route.ts           ← GET + POST (knowledge items)
│       │               └── [itemId]/route.ts  ← PUT + DELETE (knowledge item)
│       └── versions/route.ts                  ← GET: universal version history (polymorphic)
├── components/
│   ├── auth/
│   │   ├── AuthGate.tsx                 ← Session check → AuthPage of App
│   │   ├── AuthPage.tsx                 ← Login/register UI (teal-600 branding)
│   │   └── OrganizationSwitcher.tsx     ← Org/workspace dropdown (TopNavigationBar)
│   ├── Dashboard.tsx                    ← BACKUP — vervangen door dashboard/DashboardPage
│   ├── dashboard/                       ← S8: Dashboard widgets
│   │   ├── DashboardPage.tsx            ← Orchestrator (header+readiness+stats+attention+actions+campaigns)
│   │   ├── DecisionReadiness.tsx        ← Percentage + color-coded progress bar + breakdown
│   │   ├── DashboardStatsCards.tsx      ← 5 KPI cards (grid-cols-5, clickable)
│   │   ├── AttentionList.tsx            ← "What Needs Your Attention" + Fix/Take Action
│   │   ├── RecommendedAction.tsx        ← Gradient card + "AI RECOMMENDED" badge
│   │   ├── QuickAccess.tsx              ← 3 quick action cards
│   │   ├── ActiveCampaignsPreview.tsx   ← Campaign list + progress bars + "View All"
│   │   ├── OnboardingWizard.tsx         ← 3-step modal (Welcome/How/Start)
│   │   └── QuickStartWidget.tsx         ← 4-item checklist (persistent via API)
│   ├── BrandAssetsViewSimple.tsx        ← BACKUP — oude Brand Foundation (niet gerenderd)
│   ├── EnhancedSidebarSimple.tsx        ← Refactored: useBrandAssets()
│   ├── TopNavigationBar.tsx             ← Top bar
│   ├── shared/                          ← Shared UI primitives (barrel: index.ts)
│   │   ├── index.ts                    ← Barrel export (11 componenten)
│   │   ├── Button.tsx, Badge.tsx, Input.tsx, Select.tsx, SearchInput.tsx
│   │   ├── Modal.tsx, Card.tsx, EmptyState.tsx, Skeleton.tsx, StatCard.tsx, ProgressBar.tsx
│   │   ├── ComingSoonPage.tsx          ← Placeholder ongebouwde modules
│   │   ├── PageHeader.tsx, StatsCard.tsx
│   ├── brand-foundation/               ← ⭐ REFERENTIE-IMPLEMENTATIE (R0.9)
│   │   ├── BrandFoundationPage.tsx     ← Orchestrator: Header+Stats+Filters+Grid+Detail+Create
│   │   ├── BrandFoundationHeader.tsx   ← Titel, count badge, Add Asset button
│   │   ├── BrandFoundationStats.tsx    ← 4 StatCards (total, ready, attention, coverage)
│   │   ├── BrandAssetFilters.tsx       ← Search + Category + Status filters (Zustand)
│   │   └── BrandAssetGrid.tsx          ← Responsive 3-col grid, loading/empty states
│   ├── brand-assets/                    ← Shared brand asset componenten
│   │   ├── BrandAssetCard.tsx          ← Card: status, category, coverage, validation
│   │   ├── BrandAssetDetailPanel.tsx   ← Modal detail panel (stats, validation breakdown)
│   │   ├── BrandAssetCreateModal.tsx   ← Create form (name, category, description)
│   │   ├── AssetStatusBadge.tsx        ← Status → Badge variant mapping
│   │   ├── CategoryBadge.tsx           ← Category → Badge variant mapping
│   │   └── ValidationBreakdown.tsx     ← 4 research methods (compact/full)
│   ├── brand-alignment/
│   │   ├── BrandAlignmentPage.tsx       ← Hoofd alignment view (score gauge, modules, issues)
│   │   ├── ModuleScoreCard.tsx          ← Per-module score card
│   │   ├── AlignmentIssueCard.tsx       ← Per-issue card met severity/dismiss
│   │   ├── AnalyzingScanModal.tsx       ← 8-step scan progress (Shield icon, checklist, cancel)
│   │   ├── ScanStepChecklist.tsx        ← 8 stappen (done/spinning/pending)
│   │   ├── ScanCompleteModal.tsx        ← Scan resultaat (score + issues)
│   │   ├── FixIssueModal.tsx            ← Fix flow (summary+compare+options+apply)
│   │   ├── IssueSummaryBox.tsx          ← Yellow alert box
│   │   ├── CurrentContentCompare.tsx    ← 2-kolom content vergelijking
│   │   ├── FixOptionsGroup.tsx          ← AI fix opties header + cards
│   │   ├── FixOptionCard.tsx            ← Radio card met preview
│   │   └── ScanProgressModal.tsx        ← Legacy scan dialog (niet meer gebruikt)
│   ├── market-insights/
│   │   └── MarketInsightsPage.tsx       ← Market insights view
│   └── [module]/                        ← Per-module componenten
├── features/
│   ├── brand-asset-detail/              ← S1: Asset detail pagina
│   │   ├── components/
│   │   │   ├── BrandAssetDetailPage.tsx     ← Orchestrator
│   │   │   ├── AssetDetailHeader.tsx        ← Breadcrumb + titel + badges
│   │   │   ├── AssetOverflowMenu.tsx        ← 5 acties
│   │   │   ├── ContentEditorSection.tsx     ← Content + action bar
│   │   │   ├── ContentEditMode.tsx          ← Textarea edit mode
│   │   │   ├── FrameworkSection.tsx          ← Inklapbaar
│   │   │   ├── FrameworkRenderer.tsx         ← Switch op type
│   │   │   ├── frameworks/ESG.tsx GoldenCircle.tsx SWOT.tsx
│   │   │   ├── ResearchMethodsSection.tsx   ← 4 method cards
│   │   │   ├── ResearchMethodCard.tsx       ← Per-method card
│   │   │   ├── VersionHistoryTimeline.tsx   ← Versie lijst
│   │   │   ├── DeleteAssetDialog.tsx
│   │   │   ├── ai-exploration/
│   │   │   │   └── AIBrandAssetExplorationPage.tsx  ← Brand asset exploration wrapper
│   │   │   ├── sidebar/
│   │   │   │   ├── QuickActionsCard.tsx       ← Quick actions (AI Exploration, Export, etc.)
│   │   │   │   ├── CompletenessCard.tsx       ← Completeness % ring
│   │   │   │   └── ValidationCard.tsx         ← Validation research methods
│   │   │   ├── PurposeKompasSection.tsx       ← Purpose Kompas framework (Mens/Milieu/Maatschappij)
│   │   │   └── PurposeStatementSection.tsx    ← Purpose Statement als apart asset type
│   │   ├── hooks/                   ← 8 TanStack Query hooks
│   │   ├── store/                   ← useBrandAssetDetailStore
│   │   ├── api/                     ← fetch functies
│   │   ├── types/                   ← brand-asset-detail.types.ts, framework.types.ts
│   │   └── utils/                   ← validation-percentage.ts, framework-registry.ts
│   ├── workshop/                        ← S2a: Canvas Workshop
│   │   ├── components/purchase/
│   │   │   ├── WorkshopPurchasePage.tsx     ← Orchestrator (2-kolom layout)
│   │   │   ├── WorkshopPackageInfo.tsx      ← Info + What's Included
│   │   │   ├── AssetSelectionToggle.tsx     ← Bundles ↔ Individual pill toggle
│   │   │   ├── BundleList.tsx + BundleCard.tsx ← Bundle selectie (radio)
│   │   │   ├── IndividualAssetGrid.tsx + IndividualAssetCard.tsx ← Asset checkbox
│   │   │   ├── WorkshopOptions.tsx          ← Count stepper + facilitator
│   │   │   ├── PurchaseSummary.tsx          ← Sticky sidebar + CTA
│   │   │   └── DashboardImpactModal.tsx     ← Before/after preview
│   │   ├── components/session/
│   │   │   ├── WorkshopSessionPage.tsx      ← Orchestrator (6-stap sessie)
│   │   │   ├── WorkshopSessionHeader.tsx    ← Breadcrumb + titel + status badge
│   │   │   ├── WorkshopCardList.tsx         ← Lijst startbare workshops
│   │   │   ├── WorkshopCard.tsx             ← Datum, tijd, titel, facilitator
│   │   │   ├── WorkshopToolbar.tsx          ← Timer, bookmark, complete button
│   │   │   ├── StepNavigation.tsx           ← 6 pills (active/completed/default)
│   │   │   ├── StepContent.tsx              ← Step badge + instructies + video
│   │   │   ├── ResponseCapture.tsx          ← Prompt + textarea + nav buttons
│   │   │   ├── WorkshopProgressBar.tsx      ← Overall progress (emerald)
│   │   │   └── FacilitatorTips.tsx          ← Amber tips bij stap 6
│   │   ├── components/results/
│   │   │   ├── WorkshopCompletePage.tsx     ← Orchestrator (5-tab results)
│   │   │   ├── WorkshopNavigation.tsx       ← Previous/Next workshop
│   │   │   ├── CompleteBanner.tsx           ← 4 stats + export buttons
│   │   │   ├── ResultsTabs.tsx              ← 5-tab switcher
│   │   │   ├── OverviewTab.tsx              ← AI rapport container
│   │   │   ├── AIReportSection.tsx          ← Executive summary
│   │   │   ├── KeyFindingsCard.tsx          ← 5 findings (groene nummers)
│   │   │   ├── RecommendationsCard.tsx      ← 4 recommendations + checkbox
│   │   │   ├── CanvasTab.tsx                ← Canvas container + lock/edit
│   │   │   ├── CanvasFrameworkRenderer.tsx  ← Golden Circle WHY/HOW/WHAT
│   │   │   ├── WorkshopDetailsTab.tsx       ← Objectives + participants + agenda
│   │   │   ├── ParticipantsGrid.tsx         ← 2×4 avatar grid
│   │   │   ├── AgendaTimeline.tsx           ← Inklapbare agenda items
│   │   │   ├── NotesTab.tsx                 ← Notes lijst + add formulier
│   │   │   ├── NoteCard.tsx                 ← Avatar, naam, rol, content
│   │   │   └── GalleryTab.tsx               ← 2×2 foto grid
│   │   ├── constants/               ← workshop-steps.ts, workshop-pricing.ts
│   │   ├── hooks/                   ← useWorkshops, usePurchaseWorkshop, usePreviewImpact, useWorkshopDetail, useStartWorkshop, useUpdateStepResponse, useCompleteWorkshop, useWorkshopTimer, useWorkshopReport, useUpdateCanvas, useWorkshopNotes, useAddNote, useGenerateReport
│   │   ├── store/                   ← useWorkshopStore (purchase + session + results state)
│   │   ├── api/                     ← workshop.api.ts
│   │   └── types/                   ← workshop.types.ts, workshop-purchase.types.ts
│   ├── ai-brand-analysis/              ← S1: Chat-based AI analysis + rapport
│   │   ├── components/
│   │   │   ├── AIBrandAnalysisPage.tsx      ← Orchestrator (chat vs report)
│   │   │   ├── PageHeader.tsx               ← Building2 icoon + breadcrumb
│   │   │   ├── ChatInterface.tsx            ← HERBRUIKBAAR (ook Fase 4)
│   │   │   ├── MessageList.tsx              ← Auto-scroll
│   │   │   ├── ChatBubble.tsx               ← 3 varianten (question/answer/feedback)
│   │   │   ├── TypingIndicator.tsx          ← 3 dots pulse
│   │   │   ├── InputArea.tsx                ← Auto-resize textarea
│   │   │   ├── OverflowProgressBar.tsx      ← >100% support
│   │   │   ├── NavigationButtons.tsx        ← 3 states
│   │   │   ├── AllAnsweredBanner.tsx
│   │   │   └── GenerateReportButton.tsx
│   │   ├── report/
│   │   │   ├── ReportView.tsx               ← Report orchestrator
│   │   │   ├── SuccessBanner.tsx ExportToolbar.tsx ExecutiveSummary.tsx
│   │   │   ├── FindingCard.tsx FindingCardsGrid.tsx
│   │   │   └── RecommendationItem.tsx RecommendationsList.tsx
│   │   ├── hooks/ store/ api/ types/ utils/
│   ├── ai-exploration/                    ← Universal AI Exploration (S2 — nieuw generiek systeem)
│   │   ├── components/
│   │   │   ├── AIExplorationPage.tsx          ← Generieke exploration orchestrator (5-stap flow)
│   │   │   ├── AIExplorationChatInterface.tsx ← Chat UI met AI vragen/antwoorden
│   │   │   ├── AIExplorationDimensionCard.tsx ← Dimensie kaarten (scores + descriptions)
│   │   │   ├── AIExplorationReport.tsx        ← Rapport weergave na afronding
│   │   │   └── AIExplorationSuggestions.tsx   ← Field suggestions na rapport
│   │   ├── hooks/
│   │   │   └── useAIExplorationStore.ts       ← Zustand store voor exploration state
│   │   └── types.ts                           ← ExplorationSession, ExplorationMessage, etc.
│   └── brandstyle/                          ← S2b: Brandstyle Analyzer + Styleguide
│       ├── components/
│       │   ├── BrandstyleAnalyzerPage.tsx       ← Analyzer orchestrator (URL/PDF input + processing)
│       │   ├── WebsiteUrlInput.tsx               ← URL input card
│       │   ├── PdfUploadInput.tsx                ← PDF drag-and-drop card
│       │   ├── ExtractionCapabilities.tsx        ← 2×2 capability grid
│       │   ├── HowItWorks.tsx                    ← 3-step guide
│       │   ├── ProcessingProgress.tsx            ← 5-step checklist met polling
│       │   ├── BrandStyleguidePage.tsx           ← Styleguide orchestrator (5-tab)
│       │   ├── StyleguideHeader.tsx              ← Creator info + date + actions
│       │   ├── StyleguideTabNav.tsx              ← 5 tabs (Logo/Colors/Typography/Tone/Imagery)
│       │   ├── LogoSection.tsx                   ← Logo variaties + guidelines + don'ts
│       │   ├── ColorsSection.tsx                 ← Swatch grid per category
│       │   ├── ColorDetailModal.tsx              ← Split-view modal (swatch + info + accessibility)
│       │   ├── TypographySection.tsx             ← Font preview + type scale table
│       │   ├── ToneOfVoiceSection.tsx            ← Content/writing guidelines + do/don't
│       │   ├── ImagerySection.tsx                ← Photography + illustration + don'ts
│       │   └── AiContentBanner.tsx               ← Save-for-AI banner per sectie
│       ├── hooks/useBrandstyleHooks.ts          ← 10 TanStack Query hooks + brandstyleKeys
│       ├── stores/useBrandstyleStore.ts         ← Zustand (analysis + tab + color modal)
│       ├── api/brandstyle.api.ts                ← 20 fetch functies
│       ├── types/brandstyle.types.ts            ← 16 interfaces
│       └── utils/color-utils.ts                 ← hex→RGB/HSL/CMYK, WCAG contrast
│   ├── interviews/                            ← S2b: Interview wizard (5-step)
│   │   ├── components/
│   │   │   ├── InterviewsPage.tsx             ← Orchestrator (overview + wizard switch)
│   │   │   ├── InterviewsHeader.tsx           ← Breadcrumb + titel + count + Add CTA
│   │   │   ├── InterviewStatusCounters.tsx    ← 4 status badges
│   │   │   ├── InterviewCard.tsx              ← Card met status/contact/overflow menu
│   │   │   └── wizard/
│   │   │       ├── InterviewWizard.tsx        ← Wizard orchestrator (5 stappen)
│   │   │       ├── WizardStepper.tsx          ← 5-stap horizontale stepper
│   │   │       ├── ContactStep.tsx            ← Contact form
│   │   │       ├── ScheduleStep.tsx           ← Date/time/duration form
│   │   │       ├── QuestionsStep.tsx          ← Questions lijst + add/template
│   │   │       ├── AddQuestionModal.tsx       ← 5 question types + options
│   │   │       ├── TemplatePanelSlideout.tsx  ← Slide-out template browser
│   │   │       ├── ConductStep.tsx            ← Interview conduct + answer types
│   │   │       └── ReviewStep.tsx             ← Review + approve & lock
│   │   ├── hooks/useInterviews.ts             ← 13 TanStack Query hooks + interviewKeys
│   │   ├── stores/useInterviewStore.ts        ← Zustand (wizard step, question modal, template panel)
│   │   ├── api/interview.api.ts               ← 12 fetch functies
│   │   └── types/interview.types.ts           ← Interview, InterviewQuestion, InterviewTemplate, InterviewStats
│   ├── golden-circle/                         ← S2b: Golden Circle canvas editor
│   │   ├── components/
│   │   │   ├── GoldenCirclePage.tsx            ← Orchestrator (canvas + history + edit modal)
│   │   │   ├── GoldenCircleHeader.tsx          ← Breadcrumb + titel + lock toggle
│   │   │   ├── GoldenCircleCanvas.tsx          ← 3 ringen WHY/HOW/WHAT met edit
│   │   │   ├── GoldenCircleEditModal.tsx       ← Modal per ring (statement + details)
│   │   │   └── GoldenCircleHistory.tsx         ← Version timeline
│   │   ├── hooks/useGoldenCircle.ts            ← 4 TanStack Query hooks + goldenCircleKeys
│   │   ├── stores/useGoldenCircleStore.ts      ← Zustand (editing, editingRing, isLocked)
│   │   ├── api/golden-circle.api.ts            ← 4 fetch functies
│   │   └── types/golden-circle.types.ts        ← GoldenCircleData, GoldenCircleVersion, GoldenCircleRing
│   └── business-strategy/                     ← S3a: Business Strategy OKR
│       ├── components/
│       │   ├── BusinessStrategyPage.tsx        ← Overview orchestrator (header+stats+grid+create)
│       │   ├── SummaryStats.tsx                ← 4 StatCards (active, on track, at risk, period)
│       │   ├── StrategyCard.tsx                ← Card met multi-segment progress + focus tags
│       │   ├── CreateStrategyModal.tsx         ← Create form (2x3 type grid, dates, focus areas)
│       │   └── detail/
│       │       ├── StrategyDetailPage.tsx          ← Orchestrator (all sections + modals)
│       │   ├── StrategyProgressSection.tsx     ← Big percentage + multi-segment bar + stats
│       │   ├── StrategicContextSection.tsx     ← Inline edit vision/rationale/assumptions
│       │   ├── ObjectiveCard.tsx               ← OKR card met metrics + key results
│       │   ├── KeyResultItemComponent.tsx      ← Status toggle (ON_TRACK→COMPLETE→BEHIND)
│       │   ├── AddObjectiveModal.tsx           ← Add objective form
│       │   ├── FocusAreaCards.tsx              ← Responsive grid met icon/color + inline add
│       │   ├── LinkedCampaignsSection.tsx      ← Stub (EmptyState)
│       │   ├── MilestoneTimeline.tsx           ← Horizontaal Q1-Q4 timeline + tooltips
│       │   └── AddMilestoneModal.tsx           ← Add milestone form
│       ├── constants/strategy-types.ts         ← STRATEGY_TYPES, status colors, metric formatters
│       ├── hooks/index.ts                      ← 21 TanStack Query hooks + strategyKeys
│       ├── stores/useBusinessStrategyStore.ts  ← Zustand (modals, selectedStrategyId)
│       ├── api/strategies.api.ts               ← 21 fetch functies
│       └── types/business-strategy.types.ts    ← Enums, list/detail/body types
│   └── personas/                              ← S3b: Personas
│       ├── components/
│       │   ├── PersonasPage.tsx                ← Overview orchestrator (header+stats+grid)
│       │   ├── PersonaStatsCards.tsx           ← 3 StatCards (ready, needs work, total)
│       │   ├── PersonaSearchFilter.tsx         ← Search + filter dropdown
│       │   ├── PersonaCard.tsx                 ← Card met demographics + confidence badge
│       │   ├── PersonaConfidenceBadge.tsx      ← Validation % met kleurcode
│       │   ├── WhatArePersonasPanel.tsx        ← Uitklapbaar info panel
│       │   ├── create/
│       │   │   ├── CreatePersonaPage.tsx       ← 3-tab create form
│       │   │   ├── PersonaFormTabs.tsx         ← Tab switcher
│       │   │   ├── OverviewTab.tsx             ← Name + demographics + avatar
│       │   │   ├── PsychographicsTab.tsx       ← Personality + values + goals
│       │   │   ├── BackgroundTab.tsx           ← Frustrations + behaviors
│       │   │   ├── PersonaImageGenerator.tsx   ← AI/URL avatar generator
│       │   │   └── RepeatableListInput.tsx     ← Herbruikbaar list input
│       │   ├── detail/
│       │   │   ├── PersonaDetailPage.tsx       ← Orchestrator (hero header + 2-koloms grid + sidebar)
│       │   │   ├── PersonaDetailHeader.tsx     ← 96×96 foto + naam/locatie/actions + Generate button
│       │   │   ├── DemographicsSection.tsx     ← Compact 3×2 grid + inline edit
│       │   │   ├── PsychographicsSection.tsx   ← Personality + values tags + interests tags
│       │   │   ├── GoalsMotivationsCards.tsx   ← 3 cards (goals/motivations/frustrations)
│       │   │   ├── BehaviorsSection.tsx        ← Bullet list + inline edit
│       │   │   ├── QuoteBioSection.tsx         ← Quote + bio inline edit
│       │   │   ├── ChannelsToolsSection.tsx    ← Preferred channels + tech stack tags
│       │   │   ├── BuyingTriggersSection.tsx   ← Buying triggers + decision criteria
│       │   │   └── sidebar/
│       │   │       ├── ProfileCompletenessCard.tsx    ← Completeness % ring
│       │   │       ├── ResearchSidebarCard.tsx        ← 4 validation methods
│       │   │       ├── QuickActionsCard.tsx           ← Chat + Regenerate + Duplicate + Export
│       │   │       └── StrategicImplicationsSidebar.tsx ← AI-generated implications
│       │   ├── chat/
│       │   │   ├── ChatWithPersonaModal.tsx    ← Modal met chat/insights tabs
│       │   │   ├── PersonaChatInterface.tsx    ← Messages + typing indicator + input
│       │   │   ├── PersonaChatBubble.tsx       ← User (emerald) / Assistant (gray) bubbles
│       │   │   ├── PersonaChatInsightsTab.tsx  ← Insight cards of empty state
│       │   │   └── PersonaChatInput.tsx        ← Input + Send button
│       │   └── ai-analysis/
│       │       ├── AIPersonaAnalysisPage.tsx   ← Orchestrator (chat/completing/complete states)
│       │       ├── PersonaAnalysisChatInterface.tsx ← Bot icon + user/AI bubbles
│       │       ├── PersonaAnalysisProgressBar.tsx   ← Gradient bar + 4 step dots
│       │       ├── PersonaAnalysisComplete.tsx      ← Report + veldsuggesties + apply changes
│       │       ├── FieldSuggestionCard.tsx          ← Accept/reject/edit per persona veld
│       │       └── DimensionInsightCard.tsx         ← 4 kleur/icoon combos per dimension
│       ├── constants/
│       │   ├── persona-research-methods.ts    ← Methods + weights + calculator
│       │   └── persona-demographics.ts        ← Fields + confidence levels + impact badges
│       ├── hooks/index.ts                     ← 17 TanStack Query hooks + personaKeys
│       ├── stores/
│       │   ├── usePersonasOverviewStore.ts    ← Search + filter state
│       │   ├── usePersonaDetailStore.ts       ← Editing + tabs + selectedId + chat modal
│       │   ├── usePersonaChatStore.ts         ← Session + typing + input + tab
│       │   └── useAIPersonaAnalysisStore.ts   ← Session + progress + insights
│       ├── api/
│       │   ├── personas.api.ts                ← 12 fetch functies
│       │   ├── persona-chat.api.ts            ← 3 fetch functies
│       │   └── persona-analysis.api.ts        ← 4 fetch functies
│       └── types/
│           ├── persona.types.ts               ← PersonaWithMeta, stats, CRUD body types
│           ├── persona-chat.types.ts          ← ChatSession, ChatMessage, ChatInsight
│           └── persona-analysis.types.ts      ← AnalysisSession, insights, dimensions
│   └── products/                              ← S4: Products & Services
│       ├── components/
│       │   ├── ProductsOverviewPage.tsx        ← Overview orchestrator (header+grid)
│       │   ├── ProductCard.tsx                 ← Card met category icon + feature tags
│       │   ├── analyzer/
│       │   │   ├── ProductAnalyzerPage.tsx     ← 3-tab analyzer (URL/PDF/Manual)
│       │   │   ├── UrlAnalyzerTab.tsx          ← URL input + analyze button
│       │   │   ├── PdfUploadTab.tsx            ← Drag & drop PDF upload
│       │   │   ├── ManualEntryTab.tsx          ← 7-field form
│       │   │   ├── WhatWeExtractGrid.tsx       ← Herbruikbaar 4-item grid
│       │   │   └── AnalyzingProductModal.tsx   ← 7-step processing met API sync
│       │   └── detail/
│       │       ├── ProductDetailPage.tsx       ← Orchestrator (metadata+sections+edit mode)
│       │       ├── DescriptionCard.tsx         ← Description card
│       │       ├── PricingModelCard.tsx        ← Pricing model + details
│       │       ├── FeaturesSpecsSection.tsx    ← Checklist grid (edit: add/remove)
│       │       ├── BenefitsSection.tsx         ← Genummerde badges (edit: add/remove)
│       │       ├── TargetAudienceSection.tsx   ← Persona badges + link/unlink
│       │       ├── UseCasesSection.tsx         ← Genummerde lijst (edit: add/remove)
│       │       └── PersonaSelectorModal.tsx    ← Persona multi-select modal
│       ├── constants/product-constants.ts      ← CATEGORY_ICONS, ANALYZE_STEPS, SOURCE/STATUS_BADGES
│       ├── hooks/index.ts                      ← 10 TanStack Query hooks + productKeys
│       ├── stores/useProductsStore.ts          ← Zustand (analyzerTab, processingModal, selectedProductId)
│       ├── api/products.api.ts                 ← 10 fetch functies
│       └── types/product.types.ts              ← ProductWithMeta, ProductDetail, AnalyzeJobResponse
│   └── market-insights/                        ← S4: Market Insights
│       ├── components/
│       │   ├── MarketInsightsPage.tsx           ← Overview orchestrator (header+stats+filters+grid)
│       │   ├── InsightStatsCards.tsx            ← 3 StatCards (active, high impact, new this month)
│       │   ├── InsightSearchFilter.tsx          ← Search + 3 dropdown filters
│       │   ├── InsightCard.tsx                  ← Card met 8+ datapunten
│       │   ├── InsightImpactBadge.tsx           ← HIGH/MEDIUM/LOW badge
│       │   ├── ScopeTag.tsx                     ← Micro/Meso/Macro tag
│       │   ├── TimeframeBadge.tsx               ← Clock icon + label
│       │   ├── RelevanceScoreBar.tsx            ← Progress bar sm/lg
│       │   ├── add-modal/
│       │   │   ├── AddInsightModal.tsx          ← 3-tab modal (AI/Manual/Import)
│       │   │   ├── AiResearchTab.tsx            ← AI prompt + focus areas + settings
│       │   │   ├── FocusAreasCheckboxes.tsx     ← 6 checkbox grid
│       │   │   ├── TimeframeRadioCards.tsx      ← 3 radio cards
│       │   │   ├── BrandContextToggle.tsx       ← Toggle switch
│       │   │   ├── ManualEntryTab.tsx           ← 9-field form
│       │   │   ├── RelevanceSlider.tsx          ← Range slider
│       │   │   ├── ImportDatabaseTab.tsx        ← Provider grid
│       │   │   └── ProviderCard.tsx             ← Provider info + connect
│       │   └── detail/
│       │       ├── InsightDetailPage.tsx        ← Orchestrator (all sections + delete)
│       │       ├── RelevanceScoreCard.tsx       ← Big score + progress bar
│       │       ├── AddedDateCard.tsx            ← Date + source badge
│       │       ├── IndustriesTagsSection.tsx    ← Bullet list + outline badges
│       │       ├── SourcesSection.tsx           ← Sources + add/remove inline
│       │       ├── HowToUseSection.tsx          ← Green tips + 2 CTA buttons
│       │       └── DeleteConfirmModal.tsx       ← Delete confirmation
│       ├── constants/insight-constants.ts       ← IMPACT_BADGE_COLORS, CATEGORY_COLORS, TIMEFRAME_BADGES, IMPORT_PROVIDERS
│       ├── hooks/index.ts                      ← 10 TanStack Query hooks + insightKeys
│       ├── stores/useMarketInsightsStore.ts     ← Re-export van centralized store
│       ├── api/insights.api.ts                  ← 9 fetch functies
│       └── types/market-insight.types.ts        ← Re-exports + AiResearchBody, ImportProvider
│   └── knowledge-library/                      ← S5: Knowledge Library
│       ├── components/
│       │   ├── KnowledgeLibraryPage.tsx          ← Overview orchestrator (header+featured+filters+grid/list)
│       │   ├── FeaturedResourcesCarousel.tsx     ← Horizontaal scrollbare carousel
│       │   ├── ResourceSearchFilter.tsx          ← Search + type/category filters + ViewToggle
│       │   ├── ViewToggle.tsx                    ← Grid/List toggle
│       │   ├── ResourceCardGrid.tsx              ← 2-col grid cards
│       │   ├── ResourceCardList.tsx              ← Horizontale list cards
│       │   ├── shared/
│       │   │   ├── ResourceTypeIcon.tsx          ← Type → Lucide icon + color
│       │   │   ├── FavoriteButton.tsx            ← Heart toggle
│       │   │   └── CardContextMenu.tsx           ← MoreVertical dropdown
│       │   └── add/
│       │       ├── AddResourceModal.tsx           ← 3-tab modal (Manual/Import/Upload)
│       │       ├── ManualEntryTab.tsx             ← Full form + type-specific fields
│       │       ├── SmartImportTab.tsx             ← URL import + auto-fill
│       │       ├── FileUploadTab.tsx              ← Drag & drop upload
│       │       ├── ResourceTypeSelector.tsx       ← 12-type dropdown
│       │       └── RatingSlider.tsx               ← 0-5 range slider
│       ├── hooks/index.ts                        ← 11 TanStack Query hooks + resourceKeys
│       ├── api/knowledge-resources.api.ts        ← 13 fetch functies
│       ├── constants/library-constants.ts        ← RESOURCE_TYPE_ICONS, CATEGORIES, DIFFICULTY_LEVELS
│       └── types/knowledge-library.types.ts      ← ResourceWithMeta, CreateResourceBody, ImportUrlResponse
│   └── research/                               ← S5: Research & Validation
│       ├── components/
│       │   ├── hub/
│       │   │   ├── ResearchHubPage.tsx             ← Orchestrator (header+stats+methods+tabs+sections)
│       │   │   ├── ResearchStatsCards.tsx           ← 4 StatCards (active, completed, pending, insights)
│       │   │   ├── ValidationMethodsStatus.tsx     ← 4 method status cards (active/done/unlocked)
│       │   │   ├── ResearchViewTabs.tsx             ← 3 pill tabs (Overview/Category/Timeline)
│       │   │   ├── ActiveResearchSection.tsx        ← Active studies + progress bars + Resume
│       │   │   ├── ValidationNeededSection.tsx      ← Pending validation items + Validate button
│       │   │   ├── QuickInsightsSection.tsx         ← 3 colored insight cards
│       │   │   ├── RecommendedActionsSection.tsx    ← Clickable action cards
│       │   │   └── SplitButton.tsx                  ← Split button + dropdown (Custom/Bundles)
│       │   ├── bundles/
│       │   │   ├── ResearchBundlesPage.tsx          ← Orchestrator (breadcrumb+filters+sections)
│       │   │   ├── BundleFilterTabs.tsx             ← All/Recommended tabs + search
│       │   │   ├── BundleCard.tsx                   ← Card met badges + pricing + methods
│       │   │   ├── BundleBadge.tsx                  ← Recommended/Popular/Save badges
│       │   │   ├── BundleDetailPage.tsx             ← Detail met green border + stats + CTA
│       │   │   ├── BundleStatsBar.tsx               ← 4-stat bar (timeline/assets/methods/savings)
│       │   │   ├── TrustSignals.tsx                 ← Trust signal list
│       │   │   ├── FoundationPlansSection.tsx       ← Foundation bundles grid
│       │   │   └── SpecializedPlansSection.tsx      ← Specialized bundles grid
│       │   ├── custom/
│       │   │   ├── CustomValidationPage.tsx         ← 2-col layout (steps + sidebar)
│       │   │   ├── ValuePropositions.tsx            ← 3 value prop tags
│       │   │   ├── AssetSelectorGrid.tsx            ← 3-col selectable asset cards
│       │   │   ├── MethodCardList.tsx               ← Stacked method cards
│       │   │   ├── MethodCard.tsx                   ← Method + pricing + confidence + stepper
│       │   │   ├── ConfidenceBadge.tsx              ← Low/Medium/High confidence badge
│       │   │   └── QuantityStepper.tsx              ← −/value/+ stepper
│       │   ├── shared/
│       │   │   ├── ValidationPlanSidebar.tsx        ← Sticky sidebar (assets+methods+pricing+CTA)
│       │   │   ├── PricingSummary.tsx               ← Method breakdown + total
│       │   │   └── PricingBreakdownRow.tsx          ← Single pricing row
│       │   └── index.ts                            ← Barrel export
│       ├── constants/research-constants.ts         ← STATS_CONFIG, METHOD_STATUS, PRICING, BADGES
│       ├── hooks/index.ts                          ← 15 TanStack Query hooks + researchKeys
│       ├── stores/useResearchStore.ts              ← Zustand (viewTab, bundleFilter, assets, methods, plan)
│       ├── api/research.api.ts                     ← 18 fetch functies
│       ├── lib/pricing-calculator.ts               ← calculatePlanTotal, hasPaidMethods
│       └── types/research.types.ts                 ← 14 interfaces (stats, bundles, plans, studies)
│   └── campaigns/                                 ← S6: Campaigns + Content
│       ├── components/
│       │   ├── index.ts                            ← Barrel export (22+ componenten)
│       │   ├── overview/
│       │   │   ├── ActiveCampaignsPage.tsx          ← Orchestrator (header+stats+filters+grid/list)
│       │   │   ├── CampaignStatsCards.tsx           ← 4 StatCards (active/quick/completed/total)
│       │   │   ├── CampaignFilterBar.tsx            ← Tabs + search + view toggle
│       │   │   ├── CampaignGrid.tsx                 ← 3-col responsive grid
│       │   │   ├── CampaignList.tsx                 ← Table view
│       │   │   ├── StrategicCampaignCard.tsx        ← Strategic card (confidence, assets, progress)
│       │   │   ├── QuickContentCard.tsx             ← Quick card (quality, convert link)
│       │   │   └── CampaignOverflowMenu.tsx         ← Edit/Duplicate/Archive/Delete
│       │   ├── quick/
│       │   │   ├── QuickContentModal.tsx            ← Modal (tabs+grid+textarea)
│       │   │   ├── ContentTypeTabs.tsx              ← 5 category tabs
│       │   │   ├── ContentTypeGrid.tsx              ← Filtered type cards
│       │   │   ├── ContentTypeCard.tsx              ← Selectable type card
│       │   │   └── PromptTextarea.tsx               ← Textarea + prompt chips
│       │   ├── detail/
│       │   │   ├── CampaignDetailPage.tsx           ← Strategic campaign detail (configure/strategy tabs)
│       │   │   ├── ConfigureInputsTab.tsx           ← Knowledge assets list
│       │   │   ├── StrategyResultTab.tsx            ← 4 strategy sub-tabs
│       │   │   ├── DeliverablesTab.tsx              ← Deliverables list
│       │   │   ├── DeliverableRow.tsx               ← Per-deliverable row
│       │   │   ├── QuickContentDetailPage.tsx       ← Quick content detail + convert
│       │   │   ├── ConvertBanner.tsx                ← Upsell banner
│       │   │   └── ConvertToCampaignModal.tsx       ← Convert modal
│       │   ├── content-library/
│       │   │   └── ContentLibraryPage.tsx           ← Content library (S6.B)
│       │   ├── wizard/
│       │   │   └── CampaignWizardPage.tsx           ← Campaign wizard (S6.B)
│       │   └── studio/                              ← S6.C+D: Content Studio
│       │       ├── ContentStudioPage.tsx            ← 3-column layout orchestrator
│       │       ├── StudioHeader.tsx                 ← Header with breadcrumb + actions
│       │       ├── ContentTypeTabs.tsx              ← Content type tab selector
│       │       ├── RightPanel.tsx                   ← Right panel orchestrator (quality+improve+research+versions)
│       │       ├── QualityScoreWidget.tsx            ← Quality score gauge + metrics
│       │       ├── ImproveScoreButton.tsx            ← "Improve Score" CTA
│       │       ├── ImproveScorePanel.tsx             ← Slide-out improve panel
│       │       ├── SuggestionCard.tsx                ← Per-suggestion card (apply/dismiss/preview)
│       │       ├── BulkApplyButton.tsx               ← Apply all suggestions
│       │       ├── ResearchInsightsSection.tsx       ← Research insights list + insert
│       │       ├── InsertResearchModal.tsx           ← Insert insight modal (format+location)
│       │       ├── InsertFormatCard.tsx              ← Format selection card
│       │       ├── ContentChecklist.tsx              ← Content checklist items
│       │       ├── VersionHistory.tsx                ← Version history + restore
│       │       ├── ExportDropdown.tsx                ← Export format dropdown
│       │       ├── PreviewMode.tsx                   ← Preview mode overlay
│       │       ├── AutoSaveIndicator.tsx             ← Auto-save status indicator
│       │       ├── StudioContextMenu.tsx             ← Right-click context menu
│       │       ├── canvas/
│       │       │   ├── CenterCanvas.tsx             ← Center canvas switcher
│       │       │   ├── TextEditor.tsx               ← Rich text editor
│       │       │   ├── ImageCanvas.tsx              ← Image preview + controls
│       │       │   ├── VideoPlayer.tsx              ← Video player + controls
│       │       │   ├── CarouselEditor.tsx           ← Carousel slide editor
│       │       │   └── SlideThumbnails.tsx          ← Carousel slide thumbnails
│       │       └── left-panel/
│       │           ├── LeftPanel.tsx                 ← Left panel orchestrator
│       │           ├── PromptSection.tsx             ← Prompt input + history
│       │           ├── TypeSettingsPanel.tsx         ← Content-type settings switcher
│       │           ├── TextSettingsPanel.tsx         ← Text content settings
│       │           ├── ImageSettingsPanel.tsx        ← Image content settings
│       │           ├── VideoSettingsPanel.tsx        ← Video content settings
│       │           ├── CarouselSettingsPanel.tsx     ← Carousel content settings
│       │           ├── AiModelSelector.tsx           ← AI model dropdown
│       │           ├── KnowledgeContextPanel.tsx     ← Knowledge context selector
│       │           └── GenerateButton.tsx            ← Generate/regenerate CTA
│       ├── hooks/
│       │   ├── index.ts                            ← 20+ TanStack Query hooks + campaignKeys
│       │   └── studio.hooks.ts                     ← 18 TanStack Query hooks + studioKeys
│       ├── stores/useCampaignStore.ts              ← Zustand (overview+quick modal+detail+convert)
│       ├── api/
│       │   ├── campaigns.api.ts                    ← 20 fetch functies
│       │   └── studio.api.ts                       ← 18 fetch functies (studio right panel)
│       └── types/
│           ├── content-library.types.ts            ← ContentLibraryItem, stats, params
│           └── campaign-wizard.types.ts            ← Wizard types (knowledge, strategy, launch)
│   └── settings/                                  ← S9: Settings + Admin
│       └── components/
│           └── administrator/
│               ├── AdministratorTab.tsx            ← Admin settings tab (view switcher list↔detail)
│               ├── ConfigListView.tsx              ← Gegroepeerde config grid met tabs per item type
│               ├── ConfigCard.tsx                  ← Config kaart (model, dimensies, status)
│               ├── ConfigDetailView.tsx            ← 4-tab detail pagina (form state + validation)
│               ├── DimensionCard.tsx               ← Enkele dimensie kaart met IconPicker
│               ├── IconPicker.tsx                  ← Visuele icon selector (30 Lucide icons)
│               ├── PromptEditor.tsx                ← Herbruikbare textarea met variable chips
│               └── tabs/
│                   ├── GeneralTab.tsx              ← Targeting + AI model + context bronnen
│                   ├── DimensionsTab.tsx           ← Dimensie-editor (add/remove/reorder)
│                   ├── PromptsTab.tsx              ← System/feedback/report prompts
│                   └── KnowledgeTab.tsx            ← Kennisbronnen CRUD (TanStack Query)
├── contexts/
│   ├── index.tsx                        ← AppProviders wrapper + hook exports
│   ├── BrandAssetsContext.tsx            ← API first, mock fallback
│   ├── PersonasContext.tsx               ← API first, mock fallback
│   ├── CampaignsContext.tsx              ← API first, mock fallback
│   ├── KnowledgeContext.tsx              ← API first, mock fallback (+ TanStack: featured, favorite/archive/featured toggles)
│   ├── TrendsContext.tsx                 ← API first, mock fallback
│   ├── MarketInsightsContext.tsx         ← TanStack Query (insightKeys, filters, CRUD mutations)
│   ├── BrandAlignmentContext.tsx         ← TanStack Query (alignmentKeys, scan/issues/modules, dismiss)
│   ├── ChangeImpactContext.tsx
│   ├── CollaborationContext.tsx
│   ├── ProductsContext.tsx               ← API first, mock fallback (+ TanStack: ProductPersona hooks)
│   ├── ProductTierContext.tsx
│   ├── ResearchBundleContext.tsx         ← Purchased bundles (API-backed)
│   ├── ResearchPlanContext.tsx
│   ├── TemplateContext.tsx
│   ├── UIStateContext.tsx
│   └── WhiteLabelContext.tsx
├── data/                                ← Mock data bestanden (fallback only)
│   ├── mock-brand-assets.ts
│   ├── mock-campaigns.ts
│   ├── mock-collaboration.ts
│   ├── mock-knowledge.ts
│   ├── mock-personas.ts
│   ├── mock-trends.ts
│   └── knowledge-resources.ts
├── hooks/
│   ├── use-brand-assets.ts              ← TanStack Query hooks (useBrandAssetsQuery)
│   ├── use-personas.ts                  ← TanStack Query hooks
│   ├── use-workspace.ts                 ← useWorkspace() — workspaceId uit sessie + fallback
│   ├── useBreadcrumbs.ts               ← Refactored: useBrandAssets() + usePersonas()
│   ├── use-dashboard.ts                 ← dashboardKeys, 9 hooks (useDashboard, useReadiness, useDashboardStats, useAttentionItems, useRecommendedAction, useCampaignsPreview, useDashboardPreferences, useUpdatePreferences, useCompleteQuickStart)
│   ├── use-notifications.ts             ← notificationKeys, 5 hooks (useNotifications, useNotificationCount, useMarkRead, useMarkAllRead, useClearNotifications)
│   └── use-search.ts                    ← searchKeys, 2 hooks (useSearch, useQuickActions)
├── lib/
│   ├── prisma.ts                        ← Prisma client singleton
│   ├── auth.ts                          ← Better Auth server config (betterAuth + prismaAdapter + organization)
│   ├── auth-client.ts                   ← Better Auth client (useSession, signIn, signUp, signOut, organization)
│   ├── auth-server.ts                   ← getServerSession() + requireAuth() + requireWorkspace()
│   ├── auth-permissions.ts              ← createAccessControl (owner/admin/member/viewer)
│   ├── workspace-resolver.ts            ← getWorkspaceForOrganization() + getWorkspaceForUser()
│   ├── api/
│   │   ├── brand-assets.ts              ← Type-safe fetch functies
│   │   ├── brand-asset-adapter.ts       ← BrandAssetWithMeta → BrandAsset (API→mock)
│   │   ├── mock-to-meta-adapter.ts     ← BrandAsset → BrandAssetWithMeta (mock→API, R0.9)
│   │   ├── personas.ts                  ← Type-safe fetch functies
│   │   ├── persona-adapter.ts           ← ApiPersona → MockPersona
│   │   ├── campaign-adapter.ts
│   │   ├── knowledge-adapter.ts
│   │   ├── trend-adapter.ts
│   │   ├── insights.ts                ← fetchInsights, createInsight, updateInsight, deleteInsight, sources
│   │   ├── alignment.ts              ← fetchAlignmentOverview, startScan, fetchIssues, dismiss
│   │   ├── knowledge.ts              ← + fetchFeaturedResources, toggleFavorite/Archive/Featured
│   │   └── products.ts               ← + fetchProductPersonas, linkPersona, unlinkPersona
│   ├── ai/                                ← AI Integration Foundation (R0.8)
│   │   ├── index.ts                       ← Barrel export (alle publieke API's)
│   │   ├── config.ts                      ← Model config, temperature/maxTokens/timeout per use case
│   │   ├── openai-client.ts               ← Singleton, retry, streaming + structured completion
│   │   ├── gemini-client.ts               ← Shared Gemini singleton (@google/genai), structured JSON, 60s timeout
│   │   ├── streaming.ts                   ← SSE helpers (createStreamingResponse, parseSSEStream)
│   │   ├── rate-limiter.ts                ← In-memory, per workspace, 3 tiers (FREE/PRO/AGENCY)
│   │   ├── brand-context.ts               ← Aggregator (5 Prisma models), 5 min cache
│   │   ├── prompt-templates.ts            ← SYSTEM_BASE, ANALYSIS, STRUCTURED + message builders
│   │   ├── prompts/
│   │   │   ├── brand-analysis.ts          ← AI Brand Analysis prompts (S1)
│   │   │   ├── product-analysis.ts        ← Product URL/PDF analysis prompts (S4)
│   │   │   └── workshop-report.ts         ← Workshop report generation prompts (S2a)
│   │   ├── middleware.ts                  ← withAi (auth + rate limit + brand context)
│   │   ├── hooks/
│   │       ├── useAiStream.ts             ← Streaming hook (abort support)
│   │       └── useAiMutation.ts           ← Non-streaming hook (timeout)
│   │   └── exploration/
│   │       ├── config.types.ts               ← ExplorationConfig TypeScript types
│   │       ├── config-resolver.ts            ← DB config lookup → fallback → system defaults
│   │       ├── prompt-engine.ts              ← Template {{variable}} resolver voor prompts
│   │       ├── ai-caller.ts                  ← Generic AI caller (Anthropic + OpenAI)
│   │       ├── exploration-llm.ts            ← Multi-provider LLM client (Anthropic + Google)
│   │       └── item-type-registry.ts         ← Registry per item type (persona, brand_asset)
│   ├── products/
│   │   └── url-scraper.ts               ← Lightweight URL scraper (cheerio, SSRF bescherming)
│   ├── catalogs/                        ← Product catalogs (statische configuratie)
│   │   ├── research-bundles.ts          ← Bundle definities + helper functies
│   │   └── strategy-tools.ts            ← Strategy tool definities
│   ├── dashboard/                       ← S8: Dashboard helpers
│   │   ├── thresholds.ts               ← THRESHOLDS config, getThresholdLevel/Color/BgColor
│   │   └── readiness-calc.ts           ← calculateReadiness (weighted 5-module scoring)
│   └── constants/
│       ├── design-tokens.ts             ← Design tokens (740+ regels, S8: DASHBOARD_TOKENS)
│       └── design-system.ts             ← scoreColor() utility
├── providers/
│   └── query-provider.tsx               ← TanStack QueryClientProvider
├── services/                            ← 9 service bestanden (static setters voor data injection)
├── stores/                              ← 14 Zustand stores
│   ├── useBrandAssetStore.ts            ← Filters, create modal, selectedAssetId
│   ├── useMarketInsightsStore.ts        ← Filters, add modal, AI research state
│   ├── useBrandAlignmentStore.ts        ← Scan state, issue filters, fix modal
│   ├── useKnowledgeLibraryStore.ts      ← View mode, filters, add modal
│   ├── useDashboardStore.ts             ← Onboarding wizard, quick start state
│   ├── useShellStore.ts                 ← Notification panel, search modal state
│   └── ...                              ← 8 overige stores
├── types/                               ← Type bestanden (gecentraliseerd)
│   ├── brand-asset.ts                   ← BrandAsset + CalculatedAssetStatus
│   ├── campaign.ts
│   ├── collaboration.ts
│   ├── knowledge.ts
│   ├── research-bundle.ts               ← ResearchBundle (uit catalog geëxtraheerd)
│   ├── strategy.ts                      ← UnlockableTool + strategy types
│   ├── team.ts                          ← Team member types
│   ├── trend.ts
│   ├── market-insight.ts              ← InsightWithMeta, InsightStats, CRUD types, enums
│   ├── brand-alignment.ts            ← ScanSummary, ModuleScoreData, AlignmentIssueData, enums
│   ├── validation.ts
│   └── ...
└── utils/                               ← Utility bestanden (parametrische functies)
    ├── campaign-helpers.ts              ← campaignToStrategy (uit mock-campaigns)
    ├── asset-status.ts                  ← CalculatedAssetStatus logica
    ├── entity-card-adapters.ts
    └── ...

prisma/
├── schema.prisma                        ← 78+ database modellen (AE: +ExplorationSession/Message/Config/KnowledgeItem, BAD: +ResourceVersion)
├── prisma.config.ts                     ← Prisma 7 configuratie
└── seed.ts                              ← Seed data (S1: +3 asset content, SWOT framework, 6 versions, 10-msg AI session)

.env.local                               ← BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_URL
```

## Database & Prisma 7

### Configuratie
- Lokale PostgreSQL: `postgresql://erikjager:@localhost:5432/branddock`
- Prisma 7 vereist adapter: zie `src/lib/prisma.ts`
- Config in `prisma/prisma.config.ts` (NIET url in schema.prisma)
- psql pad: `/opt/homebrew/opt/postgresql@17/bin/psql`

### Commando's
```bash
# Schema push
npx prisma db push

# Client genereren
npx prisma generate

# Seed draaien
DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx prisma/seed.ts

# Database inspecteren
/opt/homebrew/opt/postgresql@17/bin/psql postgresql://erikjager:@localhost:5432/branddock
```

### Status
- 78+ tabellen live, schema in sync (`npx prisma db push` succesvol)
- R0.1 Schema Extension: 6 nieuwe modellen (ProductPersona, MarketInsight, InsightSourceUrl, AlignmentScan, ModuleScore, AlignmentIssue)
- AI Exploration modellen: ExplorationSession (generieke chat sessie per item type), ExplorationMessage (Q&A + feedback berichten), ExplorationConfig (backend-driven AI configuratie per item type/subtype), ExplorationKnowledgeItem (custom knowledge per config)
- Universal Versioning: ResourceVersion (polymorphic versie tracking, entityType + entityId + data JSON)
- 25 enums: BrandstyleAnalysisStatus, ProductSource, ProductStatus, ProductImageCategory, InsightCategory, InsightScope, ImpactLevel, InsightTimeframe, InsightSource, ResourceType, ResourceSource, DifficultyLevel, ScanStatus, AlignmentModule, IssueSeverity, IssueStatus, BundleCategory, ValidationPlanStatus, StudyStatus, PurchaseStatus, CampaignType, CampaignStatus, DeliverableStatus, InsertFormat, SuggestionStatus
- 16 uitgebreide enums: AIAnalysisStatus, AIMessageType, ResearchMethodStatus, StrategyType, StrategyStatus, ObjectiveStatus, KeyResultStatus, MilestoneStatus, MetricType, Priority, StyleguideStatus, ColorCategory, PersonaAvatarSource, AIPersonaAnalysisStatus, PersonaChatMode, ChatRole
- Veld-extensies op 9 bestaande modellen: Product (+sourceUrl, sourceFileName, processingStatus, processingData, productPersonas), Persona (+productPersonas), KnowledgeResource (+slug, source, isFeatured, isFavorite, isArchived, publicationDate, isbn, pageCount, fileName, fileSize, fileType, fileUrl, importedMetadata, estimatedDuration), BrandAssetResearchMethod (+weight, resultData, workspaceId), PersonaResearchMethod (+weight, resultData, workspaceId), FocusArea (+color), Milestone (+completedAt, createdAt), WorkshopParticipant (+email), WorkshopFinding (+category, createdAt)
- Workspace model: +6 relatie-velden (brandAssetResearchMethods, personaResearchMethods, marketInsights, alignmentScans, validationPlans, researchStudies)
- Seed gedraaid met multi-tenant demo data + R0.1/R0.2 extensies
- ExplorationConfig seed: 13 configs (1 persona base + 12 brand_asset: social-relevancy, purpose-statement, golden-circle, brand-essence, brand-promise, mission-statement, vision-statement, brand-archetype, transformative-goals, brand-personality, brand-story, brandhouse-values) met dimensies, prompts, en AI model instellingen

### Seed Data
- 2 Organizations: "Branddock Agency" (AGENCY, ACTIVE) + "TechCorp Inc." (DIRECT, TRIALING)
- 2 Workspaces: "Branddock Demo" (slug: branddock-demo) + "TechCorp Brand"
- 4 Users: Erik (OWNER agency), Sarah Chen (MEMBER agency), John Smith (OWNER direct), demo user
- 3 Account records (Better Auth): erik@branddock.com, sarah@branddock.com, john@techcorp.com — wachtwoord: Password123!
- Seed reset leegt session/account/verification + R0.1 tabellen + S5 tabellen
- 3 OrganizationMembers (roles lowercase: "owner", "member") + 1 Invitation (status: "pending")
- 13 brand assets, 3 personas, 3 strategies (5 focus areas met color, 4 milestones met completedAt), 1 styleguide
- 3 products (Digital Platform Suite/Brand Strategy Consulting/Mobile App Framework, status ANALYZED), 3 product-persona koppelingen, 9 product images (3 per product: HERO/LIFESTYLE/SCREENSHOT)
- 10 knowledge resources (2 featured, met slug/rating/difficultyLevel enum/isbn/estimatedDuration)
- 10 research bundles (6 Foundation + 4 Specialized, 25 bundle assets, 28 bundle methods)
- 3 research studies (linked to personas/brand assets)
- 1 validation plan (DRAFT, 2 assets, 3 methods, $180)
- 6 campaigns (3 strategic + 3 quick), 12 knowledge assets, 13 deliverables, 3 content versions, 4 improve suggestions, 2 inserted insights, 1 campaign template
- 7 market insights (8 source URLs, S4 spec data met aiResearchPrompt/useBrandContext, 5 categorieën)
- 1 alignment scan (78%, COMPLETED) met 6 module scores (68-95%) en 4 issues (1 CRITICAL, 2 WARNING, 1 SUGGESTION)
- 15 notifications, workshops, interviews, research methods, etc.

## Multi-tenant / Agency Model

### Structuur
```
Agency (Organization type=AGENCY)
├── User: agency-eigenaar (OWNER)
├── User: medewerker (MEMBER)
├── Workspace: Klant A
└── Workspace: Klant B

Directe klant (Organization type=DIRECT)
├── User: klant-eigenaar (OWNER)
└── Workspace: eigen merk
```

### Schema modellen
- **Organization**: type DIRECT of AGENCY, Stripe billing velden, seat/workspace limieten
- **OrganizationMember**: User ↔ Organization met rollen (OWNER, ADMIN, MEMBER, VIEWER)
- **WorkspaceMemberAccess**: per-workspace toegangscontrole
- **Invitation**: token-based user invites
- **Workspace**: gekoppeld aan Organization via organizationId
- **User**: workspaceId optioneel, gekoppeld via OrganizationMember

### Better Auth Organization Plugin (✅ Fase B — done)
- Mapt naar BESTAANDE tabellen (Organization, OrganizationMember, Invitation)
- Geen nieuwe tabellen, alleen ontbrekende velden toegevoegd
- Access control: createAccessControl met 4 rollen (viewer, member, admin, owner) in auth-permissions.ts
- Session heeft `activeOrganizationId String?` voor workspace resolution
- Role velden geconverteerd van enum naar String (lowercase: "owner", "admin", "member", "viewer")

## API Laag

### Werkende routes
| Route | Methode | Beschrijving |
|---|---|---|
| `/api/auth/[...all]` | GET, POST | Better Auth catch-all (login, register, session, etc.) |
| `/api/workspaces` | GET | Lijst workspaces voor actieve organization |
| `/api/workspaces` | POST | Nieuwe workspace aanmaken (alleen agencies, valideert role + limiet) |
| `/api/workspace/switch` | POST | Actieve workspace wisselen (set cookie, valideert toegang) |
| `/api/organization/invite` | POST | User inviten (email + role, valideert owner/admin, seat limiet, 7 dagen expiry) |
| `/api/organization/invite/accept` | POST | Invite accepteren via token (maakt OrganizationMember aan) |
| `/api/organization/members` | GET | Lijst members + pending invitations |
| `/api/brand-assets` | GET | Lijst met filters (category, status, search, sortBy, sortOrder) + stats |
| `/api/brand-assets` | POST | Nieuw asset aanmaken (name, category, workspaceId) |
| `/api/brand-assets/:id` | GET | Asset detail met researchMethods, versions, computed validationPercentage |
| `/api/brand-assets/:id` | DELETE | Delete asset (cascade versions, methods, sessions) |
| `/api/brand-assets/:id/content` | PATCH | Inline content edit + auto BrandAssetVersion |
| `/api/brand-assets/:id/status` | PATCH | Status update (DRAFT/IN_PROGRESS/NEEDS_ATTENTION/READY) |
| `/api/brand-assets/:id/lock` | PATCH | Lock/unlock asset (isLocked + lockedById + lockedAt) |
| `/api/brand-assets/:id/duplicate` | POST | Deep copy asset (content + framework + methods) |
| `/api/brand-assets/:id/regenerate` | POST | AI content regeneratie via openaiClient |
| `/api/brand-assets/:id/versions` | GET | Versie historie (limit + offset pagination) |
| `/api/brand-assets/:id/framework` | PATCH | Framework data (ESG/GoldenCircle/SWOT) updaten |
| `/api/brand-assets/:id/workshops` | GET | Workshops + bundles voor asset |
| `/api/brand-assets/:id/workshops/bundles` | GET | Bundle lijst met prijzen |
| `/api/brand-assets/:id/workshops/purchase` | POST | Workshop aankoop (bundel/individueel + facilitator) |
| `/api/brand-assets/:id/workshops/preview-impact` | POST | Dashboard impact preview (before/after) |
| `/api/workshops/:id` | GET | Workshop detail + steps + participants |
| `/api/workshops/:id/start` | POST | Start workshop (status → IN_PROGRESS) |
| `/api/workshops/:id/steps/:stepNumber` | PATCH | Step response opslaan |
| `/api/workshops/:id/timer` | PATCH | Timer sync |
| `/api/workshops/:id/bookmark` | PATCH | Bookmark positie opslaan |
| `/api/workshops/:id/complete` | POST | Workshop afronden + research method cascade |
| `/api/workshops/:id/report` | GET | AI rapport (findings + recommendations) |
| `/api/workshops/:id/canvas` | PATCH | Canvas data updaten (unlock/edit/lock) |
| `/api/workshops/:id/notes` | GET | Alle notes |
| `/api/workshops/:id/notes` | POST | Note toevoegen |
| `/api/workshops/:id/report/raw` | GET | Raw data export (JSON) |
| `/api/workshops/:id/generate-report` | POST | AI rapport generatie via OpenAI |
| `/api/brand-assets/:id/interviews` | GET | Interviews lijst + stats voor asset |
| `/api/brand-assets/:id/interviews` | POST | Interview aanmaken (DRAFT, auto orderNumber) |
| `/api/brand-assets/:id/interviews/:interviewId` | GET | Interview detail + questions |
| `/api/brand-assets/:id/interviews/:interviewId` | PATCH | Interview update (contact/schedule/notes/step) |
| `/api/brand-assets/:id/interviews/:interviewId` | DELETE | Interview verwijderen |
| `/api/brand-assets/:id/interviews/:interviewId/duplicate` | POST | Interview dupliceren (deep copy) |
| `/api/brand-assets/:id/interviews/:interviewId/questions` | POST | Vraag toevoegen |
| `/api/brand-assets/:id/interviews/:interviewId/questions/:questionId` | PATCH | Vraag/antwoord updaten |
| `/api/brand-assets/:id/interviews/:interviewId/questions/:questionId` | DELETE | Vraag verwijderen |
| `/api/brand-assets/:id/interviews/:interviewId/complete` | POST | Interview afronden (COMPLETED + actualDuration) |
| `/api/brand-assets/:id/interviews/:interviewId/approve` | POST | Approve & lock + research method cascade |
| `/api/brand-assets/:id/interviews/templates` | GET | Templates per category |
| `/api/brand-assets/:id/golden-circle` | GET | Golden Circle data (WHY/HOW/WHAT) |
| `/api/brand-assets/:id/golden-circle` | PATCH | Golden Circle updaten |
| `/api/brand-assets/:id/golden-circle/lock` | PATCH | Lock/unlock Golden Circle |
| `/api/brand-assets/:id/golden-circle/history` | GET | Versie geschiedenis |
| `/api/personas` | GET | Lijst met computed validationPercentage + stats (search, filter) |
| `/api/personas` | POST | Persona aanmaken (Zod, auto 4 research methods, createdById) |
| `/api/personas/:id` | GET | Detail met researchMethods, computed validation% |
| `/api/personas/:id` | PATCH | Persona updaten (Zod partial body) |
| `/api/personas/:id` | DELETE | Cascade delete |
| `/api/personas/:id/duplicate` | POST | Deep copy (reset methods, clear lock, " (Copy)") |
| `/api/personas/:id/lock` | PATCH | Lock/unlock toggle (isLocked, lockedById, lockedAt) |
| `/api/personas/:id/avatar` | PATCH | Avatar URL + source updaten |
| `/api/personas/:id/generate-image` | POST | Stub: DiceBear placeholder, set AI_GENERATED |
| `/api/personas/:id/regenerate` | POST | Stub 501 |
| `/api/personas/:id/strategic-implications` | POST | Generate mock implications, save to DB |
| `/api/personas/:id/export` | GET | Stub 501 |
| `/api/personas/:id/research-methods/:method` | PATCH | Status/progress update + herbereken validation% |
| `/api/personas/:id/chat` | POST | Start chat session + greeting message |
| `/api/personas/:id/chat/:sessionId/message` | POST | Send message + stub AI response + optional insight |
| `/api/personas/:id/chat/:sessionId/insights` | GET | Lijst insights voor sessie |
| `/api/personas/:id/chat/:sessionId/export` | GET | Stub 501 |
| `/api/personas/:id/ai-analysis` | POST | Start analysis (IN_PROGRESS, intro + 1e vraag) |
| `/api/personas/:id/ai-analysis/:sessionId` | GET | Session + messages (ordered) |
| `/api/personas/:id/ai-analysis/:sessionId/answer` | POST | Antwoord + feedback + next question + progress |
| `/api/personas/:id/ai-analysis/:sessionId/complete` | POST | Complete + AI_EXPLORATION→COMPLETED + insights |
| `/api/products` | GET | Lijst met filters (category, search, sortBy, sortOrder) + stats |
| `/api/products` | POST | Nieuw product aanmaken (name, category, workspaceId, pricing, features, source, status, etc.) |
| `/api/products/:id` | GET | Product detail met linkedPersonas |
| `/api/products/:id` | PATCH | Product updaten (name, description, features, benefits, useCases, etc.) |
| `/api/products/:id/lock` | PATCH | Lock/unlock product toggle |
| `/api/products/analyze/url` | POST | AI URL analyse via Gemini 3.1 Pro (scrape → extract → structured JSON) |
| `/api/products/analyze/pdf` | POST | AI PDF analyse via Gemini 3.1 Pro (parse → extract → structured JSON) |
| `/api/research-plans` | GET | Lijst met filters (status) + stats |
| `/api/research-plans` | POST | Nieuw research plan aanmaken |
| `/api/research-plans` | PATCH | Research plan updaten (unlock methods/assets, status) |
| `/api/purchased-bundles` | GET | Lijst gekochte bundles + alle unlocked tool IDs |
| `/api/purchased-bundles` | POST | Bundle aankoop registreren (upsert) |
| `/api/campaigns` | GET | Lijst met filters (type, status, search, sort) + _count |
| `/api/campaigns` | POST | Campaign aanmaken (Zod validated) |
| `/api/campaigns` | DELETE | Campaign verwijderen (by id in body) |
| `/api/campaigns/stats` | GET | Stats: active, quick, completed, totalContent |
| `/api/campaigns/:id` | GET | Detail met knowledgeAssets, deliverables, teamMembers |
| `/api/campaigns/:id` | PATCH | Campaign updaten (Zod validated) |
| `/api/campaigns/:id` | DELETE | Campaign verwijderen (cascade) |
| `/api/campaigns/:id/archive` | PATCH | Toggle isArchived |
| `/api/campaigns/quick` | POST | Quick content aanmaken (Campaign + Deliverable) |
| `/api/campaigns/quick/prompt-suggestions` | GET | 4 prompt suggesties |
| `/api/campaigns/quick/:id/convert` | POST | Convert QUICK → STRATEGIC |
| `/api/campaigns/:id/knowledge` | GET, POST | Knowledge assets voor campaign |
| `/api/campaigns/:id/knowledge/:assetId` | DELETE | Knowledge asset ontkoppelen |
| `/api/campaigns/:id/coverage` | GET | Coverage % + asset counts |
| `/api/campaigns/:id/deliverables` | GET, POST | Deliverables voor campaign |
| `/api/campaigns/:id/deliverables/:did` | PATCH, DELETE | Deliverable updaten/verwijderen |
| `/api/campaigns/:id/strategy` | GET | Strategy velden ophalen |
| `/api/campaigns/:id/strategy/generate` | POST | Strategy genereren (placeholder, 85% confidence) |
| `/api/knowledge` | GET | Lijst met filters |
| `/api/knowledge` | POST | Nieuwe knowledge resource aanmaken |
| `/api/knowledge/featured` | GET | Featured resources voor carousel |
| `/api/knowledge/:id` | PATCH | Resource velden updaten |
| `/api/knowledge/:id/favorite` | PATCH | Toggle isFavorite |
| `/api/knowledge/:id/archive` | PATCH | Toggle isArchived |
| `/api/knowledge/:id/featured` | PATCH | Toggle isFeatured |
| `/api/knowledge-resources` | GET | Lijst met search/type/category/isArchived filters |
| `/api/knowledge-resources` | POST | Nieuw resource aanmaken (Zod validated, auto-slug) |
| `/api/knowledge-resources/:id` | GET | Resource detail |
| `/api/knowledge-resources/:id` | PATCH | Resource updaten |
| `/api/knowledge-resources/:id` | DELETE | Resource verwijderen |
| `/api/knowledge-resources/:id/archive` | PATCH | Toggle isArchived |
| `/api/knowledge-resources/:id/favorite` | PATCH | Toggle isFavorite |
| `/api/knowledge-resources/:id/featured` | PATCH | Toggle isFeatured |
| `/api/knowledge-resources/import-url` | POST | URL import stub (detecteert VIDEO) |
| `/api/knowledge-resources/upload` | POST | File upload stub (multipart) |
| `/api/knowledge-resources/featured` | GET | Featured resources (isFeatured=true) |
| `/api/knowledge-resources/types` | GET | ResourceType enum waarden |
| `/api/knowledge-resources/categories` | GET | Statische categorieën lijst |
| `/api/trends` | GET | Lijst met filters |
| `/api/trends` | POST | Nieuwe trend aanmaken |
| `/api/products/:id/personas` | GET | Gekoppelde personas voor product |
| `/api/products/:id/personas` | POST | Persona koppelen aan product |
| `/api/products/:id/personas/:personaId` | DELETE | Persona ontkoppelen van product |
| `/api/insights` | GET | Lijst met filters (category, impactLevel, timeframe, search) + stats |
| `/api/insights` | POST | Nieuw insight aanmaken (Zod validatie, slug generatie) |
| `/api/insights/stats` | GET | Stats: active, highImpact, newThisMonth |
| `/api/insights/:id` | GET | Detail met sourceUrls en howToUse |
| `/api/insights/:id` | PATCH | Insight updaten (Zod validatie) |
| `/api/insights/:id` | DELETE | Verwijderen (cascade naar InsightSourceUrl) |
| `/api/insights/:id/sources` | POST | Bron URL toevoegen (Zod validatie) |
| `/api/insights/:id/sources/:sourceId` | DELETE | Bron URL verwijderen |
| `/api/insights/ai-research` | POST | AI research: genereer mock insights (Zod, stub sync) |
| `/api/insights/ai-research/:jobId` | GET | Stub poll endpoint (404) |
| `/api/insights/categories` | GET | Return InsightCategory enum waarden als array |
| `/api/insights/providers` | GET | Return statische IMPORT_PROVIDERS lijst |
| `/api/alignment` | GET | Laatste scan resultaat (score, modules, openIssuesCount) |
| `/api/alignment/modules` | GET | Per-module scores uit laatste completed scan |
| `/api/alignment/history` | GET | Scan geschiedenis met module scores en issue counts |
| `/api/alignment/scan` | POST | Nieuwe scan starten (RUNNING, background 8-step scanner) |
| `/api/alignment/scan/:scanId` | GET | Scan progress pollen (ScanProgressResponse, 2s interval) |
| `/api/alignment/scan/:scanId/cancel` | POST | Lopende scan annuleren |
| `/api/alignment/issues` | GET | Open issues met filters (severity, module, status) |
| `/api/alignment/issues/:id` | GET | Issue detail met scan context |
| `/api/alignment/issues/:id/dismiss` | POST | Issue dismissen (Zod: optional reason) |
| `/api/alignment/issues/:id/fix-options` | GET | 3 AI fix opties (A/B/C) met currentContent + preview |
| `/api/alignment/issues/:id/fix` | POST | Fix toepassen (Zod optionKey A/B/C, markeert FIXED) |
| `/api/brand-assets/:id/ai-analysis` | POST | Start AI analysis sessie (optioneel personaId, genereert intro+eerste vraag via OpenAI) |
| `/api/brand-assets/:id/ai-analysis/:sessionId` | GET | Sessie + messages ophalen |
| `/api/brand-assets/:id/ai-analysis/:sessionId/answer` | POST | Antwoord submitten (AI feedback + volgende vraag via OpenAI) |
| `/api/brand-assets/:id/ai-analysis/:sessionId/complete` | POST | Sessie markeren als COMPLETED |
| `/api/brand-assets/:id/ai-analysis/:sessionId/generate-report` | POST | Rapport genereren via OpenAI structured output |
| `/api/brand-assets/:id/ai-analysis/:sessionId/report` | GET | Rapport ophalen (poll tot REPORT_READY) |
| `/api/brand-assets/:id/ai-analysis/:sessionId/report/raw` | GET | Volledige sessie + messages + reportData |
| `/api/brand-assets/:id/ai-analysis/:sessionId/lock` | PATCH | Lock/unlock sessie toggle |
| `/api/brandstyle` | GET | Styleguide ophalen (met colors + createdBy) |
| `/api/brandstyle` | PATCH | Styleguide velden updaten (Zod) |
| `/api/brandstyle/analyze/url` | POST | URL analyse starten (8s demo, 5 kleuren) |
| `/api/brandstyle/analyze/pdf` | POST | PDF analyse starten (multipart/form-data) |
| `/api/brandstyle/analyze/status/:jobId` | GET | Analyse polling (5-stap progressief) |
| `/api/brandstyle/logo` | GET, PATCH | Logo sectie ophalen/updaten |
| `/api/brandstyle/colors` | GET, PATCH, POST | Kleuren ophalen/donts updaten/kleur toevoegen |
| `/api/brandstyle/colors/:colorId` | DELETE | Kleur verwijderen (workspace ownership check) |
| `/api/brandstyle/typography` | GET, PATCH | Typography sectie ophalen/updaten |
| `/api/brandstyle/tone-of-voice` | GET, PATCH | Tone of voice sectie ophalen/updaten |
| `/api/brandstyle/imagery` | GET, PATCH | Imagery sectie ophalen/updaten |
| `/api/brandstyle/export-pdf` | POST | Stub 501 — PDF export (later) |
| `/api/brandstyle/ai-context` | GET | Alle saved-for-AI secties |
| `/api/brandstyle/:section/save-for-ai` | POST | Sectie markeren als saved-for-AI (5 secties) |
| `/api/ai/health` | GET | AI config check (model, hasApiKey, rateLimitStatus) — geen API call |
| `/api/ai/completion` | POST | Chat completion (streaming + JSON, brand context toggle, rate limited) |
| `/api/ai-context/brand-summary` | GET | Brand context counts (assets, personas, products) voor AI Research toggle |
| `/api/strategies` | GET, POST | Lijst strategieën (filter op status) + aanmaken (auto-slug, focus areas) |
| `/api/strategies/stats` | GET | Stats: active, onTrack, atRisk, currentPeriod |
| `/api/strategies/:id` | GET, PATCH, DELETE | Detail (alle relaties) + updaten (Zod) + verwijderen (cascade) |
| `/api/strategies/:id/archive` | PATCH | Toggle ACTIVE ↔ ARCHIVED |
| `/api/strategies/:id/context` | PATCH | Vision/rationale/keyAssumptions updaten |
| `/api/strategies/:id/objectives` | GET, POST | Lijst (sorted, KRs + focusArea) + aanmaken (optionele KR strings) |
| `/api/strategies/:id/objectives/reorder` | PATCH | Herordenen objectiveIds |
| `/api/strategies/:id/objectives/:objId` | PATCH, DELETE | Objective updaten/verwijderen |
| `/api/strategies/:id/objectives/:objId/key-results` | POST | Key result toevoegen |
| `/api/strategies/:id/objectives/:objId/key-results/:krId` | PATCH, DELETE | Key result updaten/verwijderen |
| `/api/strategies/:id/milestones` | POST | Milestone toevoegen (auto quarter) |
| `/api/strategies/:id/milestones/:msId` | PATCH, DELETE | Milestone updaten/verwijderen |
| `/api/strategies/:id/focus-areas` | POST | Focus area toevoegen |
| `/api/strategies/:id/link-campaign` | POST | Stub 501 — campaign module niet beschikbaar |
| `/api/strategies/:id/unlink-campaign/:campId` | DELETE | Stub 501 — campaign module niet beschikbaar |
| `/api/strategies/:id/recalculate` | POST | Progress herberekenen (objective gemiddelde) |
| `/api/research/stats` | GET | Research stats: activeStudies, completed, pendingReview, totalInsights |
| `/api/research/method-status` | GET | Per-method status: active, done, unlocked counts |
| `/api/research/active` | GET | Active studies (IN_PROGRESS) met persona/asset namen |
| `/api/research/pending-validation` | GET | Stub: 2 hardcoded pending validation items |
| `/api/research/validate/:assetId` | POST | Stub 501 — validation flow |
| `/api/research/insights` | GET | Stub: 3 hardcoded QuickInsight items |
| `/api/research/recommended-actions` | GET | Stub: 3 hardcoded RecommendedAction items |
| `/api/research/bundles` | GET | Bundles lijst (foundation + specialized), search/recommended filter |
| `/api/research/bundles/:id` | GET | Bundle detail met assets, methods, trustSignals, savings |
| `/api/research/bundles/:id/select` | POST | BundlePurchase aanmaken (PENDING) |
| `/api/research/custom/available-assets` | GET | Workspace brand assets als selectable items |
| `/api/research/custom/methods` | GET | METHOD_PRICING als MethodConfig array |
| `/api/research/custom/plan` | POST | ValidationPlan aanmaken (Zod, assets + methods + pricing) |
| `/api/research/custom/plan/:id` | GET, PATCH | Plan detail + update (recalculate totalPrice) |
| `/api/research/custom/plan/:id/purchase` | POST | Plan status → PURCHASED |
| `/api/research/custom/plan/:id/start` | POST | Plan status → IN_PROGRESS |
| `/api/research/studies` | GET | Studies lijst (optioneel status filter) |
| `/api/research/studies/:id` | GET, PATCH | Study detail + progress/status update |
| `/api/studio/:deliverableId` | GET, PATCH | Studio state (deliverable+campaign) + update fields |
| `/api/studio/:deliverableId/auto-save` | POST | Auto-save with selective field updates |
| `/api/studio/:deliverableId/generate` | POST | Generate content stub (text/images/video/carousel) |
| `/api/studio/:deliverableId/regenerate` | POST | Regenerate content stub (different placeholder) |
| `/api/studio/:deliverableId/cost-estimate` | GET | Cost estimate from model/contentType lookup |
| `/api/studio/:deliverableId/quality` | GET | Quality score + metrics |
| `/api/studio/:deliverableId/quality/refresh` | POST | Recalculate quality score |
| `/api/studio/:deliverableId/improve` | GET | Improve suggestions + potential score |
| `/api/studio/:deliverableId/improve/:suggestionId/apply` | POST | Apply suggestion |
| `/api/studio/:deliverableId/improve/:suggestionId/dismiss` | POST | Dismiss suggestion |
| `/api/studio/:deliverableId/improve/:suggestionId/preview` | POST | Preview suggestion |
| `/api/studio/:deliverableId/improve/apply-all` | POST | Bulk apply all PENDING |
| `/api/studio/:deliverableId/insights` | GET | Market insights for workspace |
| `/api/studio/:deliverableId/insights/insert` | POST | Insert insight into content |
| `/api/studio/:deliverableId/versions` | GET, POST | Version list + create snapshot |
| `/api/studio/:deliverableId/versions/:versionId` | GET | Specific version detail |
| `/api/studio/:deliverableId/versions/:versionId/restore` | POST | Restore from snapshot |
| `/api/studio/:deliverableId/export` | POST | Export content (stub download URL) |
| `/api/dashboard` | GET | Combined dashboard response (readiness + stats + attention + recommended) |
| `/api/dashboard/readiness` | GET | Readiness % + per-module breakdown (weighted 5 modules) |
| `/api/dashboard/stats` | GET | 5 module counts (assets, personas, strategies, campaigns, insights) |
| `/api/dashboard/attention` | GET | Attention items (max 5, priority sorted) |
| `/api/dashboard/recommended` | GET | AI recommended action (single item) |
| `/api/dashboard/campaigns-preview` | GET | Active campaigns preview (max 3, progress %) |
| `/api/dashboard/preferences` | GET, PATCH | Dashboard preferences (onboarding, quickStart items) |
| `/api/dashboard/quick-start/:key/complete` | POST | Mark quick start item as completed |
| `/api/notifications` | GET | Notifications list (filters: category, read status) |
| `/api/notifications/count` | GET | Unread notification count |
| `/api/notifications/:id/read` | PATCH | Mark single notification as read |
| `/api/notifications/mark-all-read` | POST | Mark all notifications as read |
| `/api/notifications/clear` | DELETE | Clear all notifications |
| `/api/search` | GET | Global search (multi-module: assets, personas, strategies, campaigns, insights) |
| `/api/search/quick-actions` | GET | Static quick actions list (12 items) |
| `/api/exploration/[itemType]/[itemId]/analyze` | POST | Start exploration session (generic, per item type) |
| `/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/answer` | POST | Submit answer, get AI feedback + next question |
| `/api/exploration/[itemType]/[itemId]/sessions/[sessionId]/complete` | POST | Complete session, generate AI report |
| `/api/admin/exploration-configs` | GET | List all exploration configs |
| `/api/admin/exploration-configs` | POST | Create new exploration config |
| `/api/admin/exploration-configs/[id]` | GET, PUT, DELETE | CRUD single exploration config |
| `/api/admin/exploration-configs/[id]/knowledge` | GET, POST | Knowledge items per config |
| `/api/admin/exploration-configs/[id]/knowledge/[itemId]` | PUT, DELETE | CRUD single knowledge item |
| `/api/versions` | GET | Universal version history (polymorphic ResourceVersion) |

Alle module-routes resolven workspaceId uit sessie via `resolveWorkspaceId()`.
Geen env var fallback — sessie is verplicht voor workspace resolution.
Auth route vereist GEEN workspaceId.

### Patroon voor nieuwe modules
1. `src/app/api/[module]/route.ts` — Next.js API route met Prisma queries
2. `src/lib/api/[module].ts` — type-safe fetch functies
3. `src/lib/api/[module]-adapter.ts` — DB → mock format mapper (tijdelijk)
4. `src/hooks/use-[module].ts` — TanStack Query hooks
5. Context updaten: API fetch in useEffect + mock fallback

### API route beveiliging (✅ actief)
Alle module-routes gebruiken `resolveWorkspaceId()` uit `src/lib/auth-server.ts`.
workspaceId komt uit sessie (activeOrganizationId → workspace resolution via workspace-resolver.ts).

## TypeScript Status
- **0 errors** — clean codebase, `npx tsc --noEmit` passeert volledig
- Opgeschoond van 683 → 0 in Fase 2 refactor (feb 2026)
- Key type fixes: Persona flat accessors (demographics.X → X), CalculatedAssetStatus, React 19 RefObject nullability, PersonaResearchMethodItem

## Werkwijze
- Erik gebruikt Claude Code in Warp terminal voor codebase wijzigingen
- Scripts/commando's draaien vanuit `~/Projects/branddock-app/`
- Dev server: `npm run dev` in apart terminal-tabblad
- Testen API: `curl` in ander tabblad

## Common Mistakes to Avoid
- Do NOT use `any` type in TypeScript, use proper types or `unknown`
- Do NOT install new dependencies without discussing alternatives first
- Do NOT use inline styles, always use Tailwind classes — **uitzondering**: `min-h-0` en custom colors die niet in Tailwind safelist staan (zie Conventies)
- Do NOT modify seed data without verifying migration compatibility

## Wat er NIET is
- **Stripe billing** — niet geïmplementeerd (BILLING-01 t/m BILLING-04 in backlog)
- **Server-side rendering** — alles is client-side
- **OAuth** — alleen emailAndPassword, Google/Microsoft login nog niet (AUTH-05)
- **Email verzending** — invite flow maakt records aan maar stuurt nog geen echte emails

---

## ACTIELIJST

### ✅ AFGEROND
1. Broken import fixen (BrandAsset type export)
2. Git onder version control
3. Prisma schema uitbreiden → Organization + Agency model (44 modellen)
4. Prisma 7 config + client singleton
5. Database in sync (44 tabellen live)
6. Seed data met multi-tenant demo data
7. `/api/brand-assets` GET + POST → Brand Foundation leest uit PostgreSQL
8. `/api/personas` GET + POST → Personas leest uit PostgreSQL
9. TanStack Query integratie (hooks + QueryProvider)
10. Adapter pattern (API → mock, zero breaking changes)
11. Dashboard bijgewerkt (context hooks ipv mock imports)
12. `dashboard-decision-transformer` gerefactored naar parametrische functies
13. **`mockBrandAssets` → `useBrandAssets()` in 12 componenten**
14. Alle API routes gebouwd: products, research-plans, purchased-bundles, campaigns, knowledge, trends
15. **`mockBrandAssets` + `mockPersonas` in utils/services → parametrische functies + static setters**
16. **`useBreadcrumbs` hook → `useBrandAssets()` + `usePersonas()` intern**
17. **`mockPersonas` → `usePersonas()` in 7 componenten**
18. **Callers bijgewerkt**: CampaignStrategyGeneratorDetail, UniversalStrategyGenerator, GlobalSearchModal, RelationshipsPage
19. **Fase 1C**: campaignToStrategy verplaatst, collections naar KnowledgeContext, dead imports verwijderd uit App.tsx
20. **Fase 1D**: Product catalogs verplaatst naar `src/lib/catalogs/` (research-bundles, strategy-tools), types gecentraliseerd (UnlockableTool, BrandAssetOption, ResearchBundle)
21. **Orphaned files verwijderd**: mock-activities, mock-bundles, mock-decision-analysis, mock-products, renderInProgressView_NEW, integrate.py, VISUAL_GUIDE.txt
22. **Fase 2 (TS errors 683 → 0)**: Persona flat accessors, mock data sync, protected-components fix, CalculatedAssetStatus type, React 19 RefObject nullability, module-not-found fixes, function signature fixes, type annotations
23. **Better Auth Fase A**: Login/register/session setup — betterAuth() met prismaAdapter, AuthGate wrapper, AuthPage UI, Session/Account/Verification tabellen, 0 TS errors
24. **Better Auth Fase B**: Organization plugin — access control (4 rollen), schema merge (enum→String), activeOrganizationId op Session, organizationClient() plugin, 0 TS errors
25. **Seed fix**: Account records voor seed users (scrypt hashed passwords), role/status lowercase, session/account/verification cleanup bij seed reset
26. **AUTH-06 Session-based workspace**: useWorkspace() hook, requireWorkspace() server helper, workspace-resolver.ts, alle 7 contexts + API routes gemigreerd van env var naar sessie, AuthGate auto-sets active organization
27. **Better Auth Fase C**: OrganizationSwitcher (org/workspace dropdown), workspace switching (cookie-based), invite flow (send/accept met role+seat validatie), workspace creation (agencies only), TeamManagementPage op echte API data, 6 nieuwe API routes
28. **R0.1 Schema Extension**: 6 nieuwe modellen (ProductPersona, MarketInsight, InsightSourceUrl, AlignmentScan, ModuleScore, AlignmentIssue) + 15 nieuwe enums + 16 uitgebreide enums + veld-extensies op 9 bestaande modellen, single db push vanuit IG Fase 1B-8
29. **R0.2 Seed Data Extension**: demo data voor Fase 5/6/8 nieuwe tabellen (3 products, 6 product-persona links, 5 knowledge resources, 7 market insights, 1 alignment scan met 6 module scores en 4 issues) + uitgebreide velden op bestaande records (FocusArea.color, Milestone.completedAt)
30. **R0.3 API Endpoints**: `/api/insights` (8 endpoints: CRUD + stats + sources), `/api/alignment` (10 endpoints: overview + scan + issues + modules + history + dismiss + 2 stubs), `/api/products/:id/personas` (3 endpoints: GET + POST + DELETE), `/api/knowledge` uitbreidingen (5 endpoints: featured + PATCH + favorite/archive/featured toggles). Alle met workspace isolatie, Zod validatie, curl-getest. `NEXT_PUBLIC_WORKSPACE_ID` in .env.local gesynced met seed workspace.
31. **R0.4 API Adapters + Context Providers**: MarketInsightsContext (TanStack Query, insightKeys, filter state, 5 CRUD mutations + source mutations), BrandAlignmentContext (TanStack Query, alignmentKeys, scan polling met refetchInterval, 8 hooks + 2 mutations), Knowledge uitbreidingen (fetchFeaturedResources, toggleFavorite/Archive/Featured, useFeaturedResources + optimistic update, useToggleFavorite/Archive/Featured), Products uitbreidingen (fetchProductPersonas, linkPersona, unlinkPersona, useProductPersonas, useLinkPersona, useUnlinkPersona). Types: `market-insight.ts` (6 enums, 9 interfaces), `brand-alignment.ts` (4 enums, 13 interfaces). Providers geregistreerd in AppProviders tree.
32. **R0.5 Zustand Stores**: `useMarketInsightsStore` (filters, add modal, AI research state), `useBrandAlignmentStore` (scan state, issue filters, fix modal), `useKnowledgeLibraryStore` (view mode, filters, add modal). Alle met resetFilters(), selectors, modal-reset-on-close patroon.
33. **R0.6 UI Wiring**: Brand Alignment page (BrandAlignmentPage + ModuleScoreCard + AlignmentIssueCard + ScanProgressModal), MarketInsightsPage, sidebar registratie (trends + brand-alignment al aanwezig). KnowledgeLibrary uitgebreid (featured carousel via useFeaturedResources, API-backed favorites via useToggleFavorite, archive toggle via useToggleArchive, viewMode sync met Zustand store). ProductsServices uitgebreid (PersonaTags sub-component met useProductPersonas + useUnlinkPersona, source badge MANUAL/URL/PDF/UPLOAD). TypeScript 0 errors.
34. **R0.7 Shared UI Primitives**: 11 componenten in `src/components/shared/`: Button (5 varianten: primary/secondary/cta/danger/ghost, 3 sizes, icon, isLoading), Badge (6 varianten: default/success/warning/danger/info/teal, dot, icon), Input (label, icon, error), Select (native, allowClear, placeholder), SearchInput (300ms debounced, clear), Modal (focus trap, 4 sizes, Escape close, overlay click, body scroll lock), Card (compound: Header/Body/Footer, hoverable, padding variants), EmptyState (icon, title, description, action), Skeleton (5 varianten: base/Card/Text/Avatar/Badge), StatCard (label, value, icon, trend), ProgressBar (5 kleuren, 2 sizes, showLabel). R0.6 views gemigreerd naar primitives: MarketInsightsPage (Button/Badge/SearchInput/Select/StatCard/EmptyState/SkeletonCard), BrandAlignmentPage (Button/Badge/Select/EmptyState/Modal), InsightDetailModal (Modal/Button/Badge/ProgressBar/Skeleton), ScanProgressModal (Modal/ProgressBar). Top 3 bestaande componenten gemigreerd: InsightCard (Badge/Card/ProgressBar), AlignmentIssueCard (Badge/Button/Card), ModuleScoreCard (Card/ProgressBar). Verwijderd: ui/badge + ui/dialog + COMPONENTS.button/card/emptyState/progressBar imports uit gemigreerde bestanden. TypeScript 0 errors.
35. **R0.8 AI Integration Foundation**: openai-client (singleton, retry met exponential backoff, 3 completion methods: chat/streaming/structured JSON), rate-limiter (in-memory sliding window, 3 tiers FREE 20/min PRO 60/min AGENCY 120/min, daily limits), brand-context aggregator (5 Prisma models: BrandAsset/Persona/Product/MarketInsight/Workspace, 5 min cache, auto-invalidation), prompt-templates (SYSTEM_BASE brand strategist persona, ANALYSIS/STRUCTURED instructions, message builders: buildSystemMessage/buildAnalysisMessages/buildStructuredMessages/buildChatMessages), streaming (SSE createStreamingResponse/parseSSEStream/streamToString), middleware (withAi: auth + rate limit + brand context composable pipeline), hooks (useAiStream met abort support, useAiMutation met timeout), /api/ai/health (GET, config check), /api/ai/completion (POST, streaming + JSON, brand context toggle). Barrel export in index.ts. .env.local + .env.example uitgebreid met OPENAI_API_KEY/ANTHROPIC_API_KEY/BRANDDOCK_AI_MODEL. TypeScript 0 errors, health endpoint curl-getest.
36. **R0.9 Brand Foundation Refactor**: 11 componenten (5 in brand-foundation/ + 6 in brand-assets/). Referentie-implementatie patroon: Page→Header+Stats+Filters+Grid+Detail+Create. BrandFoundationPage orchestrator, BrandFoundationHeader (titel+badge+CTA), BrandFoundationStats (4 StatCards), BrandAssetFilters (search+category+status via Zustand), BrandAssetGrid (3-col responsive, loading/empty states), BrandAssetCard (Card+ProgressBar+validation icons), BrandAssetDetailPanel (Modal detail), BrandAssetCreateModal (form+POST), AssetStatusBadge, CategoryBadge, ValidationBreakdown. Nieuwe adapter: mock-to-meta-adapter.ts (BrandAsset→BrandAssetWithMeta reverse mapping). Zustand store uitgebreid: selectedAssetId voor detail panel. Sidebar mapping: brand→BrandFoundationPage (was BrandAssetsViewSimple). Pattern compliance: 9.5/11 (shared primitives ✅, context hooks ✅, Zustand ✅, Lucide ✅, TypeScript strict ✅, loading/empty ✅, responsive ✅, composition ✅; design tokens ⚠️ hardcoded colors, error boundary ⚠️ ontbreekt). TypeScript 0 errors, runtime getest: 13 assets, filters, navigatie.

37. **S1 Fase 0: Schema + Seed** — AIBrandAnalysisSession uitgebreid (personaId, persona relatie via "BrandAIAnalysis", lastUpdatedAt), Persona model uitgebreid (brandAnalysisSessions relatie), seed: 3 asset content updates (social-relevancy, brand-tone-voice, brand-promise), SWOT framework voor brand-promise, 3 extra asset versions (initial version), demo AI session uitgebreid (10 messages, 125% progress, rijker reportData met icons + 47 data points + 12 sources), TypeScript 0 errors
38. **S1 Brand Asset Detail (1C) — Sessie A**: BrandAssetDetailPage orchestrator + 13 sub-componenten (AssetDetailHeader, AssetOverflowMenu, ContentEditorSection, ContentEditMode, FrameworkSection, FrameworkRenderer, ESGFramework, GoldenCircleFramework, SWOTFramework, ResearchMethodsSection, ResearchMethodCard, VersionHistoryTimeline, DeleteAssetDialog). 9 API endpoints (`/api/brand-assets/:id` GET+DELETE, `/content` PATCH, `/status` PATCH, `/lock` PATCH, `/duplicate` POST, `/regenerate` POST, `/versions` GET, `/framework` PATCH). Zustand useBrandAssetDetailStore (editing/lock/framework collapse). 8 TanStack Query hooks. Validation % gewogen berekening (AI_EXPLORATION 0.15, WORKSHOP 0.30, INTERVIEWS 0.25, QUESTIONNAIRE 0.30). Framework renderers (ESG/GoldenCircle/SWOT). TypeScript 0 errors.

39. **S1 AI Brand Analysis (1B) — Sessie B**: AIBrandAnalysisPage orchestrator (chat vs report view) + 11 chat componenten (ChatInterface herbruikbaar, ChatBubble 3 varianten, MessageList auto-scroll, InputArea auto-resize+Enter submit, TypingIndicator pulsing dots, OverflowProgressBar gradient >100%, NavigationButtons 3 states, AllAnsweredBanner, GenerateReportButton gradient, AnalysisPageHeader status badge) + 8 report componenten (ReportView orchestrator, SuccessBanner metadata, ExportToolbar lock+raw export, ExecutiveSummary, FindingCard 5 kleur/icoon combos, FindingCardsGrid responsive, RecommendationItem nummer gradient+priority badge, RecommendationsList). 8 API endpoints (`/api/brand-assets/:id/ai-analysis` POST start + `/:sessionId` GET + `/answer` POST + `/complete` POST + `/generate-report` POST + `/report` GET + `/report/raw` GET + `/lock` PATCH). AI prompt templates (`src/lib/ai/prompts/brand-analysis.ts`: BRAND_ANALYSIS_SYSTEM_PROMPT, buildAnalysisQuestionPrompt, buildFeedbackPrompt, buildReportPrompt). Zustand store (`useAIAnalysisStore`: session/messages/typing/report/lock). TanStack Query hooks (7: useAIAnalysisSession, useStartAnalysis, useSendAnswer, useCompleteAnalysis, useGenerateReport, useAIAnalysisReport polling 2s, useToggleLock). API fetch functies (`ai-analysis.api.ts`). Types uitgebreid (`ai-analysis.ts`: 11 interfaces, FindingKey union). Routing: `ai-brand-analysis` case in App.tsx. TypeScript 0 Sessie B errors.

40. **S1 Fase 2: Integratie** — Navigatie flow: Brand Foundation → Asset Detail → AI Analysis → Report → terug. BrandAssetCard klik → `brand-asset-detail`. ResearchMethodCard AI_EXPLORATION klik → `ai-brand-analysis` (clickable in alle statussen). AI Analysis breadcrumb "← Back to Asset" → `brand-asset-detail`. Asset Detail breadcrumb "← Back to Your Brand" → `brand`. AI completion PATCH: research method AI_EXPLORATION → COMPLETED + validation % update. Cache invalidatie: `brandAssetKeys.all` + `brand-asset-detail` na completion. TypeScript 0 errors.

41. **S2a Fase 0: Workshop Schema + Seed** — 10 nieuwe modellen (Workshop, WorkshopBundle, WorkshopStep, WorkshopFinding, WorkshopRecommendation, WorkshopParticipant, WorkshopNote, WorkshopPhoto, WorkshopObjective, WorkshopAgendaItem), 1 enum (WorkshopStatus: TO_BUY/PURCHASED/SCHEDULED/IN_PROGRESS/COMPLETED/CANCELLED), BrandAsset+Workspace relatie-extensies. Seed: 3 bundles (Starter €1250/Professional €1350/Complete €1400), 1 completed workshop (8 deelnemers, 6 steps, 5 findings, 4 recommendations, 3 notes, 4 photos, 4 objectives, 10 agenda items, Golden Circle canvas), 1 scheduled workshop, WORKSHOP research method → COMPLETED. Constants: WORKSHOP_STEPS_TEMPLATE (6), pricing (BASE €1200, FACILITATOR €350, ASSET €50). TypeScript 0 errors.

42. **S2a Purchase Flow (SCR-04c) — Sessie A**: WorkshopPurchasePage orchestrator (2-kolom layout) + 9 sub-componenten (WorkshopPackageInfo, AssetSelectionToggle bundles↔individual, BundleList, BundleCard radio-select met strikethrough/savings, IndividualAssetGrid, IndividualAssetCard checkbox, WorkshopOptions stepper+facilitator, PurchaseSummary sticky sidebar, DashboardImpactModal before/after). 4 API endpoints (/api/brand-assets/:id/workshops GET+bundles GET+purchase POST+preview-impact POST). Zustand useWorkshopStore (purchase state: selectionMode/selectedBundleId/selectedAssetIds/workshopCount/hasFacilitator/totalPrice). 4 TanStack Query hooks. TypeScript 0 errors.

43. **S2a Session + Results (SCR-04d + SCR-04e) — Sessie B**: WorkshopSessionPage orchestrator + 9 session componenten (WorkshopSessionHeader, WorkshopCardList, WorkshopCard, WorkshopToolbar timer/bookmark/complete, StepNavigation 6 pills, StepContent, ResponseCapture, WorkshopProgressBar, FacilitatorTips amber). WorkshopCompletePage orchestrator + 15 results componenten (WorkshopNavigation, CompleteBanner 4 stats, ResultsTabs 5-tab, OverviewTab, AIReportSection, KeyFindingsCard 5 findings, RecommendationsCard 4 recs, CanvasTab, CanvasFrameworkRenderer Golden Circle, WorkshopDetailsTab, ParticipantsGrid 2×4, AgendaTimeline inklapbaar, NotesTab, NoteCard, GalleryTab). 12 API endpoints (/api/workshops/:id GET+start+steps+timer+bookmark+complete+report+canvas+notes+report-raw+generate-report). AI prompt template (workshop-report.ts). Zustand store uitgebreid (session+results state). 10 TanStack Query hooks. Timer hook (telt op, 30s sync). Workshop completion cascade (WORKSHOP method→COMPLETED, validation % gewicht 0.30). TypeScript 0 errors.

44. **S2b Fase 0: Brandstyle + Interviews Schema + Seed** — Schema al aanwezig: 5 modellen (BrandStyleguide, StyleguideColor, Interview, InterviewQuestion, InterviewQuestionTemplate), 7 enums (StyleguideStatus, StyleguideSource, AnalysisStatus, ColorCategory, InterviewStatus, InterviewQuestionType + BrandstyleAnalysisStatus). InterviewStatus uitgebreid met DRAFT, IN_PROGRESS, APPROVED, CANCELLED. Interview model uitgebreid met lockedById/lockedBy relatie (InterviewLocker). Seed bevestigd: 1 complete styleguide (9 kleuren, logo variaties, Inter font, type scale, tone of voice, imagery, alle savedForAi=true), 20 interview templates (5 categorieën), 3 interviews (completed+scheduled+draft), INTERVIEWS method → IN_PROGRESS. TypeScript 0 errors.

45. **S2b Brandstyle Analyzer + Styleguide — Sessie A**: BrandstyleAnalyzerPage (input tabs URL/PDF, processing 5-stap checklist) + BrandStyleguidePage (5-tab resultaat). 6 analyzer componenten (BrandstyleAnalyzerPage, WebsiteUrlInput, PdfUploadInput, ExtractionCapabilities, HowItWorks, ProcessingProgress). 10 styleguide componenten (BrandStyleguidePage, StyleguideHeader, StyleguideTabNav, LogoSection, ColorsSection, ColorDetailModal, TypographySection, ToneOfVoiceSection, ImagerySection, AiContentBanner). 20 API endpoints (11 route files: styleguide CRUD, analyze URL/PDF, polling, logo/colors/typography/tone/imagery sections, export-pdf stub, ai-context, save-for-ai). color-utils.ts (hex→RGB/HSL/CMYK, WCAG contrast). Zustand useBrandstyleStore (analysis state, activeTab, color modal). TanStack Query hooks (10: useStyleguide, useAnalysisStatus polling, useAiContext, useAnalyzeUrl/Pdf, useUpdateSection, useSaveForAi, useAddColor, useDeleteColor, useExportPdf). Types: brandstyle.types.ts (16 interfaces). API: brandstyle.api.ts (20 fetch functies). Routing: brandstyle→BrandstyleAnalyzerPage, brandstyle-guide→BrandStyleguidePage. TypeScript 0 errors.

46. **S2b Interviews + Golden Circle — Sessie B**: InterviewsPage orchestrator (overview+wizard switch). 4 overview componenten (InterviewsHeader, InterviewStatusCounters 4 statussen, InterviewCard lock/status/contact/overflow). 7 wizard componenten (InterviewWizard orchestrator, WizardStepper 5-stap, ContactStep form, ScheduleStep form, QuestionsStep asset select+questions, AddQuestionModal 5 types, TemplatePanelSlideout accordion categories, ConductStep progress+navigation+answer types, ReviewStep stats+review+approve). 12 API endpoints (/api/brand-assets/:id/interviews CRUD, questions CRUD, complete, approve, templates). GoldenCirclePage orchestrator + 4 componenten (GoldenCircleHeader lock toggle, GoldenCircleCanvas 3 ringen WHY/HOW/WHAT, GoldenCircleEditModal, GoldenCircleHistory timeline). 4 Golden Circle API endpoints (GET+PATCH+lock+history). Zustand stores (useInterviewStore wizard state, useGoldenCircleStore editing+lock). TanStack Query hooks (13 interview + 4 golden circle). interview.api.ts (12 functies), golden-circle.api.ts (4 functies). Types: interview.types.ts, golden-circle.types.ts. Routing: interviews→InterviewsPage, golden-circle→GoldenCirclePage. TypeScript 0 errors.

47. **S2b Fase 2: Integratie** — Navigatie flows: ResearchMethodCard INTERVIEWS klik→interviews page, WORKSHOP klik→workshop-purchase (via BrandAssetDetailPage props). FrameworkSection Golden Circle header "Open in Editor"→golden-circle page. Workshop Results CanvasTab "Open in Golden Circle"→golden-circle page. Interview approve cascade: alle APPROVED→INTERVIEWS method COMPLETED (gewicht 0.25), artifactsCount update, brand-assets cache invalidatie. Save for AI: useSaveForAi hook + AiContentBanner per sectie, GET /api/brandstyle/ai-context retourneert alle saved secties. Sidebar brandstyle→analyzer→auto-navigate guide bij COMPLETE. Breadcrumbs: interviews/golden-circle "← Back to Asset"→brand-asset-detail. TypeScript 0 errors.

48. **S3a Fase 0: Business Strategy Schema + Seed** — Schema al aanwezig: 5 modellen (BusinessStrategy, Objective, KeyResult, FocusArea, Milestone), 7 enums (StrategyType, StrategyStatus, ObjectiveStatus, KeyResultStatus, MilestoneStatus, MetricType, Priority), 2 join tables (CampaignStrategy, CampaignObjective), Workspace extensie. Seed refactored met vaste IDs (DEMO_WORKSPACE_ID, DEMO_USER_ID, DEMO_ORG_ID). .env.local NEXT_PUBLIC_WORKSPACE_ID gesynced. Seed: 3 strategieën (Growth 65% met 5 obj + 15 KRs + 5 focus areas + 4 milestones, Product Launch 30% met 2 obj + 3 KRs, Brand Building 42%). TypeScript 0 errors.

49. **S3a Sessie B: Business Strategy Detail** — StrategyDetailPage orchestrator (back nav, header met type/status badge, overflow menu archive/delete) + StrategyProgressSection (big percentage + multi-segment progress bar + mini stats) + StrategicContextSection (inline edit vision/rationale/key assumptions) + ObjectiveCard (OKR metrics met progress bar, priority/status badges, uitklapbare key results) + KeyResultItemComponent (status toggle ON_TRACK→COMPLETE→BEHIND cycle) + AddObjectiveModal (title, focus area, priority/metric type selectors, repeatable key results) + FocusAreaCards (responsive grid met icon/color, inline add) + LinkedCampaignsSection (stub met EmptyState) + MilestoneTimeline (horizontaal Q1-Q4, tooltips, status dots) + AddMilestoneModal (auto quarter berekening). Prerequisite files: types + constants + API client + store + hooks (21 TanStack Query hooks). Routing: strategy-detail→StrategyDetailPage. TypeScript 0 errors.

50. **S3a Sessie A: Business Strategy Overview + API** — 16 API route files (23 endpoints) onder `/api/strategies/` (CRUD, stats, objectives, key results, milestones, focus areas, archive, context, reorder, recalculate, campaign stubs). 4 overview componenten (BusinessStrategyPage orchestrator met header+stats+grid+create modal, SummaryStats 4 StatCards, StrategyCard met multi-segment progress bar + focus area tags + status badge, CreateStrategyModal met 2x3 type grid + dates + focus areas). App.tsx routing: business-strategy→BusinessStrategyPage (was ComingSoonPage), strategy-detail navigatie via onNavigateToDetail. TypeScript 0 errors.

51. **S3a Fase 2: Business Strategy Integratie** — Navigatie: StrategyCard→detail (store.setSelectedStrategyId + setActiveSection), detail "← Back"→overview, sidebar mapping (Target icon, 'business-strategy'). Modal flows: CreateStrategyModal navigeert optioneel naar detail na create (data.strategy.id), AddObjectiveModal/AddMilestoneModal sluiten + invalideren via hooks. Recalculate trigger: useUpdateObjective + useDeleteObjective roepen automatisch POST /recalculate aan in onSuccess → invalideren detail+list+stats. KR status toggle: cycle ON_TRACK→COMPLETE→BEHIND via useUpdateKeyResult. Archive: header menu toggle ACTIVE↔ARCHIVED. Context inline edit: vision/rationale/assumptions via useUpdateContext. TypeScript 0 errors.

52. **S3b Fase 0: Personas Schema + Seed** — Schema al aanwezig: Persona model (20+ velden: demographics, psychographics, strategic, lock), 6 modellen (PersonaResearchMethod, AIPersonaAnalysisSession, AIPersonaAnalysisMessage, PersonaChatSession, PersonaChatMessage, PersonaChatInsight), 5 enums (PersonaAvatarSource, PersonaResearchMethodType, AIPersonaAnalysisStatus, PersonaChatMode, ChatRole), User+Workspace relaties. Seed bijgewerkt: 3 personas (Sarah Chen "The Ambitious Startup Founder" / Marcus Thompson "The Enterprise Marketing Director" / Lisa Müller "The Creative UX Designer") met volledige demographics+psychographics per prompt spec, 12 research methods (Sarah+Marcus AI_EXPLORATION COMPLETED, Lisa alles AVAILABLE), 2 AI analysis sessions (Sarah 8 msgs + Marcus 6 msgs, beide COMPLETED met 4-dimensie insightsData). TypeScript 0 errors.

53. **S3b Sessie A: Personas Overview + Create + API + State** — PersonasPage + PersonaStatsCards + PersonaSearchFilter + PersonaCard + PersonaConfidenceBadge + WhatArePersonasPanel (6 overview). CreatePersonaPage + PersonaFormTabs + OverviewTab + PsychographicsTab + BackgroundTab + PersonaImageGenerator + RepeatableListInput (7 create). 18 API route files (21+ endpoints: CRUD + lock + avatar + duplicate + research-methods + chat 3 + AI analysis 4 + stubs). 3 API client files (personas.api.ts 12 functies, persona-chat.api.ts 3 functies, persona-analysis.api.ts 4 functies). 4 Zustand stores (usePersonasOverviewStore, usePersonaDetailStore, usePersonaChatStore, useAIPersonaAnalysisStore). 17 TanStack Query hooks + personaKeys. Types + constants (5 files). Routing: personas→PersonasPage, persona-create→CreatePersonaPage. TypeScript 0 errors.

54. **S3b Sessie B: Personas Detail + Chat + AI Analysis** — PersonaDetailPage + 10 detail componenten (PersonaDetailHeader, PersonaActionBar, DemographicsSection 6 velden met inline edit, PsychographicsSection tag input, GoalsMotivationsCards 3 kaarten met RepeatableListInput, BehaviorsSection, StrategicImplicationsSection met AI generate, ResearchMethodsSection, ResearchMethodCard 4 statussen, ImpactBadge). ChatWithPersonaModal + 4 chat componenten (PersonaChatInterface auto-scroll+typing indicator, PersonaChatBubble user/assistant variants, PersonaChatInsightsTab, PersonaChatInput Enter-to-send). AIPersonaAnalysisPage + 4 analysis componenten (PersonaAnalysisChatInterface Bot icon, PersonaAnalysisProgressBar 4 step dots, PersonaAnalysisComplete success card+dimension grid, DimensionInsightCard 4 kleur/icoon combos). Routing: persona-detail→PersonaDetailPage, persona-ai-analysis→AIPersonaAnalysisPage. TypeScript 0 errors.

55. **S3b Fase 2: Personas Integratie** — Navigatie flows (overview→create→detail, detail→AI analysis→back, chat modal open/close). PersonaCard klik→detail (store.setSelectedPersonaId + setActiveSection). Create→detail navigatie. Research method cascade (AI_EXPLORATION 0.15 gewicht, useCompleteAnalysis invalideert detail+list). Lock/unlock toggle (PATCH lock, edit buttons disabled). Inline editing alle secties (DemographicsSection per-field blur, PsychographicsSection tag add/remove, GoalsMotivationsCards RepeatableListInput, BehaviorsSection, StrategicImplicationsSection textarea). Duplicate button toegevoegd (Copy icon, navigeert terug na duplicatie). Stub toast voor non-AI research methods (INTERVIEWS/QUESTIONNAIRE/USER_TESTING). AI analysis store reset bij personaId wijziging (voorkomt stale state). Chat store reset bij modal open (nieuw session per persona). Dashboard leest persona count via PersonasContext (bestaande integratie). Sidebar mapping: 'personas'→PersonasPage in Knowledge sectie. 0 TS errors.

56. **S4 Fase 0: Products + Market Insights Schema + Seed** — Product model herstructureerd: pricingAmount/pricingCurrency → pricingDetails (String? @db.Text), source String → ProductSource enum, status (ProductStatus) toegevoegd, features/benefits/useCases Json → String[], categoryIcon + analysisData toegevoegd, specifications/sourceFileName/processingStatus/processingData verwijderd, @@index([status]) toegevoegd. ProductPersona vereenvoudigd: composite @@id([productId, personaId]), id/relevanceNote/createdAt verwijderd. ProductStatus enum: ACTIVE → ANALYZED. Persona relatie: productPersonas → linkedProducts. Seed: 3 producten (Digital Platform Suite/Brand Strategy Consulting/Mobile App Framework) met S4 spec data + 3 persona links. 7 market insights bijgewerkt naar S4 spec (nieuwe slugs, beschrijvingen, aiResearchPrompt, useBrandContext, 8 source URLs). Bestaande routes/types/adapter bijgewerkt voor schema compatibiliteit. TypeScript 0 errors.

57. **S4 Sessie A: Products & Services — compleet** — ProductsOverviewPage + ProductCard (2 overview). ProductAnalyzerPage + UrlAnalyzerTab + PdfUploadTab + ManualEntryTab + WhatWeExtractGrid + AnalyzingProductModal (6 analyzer). ProductDetailPage + DescriptionCard + PricingModelCard + FeaturesSpecsSection + BenefitsSection + TargetAudienceSection + UseCasesSection + PersonaSelectorModal (8 detail). 10 API endpoints (products CRUD, analyze url/pdf stubs, link/unlink persona). Zustand useProductsStore (analyzerTab, processingModal, selectedProductId). 10 TanStack Query hooks + productKeys. Feature types (ProductWithMeta, ProductDetail, AnalyzeJobResponse). Constants (CATEGORY_ICONS, ANALYZE_STEPS, SOURCE_BADGES, STATUS_BADGES). Routing: products→ProductsOverviewPage, product-analyzer→ProductAnalyzerPage, product-detail→ProductDetailPage. TypeScript 0 errors.

58. **S4 Sessie B: Market Insights — compleet** — MarketInsightsPage + InsightStatsCards + InsightSearchFilter + InsightCard + InsightImpactBadge + ScopeTag + TimeframeBadge + RelevanceScoreBar (8 overview). AddInsightModal + AiResearchTab + FocusAreasCheckboxes + TimeframeRadioCards + BrandContextToggle + ManualEntryTab + RelevanceSlider + ImportDatabaseTab + ProviderCard (9 add modal). InsightDetailPage + RelevanceScoreCard + AddedDateCard + IndustriesTagsSection + SourcesSection + HowToUseSection + DeleteConfirmModal (7 detail). 12 API endpoints (CRUD + stats + sources + ai-research + categories + providers). Zustand useMarketInsightsStore (re-export). 10 TanStack Query hooks + insightKeys. Feature types (AiResearchBody, ImportProvider). Constants (IMPACT_BADGE_COLORS, CATEGORY_COLORS, TIMEFRAME_BADGES, IMPORT_PROVIDERS). Routing: trends→MarketInsightsPage, insight-detail→InsightDetailPage. TypeScript 0 errors.

59. **S4 Fase 2: Products + Market Insights Integratie** — Products: analyzer flow fix (URL/PDF analyze → animation → POST create product → navigate to detail), edit mode (inline edit name/description/pricing → PATCH → refresh), persona koppeling bevestigd. Market Insights: edit mode (inline edit title/description/category/impact/timeframe/scope → PATCH → refresh), add modal flow bevestigd, 3 filters bevestigd, detail delete+sources bevestigd. Brand context stub endpoint (`/api/ai-context/brand-summary` GET — asset/persona/product counts). Dashboard bevestigd (6 context hooks voor counts). Sidebar mapping bevestigd. 0 TS errors.

60a. **S4 Sessie C: AI Product Analyzer + Detail Page Editing** — Fase A (Detail page bewerkbaar): FeaturesSpecsSection/BenefitsSection/UseCasesSection uitgebreid met `isEditing` + `onChange` props (add/remove UI), ProductDetailPage uitgebreid met array edit state + category Select dropdown + sourceUrl ExternalLink + wasEditingRef patroon + saveError state. Fase B (AI Backend): `src/lib/ai/gemini-client.ts` (shared Gemini singleton via `@google/genai`, structured JSON output, 60s AbortSignal timeout, JSON parse try/catch), `src/lib/ai/prompts/product-analysis.ts` (system + user prompts voor URL/PDF), `src/lib/products/url-scraper.ts` (cheerio scraper, SSRF bescherming private IPs, Content-Type validatie), `/api/products/analyze/url/route.ts` (scrape → Gemini → AnalyzeJobResponse), `/api/products/analyze/pdf/route.ts` (PDF parse → Gemini, 20MB + type validatie). Fase C (Frontend): types uitgebreid (pricingDetails/source/sourceUrl/status/analysisData), ProductAnalyzerPage stale closure fix (getState() + useCallback), AnalyzingProductModal geconsolideerde effects (onCompleteRef + setTimeout), cancel race condition fix in URL/PDF tabs, slug collision auto-suffix in POST route. Code review: 2 rondes, 4 subagents, 50 issues → 15 critical fixes. TypeScript 0 errors.

60. **S5 Fase 0: Knowledge Library + Research & Validation Schema + Seed** — KnowledgeResource uitgebreid (difficultyLevel enum, createdBy, indexes op type/category). 8 nieuwe modellen (ResearchBundle, BundleAsset, BundleMethod, ValidationPlan, ValidationPlanAsset, ValidationPlanMethod, ResearchStudy, BundlePurchase). 4 nieuwe enums (BundleCategory, ValidationPlanStatus, StudyStatus, PurchaseStatus). ResearchMethodType hergebruikt voor ValidationPlanMethod.methodType (identieke waarden). Workspace +2 relaties (validationPlans, researchStudies). Seed: 10 knowledge resources (2 featured), 10 research bundles (6 Foundation + 4 Specialized, 25 assets, 28 methods), 3 research studies (linked to personas/assets), 1 demo validation plan (2 assets, 3 methods, $180). TypeScript 0 errors.

61. **S5 Sessie A: Knowledge Library — compleet** — KnowledgeLibraryPage orchestrator + FeaturedResourcesCarousel + ResourceSearchFilter + ViewToggle + ResourceCardGrid + ResourceCardList (6 overview). ResourceTypeIcon + FavoriteButton + CardContextMenu (3 shared). AddResourceModal + ManualEntryTab + SmartImportTab + FileUploadTab + ResourceTypeSelector + RatingSlider (6 add modal). 10 API route files (13 endpoints: GET list + POST create, GET/PATCH/DELETE detail, toggle archive/favorite/featured, import-url stub, upload stub, featured, types, categories). knowledge-resources.api.ts (13 fetch functies). 11 TanStack Query hooks + resourceKeys (optimistic favorite toggle). Zustand useKnowledgeLibraryStore uitgebreid (selectedResourceType, importedMetadata, isImporting). Types: knowledge-library.types.ts (ResourceWithMeta, CreateResourceBody, ImportUrlResponse). Constants: RESOURCE_TYPE_ICONS (12 types), RESOURCE_CATEGORIES (9), DIFFICULTY_LEVELS (3). Routing: knowledge→KnowledgeLibraryPage (was KnowledgeLibrary). TypeScript 0 nieuwe errors.

62. **S5 Sessie B: Research & Validation — compleet** — ResearchHubPage + ResearchStatsCards + ValidationMethodsStatus + ResearchViewTabs + ActiveResearchSection + ValidationNeededSection + QuickInsightsSection + RecommendedActionsSection + SplitButton (9 hub). ResearchBundlesPage + BundleFilterTabs + BundleCard + BundleBadge + BundleDetailPage + BundleStatsBar + TrustSignals + FoundationPlansSection + SpecializedPlansSection (9 bundles). CustomValidationPage + ValuePropositions + AssetSelectorGrid + MethodCardList + MethodCard + ConfidenceBadge + QuantityStepper (7 custom). ValidationPlanSidebar + PricingSummary + PricingBreakdownRow (3 shared sidebar). 18 API route files (20 endpoints: stats + method-status + active + pending + validate stub + insights stub + recommended stub, bundles list + detail + select, available-assets + methods + plan CRUD + purchase + start, studies list + detail). research.api.ts (18 fetch functies). 15 TanStack Query hooks + researchKeys. Zustand useResearchStore (viewTab, bundleFilter, assets, methods, plan). pricing-calculator.ts (calculatePlanTotal, hasPaidMethods). Types: research.types.ts (14 interfaces). Constants: STATS_CONFIG, METHOD_STATUS, METHOD_PRICING, CONFIDENCE_BADGES, BUNDLE_BADGES. Routing: research/research-hub→ResearchHubPage, research-bundles→ResearchBundlesPage, research-bundle-detail→BundleDetailPage, research-custom/custom-validation→CustomValidationPage. App.tsx cleanup: removed old ResearchHubEnhanced/ResearchPlansPage/ValidationPlanLandingPage/BundleDetailsPage/selectedBundle state. TypeScript 0 errors.

63. **S5 Fase 2: Knowledge Library + Research & Validation Integratie** — Knowledge Library: featured carousel loads + scrolls, view toggle persistent in store, favorite optimistic toggle (red heart → PATCH → cache), context menu Download (window.open(url)), Archive (PATCH toggle → verdwijnt uit lijst), Delete (hard delete), Open Resource links (target=_blank), url veld toegevoegd aan ResourceWithMeta + mapResource, add modal 3 tabs werken, search+filters debounced. Research: hub SplitButton dropdown (Custom/Browse), Resume stub (alert), Validate stub (alert), recommended actions navigeert, bundle detail select → BundlePurchase → navigate, custom validation asset/method selection + sidebar pricing + CTA switch (free/paid), pricing calculator verified ($0/$10/$80/$1200), all "← Back to Research Hub" links werken. Sidebar: knowledge→KnowledgeLibraryPage, research→ResearchHubPage. Dashboard: links naar Knowledge Library + Research bevestigd. TypeScript 0 errors.

64. **S6 Fase 0: Campaigns + Content Studio Schema + Seed** — Campaign model herstructureerd (title/slug/CampaignType enum/CampaignStatus enum, strategic fields: confidence/strategy/campaignGoalType/dates/AI strategy, quick fields: contentType/contentCategory/prompt/qualityScore, template fields: isSavedAsTemplate/templateName). 7 nieuwe modellen (CampaignKnowledgeAsset, Deliverable, CampaignTeamMember, ContentVersion, InsertedInsight, ImproveSuggestion, CampaignTemplate). 5 nieuwe enums (CampaignType: STRATEGIC/QUICK, CampaignStatus: ACTIVE/COMPLETED/ARCHIVED, DeliverableStatus: NOT_STARTED/IN_PROGRESS/COMPLETED, InsertFormat: INLINE/QUOTE/DATA_VIZ/AI_ADAPTED, SuggestionStatus: PENDING/APPLIED/DISMISSED/PREVIEWING). Workspace +campaignTemplates relatie. Seed: 6 campaigns (3 strategic: Spring Brand Refresh 87% confidence, Product Launch AI Assistant 92%, Q1 Thought Leadership completed + 3 quick: AI Trends Blog 8.5 quality, LinkedIn Product Update active, Welcome Email 7.8 quality), 12 knowledge assets, 13 deliverables (4 met generatedText + qualityMetrics + checklistItems), 3 content versions, 4 improve suggestions (2 PENDING, 1 APPLIED, 1 DISMISSED), 2 inserted insights (INLINE + QUOTE), 1 campaign template ("Brand Launch Template"). Bestaande campaigns API route + types + adapter bijgewerkt voor schema compatibiliteit (title→name legacy mapping). 73 tabellen, 24 enums. TypeScript 0 errors.

65. **S6 Sessie A: Campaigns Overview + Quick Content + Campaign Detail (Prompt 2)** — ActiveCampaignsPage orchestrator (header+stats+filter+grid/list+QuickContentModal) + 7 overview componenten (CampaignStatsCards 4 stats, CampaignFilterBar tabs+search+viewToggle, CampaignGrid 3-col, CampaignList table, StrategicCampaignCard confidence+progress, QuickContentCard quality+convert, CampaignOverflowMenu). QuickContentModal + 4 componenten (ContentTypeTabs 5 categories, ContentTypeGrid, ContentTypeCard selectable, PromptTextarea 500 chars+chips). CampaignDetailPage + ConfigureInputsTab + StrategyResultTab (4 sub-tabs) + DeliverablesTab + DeliverableRow. QuickContentDetailPage + ConvertBanner + ConvertToCampaignModal. Content Type Registry (23 types, 5 categories). 20 API endpoints (14 route files: campaigns CRUD+stats+archive, quick create+suggestions+convert, knowledge CRUD+coverage, deliverables CRUD, strategy GET+generate). campaigns.api.ts (20 fetch functies). 20+ TanStack Query hooks + campaignKeys. Zustand useCampaignStore (overview+quickModal+detail+convert). App.tsx routing: active-campaigns→ActiveCampaignsPage, campaign-detail→CampaignDetailPage, quick-content-detail→QuickContentDetailPage. TypeScript 0 errors.

66. **S6 Sessie B: Content Library + Campaign Wizard (Prompt 3)** — ContentLibraryPage orchestrator + 9 content library componenten (ContentStatsCards 4 stats, ContentFilterBar search+4 dropdowns, ContentGroupToggle, ContentViewToggle, FavoritesToggle, ContentCardGrid 3-col responsive, ContentCardList table view, ContentGroupHeader collapsible, QualityScoreBadge color-coded). CampaignWizardPage orchestrator + 7 wizard componenten (WizardStepper 5-step horizontal, SetupStep name+description+goal+dates, KnowledgeStep 4 categories+select all, StrategyStep generate+regenerate+edit, DeliverablesStep 4-tab+quantity stepper, ReviewStep 5 sections+timeline+template, CampaignSuccessModal). 14 API endpoints (content-library list+stats+favorite toggle, wizard knowledge+strategy+regenerate+strategy patch+deliverable-types+launch+estimate-timeline, templates list+create+detail+delete). 2 Zustand stores (useContentLibraryStore, useCampaignWizardStore). 2 type files (content-library.types.ts, campaign-wizard.types.ts). 3 helper libs (quality-colors.ts, group-by-campaign.ts, deliverable-types.ts 16 types in 4 categories). Hooks: 8 new (useContentLibrary, useContentLibraryStats, useToggleContentFavorite, useWizardKnowledge, useGenerateStrategy, useRegenerateStrategy, useLaunchCampaign, useEstimateTimeline). Routing: content-library→ContentLibraryPage, campaign-wizard→CampaignWizardPage. Also fixed 10 pre-existing Prompt 2 TS errors (ProgressBar green→emerald, EmptyState action JSX→object, CampaignListParams sortBy/sortOrder). TypeScript 0 errors.

67. **S6 Sessie C+D: Content Studio Layout + Left Panel + Canvas + Right Panel (Prompt 4+5)** — ContentStudioPage 3-column layout orchestrator + StudioHeader. Left panel: LeftPanel orchestrator + PromptSection + TypeSettingsPanel + TextSettingsPanel + ImageSettingsPanel + VideoSettingsPanel + CarouselSettingsPanel + AiModelSelector + KnowledgeContextPanel + GenerateButton (10 componenten). Canvas: CenterCanvas + TextEditor + ImageCanvas + VideoPlayer + CarouselEditor + SlideThumbnails (6 componenten). Right panel: RightPanel orchestrator + QualityScoreWidget + ImproveScoreButton + ImproveScorePanel + SuggestionCard + BulkApplyButton + ResearchInsightsSection + InsertResearchModal + InsertFormatCard + ContentChecklist + VersionHistory + ExportDropdown + PreviewMode + AutoSaveIndicator + StudioContextMenu (15 componenten). 14 API endpoints (13 route files: quality GET+refresh, improve GET+apply+dismiss+preview+apply-all, insights GET+insert, versions GET+POST+restore, export POST). studio.api.ts (18 fetch functies). studio.hooks.ts (18 TanStack Query hooks + studioKeys). useContentStudioStore Zustand (all studio state). src/types/studio.ts (complete studio types). 3 helper libs (quality-metrics.ts, export-formats.ts, tab-locking.ts). TypeScript 0 errors.

68. **S6 Fase 2: Campaigns Integratie (Prompt 6)** — Sidebar updates: Campaigns icon Target→Megaphone, label "Active Campaigns"→"Campaigns", Content Library link toegevoegd (Library icon). CampaignSuccessModal navigatie fix: "View Campaign" en "Create First Content" nu via useCampaignStore.setSelectedCampaignId() + onNavigate("campaign-detail"). Content Library→Studio navigatie: ContentCardGrid + ContentCardList onOpenInStudio signature uitgebreid (deliverableId + campaignId), ContentLibraryPage sets both IDs in store + navigeert naar content-studio. Header Quick Action: TopNavigationBar + Zap icon Quick Content button, onQuickContent prop, App.tsx wired to useCampaignStore.openQuickModal(). Global QuickContentModal: rendered at App level (na ActivityFeed) met onCreated→quick-content-detail navigatie. Cross-module navigatie: alle 6 routes verified in App.tsx (active-campaigns, campaign-detail, quick-content-detail, content-studio, content-library, campaign-wizard). TypeScript 0 errors.

69. **S7 Sessie B: Brand Alignment Scan + Fix Flow (Prompt 3)** — scanner.ts (8-step progressive scan met 2s delay per stap, in-memory progress tracking, random module scores, 3-4 random issues per scan). fix-generator.ts (3 fix options A/B/C: adjust source/adjust target/acknowledge, mock content per entity type, apply marks FIXED). 3 API updates: POST /api/alignment/scan nu RUNNING + background scan (was instant COMPLETED), GET /api/alignment/scan/:scanId retourneert ScanProgressResponse (progress/currentStep/completedSteps), fix-options en fix vervangen 501 stubs. 1 nieuw endpoint: POST /api/alignment/scan/:scanId/cancel. Types: StartScanResponse vereenvoudigd (scanId+status), ScanProgressResponse (8 velden), CancelScanResponse. API client: +3 functies (fetchScanProgress, cancelAlignmentScan, fetchFixOptions, applyFix). Context: useScanStatus→useScanProgress hernoemd, +4 hooks (useScanProgress polling 2s, useFixOptions, useApplyFix, useCancelScan). Store uitgebreid: isScanCompleteModalOpen, scanResultScore/Issues, selectedFixOption, openFixModal/closeFixModal/selectFixOption/openScanCompleteModal/closeScanCompleteModal. 8 UI componenten: AnalyzingScanModal (Shield icon+progress bar+ScanStepChecklist+cancel), ScanStepChecklist (8 stappen: done/spinning/pending), ScanCompleteModal (score+issues found), FixIssueModal (fix data loading+IssueSummaryBox+CurrentContentCompare+FixOptionsGroup+apply/dismiss), IssueSummaryBox (yellow alert), CurrentContentCompare (2-kolom grid), FixOptionsGroup (Sparkles header+3 FixOptionCards), FixOptionCard (radio card met preview). BrandAlignmentPage: ScanProgressModal→AnalyzingScanModal, stub Modal→FixIssueModal, +ScanCompleteModal. TypeScript 0 errors.

70. **S7 Fase 2: Brand Alignment Integratie (Prompt 4)** — Navigation helper: `src/lib/alignment/navigation.ts` met `getEntitySection()` (centraliseert entity type → sidebar section ID mapping, 9 entity types). IssueCard: lokale `getSourceRoute` vervangen door `getEntitySection` import. FixIssueModal: "Edit Manually" button toegevoegd (ExternalLink icon, navigeert naar source entity via `useAlignmentIssueDetail` + `getEntitySection`, sluit modal). Sidebar badge: `brand-alignment` nav item toont rode badge met openIssuesCount (bg-red-500 text-white rounded-full), via `useBrandAlignment()` hook. Routing bevestigd: brand-alignment→BrandAlignmentPage, ModuleScoreCard "View →" via MODULE_CONFIG routes, IssueCard "View Source" via getEntitySection. TypeScript 0 errors.

71. **S8 Dashboard & Global Components — compleet** — Prompt 1 (data layer): 16 API routes (9 dashboard + 5 notifications + 2 search), 3 hook files (use-dashboard.ts 9 hooks, use-notifications.ts 5 hooks, use-search.ts 2 hooks), 2 Zustand stores (useDashboardStore onboarding+quickStart, useShellStore notification panel+search modal). Prompt 2 (shell refactors): state centralization (searchOpen/activityOpen van App.tsx local state → useShellStore), WorkflowEnhancer/TopNavigationBar vereenvoudigd (props verwijderd, direct store access). Prompt 3 (dashboard UI): 7 dashboard componenten (DashboardPage orchestrator, DecisionReadiness weighted 5-module %, DashboardStatsCards 5 KPI cards, AttentionList dynamic Lucide icons, RecommendedAction gradient card, QuickAccess 3 action cards, ActiveCampaignsPreview progress bars). Dashboard helpers (thresholds.ts config+getters, readiness-calc.ts weighted scoring). Prompt 4 (onboarding+integration): OnboardingWizard 3-step modal (Welcome/How It Works/Get Started), QuickStartWidget 4-item persistent checklist, DASHBOARD_TOKENS in design-tokens.ts. App.tsx: Dashboard→DashboardPage, useShellStore integration. TypeScript 0 errors.

72. **AE: AI Exploration Generic System** — Universeel AI exploration systeem (S2 nieuw) met backend-driven config. ExplorationSession + ExplorationMessage Prisma modellen. 3 API routes (`/api/exploration/[itemType]/[itemId]/analyze` POST, `/sessions/[sessionId]/answer` POST, `/sessions/[sessionId]/complete` POST). Config-resolver met DB lookup → fallback → system defaults. Template engine (`{{brandContext}}`, `{{customKnowledge}}`, `{{itemName}}`). Multi-provider AI caller (Anthropic Claude Sonnet 4.6 + OpenAI). Item-type registry (persona, brand_asset). AIExplorationPage + 4 componenten (ChatInterface, DimensionCard, Report, Suggestions). Zustand useAIExplorationStore. TypeScript 0 errors.

73. **AE: AI Exploration Admin UI** — Settings → Administrator → AI Exploration Configuration. ExplorationConfig Prisma model (provider, model, temperature, maxTokens, systemPrompt, dimensions, feedbackPrompt, reportPrompt, fieldSuggestionsConfig, contextSources). CRUD API: `/api/admin/exploration-configs` GET+POST, `/[id]` GET+PUT+DELETE (5 endpoints). AdministratorTab (view switcher) + ConfigListView/ConfigDetailView (list/detail pattern, 4 tabs). TypeScript 0 errors.

74. **AE: Exploration Knowledge Library** — ExplorationKnowledgeItem Prisma model (title, content, category per config). CRUD API: `/api/admin/exploration-configs/[id]/knowledge` GET+POST, `/[itemId]` PUT+DELETE. KnowledgeTab (volwaardige tab in ConfigDetailView, TanStack Query CRUD, 6 categorieën). Custom knowledge wordt als `{{customKnowledge}}` geïnjecteerd in AI prompts via config-resolver + prompt-engine. TypeScript 0 errors.

75. **AE: Brand Asset AI Exploration Routing** — AIBrandAssetExplorationPage wrapper component. Navigatie via `brand-asset-ai-exploration` section ID + `selectedResearchOption='ai-exploration'` in App.tsx. Breadcrumb "← Terug naar asset" → brand-asset-detail. ResearchMethodCard AI_EXPLORATION klik → exploration page. TypeScript 0 errors.

76. **BAD: Brand Asset Detail 2-kolom Layout** — BrandAssetDetailPage refactored naar 2-kolom grid (md:grid-cols-12, 8/4 split) matching Persona structuur. Sidebar: QuickActionsCard (AI Exploration, Export PDF, Duplicate, Delete), CompletenessCard (completeness % ring), ValidationCard (research validation methods). TypeScript 0 errors.

77. **BAD: Purpose Kompas + Purpose Statement** — PurposeKompasSection component (Mens/Milieu/Maatschappij framework, vervangt ESG). PurposeStatementSection component (apart asset type voor purpose statements). Geïntegreerd in BrandAssetDetailPage via framework type detection. TypeScript 0 errors.

78. **BAD: Universal Versioning** — ResourceVersion Prisma model (polymorphic: entityType + entityId + data JSON). `/api/versions` GET endpoint. Vervangt per-module versie tracking. Werkt voor brand assets, personas, en toekomstige modules. TypeScript 0 errors.

79. **AE: AI Config UX Redesign** — Volledige UI-herontwerp van AI Exploration Configuration in Settings > Administrator. Van platte lijst + 741-regels ExplorationConfigEditor naar list/detail pattern met tabbed navigatie. 10 nieuwe bestanden: ConfigListView (gegroepeerde grid per item type met zoekfunctie), ConfigCard (model/dimensies/status info), ConfigDetailView (4-tab form: Algemeen/Dimensies/Prompts/Kennisbronnen), GeneralTab (targeting+AI model+context bronnen), DimensionsTab+DimensionCard (verbeterde dimensie-editor), PromptsTab+PromptEditor (variable chips+karakter teller), KnowledgeTab (gepromoveerd naar volwaardige tab), IconPicker (30 Lucide icons visuele selector). Verwijderd: ExplorationConfigEditor.tsx + KnowledgeLibrarySection.tsx. 16 bugs gefixt na 3 rondes code review (double delete, prompt error indicators, HelpCircle icon, NaN guard, key collisions, click-outside handler, cursor tracking, sticky footer, React key stability, temperature toFixed). TypeScript 0 errors.

80. **PW: Purpose Statement IDEO Purpose Wheel Verbetering** — PurposeWheelSection.tsx volledig herschreven op basis van IDEO Purpose Wheel framework. Impact Type: 5 visuele kaarten (klikbaar, toggle deselect, kleur-per-type). Mechanism: 15 outer wheel categorieën als selecteerbare pills (single-select) + vrij tekstveld. `mechanismCategory` veld toegevoegd aan `PurposeWheelFrameworkData`. Pressure Test: helper-tekst met 3 IDEO kernvragen. Purpose Score sectie verwijderd. AI Exploration config: 5 nieuwe dimensies (origin_belief, impact_exploration, mechanism, pressure_test, articulation), herziene system/feedback/report prompts in seed.ts, 6 field suggestions in rapport. Frontend dimension config gesynchroniseerd (brand-asset-exploration-config.ts + config-resolver.ts). Duplicate functionaliteit verwijderd uit alle modules: Brand Assets (AssetOverflowMenu, AssetQuickActionsCard, useBrandAssetDetail hook, brand-asset-detail.api), Personas (PersonaDetailPage, QuickActionsCard, hooks/index, personas.api), Interviews (InterviewsPage, InterviewCard, useInterviews hook, interview.api). TypeScript 0 nieuwe errors.

### ⚠️ TECHNISCHE SCHULD
- **Adapter pattern** — tijdelijk, componenten moeten op termijn direct DB-model gebruiken
- **mock-to-meta-adapter.ts** — reverse adapter (mock→API format) voor Brand Foundation. Verdwijnt wanneer context direct BrandAssetWithMeta levert.
- **BrandAssetsViewSimple.tsx** — behouden als backup, niet gerenderd. Verwijderen na S1 stabilisatie.
- **`as any` casts** — ✅ Opgeruimd (47 → 0 in src/). Nog 146 `: any` type annotations in 68 bestanden (parameters/variabelen) — toekomstige pass.
- **~~NEXT_PUBLIC_WORKSPACE_ID~~** — ✅ Volledig verwijderd uit code en .env bestanden.
- **~~Hardcoded Tailwind colors~~** — ✅ BrandFoundationHeader en BrandAssetCard gemigreerd naar design tokens.
- **~~Geen Error Boundary~~** — ✅ ErrorBoundary beschikbaar via shared barrel, top-level wrap in App.tsx.
- **S1 vs S2 AI systeem overlap** — Twee AI chat systemen voor brand assets (AIBrandAnalysisSession S1 + ExplorationSession S2). S1 kan op termijn deprecated worden wanneer S2 volledige feature parity heeft.
- **ExplorationConfig hardcoded fallbacks** — System defaults in config-resolver.ts. Op termijn alle configs via DB seed beheren. **13 van 13 configs nu in DB** — fallbacks alleen nog relevant voor nieuwe item types.
- **AI Exploration re-test na config wijziging** — Om opnieuw te testen na config-wijzigingen, moeten ExplorationSession + ExplorationMessage + BrandAssetResearchMethod (method: 'AI_EXPLORATION', status → 'AVAILABLE') gereset worden voor het betreffende asset. Alleen een nieuwe sessie pakt bijgewerkte config op.
- **Lock/unlock inconsistentie** — Brand assets lock endpoint is toggle (flipt !isLocked), terwijl alle andere endpoints `{ locked: boolean }` body accepteren. Harmoniseren naar body-based approach.

### 📋 ROADMAP (herzien 27 feb 2026)

**R0. Retroactieve Foundation ✅ VOLLEDIG**
- R0.1: ✅ Schema Extension — 58 tabellen, 6 nieuwe modellen, 15+16 enums, 9 model extensies
- R0.2: ✅ Seed Data Extension — demo data voor alle R0.1 modellen + uitgebreide velden
- R0.3: ✅ API Endpoints — /api/insights (8), /api/alignment (10), /api/products/:id/personas (3), /api/knowledge uitbreidingen (5), alle curl-getest
- R0.4: ✅ API Adapters + Context Providers — MarketInsightsContext, BrandAlignmentContext, Knowledge/Products uitbreidingen, TanStack Query hooks
- R0.5: ✅ Zustand Stores — useMarketInsightsStore, useBrandAlignmentStore, useKnowledgeLibraryStore
- R0.6: ✅ UI Wiring — BrandAlignmentPage, MarketInsightsPage, KnowledgeLibrary (featured/favorites/archive), ProductsServices (persona tags/source badge)
- R0.7: ✅ Shared UI Primitives: 11 componenten (Button, Badge, Input, Select, SearchInput, Modal, Card, EmptyState, Skeleton, StatCard, ProgressBar), R0.6 views gemigreerd (MarketInsightsPage, BrandAlignmentPage, InsightDetailModal, ScanProgressModal), top 3 bestaande componenten gemigreerd (InsightCard, AlignmentIssueCard, ModuleScoreCard)
- R0.8: ✅ AI Integration Foundation: openai-client (singleton, retry, streaming), rate limiter (3 tiers, in-memory), brand-context aggregator (5 modules, 5 min cache), prompt templates (SYSTEM_BASE, ANALYSIS, STRUCTURED), streaming hooks (useAiStream, useAiMutation), /api/ai/health + /api/ai/completion endpoints, AI middleware (rate limit + brand context)
- R0.9: ✅ Brand Foundation Refactor — 11 componenten (5 brand-foundation + 6 brand-assets), referentie-implementatie, shared primitives, mockToMeta adapter, Zustand selectedAssetId

**S1. Brand Asset Detail + AI Brand Analysis ✅ VOLLEDIG**
- S1.0: ✅ Schema + Seed — 4 modellen, 4 enums, BrandAsset extensies, 62 tabellen
- S1.A: ✅ Brand Asset Detail (1C) — 14 componenten, 9 endpoints, frameworks (ESG/GoldenCircle/SWOT), versie historie, gewogen validation %
- S1.B: ✅ AI Brand Analysis (1B) — 19 componenten (11 chat + 8 report), 8 endpoints, OpenAI integratie, herbruikbare ChatInterface, research method update
- S1.2: ✅ Integratie — navigatie flow (Foundation→Detail→AI Analysis→Report→terug), cache invalidatie, 0 TS errors

**S2a. Canvas Workshop ✅ VOLLEDIG**
- S2a.0: ✅ Schema + Seed — 10 modellen, 1 enum (WorkshopStatus), bundles + workshop seed
- S2a.A: ✅ Purchase Flow (SCR-04c) — 9 componenten, 4 endpoints, bundle/individual selection, pricing
- S2a.B: ✅ Session + Results (SCR-04d + SCR-04e) — 24 componenten, 12 endpoints, timer, AI rapport, canvas, notes

**S2b. Brandstyle + Interviews + Golden Circle ✅ VOLLEDIG**
- S2b.0: ✅ Schema + Seed — 5 modellen, 7 enums, styleguide+interviews+templates seed
- S2b.A: ✅ Brandstyle (SCR-06 + SCR-06a) — 16 componenten, 20 endpoints, AI processing, 5-tab styleguide, Save for AI
- S2b.B: ✅ Interviews (SCR-04f) + Golden Circle (1E) — 18 componenten, 16 endpoints, 5-step wizard, question templates, Golden Circle canvas editor
- S2b.2: ✅ Integratie — research method cascade (INTERVIEWS 0.25), Save for AI, navigatie flows, 0 TS errors

**S3a. Business Strategy ✅ VOLLEDIG**
- S3a.0: ✅ Schema + Seed — 5 modellen, 7 enums, 3 strategieën, vaste seed IDs
- S3a.A: ✅ Overview + API + State — 4 componenten, 23 endpoints, 21 hooks
- S3a.B: ✅ Detail — 10 componenten, OKR objectives, milestones timeline
- S3a.2: ✅ Integratie — navigatie, recalculate, modal flows, 0 TS errors

**S3b. Personas ✅ VOLLEDIG**
- S3b.0: ✅ Schema + Seed — Persona uitgebreid 20+ velden, 6 nieuwe modellen, 5 enums, 3 personas
- S3b.A: ✅ Overview + Create + API + State — 13 componenten, 21 endpoints, 17 hooks
- S3b.B: ✅ Detail + Chat + AI Analysis — 21 componenten, chat modal, 4-dimensie analysis
- S3b.2: ✅ Integratie — research cascade, lock, inline edit, duplicate, store resets, 0 TS errors

**S4. Products & Services + Market Insights ✅ VOLLEDIG**
- S4.0: ✅ Schema + Seed — Product model herstructureerd (ProductSource enum, ProductStatus met ANALYZED, String[] arrays, categoryIcon, analysisData, pricingDetails), ProductPersona composite key, 3 producten + 7 insights (S4 spec)
- S4.A: ✅ Products & Services — 16 componenten (2 overview + 6 analyzer + 8 detail), 12 API endpoints, Zustand store, 10 hooks, 3-tab analyzer (URL/PDF/Manual)
- S4.B: ✅ Market Insights — 24 componenten (8 overview + 9 add modal + 7 detail), 12 endpoints, 10 hooks
- S4.2: ✅ Integratie — analyzer flow (URL/PDF→create product→detail), edit mode products+insights, persona koppeling, delete confirm, brand context endpoint, 0 TS errors
- S4.3: ✅ AI Product Analyzer + Detail Edit — Gemini 3.1 Pro AI extractie (URL scrape + PDF parse → structured JSON), detail page bewerkbaar (features/benefits/useCases add/remove, category dropdown, sourceUrl display), gemini-client.ts (shared singleton, 60s timeout, JSON parse error handling), url-scraper.ts (SSRF bescherming), PDF file validatie (20MB, type check), stale closure fixes (getState pattern), cancel race condition handling, slug collision auto-suffix, wasEditingRef patroon, 0 TS errors
- S4.4: ✅ Market Insights Fully Functional — AI Research met Gemini 3.1 Pro (market-research.ts prompts, structured JSON output, brand context injectie, enum sanitization, Prisma $transaction callback), InsightCard overflow menu (View Details/Edit/Use in Campaign/Delete met stopPropagation), CTA wiring (Use in Campaign→active-campaigns, Generate Content→content-library via onNavigate), type/store cleanup (ongebruikte velden verwijderd, AiResearchJobResponse type fix), Import providers UX (Coming Soon disabled+Lock icon), ProviderCard security (noopener,noreferrer). 3 review rondes: stabiele delete mutation (inline useMutation i.p.v. parameterized hook), edit state sync (prevEditing ref), tag dedup, unieke slug generatie (Set + retry), server-side cache invalidatie, error feedback UI in AiResearchTab, 0 TS errors

**S5. Knowledge Library + Research & Validation ✅ VOLLEDIG**
- S5.0: ✅ Schema + Seed — KnowledgeResource uitgebreid (difficultyLevel, createdBy, indexes), 8 nieuwe modellen, 4 nieuwe enums, seed: 10 resources + 10 bundles + 3 studies + 1 plan
- S5.A: ✅ Knowledge Library — 15 componenten, 13 endpoints, 11 hooks, featured carousel + grid/list + add modal
- S5.B: ✅ Research & Validation — 28 componenten, 20 endpoints, 15 hooks, hub + bundles marketplace + custom builder
- S5.2: ✅ Integratie — all flows, pricing calculator, optimistic favorites, Open Resource links, Download stub, Resume/Validate stubs, 0 TS errors

**S6. Campaigns + Content Library + Content Studio ✅ VOLLEDIG**
- S6.0: ✅ Schema + Seed — Campaign herstructureerd, 7 nieuwe modellen, 5 enums, 78+ tabellen
- S6.A: ✅ Campaigns Overview + Quick Content + Campaign Detail (Prompt 2) — 22 componenten, 20 API endpoints (14 route files), 20+ hooks, Zustand store, content type registry
- S6.B: ✅ Content Library + Campaign Wizard (Prompt 3) — 18 componenten, 14 endpoints, 2 stores, 8 hooks, 3 helpers
- S6.C: ✅ Content Studio Layout + Left Panel + Center Canvas (Prompt 4) — 16 componenten (layout+header+left panel 10+canvas 6), Zustand store, types
- S6.D: ✅ Content Studio Right Panel (Prompt 5) — 15 componenten (quality+improve+research+versions+export+preview+checklist+autosave+context menu), 14 API endpoints (13 route files), 18 hooks, 3 helper libs (quality-metrics, export-formats, tab-locking), studio.api.ts (18 functies)
- S6.E: ✅ Integratie (Prompt 6) — Sidebar updates (Megaphone icon+Content Library link), CampaignSuccessModal navigation fix (store-based), Content Library→Studio navigation (deliverableId+campaignId via store), Header Quick Content button (Zap icon, global QuickContentModal), cross-module navigation verified, 0 TS errors

**S7. Brand Alignment ✅ VOLLEDIG**
- S7.0: Bestaand (R0.3/R0.6) — Schema (3 modellen, 4 enums), seed data, 10 API endpoints, BrandAlignmentContext (8 hooks), useBrandAlignmentStore, BrandAlignmentPage + 3 sub-componenten
- S7.A: Prompt 2 (Main Page refactor) — afzonderlijke Prompt 2 componenten (AlignmentScoreGauge, AlignmentStatsRow, ModuleAlignmentGrid, AlignmentIssuesSection, IssueFilters, IssueCard, SeverityBadge, IssueRecommendation, ScoreBar)
- S7.B: ✅ Scan + Fix Flow (Prompt 3) — scanner.ts (8-step progressive scan, in-memory progress tracking), fix-generator.ts (3 AI fix options A/B/C, mock content), 3 API updates (scan multi-step RUNNING, fix-options, fix apply) + 1 new endpoint (cancel scan), 4 new hooks (useScanProgress, useFixOptions, useApplyFix, useCancelScan), store uitgebreid (scanComplete modal, fix option selection), 8 UI componenten (AnalyzingScanModal, ScanStepChecklist, ScanCompleteModal, FixIssueModal, IssueSummaryBox, CurrentContentCompare, FixOptionsGroup, FixOptionCard), 0 TS errors
- S7.C: ✅ Integratie (Prompt 4) — navigation.ts helper (getEntitySection, 9 entity types), sidebar badge (red pill, openIssuesCount), FixIssueModal "Edit Manually" (navigeert naar source entity), IssueCard getSourceRoute→getEntitySection refactor, cross-module routing verified, 0 TS errors

**S8. Dashboard & Global Components ✅ VOLLEDIG**
- S8.1: ✅ Data Layer (Prompt 1) — 16 API routes (9 dashboard + 5 notifications + 2 search), 3 hook files (16 TanStack Query hooks), 2 Zustand stores (useDashboardStore, useShellStore)
- S8.2: ✅ Shell Refactors (Prompt 2) — State centralization (App.tsx local state → useShellStore), WorkflowEnhancer/TopNavigationBar simplified
- S8.3: ✅ Dashboard UI (Prompt 3) — 7 componenten (DashboardPage, DecisionReadiness, DashboardStatsCards, AttentionList, RecommendedAction, QuickAccess, ActiveCampaignsPreview), dashboard helpers (thresholds.ts, readiness-calc.ts)
- S8.4: ✅ Onboarding + Integration (Prompt 4) — OnboardingWizard (3-step modal), QuickStartWidget (4-item checklist), DASHBOARD_TOKENS, App.tsx routing update, 0 TS errors

**S9. Platform Modules — Settings + Help & Support ✅ VOLLEDIG (Tab 1)**
- S9.1: ✅ Database (Stap 1) — 8 enums, 10 models (UserProfile, UserPassword, EmailPreference, ConnectedAccount, Plan, Subscription, PaymentMethod, Invoice, NotificationPreference, AppearancePreference), 6 User + 3 Workspace relaties, seed data
- S9.2: ✅ API (Stap 2) — 36 Settings endpoints (30 route files: Account 11, Team 9, Billing 10, Notifications+Appearance 6)
- S9.3: ✅ State (Stap 3) — types/settings.ts (30+ types), useSettingsStore (Zustand), settings.ts (36 fetch functions), use-settings.ts (31 TanStack Query hooks + settingsKeys)
- S9.4: ✅ Settings UI (Stap 4) — 19 componenten: SettingsPage+SettingsSubNav layout, Account tab (8: ProfileForm, AvatarUpload, PasswordForm, EmailPreferences, ConnectedAccounts+Item, DangerZone), Team tab (9: TeamPlanHeader, TeamMembersTable+Row, RoleBadge, InviteMemberModal, PendingInvites+Item, RolePermissions)
- S9.5: ✅ Help UI (Stap 5) — 22 componenten: HelpPage orchestrator, HelpHeader, HelpSearchInput (debounced), QuickTags, QuickActionCards+Card, BrowseByTopic+TopicCard, VideoTutorials+Card, FaqAccordion+FaqItem+FaqFeedback, ContactSupport+ContactOptions+SubmitRequestForm, SystemStatus, FeatureRequests+FeatureRequestItemCard, PlatformRating, ResourceLinks, FloatingChatWidget
- S9.6: ✅ Integratie (Stap 6) — App.tsx routing (settings-* → SettingsPage with initialTab, help → HelpPage), FloatingChatWidget global, TeamPlanHeader "Upgrade Plan" → billing tab, help-article breadcrumb, 0 TS errors

**PLS. Pattern Library Sprint ✅ VOLLEDIG**
- PLS.1: ✅ Design Tokens — `src/lib/constants/design-tokens.ts` (MODULE_THEMES met gradients+icons per moduleKey, spacing/typography/sizing tokens)
- PLS.2: ✅ UI Primitives — `src/components/ui/layout.tsx` (PageShell, PageHeader, StatGrid, FilterBar, SectionCard, GradientBanner, DetailHeader, FavoriteButton, WizardStepper, SelectionCard, ContentSidebarLayout, IssueCard)
- PLS.3: ✅ PATTERNS.md — Project root referentiedocument: verplichte imports, verboden patronen, standaard paginastructuren (overview/detail/selectie/sidebar/issue), module keys met gradient mappings, design token samenvatting, checklist per pagina
- PLS.4: ✅ CLAUDE.md update — Verplicht-lees verwijzing naar PATTERNS.md bovenaan CLAUDE.md

**PSR. Persona Restyling & AI Features (feb 20-22, 2026)**
Visuele restyling van persona module op basis van Figma designs + nieuwe AI features.

Onderdelen:
- PSR.1: ✅ Persona Detail Restyling — Demographics gradient header, psychographics, goals/motivations/frustrations kaarten, behaviors, strategic implications header, research validation panel, persona cards, confidence ring, profile picture, accordion content. 17 fix-prompts uitgevoerd.
- PSR.2: ✅ AI Features — Strategic Implications AI generatie (echte API call), Persona Chat met Claude Sonnet 4 (dynamische context, 4 chat modes, insights tracking), Generate Photo button
- PSR.3: ✅ Persona Enrichment — 3 nieuwe secties: Preferred Channels, Quote/Bio, Buying Triggers/Decision Criteria. Tech Stack tags.
- PSR.4: ✅ Persona Knowledge Doorvoer — getPersonaContext() utility, persona-chat API met Claude, 5 losse prompts voor chat/content studio/campaign strategy/knowledge modal
- PSR.5: ✅ Layout Optimalisatie Fase 1 — Hero header (96×96 foto, naam, locatie, actions), 2-koloms grid (md:grid-cols-12, 8/4 split), 4 sidebar componenten (ProfileCompletenessCard, ResearchSidebarCard, QuickActionsCard, StrategicImplicationsSidebar), info tooltip i.p.v. "What are Personas" sectie
- PSR.6: 📋 Layout Optimalisatie Fase 2 (6 prompts pending) — Grid containment fix, Quick Actions sidebar volgorde, Research sidebar styling, Demographics compact 3×2, Compact empty states, Sub-grid columns
- PSR.7: 📋 AI Persona Analysis Redesign (4 prompts pending) — Chat restylen naar Brand Analysis stijl (teal kleuren, platte bubbels), Rapport fase (Executive Summary + Bevindingen + Aanbevelingen), Veldsuggesties per persona-veld (accept/reject/edit), FieldSuggestionCard component
- PSR.8: 📋 Foto Generatie Fix — Echte Gemini API i.p.v. placeholder stub, DiceBear fallback, zichtbare Generate/Regenerate button onder hero foto

Status: 34/52 prompts uitgevoerd, 16 pending, 2 deels.
Prompt Log: Notion pagina 30f48b9c-6dc9-81a5-8b74-f62bfb6beeb3
Alle prompt-bestanden: `/mnt/user-data/outputs/` (52 .md bestanden)

**AE. AI Exploration Sprint ✅ VOLLEDIG**
- AE.1: ✅ Generic Exploration System — ExplorationSession + ExplorationMessage modellen, 3 API routes, config-resolver, template engine, multi-provider AI caller, item-type registry, AIExplorationPage + 4 componenten
- AE.2: ✅ Admin UI — ExplorationConfig model, 5 CRUD endpoints, AdministratorTab + ConfigListView/ConfigDetailView (list/detail pattern, 4 tabs)
- AE.3: ✅ Knowledge Library — ExplorationKnowledgeItem model, 4 CRUD endpoints, KnowledgeTab (gepromoveerd naar volwaardige tab), {{customKnowledge}} template injection
- AE.5: ✅ UX Redesign — List/detail pattern met ConfigListView (gegroepeerde grid per item type) + ConfigDetailView (4 tabs). 10 nieuwe bestanden, 2 verwijderd (ExplorationConfigEditor + KnowledgeLibrarySection). Sub-componenten: ConfigCard, DimensionCard, IconPicker (30 icons), PromptEditor (variable chips), GeneralTab, DimensionsTab, PromptsTab, KnowledgeTab. 16 bugs gefixt na 3 rondes code review.
- AE.4: ✅ Brand Asset Routing — AIBrandAssetExplorationPage wrapper, App.tsx routing, breadcrumb navigatie

**BAD. Brand Asset Detail Sprint ✅ VOLLEDIG**
- BAD.1: ✅ 2-kolom Layout — Grid refactor (8/4 split), sidebar componenten (QuickActions, Completeness, Validation)
- BAD.2: ✅ Purpose Kompas + Statement — PurposeKompasSection (Mens/Milieu/Maatschappij), PurposeStatementSection (apart asset type)
- BAD.3: ✅ Universal Versioning — ResourceVersion polymorphic model, /api/versions GET endpoint

**PW. Purpose Statement IDEO Verbetering ✅ VOLLEDIG**
- PW.1: ✅ PurposeWheelSection redesign — Impact Type visuele kaarten, Mechanism selecteerbare categorieën (15 outer wheel), Pressure Test helper-vragen, Purpose Score verwijderd
- PW.2: ✅ AI Exploration config — 5 nieuwe dimensies, herziene prompts, 6 field suggestions, frontend sync
- PW.3: ✅ Duplicate verwijderd — uit brand assets, personas en interviews (12 bestanden)

**S10-S12. Production Ready**
- S10: Stripe Billing (checkout, webhooks, plan enforcement, agency model)
- S11: OAuth (Google/Microsoft) + E2E testing (Playwright) + Performance
- S12: Deployment (Vercel) + Monitoring (Sentry) + Analytics (PostHog)

### ❓ OPEN BESLISSINGEN
- Agency pricing: per seat vs per workspace vs flat tiers
- Gratis tier limieten
- Workspace isolatie: soft (filter op orgId) vs hard (row-level security)
- Agency white-label: eigen logo/domein of alleen Branddock branding
- AI provider: OpenAI (content gen) + Anthropic Claude Sonnet 4.6 (exploration, persona chat, analysis) + Google Gemini 3.1 Pro (product analysis, foto generatie) — DRIE providers in gebruik
- AI foto generatie: Gemini (primair) met DiceBear fallback — GEMINI_API_KEY optioneel
- AI product analysis: Gemini 3.1 Pro (`gemini-3.1-pro-preview`) via `@google/genai` SDK — shared client in `src/lib/ai/gemini-client.ts`
- Deployment: Vercel, Railway, of self-hosted

### ✅ GENOMEN BESLISSINGEN
- **Auth provider**: Better Auth (open-source, native Prisma, geen vendor lock-in, geen kosten per user)
- **Organization model**: Better Auth organization plugin, mapt naar bestaande Prisma tabellen
- **Role storage**: Geconverteerd van MemberRole enum naar String (lowercase). Validatie in applicatielaag.
- **Workspace resolution**: Priority: branddock-workspace-id cookie > activeOrganizationId → first workspace > user's first org > env var fallback.
- **Workspace switching**: Via cookie (branddock-workspace-id), set door POST /api/workspace/switch.
- **Password hashing**: scrypt via better-auth/crypto (standaard Better Auth methode)
- **AI Exploration architectuur**: Generiek systeem (S2) met per item type/subtype config in DB. Backend-driven prompts, dimensies en AI model selectie via ExplorationConfig. Hardcoded fallbacks als safety net.
- **Template engine**: `{{variable}}` syntax voor prompt variabelen. Eenvoudig, geen Handlebars/Mustache dependency.
- **Multi-provider AI**: Generic AI caller met provider string ("anthropic"/"openai"). Geen abstractie layer — directe SDK calls per provider in ai-caller.ts.
- **AI Exploration config model**: Per item type/subtype aparte config in DB (13 records). Backend-driven dimensies, prompts, AI model. Frontend leest dimensies uit sessie metadata voor progress bar sync.

---

## Referenties
- Figma: https://www.figma.com/make/WTXNV6zhzsTyYLUOdkFGge/Branddock
- GitHub ref repo: https://github.com/erikjager55/branddock-figma-reference
- Notion Context Library: 2ff48b9c-6dc9-81a9-8b04-f1c0d1e14e40
- Notion Backlog: b7dc92fa-1455-440a-845f-2808f409a9b9
- HANDOVER-BETTER-AUTH.md — Better Auth implementatie details + Fase B plan
- ROADMAP-API-EN-AGENCY-MODEL.md — Gedetailleerd plan API laag + agency model