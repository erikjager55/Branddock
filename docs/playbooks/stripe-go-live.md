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
  - `payment_intent.succeeded` *(one-time aankopen + credit-top-ups)*
  - `payment_intent.payment_failed` *(Fase 5a: auto-topup-reversal bij gefaalde SEPA-incasso)*
  - `setup_intent.succeeded` · `mandate.updated` *(Fase 5a: iDEAL→SEPA-mandaat-lifecycle)*
  - `charge.dispute.created` · `charge.refunded` *(Fase 5a: late terugboekingen → credits-reversal + auto-topup-kill-switch)*
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


## 8. iDEAL/SEPA + auto-topup (Fase 5a, 2026-07-12)

- **Payment-methods**: top-up-Checkout biedt `card + ideal`; subscription-Checkout `card + ideal + sepa_debit` (iDEAL-eerste-betaling → Stripe zet native een SEPA-mandaat achter de renewals). Activeer **iDEAL** en **SEPA-incasso** in Stripe → Settings → Payment methods (beide vereisen een geactiveerd EUR-account).
- **Incasso-mandaat voor auto-topup**: Settings → Billing → Betaalmethode → "Instellen via iDEAL" start een gehoste Checkout-`setup`-flow; `setup_intent.succeeded` activeert het mandaat (`Organization.sepaMandateStatus/sepaPaymentMethodId`). Auto-topup chargt off-session tegen dit mandaat, optimistisch (credits direct, reversal bij `payment_intent.payment_failed`), begrensd door `autoTopupExposureCap`.
- **Test-mode smoke**: (1) mandaat-setup met de iDEAL-testbank → status 'active' én `sepaPaymentMethodId` is een **sepa_debit**-pm (het generated pm van de SetupAttempt — niet het single-use iDEAL-pm); (2) zet op een test-org `autoTopupEnabled=true`, `autoTopupPackId='500'`, `autoTopupExposureCap>=500`, saldo laag → genereer → PI (processing) + optimistische +500; (3) laat de test-incasso falen (test-IBAN `NL62ABNA…`-failure-variant) → reversal −500 + metadata reversed.
- **Kill-switch**: één gefaalde of teruggeboekte incasso zet `autoTopupEnabled` automatisch uit (warn-log); herstel het mandaat en zet hem bewust weer aan.
- **Schema-delta's** (batchen in één Neon `prisma db push`): `Organization.sepaPaymentMethodId`, enum `NotificationType.AUTO_TOPUP` (+ `TRIAL_EXPIRING` uit Fase 4).


## 9. Stripe Tax / BTW (Fase 5b, 2026-07-12)

- [ ] **Neon `prisma db push`** vóór/gelijk met de deploy: de 6 nieuwe `Invoice`-tax-kolommen — zonder push 500't `GET /api/settings/billing/invoices` (Settings → Billing) direct na deploy.
- [ ] **Stripe Tax activeren** (Dashboard → Settings → Tax): origin-adres = NL-vestigingsadres; registraties toevoegen — **NL** (21%) en **EU-OSS** (Union OSS voor B2C in andere EU-landen).
- [ ] **`tax_behavior` op de dashboard-prijzen**: alle `STRIPE_PRICE_*`-prijzen op **exclusive** zetten (de app-prijzen zijn ex-BTW; Checkout telt BTW erbij op). Top-up-packs gaan via `price_data` en staan al op exclusive in code. **Volgorde-gekoppeld**: met `automatic_tax` aan faalt de subscription-checkout hard zolang een prijs `tax_behavior: unspecified` heeft — prijzen éérst bijwerken, dan billing aan.
- [ ] **`SELLER_VAT_NUMBER`** in de Vercel-env (verschijnt op de factuurregel in de app; het officiële Stripe-factuur-PDF haalt het uit de Tax-settings).
- [ ] Checkout verzamelt adres (`billing_address_collection: required`) + VAT-nummer (`tax_id_collection`) — **VIES-validatie doet Stripe**; geldig EU-B2B-VAT buiten NL → reverse-charge (0%, "btw verlegd"), ongeldig VAT → gewoon lokaal tarief (fail-closed).
- [ ] **Test-mode smoke**: (1) NL-klant zonder VAT → 21% op de factuur, `Invoice.taxRate=0.21`; (2) checkout met test-VAT `DE123456789` (Stripe-testmode accepteert format-valide nummers) → 0% + reverse-charge-notitie + beide VAT-nummers op de kaart; (3) EU-B2C (bv. Frans adres, geen VAT) → OSS-tarief van het klantland.
- **Bekende beperking (herbeoordeel vóór topup-enable, samen met de W2-cap-race)**: de **off-session auto-topup-PI** loopt buiten Stripe Tax om (PaymentIntents kennen geen automatic_tax) — het pack-bedrag wordt zonder BTW-berekening geïncasseerd. Nette oplossing t.z.t.: auto-topup via een `charge_automatically`-invoice met `automatic_tax` i.p.v. een kale PI.
