---
id: pricing-credits-fase5-payments-tax
title: Credit-billing Fase 5 — iDEAL/SEPA payment-methods + Stripe Tax/BTW (VAT-nummer + reverse-charge + OSS + factuur-velden)
fase: launch
priority: now
effort: 4-6 dagen
owner: claude-code
status: open
created: 2026-07-07
related-adr: docs/adr/2026-07-07-pricing-credits-launch.md
related-spec: tasks/pricing-credits-billing.md
worktree: branddock-feat-pricing-credits
---

# Probleem

De huidige Stripe-checkout ondersteunt alleen de default (impliciet card) payment-method en kent geen BTW-laag. Voor de EU/NL B2B-markt is dat een launch-blokker (ADR D10): weinig bedrijven hebben een creditcard — **iDEAL** is de norm voor losse betalingen, en de **recurring basis + auto-topup** vereist een **iDEAL→herbruikbaar SEPA-incasso-mandaat**. Daarnaast moet **Stripe Tax** aan (NL 21% BTW, EU-B2B reverse-charge met VAT-nummer + VIES-validatie, OSS voor B2C) en moeten facturen een BTW-uitsplitsing + "btw verlegd"-notitie dragen. Dit ontbreekt volledig.

# Voorstel

Breid de Stripe-laag uit met (1) **payment-methods** iDEAL + SEPA op de checkout, en een **`SetupIntent` iDEAL→SEPA-mandaat** dat de recurring basis + auto-topup (Fase 3) gebruiken; en (2) de **BTW-laag**: Stripe Tax aan (`automatic_tax`), een VAT-nummer-veld met VIES-validatie op de organisatie, `tax_id`/customer-tax-status voor reverse-charge, OSS voor B2C, en `Invoice`-model + `InvoiceHistoryCard` uitgebreid met BTW-uitsplitsing + reverse-charge-notitie. Hergebruik de bestaande `checkout.ts`/`customer.ts`/`webhook-handlers.ts`.

# Simplicity-noot — twee sub-delen (kandidaat voor split, >1 week-risico)

Deze fase is de grootste en dekt twee losse zorgen. Als hij >1 week dreigt, splits in eigen task-files:
- **5a — payment-methods & mandaat**: iDEAL + SEPA op checkout + `SetupIntent`-mandaat + `PaymentMethod`-persistentie + mandaat-webhooks. **Dit is de kritieke dependency voor Fase 3 auto-topup.**
- **5b — Stripe Tax & BTW**: `automatic_tax`, VAT-nummer + VIES, reverse-charge/OSS, factuur-velden + UI. Hangt niet aan Fase 3; kan na 5a.

# Acceptatiecriteria

- [ ] **iDEAL op checkout/top-up**: `payment_method_types: ['ideal', 'sepa_debit', 'card']` (of `automatic_payment_methods`) op de relevante sessies; iDEAL werkt voor losse top-ups (Fase 3 packs).
- [ ] **iDEAL→SEPA-mandaat**: `src/lib/stripe/sepa-mandate.ts` (nieuw): `createSepaSetupIntent(orgId)` (iDEAL als bron voor een herbruikbaar `sepa_debit`-mandaat) + persistentie van het mandaat/`PaymentMethod` op de org. Off-session SEPA-charges (recurring basis + auto-topup) draaien tegen dit mandaat.
- [ ] Mandaat-webhooks afgehandeld: `setup_intent.succeeded`, `mandate.updated`, `payment_method.attached` → mandaat-status op de org bijgewerkt; auto-topup (Fase 3) leest deze status.
- [ ] **Stripe Tax aan**: `automatic_tax: { enabled: true }` op checkout/invoices; customer heeft `tax` + adres voor jurisdictie-bepaling.
- [ ] **VAT-nummer + VIES**: een VAT-nummer-veld op de organisatie (schema) + validatie via Stripe `tax_id` (Stripe doet VIES-validatie voor EU-VAT); een geldig EU-B2B-VAT-nummer buiten NL → **reverse-charge** (btw verlegd, 0% met notitie).
- [ ] **Reverse-charge / OSS**: NL-klant → 21% BTW; EU-B2B met geldig VAT → reverse-charge; EU-B2C → OSS-tarief van het klantland. Correct door Stripe Tax afgehandeld + gereflecteerd in de opgeslagen `Invoice`.
- [ ] **Factuur-velden**: `Invoice`-model uitgebreid met `taxAmount`, `taxRate`, `netAmount`, `reverseCharge Boolean`, `customerVatNumber`, `sellerVatNumber`; `webhook-handlers.ts` `invoice.paid`/`invoice.payment_failed` vult deze uit het Stripe-invoice-object.
- [ ] **`InvoiceHistoryCard`** toont BTW-uitsplitsing (netto / BTW / totaal) + een "btw verlegd (reverse charge)"-notitie wanneer van toepassing; beide VAT-nummers zichtbaar.
- [ ] `docs/playbooks/stripe-go-live.md` uitgebreid met iDEAL/SEPA, Stripe Tax/VAT/OSS, en de nieuwe `STRIPE_PRICE_*`/mandaat-config.
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie plan)

# Bestanden die ik aanraak

- `src/lib/stripe/checkout.ts` — `payment_method_types`/`automatic_payment_methods` + `automatic_tax` op de sessie. Risico: medium.
- `src/lib/stripe/sepa-mandate.ts` (nieuw) — `SetupIntent` iDEAL→SEPA + mandaat-persistentie. Risico: hoog (mandaat-correctheid; dependency voor Fase 3).
- `src/lib/stripe/customer.ts` — customer met adres + `tax_id`/VAT + tax-status. Risico: medium.
- `src/lib/stripe/webhook-handlers.ts` — mandaat-events (`setup_intent.succeeded`, `mandate.updated`) + BTW-velden op `invoice.paid`/`payment_failed`. Risico: hoog.
- `src/app/api/stripe/` — nieuwe route(s) voor mandaat-setup (`setup-mandate`) + evt. VAT-validatie-endpoint. Risico: medium.
- `prisma/schema.prisma` — `Organization` VAT-nummer + mandaat-status/`PaymentMethod`-koppeling; `Invoice` BTW-velden (`taxAmount`/`taxRate`/`netAmount`/`reverseCharge`/`customerVatNumber`/`sellerVatNumber`). Additief → Neon `db push`. Risico: medium.
- `src/features/settings/components/billing/InvoiceHistoryCard.tsx` — BTW-uitsplitsing + reverse-charge-notitie. Risico: laag.
- `src/features/settings/components/billing/PaymentMethodsCard.tsx` — iDEAL/SEPA-mandaat-status + VAT-nummer-invoer. Risico: medium.
- `src/types/billing.ts` — invoice/tax/mandaat-types. Risico: laag.
- `docs/playbooks/stripe-go-live.md` — iDEAL/SEPA + Tax/VAT/OSS + config. Risico: laag.

# Bestanden die ik NIET aanraak

- Credit-ledger (`ledger.ts`/`reservation.ts`) — af in Fase 1; payments raken de ledger alleen via `grantCredits` (Fase 3).
- Auto-topup-**logica** — Fase 3; deze fase levert alleen het **mandaat** dat Fase 3 gebruikt.
- Generatie-sites — Fase 2.
- Trial-lifecycle — Fase 4.

# Smoke test plan

1. **iDEAL los** (5a): koop een top-up-pack (Fase 3) via iDEAL in Stripe-testmode → betaling slaagt → credits toegekend.
2. **SEPA-mandaat** (5a): doorloop `createSepaSetupIntent` (iDEAL als bron) → `setup_intent.succeeded` webhook → mandaat/`PaymentMethod` op de org opgeslagen, status "actief"; een off-session testcharge tegen het mandaat slaagt.
3. **NL-BTW** (5b): checkout als NL-klant zonder VAT → 21% BTW op de factuur; `Invoice.taxRate = 0.21`, `taxAmount` klopt.
4. **Reverse-charge** (5b): checkout met een geldig EU-B2B-VAT-nummer (bv. BE/DE) → VIES-validatie via Stripe → 0% BTW, `reverseCharge = true`, factuur toont "btw verlegd" + beide VAT-nummers.
5. **OSS** (5b): EU-B2C-klant (ander land, geen VAT) → OSS-tarief van het klantland toegepast.
6. **Factuur-UI**: `InvoiceHistoryCard` toont netto/BTW/totaal + de juiste notitie per scenario.
7. **Ongeldig VAT**: een ongeldig VAT-nummer → geen reverse-charge, gewoon lokaal BTW-tarief (fail-closed, geen gratis 0%).
8. `npx tsc --noEmit` + `npm run lint` groen.

# Risico's

- **SEPA-mandaat-correctheid** (waarschijnlijkheid: medium, impact hoog): een verkeerd opgezet mandaat blokkeert auto-topup (Fase 3) of laat charges falen. Mitigatie: exact het Stripe iDEAL→SEPA-`SetupIntent`-patroon volgen (uit de research/ADR D10); mandaat-status expliciet persisteren en pas na `setup_intent.succeeded` als "actief" markeren.
- **BTW-verkeerd = compliance-risico** (medium, impact hoog): verkeerde reverse-charge of ontbrekende OSS. Mitigatie: **Stripe Tax de berekening laten doen** (geen eigen BTW-logica), alleen het resultaat opslaan/weergeven; VIES via Stripe `tax_id`; fail-closed bij ongeldig VAT (lokaal tarief i.p.v. 0%).
- **`automatic_tax` vereist volledig customer-adres** (medium): zonder adres faalt de tax-berekening. Mitigatie: adres afdwingen in de checkout/customer-creatie; nette foutmelding.
- **iDEAL is single-use** (laag, by design): een losse iDEAL-betaling levert geen herbruikbaar mandaat — daarvoor is de `SetupIntent`-flow. Mitigatie: expliciet twee paden (los = iDEAL, recurring/auto-topup = SEPA-mandaat via iDEAL-setup).
- **Deze omgeving kan Stripe-flows niet volledig draaien**: verificatie = lint per file + CI-tsc/build + Stripe-testmode op de deploy (iDEAL/SEPA/Tax vereisen de gehoste Stripe-flow + test-VAT-nummers).

# Out of scope

- Multi-currency (EUR only — umbrella Out of scope).
- Niet-EU-tax (US sales tax e.d.) — niet in scope.
- De credit-afboeking/top-up-logica zelf — Fase 2/3.
- Jaarlijkse facturatie — alleen `STRIPE_PRICE_*_YEARLY` voorbereiden.

# Notes

- **Dependencies**: hangt aan **Fase 0** (org/invoice-velden, `STRIPE_PRICE_*`-config). Kan **grotendeels parallel aan Fase 1-2** (raakt de Stripe-laag + UI, niet de ledger-core/generatie-sites). **Kritiek**: **5a (SEPA-mandaat) is een blokker voor Fase 3 auto-topup** — plan 5a vóór of gelijk met de auto-topup-tak van Fase 3. 5b (Tax/BTW) hangt aan niets in Fase 3 en kan het laatst.
- **Anti-Abstraction**: hergebruik `checkout.ts`/`customer.ts`/`webhook-handlers.ts` + het bestaande `PaymentMethod`/`Invoice`-model — geen nieuwe payment-abstractielaag. **Laat Stripe Tax de BTW-berekening doen** — bouw geen eigen tarief-engine (Integration-First: Stripe is de bron van waarheid, wij slaan het resultaat op).
- **Integration-First**: het mandaat-status-contract (`org.sepaMandateStatus`) dat Fase 3 auto-topup leest, ligt hier vast; leg het eerst vast.
- **Simplicity**: bij >1 week → splits 5a/5b in eigen task-files (zie sub-noot). 5a eerst (dependency voor Fase 3).
- **Verificatie-noot**: deze omgeving kan Stripe niet volledig draaien; leun op Stripe-testmode + test-VAT-nummers (VIES-sandbox) op de deploy voor de eind-smoke.
- Playbook-gevolg (ADR Notes): `docs/playbooks/stripe-go-live.md` uitbreiden met credit-model + iDEAL/SEPA + Stripe Tax/BTW/OSS + de nieuwe `STRIPE_PRICE_*`-set.
