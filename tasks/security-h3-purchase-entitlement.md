---
id: security-h3-purchase-entitlement
title: Billing-integriteit — server-side prijs (H3) + plan-entitlement (M5)
fase: pre-launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: open
created: 2026-06-26
completed: -
related-adr: -
related-spec: docs/audits/2026-06-26-security-audit.md
worktree: -
---

# Probleem

Twee billing-integriteit-findings (security-audit 2026-06-26), beide achter `NEXT_PUBLIC_BILLING_ENABLED` maar **moeten dicht vóór billing live gaat**:

- **H3 — purchase-prijs client-gecontroleerd**: `src/app/api/stripe/purchase/route.ts:31` leest `amount` uit de body en geeft 'm verbatim aan `createPaymentIntent` (`one-time.ts`). Geen server-side prijs-lookup → een aanvaller betaalt €0,50 voor een €99-bundle, of `amount:0` ontgrendelt de bundle-tools **gratis** (de `<=0 → completePurchase(pricePaid:0)`-branch).
- **M5 — plan-entitlement niet server-side afgedwongen**: `enforceFeature`/`checkPlanLimit`/`withPlanEnforcement` hebben **0 call-sites**. Het enige live effect van `planTier` is AI-rate-limit-throughput, niet entitlement. Een FREE-workspace wordt server-side nergens geblokkeerd op limieten → paywall feitelijk ongebouwd.

# Voorstel

- H3: haal de prijs server-side uit de `ResearchBundle`/`Workshop`-rij by `itemId` (+ workspace-scope); negeer body-`amount`. Behoud de `0 → auto-complete`-branch alleen voor items met een server-side prijs van 0.
- M5: bedraad `withPlanEnforcement`/`enforceFeature` op de mutatie-routes die plan-limieten horen te respecteren (personas/campaigns/etc.). Bepaal de canonieke limiet-set + waar te enforce-en.

# Acceptatiecriteria

- [ ] `stripe/purchase` gebruikt server-side prijs; body-`amount` wordt genegeerd; `amount:0`-gratis-unlock is niet meer mogelijk.
- [ ] Minstens de kern-mutatie-routes dwingen plan-entitlement server-side af (FREE boven limiet → 402/403).
- [ ] Smoke: purchase met getamperde `amount` → server-prijs gebruikt; over-limiet-create als FREE → geweigerd.
- [ ] `npx tsc --noEmit` + lint groen.

# Bestanden die ik aanraak

- `src/app/api/stripe/purchase/route.ts` · `src/lib/stripe/one-time.ts` · `src/lib/stripe/enforcement.ts` (+ de HOC) · de te-gaten mutatie-routes.

# Smoke test plan

Manueel/unit: purchase-route met `amount` ≠ canonieke prijs → server gebruikt canonieke prijs; entitlement-HOC op een create-route → FREE over limiet geweigerd, PRO toegestaan.

# Risico's

- Entitlement-enforcement kan legitieme flows breken bij verkeerde limiet-config → eerst de limiet-set valideren tegen de Plan-rijen; achter de billing-flag testen.

# Out of scope

- Volledige metered-billing-herziening.

# Notes

- Bron: security-audit 2026-06-26 (Secrets/Stripe F2 + bonus-observatie). Doen vóór `stripe-billing-live`.
