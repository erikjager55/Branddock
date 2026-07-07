---
id: pricing-credits-fase0-datamodel
title: Credit-billing Fase 0 — datamodel + config (CreditBalance/CreditTransaction, PlanTier-mapping, plan-limits herschrijven, credit-kosten-registry)
fase: launch
priority: now
effort: 1-2 dagen
owner: claude-code
status: open
created: 2026-07-07
related-adr: docs/adr/2026-07-07-pricing-credits-launch.md
related-spec: tasks/pricing-credits-billing.md
worktree: branddock-feat-pricing-credits
---

# Probleem

De launch-pricing is besloten (ADR `2026-07-07-pricing-credits-launch`): lage vaste basis + prepaid credit-bundel + on-demand top-up, met €15 platform-floor en output-only metering. Het datamodel en de config bestaan nog niet: er is geen credit-ledger, de `PlanTier`-enum (`FREE/PRO/AGENCY/ENTERPRISE`) matcht niet met de nieuwe tiers (`FREE(trial)/STARTER/GROWTH/AGENCY` + `ENTERPRISE=contact-sales`), en `plan-limits.ts` draagt nog de placeholder-prijzen (€29/€99/€249) en token-limieten i.p.v. credit-bundels. Zonder dit fundament kan geen enkele latere fase bouwen.

# Voorstel

Leg het datamodel en de config vast: (1) een **pooled `CreditBalance` op Organization-niveau** + een `CreditTransaction`-ledger (grant/deduct/topup/trial/reserve/reconcile), (2) de `PlanTier`-enum omzetten naar de nieuwe tiers met een migratie-mapping van bestaande rows, (3) `plan-limits.ts` + `src/types/billing.ts` herschrijven naar de nieuwe prijzen/bundels/floor, en (4) een **credit-kosten-registry** (per-actie pre-flight-schatting + token→credit-conversie voor de werkelijke afboeking). Geen ledger-gedrag hier (dat is Fase 1) — puur schema, enum, config en constants.

# Architectuurbeslissing — pooling op Organization (lees dit eerst)

Billing is vandaag **workspace-scoped** (`Workspace.planTier`, `Subscription @unique workspaceId`, `enforcement.ts` leest `workspace.planTier`), terwijl `Organization` al `stripeCustomerId` + `subscriptionStatus` + `trialEndsAt` + `maxWorkspaces` draagt. De ADR (D8) is expliciet: **credits gepoold op account/org-niveau; de tier bepaalt het aantal merken (workspaces) + het pooled maandtegoed.** Daarom:

- `CreditBalance` en `CreditTransaction` hangen aan **`Organization`** (niet Workspace).
- De **plan-tier verhuist conceptueel naar Organization** als bron van waarheid voor het aantal workspaces/seats + het maandtegoed. `Workspace.planTier` blijft voorlopig bestaan voor de bestaande per-workspace feature-limieten (persona's/campagnes/etc.), maar de **credit-tier** wordt op org gelezen. Dit is bewust de kleinste stap: we introduceren géén org-brede refactor van alle feature-enforcement in deze fase — alleen de credit-laag is org-scoped. (Volledige unificatie van tier-resolution is een aparte, latere opruiming — genoteerd in Out of scope.)

# Acceptatiecriteria

- [ ] `CreditBalance`-model in `schema.prisma`: `organizationId @unique`, `balance Int` (huidig saldo), `reserved Int` (gereserveerd maar nog niet gesettled), `lifetimeGranted Int`, `lifetimeSpent Int`, `updatedAt`. Relatie op `Organization`.
- [ ] `CreditTransaction`-model: `organizationId`, `workspaceId String?` (welk merk verbruikte — voor attributie), `amount Int` (positief=grant/topup, negatief=deduct), `type` (`enum CreditTransactionType`: `TRIAL_GRANT`/`PLAN_GRANT`/`TOPUP`/`DEDUCT`/`RESERVE`/`RECONCILE`/`REFUND`/`EXPIRY`), `reason String`, `feature String?`, `action String?` (bv `long-form`, `image`), `outputTokens Int?`, `balanceAfter Int`, `metadata Json?`, `createdAt`. Indexen op `[organizationId, createdAt]` en `[workspaceId, createdAt]`.
- [ ] `enum PlanTier` gemapt: `FREE` (=trial) blijft, `PRO`→`STARTER`, nieuw `GROWTH`, `AGENCY` blijft, `ENTERPRISE` blijft (contact-sales). Bijbehorende `src/types/billing.ts` `PlanTier`-union bijgewerkt.
- [ ] Data-migratie/backfill-script: bestaande `Workspace.planTier`/`Organization`-rows gemapt (`PRO`→`STARTER`, overige 1-op-1); bestaande `Subscription`-rows raken niet stuk. Backfill een `CreditBalance` (balance 0) voor elke bestaande Organization.
- [ ] `plan-limits.ts` herschreven: prijzen `Starter €39 / Growth €89 / Agency €299`; maand-credit-bundels `400 / 1.200 / 4.000`; floor-constante `€15`; incl.-tarief-constante (~€0,06-0,07); top-up-tarief `€0,10`; workspaces/seats per tier (`2/2`, `5/5`, `15/10`); `ENTERPRISE` = contact-sales (geen publieke prijs). `PLAN_CONFIGS` + `ALL_TIERS` consistent.
- [ ] **Credit-kosten-registry** (nieuw `src/lib/billing/credits/credit-costs.ts`): (a) per-actie pre-flight-schatting (`short:5, long-form:80, image:2, video-clip:20, agent-deliverable:3, chat/f-val/setup/exploration:0`), (b) token→credit-conversie-tabel per model (mirror van `ANTHROPIC_PRICING_PER_M_TOKENS`-structuur, maar uitgedrukt in credits/1k output-tokens zodat de werkelijke afboeking lengte-accuraat is), (c) een `ZERO_COST_ACTIONS`-set (merkcontext-input, F-VAL, chat, setup, exploratie) zodat "gratis" expliciet en testbaar is.
- [ ] Neon `prisma db push` handmatig uitgevoerd (gotcha `neon-schema-push-on-deploy`) + `npx prisma generate`.
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie plan)

# Bestanden die ik aanraak

- `prisma/schema.prisma` — nieuw `CreditBalance` + `CreditTransaction` + `enum CreditTransactionType`; `enum PlanTier` waarden bijwerken (`PRO`→`STARTER` + `GROWTH` toevoegen); relaties op `Organization` (regel ~13) + optioneel `workspaceId` op `CreditTransaction`. Risico: hoog (enum-change raakt bestaande rows).
- `src/types/billing.ts` — `PlanTier`-union bijwerken; nieuwe types `CreditTransactionType`, `CreditBalanceSnapshot`, `CreditCostEstimate`; `StripePriceIds` uitbreiden met top-up-pack-prijzen (voorbereidend, waarden pas in Fase 3/5). Risico: medium.
- `src/lib/constants/plan-limits.ts` — prijzen/bundels/floor/tarieven/workspaces/seats herschrijven; `PLAN_CONFIGS`, `ALL_TIERS`, credit-bundel-constanten. Risico: medium.
- `src/lib/billing/credits/credit-costs.ts` (nieuw) — per-actie-registry + token→credit-conversie + `ZERO_COST_ACTIONS`. Risico: laag (pure constants + helper).
- `src/lib/billing/credits/types.ts` (nieuw) — gedeelde credit-domein-types (ledger-entry-shapes, action-enum). Risico: laag.
- `scripts/migrate-plan-tier-mapping.ts` (nieuw) — eenmalige backfill: enum-mapping + CreditBalance-seed per org. Risico: medium (draait tegen prod-DB).

# Bestanden die ik NIET aanraak

- `src/lib/stripe/metered.ts` / `usage-tracker.ts` / `enforcement.ts` — omzetten naar credit-ledger gebeurt in Fase 1, niet hier. Fase 0 laat de bestaande AI_TOKENS-logica intact draaien.
- Alle generatie-sites — geen afboek-haken in deze fase (Fase 2).
- `src/lib/brandclaw/orchestrator/cost-calculator.ts` — dit is interne COGS-tracking (USD), géén klant-afboeking; blijft ongewijzigd en gescheiden.
- Stripe checkout/webhook/config — payment-methods + packs zijn Fase 3/5.

# Smoke test plan

1. `npx prisma db push` tegen lokaal + Neon → `CreditBalance`/`CreditTransaction`/`CreditTransactionType` verschijnen; `PlanTier` bevat `STARTER`/`GROWTH`; geen destructieve drop-warning op bestaande data (enum-rename map correct).
2. Draai `scripts/migrate-plan-tier-mapping.ts` op een kopie/lokaal: bestaande `PRO`-rows → `STARTER`; elke Organization heeft nu een `CreditBalance` (balance 0). Query `SELECT tier, count(*)` bevestigt de mapping; geen orphaned subscriptions.
3. Import-check: `import { CREDIT_COSTS, ZERO_COST_ACTIONS, tokensToCredits } from '@/lib/billing/credits/credit-costs'` compileert; `CREDIT_COSTS['long-form'] === 80`, `ZERO_COST_ACTIONS.has('f-val') === true`, `tokensToCredits(...)` geeft een plausibel getal voor een 1.500-token long-form output.
4. `PLAN_CONFIGS.STARTER.monthlyPriceEur === 39`, credit-bundel 400, floor 15 leesbaar via een throwaway node-check of unit-assert.
5. Edge: een Organization zónder subscription behoudt na migratie een geldige `CreditBalance` (balance 0) en een geldige tier (default `FREE`/trial) — geen null-crash.
6. `npx tsc --noEmit` + `npm run lint` groen (per gewijzigd bestand).

# Risico's

- **Enum-migratie raakt bestaande rows** (waarschijnlijkheid: hoog): een naïeve rename van `PRO`→`STARTER` in Postgres kan de kolom droppen als de mapping niet als expliciete `ALTER TYPE ... RENAME VALUE` / `db push`-map wordt uitgevoerd. Mitigatie: enum-waarde `STARTER` toevoegen + backfill-script dat rows update, dan pas `PRO` verwijderen in een tweede push; test eerst lokaal, dan handmatig Neon `db push` (gotcha `neon-schema-push-on-deploy`).
- **Workspace- vs org-scoped tier-ambiguïteit** (medium): `enforcement.ts` leest `workspace.planTier`, credits worden org-gelezen. Mitigatie: in deze fase alleen de credit-laag org-scopen; feature-enforcement blijft workspace-scoped; documenteer de split in Notes zodat Fase 1/6 dezelfde bron gebruiken.
- **Token→credit-conversie-getal is deels schatting** (medium): blended €0,045/credit uit de ADR is een aanname. Mitigatie: conversie-tabel centraliseren in één file zodat de metering-smoke (Fase 1/2) hem kan bijstellen zonder code-spread.
- **Deze omgeving kan tsc/app niet volledig draaien**: verificatie = lint per file + CI-tsc/build + Neon `db push` handmatig. Neem mee in afronding.

# Out of scope

- Ledger-gedrag (`deduct/grant/reserve/reconcile`) — Fase 1.
- Afboeking op generatie-sites — Fase 2.
- Volledige unificatie van alle feature-enforcement naar org-niveau — latere opruiming; hier alleen de credit-laag org-scopen.
- Stripe-price-objecten voor packs/tiers aanmaken in het Stripe-dashboard — Fase 3/5 (deze fase legt alleen de env-var-namen/constants vast).
- Jaarlijkse facturatie — alleen `STRIPE_PRICE_*_YEARLY`-namen voorbereiden.

# Notes

- **Dependency**: Fase 0 is de fundering — **blokkeert Fase 1 t/m 6 volledig**. Niets anders kan starten voordat schema + enum + config staan. Geen parallellisme met andere fasen.
- **Neon-gotcha** (memory `neon-schema-push-on-deploy`): elke schema-change vereist een handmatige Neon `prisma db push` ná de merge, anders 500'en de deployed routes. Neem dit expliciet op in de afronding van deze fase.
- Hergebruik: `plan-limits.ts` heeft al `aiOveragePer1kTokens` per tier — dat concept wordt de basis voor de token→credit-conversie, niet weggegooid. `PLAN_CONFIGS`-structuur blijft; alleen waarden + credit-velden erbij.
- COGS-scheiding: `cost-calculator.ts` (`totalCostUsd`) blijft interne marge-tracking; de credit-registry is de klant-eenheid. Nooit conflateren (risico uit de umbrella).
- Bron van waarheid voor waarden: ADR-deelbeslissingen 3, 4, 5, 8, 9.
