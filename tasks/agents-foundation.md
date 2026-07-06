---
id: agents-foundation
title: Agents foundation — pluggable output-contract op runAgentLoop + AgentRun/AgentArtifact-schema + code-registry + run-API
fase: pre-launch
priority: now
effort: 4-6 dagen
owner: claude-code
status: open
created: 2026-07-05
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md
related-spec: tasks/_drafts/idea-agents-feature.md
worktree: branddock-feat-agents-feature
---

# Probleem

De Brandclaw agent-loop (`runAgentLoop`) is een generieke Anthropic tool-use motor, maar zijn outputlaag is hard-wired: `extractObservations()` verwacht een `observations`-JSON-array en `persistRun()` schrijft uitsluitend naar `StrategyObservationRun`/`StrategyObservation`. Agent-uitkomsten zijn daardoor versnipperd over domein-modellen en er bestaat geen agent-als-object, geen run-status en geen artefact-model. Dit is aanname A1 uit het idea-doc — de zwaarste onbewezen aanname — en moet eerst landen vóór er ook maar één agent gewired wordt.

# Voorstel

Generaliseer de loop naar een per-agent **output-contract** (schema + parser + persistence-adapter) waarbij het bestaande observations-pad de eerste, ongewijzigde adapter wordt (ADR D2 — Strategy Analyst mag byte-voor-byte niets merken). Voeg `AgentRun` + `AgentArtifact` toe aan het schema (ADR D3), zet de code-registry-skelet neer (`AgentDefinition`-type + registry-map, ADR D4), registreer 6 nieuwe `AiFeatureKey`s, en definieer het API-contract (`POST /api/agents/run` + runs-list/detail + artifact accept/dismiss) mét cost-instrumentatie en PostHog-events vanaf dag 1. Dit is de A1-verificatie-spike + fundament in één taak; agent-definities zelf volgen in `agents-motor-wiring`.

# Acceptatiecriteria

- [ ] **A1-spike bewezen**: `runAgentLoop` accepteert een optioneel `outputContract` (parser + persistence-adapter); zonder contract valt hij terug op het bestaande observations-pad. Een Strategy-Analyst-run vóór en ná de refactor levert identieke `StrategyObservationRun`+`StrategyObservation`-rijen (zelfde velden, zelfde counts) — regressie-bewijs vastgelegd in Notes.
- [ ] Schema (additief, `db push`): `AgentRun` (id, workspaceId, agentId string, status-enum `QUEUED|RUNNING|AWAITING_CONFIRMATION|COMPLETED|FAILED`, input Json, triggerType/triggerSource, userId, toolCallTrace Json, totalCostUsd Decimal, input/outputTokens, latencyMs, truncated, error, createdAt/completedAt) + `AgentArtifact` (runId FK cascade, workspaceId, type-enum `REPORT|TABLE|FINDINGS|LINK|PROPOSAL`, title, content Json, fidelityScore Float?, acceptedAt/dismissedAt) + Workspace-relaties. Geen wijziging aan bestaande modellen.
- [ ] Registry-skelet: `AgentDefinition`-interface (id, persona {naam, rol, Lucide-icon}, systemPrompt, toolNamespace, useCases[], `AiFeatureKey`, outputContract, timeoutMs/maxToolCalls-overrides) + `getAgentDefinition(id)`/`listAgents()`; registry-map compileert leeg-of-met-stub zonder dat iets anders breekt.
- [ ] 6 nieuwe `AiFeatureKey`s (`agent-research-analyst`, `agent-brand-guardian`, `agent-strategist`, `agent-content-creator`, `agent-market-analyst`, `agent-data-analyst`) + definitions; run-entry resolvet het model via `resolveFeatureModel` en geeft het als `model`-param aan de loop mee (vervangt de hardcoded Sonnet-default voor agent-runs, ADR D1) + `assertProvider('anthropic')`.
- [ ] API-contract live: `POST /api/agents/run` `{agentId, useCaseId?, input}` → synchroon run-resultaat `{runId, status, artifactIds[]}` (patroon `strategy-analyst/run/route.ts`: `resolveWorkspaceId` + `getServerSession` + `withAiRateLimit`; `export const maxDuration = 800`); `GET /api/agents/runs` (workspace-scoped list, cached); `GET /api/agents/runs/[runId]`; `PATCH /api/agents/artifacts/[id]` (accept/dismiss). Onbekend `agentId` → 400.
- [ ] Given een run die faalt of de guards raakt (maxToolCalls/wallclock), When de run eindigt, Then staat `AgentRun.status = FAILED` (of `COMPLETED` + `truncated`) met een begrijpelijke `error`-string en zijn er geen halve artefacten gepersisteerd (artefact-writes atomair in de finalize-transactie, patroon `persistRun`).
- [ ] Given elke voltooide run, Then zijn kosten (tokens/USD via `computeRunCost`) op de run-rij vastgelegd en zijn PostHog-events `agent_run_started`/`agent_run_completed` geëmit (fire-and-forget, patroon `emitBrandclawRunCompleted`); `agent_output_accepted` vuurt bij artifact-accept.
- [ ] Elke mutatie-route roept `invalidateCache(cacheKeys.prefixes.agents(workspaceId))` aan (nieuw prefix in `cache-keys.ts`).
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `src/lib/brandclaw/orchestrator/agent-loop.ts` — `outputContract?`-param; `extractObservations` verhuist naar de observations-adapter; finalize roept adapter-parser + adapter-persistence aan (~60-100 regels gewijzigd, risico: hoog — enige bestaande caller is Strategy Analyst)
- `src/lib/brandclaw/orchestrator/persistence.ts` — bestaand pad wordt `observations-adapter`; nieuwe `agent-run-persistence` (createRunRow/finalize op `AgentRun`+`AgentArtifact`, transactioneel) (risico: medium)
- `src/lib/brandclaw/orchestrator/types.ts` — output-contract-types; registry-namespace verruimen van `NodeType` naar `NodeType | AgentId` zodat `getToolsForNode` per agent kan scopen (risico: laag)
- `src/lib/brandclaw/orchestrator/tool-registry.ts` — namespace-type meebewegen (regels: ~5, risico: laag)
- `prisma/schema.prisma` — `AgentRun`, `AgentArtifact`, 2 enums, Workspace-relaties (nieuw, risico: laag; rollout-note!)
- `src/lib/agents/registry/types.ts` + `src/lib/agents/registry/index.ts` (nieuw — bewust naast bestaand `src/lib/agents/jobs/`)
- `src/lib/ai/feature-models.ts` — 6 keys + definitions (+ evt. category `'agents'` voor de Settings-groepering; als de category-union uitbreiden >3 UI-plekken raakt: hergebruik `'chat-analysis'` en noteer)
- `src/app/api/agents/run/route.ts`, `src/app/api/agents/runs/route.ts`, `src/app/api/agents/runs/[runId]/route.ts`, `src/app/api/agents/artifacts/[id]/route.ts` (nieuw; workspace-filter verplicht op élke query — multi-tenant)
- `src/lib/api/cache-keys.ts` — `agents`-prefix

# Bestanden die ik NIET aanraak

- `src/lib/brandclaw/nodes/strategy-analyst/**` — alleen als regressie-referentie draaien, niet wijzigen; migratie naar de catalogus is Fase 3.
- `src/lib/claw/**` — de Claw-tool-bridge is `agents-motor-wiring`.
- `src/lib/agents/jobs/**` — de `AGENT_TASK`-stub blijft een stub (Fase 2, `agents-scheduling`).
- `src/App.tsx`, `SIDEBAR_NAV`, `src/features/agents/` — UI is `agents-ui-inbox`.

# Smoke test plan

1. Baseline: POST `/api/brandclaw/strategy-analyst/run` op een dev-workspace → noteer runId, observations-count, kolomwaarden.
2. Refactor uitvoeren → zelfde POST opnieuw → observations-count + velden structureel identiek; `tsc` 0 errors.
3. Registreer een tijdelijke test-agent (echo-agent zonder tools, report-contract) → POST `/api/agents/run` → `AgentRun` COMPLETED + 1 `REPORT`-artefact + kosten>0 + beide PostHog-events zichtbaar in de log.
4. Forceer guard-fail (maxToolCalls=0 op een agent met verplichte tool of timeoutMs=1) → run FAILED/truncated, begrijpelijke error, 0 halve artefacten.
5. POST run met onbekend `agentId` → 400. GET runs vanuit workspace B toont géén runs van workspace A (isolatie-check). `x-cache: HIT` op tweede GET; PATCH accept → invalidatie → verse GET.

# Risico's

- **Strategy-Analyst-regressie** (waarschijnlijkheid: middel): de adapter-refactor raakt het enige productie-pad van de loop. Mitigatie: observations-pad wordt de default-adapter met exact dezelfde code; baseline-vergelijking in de smoke is verplicht vóór verder bouwen.
- **Vercel-runtime-limiet** (middel): synchrone runs tot 800s vereisen `maxDuration` (Fluid, Pro-plan — precedent: `compose-video/route.ts` 300s). Client-disconnect mag de DB-status niet corrupt achterlaten → status-writes in de finalize, `FAILED` bij throw.
- **Schema op Neon vergeten** (hoog zonder discipline): prod gaat via handmatige `prisma db push` (gotcha `neon-schema-push-on-deploy`) — zonder push 500't elke agents-route na deploy. Zie Notes.
- Registry-namespace-verruiming (`NodeType | AgentId`) kan type-errors in bestaande brandclaw-tools triggeren → eerst `tsc` op alleen de type-wijziging.

# Out of scope

- Agent-definities met echte motoren/tools → `agents-motor-wiring`.
- UI (catalogus, inbox, detail) → `agents-ui-inbox`.
- Data Analyst query-tools → `agents-data-analyst`.
- Streaming/SSE-voortgang per run — v1 is synchroon + DB-status-polling; SSE pas als de UI-taak het aantoonbaar nodig heeft.
- Scheduling, notificaties, AgentMemory → `agents-scheduling` (Fase 2).

# Notes

- **Phase -1 gates**: Simplicity — 1 nieuwe lib-dir (`src/lib/agents/registry/`) + 1 nieuwe api-dir; hergebruik van loop, guards, cost-calculator, rate-limit-middleware. Anti-Abstraction — het output-contract is de énige nieuwe abstractie en is ADR-beslist (D2) met 6 directe afnemers; géén DB-registry, géén tweede loop, géén wrapper om de Anthropic SDK. Integration-First — de API-shapes en het `AgentDefinition`-interface staan hierboven als contract vóór implementatie; `agents-ui-inbox` en `agents-motor-wiring` pinnen erop.
- **Rollout**: na merge handmatig `prisma db push` naar Neon (gotcha `neon-schema-push-on-deploy`) vóórdat de deploy verkeer krijgt.
- Naam-collision bewust: `AgentJob`/`AgentMemory` bestaan al (job-queue, ADR 2026-05-12); `AgentRun`/`AgentArtifact` zijn de door ADR D3 vastgelegde namen.
- Week-1-voorrangsregel uit het idea-doc is afgehecht: `vercel-deployment` is live per 2026-07-05 (branddock-7y9n.vercel.app). De counter-metric vervalt daarmee niet met terugwerkende kracht — bij nieuw Track-C-werk blijft dat voorrang houden.
