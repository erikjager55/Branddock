---
id: page-publish-versioned
title: Versioned publishes (PagePublish + live-pointer) + publish-UI in Step 4
fase: pre-launch
priority: now
effort: 2,5-3,5 dagen
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: claude/puck-editor-improvement-y9ep4x
---

# Probleem

Publiceren van webpagina's (5 Puck-content-types + long-form GEO) liep via
`publishLandingPage`, dat één `LandingPage`-rij per (workspace, locale, slug)
UPSERT-te: elke publish overschreef de vorige snapshot — geen historie, geen
rollback. Bovendien bestond er géén publish-UI: Step 4's `PublishGate` roept
een andere, generieke route aan; de landing-pages-publish-route was alleen via
API bereikbaar. Marktreferentie (verbeterplan §Fase A P1): Framer publiceert
immutable versies met een live-pointer; Netlify's rollback is een pointer-swap.

# Voorstel

Append-only `PagePublish`-snapshots (version = max+1 per pagina) + een
`livePublishId`-pointer op `LandingPage`. Publish schrijft snapshot + repoint
in één transactie; rollback is uitsluitend een pointer-swap + revalidate.
Nieuwe API-routes voor versielijst, rollback en in-app versie-preview, plus
een `WebPagePublishPanel` in Step 4 (slug, Publiceer, live-URL, versielijst,
herstel, bekijk) voor alle `isPuckRenderable` types.

# Acceptatiecriteria

- [x] `PagePublish`-model (append-only, `@@unique([landingPageId, version])`) + `LandingPage.livePublishId`-pointer; legacy `puckData`-kolom blijft als fallback voor bestaande rijen
- [x] `publishLandingPage` maakt per publish een nieuwe versie (max+1) en repoint de live-pointer, transactioneel; signature + return-shape backward-compatible (additief: `publishedById?`, `version`)
- [x] `resolvePublishedPage` behoudt exact dezelfde signature/return-shape; serveert `livePublish.puckData` zodra de pointer gezet is, anders de legacy kolom
- [x] `listPagePublishes` + `rollbackToPublish` helpers (JSDoc'd, duck-typed, smoke-testbaar)
- [x] GET `/api/landing-pages/[deliverableId]/publishes` — versielijst + slug + status + liveVersion + publicUrl per pagina (één per locale mogelijk)
- [x] POST `/api/landing-pages/[deliverableId]/rollback` — Zod-body, scope-check (publish → pagina → dít deliverable), pointer-swap, `revalidatePath('/p/<ws>/<slug>')`, cache-invalidation, `{ ok, liveVersion }`
- [x] GET `/api/landing-pages/[deliverableId]/publish-preview?publishId=` — snapshot-puckData voor in-app preview (geen publieke token-preview in deze taak)
- [x] `WebPagePublishPanel` in Step 4 voor `isPuckRenderable` types: slug-input (default: geslugificeerde deliverable-titel, client-side `isValidSlug`), Publiceer-knop, live-URL-link, versielijst met "Herstel deze versie" (window.confirm) en "Bekijk" (lichtgewicht sectie-samenvatting; `// TODO(E1)` voor visuele preview via PageRender)
- [x] Loading + error states in het panel; Lucide icons; i18n (EN + NL) in `campaigns-canvas-accordion`
- [x] `npx prisma validate` + `npx prisma generate` OK
- [x] `npx tsc --noEmit` 0 errors
- [x] `npx eslint` op alle geraakte bestanden 0 errors (2 pre-existing warnings in Step4Timeline, ongerelateerd)
- [x] Smoke-test uitgevoerd (`web-page-builder-phase4.ts`: 53 pass / 0 fail, incl. nieuwe versie- en pointer-asserties)

# Bestanden die ik aanraak

- `prisma/schema.prisma` — `PagePublish`-model + `livePublishId`/relaties op `LandingPage` + gereserveerd homepage-pointer-comment (site-laag §6.1)
- `src/lib/landing-pages/publish-page.ts` — transactionele versioned publish, pointer-resolutie, `listPagePublishes`, `rollbackToPublish`
- `src/app/api/landing-pages/publish/route.ts` — alléén `publishedById: session.user.id` doorgeven (ISR-fix-revalidatePath blijft ongewijzigd)
- `src/app/api/landing-pages/[deliverableId]/publishes/route.ts` — nieuw (GET versielijst)
- `src/app/api/landing-pages/[deliverableId]/rollback/route.ts` — nieuw (POST pointer-swap)
- `src/app/api/landing-pages/[deliverableId]/publish-preview/route.ts` — nieuw (GET snapshot)
- `src/features/campaigns/components/canvas/WebPagePublishPanel.tsx` — nieuw (publish-UI)
- `src/features/campaigns/components/canvas/accordion/Step4Timeline.tsx` — panel-wiring (import + render bij `isPuckType`)
- `src/lib/ui-i18n/locales/en/campaigns-canvas-accordion.ts` — `webPublish.*` strings
- `src/lib/ui-i18n/locales/nl/campaigns-canvas-accordion.ts` — `webPublish.*` strings
- `scripts/smoke-tests/web-page-builder-phase4.ts` — mock uitgebreid naar het nieuwe client-contract (`pagePublish` + `$transaction`) + versie/pointer-asserties

# Bestanden die ik NIET aanraak

- `src/app/p/**` — publieke render-route, parallelle engineer (P0/E1); `resolvePublishedPage`-contract bewust ongewijzigd gehouden
- `src/features/campaigns/components/canvas/medium/**` — Puck-editor-laag, parallelle taak
- `src/features/campaigns/components/canvas/PublishGate.tsx` — generieke publish-gate blijft zoals hij is (P6 bedraadt merkvalidatie later)
- `roadmap.md`, `docs/changelog.md`, `gotchas.md`, `CLAUDE.md`, `package.json`

# Smoke test plan

1. `npx tsx scripts/smoke-tests/web-page-builder-phase4.ts` → 53 pass, 0 fail (versie-increment, pointer-repoint, pointer-preferentie in resolve, legacy-fallback)
2. Handmatig (na db push): open een landing-page-deliverable → Step 4 → panel toont slug-default; Publiceer → live-URL verschijnt, versielijst toont v1 (Live)
3. Publiceer nogmaals → v2 wordt Live; "Herstel deze versie" op v1 → confirm → liveVersion 1; publieke URL serveert de v1-snapshot (na revalidate)
4. "Bekijk" op een versie → modal met versienummer, datum en sectie-type-lijst

# Risico's

- **Schema op Neon vergeten** — zie Rollout hieronder; zonder push 500'en de nieuwe routes + elke publish na deploy.
- **Concurrent publishes op dezelfde pagina** — race op `max(version)+1`; de `@@unique([landingPageId, version])` laat de verliezer met P2002 falen i.p.v. stil te dupliceren (retryable; gedocumenteerd in JSDoc).
- **Legacy rijen zonder pointer** — blijven renderen via de `LandingPage.puckData`-fallback in `resolvePublishedPage`; eerste nieuwe publish zet de pointer en start de historie op v1.
- **puckData-mirror vs. pointer na rollback** — rollback verlegt alléén de pointer; de legacy kolom blijft de láátst gepubliceerde snapshot tonen. Enige lezer van die kolom is de fallback-tak (pointer null), dus geen drift op het live pad.

# Out of scope

- Publieke preview-URL per versie met signed token (P1-spec noemt 'm; deze taak levert in-app preview — token-variant volgt)
- Cache-tags keyed op snapshot-id (Storyblok-`cv`-patroon) — hangt samen met P2 compile-to-static
- Visuele versie-preview via eigen `<PageRender>` — komt met E1 (`// TODO(E1)` markering staat in het panel)
- Homepage-pointer/site-laag (§6.1) — alleen als comment gereserveerd in het schema
- Merkvalidatie in de publish-actie (P6) en `puckData` → `pageData` hernoemen (D6)

# Notes

## Rollout (⚠️ verplicht vóór deploy-verkeer)

- **⚠️ Handmatige Neon `prisma db push` bij deploy** (gotcha `neon-schema-push-on-deploy`, precedent `tasks/done/agents-foundation.md`): nieuw model `PagePublish` + kolom `LandingPage.livePublishId` (+ unique) + relaties. In deze container draait geen database — er is bewust GEEN `db push` uitgevoerd; alleen `prisma validate` + `prisma generate`. Zonder push 500't elke publish/rollback/versielijst-route na deploy.
- Additief schema: bestaande `LandingPage`-rijen krijgen `livePublishId = NULL` en blijven via de legacy `puckData`-kolom renderen — geen backfill nodig.

## Beslissingen onderweg

- `LandingPage.puckData` blijft bij elke publish als mirror meegeschreven (goedkoop, houdt pre-versioning readers heel); de live waarheid is de pointer zodra gezet.
- Duck-typed Prisma-interfaces per functie gesplitst (`PublishClient` / `PublishHistoryClient` / resolve-client) zodat de smoke-mock alleen hoeft te leveren wat elke functie echt gebruikt; routes casten via `prisma as unknown as Parameters<typeof fn>[0]` (bestaand patroon).
- `publishes`-GET levert additief `deliverableTitle` + `workspaceSlug` mee — het panel gebruikt die voor de slug-default en de URL-prefix, scheelt een tweede endpoint.
- Panel synct na publish de canvas-store (`setApprovalState` → PUBLISHED via 'webpage') + invalideert campaign/content-library-query-caches, consistent met wat de publish-route server-side aan de deliverable schrijft.
