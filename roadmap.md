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

**Brandclaw transformatie**: Optie B (in stappen post-launch) — eerste node Strategy Analyst pas maand 3 post-launch.

---

## ⚡ NOW (deze 2-4 weken)

Pre-launch = product-readiness van content-flows. Sortering op dependency-volgorde.

**Content-items kritisch pad** (sequencing: #1 → #2 → #4 + #5 parallel)
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`studio-content-generation-real-ai`](tasks/studio-content-generation-real-ai.md) | Vervang TODO-stubs door echte AI-calls in studio generation | 1 week | open | P0 — content-flow werkt nu niet |
| [`content-versioning-crud`](tasks/content-versioning-crud.md) | ContentVersion CRUD-routes + version history UI | 3 dagen | open | dependency op #1 voor hooks |
| [`brand-voice-content-integration`](tasks/brand-voice-content-integration.md) | BrandVoiceGuide injectie in generation prompts + voice-consistency score | 3 dagen | open | dependency op #1 |
| [`content-item-qa-gating`](tasks/content-item-qa-gating.md) | Publish-readiness gate op consistency/persona/voice scores | 2-3 dagen | open | dependency op voice-score uit voorgaande |

**Independent pre-launch tracks** (parallel uitvoerbaar)
| ID | Titel | Effort | Status | Blocker |
|---|---|---|---|---|
| [`posthog-sentry-browser`](tasks/posthog-sentry-browser.md) | PostHog + Sentry browser-side wiring | 1 dag | open | - |
| [`campaign-drafts-db-backed`](tasks/campaign-drafts-db-backed.md) | Campaign Drafts DB-backed (multi-device persistence) | 1.5 dag | open | - |
| [`content-styling-migratie`](tasks/content-styling-migratie.md) | Content-styling velden naar Content Brief (8 categorieën) | 3-5 dagen | open | - |
| [`auto-trigger-fidelity-scoring`](tasks/auto-trigger-fidelity-scoring.md) | Auto-trigger fidelity-scoring na ContentVersion | 1 uur | blocked | wacht op `content-versioning-crud` |

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
| ID | Titel | Fase | Effort | Notitie |
|---|---|---|---|---|
| [`claw-page-awareness`](tasks/claw-page-awareness.md) | Brand Assistant page awareness + field-fill | post-launch | 2-3 dagen | Gedistilleerd uit plan |
| [`canvas-inline-edit-overlays`](tasks/canvas-inline-edit-overlays.md) | Per-preview inline-edit Content Canvas | post-launch | 2-3 dagen | UX-verbetering item 9.0b |
| [`power-user-shortcuts`](tasks/power-user-shortcuts.md) | Power-user shortcuts (5 micro-optimalisaties) | post-launch | 1-2 dagen | Gedistilleerd uit plan |
| [`bv-wire-w1-full-centroid`](tasks/bv-wire-w1-full-centroid.md) | BV-WIRE W-1 full centroid switch | post-launch | 4-6 uur | Regression-harness staat klaar |
| `learning-loop-dashboard-usage` | Per-sourceIdentifier dashboard | post-launch | halve dag | Task-file volgt |
| [`tech-debt-any-types`](tasks/tech-debt-any-types.md) | 146 `: any` opruimen | post-launch | 1-2 dagen | L2 auto-mode kandidaat |
| `weekly-report-email-via-resend` | Weekly report email via Emailit | post-launch | 1 dag | Task-file volgt na weekly-report generator |
| `campaign-brief-output-mapper` | Campagne-brief output-mapper (Fase A van Cowork-pariteit) | post-launch | 1-2 dagen | A3-validatie 2026-05-07 done — geblokkeerd tot `studio-content-generation-real-ai` af. Idea: `tasks/_drafts/idea-campaign-brief-cowork-parity.md` |

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

| ID | Titel | Brandclaw-impact |
|---|---|---|
| `campaign-weekly-calendar` | `WeeklyTheme`/`WeeklyContentCalendar` model + per-week posts-grid | ADR — Strategy Analyst input |
| `campaign-kpi-structure` | Typed KPI-schema + KPI-prompt-fase (primair/secundair/counter, sub-segmentatie) | ADR — Measurement node directe input |
| `campaign-budget-table` | `CampaignBudget` model met line-items + percentage-toelichting + contingency | ADR aanbevolen — Optimization node mutation-policy |
| `campaign-risk-assessment` | `CampaignRisk` model + risk-assessment-prompt-fase met mitigatie-stappen | Beperkt — cross-link in `gotchas.md` volstaat |

### F-VAL iteraties
| ID | Titel | Trigger |
|---|---|---|
| `fval-iteratie-3` | Data-gedreven re-tuning van pillar weights | Na 3-6 maanden productie-data |

---

## 💡 Aanbeveling huidige sessie

Docs-migratie is afgerond (entries #222-#224 in changelog). Inventarisatie 2026-05-07 leverde **content-items kritisch pad** op:

1. **`studio-content-generation-real-ai`** eerst (1 week) — P0, content-flow werkt nu niet door TODO-stubs in 3 generation-routes
2. **`content-versioning-crud`** (3 dagen) — unblockt `auto-trigger-fidelity-scoring`, foundation voor edit-history
3. **`brand-voice-content-integration`** (3 dagen) + **`content-item-qa-gating`** (2-3 dagen) parallel — kwaliteit + gates op de output uit #1
4. **`posthog-sentry-browser`** (1 dag) als tussendoor-quick-win voor observability vóór pilot

Vercel + Stripe verplaatst naar launch-fase (NEXT) — pakken op ná product-readiness.

---

## Cross-references

- Operating manual / spelregels: [`docs/playbooks/working-flow.md`](docs/playbooks/working-flow.md)
- Runtime instructie agent: [`CLAUDE.md`](CLAUDE.md)
- Actieve task details: [`tasks/`](tasks/)
- Wat is gebouwd: [`docs/changelog.md`](docs/changelog.md)
- Architectuur-beslissingen: [`docs/adr/`](docs/adr/)
