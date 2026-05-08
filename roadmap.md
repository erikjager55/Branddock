# Roadmap

> **Laatst bijgewerkt**: 2026-05-08 (laat — BCP Phase 0+1 task-files compleet, Canvas-cluster gepromoot uit audit, Competitive Intelligence Loop PR-1 gecommit).
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
| **Phase 1 — F-VAL extension** | [`bv-wire-w1-full-centroid`](tasks/done/bv-wire-w1-full-centroid.md) ✅, [`heuristics-packages-multilingual`](tasks/heuristics-packages-multilingual.md) (Δ-2, 5-7d, open), [`voice-baseline-1pager`](tasks/voice-baseline-1pager.md) (Δ-3, 2-3d, open) | 8-11d | bv-w1 done; Δ-2 + Δ-3 task-files aangemaakt 2026-05-08 |
| **Phase 2 — Review surfaces** | Δ-1 Content Review (3 surfaces: Brand Alignment Tab 3 + Brand Assistant chat-tool + PublishGate), Δ-4 PublishGate 2nd-opinion, [`canvas-inline-edit-overlays`](tasks/canvas-inline-edit-overlays.md), claw-page-awareness vervolg-cluster (page-wiring deferred uit Phase 0.2.A) | 13-17d | task-files volgen |
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
- ⏳ ADR voor Fase 4 cron-infra (Vercel Cron vs Upstash QStash) — vóór Brandclaw monitoring start
- ⏳ Mogelijke retention-ADR — wanneer snapshot-tabel >100k rijen of privacy-incident

**Validatie-blokker vóór Fase 2 promotion**: pilot-priority-check (3 leads) + cost-modeling Fase 4 — zie idea-doc Red Team Review.

---

## ⚡ NOW (deze 2-4 weken)

Pre-launch = product-readiness van content-flows + foundations voor BCP en Competitive Intelligence Loop.

**Actief — Canvas/Studio bouw-tasks (uit discovery 2026-05-08)**
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`content-locale-enforcement-fix`](tasks/done/content-locale-enforcement-fix.md) | Tweetalige output bugfix — locale-enforcement op alle generation-routes. `npm run smoke:locale` 31/31 passed (29 unit + 2 live AI). | 1-2 dagen | ✅ done 2026-05-08 | - |
| [`canvas-tweaks-conversion-shortform`](tasks/done/canvas-tweaks-conversion-shortform.md) | Per-item tweaks #1 — 13 types (4 social + 7 ads + 2 email). `conversionContentStyleFields()` + Asset Planner examples + canvas-orchestrator hookFormat-enrichment. `npm run smoke:conversion-tweaks` 8/8 passed. | 2-3 dagen | ✅ done 2026-05-08 | - |
| [`canvas-tweaks-longform-authority`](tasks/done/canvas-tweaks-longform-authority.md) | Per-item tweaks #2 — 10 types (6 long-form + 4 PR/case). `authorityContentFields()` + `narrativeAnchorFields()` + canvas-orchestrator AUTHORITY_RICH_RENDERS (THESIS/ANTI-THESIS/PIVOT framing). `npm run smoke:longform-tweaks` 8/8 passed. | 2 dagen | ✅ done 2026-05-08 | - |
| [`canvas-tweaks-structured-skeleton`](tasks/canvas-tweaks-structured-skeleton.md) | Per-item tweaks #3 — 13 types (9 structured + 3 naked-fixes + 4 video). Parametrized `skeletonInputFields(kind)`. | 2 dagen | open | - |
| [`canvas-image-briefing-defaults`](tasks/canvas-image-briefing-defaults.md) | Image #1 — per-content-type defaults-mapping (23 types) + suggestie-strook in Step1Context. | 1 dag | open | - |
| [`canvas-image-content-coupling`](tasks/canvas-image-content-coupling.md) | Image #2 — persona+product+cta+concept in image-prompt-builder, 4 routes updaten. | 1-1.5 dag | open | - |
| [`canvas-image-briefing-textarea`](tasks/canvas-image-briefing-textarea.md) | Image #3 — dedicated briefing-veld + nieuwe `/suggest-visual-briefing` route met Claude. | 1 dag | open | - |

**Actief — BCP Phase 1 (F-VAL extension)**
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`heuristics-packages-multilingual`](tasks/heuristics-packages-multilingual.md) | Δ-2 — F-VAL Pijler 3 NL-NL / NL-BE / EN-GB / DE-DE pakketten | 5-7 dagen | open | - |
| [`voice-baseline-1pager`](tasks/voice-baseline-1pager.md) | Δ-3 — afgeleide compact voice-view uit BrandVoiceguide | 2-3 dagen | open | - |

**Actief — overige NOW**
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`competitor-snapshot-historie`](tasks/done/competitor-snapshot-historie.md) | Competitive-intel Fase 1 — Snapshot/Activity/ContentItem schema + dual-write refresh + backfill + 7 diff-rules. ADR accepted. | 3-4 dagen | ✅ done 2026-05-08 | - |
| [`campaign-brief-output-mapper`](tasks/campaign-brief-output-mapper.md) | Cowork-pariteit Fase A render-mapper. Phase -1 Gates 3/3, geen ADR, render-only. | 2-3 dagen | open | - |

**Recent voltooid — discovery (week 19, 2026-05-08)**
- ✅ [`canvas-studio-audit`](tasks/done/canvas-studio-audit.md) — `docs/audits/2026-05-08-canvas-studio-state.md`. Spec-claims vs code-realiteit + 5 open vragen.
- ✅ [`canvas-per-item-tweaks-plan`](tasks/done/canvas-per-item-tweaks-plan.md) — `docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md`. 53 types geanalyseerd → 3 bouw-tasks. Hypothese-sterkte: wisselvallig (sterk voor 3 archetypen).
- ✅ [`canvas-image-briefing-plan`](tasks/done/canvas-image-briefing-plan.md) — `docs/audits/2026-05-08-canvas-image-briefing-plan.md`. 5 visual-routes + UX-flow (suggestie-strook in Step1Context, geen aparte modal) + 23 type-defaults → 3 bouw-tasks.

**Recent voltooid (week 19, 2026-05-07/08)**
- ✅ Content-items kritisch pad (4 tasks): studio-content-generation-real-ai, content-versioning-crud, brand-voice-content-integration, content-item-qa-gating
- ✅ Independent pre-launch tracks (4 tasks): posthog-sentry-browser, campaign-drafts-db-backed, content-styling-migratie, auto-trigger-fidelity-scoring
- ✅ BCP Phase 0 voorlopers (3 tasks): tech-debt-any-types (146 fixes), claw-page-awareness (foundation only — page-wiring vervolg in Phase 2), bv-wire-w1-full-centroid (Better Brands Δ+24)

Volledige details in `tasks/done/` + `docs/changelog.md`.

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

> 4 items verplaatst 2026-05-08 naar **Brand Control Program** (zie programma-sectie boven): `claw-page-awareness` + `canvas-inline-edit-overlays` (Phase 0/2), `bv-wire-w1-full-centroid` (Phase 1), `tech-debt-any-types` (Phase 0).

| ID | Titel | Fase | Effort | Notitie |
|---|---|---|---|---|
| [`power-user-shortcuts`](tasks/power-user-shortcuts.md) | Power-user shortcuts (5 micro-optimalisaties) | post-launch | 1-2 dagen | Gedistilleerd uit plan |
| `learning-loop-dashboard-usage` | Per-sourceIdentifier dashboard | post-launch | halve dag | Task-file volgt |
| `weekly-report-email-via-resend` | Weekly report email via Emailit | post-launch | 1 dag | Task-file volgt na weekly-report generator |
| [`campaign-brief-output-mapper`](tasks/campaign-brief-output-mapper.md) | Campagne-brief output-mapper (Fase A van Cowork-pariteit) | pre-launch | 2-3 dagen | Technical-planner promoted 2026-05-07. Phase -1 Gates 3/3 passed, geen ADR. Render-only, geen Prisma-wijziging. **Now-eligible** sinds studio-P0 done — verplaatsen naar NOW-tabel wanneer gepakt wordt |
| `studio-siblings-context-variation` | Variatie-borging tussen naburige posts (lexicale diversiteit Jaccard) | post-launch | ½-1 dag | Quality-enhancement na studio-P0. Lost saaie-posts JTBD op (B1-discovery 2026-05-07). Geen Brandclaw-impact. |

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

**2026-05-08 (laat)**: BCP Phase 0 done; Phase 1 task-files (Δ-2 + Δ-3) gepromoot; ADR-2 Brandclaw agent-architectuur ✅ accepted; Canvas-studio-audit done en spawnde 6 canvas-cluster tasks; Competitive Intelligence Loop PR-1 schema gecommit. **10 priority-now tasks** open verspreid over 4 clusters.

**Cluster-prioritering** (gebruiker kiest oppakvolgorde):

- **Competitive-intel** — PR-2 (diff-engine + backfill) en PR-3 (refresh dual-write) van `competitor-snapshot-historie`. Werk-in-uitvoering, foundation voor Fase 2/4.
- **BCP Phase 1** — `heuristics-packages-multilingual` (Δ-2, 5-7d) + `voice-baseline-1pager` (Δ-3, 2-3d). Blokt Phase 2 review-surfaces.
- **Canvas tweaks** — 3 tasks (conversion / longform / structured), 6-7d totaal. Pilot-quality-driver, geen Phase-blokker.
- **Canvas image** — 3 tasks (defaults / textarea / coupling), 3-3.5d totaal. Visual-brief polish.
- **Cowork-pariteit Fase A** — `campaign-brief-output-mapper` (2-3d), render-only.

**Validatie-acties competitive-intel Fase 2/4** (vóór technical-planner promotion):
- Pilot-priority-check (3 leads): is competitor-intelligence in top-3 needs?
- Cost-modeling Fase 4: workspaces × concurrenten × scan-frequency × token-cost — budget-plafond bepalen

Vercel + Stripe blijven in launch-fase (NEXT) — `pilot-onboarding-better-brands` wacht op programma-completion (+10-14 weken).

---

## Cross-references

- Operating manual / spelregels: [`docs/playbooks/working-flow.md`](docs/playbooks/working-flow.md)
- Runtime instructie agent: [`CLAUDE.md`](CLAUDE.md)
- Actieve task details: [`tasks/`](tasks/)
- Wat is gebouwd: [`docs/changelog.md`](docs/changelog.md)
- Architectuur-beslissingen: [`docs/adr/`](docs/adr/)
