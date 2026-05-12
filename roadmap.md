# Roadmap

> **Laatst bijgewerkt**: 2026-05-12 (pre-launch scope-uitbreiding na inventaris — 5 items + 10 code-TODOs uit roadmap-gaps pre-launch getrokken; 3 parallelle tracks over 4 sprints, ~6-8 weken).
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
| **Phase 3 — Strategy Analyst** | brandclaw-data-collection, Strategy Analyst stub (agent-architecture v1) | 20-27d | task-files volgen |

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

## ⚡ NOW (pre-launch — 4 sprints, ~6-8 weken)

Pre-launch scope herzien 2026-05-12: alle items uit roadmap-inventaris naar pre-launch getrokken (incl. Strategy Analyst full scope + Competitor AI dubbel). 3 parallelle tracks via worktrees. Pilot-projectie: +6-8 weken.

**Track A — Quality + Validation** (main branch)
| ID | Titel | Effort | Sprint | Status |
|---|---|---|---|---|
| `content-items-test-coverage` | Testplan 53 content-types (representanten + Ronde 1 + Ronde 2 generator-evaluatie). Playbook: `docs/playbooks/testplan-content-items.md` | 3d (full) of 1d (representanten) | #4 (representanten) + #5-6 (full) | open task-file |
| `pre-launch-browser-smoke-batch` | Bundeling: Δ-1 Surface C 9-stap + claw-page-awareness vervolg 5-stap + Visual Brief Compose/Trained-Style E2E + locale-picker browser-smoke | ~1-2u | #4 (3/5 done, Visual Brief deferred) | partial — VB smokes deferred post-vercel-deployment |
| `code-debt-pre-launch-cleanup` | Persist-TODOs (variant-selection, fix-options, persona-image) + design-tokens cleanup + Exa API replacement + ProseMirror diff + suggest-visual-briefing error-UX. Verspreid over sprints. | ~6d totaal | #4-7 fill-in | open task-file (2/12 items done) |
| `compose-pipeline-gemini-migration` | Migreer compose-route van FAL Flux Pro Kontext naar Gemini Image (`gemini-2.5-flash-image-preview` / nano-banana). User-empirisch betere quality voor multi-reference compose. | ~1d | #5 fill-in | open task-file (2026-05-12, na sprint #4 smoke-finding) |

**Track B — Brandclaw + Competitive AI** (worktree `branddock-brandclaw`)
| ID | Titel | Effort | Sprint | Status |
|---|---|---|---|---|
| [`brandclaw-tool-orchestrator`](tasks/brandclaw-tool-orchestrator.md) | Shared Anthropic tool-orchestrator voor alle Brandclaw nodes. Foundation. | 3-5d | #5 | open task-file |
| [`strategy-analyst-stub`](tasks/strategy-analyst-stub.md) | Strategy Analyst node — leest data, suggesteert insights. Volledige MVP-scope pre-launch (beslissing 2026-05-12). | 20-27d | #5-7 | open task-file |
| `competitor-ai-event-classifier` | AI-pattern-detector voor 5 strategische CompetitorActivity-types (CATEGORY_REPOSITIONING / VISUAL_REBRAND / etc.). Idea: `tasks/_drafts/idea-competitor-ai-event-classifier.md` ready-to-build. | 3-5d | #5-6 | needs task-file via technical-planner |
| `competitor-content-item-discovery` | Discovery van competitor-content via crawl/RSS. Idea: `tasks/_drafts/idea-competitor-content-item-discovery.md` ready-to-build. | onbekend (5d?) | #6-7 | needs task-file via technical-planner |
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

**Sprint #4 — Validation + Quick wins** (~1 week, geen parallelisatie nodig)
1. Browser-smoke batch (~1-2u) — quick confidence-check
2. Cron-infra ADR (~2u)
3. Code-debt quick wins: design-tokens cleanup + variant-selection persist (~2-3u)
4. testplan-content-items Ronde 1 — 8 representanten (~1d)
5. **STOP-GATE**: review bug-log, plan sprint #5 bugfix-scope

**Sprint #5 — Bugfix + Foundation start** (~2 weken, parallel-start)
- Track A: bugfix-cluster uit testplan + start full 53-types Ronde 1
- Track B: brandclaw-tool-orchestrator (3-5d) + competitor-ai-event-classifier task-file via technical-planner
- Track C: vercel-deployment (3d) start

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

**2026-05-12**: roadmap-inventaris onthulde 5 items + ~10 code-TODOs die niet op roadmap stonden. Alle items pre-launch getrokken. 3 parallelle tracks via worktrees over 4 sprints (~6-8 weken). Strategy-analyst-stub full scope (20-27d) is het langste pad — bepaalt feitelijke pilot-projectie.

**Direct volgende stap — Sprint #4 start** (~1 week, geen parallelisatie):
1. **Browser-smoke batch** (~1-2u) — Δ-1 Surface C 9-stap + claw-page-awareness vervolg 5-stap + Visual Brief Compose/Trained-Style E2E + locale-picker browser-smoke. Confidence-check voor alle sprint #3-werk.
2. **Cron-infra ADR** (~2u) — Vercel Cron vs Upstash QStash decision. Blocker voor competitor-monitoring.
3. **Code-debt quick wins** (~2-3u) — design-tokens cleanup (15m) + variant-selection persist (2u).
4. **testplan-content-items Ronde 1 — 8 representanten** (~1d) — blog-post / linkedin-post / search-ad / newsletter / landing-page / explainer-video / one-pager / press-release.
5. **STOP-GATE eind sprint #4**: bug-log review, plan sprint #5 bugfix-scope.

**Track-allocation vanaf sprint #5**:
- Track A (main): testplan finish + bugfixes + persist-TODOs
- Track B (worktree branddock-brandclaw): brandclaw-tool-orchestrator → strategy-analyst-stub (parallel: competitor-ai-event-classifier)
- Track C (worktree branddock-launch): vercel-deployment → stripe-billing-live → pilot-onboarding

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
