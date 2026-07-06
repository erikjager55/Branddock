---
id: agents-motor-wiring
title: Agents motor-wiring — 5 persona-agents op bestaande motoren + Claw-tool-bridge + propose-only confirm + F-VAL-poort
fase: pre-launch
priority: now
effort: 4-6 dagen
owner: claude-code
status: done
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

- [x] Tool-bridge: een Claw read/analyze-tool draait ongewijzigd binnen `runAgentLoop`; een write-tool levert uitsluitend een proposal op (geen DB-mutatie) — bewezen met een test-run die `create_deliverable` voorstelt en de DB onaangeroerd laat tot confirm.
- [x] Given een agent bereikt een write-actie, When de run die actie voorstelt, Then eindigt de run in `AWAITING_CONFIRMATION` met een `PROPOSAL`-artefact (MutationProposal-shape: description, entityType, changes) en muteert er zonder goedkeuring niets; na confirm via de confirm-route wordt de mutatie uitgevoerd en het artefact als geaccepteerd gemarkeerd + cache-invalidatie.
- [x] **Research Analyst**: use-case-run met onderwerp → `runDeepResearch` (met begrensde config ≤ ~10 min + `AbortSignal` aan de route-deadline gekoppeld) → geciteerd rapport als `REPORT`-artefact + `LINK`-artefact naar de aangemaakte KnowledgeResource.
- [x] **Brand Guardian**: geplakte externe tekst → `runFidelityForExternalContent` → `FINDINGS`-artefact met fidelity-score + findings.
- [x] **Strategist**: onderwerp/doel → strategie-stappen (`buildStrategyFoundation`/`generateInsights`/`buildConceptDrivenStrategy` als tools) → blueprint als `REPORT`-artefact; `createDeliverablesFromBlueprint` alleen via proposal-pad.
- [x] **Content Creator**: opdracht → proposal voor deliverable(s); na confirm draait `orchestrateContentGeneration` en Then toont de output een F-VAL-score + findings; onder de drempel volgt auto-iterate (`runAutoIterate`, bestaat) of een expliciete flag — nooit een stille lage score.
- [x] **Market Analyst**: read/analyze-tools (o.a. `analyze_competitive_position` + competitor read-tools via de bridge) → analyse-rapport als `REPORT`-artefact.
- [x] Elke agent heeft een eigen `AiFeatureKey`-resolutie, persona-invulling (werknaam + rol + Lucide-icon; professioneel, geen emoji) en ≥2 use-case-knop-definities in zijn `AgentDefinition`.
- [x] Guards blijven van kracht per run (maxToolCalls, wallclock, cost-tracking); PostHog-events bevatten `agent_id`.
- [x] `npx tsc --noEmit` 0 errors
- [x] `npm run lint` 0 errors
- [x] Smoke-test uitgevoerd
- [x] Documentatie bijgewerkt indien van toepassing

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

---

# Status 2026-07-06 — GEBOUWD (branch `feat/agents-motor-wiring`)

## Live-smoke-bewijs (echte API-runs, workspace "Zwarthout")

| Agent | Resultaat |
|---|---|
| Brand Guardian | ✅ off-brand tekst → FINDINGS-artefact **score 57** + REPORT; `ContentReviewLog`-domein-rij bevestigd (Brand Alignment) — $0.058, 49s |
| Content Creator | ✅ propose (deliverables 296→296, **géén DB-write**) → run AWAITING_CONFIRMATION → confirm → deliverable aangemaakt in campagne "Zomer 2026", volledige pipeline gedraaid, **F-VAL 93** op LINK-artefact, run COMPLETED — $0.128 + generatie |
| Market Analyst | ✅ REPORT "Concurrentiepositie Zwarthout" (citeert échte workspace-data) + dun-data → trend-scan-PROPOSAL; **reject-pad**: dismissed → run COMPLETED, niets uitgevoerd — $0.099, 55s |
| Research Analyst | ✅ COMPLETED 3,5 min — volledig rapport (13,7k md, 3 bronnen) direct als `KnowledgeResource` (source `AGENT`) + server-owned REPORT + LINK-artefact — $0.078 |
| Strategist | ✅ gescopete flow (foundation → insights → richting-rapport) COMPLETED 3,6 min, 1 REPORT — $0.141; eerdere volle-keten-run bewees de 4-staps-orkestratie ($0.39) maar zie afwijkingen |
| Catalogus | ✅ `GET /api/agents` toont de 5 persona's; echo-test blijft hidden |
| Claw-regressie | ✅ overlay-chat streamt ongewijzigd (tool-grounded antwoord) |
| Error-pad | ✅ guard-fail runs eindigen FAILED met eerlijke error (incl. `api_error`-onderscheid uit foundation) |

## Afwijkingen (degradatie-clausule task-risico's — gedocumenteerd, niet stil)

1. **Strategist default-flow gescoped op foundation + insights + richting-rapport.** De volledige keten (t/m `build_concept_driven_strategy`) overschrijdt structureel het synchrone run-budget (foundation alleen al ~340-720s; volle keten 13-28 min in drie meet-runs). De 4 tools blijven geregistreerd voor expliciete vervolg-vragen; volledige uitwerking → campagne-wizard (nu) of async runs (`agents-scheduling`, Fase 2). Mitigaties gebouwd: snelheids-preset (`basic`/`single`/`fast`), per-stap harde deadline (6 min, bewezen werkend), `maxTokens`-override per agent (16k strategist — default 4096 kapte het rapport af).
2. **Deep research draait op compacte config** (3 queries / 6 bronnen / verify uit / 5-min-deadline + harde kill op 6,5 min): de interne deep-research-deadline wordt niet door elke fase gerespecteerd (8-min-config liep 15+ min). Volle-diepte research blijft de Knowledge-Library-ingang.
3. **Competitor-refresh niet als agent-tool**: de refresh-logica zit inline in de route (geen lib-functie); motor-wijziging = stop-and-ask per task-regel → doorgeschoven (job-based patroon past sowieso beter, Fase 2). `alignment/audit` idem: geen bestaande Claw-tool.
4. **Extra deliverable buiten oorspronkelijke file-list**: `GET /api/agents` (catalogus-endpoint) — de registry is niet client-safe (bootstrap trekt prisma/claw-tools mee), dus de UI-taak kan `listAgents()` niet importeren; contract gedeeld met `agents-ui-inbox`.
5. **PATCH-guard op PROPOSAL-artefacten** (foundation-route, kleine cross-edit): accept/dismiss van proposals loopt verplicht via de confirm-route — een kale PATCH-accept zou "goedgekeurd maar nooit uitgevoerd" opleveren.

## Gates
`npx tsc --noEmit` 0 errors · eslint op alle geraakte dirs 0 errors · totale smoke-kosten ~$1,20.


---

# Task-finalize 2026-07-06 — review-loop-bewijs

**4 review-rondes** (2 onafhankelijke reviewers per ronde 1-3, focused delta-reviewer ronde 4):
- **3 CRITICAL gefixt**: (1) confirm-route miste member+-rol-check (viewers konden mutaties uitvoeren); (2) TOCTOU-race — atomic claim + releaseClaim-rollback + 409; (3) geforgede PROPOSAL-artefacten — model-authored types ge-whitelist tot REPORT/LINK + requiresConfirmation-check + schema-hervalidatie in confirm.
- **12 WARNINGs gefixt**: o.a. expliciet ctx.userId-contract (geen triggerSource-smokkel), mechanische fencing (fenceUntrustedContent) op bridge/deep-research-output, per-stap-deadlines (strategy 6min / F-VAL 4min / generatie 10min), settle-vóór-generatie, soft-fail→502, scan-dispatchJob (start_alignment_scan/start_trend_scan maakten rijen zonder job — pre-existing Claw-gap), 409-self-heal + releaseClaim-status-reset, fval/dashboard-cache-parity, shape-guards, malformed-proposal-reject-bereikbaarheid.
- Ronde 4 eindigde op 1 smal self-introduced race-venster → 3-regel-fix (releaseClaim reset run-status); ronde 5 geskipt op de hard-limit — de fix is mechanisch verifieerbaar en alle overige bevindingen waren MINOR.

**Gates**: tsc 0 · eslint 0 · smoke-script 14/14 · live claim-semantiek bewezen (reject 200 → re-confirm 409 → unauth 401).

**Deferred MINORs** (bewust, uit rondes 2-4): 401-vs-403-volgorde op GET /api/agents; markdown-cap-asymmetrie REPORT-artefact vs KnowledgeResource (200k); toolCallTrace bevat gefencede string voor bridged tools (debug-leesbaarheid); TOOL_CACHE_PREFIXES zonder bootstrap-assert; run-collector single-process-constraint documenteren voor Fase 2; strategist-tools herbouwen pipeline-context per stap (3x fetch); viewers kunnen PROPOSAL niet rejecten (member+ ook voor reject — bewuste keuze); dubbele sessie-fetch confirm-route; fencing-conventie tweeledig (strategist/fval-output niet gefenced — LLM-synthese, geen raw scrape).
