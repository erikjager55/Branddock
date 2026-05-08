---
id: 2026-05-08-brandclaw-agent-architectuur
title: Brandclaw agent-architectuur — tool-use + versioned observations + immutable snapshots vanaf Strategy Analyst-stub
status: accepted
date: 2026-05-08
supersedes: -
superseded-by: -
---

# Context

Brand Control Program Phase 3 introduceert de eerste Brandclaw-node: **Strategy Analyst-stub** (read + suggest, no autonomy). Dit is het startpunt van de Brandclaw-transformatie zoals vastgelegd in `tasks/_drafts/idea-brand-control-program.md` en de Brandclaw-roadmap in `roadmap.md`. De resterende drie nodes volgen de komende 12 maanden post-launch:

- **maand 5-6**: `brandclaw-campaign-builder` — suggesteert campagne-moves, mens beslist
- **maand 7-9**: `brandclaw-measurement-eval` — correlatie + leren van performance-data
- **maand 10-12**: `brandclaw-optimization` — autonomy-gate met owner approval

Zonder een ADR-vergrendelde architectuur-keuze zou elke node ad-hoc geïmplementeerd worden. Dat introduceert vier soorten drift-risico:

1. **Tool-orchestrator drift** — elke node implementeert eigen tool-use-pattern; later samenvoegen of cross-node-tool-sharing wordt herwerk
2. **Observation-shape drift** — Strategy Analyst observations zien er anders uit dan Campaign Builder suggestions; consumers (UI, downstream nodes) moeten meerdere shapes kennen
3. **Snapshot-discipline drift** — sommige nodes loggen inputs immutable, anderen lezen live; reproduceerbaarheid van past observations is niet gegarandeerd
4. **Autonomy-gate drift** — zonder gedeeld principe weet niemand wanneer een node mag handelen vs. alleen suggesteren

Pre-existing context die deze keuze beïnvloedt:

- **Brand Assistant (Claw)** heeft al **tool-use via Anthropic SDK** (zie `src/lib/claw/tools/`) — bestaand precedent met 30+ tools (read + write + analyze categorieën). Team kent het pattern.
- **F-VAL output-schema** is uitgebreid met `BrandReviewFinding` (ADR `2026-05-08-fval-output-schema-bevindingen`) — directe consumer voor Analyst observations (Analyst leest finding-trends voor "voice drift" / "fidelity decline" dimensions).
- **`BrandVoiceguide.contentLocale`** (ADR `2026-05-08-locale-routing-brand-voice`) — locale-aware Analyst input; Analyst observations zijn dus per-brand-locale gekleurd.
- **`ContentReviewLog`** (Δ-1, BCP Phase 2) — één van de drie Analyst-input-bronnen alongside `AlignmentScan` + `ContentFidelityScore`. Phase 3 Analyst hangt mechanisch aan Phase 2 Δ-1 output.

De idea-doc Brand Control Program (`tasks/_drafts/idea-brand-control-program.md`, sectie "Most-robust Strategy Analyst — architectuur-schets") heeft de architectuur ontworpen. Deze ADR vergrendelt het zodat downstream nodes (Campaign Builder, Measurement, Optimization) plug-and-play kunnen uitbreiden.

# Decision

Wij adopteren een gedeelde Brandclaw-agent-architectuur op basis van vier vergrendelde elementen vanaf de Strategy Analyst-stub:

1. **Anthropic tool-use pattern** als runtime — gedeelde tool-orchestrator in `src/lib/brandclaw/` met tool-registry waar alle Brandclaw-nodes hun query-tools registreren. Hergebruikt het bestaande Claw-tool-pattern (read/write/analyze categorieën).
2. **Versioned `StrategyObservation` Prisma-model** — elke observation is gestempeld met `agentVersion` (semver van node-implementatie) + `promptVersion` (hash of versie van system-prompt). Maakt drift-detection en A/B-testing van prompt-changes mogelijk.
3. **Immutable `DataSnapshot` Prisma-model** — input-laag tussen live tables en agent-reasoning. Elke observation refereert specifieke snapshot-rows als evidence — past observations zijn point-in-time reproduceerbaar zelfs nadat live data muteert.
4. **No-autonomy-in-stub principe** — Strategy Analyst suggereert; mens beslist; geen agent maakt destructieve acties. Autonomy-gate (per `brandclaw-optimization` maand 10-12) wordt later toegevoegd met owner-approval-flow per node-type.

## Architecture-shape

```
StrategyAnalyst (BCP Phase 3 — eerste Brandclaw-node)
├── Data-laag (brandclaw-data-collection task)
│   ├── DataSource registry — welke modellen Analyst kan queryen
│   ├── DataSnapshot Prisma model — immutable point-in-time inputs voor reproducibility
│   └── Time-window queries: "last N days", "since version X"
├── Tool-laag (Anthropic tool-use, hergebruikt Claw-orchestrator)
│   ├── query_alignment_history(workspace, since)
│   ├── query_content_fidelity(workspace, contentType?, since)
│   ├── query_review_history(workspace, since) — uit ContentReviewLog (Δ-1)
│   └── query_brand_voice_drift(workspace, since)
├── Reasoning-laag
│   ├── Anthropic prompt met scaffold "two-reasons-test" (methodology §11)
│   ├── Output: StrategyObservation[] met severity + confidence + evidence
│   └── Versioned: agentVersion + promptVersion gestempeld op output
├── Persistence
│   ├── StrategyObservation Prisma model — versioned, queryable, indexed
│   └── StrategyObservationRun Prisma model — run-metadata (cost, latency, tool-trace)
└── UI
    └── Brand Alignment Tab 4 "Insights" — read-only suggesties, geen Apply-knop in stub
```

## Schema (Prisma — additief, geen wijzigingen aan bestaande modellen)

```prisma
model DataSnapshot {
  id          String   @id @default(cuid())
  workspaceId String
  sourceType  String   // 'alignment_scan' | 'content_fidelity' | 'review_log' | 'voiceguide'
  sourceId    String
  snapshotAt  DateTime @default(now())
  payload     Json     // immutable copy of source data at snapshotAt
  workspace   Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)

  @@index([workspaceId, sourceType, snapshotAt])
}

model StrategyObservation {
  id              String   @id @default(cuid())
  workspaceId     String
  runId           String   // FK naar StrategyObservationRun
  dimension       String   // 'voice_drift' | 'fidelity_decline' | 'review_pattern' | 'alignment_gap' | etc.
  severity        Severity // HIGH | MEDIUM | LOW (hergebruikt enum uit ADR-1)
  confidence      Confidence // HIGH | MEDIUM | LOW — methodology §11 two-reasons-toets
  summary         String   @db.Text
  evidence        Json     // citation-keys naar DataSnapshot rows + tool-call-trace
  agentVersion    String   // semver van Analyst-implementatie
  promptVersion   String   // hash of versie van system-prompt
  createdAt       DateTime @default(now())
  workspace       Workspace @relation(fields: [workspaceId], references: [id], onDelete: Cascade)
  run             StrategyObservationRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@index([workspaceId, createdAt])
  @@index([runId])
}

enum Confidence {
  HIGH
  MEDIUM
  LOW
}

model StrategyObservationRun {
  id              String   @id @default(cuid())
  workspaceId     String
  triggerType     String   // 'manual' | 'scheduled' | 'event_driven'
  triggerSource   String?  // user-id voor manual, cron-name voor scheduled
  agentVersion    String
  promptVersion   String
  toolCallTrace   Json     // sequence van tool-calls + results (for audit)
  totalCostUsd    Decimal  @db.Decimal(10, 6)
  latencyMs       Int
  createdAt       DateTime @default(now())
  observations    StrategyObservation[]

  @@index([workspaceId, createdAt])
}
```

# Y-statement

In de context van **Brandclaw-transformatie waarbij vier agent-nodes (Strategy Analyst → Campaign Builder → Measurement → Optimization) over 12 maanden post-launch worden gebouwd**, facing **het risico op drift in tool-orchestrator + observation-shape + snapshot-discipline + autonomy-gate wanneer elke node ad-hoc geïmplementeerd wordt**, I decided **een gedeelde agent-architectuur te adopteren op basis van Anthropic tool-use pattern + versioned `StrategyObservation` Prisma-model + immutable `DataSnapshot` input-laag + no-autonomy-in-stub principe vanaf de eerste node** to achieve **plug-and-play uitbreidbaarheid voor toekomstige nodes plus reproduceerbaarheid van past observations plus drift-detection van agent-prompt veranderingen**, accepting tradeoff **dat de initial Strategy Analyst-stub ~3-4 weken kost in plaats van ~3-5 dagen voor een view-laag (factor 6-8x delta)**.

# Consequences

## Positief
- **Shared tool-orchestrator pattern** hergebruikt door alle 4 nodes (Strategy Analyst → Campaign Builder → Measurement → Optimization). Geen herwerking per node-launch; nieuwe tools worden geregistreerd in één plek
- **Versioned observations** (`StrategyObservation.agentVersion` + `.promptVersion`) maken **drift-detection** mogelijk en **A/B-testing van prompt-changes** zinvol over tijd
- **Immutable `DataSnapshot`** maakt past observations **reproduceerbaar**: audit-trail wanneer Better Brands vraagt waarom Analyst suggereerde X drie maanden geleden — DataSnapshot-rows tonen exact welke alignment + fidelity + review-data input was
- **No-autonomy-in-stub** elimineert **operational-risk vroegtijdig**: Strategy Analyst suggereert, mens beslist, geen AI maakt destructieve acties op klantdata. Autonomy-gate komt pas in maand 10-12 wanneer Optimization-node landt
- **Anthropic tool-use is industry-standard pattern** — low lock-in, makkelijk te porteren naar andere providers indien ooit nodig (OpenAI Function calling-equivalent of Mistral tool-use)
- **Tool-use is bekend bij Branddock-team** (Claw gebruikt het al met 30+ tools) — geen leercurve voor nieuwe nodes
- **Cross-node tool-sharing**: Campaign Builder kan straks `query_strategy_observations` tool gebruiken om Strategy Analyst-output te consumeren — hierdoor worden nodes echt ge-chained zonder ad-hoc data-doorgifte
- **Confidence-flag baked-in** (methodology §11 two-reasons-toets): elke observation heeft `confidence: HIGH/MEDIUM/LOW` met evidence-array; UI kan low-confidence-observations filteren of expliciet als zodanig labelen

## Negatief / tradeoffs
- **Initial Strategy Analyst-stub ~3-4 weken** vs ~3-5 dagen view-laag — significant delta (factor 6-8x). Volgende drie nodes worden weer goedkoper omdat de architectuur staat, maar de eerste investering is hoger dan een ad-hoc view
- **Complexity-overhead voor stub**: tool-orchestrator + observation-model + snapshot-discipline ook al heeft Analyst nu maar 1 node-type. Onnodig voor view-only-use-case
- **`brandclaw-data-collection`** moet eerst landen als foundation (5-7 dagen extra) vs. view-laag die direct uit live tables kan lezen. Kritiek-pad-impact op Phase 3 timing
- **Future-proof claim is alleen waar als Campaign Builder + Measurement écht maand 5-9 landen** — als die schuiven door post-launch prioriteit-wijzigingen, was deze architectuur-overhead grotendeels gratuit. Risico geaccepteerd op basis van product-roadmap-commitment
- **DB-grootte impact**: DataSnapshot-tabel bewaart immutable-copies van source-data; bij hoge run-frequentie kan dit snel groeien. Mitigatie via retention-policy (zie Notes — mogelijke retention-ADR later)
- **Cost-overhead per run**: Anthropic tool-use met 4 query-tools betekent meerdere API-calls per Analyst-run. `StrategyObservationRun.totalCostUsd` houdt dit bij — observability-laag voor cost-tuning later

## Neutraal / mitigaties
- **Tool-use pattern is bekend bij Branddock-team** (Claw gebruikt het al) — geen leercurve, geen training-overhead
- **Versioned observations + snapshots = klein extra schema-werk**, geen runtime-cost-multiplier (database-writes zijn marginaal vs. de Anthropic-API-call-cost die altijd dominant is)
- **No-autonomy in stub = veiligste startpunt**; autonomy-gate toegevoegd in maand 10-12 wanneer Optimization-node komt — geen rush, ruimte voor user-research op trust-modellen
- **Schema is volledig additief** — geen wijzigingen aan bestaande Branddock-modellen. Migratie risk-arm; kan ook bij weer-uitwerken in losse PRs gepushed worden

# Alternatives considered

## Alt A — View-laag (read-only data aggregatie, geen agent, geen tool-use)

Een dunne UI-laag die `AlignmentScan` + `ContentFidelityScore` + `ContentReviewLog` aggregeert in een dashboard, met of zonder een enkele Anthropic-call die de aggregatie samenvat. Geschatte effort: ~3-5 dagen.

**Afgewezen** omdat:
- Elke future Brandclaw-node (Campaign Builder, Measurement, Optimization) zou eigen architectuur moeten bouwen — drift onvermijdelijk
- Reproduceerbaarheid van past suggesties niet gegarandeerd (live data muteert tussen viewing-momenten)
- Cross-node tool-sharing onmogelijk — Campaign Builder kan niet "query Analyst's observations" zonder elke keer een nieuwe view-aggregator te maken
- Confidence-flag + evidence-tracking ontbreekt — methodology §11 two-reasons-toets is niet toepasbaar op aggregatie zonder reasoning-laag
- Investering wordt opnieuw gedaan bij elke node-launch — totaal 4× herbouw vs. één keer goed

## Alt C — Single monolithic Brandclaw-service met internal routing per node-type

Eén Brandclaw-microservice die alle node-types (Analyst/Builder/Measurement/Optimization) intern dispatcht via een type-veld. Shared in-process state.

**Afgewezen** omdat:
- Koppelt nodes — één team kan slechts één node tegelijk evolueren zonder service-wide deployment-risk
- Multi-tenant-isolation moeilijker — alle nodes delen DB-connection-pool, prompt-budget, etc.
- Schema-wijzigingen per node forceren service-wide migrations
- Niet consistent met Branddock's huidige Next.js/Prisma-patroon van per-feature-domain modules
- Geen klaar-voor-toekomst-skaling: als Brandclaw ooit naar eigen worker-pool moet (cron-driven Measurement runs), is monolithic harder te splitsen

## Alt D — External orchestrator (LangGraph / Pydantic-AI / Mastra / vergelijkbaar)

Adopteer een third-party agent-orchestratie-framework dat tool-use, state-management, en multi-node-routing out-of-the-box biedt.

**Afgewezen** omdat:
- Runtime-dependency op upstream framework — Branddock's deployment + monitoring + error-recovery moeten plotseling framework-quirks accommoderen
- Team-team-koppeling met framework-roadmap — feature-velocity gekoppeld aan upstream-release-cadans
- Lock-in risico — elk framework heeft proprietary state-shapes, prompt-conventions, tool-definition-API's
- Framework-prompts kunnen conflicteren met Branddock's bestaande prompt-conventions (zie Claw's mature prompt-builders) — duplicate prompt-laag
- Tool-use direct via Anthropic SDK is goed gedocumenteerd, stable, en doet alles wat Brandclaw nodes nodig hebben — geen unmet need

## Alt E — Per-node ad-hoc architectuur

Bouw Strategy Analyst nu als view-layer; bouw Campaign Builder later met tool-use; bouw Measurement weer anders. Pragma per node-launch.

**Afgewezen** omdat:
- Drift gegarandeerd — geen shared learning, geen pattern-consistentie
- Herwerking elke node-launch — tool-orchestrator wordt minimaal twee keer gebouwd, observation-shapes drie keer gemigreerd
- UI-developer moet voor elke nieuwe node opnieuw integration-pattern leren
- Audit-trail is gefragmenteerd — past Strategy Analyst-suggesties niet vergelijkbaar met past Campaign Builder-suggestions
- Geen voordeel ten opzichte van Alt B — de "snelle eerste node"-claim wordt ondergraven door de herwerk-kosten in nodes 2-4

# Notes

- **Cross-references**:
  - `tasks/_drafts/idea-brand-control-program.md` (sectie "Most-robust Strategy Analyst — architectuur-schets") — programma-context, verbroederd in deze ADR
  - ADR `2026-05-08-fval-output-schema-bevindingen` — `BrandReviewFinding` is downstream consumer voor Analyst observations
  - ADR `2026-05-08-locale-routing-brand-voice` — `BrandVoiceguide.contentLocale` maakt Analyst observations locale-bewust
  - `roadmap.md` Brandclaw-transformatie sectie — node-roadmap maand 5-12

- **Implementation-volgorde** (uit BCP Phase 3 task-files, te schrijven via technical-planner):
  1. `brandclaw-data-collection` — DataSource registry + DataSnapshot model + time-window queries (5-7d, foundation)
  2. `brandclaw-tool-orchestrator` — gedeelde Anthropic tool-use wrapper in `src/lib/brandclaw/` (3-5d, herbruikbaar voor alle nodes)
  3. `strategy-analyst-stub` — eerste Brandclaw-node consumeert orchestrator + DataSnapshot + Δ-1/2/3 outputs (15-20d)

- **Migratie-pad**:
  1. Prisma-migration `add_brandclaw_data_layer` (additief: DataSnapshot + StrategyObservation + StrategyObservationRun + Confidence enum)
  2. Geen backfill nodig — DataSnapshot vult zich vanaf eerste run; observations zijn forward-only
  3. Tool-orchestrator deployt zonder UI wijzigingen — UI Tab 4 "Insights" landt in Strategy Analyst-stub task

- **Validation-aanpak**: na Strategy Analyst-stub ship, monitor voor 30 dagen op Better Brands:
  - Cost-per-run < $0.50 acceptable, > $1.00 trigger voor prompt-trim
  - Latency p95 < 60s acceptable
  - Suggestion-quality (founder-handmatig-rated) ≥ 60% "useful" — anders prompt-iteratie ronde 2

- **Out-of-scope voor deze ADR**:
  - Hoe de specifieke prompts voor Strategy Analyst geschreven worden — implementatie-detail in `strategy-analyst-stub` task-file
  - UI-design van Tab 4 "Insights" — komt later in design-iteratie
  - Cron-schedule voor scheduled runs — apart op te lossen wanneer Measurement node landt (`brandclaw-measurement-eval` ADR voor cron-infra)
  - Multi-workspace concurrent run-orchestratie — Strategy Analyst v1 is workspace-isolated (één run per workspace tegelijkertijd)
  - Cost-budget enforcement per workspace — observability via `StrategyObservationRun.totalCostUsd` is voldoende voor v1; rate-limiting wordt added wanneer pilot >5 workspaces draait

- **Future-proof claim — concreet getest in node 2-4**: deze architectuur-keuze claimt plug-and-play extension. Bij elke volgende node-launch verifieer:
  - Hergebruikt het tool-orchestrator zonder wijzigingen? (verwacht: ja)
  - Heeft de observation-shape genoeg flexibiliteit voor de nieuwe node? (verwacht: dimension-string is generiek genoeg)
  - Wordt DataSnapshot daadwerkelijk hergebruikt of is point-in-time-input voor de nieuwe node anders gestructureerd? (te valideren bij Measurement-node)

- **Mogelijke retention-ADR later**: wanneer DataSnapshot >100k rijen per workspace bereikt, of wanneer privacy-incident dwingt tot kortere bewaartermijn → eigen ADR voor retention-policy + cron-cleanup. Niet nu beslissen — observability eerst.

- **Replaceable**: deze ADR kan superseded worden indien:
  - Anthropic tool-use deprecates of gelimiteerd wordt — vervangen door alternative provider
  - Externe orchestrator framework volwassen genoeg wordt zonder lock-in (waarschijnlijk niet binnen 24 maanden)
  - Per-node ad-hoc blijkt empirisch beter werken (zou vereisen dat Campaign Builder + Measurement landen en architectuur zwakte aantonen)
