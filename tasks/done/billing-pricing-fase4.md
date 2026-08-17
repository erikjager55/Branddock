---
id: billing-pricing-fase4
title: Facturatie & abonnementen — Fase 4 (marketing pricing-pagina naar PLAN_CONFIGS)
fase: pre-launch
priority: now
effort: 1-2 uur
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: -
worktree: branddock-billing-pricing-fase4
---

# Probleem

De marketing-pricing-pagina had een losse, hardcoded `TIERS`-array — ondanks een codecomment die claimde "Bron: PLAN_CONFIGS" — met verkeerde workspace-/gebruikersaantallen: Starter zei "1 workspace · 1 gebruiker" (echt: 2/2), Growth "3 workspaces · 5 gebruikers" (echt: 5/5), Agency "10 workspaces · 20 gebruikers" (echt: 15/10). Prijzen en credits/maand klopten al wel. Root-cause-analyse + goedgekeurd plan: zie `/Users/erikjager/.claude/plans/cheeky-swinging-bunny.md`.

# Voorstel

`src/app/marketing/pricing/page.tsx` en de homepage-teaser (`PricingTeaser` in `src/app/marketing/page.tsx`) halen prijs/credits/workspace-/gebruikersaantallen/trialduur voortaan rechtstreeks uit `PLAN_CONFIGS`/`TRIAL_DAYS`/`TRIAL_CREDITS` (`src/lib/constants/plan-limits.ts`) — bevestigd pure data, geen Prisma/server-only imports, dus veilig importeerbaar in de marketing-route. Nederlandse marketingtekst (beschrijving, feature-bullets) blijft pagina-lokaal.

# Acceptatiecriteria

- [x] `TIERS` op de pricing-pagina afgeleid van `PLAN_CONFIGS.{STARTER,GROWTH,AGENCY}` — prijs, credits, workspace-/gebruikersregel
- [x] Workspace-/gebruikersregel toont de correcte cijfers (2/2, 5/5, 15/10) i.p.v. de oude foute (1/1, 3/5, 10/20)
- [x] Trial-copy (FAQ + footer-tekst) gebruikt `TRIAL_DAYS`/`TRIAL_CREDITS` dynamisch i.p.v. hardcoded "28"/"300"
- [x] `TOPUPS` afgeleid van `TOPUP_PACKS`
- [x] Homepage-teaser (`PricingTeaser`) idem — naam/prijs/credits uit `PLAN_CONFIGS`
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Smoke-test uitgevoerd (Playwright-screenshots pricing-pagina + homepage-teaser, geen console-errors)

# Bestanden die ik aanraak

- `src/app/marketing/pricing/page.tsx`
- `src/app/marketing/page.tsx` (`PricingTeaser`)

# Bestanden die ik NIET aanraak

- `src/lib/constants/plan-limits.ts` — alleen gelezen/geïmporteerd, niet gewijzigd
- In-app Facturering-UI (Fase 3), backend-entitlements (Fase 1), workspace/invite-UX (Fase 2) — aparte tasks

# Smoke test plan

1. Playwright: screenshot `/marketing/pricing` — workspace-/gebruikersregels tonen 2/2, 5/5, 15/10; trial-copy toont 28 dagen/300 credits; geen console-errors
2. Playwright: screenshot homepage-teaser — prijs/credits ongewijzigd zichtbaar (regressietest, geen visuele wijziging bedoeld)
3. `npx tsc --noEmit` + `npm run lint` 0 errors

# Risico's

- Geen — pure data-substitutie, geen gedrag-/API-wijziging

# Out of scope

- In-app Facturering-UI-bugfixes (Fase 3), backend-entitlements (Fase 1), workspace/invite-UX-consolidatie (Fase 2)

# Notes

Basis: `/Users/erikjager/.claude/plans/cheeky-swinging-bunny.md` (goedgekeurd 2026-07-17), Fase 4. Onafhankelijk van Fase 1 — raakt geen gedeelde bestanden, kon parallel gebouwd worden.
