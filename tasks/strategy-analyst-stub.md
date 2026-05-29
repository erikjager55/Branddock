---
id: strategy-analyst-stub
title: Strategy Analyst stub — eerste Brandclaw-node (read + suggest, no autonomy)
fase: pre-launch
priority: now
effort: 15-20 dagen
owner: claude-code
status: in-progress
phase-status: Phase A+B gemerged (#260-262); Phase C open (Vercel Cron + concurrency-cap + cost-budget alerts + BB pilot smoke) — sequential dep op vercel-deployment
created: 2026-05-08
completed: -
related-adr: 2026-05-08-brandclaw-agent-architectuur, 2026-05-08-fval-output-schema-bevindingen, 2026-05-08-locale-routing-brand-voice
related-spec: tasks/_drafts/idea-brand-control-program.md
worktree: branddock-brandclaw
sub-phases: A-foundation, B-dimensions-persistence, C-cron-polish
---

# Sub-phasing

Originele taak 20-27d. Sub-gefaseerd 2026-05-12 in 3 commit-bare chunks. Track B werkt sequentieel: A → B → C. Elke fase eindigt met eigen review-loop + commit + changelog-entry; geen mid-fase merges naar main.

| Phase | Scope | Effort | Status |
|---|---|---|---|
| **A — Foundation** ✅ | Node skeleton + system-prompt scaffold + 1 dimension (voice_drift) + manual trigger via UI Tab 5 + observations CRUD-actions | 5-7d | **DONE** 2026-05-17/18. Commits `b25a3763` (Phase A backend) + `8f09d2e3` (Phase A UI vervolg) |
| **B — Dimensions + Persistence** ✅ | 4 extra dimensions (fidelity_decline / review_pattern / alignment_gap / publish_quality_trend) + agentVersion bump 0.2.0 + UI sort/group toggle | 7-10d | **DONE** 2026-05-17/18. Commit `58094f8e` (+ hotfix `d488298c` voor Anthropic model-ID). Real-API smoke 17/17 pass tegen Demo workspace |
| **C — Cron + Polish** | Vercel Cron weekly trigger + per-workspace concurrency-cap + cost-budget alerts + monitoring + BB pilot smoke met productie-data | 5-7d | **OPEN** — start volgende sessie op clean `main` (Phase A + B gemerged via `a0e59a5b` 2026-05-18) |

**Volgorde-discipline**: elke phase een eigen branch op `branddock-brandclaw` worktree (`track/brandclaw-phase-a` etc.), gemerged naar `track/brandclaw` na review-loop clean. Na alle 3 fases klaar: PR `track/brandclaw` → `main`.

# Probleem

Brandclaw-roadmap startt met de Strategy Analyst — observeert AlignmentScan-historie + ContentFidelityScore-trends + ContentReviewLog-patroon + voiceguide-drift en suggereert strategy-moves zonder autonomy. Vandaag bestaat geen consumer die deze drie+ data-bronnen samenleest en kwalitatieve observations produceert. Founder (Better Brands content-strateeg-rol) doet dit handmatig in spreadsheets en gut-feel.

ADR-2 vergrendelt agent-architectuur (tool-use + versioned observations + immutable snapshots + no-autonomy-in-stub). De foundation (`brandclaw-data-collection` data-laag + `brandclaw-tool-orchestrator` agent-loop) staat klaar (parallel-track Phase 3 onderdelen 1+2). Strategy Analyst is de eerste node die deze foundation consumeert + de eerste UI-surface ("Insights" Tab 4 in Brand Alignment).

Doel: read-only suggestions met severity + confidence + evidence-trail. Mens beslist, agent observeert. Foundation voor toekomstige Campaign Builder / Measurement / Optimization nodes — hergebruik orchestrator + data-sources, eigen prompt + dimensions.

# Voorstel

Strategy Analyst-stub als eerste Brandclaw-node bouwen op gevergrendelde foundation:

1. **System-prompt** met scaffolding "two-reasons-test" (methodology §11) — observation requires ≥2 evidence-points anders skip
2. **4 query-tools** (al gedefinieerd in `brandclaw-tool-orchestrator` task): query_alignment_history, query_content_fidelity, query_review_history, query_brand_voice_drift
3. **5 observation-dimensions**: voice_drift / fidelity_decline / review_pattern / alignment_gap / publish_quality_trend
4. **Trigger-paden**: manual ("Run Analyst" knop), scheduled (cron `0 9 * * 1` weekly Monday 9am), event-driven (na N+ ContentReviewLog entries) — v1 alleen manual + scheduled
5. **UI Tab 4 "Insights"** in Brand Alignment — read-only observations met dismissed/acted-upon flags + filter/sort/group
6. **Consumer voor Δ-3 voice 1-pager**: gebruikt zelfde derivation-types als F-VAL judge — single source of truth voor "wat is brand baseline"

# Acceptatiecriteria

## Analyst node implementation
- [x] `src/lib/brandclaw/nodes/strategy-analyst/index.ts` — public API: `runStrategyAnalyst(workspaceId, triggerType, triggerSource?): Promise<{run, observations}>` (Phase A, commit `b25a3763`)
- [x] `src/lib/brandclaw/nodes/strategy-analyst/system-prompt.ts` — versioned prompt met methodology §11 two-reasons-test scaffold (Phase A; bump 0.1.0 → 0.2.0 in Phase B commit `58094f8e`)
- [x] System-prompt instructeert agent om alle 4 tools te gebruiken; produceer max 5-7 observations per run; elke observation eist ≥2 evidence-points
- [x] Output schema: array van `{dimension, severity, confidence, summary, evidence}` matching ADR-2 StrategyObservation shape
- [x] Confidence-flag: HIGH (3+ evidence) / MEDIUM (2 evidence) / LOW (1 evidence — observation skipped per two-reasons-test)
- [x] AgentVersion + promptVersion stamped (semver `0.2.0`, SHA-256 content-hash van prompt-template)

## 5 observation dimensions
- [x] **voice_drift**: prompt-fragment in `dimensions/voice-drift.ts` (Phase A)
- [x] **fidelity_decline**: prompt-fragment in `dimensions/fidelity-decline.ts` (Phase B, commit `58094f8e`)
- [x] **review_pattern**: prompt-fragment in `dimensions/review-pattern.ts` (Phase B)
- [x] **alignment_gap**: prompt-fragment in `dimensions/alignment-gap.ts` (Phase B)
- [x] **publish_quality_trend**: prompt-fragment in `dimensions/publish-quality-trend.ts` (Phase B; PublishGateOverride is Δ-4 dependency, fragment valt terug op F-VAL trend wanneer data ontbreekt)

## Triggering
- [x] Manual trigger: UI-knop "Run Analyst" in Brand Alignment Tab 5 → POST `/api/brandclaw/strategy-analyst/run`
- [ ] **Phase C**: Scheduled trigger: Vercel Cron `0 9 * * 1` (Monday 9am UTC) → calls same endpoint per workspace
- [x] Event-driven trigger v1 OUT — komt later wanneer ContentReviewLog throughput >50/week justifies

## Persistence
- [x] StrategyObservationRun row aangemaakt at start van run; gevuld met cost + latency + toolCallTrace at end (orchestrator/persistence.ts)
- [x] StrategyObservation rijen persisted in batch-transaction at end of run
- [x] Geen mutations buiten Brandclaw-tabellen — read-only naar consumer-data; observations zijn de enige writes

## UI Tab 5 "Strategy Analyst" (eerder als Tab 4 "Insights" gepland — Insights-tab bleek al bezet door Δ-1 pilot-feedback dashboard, dus aparte Tab 5 met Brain-icon)
- [x] Brand Alignment Tab 5 — `BrandclawObservationsTab.tsx` gewired in `BrandAlignmentPage.tsx`
- [x] Lijst observations gegroepeerd per dimension OR severity-sorted flat (view-mode toggle Phase B); gefilterd op severity + confidence + includeDismissed
- [x] Per observation: summary (1-2 zinnen) + evidence-link (klikbaar — opent EvidenceModal met DataSnapshot inhoud)
- [x] Action-buttons: "Mark as Read" / "Mark as Acted Manually" / "Dismiss" met dismiss-reden input + "Undo" — geen "Apply" (no autonomy)
- [x] "Run Analyst" trigger-knop (cost-estimate display: deferred — komt in Phase C met cron-cost preview)
- [x] Last-run timestamp + cost + latency + agentVersion footer

## Cron + monitoring (Phase C)
- [ ] **Phase C**: Vercel Cron config in `vercel.json` — extend met brandclaw-cron route
- [ ] **Phase C**: Per-workspace concurrency-cap = 1 (één Analyst-run per workspace tegelijk)
- [ ] **Phase C**: Cost-budget alert: >$10/workspace/maand triggers PostHog notification

## Quality gates
- [x] `npx tsc --noEmit` 0 errors + `npm run lint` 0 errors (Phase A + B beide groen)
- [ ] **Phase C overweging**: Unit-tests voor 5 dimension-detection-helpers (Phase B koos prompt-fragments boven pure helpers; integration-test op real-API is de echte validatie) + 3 trigger-types
- [x] Integration-test op Branddock Demo workspace via `scripts/smoke-tests/strategy-analyst-phase-a.ts`: real-API smoke 17/17 pass (4 tool-calls, $0.0549, 24.9s). 0 observations door insufficient evidence — verwacht gedrag (two-reasons-test enforcement, conservative prompt). **BB pilot smoke met 30+d productie-data deferred naar Phase C**.
- [ ] **Phase C**: UI-smoke browser-flow: Tab 5 loads + manual run + observations rendered; action-toggles persisteren (alleen code-level integration nu gedaan)
- [ ] **Phase C**: Cron-smoke: trigger via cron-route → run completes ≤2min p95 + observations persisted

# Bestanden die ik aanraak

## Analyst node
- `src/lib/brandclaw/nodes/strategy-analyst/index.ts` (nieuw) — runStrategyAnalyst entry point
- `src/lib/brandclaw/nodes/strategy-analyst/system-prompt.ts` (nieuw) — versioned prompt template
- `src/lib/brandclaw/nodes/strategy-analyst/dimensions/{voice-drift,fidelity-decline,review-pattern,alignment-gap,publish-quality-trend}.ts` (5 nieuwe files) — pure detection-helpers + reasoning-prompts per dimension

## API routes
- `src/app/api/brandclaw/strategy-analyst/run/route.ts` (nieuw) — POST manual trigger
- `src/app/api/cron/brandclaw-strategy-analyst/route.ts` (nieuw) — scheduled trigger; iterates over workspaces
- `src/app/api/brandclaw/observations/route.ts` (nieuw) — GET list observations (workspace-scoped)
- `src/app/api/brandclaw/observations/[id]/route.ts` (nieuw) — PATCH update flag (read/acted/dismissed)

## UI
- `src/features/brand-alignment/components/InsightsTab.tsx` (nieuw) — Tab 4 component
- `src/features/brand-alignment/components/ObservationCard.tsx` (nieuw) — per-observation rendering
- `src/features/brand-alignment/components/EvidenceModal.tsx` (nieuw) — DataSnapshot evidence drilldown
- `src/components/brand-alignment/BrandAlignmentPage.tsx` — Tab 4 toevoegen aan tab-set
- `src/features/brand-alignment/api/observations.api.ts` (nieuw)
- `src/features/brand-alignment/hooks/use-strategy-observations.ts` (nieuw)
- `src/features/brand-alignment/hooks/use-run-strategy-analyst.ts` (nieuw) — TanStack mutation

## Schema (additief)
- `prisma/schema.prisma` — `StrategyObservation` + `StrategyObservationRun` flags-velden indien niet al in ADR-2 schema (e.g. `markedReadAt`, `markedActedAt`, `dismissedAt`)
- `prisma/migrations/<timestamp>_add_observation_flags/migration.sql` — additief

## Cron
- `vercel.json` — cron-config voor brandclaw-strategy-analyst weekly trigger

# Bestanden die ik NIET aanraak

- `brandclaw-data-collection` data-source files — alleen reads via tool-orchestrator
- `brandclaw-tool-orchestrator` files — alleen consumes; geen wijzigingen aan orchestrator zelf
- F-VAL Pijler 1/2/3 — alleen reads via content-fidelity-source
- BrandVoiceguide schema — alleen reads via voiceguide-source
- ContentReviewLog schema — alleen reads via review-log-source (Δ-1 dependency)
- Other Brandclaw nodes (Campaign Builder, Measurement, Optimization) — komen later met eigen task-files

# Smoke test plan

1. **Manual trigger**: BB workspace + "Run Analyst" knop → run completes ≤2min + observations rendered in Tab 4
2. **Per-dimension observations**: BB heeft data in alle 5 dimensions → expect ≥1 observation per dimension
3. **Evidence-trail**: klik op observation → EvidenceModal toont DataSnapshot rows + tool-call-trace + agent-prompt-quote
4. **Two-reasons-test enforcement**: edit BB workspace om scenario te creëren met slechts 1 evidence-point voor dimension X → run Analyst → no observation voor X (skipped per scaffold)
5. **Confidence-flag distribution**: BB representative run → mix HIGH (3+ evidence) / MEDIUM (2 evidence) — geen LOW (skipped)
6. **Mark-as-Read flow**: "Mark as Read" knop → observation graduated naar lower-priority lijst; refresh → state persisteert
7. **Mark-as-Acted Manually**: gebruiker fixt issue extern → marks observation acted → audit-trail row in StrategyObservation.markedActedAt
8. **Cron trigger**: simuleer Monday 9am cron → run iterateert over alle workspaces met opted-in flag → completes binnen Vercel cron-window
9. **Cost-budget**: BB run cost ≤$0.20 per run; week-totaal ≤$1 voor BB
10. **Workspace-isolatie**: workspace-A run mag geen observations van workspace-B zien; Prisma where-clauses verifieerd
11. **Re-run reproducibility**: oude DataSnapshot rows blijven onveranderd ook al runt nieuwe Analyst; past observations herleidbaar via evidence-link
12. **TSC + lint**: 0 errors

# Risico's

- **Prompt-quality variabel** (CRITICAL): system-prompt determineert observation-quality. Mitigatie: starten met conservative prompt (high two-reasons-threshold); 30-day pilot tweaks; promptVersion stamped voor A/B
- **Cost-creep over time** (medium): meer historic data = langere queries = meer tokens. Mitigatie: per-source result-cap (50 rijen max per query), context-truncation in system-prompt
- **Observation overload** (medium): Analyst genereert 50+ observations → user-fatigue. Mitigatie: max 5-7 per run cap in prompt; severity-filter in UI default MEDIUM+
- **False-positive observations** (medium): Analyst flags false-trends. Mitigatie: confidence-flag exposed; user kan dismiss met reason → trend-feedback in promptVersion roadmap
- **Cron failure silent** (medium): Vercel cron error niet zichtbaar. Mitigatie: PostHog event op cron-start + cron-complete; alert wanneer cron-cycle missed
- **DataSnapshot bloat per Analyst-run** (medium): 4 sources × snapshot = 4 rijen/run; weekly = 200/year per workspace. Mitigatie: per ADR-2 retention-ADR LATER; v1 monitor via PostHog
- **Cross-workspace data leak via prompt-injection** (CRITICAL): user kan voiceguide content gebruiken om Analyst te triggeren naar andere workspace data. Mitigatie: workspaceId in BrandclawRunContext is hard-bound; tool-execute valideert; integration-test verifieert isolation
- **"Insights" Tab UX onduidelijk** (medium): users weten niet wat Tab 4 doet. Mitigatie: empty-state met "Run Analyst om eerste observations te zien" + tooltips per dimension

# Out of scope

- **Autonomy-gate** — observations zijn read-only v1; geen "Apply" knop. Autonomy komt in Optimization-node maand 10-12
- **Campaign Builder integration** — Campaign Builder consumes Analyst observations later; v1 stub doet alleen suggesties zonder downstream consumer-loop
- **Slack/email digest van observations** — `weekly-report-email-via-resend` synergistic LATER-task; v1 alleen in-app banner
- **Per-dimension prompt-iteration UI** — prompts zijn code v1; in-app prompt-tuning komt later
- **Multi-language Analyst output** — v1 alleen NL OR EN per BrandVoiceguide.contentLocale
- **Real-time event-driven triggers** — v1 alleen manual + scheduled
- **Cross-workspace benchmark observations** — `cross-workspace-benchmarks` LATER
- **Observation-replay** (re-run prompt op oude DataSnapshots) — replay-logic komt later
- **Confidence-calibration** (empirical adjustment van confidence-thresholds) — wacht 60-day pilot data

# Notes

ADR-2 + idea-doc Brand Control Program zijn canonical referenties. Geen architectuur-wijzigingen — task is implementation.

Cross-task dependencies (kritiek-pad):
- `brandclaw-data-collection` MOET eerst (data-laag foundation)
- `brandclaw-tool-orchestrator` MOET eerst (agent-loop runtime + 4 query-tools)
- Δ-1 Content Review (Phase 2) — ContentReviewLog table benodigd voor `query_review_history` tool en `review_pattern` dimension
- Δ-3 voice 1-pager (Phase 1) — system-prompt embeds voice-baseline-1-pager string voor brand-context
- Δ-4 PublishGate second-opinion (Phase 2) — `publish_quality_trend` dimension consumeert PublishGateOverride table

Implementation-volgorde:
1. Schema-migration voor observation flags (read/acted/dismissed timestamps) (0.5d)
2. System-prompt template + 5 dimension reasoning-prompts (2-3d)
3. Analyst node entry point + dimension-helpers (3-4d)
4. API routes (manual + cron + observations CRUD) (2-3d)
5. UI Tab 4 + ObservationCard + EvidenceModal (3-4d)
6. Cron config + scheduled-run iteration (1d)
7. Integration tests + workspace-isolation tests (2d)
8. BB pilot smoke + 30-day observation period (2d incl. monitoring setup)

Total: ~15-20 dagen werk. Phase 3 hoofdinvestering.

Validation post-deployment: 30-dagen Better Brands pilot. Targets:
- Cost-per-run ≤$0.50; weekly cost ≤$2/workspace
- Latency p95 ≤60s
- Suggestion-quality (founder-handmatig-rated) ≥60% "useful" (acceptable threshold per ADR-2)
- False-positive rate ≤30% (gemarkeerd als "Dismissed" met reason "false-positive")

Iteration-trigger als targets niet gehaald: prompt-tweaks ronde 2 met versioned prompt-bump (`agentVersion 0.1.0 → 0.2.0`), backwards-compatible met past observations (StrategyObservation.promptVersion field maakt comparisons mogelijk over de versie-grens).

Foundation voor:
- Campaign Builder (maand 5-6) — consumeert Analyst observations als one of input-bronnen
- Measurement-node (maand 7-9) — observations + correlation-data → leerlooп
- Optimization (maand 10-12) — autonomy-gate met owner-approval; Optimization weet welke observations al "Acted" zijn
