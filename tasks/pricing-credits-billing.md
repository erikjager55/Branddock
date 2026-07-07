---
id: pricing-credits-billing
title: Credit-based billing — prepaid bundel + top-up + metering-wiring + iDEAL/SEPA + BTW
fase: launch
priority: now
effort: 3-4 weken (gefaseerd; GESPLITST in 7 fase-task-files 2026-07-07)
owner: claude-code
status: open
created: 2026-07-07
related-adr: docs/adr/2026-07-07-pricing-credits-launch.md
related-spec: -
worktree: branddock-feat-pricing-credits
---

> **Umbrella / epic-tracker.** Dit bestand is niet langer de uitvoerbare eenheid — het is de
> overkoepelende tracker. De **7 fase-task-files** (zie "Gesplitst 2026-07-07" onderaan) zijn de
> uitvoerbare eenheden en worden los gefinaliseerd. Houd hier het epic-overzicht + de dependency-
> volgorde bij; bouw in de fase-files.

# Probleem

De launch-pricing is besloten (ADR `2026-07-07-pricing-credits-launch`): lage vaste basis + prepaid credit-bundel + on-demand top-up, met €15 platform-floor en output-only metering. De billing-**code** (`stripe-billing-live`) doet nu vaste-prijs-subscriptions; het credit-model bestaat nog niet werkend. De fair-use-rem is niet aangesloten (`trackAiUsage` wordt nergens aangeroepen, `ai_usage_record` leeg), dus élke prijs is nu een blanco cheque op de duurste gebruiker. Daarnaast mist de EU-laag: iDEAL/SEPA als betaalmethode en Stripe Tax/BTW-verlegging.

# Voorstel

Bouw het credit-model werkend in de app: een pooled credit-ledger op account-niveau, afboeking op élke generatie-site (incl. background-jobs) met pre-flight reservering, prepaid top-up + auto-topup via SEPA-mandaat, de 28-daagse no-card trial, en de iDEAL/SEPA + Stripe Tax-laag. Hergebruik de bestaande spine (`metered.ts`/`usage-tracker.ts`/`enforcement.ts`/`aiOveragePer1kTokens`) waar mogelijk; zet in-arrears om naar prepaid.

# Faseplan

> Elke fase is los te finaliseren; GESPLITST in eigen task-files (zie onderaan).

- **Fase 0 — Datamodel + config.** `CreditBalance` (pooled per org/account) + `CreditTransaction`-ledger (grant/deduct/topup/trial/reserve) in `schema.prisma` → Neon `db push`. `PlanTier`-enum mappen naar `FREE/STARTER/GROWTH/AGENCY` + `ENTERPRISE=contact-sales` (rename of extra waarde + migratie). `plan-limits.ts` herschrijven: prijzen €39/€89/€299, credit-bundels 400/1.200/4.000, floor €15, incl.-tarief ~€0,06-0,07, top-up €0,10. Credit-kosten-registry per actie (short 5 / long-form 80 / beeld 2 / video 20 / agent 3 / gratis-acties 0).
- **Fase 1 — Ledger-core + metering.** `deductCredits`/`grantCredits`/`reserveCredits`/`reconcileReservation` op de ledger. `trackAiUsage` omzetten: **alleen output-tokens + beeld/video-generaties** → credits (merkcontext-input/F-VAL uitsluiten). Pre-flight-reservering: schat kost vóór een run, check/reserveer saldo, reconcileer werkelijk verbruik op completion. `enforcement.ts` uitbreiden met een credit-balans-guard (402 bij leeg saldo + geen auto-topup).
- **Fase 2 — Wire op alle generatie-sites.** Afboeking bedraden op: canvas-orchestrator, SEO-pipeline, agents (`runAgentLoop`/registry), persona-chat, beeld/video-generatie. **Incl. de background-jobs** uit `serverless-hardening-jobs` (`handlers.ts`): elke job die AI draait boekt credits op de juiste workspace/account.
- **Fase 3 — Prepaid top-up + auto-topup.** Stripe-flow voor credit-packs (500/€50 · 1.500/€135 · 5.000/€400). Auto-topup: optimistisch grant tegen SEPA-mandaat bij ontoereikend saldo, met **plafond op onbevestigde blootstelling + melding per topup + user-toggle**. `metered.ts` Billing-Meter-in-arrears vervangen door prepaid top-up-aankopen.
- **Fase 4 — Trial-logica.** 28-daagse no-card reverse trial: 300 credits éénmalig (niet resettend), kaart pas bij eerste top-up/conversie, read-only lock van de merk-data op dag 28 (niet wissen).
- **Fase 5 — iDEAL/SEPA + Stripe Tax/BTW.** Checkout: `ideal` + `sepa_debit`; recurring basis + auto-topup via iDEAL→SEPA-mandaat (`SetupIntent`). Stripe Tax aan; BTW-nummer-veld + VIES-validatie; NL 21% / EU-B2B reverse-charge / OSS. `Invoice`-model + `InvoiceHistoryCard` uitbreiden met BTW-uitsplitsing + "btw verlegd"-notitie.
- **Fase 6 — In-app usage-UX.** Credit-balans + "X van Y credits" meter, pre-flight "dit kost ~N credits"-indicatie bij generatie-acties, top-up-CTA + pack-keuze, auto-topup-instelling, trial-countdown.

# Acceptatiecriteria

- [ ] `CreditBalance` + `CreditTransaction` in schema + Neon; enum gemapt; `plan-limits.ts` = nieuwe prijzen/bundels/floor.
- [ ] Credits worden afgeboekt op **alle** generatie-sites incl. background-jobs; **alleen output + beeld/video** tellen (merkcontext/F-VAL = 0 credits, geverifieerd).
- [ ] Pre-flight reservering blokkeert een run niet mid-stream; ontoereikend saldo → auto-topup (met plafond/melding/toggle) óf nette 402.
- [ ] Prepaid top-up-packs koopbaar via Stripe; auto-topup werkt via SEPA-mandaat.
- [ ] 28-daagse no-card trial: 300 credits, read-only lock op dag 28.
- [ ] iDEAL (los) + iDEAL→SEPA (recurring/auto-topup) werkend; Stripe Tax aan; BTW-nummer-veld; facturen met reverse-charge-notitie.
- [ ] In-app: credit-balans + meter + pre-flight-schatting + top-up-CTA zichtbaar.
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie plan)
- [ ] `docs/playbooks/stripe-go-live.md` bijgewerkt (credit-model + iDEAL/SEPA + Stripe Tax/BTW + nieuwe `STRIPE_PRICE_*`-set)

# Bestanden die ik aanraak

- `prisma/schema.prisma` — `CreditBalance`, `CreditTransaction`, `PlanTier`-enum, `Invoice` BTW-velden
- `src/lib/constants/plan-limits.ts` — prijzen/bundels/floor/enum/credit-kosten-registry
- `src/lib/stripe/metered.ts` + `usage-tracker.ts` + `enforcement.ts` — credit-ledger + prepaid + balans-guard
- `src/lib/billing/credits/*` (nieuw) — ledger-core, reservering, credit-kosten
- generatie-sites: `canvas-orchestrator.ts`, `seo-pipeline.ts`, `src/lib/agents/registry/*`, `persona-chat.ts`, beeld/video-routes, `src/lib/agents/jobs/handlers.ts`
- Stripe: checkout-route (iDEAL/SEPA + Tax), top-up-route (nieuw), webhook-handlers (mandaat + tax)
- `src/features/settings/components/billing/*` — usage-UI + BTW-facturen
- `docs/playbooks/stripe-go-live.md`

# Bestanden die ik NIET aanraak

- De F-VAL-pipeline zelf (`fidelity-runner.ts` e.d.) — scoring blijft credit-vrij, niet aanpassen
- Merk-context-assemblage (`getBrandContext`) — input blijft gratis, geen metering-haak
- Agents-motorlogica (`runAgentLoop` gedrag) — alleen een afboek-haak toevoegen, geen gedrag wijzigen

# Smoke test plan

1. Nieuwe account → 28-daagse trial start zonder kaart, 300 credits zichtbaar.
2. Genereer een long-form artikel → pre-flight toont "~80 credits", saldo daalt met de werkelijke afboeking; F-VAL draait maar kost 0 credits; merkcontext-input kost 0 credits.
3. Verbruik tot onder een dure run → auto-topup triggert (of nette 402 als toggle uit) → run voltooit zonder mid-stream afkap.
4. Koop een top-up-pack via iDEAL → SEPA-mandaat opgezet → credits toegekend.
5. Achtergrond-job (bv. alignment-scan) draait → boekt credits op het juiste account.
6. Checkout met NL-BTW-nummer → reverse-charge-factuur ("btw verlegd") met beide BTW-nummers.
7. Dag 28 zonder conversie → merk-data read-only, niet gewist.

# Risico's

- **Metering-lekken**: een generatie-site die geen afboeking krijgt = gratis AI = margeverlies. Mitigatie: centrale afboek-helper + een audit-grep op alle AI-call-sites; smoke per site.
- **Pre-flight-schatting te laag** → mid-run tekort. Mitigatie: conservatief schatten + reserveren; reconcileren op completion.
- **SEPA niet instant** → auto-topup-timing. Mitigatie: optimistisch grant tegen mandaat + blootstellingsplafond.
- **Enum-migratie** raakt bestaande subscriptions/rows. Mitigatie: mapping-migratie + backfill; Neon `db push` handmatig (gotcha `neon-schema-push-on-deploy`).
- **Dubbeltelling met de agents cost-calculator** (`totalCostUsd`) — dat is interne COGS-tracking, niet de klant-afboeking; gescheiden houden.
- **Deze omgeving kan tsc/app niet volledig draaien**; verificatie = lint per file + CI-tsc/build + deploy-smoke (Stripe-flows lokaal beperkt testbaar).

# Out of scope

- Usage-based/outcome-pricing per token als publieke eenheid (credits blijven de eenheid).
- Jaarlijkse facturatie-toggle (kan later; `STRIPE_PRICE_*_YEARLY` wel voorbereiden).
- Multi-currency (EUR only).
- Enterprise-tier zelf (blijft "contact sales", handmatig).

# Notes

- ADR: `docs/adr/2026-07-07-pricing-credits-launch.md` (tien deelbeslissingen + 300-user calc).
- Hergebruik: `metered.ts`/`usage-tracker.ts`/`enforcement.ts`/`aiOveragePer1kTokens` bestaan al — omzetten naar credit/prepaid, niet from-scratch.
- Interactie met `serverless-hardening-jobs`: background-jobs moeten credits boeken — coördineer de afboek-haak met die werkstroom (A1 is compleet, jobs staan al op de queue).
- Kandidaat voor technical-planner om per fase in losse task-files te splitsen vóór de bouw. **→ Gedaan 2026-07-07 (zie onder).**

---

# Gesplitst 2026-07-07 (technical-planner)

Deze umbrella blijft de **epic-tracker**. De uitvoerbare eenheden zijn de 7 fase-task-files hieronder — elk volledig volgens `tasks/_template.md` (frontmatter, probleem, voorstel, acceptatie incl. tsc/lint/smoke, file-lists aanraak/NIET-aanraak, smoke, risico's, out-of-scope, notes met dependencies). Bouw + finaliseer per fase-file, niet in deze umbrella.

| Fase | Task-file | Effort | Kern |
|---|---|---|---|
| 0 | `tasks/pricing-credits-fase0-datamodel.md` | 1-2 d | Schema (`CreditBalance`/`CreditTransaction`, pooled op Organization) + `PlanTier`-mapping + `plan-limits.ts` herschrijven + credit-kosten-registry |
| 1 | `tasks/pricing-credits-fase1-ledger-core.md` | 2-3 d | Ledger-core (deduct/grant/reserve/reconcile) + output-only metering + pre-flight-reservering + balans-guard |
| 2 | `tasks/pricing-credits-fase2-metering-wiring.md` | 3-5 d | Afboeking bedraden op alle generatie-sites incl. background-jobs (`handlers.ts`) + audit-grep |
| 3 | `tasks/pricing-credits-fase3-topup.md` | 2-3 d | Prepaid top-up-packs + auto-topup (plafond/melding/toggle); in-arrears `metered.ts` → prepaid |
| 4 | `tasks/pricing-credits-fase4-trial.md` | 1-2 d | 28-daagse no-card reverse trial (300 cr, read-only lock dag 28) |
| 5 | `tasks/pricing-credits-fase5-payments-tax.md` | 4-6 d | iDEAL/SEPA payment-methods + iDEAL→SEPA-mandaat + Stripe Tax/BTW (VAT + reverse-charge + OSS + factuur-velden) |
| 6 | `tasks/pricing-credits-fase6-usage-ux.md` | 2-3 d | In-app usage-UX (balans/meter/pre-flight-schatting/top-up-CTA/auto-topup-instelling/trial-countdown) |

## Dependency-volgorde (kritiek pad + parallellisme)

```
Fase 0 (fundament — blokkeert ALLES)
   │
   └─► Fase 1 (ledger-core — blokkeert Fase 2)
          │
          ├─► Fase 2 (wiring generatie-sites + jobs)     ── kan parallel met Fase 5 ──┐
          │                                                                            │
          ├─► Fase 4 (trial)            ── parallel mogelijk ──                        │
          │                                                                            │
          ├─► Fase 6 (usage-UX, API-kant kan vroeg starten) ── parallel ──            │
          │                                                                            │
          └─► Fase 3 (top-up + auto-topup)                                            │
                 │  • handmatige iDEAL-pack-aankoop: kan direct na Fase 1             │
                 │  • auto-topup-tak: WACHT op SEPA-mandaat uit Fase 5 (5a) ◄─────────┘
                 │
Fase 5 (payments/tax) — grotendeels PARALLEL aan Fase 1-2 (raakt Stripe-laag/UI, niet de ledger)
   • 5a (SEPA-mandaat) = BLOKKER voor Fase 3 auto-topup → plan 5a vroeg
   • 5b (Stripe Tax/BTW) = hangt aan niets in Fase 3 → kan het laatst
```

- **Sequentieel verplicht**: 0 → 1 → 2.
- **Hangt aan 0+1**: 3, 4, 6.
- **Parallel mogelijk** (na 0+1, raken andere bestanden): 2 ⟷ 5 ⟷ 4, en de API-kant van 6.
- **Kruis-dependency**: Fase 3 auto-topup ⟵ Fase 5a (SEPA-mandaat). De handmatige top-up-aankoop in Fase 3 kan zonder 5a; alleen de auto-topup-tak wacht.

## Spec-Kit Phase -1 Gate-bevindingen

- **Simplicity Gate**: twee fasen zijn >1 week-kandidaten en zijn met expliciete sub-batches gemarkeerd om verder te splitsen indien nodig — **Fase 2** (langs 2a-tekst / 2b-agents / 2c-beeld-video / 2d-jobs) en **Fase 5** (langs 5a-payment-methods+mandaat / 5b-Tax+BTW). Aanbeveling: split alleen als de eerste sub-batch al >1 week loopt.
- **Anti-Abstraction Gate**: hergebruik afgedwongen — geen nieuwe payment/billing-abstractielaag. `usage-tracker.ts`/`enforcement.ts`/`metered.ts`/`one-time.ts`/`webhook-handlers.ts` + `aiOveragePer1kTokens` worden omgezet/uitgebreid; Stripe Tax doet de BTW-berekening (wij slaan resultaat op). De nieuwe `src/lib/billing/credits/*`-helpers zijn dun en concreet op de Prisma-tabellen.
- **Integration-First Gate**: per fase zijn de contracten vastgelegd vóór implementatie — `reserveCredits/reconcileReservation/withCreditMetering` (1→2), `webhook→grantCredits` + `maybeAutoTopup(orgId, shortfall)` (3), `org.sepaMandateStatus` (5→3), `getTrialState` (4→6), balans-API-shape (1-4→6).
- **Architectuur-bevinding (Fase 0)**: billing is vandaag workspace-scoped (`Workspace.planTier`, `Subscription @unique workspaceId`) maar de ADR eist pooled credits op account/org-niveau. Beslissing in Fase 0: `CreditBalance`/`CreditTransaction` op **`Organization`**; de credit-tier org-gelezen; volledige unificatie van feature-enforcement naar org is bewust **buiten scope** gehouden (latere opruiming) om de fase klein te houden.
- **Neon-gotcha**: Fase 0, 2, 3, 4, 5 raken alle `schema.prisma` → elk vereist een handmatige Neon `prisma db push` ná merge (memory `neon-schema-push-on-deploy`); opgenomen in de acceptatie van elke schema-rakende fase.
