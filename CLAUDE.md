# BRANDDOCK — Claude Code Context
## Laatst bijgewerkt: 20 maart 2026 (EXP: Export Data Completeness Fixes)

> ⚠️ **VERPLICHT**: Lees `PATTERNS.md` in project root voor UI primitives, verboden patronen, en design tokens. Elke pagina MOET PageShell + PageHeader gebruiken.

> 📋 **TODO**: Zie `TODO.md` in project root voor de geprioriteerde development roadmap (8 fases, ~146 items). Raadpleeg dit bij het plannen van nieuwe werk.

> Brand Assets: 12 assets met elk een eigen frameworkType (PURPOSE_WHEEL, GOLDEN_CIRCLE, BRAND_ESSENCE, BRAND_PROMISE, MISSION_STATEMENT, VISION_STATEMENT, BRAND_ARCHETYPE, TRANSFORMATIVE_GOALS, BRAND_PERSONALITY, BRAND_STORY, BRANDHOUSE_VALUES, ESG). Veldspecificaties per asset: zie `docs/brand-assets-field-specifications.md`

> # Workflow Rules

## Planning

- For any task with 3+ steps or architectural impact: enter plan mode FIRST. Present the plan, wait for approval before executing.
- Every plan must include: (1) what you'll change, (2) how you'll verify it works, (3) what "done" looks like.
- If something breaks during execution: STOP. Do not patch forward. Re-plan from the current state.

## Verification

- Never report a task as done without proof. Run the relevant check (test, build, type-check, manual verification) and include the output.
- After any UI change: describe what you see or expect the user to see. Do not assume it looks correct.
- Before committing: run `tsc --noEmit` and fix all errors. Zero type errors is a hard requirement.

## Bug Fixing

- When you encounter a bug: trace to root cause before writing any fix. Explain the root cause before proposing a solution.
- Never apply a workaround without flagging it as such. If a proper fix is possible, do that instead.
- After fixing a bug caused by a mistake in approach: append a lesson to `gotchas.md` with the date, what went wrong, and the rule to prevent it.

## Self-Improvement

- Read `gotchas.md` at the start of every session before doing any work.
- If you notice a pattern of similar mistakes in gotchas.md, propose a new rule for this CLAUDE.md file.

## Session Discipline

- At the start of each session: read this file, read `gotchas.md`, then confirm what you understand the current task to be.
- Do not work on files that overlap with a parallel session. If unsure, ask which files are safe to touch.
- When a task is complete: summarize what changed, what was verified, and any open items.

## Code Quality

- Prefer the simplest solution that solves the problem. Do not abstract prematurely.
- Do not add comments that restate what the code does. Only comment on *why* when the reason is non-obvious.
- Follow existing patterns in the codebase. If you want to introduce a new pattern, flag it in the plan.

## Communication

- If a task is ambiguous, ask before assuming. One clarifying question is cheaper than a wrong implementation.
- If you're unsure between two approaches, present both with trade-offs. Do not silently pick one.
- Never say "I've updated the code" without specifying which file(s) and what changed.

---

## Project
Branddock is een SaaS platform voor brand strategy, research validatie en AI content generatie.
Voorheen: Brandshift.ai / ULTIEM. Huidige naam: **Branddock**.

## Tech Stack
- **Framework**: Next.js 16.1.6 (hybride SPA), React 19
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL 17, Prisma 7.4
- **Auth**: Better Auth (emailAndPassword, Prisma adapter, organization plugin)
- **State**: Zustand 5 (18 stores), React Context (12 providers)
- **Data fetching**: TanStack Query 5 (brand-assets, personas, trend-radar, brand-alignment, knowledge-resources, product-personas, brandstyle, research, campaigns, studio, competitors)
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
ARENA_API_TOKEN=         # Optioneel: Are.na culturele context enrichment
EXA_API_KEY=             # Optioneel: Exa neural search (1000 gratis/maand)
S2_API_KEY=              # Optioneel: Semantic Scholar (unauthenticated OK)
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
- AI Exploration (generic) — `/api/exploration/[itemType]/[itemId]` POST (start) + `/sessions/[sessionId]/answer` POST + `/sessions/[sessionId]/complete` POST (3 endpoints per item type). Ondersteunt: persona, brand_asset. Backend-driven config via ExplorationConfig model.
- AI Exploration Config (admin) — `/api/admin/exploration-configs` GET + POST, `/api/admin/exploration-configs/[id]` GET + PUT + DELETE (5 endpoints). Beheer van prompts, dimensies, AI modellen per item type/subtype. GET auto-provisioneert ontbrekende configs via `createMany({ skipDuplicates: true })` met systeem-defaults uit `getSystemDefault()`.
- Universal Versioning — `/api/versions` GET (polymorphic ResourceVersion). Werkt voor brand assets, personas, en toekomstige modules.
- Personas (3 personas) — `/api/personas` GET + POST, `/api/personas/:id` GET + PATCH + DELETE, `/api/personas/:id/{duplicate,lock,avatar,generate-image,regenerate,generate-implications,export}`, `/api/personas/:id/research-methods/:method` PATCH, `/api/personas/:id/chat` POST + `/:sessionId/message` POST + `/:sessionId/insights` GET + `/:sessionId/export` GET, `/api/personas/:id/ai-analysis` POST + `/:sessionId` GET + `/answer` POST + `/complete` POST (21+ endpoints). **AI integrations**: Chat via Claude Sonnet 4 (`/api/personas/:id/chat/:sessionId/message`), Strategic Implications AI generatie (`/api/personas/:id/generate-implications`), Photo generatie via Gemini (`/api/personas/:id/generate-image`, fallback DiceBear).
- Products & Services (3 products) — `/api/products` GET + POST, `/api/products/:id` GET + PATCH, `/api/products/:id/lock` PATCH, `/api/products/analyze/url` POST (Gemini AI), `/api/products/analyze/pdf` POST (Gemini AI), `/api/products/:id/personas` GET + POST + DELETE, `/api/products/:id/images` POST, `/api/products/:id/images/[imageId]` PATCH + DELETE, `/api/products/:id/images/reorder` PATCH (16 endpoints). **AI integrations**: URL + PDF product analysis via Gemini 3.1 Pro (`@google/genai`). **Product Images**: ProductImage model met 13 categorieën, auto-scrape bij URL analyse, max 20 per product.
- Competitors (3 competitors) — `/api/competitors` GET + POST, `/api/competitors/:id` GET + PATCH + DELETE, `/api/competitors/:id/lock` PATCH, `/api/competitors/:id/refresh` POST, `/api/competitors/:id/products` GET + POST, `/api/competitors/:id/products/:productId` DELETE, `/api/competitors/analyze/url` POST (Gemini AI) (12 endpoints). **AI integrations**: URL competitor analysis via Gemini 3.1 Pro. + feature: `src/features/competitors/` (TanStack Query, competitorKeys, 12 hooks, Zustand store)
- Research Plans (1 active plan) — `/api/research-plans` GET + POST + PATCH
- Purchased Bundles — `/api/purchased-bundles` GET + POST
- Campaigns (6 campaigns) — `/api/campaigns` GET + POST + DELETE, `/api/campaigns/stats` GET, `/api/campaigns/[id]` GET + PATCH + DELETE, `/api/campaigns/[id]/archive` PATCH, `/api/campaigns/quick` POST, `/api/campaigns/quick/prompt-suggestions` GET, `/api/campaigns/quick/[id]/convert` POST, `/api/campaigns/[id]/knowledge` GET + POST, `/api/campaigns/[id]/knowledge/[assetId]` DELETE, `/api/campaigns/[id]/coverage` GET, `/api/campaigns/[id]/deliverables` GET + POST, `/api/campaigns/[id]/deliverables/[did]` PATCH + DELETE, `/api/campaigns/[id]/strategy` GET, `/api/campaigns/[id]/strategy/generate` POST + feature: `src/features/campaigns/` (TanStack Query, campaignKeys, 20+ hooks, Zustand store)
- Knowledge Library (10 resources) — `/api/knowledge` GET + POST + PATCH + `/api/knowledge/featured` GET + `/api/knowledge/:id/{favorite,archive,featured}` PATCH + `/api/knowledge-resources` (13 endpoints: CRUD, featured, archive/favorite/featured toggles, import-url, upload, types, categories)
- Trends (5 trends) — `/api/trends` GET + POST
- Trend Radar (8 trends, 4 sources) — `/api/trend-radar` (14 endpoints: trends CRUD + activate/dismiss + sources CRUD + pause + scan start/progress/cancel + stats + manual) + feature: `src/features/trend-radar/` (TanStack Query, trendRadarKeys, 16 hooks, Zustand store). Replaces old Market Insights module.
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

### AI Exploration (Universal)

| Model | API Route | Component |
|-------|-----------|-----------|
| `ExplorationSession` | `/api/exploration/[itemType]/[itemId]` | `AIExplorationPage` / `AIBrandAssetExplorationPage` |

- **Backend-driven config**: `ExplorationConfig` Prisma model met prompts, dimensies, AI provider/model per item type/subtype
- **Config resolution**: DB lookup → hardcoded fallback → system defaults (`src/lib/ai/exploration/config-resolver.ts`)
- **Template engine**: `{{brandContext}}`, `{{customKnowledge}}`, `{{itemName}}`, `{{userAnswer}}`, `{{currentDimension}}` variabelen (`src/lib/ai/exploration/prompt-engine.ts`)
- **Multi-provider**: Anthropic Claude Sonnet 4.6 (default) + OpenAI GPT + Google Gemini 3.1 via generic AI caller (singleton clients)
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
- **Server-side cache invalidation**: Elke mutatie route (POST/PATCH/DELETE) MOET `invalidateCache(cacheKeys.prefixes.MODULE(workspaceId))` aanroepen na DB writes. Indien dashboard stats beïnvloed: ook `invalidateCache(cacheKeys.prefixes.dashboard(workspaceId))`. Cache: `src/lib/api/cache.ts` (in-memory Map, TTL 30s lists/60s details). Keys: `src/lib/api/cache-keys.ts`.
- **PDF parsing**: Gebruik `unpdf` (server-safe, geen worker). NIET `pdf-parse` (v2 worker crash in Next.js, v1 readFileSync bug). Parser: `src/lib/brandstyle/pdf-parser.ts`.

## Sidebar Section IDs → Componenten
Navigatie in de sidebar stuurt `setActiveSection(id)`. Mapping:

**Werkend:**
dashboard→DashboardPage, brand→BrandFoundationPage, brand-asset-detail→BrandAssetDetailPage, workshop-purchase→WorkshopPurchasePage, workshop-session→WorkshopSessionPage, workshop-results→WorkshopCompletePage, brandstyle→BrandstyleAnalyzerPage, brandstyle-guide→BrandStyleguidePage, interviews→InterviewsPage, golden-circle→GoldenCirclePage, personas→PersonasPage, products→ProductsOverviewPage, trends→TrendRadarPage, knowledge→KnowledgeLibraryPage, new-strategy→NewStrategyPage, active-campaigns→ActiveCampaignsPage, research/research-hub→ResearchHubPage, research-bundles→ResearchBundlesPage, research-custom/custom-validation→CustomValidationPage, settings-account→AccountSettingsPage, settings-team→TeamManagementPage, settings-agency→AgencySettingsPage, settings-clients→ClientManagementPage, settings-billing→BillingSettingsPage, settings-notifications→NotificationsSettingsPage, settings-appearance→AppearanceSettingsPage, brand-alignment→BrandAlignmentPage, business-strategy→BusinessStrategyPage, settings-admin→AdministratorTab (via SettingsPage initialTab='admin')

**ComingSoonPage:** help

**Campaigns module:** active-campaigns→ActiveCampaignsPage (features/campaigns), campaign-detail→CampaignDetailPage (useCampaignStore.selectedCampaignId), quick-content-detail→QuickContentDetailPage (useCampaignStore.selectedCampaignId), content-studio→ContentStudioPage (useCampaignStore.selectedCampaignId+selectedDeliverableId), content-library→ContentLibraryPage, campaign-wizard→CampaignWizardPage

**Competitors module:** competitors→CompetitorsOverviewPage, competitor-analyzer→CompetitorAnalyzerPage, competitor-detail→CompetitorDetailPage (useCompetitorsStore.selectedCompetitorId)

**Detail pages (via store):** strategy-detail→StrategyDetailPage (useBusinessStrategyStore.selectedStrategyId), persona-detail→PersonaDetailPage (usePersonaDetailStore.selectedPersonaId), persona-create→CreatePersonaPage, persona-ai-analysis→AIPersonaAnalysisPage, product-detail→ProductDetailPage (useProductsStore.selectedProductId), product-analyzer→ProductAnalyzerPage, trend-detail→TrendDetailPage (useTrendRadarStore.selectedTrendId), research-bundle-detail→BundleDetailPage (useResearchStore.selectedBundleId), brand-asset-ai-exploration→AIBrandAssetExplorationPage (via selectedResearchOption='ai-exploration' in App.tsx)

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
│       ├── competitors/
│       │   ├── route.ts                 ← GET + POST (list+create, filters+stats)
│       │   ├── [id]/
│       │   │   ├── route.ts             ← GET + PATCH + DELETE (detail+update+delete)
│       │   │   ├── lock/route.ts        ← PATCH (lock/unlock)
│       │   │   ├── refresh/route.ts     ← POST (re-scrape + re-analyze)
│       │   │   └── products/
│       │   │       ├── route.ts         ← GET + POST (linked products)
│       │   │       └── [productId]/route.ts ← DELETE (unlink product)
│       │   └── analyze/
│       │       └── url/route.ts         ← POST (Gemini AI competitor analysis)
│       ├── products/
│       │   ├── route.ts                 ← GET + POST (live, images mee-aanmaken)
│       │   ├── [id]/
│       │   │   ├── route.ts             ← GET + PATCH (detail + update, images included)
│       │   │   ├── lock/route.ts        ← PATCH (lock/unlock)
│       │   │   ├── personas/
│       │   │   │   ├── route.ts         ← GET + POST (koppel persona)
│       │   │   │   └── [personaId]/route.ts ← DELETE (ontkoppel)
│       │   │   └── images/
│       │   │       ├── route.ts         ← POST (image toevoegen, max 20)
│       │   │       ├── [imageId]/route.ts ← PATCH + DELETE (category/altText/sortOrder)
│       │   │       └── reorder/route.ts ← PATCH (reorder imageIds)
│       │   └── analyze/
│       │       ├── url/route.ts         ← POST (Gemini AI URL analyse + image scraping)
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
│       │       ├── latest/route.ts            ← GET: fetch most recent session (resume/view results)
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
│   ├── [market-insights/ — VERWIJDERD, vervangen door src/features/trend-radar/]
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
│   │   │   ├── BrandPromiseSection.tsx         ← Brand Promise canvas (Keller/Aaker, 5 kaarten, 11 velden)
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
│   └── competitors/                            ← Competitors Analysis
│       ├── components/
│       │   ├── CompetitorsOverviewPage.tsx     ← Overview orchestrator (header+stats+grid)
│       │   ├── CompetitorCard.tsx              ← Card met logo, tier badge, score, differentiators
│       │   ├── analyzer/
│       │   │   ├── CompetitorAnalyzerPage.tsx  ← 2-tab analyzer (URL/Manual)
│       │   │   ├── UrlAnalyzerTab.tsx          ← URL input + analyze button
│       │   │   ├── ManualEntryTab.tsx          ← Manual entry form
│       │   │   └── AnalyzingCompetitorModal.tsx ← 8-step processing met API sync
│       │   └── detail/
│       │       ├── CompetitorDetailPage.tsx    ← Orchestrator (2-kolom layout, inline edit)
│       │       ├── CompanyOverviewSection.tsx  ← Description, founding year, HQ, employees
│       │       ├── PositioningSection.tsx      ← Value proposition, target audience, differentiators
│       │       ├── OfferingsSection.tsx        ← Main offerings, pricing model, pricing details
│       │       ├── StrengthsWeaknessesSection.tsx ← 2-kolom SWOT (add/remove)
│       │       ├── BrandSignalsSection.tsx     ← Tone of voice, messaging themes, visual style
│       │       ├── CompetitiveScoreCard.tsx    ← Circular score (0-100, color-coded)
│       │       ├── QuickActionsCard.tsx        ← Refresh Analysis, Export
│       │       ├── SourceInfoCard.tsx          ← Website URL, last scraped, source badge
│       │       ├── LinkedProductsCard.tsx      ← Linked products + link button
│       │       └── ProductSelectorModal.tsx    ← Multi-select product modal
│       ├── constants/competitor-constants.ts   ← ANALYZE_STEPS, TIER/STATUS_BADGES, score thresholds
│       ├── hooks/index.ts                      ← 12 TanStack Query hooks + competitorKeys
│       ├── stores/useCompetitorsStore.ts       ← Zustand (selectedCompetitorId, processingModal, analyzeResultData)
│       ├── api/competitors.api.ts              ← 10 fetch functies
│       └── types/competitor.types.ts           ← CompetitorWithMeta, CompetitorDetail, AnalyzeJobResponse
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
│       │       ├── PersonaSelectorModal.tsx    ← Persona multi-select modal
│       │       ├── ProductImagesSection.tsx    ← Image grid + hover overlay + category edit
│       │       └── AddImageModal.tsx           ← URL tab (live preview) + upload tab (placeholder)
│       ├── constants/product-constants.ts      ← CATEGORY_GROUPS/OPTIONS/ICONS (22), IMAGE_CATEGORY_OPTIONS (13), ANALYZE_STEPS, SOURCE/STATUS_BADGES
│       ├── hooks/index.ts                      ← 14 TanStack Query hooks + productKeys (incl. image CRUD)
│       ├── stores/useProductsStore.ts          ← Zustand (analyzerTab, processingModal, selectedProductId)
│       ├── api/products.api.ts                 ← 14 fetch functies (incl. image CRUD)
│       └── types/product.types.ts              ← ProductWithMeta, ProductDetail, ProductImage, ProductImageCategory, AnalyzeJobResponse
│   └── trend-radar/                             ← Trend Radar (vervangt Market Insights)
│       ├── components/
│       │   ├── TrendRadarPage.tsx               ← Orchestrator (header+stats+tabs+4 panels+modals)
│       │   ├── TrendRadarStats.tsx              ← 4 StatCards (total, activated, new this week, sources healthy)
│       │   ├── TrendRadarTabs.tsx               ← 4-tab switcher (Sources|Feed|Alerts|Activate)
│       │   ├── AddManualTrendModal.tsx          ← Handmatig trend toevoegen
│       │   ├── sources/                         ← Bronnen beheer
│       │   │   ├── SourcesPanel.tsx             ← Bronnenlijst + grid
│       │   │   ├── SourceCard.tsx               ← Bron card (status dot, last checked, trend count)
│       │   │   ├── AddSourceModal.tsx           ← Bron toevoegen
│       │   │   └── EditSourceModal.tsx          ← Bron bewerken
│       │   ├── feed/                            ← Trends feed
│       │   │   ├── TrendFeedPanel.tsx           ← Chronologische trends + dismissed toggle
│       │   │   ├── TrendFeedCard.tsx            ← Trend card (relevance bar, badges, activate/dismiss)
│       │   │   └── TrendFilterBar.tsx           ← Filters (search, category, impact, detection source)
│       │   ├── alerts/AlertsPanel.tsx           ← Hoge-relevantie trends (>80)
│       │   ├── activation/                      ← Activatie panel
│       │   │   ├── ActivationPanel.tsx          ← Geactiveerde + beschikbare trends
│       │   │   └── ActivatedTrendCard.tsx       ← Green border, deactivate button
│       │   ├── detail/                          ← Trend detail
│       │   │   ├── TrendDetailPage.tsx          ← 2-kolom detail (8/4 split)
│       │   │   ├── TrendRelevanceCard.tsx       ← Relevance score visualisatie
│       │   │   ├── TrendSourceInfoCard.tsx      ← Bron info
│       │   │   └── TrendActivationCard.tsx      ← Activatie status + toggle
│       │   └── scan/ScanProgressModal.tsx       ← Scan progress (polling, cache invalidation)
│       ├── constants/trend-radar-constants.ts   ← Status/category/impact/scope/timeframe/direction configs
│       ├── hooks/index.ts                       ← 16 TanStack Query hooks + trendRadarKeys
│       ├── stores/useTrendRadarStore.ts         ← Zustand (tabs, filters, modals, scan state)
│       ├── api/trend-radar.api.ts               ← 17 fetch functies
│       └── types/trend-radar.types.ts           ← Enums, interfaces, API response types
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
│       │   │   ├── CampaignWizardPage.tsx           ← Campaign wizard (S6.B)
│       │   │   ├── VariantReviewView.tsx             ← Variant review orchestrator (strategy+detail+persona)
│       │   │   ├── VariantStrategyOverview.tsx       ← Strategy foundation with thumbs up/down ratings
│       │   │   ├── VariantDetailCard.tsx             ← Per-variant journey detail (phases+touchpoints+personas)
│       │   │   └── PersonaFeedbackCard.tsx           ← Per-persona feedback with endorsement toggle
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
│   ├── [MarketInsightsContext.tsx — VERWIJDERD, vervangen door features/trend-radar/]
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
│   │   ├── cache.ts                  ← In-memory server-side cache (globalThis Map, TTL, invalidateCache prefix wipe)
│   │   ├── cache-keys.ts             ← Cache key builders per module (products, dashboard, etc.)
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
│   │   │   ├── competitor-analysis.ts     ← Competitor URL analysis prompts (COMP)
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
│   │       ├── ai-caller.ts                  ← Generic AI caller (Anthropic + OpenAI + Google, singleton clients)
│   │       ├── exploration-llm.ts            ← Multi-provider LLM client (Anthropic + Google)
│   │       └── item-type-registry.ts         ← Registry per item type (persona, brand_asset)
│   ├── brandstyle/
│   │   └── pdf-parser.ts               ← PDF text extraction (unpdf, hex colors, font mentions, metadata)
│   ├── products/
│   │   └── url-scraper.ts               ← URL scraper (cheerio, SSRF bescherming + redirect check, image extractie)
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
│   ├── [useMarketInsightsStore.ts — VERWIJDERD, vervangen door features/trend-radar/stores/]
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
├── schema.prisma                        ← 76+ database modellen (AE: +ExplorationSession/Message/Config/KnowledgeItem, BAD: +ResourceVersion)
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
- 76+ tabellen live, schema in sync (`npx prisma db push` succesvol)
- R0.1 Schema Extension: 6 nieuwe modellen (ProductPersona, MarketInsight, InsightSourceUrl, AlignmentScan, ModuleScore, AlignmentIssue)
- AI Exploration modellen: ExplorationSession (generieke chat sessie per item type), ExplorationMessage (Q&A + feedback berichten), ExplorationConfig (backend-driven AI configuratie per item type/subtype), ExplorationKnowledgeItem (custom knowledge per config)
- Universal Versioning: ResourceVersion (polymorphic versie tracking, entityType + entityId + data JSON)
- 28 enums: BrandstyleAnalysisStatus, ProductSource, ProductStatus, ProductImageCategory, InsightCategory (CONSUMER_BEHAVIOR/TECHNOLOGY/MARKET_DYNAMICS/COMPETITIVE/REGULATORY), InsightScope, ImpactLevel (CRITICAL/HIGH/MEDIUM/LOW), InsightTimeframe, InsightSource, ResourceType, ResourceSource, DifficultyLevel, ScanStatus, AlignmentModule, IssueSeverity, IssueStatus, BundleCategory, ValidationPlanStatus, StudyStatus, PurchaseStatus, CampaignType, CampaignStatus, DeliverableStatus, InsertFormat, SuggestionStatus, TrendSourceStatus, TrendDetectionSource, TrendScanStatus
- 15 uitgebreide enums: AIMessageType, ResearchMethodStatus, StrategyType, StrategyStatus, ObjectiveStatus, KeyResultStatus, MilestoneStatus, MetricType, Priority, StyleguideStatus, ColorCategory, PersonaAvatarSource, AIPersonaAnalysisStatus, PersonaChatMode, ChatRole
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
| `/api/products/analyze/url` | POST | AI URL analyse via Gemini 3.1 Pro (scrape → extract → structured JSON + images) |
| `/api/products/analyze/pdf` | POST | AI PDF analyse via Gemini 3.1 Pro (parse → extract → structured JSON) |
| `/api/products/:id/images` | POST | Image toevoegen (url, category?, altText?) — max 20 per product |
| `/api/products/:id/images/:imageId` | PATCH | Image category/altText/sortOrder bijwerken |
| `/api/products/:id/images/:imageId` | DELETE | Image verwijderen (ownership check) |
| `/api/products/:id/images/reorder` | PATCH | Reorder images (imageIds array → sortOrder) |
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
| `/api/competitors` | GET | Lijst met filters (tier, status, search, sort) + stats |
| `/api/competitors` | POST | Competitor aanmaken (Zod validated, auto-slug) |
| `/api/competitors/:id` | GET | Detail (linkedProducts, lockedBy) |
| `/api/competitors/:id` | PATCH | Competitor updaten (nullable fields) |
| `/api/competitors/:id` | DELETE | Cascade delete |
| `/api/competitors/:id/lock` | PATCH | Lock/unlock toggle |
| `/api/competitors/:id/refresh` | POST | Re-scrape websiteUrl + re-analyze via Gemini |
| `/api/competitors/:id/products` | GET, POST | Linked products ophalen + koppelen |
| `/api/competitors/:id/products/:productId` | DELETE | Product ontkoppelen |
| `/api/competitors/analyze/url` | POST | URL scrapen + Gemini AI extractie → CompetitorAnalysisResult |
| `/api/trend-radar` | GET | Trends lijst (filters: category, impactLevel, activated, dismissed, search) |
| `/api/trend-radar/:id` | GET, PATCH, DELETE | Trend CRUD |
| `/api/trend-radar/:id/activate` | PATCH | Toggle isActivated |
| `/api/trend-radar/:id/dismiss` | PATCH | Toggle isDismissed |
| `/api/trend-radar/sources` | GET, POST | Bronnen lijst (filters: status, search) + aanmaken |
| `/api/trend-radar/sources/:id` | GET, PATCH, DELETE | Bron CRUD |
| `/api/trend-radar/sources/:id/pause` | PATCH | Toggle isActive (pause/resume) |
| `/api/trend-radar/scan` | POST | Start scan (alle bronnen of specifieke sourceId) |
| `/api/trend-radar/scan/:jobId` | GET | Poll scan progress |
| `/api/trend-radar/scan/:jobId/cancel` | POST | Cancel scan |
| `/api/trend-radar/stats` | GET | Dashboard stats (total, activated, newThisWeek, sourcesHealthy) |
| `/api/trend-radar/manual` | POST | Handmatig trend toevoegen |
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
| `/api/exploration/[itemType]/[itemId]/latest` | GET | Fetch most recent exploration session for an item (resume/view results) |
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

58. **S4 Sessie B: Market Insights — compleet** — MarketInsightsPage + InsightStatsCards + InsightSearchFilter + InsightCard + InsightImpactBadge + ScopeTag + TimeframeBadge + RelevanceScoreBar (8 overview). AddInsightModal + AiResearchTab + FocusAreasCheckboxes + TimeframeRadioCards + BrandContextToggle + ManualEntryTab + RelevanceSlider + ImportDatabaseTab + ProviderCard (9 add modal). InsightDetailPage + RelevanceScoreCard + AddedDateCard + IndustriesTagsSection + SourcesSection + HowToUseSection + DeleteConfirmModal (7 detail). 12 API endpoints (CRUD + stats + sources + ai-research + categories + providers). Zustand useMarketInsightsStore (re-export). 10 TanStack Query hooks + insightKeys. Feature types (AiResearchBody, ImportProvider). Constants (IMPACT_BADGE_COLORS, CATEGORY_COLORS, TIMEFRAME_BADGES, IMPORT_PROVIDERS). Routing: trends→TrendRadarPage, insight-detail→InsightDetailPage. TypeScript 0 errors.

59. **S4 Fase 2: Products + Market Insights Integratie** — Products: analyzer flow fix (URL/PDF analyze → animation → POST create product → navigate to detail), edit mode (inline edit name/description/pricing → PATCH → refresh), persona koppeling bevestigd. Market Insights: edit mode (inline edit title/description/category/impact/timeframe/scope → PATCH → refresh), add modal flow bevestigd, 3 filters bevestigd, detail delete+sources bevestigd. Brand context stub endpoint (`/api/ai-context/brand-summary` GET — asset/persona/product counts). Dashboard bevestigd (6 context hooks voor counts). Sidebar mapping bevestigd. 0 TS errors.

60a. **S4 Sessie C: AI Product Analyzer + Detail Page Editing** — Fase A (Detail page bewerkbaar): FeaturesSpecsSection/BenefitsSection/UseCasesSection uitgebreid met `isEditing` + `onChange` props (add/remove UI), ProductDetailPage uitgebreid met array edit state + category Select dropdown + sourceUrl ExternalLink + wasEditingRef patroon + saveError state. Fase B (AI Backend): `src/lib/ai/gemini-client.ts` (shared Gemini singleton via `@google/genai`, structured JSON output, 60s AbortSignal timeout, JSON parse try/catch), `src/lib/ai/prompts/product-analysis.ts` (system + user prompts voor URL/PDF), `src/lib/products/url-scraper.ts` (cheerio scraper, SSRF bescherming private IPs, Content-Type validatie), `/api/products/analyze/url/route.ts` (scrape → Gemini → AnalyzeJobResponse), `/api/products/analyze/pdf/route.ts` (PDF parse → Gemini, 20MB + type validatie). Fase C (Frontend): types uitgebreid (pricingDetails/source/sourceUrl/status/analysisData), ProductAnalyzerPage stale closure fix (getState() + useCallback), AnalyzingProductModal geconsolideerde effects (onCompleteRef + setTimeout), cancel race condition fix in URL/PDF tabs, slug collision auto-suffix in POST route. Code review: 2 rondes, 4 subagents, 50 issues → 15 critical fixes. TypeScript 0 errors.

60b. **S4.4 Market Insights Fully Functional** — AI Research met Gemini 3.1 Pro: `src/lib/ai/prompts/market-research.ts` (nieuw, system+user prompts met brand context injectie), `/api/insights/ai-research/route.ts` (herschreven: Gemini structured JSON, sanitizeInsight enum validatie, generateUniqueSlug met Set+retry, Prisma $transaction callback, server-side cache invalidatie). InsightCard overflow menu: 4 acties (View Details/Edit/Use in Campaign/Delete) met stopPropagation op alle menu items + click-outside-to-close. CTA wiring: InsightDetailPage `onNavigate` prop (Use in Campaign→active-campaigns, Generate Content→content-library), App.tsx routing doorgewired. Type/store cleanup: ongebruikte `aiResearchJobId`/`isResearching` velden verwijderd uit useMarketInsightsStore, `AiResearchJobResponse` type gefixt. AiResearchTab error feedback UI (AlertCircle+border). ProviderCard: disabled "Coming Soon" button+Lock icon, noopener/noreferrer. Polling endpoint 410 Gone. 3 review rondes (6 subagents): stabiele delete mutation (inline useMutation), edit state sync (prevEditing ref), tag dedup, 0 TS errors.

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

81. **S4.4: Product Categories 5→22 + Product Images** — Product categories uitgebreid van 5 naar 22 met groepering (Physical Products 8, Digital Products 4, Services 6, Experience & Lifestyle 3, General 1). `CATEGORY_GROUPS` array met flat `CATEGORY_OPTIONS` via flatMap. Select component uitgebreid met `groups` prop voor HTML `<optgroup>`. ProductCard ICON_MAP uitgebreid naar 22 Lucide icons. AI prompts + validatie bijgewerkt (product-analysis.ts, analyze routes). ProductImage Prisma model (13 categorieën: HERO/LIFESTYLE/DETAIL/SCREENSHOT/FEATURE/MOCKUP/PACKAGING/VARIANT/GROUP/DIAGRAM/PROCESS/TEAM/OTHER, sortOrder, source SCRAPED/UPLOADED/URL_ADDED). URL scraper uitgebreid met `findProductImages()` (og:image, img tags, SSRF bescherming incl. redirect check, max 20 images). 4 nieuwe API routes (POST image, PATCH/DELETE imageId, PATCH reorder) met cache invalidation. GET product detail includeert images (orderBy sortOrder). POST product create accepteert images array. ProductImagesSection (responsive grid, hover overlay, inline category edit, delete confirm, ARIA labels, keyboard accessible). AddImageModal (URL tab met live preview + stricter validatie, upload tab placeholder). ProductCard hero image thumbnail met useState error fallback. Analyzer flow slaat gescrapede images automatisch op bij product create. IMAGE_CATEGORY_OPTIONS + IMAGE_CATEGORY_SELECT_OPTIONS constants. ProductImageCategory union type op API body types. Seed: 9 ProductImage records (3 per product). Code review: 2 subagents, 32 bevindingen, 14 fixes (SSRF redirect, cache invalidation, max 20 limiet, React error handling, a11y, type safety). TypeScript 0 nieuwe errors.

82. **TR: Trend Radar — compleet (vervangt Market Insights)** — Volledige vervanging van Market Insights door Trend Radar monitoring dashboard. **Fase 0 (Schema+Seed)**: 3 nieuwe Prisma modellen (TrendSource, DetectedTrend, TrendScanJob), 3 nieuwe enums (TrendSourceStatus, TrendDetectionSource, TrendScanStatus), InsightCategory enum bijgewerkt (CONSUMER_BEHAVIOR/TECHNOLOGY/MARKET_DYNAMICS/COMPETITIVE/REGULATORY), ImpactLevel +CRITICAL. Seed: 4 sources, 8 trends, 1 scan job. **Fase 1 (Backend)**: 14 API endpoints in 10 route files (`/api/trend-radar/` trends CRUD + activate/dismiss + sources CRUD + pause + scan start/progress/cancel + stats + manual), `src/lib/trend-radar/` (scanner.ts fire-and-forget met in-memory progress, content-differ.ts sha256, trend-analyzer.ts Gemini AI + dedup), `src/lib/ai/prompts/trend-analysis.ts`, cron route `/api/cron/trend-scan`. **Fase 2 (State)**: `trend-radar.types.ts` (8 interfaces), `trend-radar.api.ts` (18 fetch functies), 16 TanStack Query hooks + trendRadarKeys, useTrendRadarStore Zustand (tabs, filters, modals, scanJobId), `trend-radar-constants.ts`. **Fase 3 (Frontend)**: 20+ componenten: TrendRadarPage (4-tab dashboard), TrendRadarStats (4 StatCards), sources panel (SourcesPanel, SourceCard, AddSourceModal, EditSourceModal), feed panel (TrendFeedPanel, TrendFeedCard, TrendFilterBar), alerts panel (AlertsPanel, AlertCard), activation panel (ActivationPanel, ActivatedTrendCard), detail page (TrendDetailPage, TrendRelevanceCard, TrendSourceInfoCard, TrendActivationCard), scan modal (ScanProgressModal met polling), AddManualTrendModal. **Fase 4 (Integratie+Cleanup)**: ~40 oude Market Insights bestanden verwijderd (features/market-insights/, contexts/MarketInsightsContext, stores/useMarketInsightsStore, types/market-insight, lib/api/insights, lib/ai/prompts/market-research, app/api/insights/), cross-module updates (brand-context.ts, registry.ts, knowledge-context-fetcher.ts, dashboard, search, studio, campaigns, settings), routing (trends→TrendRadarPage, trend-detail→TrendDetailPage), design tokens (trend-radar module key), middleware cache rules bijgewerkt. **Review fixes**: 5 CRITICAL (Prisma enums sync, scan POST response unwrap, field naming, manual/sources POST unwrap), 7 WARNING (try-catch, filter logic, source filters+total, edit modal UX), ~7 MINOR (middleware, cache invalidation, relevance color thresholds, dashboard field rename, unused imports, type optionals). 2 review rondes, 0 openstaande issues. TypeScript 0 nieuwe errors.

83. **FIX: Product Delete Instant + PDF Parser + Cache Invalidation** — Product delete was niet instant door ontbrekende server-side cache invalidation in `src/lib/api/cache.ts`. Fix: `invalidateCache(cacheKeys.prefixes.products(workspaceId))` + `invalidateCache(cacheKeys.prefixes.dashboard(workspaceId))` toegevoegd aan DELETE en PATCH handlers in `/api/products/[id]/route.ts`. Lock route (`/api/products/[id]/lock/route.ts`) had helemaal geen cache invalidation — toegevoegd. Client-side: `cancelQueries` + `removeQueries` met `productKeys.all` in handleDelete voor instant navigatie. PDF parser: `pdf-parse` vervangen door `unpdf@1.4.0` (pdf-parse v2 crashed door pdfjs-dist worker, v1 heeft readFileSync bug). `@types/pdf-parse` verwijderd. Code review: 2 subagent rondes, 4 WARNING + 2 MINOR gefixt, 0 openstaande issues. TypeScript 0 errors.

84. **TG: Transformative Goals Asset — compleet** — Volledig uitgewerkt brand asset met 5-sectie canvas gebaseerd op BHAG (Collins), MTP (Ismail), Brand Ideal (Stengel), Moonshot Thinking (Google X). **Component**: `TransformativeGoalsSection.tsx` (~990 regels) met 5 kaarten: MTP hero (statement+narrative+voorbeelden), Transformative Goals (1-5 goals accordion met GoalCard sub-component, impactDomain People/Planet/Prosperity, timeframe, measurable commitment, theory of change, milestones met achieved toggle, UN SDG alignment), Authenticity Assessment (6 criteria op 1-5 schaal: ambition/authenticity/clarity/measurability/integration/longevity), Stakeholder Impact Map (5 groepen: Employees/Customers/Partners/Community/Planet), Brand Integration (positioning link, communication themes, campaign directions, internal activation). **Types**: `framework.types.ts` uitgebreid met TransformativeGoal, ImpactDomain, TimeframeHorizon, GoalMilestone, AuthenticityScore, StakeholderImpact, BrandIntegration, TransformativeGoalsFrameworkData. **AI Exploration**: 7 dimensies (origin_belief, future_vision, impact_scope, measurable_commitment, theory_of_change, authenticity_alignment, activation_strategy) + 9 field suggestions, gesynchroniseerd in seed-exploration-configs.ts, brand-asset-exploration-config.ts, config-resolver.ts. **Completeness**: dynamische goal count (1-5), stakeholder content check (role/expectedImpact), authenticity scores check. **AI Export**: `brand-context.ts` met `formatTransformativeGoals()` — rich formatting met MTP, goals per domain/target/timeframe, authenticity score %, positioning, themes, campaigns, stakeholders. **3 review rondes** (6 subagents): 13 fixes (GoalCard key stability, array mutation in render, double milestone icon, authenticity avg consistency, dynamic completeness, stakeholder content check, non-null assertions, aria-expanded, type="button", StringListEditor keys, milestone achieved toggle, stakeholder format). 0 CRITICAL, 0 WARNING, 0 openstaande issues. TypeScript 0 errors.

85. **BA: Brand Archetype Asset — compleet** — Volledige uitwerking van de Brand Archetype asset op basis van het 12 Jungische archetypen-model (Carl Jung → Carol Pearson & Margaret Mark, 2001). **Type**: `BrandArchetypeFrameworkData` uitgebreid van 5 naar 25+ velden over 6 secties (Archetype Selection, Core Psychology, Voice & Messaging, Visual Expression, Archetype in Action, Reference & Positioning). **Referentiedata**: `archetype-constants.ts` met alle 12 archetypen (Innocent, Sage, Explorer, Outlaw, Magician, Hero, Lover, Jester, Everyman, Caregiver, Ruler, Creator), elk met core desire/fear, strategy, shadow, voice style, visual direction, sub-archetypes, brand examples, en 4-kwadrant groepering. **Canvas**: `BrandArchetypeSection.tsx` (~800 regels) met 6 kaarten, auto-prepopulatie vanuit referentiedata bij archetype selectie, TagEditor, WeSayNotThatEditor, collapsible archetype guide. **AI Exploration**: 7 dimensies (archetype_discovery, core_psychology, shadow_risks, voice_messaging, visual_expression, archetype_in_action, competitive_positioning) met 18 field suggestions, seed config bijgewerkt. **AI Export**: `formatBrandArchetype()` in brand-context.ts exporteert alle 25+ velden gestructureerd voor campagnestrategie-generatie. **Completeness**: 12 velden in AssetCompletenessCard. **Review**: 3 rondes met 2 subagents per ronde, 8 issues gevonden en gefixt (ICON_MAP, template variables, completeness check, quadrant consistentie, unused imports, undefined patterns). TypeScript 0 errors.

86. **BP: Brand Promise Asset — compleet** — Volledige uitwerking van de Brand Promise asset op basis van Keller's CBBE model, Aaker's drie-lagen waarde-architectuur (functional/emotional/self-expressive), en Neumeier's Onlyness Test. **Type**: `BrandPromiseFrameworkData` uitgebreid van 5 naar 11 velden: promiseStatement, promiseOneLiner, functionalValue, emotionalValue, selfExpressiveValue, targetAudience, coreCustomerNeed, differentiator, onlynessStatement, proofPoints[], measurableOutcomes[]. **Canvas**: `BrandPromiseSection.tsx` (~350 regels) met 5 kaarten: Promise Statement (teal, Shield), Value Architecture (rose, Heart — 3 BenefitFields), Audience & Need (blue, Users), Differentiator (violet, Target — onlyness template), Evidence (gray, ShieldCheck — StringListEditor voor proofPoints + measurableOutcomes). **AI Exploration**: 5 dimensies (promise_core, value_layers, audience_need, onlyness, evidence) + 11 field suggestions, gesynchroniseerd in seed-exploration-configs.ts, brand-asset-exploration-config.ts, config-resolver.ts. **Completeness**: 11 velden in AssetCompletenessCard. **AI Export**: brand-context.ts uitgebreid met BrandPromiseData interface + rich formatting van alle 11 velden voor campagnestrategie-generatie. **Seed**: demo data met alle 11 velden voor Branddock. **Review**: 2 rondes met 2 subagents, 0 CRITICAL, 1 WARNING (ongerelateerd: trend-radar lock route), 4 MINOR (JSDoc toegevoegd). TypeScript 0 errors.

87. **BPE: Brand Personality Asset — compleet** — Volledige uitwerking van de Brand Personality asset op basis van Jennifer Aaker's Brand Personality Dimensions (1997, 5 dimensies/15 facets/42 traits) en Nielsen Norman Group's Tone of Voice model (4 dimensies). **Type**: `BrandPersonalityFrameworkData` uitgebreid van 5 naar 20+ velden over 6 secties: Aaker Dimension Scores (5 dimensies op 1-5 schaal), Core Personality Traits (max 5, met weAreThis/butNeverThat guard rails), Personality Spectrum (7 opposing trait pairs op 1-7 schaal), Voice & Tone (NN/g 4-dimensie model + brandVoiceDescription + wordsWeUse/Avoid + writingSample), Communication Style (5 channel-specifieke tones), Visual Expression (color/typography/imagery direction). **Referentiedata**: `personality-constants.ts` met AAKER_DIMENSIONS (5 dimensies, facets, traits, brand examples, color/typography/imagery associaties), SPECTRUM_SLIDERS (7 configs), TONE_DIMENSIONS (4 NN/g configs), CHANNELS (5 configs). **Canvas**: `BrandPersonalitySection.tsx` (~570 regels) met 6 kaarten, klikbare score bars, expandable dimension info, range sliders, WordList sub-component, auto-derive primary/secondary dimension. **AI Exploration**: 7 dimensies (dimension_mapping, core_traits, spectrum_positioning, voice_tone, writing_sample, channel_adaptation, visual_expression) + 14 field suggestions, gesynchroniseerd in seed.ts, brand-asset-exploration-config.ts, config-resolver.ts. **Completeness**: 12 velden in AssetCompletenessCard. **AI Export**: `formatBrandPersonality()` in brand-context.ts met BrandPersonalityData interface, DIMENSION_LABELS/SPECTRUM_LABELS/TONE_LABELS maps, alle velden gestructureerd voor campagnestrategie-generatie. TypeScript 0 errors.

88. **AE-FIX: AI Exploration Field Suggestions Fix** — 3 problemen opgelost in de AI exploration field suggestion pipeline. **(1) Slechts 1 suggestie**: Guard in `brand-asset-builder.ts` (line 271) skipte field augmentatie wanneer dynamic mapping groter was dan config — guard verwijderd. `config-resolver.ts` retourneerde `null` als fallback — `getDefaultFieldSuggestionsConfig()` toegevoegd met hardcoded fallbacks voor brand-personality (14), brand-archetype (12), brand-promise (12 incl. measurableOutcomes), mission-statement (14), transformative-goals (4). LLM prompt gewijzigd van "ONLY for fields that are empty" naar "suggest a value for EVERY field". **(2) Complexe velden niet opgeslagen**: `parseReportJSON()` gebruikte `String()` op objecten → `[object Object]`. Fix: `serializeSuggestedValue()` helper met `JSON.stringify()` voor objects/complex arrays. `maybeParseJSON()` in `AIBrandAssetExplorationPage.tsx` parsete JSON strings terug + herstelt bare numbers. `formatDisplayValue()` + recursive `formatParsedValue()` voor leesbare weergave van JSON-geserialiseerde waarden. **(3) Review fixes (2 rondes, 4 subagents)**: Dead code verwijderd (`isJsonString()`, `AIExplorationFieldSuggestion.tsx`), `handleAcceptAll` bewaart user edits, Gemini consecutive user-role crash gefixt in `generateFeedback()`. TypeScript 0 errors.

89. **AE-FIX2: AI Exploration Dimensie-mismatch + Extraction Hints** — 2 bugs opgelost die ervoor zorgden dat AI Exploration antwoorden niet correct werden verwerkt in het rapport en field suggestions. **(1) Dimensie-mismatch**: Beide builders (`brand-asset-builder.ts` en `persona-builder.ts`) gebruikten hardcoded dimensies (`BRAND_ASSET_DIMENSIONS` / `PERSONA_DIMENSIONS`, 4 generieke) voor rapport-generatie, terwijl de chat-vragen uit config-driven dimensies kwamen (bijv. 8 per asset type). Hierdoor matchten de Q&A dimension keys niet met de rapport-dimensies → lege/irrelevante secties. Fix: dimensies nu uitgelezen uit `session.metadata.dimensions` (snapshot opgeslagen bij sessie-creatie). **(2) Ontbrekende extraction hints**: `fieldSuggestionsConfig` uit de DB bevat `extractionHint` per veld (bijv. "Extract the one-liner summary of the brand promise"), maar deze werd niet doorgegeven aan de LLM. Fix: `exploration-llm.ts` toont `[hint: ...]` per veld in de prompt, `brand-asset-builder.ts` en `persona-builder.ts` mergen `extractionHint` in de field mapping. **(3) Persona builder identiek gefixt**: Dezelfde twee bugs bestonden latent in `persona-builder.ts` — proactief gefixt. **(4) Config-resolver**: Ontbrekend `missionVisionTension` veld toegevoegd aan mission-statement fallback. Review: 2 rondes met telkens 2 onafhankelijke review-agents, 4 bestanden gewijzigd. TypeScript 0 errors.

90. **TR-Q: Trend Radar AI Research Kwaliteitsoptimalisatie — compleet** — Significante verbetering van de 5-fase research pipeline (Query→Extract→Synthesize→Score→Judge) op drie assen: betere brondata, betere AI-modellen, robuustere pipeline. **Brondata**: `searchWithGrounding()` in gemini-client.ts vangt nu Google Search AI-samenvattingen op als grounded sources (voorheen werd deze tekst weggegooid). Chrome User-Agent voor web scraping (custom UA werd geblokkeerd). Fallback signalen uit raw content als signal extraction faalt. **Model upgrade**: Signal extraction gemini-2.5-flash → gemini-3.1-pro-preview, Trend synthese + Judge validatie gemini-3.1-pro → Claude Sonnet 4.5 via nieuwe `createClaudeStructuredCompletion()` in ai-caller.ts. 90s AbortSignal timeout op Claude calls. **Pipeline robuustheid**: `search:` pseudo-URLs gefilterd vóór persistentie in PendingTrend (researcher.ts). Evidence strength scorer sluit `search:` URLs uit. Judge override: als judge ALLES reject → rescue met fallback scores. Quality filter fallback: als 0 trends threshold halen → top 3 op score. Default judge verdict REJECT → IMPROVE. Dead Phase 4 `scoredTrends` code verwijderd. `Prisma.JsonNull` i.p.v. `undefined` voor pendingTrends clearing. Approve route `??` → `||` voor lege string sourceUrl. **Frontend**: Source links `text-blue-600` → `text-primary` (Tailwind purge fix). `realSourceUrls` variabele i.p.v. triple `.filter()`. Prompts verscherpt (whyNow, specificity, BAD/GOOD voorbeelden, anti-generiek filters). **Nieuwe velden**: `whyNow` (waarom nu relevant), `specificity` score (0-100), `sourceAuthority`, `publicationDate` op Signal type. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents, 3 CRITICAL + 6 WARNING + 7 MINOR gevonden en gefixt. 12 bestanden gewijzigd. TypeScript 0 errors.

91. **BA-UX: Brand Archetype UX + AI Exploration fixes — compleet** — 6 verbeteringen aan Brand Archetype page en AI Exploration systeem. **(1) Accordion pattern**: Cards 2-6 in BrandArchetypeSection.tsx zijn nu collapsible met `expandedCard` state (Card 2 start expanded). Elke collapsed card toont een summary (tags/field counts). Card 1 (archetype selectie) blijft altijd zichtbaar. Verwijderd: `ArchetypeReferencePanel` (duplicate data), `RefField`, `QUADRANT_BADGE_COLORS`. **(2) Lock state**: `AssetResearchSidebarCard.tsx` "View Results" button nu ook `disabled={isLocked}`. **(3) AI Exploration rapport maxTokens**: `exploration-llm.ts` `generateReport()` maxTokens 4000→16000 — voorkomt truncated JSON die fallback rapport triggerde voor complexe assets (25+ velden). **(4) Dimension card styling**: `AIExplorationDimensionCard.tsx` uitgebreid van 6 naar 40 Lucide icons in ICON_MAP. Hardcoded persona-only `DIMENSION_STYLES` vervangen door color-based `COLOR_STYLES` map (9 kleuren: blue/rose/amber/purple/emerald/teal/violet/indigo/pink) die dynamisch resolved via `dimensionConfigs.find(c => c.key === dimension.key)`. **(5) Single archetype enforcement**: AI prompts in `seed-exploration-configs.ts` en `config-resolver.ts` bijgewerkt met "CRITICAL RULE: Always recommend exactly ONE archetype. NEVER suggest a blend, hybrid, dual archetype, or combination." in system prompt, feedback prompt en extractionHint. Seed script gedraaid → DB bijgewerkt. **(6) Review**: 2 rondes met telkens 2 onafhankelijke review-agents. Ronde 1: 4 ontbrekende icons gevonden (Diamond, Lightbulb, Settings, AlertCircle) → gefixt. Ronde 2: 0 issues. 6 bestanden gewijzigd. TypeScript 0 errors.

92. **TR-EXP: Trend Radar Export Enrichment — compleet** — Review en verrijking van de Trend Radar data export naar AI-facing lagen. **(1) Brand Context Export**: `brand-context.ts` Prisma query uitgebreid van 3 naar 12 velden (+ description, scope, timeframe, relevanceScore, direction, confidence, whyNow, dataPoints, aiAnalysis). Formatting van platte one-liner naar gestructureerd multi-line blok per trend (title + metadata bracket + description + whyNow + aiAnalysis + dataPoints). CRITICAL impact filter uitgebreid (was alleen HIGH). **(2) Studio Insights API**: `/api/studio/[deliverableId]/insights` response uitgebreid van 5 naar 10 velden (+ description, impactLevel, scope, timeframe, whyNow). `AvailableInsight` type in `studio.ts` bijgewerkt. **(3) Prompt formatting fix**: `prompt-templates.ts` `competitiveLandscape` rendering gewijzigd naar header/body split voor correcte multi-line markdown. Label gewijzigd naar "Market Trends & Competitive Landscape". **(4) Pre-existing bug fix**: `fetchResearchInsights` in `studio.api.ts` unwrapte `{ insights: [...] }` wrapper niet — gefixt met `data?.insights ?? []`. **(5) Edge case fix**: `dataPoints` post-filter length check toegevoegd om lege "Data: " output te voorkomen. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. Ronde 1: 3 issues (multi-line markdown, API wrapper mismatch, dataPoints edge case). Ronde 2: 1 issue (null guard). Alle gefixt. 5 bestanden gewijzigd. TypeScript 0 errors.

93. **TR-FIX: Trend Radar Research Pipeline Timeout Fix — compleet** — Fix voor "Request was aborted" + "No trends could be synthesized" foutmelding in de Trend Radar AI research pipeline. **(1) Per-call timeout**: `createClaudeStructuredCompletion` in `ai-caller.ts` uitgebreid met optioneel `timeoutMs` veld op `ClaudeCompletionOptions`. Default 90s (was hardcoded 180s na eerdere fix). Trend-radar callers (`trend-analyzer.ts` synthesizeTrends + `trend-judge.ts` judgeTrends) passen nu expliciet `timeoutMs: 180_000` mee — brandstyle callers behouden 90s default. **(2) Signal threshold**: `researcher.ts` fallback threshold gewijzigd van `signals.length === 0` naar `< MIN_SIGNALS_FOR_SYNTHESIS (3)` — augmenteert met raw content fallbacks bij te weinig gestructureerde signals. **(3) Gemini fallback**: Als Claude synthesis 0 trends retourneert, fallback naar `analyzeMultipleSources()` (Gemini) met `search:` pseudo-URL filtering. Gewrapt in try-catch zodat een Gemini crash de pipeline niet killt. **(4) Review**: 3 rondes met telkens 2 onafhankelijke review-agents. Ronde 1: 1 CRITICAL (try-catch ontbrekend), 2 WARNING (global timeout, deprecated functie). Ronde 2: fixes toegepast. Ronde 3: 0 issues. 4 bestanden gewijzigd. TypeScript 0 errors.

94. **SR: Social Relevancy Asset — volledig uitgewerkt** — Volledige herschrijving van het ESG brand asset. Van 3 pilaren met 6 velden naar 6-kaarten canvas met 19 completeness velden en 15 AI field suggestions. **(1) Types**: `SocialRelevancyFrameworkData` + sub-interfaces (`SocialRelevancyStatement`, `SocialRelevancyPillar`, `SocialRelevancyAuthenticityScores`) in `framework.types.ts`. **(2) Constants**: `social-relevancy-constants.ts` (~200 regels): 9 stellingen (3 per pilaar Milieu/Mens/Maatschappij), 4 activism levels (Kotler & Sarkar), 6 authenticiteits-criteria, 17 UN SDGs met kleuren, score thresholds, referentie-frameworks (TBL, B Corp, Brand Activism). **(3) Component**: `SocialRelevancySection.tsx` (~900 regels, 6 accordion kaarten): Card 1 Impact Foundation (statement+narrative+activism level), Cards 2-4 Milieu/Mens/Maatschappij (elk 3 stellingen met score 1-5 bars, evidence, target, timeline + pillar reflection), Grand Total display met kleurcodering, Card 5 Authenticiteit (6 criteria scores, proof points, certifications, anti-greenwashing statement), Card 6 Activering (SDG grid max 3, communication principles, stakeholders, channels, annual commitment). Sub-componenten: `CardHeader`, `StringListEditor`, `TagInput`, `ScoreBar`. **(4) AI Exploration**: 7 dimensies (impact_foundation, milieu/mens/maatschappij_assessment, authenticity_test, evidence_proof, activation_communication) + 15 field suggestions in seed + config-resolver fallback. **(5) AI Export**: `formatSocialRelevancy()` in brand-context.ts met `SocialRelevancyExportData` interface — alle velden gestructureerd met pillar scores, evidence, authenticiteit %, SDGs. **(6) Completeness**: 19 velden (1 description + 18 framework) in AssetCompletenessCard ESG case. **(7) Bugfixes**: Config-resolver `??` fallback bij null `fieldSuggestionsConfig` (DB config had null → fallback naar hardcoded defaults), TagInput index mismatch (`.filter(Boolean).map` → `.map` met null return), score threshold gap (min 3→0), dead code verwijderd (`PURPOSE_WASHING_INDICATORS`). **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. Ronde 1: 2 WARNING + 6 MINOR. Ronde 2: 1 WARNING (TagInput index). Alle gefixt. 8 bestanden gewijzigd. TypeScript 0 errors.

95. **TR-IMG: Trend Radar Auto-Scrape Images — compleet** — AI research pipeline scraped al webpagina's maar gooide afbeeldingen weg. Nu wordt per URL de beste afbeelding bewaard en automatisch gekoppeld aan trends. **(1) Image scraping**: `researcher.ts` — `sourceImages` Map in Phase 2 (EXTRACT), prioriteit og-image > product > general via `scrapeProductUrl().images`. Na synthesis wordt per PendingTrend de imageUrl resolved door sourceUrl(s) te matchen tegen de Map. **(2) Persistence**: `approve/route.ts` — `imageUrl: trend.imageUrl ?? null` doorgezet naar `DetectedTrend.create()`. **(3) Types**: `trend-radar.types.ts` — `imageUrl?: string | null` op `PendingTrendItem`. **(4) Cache invalidation fix**: `approve/route.ts` en `manual/route.ts` misten `invalidateCache()` calls na DB writes — toegevoegd voor `trendRadar` + `dashboard` prefixes (pre-existing bug). **(5) Error handling**: `route.ts` GET handler had geen try-catch — toegevoegd. **(6) Navigation bug fix**: `TrendDetailPage.tsx` — `heroImageError` state werd niet gereset bij navigatie tussen trends, waardoor afbeeldingen verdwenen. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. Ronde 1: 2 CRITICAL (cache invalidation) + 1 WARNING (heroImageError). Ronde 2: 0 CRITICAL, 0 WARNING. 7 bestanden gewijzigd. TypeScript 0 errors.

96. **BPE-FIX: Brand Personality Field Suggestions Fix — compleet** — AI Exploration field suggestions werden niet toegepast voor personality spectrum (7 sliders op midden), voice & tone (4 sliders op midden), en communication style (socialMedia, customerSupport, crisis leeg). **Oorzaak**: `spectrumSliders`, `toneDimensions`, en `channelTones` waren geconfigureerd als enkele field suggestions met `type: 'text'`. De AI retourneerde JSON strings of vrije tekst voor het hele object, wat niet correct deserialiseerde. **Fix**: 3 complexe objectvelden opgesplitst in 16 individuele sub-field suggestions met dot-path notatie (bijv. `frameworkData.spectrumSliders.friendlyFormal`). `deepSet()` ondersteunt dit al. Elke slider krijgt hint "Return a single number 1-7", elk kanaal een eigen beschrijvingshint. `dimensionScores` hint verbeterd met expliciet JSON format voorbeeld. `fieldSuggestionsConfig` toegevoegd aan brand-personality seed (was `null` → fallback). **Bestanden**: `config-resolver.ts` (fallback config, 14→27 velden), `seed-exploration-configs.ts` (DB config toegevoegd). **Review**: 2 rondes met 2 onafhankelijke review-agents. 0 CRITICAL, 0 WARNING. TypeScript 0 errors.

97. **TG-FIX: Transformative Goals AI Exploration Field Suggestions Fix** — 2 bugs opgelost die ervoor zorgden dat AI Exploration voor Transformative Goals assets de goals niet correct invulde. **(1) `deepSet()` array-index bug**: Paden zoals `goals[0].title` werden door `path.split('.')` gesplit naar `['goals[0]', 'title']`, waardoor JavaScript een letterlijke property `"goals[0]"` maakte i.p.v. array access. Fix: regex `/^(.+)\[(\d+)\]$/` detecteert array-notatie per pad-segment, navigeert correct in arrays. Backwards-compatible met non-array paden. **(2) Field suggestions uitgebreid (4→19)**: Van `frameworkData.goals` als single text field naar individuele goal fields met array-index notatie: Goal 1 (6 sub-fields: title, description, impactDomain, timeframe, measurableCommitment, theoryOfChange), Goal 2 (4: title, description, impactDomain, measurableCommitment), Goal 3 (2: title, description), plus brandIntegration (4: positioningLink, communicationThemes, campaignDirections, internalActivation). Config-resolver fallback en seed DB config gesynchroniseerd (19 velden identiek). **(3) Smart quote fix**: `\u2019` in seed extraction hints vervangen door straight apostrophes voor consistentie met config-resolver.ts. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. 0 CRITICAL, 1 WARNING (smart quote mismatch — gefixt). 3 bestanden gewijzigd. TypeScript 0 errors.

98. **BHV: Core Values (BrandHouse Values) Asset — compleet** — Laatste brand asset zonder modern canvas component. Was fallback naar legacy `FrameworkSection` ("Unknown framework type"). Nu volledig uitgewerkt op basis van het BrandHouse/Brandstar waarde-model (BetterBrands.nl methodiek: Inventarisatie → Selectie → Positionering & Articulatie). **Component**: `BrandHouseValuesSection.tsx` (~305 regels) met methodiek-intro + 3 kaarten: Card 1 Roots/Anchor Values (teal, Anchor icon — 2x ValueField voor anchorValue1/2, foundational values already lived today), Card 2 Wings/Aspiration Values (violet, Compass icon — 2x ValueField voor aspirationValue1/2, values that give direction and ambition), Card 3 Fire/Own Value + Value Tension (amber, Flame icon — highlighted ownValue + valueTension textarea, the most distinguishing characteristic). `normalize()` + `normalizeValue()` null-safe defaults, `ValueField` sub-component (name input + description textarea). **Wiring**: `BrandAssetDetailPage.tsx` — `isBrandHouseValues` detection + `LockOverlay` wrapped render block + fallback exclusion. **AI Exploration**: 6 methodology-driven dimensies (value_inventory, roots_foundation, wings_direction, fire_distinction, validation_test, tension_balance) + 12 field suggestions covering all BrandHouseValuesFrameworkData velden (nested name+description pairs). Gesynchroniseerd in seed-exploration-configs.ts, brand-asset-exploration-config.ts, config-resolver.ts. Seed script gedraaid → DB bijgewerkt. **AI Export**: `formatBrandHouseValues()` in brand-context.ts verbeterd — van platte labels naar Roots/Wings/Fire terminologie (bijv. "Roots (Anchor Values): X — desc; Y — desc"). **Bug fix**: `resolveItemSubType()` in constants.ts checkte `item.slug` vóór `item.frameworkType` → asset slug `core-values` matchte geen DB config (keyed op `brandhouse-values`) → fallback naar 4 generieke default dimensies. Fix: frameworkType nu prioriteit (maps `BRANDHOUSE_VALUES` → `brandhouse-values` via `FRAMEWORK_TO_SUBTYPE`), slug als fallback voor non-brand-asset items. Stale sessies + messages opgeruimd. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. 0 CRITICAL, 0 WARNING. 7 bestanden gewijzigd. TypeScript 0 errors.

99. **S1-DEL: S1 AI Brand Analysis Verwijderd — compleet** — Volledige verwijdering van het legacy S1 AI chat-systeem voor brand assets. S2 (ExplorationSession) heeft volledige feature parity en is nu het enige AI chat-systeem. **Verwijderd (~36 bestanden)**: Feature directory `src/features/ai-brand-analysis/` (~21 bestanden: componenten, report, hooks, store, api, types, utils), API routes `src/app/api/brand-assets/[id]/ai-analysis/` (8 route files, 8 endpoints), `src/types/ai-analysis.ts` (11 interfaces), `src/stores/useAIAnalysisStore.ts`, `src/lib/ai/prompts/brand-analysis.ts`, `e2e/tests/brand-foundation/ai-analysis.spec.ts`. **Prisma**: `AIBrandAnalysisSession` model + `AIAnalysisMessage` model + `AIAnalysisStatus` enum verwijderd, relaties verwijderd van Workspace/User/BrandAsset/Persona modellen, `AIMessageType` enum behouden (shared met AIPersonaAnalysisMessage + ExplorationMessage), tabellen gedropt via `prisma db push --accept-data-loss`. **Aangepast (~10 bestanden)**: `App.tsx` (routing case + import), `lazy-imports.ts` (lazy export), `brand-assets/[id]/route.ts` (Prisma include), `brand-asset-detail.types.ts` (AISessionSummary + veld), `seed.ts` (cleanup calls + seed data + import), `merge-mission-vision.ts` (S1 block), `CLAUDE.md` + `TODO.md`. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. 0 issues. TypeScript 0 errors.

100. **KBF: Knowledge/Brand Foundation Afronden (4.1–4.4) — compleet** — 4 verbeterpunten in de Brand Foundation / Knowledge sectie. **(4.1) Overzichtspagina stats fix**: Brand Foundation stats toonden stale seed data — `coveragePercentage` werd nooit bijgewerkt na seeding. Fix: API list endpoint berekent nu real-time gewogen validation % uit research method statuses (AI 0.15, Workshop 0.30, Interviews 0.25, Questionnaire 0.30) via shared `src/lib/validation-percentage.ts`. Stats (total, ready, needValidation, avgCoverage) server-side computed, context slaat `stats` op en exposeert deze, `BrandFoundationStats` leest API stats i.p.v. client-side herberekening. DRAFT nu meegeteld in needValidation. Sort-by-coverage werkt in-memory na berekening. Orphaned duplicate `features/brand-asset-detail/utils/validation-percentage.ts` verwijderd (0 imports). Detail endpoint importeert ook uit shared utility. **(4.4) 8 orphaned bestanden verwijderd**: `ContentEditorSection`, `ContentEditMode`, `ResearchMethodsSection`, `ResearchMethodCard`, `AssetOverflowMenu` (brand-asset-detail) + `EnhancedAssetCard`, `EnhancedAssetCardUnified`, `ResearchCoverageBar` (brand-assets). Nul imports in codebase, bevestigd met grep. **(4.2) Completeness score verbeteren**: `JSON.parse()` op `frameworkData` in `AssetCompletenessCard.tsx` gewrapt in try-catch — malformed JSON toont nu lege lijst i.p.v. crash. Completeness al gecentraliseerd (BrandAssetCard + AssetCompletenessCard delen `getAssetCompletenessFields()`). Division-by-zero guard toegevoegd op 3 locaties: `BrandAssetCard.tsx`, `AssetCompletenessCard.tsx`, `ProfileCompletenessCard.tsx` — voorkomt NaN bij lege fields array. **(4.3) AI Exploration session resume — CRITICAL UX fix**: "Continue" en "View Results" pills in sidebar startten altijd een nieuwe sessie via POST /analyze. Fix: nieuw `GET /api/exploration/[itemType]/[itemId]/latest` endpoint haalt meest recente `ExplorationSession` op. `AIExplorationPage` uitgebreid met `resumeSession` prop: IN_PROGRESS hervat chat met bestaande berichten, COMPLETED toont rapport met insightsData + field suggestions. "Start New Exploration" knop in rapport-view. Error recovery: `onComplete` failure valt terug naar error state i.p.v. permanente spinner. Beide wrappers bijgewerkt: `AIBrandAssetExplorationPage` en `AIPersonaAnalysisPage` fetchen latest session via `useQuery(['exploration-latest', itemType, itemId])`. Stale README referentie opgeruimd. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents per item. 0 CRITICAL, 0 openstaande issues. TypeScript 0 errors.

101. **KBF-4.5: Version History Consolidatie — compleet** — Duaal versioning systeem (legacy `BrandAssetVersion` tabel + universeel `ResourceVersion` tabel) geconsolideerd naar alleen `ResourceVersion`. **Content route** (`content/route.ts`): BrandAssetVersion creation verwijderd uit $transaction, vereenvoudigd naar `prisma.brandAsset.update()` + `createVersion()` (MANUAL_SAVE). **Regenerate route** (`regenerate/route.ts`): BrandAssetVersion vervangen door ResourceVersion (AI_GENERATED). **GET detail** (`route.ts`): `versions` include verwijderd uit Prisma query. **Hooks** (`useBrandAssetDetail.ts`): `useAssetVersions` hook verwijderd, alle mutation hooks invalideren nu `versionKeys.list('BRAND_ASSET', id)` inclusief `useToggleLock` (lock route maakt LOCK_BASELINE version). **Verwijderd**: `VersionHistoryTimeline.tsx` (orphaned component), `/api/brand-assets/[id]/versions/route.ts` (legacy endpoint), `/api/brand-assets/[id]/golden-circle/history/route.ts` (orphaned endpoint). **Types opgeruimd**: `VersionDetail`, `VersionsResponse`, `BrandAssetVersion` interface verwijderd (allen ongebruikt). BrandAssetVersion Prisma model bewust behouden voor data preservatie. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. 0 CRITICAL, 0 WARNING. TypeScript 0 errors.

102. **KBF-4.6: Brand Asset PDF Export — compleet** — `exportBrandAssetPdf.ts` volledig herschreven van 40-regel `.txt` stub naar ~590-regel professionele jsPDF PDF export. Emerald header bar + titel + metadata + description + content + framework-specifieke secties. `PdfCtx` builder pattern met herbruikbare helpers (`addField`, `addList`, `addPairs`, `addWrappedText`, `addSectionHeader`, `checkPageBreak`). **13 framework formatters** met volledige velddekking: `fmtPurposeWheel` (6), `fmtGoldenCircle` (3×2), `fmtBrandEssence` (8+ incl. validation scores), `fmtBrandPromise` (11), `fmtMissionVision` (14), `fmtBrandArchetype` (25+), `fmtTransformativeGoals` (MTP + goals met milestones/timeframeHorizon/currentProgress/sdgAlignment + authenticiteit + stakeholders + integratie), `fmtBrandPersonality` (dimensie scores + spectrum sliders + tone dimensions + channel tones + visual expression), `fmtBrandStory` (18+ incl. audience adaptations), `fmtBrandHouseValues` (roots/wings/fire), `fmtSocialRelevancy` (pilaren met statements/scores/evidence + authenticiteit + SDGs + activering), `fmtSwot` (4 lijsten), `fmtPurposeKompas` (3 pilaren). Helpers: `s()` (string+number coercion), `sa()` (string array filter). Footer op elke pagina. **Review**: 3 rondes met telkens 2 onafhankelijke review-agents. Ronde 1: ontbrekende toneDimensions in Brand Personality — gefixt. Ronde 2: `s()` number coercion + 3 ontbrekende velden (timeframeHorizon, currentProgress, sdgAlignment in TransformativeGoals + sdgAlignment in SocialRelevancy) — gefixt. Ronde 3: 0 issues. TypeScript 0 errors.

103. **KBF-4.6b: Brandstyle PDF Export + Orphaned API Stubs — compleet** — `exportBrandstylePdf.ts` client-side jsPDF export voor brandstyle styleguide (6 secties: logo variaties+guidelines+don'ts, kleuren per categorie met swatches, typography met type scale, tone of voice met do/don't, imagery met photography style, design language met graphic elements+patterns+iconography+gradients+layout). Header bar purple-600 + footer elke pagina. 3 orphaned API stubs verwijderd (`/api/brandstyle/export-pdf`, `/api/personas/[id]/export`, `/api/personas/[id]/chat/[sessionId]/export`) — waren 501 stubs, client-side exports bestonden al. Unused `useExportPdf` hook + `exportPdf` API functie verwijderd uit brandstyle hooks/api. TypeScript 0 errors.

104. **KBF-4.7: Design & Interactie Consistency — compleet** — **Framework type checking gerefactored**: 11 losse boolean variabelen (`isPurposeWheel`, `isGoldenCircle`, etc.) + 11 conditionele JSX-blokken + 292-char fallback conditie vervangen door één `renderFrameworkCanvas()` switch-functie in `BrandAssetDetailPage.tsx`. Unused `visibility` (useLockVisibility), `updateContent` (useUpdateContent) imports verwijderd. Dead `useUpdateContent` hook verwijderd uit `useBrandAssetDetail.ts` (was nergens meer geïmporteerd). **Lock state geëvalueerd**: BrandAssetCard overview cards zijn read-only (geen edit actions), `BrandAssetWithMeta` type heeft geen `isLocked` veld → non-issue. **SWOT + PURPOSE_KOMPAS geëvalueerd**: Legacy types niet in canonical 11 assets, `FrameworkSection` fallback volstaat voor backward compat. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. Ronde 1: 1 WARNING (dead useUpdateContent hook) — gefixt. Ronde 2: 0 issues. TypeScript 0 errors.

105. **COMP: Competitors Analysis Module — compleet** — Volledige implementatie van de Competitors module in 4 fases. **Fase 0 (Schema+Seed)**: Prisma modellen `Competitor` (30+ velden) + `CompetitorProduct` join table, enums `CompetitorTier` (DIRECT/INDIRECT/ASPIRATIONAL) + `CompetitorStatus` (DRAFT/ANALYZED/ARCHIVED), seed: 3 demo-concurrenten (BrandBuilder Pro/StrategyHive/MarketPulse AI), cache keys. **Sessie A (Backend)**: 7 API route files (12 endpoints: CRUD + lock + refresh + products linking + analyze/url), AI prompt `competitor-analysis.ts` met Gemini 3.1 Pro voor gestructureerde extractie, types (CompetitorWithMeta, CompetitorDetail, AnalyzeJobResponse, CreateCompetitorBody, UpdateCompetitorBody), constants (ANALYZE_STEPS, TIER/STATUS_BADGES), API client (10 fetch functies), 12 TanStack Query hooks + competitorKeys, Zustand useCompetitorsStore. **Sessie B (Frontend)**: ~17 componenten — overview (CompetitorsOverviewPage + CompetitorCard + stats), analyzer (CompetitorAnalyzerPage 2-tab URL/Manual + AnalyzingCompetitorModal 8-stap), detail (CompetitorDetailPage 2-kolom layout + 5 secties: CompanyOverview/Positioning/Offerings/StrengthsWeaknesses/BrandSignals + 4 sidebar: CompetitiveScoreCard/QuickActionsCard/SourceInfoCard/LinkedProductsCard + ProductSelectorModal). **Fase 2 (Integratie)**: Sidebar Swords icon in KNOWLEDGE sectie, 3 routing cases in App.tsx, brand context competitor landscape in AI prompts, dashboard stats + global search. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. Fixes: nullable fields (Zod `.nullable()` + `|| null`), dedup strengths/weaknesses, createdById op POST, typed store (`AnalyzeJobResponse | null`), double spacing fix (`mb-6` verwijderd uit secties), console.log cleanup. 0 CRITICAL remaining, 0 TypeScript errors.

106. **OVR: Brand Asset Overlap Reductie — compleet** — Significante veld-overlap tussen brand assets gereduceerd zonder assets te mergen of data te verliezen. **Stap 1 (Archetype vereenvoudigd)**: Voice & Messaging (Card 3) en Visual Expression (Card 4) verwijderd uit `BrandArchetypeSection.tsx` (~800→~620 regels). Info-banner: "Voice, tone, and visual expression are defined in the Brand Personality asset." 10 velden `@deprecated` in `BrandArchetypeFrameworkData`. Completeness 12→8 velden in `AssetCompletenessCard.tsx`. AI export (`brand-context.ts`): 10 voice/visual velden verwijderd uit `formatBrandArchetype()`. AI Exploration: 3 config-bronnen gesynchroniseerd (seed/config-resolver/frontend) — dimensies 7→5, field suggestions 16→12, prompts herzien. `buildAutoFillData()` exclusief deprecated velden. **Stap 2 (Essence vs Promise)**: Info-callouts in `BrandEssenceSection.tsx` ("who your brand IS") en `BrandPromiseSection.tsx` ("what you DELIVER"). Benefit/value beschrijvingen aangescherpt: Essence identity-lens, Promise commitment-lens. AI export: "(Identity)" labels op Essence benefits, "(Commitment)" labels op Promise values. **Stap 3 (AI Deduplicatie)**: ProofPoints source-labeling over 4 assets: "Identity evidence" (Essence), "Delivery evidence" (Promise), "Evidence (Brand Story)", "Evidence (Social Relevancy)". AI instructienoot in `prompt-templates.ts`: "Prioritize Brand Personality for tone/voice guidance." **Stap 4 (JSDoc)**: 13 framework type interfaces voorzien van strategische scope beschrijvingen. AuthenticityScore (TG: goal validation) vs SocialRelevancyAuthenticityScores (SR: greenwashing prevention) onderscheid gedocumenteerd. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents. Ronde 1: 1 CRITICAL (stale seed-exploration-configs.ts) + 2 WARNING + 1 MINOR — alle gefixt. Ronde 2: 0 nieuwe issues. ~12 bestanden gewijzigd. TypeScript 0 errors.

107. **RMD: Research Methods Deactivation — compleet** — INTERVIEWS, WORKSHOP, QUESTIONNAIRE (brand assets) en USER_TESTING (personas) gedeactiveerd. Alleen AI_EXPLORATION blijft actief. Validation percentage gedeactiveerd (altijd 0). Alle code behouden voor later hergebruik. **Centrale toggle**: `ACTIVE_RESEARCH_METHOD_TYPES` in `canonical-brand-assets.ts` (alleen `AI_EXPLORATION`). `computeValidationPercentage()` in `validation-percentage.ts` retourneert altijd 0 (originele logica als comment bewaard). **Provisioning**: `workspaces/route.ts`, `auth.ts`, `personas/route.ts`, `personas/[id]/duplicate/route.ts`, `brand-assets/[id]/duplicate/route.ts` — allen alleen AI_EXPLORATION. **UI filtering**: `AssetResearchSidebarCard` (header "Research", progress bar verwijderd), `ResearchSidebarCard` persona (idem), `BrandAssetCard` (validation pill verborgen, VALIDATION_METHODS gefilterd), `PersonaCard` (accordion gefilterd op active, validation pill verborgen), `BrandFoundationStats` (Avg. Coverage stat verwijderd, grid 4→3), `BrandAssetDetailPanel` (validation/methods secties verborgen), `AssetDetailHeader` + `PersonaDetailHeader` (method counts verwijderd). **API**: `research/method-status` gefilterd, `research/custom/methods` gefilterd, `research-constants.ts` METHOD_STATUS_CONFIG gefilterd, `brand-asset-builder.ts` inline validation → 0. **Dashboard**: fake coverage % verwijderd uit attention items. **Persona filter**: ready/needs_work nu op AI_EXPLORATION completion i.p.v. validation %. **Review**: 3 rondes met telkens 2 onafhankelijke review-agents (6 agents totaal). Ronde 1: 5 issues gefixt. Ronde 2: 4 issues gefixt. Ronde 3: 0 issues — verificatie geslaagd. ~18 bestanden gewijzigd. TypeScript 0 errors. **Re-activeren**: methods terug in `ACTIVE_RESEARCH_METHOD_TYPES`, `computeValidationPercentage()` body herstellen, UI filtert automatisch mee.

108. **OVR-B: Brand Asset Overlap Reductie Fase B — compleet** — Kruisverwijzingen, guidance banners, SDG consolidatie en AI config differentiatie. **B1 (CompanionValuesPanel)**: Nieuw `CompanionValuesPanel.tsx` in `shared/` — collapsible panel dat companion asset's 3 Aaker-waarden read-only toont (Package/Heart/Crown iconen). Brand Essence toont Brand Promise waarden, Brand Promise toont Brand Essence waarden. Companion data lookup in `BrandAssetDetailPage.tsx` via `useBrandAssetsQuery` + `useMemo`, slug-based companion resolution met JSON.parse try-catch. Vervangt tekst-only info banners in beide secties. **B2 (ProofPointsGuidanceBanner)**: Nieuw `ProofPointsGuidanceBanner.tsx` in `shared/` — amber guidance banner met asset-specifieke tekst voor 4 assets (essence: identity evidence, promise: delivery proof, story: narrative milestones, social-relevancy: impact evidence). Geplaatst boven proof points in BrandEssenceSection, BrandPromiseSection, BrandStorySection, SocialRelevancySection. **B3 (SDG Consolidatie)**: Lokale `UN_SDGS` constant in TransformativeGoalsSection verwijderd, vervangen door gedeelde import uit `social-relevancy-constants.ts` (met kleuren). SDG toggle buttons en read-mode tags tonen nu dynamische `sdg.color` via inline styles (Tailwind purge safe). Blauwe kruisverwijzing-banners toegevoegd in TransformativeGoalsSection ("see Social Relevancy") en SocialRelevancySection ("see Transformative Goals"). **B4 (AI Config Differentiatie)**: Brand Essence "Value Landscape" dimensie-vraag gedifferentieerd (identity lens: "who the brand IS"). Brand Promise "Value Layers" dimensie-vraag gedifferentieerd (commitment lens: "what it delivers"). Field suggestion hints voor functional/emotional/self-expressive gedifferentieerd in config-resolver.ts en seed.ts. Proof points hints asset-specifiek gemaakt over 4 assets. `sdgAlignment` field suggestion toegevoegd aan Transformative Goals config. **Review**: 3 rondes met telkens 2 onafhankelijke review-agents. 5 issues gevonden en gefixt (unused companionSlug prop, hardcoded SDG teal in read mode, dead onNavigate prop, missing useMemo, dead slug field in CompanionData). Ronde 3: 0 issues. 2 nieuwe bestanden, ~8 gewijzigde bestanden. TypeScript 0 errors.

109. **CSB-UX: Campaign Strategy Builder UX verbeteringen — compleet** — 3 verbeteringen aan de campaign strategy generatie flow. **(1) Streaming fix**: `createClaudeStructuredCompletion` in `ai-caller.ts` geconverteerd van `client.messages.create()` naar `client.messages.stream()` + `stream.finalMessage()`. Fixt de Anthropic SDK "Streaming is required for operations that may take longer than 10 minutes" error bij Claude Opus met maxTokens 32000. Alle downstream logica (truncation detectie, JSON parsing) ongewijzigd — `finalMessage()` retourneert hetzelfde `Message` object. **(2) Pipeline stap beschrijvingen**: Elke van de 6 pipeline stappen in `StrategyStep.tsx` heeft nu een `description` veld dat uitlegt wat er gebeurt (bijv. "Two independent AI models each generate a complete campaign journey variant..."). Beschrijving zichtbaar bij running/complete/error status, status-tekst naast titel in kleur-gecodeerde span. **(3) Campaign detail layout**: `StrategyResultTab.tsx` blueprint format van 4-tab layout (Overview/Strategy/Journey/Channel Plan) naar single-page layout. Overview blokken (stats, strategic intent, variant comparison, persona validation) vast bovenaan. Secties verticaal gestapeld: Journey Map → Campaign Strategy → Channel & Media Plan. `BLUEPRINT_SUB_TABS` constant en ongebruikte icon imports verwijderd. Legacy format behoudt eigen tabs. 3 bestanden gewijzigd. TypeScript 0 errors.

110. **CSB-DEL: Deliverables Auto-Populate + Journey Toolbar — compleet** — 2 features: auto-populate deliverables vanuit blueprint asset plan + zoom toolbar voor journey matrix. **(1) createDeliverablesFromBlueprint()**: Shared helper in `strategy-chain.ts` — verwijdert stale NOT_STARTED deliverables (zonder gegenereerde content), creëert nieuwe Deliverable records met rich metadata in `settings` Json veld (channel, phase, targetPersonas, brief met objective/keyMessage/toneDirection/CTA/contentOutline, productionPriority, estimatedEffort). Aangeroepen vanuit `saveBlueprintToCampaign()` in generate route en wizard launch route (met fallback naar simpele title+type deliverables). **(2) DeliverableRow UI verrijkt**: Channel badge (gray), priority dot (emerald/amber/gray voor must-have/should-have/nice-to-have), effort label (Low/Med/High). `DeliverableBriefSettings` type + `settings` veld op `DeliverableResponse`. GET + POST deliverables response uitgebreid met `settings`. **(3) JourneyMatrixSection toolbar**: `MatrixToolbar` sub-component met fit-to-screen (Maximize2), zoom out (Minus), percentage display, zoom in (Plus). CSS `transform: scale()` op grid element met 150ms transition. Zoom range 50-150%, step 10%. `handleFitToScreen` berekent ideale zoom uit container/grid ratio. `data-matrix-scroll` + `data-matrix-grid` attributen voor DOM selectie. **Bestanden**: strategy-chain.ts (helper), generate/route.ts (call helper), wizard/launch/route.ts (call helper met fallback), deliverables/route.ts (settings in response), campaign.ts (types), DeliverableRow.tsx (metadata UI), JourneyMatrixSection.tsx (toolbar+zoom). TypeScript 0 errors.

111. **CGT: Campaign Goal Types Expansion (4→15) — compleet** — Campagnedoeltypen uitgebreid van 4 naar 15 types in 4 categorieën met time-binding gedrag en AI guidance doorvoer door de volledige 7-staps strategie-pipeline. **Nieuw bestand**: `src/features/campaigns/lib/goal-types.ts` — centraal bestand met 15 GoalTypeDefinitions in 4 GoalCategories (Growth & Awareness, Engagement & Loyalty, Brand & Culture, Conversion & Activation), TimeBinding type (`time-bound`/`always-on`/`hybrid`), GOAL_LABELS (incl. 4 legacy mappings BRAND/PRODUCT/CONTENT/ENGAGEMENT), getTimeBinding(), getGoalTypeGuidance() met strategische AI guidance per type. **Type**: CampaignGoalType union uitgebreid naar 19 waarden (15 nieuw + 4 legacy). GoalTypeDefinition.id getypt als CampaignGoalType (geen unsafe cast). **SetupStep**: Goal selector gegroepeerd per categorie met h4 headers + 2-col grids. Datumvelden conditioneel: `always-on` verborgen, `time-bound` verplicht met "(required)" label, `hybrid` optioneel met "(optional)" label. **Store**: setCampaignGoalType wist datums bij switch naar always-on. canProceed() enforced datums + endDate >= startDate voor time-bound goals. **AI Pipeline**: Goal-specifieke guidance geïnjecteerd in alle 7 stappen (1: Strategy Architect, 2a: Architect A, 2b: Architect B, 3: Persona Validator, 4: Strategy Synthesizer, 5: Channel Planner, 6: Asset Planner) + regeneration flow. **Deliverables**: 5 nieuwe types (career-page, job-ad-copy, employee-story, employer-brand-video, impact-report), categorie hernoemd "PR & Communications" → "PR, HR & Communications". DeliverablesStep 4 ontbrekende icons toegevoegd (Briefcase, UserPlus, Users, Leaf). **PromptSection**: GOAL_LABELS voor human-readable display i.p.v. raw ID. **Seed**: 4 campaigns bijgewerkt naar nieuwe goal type IDs (REBRANDING, PRODUCT_LAUNCH, THOUGHT_LEADERSHIP, BRAND_AWARENESS). **Schema**: campaignGoalType comment bijgewerkt. **Defaults**: strategy-chain.ts fallback 'BRAND' → 'BRAND_AWARENESS'. **Backward compat**: Legacy types (BRAND, PRODUCT, CONTENT, ENGAGEMENT) in union type + GOAL_LABELS + getGoalTypeGuidance(). **Review**: 4 rondes met telkens 2 onafhankelijke review-agents (8 agents totaal). 1 CRITICAL + 6 WARNING + 11 MINOR gevonden en gefixt. Finale ronde: 0 CRITICAL, 0 WARNING. 12 bestanden gewijzigd/aangemaakt. TypeScript 0 errors.

112. **VRR: Variant Review UX Redesign — compleet** — Variant review scherm herschreven van minimale data-weergave naar rijke interactieve review ervaring. **(1) Data fix**: `normalizePersonaValidation()` in `strategy-chain.ts` — clampt `overallScore` naar 1-10, normaliseert `preferredVariant` naar uppercase A/B, garandeert arrays en strings met defaults. Toegepast in `generateStrategyVariants()` en `generateCampaignBlueprint()`. **(2) Store uitbreiding**: `useCampaignWizardStore.ts` — `endorsedPersonaIds: string[]` (persona endorsement toggle), `strategyRatings: Record<string, 'up' | 'down'>` (strategy element ratings), `togglePersonaEndorsement()` en `setStrategyRating()` actions. Reset in `clearPhaseData()` en via `INITIAL_STATE`. **(3) 3 nieuwe sub-componenten**: `VariantStrategyOverview.tsx` (strategie-fundering met campagnethema, positionering, messaging hierarchy, JTBD framing, strategische keuzes — elk met thumbs up/down rating buttons via `setStrategyRating(key)`), `VariantDetailCard.tsx` (per-variant journey detail met collapsible fasen, KPI tags, persona phase data, touchpoints met kanaal/content type/bericht/persona relevance), `PersonaFeedbackCard.tsx` (per-persona feedback met score badge, preferred variant badge, feedback tekst, resonates/concerns/suggestions als gekleurde tags, endorsement toggle button). **(4) VariantReviewView.tsx herschreven als orchestrator**: Strategy overview → side-by-side variant detail cards → persona feedback sectie → free-text textarea → "Generate Definitive Strategy" CTA. **(5) Structured feedback compilatie**: `compile-structured-feedback.ts` — combineert strategy element ratings (APPROVED/NEEDS CHANGE), endorsed persona feedback (naam, score, preferred variant, feedback, resonates, concerns, suggestions), en vrije tekst tot markdown-geformateerde string. Geïntegreerd in `handleSynthesize` in `StrategyStep.tsx` via `getState()` pattern. **(6) Performance + accessibility fixes**: Stale closure fix (`variantFeedback` via `getState()` i.p.v. closure), onnodige Zustand subscription verwijderd (voorheen re-render bij elke toetsaanslag), null guards voor AI-gegenereerde data (`messagingHierarchy`, `jtbdFraming`, `strategicChoices` met `??` defaults), `aria-pressed` op alle toggle buttons, empty personaName guard. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). 7 fixes toegepast. 0 CRITICAL, 0 openstaande issues. 7 bestanden gewijzigd/aangemaakt. TypeScript 0 errors.

113. **CDT: Campaign Detail Tab Restructure — compleet** — Overview tab verwijderd uit campagne detailpagina (blueprint format). Campaign Timeline is nu een aparte tab (eerste tab, default). `BlueprintOverviewSection.tsx` verwijderd (orphaned, 0 imports). EmptyState fallbacks toegevoegd voor alle 3 blueprint tabs (timeline, strategy, channel-plan) wanneer data ontbreekt. Store type union `'overview'` → `'timeline'`, default waarde bijgewerkt. JSDoc comment bijgewerkt. **Verwijderd**: `BlueprintOverviewSection.tsx` (136 regels). **Gewijzigd**: `StrategyResultTab.tsx`, `useCampaignStore.ts`. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). Ronde 1: 1 CRITICAL (orphaned file) + 2 WARNING (empty states) + 1 MINOR (JSDoc) — alle gefixt. Ronde 2: ALL CLEAR. TypeScript 0 errors.

114. **ARENA: Are.na API Context Enrichment — compleet** — Are.na v2 REST API als culturele/strategische context-verrijking voor de campagne strategie-generatie pipeline. **Nieuwe bestanden**: `src/lib/arena/arena-client.ts` (Are.na API client: search, context fetching, prompt formatting, graceful failure, `ARENA_BASE_URL = 'https://api.are.na/v2'`, `SEARCH_PER_PAGE = 8`, `MAX_TOTAL_BLOCKS = 30`, `FETCH_TIMEOUT_MS = 8000`, one-time missing-token warning), `src/lib/arena/arena-queries.ts` (3 parallelle zoekqueries: strategic layer = goal type + brand name, human layer = persona psychographics + pain points, creative layer = brand values + brand name; query length cap 80 chars voor human layer). **Types**: `ArenaEnrichmentTracking` type alias (re-export van `ArenaEnrichmentMeta`), `arenaEnrichment: ArenaEnrichmentTracking | null` op `VariantPhaseResult`, `arenaChannels` op `ContextSelection`. **Pipeline integratie**: Are.na enrichment in alle 3 entry points (`generateStrategyVariants`, `generateCampaignBlueprint`, `regenerateBlueprintLayer`). Arena context alleen geïnjecteerd in Full Variant A/B prompts (creatieve divergentie), NIET in Channel Planner of Asset Planner. Conditional fetch in `regenerateBlueprintLayer`: `needsArenaContext = layer === 'strategy' || layer === 'architecture'` — slaat arena API calls over bij channelPlan/assetPlan regeneratie. **Env**: `ARENA_API_TOKEN` (optioneel, werkt zonder token maar lagere rate limits). **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). Ronde 1: 1 CRITICAL (API v3→v2) + meerdere WARNINGs gefixt. Ronde 2: 0 CRITICAL, 0 WARNING. 5 bestanden gewijzigd/aangemaakt. TypeScript 0 errors.

115. **TLP: Timeline Persona Labels + Filter Bar — compleet** — Persona-informatie zichtbaar gemaakt op campaign deployment timeline kaarten + interactieve filter bar boven het raster. **shared-timeline-cards.tsx**: `CardPersonaInfo` type (personaId, name, colorStyle). `DeliverableCard` uitgebreid met `personas` prop (gekleurde dot+naam pills, "All personas" bij lege array). `TouchpointCard` `personaId`/`personaColor` props vervangen door `personas` prop (inline dots+voornamen). Dead code opgeruimd (`PersonaLegendItem`, `getInitials`, unused `useMemo` import). **DeploymentTimelineSection.tsx**: `personaColorMap` (Map<string, PersonaColorStyle>) blootgesteld vanuit bestaande useMemo. `resolvePersonas()` en `resolveTouchpointPersonas()` helpers (useCallback-wrapped met `[personaNames, personaColorMap]` deps). Filter state: `selectedPersonaIds` + `selectedChannels` (Set<string>, empty = show all). Gefilterde data: `filteredCellLookup`, `filteredTouchpointLookup`, `filteredChannels` via useMemo. `TimelineFilterBar` sub-component (persona toggle pills met gekleurde dot+naam, channel toggle pills, "Clear filters" button). Statische persona legend vervangen door interactieve filter bar. Filters: OR binnen categorie, AND tussen categorieën. Shared deliverables (lege targetPersonas) altijd zichtbaar bij persona filter. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). Ronde 1: key.split→indexOf/slice, useCallback wrappers, dead code cleanup, conditional persona row. Ronde 2: 0 issues. 2 bestanden gewijzigd. TypeScript 0 errors.

116. **ADM: Add Deliverable Modal Enrichment — compleet** — "Add Deliverable" modal verrijkt van 2 velden (title+contentType) naar 7 velden met optionele context metadata. **Type**: `CreateDeliverableBody` uitgebreid met optioneel `settings` object (`phase`, `channel`, `targetPersonas`, `productionPriority: 'must-have'|'should-have'|'nice-to-have'`, `brief.objective`). **API**: Zod schema uitgebreid met `settings` validatie (`.trim().max(200)` op title, `.max(2000)` op objective), settings doorgezet naar `prisma.deliverable.create()`. **UI**: Modal size `sm`→`md`, 2 visuele groepen ("Basics" + "Context (optional)"), dropdown opties afgeleid uit blueprint data (phases uit `journeyPhases`, channels uit `channelPlan.channels`, personas uit `personaPhaseData`), `PRIORITY_OPTIONS` module-level constant aligned met `DeliverableBriefSettings` (`must-have/should-have/nice-to-have`), `addDeliverable.isPending` i.p.v. redundante `isAdding` state, `resetAddModal()` helper, blueprint extractie als gedeelde `useMemo` (vereenvoudigt ook `handleOpenInStudio` en `handleBringToLife`), accessibility fixes (`role="alert"`, `htmlFor`/`id`, `maxLength`). Alle nieuwe velden optioneel — alleen title+contentType verplicht. Hint tekst wanneer geen blueprint beschikbaar. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). 2 CRITICAL + 3 WARNING + 7 MINOR gevonden en gefixt. 3 bestanden gewijzigd. TypeScript 0 errors.

117. **TLR: Timeline Refactor — TouchpointCard verwijderd, persona lanes, deliverable repositioning — compleet** — Deployment timeline vereenvoudigd en verrijkt met 3 features. **(1) TouchpointCard verwijderd**: `shared-timeline-cards.tsx` — gehele `TouchpointCard` component verwijderd (~45 regels). `DeploymentTimelineSection.tsx` — `touchpointCellLookup`, `resolveTouchpointPersonas()`, `normalizeChannel` import, touchpoint summary display allemaal verwijderd. Alleen deliverables op de timeline. **(2) Persona connector lanes**: `personaLanes` useMemo — per persona gekleurde horizontale connectoren over de beats (4px hoog, `firstBeat`→`lastBeat` range). Kleuren via `PersonaColorStyle.activeHex` in `persona-colors.ts` (6 kleuren + SHARED_COLOR). Filter pills gebruiken inline `style={{ backgroundColor }}` i.p.v. Tailwind klassen (Tailwind 4 purge fix). **(3) Deliverable repositioning**: `beatOverrides` state (Map<string, number>) voor handmatige verplaatsing van deliverables naar andere weken. `handleMoveBeat()` callback met Earlier/Later knoppen op `DeliverableCard`. `getItemKey()` gebruikt `title::channel::originalBeatIndex` voor disambiguatie. `schedulerBeatIndex` veld op cellLookup items voor stabiele keying. Cards starten expanded (`useState(true)`). **(4) Add Deliverable button verplaatst**: Van `DeliverablesTab` naar `StrategyResultTab` timeline header (naast regenerate knoppen). `onAddDeliverable` prop verwijderd uit `DeliverablesTab` en `QuickContentDetailPage`. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). 1 CRITICAL (stale collision data na repositioning — TODO), 2 WARNING (non-unieke item key — gefixt, unused PersonaLegendInfo velden — gefixt). 9 bestanden gewijzigd. TypeScript 0 errors.

118. **DFC: Deliverable Flow Connections — compleet** — Visuele pijlen/verbindingen tussen deliverables op de campaign deployment timeline die de content-flow tonen. **(1) Types + schemas**: `FlowConnection` interface (fromTitle, toTitle, connectionType 'sequence'|'amplifies'|'retargets', label?) en `ResolvedFlowConnection` (+ fromBeatIndex, toBeatIndex, sharedPersonas) in `strategy-blueprint.types.ts`. Zod `flowConnectionSchema` + extend `assetPlanLayerSchema`. Gemini `assetPlanResponseSchema` uitgebreid (NIET in required). **(2) AI prompt**: `buildAssetPlannerPrompt` in `campaign-strategy.ts` uitgebreid met flowConnections instructies (3 types, 5-15 connections, exact title match, no circles). **(3) Scheduler**: `resolveFlowConnections()` in `deployment-scheduler.ts` — title→ScheduledDeliverable lookup met `.trim()` normalisatie, canonical `deliverable.title` opslag, shared persona berekening. `computeDeploymentSchedule` retourneert `resolvedConnections`. **(4) SVG overlay**: Nieuw bestand `FlowConnectionsOverlay.tsx` — quadratic Bezier curves (arc boven kaarten, S-curve voor same-beat), arrow markers per type, kleurcodering (gray=sequence, blue=amplifies, amber-dashed=retargets), hover tooltips met foreignObject, `CSS.escape()` voor veilige DOM queries, ResizeObserver voor positie-herberekening, CSS zoom compensatie. **(5) Timeline integratie**: `DeploymentTimelineSection.tsx` — `effectiveResolvedConnections` useMemo (first-match title-to-beat Map, re-resolved met beatOverrides), `hiddenTitles` useMemo (visible+all Sets, alleen hidden als ALLE instances falen), `flowTitleSet`, "Flows" toggle knop, `hoveredFlowTitles` state voor card highlighting. **(6) Card updates**: `shared-timeline-cards.tsx` — `data-flow-id` attribuut, `highlighted` prop (ring-2 ring-blue-400), `hasFlowConnection` indicator icon (ArrowRightLeft), `beatIndex` prop. **(7) Backward compat**: `flowConnections` optioneel op AssetPlanLayer, Zod `.optional()`, oude blueprints zonder flows → graceful no-op, toggle verborgen. **Review**: 3 rondes met telkens 2 onafhankelijke review-agents (6 agents totaal). 7 fixes: CSS selector injection (CSS.escape), dead prop verwijderd, title .trim() normalisatie, first-match Map i.p.v. last-write-wins, hiddenTitles visible+all Set logica, onnodige scroll listener verwijderd, canonical deliverable titles in resolved connections. 7 bestanden gewijzigd/aangemaakt. TypeScript 0 errors.

119. **DTI: Deliverable Timeline Integration — compleet** — Fix: deliverables toegevoegd via "Add Deliverable" modal verschenen niet op de Campaign Timeline. Timeline las alleen `blueprint.assetPlan` (AI-gegenereerd), modal creëerde DB records via POST API — twee databronnen werden nooit samengevoegd. **(1) fetchDeliverables unwrap fix**: `campaigns.api.ts` — pre-existing bug: API retourneert `{ deliverables: [...] }` wrapper maar `fetchDeliverables` unwrapte dit niet → gefixt met `data?.deliverables ?? data ?? []`. **(2) Merge logic**: `StrategyResultTab.tsx` — `mergedAssetPlan` via `React.useMemo`: case-insensitive title dedup (`.trim().toLowerCase()`), guard op `basePlan.deliverables ?? []` voor malformed AI data, `DeliverableResponse` → `AssetPlanDeliverable` conversie met volledige `DeliverableBrief` defaults, `mergedAssetPlan` gebruikt voor stat count + timeline rendering. **(3) Brief fallback**: `CampaignDetailPage.tsx` — `handleOpenInStudio` brief lookup valt terug op deliverable's eigen `settings.brief` met genormaliseerde velden wanneer blueprint geen match heeft. `deliverables` prop doorgegeven aan `StrategyResultTab`. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). Ronde 1: 1 CRITICAL (fetchDeliverables unwrap) + 3 WARNING (brief fallback, case-sensitive dedup, missing guard). Ronde 2: 1 WARNING (defensive `?? []` fallback). Alle gefixt. 3 bestanden gewijzigd. TypeScript 0 errors.

120. **ABF: Auto-fill Brief Fields bij Add Deliverable — compleet** — Bij het handmatig toevoegen van een deliverable via de "Add Deliverable" modal worden nu automatisch `keyMessage`, `toneDirection`, `callToAction` en `contentOutline` afgeleid uit de campaign strategy blueprint. **Nieuw bestand**: `src/features/campaigns/lib/derive-brief.ts` (~130 regels) — `deriveBriefFromBlueprint()` helper met 2-tier derivatie: (1) exacte match in `assetPlan.deliverables` op contentType+phase+channel (3-way match, fallback naar contentType+phase), (2) strategie-fallback: keyMessage uit touchpoint message of `campaignMessage`, toneDirection uit `strategicIntent` (brand_building/sales_activation/hybrid/default) + `positioningStatement`, callToAction uit phase `goal`. `EMPTY_BRIEF` is `Object.freeze`'d tegen mutatie. **API**: Zod schema `brief` in `deliverables/route.ts` uitgebreid met `keyMessage`, `toneDirection`, `callToAction` (`.string().max(2000).optional()`) en `contentOutline` (`.array(z.string()).optional()`). **Types**: `CreateDeliverableBody.settings.brief` in `campaign.ts` uitgebreid met dezelfde 4 optionele velden. **UI**: `CampaignDetailPage.tsx` — `derivedBrief` useMemo reageert op contentType/phase/channel wijzigingen, `handleAddDeliverable` mergt afgeleide brief met user-provided objective, emerald preview panel onder Objective textarea toont Key Message/Tone/CTA/Content Outline (bulleted list) met label "Derived from campaign strategy". **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). Ronde 1: 0 CRITICAL, 5 WARNING (shared mutable EMPTY_BRIEF, missing default tone case, contentOutline niet in preview/visibility check, channel niet in exact match). Alle gefixt. Ronde 2: ALL CLEAR. 4 bestanden gewijzigd/aangemaakt. TypeScript 0 errors.

121. **DND: Drag & Drop voor Deliverable Cards op Campaign Timeline — compleet** — Deliverable cards kunnen nu met drag & drop van weekkolom naar weekkolom verplaatst worden op de deployment timeline. HTML5 Drag API, geen nieuwe dependencies. Bestaande `beatOverrides` + `handleMoveBeat` logica hergebruikt. **shared-timeline-cards.tsx**: `DeliverableCardDragData` interface (itemKey + sourceBeat), `DeliverableCard` uitgebreid met `dragData` prop, `draggable="true"`, `onDragStart`/`onDragEnd` handlers, `isDragging` state (opacity 0.5), `cursor-grab`/`active:cursor-grabbing`, `didDragRef` + `requestAnimationFrame` pattern om click-na-drag expand/collapse toggle te voorkomen. **DeploymentTimelineSection.tsx**: `dragOverBeat` state, `handleDragOver` (preventDefault + highlight), `handleDragLeave` met `e.currentTarget.contains(e.relatedTarget)` check tegen child-element flickering, `handleDrop` (parse JSON, boundary check, `setBeatOverrides`), beat cells krijgen `ring-2 ring-inset ring-teal-400 bg-teal-50/30` highlight bij drag-over, elke `DeliverableCard` ontvangt `dragData` met itemKey + beatIdx. Earlier/Later knoppen blijven als keyboard fallback. Flow connections updaten automatisch (lezen uit cellLookup). **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). Ronde 1: 1 CRITICAL (click-na-drag conflict) + 1 WARNING (dragLeave flickering) — beide gefixt. Ronde 2: ALL CLEAR. 2 bestanden gewijzigd. TypeScript 0 errors.

122. **KFV: Klantreis Flowchart-verrijking op Campaign Timeline — compleet** — Prioriteiten, afhankelijkheden en persona-paden beter zichtbaar gemaakt op de bestaande deployment timeline. **FlowConnectionsOverlay.tsx**: Persona-gekleurde verbindingslijnen (lijnkleur via `resolveEdgeColor()` op basis van gedeelde persona's tussen endpoints, dynamische SVG arrow markers per unieke `activeHex`, `resolveEdgePersonaLabel()` voor persona-naam in tooltip). 3 nieuwe optionele props (`personaColorMap`, `deliverablePersonaMap`, `personaNames`), backward compatible fallback naar connectionType-kleuring. **shared-timeline-cards.tsx**: `STATUS_STYLES` constant + `status` prop op `DeliverableCard` — COMPLETED groene badge (CheckCircle2), IN_PROGRESS blauwe badge (Loader2 animate-spin), NOT_STARTED geen badge. Emerald border accent bij completed cards. **DeploymentTimelineSection.tsx**: Module-level `PRIORITY_ORDER` constant + `resolveDeliverableStatus()` helper. Priority-sortering in `cellLookup` useMemo (must-have eerst, dan should-have, dan nice-to-have, dan suggestedOrder). `deliverableStatuses` prop doorvoer naar DeliverableCard. `deliverablePersonaMap` useMemo (title → targetPersonas lookup). Persona connector lanes `h-[3px]` → `h-1` (4px), filter-based dimming (opacity 0.08 voor niet-geselecteerde). **StrategyResultTab.tsx**: `deliverableStatuses` useMemo bouwt `Map<string, string>` uit DB deliverables (case-insensitive title matching). **Review**: 3 rondes met telkens 2 onafhankelijke review-agents (6 agents totaal). Ronde 1: code quality verbeteringen. Ronde 2: 1 CRITICAL (status prop niet gedestructureerd) — gefixt. Ronde 3: ALL CLEAR. 4 bestanden gewijzigd. TypeScript 0 errors.

123. **CIV: Creative Inspiration Visibility + Goal-Specific Strategic Insights — compleet** — Twee features: (1) real-time "Injecting creative inspiration..." feedback tijdens Are.na API enrichment in de strategy pipeline, en (2) rijke, gestructureerde strategische inzichten per campagnedoeltype in AI prompts en UI. **Feature 1 (Enrichment zichtbaarheid)**: `strategy-chain.ts` — enrichment SSE events (`running`/`complete`/`skipped`) rond `fetchArenaContext()`, met proper `PipelineEvent` discriminated union type (`PipelineStep | EnrichmentEvent`) i.p.v. unsafe `as unknown as PipelineStep` casts. `useCampaignWizardStore.ts` — `enrichmentStatus`, `enrichmentBlockCount`, `enrichmentQueries` state + `setEnrichmentStatus()` action + resets in `resetPipeline()`/`clearPhaseData()`. `PipelineProgressView.tsx` — `EnrichmentIndicator` sub-component (violet-accented rij: Loader2 spin bij running, Palette icon + block count bij complete, gray bij skipped). `StrategyStep.tsx` — SSE event handler routeert enrichment events naar store, passt enrichment props door naar PipelineProgressView. **Feature 2 (Goal insights)**: `goal-types.ts` — `GoalTypeStrategicInsights` interface + `getGoalTypeStrategicInsights()` met hardcoded strategische data voor alle 15 doeltypen (KPIs met benchmarks, pitfalls, channelEmphasis primary/secondary/avoid, contentFormats, timingConsiderations, funnelEmphasis — alle sommen tot 100%) + 4 legacy aliases via referenties (BRAND→BRAND_AWARENESS, etc., ~400 regels deduplicatie). `campaign-strategy.ts` — `buildGoalInsightsPromptSection()` helper formatteert data als markdown prompt-sectie, geïnjecteerd in alle 6 prompt builders (Variant A/B, Persona Validator, Strategy Synthesizer, Channel Planner, Asset Planner). `StrategyStep.tsx` — `GoalInsightsPreview` collapsible teal-accented card (KPI pills met TrendingUp icon, channel emphasis primary emerald/secondary gray, funnel allocation bar met 4 gekleurde segmenten blue/amber/emerald/violet + percentage labels), getoond tijdens Phase A generatie (collapsed) en variant review (collapsed). **Types**: `campaign-wizard.types.ts` — `EnrichmentEvent` + `PipelineEvent` discriminated union. **Review**: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). Ronde 1: 2 MEDIUM issues (unsafe casts, legacy duplication) — gefixt. Ronde 2: ALL CLEAR. 7 bestanden gewijzigd. TypeScript 0 errors.

124. **AEC-AP: AI Exploration Config Auto-Provisioning — compleet** — Settings > AI Configuration toonde slechts 7 van de 13 verwachte configs omdat ontbrekende configs niet in de DB bestonden. Fix: lazy auto-provisioning in GET endpoint `/api/admin/exploration-configs`. Bij elke GET worden ontbrekende configs (afgeleid uit `CANONICAL_BRAND_ASSETS` + persona + product = 13 totaal) automatisch aangemaakt via `prisma.explorationConfig.createMany({ skipDuplicates: true })` met systeem-defaults uit `getSystemDefault()`. `getSystemDefault()` geëxporteerd uit `config-resolver.ts` (was private). `Prisma.JsonNull` voor nullable Json velden, `JSON.parse(JSON.stringify())` voor dimensions/fieldSuggestionsConfig type compatibiliteit. Review: 2 rondes met telkens 2 onafhankelijke review-agents (4 agents totaal). 0 CRITICAL, race condition mitigated door `skipDuplicates` + `@@unique` constraint. 2 bestanden gewijzigd. TypeScript 0 errors.


125. **BSI: Business Strategy Improvements Session 5 — compleet** — Session 5 van het 5-sessie Business Strategy verbeterplan afgerond: Strategy Templates (5.1), SWOT Section (5.2), AI Strategy Review (5.3), PDF Export (5.4). **5.2 SWOT**: `SwotSection.tsx` — 2x2 grid (emerald/red/blue/amber) met inline add/remove per kwadrant, `swot/route.ts` PATCH endpoint met Zod validatie. **5.3 AI Review**: `AiReviewPanel.tsx` — slide-out panel met backdrop + Escape key, Claude-powered strategy analyse via `ai-review/route.ts` met Zod response validatie (502 bij ongeldig AI formaat), `AiReviewResponse` type (overallScore, summary, findings per dimensie, topPriorities). **5.4 PDF Export**: `exportStrategyPdf.ts` — jsPDF client-side PDF (header bar, meta, context, SWOT, objectives+KRs, focus areas, milestones, linked campaigns), Export PDF knop in overflow menu. **Review fixes (3 rondes, 6 agents)**: AiReviewPanel stale state reset + backdrop + Escape + responsive + useCallback verwijderd + optional chaining; ai-review route Zod validatie + shared types import + veilige keyAssumptions cast; SwotSection race condition fix (isPending guard) + betere React keys; exportStrategyPdf dead PdfCtx verwijderd + try-catch + sa() null safety; swot route ownership-check voor lock-check; StrategyDetailPage ongebruikte useLockVisibility verwijderd. 10 bestanden gewijzigd. TypeScript 0 errors.

126. **PFL: Per-Feature LLM Provider Selection — compleet** — Workspace-beheerders kunnen nu per AI-feature kiezen welk LLM-model wordt gebruikt via Settings > AI Models. **Database**: `WorkspaceAiConfig` Prisma model (`workspaceId + featureKey` unique, provider String, model String). **Feature registry**: `src/lib/ai/feature-models.ts` (client-safe: `AiFeatureKey` 10-key union, `AiProvider` union, `ResolvedModel`, `AI_FEATURES`, `AVAILABLE_MODELS`, `FEATURE_CATEGORIES`, `getFeatureDefinition()`) + `src/lib/ai/feature-models.server.ts` (server-only: `resolveFeatureModel()` DB lookup → provider validatie → fallback, `assertProvider()` defense-in-depth). **API**: `src/app/api/settings/ai-models/route.ts` GET (session+workspace check) + PATCH (owner/admin role check, Zod, provider/model whitelist validatie). **UI**: `src/features/settings/components/ai-models/AiModelsTab.tsx` — 10 features in 3 categorieën, model dropdown, custom badge, reset. **10 features**: `persona-chat` (anthropic+openai), `campaign-strategy` (anthropic — Variant A), `campaign-strategy-b` (google — Variant B), `content-generate` (anthropic+openai+google), `content-quality` (anthropic+openai), `content-improve` (anthropic+openai), `trend-synthesis` (anthropic), `product-analysis` (google), `competitor-analysis` (google), `workshop-report` (openai). **assertProvider**: 5 single-provider call sites (products url+pdf, competitors url+refresh, workshop report). **Review**: 4 rondes, 8 subagents. Finale: 0 CRITICAL, 0 WARNING. TypeScript 0 errors.

127. **DOA: Developer-Only Autorisatielaag — compleet** — De Administrator/Developer-sectie in Settings (AI Models + AI Configuration) is nu afgeschermd zodat alleen de developer er toegang toe heeft, niet workspace owners/admins. **Env var**: `DEVELOPER_EMAILS` in `.env.local` (komma-gescheiden, server-only). **Server helper**: `src/lib/developer-access.ts` — `isDeveloperEmail(email)` check tegen env var Set, `requireDeveloper()` async helper (session + email validatie, retourneert session of null). **Client endpoint**: `src/app/api/auth/developer-check/route.ts` — GET retourneert `{ isDeveloper: boolean }`, geen 401 voor niet-ingelogde gebruikers (UI-friendly). **Shared hook**: `src/hooks/use-developer-access.ts` — `useDeveloperAccess()` React Query hook met 5min staleTime, `queryKey: ['developer-access']`. **11 API handlers beschermd**: `api/settings/ai-models` (GET+PATCH), `api/admin/exploration-configs` (GET+POST), `api/admin/exploration-configs/[id]` (GET+PUT+DELETE), `api/admin/exploration-configs/[id]/knowledge` (GET+POST), `api/admin/exploration-configs/[id]/knowledge/[itemId]` (PUT+DELETE). **UI**: `SettingsSubNav.tsx` — Developer-sectie conditionally rendered met `isDeveloper === true` (strict). `SettingsPage.tsx` — `shouldRedirect` met `isDeveloper !== true`, useEffect synct store terug naar `'account'`, `effectiveTab` voorkomt developer-content render. Label gewijzigd van "Administrator" naar "Developer". **Review**: 2 rondes, 4 subagents. Finale: 0 CRITICAL, 0 WARNING. TypeScript 0 errors.
128. **CSB-DM: Dual Model Selection Campaign Strategy — compleet** — Variant B van de campaign strategy pipeline was hardcoded op `GEMINI_PRO`. Nu configureerbaar via Settings > AI Models. **Feature registry**: `'campaign-strategy-b'` toegevoegd aan `AiFeatureKey` union in `feature-models.ts`, nieuw `AiFeatureDefinition` entry (default: google/gemini-3.1-pro-preview, supports anthropic+openai+google). Bestaand entry label hernoemd naar "Campaign Strategy — Variant A". **Pipeline**: `strategy-chain.ts` — `generateStrategyVariants` en `generateCampaignBlueprint` resolven nu beide features parallel via `Promise.all([resolveFeatureModel('campaign-strategy'), resolveFeatureModel('campaign-strategy-b')])`. Step 1b `createGeminiStructuredCompletion` vervangen door `createStructuredCompletion(resolvedProviderB, resolvedModelB, ...)`. `modelsUsed` array bijgewerkt. Ongebruikte `GEMINI_PRO` constant en `fullVariantResponseSchema` import verwijderd. `regenerateBlueprintLayer` ongewijzigd (genereert slechts één variant). **UI**: Geen wijzigingen nodig — `AiModelsTab.tsx` leest dynamisch uit `AI_FEATURES`, nieuwe entry verschijnt automatisch in Chat & Analysis categorie. TypeScript 0 errors.
129. **SQE: Strategy Quality Enhancement — Free Phase — compleet** — 3 nieuwe enrichment-bronnen toegevoegd aan de campaign strategy-generatie pipeline naast bestaande Are.na integratie. **(1) BCT (Behavior Change Techniques)**: `src/lib/bct/bct-taxonomy.ts` (32 technieken uit HBCP Taxonomy v1) + `src/lib/bct/goal-bct-mapping.ts` (15 campagnedoeltypen → 3-5 BCTs met COM-B component, `getBctContext()` retourneert markdown). Puur lokale data, geen API calls. **(2) Exa API**: `src/lib/exa/exa-client.ts` (neural semantic search, `fetchExaContext()`, 8s timeout, graceful failure) + `src/lib/exa/exa-queries.ts` (`buildExaQueries()` bouwt 2-3 queries: cross-industry analogy, cultural tension, trend-driven). Env var: `EXA_API_KEY` (optioneel, 1000 gratis/maand). **(3) Semantic Scholar API**: `src/lib/semantic-scholar/scholar-client.ts` (`fetchScholarContext()`, citation filter >10, top 5 papers) + `src/lib/semantic-scholar/scholar-queries.ts` (`buildScholarQueries()`: behavioral science + effectiveness). Env var: `S2_API_KEY` (optioneel, unauthenticated OK). **Variant differentiatie**: Variant A = "Expected" (evidence-based: scholarContext + bctContext + arenaContext), Variant B = "Unexpected" (creatieve provocaties: exaContext + arenaContext). Asymmetrie gedocumenteerd met comments. **Pipeline**: Alle 3 entry points (`generateStrategyVariants`, `generateCampaignBlueprint`, `regenerateBlueprintLayer`) voeren enrichments parallel uit via `Promise.all`. SSE enrichment events (`running`/`complete`/`skipped`) met per-bron breakdown. **Goal insights**: `GoalTypeStrategicInsights` uitgebreid met `behavioralInsights` (comBTarget, primaryBCTs, behavioralBarrier, desiredBehavior) voor alle 15 doeltypen. **UI**: `EnrichmentSources` shared type, `SourcePill` sub-component in `PipelineProgressView.tsx` toont per-bron indicators (Are.na, Exa, Scholar, BCT). Runtime SSE validatie met typeof/Array.isArray guards. **Types**: `EnrichmentSources` interface, `EnrichmentEvent` type, `PipelineEvent` discriminated union, `ContextSelection` uitgebreid met exaQueries/scholarPaperCount/bctGoalType. **Review**: 3 rondes met telkens 2 onafhankelijke review-agents (6 agents totaal). 7 fixes: doubled BCT header, dead else branch, missing SSE events in blueprint, unsafe SSE casts, BCT double-injection in prompts, shared type extractie. 0 CRITICAL, 0 openstaande issues. 6 nieuwe bestanden, 8 gewijzigde bestanden. TypeScript 0 errors.

130. **EXP: Export Data Completeness Fixes — compleet** — 10 data-gaps in export pipeline geïdentificeerd en opgelost over ~14 bestanden. Gaps zorgden ervoor dat waardevolle data (kwaliteitsscores, afbeeldingen, persona-validatie, strategie-details) niet in exports terechtkwam. **(1) Campaign Strategy PDF** (`exportCampaignStrategyPdf.ts`): persona phase data, variant comparison scores, confidence breakdown, deliverables met priority/effort. **(2) Workshop PDF+JSON** (`exportWorkshopPdf.ts`, `exportWorkshopJson.ts`): foto's, agenda items, scheduled datetime. **(3) Persona PDF** (`exportPersonaPdf.ts`): techStack tags, decisionCriteria lijst. **(4) AI Exploration PDF** (`exportExplorationPdf.ts`): currentValue op field suggestions, status badge (accepted/rejected), FieldSuggestionStatus lowercase fix. **(5) Brand Alignment PDF** (`exportAlignmentPdf.ts`): resolved issues sectie, source item referenties. **(6) Interview JSON** (`exportInterviewJson.ts`): selectedAssets veld. **(7) Studio Content exports** (`export-studio-content.ts`): ExportContext uitgebreid met `qualityScore`, `qualityMetrics`, `checklistItems` — quality sectie in PDF (score + metrics tabel + checklist), HTML (table + checkboxes), TXT (plain text). **(8) Brandstyle PDF** (`exportBrandstylePdf.ts`): brandImages sectie (context label, alt text, truncated URL). **(9) Version History PDF** (`export-studio-content.ts`): VersionHistoryExportContext uitgebreid met `qualityMetrics` per versie, rendering in PDF. **(10) Trend Radar PDF+JSON** (`exportTrendRadarPdf.ts`, `exportTrendRadarJson.ts`): imageUrl in overview (truncated) + detail PDF + JSON export. **Review**: 2 onafhankelijke review-agents, 0 echte issues (1 false positive). TypeScript 0 errors.

### ⚠️ TECHNISCHE SCHULD
- **Adapter pattern** — tijdelijk, componenten moeten op termijn direct DB-model gebruiken
- **mock-to-meta-adapter.ts** — reverse adapter (mock→API format) voor Brand Foundation. Verdwijnt wanneer context direct BrandAssetWithMeta levert.
- **~~BrandAssetsViewSimple.tsx~~** — ✅ Verwijderd.
- **`as any` casts** — ✅ Opgeruimd (47 → 0 in src/). Nog 146 `: any` type annotations in 68 bestanden (parameters/variabelen) — toekomstige pass.
- **~~NEXT_PUBLIC_WORKSPACE_ID~~** — ✅ Volledig verwijderd uit code en .env bestanden.
- **~~Hardcoded Tailwind colors~~** — ✅ BrandFoundationHeader en BrandAssetCard gemigreerd naar design tokens.
- **~~Geen Error Boundary~~** — ✅ ErrorBoundary beschikbaar via shared barrel, top-level wrap in App.tsx.
- **~~S1 vs S2 AI systeem overlap~~** — ✅ Opgelost. S1 (AIBrandAnalysisSession) volledig verwijderd. S2 (ExplorationSession) is het enige AI chat systeem.
- **ExplorationConfig hardcoded fallbacks** — System defaults in config-resolver.ts. **13 van 13 configs auto-provisioned per workspace** via GET endpoint lazy initialization. Fallbacks alleen nog relevant als `getSystemDefault()` direct wordt aangeroepen buiten de admin route.
- **AI Exploration re-test na config wijziging** — Om opnieuw te testen na config-wijzigingen, moeten ExplorationSession + ExplorationMessage + BrandAssetResearchMethod (method: 'AI_EXPLORATION', status → 'AVAILABLE') gereset worden voor het betreffende asset. Alleen een nieuwe sessie pakt bijgewerkte config op.
- **~~Lock/unlock inconsistentie~~** — ✅ Opgelost, endpoint gebruikt body-based `{ locked: boolean }`.
- **~~Dual versioning (BrandAssetVersion + ResourceVersion)~~** — ✅ Opgelost. Alle brand asset versioning gebruikt nu ResourceVersion. BrandAssetVersion Prisma model bewust behouden voor historische data — tabel kan op termijn gedropt worden.
- **Orphaned golden-circle API routes** — `src/app/api/brand-assets/[id]/golden-circle/route.ts` + `lock/route.ts` bestaan maar hebben geen frontend callers. `src/features/golden-circle/` directory is leeg. Opruimen als onderdeel van toekomstige cleanup.

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
- S4.5: ✅ Product Categories 5→22 + Product Images — Categories uitgebreid (22 met groepering, Select optgroup support, ProductCard 22 icons, AI prompts bijgewerkt). ProductImage Prisma model (13 categorieën, sortOrder, source). URL scraper image extractie (og:image, product images, SSRF redirect check, max 20). 4 nieuwe image API routes (POST, PATCH, DELETE, reorder) met cache invalidation. ProductImagesSection + AddImageModal UI. ProductCard hero thumbnail. Analyzer flow auto-save gescrapede images. Seed: 9 images. Code review 2 subagents → 14 fixes. 0 TS errors

**S5. Knowledge Library + Research & Validation ✅ VOLLEDIG**
- S5.0: ✅ Schema + Seed — KnowledgeResource uitgebreid (difficultyLevel, createdBy, indexes), 8 nieuwe modellen, 4 nieuwe enums, seed: 10 resources + 10 bundles + 3 studies + 1 plan
- S5.A: ✅ Knowledge Library — 15 componenten, 13 endpoints, 11 hooks, featured carousel + grid/list + add modal
- S5.B: ✅ Research & Validation — 28 componenten, 20 endpoints, 15 hooks, hub + bundles marketplace + custom builder
- S5.2: ✅ Integratie — all flows, pricing calculator, optimistic favorites, Open Resource links, Download stub, Resume/Validate stubs, 0 TS errors

**S6. Campaigns + Content Library + Content Studio ✅ VOLLEDIG**
- S6.0: ✅ Schema + Seed — Campaign herstructureerd, 7 nieuwe modellen, 5 enums, 76+ tabellen
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
- S7.D: ✅ AI-Powered Scanner + DB Write-Back — Mock data vervangen door echte Claude Sonnet AI-analyse. Nieuw: `data-fetcher.ts` (per-module Prisma data fetchers voor 6 modules + entity lookup), `prompts/brand-alignment.ts` (module-analyse + fix-generatie prompts). Herschreven: `scanner.ts` (8-stap AI scan met `createClaudeStructuredCompletion`, gewogen module scores, fallback bij module-falen), `fix-generator.ts` (AI fix-opties generatie + DB write-back via `prisma.$transaction`, ResourceVersion snapshots, userId doorvoer, locked entity check), `scan-steps.ts` (AI-specifieke labels). Types: `FixOptionChange` + `changes` op `FixOption`. Fix route: session userId doorvoer. Review: 2 rondes (4 onafhankelijke agents), 10 fixes (userId FK violation, transaction FIXED guard, Prisma nullable `?? null`, scanProgress finally cleanup, non-null assertion, redundante cache invalidatie, fallback changes array). TODOs: fix options persistentie (nu regeneratie bij apply), frameworkData partial updates. 0 TS errors

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
- AE.6: ✅ Gemini Provider + Admin UI Fixes — Google Gemini als 3e provider in admin UI (GeneralTab), ai-caller.ts Gemini support + singleton pattern voor alle 3 providers, PUT route itemType/itemSubType bewerkbaar + P2002 error handling, model IDs aligned (gemini-3.1-pro-preview, gemini-3.1-flash)

**BAD. Brand Asset Detail Sprint ✅ VOLLEDIG**
- BAD.1: ✅ 2-kolom Layout — Grid refactor (8/4 split), sidebar componenten (QuickActions, Completeness, Validation)
- BAD.2: ✅ Purpose Kompas + Statement — PurposeKompasSection (Mens/Milieu/Maatschappij), PurposeStatementSection (apart asset type)
- BAD.3: ✅ Universal Versioning — ResourceVersion polymorphic model, /api/versions GET endpoint

**PW. Purpose Statement IDEO Verbetering ✅ VOLLEDIG**
- PW.1: ✅ PurposeWheelSection redesign — Impact Type visuele kaarten, Mechanism selecteerbare categorieën (15 outer wheel), Pressure Test helper-vragen, Purpose Score verwijderd
- PW.2: ✅ AI Exploration config — 5 nieuwe dimensies, herziene prompts, 6 field suggestions, frontend sync
- PW.3: ✅ Duplicate verwijderd — uit brand assets, personas en interviews (12 bestanden)

**TR. Trend Radar (vervangt Market Insights) ✅ VOLLEDIG**
- TR.0: ✅ Schema + Seed — 3 modellen (TrendSource, DetectedTrend, TrendScanJob), 3 enums, InsightCategory+ImpactLevel bijgewerkt, seed: 4 sources + 8 trends + 1 scan job
- TR.1: ✅ Backend — 14 endpoints (10 route files), scanner (fire-and-forget, in-memory progress), content-differ (sha256), trend-analyzer (Gemini AI + dedup), AI prompts, cron route
- TR.2: ✅ State — types (8 interfaces), API client (18 functies), 16 TanStack Query hooks, Zustand store, constants
- TR.3: ✅ Frontend — 20+ componenten: TrendRadarPage (4-tab dashboard: sources/feed/alerts/activation), detail page, scan progress modal, add modals
- TR.4: ✅ Integratie + Cleanup — ~40 oude Market Insights bestanden verwijderd, cross-module updates (brand-context, dashboard, search, studio, campaigns, settings), routing, design tokens, middleware
- TR.5: ✅ Review — 2 rondes, 5 CRITICAL + 7 WARNING + ~7 MINOR issues gefixt, Prisma enum migratie, 0 openstaande issues

**I18N. Codebase English Translation ✅ VOLLEDIG**
- I18N.1: ✅ Vertaling — ~80+ bestanden in `src/` vertaald van Nederlands naar Engels via 5 parallelle agenten. UI-strings (labels, buttons, placeholders, empty states, tooltips), JSDoc/comments, `nl-NL` locale → `en-US`, error/toast messages, API route comments.
- I18N.2: ✅ Review — 3 review-rondes met telkens 2 onafhankelijke review-agenten. Ronde 1: 12 items gevonden + gefixt. Ronde 2: 3 items gevonden + gefixt. Ronde 3: 0 items — verificatie geslaagd.
- I18N.scope: Buiten scope (bewust Nederlands): CLAUDE.md, TODO.md, PATTERNS.md, `docs/`, `prisma/seed.ts`

**FBA. Vaste Set Brand Assets per Workspace ✅ VOLLEDIG**
- FBA.1: ✅ Canonical constant — `src/lib/constants/canonical-brand-assets.ts` (12 assets, 4 research methods, weights)
- FBA.2: ✅ Schema — AssetCategory enum (9 waarden incl. ESG), `@@unique([workspaceId, slug])` compound unique
- FBA.3: ✅ Auto-provisioning — workspace creation (`workspaces/route.ts`) + user registratie (`auth.ts`) auto-creëren 12 assets + 48 research methods in $transaction
- FBA.4: ✅ UI cleanup — Add Asset button/modal + Delete action/dialog verwijderd, stores opgeschoond

**BA. Brand Archetype Asset ✅ VOLLEDIG**
- BA.1: ✅ Type + Referentiedata — BrandArchetypeFrameworkData 25+ velden, archetype-constants.ts (12 archetypen, 4 kwadranten, sub-archetypes, positioning approaches)
- BA.2: ✅ Canvas Component — BrandArchetypeSection.tsx (~800 regels, 6 kaarten, auto-prepopulatie, TagEditor, WeSayNotThatEditor, archetype guide)
- BA.3: ✅ Wiring — BrandAssetDetailPage isBrandArchetype, FrameworkRenderer null case, AssetCompletenessCard 12 velden
- BA.4: ✅ AI Exploration — 7 dimensies, 18 field suggestions, seed config, frontend+backend sync
- BA.5: ✅ AI Export — formatBrandArchetype() in brand-context.ts, alle 25+ velden gestructureerd
- BA.6: ✅ Review — 3 rondes (2 subagents per ronde), 8 issues gefixt, 0 openstaande issues

**COMP. Competitors Analysis ✅ VOLLEDIG**
- COMP.0: ✅ Schema + Seed — Competitor model (30+ velden) + CompetitorProduct join table, 2 enums, seed: 3 demo-concurrenten, cache keys
- COMP.A: ✅ Backend — 7 API route files (12 endpoints), AI prompt (Gemini 3.1 Pro), types, constants, API client (10 functies), 12 hooks, Zustand store
- COMP.B: ✅ Frontend — ~17 componenten (overview+card, analyzer 2-tab+modal, detail 2-kolom+5 secties+4 sidebar+ProductSelectorModal)
- COMP.2: ✅ Integratie — Sidebar (Swords icon), routing (3 cases), brand context (competitor landscape), dashboard stats, global search
- COMP.R: ✅ Review — 2 rondes (2 agents per ronde), 7 fixes (nullable fields, dedup, createdById, typed store, spacing, cleanup), 0 CRITICAL remaining

**INT. Externe Integraties (onderzocht maart 2026, keuze pending)**

Verkennend onderzoek afgerond naar 25+ externe applicaties. Hieronder de shortlist gegroepeerd op prioriteit. Keuze nog niet gemaakt — alle items zijn 📋 pending beslissing.

**Tier 1 — Direct implementeren (hoog ROI, lage inspanning)**
- INT.1: 📋 **Resend** (Email API) — SDK al geïnstalleerd (`resend` v6.9.3), gratis 3K/maand. Enablet invite flow, notificatie-emails, campaign alerts. Kosten: gratis.
- INT.2: 📋 **Perplexity Sonar API** (AI Search/Research) — OpenAI-compatibele API, real-time web search + LLM synthese met citaten. Vervangt/verbetert Gemini grounding in Trend Radar. Kosten: pay-per-token (~$1/M tokens).
- INT.3: 📋 **Pexels API** (Stock Media) — Gratis stock foto's + video's voor Content Studio, campaigns, persona avatars. Officieel Node.js SDK. Kosten: gratis.
- INT.4: 📋 **Brandfetch** (Brand Data API) — Logo's, kleuren, fonts, firmographics voor 60M+ merken. Verrijkt Competitor Analyzer + client onboarding. Kosten: $99/maand (2.500 calls).
- INT.5: 📋 **Ayrshare** (Unified Social Publishing) — Eén API voor publicatie naar 15+ social platforms (LinkedIn, Instagram, X, TikTok, YouTube). Scheduling + analytics. Kosten: vanaf $10/maand.
- INT.6: 📋 **OpenAI Image / Google Imagen 4** (AI Image Generation) — Beeldgeneratie in Content Studio met brand context uit Brandstyle. SDKs al aanwezig. Kosten: $0.02-0.19/beeld.

**Tier 2 — Hoge strategische waarde (gemiddelde inspanning)**
- INT.7: 📋 **HubSpot CRM + Marketing Hub** — Gratis CRM API (1M contacts, 40K calls/dag). Persona validatie, campaign→deal ROI tracking, email distributie. TypeScript SDK. Kosten: gratis (CRM), $20+/user (Marketing).
- INT.8: 📋 **Google Analytics 4 Data API** — Content performance tracking, audience demographics, campaign ROI. Gratis, TypeScript SDK. Kosten: gratis.
- INT.9: 📋 **DataForSEO** (SEO Data) — SERP, keywords, backlinks, domain analytics. Verrijkt Competitors + Content Studio + Campaigns. TypeScript SDK. Kosten: pay-as-you-go (~$0.60/1K SERPs).
- INT.10: 📋 **Writer.com** (AI Brand Voice) — Knowledge Graph RAG + brand voice enforcement. Palmyra model. TypeScript SDK. Kosten: $0.60/1M input tokens.
- INT.11: 📋 **Canva Connect API** — Brandstyle sync naar Canva Brand Kit, Content Studio→Canva voor visuele verfijning, Resize API. Kosten: gratis (public integrations).
- INT.12: 📋 **Typeform** (Survey & Research) — Enablet Research & Validation module. Auto-genereer brand surveys, feed responses terug. Kosten: gratis (10 resp/maand), $25+/maand.
- INT.13: 📋 **Slack** (Notifications) — Real-time alerts voor Brand Alignment, Trend Radar, Campaign status. Bolt framework (Node.js). Kosten: gratis.
- INT.14: 📋 **WordPress REST API** — One-click publishing vanuit Content Studio. Kosten: gratis.

**Tier 3 — Bouwen bij vraag (hoge waarde, hogere inspanning of niche)**
- INT.15: 📋 **ElevenLabs** (AI Audio) — Audio content type voor Content Studio (TTS, voice cloning, brand voice). Gratis 10K chars/maand. TypeScript SDK. Kosten: gratis-$99/maand.
- INT.16: 📋 **Marker API** (Document Parsing) — Betere PDF/DOCX/PPTX parsing dan `unpdf`. Self-hosted gratis (<$2M omzet). Kosten: $6/1K pagina's (cloud).
- INT.17: 📋 **Visualping** (Website Monitoring) — Competitor website change detection met webhooks. Kosten: $100+/maand (API).
- INT.18: 📋 **Meta Marketing API** (Ads) — Campaign deliverables als ad creatives, persona→audience targeting. Kosten: gratis.
- INT.19: 📋 **Semrush** (SEO) — Content optimalisatie, competitor SEO, zoekvolume. Kosten: $417+/maand.
- INT.20: 📋 **Shopify GraphQL** — Product catalog sync, AI productbeschrijvingen. Kosten: gratis (dev stores).
- INT.21: 📋 **Asana / Linear** (Project Management) — Deliverables als taken, milestones sync. Kosten: gratis.
- INT.22: 📋 **Audiense** (Audience Intelligence) — Persona verrijking met echte demographic/psychographic data. Kosten: ~$12K/jaar.

**Tier 4 — Niet aanbevolen of uitgesteld**
- INT.23: ⏸️ **Buffer** — API gesloten voor nieuwe applicaties. Ayrshare is superieur alternatief.
- INT.24: ⏸️ **Brand24** (Social Listening) — Te duur ($198+/maand), gesloten docs, geen Node.js SDK.
- INT.25: ⏸️ **SparkToro** (Audience Intelligence) — API "Coming Soon", niet beschikbaar.
- INT.26: ⏸️ **Attest** (Consumer Research) — Geen publieke API, alleen Zapier.
- INT.27: ⏸️ **The Color API** — Overlap met bestaande `color-utils.ts`.
- INT.28: ⏸️ **Microsoft Clarity** — Verkeerde use case (website heatmaps), 10 req/dag limiet.
- INT.29: ⏸️ **Clarity.ai** (ESG Analytics) — Enterprise-only pricing, geen Node.js SDK. Relevant voor Social Relevancy asset maar te duur.
- INT.30: ⏸️ **Mailchimp** — Overlap met HubSpot Marketing Hub.
- INT.31: ⏸️ **Figma REST API** — Read-only, medium waarde. Canva Connect is actiever alternatief.
- INT.32: ⏸️ **Frontify / Bynder** (DAM) — Enterprise pricing, niche doelgroep.

**Tier 5 — Public API Kandidaten (bron: github.com/public-apis/public-apis, maart 2026)**
Gratis of goedkope publieke API's die bestaande modules verrijken:
- INT.33: 📋 **NewsAPI** (News) — Real-time nieuws per keyword/merk/industrie → extra bron voor Trend Radar scanning pipeline. 500 req/dag gratis. `apiKey`.
- INT.34: 📋 **GNews** (News) — Alternatieve nieuwsbron voor trenddetectie + brand monitoring. 100 req/dag gratis. `apiKey`.
- INT.35: 📋 **Unsplash** (Stock Photography) — Hoge kwaliteit stockfoto's in Content Studio + campaign assets + persona avatars. 50 req/uur gratis. `OAuth`.
- INT.36: 📋 **Clearbit Logo API** (Business) — Competitor logo's automatisch ophalen voor CompetitorCard thumbnails + client onboarding. Gratis. `apiKey`.
- INT.37: 📋 **Markerapi** (Business) — Trademark zoeken → merkregistratie-check bij brand name validatie in Brand Foundation. Gratis. Geen auth.
- INT.38: 📋 **JSON2Video** (Video) — Programmatisch video's maken uit campaign deliverables (watermarks, slideshows, voice-over, text animaties). Betaald. `apiKey`.
- INT.39: 📋 **Aylien Text Analysis** (NLP) — Sentiment analyse + categorisatie + entity extraction op brand mentions → Brand Alignment verrijking + competitor sentiment tracking. Betaald. `apiKey`.
- INT.40: 📋 **Colormind** (Art & Design) — AI kleurenpalet generatie → Brandstyle Analyzer alternatieve paletten voorstellen op basis van bestaande merkkleur. Gratis. Geen auth.

**Architectuur-aanbeveling**: Bouw een Integration Hub (`src/lib/integrations/`, `IntegrationConfig` Prisma model, generieke OAuth handler + webhook receiver, Settings > Integrations UI) voordat individuele integraties worden gebouwd.

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
- **Multi-provider AI**: Generic AI caller met provider string ("anthropic"/"openai"/"google"). Singleton clients via globalThis. Directe SDK calls per provider in ai-caller.ts. Admin UI ondersteunt alle 3 providers met model selectie.
- **AI Exploration config model**: Per item type/subtype aparte config in DB (13 records). Backend-driven dimensies, prompts, AI model. Frontend leest dimensies uit sessie metadata voor progress bar sync.

---

## Referenties
- Figma: https://www.figma.com/make/WTXNV6zhzsTyYLUOdkFGge/Branddock
- GitHub ref repo: https://github.com/erikjager55/branddock-figma-reference
- Notion Context Library: 2ff48b9c-6dc9-81a9-8b04-f1c0d1e14e40
- Notion Backlog: b7dc92fa-1455-440a-845f-2808f409a9b9
- HANDOVER-BETTER-AUTH.md — Better Auth implementatie details + Fase B plan
- ROADMAP-API-EN-AGENCY-MODEL.md — Gedetailleerd plan API laag + agency model