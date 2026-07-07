---
id: pricing-credits-fase1-ledger-core
title: Credit-billing Fase 1 — ledger-core + metering (deduct/grant/reserve/reconcile, output-only, pre-flight reservering, balans-guard)
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

Met het datamodel uit Fase 0 (`CreditBalance`/`CreditTransaction` op org-niveau + credit-kosten-registry) bestaat er nog geen gedrag: geen manier om credits toe te kennen, af te boeken, vooraf te reserveren of te settelen. De fair-use-rem is nog steeds niet aangesloten (`trackAiUsage` heeft nul call-sites, `ai_usage_record` leeg). Zonder een transactionele ledger-core met pre-flight-reservering is elke prijs een blanco cheque, en kan geen enkele generatie-site (Fase 2) veilig afboeken.

# Voorstel

Bouw de **ledger-core** als één centrale, transactionele module op de Fase-0-tabellen: `grantCredits`, `deductCredits`, `reserveCredits`, `reconcileReservation`, `getBalance`. Zet `trackAiUsage` om zodat **alleen output-tokens + beeld/video-generaties** credits kosten (merkcontext-input, F-VAL, chat, setup, exploratie = 0 via `ZERO_COST_ACTIONS`). Implementeer het **pre-flight-reserveringspatroon**: schat de kost vóór een run (registry), reserveer het saldo, en reconcileer het werkelijke output-token-verbruik op completion — nooit mid-run afkappen. Breid `enforcement.ts` uit met een **credit-balans-guard** die een nette 402 geeft bij leeg saldo zonder auto-topup. Hergebruik de bestaande spine (`usage-tracker.ts`/`enforcement.ts`/`metered.ts`) i.p.v. een nieuwe abstractielaag.

# Acceptatiecriteria

- [ ] `src/lib/billing/credits/ledger.ts` (nieuw): `getBalance(orgId)`, `grantCredits(orgId, amount, type, reason, meta)`, `deductCredits(orgId, amount, {workspaceId, action, feature, outputTokens})`, alle binnen een Prisma-`$transaction` met een row-lock/atomaire `update` op `CreditBalance` zodat gelijktijdige runs niet dubbel-boeken; elke mutatie schrijft een `CreditTransaction` met `balanceAfter`.
- [ ] `src/lib/billing/credits/reservation.ts` (nieuw): `reserveCredits(orgId, estimatedCredits, ctx)` verhoogt `CreditBalance.reserved` en checkt `balance - reserved >= estimate` (anders `InsufficientCreditsError`); `reconcileReservation(reservationId, actualOutputTokens|actualCount)` zet de reservering om in een definitieve `deduct` op basis van het **werkelijke** verbruik en geeft het verschil vrij. Reserveringen krijgen een id + status (`RESERVED`/`SETTLED`/`RELEASED`) zodat een gefaalde run de reservering vrijgeeft (geen credit-lek bij crash).
- [ ] `trackAiUsage` (in `usage-tracker.ts`) omgezet/uitgebreid: naast de bestaande `AiUsageRecord` (analytics blijft) roept het de ledger aan — **maar alleen voor niet-gratis acties**. `ZERO_COST_ACTIONS` (uit Fase 0) wordt hard gerespecteerd: merkcontext-input, F-VAL, chat, setup, exploratie boeken 0 credits en 0 reservering. Getest dat een F-VAL-run 0 credits kost.
- [ ] Output-only: de afboeking gebruikt **output-tokens** (via `tokensToCredits` uit de registry), niet input-tokens. Input-token-velden worden genegeerd voor de credit-berekening (blijven wel in `AiUsageRecord` voor COGS-analytics).
- [ ] `enforcement.ts` uitgebreid met `enforceCreditBalance(orgId, estimatedCredits)` → `NextResponse | null` (402 bij ontoereikend saldo én auto-topup uit/onbeschikbaar), consistent met het bestaande `enforcePlanLimit`-patroon (route doet `const limited = await enforceCreditBalance(...); if (limited) return limited;`). De auto-topup-hook is een injectiepunt (Fase 3 vult de daadwerkelijke topup in) — hier alleen de guard + de "geen auto-topup"-402-tak.
- [ ] `InsufficientCreditsError` + een 402-serializer zodat routes een consistente body teruggeven (mirror van `PlanLimitError`).
- [ ] Idempotentie: `deductCredits`/`reconcileReservation` accepteren een idempotency-key zodat een dubbel-gedispatchte job (Fase 2 background-jobs) niet dubbel afboekt.
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie plan)

# Bestanden die ik aanraak

- `src/lib/billing/credits/ledger.ts` (nieuw) — `getBalance`/`grant`/`deduct` transactioneel. Risico: hoog (concurrency + geld-correctheid).
- `src/lib/billing/credits/reservation.ts` (nieuw) — reserve/reconcile/release + reservering-status. Risico: hoog.
- `src/lib/billing/credits/errors.ts` (nieuw) — `InsufficientCreditsError` + 402-serializer. Risico: laag.
- `src/lib/stripe/usage-tracker.ts` — `trackAiUsage` haakt aan de ledger voor niet-gratis acties; `AiUsageRecord`-schrijven blijft; nieuwe helper `resolveOrgForWorkspace(workspaceId)` (workspace→org voor de pooled boeking). Risico: medium.
- `src/lib/stripe/enforcement.ts` — `enforceCreditBalance` + credit-guard erbij (naast bestaande feature-guards). Risico: medium.
- `src/lib/billing/credits/credit-costs.ts` — evt. kleine uitbreiding van de conversie-helper (`estimateActionCredits`, `settleTokens`) als die nog niet volstaat uit Fase 0. Risico: laag.

# Bestanden die ik NIET aanraak

- Generatie-sites (canvas-orchestrator, seo, agents, persona-chat, beeld/video) — het **bedraden** is Fase 2; deze fase levert alleen de helpers die zij aanroepen.
- `metered.ts` `reportUsageToStripe`/Billing-Meter-in-arrears — vervangen door prepaid gebeurt in Fase 3; in Fase 1 blijft het staan maar wordt niet meer de primaire pad. Niet verwijderen hier.
- `cost-calculator.ts` — COGS blijft gescheiden.
- Stripe checkout/webhook — Fase 3/5.
- UI — Fase 6.

# Smoke test plan

1. Unit/throwaway: `grantCredits(org, 300, 'TRIAL_GRANT')` → `getBalance` = 300; één `CreditTransaction` met `balanceAfter: 300`.
2. `reserveCredits(org, 80, {action:'long-form'})` → `reserved` = 80, beschikbaar = 220; `reconcileReservation(id, {outputTokens: 1500})` → definitieve deduct = werkelijke token-credits (bv. 62), reserved terug naar 0, balance = 300 − 62.
3. Output-only: een call met `action:'f-val'` of `feature:'brand-context'` → 0 credits afgeboekt, 0 reservering, wél een `AiUsageRecord` voor analytics.
4. Ontoereikend saldo: balance 10, `reserveCredits(org, 80)` → gooit `InsufficientCreditsError`; `enforceCreditBalance` geeft een 402 met een nette body (auto-topup uit).
5. Concurrency: twee gelijktijdige `deductCredits(org, 50)` op balance 60 → precies één slaagt, de ander faalt/wacht; eindsaldo nooit negatief (row-lock/atomaire update bewijst geen dubbel-boeking).
6. Crash-pad: reserveer, simuleer een gefaalde run → `releaseReservation` geeft de credits vrij; balance ongewijzigd (geen lek).
7. Idempotentie: `deductCredits(..., idempotencyKey:'x')` tweemaal → één boeking.
8. `npx tsc --noEmit` + `npm run lint` groen.

# Risico's

- **Concurrency / dubbel-boeken** (waarschijnlijkheid: medium, impact hoog): twee gelijktijdige runs op hetzelfde org-saldo. Mitigatie: alle mutaties in één `$transaction` met een atomaire conditionele `update` (`WHERE balance - reserved >= :amount`) i.p.v. read-then-write; row-count-check bepaalt succes.
- **Reservering-lek bij crash** (medium): een run crasht tussen reserve en reconcile → credits blijven "reserved". Mitigatie: reservering-status + een `releaseReservation` in de finally/catch van de caller (Fase 2) én een reaper (stale reservations > N min automatisch vrijgeven — kan als kleine cron, noteer voor Fase 2).
- **Pre-flight-schatting te laag** → theoretisch tekort bij reconcile (medium): de reservering is de schatting; de werkelijke afboeking kan hoger uitvallen. Mitigatie: conservatief schatten (registry ronde naar boven) + reconcile mag het saldo tot 0 brengen maar niet blokkeren (de output is al gemaakt; nooit mid-run afkappen — ADR D7); een klein negatief-toegestaan-buffer of een lichte overschrijding wordt bij de volgende reserve/topup verrekend.
- **Workspace→org-resolutie** (laag): elke afboeking moet de juiste org vinden. Mitigatie: één helper `resolveOrgForWorkspace`, hergebruikt door alle Fase-2-sites; gecached waar nuttig.
- **Deze omgeving kan tsc/app niet volledig draaien**: verificatie = lint per file + CI-tsc/build + deploy-smoke (ledger lokaal wél unit-testbaar zonder Stripe).

# Out of scope

- Daadwerkelijke auto-topup-uitvoering (alleen de guard + injectiepunt hier) — Fase 3.
- Afboeking bedraden op de generatie-sites — Fase 2.
- Trial-grant-lifecycle (300 credits + dag-28-lock) — Fase 4 (Fase 1 levert wel `grantCredits('TRIAL_GRANT')` als bouwsteen).
- Prepaid top-up-aankopen via Stripe — Fase 3.
- UI-weergave van balans/meter — Fase 6.

# Notes

- **Dependencies**: hangt aan **Fase 0** (schema + registry). **Blokkeert Fase 2** (sites hebben deze helpers nodig). Fase 3, 4 en 6 hangen ook aan de helpers uit deze fase (`grantCredits`, `getBalance`, `enforceCreditBalance`). Sequentieel na Fase 0.
- **Anti-Abstraction**: geen nieuwe generieke "billing engine" — `usage-tracker.ts` en `enforcement.ts` bestaan al en worden uitgebreid; de nieuwe `ledger.ts`/`reservation.ts` zijn dunne, concrete helpers op de Prisma-tabellen, geen wrapper-laag. `aiOveragePer1kTokens`-concept uit `plan-limits.ts` is de basis voor `tokensToCredits`.
- **Integration-First**: de contracten die Fase 2 consumeert liggen hier vast — `reserveCredits(orgId, estimate, ctx) → {reservationId}` en `reconcileReservation(reservationId, {outputTokens|count}) → {creditsSpent}`. Schrijf deze signatures eerst en peg Fase 2 erop.
- **Verificatie-noot**: Stripe-flows zijn hier niet nodig; de ledger is puur DB + logica en dus lokaal unit-smokebaar.
- Reaper voor stale reservations: klein, kan als `RESERVATION_REAP` job-type in Fase 2 (`handlers.ts`) mee.
