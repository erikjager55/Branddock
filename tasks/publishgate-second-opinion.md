---
id: publishgate-second-opinion
title: Δ-4 PublishGate second-opinion — onafhankelijke Anthropic-call naast F-VAL composite
fase: post-launch
priority: later
effort: 3-4 dagen
owner: claude-code
status: open
created: 2026-05-08
completed: -
related-adr: 2026-05-08-fval-output-schema-bevindingen
related-spec: tasks/_drafts/idea-brand-control-program.md
worktree: branddock-program-p2
---

> **Status-sync 2026-07-08**: `fase` pre-launch → **post-launch**, `priority` now → **later**. De frontmatter stond nog op de aanmaak-stand (2026-05-08); het roadmap-besluit van 2026-05-12 verplaatste Δ-4 naar post-launch (geen pilot-evidence dat F-VAL gaten heeft die een 2nd-opinion vangt). Nu consistent met roadmap Post-launch-tabel (`delta-4-publishgate-2nd-opinion`).

# Probleem

PublishGate vandaag vertrouwt op één numeriek signaal: F-VAL composite-score. Methodology §11 (twee-redenen-toets + conservatieve neiging) en §9 (sub-agent second-opinion) stellen dat een single signal blind-spots heeft die alleen een onafhankelijke beoordelaar vangt. Branddock past dit pattern al toe op code (`task-finalize` skill: 2 parallelle code-reviewer subagents). Voor content geldt hetzelfde — de F-VAL judge ziet bepaalde issues maar niet alle.

Concreet: F-VAL judge wordt gevoed met brand-context, persona, strategy summaries plus de detector-result. Als de judge bepaalde dimensies onderbevraagt (bijv. brand-narrative-misfit die niet in style-rubric scoort), gaat content door de gate ondanks afwijking. Een tweede reviewer-call zonder F-VAL-score-context zou een onafhankelijk oordeel leveren; verschillen tussen beide = expliciet signaal voor menselijke review.

# Voorstel

Tweede Anthropic-call in PublishGate-flow met een onafhankelijke reviewer-prompt (niet de F-VAL judge-prompt). De second-opinion krijgt content + brand-context maar **geen** F-VAL-score-context — voorkomt anchoring-bias. Output: dezelfde `BrandReviewFinding[]` shape als F-VAL judge (consistent met ADR-1).

Vergelijking: lijst overlappende findings (beide flagging zelfde issue) + lijst F-VAL-only + lijst second-opinion-only. UI in PublishGate toont:
- Composite-score gate (bestaand)
- Bevindingen-tabel uit F-VAL (ADR-1, gewired in Δ-1)
- **Second-opinion-vlag** met N findings die F-VAL miste — expliciete attention-grabber

Audit-trail: `PublishGateOverride` Prisma-model bewaart user-decision wanneer ze publishen ondanks gate-failure of second-opinion-disagreement. Strategy Analyst (Phase 3) consumeert dit als signaal voor content-quality-trends.

# Acceptatiecriteria

## Second-opinion runner
- [ ] `src/lib/brand-fidelity/second-opinion-runner.ts` (nieuw) — pure functie `runSecondOpinion(content, brandContext): Promise<BrandReviewFinding[]>`
- [ ] Anthropic-call met independent reviewer-prompt template (in `src/lib/brand-fidelity/prompts/second-opinion-prompt.ts`)
- [ ] Reviewer-prompt vraagt zelfde dimensies als F-VAL judge (voice/terminology/claims/style/business) maar **geen** F-VAL-score, **geen** rubric-weights gegeven
- [ ] Output schema: zelfde `BrandReviewFinding` interface als ADR-1 (location + severity + category + description + suggestion + evidence)
- [ ] Cost-budget: 1 Anthropic-call per publish; geschat ~$0.005-0.015 per call

## Comparison logic
- [ ] `src/lib/brand-fidelity/finding-comparator.ts` (nieuw) — pure functie `compareFindings(fvalFindings, secondOpinionFindings): FindingComparison`
- [ ] Output: `{ overlapping: BrandReviewFinding[], fvalOnly: BrandReviewFinding[], secondOpinionOnly: BrandReviewFinding[] }`
- [ ] Overlap-detection: similarity via location + category match (geen string-comparison op description — te brittle)
- [ ] Severity-aggregatie: overlap-finding = max(fval.severity, secondOpinion.severity)

## PublishGate UI
- [ ] PublishGate component toont second-opinion-vlag wanneer `secondOpinionOnly.length > 0`
- [ ] Visual: amber/red indicator naast composite-score; click reveals second-opinion-only findings
- [ ] "Override" knop nu loggt expliciet welke vlaggen genegeerd worden
- [ ] Inline-edit-suggestie via `canvas-inline-edit-overlays` task (synergistic — apply suggestion direct)

## Audit-trail
- [ ] Prisma-model `PublishGateOverride { id, workspaceId, userId, contentVersionId, fidelityScoreId, secondOpinionFindingsJson, overrideReason?, overrodeFvalGate, overrodeSecondOpinion, createdAt }`
- [ ] Op publish-action: bewaar override-decision wanneer score < threshold OF secondOpinionOnly > 0
- [ ] Strategy Analyst (Phase 3) consumeert via `query_publish_gate_overrides` tool

## Performance + cost
- [ ] Second-opinion run is conditional: alleen wanneer F-VAL composite ≥ threshold (groene gate) — voorkomt double-call wanneer F-VAL al rood
- [ ] Of altijd run voor full audit-trail? Beslispunt: configurable via FidelityConfig.alwaysRunSecondOpinion (default `true` voor pilot, kan naar `false` post-pilot om kosten te trimmen)
- [ ] Latency: second-opinion parallel met F-VAL judge waar mogelijk; sequentieel wanneer judge-output nodig is voor anchor-comparison
- [ ] Cost-tracking: PostHog event `publish_gate_second_opinion_run` met cost + latency

## Quality gates
- [ ] `npx tsc --noEmit` 0 errors + `npm run lint` 0 errors
- [ ] Smoke-test: BB content met bekende brand-narrative-misfit → F-VAL passes (score 80) maar second-opinion flags narrative drift → vlag visible
- [ ] Smoke-test: clean BB content → both reviewers agree → no second-opinion-vlag
- [ ] Smoke-test: F-VAL fails (score 60) → second-opinion skipped (conditional run); UI toont alleen F-VAL bevindingen
- [ ] Cost-impact verified: ≤2× pre-Δ-4 cost per publish

# Bestanden die ik aanraak

## Schema
- `prisma/schema.prisma` — `PublishGateOverride` model + relations naar User + ContentVersion + ContentFidelityScore
- `prisma/migrations/<timestamp>_add_publish_gate_override/migration.sql` — additief

## Engine
- `src/lib/brand-fidelity/second-opinion-runner.ts` (nieuw)
- `src/lib/brand-fidelity/prompts/second-opinion-prompt.ts` (nieuw) — independent reviewer prompt template
- `src/lib/brand-fidelity/finding-comparator.ts` (nieuw)
- `src/lib/brand-fidelity/composition-engine.ts` — extend om second-opinion in PublishGate-context te triggeren
- `src/lib/brand-fidelity/fidelity-config.ts` — `alwaysRunSecondOpinion: boolean` veld

## UI
- `src/features/campaigns/components/canvas/PublishGate.tsx` — second-opinion-vlag + override-flow
- `src/features/campaigns/components/canvas/PublishGateOverrideDialog.tsx` (nieuw) — confirmatie + reason-input

## Backend
- `src/app/api/campaigns/[id]/deliverables/[deliverableId]/publish-gate-override/route.ts` (nieuw) — POST audit-trail persistence
- `src/app/api/campaigns/[id]/deliverables/[deliverableId]/run-second-opinion/route.ts` (nieuw) — explicit-trigger endpoint (default automatic, manual rerun-pad)

# Bestanden die ik NIET aanraak

- F-VAL Pijler 1/2/3 engine — onaangeraakt; second-opinion is parallel review-pad
- BrandReviewFinding schema — al gelocked via ADR-1; second-opinion produceert zelfde shape
- Δ-1 review-output-flow — second-opinion is publish-gate specifiek, niet voor algemene reviews
- Studio generation-flow — onaangeraakt; second-opinion is publish-gate-only

# Smoke test plan

1. **BB clean content**: F-VAL composite 90 + clean second-opinion → no vlag, gate green
2. **BB narrative-drift content**: F-VAL passes (score 80) maar second-opinion flags 3 issues → vlag visible naast score, click reveals findings, override-pad logged
3. **F-VAL red gate**: composite 60 → second-opinion skipped (conditional default) → UI toont F-VAL findings, no second-opinion section
4. **Always-run config**: zet alwaysRunSecondOpinion=true → ook bij red gate runt second-opinion → audit-trail gevuld
5. **Override pad**: user publisht ondanks vlag → PublishGateOverride row aangemaakt met overrodeFvalGate=false + overrodeSecondOpinion=true
6. **Cost-impact**: meet 10 publish-runs pre/post Δ-4 → cost-ratio ≤2× (1 extra Anthropic-call per publish)
7. **Latency**: p95 PublishGate render + run ≤8s (was 5s pre-Δ-4)
8. **Strategy Analyst consume**: in Phase 3 stub, query_publish_gate_overrides returns rows met expected shape
9. **TSC + lint**: 0 errors

# Risico's

- **Cost-doubling per publish** (medium): elke publish = 2 Anthropic-calls (F-VAL judge + second-opinion). Mitigatie: conditional run (skip wanneer F-VAL al rood); FidelityConfig.alwaysRunSecondOpinion default `true` voor pilot, configurable
- **Second-opinion-prompt drift** (medium): zonder ADR-vergrendelde prompt-versie kan second-opinion judge-eigenwijze ontwikkelen. Mitigatie: prompt-versie gestempeld op output (consistent met ADR-2 versioned-observations pattern)
- **Latency-impact** (laag-medium): sequentieel run = +3-5s per publish. Mitigatie: parallel execution (F-VAL judge + second-opinion in `Promise.all`); accept p95 ≤8s
- **False-positive overload** (medium): second-opinion kan veel low-severity findings raisen die niet kritiek zijn. Mitigatie: severity-filter in vlag (alleen MEDIUM+ zichtbaar als attention-grabber); LOW vrij-toegankelijk in expand-detail
- **Anchoring-bias na pilot** (laag): user gewend aan vlag → publisht zonder kritisch te lezen. Mitigatie: alle override-besluiten in audit-trail; periodieke review van high-override-frequency-workspaces
- **F-VAL ↔ second-opinion overlap-detection brittle** (laag-medium): location-string match kan failen bij paragraaf-rotation. Mitigatie: category + severity match heuristiek + char-offset range (when available); accepteer enige duplicates in display

# Out of scope

- **Multi-judge ensemble** (3+ reviewers met voting) — second-opinion is one extra reviewer, geen ensemble
- **Cross-workspace benchmark voor second-opinion** — `cross-workspace-benchmarks` LATER
- **Auto-rewrite bij second-opinion-disagreement** — second-opinion vlagt; user-action blijft handmatig in v1
- **Per-content-type tuning van second-opinion-prompt** — single prompt v1; specialization in iteratie 2
- **Real-time second-opinion tijdens generation** — alleen op publish-gate trigger; niet op iedere preview
- **A/B testing van second-opinion-on/off** — measurement requires production-data; out v1
- **Strategy Analyst directe consume tijdens review** — Phase 3 leest historisch via query_publish_gate_overrides, niet real-time

# Notes

Methodology-bron: §9 "Welke tools en agents ik gebruik" — sub-agent second-opinion pattern. §11 "Quality controls" — twee-redenen-toets + conservatieve neiging. Branddock past dit al toe in `task-finalize` skill voor code-reviews; Δ-4 brengt zelfde principe naar content.

Synergistic met `canvas-inline-edit-overlays` task (Phase 2): inline-edit pattern verbetert apply-suggestion UX wanneer second-opinion-vlag findings vrijgeeft. Niet hard-blocking.

Strategy Analyst (Phase 3) consumeert PublishGateOverride als input dimensie voor "publish-quality-trends" observation — bijv. detect dat workspace X 80%+ second-opinion-vlaggen overrided → trend-signal voor content-team coaching.

Cost-tuning na 30-dagen-pilot: monitor PostHog event `publish_gate_second_opinion_run` cost-aggregatie. Als cost > $5/workspace/maand: switch naar conditional-only (skip wanneer F-VAL groen) = halved kosten met behoud audit-trail-pad voor red gates.

Implementation-volgorde:
1. Second-opinion-runner + prompt template (1d)
2. Finding-comparator + tests (0.5d)
3. PublishGateOverride model + persistence (0.5d)
4. PublishGate UI met second-opinion-vlag (1d)
5. Override-dialog + audit-trail (0.5d)
6. Smoke-test + cost-measurement (0.5d)

Parallel-uitvoer met andere Phase 2 tasks geen probleem — verschillende files, gemeenschappelijke F-VAL leesbasis.
