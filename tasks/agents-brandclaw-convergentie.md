---
id: agents-brandclaw-convergentie
title: Agents Fase 3 — Brandclaw-convergentie (epic): Strategy Analyst naar catalogus, 3 NodeTypes als agents, autonomie-schuif, cost-budget-alerts
fase: post-launch
priority: later
effort: multi-maand (epic — go/no-go-gated, splitst in sub-tasks)
owner: claude-code
status: blocked
created: 2026-07-05
completed: -
related-adr: docs/adr/2026-07-05-agents-architectuur.md
related-spec: tasks/_drafts/idea-agents-feature.md
worktree: -
---

> **Go/no-go-gate (blocked tot expliciet besluit)**: dit epic start pas na pilot-data uit Fase 1/2 — concreet: (1) de primaire metric uit het idea-doc gehaald of beredeneerd bijgesteld (≥3 van 4 pilot-workspaces draait wekelijks ≥3 geaccepteerde agent-runs binnen 30 dagen na Fase-1-livegang), (2) kosten-per-run-data uit de instrumentatie onderbouwt dat autonomere runs binnen de vaste maandprijs passen (aanname A7), en (3) een bewust besluit om de no-autonomy-regel uit ADR 2026-05-08 te herzien. Zonder die drie: niet bouwen — dit is exact het Gartner/Deloitte-faalpad (autonomie vóór bewezen waarde).

# Probleem

Na Fase 1/2 bestaan twee surfaces op één motor: de Agents-catalogus (user-facing, on-demand/scheduled) en de Strategy Analyst (verstopt in Brand Alignment, eigen observations-pad). De al besloten Brandclaw-transformatie (Optie B, post-launch) — `campaign_builder`, `measurement_eval` en `optimization` als autonome loop — heeft nog geen adoptiepad en de drie NodeTypes bestaan alleen als enum-leden in `src/lib/brandclaw/orchestrator/types.ts`. Convergentie maakt van Brandclaw geen tweede product maar een autonomie-trap bovenop de bestaande catalogus (ADR D7).

# Voorstel

Epic-tracker, zelfde patroon als `multi-market-transcreation-enterprise`: sub-items hieronder worden elk een eigen task-file zodra de go/no-go genomen is en het item concreet wordt. Richtinggevende inhoud (volgorde = afhankelijkheid):

1. **Strategy Analyst → catalogus**: verhuizing van Brand Alignment Tab naar een agent-definitie op het generieke output-contract; observations-adapter blijft bestaan voor historie, nieuwe runs persisteren óók `AgentRun` (of volledig gemigreerd — beslissen in sub-task-ADR). Raakt `src/lib/brandclaw/nodes/strategy-analyst/**`, `src/app/api/brandclaw/strategy-analyst/run/route.ts`, Brand Alignment-UI.
2. **`campaign_builder` / `measurement_eval` / `optimization` als agents**: nieuwe agent-definities + benodigde tools op dezelfde registry — dit ÍS de Brandclaw-transformatie met een gezicht. Per node een eigen sub-task + waarschijnlijk eigen ADR (nieuwe motoren, geen dunne configs).
3. **Autonomie-schuif per agent** (assisted → scheduled → autopilot-met-approval-gates): per workspace-agent een autonomie-niveau; autopilot alleen met approval-gates op alle writes en een kill-switch. Vereist herziening van de no-autonomy-regel (expliciete ADR-supersede van dat deel van 2026-05-08).
4. **Per-workspace cost-budget-bewaking**: budget-model + alerts + hard-stop op agent-runs bij overschrijding (Deloitte-faalmodus); consumeert de instrumentatie die vanaf Fase-1-dag-1 loopt.

# Acceptatiecriteria

- [ ] Go/no-go-besluit gedocumenteerd (met de drie gate-datapunten) vóór enige sub-task start.
- [ ] Elk sub-item heeft bij start een eigen task-file (en waar nieuw motorwerk of autonomie-herziening speelt: een eigen ADR) — dit epic-bestand wordt tracker, geen werk-file.
- [ ] Strategy Analyst draait vanuit de catalogus zonder verlies van bestaande observations-historie in Brand Alignment.
- [ ] Autonomie-schuif kan nooit een write uitvoeren zonder approval-gate zolang de betreffende workspace dat niveau niet expliciet heeft aangezet.
- [ ] Budget-overschrijding stopt nieuwe runs aantoonbaar en alert de workspace-owner.
- [ ] `npx tsc --noEmit` 0 errors · `npm run lint` 0 errors · Smoke per sub-task · Documentatie bijgewerkt

# Bestanden die ik aanraak

(Indicatief — definitief per sub-task:)
- `src/lib/brandclaw/nodes/strategy-analyst/**` + `src/app/api/brandclaw/strategy-analyst/run/route.ts` + Brand Alignment-tab-UI (item 1)
- `src/lib/agents/registry/definitions/` — nieuwe agent-definities (items 1-2)
- `src/lib/brandclaw/orchestrator/types.ts` — NodeType-convergentie met agent-ids (item 2)
- `prisma/schema.prisma` — autonomie-niveau per workspace-agent + budget-model (items 3-4; Neon-push-note geldt)
- `src/features/agents/` — autonomie-UI, budget-UI

# Bestanden die ik NIET aanraak

- Fase-1/2-oplevering wordt niet "alvast voorbereid" op deze fase — geen speculatieve seams, geen dead flags (Anti-Abstraction: de convergentie is een migratie op het moment zelf).

# Smoke test plan

Per sub-task bij afsplitsing. Epic-niveau minimum: na item 1 draait de bestaande Strategy-Analyst-flow (Brand Alignment) regressievrij of is hij bewust vervangen met migratie-note in de changelog.

# Risico's

- **Autonomie vóór bewezen waarde** — de gate is de mitigatie; dit epic blijft `blocked` tot de drie datapunten er zijn.
- Convergentie-refactor raakt het oudste productie-pad van de loop (Strategy Analyst) → item 1 eerst en geïsoleerd, met dezelfde baseline-vergelijkings-discipline als de A1-spike in `agents-foundation`.
- Scope-magneet: "als we tóch bezig zijn" (marketplace, custom builder) — beide blijven expliciet buiten elk plan-horizon (idea-doc).

# Out of scope

- Custom agent-builder (user maakt eigen agents) — geen enkel plan-horizon; curated blijft het model.
- Agent-marketplace / >catalogus-uitbreiding zonder pilot-vraag.
- Usage-/credit-pricing — pricing-besluit staat vast (vaste maandprijs; merkcontext + F-VAL nooit meteren); een metering-heroverweging is een apart pricing-traject bij `stripe-billing-live`, niet dit epic.
- Externe kanaal-publicatie (Channel Activation) — eigen roadmap-lijn.

# Notes

- Patroon: `multi-market-transcreation-enterprise` (epic, `blocked`, splitst per sub-item na go/no-go).
- Dependencies: `agents-foundation` + `agents-motor-wiring` + `agents-ui-inbox` done; `agents-scheduling` done (autonomie-trap 2 moet bewezen draaien vóór trap 3); pilot-metrics + kosten-data beschikbaar; ADR-herziening no-autonomy (deel van 2026-05-08) voor item 3.
- ADR-verwachting: items 2 en 3 vereisen elk een nieuwe ADR (motor-nieuwbouw resp. autonomie-model); item 1 kan binnen de bestaande agents-architectuur-ADR mits de observations-migratie-keuze daar als aanvulling wordt genoteerd.

## Herijking 2026-07-18 — BC-fasering (P3.6) + BC-1-go

> Bron: `docs/reports/p36-brandclaw-herijking-2026-07-17.md` · Eriks go 2026-07-18 ("ga door met brandclaw bc-1-go"). Het rapport vervangt dit epic niet; het herijkt de volgorde: Brandclaw is na de P3-lijn (headless services + webhooks + agents + F-VAL headless) geen bouwproject meer maar een orkestratie-project.

- **BC-1 — Draadloze loop met mens-goedkeuring**: ✅ gestart als eigen task `tasks/bc1-loop-pilot.md` (Loop-pilot-agent "Bo" op de bestaande registry + AgentSchedule; propose-only, alles door de confirm-flow). BC-1 raakt de go/no-go-gate hierboven níét: geen autonomie-herziening, geen writes zonder approval — het is autonomie-trap 2 (scheduled) op de bestaande motor.
- **BC-2 — Goedgekeurd = gepubliceerd** (na P3.5-kanaal + credentials): accept van een loop-proposal triggert de publish-keten; autonomie-tier per workspace `suggest` | `auto_publish_approved`. Valt onder item 3-territorium → eigen task + ADR bij start.
- **BC-3 — Bounded autonomy**: blijft achter de bestaande gate hierboven; go-criteria uit het P3.6-rapport (BC-2 ≥4 wk incident-vrij bij ≥2 workspaces, F-VAL-drempels gekalibreerd, metering gevalideerd, kill-switch getest) vullen de drie gate-datapunten concreet in.
- Eerste pilot-scope BC-1 (rapport, open punt 3): wekelijks, alleen Better Brands, alleen linkedin-post + blog-post.

## Reconciliatie 2026-07-06 — Phase C-items + LATER-roadmap hier belegd

> User-directive 2026-07-06. Volledige mapping: `tasks/done/strategy-analyst-stub.md` (reconciliatie-blok).

- **Item 1 (Strategy Analyst → catalogus) erft uit Phase C**: de weekly-schedule (`AgentSchedule`-rij i.p.v. bespoke cron), de UI-smoke van Brand Alignment Tab 5, en de unit-test-overweging voor de dimension-fragmenten.
- **Item 4 (cost-budget-bewaking) erft de Phase-C-spec**: >$10/workspace/maand → PostHog-alert; consumeert de per-run cost-instrumentatie die sinds `agents-foundation` (2026-07-06) live is (`AgentRun.totalCostUsd` + `agent_run_completed`-events).
- **LATER-roadmap-tabel "Brandclaw transformatie (Optie B)"** (`brandclaw-campaign-builder`/`-measurement-eval`/`-optimization`, maand 5-12 post-launch) is volledig door dit epic geabsorbeerd (sub-items 2-3 + autonomie-schuif); supersede-note staat in roadmap §LATER.
