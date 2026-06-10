---
id: workspace-zombie-tab-fix
title: Zombie-tab fix — resource-based auth voor canvas-kritieke studio-routes + cross-tab switch-guard
priority: now
effort: ~0.5-1 dag
status: done — F1 (alle 38 studio-routes) + F2 gebouwd + E2E/browser-geverifieerd 2026-06-10
---

# Zombie-tab fix (F1 + F2 uit audit 2026-06-10)

> Audit: `docs/audits/2026-06-10-workspace-cookie-zombie-tabs.md`
> Oorzaak: `branddock-workspace-id`-cookie is browser-globaal; switch reload't alleen eigen tab → andere tabs 404'en stil op alle `/api/studio/*`-persists (incl. puckData-autosave = data-loss).

## Scope

**F1 — resource-based auth (kern)**
- Nieuwe helper `src/lib/deliverable/deliverable-access.ts`: `requireDeliverableAccess(deliverableId)` → sessie-check + deliverable→campaign.workspaceId + `hasWorkspaceAccess()` (bestaand, 9.6 M9). Autoriseert op de workspace VAN het deliverable, niet op cookie-gelijkheid.
- Omzetten (5 route-files, alle methods): `studio/[deliverableId]/route.ts` (GET/PATCH), `context`, `generate-visual`, `hero-image`, `components` (GET).
- Downstream `workspaceId` = workspace van het deliverable (cache-invalidation, brand-context blijven correct).

**F2 — cross-tab guard (defense-in-depth)**
- `OrganizationSwitcher`: broadcast op `BroadcastChannel('branddock-workspace')` na succesvolle switch (workspace én org).
- Nieuw `src/components/shared/WorkspaceSwitchGuard.tsx`: app-breed gemount, toont blocking overlay "Workspace gewijzigd → herlaad" in andere tabs (géén auto-reload — mid-edit data-loss).

## Out-of-scope
- ~~Overige 33 cookie-scoped studio-routes~~ → **alsnog gedaan in vervolg-sessie 2026-06-10**: mechanische sweep naar `resolveDeliverableWorkspaceId()` (drop-in: zelfde `string | null`-contract als `resolveWorkspaceId()`, bestaande `if (!workspaceId)`-guards + scoped fetches blijven per constructie werken). 33/33 automatisch, 0 handmatig.
- F3 distinct mismatch-error — vervallen: na de volledige sweep bestaat het mismatch-pad in studio-routes niet meer.

## Acceptatiecriteria / smoke
1. `tsc --noEmit` 0, eslint 0 errors op gewijzigde files.
2. E2E-regressietest van de bug: GET `/api/studio/<id>` + `/context` + harmless PATCH **zónder** workspace-cookie (curl, sessie via sign-in) → 200 waar het vóór de fix "Not found" was; met cookie van een ándere workspace → ook 200.
3. Niet-lid blijft geweigerd: 403-pad via `hasWorkspaceAccess` (TechCorp-user op Napking-deliverable).
4. Bestaande hero-smokes blijven groen (phase61 25/25, phase68 24/24).

## Verificatie-resultaat (2026-06-10)

| Check | Resultaat |
|---|---|
| tsc --noEmit | 0 errors |
| eslint gewijzigde files | 0 errors (alle warnings pre-existing unused-vars) |
| GET studio / context / components / PATCH zónder ws-cookie | alle 200 (was 403/404) |
| GET studio met VERKEERDE ws-cookie (Zwarthout op Napking-deliverable) | 200 |
| generate-visual + hero-image zonder cookie (invalid-body probe) | 400 = auth gepasseerd |
| TechCorp-user (geen org-membership) GET + PATCH | 403 |
| Niet-bestaand deliverable / geen sessie | 404 / 401 |
| Hero-smokes phase61 / phase68 | 25/25 + 24/24 PASS |

## Verificatie vervolg-sessie (sweep + F2, 2026-06-10)

| Check | Resultaat |
|---|---|
| Sweep 33 routes: grep resolveWorkspaceId in studio/ | 0 over |
| tsc + eslint na sweep | 0 errors (1 pre-existing warning) |
| GET readiness + components/progress zonder/met verkeerde ws-cookie | 200 |
| TechCorp-user / geen sessie op swept route | 401 |
| F1-routes regressie (studio GET + context) | 200 |
| **F2 two-tab browser-smoke** (`scripts/dev/f2-zombie-tab-smoke.mjs`, Playwright, echte OrganizationSwitcher-UI) | PASS — overlay in tab A met workspace-naam + herlaad-knop werkt |

**Let op**: dev-server moest herstart worden na de sweep — Turbopack serveerde een stale module-versie van `deliverable-access.ts` ("resolveDeliverableWorkspaceId is not a function") ondanks touches; herstart loste het op. Draait nu via nohup, log `/tmp/branddock-dev-restart.log`.

## File-ownership
Raakt `generate-visual/route.ts` en `studio/[deliverableId]/route.ts` die gestaged zijn door parallelle lp-editor-image-field-sessie — alleen de auth-sectie bovenin wijzigen, minimale diff.
