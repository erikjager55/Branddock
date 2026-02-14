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
- `src/app/api/` bestaat NIET — er is geen server-side data laag
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
prisma/schema.prisma                 ← 60+ database modellen (niet verbonden met UI)
prisma/seed.ts                       ← Seed data
```

## Prisma 7 Specifiek
- Generator: `prisma-client-js`
- Client vereist adapter: `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
- Seed: `npx tsx prisma/seed.ts`
- Schema is gedefinieerd maar UI leest NIET uit database (alleen mock data)

## Wat er NIET is
- src/app/api/ — geen API routes
- src/lib/prisma.ts — geen Prisma singleton
- Auth — niet geïmplementeerd
- Stripe billing — niet geïmplementeerd
- Server-side data fetching — alles is mock data

## Roadmap
1. ✅ P0 Design System integratie (sidebar fix, ComingSoonPage, design tokens)
2. Fase 4: Personas verfijning
3. API laag bouwen (Prisma singleton → API routes → TanStack hooks → mock data migratie)
4. Auth: NextAuth.js + login/register
5. Multi-tenant: Organization + Workspace modellen
6. Agency model: user management, invitations, agency billing via Stripe
7. Fase 5-12: overige modules

## Referenties
- Figma: https://www.figma.com/make/WTXNV6zhzsTyYLUOdkFGge/Branddock
- GitHub ref repo: https://github.com/erikjager55/branddock-figma-reference
- Notion Context Library: 2ff48b9c-6dc9-81a9-8b04-f1c0d1e14e40
- Notion Backlog: b7dc92fa-1455-440a-845f-2808f409a9b9
- ROADMAP-API-EN-AGENCY-MODEL.md — Gedetailleerd plan API laag + agency model
