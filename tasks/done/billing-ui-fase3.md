---
id: billing-ui-fase3
title: Facturatie & abonnementen — Fase 3 (in-app Facturering-bugfixes)
fase: pre-launch
priority: now
effort: 3-4 uur
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-07-17
related-adr: -
related-spec: -
worktree: branddock-billing-ui-fase3
---

# Probleem

Instellingen → Facturering had een reeks losse bugs bovenop de correcte `PLAN_CONFIGS`-datalaag: een "Populair"-badge die een tier checkte (`PRO`) die niet meer in `ALL_TIERS` zit en dus nooit toonde; verouderde vertaalstrings die de live Agency-cijfers overschreven (toonde "10 workspaces/25 teamleden" i.p.v. de echte 15/10); een upgrade-knop die de tier-ladder oversloeg (Gratis→Pro i.p.v. Starter, verder altijd naar Agency); "14 dagen gratis proefperiode"-tekst die de echte trialvoorwaarden (28 dagen/300 credits) tegensprak; en een verbruiksoverzicht waarvan 5 van de 8 balken hardcoded op 0 stonden ondanks dat de echte tellingen al bestonden (`getCurrentCount()`, gebruikt door de server-side afdwinging). Root-cause-analyse + goedgekeurd plan: zie `/Users/erikjager/.claude/plans/cheeky-swinging-bunny.md`.

# Voorstel

Kleine, onafhankelijke fixes — geen architectuurwerk. `tier === 'PRO'` → `tier === 'GROWTH'` op de twee plekken die de "Populair"-badge/primary-knop bepalen. Verouderde `planFeatures`/`planName`-vertalingen verwijderd — de bestaande `defaultValue`-fallback naar `PLAN_CONFIGS` doet dan altijd het juiste (zo werkte het voor Starter/Growth toevallig al goed). Nieuwe `NEXT_TIER`-lookup in `plan-limits.ts` voor een correcte upgrade-knop. Trial-copy dynamisch uit `TRIAL_DAYS`/`TRIAL_CREDITS`. `GET /api/settings/billing/usage` uitgebreid met `getCurrentCount()`-calls voor de features die al wel afgedwongen werden maar nooit geteld werden voor de UI; Storage toont "Binnenkort" i.p.v. een misleidende 0%.

# Acceptatiecriteria

- [x] `PlanComparisonTable.tsx`: "Populair"-badge + primary-knop-styling op `GROWTH` i.p.v. `PRO`
- [x] `UpgradeModal.tsx`: `isRecommended` op `GROWTH`
- [x] `lock-billing.ts` (en+nl): verouderde `planName`/`planFeatures`-blokken verwijderd
- [x] `trialNote` (en+nl) dynamisch via `TRIAL_DAYS`/`TRIAL_CREDITS` i.p.v. hardcoded "14 dagen"
- [x] `plan-limits.ts`: nieuwe `NEXT_TIER`-export
- [x] `CurrentPlanCard.tsx`: upgrade-knop gebruikt `NEXT_TIER[plan.tier]` i.p.v. hardcoded PRO/AGENCY
- [x] `GET /api/settings/billing/usage`: echte tellingen voor PERSONAS/CAMPAIGNS/BRAND_ASSETS/PRODUCTS/KNOWLEDGE_RESOURCES/WORKSPACES/MARKET_INSIGHTS via `getCurrentCount()`
- [x] `UsageOverviewCard.tsx`: consumeert de echte tellingen, nieuwe WORKSPACES/MARKET_INSIGHTS-rijen, STORAGE_MB toont "Binnenkort" i.p.v. fake 0%
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (0 nieuwe warnings)
- [x] Smoke-test uitgevoerd

# Bestanden die ik aanraak

- `src/features/settings/components/billing/PlanComparisonTable.tsx`
- `src/components/billing/UpgradeModal.tsx`
- `src/features/settings/components/billing/CurrentPlanCard.tsx`
- `src/features/settings/components/billing/UsageOverviewCard.tsx`
- `src/lib/constants/plan-limits.ts` (`NEXT_TIER`)
- `src/lib/ui-i18n/locales/{en,nl}/lock-billing.ts`
- `src/lib/ui-i18n/locales/{en,nl}/settings-billing.ts`
- `src/app/api/settings/billing/usage/route.ts`
- `src/types/settings.ts` (`UsageData`/`CountMeter`)

# Bestanden die ik NIET aanraak

- Backend-entitlements (Fase 1, al gemerged), workspace/invite-UX (Fase 2), marketing pricing-pagina (Fase 4, al gemerged)

# Smoke test plan

1. `GET /api/settings/billing/usage` direct aangeroepen (via `page.evaluate(fetch)` op een echte, rijk-gevulde workspace) → alle nieuwe velden (personas/campaigns/brandAssets/products/knowledgeResources/workspaces/marketInsights) retourneren echte, plausibele tellingen, geen crash
2. Playwright: Settings → Billing-pagina — "Populair"-badge op Growth zichtbaar, Usage Overview toont echte percentages (incl. een eerlijke 100%-over-limit op een FREE-tier-org met 16 workspaces), Storage toont "Coming soon", Compare Plans-tabel toont 1/2/5/15/Unlimited voor Workspaces en 1/2/5/10/Unlimited voor Team Members — beide correct volgens `PLAN_CONFIGS`
3. `npx tsc --noEmit` + `npm run lint` 0 errors

# Risico's

- `getCurrentCount()` doet nu 7 extra parallelle queries per usage-fetch — verwaarloosbaar (dezelfde functie wordt al per-generatie-request gebruikt)

# Out of scope

- Backend-entitlements (Fase 1), workspace/invite-UX-consolidatie (Fase 2)

# Notes

Basis: `/Users/erikjager/.claude/plans/cheeky-swinging-bunny.md` (goedgekeurd 2026-07-17), Fase 3. De smoke-test-screenshot laat toevallig zien hoe scheef "Branddock Agency" (het lokale demo-account) vandaag al staat t.o.v. zijn officiële FREE-tier — 16 workspaces/11 brand-assets/etc. tegen een limiet van 1/5 — precies het soort scheefgroei dat Fase 1's entitlement-fix voorkomt voor nieuwe orgs.
