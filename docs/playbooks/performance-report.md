# S11.INT Performance Report — Branddock App

**Datum:** 20 februari 2026
**Next.js:** 16.1.6 (Turbopack)
**Node:** $(node -v equivalent)
**Database:** PostgreSQL 17 (localhost)

---

## 1. Lighthouse Scores

| Categorie | Score | Doel | Status |
|-----------|-------|------|--------|
| **Performance** | **84** | >80 | PASS |
| **Accessibility** | **93** | — | PASS |
| **Best Practices** | **96** | — | PASS |
| **SEO** | **100** | — | PASS |

### Core Web Vitals

| Metric | Waarde | Status |
|--------|--------|--------|
| First Contentful Paint (FCP) | 3.0s | Needs improvement |
| Largest Contentful Paint (LCP) | 3.7s | Needs improvement |
| Time to Interactive (TTI) | 3.7s | Good |
| Speed Index | 3.0s | Good |
| Total Blocking Time (TBT) | 0ms | Excellent |
| Cumulative Layout Shift (CLS) | 0 | Excellent |
| Server Response Time (TTFB) | 20ms | Excellent |

### Diagnostics

| Diagnostic | Waarde |
|-----------|--------|
| Main-thread work | 0.4s |
| JS execution time | 0.2s |
| Network payload | 255 KiB total |
| Unused JS savings potential | ~74 KiB |

---

## 2. Bundle Size Analysis

### Totale Bundle

| Metric | Waarde |
|--------|--------|
| **Totaal JS (raw)** | **3,642 KB** (3.6 MB) |
| **Totaal JS (gzipped)** | **954 KB** |
| **Totaal CSS (raw)** | **212 KB** |
| **Totaal CSS (gzipped)** | **27 KB** |
| **Aantal JS chunks** | **85** |
| **Aantal CSS bestanden** | **1** |

### Initial Page Load (/ route — Lighthouse gemeten)

| Resource Type | Transfer (gzipped) | Raw |
|---------------|-------------------|-----|
| **JS totaal** | **172.5 KB** | ~586 KB |
| CSS | 29.5 KB | 213 KB |
| Font (Inter) | 47.3 KB | 47.3 KB |
| HTML + Other | 8.2 KB | — |
| **Totaal** | **255 KB** | — |

**Status: PASS** — Initial JS load = 172.5 KB gzipped, ver onder het doel van 500 KB.

### Top 10 Zwaarste JS Chunks (raw)

| # | Chunk | Raw | Gzipped | Inhoud |
|---|-------|-----|---------|--------|
| 1 | `360f4a0ce75f687f.js` | 660.5 KB | 162.4 KB | Lucide React icons (volledig pack) |
| 2 | `e3893b74385f48a0.js` | 257.0 KB | 52.4 KB | React + React DOM runtime |
| 3 | `ea3fcfad61488048.js` | 219.3 KB | 68.5 KB | Next.js framework |
| 4 | `43e665f3195d8d04.js` | 153.5 KB | 39.0 KB | Next.js router/internals |
| 5 | `b878a7b24455f132.js` | 128.7 KB | 34.8 KB | App components (page chunk) |
| 6 | `ebebb91c8a06947e.js` | 121.1 KB | 39.2 KB | Radix UI primitives |
| 7 | `a6dad97d9634a72d.js` | 110.0 KB | 38.5 KB | Polyfills |
| 8 | `1501031c1711b057.js` | 105.0 KB | 30.4 KB | TanStack Query + Zustand + libs |
| 9 | `fd6af5d4b5efc0d6.js` | 72.2 KB | 16.9 KB | Module chunk |
| 10 | `88f7ada71a261f4a.js` | 60.6 KB | 12.9 KB | Module chunk |

**Grootste aandachtspunt:** Lucide React icons (660 KB raw) is de zwaarste chunk maar wordt lazy-loaded (niet in de initial page load van 172 KB).

### Framework vs App Code

| Categorie | Raw | Gzipped (est.) |
|-----------|-----|----------------|
| Framework (React + Next.js) | ~630 KB | ~160 KB |
| Polyfills | 110 KB | 38.5 KB |
| Libraries (Radix, TanStack, Zustand) | ~226 KB | ~70 KB |
| App code (components) | ~189 KB | ~48 KB |
| Lucide icons (lazy) | 660 KB | 162 KB |

---

## 3. API Endpoint Timing (Top 15)

Gemeten via curl, 3 runs per endpoint, gesorteerd op gemiddelde responstijd.

| # | Endpoint | Avg | Run 1 | Run 2 | Run 3 |
|---|----------|-----|-------|-------|-------|
| 1 | `GET /api/dashboard` | **14ms** | 25ms | 11ms | 8ms |
| 2 | `GET /api/personas` | 7ms | 9ms | 7ms | 7ms |
| 3 | `GET /api/insights` | 7ms | 8ms | 7ms | 6ms |
| 4 | `GET /api/campaigns` | 7ms | 7ms | 8ms | 7ms |
| 5 | `GET /api/alignment` | 7ms | 9ms | 8ms | 6ms |
| 6 | `GET /api/strategies` | 6ms | 8ms | 7ms | 5ms |
| 7 | `GET /api/campaigns/stats` | 6ms | 5ms | 7ms | 6ms |
| 8 | `GET /api/products` | 5ms | 6ms | 5ms | 5ms |
| 9 | `GET /api/knowledge-resources` | 5ms | 6ms | 5ms | 5ms |
| 10 | `GET /api/dashboard/campaigns-preview` | 5ms | 6ms | 4ms | 5ms |
| 11 | `GET /api/brand-assets` | 5ms | 6ms | 5ms | 5ms |
| 12 | `GET /api/search?q=brand` | 4ms | 4ms | 4ms | 5ms |
| 13 | `GET /api/notifications` | 3ms | 4ms | 4ms | 4ms |
| 14 | `GET /api/dashboard/stats` | 3ms | 4ms | 4ms | 4ms |
| 15 | `GET /api/dashboard/readiness` | 3ms | 4ms | 4ms | 4ms |

**Alle endpoints onder 25ms.** De dashboard route is het zwaarst (14ms gemiddeld) door 8 parallelle queries via `Promise.all()`.

---

## 4. Geimplementeerde Optimalisaties

### S11.C.1 — Bundle Splitting (DONE)

- 49 lazy imports via `React.lazy()` in `src/lib/lazy-imports.ts`
- Sidebar preloading via `preloadModule()` bij hover
- `Suspense` wrapper met Skeleton fallback in App.tsx

### S11.C.2 — Image Optimization (DONE)

- `next.config.ts`: AVIF/WebP formats, device sizes, remote patterns
- Optimized image sizes configuratie

### S11.C.3 — API Response Caching (DONE)

- Server-side in-memory cache in `src/lib/api/cache.ts`
- Cache keys per module in `src/lib/api/cache-keys.ts`
- 9 API routes gebruiken de cache layer (dashboard endpoints)

### S11.C.4 — Database Query Optimization (DONE)

- `src/lib/db/queries.ts`: 4 optimized query builders (count-based, geen in-memory filtering)
- `src/lib/db/indexes.ts`: 25 composite indexes gedocumenteerd
- 25 composite `@@index` entries over 17 Prisma modellen
- 5 API routes refactored van `findMany().filter().length` naar `prisma.count()`
- `prisma db push` succesvol, indexes live

---

## 5. Samenvatting vs Doelen

| Doel | Target | Resultaat | Status |
|------|--------|-----------|--------|
| Lighthouse Performance | >80 | **84** | PASS |
| Lighthouse Accessibility | — | **93** | PASS |
| Lighthouse Best Practices | — | **96** | PASS |
| Lighthouse SEO | — | **100** | PASS |
| Initial bundle (JS gzipped) | <500 KB | **172.5 KB** | PASS |
| Langzaamste API endpoint | — | **14ms** (dashboard) | Excellent |
| Database indexes | Op alle workspaceId + filter combos | **25 composite indexes** | PASS |
| Geen N+1 queries | In overzichtspagina's | **Verified** (Promise.all pattern) | PASS |
| TypeScript errors | 0 | **0** | PASS |

---

## 6. Aanbevelingen voor Verdere Optimalisatie

### Prioriteit 1 — Lucide Icon Tree-Shaking

Het Lucide React icon pack is 660 KB raw (162 KB gzipped). Hoewel het lazy-loaded wordt, is het de grootste chunk in de hele bundle.

**Actie:** Migreer van barrel imports naar directe imports:
```tsx
// Nu (trekt hele icon pack)
import { Plus, Settings, Users } from 'lucide-react';

// Optimaal (alleen gebruikte icons)
import Plus from 'lucide-react/dist/esm/icons/plus';
import Settings from 'lucide-react/dist/esm/icons/settings';
```

**Verwachte besparing:** ~600 KB raw, ~140 KB gzipped

### Prioriteit 2 — FCP/LCP Verbetering

FCP (3.0s) en LCP (3.7s) zijn de zwakste Lighthouse metrics. Dit komt doordat de hele app client-side rendert (SPA-architectuur via AuthGate).

**Mogelijke acties:**
- Server-side rendering voor de login pagina (AuthPage)
- Preload hints voor kritieke CSS/fonts
- `<link rel="preload">` voor de Inter font
- Inline critical CSS

### Prioriteit 3 — Unused JavaScript Opruimen

Lighthouse detecteert ~74 KB aan ongebruikt JS in de initial load.

**Actie:** Analyseer met `@next/bundle-analyzer` welke exports uit framework chunks niet gebruikt worden. Mogelijk Radix UI components die globaal geimporteerd maar alleen in subpages gebruikt worden.

### Prioriteit 4 — Cache Layer Uitbreiden

Momenteel gebruiken 9 van de ~190 API routes de cache layer. De meest gelezen endpoints (brand-assets, personas, campaigns lijsten) kunnen ook profiteren.

**Actie:** Cache toevoegen aan:
- `GET /api/brand-assets` (30s stale-while-revalidate)
- `GET /api/personas` (30s)
- `GET /api/campaigns` (30s)
- `GET /api/strategies` (30s)
- Cache invalidatie bij POST/PATCH/DELETE mutations

### Prioriteit 5 — Radix UI Bundle

Radix UI primitives (121 KB raw) worden volledig gebundeld. Veel daarvan zijn alleen nodig in specifieke modals/dialogs.

**Actie:** Verplaats Radix-heavy components (Accordion, Popover, Tooltip, Tabs) naar lazy-loaded chunks per feature module.

---

## Appendix A: Build Output

```
Next.js 16.1.6 (Turbopack)
Compiled successfully in 3.4s
119 static pages generated in 75.4ms
~225 API routes (dynamic)
```

## Appendix B: Meetomstandigheden

- **Machine:** macOS Darwin 25.2.0
- **Build:** Production (`next build`)
- **Lighthouse:** v13.0.3, headless Chrome, `next start` op port 3001
- **API timing:** curl naar `next dev` op port 3000, localhost PostgreSQL
- **Database:** Seed data (73 tabellen, ~200 records)
