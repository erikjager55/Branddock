---
id: lp-isr-cache-fix
title: P0 — publieke render-route statisch cachebaar (pad-params i.p.v. searchParams)
fase: launch
priority: now
effort: 0,5 dag
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: claude/puck-editor-improvement-y9ep4x (remote sessie)
---

# Probleem

`/p/[slug]` las `searchParams` (`?workspace=`) — een Dynamic API die de route
naar dynamische rendering schakelt. `revalidate = 3600` had daardoor géén
effect: elke publieke paginaweergave draaide de volledige keten (5-7
Prisma-queries + `assembleCanvasContext` + runtime render) — latency- én
kostenbug (Fluid CPU). Vondst uit het publish-architectuur-onderzoek
(`docs/reports/webpage-bouw-en-publicatie-marktonderzoek-2026-08-07.md` §4.1).

# Voorstel

Workspace als pad-parameter: nieuwe route `/p/[workspace]/[slug]` (alleen
`params` → statisch/ISR-cachebaar), middleware-rewrite ernaartoe, on-demand
`revalidatePath` bij publish als primair verversmechanisme, fallback-TTL 7
dagen. Oude `/p/[slug]` blijft als redirect-shim (workspace-query →
permanentRedirect; anders 404).

# Acceptatiecriteria

- [x] `<ws>.branddock.app/<slug>` rewrite naar `/p/<ws>/<slug>` (host-router + smokes)
- [x] Render-route gebruikt uitsluitend `params`; `revalidate = 604800`
- [x] Publish doet `revalidatePath('/p/<ws>/<slug>')`
- [x] Legacy shim redirect + 404-gedrag
- [x] `npx tsc --noEmit` 0 errors
- [x] Smokes `web-page-builder-phase4` + `geo-discovery` groen (assertions geüpdatet naar nieuw formaat)
- [ ] [DEPLOY] `x-vercel-cache: HIT` verifiëren op prod na deploy

# Out-of-scope

- Statische compilatie bij publish (P2) en versioned publishes (P1) — aparte taken.

# Notes

Geraakte files: `src/app/p/[workspace]/[slug]/page.tsx` (nieuw),
`src/app/p/[slug]/page.tsx` (shim), `src/lib/landing-pages/host-router.ts`,
`src/app/api/landing-pages/publish/route.ts`,
`scripts/smoke-tests/web-page-builder-phase4.ts`, `scripts/smoke-tests/geo-discovery.ts`.
