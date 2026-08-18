---
id: org-limit-override-ui
title: Bugfix — org-unlimited override (Credit Admin) niet zichtbaar in workspace/seat-UI
fase: pre-launch
priority: now
effort: <30 min
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: -
worktree: branddock-org-limit-override-ui
---

# Probleem

Erik zette zijn org via Credit Admin op "Unlimited workspaces"/"Unlimited seats" (de nieuwe Fase 1-toggles), maar "+ Nieuwe workspace" bleef `disabled` met "1/1". Root cause: `useBillingPlan().limits` (`use-billing.ts`) komt puur uit `PLAN_CONFIGS[tier].limits` — een client-side constante zonder enige kennis van de org-level `-1`-override. `getOrgFeatureLimit()` (Fase 1) past die override wél correct toe, maar wordt alleen server-side aangeroepen in de mutatie-routes (`POST /api/workspaces`, `POST /api/organization/invite`) — nooit in het pad dat de proactieve UI-status voedt. Zowel `useWorkspaceEntitlements()` (Fase 2, OrganizationSwitcher + WorkspacesTab) als `TeamPlanHeader.tsx` (bestaand, seats) lazen dus allebei een limiet die de override nooit kon zien.

# Voorstel

`GET /api/settings/billing` retourneert nu `orgLimits: { WORKSPACES, TEAM_MEMBERS }` (via `getOrgFeatureLimit()`, `null` = unlimited — `Infinity` is niet JSON-serialiseerbaar). `useBillingPlan()` merget dit bovenop `config.limits` via een nieuwe `resolveOrgLimit()`-helper, met een expliciet `undefined`-pad (geen orgLimits-data → gewoon de tier-limiet, nooit stilzwijgend "unlimited" bij een responsvorm-gat).

# Acceptatiecriteria

- [x] `GET /api/settings/billing` retourneert `orgLimits.WORKSPACES`/`orgLimits.TEAM_MEMBERS` (`null` = unlimited) via `getOrgFeatureLimit()`
- [x] `use-billing.ts`: `resolveOrgLimit()` merget de override in `limits.WORKSPACES`/`limits.TEAM_MEMBERS`, in zowel het vroege no-subscription-pad als het volledige pad
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors, 0 nieuwe warnings
- [x] Playwright-smoke lokaal: vóór toggle "+ New workspace" disabled met "16/1"-tooltip; ná het aanzetten van "Unlimited workspaces" via Credit Admin wordt de knop enabled zonder tooltip; Instellingen → Workspaces toont geen rode over-limiet-balk meer; 0 console-errors

# Bestanden die ik aanraak

- `src/app/api/settings/billing/route.ts`
- `src/hooks/use-billing.ts`

# Smoke test plan

1. Lokaal: org met 16 workspaces op FREE-tier (limiet 1) → org-switcher "+ New workspace" disabled, tooltip "16/1"
2. Via Credit Admin "Unlimited workspaces" + "Unlimited seats" aanzetten voor die org
3. Na reload: knop enabled, geen tooltip; Settings → Workspaces toont geen rode balk
4. 0 console-errors

# Risico's

- `TeamPlanHeader.tsx` (bestaande component, niet aangeraakt) leest ook `billing.limits.TEAM_MEMBERS` — profiteert automatisch mee van deze fix zonder eigen wijziging, want de merge zit in `useBillingPlan()` zelf

# Out of scope

- Verdere billing-architectuur — dit is een puur additieve merge bovenop de bestaande Fase 1-server-logica, geen nieuwe enforcement-laag

# Notes

Gevonden door Erik direct na het uitvoeren van taak #30 (eigen org op onbeperkt zetten). Bevestigt de waarde van de eind-tot-eind smoke-test die nu is toegevoegd — een eerdere sessie testte alleen de server-side enforcement (Fase 1) en de proactieve-disable-logica los (Fase 2), maar niet de combinatie "server staat het toe, weerspiegelt de UI dat ook".
