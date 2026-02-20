# OPDRACHT S11 — OAuth + E2E Testing + Performance

## Laatst bijgewerkt: 20 februari 2026

---

## CONTEXT

S10 (Stripe Billing) is afgerond. S11 bereidt Branddock voor op productie door drie pijlers:
1. **OAuth** — Social login via Google, Microsoft en Apple (Better Auth socialProviders plugin)
2. **E2E Testing** — Volledige Playwright coverage van alle modules, inclusief edge cases
3. **Performance** — Bundle splitting, image optimization, API caching, database query optimization

---

## S11.A — OAuth Providers (Google, Microsoft, Apple)

### Architectuur

Better Auth ondersteunt social providers native. De bestaande auth configuratie wordt uitgebreid:

```
src/lib/auth.ts           ← socialProviders toevoegen (google, microsoft, apple)
src/lib/auth-client.ts    ← socialProviders client plugin
src/components/auth/AuthPage.tsx ← Social login buttons toevoegen
```

### Configuratie per provider

**Google:**
- Google Cloud Console → OAuth 2.0 Client ID
- Scopes: `openid`, `email`, `profile`
- Redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/google`

**Microsoft:**
- Azure AD → App Registration → OAuth 2.0
- Scopes: `openid`, `email`, `profile`, `User.Read`
- Redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/microsoft`

**Apple:**
- Apple Developer → Sign In with Apple
- Scopes: `name`, `email`
- Redirect URI: `{BETTER_AUTH_URL}/api/auth/callback/apple`
- ⚠️ Apple vereist een Services ID + Private Key (.p8 file)

### Environment Variables

```env
# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Microsoft OAuth
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_TENANT_ID=...        # 'common' voor multi-tenant

# Apple OAuth
APPLE_CLIENT_ID=...            # Services ID
APPLE_TEAM_ID=...
APPLE_KEY_ID=...
APPLE_PRIVATE_KEY=...          # .p8 key content (multiline)
```

### Bestanden

```
src/lib/auth.ts                          ← UPDATE: socialProviders plugin toevoegen
src/lib/auth-client.ts                   ← UPDATE: socialProviders client config
src/components/auth/AuthPage.tsx         ← UPDATE: Social login buttons (Google/Microsoft/Apple)
src/components/auth/SocialLoginButtons.tsx ← NIEUW: 3 provider buttons met icons
src/components/auth/AuthDivider.tsx      ← NIEUW: "of login met" divider
src/lib/auth/oauth-config.ts            ← NIEUW: provider config + enabled check
```

### Taken

1. **auth.ts uitbreiden** — socialProviders plugin toevoegen aan betterAuth() config:
   ```typescript
   import { betterAuth } from "better-auth";
   
   export const auth = betterAuth({
     // bestaande config...
     socialProviders: {
       google: {
         clientId: process.env.GOOGLE_CLIENT_ID!,
         clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
         enabled: !!process.env.GOOGLE_CLIENT_ID,
       },
       microsoft: {
         clientId: process.env.MICROSOFT_CLIENT_ID!,
         clientSecret: process.env.MICROSOFT_CLIENT_SECRET!,
         tenantId: process.env.MICROSOFT_TENANT_ID || 'common',
         enabled: !!process.env.MICROSOFT_CLIENT_ID,
       },
       apple: {
         clientId: process.env.APPLE_CLIENT_ID!,
         teamId: process.env.APPLE_TEAM_ID!,
         keyId: process.env.APPLE_KEY_ID!,
         privateKey: process.env.APPLE_PRIVATE_KEY!,
         enabled: !!process.env.APPLE_CLIENT_ID,
       },
     },
     // ⚠️ nextCookies() MOET laatste plugin blijven
   });
   ```

2. **auth-client.ts uitbreiden** — social sign-in methods beschikbaar maken

3. **SocialLoginButtons.tsx** — Drie buttons met provider icons:
   - Google: wit met Google G logo, "Doorgaan met Google"
   - Microsoft: wit met Microsoft logo, "Doorgaan met Microsoft"
   - Apple: zwart met Apple logo, "Doorgaan met Apple"
   - Alleen tonen als provider env vars geconfigureerd zijn
   - Loading state per button tijdens redirect
   - Error handling (popup blocked, provider error, account exists met ander provider)

4. **AuthPage.tsx update** — Social buttons boven email/password form:
   ```
   ┌─────────────────────────────┐
   │     Login bij Branddock     │
   │                             │
   │  [G] Doorgaan met Google    │
   │  [M] Doorgaan met Microsoft │
   │  [] Doorgaan met Apple     │
   │                             │
   │  ──── of login met ────     │
   │                             │
   │  Email: [____________]      │
   │  Wachtwoord: [________]    │
   │  [        Inloggen        ] │
   └─────────────────────────────┘
   ```

5. **Account linking** — Als gebruiker inlogt met OAuth maar al een email/password account heeft:
   - Better Auth handelt dit af via `Account` model (meerdere accounts per user)
   - ConnectedAccounts in Settings (S9) tonen gekoppelde providers
   - Update `ConnectedAccounts.tsx` om echte OAuth providers te tonen

6. **Workspace auto-setup** — Na eerste OAuth login:
   - Check of user al een organization heeft
   - Zo niet: maak default organization + workspace aan (zelfde flow als email register)
   - AuthGate.tsx auto-set activeOrganizationId

7. **oauth-config.ts** — Helper om te checken welke providers beschikbaar zijn:
   ```typescript
   export function getEnabledProviders(): Provider[] { ... }
   export function isProviderEnabled(provider: string): boolean { ... }
   ```

### Edge Cases
- Provider env vars niet gezet → buttons niet tonen (graceful)
- User annuleert OAuth popup → error message, niet crashen
- Email al in gebruik door ander provider → account linking suggestie
- Apple verbergt email (relay) → opslaan als relay address, naam uit eerste login
- OAuth tokens vervallen → Better Auth refresh flow

---

## S11.B — E2E Testing (Playwright)

### Setup

```
npm install -D @playwright/test
npx playwright install chromium   # alleen Chromium voor snelheid
```

### Directory Structuur

```
e2e/
├── playwright.config.ts          ← Config (baseURL, retries, timeout, reporters)
├── global-setup.ts               ← DB seed + test user aanmaken
├── global-teardown.ts            ← DB cleanup
├── fixtures/
│   ├── auth.fixture.ts           ← Authenticated page fixture (login + session)
│   ├── workspace.fixture.ts      ← Workspace-aware fixture
│   └── test-data.ts              ← Test user credentials, workspace IDs, seed data refs
├── helpers/
│   ├── navigation.ts             ← navigateTo(section), waitForSection(), clickSidebar()
│   ├── assertions.ts             ← expectPageShell(), expectPageHeader(), expectNoErrors()
│   ├── forms.ts                  ← fillForm(), submitForm(), expectValidationError()
│   └── api.ts                    ← apiLogin(), apiCreateEntity(), apiCleanup()
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts                ← Email login, invalid credentials, session persistence
│   │   ├── register.spec.ts             ← Registration, duplicate email, password validation
│   │   ├── oauth.spec.ts                ← OAuth flows (mock providers in test mode)
│   │   └── logout.spec.ts               ← Logout, session cleanup, redirect to login
│   ├── workspace/
│   │   ├── switching.spec.ts            ← Switch workspace, data isolation
│   │   ├── creation.spec.ts             ← Create workspace, invite flow
│   │   └── permissions.spec.ts          ← Role-based access (owner/admin/member/viewer)
│   ├── dashboard/
│   │   ├── overview.spec.ts             ← Stats, readiness, attention items
│   │   ├── onboarding.spec.ts           ← Wizard flow, quick start checklist
│   │   └── navigation.spec.ts           ← Quick access cards, campaign preview clicks
│   ├── brand-foundation/
│   │   ├── overview.spec.ts             ← Grid view, filters, stats
│   │   ├── create-asset.spec.ts         ← Create modal, validation, success
│   │   ├── detail.spec.ts              ← Detail panel, inline edit, lock/unlock
│   │   └── ai-analysis.spec.ts          ← Start analysis, chat, report generation
│   ├── brandstyle/
│   │   ├── analyzer.spec.ts             ← URL/PDF analysis, polling, results
│   │   └── styleguide.spec.ts           ← 5-tab view, edit, save for AI
│   ├── business-strategy/
│   │   ├── overview.spec.ts             ← Strategy list, create, filters
│   │   └── detail.spec.ts              ← OKR, milestones, edit mode
│   ├── personas/
│   │   ├── overview.spec.ts             ← Grid, create, filters
│   │   ├── create.spec.ts              ← Wizard flow, all fields
│   │   ├── detail.spec.ts              ← 20+ velden, inline edit, lock
│   │   ├── chat.spec.ts                ← Chat modal, message, insights
│   │   ├── ai-analysis.spec.ts          ← 4-dimensie analysis
│   │   └── duplicate.spec.ts            ← Deep copy, verify fields
│   ├── products/
│   │   ├── overview.spec.ts             ← Grid, filters, create
│   │   ├── analyzer.spec.ts             ← URL/PDF/Manual tabs
│   │   ├── detail.spec.ts              ← Edit mode, persona koppeling
│   │   └── delete.spec.ts              ← Confirm dialog, cascade
│   ├── market-insights/
│   │   ├── overview.spec.ts             ← Grid/list, filters, stats
│   │   ├── create.spec.ts              ← Add modal, sources
│   │   └── detail.spec.ts              ← Edit, delete, sources management
│   ├── knowledge/
│   │   ├── library.spec.ts              ← Featured, grid, favorites, archive
│   │   └── resource-crud.spec.ts        ← Create, edit, delete, import URL
│   ├── research/
│   │   ├── hub.spec.ts                  ← Research hub overview
│   │   ├── bundles.spec.ts              ← Marketplace, bundle detail, purchase
│   │   └── custom-validation.spec.ts    ← Builder, sidebar plan
│   ├── campaigns/
│   │   ├── overview.spec.ts             ← Campaign list, stats, filters
│   │   ├── wizard.spec.ts              ← Multi-step wizard, all fields
│   │   ├── detail.spec.ts              ← Deliverables, knowledge, strategy
│   │   ├── quick-content.spec.ts        ← Quick content modal, prompt suggestions
│   │   └── content-library.spec.ts      ← Library view, filters, studio launch
│   ├── content-studio/
│   │   ├── layout.spec.ts              ← 3-panel layout, resize
│   │   ├── editor.spec.ts              ← Text editing, formatting
│   │   ├── right-panel.spec.ts          ← Quality, improve, research, versions
│   │   └── export.spec.ts              ← Export formats, preview
│   ├── brand-alignment/
│   │   ├── overview.spec.ts             ← Score gauge, module grid, issues
│   │   ├── scan.spec.ts                ← Start scan, progress modal, complete
│   │   ├── fix-flow.spec.ts             ← Fix options A/B/C, apply, verify
│   │   └── cross-module.spec.ts         ← Navigate to source entity, sidebar badge
│   ├── settings/
│   │   ├── account.spec.ts              ← Profile, password, email prefs, danger zone
│   │   ├── team.spec.ts                 ← Members, invite, roles, permissions
│   │   ├── billing.spec.ts              ← Plan info, usage (free beta mode)
│   │   ├── notifications.spec.ts        ← Notification preferences
│   │   └── appearance.spec.ts           ← Theme, layout preferences
│   ├── billing/
│   │   ├── plan-enforcement.spec.ts     ← Limits (when enabled), free beta bypass
│   │   ├── checkout.spec.ts             ← Upgrade flow (mock Stripe)
│   │   └── usage.spec.ts               ← AI usage tracking, meters
│   ├── global/
│   │   ├── search.spec.ts              ← Global search, quick actions
│   │   ├── notifications.spec.ts        ← Bell icon, mark read, clear
│   │   ├── sidebar.spec.ts             ← Navigation, collapse, badges
│   │   ├── responsive.spec.ts           ← Mobile/tablet breakpoints
│   │   └── error-handling.spec.ts       ← 404, 500, network errors, empty states
│   └── workshops/
│       ├── purchase.spec.ts             ← Bundle selection, individual, pricing
│       ├── session.spec.ts              ← Timer, steps, responses
│       └── results.spec.ts             ← AI rapport, canvas, notes
```

### Playwright Config

```typescript
// e2e/playwright.config.ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 2,
  workers: 4,           // parallel uitvoering
  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results.json' }],
    ['list'],
  ],
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on-first-retry',
  },
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
});
```

### Auth Fixture

```typescript
// e2e/fixtures/auth.fixture.ts
import { test as base, Page } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  adminPage: Page;
  viewerPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Login via API (skip UI voor snelheid)
    await page.request.post('/api/auth/sign-in/email', {
      data: { email: 'test@branddock.com', password: 'TestPassword123!' }
    });
    // Cookies worden automatisch meegenomen
    await page.goto('/');
    await page.waitForSelector('[data-testid="dashboard"]');
    await use(page);
  },
  // adminPage, viewerPage voor role-based tests...
});
```

### Navigation Helper

```typescript
// e2e/helpers/navigation.ts
import { Page, expect } from '@playwright/test';

export async function navigateTo(page: Page, sectionId: string) {
  // Click sidebar item
  await page.click(`[data-section-id="${sectionId}"]`);
  // Wait for content to render
  await page.waitForSelector('[data-testid="page-shell"]');
}

export async function expectPageHeader(page: Page, title: string) {
  await expect(page.locator('[data-testid="page-header"] h1')).toContainText(title);
}

export async function expectNoConsoleErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  expect(errors).toHaveLength(0);
}
```

### Test Data IDs

⚠️ **Belangrijk**: Tests gebruiken de bestaande seed data uit `prisma/seed.ts`. De vaste IDs uit de seed (S1-S9) worden hergebruikt in tests. `global-setup.ts` draait `npx prisma db seed` voor elke test run.

### Edge Cases per Module

Elke spec file MOET deze edge cases testen:
- **Empty state**: Geen data → EmptyState component toont correct
- **Loading state**: Skeleton loaders verschijnen
- **Error state**: API error → foutmelding, niet crashen
- **Long content**: Overflow/truncation werkt
- **Special characters**: Unicode, emoji's, HTML entities in user input
- **Concurrent edits**: Optimistic updates + server response mismatch
- **Network offline**: Graceful degradation, retry
- **Session expired**: Redirect naar login, geen data loss

### Test Commando's

```json
// package.json scripts
{
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed",
  "test:e2e:debug": "playwright test --debug",
  "test:e2e:report": "playwright show-report"
}
```

---

## S11.C — Performance Optimization

### C1. Bundle Splitting & Lazy Loading

**Doel:** Initiële bundle verkleinen door modules lazy te loaden.

```
src/App.tsx                              ← UPDATE: React.lazy() voor alle module pages
src/lib/lazy-imports.ts                  ← NIEUW: Centralized lazy imports met preload
src/components/shared/LazyWrapper.tsx    ← NIEUW: Suspense wrapper met Skeleton fallback
```

**Aanpak:**
```typescript
// src/lib/lazy-imports.ts
import { lazy } from 'react';

// Elke module page als lazy import
export const DashboardPage = lazy(() => import('@/components/dashboard/DashboardPage'));
export const BrandFoundationPage = lazy(() => import('@/components/brand-foundation/BrandFoundationPage'));
export const PersonasPage = lazy(() => import('@/features/personas/PersonasPage'));
export const ContentStudioPage = lazy(() => import('@/features/content-studio/ContentStudioPage'));
// ... alle 30+ pages

// Preload functie voor sidebar hover
export function preloadModule(sectionId: string) {
  const loaders: Record<string, () => Promise<any>> = {
    'dashboard': () => import('@/components/dashboard/DashboardPage'),
    'personas': () => import('@/features/personas/PersonasPage'),
    // ...
  };
  loaders[sectionId]?.();
}
```

**App.tsx update:**
```typescript
// Vervang directe imports door lazy imports
// Wrap renderContent() switch cases in <Suspense>
<Suspense fallback={<PageShell><Skeleton className="h-96" /></PageShell>}>
  {renderContent()}
</Suspense>
```

**Sidebar preloading:**
```typescript
// Bij hover over sidebar item → preload die module
<SidebarItem
  onMouseEnter={() => preloadModule(item.sectionId)}
  onClick={() => setActiveSection(item.sectionId)}
/>
```

### C2. Image Optimization

**Bestanden:**
```
src/components/shared/OptimizedImage.tsx  ← NIEUW: Wrapper rond next/image met defaults
src/lib/image-utils.ts                   ← NIEUW: placeholder generation, srcset helpers
next.config.ts                           ← UPDATE: images config (domains, formats)
```

**Aanpak:**
- `OptimizedImage` component: lazy loading, blur placeholder, WebP/AVIF
- next.config.ts: `images.formats: ['image/avif', 'image/webp']`
- Avatar images: `sizes="40px"` (niet full-width laden)
- Logo's en branding: SVG waar mogelijk, anders optimized PNG
- Upload previews: client-side resize voor thumbnails

### C3. API Response Caching

**Bestanden:**
```
src/lib/api/cache.ts                     ← NIEUW: Server-side response cache layer
src/lib/api/cache-keys.ts                ← NIEUW: Cache key generators per module
src/middleware.ts                         ← UPDATE: Cache-Control headers
```

**Strategie per endpoint type:**

| Type | Cache | Voorbeeld |
|------|-------|-----------|
| Statische lijsten | 5 min + stale-while-revalidate | `/api/knowledge-resources/types` |
| Module overzichten | 30 sec + revalidate on mutation | `/api/personas`, `/api/campaigns` |
| Detail pagina's | 60 sec + revalidate on mutation | `/api/personas/:id` |
| Dashboard stats | 60 sec | `/api/dashboard/stats` |
| AI calls | Geen cache | `/api/ai/completion` |
| Mutations (POST/PATCH/DELETE) | Invalideer gerelateerde caches | — |

**Server-side implementatie:**
```typescript
// src/lib/api/cache.ts
const cache = new Map<string, { data: any; expiresAt: number }>();

export function withCache(key: string, ttlSeconds: number) {
  return (handler: RouteHandler) => async (req, ctx) => {
    const cached = cache.get(key);
    if (cached && Date.now() < cached.expiresAt) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'HIT' }
      });
    }
    const response = await handler(req, ctx);
    const data = await response.json();
    cache.set(key, { data, expiresAt: Date.now() + ttlSeconds * 1000 });
    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS' }
    });
  };
}

export function invalidateCache(pattern: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) cache.delete(key);
  }
}
```

**TanStack Query optimalisatie:**
- `staleTime` afstemmen per module (nu vaak 0 = altijd refetch)
- `gcTime` (garbage collection) verhogen voor stable data
- `refetchOnWindowFocus: false` voor detail pagina's
- `placeholderData` gebruiken voor instant page transitions

### C4. Database Query Optimization

**Bestanden:**
```
src/lib/db/                              ← NIEUW directory
├── queries.ts                           ← Geoptimaliseerde Prisma queries (select/include)
├── indexes.ts                           ← Documentatie van benodigde indexes
└── connection.ts                        ← Prisma client singleton + connection pooling

prisma/migrations/xxx_add_indexes/       ← Migratie voor ontbrekende indexes
```

**Optimalisaties:**

1. **Select only needed fields** — Veel queries doen `findMany()` zonder `select`, laden alle velden:
   ```typescript
   // ❌ Laadt ALLES
   prisma.persona.findMany({ where: { workspaceId } });
   
   // ✅ Alleen wat de overview nodig heeft
   prisma.persona.findMany({
     where: { workspaceId },
     select: { id: true, name: true, role: true, status: true, avatar: true, updatedAt: true }
   });
   ```

2. **Composite indexes** toevoegen:
   ```prisma
   model Persona {
     @@index([workspaceId, status])
     @@index([workspaceId, createdAt])
   }
   model Campaign {
     @@index([workspaceId, status])
     @@index([workspaceId, createdAt])
   }
   model AiUsageRecord {
     @@index([workspaceId, createdAt])
     @@index([userId, createdAt])
   }
   // etc. voor alle modellen met workspaceId + veelgebruikte filters
   ```

3. **N+1 query preventie** — Gebruik `include` of batch queries:
   ```typescript
   // ❌ N+1: loop met individuele queries
   for (const campaign of campaigns) {
     campaign.deliverables = await prisma.deliverable.findMany({ where: { campaignId: campaign.id } });
   }
   
   // ✅ Eén query met include
   const campaigns = await prisma.campaign.findMany({
     where: { workspaceId },
     include: { deliverables: { select: { id: true, title: true, status: true } } }
   });
   ```

4. **Prisma client singleton** — Voorkom connection pool exhaustion in development:
   ```typescript
   // src/lib/db/connection.ts
   import { PrismaClient } from '@prisma/client';
   
   const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };
   export const prisma = globalForPrisma.prisma ?? new PrismaClient({
     log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
   });
   if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
   ```

5. **Count queries optimaliseren** — Gebruik `_count` in plaats van `findMany().length`:
   ```typescript
   // ❌ Laadt alle records in memory
   const count = (await prisma.persona.findMany({ where: { workspaceId } })).length;
   
   // ✅ Database doet het werk
   const count = await prisma.persona.count({ where: { workspaceId } });
   ```

---

## SPRINT STRUCTUUR (8 sessies, 2 parallel tabs)

### Sessie 1
| Tab 1 | Tab 2 |
|-------|-------|
| **S11.A.1** OAuth Config — auth.ts + auth-client.ts uitbreiden, oauth-config.ts, env vars | **S11.B.1** Playwright Setup — install, config, global setup/teardown, fixtures, helpers |

### Sessie 2
| Tab 1 | Tab 2 |
|-------|-------|
| **S11.A.2** OAuth UI — SocialLoginButtons, AuthDivider, AuthPage update, ConnectedAccounts update | **S11.B.2** Tests: Auth + Workspace — login, register, oauth mock, logout, workspace switching/creation/permissions |

### Sessie 3
| Tab 1 | Tab 2 |
|-------|-------|
| **S11.B.3** Tests: Dashboard + Brand Foundation + Brandstyle — overview, onboarding, navigation, assets, detail, AI analysis, analyzer, styleguide | **S11.B.4** Tests: Strategy + Personas + Products — overview, create, detail, chat, AI analysis, duplicate, analyzer, delete |

### Sessie 4
| Tab 1 | Tab 2 |
|-------|-------|
| **S11.B.5** Tests: Market Insights + Knowledge + Research — overview, create, detail, library, bundles, custom validation | **S11.B.6** Tests: Campaigns + Content Studio + Content Library — overview, wizard, detail, quick content, studio layout/editor/panels, export |

### Sessie 5
| Tab 1 | Tab 2 |
|-------|-------|
| **S11.B.7** Tests: Brand Alignment + Workshops — scan, fix flow, cross-module, purchase, session, results | **S11.B.8** Tests: Settings + Billing + Global — account, team, billing, notifications, appearance, search, sidebar, responsive, error handling |

### Sessie 6
| Tab 1 | Tab 2 |
|-------|-------|
| **S11.C.1** Bundle Splitting — lazy-imports.ts, LazyWrapper, App.tsx refactor, sidebar preloading | **S11.C.2** Image Optimization — OptimizedImage component, next.config images, avatar/logo optimization |

### Sessie 7
| Tab 1 | Tab 2 |
|-------|-------|
| **S11.C.3** API Caching — cache.ts, cache-keys.ts, middleware headers, TanStack staleTime tuning | **S11.C.4** DB Optimization — queries.ts, indexes migratie, N+1 fixes, Prisma singleton, count optimalisatie |

### Sessie 8
| Tab 1 | Tab 2 |
|-------|-------|
| **S11.INT** Integratie — alle onderdelen samen testen, 0 TS errors, `npm run test:e2e` groen | **S11.INT** Performance meting — Lighthouse scores voor/na, bundle size analyse, query timing logs |

---

## DATA-TESTID CONVENTIE

Alle UI componenten MOETEN `data-testid` attributes krijgen voor E2E tests:

```
Pagina's:       data-testid="page-shell"
Headers:        data-testid="page-header"
Sidebar items:  data-section-id="{sectionId}"
Forms:          data-testid="{form-name}-form"
Buttons:        data-testid="{action}-button"  (create-persona-button, save-button)
Modals:         data-testid="{name}-modal"
Cards:          data-testid="{entity}-card-{id}"
Empty states:   data-testid="empty-state"
Loading:        data-testid="skeleton-loader"
Errors:         data-testid="error-message"
```

⚠️ Voeg deze toe tijdens de E2E sessies, niet apart. Elke test die een element nodig heeft voegt de `data-testid` toe aan het component.

---

## KRITIEKE REGELS

1. **OAuth providers zijn optioneel** — app MOET werken zonder OAuth env vars (alleen email/password)
2. **nextCookies() blijft laatste plugin** in Better Auth config
3. **Tests mogen geen externe services raken** — mock Stripe, mock AI, mock OAuth
4. **Seed data is de test fixture** — geen aparte test database, gebruik bestaande seed
5. **Performance changes mogen geen functionaliteit breken** — bundle split = same behavior
6. **Alle lazy imports moeten een Suspense fallback hebben** — nooit een blank screen
7. **Cache invalidatie bij mutations** — POST/PATCH/DELETE moet relevante caches clearen
8. **Prisma singleton in development** — voorkom "Too many connections" errors
9. **0 TS errors na elke sessie**
10. **PATTERNS.md volgen voor alle nieuwe UI componenten**

---

## DEFINITION OF DONE

- [ ] Google, Microsoft, Apple OAuth werkt (met test credentials)
- [ ] AuthPage toont social buttons + email/password fallback
- [ ] ConnectedAccounts in Settings toont gekoppelde providers
- [ ] Playwright suite: 60+ spec files, alle modules gedekt
- [ ] `npm run test:e2e` draait zonder failures
- [ ] Bundle size: <500KB initial load (na splitting)
- [ ] Lighthouse Performance score: >80
- [ ] Alle API endpoints met cache headers
- [ ] Database indexes op alle workspaceId + filter combinaties
- [ ] Geen N+1 queries in overzichtspagina's
- [ ] 0 TypeScript errors
