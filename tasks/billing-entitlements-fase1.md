---
id: billing-entitlements-fase1
title: Facturatie & abonnementen — Fase 1 (backend-entitlements echt afdwingen)
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: -
worktree: branddock-billing-entitlements-fase1
---

# Probleem

Er zijn drie losse systemen die bijhouden "welk abonnement heeft deze organisatie": `Organization.type`/`maxWorkspaces`/`maxSeats` (wordt nooit bijgewerkt na signup, maar is wél de kolom die workspace-aanmaak en teamuitnodigingen blokkeert), `Workspace.planTier` (correct bijgewerkt door de Stripe-webhook, drijft de creditbalans) en de legacy `Subscription.plan.slug` (drijft de "huidig abonnement"-kaart, tier-mapping mist Starter/Growth). Gevolg: niemand die upgradet krijgt ooit daadwerkelijk extra workspaces of teamleden. Root-cause-analyse + goedgekeurd plan: zie `/Users/erikjager/.claude/plans/cheeky-swinging-bunny.md`.

# Voorstel

`Organization.type` stopt als runtime-gate; workspace-/teamlid-limieten gaan via `PLAN_LIMITS[workspace.planTier]` (bestaat al, correct, wordt al voor personas/campagnes gebruikt via `enforcePlanLimit()` — alleen nooit voor workspaces/teamleden). `Organization.maxWorkspaces`/`maxSeats` blijven bestaan maar `-1` betekent voortaan "door developer toegekend onbeperkt" (elke andere waarde genegeerd — geen migratie nodig, huidige defaults 1/3 worden onschadelijke no-ops). Twee nieuwe knoppen in het bestaande Credit Admin-paneel geven dit een UI. Laatste stap: Eriks eigen org op onbeperkt zetten.

# Acceptatiecriteria

- [x] `enforceOrgPlanLimit()`/`getOrgPlanTier()`/`getOrgFeatureLimit()` nieuw in `src/lib/stripe/enforcement.ts`, hergebruiken `PLAN_LIMITS` en een gedeelde `buildLimitResponse()`-helper (uit `enforcePlanLimit()` getrokken)
- [x] `POST /api/workspaces` gebruikt `enforceOrgPlanLimit(activeOrgId, 'WORKSPACES')` i.p.v. de `type !== "AGENCY"`/`maxWorkspaces`-checks; nieuwe workspace krijgt `planTier: await getOrgPlanTier(activeOrgId)` mee
- [x] `POST /api/organization/invite` gebruikt `enforceOrgPlanLimit(activeOrgId, 'TEAM_MEMBERS')`
- [x] **Scope-bijstelling tijdens uitvoering**: `src/app/api/settings/team/invite/route.ts` blijft in Fase 1 bestaan (verwijderen zonder de frontend tegelijk te verhuizen naar `/api/organization/invite` zou de live uitnodigingsflow breken tussen deploys door) — alleen de seat-check is consistent gemaakt (`enforceOrgPlanLimit`). Verwijderen + frontend ombouwen naar de e-mail-verzendende route is volledig Fase 2-scope, waar de UX-consolidatie toch al gebeurt
- [x] `GET /api/settings/team` retourneert `maxSeats` via `getOrgFeatureLimit()` i.p.v. de rauwe kolom
- [x] `src/hooks/use-billing.ts` tier-whitelist bevat STARTER/GROWTH
- [x] `src/app/api/stripe/checkout/route.ts` `VALID_TIERS` bevat STARTER/GROWTH
- [x] `openCheckout`/`openPortal` in `use-billing.ts` gebruiken `mutateAsync` + tonen een `sonner`-toast bij falen
- [x] `POST /api/admin/credit-orgs` ondersteunt `setUnlimitedWorkspaces`/`setUnlimitedSeats` (zet `-1`), `GET` retourneert de nieuwe velden
- [x] `CreditAdminPanel.tsx` heeft twee nieuwe knoppen, zelfde patroon als de bestaande "Maak onbeperkt"
- [ ] Eriks org (workspace `cmr4znouo000204ic257g3gcn`, `erik@betterbrands.nl`) op prod: `unlimitedCredits`/`unlimitedWorkspaces`/`unlimitedSeats` alle drie aan — **na merge + deploy**, zie Notes
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Smoke-test uitgevoerd (`scripts/dev/tmp-smoke-entitlements.ts`, lokaal gedraaid en weer verwijderd — zie Notes voor resultaten)

# Bestanden die ik aanraak

- `src/lib/stripe/enforcement.ts`
- `src/lib/constants/plan-limits.ts` (indien een `NEXT_TIER`-achtige export hier al zin heeft — anders Fase 3)
- `src/app/api/workspaces/route.ts`
- `src/app/api/organization/invite/route.ts`
- `src/app/api/settings/team/invite/route.ts` (niet verwijderd — zie scope-bijstelling; seat-check wel consistent gemaakt)
- `src/app/api/settings/team/route.ts`
- `src/app/api/stripe/checkout/route.ts`
- `src/hooks/use-billing.ts`
- `src/app/api/admin/credit-orgs/route.ts`
- `src/hooks/use-credit-admin.ts`
- `src/features/settings/components/developer/CreditAdminPanel.tsx`

# Bestanden die ik NIET aanraak

- `src/components/auth/OrganizationSwitcher.tsx`, `WorkspacesTab.tsx`, `AgencySettingsPage.tsx`, `InviteMemberModal.tsx`, `TeamManagementPage.tsx` — UX-consolidatie + i18n-mapping is Fase 2 (aparte task/PR, hangt af van deze fase se `code`-veld)
- `PlanComparisonTable.tsx`, `UpgradeModal.tsx`, `CurrentPlanCard.tsx`, `UsageOverviewCard.tsx`, `lock-billing.ts` — Fase 3
- `src/app/marketing/pricing/page.tsx`, homepage-teaser — Fase 4

# Smoke test plan

1. Lokaal: seed/testworkspace op GROWTH-tier, 2e t/m 5e workspace aanmaken → slaagt, 6e → 402 met `code: WORKSPACE_LIMIT_REACHED`
2. Lokaal: teamlid uitnodigen tot de seat-limiet, daarna een nette 402
3. `POST /api/admin/credit-orgs` met `setUnlimitedWorkspaces`/`setUnlimitedSeats` → org kan daarna onbeperkt workspaces/leden aanmaken
4. Checkout-flow voor Starter/Growth in Stripe test-mode → geen 400 meer
5. `npx tsc --noEmit` + `npm run lint` 0 errors
6. Na merge: Eriks prod-org via het admin-paneel op onbeperkt zetten, geverifieerd met een testworkspace-aanmaak

# Risico's

- `getOrgPlanTier()`/`getOrgFeatureLimit()` doen extra queries per workspace-aanmaak-call — verwaarloosbaar bij normale orggroottes, geen paginering nodig
- `-1`-sentinel moet consistent overal `applyOrgOverride()` gebruiken — niet los `=== -1`-checks verspreiden

# Out of scope

- Workspace/invite-UX-consolidatie (Fase 2), in-app Facturering-UI-bugfixes (Fase 3), marketing pricing-sync (Fase 4) — aparte tasks
- Feature-gating van AI-agents/Trend Radar/exports — open vraag aan Erik, nog niet beantwoord

# Notes

Basis: `/Users/erikjager/.claude/plans/cheeky-swinging-bunny.md` (goedgekeurd 2026-07-17). Backend-architectuurontwerp kwam uit een Plan-subagent-run; zie de sessie voor de volledige onderbouwing van de `-1`-sentinel-keuze en waarom `Organization.type` als runtime-gate wordt losgelaten i.p.v. gesynchroniseerd.

**Smoke-test resultaten (lokaal, `NEXT_PUBLIC_BILLING_ENABLED=true`)**: testorg met 1 GROWTH-workspace → `getOrgFeatureLimit(WORKSPACES)` = 5 ✅, `getOrgPlanTier` = GROWTH ✅, workspace #2 t/m #5 toegestaan ✅, #6 correct geblokkeerd met `402 { code: "WORKSPACE_LIMIT_REACHED", current: 5, limit: 5, tier: "GROWTH" }` ✅, na `maxWorkspaces = -1` werd de limiet `Infinity` en was #6 alsnog toegestaan ✅, `TEAM_MEMBERS`-limiet voor dezelfde org = 5 ✅. Alle verwachte uitkomsten kloppen.

**Eriks account-unlimited (laatste checkbox)**: dit vereist de nieuwe knoppen live op productie (na merge + Vercel-deploy) — kan niet vooruitlopend lokaal gedaan worden. Volgende sessie-stap: inloggen op prod als developer-account, naar Settings → Developer → Credit Admin, en op de rij voor Erik's org (workspace `cmr4znouo000204ic257g3gcn`, `erik@betterbrands.nl`) de drie "Unlimited"-knoppen aanzetten.
