---
id: credit-admin-owner-lookup
title: Credit Admin-paneel — owner-e-mail + zoekbox toevoegen
fase: pre-launch
priority: now
effort: <30 min
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: -
worktree: branddock-credit-admin-owner-lookup
---

# Probleem

Bij het uitvoeren van taak #30 (Eriks org op onbeperkt zetten via Settings → Developer → Credit Admin) bleek de instructie "zoek je org op e-mailadres" niet uitvoerbaar: `/api/admin/credit-orgs` retourneert nooit een e-mailadres (alleen `org.name`, `org.slug`, max 5 workspace-namen), en het paneel heeft geen zoek-/filterfunctie — alleen een platte lijst van alle organisaties, gesorteerd op `createdAt`. Bij meer dan een handvol orgs is een specifieke org onmogelijk gericht te vinden.

# Voorstel

`ownerEmail` toevoegen aan de GET-response (lid met `role: 'owner'`, fallback het eerst-toegetreden lid) en tonen onder de orgnaam in elke rij. Client-side zoekbox (hergebruik het bestaande `SearchInput`-component) die filtert op naam/slug/workspace-namen/owner-e-mail.

# Acceptatiecriteria

- [x] `GET /api/admin/credit-orgs` retourneert `ownerEmail` per org (member met `role: 'owner'`, fallback eerste lid op `joinedAt`)
- [x] `AdminOrg`-type in `use-credit-admin.ts` uitgebreid met `ownerEmail: string | null`
- [x] `CreditAdminPanel.tsx`: owner-e-mail zichtbaar in elke rij; nieuwe `SearchInput` filtert op naam/slug/workspace/e-mail, toont "X of Y organizations"
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors, 0 nieuwe warnings
- [x] Playwright-smoke lokaal: owner-e-mail zichtbaar in rij ("erik@branddock.com · 2 members · ..."), zoekterm "branddock.com" filtert 6 → 1 organisaties, 0 console-errors

# Bestanden die ik aanraak

- `src/app/api/admin/credit-orgs/route.ts`
- `src/hooks/use-credit-admin.ts`
- `src/features/settings/components/developer/CreditAdminPanel.tsx`

# Smoke test plan

1. Lokaal inloggen als developer-account (`erik@branddock.com`), naar Settings → Developer → Credit Admin
2. Elke rij toont owner-e-mail onder de orgnaam
3. Zoekbox filteren op een deel van een e-mailadres → lijst reduceert correct, telling klopt
4. 0 console-errors

# Risico's

- `members: { take: 10 }` per org — bij een org met >10 leden waarvan de owner niet in de eerste 10 (op `joinedAt`) zit, valt de fallback terug op het eerste lid i.p.v. de echte owner. Verwaarloosbaar voor dit doel (superuser-identificatie, geen enforcement) en owners zijn vrijwel altijd het eerst-toegetreden lid.

# Out of scope

- Verdere Credit Admin-paneel-UX (paginering, sortering) — niet gevraagd, huidige `take: 200` volstaat ruim

# Notes

Direct gevonden tijdens taak #30 (Eriks account op onbeperkt zetten) — de oorspronkelijke instructie "zoek je org op e-mailadres" bleek niet uitvoerbaar in de bestaande UI. Erik vroeg expliciet om dit te fixen.
