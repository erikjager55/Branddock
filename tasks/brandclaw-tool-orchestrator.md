---
id: brandclaw-tool-orchestrator
title: Brandclaw shared tool-orchestrator — Anthropic tool-use wrapper voor alle nodes
fase: pre-launch
priority: now
effort: 3-5 dagen
owner: claude-code
status: open
created: 2026-05-08
completed: -
related-adr: 2026-05-08-brandclaw-agent-architectuur
related-spec: tasks/_drafts/idea-brand-control-program.md
worktree: branddock-program-p3
---

# Probleem

ADR-2 vergrendelt Anthropic tool-use als runtime voor alle Brandclaw-nodes. Brand Assistant (Claw) heeft al een mature tool-use implementatie in `src/lib/claw/tools/` met 30+ tools (read/write/analyze categorieën). Voor Brandclaw-nodes (Strategy Analyst → Campaign Builder → Measurement → Optimization) ontstaan twee opties:

1. Hergebruik Claw's tool-orchestrator direct
2. Bouw aparte Brandclaw-orchestrator

Hergebruik is verleidelijk maar problematisch:
- Claw is **user-facing chat** (interactive, latency-bewust); Brandclaw nodes zijn **scheduled / event-driven** (batch, latency tolerant)
- Claw tools muteren live data (write-tools); Brandclaw nodes alleen lezen + observations persisten — verschillende permissie-discipline
- Claw routes zijn `/api/claw/*` met session-context; Brandclaw routes zijn `/api/brandclaw/*` (zal niet user-aware zijn)
- ADR-2 versioned-observations + immutable-snapshot-discipline horen in Brandclaw-orchestrator, niet in Claw

Conclusie: aparte orchestrator in `src/lib/brandclaw/orchestrator/` die het Claw-pattern hergebruikt voor abstractie maar eigen tool-registry + run-context heeft. Pattern-overlap, geen code-duplication waar vermijdbaar.

# Voorstel

`BrandclawOrchestrator` class (of namespace) in `src/lib/brandclaw/orchestrator/` met:

1. **Tool-registry** — per node-type aparte tool-set; tools registreren zich via `registerTool(nodeType, toolDef)`. Alle nodes delen dezelfde Anthropic SDK setup.
2. **Run-context** — `BrandclawRunContext { workspaceId, nodeType, agentVersion, promptVersion, runId }` doorgegeven aan elke tool-execute call
3. **Tool-call trace logging** — elke tool-call + result automatisch gelogd in `StrategyObservationRun.toolCallTrace` (per ADR-2 schema)
4. **Anthropic SDK wrapper** — `runAgentLoop(systemPrompt, userMessage, ctx)` orchestreert tool-use multi-turn loop tot agent stops; integreert met DataSnapshot-creation per data-source-tool
5. **Cost + latency tracking** — `StrategyObservationRun.totalCostUsd` + `latencyMs` automatisch gevuld

Tools die Strategy Analyst (eerste node) gebruikt: `query_alignment_history`, `query_content_fidelity`, `query_review_history`, `query_brand_voice_drift`. Elk delegeert naar de DataSource registry uit `brandclaw-data-collection` task.

# Acceptatiecriteria

## Orchestrator infrastructure
- [ ] `src/lib/brandclaw/orchestrator/index.ts` (nieuw) — public API exports
- [ ] `src/lib/brandclaw/orchestrator/types.ts` (nieuw) — `BrandclawRunContext` + `BrandclawTool` + `NodeType` enum
- [ ] `src/lib/brandclaw/orchestrator/tool-registry.ts` (nieuw) — `registerTool(nodeType, tool)` + `getToolsForNode(nodeType)` lookup
- [ ] `src/lib/brandclaw/orchestrator/agent-loop.ts` (nieuw) — `runAgentLoop(prompt, userMsg, ctx): Promise<{observations, run}>` hoofdfunctie
- [ ] Anthropic SDK setup met tool-use multi-turn loop (zelfde pattern als Claw maar geïsoleerd)
- [ ] Per tool-call: log to `StrategyObservationRun.toolCallTrace` JSON; persist run-row at end of loop

## Strategy Analyst tools (gedefinieerd in deze task; geconsumeerd door strategy-analyst-stub)
- [ ] `src/lib/brandclaw/tools/query-alignment-history.ts` (nieuw) — Anthropic-tool definition + execute() delegate naar `dataSourceRegistry.getSource('alignment_scan').query(...)`
- [ ] `src/lib/brandclaw/tools/query-content-fidelity.ts` (nieuw) — idem voor content_fidelity
- [ ] `src/lib/brandclaw/tools/query-review-history.ts` (nieuw) — idem voor review_log (depends op Δ-1 deployment)
- [ ] `src/lib/brandclaw/tools/query-brand-voice-drift.ts` (nieuw) — idem voor voiceguide source
- [ ] Elke tool registreert zich op import bij `BrandclawOrchestrator.registerTool('strategy_analyst', tool)`

## Cost + latency tracking
- [ ] `agent-loop.ts` meet `Date.now()` start/end → `latencyMs`
- [ ] Anthropic API response usage-tokens → cost-calculation per pricing (input/output tokens × Sonnet 4.6 pricing)
- [ ] `StrategyObservationRun.totalCostUsd` precision-decimal (per ADR-2 schema)
- [ ] PostHog event `brandclaw_run_completed` met `{ workspaceId, nodeType, agentVersion, latencyMs, costUsd, observationsCount }`

## Workspace-isolatie + safety
- [ ] Elke tool verplicht `workspaceId` uit `BrandclawRunContext` — geen cross-workspace queries mogelijk
- [ ] Tool-execute-failures vangen → log error in toolCallTrace + continue agent-loop met error-result message (Claw-pattern)
- [ ] Hard-timeout per agent-loop: 5 minuten (configurable); kill na timeout met partial observations + truncation-flag

## Quality gates
- [ ] `npx tsc --noEmit` 0 errors + `npm run lint` 0 errors
- [ ] Unit-test: tool-registry register + lookup + isolation per node-type
- [ ] Integration-test: agent-loop roept 1 mock-tool aan, persists run-row + observations
- [ ] Smoke-test: minimal prompt + 1 query-tool op BB workspace → run completes ≤30s + cost <$0.05

# Bestanden die ik aanraak

## Orchestrator
- `src/lib/brandclaw/orchestrator/index.ts` (nieuw) — exports
- `src/lib/brandclaw/orchestrator/types.ts` (nieuw)
- `src/lib/brandclaw/orchestrator/tool-registry.ts` (nieuw)
- `src/lib/brandclaw/orchestrator/agent-loop.ts` (nieuw)
- `src/lib/brandclaw/orchestrator/cost-calculator.ts` (nieuw) — Anthropic-pricing per model
- `src/lib/brandclaw/orchestrator/persistence.ts` (nieuw) — `persistRun(run, observations)` Prisma write helpers

## Strategy Analyst tools
- `src/lib/brandclaw/tools/index.ts` (nieuw) — auto-registers all tools on import
- `src/lib/brandclaw/tools/query-alignment-history.ts` (nieuw)
- `src/lib/brandclaw/tools/query-content-fidelity.ts` (nieuw)
- `src/lib/brandclaw/tools/query-review-history.ts` (nieuw — depends Δ-1)
- `src/lib/brandclaw/tools/query-brand-voice-drift.ts` (nieuw)

## Tests
- `src/lib/brandclaw/orchestrator/__tests__/tool-registry.test.ts` (nieuw)
- `src/lib/brandclaw/orchestrator/__tests__/agent-loop.integration.test.ts` (nieuw)

# Bestanden die ik NIET aanraak

- `src/lib/claw/*` — Claw-orchestrator blijft user-facing, onaangeraakt; Brandclaw is parallel
- `src/lib/brandclaw/data-sources/*` — komen uit `brandclaw-data-collection` task; orchestrator consumeert via tools
- ADR-2 schema modellen (`DataSnapshot` / `StrategyObservation` / `StrategyObservationRun`) — alleen reads; persistentie via dedicated `persistence.ts` helpers
- F-VAL engine — onaangeraakt; data-collection-source leest ContentFidelityScore
- Strategy Analyst-specifieke logica — komt in `strategy-analyst-stub` task; orchestrator is generiek

# Smoke test plan

1. **Tool-registry isolation**: register tool voor `strategy_analyst` + tool voor (mock) `campaign_builder` → `getToolsForNode('strategy_analyst')` returns alleen Analyst tools
2. **Tool-call trace**: agent-loop met 2 tool-calls → `StrategyObservationRun.toolCallTrace` bevat 2 entries met name + input + result + timestamp
3. **Cost tracking**: minimal prompt + 0 tool-calls (alleen text response) → run.totalCostUsd > 0 + correct pricing-formula
4. **Latency tracking**: 1 tool-call met 100ms mock-delay → run.latencyMs ≥ 100
5. **Workspace-isolatie**: poke tool-execute met workspaceId-A maar ctx.workspaceId-B → tool rejects with isolation-error
6. **Hard-timeout**: agent-loop met infinite-loop tool → killed na 5min + partial observations persisted with truncation-flag
7. **Real BB run**: minimaal Analyst-prompt + 1 query_alignment_history → run completes ≤30s + 1 observation persisted + cost <$0.05
8. **TSC + lint**: 0 errors

# Risico's

- **Anthropic API rate-limits** (medium): scheduled runs over 100+ workspaces zou Anthropic-limits raken. Mitigatie: queue + concurrency-cap = 5 parallel; backoff op 429
- **Cost-explosion van long agent-loops** (medium): agent kan tools herhaaldelijk callen → token-count explodeert. Mitigatie: `maxToolCallsPerRun = 20` cap; force-stop met partial result
- **Tool-execute failures cascade** (laag-medium): één tool-fail kan agent confuse → infinite retry-loop. Mitigatie: max-retries-per-tool = 2, daarna error-result + skip
- **DataSnapshot writes ondoenlijk lang** (laag): 4 sources × snapshot-write per tool-call = 4-20 snapshot writes per run. Mitigatie: batch writes in transaction at end of agent-loop, niet per tool-call
- **Cross-node tool-name collision** (laag): twee nodes registreren `query_alignment_history` met verschillende impl. Mitigatie: tool-registry stores per node-type; geen global namespace
- **Anthropic SDK breaking changes** (medium): SDK v0.x → v1 transition kan breaking. Mitigatie: pin SDK version; dedicated upgrade-task wanneer SDK v1 stable
- **Test-isolation in CI** (medium): integration-test schrijft naar Prisma. Mitigatie: separate test-DB (existing pattern); transaction-rollback after each test

# Out of scope

- **UI voor Brandclaw runs** — komt in `strategy-analyst-stub` (Brand Alignment Tab 4 "Insights")
- **Multi-tenant scheduling** — single-workspace runs v1; cron-scheduling komt later (Measurement-node task)
- **Tool-output validation** (Zod-on-output) — output is unstructured Anthropic response; validation aan reasoning-laag
- **Streaming of partial observations** — batch-mode v1; streaming-Insights LATER
- **Cross-node tool-sharing** (Campaign Builder gebruikt Analyst tools) — komt later wanneer Campaign Builder landt; v1 keeps tools per-node-isolated
- **Custom tool-permissions per workspace** — alle workspaces gebruiken zelfde tool-set v1
- **Tool-versioning** (forward-compat met Anthropic API breaking changes) — pin SDK version, manual upgrade later
- **External orchestrator integration** (LangGraph, etc.) — afgewezen in ADR-2

# Notes

ADR-2 is canonical referentie voor architectuur — dit is implementation. Geen architectuur-wijzigingen.

Cross-task dependencies:
- `brandclaw-data-collection` (vorige task) MOET first deployed — orchestrator consumeert data-sources via tools
- `strategy-analyst-stub` (volgende task) consumeert orchestrator + registreert prompt + UI

Foundation voor toekomstige nodes:
- Campaign Builder (maand 5-6) registreert eigen tool-set op `campaign_builder` node-type
- Measurement (maand 7-9) registreert tools voor performance-data + correlation queries
- Optimization (maand 10-12) registreert tools + autonomy-gate logic

Implementation-volgorde:
1. Types + tool-registry (0.5d)
2. Anthropic SDK setup + agent-loop skeleton (1d)
3. Cost-calculator + latency tracking (0.5d)
4. Persistence helpers (Prisma writes naar StrategyObservation + StrategyObservationRun) (0.5d)
5. 4 query-tools (alignment / fidelity / review / voice-drift) (1.5d)
6. Integration tests + workspace-isolation tests (0.5d)
7. Smoke-test op BB workspace (0.5d)

Anthropic SDK setup hergebruikt bestaande `@anthropic-ai/sdk` dependency uit Claw — geen nieuwe dependency. Anthropic-pricing in cost-calculator: hardcoded constants per model (Sonnet 4.6 input $3/M tokens, output $15/M tokens — verifieer current pricing-page bij implementation).

Validation post-deployment: monitor PostHog `brandclaw_run_completed` event aggregaten over Better Brands 7-day window. Targets: p50 latency ≤30s, p95 ≤60s, gem. cost-per-run ≤$0.20. Trigger optimization-iteration als targets niet gehaald.
