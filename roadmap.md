# Roadmap

> **Laatst bijgewerkt**: 2026-05-09 (sprint #2 gemerged via PR #5 `618d336`; BCP Phase 0+1 + Canvas-cluster + Cowork Fase A + Competitive-intel Fase 1 op `main`).
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
| **Phase 2 — Review surfaces** | Δ-1 Content Review (3 surfaces: Brand Alignment Tab 3 + Brand Assistant chat-tool + PublishGate), Δ-4 PublishGate 2nd-opinion, [`canvas-inline-edit-overlays`](tasks/done/canvas-inline-edit-overlays.md) ✅, claw-page-awareness vervolg-cluster (page-wiring deferred uit Phase 0.2.A) | 13-17d | inline-edit done; Δ-1/Δ-4/claw-vervolg task-files volgen |
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

Pre-launch = BCP Phase 2 review-surfaces (Δ-1 → Δ-4 → claw-vervolg). Alle Phase 0+1 + Canvas/Studio + Cowork Fase A + Competitive-intel Fase 1 zit op `main`.

**Actief — Δ-1 Content Review surfaces**
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`content-review-tab-3-ui`](tasks/content-review-tab-3-ui.md) | Δ-1 Surface C — Brand Alignment Tab 3 "Content Review" UI. Eerste pilot-zichtbare review-surface (paste-textarea + URL + composite-score + findings-tabel). | 1-2 dagen | in-progress | - |
| `delta-1-surface-d` | Δ-1 Surface D — Brand Assistant chat-tool `add_review_findings`. Task-file nog te maken (idea-doc verloren bij branch-switch — feature-planner opnieuw of hergebruik oud Δ-1 voorstel). | 2-3 dagen | open | task-file |
| `delta-1-surface-e` | Δ-1 Surface E — PublishGate findings-block. Scope-trim: na Surface C pilot-feedback bouwen, niet upfront (regressie-risico op pilot-demo). | 2-3 dagen | open | task-file + Surface C smoke |

**Actief — overige Phase 2**
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| `delta-4-publishgate-2nd-opinion` | Δ-4 PublishGate 2nd-opinion review-pass | onbekend | open | task-file |
| `claw-page-awareness-vervolg` | Page-wiring PersonaDetail / BrandAssetDetail / Step1Context (deferred uit Phase 0.2.A) | ~2 dagen | open | task-file |

**Recent voltooid (sprint #2, gemerged 2026-05-09 via PR #5 `618d336`)**

> 16 task-finalizations + 254/254 smoke-checks + 11 nieuwe `npm run smoke:*` scripts. Volledige details in `tasks/done/` + `docs/changelog.md` (entry #239–242).

- **Canvas/Studio (12 tasks)**: locale-fix + 3 per-item-tweaks-clusters (conversion / longform / structured) + 3 image-track-tasks (defaults / coupling / briefing) + 3 discovery-audits + canvas-inline-edit-overlays
- **BCP Phase 0** (3 tasks): tech-debt-any-types, claw-page-awareness foundation, bv-wire-w1-full-centroid
- **BCP Phase 1** (2 tasks): heuristics-packages-multilingual (Δ-2, 4 locales), voice-baseline-1pager (Δ-3)
- **Cowork-pariteit Fase A**: campaign-brief-output-mapper
- **Competitive-intel Fase 1**: competitor-snapshot-historie (Snapshot/Activity/ContentItem schema + 7 diff-rules)
- **Eerder week 19**: 4 content-items kritisch pad + 4 independent pre-launch tracks (PostHog/Sentry, campaign-drafts-db, content-styling-migratie, auto-trigger-fidelity)

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

**2026-05-09**: sprint #2 gemerged (PR #5 `618d336`). BCP Phase 0+1 + Canvas-cluster + Cowork Fase A + Competitive-intel Fase 1 zit op `main`. Focus verschuift naar **BCP Phase 2 review-surfaces** — Δ-1 Content Review.

**Volgorde-aanbeveling**:

1. **`content-review-tab-3-ui`** (1-2d, in-progress) — eerste pilot-zichtbare review-surface, momentum vanuit foundation/engine/POST-endpoint. Direct vervolg op sprint #2.
2. **Δ-1 Surface D + E task-files schrijven** — feature-planner draaien (idea-doc verloren) of hergebruik oude voorstel. Surface E pas bouwen na Surface C pilot-feedback (scope-trim Red Team).
3. **Δ-4 + claw-page-awareness vervolg** — Phase 2 closures, parallel mogelijk met Surface D.

**Launch-track parallel mogelijk**: `vercel-deployment` (3d, geen code-conflict met Surface C) ontgrendelt `pilot-onboarding-better-brands`. Stripe daarna voor revenue-pad. Pilot-start projectie: +6-10 weken.

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
