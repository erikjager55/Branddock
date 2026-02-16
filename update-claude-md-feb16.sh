#!/bin/bash
set -e

cat > CLAUDE.md << 'EOF'
# BRANDDOCK — Claude Code Context
## Laatst bijgewerkt: 16 februari 2026

---

## Project
Branddock is een SaaS platform voor brand strategy, research validatie en AI content generatie.
Voorheen: Brandshift.ai / ULTIEM. Huidige naam: **Branddock**.

## Tech Stack
- **Framework**: Next.js 16.1.6 (hybride SPA), React 19
- **Styling**: Tailwind CSS 4
- **Database**: PostgreSQL 17, Prisma 7.4
- **State**: Zustand 5, React Context (12 providers)
- **Data fetching**: TanStack Query 5 (actief in gebruik voor brand-assets + personas)
- **Icons**: Lucide React 0.564
- **Package manager**: npm

## Architectuur — BELANGRIJK
Dit is een **hybride Next.js SPA** — Next.js als framework, maar de UI is volledig client-side:

- Entry: `src/app/layout.tsx` → `src/app/page.tsx` ('use client') → `src/App.tsx`
- Routing: `activeSection` state → `renderContent()` switch statement in App.tsx
- GEEN App Router routing voor pagina's — navigatie via `setActiveSection('id')`
- Nieuwe pagina = case toevoegen in switch statement
- `src/main.tsx` bestaat maar wordt NIET gebruikt
- API routes gebruiken wél Next.js App Router (`src/app/api/`)

## Data Flow

### Modules op de database (via API)
```
PostgreSQL → Prisma → /api/[module] (route.ts)
  → fetch[Module]() (src/lib/api/[module].ts)
  → api[Module]ToMockFormat() (src/lib/api/[module]-adapter.ts)
  → [Module]Context (src/contexts/[Module]Context.tsx)
  → UI componenten (ongewijzigd)
```

Feature flag: `NEXT_PUBLIC_WORKSPACE_ID` in `.env.local`
- Gezet → data uit API/PostgreSQL
- Niet gezet of API faalt → fallback naar mock data + localStorage
- Adapter mapt DB formaat → mock formaat zodat UI ongewijzigd blijft

**Live op database:**
- Brand Assets (13 assets) — `/api/brand-assets` GET + POST
- Personas (3 personas) — `/api/personas` GET + POST
- Products & Services (3 products) — `/api/products` GET + POST
- Research Plans (1 active plan) — `/api/research-plans` GET + POST + PATCH
- Purchased Bundles — `/api/purchased-bundles` GET + POST
- Campaigns (3 campaigns) — `/api/campaigns` GET + POST + PATCH
- Knowledge Library (5 resources) — `/api/knowledge` GET + POST
- Trends (5 trends) — `/api/trends` GET + POST
- Dashboard — leest counts uit BrandAssetsContext + PersonasContext

**Nog op mock data:**
- Strategy tools (tool definitions, niet data-backed)
- Overige mock imports: research-bundles, mock-trends, knowledge-resources, mock-products, mock-campaigns, strategy-tools, mock-collaboration, mock-activities, mock-bundles, mock-decision-analysis, mock-relationships

### Adapter Pattern (tijdelijk)
Elke gemigreerde module heeft een adapter die DB data mapt naar het bestaande mock formaat. Dit voorkomt breaking changes in downstream componenten. Op termijn worden componenten herschreven om direct het DB-model te gebruiken.

## Conventies
- Documentatie: Nederlands | Code/interfaces: Engels
- ALTIJD Lucide React iconen, geen emoji's
- Design tokens: `src/lib/constants/design-tokens.ts` (649 regels) is SINGLE SOURCE OF TRUTH
- Alle nieuwe componenten MOETEN design tokens importeren
- Kleuren: teal-600 primary, emerald-500 CTA, gray-50 background
- Sidebar: w-72 (288px), flex-shrink-0, active state: bg-emerald-50 text-emerald-700
- Componenten: functioneel React, TypeScript strict

## Sidebar Section IDs → Componenten
Navigatie in de sidebar stuurt `setActiveSection(id)`. Mapping:

**Werkend:**
dashboard→Dashboard, brand→BrandAssetsViewSimple, brandstyle→BrandstyleView, personas→PersonasSection, products→ProductsServices, trends→TrendLibrary, knowledge→KnowledgeLibrary, new-strategy→NewStrategyPage, active-campaigns→ActiveCampaignsPage, research→ResearchHubEnhanced, research-bundles→ResearchPlansPage, custom-validation→ValidationPlanLandingPage, settings-account→AccountSettingsPage, settings-team→TeamManagementPage, settings-agency→AgencySettingsPage, settings-clients→ClientManagementPage, settings-billing→BillingSettingsPage, settings-notifications→NotificationsSettingsPage, settings-appearance→AppearanceSettingsPage

**ComingSoonPage:** business-strategy, brand-alignment, content-library, help

**Default** (onbekende IDs): rendert Dashboard.

## Directory Structuur
```
src/
├── App.tsx                              ← HOOFD ROUTING (switch statement)
├── app/
│   ├── layout.tsx                       ← Root layout met QueryProvider
│   ├── page.tsx                         ← Entry point ('use client')
│   └── api/
│       ├── brand-assets/route.ts        ← GET + POST (live)
│       └── personas/route.ts            ← GET + POST (live)
├── components/
│   ├── Dashboard.tsx                    ← Bijgewerkt: context ipv mock imports
│   ├── BrandAssetsViewSimple.tsx        ← Brand Foundation pagina
│   ├── EnhancedSidebarSimple.tsx        ← Refactored: useBrandAssets()
│   ├── TopNavigationBar.tsx             ← Top bar
│   ├── shared/ComingSoonPage.tsx        ← Placeholder ongebouwde modules
│   └── [module]/                        ← Per-module componenten
├── contexts/
│   ├── index.tsx                        ← AppProviders wrapper + hook exports
│   ├── BrandAssetsContext.tsx            ← API first, mock fallback
│   ├── PersonasContext.tsx               ← API first, mock fallback
│   ├── ChangeImpactContext.tsx
│   ├── CollaborationContext.tsx
│   ├── ProductsContext.tsx               ← Inline mock data (geen DB model)
│   ├── ProductTierContext.tsx
│   ├── ResearchBundleContext.tsx
│   ├── ResearchPlanContext.tsx
│   ├── TemplateContext.tsx
│   ├── UIStateContext.tsx
│   └── WhiteLabelContext.tsx
├── data/                                ← 14 mock data bestanden
├── hooks/
│   ├── use-brand-assets.ts              ← TanStack Query hooks
│   ├── use-personas.ts                  ← TanStack Query hooks
│   └── useBreadcrumbs.ts               ← Refactored: useBrandAssets() + usePersonas()
├── lib/
│   ├── prisma.ts                        ← Prisma client singleton
│   ├── api/
│   │   ├── brand-assets.ts              ← Type-safe fetch functies
│   │   ├── brand-asset-adapter.ts       ← BrandAssetWithMeta → BrandAsset
│   │   ├── personas.ts                  ← Type-safe fetch functies
│   │   └── persona-adapter.ts           ← ApiPersona → MockPersona
│   └── constants/
│       ├── design-tokens.ts             ← Design tokens (649 regels)
│       └── design-system.ts             ← scoreColor() utility
├── providers/
│   └── query-provider.tsx               ← TanStack QueryClientProvider
├── services/                            ← 9 service bestanden (static setters voor data injection)
├── stores/                              ← 9 Zustand stores
├── types/                               ← 27 type bestanden
└── utils/                               ← 14 utility bestanden (parametrische functies)

prisma/
├── schema.prisma                        ← 44 database modellen
├── prisma.config.ts                     ← Prisma 7 configuratie
└── seed.ts                              ← Seed data (1439 regels)

.env.local                               ← NEXT_PUBLIC_WORKSPACE_ID
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
- 44 tabellen live, schema in sync
- Seed gedraaid met multi-tenant demo data

### Seed Data
- 2 Organizations: "Branddock Demo Agency" (AGENCY, ACTIVE) + "TechCorp Inc." (DIRECT, TRIALING)
- 2 Workspaces: "Branddock Demo" (slug: branddock-demo) + "TechCorp Brand"
- 4 Users: Erik (OWNER agency), Sarah Chen (MEMBER agency), John Smith (OWNER direct), demo user
- 3 OrganizationMembers + 1 Invitation (pending)
- 13 brand assets, 3 personas, 3 strategies, 1 styleguide
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

## API Laag

### Werkende routes
| Route | Methode | Beschrijving |
|---|---|---|
| `/api/brand-assets` | GET | Lijst met filters (category, status, search, sortBy, sortOrder) + stats |
| `/api/brand-assets` | POST | Nieuw asset aanmaken (name, category, workspaceId) |
| `/api/personas` | GET | Lijst met research methods + stats |
| `/api/personas` | POST | Nieuwe persona aanmaken (name, workspaceId, createdById) |
| `/api/products` | GET | Lijst met filters (category, search, sortBy, sortOrder) + stats |
| `/api/products` | POST | Nieuw product aanmaken (name, category, workspaceId, pricing, features, etc.) |
| `/api/research-plans` | GET | Lijst met filters (status) + stats |
| `/api/research-plans` | POST | Nieuw research plan aanmaken |
| `/api/research-plans` | PATCH | Research plan updaten (unlock methods/assets, status) |
| `/api/purchased-bundles` | GET | Lijst gekochte bundles + alle unlocked tool IDs |
| `/api/purchased-bundles` | POST | Bundle aankoop registreren (upsert) |
| `/api/campaigns` | GET | Lijst met filters (status, type, search, sort) + stats |
| `/api/campaigns` | POST | Nieuwe campaign aanmaken |
| `/api/campaigns` | PATCH | Campaign updaten (status, deliverables, assets) |

Alle routes vereisen `workspaceId` als query param (GET) of in body (POST).

### Patroon voor nieuwe modules
1. `src/app/api/[module]/route.ts` — Next.js API route met Prisma queries
2. `src/lib/api/[module].ts` — type-safe fetch functies
3. `src/lib/api/[module]-adapter.ts` — DB → mock format mapper (tijdelijk)
4. `src/hooks/use-[module].ts` — TanStack Query hooks
5. Context updaten: API fetch in useEffect + mock fallback

## TypeScript Status
- **678 errors** — blokkeren `npm run build` maar NIET dev server
- Top issues: diverse component type mismatches, pre-existing ResearchItem/Persona type issues
- Geleidelijk aanpakken, niet blokkerend voor development

## Werkwijze
- Erik gebruikt geen code editor — wijzigingen via bash `cat >` commando's en scripts
- Scripts/commando's draaien vanuit `~/Projects/branddock-app/`
- Downloads komen in `~/Downloads/`
- Dev server: `npm run dev` in apart terminal-tabblad
- Testen API: `curl` in ander tabblad

## Wat er NIET is
- **Auth** — niet geïmplementeerd, workspaceId via env variable
- **Stripe billing** — niet geïmplementeerd
- **Server-side rendering** — alles is client-side

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
15. **`mockBrandAssets` + `mockPersonas` in utils/services → parametrische functies + static setters** (campaign-decision-gate, campaign-decision-calculator v1+v2, platform-decision-aggregator, GlobalSearchService, SmartSuggestionsService, RelationshipService)
16. **`useBreadcrumbs` hook → `useBrandAssets()` + `usePersonas()` intern**
17. **`mockPersonas` → `usePersonas()` in 7 componenten** (ResearchHubEnhanced, StrategicResearchPlanner, ResearchTargetSelector, CampaignStrategyGeneratorDetail, UniversalStrategyGenerator, StrategicReport)
18. **Callers bijgewerkt**: CampaignStrategyGeneratorDetail, UniversalStrategyGenerator, GlobalSearchModal, RelationshipsPage — passen nu brandAssets/personas door aan parametrische functies/services

### ⚠️ TECHNISCHE SCHULD
- **678 TypeScript errors** — geleidelijk aanpakken
- **Adapter pattern** — tijdelijk, componenten moeten op termijn direct DB-model gebruiken
- **Pre-existing type issues**: ResearchItem/Persona mismatches, MockPersona vs Persona type conflicts

### 🔧 HUIDIGE FASE: Mock Data → Context/API Refactor
Doel: alle directe mock imports (`from '../data/mock-*'`) vervangen door context hooks of parametrische functies.

**✅ AFGEROND:**
- `mockBrandAssets` — alle imports gemigreerd (components, utils, services, hooks)
- `mockPersonas` — alle imports gemigreerd (components, utils, services, hooks)
- Enige uitzonderingen: `BrandAssetsContext.tsx` en `PersonasContext.tsx` (eigen mock fallback — OK), `src/examples/` (low priority)

**⬜ NOG TE DOEN (overige mocks):**
- `research-bundles` (7 imports) — App.tsx, ResearchBundleContext, StrategicResearchPlanner, ResearchPlansPage, ResearchPlansSectionGamified, ResearchBundlesSection, BundleDetailsPage
- `mock-trends` (4 imports) — TrendLibrary, CampaignStrategyGeneratorDetail, UniversalStrategyGenerator, ResourceDetailModal
- `mock-knowledge` / `knowledge-resources` (4 imports) — KnowledgeLibrary, CampaignStrategyGeneratorDetail, UniversalStrategyGenerator, AddResourceModal
- `mock-products` (2 imports) — CampaignStrategyGeneratorDetail, UniversalStrategyGenerator
- `mock-campaigns` (2 imports) — ActiveCampaignsPage, CampaignWorkspace
- `strategy-tools` (2 imports) — StrategyHubSection, ResearchBundlesSection
- `mock-collaboration` (1 import) — TeamManagementPage
- `mock-activities` (1 import) — App.tsx
- `mock-bundles` (1 import) — InterviewsManagerUpdated
- `mock-decision-analysis` (1 import) — ResearchDashboard
- `mock-relationships` (1 import) — RelationshipService

### 📋 ROADMAP (na mock refactor, in volgorde)

**A. Auth: NextAuth.js**
- Login, register, sessie management
- workspaceId uit sessie halen ipv env variable
- Middleware: check workspace-toegang

**B. Agency/Multi-tenant features**
- User management (invite, roles, deactivate)
- Billing via agency (Stripe seat-based plans)
- Workspace switcher in topbar
- Organization dashboard

**C. Module-implementaties (Fase 4-12)**
- Fase 4: Personas verfijning
- Fase 5-12: Business Strategy, Brand Alignment, Content Library, Help & Support
- Per fase: UI + API + database integratie

**D. AI-koppelingen**
- OpenAI/Claude API integratie (vervangt mock AI service)
- Image generation
- Brand Style URL-analyse

**E. Launch-voorbereiding**
- End-to-end testing
- Performance (lazy loading, query caching)
- Responsive/mobile
- Deployment pipeline

### ❓ OPEN BESLISSINGEN
- Auth provider: NextAuth.js vs Clerk vs Auth0
- Agency pricing: per seat vs per workspace vs flat tiers
- Gratis tier limieten
- Workspace isolatie: soft (filter op orgId) vs hard (row-level security)
- Agency white-label: eigen logo/domein of alleen Branddock branding
- AI provider: OpenAI of Anthropic
- Deployment: Vercel, Railway, of self-hosted

---

## Referenties
- Figma: https://www.figma.com/make/WTXNV6zhzsTyYLUOdkFGge/Branddock
- GitHub ref repo: https://github.com/erikjager55/branddock-figma-reference
- Notion Context Library: 2ff48b9c-6dc9-81a9-8b04-f1c0d1e14e40
- Notion Backlog: b7dc92fa-1455-440a-845f-2808f409a9b9
- ROADMAP-API-EN-AGENCY-MODEL.md — Gedetailleerd plan API laag + agency model
EOF

echo "✅ CLAUDE.md bijgewerkt (16 feb 2026)"
echo ""
echo "Commit:"
echo "  git add CLAUDE.md && git commit -m 'docs: update CLAUDE.md — mockBrandAssets + mockPersonas refactor complete'"
