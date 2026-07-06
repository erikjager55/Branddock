---
id: agents-motor-wiring
title: Agents motor-wiring — 5 persona-agents op bestaande motoren + Claw-tool-bridge + propose-only confirm + F-VAL-poort
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

Na `agents-foundation` bestaat de motor + het artefact-model, maar nog geen enkele echte agent. De vijf agents mét bestaande motor (Research Analyst → `runDeepResearch`, Brand Guardian → `runFidelityForExternalContent`, Strategist → `strategy-chain.ts`-stappen, Content Creator → `create_deliverable` + `orchestrateContentGeneration`, Market Analyst → competitor-/analyze-tools) moeten elk als dunne registry-config gewired worden. Twee integratie-gaten blokkeren dat: (1) Claw-tools (`ClawToolDefinition`, Zod + `requiresConfirmation`) spreken een ander interface dan orchestrator-tools (`BrandclawTool`, JSON-schema + `BrandclawRunContext`); (2) de Claw confirm-flow is conversationeel-interactief, terwijl een agent-run batch draait.

# Voorstel

Bouw één dunne **Claw→orchestrator tool-bridge** (`clawToolToAgentTool`): mapt naam/description, hergebruikt de bestaande Zod→JSON-schema-converter uit `src/lib/claw/tools/registry.ts` (exporteren), en construeert `ToolExecutionContext {workspaceId, userId}` uit de run-context. **Write-tools worden in agent-context nooit uitgevoerd**: de bridge roept `buildProposal()` aan, retourneert het proposal als tool-result ("voorgesteld, wacht op goedkeuring") en de run persisteert een `PROPOSAL`-artefact + status `AWAITING_CONFIRMATION` — bevestiging gebeurt post-run vanuit de inbox via de bestaande `/api/claw/confirm`-logica (geen loop-suspend/resume). Zware pipelines (deep research, contentgeneratie, strategie-stappen) worden als pipeline-tools in de agent-toolset geregistreerd met per-agent `timeoutMs`-overrides. F-VAL-poort: elke content-producerende output gaat door `runFidelityForExternalContent`; score + findings landen als `FINDINGS`-artefact naast de output (ADR D5).

# Acceptatiecriteria

- [ ] Tool-bridge: een Claw read/analyze-tool draait ongewijzigd binnen `runAgentLoop`; een write-tool levert uitsluitend een proposal op (geen DB-mutatie) — bewezen met een test-run die `create_deliverable` voorstelt en de DB onaangeroerd laat tot confirm.
- [ ] Given een agent bereikt een write-actie, When de run die actie voorstelt, Then eindigt de run in `AWAITING_CONFIRMATION` met een `PROPOSAL`-artefact (MutationProposal-shape: description, entityType, changes) en muteert er zonder goedkeuring niets; na confirm via de confirm-route wordt de mutatie uitgevoerd en het artefact als geaccepteerd gemarkeerd + cache-invalidatie.
- [ ] **Research Analyst**: use-case-run met onderwerp → `runDeepResearch` (met begrensde config ≤ ~10 min + `AbortSignal` aan de route-deadline gekoppeld) → geciteerd rapport als `REPORT`-artefact + `LINK`-artefact naar de aangemaakte KnowledgeResource.
- [ ] **Brand Guardian**: geplakte externe tekst → `runFidelityForExternalContent` → `FINDINGS`-artefact met fidelity-score + findings.
- [ ] **Strategist**: onderwerp/doel → strategie-stappen (`buildStrategyFoundation`/`generateInsights`/`buildConceptDrivenStrategy` als tools) → blueprint als `REPORT`-artefact; `createDeliverablesFromBlueprint` alleen via proposal-pad.
- [ ] **Content Creator**: opdracht → proposal voor deliverable(s); na confirm draait `orchestrateContentGeneration` en Then toont de output een F-VAL-score + findings; onder de drempel volgt auto-iterate (`runAutoIterate`, bestaat) of een expliciete flag — nooit een stille lage score.
- [ ] **Market Analyst**: read/analyze-tools (o.a. `analyze_competitive_position` + competitor read-tools via de bridge) → analyse-rapport als `REPORT`-artefact.
- [ ] Elke agent heeft een eigen `AiFeatureKey`-resolutie, persona-invulling (werknaam + rol + Lucide-icon; professioneel, geen emoji) en ≥2 use-case-knop-definities in zijn `AgentDefinition`.
- [ ] Guards blijven van kracht per run (maxToolCalls, wallclock, cost-tracking); PostHog-events bevatten `agent_id`.
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd
- [ ] Documentatie bijgewerkt indien van toepassing

# Bestanden die ik aanraak

- `src/lib/agents/registry/tool-bridge.ts` (nieuw — Claw→BrandclawTool-adapter + propose-only write-gedrag; risico: medium)
- `src/lib/claw/tools/registry.ts` — `zodToJsonSchema` exporteren (regels: ~2, risico: laag; geen gedragswijziging voor Claw zelf)
- `src/lib/agents/registry/definitions/research-analyst.ts`, `brand-guardian.ts`, `strategist.ts`, `content-creator.ts`, `market-analyst.ts` (nieuw — elk: system-prompt, toolset, use-cases, output-contract)
- `src/lib/agents/registry/pipeline-tools.ts` (nieuw — `runDeepResearch`/`orchestrateContentGeneration`/strategy-chain-stappen als orchestrator-tools; risico: hoog — wallclock/SSE-mismatch)
- `src/lib/agents/registry/index.ts` — 5 agents registreren
- `src/lib/agents/registry/fval-gate.ts` (nieuw — helper: output → `runFidelityForExternalContent` → `FINDINGS`-artefact + drempel-flag/auto-iterate-hook)
- `src/app/api/agents/runs/[runId]/confirm/route.ts` (nieuw — proposal-confirm; delegeert aan dezelfde tool-execute als `/api/claw/confirm`, zet artefact-status + run-status, invalideert cache)
- `src/app/api/agents/run/route.ts` — per-agent `maxDuration`/timeout-doorvoer (klein)

# Bestanden die ik NIET aanraak

- `src/lib/knowledge-research/orchestrator.ts`, `src/lib/ai/canvas-orchestrator.ts`, `src/lib/campaigns/strategy-chain.ts`, `src/lib/brand-fidelity/external-content-runner.ts` — motoren worden aangeroepen, niet gewijzigd; elke gewenste motor-wijziging = stop-and-ask.
- `src/lib/claw/tools/write-tools.ts` e.a. tool-implementaties — hergebruik as-is via de bridge.
- `src/app/api/claw/confirm/route.ts` — blijft het Claw-pad; agents krijgen hun eigen dunne confirm-route die dezelfde registry-execute hergebruikt (geen fork van tool-logica).
- UI-componenten — `agents-ui-inbox`.

# Smoke test plan

1. Research Analyst-run (klein onderwerp, gereduceerde config) → COMPLETED, `REPORT`-artefact met citaties, `LINK` naar KnowledgeResource, kosten gelogd.
2. Brand Guardian-run met bewust off-brand tekst → `FINDINGS`-artefact met lage score + findings-lijst.
3. Content Creator-run "schrijf 1 LinkedIn-post" → run eindigt `AWAITING_CONFIRMATION`, DB heeft géén nieuwe Deliverable; confirm → Deliverable bestaat, F-VAL-score + findings zichtbaar, onder drempel → auto-iterate of flag.
4. Market Analyst-run op een workspace met ≥2 concurrenten → rapport benoemt concurrenten uit workspace-data (geen hallucinatie-check: namen matchen DB).
5. Edge: Strategist-run op een workspace zónder personas/strategie → nette degradatie (rapport benoemt ontbrekende context), geen crash. Error: trek netwerk/API-key weg → run FAILED met begrijpelijke fout.
6. Workspace-isolatie: Market Analyst in workspace B mag geen competitor-data van A citeren (tools draaien op `ctx.workspaceId`).
7. Regressie: bestaande Claw-overlay-chat + `/api/claw/confirm` werken ongewijzigd (bridge raakt Claw-runtime niet).

# Risico's

- **Pipeline-in-loop wallclock** (waarschijnlijkheid: middel-hoog): `runDeepResearch` kan de agent-run-deadline overschrijden → per-agent `timeoutMs`-override + gereduceerde research-config (`RunDeepResearchInput.config` bestaat) + `AbortSignal`-koppeling; als het structureel niet past: Research Analyst-run degradeert naar "compact rapport" i.p.v. volle 6-fasen-run (documenteren, niet stil).
- **Confirm-semantiek-drift**: twee confirm-routes (Claw + agents) die dezelfde tools uitvoeren kunnen divergeren → agents-confirm-route MOET `getToolByName().execute()` hergebruiken, geen eigen switch.
- **`orchestrateContentGeneration` is een async generator** los van HTTP — consumeren in de confirm-route (na goedkeuring), niet in de loop-turn; anders dubbele generatie-triggers.
- Prompt-injection via tool-output (bekende Claw-fencing) → zelfde fencing-conventies in agent-system-prompts overnemen.

# Out of scope

- Data Analyst (query-tools + tabel) → `agents-data-analyst`.
- Definitieve persona-namen/avatars — werknamen volstaan; design finaliseert in `agents-ui-inbox`.
- "Chat met agent X" — is UI-werk (`agents-ui-inbox`) op de Claw panel-mode; hier alleen de run-/toolset-kant.
- Strategy Analyst als 6e/7e catalogus-agent — Fase 3.
- Nieuwe motoren (SEO, translation, …) — bestaande motoren only.

# Notes

- **Phase -1 gates**: Simplicity — 0 nieuwe directories (alles onder bestaand `src/lib/agents/registry/` uit foundation); 5 agents zijn config-files, geen frameworks. Anti-Abstraction — de tool-bridge is een mapping-functie, geen tweede registry (de Claw-registry blijft source of truth voor tool-implementaties); propose-only is de dunste confirm-integratie (geen loop-state-serialisatie/resume — bewust verworpen als overkill). Integration-First — bridge-interface en confirm-route-contract eerst, agent-definities pinnen erop.
- Dependencies: **`agents-foundation` moet done zijn** (output-contract, `AgentRun`/`AgentArtifact`, registry-skelet, run-API). Kan parallel aan `agents-ui-inbox` zolang beide de foundation-contracten niet wijzigen; file-ownership is disjunct.
- Lite-fallback (idea-doc): bij tijdsdruk eerst Research Analyst + Brand Guardian + Strategist opleveren; Content Creator + Market Analyst kunnen een dag later — de registry maakt dat een kwestie van registreren.

## Integratie-matrix (user-directive 2026-07-06 — leidend voor de agent-definities)

> **Principe: domain-first write-through.** Agents draaien de bestáánde motoren/endpoints; resultaten landen in de bestáánde domein-modellen en zijn daarmee automatisch zichtbaar in de bestaande module-UI's. De agent-inbox toont referenties (`LINK`-artefacten), geen kopieën. REPORT/TABLE zonder domein-thuis materialiseren bij accept naar de Knowledge Library (helper `materializeArtifactOnAccept` — al gebouwd in foundation, incl. `ResourceSource.AGENT`). Volledige module-inventaris: sessie 2026-07-06 (plan `parsed-foraging-balloon`).

| Agent | Neemt proces over (bestaande route/motor) | Resultaat zichtbaar in |
|---|---|---|
| Research Analyst | `runDeepResearch` (`src/lib/knowledge-research/orchestrator.ts` — nu alleen via Knowledge Library-ingang; persisteert zelf niets server-side!) | REPORT-artefact → accept → Knowledge Library (`KnowledgeResource`, source `AGENT`) |
| Brand Guardian | `runFidelityForExternalContent` + `alignment/scan` + `alignment/audit` (nu 3 losse tabs) | Brand Alignment-tabs — de motoren persisteren zelf (`ContentReviewLog`/`BrandReviewFinding`/`AlignmentScan`); FINDINGS-artefact + LINK |
| Strategist | `campaigns/wizard/strategy/*`-stappen (9 routes, hoge navigatie-drempel) + `createDeliverablesFromBlueprint` | Campaigns-module (`Campaign`/`CampaignStrategy`) + Canvas-deliverables (confirm-gated); LINK-artefact |
| Content Creator | `create_deliverable` (Claw-tool, PROPOSAL/confirm) + `orchestrateContentGeneration` als pipeline-as-tool (nu 4-5 kliks diep via studio) | Content Library/Canvas (`Deliverable`) — normale content-overzichten; LINK-artefact + F-VAL-score |
| Market Analyst | `competitors/[id]/refresh` (sync), trend-radar-triggers, Strategy-Analyst-dimensies | Competitor-timeline (`CompetitorSnapshot`/`Activity`), Trend Radar (`DetectedTrend`), Brand Alignment Tab 5 (`StrategyObservation`); REPORT → accept → Knowledge Library |

- **Job-based analyzers** (brandstyle/brandvoice/products-analyze — job+polling): patroon "agent start job → LINK-artefact naar module-status" is Fase 2 (`agents-scheduling`), niet hier.
- **Coördinatie-note canvas**: `content-test-auto-iterate-6B`-rest, `content-flow-improvements-7a`, `content-test-regression-7B` en `lp-feature-image-diversity` (in-progress) raken de canvas-orchestrator/pipeline. De pipeline-as-tool-wrapper van de Content Creator wrapt `orchestrateContentGeneration` — bij start file-ownership afstemmen; de wrapper mag de orchestrator-signatuur niet wijzigen.
- **Contract-eis confirm-route (review-finding 2026-07-06)**: de run-detail-route cachet terminale statussen incl. `AWAITING_CONFIRMATION`; de confirm-afhandeling die een run naar COMPLETED transitioneert MOET `invalidateCache(cacheKeys.prefixes.agents(workspaceId))` aanroepen, anders plakt de oude status tot DETAIL-TTL.
