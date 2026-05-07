---
id: 2026-02-12-hybrid-spa-architecture
title: Hybride Next.js SPA met switch-routing in App.tsx
status: accepted
date: 2026-02-12
supersedes: -
superseded-by: -
---

# Context

Branddock werd oorspronkelijk gebuild als Vite-React SPA. Migratie naar Next.js was nodig voor:
- Server-side API routes (Better Auth catch-all, Prisma queries)
- Production-ready deployment (Vercel)
- Better DX (TypeScript, hot reload, image optimization)

Twee Next.js routing-paradigma's:
1. **App Router**: pagina's = file-based routes onder `app/`, server components default
2. **Pages Router**: legacy file-based routing onder `pages/`

Probleem: bestaande UI is een complete client-side SPA met:
- ~24 modules met diepe componenten-hiërarchie
- Zustand stores die cross-pagina state delen
- React Context (12 providers) voor app-wide state
- Animaties en transitions tussen views
- Geen SEO-vereisten (alle content achter auth)

Volledige migratie naar App Router routing zou betekenen: alle ~24 module-pagina's herstructureren als file-based routes, server-component split bepalen, RSC vs client component debugen, Zustand stores opnieuw bedenken voor server-context.

# Decision

**Hybride aanpak**: Next.js als framework, UI volledig client-side via switch-routing in `src/App.tsx`.

- Entry: `src/app/layout.tsx` → `src/app/page.tsx` (`'use client'`) → `<AuthGate>` → `src/App.tsx`
- **Routing voor pagina's**: `activeSection` state → `renderContent()` switch statement in `App.tsx`
- **GEEN App Router routing voor pagina's** — nieuwe pagina = case toevoegen in switch
- **API routes WEL via Next.js App Router** (`src/app/api/`) — server-side voordeel benut
- `src/main.tsx` bestaat maar wordt NIET gebruikt
- Navigatie via `setActiveSection('id')` — geen `next/router` of `next/navigation` voor pagina's

# Y-statement

In de context van **migratie van bestaande SPA naar Next.js**, facing **complete client-side state-architectuur die niet past in App Router server components paradigm**, I decided **hybride: Next.js framework + custom switch-routing in App.tsx**, to achieve **migratie zonder complete UI-rewrite**, accepting tradeoff **geen file-based routing voordelen voor pagina's, alleen voor API**.

# Consequences

## Positief
- Migratie kostte dagen i.p.v. weken
- Bestaande Zustand stores + React Context blijven onveranderd werken
- Animaties tussen views werken zonder route-transitions
- API routes profiteren van Next.js conventies
- Type-safe API endpoints via App Router

## Negatief / tradeoffs
- Geen URL-bookmarks per pagina (alle URLs zijn `/`)
- Browser back-button werkt niet voor in-app navigatie
- Server components niet bruikbaar voor pagina's (wel voor API)
- Geen automatic code-splitting per route
- Lazy loading moet handmatig via dynamic imports
- SEO niet mogelijk (maar niet nodig — alles achter auth)

## Neutraal
- Sidebar `activeSection` state is single source of truth voor navigatie
- "Default case" in switch rendert Dashboard
- Detail-pagina's worden geactiveerd via Zustand store + section-id (bv `useCampaignStore.selectedCampaignId` + `setActiveSection('campaign-detail')`)

# Alternatives considered

- **Volledige App Router migratie**: 3-4 weken werk, herhaalde RSC-debugging, Zustand stores moeten heroverwogen
- **Pages Router (legacy)**: deprecated, slechtere DX, suboptimaal voor toekomstige features
- **Vite SPA behouden zonder Next.js**: API routes vereisen aparte Express/Fastify server — dubbele infrastructuur

# Notes

Sidebar mapping in `src/lib/constants/design-tokens.ts` `SIDEBAR_NAV`:
```typescript
{ id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' }
{ id: 'brand', label: 'Brand Foundation', icon: 'Star' }
// ... etc
```

Switch statement in `App.tsx`:
```typescript
function renderContent() {
  switch (activeSection) {
    case 'dashboard': return <DashboardPage />
    case 'brand': return <BrandFoundationPage />
    case 'brand-asset-detail': return <BrandAssetDetailPage />
    // ... etc
    default: return <DashboardPage />
  }
}
```

**Migratie-pad als ooit nodig**: kan incrementeel naar App Router — eerst nieuwe modules op file-based routes, oude in switch laten tot ze geraakt worden voor andere reden.
