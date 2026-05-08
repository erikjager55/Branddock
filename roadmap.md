# Roadmap

> **Laatst bijgewerkt**: 2026-05-07 (week 1 dag 5 van docs-migratie).
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
| **Phase 0 — Foundation** | [`tech-debt-any-types`](tasks/tech-debt-any-types.md), [`claw-page-awareness`](tasks/claw-page-awareness.md) | 3-5d | in-progress |
| **Phase 1 — F-VAL extension** | [`bv-wire-w1-full-centroid`](tasks/bv-wire-w1-full-centroid.md), Δ-2 heuristiek-pakketten NL/EN/BE/DE, Δ-3 voice 1-pager | 8-11d | task-files volgen |
| **Phase 2 — Review surfaces** | Δ-1 Content Review (3 surfaces: Brand Alignment Tab 3 + Brand Assistant chat-tool + PublishGate), Δ-4 PublishGate 2nd-opinion, [`canvas-inline-edit-overlays`](tasks/canvas-inline-edit-overlays.md) | 13-17d | task-files volgen |
| **Phase 3 — Strategy Analyst** | brandclaw-data-collection, Strategy Analyst stub (agent-architecture v1) | 20-27d | task-files volgen |

**ADR's**:
- ✅ [`2026-05-08-fval-output-schema-bevindingen`](docs/adr/2026-05-08-fval-output-schema-bevindingen.md) — additive `BrandReviewFinding` model
- ✅ [`2026-05-08-locale-routing-brand-voice`](docs/adr/2026-05-08-locale-routing-brand-voice.md) — `BrandVoiceguide.contentLocale` per-brand routing
- ⏳ ADR-2 Brandclaw agent-architectuur — vóór Phase 3 start

---

## ⚡ NOW (deze 2-4 weken)

Pre-launch = product-readiness van content-flows. Sortering op dependency-volgorde.

**Discovery / planning** (blokkeert nieuwe Canvas/Studio bouwtaken)
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`canvas-studio-audit`](tasks/canvas-studio-audit.md) | Audit Canvas + Studio feitelijke staat — basis voor herplanning per-item tweaks + generieke verbeteringen | 1 dag | open | - |

**Content-items kritisch pad** ✅ ALLE VIER DONE 2026-05-07/08 — verplaatsen naar changelog bij volgende roadmap-update
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`studio-content-generation-real-ai`](tasks/done/studio-content-generation-real-ai.md) | Vervang TODO-stubs door echte AI-calls in studio generation | 1 week | ✅ done 2026-05-07 | - |
| [`content-versioning-crud`](tasks/done/content-versioning-crud.md) | ContentVersion CRUD-routes + version history UI | 3 dagen | ✅ done 2026-05-07 | - |
| [`brand-voice-content-integration`](tasks/done/brand-voice-content-integration.md) | BrandVoiceGuide injectie in generation prompts + voice-consistency score | 3 dagen | ✅ done 2026-05-08 | - |
| [`content-item-qa-gating`](tasks/done/content-item-qa-gating.md) | Publish-readiness gate op consistency/persona/voice scores | 2-3 dagen | ✅ done 2026-05-08 | - |

**Independent pre-launch tracks** ✅ ALLE VIER DONE 2026-05-07/08 — verplaatsen naar changelog bij volgende roadmap-update
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`posthog-sentry-browser`](tasks/done/posthog-sentry-browser.md) | PostHog + Sentry browser-side wiring | 1 dag | ✅ done 2026-05-08 | - |
| [`campaign-drafts-db-backed`](tasks/done/campaign-drafts-db-backed.md) | Campaign Drafts DB-backed (multi-device persistence) | 1.5 dag | ✅ done 2026-05-08 | - |
| [`content-styling-migratie`](tasks/done/content-styling-migratie.md) | Content-styling velden naar Content Brief (8 categorieën) | 3-5 dagen | ✅ done 2026-05-08 | - |
| [`auto-trigger-fidelity-scoring`](tasks/done/auto-trigger-fidelity-scoring.md) | Auto-trigger fidelity-scoring na ContentVersion | 1 uur | ✅ done 2026-05-07 | - |

**Brand Control Program — Phase 0 voorlopers** (gepromoot van post-launch op 2026-05-08)
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`tech-debt-any-types`](tasks/tech-debt-any-types.md) | 146 `: any` opruimen — schema-extensie safety voor Phase 1+ | 1-2 dagen | in-progress | - |
| [`claw-page-awareness`](tasks/claw-page-awareness.md) | Brand Assistant page awareness + Δ-1 chat-integratie hooks | 2-3 dagen | open | - |
| [`bv-wire-w1-full-centroid`](tasks/bv-wire-w1-full-centroid.md) | F-VAL Pijler 1 semantic centroid switch (Phase 1 onderdeel) | 4-6 uur | open | - |

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

**2026-05-08 update**: Brand Control Program-besluit verschuift focus. Content-items kritisch pad is volledig af (8 NOW-tasks done deze week — alle ✅). Resterende NOW-tasks: `canvas-studio-audit` (1d) + 3 Phase 0 voorlopers van het programma.

**Programma-prioriteit nu**:
1. **`tech-debt-any-types`** (1-2d, L2 auto-mode) — Phase 0 voorloper, schema-extensie safety voor ADR-1 + ADR-3 implementatie
2. **`claw-page-awareness`** (2-3d) — Phase 0 voorloper, Δ-1 chat-integratie hook
3. **`bv-wire-w1-full-centroid`** (4-6u) — Phase 1 onderdeel, regression-harness staat klaar
4. **Δ-2 + Δ-3 task-files genereren** via technical-planner zodra Phase 0 klaar is
5. **`canvas-studio-audit`** (1d) parallel binnen Phase 0 wall-clock — informeert per-item tweaks die in Phase 2 review-surfaces meegenomen kunnen worden

Vercel + Stripe blijven in launch-fase (NEXT) — `pilot-onboarding-better-brands` wacht op programma-completion (+10-14 weken).

---

## Cross-references

- Operating manual / spelregels: [`docs/playbooks/working-flow.md`](docs/playbooks/working-flow.md)
- Runtime instructie agent: [`CLAUDE.md`](CLAUDE.md)
- Actieve task details: [`tasks/`](tasks/)
- Wat is gebouwd: [`docs/changelog.md`](docs/changelog.md)
- Architectuur-beslissingen: [`docs/adr/`](docs/adr/)
