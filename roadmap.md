# Roadmap

> **Laatst bijgewerkt**: 2026-07-06 (`agents-foundation` ✅ **DONE** (#359, gebouwd + task-finalized op branch `feat/agents-foundation`, Neon-schema-delta gepusht) — A1 bewezen zonder Strategy-Analyst-regressie, `AgentRun`/`AgentArtifact` + registry + run-API + accept-materialisatie naar Knowledge Library live, volledige smoke groen. **Brandclaw-reconciliatie**: `strategy-analyst-stub` → done, Phase C HERBESTEMD naar het Agents-initiatief (mapping in `tasks/done/strategy-analyst-stub.md`); LATER-tabel "Brandclaw transformatie" geabsorbeerd door `agents-brandclaw-convergentie`; Brand-Assistant-J1 de facto geleverd door Brand Guardian. Zie ADR-aanvullingen 2026-07-06. **Parallel geland (PR #79/#81)**: `stripe-billing-live` **code-live-ready** via PR #79 — hardening done [dode change-plan-exploit weg, one-time-purchase-completion, invoice/yearly-bug, env fail-fast], wacht op Stripe-dashboard-config `docs/playbooks/stripe-go-live.md`; `strategy-analyst-stub` Phase C **gesuperseded** door het Agents-initiatief: scheduling → `agents-scheduling` (F2), analyst + cost-budget → `agents-brandclaw-convergentie` (F3).) — 2026-07-05 (🤖 Agents-initiatief vastgelegd — diepte-analyse `docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md` + idea-doc `ready-to-build` + ADR `2026-07-05-agents-architectuur` + 6 task-files `agents-*` voor alle 3 fasen, zie sectie 🤖 hieronder. Tevens `vercel-deployment` ✅ done — app live op branddock-7y9n.vercel.app; Track B Phase C + pilot-onboarding ontgrendeld; kritieke pad verschuift naar `stripe-billing-live` + `pilot-onboarding-better-brands`.) — 2026-06-30 (security-audit afgehecht — alle HIGH H1–H8 + MEDIUM/LOW gemerged #345–#350: SSRF `safeFetch`-helper met per-hop redirect-revalidatie + credential-strip, RBAC-gaten, prototype-pollution-guard, plan-entitlement, prompt-injectie-fencing, rate-limits + byte-caps. Resterende lager-risico items als [`security-residual-hardening`](tasks/security-residual-hardening.md) **post-launch** toegevoegd aan de tabel hieronder. Bron: `docs/audits/2026-06-26-security-audit.md`). — 2026-06-30 (meertaligheid-initiatief vastgelegd — ADR `2026-06-28-multilingual-i18n-and-multi-market-content` + 5 task-files; zie sectie 🌍 Meertaligheid hieronder). — 2026-06-25 (doc-resync na juni-werkstroom: GEO/SEO long-form Fase 1a/1b/2/3 + followups `measurement-dashboard` + `live-ai-e2e` ✅ done (#332-#340), LP-render-bugfixes `lp-fidelity-bugfixes-step2` + `lp-step3-rendering-bugs` ✅ done (#339), GEO citation-leak + render quick-wins #340-#343, brandstyle kalibratie-paneel ✅ done (#344, gemerged `37701ab7`) — alle als "Recent voltooid (juni)" hieronder. `geo-seo-followup-later` + `validate-brand-domain-component-fit` als post-launch toegevoegd. Worktrees `branddock-launch`/`branddock-brandclaw` 2026-06-26 ge-synct met main (ff naar `2bdb00a7`, 0 achter; geen dep/schema-drift). START_HERE.md mee-geresynced). — 2026-06-19 (post-launch `mcp-integration-layer` + `brand-assistant-standalone-app` toegevoegd — beide bidirectionele/standalone uitbreidingen, geparkeerd tot na launch; zie Post-launch-tabel + subsecties). — 2026-05-29 (Track B doc-reconciliatie: `competitor-ai-event-classifier` #263, `competitor-activities-ui` #271 én `competitor-scraping-apify-fallback` #272 bleken al gebouwd+gemerged maar stale "open" — alle drie op done gezet; `strategy-analyst-stub` → in-progress (Phase A+B done, Phase C open). `competitor-content-item-discovery` gebouwd + done 2026-05-29 (#275) — hele competitive-intel data→detectie→zichtbaarheid→ingestie loop nu compleet; enige resterende Track B = strategy-analyst Phase C (dep op vercel). — Eerder: `web-page-builder-canvas-step-mvp` promoted post-launch → pre-launch Track A sprint #6 — 130 commits in feature-branch, 5 dagen extra scope, finalisatie + 4 squash-merges in plan `zippy-twirling-feigenbaum`. Brand-fidelity gap in Step 2 LP-deliverables toegevoegd als Track 5. `web-page-builder-v2-custom-domains` toegevoegd als post-launch follow-up. 2026-05-19 context-picker audit Brand Assistant + Persona chat → 1 Tier-1 gap: `context-picker-strategy-observations` toegevoegd aan Track A NOW. 2026-05-18 Track B Phase A + B gemerged naar main via `a0e59a5b` — `brandclaw-data-collection` ✅, `brandclaw-tool-orchestrator` ✅, `strategy-analyst-stub` Phase A + A vervolg + B ✅; Phase C 5-7d open in `branddock-brandclaw` worktree, sequential dep op vercel-deployment).
> **Update-cadans**: Now continu (na elke afgeronde task), Next wekelijks (vrijdagretro), Later maandelijks.
> **Bron**: gedistilleerd uit oude TODO.md, BRANDCLAW-ROADMAP.md, STRATEGISCHE-VERVOLGSTAPPEN.md (allen in `docs/archive/old-lists/`).

---

## Fase-indeling

| Fase | Definitie | Hard criterium afronding |
|---|---|---|
| **Pre-launch** | Product-readiness: content-flows werkend en getest, observability staat, content-items bugvrij | Volledige content-flow (Brief → Strategy → Concept → Canvas → Export) zonder blocker-bugs op alle ondersteunde content-types; observability live |
| **Launch** | Livegang infra + billing + eerste 30 dagen klanten | Vercel + custom domain + Stripe live billing operationeel; eerste betalende klant aan boord; 0 P0/P1 bugs in core flows |
| **Post-launch** | Klantenwerving, schaal, Brandclaw transformatie | Doorlopend |

**Brandclaw transformatie**: Optie B → herzien 2026-05-08 — Strategy Analyst-stub naar pre-launch getrokken in **Brand Control Program** (zie sectie hieronder).

---

## 🎯 Brand Control Program (pre-launch herdefinitie 2026-05-08)

> 4 fasen + 4 voorlopers, 10-14 weken wall-clock pre-launch. Idea-doc: [`tasks/_drafts/idea-brand-control-program.md`](tasks/_drafts/idea-brand-control-program.md)
> **Doel**: review-side capabilities (Δ-1/2/3/4) + Strategy Analyst-stub. Pilot-start verplaatst van "+/- nu" naar +10-14 weken — strategische product-positioneringskeuze (brand-control instrument vs. content-creatie tool).

| Fase | Items | Effort | Status |
|---|---|---|---|
| **Phase 0 — Foundation** | [`tech-debt-any-types`](tasks/done/tech-debt-any-types.md), [`claw-page-awareness`](tasks/done/claw-page-awareness.md) (scope-cut: foundation only) | 3-5d | ✅ done 2026-05-08 |
| **Phase 1 — F-VAL extension** | [`bv-wire-w1-full-centroid`](tasks/done/bv-wire-w1-full-centroid.md) ✅, [`heuristics-packages-multilingual`](tasks/done/heuristics-packages-multilingual.md) ✅ (Δ-2 done), [`voice-baseline-1pager`](tasks/done/voice-baseline-1pager.md) ✅ (Δ-3 done) | 8-11d | ✅ done 2026-05-08 — Phase 2 review-surfaces unblocked |
| **Phase 2 — Review surfaces** | Δ-1 Surface C ✅ (Brand Alignment Tab 3), Δ-1 Surface D ✅ (Brand Assistant chat-tool), Δ-1 Surface E ✅ (PublishGate findings-block), Δ-1 cleanup-pack ✅, [`brand-alignment-insights-tab`](tasks/done/brand-alignment-insights-tab.md) ✅, [`canvas-inline-edit-overlays`](tasks/done/canvas-inline-edit-overlays.md) ✅, claw-page-awareness vervolg-cluster (open) | 13-17d | Δ-1 + Insights done; claw-vervolg task-file volgt. **Δ-4 verplaatst naar post-launch** 2026-05-12 — geen pilot-evidence dat F-VAL gaps heeft die een 2nd-opinion zou vangen; preventief bouwen risico op false-positive moeheid + cost/latency tax zonder bewezen baat. |
| **Phase 3 — Strategy Analyst** | brandclaw-data-collection ✅, brandclaw-tool-orchestrator ✅, strategy-analyst-stub Phase A+B ✅ (gemerged 2026-05-18 via `a0e59a5b`), Phase C **herbestemd 2026-07-06** naar het Agents-initiatief (zie §🤖 + `tasks/done/strategy-analyst-stub.md`) | 15-20d landed | ✅ afgesloten — vervolg loopt via `agents-scheduling` + `agents-brandclaw-convergentie` |

**ADR's**:
- ✅ [`2026-05-08-fval-output-schema-bevindingen`](docs/adr/2026-05-08-fval-output-schema-bevindingen.md) — additive `BrandReviewFinding` model
- ✅ [`2026-05-08-locale-routing-brand-voice`](docs/adr/2026-05-08-locale-routing-brand-voice.md) — `BrandVoiceguide.contentLocale` per-brand routing
- ✅ [`2026-05-08-brandclaw-agent-architectuur`](docs/adr/2026-05-08-brandclaw-agent-architectuur.md) — tool-use + versioned + immutable + no-autonomy

---

## 🔍 Competitive Intelligence Loop (parallel werkstroom — 2026-05-08)

> Idea-doc: [`tasks/_drafts/idea-competitive-intelligence-loop.md`](tasks/_drafts/idea-competitive-intelligence-loop.md) (verdict `needs-validation-first`)
> **Doel**: deep-research analyse-frameworks (positioning-map, narrative, content-gap, battlecards) + Brandclaw-aangedreven freshness-loop voor concurrent-monitoring. Methodology-conform met datum-stempels, bron-traceback en trend-queryability.

| Fase | Items | Effort | Status |
|---|---|---|---|
| **Fase 1 — Data-laag** | [`competitor-snapshot-historie`](tasks/done/competitor-snapshot-historie.md) (Snapshot/Activity/ContentItem schema + dual-write refresh + backfill + 7 deterministische diff-rules) | 3-4d | ✅ done 2026-05-08 |
| **Fase 2 — Analyse-frameworks UI** | `competitor-positioning-frameworks-ui` (positioning-map, narrative-tab, messaging-matrix, content-gap-tabellen) | 5-7d | conditional op pilot-validatie — task-file volgt |
| **Fase 3 — Battlecards + brief** | Battlecard-generator + competitive-brief docx/pdf export | 3-5d | if-capacity post-Fase-2 |
| **Fase 4 — Brandclaw monitoring** | `brandclaw-competitor-monitoring` — cron-scheduling, `monitor_competitor` tool, in-app notifications | 5-7d | post-launch — eigen ADR voor cron-infra |
| **Fase 5 — External signals** | RSS-ingestion, Wayback-historiek, hiring-signals, G2/Capterra reviews | 5-10d | uit-scope MVP — `CompetitorSignalSource` enum bedraad voor uitbreiding |

**ADR's**:
- ✅ [`2026-05-08-competitor-snapshot-historie`](docs/adr/2026-05-08-competitor-snapshot-historie.md) — Snapshot/Activity/ContentItem additieve schema-uitbreiding
- ✅ [`2026-05-12-cron-infra`](docs/adr/2026-05-12-cron-infra.md) — Vercel Cron continueren; QStash niet nodig pre-launch. 5 re-evaluation-triggers gedocumenteerd.
- ⏳ Mogelijke retention-ADR — wanneer snapshot-tabel >100k rijen of privacy-incident

**Validatie-blokker vóór Fase 2 promotion**: pilot-priority-check (3 leads) + cost-modeling Fase 4 — zie idea-doc Red Team Review.

---

## 🌍 Meertaligheid — UI-i18n + multi-markt content (initiatief 2026-06-30)

> ADR: [`2026-06-28-multilingual-i18n-and-multi-market-content`](docs/adr/2026-06-28-multilingual-i18n-and-multi-market-content.md) (superseert `2026-05-08-locale-routing-brand-voice`). Onderbouwd door 2 multi-agent onderzoeks-workflows + 1 adversariële review.
> **Twee orthogonale assen, strikt gescheiden**: UI-locale (per gebruiker, i18next, alle niet-Engelse bundles automatisch AI-vertaald — geen handwerk) vs content-locale (per workspace/merk/markt, Approach C: `Brand` 1:1 + `BrandLocaleProfile` JSON-delta-overlays). User-keuze: volledige multi-markt, maar Fase 4-5 go/no-go-gated — **mag `vercel-deployment` niet gijzelen**.

> **STATUS 2026-07-05 — LAUNCH-READY**: Fase 1-3 zijn GEMERGED op `main` (en↔nl live door de hele app; de twee-selector-visie — Display-language per gebruiker + Content-/Output-language per workspace/generatie — is compleet). Volledige gate-suite groen op main (tsc/lint/separation/foundation-smoke 46/46/target-picker-smoke 8/8/build). Blokkeert `vercel-deployment` niet meer. **Post-launch parkeer**: Fase 1b (AI-vertaal-engine voor onderhoud + de/es/fr — nu geshipt: en/nl geseed door de extractie-waves), de deferred Fase-3-follow-ups (F-VAL-target-pack-scoring + campagne-bulk-UI-picker), en Fase 4-5.

| Fase | Task | Wanneer | Effort | Status |
|---|---|---|---|---|
| 1 | [`i18n-ui-foundation`](tasks/i18n-ui-foundation.md) — i18next runtime + Display-language selector + CI-guard + volledige extractie/remediation | pre-launch | 2-3 wk | ✅ **done** (#65/#68/#70/#71) |
| 1b | [`i18n-ai-translation-pipeline`](tasks/i18n-ai-translation-pipeline.md) — automatische AI-vertaling (Opus + validatie-gate + judge) + de/es/fr | **post-launch** (en/nl geseed; niet-blokkerend) | 1-2 wk + per-namespace | open |
| 2 | [`content-locale-foundation`](tasks/content-locale-foundation.md) — Content-language selector + Brand/BrandLocaleProfile datamodel | pre-launch | 2-3 wk | ✅ **done** (#73) |
| 3 | [`content-locale-target-picker`](tasks/content-locale-target-picker.md) — per-generatie target-locale + analyze-lek dichten | pre-launch | 1-2 wk | ✅ **done** (#74; F-VAL-pack + bulk-UI = post-launch follow-up) |
| 4+5 | [`multi-market-transcreation-enterprise`](tasks/multi-market-transcreation-enterprise.md) — transcreatie-fan-out + per-locale F-VAL + compliance/hreflang/RBAC/org-billing | LATER (enterprise, go/no-go) | multi-maand | blocked |

**Kritieke aandachtspunten** (uit de adversariële review, verwerkt in de task-files): twee parallelle content-locale-paden (`getBrandContext` inline `'en'` + `resolveLocaleForBrand` `'en-GB'`) moeten béide profiel-precedentie krijgen; cache-key in dezelfde commit als locale-aware maken (anders cross-locale bleed); LandingPage unique-key-flip is een compile-break (raakt `p/[slug]` + `publish-page.ts`); `prisma/seed.ts` moet `Brand`+default-profiel seeden; F-VAL-packs dekken 4 van 7 talen (markt-activatie gated op pack); server-e-mails/PDF/notifications vallen buiten de client-i18next-laag.

---

## 🤖 Agents — user-facing persona-agents op merk-DNA (initiatief 2026-07-05)

> ADR: [`2026-07-05-agents-architectuur`](docs/adr/2026-07-05-agents-architectuur.md). Onderbouwing: [`docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md`](docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md) (adversarieel geverifieerde marktanalyse Sintra/Jasper + brede scan + codebase-inventaris) + [`tasks/_drafts/idea-agents-feature.md`](tasks/_drafts/idea-agents-feature.md) (feature-discovery, verdict `ready-to-build`, gepromoot 2026-07-05).
> **Kernframe**: Agents = user-facing productlaag — human-in-the-loop taak-agents met persona's, gegrond in het volledige merk-DNA, elke content-output F-VAL-gevalideerd (de combinatie die géén onderzochte concurrent biedt). Brandclaw = de latere autonomie-trap op dezelfde motor (`runAgentLoop`). User-besluiten 2026-07-05: pre-launch MVP, persona-agents, Data Analyst in MVP, vaste maandprijs (per-token later; merkcontext/F-VAL nooit meteren).

| Fase | Task | Wanneer | Effort | Status |
|---|---|---|---|---|
| 1 | [`agents-foundation`](tasks/done/agents-foundation.md) — pluggable output-contract op `runAgentLoop` + `AgentRun`/`AgentArtifact` + code-registry + run-API | pre-launch NOW | 4-6d | ✅ **done 2026-07-06** (#359, branch `feat/agents-foundation` — A1 bewezen, 5 review-rondes 0 CRITICAL, smoke groen; ⚠️ Neon `db push` bij deploy) |
| 1 | [`agents-motor-wiring`](tasks/agents-motor-wiring.md) — 5 persona-agents op bestaande motoren + Claw-tool-bridge + propose-only confirm + F-VAL-poort | pre-launch NOW | 4-6d | open (dep: foundation) |
| 1 | [`agents-ui-inbox`](tasks/agents-ui-inbox.md) — sidebar-sectie + catalogus + agent-detail (use-cases + Claw-panel-chat) + results-inbox | pre-launch NOW | 5-7d | open (dep: foundation; ≥1 agent voor e2e-smoke) |
| 1 | [`agents-data-analyst`](tasks/agents-data-analyst.md) — curated read-only query-tools + TABLE-artefact + tabel-render | pre-launch NOW | 3-5d | open (dep: foundation + ui-inbox) — **eerste drop-kandidaat** |
| 2 | [`agents-scheduling`](tasks/agents-scheduling.md) — `AGENT_TASK`-brug (queue → registry → `runAgentLoop`) + `AgentSchedule` + notificaties + per-agent `AgentMemory` | launch NEXT | 2-3wk | open — gate: Fase 1 done (vercel-dep ✅ vervuld 2026-07-05) |
| 3 | [`agents-brandclaw-convergentie`](tasks/agents-brandclaw-convergentie.md) — epic: Strategy Analyst → catalogus, 3 NodeTypes als agents, autonomie-schuif, cost-budget-alerts | post-launch LATER | multi-maand | blocked (go/no-go op pilot-data) |

**Effort-realiteit** (technical planning 2026-07-05): Fase 1 = 16-24d (~3-4,5 wk); lite-fallback (Data Analyst droppen + motor-wiring trimmen naar 3 agents: Research Analyst + Brand Guardian + Strategist) = ~11-17d. Worktree: `branddock-feat-agents-feature`. Guardrails uit de discovery: F-VAL-score van agent-content ≥ Canvas-flow-score; kosten per run geïnstrumenteerd vanaf dag 1 (input voor het latere per-token-besluit).

---

## ⚡ NOW (pre-launch — sprint #6-7, ~5-7 weken resterend)

Pre-launch scope herzien 2026-05-12 (2× uitbreiding zelfde dag): alle items uit roadmap-inventaris naar pre-launch + Strategy Analyst full scope + Competitor AI dubbel + **content-test verbeterplan Optie B Full** (chain-of-prompts + multi-modal). 3 parallelle tracks via worktrees. Pilot-projectie: **+5-7 weken vanaf 2026-05-18** (eerder +9-11 weken vanaf 2026-05-12; Track B Phase A+B 15-20d landed in 6 dagen via parallel-track, +2 weken winst).

**Track A — Quality + Validation** (main branch)

> **Scope-uitbreiding 2026-05-12**: Track A draagt nu het **content-test verbeterplan** (Optie B Full, ~40d), gefaseerd over 6 sub-sprints #5.A → #7.B. Pilot-projectie verschuift naar +9-11 weken. Volledig plan: `docs/specs/content-test-improvement-plan.md`.

| ID | Titel | Effort | Sprint | Status |
|---|---|---|---|---|
| `content-items-test-coverage` | Handmatige testplan 53 types (representanten + Ronde 1 + Ronde 2). Playbook: `docs/playbooks/testplan-content-items.md`. Levert baseline-data voor golden-sets. Ronde 1 ✅ COMPLEET 2026-07-01 (24 zichtbare types: 23 passed, 1 bug ebook, 0 nieuwe bugs). Representanten 4/8 + varianten 16/16; 31/55 code-types hidden (4 categorieën bewust uit picker). Ronde 2 gated op asset-generator-integratie. | 1d representanten + 2-3d full | #4-6 | in-progress (Ronde 1 done, Ronde 2 gated) |
| `pre-launch-browser-smoke-batch` | Δ-1 Surface C + claw-page-awareness + locale-picker browser-smoke. VB Compose/Trained deferred post-vercel. | ~1-2u | #4 (3/5 done) | partial |
| `code-debt-pre-launch-cleanup` | Persist-TODOs + cleanup + suggest-visual-briefing error-UX. Verspreid. | ~6d | #4-7 fill-in | 2/12 done |
| `compose-pipeline-gemini-migration` | FAL Flux → Gemini Image (nano-banana) compose-route migratie. | ~1d | #5.B fill-in | ✅ done 2026-05-12 |
| **`content-test-foundation-#5A`** | Layer 1 Generic property evals (10-15 deterministic checks) + prompt versioning infra + Prompt Registry UI v1. Plan §4 sub-sprint #5.A. | ~3d | #5 week 1 | ✅ done 2026-05-12 |
| **`content-test-goldens-#5B`** | Chain-of-prompts upgrades (CoT/Plan-and-Solve/ToT) + Layer 2 type-specific golden sets via Promptfoo voor 8 representanten + G-Eval rubrics. Plan §4 sub-sprint #5.B. | ~10d | #5 week 2-3 | ✅ done 2026-05-12 (4 batches A-D) |
| **`content-test-wiring-gates-#6A`** | Checkpoint-helper library + orchestrator gate-integratie + 8 stage-smokes. Plan §4 sub-sprint #6.A. | ~5d | #6 week 1-2 | 🔄 in-progress |
| **`content-test-auto-iterate-#6B`** | Feedback-compiler + auto-iterate orchestrator + edit-distance signals + per-type fidelity thresholds + image refine-loop. Plan §4 sub-sprint #6.B. | ~6d | #6 week 2-3 | ✅ partial 5/7 (wiring + dashboard panels deferred) |
| **`content-test-flow-analyse-#7A`** | 8 categorie-rapporten flow-analyse in `docs/specs/content-flow-*.md`. Plan §4 sub-sprint #7.A. | ~3d | #7 week 1 | open task-file |
| **`content-test-regression-#7B`** | Layer 3 item-specific regression: LearningEvent → regression-corpus auto-promote + nightly run + alert. Plan §4 sub-sprint #7.B. | ~3d | #7 week 2 | open task-file |
| **`video-chain-explainer-showcase`** | Multi-modal: full 5-staps chain (Plan/Script-per-scene/Storyboard/Coherence/Assembly) voor explainer-video als showcase. Lightweight chains voor video-ad + tiktok-script. Plan §3.0.5. | ~4d | #5-6 fill-in | open task-file |
| **`image-quality-chain`** | Multi-modal: negative prompts + multi-candidate (3-4) selection UI + visual-fidelity dimension-breakdown + image-to-image refine-loop + OCR text-check + brand-color validation. Plan §3.0.5. | ~6d | #6 fill-in | ✅ done 2026-05-17 (#253, `tasks/done/image-quality-chain.md`) |
| [`lp-feature-image-diversity`](tasks/lp-feature-image-diversity.md) | LP feature-beelden divers + relevant voor sectietekst: stijl-laag-sanering, imageBrief uit copy-LLM, server-side prompt-bouw + coherence/diversity-poort. Audit: `docs/audits/2026-06-10-lp-feature-image-diversity.md`. | 8,5-9,5d | #6-7 | in-progress 2026-06-10 |
| [`context-picker-strategy-observations`](tasks/done/context-picker-strategy-observations.md) | Brand Assistant context-picker: `StrategyObservation` toevoegen (Tier-1 gap uit audit 2026-05-19). Hardcoded Claw-pattern, geen registry-entry. Tier-2 cleanups (Campaign → registry, Deliverable workaround) als follow-up. | ~4u | #6 fill-in | ✅ done 2026-05-19 (smoke partial — 0 observations in DB) |
| [`web-page-builder-canvas-step-mvp`](tasks/web-page-builder-canvas-step-mvp.md) | Puck als Canvas Step 3 Medium-renderer voor 5 web-page types + brandstyle-analyzer Fase A-E + LP design batches 1-8 + F-VAL vision-judge dim 8 + DTS content-quality C1-C11 + brand-fidelity Step 2 LP. **Promoted post-launch → pre-launch 2026-05-29** (130 commits in feature-branch, 5 dagen extra scope landed). | 6-8w landed | #6 | partial — finalisatie + 4 squash-merges in plan `zippy-twirling-feigenbaum` |

**Track B — Brandclaw + Competitive AI** (worktree `branddock-brandclaw`, Phase A+B gemerged 2026-05-18)
| ID | Titel | Effort | Sprint | Status |
|---|---|---|---|---|
| `brandclaw-data-collection` | DataSnapshot model + registry + 4 v1 sources live | 5-7d | #5 | ✅ done 2026-05-18 (#255) |
| `brandclaw-tool-orchestrator` | Shared Anthropic tool-orchestrator + agent-loop + 4 query-tools + PostHog | 3-5d | #5 | ✅ done 2026-05-18 (#256) |
| [`strategy-analyst-stub`](tasks/done/strategy-analyst-stub.md) Phase A+B | Strategy Analyst node — node entry + manual trigger + UI Tab 5 + 4 dimensions + sort/group | 15-20d landed | #5-6 | ✅ done 2026-05-18 (#260/#261/#262); taak afgesloten 2026-07-06 (Phase C herbestemd) |
| ~~`strategy-analyst-stub` Phase C~~ | ~~Vercel Cron weekly + concurrency-cap + cost-budget alerts + BB pilot smoke~~ | ~~5-7d~~ | — | **HERBESTEMD 2026-07-06** naar het Agents-initiatief — geen bespoke cron voor één node; mapping per item in [`tasks/done/strategy-analyst-stub.md`](tasks/done/strategy-analyst-stub.md) (weekly-schedule → `agents-scheduling`/Fase 3-item-1; concurrency-cap → `agents-scheduling`; cost-alerts → `agents-brandclaw-convergentie` item 4; BB-smoke → pilot-onboarding) |
| [`competitor-ai-event-classifier`](tasks/done/competitor-ai-event-classifier.md) | AI-pattern-detector voor CATEGORY_REPOSITIONING + TARGET_AUDIENCE_CHANGED bovenop deterministische diff-engine. A1 96,7% accuracy. | 3-4d | #6 | ✅ done 2026-05-19 (#263, PR #6) |
| [`competitor-activities-ui`](tasks/done/competitor-activities-ui.md) | Activities zichtbaar maken: detail-timeline + dashboard attention + multi-competitor digest + Brand Assistant tool + in-app/email notificaties + reconcile-cron. Gemerged via PR #8/#13 + BA-tool/cron branches; ge-finalized + gehardend 2026-05-29. | 2-3d | #6 | ✅ done 2026-05-29 (#271) |
| [`competitor-scraping-apify-fallback`](tasks/done/competitor-scraping-apify-fallback.md) | 3-step scraper-chain (current → Apify playwright:firefox → Gemini) in refresh-route; redt JS-heavy SPA scrape-failures die anders geen classifier-input leveren. | 1-1.5d | #6 | ✅ done 2026-05-29 (#272, PR #12) |
| [`competitor-content-item-discovery`](tasks/done/competitor-content-item-discovery.md) | RSS + sitemap producer voor `CompetitorContentItem`: discovery → format-classify (regex + Haiku) → theme-tag → NEW_*-activities. Geïntegreerd in refresh-route (async pre-TX). | 5-6d | #6 | ✅ done 2026-05-29 (#275) |
| ~~`cron-infra-adr`~~ | ✅ Done 2026-05-12 — Vercel Cron continueren, zie `docs/adr/2026-05-12-cron-infra.md` | ~2u | #4 | ✅ done |

**Track C — Launch infra** (worktree `branddock-launch`)
| ID | Titel | Effort | Sprint | Status |
|---|---|---|---|---|
| [`vercel-deployment`](tasks/vercel-deployment.md) | Vercel + Neon DB + serverless-hardening + monitoring | ~2wk | #5 | ✅ **DONE + LIVE 2026-07-05** (PR #76) |
| [`stripe-billing-live`](tasks/stripe-billing-live.md) | Stripe live billing — checkout + webhooks + plan enforcement | 1w | #6 | ✅ **code-live-ready** (PR #79, 2026-07-06) — hardening done; wacht op Stripe-dashboard-config ([`docs/playbooks/stripe-go-live.md`](docs/playbooks/stripe-go-live.md)) |
| [`pilot-onboarding-better-brands`](tasks/pilot-onboarding-better-brands.md) | Better Brands eerste pilot live | 2d | #6 (na vercel) | open task-file |
| `onboarding-flow-test` | Onboarding flow met 3 externe gebruikers | 1w | #7 | task-file volgt |
| `marketing-site-pricing` | Marketing site + pricing pagina | 1w | #6-7 | task-file volgt |

### Sprint-volgorde

**Sprint #4 — Validation + Quick wins** (DICHT per 2026-05-17)
1. ✅ Browser-smoke batch (~1-2u) — Surface C + claw-page-awareness + locale-picker done. VB Compose/Trained deferred post-vercel.
2. ✅ Cron-infra ADR (~2u) — Vercel Cron continueren (`docs/adr/2026-05-12-cron-infra.md`)
3. ✅ Code-debt 2/12 quick wins + close-out cluster A/B/C (#257, 2026-05-17)
4. ✅ STOP-GATE genomen 2026-05-17: P2 [shared-pipeline] Effie-rubric leak gefixt (#258 `e849a1ed`) + auto-iterate variant-clobber + long-form shrinkage fix (#259 `cdd0e074`)
5. ✅ testplan-content-items Ronde 1 COMPLEET — 2026-07-01, 24 zichtbare types (23 passed, 1 bug ebook, 0 nieuwe bugs). Representanten 4/8 + varianten 16/16. 31/55 code-types hidden (4 categorieën bewust uit picker). Ronde 2 gated op asset-generator-integratie.

**Sprint #5 — Bugfix + Foundation start** (Track A klaar, Track B Phase A+B gemerged 2026-05-18)
- Track A: ✅ 5A foundation + ✅ 5B goldens + ✅ 6A wiring-gates + ✅ 6B partial + ✅ compose-Gemini + ✅ claw-page-awareness vervolg. **Open**: 6B wiring/dashboard finish + bugfix-cluster uit Ronde 1 + full 53-types Ronde 1.
- Track B: ✅ Phase A+B gemerged via `a0e59a5b` — data-collection + tool-orchestrator + strategy-analyst Phase A+vervolg+B + model-ID hotfix (#255/256/260/261/262). **Open**: Phase C in worktree `branddock-brandclaw` — sequential dep op Track C.
- Track C: ✅ **`vercel-deployment` DONE + LIVE 2026-07-05** — app live op Vercel (Pro+Fluid, fra1); serverless-hardening (A1 11-routes-queue / A2 uploads / A3 SSE / A4 browser / A5 cache) + Neon (pool + HNSW) + R2 + CI/branch-protection, geconsolideerd met i18n op `main` (PR #76, `5e642ded`). Hard launch-blocker **opgeheven** → ontgrendelt Phase C Vercel Cron + pilot-onboarding + stripe-billing.

**Sprint #6 — Feature build + Infra** (~3 weken, 3 parallel tracks)
- Track A: testplan Ronde 1 finish + persist-TODOs cluster + Ronde 2 generator-evaluatie
- Track B: strategy-analyst-stub start + competitor-ai-event-classifier build
- Track C: stripe-billing-live + pilot-onboarding-better-brands + marketing-site-pricing start

**Sprint #7 — Launch readiness** (~2 weken)
- Strategy-analyst-stub finish + competitor-content-item-discovery
- onboarding-flow-test met 3 externe gebruikers
- Marketing-site-pricing finish
- Final integration smoke + pre-launch checklist
- **Go/no-go decision** → launch

### Decision-triggered items (geen schedule, blijven open)

| ADR | Trigger |
|---|---|
| Retention-ADR (data-lifecycle snapshot-tabel) | Wanneer snapshot-tabel >100k rijen of privacy-incident |

> **Δ-4 PublishGate 2nd-opinion verplaatst naar post-launch (2026-05-12)** — geen pilot-evidence dat F-VAL gaten heeft die een 2nd-opinion zou vangen. Pas overwegen na pilot-data.

**Recent voltooid (juni 2026 — GEO/SEO + web-page-builder + brandstyle, gemerged op `main`)**

> Grootste werkstroom sinds de mei-sprints; changelog #322–#344. Niet eerder in de roadmap weerspiegeld (resync 2026-06-25).

- **Web-page-builder (Puck) als Canvas Step 3** + brandstyle-extractie-fixes + website page-types W0-W5 (`web-page-builder-canvas-step-mvp` — alle 6 fasen + squash-merges PR #14/#15 ✅; rest = verspreide acceptance-staart, zie NOW Track A).
- **GEO/SEO long-form Fase 1a/1b/2/3** (#332-#336): structured data (JSON-LD), long-form SEO-substrate, optimization-goals + Puck-publish, `buildGeoDirective()` + composable seo-geo + F-VAL GEO-pijler + entity-JSON-LD + meet-haak. Tasks → `tasks/done/geo-seo-fase*`.
- **GEO/SEO followups** ✅: `geo-seo-followup-measurement-dashboard` (GEO-meet-paneel + F-VAL-pijler-activatie, #338) + `geo-seo-followup-live-ai-e2e` (lokale keten-verificatie). Restant `geo-seo-followup-later` → **post-launch** (zie Post-launch-tabel).
- **GEO citation-leak gedicht** (#340/#343) + **LP/GEO render quick-wins** (#342) + **"model offline"-melding** (#341).
- **LP-render-bugfixes ge-finalized** (#339): `lp-fidelity-bugfixes-step2` + `lp-step3-rendering-bugs` ✅ done.
- **Brandstyle kalibratie-paneel** (#344, gemerged `37701ab7`): geconsolideerde "wat heb ik nodig"-asks bovenaan de styleguide (`buildBrandstyleCalibrationReport` + `BrandstyleCalibrationPanel` + e2e-smoke). Task → `tasks/done/brandstyle-calibration-report.md`.
- **Knowledge Library / Deep Research** + knowledge-context-laag in de content-flow + op de 5 PUCK web-page-types; content-item-beelden auto-groeien de Media Library; prompt-audit fase 0-5; NL→EN UI-migratie.

**Recent voltooid (Track B Phase A+B, gemerged 2026-05-18 via `a0e59a5b`)**

> Track B parallel-track op `track/brandclaw` worktree, 9 commits gemerged naar main. Changelog #255/#256/#260/#261/#262 (chronologisch renumberd na collision met Track A's #255/#256).

- **Brandclaw data-collection (#255)**: DataSnapshot model + registry + alignment + 4 v1 sources live (5-7d effort)
- **Brandclaw tool-orchestrator (#256)**: types + registry + agent-loop + persistence + 4 query-tools + PostHog (3-5d effort)
- **Strategy Analyst Phase A (#260, 2 commits)**: node entry + manual trigger + UI Tab 5 + Phase A vervolg
- **Strategy Analyst Phase B (#261)**: 4 extra dimensions + UI sort/group
- **Brandclaw model-ID hotfix (#262)**: correct Anthropic agent-loop default

**Recent voltooid (sprint #4 close + bugfixes, 2026-05-17)**

> Track A sprint #4 dichten + STOP-GATE-blokkers oplossen. Changelog #257/#258/#259.

- **Code-debt-pre-launch-cleanup close-out (#257)**: cluster A persist-TODOs (variant-selection persist, fix-options cache, persona image-storage, ProseMirror diff via Markdown) + B API-deprecation + C cleanup
- **Effie-rubric leak fix in content-flow Strategy (#258, `e849a1ed`)**: P2 [shared-pipeline] — prompt-guards (EFFIE TEST → STRATEGIC QUALITY TEST + output-language-guards in 4 system-prompts), `scrubStrategyLayer()` utility (`src/lib/ai/sanitize-strategy-output.ts`) op 3 productie-sites, "Effie/Cannes potential" labels → "Award potential". 30/30 smoke-cases groen. STOP-GATE genomen voor Ronde 1 representanten.
- **Auto-iterate gate-floor + silent-iter scope-fix (#259, `cdd0e074`)**: silent auto-iterate clobberde variant B/C/D body (missing `variantIndex: 0` filter) + long-form types vielen onder 50-woorden gate door F-VAL tightening rewrite. Defense-in-depth: don't-shrink guard via registry minWords + diagnostic logging op silent-returns.

**Recent voltooid (sprint #3, 2026-05-09 t/m 2026-05-11)**

> 7 task-finalizations bovenop sprint #2-merge. Volledige details in `tasks/done/` + `docs/changelog.md` (entry #243–250).

- **Δ-1 Content Review surfaces (3)**: Surface C `content-review-tab-3-ui` (entry #243), Surface D `content-review-chat-tool` Brand Assistant `review_content` (entry #244), Surface E `publishgate-findings-block` (entry #245)
- **Δ-1 cleanup-pack**: shared `SEVERITY_RANK` + `ReviewFinding` types + SPA deep-link + InputBar tool_result fix (entry #246)
- **Brand Alignment Insights tab**: pilot-feedback dashboard voor Δ-1 surfaces (entry #247)
- **F-VAL rules-pijler audit**: mapper categories + NL-NL packs + stem-variants + composition-engine violation-dedup (entry #248 + `310e53c`)
- **Brand-language auto-detect**: `franc-min` integration + backfill van 13 workspaces + runtime mismatch-guard (entry #249)
- **BrandVoiceguide.contentLocale picker UI**: manuele override in Voice DNA tab + auto-detected suggestion + Currently-active pill (entry #250)

**Recent voltooid (sprint #2, gemerged 2026-05-09 via PR #5 `618d336`)**

> 16 task-finalizations + 254/254 smoke-checks + 11 nieuwe `npm run smoke:*` scripts. Volledige details in `tasks/done/` + `docs/changelog.md` (entry #239–242).

- **Canvas/Studio (12 tasks)**: locale-fix + 3 per-item-tweaks-clusters + 3 image-track-tasks + 3 discovery-audits + canvas-inline-edit-overlays
- **BCP Phase 0** (3 tasks): tech-debt-any-types, claw-page-awareness foundation, bv-wire-w1-full-centroid
- **BCP Phase 1** (2 tasks): heuristics-packages-multilingual (Δ-2, 4 locales), voice-baseline-1pager (Δ-3)
- **Cowork-pariteit Fase A**: campaign-brief-output-mapper
- **Competitive-intel Fase 1**: competitor-snapshot-historie

---

## 🔵 NEXT (1-3 maanden, RICE-gerangschikt)

**Launch-fase (live-gang infra + billing)**
| ID | Titel | Fase | Effort | Notitie |
|---|---|---|---|---|
| [`vercel-deployment`](tasks/vercel-deployment.md) | Vercel + Neon DB + custom domain + monitoring | launch | 3 dagen | ✅ **done 2026-07-05** — live op branddock-7y9n.vercel.app |
| [`stripe-billing-live`](tasks/stripe-billing-live.md) | Stripe live billing — checkout + webhooks + plan enforcement | launch | 1 week | Hard launch-blocker, parallel met Vercel mogelijk |
| [`pilot-onboarding-better-brands`](tasks/pilot-onboarding-better-brands.md) | Better Brands eerste pilot live | launch | 2 dagen | Voorwaarde: vercel-deployment done |
| `onboarding-flow-test` | Onboarding flow met 3 externe gebruikers | launch | 1 week | Validation pre-klant — task-file volgt |
| `marketing-site-pricing` | Marketing site + pricing pagina | launch | 1 week | Conversie-driver — task-file volgt |

**Post-launch**

> Pre-launch scope is uitgebreid 2026-05-12 — `strategy-analyst-stub`, `brandclaw-tool-orchestrator`, `competitor-ai-event-classifier`, `competitor-content-item-discovery` zijn nu pre-launch (zie NOW). Post-launch resteert het volgende.

| ID | Titel | Fase | Effort | Notitie |
|---|---|---|---|---|
| `delta-4-publishgate-2nd-opinion` | Δ-4 PublishGate 2nd-opinion review-pass | post-launch | onbekend | Verplaatst 2026-05-12 uit BCP Phase 2: preventief bouwen zonder pilot-evidence onverstandig. 4 mogelijke interpretaties open: (a) extra AI-call ander model, (b) heuristic conflict-detector, (c) human-in-the-loop, (d) adversarial probe. |
| [`geo-seo-followup-later`](tasks/geo-seo-followup-later.md) | GEO/SEO opvolg-bucket: externe entity-reinforcement (Wikidata/G2/Reddit) + live AI-crawler-citation-meting + restschema (`BreadcrumbList`/`howToSchema`) + deploy-time browser-smoke + nightly staleness-recompute | post-launch | gefaseerd | **Tracker/staging-bucket** (toegevoegd 2026-06-25) — geen uitvoerbare eenheid; splits per sub-item af zodra concreet. Meeste sub-items dep op `vercel-deployment` of eigen ADR/research; read-time staleness-flag al gewired (#338). |
| [`validate-brand-domain-component-fit`](tasks/validate-brand-domain-component-fit.md) | Meet of merk-/domein-specifieke web-page componenten de pipeline raken vóór bouwen (pipeline-fit-telling + wizard-of-oz) | post-launch | 1-2d analyse | Verdict needs-validation-first uit feature-planner 2026-06-24. Gate vóór idea `brand-domain-specific-components`. Pas zinvol met pilot-data. |
| [`security-residual-hardening`](tasks/security-residual-hardening.md) | Security-audit restscope: L4 (workspace-config rol-checks), L6 (Help-Center markdown-escape), L9 (ad-tokens version-prefix/rotatie), Zod-coverage-sweep mutatie-routes, CSP-bron-consolidatie (+nonce `script-src`), claw/confirm dubbele-resolutie, `image-scraper`/`knowledge-research` sync→async SSRF-upgrade | post-launch | 1-2d | **SSRF-blok al afgevinkt** (#349 safeFetch per-hop redirect-revalidatie + #350 convergentie). Resterende items lager-risico/breder — splits per sub-item af. Bron: `docs/audits/2026-06-26-security-audit.md`. De HIGH-findings H1–H8 + MEDIUM/LOW zijn al gemerged (#345–#350). |
| [`power-user-shortcuts`](tasks/power-user-shortcuts.md) | Power-user shortcuts (5 micro-optimalisaties) | post-launch | 1-2 dagen | Gedistilleerd uit plan |
| `learning-loop-dashboard-usage` | Per-sourceIdentifier dashboard | post-launch | halve dag | Task-file volgt |
| `weekly-report-email-via-resend` | Weekly report email via Emailit | post-launch | 1 dag | Task-file volgt na weekly-report generator |
| `studio-siblings-context-variation` | Variatie-borging tussen naburige posts (lexicale diversiteit Jaccard) | post-launch | ½-1 dag | Quality-enhancement na studio-P0. Geen Brandclaw-impact. |
| `web-page-builder-v2-custom-domains` | Vercel Domains API + CNAME provisioning + SSL monitoring + DomainMapping write-path | post-launch | 1-2w | Decision-trigger: ≥3 pilot-klanten vragen custom-domain óf `marketing-site-pricing` onder `branddock.com` gewenst. Schema staat al klaar (Phase 1 `DomainMapping` model). Idea-doc: zie ADR `2026-05-22-landing-page-builder-architectuur.md` §Notes. |
| `mcp-integration-layer` | Bidirectionele MCP-koppeling: Branddock als **server** (brand-DNA + content-gen exposen aan externe apps) én als **client** (externe MCP-bronnen inlezen bij generatie). Zie subsectie hieronder. | post-launch | 1-3w gefaseerd | **Besluit 2026-06-19**: geparkeerd tot ná launch (remote-server-helft hangt aan `vercel-deployment` + nieuwe token/OAuth-auth-surface). Client-helft = bestaande research-task [`mcp-external-data-enrichment-research`](tasks/mcp-external-data-enrichment-research.md). Feature-discovery (feature-planner → idea-doc) bewust uitgesteld. |
| `brand-assistant-standalone-app` | Brand Assistant ("Claw") als gefocuste, standalone-bruikbare app rond 2 jobs: **(J1)** feedback op een door de gebruiker gemaakt middel + **(J2)** sparren over een doelgroep. Zie subsectie hieronder. | post-launch | MVP licht → v2/v3 gefaseerd | **Besluit 2026-06-19**: geparkeerd tot ná launch. Motoren bestaan al grotendeels (`review_content` + F-VAL + persona-chat) → MVP is licht; standalone/remote-variant deelt de auth-foundation van `mcp-integration-layer` (M2, dep `vercel-deployment`). Feature-discovery bewust uitgesteld. |

---

### 🔌 MCP Integration Layer (post-launch — besluit 2026-06-19)

> **Doel**: Branddock koppelbaar maken met andere applicaties via het Model Context Protocol, in **beide** richtingen. Geparkeerd tot na launch; hier vastgelegd als plan-skelet zodat feature-discovery later kan starten met context.
> **Kernbevinding scoping-sessie**: het MCP-protocol zelf is laag-complex (officiële `@modelcontextprotocol/sdk`, business-logica zit al in `src/lib/`). De complexiteit zit volledig in (1) **multi-tenant auth** — session-cookie + `branddock-workspace-id`-resolutie vertaalt niet naar externe clients; vereist workspace-scoped API-key/OAuth 2.1 (security-gevoelig, let op IDOR/tenant-isolatie-historie) — en (2) **remote hosting** voor de server-richting (Streamable HTTP), wat aan `vercel-deployment` hangt.

| Fase | Richting | Scope | Effort | Dep |
|---|---|---|---|---|
| **M0 — Spike (server)** | Branddock = server | Lokale stdio read-only server: brand-context/assets/voice exposen, testbaar in Claude Desktop. Bewijst concept zonder auth/hosting. | ~1-2d | geen (kan los van launch) |
| **M1 — Client-enrichment** | Branddock = client | = research-task `mcp-external-data-enrichment-research`: externe MCP-bronnen (Ahrefs/HubSpot/Notion) inlezen → injecteren in canvas-context-stack vóór prompt-build. ADR MCP-vs-direct + latency-benchmark. | ~2-3d research + impl | Track B infra (credentials-mgmt, polling) |
| **M2 — Remote server (read-only)** | Branddock = server | Multi-tenant, workspace-scoped API-key/OAuth 2.1, rate-limiting. Externe apps kunnen brand-DNA veilig lezen. | ~1w | **`vercel-deployment`** |
| **M3 — Server write/generate** | Branddock = server | Tools die content-generatie triggeren (cost-control + extra testing; AI-pipeline + geld). | +enkele dagen | M2 |

**Open beslissingen vóór feature-discovery**:
- Welke "andere applicaties" als eerste doel (AI-assistenten / klant-apps / automatisering zoals Zapier-Make-n8n)? Bepaalt transport + auth-model.
- Auth-model: workspace-scoped API-key (simpeler) vs OAuth 2.1 (standaard, meer werk).
- Tool-surface server-richting: alleen lezen (veilig) vs ook genereren (cost-gevoelig).

**ADR's (te schrijven bij start)**:
- ⏳ `mcp-vs-direct-integration` (al als deliverable in `mcp-external-data-enrichment-research`)
- ⏳ `mcp-server-auth-model` — API-key vs OAuth 2.1 + workspace-scoping

**Trigger om op te pakken**: post-launch + `vercel-deployment` gemerged, óf pilot-vraag naar externe-app-koppeling.

---

### 🤖 Brand Assistant standalone-app (post-launch — besluit 2026-06-19)

> ⚠️ **Relatie-note 2026-07-06**: de **J1-tekst-MVP wordt de facto geleverd door de Brand Guardian-agent** uit het Agents-initiatief (zelfde motor: `review_content`/`runFidelityForExternalContent` + F-VAL; zie §🤖 + `tasks/agents-motor-wiring.md`). Wat van deze subsectie overblijft als post-launch-item: de **standalone/embeddable surface** (eigen URL, prospects/bureaus — dep `mcp-integration-layer` M2-auth) en de J2-persona-sparring-verdieping. Herijk de scope bij feature-discovery tegen de dan-bestaande agents.

> **Doel**: de Brand Assistant ("Claw") als gefocuste, standalone-bruikbare app rond twee jobs-to-be-done: **(J1)** feedback geven op een middel dat de gebruiker zélf maakte (copy, ad, social post, beeld/design, landingspagina, PDF), en **(J2)** sparren over een doelgroep/persona. Geparkeerd tot na launch; hier vastgelegd als plan-skelet voor latere feature-discovery.
> **Kernbevinding scoping-sessie (codebase-reuse-map + product-onderzoek)**: de motoren bestaan al grotendeels → herbouwen is niet nodig, het is **bundelen achter één surface + 3 gaten dichten + de vertrouwens-mechaniek inbouwen**.

**Wat er al ligt (hergebruik):**
- J1 tekst/URL-review: `review_content`-tool (`src/lib/claw/tools/analyze-tools.ts`) → F-VAL 3-pijler (`src/lib/brand-fidelity/fidelity-runner.ts`) → `BrandReviewFinding`-persistentie.
- J2 doelgroep: persona-chat met rollen interview/empathy/JTBD (`src/app/api/personas/chat/route.ts`).
- Grounding: `getBrandContext()` (`src/lib/ai/brand-context.ts`). Surface: ClawOverlay heeft al een *embedded* view-mode (`src/features/claw/components/ClawOverlay.tsx`).

**Drie gaten te dichten:**
1. **Geen beeld-ingest voor review** — `review_content` neemt alleen tekst/URL/PDF-tekst; vision draait al intern (`judge-image.ts`, `visual-fidelity-scorer.ts`) maar is niet aan Claw geknoopt. = grootste net-nieuwe stuk.
2. **Persona-chat staat los van Claw** (andere stack/model — OpenAI i.p.v. Anthropic) → samenbrengen.
3. **Geen gefocuste standalone surface** — Claw is nu een globale overlay, geen eigen app-ingang.

**Capability-ladder (gefaseerd):**

| Fase | Job | Scope | Hergebruik vs nieuw | Gewicht |
|---|---|---|---|---|
| **MVP** | J1 | Plak/URL → gestructureerde findings (sterk / off-brand / fix) + per-dimensie merk-score + gesprek-vervolg | ~90% bestaat (`review_content`) — vooral surface + framing | Licht |
| **MVP** | J2 | Grounded persona-role-play + devil's-advocate-mode (steelman → 3-5 objecties) | Persona-chat bestaat; anti-sycophancy + Claw-integratie nieuw | Licht-mid |
| **v2** | J1 | Beeld/ad/design-review via vision + brandstyle-referentie + OCR; inline-annotatie + apply-rewrite | Vision bestaat intern → wiren = nieuw werk | Mid |
| **v2** | J2 | Pre-mortem / objectie-map + message-fit-scorecard per persona; A/B twee boodschappen | Nieuw bovenop persona-data | Mid |
| **v3** | J1 | Volledige pagina/PDF: deterministisch eerst (contrast/hiërarchie/WCAG) + attentie-predictie | Zwaar | Zwaar |
| **v3** | J2 | Multi-persona "panel"-reactie + concurrent-context pressure-testing | Zwaar | Zwaar |

**Trust-laag (dwars door alles = het differentiator):** anti-sycophancy-prompting + "jouw merk = de maatstaf" (altijd de geëxtraheerde DNA citeren, weiger ongegronde claims) + gekalibreerd vertrouwen + J2-output labelen als *simulatie die echte validatie vereist* + asset-privacy/no-train-garantie. Onderbouwing: product-onderzoek wees uit dat de dominante faalmodus van AI-feedback- én synthetic-audience-tools sycophancy/vals vertrouwen is; grounded critique + grounded adversariële sparring is de white space (generators bekritiseren niet diep; synthetic-audience-startups zijn niet grounded; Acrolinx/Vidmob/Adobe Brand Intelligence zijn enterprise-only).

**De "app"-grens-beslissing (de enige echte keuze):**
- **In-app gefocuste sectie** (embedded ClawOverlay-mode → eigen App.tsx-sectie): goedkoopst, hergebruikt sessie-auth + workspace-resolutie. **Aanrader om mee te starten.**
- **Standalone/embeddable app** (eigen URL, voor prospects of klant-bureaus): deelt exact de auth-foundation van [`mcp-integration-layer`](#-mcp-integration-layer-post-launch--besluit-2026-06-19) M2 (workspace-scoped token/OAuth + remote hosting → dep `vercel-deployment`).

**Strategische fit**: dit is letterlijk de MarTech-positionering ("de AI-sparringspartner die je merk-DNA door en door kent", [[branddock-martech-fest-stand]]) en zit op de white space uit de concurrentie-analyse ([[branddock-competitor-analysis-2026-06-16]]).

**Open beslissingen vóór feature-discovery**:
- App-grens: in-app sectie eerst vs direct standalone (zie boven).
- J1-artefacttypen voor MVP: alleen tekst (bijna gratis) vs ook beeld (vision-gat dichten).
- Doelgebruiker: bestaande workspace-users vs externe prospects als lead-gen-wedge (bepaalt onboarding zonder volledige brand-DNA).

**Trigger om op te pakken**: post-launch; standalone-variant na `vercel-deployment` + de `mcp-integration-layer` M2-auth-foundation. De J1-tekst-MVP kan los daarvan (motor draait al), maar verbreedt dan Track A-scope.

---

## ⚪ LATER (3-12 maanden, visie)

### Brandclaw transformatie (Optie B — in stappen)

> ⚠️ **GEABSORBEERD 2026-07-06 door het Agents-initiatief** (user-directive; ADR `2026-07-05-agents-architectuur` + aanvullingen 2026-07-06). De onderstaande tabel blijft staan als historisch referentiekader, maar het uitvoeringspad loopt via [`agents-brandclaw-convergentie`](tasks/agents-brandclaw-convergentie.md) (Fase 3-epic: Strategy Analyst → catalogus; `campaign_builder`/`measurement_eval`/`optimization` als agents op dezelfde motor; autonomie-schuif; cost-budget-bewaking) — Brandclaw is de autonomie-trap bovenop de Agents-catalogus, geen losse transformatie meer.

| ID | Titel | Maand post-launch |
|---|---|---|
| `brandclaw-data-collection` | Brandclaw foundation: data verzamelen (geen agent yet) | 1-2 |
| `brandclaw-strategy-analyst` | Strategy Analyst node — leest data, geen actie | 3-4 |
| `brandclaw-campaign-builder` | Campaign Builder node — suggesteert, mens beslist | 5-6 |
| `brandclaw-measurement-eval` | Measurement + Evaluation nodes — correlatie + leren | 7-9 |
| `brandclaw-optimization` | Optimization node — autonomy gate met owner approval | 10-12 |

### Channel Activation
| ID | Titel | Notitie |
|---|---|---|
| `google-ads-integration` | Google Ads API + WorkspaceIntegration | Vereist OAuth scope expansion |
| `meta-ads-integration` | Meta Ads API (Facebook + Instagram) | Async review-status, version-pinning |
| `ayrshare-social-publishing` | Unified social publishing (LinkedIn/Instagram/Facebook/X/TikTok) | $10+/maand |
| `dataforseo-integration` | DataForSEO voor SEO intelligence | Pay-as-you-go |

### Externe integraties (Tier 1 prio)
| ID | Titel | Kosten |
|---|---|---|
| `brandfetch-integration` | Brandfetch (logo's, kleuren, fonts voor 60M merken) | $99/mnd |
| `perplexity-sonar` | Perplexity Sonar voor real-time research | Pay-per-token |
| `hubspot-crm-loop` | HubSpot CRM (persona validatie, campaign→deal ROI) | Free tier |
| `slack-notifications` | Slack alerts voor Brand Alignment / Trend Radar | Free |

### Tech debt
| ID | Titel |
|---|---|
| `adapter-pattern-afbouw` | Adapter pattern afbouwen (mock↔API mappers) |
| `dual-versioning-cleanup` | Drop BrandAssetVersion tabel ten gunste van ResourceVersion |
| `studio-cleanup-item-192` | Verwijder dead code in `src/lib/studio/` (quality-scorer, improve-suggester, ai-router) |

### Privacy / DPA / Cross-klant
| ID | Titel |
|---|---|
| `privacy-dpa-hooks` | Workspace-isolation enforcement, opt-in cross-klant aggregaten |
| `cross-workspace-benchmarks` | WorkspacePerformanceBenchmark model |

### Campagne-brief uitbreidingen (Fase B — follow-ups na Fase A output-mapper)
> Komen voort uit A3-validatie 2026-05-07. Elk vereist eigen `feature-planner` discovery met expliciete Brandclaw-loop-impact-vraag. ADR vereist voor B1/B2 (raken Strategy Analyst + Measurement nodes), aanbevolen voor B3 (Optimization).
> **B-weekly-calendar dissolved 2026-05-07**: feature-planner discovery liet zien dat het probleem (saaie repetitieve posts + ontbrekende week-coherentie) beter wordt opgelost in `studio-content-generation-real-ai` (siblings-context) + Fase A (week-thema-render-prompt). Zie `tasks/_drafts/idea-campaign-weekly-calendar.md`.

| ID | Titel | Brandclaw-impact |
|---|---|---|
| `campaign-kpi-structure` | Typed KPI-schema + KPI-prompt-fase (primair/secundair/counter, sub-segmentatie) | ADR — Measurement node directe input |
| `campaign-budget-table` | `CampaignBudget` model met line-items + percentage-toelichting + contingency | ADR aanbevolen — Optimization node mutation-policy |
| `campaign-risk-assessment` | `CampaignRisk` model + risk-assessment-prompt-fase met mitigatie-stappen | Beperkt — cross-link in `gotchas.md` volstaat |
| `weekly-theme-actuality-driven` | Actualiteit-driven thematisering + zelflerend (Perplexity Sonar + Brandclaw Measurement→Optimization) | Vereist Brandclaw foundation + Measurement (maand 7-9) |

### F-VAL iteraties
| ID | Titel | Trigger |
|---|---|---|
| `fval-iteratie-3` | Data-gedreven re-tuning van pillar weights | Na 3-6 maanden productie-data |

---

## 💡 Aanbeveling huidige sessie

**2026-07-05**: Twee grote ontwikkelingen. (1) **`vercel-deployment` GEREALISEERD** — app live op branddock-7y9n.vercel.app (main=production, Vercel Pro+Fluid); de hard launch-blocker is weg. Ontgrendelt `pilot-onboarding-better-brands` (2d), Track B Phase C (Vercel Cron) en de GEO deploy-smoke; het kritieke pad naar de eerste pilot verschuift naar `stripe-billing-live` + `pilot-onboarding-better-brands`. (2) **Agents-initiatief volledig gepland** (zie §🤖): diepte-analyse (rapport `docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md`) + idea-doc (`ready-to-build`) + ADR `2026-07-05-agents-architectuur` + 6 task-files voor alle 3 fasen. User koos Agents Fase 1 als actieve pre-launch-werkstroom; startpunt: `agents-foundation` in plan-mode (A1-verificatie-spike eerst — output-contract-adapter zonder Strategy-Analyst-regressie), worktree `branddock-feat-agents-feature`.

**2026-06-30**: Meertaligheid-initiatief vastgelegd (ADR `2026-06-28` + 5 task-files, na 2 onderzoeks-workflows + adversariële review). Twee assen: UI-taal per gebruiker (i18next, auto AI-vertaald) + content-taal per workspace/markt (Approach C). User koos volledige multi-markt; Fases 1-3 zijn pre-launch-startklaar en niet-brekend, Fase 4-5 is een enterprise/LATER-track met go/no-go-gate die `vercel-deployment` niet mag gijzelen. Artefacten staan nog ongecommit op `fix/security-h3-purchase-entitlement` — verplaatsen naar een eigen branch aanbevolen. **Belangrijk**: dit verandert het kritieke pad niet — `vercel-deployment` (Track C) blijft de hard launch-blocker; meertaligheid is een parallelle pre-launch-werkstroom.

**2026-06-25**: Juni-werkstroom (GEO/SEO Fase 1-3 + followups + LP-render-bugfixes + brandstyle-calibratie) is **afgerond en gemerged** — er is geen pre-launch finalisatie-werk meer dat met Track C concurreert (de eerdere "lp-* in-review"-stand was stale). De rode draad: vrijwel al het resterende werk hangt aan **`vercel-deployment`** (Track B Phase C, GEO deploy-smoke + nightly cron, pilot-onboarding). Dat is nu de onbetwiste kritieke stap. Worktree `branddock-launch` is 2026-06-26 ge-synct met main (current), dus eerste actie: `vercel-deployment` in plan-mode. Zelf-drijfbaar parallel: `content-items-test-coverage` Ronde 1 (8 representanten) + `code-debt` fill-in. CI-noot: `golden-sets.yml` nightly-faal gefixt (key-guard) — voeg `ANTHROPIC_API_KEY` als repo-secret toe om de eval echt te activeren.

**2026-05-18**: Sprint #4 dicht. Track B Phase A+B gemerged (15-20d landed in `a0e59a5b`). Effie-blocker weg. Kritieke pad voor pilot ligt nu bij **Track C — `vercel-deployment`** want dat is een dubbele dependency: (a) hard launch-blocker voor pilot-onboarding, (b) sequential dep voor Phase C Vercel Cron van Track B.

**Direct volgende stappen** (kortste pad pilot):
1. **Track C activeren — `vercel-deployment`** (3d) — eerst `git rebase main` op `branddock-launch` worktree (~58 commits achter). Ontgrendelt zowel `pilot-onboarding-better-brands` (2d) als `Phase C Vercel Cron` (5-7d) van Track B.
2. **testplan-content-items Ronde 1 — 8 representanten** (~1d) — parallel jouw browser-werk. STOP-GATE genomen, effie-fix wordt mee-geverifieerd via DOM grep per representant.
3. **Track B Phase C** (5-7d) — in `branddock-brandclaw` worktree na vercel-deployment landed. Vercel Cron weekly + concurrency-cap + cost-budget alerts + BB pilot smoke.

**Track A vervolg parallel**: `content-test-auto-iterate-6B` wiring + dashboard panels (deferred deel afmaken) + `code-debt` fill-in werk.

Pilot-projectie: **+5-7 weken vanaf 2026-05-18** (eerder geprojecteerd +9-11 weken vanaf 2026-05-12, met 6 dagen verstreken + strategy-analyst-stub Phase A+B 15-20d landed = ~2 weken winst).

**Track-allocation vanaf sprint #6**:
- Track A (main): Ronde 1 + Ronde 2 + 6B wiring + code-debt fill-in
- Track B (worktree branddock-brandclaw): Phase C — Vercel Cron + concurrency + cost alerts + BB pilot smoke (parallel: competitor-ai-event-classifier + competitor-content-item-discovery via technical-planner)
- Track C (worktree branddock-launch): vercel-deployment → stripe-billing-live → pilot-onboarding → marketing-site-pricing → onboarding-flow-test

**Validatie-acties competitive-intel Fase 2/4** (vóór technical-planner promotion):
- Pilot-priority-check (3 leads): is competitor-intelligence in top-3 needs?
- Cost-modeling Fase 4: workspaces × concurrenten × scan-frequency × token-cost — budget-plafond bepalen

---

## Cross-references

- Operating manual / spelregels: [`docs/playbooks/working-flow.md`](docs/playbooks/working-flow.md)
- Runtime instructie agent: [`CLAUDE.md`](CLAUDE.md)
- Actieve task details: [`tasks/`](tasks/)
- Wat is gebouwd: [`docs/changelog.md`](docs/changelog.md)
- Architectuur-beslissingen: [`docs/adr/`](docs/adr/)
