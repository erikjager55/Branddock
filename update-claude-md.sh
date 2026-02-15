#!/bin/bash
set -e
echo "🔧 CLAUDE.md bijwerken"

cat > CLAUDE.md << 'EOF'
# BRANDDOCK — Claude Code Context
## Laatst bijgewerkt: 15 februari 2026

## Project
Branddock is een SaaS platform voor brand strategy, research validatie en AI content generatie.
Voorheen: Brandshift.ai / ULTIEM. Huidige naam: **Branddock**.

## Tech Stack
Next.js 16.1.6, React 19, Tailwind CSS 4, PostgreSQL/Prisma 7.4, Zustand 5, TanStack Query 5 (geïnstalleerd, nog niet gebruikt), Lucide React 0.564.

## Architectuur — BELANGRIJK
Dit is een **hybride Next.js SPA**:
- Next.js is het framework (`next dev`), maar de UI is een client-side SPA
- Entry: `src/app/layout.tsx` → `src/app/page.tsx` ('use client') → `src/App.tsx`
- Routing: `activeSection` state → `renderContent()` switch statement in App.tsx
- GEEN App Router routing voor pagina's — alle navigatie gaat via `setActiveSection('id')`
- Nieuwe pagina toevoegen = case toevoegen in switch statement in App.tsx
- Data komt uit mock bestanden (`src/data/mock-*.ts`), NIET uit API routes
- `src/app/api/` bestaat NIET — er is geen server-side data laag (volgende stap op roadmap)
- `src/main.tsx` bestaat maar wordt niet gebruikt

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

Werkend: dashboard→Dashboard, brand→BrandAssetsViewSimple, brandstyle→BrandstyleView, personas→PersonasSection, products→ProductsServices, trends→TrendLibrary, knowledge→KnowledgeLibrary, new-strategy→NewStrategyPage, active-campaigns→ActiveCampaignsPage, research→ResearchHubEnhanced, research-bundles→ResearchPlansPage, custom-validation→ValidationPlanLandingPage, settings-account→AccountSettingsPage, settings-team→TeamManagementPage, settings-agency→AgencySettingsPage, settings-clients→ClientManagementPage, settings-billing→BillingSettingsPage, settings-notifications→NotificationsSettingsPage, settings-appearance→AppearanceSettingsPage

ComingSoonPage: business-strategy, brand-alignment, content-library, help

Default (onbekende IDs): rendert Dashboard.

## Directory Structuur
```
src/App.tsx                          ← HOOFD ROUTING (switch statement)
src/components/EnhancedSidebarSimple.tsx ← Sidebar
src/components/TopNavigationBar.tsx  ← Top bar
src/components/shared/ComingSoonPage.tsx ← Placeholder ongebouwde modules
src/components/[module]/             ← Per-module componenten
src/contexts/                        ← 12 React Context providers
src/data/                            ← 14 mock data bestanden
src/stores/                          ← 9 Zustand stores
src/types/                           ← 27 type bestanden
src/hooks/                           ← 4 custom hooks
src/services/                        ← 9 service bestanden
src/utils/                           ← 14 utility bestanden
src/lib/constants/design-tokens.ts   ← Design tokens (649 regels)
src/lib/constants/design-system.ts   ← scoreColor() utility
src/lib/prisma.ts                    ← Prisma client singleton (NIEUW)
prisma/schema.prisma                 ← 44 database modellen (in sync met DB)
prisma/prisma.config.ts              ← Prisma 7 configuratie (NIEUW)
prisma/seed.ts                       ← Seed data
```

## Database & Prisma 7
- **Status: Database in sync met schema (44 tabellen live)**
- Lokale PostgreSQL: `postgresql://erikjager:@localhost:5432/branddock`
- Prisma 7 vereist adapter: zie `src/lib/prisma.ts`
- Config in `prisma/prisma.config.ts` (NIET url in schema.prisma)
- Seed: `npx tsx prisma/seed.ts`
- Schema push: `npx prisma db push`
- psql pad: `/opt/homebrew/opt/postgresql@17/bin/psql`

## Multi-tenant / Agency Model (NIEUW)
Schema bevat Organization + Agency model:
- **Organization**: type DIRECT (klant) of AGENCY (bureau), Stripe billing velden
- **OrganizationMember**: User ↔ Organization met rollen (OWNER, ADMIN, MEMBER, VIEWER)
- **WorkspaceMemberAccess**: per-workspace toegangscontrole
- **Invitation**: token-based user invites door agencies
- **Workspace**: gekoppeld aan Organization via organizationId
- **User**: workspaceId is optioneel, gekoppeld via OrganizationMember

Structuur:
```
Agency (Organization type=AGENCY)
├── User: agency-eigenaar (OWNER)
├── User: medewerker (MEMBER)
├── Workspace: Klant A
├── Workspace: Klant B

Directe klant (Organization type=DIRECT)
├── User: klant-eigenaar (OWNER)
└── Workspace: eigen merk
```

## TypeScript Status
- **693 errors** (was 738, gefixt: BrandAsset type export, ResearchItem compatibility)
- Blokkeren `npm run build` maar NIET dev server
- Top issues: diverse component type mismatches, geleidelijk aanpakken
- ResearchItem geëxporteerd uit `src/utils/decision-status-calculator.ts`
- BrandAsset type in `src/types/brand-asset.ts` (incl. ResearchMethod, BrandAssetOption)

## Wat er NIET is
- src/app/api/ — geen API routes (volgende stap)
- Auth — niet geïmplementeerd
- Stripe billing — niet geïmplementeerd
- Server-side data fetching — alles is mock data
- Seed data — nog niet gedraaid na schema reset

---

## ACTIELIJST

### ✅ AFGEROND (15 feb 2026)
1. ~~Broken import fixen in App.tsx:33~~ → BrandAsset type geëxporteerd
2. ~~Git commit~~ → alles onder version control
3. ~~Prisma schema uitbreiden~~ → Organization + Agency model (44 modellen)
4. ~~Prisma 7 config~~ → prisma.config.ts aangemaakt
5. ~~Prisma client singleton~~ → src/lib/prisma.ts
6. ~~Database in sync~~ → 44 tabellen live

### ⚠️ TECHNISCHE SCHULD
7. **693 TypeScript errors** — geleidelijk aanpakken, blokkeren dev server niet

### 📋 ROADMAP (in volgorde)
8. **Seed data draaien** — testdata in database laden
9. **Eerste API route** — `/api/brand-assets` + TanStack Query hook
10. **API laag uitbouwen** — module voor module mock → API migratie:
    a. src/app/api/ — CRUD routes per module
    b. src/lib/api/ — type-safe API client functies
    c. TanStack Query hooks per module
    d. Volgorde: brand-assets → personas → dashboard → rest

11. **Auth: NextAuth.js** — login, register, sessie management

12. **Agency features bouwen**:
    a. User management (invite, roles, deactivate)
    b. Billing via agency (Stripe seat-based plans)
    c. Workspace switcher in topbar

13. **Fase 4: Personas verfijning** — PersonasSection TypeScript errors + features

14. **Fase 5-12: Overige modules** — nu ComingSoonPage of mock-only:
    - Business Strategy (Fase 2)
    - Brand Alignment (Fase 8)
    - Content Library (Fase 10)
    - Help & Support (Fase 12)

### ❓ OPEN BESLISSINGEN
- Auth provider: NextAuth.js vs Clerk vs Auth0
- Agency pricing: per seat vs per workspace vs flat tiers
- Gratis tier limieten: hoeveel assets/personas/campaigns?
- Workspace isolatie: soft (filter op orgId) vs hard (row-level security)
- Agency white-label: eigen logo/domein of alleen Branddock branding?
- AI provider: OpenAI of Anthropic als standaard
- Deployment: Vercel, Railway, of self-hosted

---

## Referenties
- Figma: https://www.figma.com/make/WTXNV6zhzsTyYLUOdkFGge/Branddock
- GitHub ref repo: https://github.com/erikjager55/branddock-figma-reference
- Notion Context Library: 2ff48b9c-6dc9-81a9-8b04-f1c0d1e14e40
- Notion Backlog: b7dc92fa-1455-440a-845f-2808f409a9b9
- ROADMAP-API-EN-AGENCY-MODEL.md — Gedetailleerd plan API laag + agency model
EOF

echo "✅ CLAUDE.md bijgewerkt"
echo ""
echo "Commit:"
echo "   git add -A && git commit -m 'docs: update CLAUDE.md with current project status'"
