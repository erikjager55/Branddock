---
id: pricing-credits-fase6-usage-ux
title: Credit-billing Fase 6 — in-app usage-UX (balans/meter/pre-flight-schatting/top-up-CTA/trial-countdown)
fase: launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: open
created: 2026-07-07
related-adr: docs/adr/2026-07-07-pricing-credits-launch.md
related-spec: tasks/pricing-credits-billing.md
worktree: branddock-feat-pricing-credits
---

# Probleem

De ledger boekt af (Fase 1-2), top-up + trial werken (Fase 3-4), maar de gebruiker ziet er niets van: geen credit-balans, geen "X van Y credits"-meter, geen "dit kost ~N credits"-verwachting vóór een generatie, geen top-up-CTA en geen trial-countdown. Zonder deze UX is het credit-model onbegrijpelijk (bill-anxiety, geen upgrade-pad) en blijft de differentiator ("creëren kost credits, kennen/beoordelen niet") onzichtbaar.

# Voorstel

Bouw de in-app usage-UX op de bestaande billing-componenten (`UsageOverviewCard`, `BillingTab`) en de Fase-1/3/4-API's: een credit-balans + pooled "X van Y credits"-meter, een pre-flight "dit kost ~N credits"-indicatie bij generatie-acties (uit de credit-kosten-registry + reservering-schatting), een top-up-CTA met pack-keuze, de auto-topup-instelling (toggle uit Fase 3), en een trial-countdown (`getTrialState` uit Fase 4). Hergebruik `PageShell`/`PageHeader`/shared `Button` + Lucide-icons; geen emoji's; let op de Tailwind-4-purge-caveat.

# Acceptatiecriteria

- [ ] Credit-balans-API: `src/app/api/billing/credits/route.ts` (nieuw) → `{ balance, reserved, available, monthlyIncluded, tier, trialState }` (leest `getBalance` + `getTrialState`); workspace/org-geauthenticeerd, met server-side cache + `invalidateCache` op mutatie (cache-invalidation-conventie).
- [ ] **Balans + meter**: `UsageOverviewCard` toont de pooled credit-balans + een "X van Y credits"-meter (Y = maand-bundel uit de tier); duidelijk dat credits **op account/org-niveau gepoold** zijn (niet per workspace). Loading + error-state verplicht.
- [ ] **Pre-flight-schatting**: bij generatie-acties (canvas/SEO/beeld/video-CTA's) een "dit kost ~N credits"-indicatie, gevoed door de credit-kosten-registry (`CREDIT_COSTS[action]`) uit Fase 0; toont 0/"gratis" voor chat/F-VAL/setup/exploratie (maakt de differentiator zichtbaar).
- [ ] **Top-up-CTA + pack-keuze**: een knop/kaart die de 3 packs toont (500/€50 · 1.500/€135 · 5.000/€400) en de Fase-3-top-up-route aanroept; verschijnt prominenter bij laag saldo.
- [ ] **Auto-topup-instelling**: een toggle + pack-keuze + blootstellingsplafond-weergave, gekoppeld aan de Fase-3-org-velden (`autoTopupEnabled`/`autoTopupPackId`/`autoTopupExposureCap`); default uit; meldingsvermelding.
- [ ] **Trial-countdown**: een banner/badge met `daysRemaining` uit `getTrialState`; bij lock (dag 28) een read-only-melding + upgrade/top-up-CTA i.p.v. een harde foutmuur.
- [ ] Lege-state + max-state: 0 credits → duidelijke top-up-CTA; volle meter → geen valse "limiet bereikt"-paniek (top-up is altijd mogelijk).
- [ ] UI-primitives: `PageShell`/`PageHeader` waar van toepassing, shared `Button` (`bg-primary` via CSS-var — géén gepurgede `bg-emerald-*` uit design-tokens), Lucide-icons, geen emoji's. Tailwind-4-purge-caveat gerespecteerd (inline-style/`bg-primary` waar een utility gepurged is).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie plan)

# Bestanden die ik aanraak

- `src/app/api/billing/credits/route.ts` (nieuw) — balans/trial-state-API (+ cache + invalidatie). Risico: laag.
- `src/features/settings/components/billing/UsageOverviewCard.tsx` — credit-balans + meter (vervangt/uitbreidt de token-usage-weergave). Risico: medium.
- `src/features/settings/components/billing/BillingTab.tsx` — top-up-CTA + auto-topup-instelling + trial-countdown inpassen. Risico: medium.
- `src/features/settings/components/billing/CurrentPlanCard.tsx` — tier + pooled bundel-weergave (prijzen €39/€89/€299). Risico: laag.
- `src/features/settings/components/billing/PlanComparisonTable.tsx` — nieuwe tiers/bundels/floor + "contact sales" voor Enterprise. Risico: laag.
- Een gedeelde pre-flight-indicator-component (nieuw, bv. `src/components/shared/CreditCostBadge.tsx` of onder billing) + inhaken op de generatie-CTA's (canvas/SEO/beeld/video). Risico: medium.
- `src/features/settings/api/*` of een billing-hook (TanStack Query) voor de balans-API. Risico: laag.
- i18n-locale-bestanden `src/lib/ui-i18n/locales/{en,nl}/settings-billing.ts` — nieuwe credit/top-up/trial-strings. Risico: laag.

# Bestanden die ik NIET aanraak

- Ledger-core / reservering (`ledger.ts`/`reservation.ts`) — af in Fase 1; UI leest alleen via de API.
- Top-up/auto-topup-**logica** (`topup.ts`/`auto-topup.ts`) — Fase 3; UI roept alleen de route aan.
- Trial-**lifecycle** (`trial.ts`) — Fase 4; UI leest `getTrialState`.
- Generatie-orchestrators zelf — alleen de CTA/indicator ernaast, geen generatie-gedrag wijzigen.
- Stripe-checkout/Tax — Fase 5.

# Smoke test plan

1. **Balans + meter**: open Settings → Billing → pooled credit-balans + "X van Y credits"-meter zichtbaar, correct t.o.v. de tier-bundel; loading + error-state werken.
2. **Pre-flight**: klik een long-form-generatie-CTA → "dit kost ~80 credits"; een chat/F-VAL-actie toont "gratis"/0 credits.
3. **Top-up-CTA**: verlaag het saldo → top-up-CTA wordt prominent; pack-keuze opent → start de Fase-3-flow (iDEAL/SEPA).
4. **Auto-topup-instelling**: toggle aan → pack + plafond instelbaar; toggle uit → default; wijziging persisteert (org-veld).
5. **Trial-countdown**: nieuw account → "nog N dagen trial" + 300 credits; fixture dag-28 → read-only-melding + upgrade/top-up-CTA (geen harde crash).
6. **Multi-tenant**: wissel workspace binnen dezelfde org → de credit-balans is **hetzelfde** (pooled op org), niet per workspace; wissel naar een andere org → andere balans (isolatie correct).
7. `npx tsc --noEmit` + `npm run lint` groen; UI-review: geen emoji's, `bg-primary` i.p.v. gepurgede kleuren.

# Risico's

- **Stale balans in de UI** (waarschijnlijkheid: medium, impact laag): na een generatie/top-up toont de meter oude data. Mitigatie: `invalidateCache(cacheKeys.prefixes.<billing>(workspaceId/orgId))` op elke credit-mutatie (Fase 1-3 schrijven, Fase 6 invalideert de balans-cache) + TanStack-Query-refetch na een generatie.
- **Tailwind-4-purge maakt UI onzichtbaar** (medium): `bg-emerald-*`/utility-klassen uit design-tokens worden gepurged (memory-gotcha). Mitigatie: shared `Button` (`bg-primary` CSS-var) + inline-style/`bg-primary` waar nodig; geen kleur-klassen uit TS-constanten.
- **Verwarring pooled vs per-workspace** (medium): gebruikers denken dat credits per merk zijn. Mitigatie: expliciete "gepoold op account"-copy in de meter + i18n-string; smoke-stap 6 bevestigt het gedrag.
- **Pre-flight-schatting wijkt af van werkelijke afboeking** (laag): de indicatie is de registry-schatting, de afboeking is output-token-based. Mitigatie: "~N credits" (tilde) + na afloop de werkelijke afboeking in de transactie-historie tonen (verwachting-management).
- **Deze omgeving kan de app niet volledig draaien**: verificatie = lint per file + CI-tsc/build + deploy-smoke (UI visueel op de deploy).

# Out of scope

- Een volledige transactie-historie-/export-view (kan post-launch; hier alleen balans + meter + CTA).
- In-canvas real-time credit-teller tijdens streaming-generatie (later; hier de pre-flight-schatting vóór de run).
- Admin-/developer-usage-dashboards.
- Prijs-/pack-A/B-testing.

# Notes

- **Dependencies**: hangt aan **Fase 0 + Fase 1** (registry + `getBalance`). Consumeert **Fase 3** (top-up-route + auto-topup-org-velden) en **Fase 4** (`getTrialState`) — die hooks kunnen als graceful-degradatie landen tot 3/4 er zijn (bv. top-up-CTA verborgen zonder Fase 3). Bouw **na** 0+1; volledig af **na** 3+4. Kan **parallel** met Fase 2/5 aan de API-kant beginnen.
- **Anti-Abstraction**: hergebruik de bestaande billing-componenten (`UsageOverviewCard`/`BillingTab`/`CurrentPlanCard`/`PlanComparisonTable`) + `PageShell`/`PageHeader`/shared `Button` — geen nieuwe UI-laag. De `UsageOverviewCard` toonde AI-tokens; die weergave wordt vervangen door credits.
- **Integration-First**: de balans-API-shape (`{ balance, reserved, available, monthlyIncluded, tier, trialState }`) is het contract tussen backend (Fase 1-4) en UI; leg het eerst vast.
- **Verificatie-noot**: deze omgeving kan de app niet volledig draaien; verificatie = lint per file + CI-tsc/build + deploy-smoke (visuele UI-review op de deploy).
- PATTERNS.md + de design-tokens/purge-memory raadplegen vóór het bouwen (kleur-klassen).
