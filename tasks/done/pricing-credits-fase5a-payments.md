---
id: pricing-credits-fase5a-payments
title: Credit-billing Fase 5a — iDEAL/SEPA payment-methods + herbruikbaar incasso-mandaat (auto-topup live)
fase: launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: done
created: 2026-07-07
completed: 2026-07-12
related-adr: docs/adr/2026-07-07-pricing-credits-launch.md
related-spec: tasks/pricing-credits-billing.md
worktree: branddock-pricing-fase5 (branch feat/pricing-credits-fase5-payments)
---

# Wat (gesplitst uit fase5-payments-tax conform de Simplicity-noot: 5a = kritieke Fase-3-dependency, 5b = Tax/BTW apart)

# Geleverd

- **iDEAL op checkout**: top-up-sessie `payment_method_types: ['card','ideal']` (bewust géén sepa_debit voor one-offs — incasso settelt na dagen en de webhook-grant zou credits laten "hangen"); subscription-sessie `['card','ideal','sepa_debit']` — iDEAL-eerste-betaling krijgt Stripe-native een SEPA-mandaat voor renewals.
- **iDEAL→SEPA-mandaat**: `src/lib/stripe/sepa-mandate.ts` — `createSepaMandateCheckout` via Checkout **`mode: 'setup'`** (volledig gehost, geen Elements): iDEAL-setup levert een herbruikbaar sepa_debit-PaymentMethod. Persistentie op de org: `sepaMandateStatus` ('pending' bij start, 'active' pas via webhook — nooit optimistisch) + nieuw schema-veld `sepaPaymentMethodId`.
- **Mandaat-webhooks**: `setup_intent.succeeded` (metadata-gegate → pm + active), `mandate.updated` (fail-closed: alles behalve 'active' → 'inactive', auto-topup stopt direct), `payment_intent.payment_failed` (auto-topup-reversal).
- **Auto-topup live** (Fase-3-invulpunt in `auto-topup.ts`): (1) blootstellingsplafond — som van optimistisch-onbevestigde credits (metadata optimistic zonder settled; settled-check in JS wegens JSON-NULL-semantiek van `NOT(path=true)` op ontbrekende keys) + pack ≤ cap; (2) off-session PI tegen het mandaat (customer via het PaymentMethod); (3) **optimistische grant met idempotencyKey `topup:<pi.id>`** — exact de key van de succeeded-webhook, dus nooit dubbel-grant; succeeded markeert settled, `payment_failed` draait terug via `handleTopupFailure` (force-deduct, idempotent per reversal-key); (4) in-app notificatie per auto-topup (`NotificationType.AUTO_TOPUP`, additief enum-lid).
- **API + UI**: `/api/stripe/setup-mandate` (GET status / POST start, owner/admin) + mandaat-blok in `PaymentMethodsCard` (status pending/active/none + "Instellen via iDEAL"-knop, alleen zichtbaar bij topup-aan).

# Verificatie

- [x] Nieuwe smoke `scripts/dev/credit-sepa-mandate-smoke.ts` **19/19** — mandaat-activatie/status-sync, guard-paden, exposure-cap incl. settled-release, failure-reversal + idempotentie, race-tombstone, kill-switch, chargeback-reversal. **Zonder Stripe-API**: de lokale key bleek `sk_live` — het echte charge-pad (iDEAL-redirect, off-session incasso, generated-pm-resolve) is bewust deploy-smoke met testmode-keys (zie user-acties).
- [x] Regressie: `credit-autotopup-smoke` 5/5 (bijgewerkt naar 5a-gedrag) · `credit-topup-smoke` 4/4 · `credit-ledger-smoke` 8/8 · `credit-enforce-smoke` 4/4 · tsc 0 · eslint 0.

# Review (code-reviewer subagent)

**1 CRITICAL + 5 WARNINGs — 1 CRITICAL + 4 WARNINGs gefixt, 1 WARNING bewust geaccepteerd:**
- **CRITICAL gefixt**: `si.payment_method` is bij een iDEAL-setup het single-use iDEAL-pm — het herbruikbare sepa_debit-pm staat op de SetupAttempt (`payment_method_details.ideal.generated_sepa_debit`). `resolveSepaPaymentMethodId` haalt de SetupIntent met expand op, prefereert het generated pm en accepteert anders alleen een pm dat zélf sepa_debit is (invariant: nooit een niet-incasseerbaar pm persisteren).
- **W1 gefixt**: late SEPA-terugboekingen (dispute/refund, tot wéken na succeeded) → `charge.dispute.created`/`charge.refunded`-handlers met dezelfde idempotente reversal; geldt ook voor gewone Checkout-topups.
- **W3 gefixt**: race payment_failed-vóór-grant → 0-amount-tombstone claimt de idempotencyKey zodat een late grant nooit alsnog toekent.
- **W4 gefixt**: her-setup degradeert een 'active' mandaat niet meer naar 'pending'.
- **W5 gefixt**: kill-switch — één gefaalde/teruggeboekte incasso zet `autoTopupEnabled` uit (voorkomt een oneindige charge→fail→reversal-cyclus richting de bank van de klant); een mens zet hem bewust weer aan.
- **W2 bewust geaccepteerd** (gedocumenteerd in auto-topup.ts): parallelle tekort-requests kunnen de cap-check beide passeren (~1s-venster) → tijdelijk tot cap+pack outstanding + dubbele incasso voor één moment. Mitigatie: kill-switch begrenst cycli; serialisatie (advisory-lock om check+charge) kan bij het topup-enable-moment alsnog. **Herbeoordeel vóór `NEXT_PUBLIC_TOPUP_ENABLED=true`.**
- MINORs: reversal-metadata behoudt packId/credits (audit-trail); exposure-scan met 90-dagen-venster; notificatie hangt aan de oudste org-workspace (gedocumenteerd); GET-status staat open voor alle rollen (bewust — geen gevoelige data).

# User-acties vóór live-gebruik

1. **Stripe-dashboard: 3 webhook-events toevoegen** aan het bestaande endpoint: `setup_intent.succeeded`, `mandate.updated`, `payment_intent.payment_failed`.
2. **Neon `prisma db push`** (batch met TRIAL_EXPIRING uit Fase 4): `Organization.sepaPaymentMethodId` + enum `AUTO_TOPUP`.
3. **Deploy-smoke in Stripe-testmode**: mandaat-setup via iDEAL-redirect + een off-session test-incasso (test-IBAN) + auto-topup-rondje.

# Out-of-scope (→ 5b)

Stripe Tax / automatic_tax, VAT-nummer + VIES, reverse-charge/OSS, Invoice-BTW-velden + InvoiceHistoryCard — zie `tasks/pricing-credits-fase5b-tax.md`.
