---
id: kpi-fase0
title: Meetfundament €100k-plan (Fase 0) — funnel, activatie, noordster en Gate-1 als developer-tab
fase: post-launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: done
created: 2026-07-20
completed: 2026-07-20
related-adr: -
related-spec: docs/reports/100k-plan-fasering-2026-07-20.md
worktree: branddock-kpi-fase0 (opgeruimd na de merge)
---

# kpi-fase0 — meetfundament €100k-plan (Fase 0)

- **Bron**: `docs/reports/100k-plan-fasering-2026-07-20.md` · go van Erik 2026-07-20

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

---

# Afronding (geverifieerd 2026-08-18)

Gemerged op **2026-07-20** via [PR #215](https://github.com/erikjager55/Branddock/pull/215)
(commit `c9544f4e`, 14 bestanden, +532/−8). Changelog-entry **#424**. De taak bleef daarna
op `in-progress` staan — zie de oorzaak onderaan.

## Acceptatiecriteria, stuk voor stuk nagelopen

**1. Endpoint levert weken/totalen/gate/noordster; 403 zonder developer-sessie — ✅**
`src/app/api/admin/growth-metrics/route.ts` importeert `requireDeveloper` en geeft zonder
developer-sessie `{ error: 'Developer access required' }` met status 403. De respons bevat
`weeks` (8 weken), `totals` (incl. `mrrEur`), `northStar: { netNewPerDay }` en `gate` met de
Gate-1-doelen (€3.000 MRR · 10 klanten · 5 bureaus · 35% activatie) plus de huidige stand.

**2. Tab zichtbaar onder Settings → Developer, rendert alle blokken — ✅**
De knop staat in `SettingsSubNav.tsx` binnen het blok `{isDeveloper === true && (` onder de
kop "Developer" — dus niet alleen geregistreerd maar ook daadwerkelijk developer-gated.
`SettingsPage.tsx` heeft `case 'growth'` en `'growth'` staat in `DEVELOPER_TABS`. `GrowthTab.tsx`
rendert alle vier blokken: noordster + kern-totalen, de Gate-1-kaart met doel-vs-huidig per
regel, en de weekfunnel.

**3. tsc + eslint 0 · smoke op dev — ✅**
CI op PR #215: `check` **pass** (8m51s), `det-suite` **pass**, `e2e` **pass**, Vercel **pass**.
De smoke is niet achteraf over te doen, maar changelog #424 legt hem vast:
*"Endpoint- en UI-smoke op dev geverifieerd."*

Alle vijf bestanden uit de file-list staan op `origin/main`.

## Waarom de status verkeerd stond

Zelfde oorzaak als [`marketing-homepage-v2`](marketing-homepage-v2.md): de frontmatter is op
2026-08-17 achteraf aangeplakt door [#286](https://github.com/erikjager55/Branddock/pull/286)
met een default `status: in-progress`. Hier was `created: 2026-07-20` toevallig wél juist —
de file is die dag aangemaakt — maar `status` is nooit tegen de merge-status van PR #215
gecontroleerd, en `worktree: branddock-kpi-fase0` verwees naar een map die na de merge was
opgeruimd. Die rij stond daarna 29 dagen op de Nu-lijst in `START_HERE.md`.

## Vervolg

Dit was Fase 0 (meetfundament) van het €100k-plan. De volgende fasen staan in
`docs/reports/100k-plan-fasering-2026-07-20.md` en hebben nog geen eigen task-file.
