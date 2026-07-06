# Stripe go-live checklist

> **Status code**: de subscription-lifecycle (checkout → webhook → DB-sync → `planTier` → enforcement), de customer-portal, de invoice-sync en de one-time-purchase-completion zijn **code-compleet** (audit + hardening 2026-07-06, `stripe-billing-live`). Wat resteert is **Stripe-dashboard-config + env** — de stappen hieronder. Niets bill't tot de laatste schakelaar (`NEXT_PUBLIC_BILLING_ENABLED=true`).

## Pricing (besluit 2026-07-05)

Launch = **vaste maandprijs**, geen credits/metering. Tiers (`src/lib/constants/plan-limits.ts`): FREE €0 · **PRO €29** · **AGENCY €99** · **ENTERPRISE €249** (EUR/maand). Usage-metering + overage + trial = latere per-token-fase (uit scope).

## 1. Stripe-account + keys

- [ ] Maak (of open) het Stripe-account; blijf eerst in **Test mode**.
- [ ] Test-keys ophalen: `sk_test_…` (secret), `pk_test_…` (publishable), en het **webhook signing secret** `whsec_…` (stap 4).

## 2. Products + recurring Prices

Maak per betaalde tier een Product met een **recurring monthly** Price (EUR). Noteer de Price-id's (`price_…`) en zet ze als env:

- [ ] PRO monthly → `STRIPE_PRICE_PRO_MONTHLY`
- [ ] AGENCY monthly → `STRIPE_PRICE_AGENCY_MONTHLY`
- [ ] ENTERPRISE monthly → `STRIPE_PRICE_ENTERPRISE_MONTHLY`
- [ ] *(optioneel, alleen als je jaarlijks aanbiedt)* de `_YEARLY`-varianten → `STRIPE_PRICE_PRO_YEARLY` / `_AGENCY_YEARLY` / `_ENTERPRISE_YEARLY`. **Zonder deze weigert een yearly-checkout** (fail-safe — nooit stil de maandprijs charge­n). Zolang je alleen maandelijks verkoopt: laat de yearly-toggle in de UI weg of laat 'm bewust 400 geven.

## 3. Env-vars (Vercel + `.env.local`)

- [ ] `STRIPE_SECRET_KEY` = `sk_test_…` → later `sk_live_…`
- [ ] `STRIPE_PUBLISHABLE_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_…`
- [ ] `STRIPE_WEBHOOK_SECRET` = `whsec_…` (uit stap 4)
- [ ] de `STRIPE_PRICE_*`-id's uit stap 2
- [ ] **`NEXT_PUBLIC_BILLING_ENABLED=true`** — de hoofdschakelaar. **Zet dit als LAATSTE.** De env-validatie faalt hard bij startup als deze `true` is maar `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/de 3 monthly-prices ontbreken (silent-misconfig-guard).

## 4. Webhook registreren

- [ ] Voeg in Stripe een endpoint toe: `https://<domein>/api/stripe/webhook`.
- [ ] Abonneer op **exact** deze events (de handler negeert de rest):
  - `checkout.session.completed`
  - `customer.subscription.created` · `customer.subscription.updated` · `customer.subscription.deleted` · `customer.subscription.paused`
  - `invoice.paid` · `invoice.payment_failed` · `invoice.finalized`
  - `payment_intent.succeeded` *(voor one-time research-bundle/workshop-aankopen)*
- [ ] Kopieer het signing secret → `STRIPE_WEBHOOK_SECRET`. De route verifieert de HMAC (`constructEvent`) + is idempotent (`ProcessedStripeEvent`).

## 5. Customer Portal

- [ ] Activeer + brand de **Customer Portal** in Stripe (Settings → Billing → Customer portal): sta plan-switches, betaalmethode-updates, cancellation en invoice-download toe. De app opent de portal via `/api/stripe/portal`.

## 6. Verifiëren (test-mode)

- [ ] Complete signup → Settings → Billing → **Upgrade** → Stripe Checkout met testkaart **`4242 4242 4242 4242`** (elke toekomstige datum + CVC).
- [ ] Webhook arriveert → `Workspace.planTier = PRO` (check DB of de meter/CurrentPlanCard).
- [ ] Factuur verschijnt met het **juiste bedrag** (bv. €29,00 — niet €0,29).
- [ ] **Cancel** via de portal → `planTier` terug naar `FREE` (subscription.deleted).
- [ ] *(indien one-time-aankopen live)* koop een research-bundle → `payment_intent.succeeded` → bundle-tools unlocken.

## 7. Naar live

- [ ] Vervang alle test-keys/prices door **live** (`sk_live_…`, live `price_…`, live `whsec_…`, live publishable).
- [ ] Registreer de webhook opnieuw in **Live mode** (apart signing secret).
- [ ] Zet `NEXT_PUBLIC_BILLING_ENABLED=true` in productie als laatste.

---

**Nog buiten scope (per-token-fase later)**: usage-metering/overage (`reportUsageToStripe` + Stripe Billing Meter `ai_token_overage` + `STRIPE_PRICE_AI_OVERAGE` + een cron), 14-dagen trial, en PaymentMethod-sync-from-Stripe (de portal beheert kaarten).
