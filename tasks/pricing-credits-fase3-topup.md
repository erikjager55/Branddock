---
id: pricing-credits-fase3-topup
title: Credit-billing Fase 3 — prepaid top-up + auto-topup (Stripe packs + SEPA-mandaat + plafond/melding/toggle)
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

De ledger kan credits toekennen/afboeken (Fase 1) en de sites boeken af (Fase 2), maar er is nog geen manier om credits **bij te kopen**. Zonder prepaid top-up loopt een account leeg en stopt (nette 402), zonder herstelpad. De ADR (D6/D7/D9) eist: prepaid credit-packs (500/€50 · 1.500/€135 · 5.000/€400) én auto-topup die bij een dreigend tekort optimistisch credits toekent tegen het SEPA-mandaat, met guardrails (plafond op onbevestigde blootstelling + melding per topup + user-toggle). De bestaande `metered.ts` in-arrears Billing-Meter-aanpak moet plaatsmaken voor prepaid.

# Voorstel

Bouw een prepaid top-up-flow op de bestaande Stripe-primitives (`one-time.ts`-patroon + `checkout.ts`): een top-up-route die een pack koopt (iDEAL single-use of SEPA-mandaat) → webhook kent de credits toe via `grantCredits('TOPUP')`. Bouw **auto-topup**: wanneer `enforceCreditBalance` (Fase 1) een tekort ziet en auto-topup aan staat, ken de kleinste pack optimistisch toe tegen het SEPA-mandaat, met een **blootstellingsplafond** (max onbevestigde credits), een **melding per topup** en een **toggle** in de instellingen. Deprecate de in-arrears `reportUsageToStripe`-pad (niet verwijderen, wel uit het actieve pad halen).

# Acceptatiecriteria

- [ ] Top-up-packs gedefinieerd in config: `500/€50`, `1.500/€135` (10%), `5.000/€400` (20%); env-var-namen `STRIPE_PRICE_TOPUP_*` (vastgelegd in Fase 0-config, hier gevuld). Basis-tarief €0,10/credit.
- [ ] `src/lib/billing/credits/topup.ts` (nieuw): `createTopupCheckout(orgId, packId, method)` — bouwt een Stripe-betaling voor een pack (mode afhankelijk van method: iDEAL single-use of SEPA-mandaat-charge). Prijs **server-side** afgeleid uit de pack-catalogus (nooit uit de client — H3-patroon uit `one-time.ts`).
- [ ] `src/app/api/stripe/topup/route.ts` (nieuw): start een pack-aankoop; workspace/org-geauthenticeerd.
- [ ] Webhook-handler uitgebreid: op succesvolle top-up-betaling `grantCredits(orgId, packCredits, 'TOPUP', ...)` + idempotent (via `ProcessedStripeEvent`). Metadata op de PaymentIntent/Checkout draagt `orgId` + `packId`.
- [ ] **Auto-topup**: `src/lib/billing/credits/auto-topup.ts` (nieuw): `maybeAutoTopup(orgId, shortfall)` — als toggle aan én SEPA-mandaat aanwezig (uit Fase 5) → optimistisch `grantCredits('TOPUP', ..., {optimistic:true})` + een off-session SEPA-charge tegen het mandaat; respecteert het **blootstellingsplafond** (som van optimistisch-toegekende-maar-onbevestigde credits ≤ configureerbaar max). Dit is het injectiepunt dat Fase 1's `enforceCreditBalance` al reserveerde.
- [ ] **Guardrails**: (a) plafond-check die auto-topup weigert boven de onbevestigde-blootstelling-limiet → val terug op 402; (b) een notificatie/melding per auto-topup (hergebruik bestaande notificatie-infra); (c) een `autoTopupEnabled` + `autoTopupPackId` + `autoTopupExposureCap` op de org (schema-veld) met een instellingen-toggle (UI-hook; de volledige UI is Fase 6, hier de API + default-uit).
- [ ] SEPA-terugdraai-afhandeling: op een gefaalde/teruggedraaide SEPA-charge (webhook `payment_intent.payment_failed` / `charge.dispute`/`refund`) worden de optimistisch-toegekende credits teruggeboekt (`grantCredits` negatief, type `REFUND`/`EXPIRY`) en auto-topup voor die org gepauzeerd tot handmatige actie.
- [ ] `metered.ts` in-arrears-pad gedeprecikeerd: `reportUsageToStripe`/`reportUsageForAllWorkspaces` niet langer in het actieve cron-pad (de `usage-report`-route/cron); een korte comment + geen-op maakt duidelijk dat prepaid het model is. Niet fysiek verwijderen (kan later).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie plan)

# Bestanden die ik aanraak

- `src/lib/billing/credits/topup.ts` (nieuw) — pack-catalogus + `createTopupCheckout` (server-side prijs). Risico: medium.
- `src/lib/billing/credits/auto-topup.ts` (nieuw) — `maybeAutoTopup` + plafond + optimistisch grant. Risico: hoog (geld + timing + SEPA).
- `src/app/api/stripe/topup/route.ts` (nieuw) — pack-aankoop starten. Risico: medium.
- `src/lib/stripe/webhook-handlers.ts` — top-up-succes → `grantCredits`; SEPA-fail/refund → terugboeken. Risico: hoog.
- `src/lib/stripe/enforcement.ts` — de auto-topup-hook uit Fase 1 hier daadwerkelijk aansluiten (`enforceCreditBalance` roept `maybeAutoTopup` vóór de 402). Risico: medium.
- `src/lib/stripe/config.ts` / `src/lib/constants/plan-limits.ts` — top-up-pack-config + `STRIPE_PRICE_TOPUP_*`. Risico: laag.
- `prisma/schema.prisma` — `autoTopupEnabled`/`autoTopupPackId`/`autoTopupExposureCap` op `Organization` + evt. een `optimistic`/`confirmed`-flag op relevante `CreditTransaction`-rijen. Additief → Neon `db push`. Risico: laag.
- `src/lib/stripe/metered.ts` — deprecatie-comment + uit actief pad halen. Risico: laag.

# Bestanden die ik NIET aanraak

- SEPA-mandaat-**opzet** zelf (`SetupIntent` iDEAL→SEPA) — dat is Fase 5; deze fase **consumeert** een reeds bestaand mandaat. Als Fase 5 nog niet af is, kan de handmatige pack-aankoop (iDEAL single-use) wél, maar auto-topup blijft geblokkeerd tot het mandaat er is.
- Ledger-core (`ledger.ts`/`reservation.ts`) — af in Fase 1; hier alleen `grantCredits` aanroepen.
- Trial-lifecycle — Fase 4.
- Stripe Tax/BTW — Fase 5.
- De volledige top-up-UI — Fase 6 (hier alleen de API + een default-uit toggle-veld).

# Smoke test plan

1. **Handmatige pack-aankoop**: koop `500/€50` via iDEAL → webhook → `grantCredits(org, 500, 'TOPUP')` → balans +500; `CreditTransaction` type `TOPUP`. Prijs kwam server-side (client kon geen bedrag meesturen).
2. **Auto-topup happy path**: toggle aan + mandaat aanwezig; verbruik tot onder een dure run → `enforceCreditBalance` triggert `maybeAutoTopup` → kleinste pack optimistisch toegekend → run voltooit zonder mid-stream afkap; melding verstuurd.
3. **Plafond**: zet meerdere onbevestigde topups op tot de blootstellingslimiet → volgende auto-topup geweigerd → nette 402 (geen ongelimiteerd optimistisch krediet).
4. **Toggle uit**: auto-topup uit + leeg saldo → nette 402, geen charge.
5. **SEPA-terugdraai**: simuleer een gefaalde SEPA-charge webhook → optimistisch-toegekende credits teruggeboekt (`REFUND`) → auto-topup gepauzeerd voor die org.
6. **Idempotentie**: dubbel webhook-event voor dezelfde top-up → één grant (`ProcessedStripeEvent`).
7. `npx tsc --noEmit` + `npm run lint` groen.

# Risico's

- **SEPA is niet instant** (waarschijnlijkheid: zeker, impact medium): dagen tot settlement, weken terugdraaibaar → optimistisch grant draagt een begrensd debiteurenrisico. Mitigatie: blootstellingsplafond (hard max onbevestigde credits) + pauze-op-terugdraai + melding per topup (ADR D7 + Consequences).
- **Dubbel toekennen bij webhook-retries** (medium): Stripe stuurt events soms meermaals. Mitigatie: `ProcessedStripeEvent`-idempotentie (bestaand patroon) rond `grantCredits`.
- **Race tussen auto-topup en gelijktijdige runs** (medium): meerdere runs zien tegelijk een tekort. Mitigatie: `maybeAutoTopup` idempotent per shortfall-window + de atomaire ledger-update uit Fase 1 voorkomt dubbel-boeken; één topup per window.
- **Prijs-manipulatie** (laag, gemitigeerd): pack-prijs altijd server-side afgeleid (H3-patroon uit `one-time.ts`).
- **Deze omgeving kan Stripe-flows niet volledig draaien**: verificatie = lint per file + CI-tsc/build + deploy-smoke met Stripe-testmode (iDEAL/SEPA-testflows beperkt lokaal).

# Out of scope

- iDEAL→SEPA-mandaat-**opzet** (`SetupIntent`) + Stripe Tax — Fase 5 (dependency).
- Trial-conversie naar betaald — Fase 4.
- De volledige top-up-UI (pack-keuze, auto-topup-instellingenscherm, meldingsweergave) — Fase 6.
- Jaarlijkse/bundel-kortingscodes buiten de 3 packs.

# Notes

- **Dependencies**: hangt aan **Fase 0 + Fase 1** (ledger + `grantCredits` + `enforceCreditBalance`-hook). **Auto-topup hangt kritisch aan Fase 5** (het iDEAL→SEPA-mandaat) — zonder mandaat werkt alleen de handmatige iDEAL-pack-aankoop. Volgorde-advies: de **handmatige pack-aankoop kan direct na Fase 1** (parallel aan Fase 2/5); de **auto-topup-tak wacht op het SEPA-mandaat uit Fase 5**. Markeer deze twee sub-delen apart als de planning strak moet.
- **Anti-Abstraction**: hergebruik `one-time.ts` (server-side-prijs-patroon + PaymentIntent) en `webhook-handlers.ts` (bestaande event-afhandeling + `ProcessedStripeEvent`-idempotentie) — geen nieuwe payment-abstractie. De in-arrears `metered.ts` wordt vervangen, niet uitgebreid (ADR D6).
- **Integration-First**: het webhook→`grantCredits`-contract + de `maybeAutoTopup(orgId, shortfall)`-signature liggen hier vast; Fase 6 toont alleen de resultaten.
- **Verificatie-noot**: deze omgeving kan Stripe niet volledig draaien; leun op Stripe-testmode + CLI-webhook-triggers op de deploy voor de eind-smoke.
