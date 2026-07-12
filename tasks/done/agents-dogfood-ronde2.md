---
id: agents-dogfood-ronde2
title: Agents dogfood-ronde 2 — hygiëne-fixes valideren + credit-metering op agent-runs meten
fase: pre-launch
priority: now
effort: 0,5 dag
owner: claude-code (autonoom, user-directive "pak item 1 volledig zelfstandig op")
status: done
created: 2026-07-12
completed: 2026-07-12
related-adr: 2026-07-05-agents-architectuur.md, 2026-07-07-pricing-credits-launch.md
related-spec: docs/reports/agents-dogfood-2026-07-07.md (ronde 1)
worktree: branddock-agents-dogfood-ronde2 (branch fix/agents-dogfood-ronde2; meting draaide in de main-worktree, commit via eigen worktree wegens levende co-sessie)
---

# Probleem

Dogfood-ronde 1 (2026-07-07) vulde beide Fase-2/3-guardrails met echte data, maar liet drie staarten open: (1) de 3 hygiëne-fixes (strategist maxTokens 32k, angle-generator budget, concept-banner) zijn nooit door een herhaalmeting gevalideerd; (2) sinds 2026-07-10 staan **credits LIVE in pilotmodus** op productie — de credit-metering op agent-runs (run-level gate + confirm-time charge van 3 credits) is nog nooit in de praktijk geverifieerd; (3) het headless confirm-harnas (`agents-confirm-path.ts`) claimt de confirm-route te spiegelen maar **mist de confirm-time `chargeAfter`** die de route sinds Fase 3 heeft (route-drift).

# Scope

1. Harnas-patches (route-fidelity, herbruikbaarheid):
   - `scripts/dev/agents-dogfood.ts`: `RUN_DATE` parametriseerbaar (env `DOGFOOD_RUN_DATE`, default vandaag).
   - `scripts/dev/agents-confirm-path.ts`: confirm-time `chargeAfter` toevoegen, exact zoals `confirm/route.ts` (billable-gate, flat `agent-deliverable`, idempotencyKey `agent-confirm:<runId>:<deliverableId>`).
2. Meting (lokaal, Better Brands `cmnomsobx009q44msn0gpw7vb`, met `NEXT_PUBLIC_CREDITS_ENABLED=true` per invocatie):
   - Demo-org `unlimitedCredits` tijdelijk `false` (anders short-circuit alle charge-paden); **na afloop terugzetten op `true`**.
   - Sweep 6 agents → kosten/latency/tokens/truncatie/F-VAL; assert: 0 credit-transacties (5 gratis agents + Milo-proposal boekt niet).
   - Confirm-pad → Milo-eindcontent F-VAL + precies één ledger-rij van 3 credits (`agent-deliverable`).
   - Ledger before/after via `credit_transaction`/`credit_balance`.
3. Rapport `docs/reports/agents-dogfood-2026-07-12.md` met ronde-1-vergelijking + guardrail-verdicts + go/no-go-implicaties Fase 2.
4. Doc-sync: START_HERE item 1 actualiseren, memory `agents-initiative` bijwerken.

# Acceptatiecriteria

- [x] Sweep gedraaid, JSONL + rapport gegenereerd — **5/6 geslaagd**: strategist FAILED, wat de hoofdvondst bleek (fatale regressie uit de ronde-1-fix; zie hieronder). Na fix: gerichte re-run COMPLETED → effectief 6/6.
- [x] Truncatie-check: `truncated=false` op de gevalideerde strategist-re-run
- [x] Credit-assert sweep: 0 nieuwe `credit_transaction`-rijen
- [x] Credit-assert confirm: exact 1 rij, −3 DEDUCT, action `agent-deliverable`, saldo 10→7, idempotencyKey `agent-confirm:<runId>:<deliverableId>`
- [x] `unlimitedCredits` demo-org na afloop hersteld op `true`
- [x] Rapport geschreven met ronde-1-delta's + meetcondities (`docs/reports/agents-dogfood-2026-07-12.md`)
- [x] `npx tsc --noEmit` 0 errors na alle patches

# Scope-uitbreiding tijdens uitvoering (bugfix, root-cause getraceerd)

De sweep legde een **fatale productie-regressie** bloot: strategist `maxTokens: 32_000` (ronde-1-fix) > het Anthropic-SDK non-streaming-plafond van 21.333 → elke Stella-run instant FAILED sinds 2026-07-07, ook op productie. Fix doorgevoerd + gevalideerd met echte run:
- `src/lib/brandclaw/orchestrator/agent-loop.ts` — `NONSTREAMING_MAX_TOKENS = 21_333` + clamp in `runLoopCore` (warn bij clamp)
- `src/lib/agents/registry/definitions/strategist.ts` — 32.000 → 21.333 + plafond-uitleg
- Gotcha-entry 2026-07-12 in `gotchas.md`

# Smoke-test

Ledger-query na confirm-pad toont de 3-credit-afboeking met idempotencyKey `agent-confirm:...`; herdraai van het confirm-pad boekt géén tweede rij (idempotent).

# Out-of-scope

- Productie-herhaling met EXA/S2-keys (keys niet lokaal beschikbaar; blijft open aanbeveling — user-held creds)
- De inline-preview-F-VAL-poort (ronde-1-finding #1, aparte taak)
- Fase 2 `agents-scheduling` bouwen (blijft gated op pilot-adoptiedata)
