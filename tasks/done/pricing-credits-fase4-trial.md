---
id: pricing-credits-fase4-trial
title: Credit-billing Fase 4 — 28-daagse no-card reverse trial (300 cr, read-only lock dag 28)
fase: launch
priority: now
effort: 1-2 dagen
owner: claude-code
status: done
completed: 2026-07-12
created: 2026-07-07
related-adr: docs/adr/2026-07-07-pricing-credits-launch.md
related-spec: tasks/pricing-credits-billing.md
worktree: branddock-pricing-fase4 (branch feat/pricing-credits-fase4-trial)
---

# Probleem

De ADR (D8) definieert de instap als een **28-daagse no-card reverse trial**: bij aanmelden krijgt een account éénmalig 300 credits, zonder kaart, en op dag 28 (zonder conversie/top-up) gaat de merk-data in **read-only lock** — niet gewist. De ledger (Fase 1) kan `grantCredits('TRIAL_GRANT')`, maar de trial-**lifecycle** bestaat niet: geen trial-start bij signup, geen 300-credit-grant, geen dag-28-lock, geen conversie-overgang. Zonder dit is er geen legale, veilige instap.

# Voorstel

Implementeer de trial-lifecycle op de bestaande org-velden (`Organization.trialEndsAt`, `subscriptionStatus TRIALING`): bij org-creatie een éénmalige `grantCredits(org, 300, 'TRIAL_GRANT')` + `trialEndsAt = now + 28d`. Een dagelijkse cron (of on-read-check) zet accounts voorbij `trialEndsAt` zonder betaald abonnement/top-up op **read-only lock** (merk-data blijft, generatie-acties geblokkeerd met een nette upgrade-402). De lock lift zodra een eerste top-up (Fase 3) of betaald plan geconverteerd is. Geen kaart tot de eerste conversie.

# Acceptatiecriteria

- [x] Trial-start — **bestond al** (Fase-3-werk, #372): `provisionNewUser` in `src/lib/auth.ts` grant 300cr (`idempotencyKey trial:<orgId>`) + zet `trialEndsAt` éénmalig (updateMany met null-guard); `subscriptionStatus` default al `TRIALING` in het schema. Geverifieerd, niet opnieuw gebouwd.
- [x] Geen kaart vereist — bevestigd: de trial draait puur op de credit-grant; nergens een Stripe-customer/PaymentMethod-eis in het startpad.
- [x] `src/lib/billing/credits/trial.ts` (nieuw): `getTrialState(orgId)` → `{ isTrialing, daysRemaining, isLocked, creditsRemaining }` + `isReadOnlyLocked(orgId)`. Bewust **geen** `startTrial` — de start leeft al in auth.ts (geen tweede pad; anti-duplicatie).
- [x] **Read-only lock**: on-read afgeleid (geen stale cron-state) uit `trialEndsAt` + betaal-historie (`lifetimeGranted > TRIAL_CREDITS` óf actieve subscription óf unlimited). Dekking (na review-W1-uitbreiding): de 6 gemeterde generatie-routes via `enforceCreditBalance` (lock-402 vóór saldo-402, `trialExpired: true`-CTA), de 5 post-hoc/chargeAfter-generatie-ingangen (landing-pages generate-page, persona generate-image, studio edit-image, consistent-models generate, agents run+confirm) en de 4 entity-create-routes via `enforceNotLocked`. Lees-routes + merk-data volledig intact — geen delete-pad geraakt. **Bewust restpunt**: PATCH/DELETE-bewerkingen van bestaande entiteiten blijven open (geen centrale mutation-chokepoint; copy zegt daarom "genereren en nieuwe items aanmaken", niet "bewerken") — bij een centrale route-wrapper later alsnog afdichten.
- [x] Lock-enforcement centraal: één edit in `enforceCreditBalance` dekt alle 6 generatie-routes; `enforceNotLocked(workspaceId)` + `trialLockedResponse()` (errors.ts) spiegelen het bestaande 402-patroon.
- [x] Lock-lift impliciet: élke top-up/plan-grant verhoogt `lifetimeGranted` boven de trial-bundel (ledger = audit-trail) en een actieve subscription telt ook — geen aparte unlock-write nodig (smoke-case B/E).
- [x] Meldingen: T-3/T-0 via `trial-notify.ts`, ingehaakt in de bestáánde dagelijkse `/api/cron/expire-trials` (geen nieuw job-type). In-app (`NotificationType.TRIAL_EXPIRING`, additief enum-lid → Neon db push) + e-mail via Emailit, dedup zonder schema-velden via het createdAt-venster rond `trialEndsAt`. Lock-state zelf is on-read (geen cron-afhankelijkheid).
- [x] `npx tsc --noEmit` 0 errors
- [x] eslint 0 errors op alle geraakte files
- [x] Smoke: nieuw `scripts/dev/credit-trial-lock-smoke.ts` **16/16** (state-matrix A-F, lock-402 wint van saldo-402, entity-guard, T-3/T-0 + dedup); regressie `credit-trial-expiry-smoke` 5/5 + `credit-enforce-smoke` 4/4. UI: lock-banner in CreditBalanceCard + `isLocked` in /api/billing/balance.

# Bestanden die ik aanraak

- `src/lib/billing/credits/trial.ts` (nieuw) — trial-lifecycle (`startTrial`/`getTrialState`/`isReadOnlyLocked`). Risico: medium.
- Org-creatie-pad — de plek waar een Organization/eerste workspace wordt aangemaakt (signup/onboarding); `startTrial` inhaken. (Exacte file te bevestigen bij uitvoering — waarschijnlijk het onboarding/organization-create-pad; zoek de `prisma.organization.create`-call-site.) Risico: medium.
- `src/lib/stripe/enforcement.ts` — `enforceNotLocked` + lock-check in de generatie-guard. Risico: medium.
- `src/lib/agents/jobs/handlers.ts` + `prisma/schema.prisma` (`enum AgentJobType`) — `TRIAL_SWEEP`-handler (indien cron-variant gekozen). Additief → Neon `db push`. Risico: laag.
- `src/lib/stripe/webhook-handlers.ts` / Fase 3-topup-pad — lock-lift bij eerste top-up/conversie inhaken. Risico: laag.

# Bestanden die ik NIET aanraak

- Merk-data-modellen / delete-paden — de lock is **read-only**, nooit wissen; geen destructieve logica.
- Ledger-core — af in Fase 1; hier alleen `grantCredits('TRIAL_GRANT')`.
- Top-up/auto-topup — Fase 3; hier alleen de lock-lift-hook consumeren.
- Betaalmethode/Stripe-checkout voor conversie — Fase 5 (iDEAL/SEPA); de trial vereist géén kaart.

# Smoke test plan

1. **Trial-start**: nieuw account aanmaken → `subscriptionStatus TRIALING`, `trialEndsAt` = +28d, balans = 300 (`CreditTransaction` type `TRIAL_GRANT`); geen kaart gevraagd.
2. **Idempotentie**: her-trigger van `startTrial` (bv. tweede workspace) → géén tweede 300-grant.
3. **Verbruik tijdens trial**: genereer content → credits dalen normaal (Fase 2-afboeking); F-VAL/chat = 0.
4. **Dag-28-lock**: zet `trialEndsAt` in het verleden (test-fixture), geen top-up/plan → `isReadOnlyLocked = true`; een generatie-poging → nette 402/423 met upgrade-CTA; merk-assets/persona's/campagnes nog volledig **leesbaar** en niet gewist.
5. **Lock-lift**: doe een eerste top-up (Fase 3) → lock weg, generatie weer toegestaan; `subscriptionStatus` niet meer `TRIALING`.
6. **Melding**: T-3 en T-0 verval-melding verstuurd (indien sweep-variant).
7. `npx tsc --noEmit` + `npm run lint` groen.

# Risico's

- **Dubbele trial-grant** (waarschijnlijkheid: medium, impact medium): meerdere org-creatie-triggers of retries → gratis credits. Mitigatie: `startTrial` idempotent (check op bestaande `TRIAL_GRANT`-transactie of een `trialStartedAt`-vlag op de org).
- **Lock lekt naar lees-routes / wist data** (medium): een te brede lock breekt de app of vernietigt merk-DNA. Mitigatie: lock **alleen** op muterende/generatieve routes via de centrale guard; expliciet géén delete; smoke bevestigt dat lees + data intact zijn.
- **Stale trial-state** (laag): een cron die niet draait laat een verlopen trial "open". Mitigatie: voorkeur voor on-read-evaluatie (`getTrialState` rekent `daysRemaining` live uit `trialEndsAt`) i.p.v. een status-veld dat door een cron gezet moet worden.
- **Org- vs workspace-scope** (laag): trial is per account/org (pooled credits). Mitigatie: alle trial-state op `Organization`, consistent met Fase 0.
- **Deze omgeving kan tsc/app niet volledig draaien**: verificatie = lint per file + CI-tsc/build + deploy-smoke (trial-lock lokaal wél testbaar via fixture-datum).

# Out of scope

- Betaalde-conversie-checkout (kaart/iDEAL) — Fase 5.
- Top-up-flow — Fase 3.
- Reactivatie-/win-back-campagnes na lock — post-launch.
- Trial-verlenging/coupons — niet in scope (ADR: éénmalig 300, geen reset).

# Notes

- **Dependencies**: hangt aan **Fase 0 + Fase 1** (org-velden + `grantCredits`). Hangt **licht aan Fase 3** voor de lock-lift bij eerste top-up (de hook kan als no-op landen tot Fase 3 er is). Kan **parallel** met Fase 2/5 gebouwd worden (raakt andere bestanden). Sequentieel na Fase 1.
- **Anti-Abstraction**: hergebruik de bestaande `Organization.trialEndsAt` + `subscriptionStatus TRIALING` (bestaan al in schema) — geen nieuw trial-model. `grantCredits('TRIAL_GRANT')` bestaat uit Fase 1.
- **Integration-First**: `getTrialState(orgId)` is het contract dat Fase 6 (trial-countdown-UI) consumeert; leg de shape hier vast.
- **Verificatie-noot**: de dag-28-lock is lokaal deterministisch testbaar door `trialEndsAt` op een fixture-datum te zetten; geen Stripe nodig voor deze fase.
- Te bevestigen bij uitvoering: exacte org-creatie-call-site (grep `prisma.organization.create` / het onboarding-pad) waar `startTrial` inhaakt.
