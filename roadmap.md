# Roadmap

> **Laatst bijgewerkt**: 2026-05-07 (week 1 dag 5 van docs-migratie).
> **Update-cadans**: Now continu (na elke afgeronde task), Next wekelijks (vrijdagretro), Later maandelijks.
> **Bron**: gedistilleerd uit oude TODO.md, BRANDCLAW-ROADMAP.md, STRATEGISCHE-VERVOLGSTAPPEN.md (allen in `docs/archive/old-lists/`).

---

## Fase-indeling

| Fase | Definitie | Hard criterium afronding |
|---|---|---|
| **Pre-launch** | Alles wat moet zodat applicatie online kan draaien | Vercel deployment + custom domain operationeel |
| **Launch** | De livegang + eerste 30 dagen | Eerste betalende klant aan boord, 0 P0/P1 bugs in core flows |
| **Post-launch** | Klantenwerving, schaal, Brandclaw transformatie | Doorlopend |

**Brandclaw transformatie**: Optie B (in stappen post-launch) — eerste node Strategy Analyst pas maand 3 post-launch.

---

## ⚡ NOW (deze 2-4 weken)

Max 5 items. Sortering op pre-launch dependency.

| ID | Titel | Fase | Effort | Status | Blocker |
|---|---|---|---|---|---|
| [`docs-migration-week-1`](tasks/docs-migration-week-1.md) | Documentatie-architectuur migratie | pre-launch | 1 week | in-progress | week 1 dag 4-7 done, smoke-test pending |
| [`tasks-migration-week-2`](tasks/tasks-migration-week-2.md) | Open plans distilleren naar tasks/ | pre-launch | 3 dagen | in-progress | dag 1-3 done |
| [`hooks-routines-week-3`](tasks/hooks-routines-week-3.md) | Claude Code hooks + skills + eerste routine | pre-launch | 1 week | open | wacht op week 2 done |
| [`stripe-billing-live`](tasks/stripe-billing-live.md) | Stripe live billing (2 plannen, checkout, webhook, plan-gate) | pre-launch | 1 week | open | - |
| [`vercel-deployment`](tasks/vercel-deployment.md) | Vercel + Neon DB + Sentry + custom domain | pre-launch | 3 dagen | open | env-var keys verzamelen |

---

## 🔵 NEXT (1-3 maanden, RICE-gerangschikt)

| ID | Titel | Fase | Effort | Notitie |
|---|---|---|---|---|
| [`pilot-onboarding-better-brands`](tasks/pilot-onboarding-better-brands.md) | Better Brands eerste pilot live | launch | 2 dagen | Voorwaarde: vercel-deployment done |
| [`posthog-sentry-browser`](tasks/posthog-sentry-browser.md) | PostHog + Sentry browser-side wiring | launch | 1 dag | Activation tracking + frontend errors |
| `onboarding-flow-test` | Onboarding flow met 3 externe gebruikers | launch | 1 week | Validation pre-klant — task-file volgt |
| `marketing-site-pricing` | Marketing site + pricing pagina | launch | 1 week | Conversie-driver — task-file volgt |
| [`campaign-drafts-db-backed`](tasks/campaign-drafts-db-backed.md) | Campaign drafts DB-backed (multi-device) | post-launch | 1.5 dag | Gedistilleerd uit plan |
| [`claw-page-awareness`](tasks/claw-page-awareness.md) | Brand Assistant page awareness + field-fill | post-launch | 2-3 dagen | Gedistilleerd uit plan |
| [`canvas-inline-edit-overlays`](tasks/canvas-inline-edit-overlays.md) | Per-preview inline-edit Content Canvas | post-launch | 2-3 dagen | UX-verbetering item 9.0b |
| [`power-user-shortcuts`](tasks/power-user-shortcuts.md) | Power-user shortcuts (5 micro-optimalisaties) | post-launch | 1-2 dagen | Gedistilleerd uit plan |
| [`bv-wire-w1-full-centroid`](tasks/bv-wire-w1-full-centroid.md) | BV-WIRE W-1 full centroid switch | post-launch | 4-6 uur | Regression-harness staat klaar |
| `learning-loop-dashboard-usage` | Per-sourceIdentifier dashboard | post-launch | halve dag | Task-file volgt |
| [`tech-debt-any-types`](tasks/tech-debt-any-types.md) | 146 `: any` opruimen | post-launch | 1-2 dagen | L2 auto-mode kandidaat |
| [`content-styling-migratie`](tasks/content-styling-migratie.md) | Migreer content-styling velden naar Content Brief (8 categorieën) | post-launch | 3-5 dagen | Item 9.0c |
| [`auto-trigger-fidelity-scoring`](tasks/auto-trigger-fidelity-scoring.md) | Auto-trigger fidelity-scoring | post-launch | 1 uur | Status: blocked op ContentVersion-routes |
| `weekly-report-email-via-resend` | Weekly report email via Emailit | post-launch | 1 dag | Task-file volgt na weekly-report generator |

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

### F-VAL iteraties
| ID | Titel | Trigger |
|---|---|---|
| `fval-iteratie-3` | Data-gedreven re-tuning van pillar weights | Na 3-6 maanden productie-data |

---

## 💡 Aanbeveling huidige sessie

Pre-launch staat onder druk: documentatie migratie loopt nu (week 1 in uitvoering). Logische volgorde:
1. **`docs-migration-week-1`** afronden (deze week, dag 4-7)
2. **`tasks-migration-week-2`** (volgende week)
3. **`hooks-routines-week-3`** (week erna)
4. **`stripe-billing-live`** + **`vercel-deployment`** (parallel of sequentieel — kunnen elkaar niet blokkeren)

Skip Next-items totdat NOW-bucket leeg is.

---

## Cross-references

- Operating manual / spelregels: [`docs/playbooks/working-flow.md`](docs/playbooks/working-flow.md)
- Runtime instructie agent: [`CLAUDE.md`](CLAUDE.md)
- Actieve task details: [`tasks/`](tasks/)
- Wat is gebouwd: [`docs/changelog.md`](docs/changelog.md)
- Architectuur-beslissingen: [`docs/adr/`](docs/adr/)
