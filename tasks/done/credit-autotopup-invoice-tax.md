---
id: credit-autotopup-invoice-tax
title: Auto-topup BTW-compliant (invoice-based charging) + cap-race dicht
fase: pre-launch
priority: now
effort: 4-6 uur
owner: claude-code
status: done
created: 2026-07-13
completed: 2026-07-13
related-adr: docs/adr/2026-07-07-pricing-credits-launch.md
related-spec: docs/playbooks/stripe-go-live.md (§9/§10 restpunten)
worktree: branddock-credit-autotopup-invoice-tax
---

# Probleem

De twee herbeoordeel-punten die als enige nog vóór `NEXT_PUBLIC_TOPUP_ENABLED=true` staan (playbook §9/§10, review-W2 uit PR #109):

1. **Auto-topup loopt buiten Stripe Tax om.** `maybeAutoTopup` maakt een kale off-session `PaymentIntent` — PaymentIntents kennen geen `automatic_tax`, dus het pack-bedrag (€50, ex-BTW per catalogus) wordt zonder BTW-berekening geïncasseerd én er ontstaat geen factuur. Handmatige top-ups doen dit wél goed (Checkout + `automatic_tax` + `invoice_creation`). Non-compliant (elke betaalde levering vereist een BTW-factuur) en inconsistent geprijsd.
2. **Cap-race (review-W2, bekend-geaccepteerd bij 5a).** `unsettledOptimisticCredits` + cap-check gebeurt buiten elke transactie: twee gelijktijdige tekort-requests passeren beide de check → tijdelijk cap+pack outstanding en een dubbele incasso voor één tekort-moment.

# Voorstel

Auto-topup omzetten naar **invoice-based charging**: draft-invoice + invoice-item (`tax_behavior: exclusive`) met `automatic_tax`, `collection_method: charge_automatically`, betaald off-session tegen het SEPA-mandaat via `invoices.pay`. Idempotency-keys verhuizen van `topup:<pi.id>` naar `topup:<invoice.id>`; settle/failure verlopen via `invoice.paid` / `invoice.payment_failed` (beide al in het webhook-endpoint) i.p.v. PI-events; de dispute/refund-fallback leert charges zonder metadata via `charge.invoice` te herleiden. De bestaande `invoice.paid`-persistentie geeft de auto-topup gratis een BTW-factuur in Settings → Billing.

Cap-race: de cap-check + optimistische grant worden atomair in één interactieve Prisma-transactie met `pg_advisory_xact_lock` per org (alleen DB-werk in de lock; de draft-invoice bestaat al, bij over-cap wordt de draft gedelete (drafts kunnen niet gevoid worden)). Grant-vóór-charge: bij een synchrone pay-fout volgt direct een idempotente reversal (`topup-reversal:<invoice.id>`) — dezelfde key als het webhook-failure-pad, dus dubbel-verwerken is onschadelijk.

# Acceptatiecriteria

- [x] Auto-topup-incasso draagt BTW: testmode-run toont invoice met `automatic_tax` en 21% bovenop het pack-bedrag (NL-org), en een `Invoice`-rij met gevulde tax-velden verschijnt via de bestaande `invoice.paid`-webhook
- [x] Optimistische grant + settle + reversal + kill-switch werken end-to-end met de nieuwe invoice-keys (testmode-smoke zoals playbook §10: succes-pad én fail-IBAN-pad)
- [x] Cap-race dicht: concurrency-smoke laat 2 gelijktijdige `maybeAutoTopup`-calls zien waarvan er precies één claimt (de ander `over-cap` of wint niets dubbel)
- [x] Dispute/refund-pad (`charge.dispute.created`/`charge.refunded`) herleidt invoice-charges zonder PI-metadata correct naar de topup-grant
- [x] Geen schema-wijziging (geen Neon-push nodig)
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors (gewijzigde files, --quiet)
- [x] Smoke-test uitgevoerd: unit 49/49 + e2e-testmode alle 5 fasen groen (`scripts/dev/credit-autotopup-e2e-smoke.ts`, resultaten playbook §11)
- [x] Playbook §9/§10-restpunten afgevinkt + §11 toegevoegd, changelog #386

# Bestanden die ik aanraak

- `src/lib/billing/credits/auto-topup.ts` — invoice-based charge + advisory-lock-claim
- `src/lib/billing/credits/ledger.ts` — `grantCreditsTx` (tx-client-variant, zelfde implementatie)
- `src/lib/stripe/topup.ts` — settle/failure-core herbruikbaar op invoice-keys; charge-reversed invoice-fallback
- `src/lib/stripe/webhook-handlers.ts` — `invoice.paid` settle-branch + `invoice.payment_failed` topup-branch
- `scripts/dev/credit-autotopup-smoke.ts` — bijwerken op de nieuwe flow + concurrency-case
- `docs/playbooks/stripe-go-live.md`, `docs/changelog.md` — afronding

# Out-of-scope

- EU-OSS-registratie (user-beslissing, B2C-buiten-NL)
- `NEXT_PUBLIC_TOPUP_ENABLED=true` zetten (user-schakelaar na deze taak)
- Wijzigingen aan de handmatige Checkout-topup (werkt al BTW-compliant)

# Smoke-test

1. Unit: `credit-autotopup-smoke.ts` (nieuwe flow, mocked Stripe) + concurrency-case 2× parallel `maybeAutoTopup` → precies één grant.
2. Testmode e2e (zoals §10, org A-mandaat bestaat al): succes-pad → invoice.paid → settled + `Invoice`-rij met BTW; fail-IBAN-mandaat → invoice.payment_failed → reversal + kill-switch.

# Afronding (2026-07-13)

- Dispute/refund-pad is code-geverifieerd (herleiding via `invoicePayments.list` + zelfde reversal-key) en gedekt door de bestaande sepa-mandaat-unit-smoke; een echte dispute is in testmode niet praktisch te triggeren op een SEPA-incasso binnen de smoke-doorlooptijd — geaccepteerd restrisico, het pad is idempotent.
- Bekende, gedocumenteerde crash-window: claim gecommit maar proces sterft vóór finalize/pay → optimistische credits zonder incasso; zichtbaar in de ledger (optimistic zonder settled, invoice blijft draft) en telt tegen de cap — handmatig herstelbaar, reaper-automatisering bewust niet gebouwd (zeldzaam + zichtbaar).

# Review (code-reviewer subagent, 2026-07-13)

- **CRITICAL (wees-invoice-items na draft-delete): empirisch weerlegd** — testmode-experiment: item aangemaakt mét `invoice:`-koppeling, draft gedelete → pending-lijst leeg, item-id onvindbaar. Gedocumenteerd in de code.
- **W1 gefixt**: `settleTopupInvoice` detecteert een reversed claim en re-grant onder `topup:<id>:regrant` (betaling-na-reversal via dashboard-retry) — audit-trail blijft intact.
- **W2 gefixt**: tax-locatie-pre-check op de customer vóór de invoice-cyclus + ops-notitie; prod heeft geen bestaande mandaten (setup-flow was altijd topup-gated).
- **W3 gefixt**: notificatie meldt het factuurtotaal incl. BTW (uit de finalize-respons).
- **W4 gefixt**: `tax_behavior: 'exclusive'` expliciet op het invoice-item.
- **W5 gefixt**: `sk_test_`-guard op de e2e-smoke.
- MINORs: legacy-marker op de PI-optimistic-branch, partiële-refund-semantiek gedocumenteerd, `reverseClaim` behoudt packId/credits in metadata, void-pad-comment genuanceerd, task-file-wording (del i.p.v. void).
