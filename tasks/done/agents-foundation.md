---
id: agents-foundation
title: Agents foundation — pluggable output-contract op runAgentLoop + AgentRun/AgentArtifact-schema + code-registry + run-API
fase: pre-launch
priority: now
effort: 4-6 dagen
owner: claude-code
status: done
created: 2026-07-05
completed: 2026-07-06
related-adr: docs/adr/2026-07-05-agents-architectuur.md
related-spec: tasks/_drafts/idea-agents-feature.md
worktree: branddock-feat-agents-feature
---

# Probleem

De Brandclaw agent-loop (`runAgentLoop`) is een generieke Anthropic tool-use motor, maar zijn outputlaag is hard-wired: `extractObservations()` verwacht een `observations`-JSON-array en `persistRun()` schrijft uitsluitend naar `StrategyObservationRun`/`StrategyObservation`. Agent-uitkomsten zijn daardoor versnipperd over domein-modellen en er bestaat geen agent-als-object, geen run-status en geen artefact-model. Dit is aanname A1 uit het idea-doc — de zwaarste onbewezen aanname — en moet eerst landen vóór er ook maar één agent gewired wordt.

# Voorstel

Generaliseer de loop naar een per-agent **output-contract** (schema + parser + persistence-adapter) waarbij het bestaande observations-pad de eerste, ongewijzigde adapter wordt (ADR D2 — Strategy Analyst mag byte-voor-byte niets merken). Voeg `AgentRun` + `AgentArtifact` toe aan het schema (ADR D3), zet de code-registry-skelet neer (`AgentDefinition`-type + registry-map, ADR D4), registreer 6 nieuwe `AiFeatureKey`s, en definieer het API-contract (`POST /api/agents/run` + runs-list/detail + artifact accept/dismiss) mét cost-instrumentatie en PostHog-events vanaf dag 1. Dit is de A1-verificatie-spike + fundament in één taak; agent-definities zelf volgen in `agents-motor-wiring`.

# Acceptatiecriteria

- [x] **A1-spike bewezen**: `runAgentLoop` accepteert een optioneel `outputContract` (parser + persistence-adapter); zonder contract valt hij terug op het bestaande observations-pad. Een Strategy-Analyst-run vóór en ná de refactor levert identieke `StrategyObservationRun`+`StrategyObservation`-rijen (zelfde velden, zelfde counts) — regressie-bewijs vastgelegd in Notes.
- [x] Schema (additief, `db push`): `AgentRun` (id, workspaceId, agentId string, status-enum `QUEUED|RUNNING|AWAITING_CONFIRMATION|COMPLETED|FAILED`, input Json, triggerType/triggerSource, userId, toolCallTrace Json, totalCostUsd Decimal, input/outputTokens, latencyMs, truncated, error, createdAt/completedAt) + `AgentArtifact` (runId FK cascade, workspaceId, type-enum `REPORT|TABLE|FINDINGS|LINK|PROPOSAL`, title, content Json, fidelityScore Float?, acceptedAt/dismissedAt) + Workspace-relaties. Geen wijziging aan bestaande modellen.
- [x] Registry-skelet: `AgentDefinition`-interface (id, persona {naam, rol, Lucide-icon}, systemPrompt, toolNamespace, useCases[], `AiFeatureKey`, outputContract, timeoutMs/maxToolCalls-overrides) + `getAgentDefinition(id)`/`listAgents()`; registry-map compileert leeg-of-met-stub zonder dat iets anders breekt.
- [x] 6 nieuwe `AiFeatureKey`s (`agent-research-analyst`, `agent-brand-guardian`, `agent-strategist`, `agent-content-creator`, `agent-market-analyst`, `agent-data-analyst`) + definitions; run-entry resolvet het model via `resolveFeatureModel` en geeft het als `model`-param aan de loop mee (vervangt de hardcoded Sonnet-default voor agent-runs, ADR D1) + `assertProvider('anthropic')`.
- [x] API-contract live: `POST /api/agents/run` `{agentId, useCaseId?, input}` → synchroon run-resultaat `{runId, status, artifactIds[]}` (patroon `strategy-analyst/run/route.ts`: `resolveWorkspaceId` + `getServerSession` + `withAiRateLimit`; `export const maxDuration = 800`); `GET /api/agents/runs` (workspace-scoped list, cached); `GET /api/agents/runs/[runId]`; `PATCH /api/agents/artifacts/[id]` (accept/dismiss). Onbekend `agentId` → 400.
- [x] Given een run die faalt of de guards raakt (maxToolCalls/wallclock), When de run eindigt, Then staat `AgentRun.status = FAILED` (of `COMPLETED` + `truncated`) met een begrijpelijke `error`-string en zijn er geen halve artefacten gepersisteerd (artefact-writes atomair in de finalize-transactie, patroon `persistRun`).
- [x] Given elke voltooide run, Then zijn kosten (tokens/USD via `computeRunCost`) op de run-rij vastgelegd en zijn PostHog-events `agent_run_started`/`agent_run_completed` geëmit (fire-and-forget, patroon `emitBrandclawRunCompleted`); `agent_output_accepted` vuurt bij artifact-accept.
- [x] Elke mutatie-route roept `invalidateCache(cacheKeys.prefixes.agents(workspaceId))` aan (nieuw prefix in `cache-keys.ts`).
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Smoke-test uitgevoerd
- [x] Documentatie bijgewerkt indien van toepassing

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

---

# Status 2026-07-06 — GEBOUWD (branch `feat/agents-foundation`, worktree `branddock-feat-agents-feature`)

## Regressiebewijs A1 (acceptatiecriterium 1)

| | Baseline (pre-refactor) | Post-refactor |
|---|---|---|
| Smoke `strategy-analyst-phase-a.ts` | 17/17 pass | 17/17 pass |
| RunId | `7cb56c12-d266-4ca3-828f-fc4a58ee3d6a` | `0e94e26d-29db-4fd0-82a1-8cec83389a5f` |
| Workspace | Branddock Demo | Branddock Demo |
| observations / tool-calls | 0 / 4 | 0 / 4 |
| totalCostUsd / latencyMs | 0.056328 / 28274 | 0.058428 / 29038 |
| promptVersion / agentVersion | `sha256:b324b5321e70` / `strategy-analyst@0.2.0` | identiek |
| trace_len / trace-keys compleet | 4 / ✅ (alle 9 keys) | 4 / ✅ |

Implementatie-vorm: `runLoopCore`-extractie (turn-loop verbatim) + `runAgentLoop`-**overloads** (zonder contract = byte-compatibel observations-pad via `observations-adapter.ts`; mét contract → `runAgentWithContract`, géén placeholder-write — de run-entry bezit de `AgentRun`-lifecycle). `src/lib/brandclaw/nodes/strategy-analyst/**` en `src/lib/brandclaw/tools/**` zijn niet aangeraakt.

## Smoke-uitvoering (alle 5 stappen ✅)

1. ✅ Baseline vastgelegd (zie tabel).
2. ✅ Post-refactor structureel identiek; `tsc` 0 errors.
3. ✅ Echo-run via `POST /api/agents/run` (echte Anthropic-call): run `f1e61d25` COMPLETED, 1 REPORT-artefact, $0.001794, 173/85 tokens, 2.0s — alle run-velden gevuld (userId, versies, trace).
4. ✅ Guard-fail via `scripts/smoke-tests/agents-foundation.ts` (nieuw, 14/14): timeout-guard → FAILED, error "truncated by a guard…", 0 artefacten, completedAt gezet. Plus: registry-gating (hidden nooit in listAgents), parser-validatie (invalid type geskipt, fidelityScore geclampt), UnknownAgentError.
5. ✅ HTTP-checks: onbekend agentId → 400; invalid body → 400 (Zod); `X-Cache: HIT` op 2e GET; PATCH accept → invalidatie (verse GET MISS) + **materialisatie**: REPORT → `KnowledgeResource` (source `AGENT`, "Echo report" zichtbaar in Knowledge Library), 2e accept idempotent (zelfde resource-id, count blijft 1); workspace-isolatie: user B ziet 0 runs, detail-route 404 cross-workspace (200 eigen).

## Afwijkingen/aanvullingen t.o.v. plan

- **PostHog-events**: `trackEvent` is bewust no-op zonder `POSTHOG_API_KEY` (header `src/lib/analytics/posthog.ts`) — lokaal dus geen log-regels. Verificatie is code-path-niveau (call-sites `agent_run_started`/`agent_run_completed`/`agent_output_accepted`, zelfde fire-and-forget-patroon als `emitBrandclawRunCompleted`); productie-verificatie bij eerste run op Vercel.
- **`ResourceSource.AGENT`** toegevoegd (additief enum-lid) voor de accept-materialisatie — maakt agent-content filterbaar in de Knowledge Library.
- **Zod-body-validatie** op `POST /api/agents/run` + `PATCH /api/agents/artifacts/[id]` (security-conventie dag-1, vooruitlopend op `security-residual-hardening`-sweep).
- Category-beslispunt beslist: `'agents'`-lid toegevoegd (raakte zoals voorspeld 2 plekken; Settings-UI groepeert dynamisch).

## Rollout (⚠️ verplicht vóór deploy-verkeer)

- **Handmatige Neon `prisma db push`** (gotcha `neon-schema-push-on-deploy`): nieuwe modellen `AgentRun`/`AgentArtifact`, 2 enums, `ResourceSource.AGENT`, Workspace-relaties. Zonder push 500't elke agents-route na deploy.
- `maxDuration = 800` op de run-route vereist Vercel Pro + Fluid (staat live sinds 2026-07-05); bij plan-limiet-fout: verlagen naar 300 + per-agent `timeoutMs` clampen.

## Product-observaties uit de module-inventaris (2026-07-06, niet in deze taak opgelost)

- Research Hub-cluster staat uit (`RESEARCH_HUB_ENABLED=false`) — hele `research/*`-endpoint-familie zonder UI-landing.
- Workshop-rapporten, GEO-analyses en persona-chat-insights zitten diep verstopt zonder overzicht — kandidaten voor agent-use-cases of een rapporten-hub later.
- `pre-launch-browser-smoke-batch`: de VB Compose/Trained-smokes waren "deferred post-vercel" en zijn nu ontgrendeld.

## Task-finalize 2026-07-06 — review-loop + gates

- **5 review-rondes, 10 onafhankelijke code-reviewers**: 0× CRITICAL; 22 WARNINGs totaal (6→4→5→4→3, convergerend naar micro-races/edge-cases) — **alle gefixt en geverifieerd**. Hoogtepunten: dead-fallback `"{}"` -prompt, orphan-placeholder bij env-misconfig, cost-behoud op persist-failure via `OutputContractError`, reserved-key-strip (`knowledgeResourceId`-injectie), `$`-patroon-injectie in `replaceAll`, eerlijke API-error vs guard-truncatie (`abortReason`), input-byte-cap (32KB, `Buffer.byteLength`), first-accept-gating + advisory lock (`pg_advisory_xact_lock`) tegen dubbel-materialisatie, dead-id-zelfherstel (live bewezen: verwijderde resource → re-accept → nieuw id → idempotent), dismiss-archivering + re-accept-de-archivering, `buildSystemPrompt`-deadline (60s), directe cache-invalidatie bij run-start.
- **Iteratie-limiet**: ronde 5 vond nog 3 marginale WARNINGs → gefixt + live geverifieerd; user koos expliciet "committen en afronden".
- **Gates**: `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors · smoke-script 14/14 · herhaalde live HTTP-verificatie (echo-run, guard-fail, isolatie, cache, materialisatie-lifecycle).
- **Open MINORs (bewust deferred, uit de review-rondes)**: response `error`-veld kan interne messages bevatten (allowlist = security-sweep); echo-test leent het research-analyst-model-slot; `["agent"]`-dubbel-cast; `[object Object]` in TABLE-cellen (→ `agents-data-analyst`); accept-pad ~7 DB-roundtrips; schema-comment "NULL on success" dekt de diagnostic-error-op-COMPLETED niet; `AGENTS_ENABLE_TEST_AGENT` documenteren bij env-vars; viewer-rol mag betaalde runs starten (→ RBAC-sweep); orchestrator `index.ts` exporteert de nieuwe API's niet (deep imports); smoke-script laat een FAILED test-run achter in de dev-DB.
