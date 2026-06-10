# Roadmap

> **Laatst bijgewerkt**: 2026-05-29 (Track B doc-reconciliatie: `competitor-ai-event-classifier` #263, `competitor-activities-ui` #271 én `competitor-scraping-apify-fallback` #272 bleken al gebouwd+gemerged maar stale "open" — alle drie op done gezet; `strategy-analyst-stub` → in-progress (Phase A+B done, Phase C open). `competitor-content-item-discovery` gebouwd + done 2026-05-29 (#275) — hele competitive-intel data→detectie→zichtbaarheid→ingestie loop nu compleet; enige resterende Track B = strategy-analyst Phase C (dep op vercel). — Eerder: `web-page-builder-canvas-step-mvp` promoted post-launch → pre-launch Track A sprint #6 — 130 commits in feature-branch, 5 dagen extra scope, finalisatie + 4 squash-merges in plan `zippy-twirling-feigenbaum`. Brand-fidelity gap in Step 2 LP-deliverables toegevoegd als Track 5. `web-page-builder-v2-custom-domains` toegevoegd als post-launch follow-up. 2026-05-19 context-picker audit Brand Assistant + Persona chat → 1 Tier-1 gap: `context-picker-strategy-observations` toegevoegd aan Track A NOW. 2026-05-18 Track B Phase A + B gemerged naar main via `a0e59a5b` — `brandclaw-data-collection` ✅, `brandclaw-tool-orchestrator` ✅, `strategy-analyst-stub` Phase A + A vervolg + B ✅; Phase C 5-7d open in `branddock-brandclaw` worktree, sequential dep op vercel-deployment).
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
| **Phase 3 — Strategy Analyst** | brandclaw-data-collection ✅, brandclaw-tool-orchestrator ✅, strategy-analyst-stub Phase A+B ✅ (gemerged 2026-05-18 via `a0e59a5b`), Phase C open (Vercel Cron + concurrency-cap + cost-budget alerts + BB pilot smoke) | 15-20d landed + 5-7d resterend | ✅ Phase A+B done; Phase C wacht op `vercel-deployment` |

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

## ⚡ NOW (pre-launch — sprint #6-7, ~5-7 weken resterend)

Pre-launch scope herzien 2026-05-12 (2× uitbreiding zelfde dag): alle items uit roadmap-inventaris naar pre-launch + Strategy Analyst full scope + Competitor AI dubbel + **content-test verbeterplan Optie B Full** (chain-of-prompts + multi-modal). 3 parallelle tracks via worktrees. Pilot-projectie: **+5-7 weken vanaf 2026-05-18** (eerder +9-11 weken vanaf 2026-05-12; Track B Phase A+B 15-20d landed in 6 dagen via parallel-track, +2 weken winst).

**Track A — Quality + Validation** (main branch)

> **Scope-uitbreiding 2026-05-12**: Track A draagt nu het **content-test verbeterplan** (Optie B Full, ~40d), gefaseerd over 6 sub-sprints #5.A → #7.B. Pilot-projectie verschuift naar +9-11 weken. Volledig plan: `docs/specs/content-test-improvement-plan.md`.

| ID | Titel | Effort | Sprint | Status |
|---|---|---|---|---|
| `content-items-test-coverage` | Handmatige testplan 53 types (representanten + Ronde 1 + Ronde 2). Playbook: `docs/playbooks/testplan-content-items.md`. Levert baseline-data voor golden-sets. | 1d representanten + 2-3d full | #4 (representanten) + parallel met #5.B | open |
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
| [`strategy-analyst-stub`](tasks/strategy-analyst-stub.md) Phase A+B | Strategy Analyst node — node entry + manual trigger + UI Tab 5 + 4 dimensions + sort/group | 15-20d landed | #5-6 | ✅ done 2026-05-18 (#260/#261/#262) |
| `strategy-analyst-stub` Phase C | Vercel Cron weekly `0 9 * * 1` + per-workspace concurrency-cap + cost-budget alerts (>$10/ws/maand → PostHog) + BB pilot smoke met productie-data | 5-7d | #6-7 | open — **sequential dep op vercel-deployment** |
| [`competitor-ai-event-classifier`](tasks/done/competitor-ai-event-classifier.md) | AI-pattern-detector voor CATEGORY_REPOSITIONING + TARGET_AUDIENCE_CHANGED bovenop deterministische diff-engine. A1 96,7% accuracy. | 3-4d | #6 | ✅ done 2026-05-19 (#263, PR #6) |
| [`competitor-activities-ui`](tasks/done/competitor-activities-ui.md) | Activities zichtbaar maken: detail-timeline + dashboard attention + multi-competitor digest + Brand Assistant tool + in-app/email notificaties + reconcile-cron. Gemerged via PR #8/#13 + BA-tool/cron branches; ge-finalized + gehardend 2026-05-29. | 2-3d | #6 | ✅ done 2026-05-29 (#271) |
| [`competitor-scraping-apify-fallback`](tasks/done/competitor-scraping-apify-fallback.md) | 3-step scraper-chain (current → Apify playwright:firefox → Gemini) in refresh-route; redt JS-heavy SPA scrape-failures die anders geen classifier-input leveren. | 1-1.5d | #6 | ✅ done 2026-05-29 (#272, PR #12) |
| [`competitor-content-item-discovery`](tasks/done/competitor-content-item-discovery.md) | RSS + sitemap producer voor `CompetitorContentItem`: discovery → format-classify (regex + Haiku) → theme-tag → NEW_*-activities. Geïntegreerd in refresh-route (async pre-TX). | 5-6d | #6 | ✅ done 2026-05-29 (#275) |
| ~~`cron-infra-adr`~~ | ✅ Done 2026-05-12 — Vercel Cron continueren, zie `docs/adr/2026-05-12-cron-infra.md` | ~2u | #4 | ✅ done |

**Track C — Launch infra** (worktree `branddock-launch`)
| ID | Titel | Effort | Sprint | Status |
|---|---|---|---|---|
| [`vercel-deployment`](tasks/vercel-deployment.md) | Vercel + Neon DB + custom domain + monitoring | 3d | #5 | open task-file |
| [`stripe-billing-live`](tasks/stripe-billing-live.md) | Stripe live billing — checkout + webhooks + plan enforcement | 1w | #6 | open task-file |
| [`pilot-onboarding-better-brands`](tasks/pilot-onboarding-better-brands.md) | Better Brands eerste pilot live | 2d | #6 (na vercel) | open task-file |
| `onboarding-flow-test` | Onboarding flow met 3 externe gebruikers | 1w | #7 | task-file volgt |
| `marketing-site-pricing` | Marketing site + pricing pagina | 1w | #6-7 | task-file volgt |

### Sprint-volgorde

**Sprint #4 — Validation + Quick wins** (DICHT per 2026-05-17)
1. ✅ Browser-smoke batch (~1-2u) — Surface C + claw-page-awareness + locale-picker done. VB Compose/Trained deferred post-vercel.
2. ✅ Cron-infra ADR (~2u) — Vercel Cron continueren (`docs/adr/2026-05-12-cron-infra.md`)
3. ✅ Code-debt 2/12 quick wins + close-out cluster A/B/C (#257, 2026-05-17)
4. ✅ STOP-GATE genomen 2026-05-17: P2 [shared-pipeline] Effie-rubric leak gefixt (#258 `e849a1ed`) + auto-iterate variant-clobber + long-form shrinkage fix (#259 `cdd0e074`)
5. ⏳ testplan-content-items Ronde 1 — 8 representanten (~1d) — **kan hervatten**, effie-fix mee-verifiëren via DOM grep tijdens normale sweep

**Sprint #5 — Bugfix + Foundation start** (Track A klaar, Track B Phase A+B gemerged 2026-05-18)
- Track A: ✅ 5A foundation + ✅ 5B goldens + ✅ 6A wiring-gates + ✅ 6B partial + ✅ compose-Gemini + ✅ claw-page-awareness vervolg. **Open**: 6B wiring/dashboard finish + bugfix-cluster uit Ronde 1 + full 53-types Ronde 1.
- Track B: ✅ Phase A+B gemerged via `a0e59a5b` — data-collection + tool-orchestrator + strategy-analyst Phase A+vervolg+B + model-ID hotfix (#255/256/260/261/262). **Open**: Phase C in worktree `branddock-brandclaw` — sequential dep op Track C.
- Track C: ⏸️ niet gestart (worktree ~58 commits behind main inclusief brandclaw-merge). Rebase + vercel-deployment (3d) start. **Hard launch-blocker + ontgrendelt Phase C Vercel Cron.**

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
| [`vercel-deployment`](tasks/vercel-deployment.md) | Vercel + Neon DB + custom domain + monitoring | launch | 3 dagen | Hard launch-blocker |
| [`stripe-billing-live`](tasks/stripe-billing-live.md) | Stripe live billing — checkout + webhooks + plan enforcement | launch | 1 week | Hard launch-blocker, parallel met Vercel mogelijk |
| [`pilot-onboarding-better-brands`](tasks/pilot-onboarding-better-brands.md) | Better Brands eerste pilot live | launch | 2 dagen | Voorwaarde: vercel-deployment done |
| `onboarding-flow-test` | Onboarding flow met 3 externe gebruikers | launch | 1 week | Validation pre-klant — task-file volgt |
| `marketing-site-pricing` | Marketing site + pricing pagina | launch | 1 week | Conversie-driver — task-file volgt |

**Post-launch**

> Pre-launch scope is uitgebreid 2026-05-12 — `strategy-analyst-stub`, `brandclaw-tool-orchestrator`, `competitor-ai-event-classifier`, `competitor-content-item-discovery` zijn nu pre-launch (zie NOW). Post-launch resteert het volgende.

| ID | Titel | Fase | Effort | Notitie |
|---|---|---|---|---|
| `delta-4-publishgate-2nd-opinion` | Δ-4 PublishGate 2nd-opinion review-pass | post-launch | onbekend | Verplaatst 2026-05-12 uit BCP Phase 2: preventief bouwen zonder pilot-evidence onverstandig. 4 mogelijke interpretaties open: (a) extra AI-call ander model, (b) heuristic conflict-detector, (c) human-in-the-loop, (d) adversarial probe. |
| [`power-user-shortcuts`](tasks/power-user-shortcuts.md) | Power-user shortcuts (5 micro-optimalisaties) | post-launch | 1-2 dagen | Gedistilleerd uit plan |
| `learning-loop-dashboard-usage` | Per-sourceIdentifier dashboard | post-launch | halve dag | Task-file volgt |
| `weekly-report-email-via-resend` | Weekly report email via Emailit | post-launch | 1 dag | Task-file volgt na weekly-report generator |
| `studio-siblings-context-variation` | Variatie-borging tussen naburige posts (lexicale diversiteit Jaccard) | post-launch | ½-1 dag | Quality-enhancement na studio-P0. Geen Brandclaw-impact. |
| `web-page-builder-v2-custom-domains` | Vercel Domains API + CNAME provisioning + SSL monitoring + DomainMapping write-path | post-launch | 1-2w | Decision-trigger: ≥3 pilot-klanten vragen custom-domain óf `marketing-site-pricing` onder `branddock.com` gewenst. Schema staat al klaar (Phase 1 `DomainMapping` model). Idea-doc: zie ADR `2026-05-22-landing-page-builder-architectuur.md` §Notes. |

---

## ⚪ LATER (3-12 maanden, visie)

### Brandclaw transformatie (Optie B — in stappen)
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
