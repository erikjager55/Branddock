---
id: agents-scheduling
title: Agents Fase 2 — AGENT_TASK-brug (job-queue → registry → runAgentLoop), scheduled runs + notificaties + per-agent AgentMemory
fase: launch
priority: next
effort: 2-3 weken
owner: claude-code
status: open
created: 2026-07-05
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md
related-spec: tasks/_drafts/idea-agents-feature.md
worktree: -
---

> **Gate**: starten pas wanneer alle vier Fase-1-tasks (`agents-foundation`, `agents-motor-wiring`, `agents-ui-inbox`, `agents-data-analyst` óf diens expliciete drop-besluit) op `done` staan. De oorspronkelijke harde dependency — Vercel Cron in productie — is **vervuld per 2026-07-05** (`vercel-deployment` live op branddock-7y9n.vercel.app, main=production, Vercel Pro + Fluid); de enige resterende volgorde-dep is Fase 1 zelf.

# Probleem

Fase 1 levert on-demand runs; de autonomie-trap (ADR D7: on-demand → scheduled → proactief-met-approval) stopt daar. De `AGENT_TASK`-handler in de job-queue is een bewuste stub (`src/lib/agents/jobs/handlers.ts:43` — logt payload en resolvet), er is geen manier om "elke maandag een concurrentie-scan" in te plannen, geen notificatie bij voltooide runs (lange runs vereisen nu een open tab), en agents onthouden niets tussen runs (`AgentMemory` + pgvector bestaat maar wordt door geen agent gebruikt).

# Voorstel

Vier slices, in volgorde: (1) **AGENT_TASK-brug** — handler-payload `{agentId, taskInput, workspaceId, triggerSource}` → registry-lookup → `runAgentLoop` met `triggerType: 'scheduled'`; hergebruik van dispatch/retry/idempotency uit `src/lib/agents/jobs/`. (2) **Schedules** — minimaal `AgentSchedule`-model (workspaceId, agentId, useCaseId, input Json, cadence, nextRunAt, enabled); de bestaande cron-tick (`src/app/api/cron/run-jobs/`) enqueue't due schedules als `AGENT_TASK`-jobs; schedule-beheer-UI op agent-detail + inbox-filter "scheduled". (3) **Run-notificaties** — bij COMPLETED/FAILED/AWAITING_CONFIRMATION een rij in het bestaande `Notification`-model (+ e-mail via bestaande digest/Emailit-infra als dunne uitbreiding). (4) **Per-agent geheugen** — read/write-memory-tools op `AgentMemory` (memoryType per agent gescoped), alleen voor feiten die de user via confirm accepteerde of expliciete voorkeuren. Proactieve voorstellen (agent stelt zelf werk voor, Relevance-L2) alleen als de eerste drie slices binnen budget landen — anders door naar Fase 3.

# Acceptatiecriteria

- [ ] Given een geplande schedule ("maandag 08:00, Market Analyst, concurrentie-scan"), When de cron-tick de due-tijd passeert, Then draait de run zonder open client, landt het artefact in de inbox en verspringt `nextRunAt`.
- [ ] `AGENT_TASK`-jobs erven retry/backoff/idempotency van de bestaande queue; een dubbel-enqueued job produceert geen dubbele run (idempotency-key op schedule+due-slot).
- [ ] Scheduled runs respecteren dezelfde guards + confirm-regels: een write-actie uit een scheduled run wacht als `AWAITING_CONFIRMATION` in de inbox — **geen autonome mutaties** (no-autonomy-regel ADR 2026-05-08 blijft gelden).
- [ ] Notificatie (in-app; e-mail indien preference aan) bij run-afronding; klik navigeert naar het artefact; `NotificationPreference` gerespecteerd.
- [ ] Agent-memory: een tweede run van dezelfde agent kan een in run 1 bevestigd feit citeren; memory is workspace- én agent-gescoped; user kan memory-items inzien en verwijderen (minimale lijst-UI).
- [ ] Schedule-mutatie-routes: workspace-filter + `invalidateCache(cacheKeys.prefixes.agents(workspaceId))`.
- [ ] Kosten-bewaking: scheduled runs loggen dezelfde cost/PostHog-events; een workspace-week-overzicht van agent-kosten is queryable (input voor het Fase-3-budget en het pricing-besluit bij `stripe-billing-live`).
- [ ] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors · Smoke-test uitgevoerd · Documentatie bijgewerkt

# Bestanden die ik aanraak

- `src/lib/agents/jobs/handlers.ts` — AGENT_TASK-stub invullen (de stub-comment verwijst er al naar)
- `src/lib/agents/jobs/dispatch.ts` / `types.ts` — payload-type voor agent-tasks
- `prisma/schema.prisma` — `AgentSchedule` (+ evt. `AgentRun.scheduleId` nullable) — **rollout: handmatige `prisma db push` naar Neon (gotcha `neon-schema-push-on-deploy`)**
- `src/app/api/cron/run-jobs/` — due-schedule-enqueue-stap (of aparte cron-route, beslissen bij bouw)
- `src/app/api/agents/schedules/` (nieuw — CRUD)
- `src/features/agents/` — schedule-UI op `AgentDetailPage`, inbox-filter, memory-lijstje
- `src/lib/agents/registry/` — memory-tools + `triggerType`-doorvoer
- Notification-aanmaak in de run-finalize (`agent-run-persistence` uit foundation)

# Bestanden die ik NIET aanraak

- `src/lib/brandclaw/orchestrator/agent-loop.ts` — de loop is af; scheduling zit erómheen. Loop-wijziging nodig = stop-and-ask.
- Autonomie-schuif, per-workspace budget-alerts, Brandclaw-NodeTypes → `agents-brandclaw-convergentie` (Fase 3).

# Smoke test plan

1. Schedule aanmaken (cadence "elke minuut" in dev) → binnen 2 cron-ticks een voltooide run + artefact + notificatie; `nextRunAt` opgeschoven.
2. Schedule disabled → geen nieuwe jobs. Schedule verwijderen → geen orphan-jobs.
3. Scheduled Content Creator-run → eindigt `AWAITING_CONFIRMATION` (geen autonome deliverable); confirm vanuit de notificatie-klik werkt.
4. Job-fail (API-key weg) → retry/backoff zichtbaar, daarna FAILED + fout-notificatie; geen halve artefacten.
5. Memory: run 1 bevestigt een voorkeur → run 2 gebruikt hem; memory-item verwijderen → run 3 kent hem niet meer.
6. Productie-verificatie op Vercel: één echte scheduled run end-to-end (cron → job → run → notificatie) op de live-omgeving.

# Risico's

- **Cron-runtime-budget**: agent-runs van minuten in een cron-invocation → job-runner draait de run binnen de bestaande run-jobs-route met verhoogde `maxDuration`; bij structurele overschrijding: per-job invocation (deferred fan-out) — beslissen op echte metingen, niet vooraf bouwen.
- **Kosten-stapeling door schedules** (Deloitte-faalmodus): een dagelijkse deep-research-schedule is duur → per-schedule cadence-limieten (min. daily voor zware agents) + het week-kosten-overzicht als vroegsignaal; harde budget-caps zijn bewust Fase 3.
- Notificatie-spam bij fail-loops → retry-cap bestaat al in de queue; één fout-notificatie per job, niet per attempt.

# Out of scope

- Autonomie-schuif per agent (assisted → autopilot) — Fase 3.
- Per-workspace cost-budget-alerts — Fase 3 (instrumentatie ligt er al).
- Proactieve voorstellen als aparte engine — alleen de dunne L2-variant als slices 1-3 binnen budget landen.
- Externe kanalen-publicatie vanuit scheduled runs — Channel Activation blijft LATER.

# Notes

- **Streaming-refactor agent-loop meenemen in het Fase-2-ontwerp** (dogfood-r2, 2026-07-12): `runLoopCore` is non-streaming en zit daardoor hard op het Anthropic-SDK-plafond van **21.333 maxTokens per turn** (nu geborgd via de `NONSTREAMING_MAX_TOKENS`-clamp, gotcha 2026-07-12). Background-execution (deze task) is hét natuurlijke moment voor de streaming-refactor: scheduled runs hebben geen synchrone response nodig, lange runs (research 10+ min) worden dan eersteklas, en het plafond vervalt. Niet eerder los bouwen — de clamp beschermt de huidige agents afdoende en de refactor raakt de orchestrator-kern (regressierisico zonder Fase-2-testbed). Zwaarste sub-stappen (strategy-chain) streamen zelf al via `createClaudeStructuredCompletion`.
- **Phase -1 gates**: Simplicity — geen nieuwe queue, geen nieuwe cron-infra: alles op `src/lib/agents/jobs/` + bestaande Vercel Cron (ADR 2026-05-12); 1 nieuw model. Anti-Abstraction — geen generiek "workflow-systeem": schedule = rij die een job enqueue't. Integration-First — de `AGENT_TASK`-payload-shape is het contract tussen schedule, queue en registry; eerst vastleggen, dan UI.
- Dependencies: Fase 1 done (zie gate). Herbevestig vóór start dat het autonomie-niveau (scheduled = trap 2) nog past bij de pilot-observaties uit Fase 1 (aanname A6/A7-data).
- Eigen discovery-check (idea-doc): Fase 2 kreeg technical planning maar het idea-doc reserveerde een eigen go-moment — bij start eerst 30 min toetsen of pilot-gebruik scheduling überhaupt vraagt, anders eerst notificaties-only shippen.

## Reconciliatie 2026-07-06 — strategy-analyst-stub Phase C geabsorbeerd

> User-directive 2026-07-06: open Brandclaw-werk integreren i.p.v. dubbel bouwen. Volledige mapping: `tasks/done/strategy-analyst-stub.md` (reconciliatie-blok).

- **Scope-toevoeging: per-workspace concurrency-cap** (uit Phase C, was daar cap=1 voor alleen de Analyst): de job-runner handhaaft een cap van 1 gelijktijdige agent-run per workspace voor ALLE scheduled runs — generiek in de `AGENT_TASK`-brug, niet per agent.
- **Weekly Analyst-runs** (Phase C's Vercel Cron `0 9 * * 1`) worden hier NIET gebouwd: zodra Fase-3-item-1 de Strategy Analyst naar de catalogus verhuist, is dat een gewone `AgentSchedule`-rij op deze infra. Geen bespoke cron-route toevoegen.
- **BB pilot smoke met productie-data** (uit Phase C): koppelen aan `pilot-onboarding-better-brands` + de eerste echte scheduled run op de live-omgeving (bestaat al als smoke-stap 6 in deze taak — die run vervult meteen de Phase-C-smoke).
