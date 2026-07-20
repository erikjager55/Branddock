# kpi-fase0 — meetfundament €100k-plan (Fase 0)

- **Status**: in-progress
- **Datum**: 2026-07-20
- **Bron**: `docs/reports/100k-plan-fasering-2026-07-20.md` · go van Erik 2026-07-20
- **Worktree**: branddock-kpi-fase0

## Scope

KPI-boom uit het coachplan meetbaar: funnel (aanmelding → activatie → betaald), activatie-event, noordster (netto nieuwe MRR/dag uit Stripe) en de Gate-1-stand — als developer-only tab in Settings.

## Definities (v1, bewust)

- **Activatie** = workspace met ≥3 volledig ingevulde merk-assets (veld-compleetheids-helper van het readiness-dashboard) én een eerste goedgekeurde uiting; activatiedatum = eerste accept (AgentArtifact.acceptedAt) of publicatie (Deliverable.publishedAt). Asset-invuldata zijn niet historisch → DNA-compleetheid wordt op nu gemeten.
- **Betaald** = Subscription met stripeSubscriptionId, status ACTIVE; **bureau** = Organization.type AGENCY.
- **Noordster** = som(nieuwe maand-MRR per dag) − som(opgezegde) uit de Stripe-API (jaarprijzen /12); fail-soft zonder key.
- **Bron-attributie** = UTM-props op `signup_completed` (PostHog); niet in de DB (geen schema-wijziging in fase 0).

## File-list

- `src/app/api/admin/growth-metrics/route.ts` (nieuw, requireDeveloper)
- `src/features/settings/components/growth/GrowthTab.tsx` (nieuw) + subnav/page/store-registratie
- `src/components/auth/AuthPage.tsx` (UTM-props op signup_completed)
- `src/app/api/agents/runs/[runId]/confirm/route.ts` (workspace_activated bij eerste accept)
- `docs/reports/100k-plan-fasering-2026-07-20.md` (faseringsdocument)

## Acceptatie

- [ ] Endpoint levert weken/totalen/gate/noordster; 403 zonder developer-sessie
- [ ] Tab zichtbaar onder Settings → Developer, rendert alle blokken
- [ ] tsc + eslint 0 · smoke op dev
