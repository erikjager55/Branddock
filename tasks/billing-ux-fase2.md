---
id: billing-ux-fase2
title: Facturatie & abonnementen — Fase 2 (workspace/invite-UX consolideren + i18n-foutcontract)
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: -
worktree: branddock-billing-ux-fase2
---

# Probleem

Workspace-aanmaak en teamuitnodigen hadden elk 3 losse implementaties, geen enkele checkte vooraf of het mocht (altijd pas ná een mislukte poging een hardcoded Engelse `alert()`). Er waren daarnaast twee losse teamuitnodiging-backends — maar één van de twee verstuurt daadwerkelijk een e-mail, dus welk scherm je gebruikte bepaalde stil of de uitgenodigde persoon iets ontving. Fase 1 (`billing-entitlements-fase1`) legde het echte `code`-veld op 402/403-responses klaar; deze fase consumeert dat contract in de UI.

# Voorstel

Eén i18n-foutcontract (`ApiError` + `translateApiError()` + nieuwe `entitlement-errors`-namespace) en gedeelde hooks (`useWorkspaceEntitlements()`, `useCreateWorkspace()`) die overal hergebruikt worden: `OrganizationSwitcher`, Instellingen → Workspaces, en de losse agency-implementatie (die nu de echte `WorkspacesTab` rendert i.p.v. een eigen kopie). De "+ Nieuwe workspace"-knop wordt proactief `disabled` op de limiet, met vertaalde tooltip. Teamuitnodigen gaat voortaan altijd via de e-mail-verzendende route (`/api/organization/invite`); de niet-verzendende route (`settings/team/invite`) is verwijderd.

# Acceptatiecriteria

- [x] Nieuwe i18n-namespace `entitlement-errors` (en/nl) met `code.*`-mapping voor alle backend error-codes uit Fase 1
- [x] `src/lib/api/api-error.ts`: `ApiError`-klasse, `throwApiError()`, `translateApiError()`
- [x] `src/lib/api/workspaces.ts`: gedeelde fetch/create/delete/update-functies, gebruiken `throwApiError()`
- [x] `src/hooks/use-workspace-entitlements.ts`: `useWorkspaceEntitlements()` (`{current, limit, atLimit, canCreate}` uit `billing.limits.WORKSPACES`) + `useCreateWorkspace()`
- [x] `POST /api/workspaces` en `POST /api/organization/invite` retourneren `code` op alle error-branches
- [x] `OrganizationSwitcher.tsx`: lokale workspace-fetch-logica vervangen door gedeelde hooks; "+ Nieuwe workspace" `disabled` op de limiet met vertaalde tooltip; `createWorkspace`-fouten via `translateApiError` i.p.v. `alert()`
- [x] `WorkspacesTab.tsx` (Instellingen): nieuwe entitlement-header (progress bar + "X / Y" + upgrade-CTA op de limiet), zelfde patroon als `TeamPlanHeader.tsx`
- [x] `AgencySettingsPage.tsx`: eigen duplicaat-`WorkspacesTab`-implementatie (~200 regels) verwijderd, rendert de echte `WorkspacesTab`
- [x] `src/app/api/settings/team/invite/route.ts` verwijderd (niet-e-mail-verzendende route); `InviteMemberModal.tsx` + `TeamManagementPage.tsx` gaan via `/api/organization/invite` (`useInviteMember()`), inclusief `organizationId` in de payload
- [x] String-sniffing-workaround (`.includes('seat')`) in `InviteMemberModal.tsx` verwijderd, vervangen door `translateApiError`
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (0 nieuwe warnings t.o.v. voor deze fase)
- [x] Playwright-smoke: org-switcher-knop correct `disabled` met vertaalde tooltip (`current`/`limit` reëel geïnterpoleerd), Instellingen → Workspaces toont de nieuwe header correct, 0 console-errors

# Bestanden die ik aanraak

- `src/lib/ui-i18n/locales/{en,nl}/entitlement-errors.ts` (nieuw)
- `src/lib/api/api-error.ts` (nieuw)
- `src/lib/api/workspaces.ts` (nieuw)
- `src/hooks/use-workspace-entitlements.ts` (nieuw)
- `src/app/api/workspaces/route.ts`
- `src/app/api/organization/invite/route.ts`
- `src/app/api/settings/team/invite/route.ts` (verwijderd)
- `src/components/auth/OrganizationSwitcher.tsx`
- `src/features/settings/components/workspaces/WorkspacesTab.tsx`
- `src/components/white-label/AgencySettingsPage.tsx`
- `src/features/settings/components/team/InviteMemberModal.tsx`
- `src/components/collaboration/TeamManagementPage.tsx`
- `src/lib/api/settings.ts`
- `src/types/settings.ts`
- `src/lib/ui-i18n/locales/{en,nl}/{auth-chrome,settings-misc,settings-team}.ts`

# Bestanden die ik NIET aanraak

- `PlanComparisonTable.tsx`, `UpgradeModal.tsx`, `CurrentPlanCard.tsx`, `UsageOverviewCard.tsx`, `lock-billing.ts` — Fase 3 (al gemerged, PR #182)
- `src/app/marketing/pricing/page.tsx`, homepage-teaser — Fase 4 (al gemerged, PR #181)
- `src/lib/stripe/enforcement.ts`, `PLAN_LIMITS` — Fase 1 (al gemerged, PR #180), alleen geconsumeerd via `useBillingPlan()`

# Smoke test plan

1. Playwright, org met 16 workspaces op FREE-tier (limiet 1): org-switcher-dropdown open → "+ New workspace" `isDisabled() === true`, `title`-attribuut toont vertaalde, geïnterpoleerde tekst met de echte current/limit-getallen
2. Instellingen → Workspaces: header toont "16 / 1", rode progress bar (over-limiet), "Upgrade plan"-link zichtbaar
3. 0 console-/page-errors door de volledige login → dropdown → settings-flow
4. `npx tsc --noEmit` + `npm run lint` 0 errors

# Risico's

- `getOrgFeatureLimit()`/`useWorkspaceEntitlements()` tonen `Infinity` als "onbeperkt" — al afgedekt door `Number.isFinite()`-checks uit Fase 1/hier
- Verwijderen van `settings/team/invite/route.ts` raakt alleen `InviteMemberModal.tsx` + `TeamManagementPage.tsx` (geverifieerd via grep, geen andere referenties) — beide zijn in dezelfde PR omgebouwd naar de e-mail-verzendende route

# Out of scope

- Daadwerkelijke feature-gating van AI-agents/Trend Radar/exports/prioriteitssupport — open vraag aan Erik, nog niet beantwoord
- Jaarprijs-berekening, volledige `Subscription`/`Plan`-consolidatie — bewust buiten scope, zie Fase 1-task

# Notes

Basis: `/Users/erikjager/.claude/plans/cheeky-swinging-bunny.md` (goedgekeurd 2026-07-17), vervolg op Fase 1 (PR #180, gemerged). Sluit de vier-fasen billing-improvement-plan af samen met Fase 3 (PR #182) en Fase 4 (PR #181).
