---
id: review-live-pricing
title: Prijzen op de live site nalopen (billing UI-review)
fase: launch
priority: now
effort: <1u
owner: erik + claude-code
status: open
created: 2026-07-07
completed: -
related-adr: -
related-spec: docs/playbooks/stripe-go-live.md
worktree: -
---

# Probleem

Stripe billing is live sinds 2026-07-06 (changelog #366). De user wil de prijzen zoals ze op de live site (`branddock-7y9n.vercel.app` → Settings → Facturering) getoond worden goed nalopen vóór er echt op geacquireerd wordt.

# Nalopen

- [ ] **Getoonde bedragen** kloppen: FREE €0 / PRO €29 / AGENCY €99 / ENTERPRISE €249 per maand — in zowel de huidige-plan-kaart als de `Abonnementen vergelijken`-tabel.
- [ ] **Maandelijks/Jaarlijks-toggle**: yearly is NIET geprijsd in Stripe (geen `STRIPE_PRICE_*_YEARLY` in Vercel) → een yearly-checkout weigert netjes (400 fail-safe, PR #79), maar de UI toont wél een "Jaarlijks -20%"-toggle. **Beslis**: (a) verberg de yearly-toggle tot er yearly-prijzen zijn, óf (b) voeg yearly-producten/prijzen toe in Stripe (met de -20% die de UI belooft) + zet de `STRIPE_PRICE_*_YEARLY`-env in Vercel.
- [ ] **"Populair"-badge** op PRO + "Huidig"-markering kloppen voor de ingelogde workspace.
- [ ] **Feature-limieten** in de vergelijkingstabel matchen `src/lib/constants/plan-limits.ts` (workspaces / teamleden / AI-tokens / personas / campagnes / etc.).
- [ ] **Dubbele live-Stripe-producten** ("Branddock Pro" / "Branddock Agency" — oude casing) gearchiveerd zodat ze niet in de portal/checkout opduiken (Vercel gebruikt de nieuwe `Branddock PRO/AGENCY/ENTERPRISE`).
- [ ] Copy / valuta / opmaak maken een nette indruk voor een betalende bezoeker.

# Notes

- Prijzen = single source of truth in `src/lib/constants/plan-limits.ts` (`PLAN_CONFIGS`); de Stripe-`price_…`-ids staan in de Vercel-env (`STRIPE_PRICE_*_MONTHLY`).
- Yearly-gedrag: `getPriceIdForTier(tier, 'yearly')` → `null` als de env ontbreekt → checkout 400 (bewuste fail-safe uit de hardening, PR #79).
- Billing-UI: `src/features/settings/components/billing/` (CurrentPlanCard / PlanComparisonTable / UsageOverviewCard / PaymentMethodsCard / InvoiceHistoryCard).
