---
id: brand-alignment-insights-tab
title: Brand Alignment Insights tab — pilot-feedback dashboard voor Δ-1 surfaces
fase: pre-launch
priority: now
effort: 1 dag
owner: claude-code
status: in-progress
created: 2026-05-10
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Δ-1 trifecta (Surface C/D/E) is live op `main`, maar er is nog geen manier om 30 dagen na livegang een pivot-vs-wasted-effort verdict per surface te kunnen geven. Bestaande dashboards (`PromptUsageDashboard`, `VisualFidelityDashboardTab`) zijn dev-only via Settings; Brand Alignment heeft drie tabs (Alignment / Audit / Content Review) maar geen aggregate-view over historische review-data. Pilot-users zien hun eigen reviews één voor één (per submit of per deep-link) zonder trend of hot-spot perspectief.

Aggregaat-data is wél al in DB beschikbaar:
- `ContentReviewLog` voor externe paste/url reviews (Surface C + D — gecombineerd weergegeven; bewuste keuze om geen schema-marker toe te voegen voor 30d pilot)
- `ContentFidelityScore` voor interne canvas-content reviews (Surface E)
- `BrandReviewFinding` met severity + category voor hot-spot analyse

# Voorstel

Vier incrementele wijzigingen op bestaande infrastructuur:

1. **GET `/api/brand-alignment/insights`** — workspace-scoped aggregaat-endpoint dat 30d KPI-data + 7d threshold-pass-rate trend + top-findings-categories + recent-reviews-lijst retourneert. Mirror van `PromptUsageDashboard`'s admin-route maar per workspace (niet org-wide).
2. **`useAlignmentInsights()` hook** — TanStack Query met `staleTime: 60_000` (1 minuut, niet immutable want nieuwe reviews kunnen aankomen).
3. **`InsightsTab` component** — KPI-tiles pattern (van `PromptUsageDashboard`), `SparklineChart` voor threshold-pass-rate trend, top-3 finding-categories als bar-chart-style ranking, recent-reviews met score + bron.
4. **BrandAlignmentPage tab-extension** — `useBrandAlignmentStore.activeTab` union extend met `'insights'`, 4e tab-button met `BarChart3` icoon, conditional render.

# Acceptatiecriteria

- [ ] Nieuwe GET `/api/brand-alignment/insights/route.ts` retourneert `{ totalReviews, totalFindings, thresholdPassRate, overrideRate, topCategories, passRateTrend, recentReviews }` workspace-scoped 30d
- [ ] `useAlignmentInsights()` hook in `src/hooks/` met TanStack Query (`staleTime: 60_000`, `gcTime: 5 * 60_000`)
- [ ] `InsightsTab` component rendert: 4 KPI-tiles, threshold-pass-rate sparkline (7d), top-3 findings-categories met counts, recent-reviews-lijst (laatste 5)
- [ ] `BrandAlignmentPage` toont 4e tab "Insights" met `BarChart3` icoon naast bestaande drie tabs
- [ ] Empty-state: workspace zonder reviews toont "Run je eerste review om insights te zien" placeholder, geen crash
- [ ] Workspace-isolation: alleen reviews/scores van huidige workspace worden geaggregeerd
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors in nieuwe files
- [ ] Manual UX-smoke: open Brand Alignment → Insights tab in LINFI → verifieer KPI-tiles + sparkline + categories rendert met live data

# Bestanden die ik aanraak

**Server**:
- `src/app/api/brand-alignment/insights/route.ts` (nieuw, ~140 regels) — GET endpoint met workspace-scoped aggregaten

**Client**:
- `src/hooks/useAlignmentInsights.ts` (nieuw, ~40 regels) — TanStack hook
- `src/components/brand-alignment/InsightsTab.tsx` (nieuw, ~180 regels) — render-component met sub-components voor KPI-tiles, sparkline, categories, recent-list
- `src/stores/useBrandAlignmentStore.ts` (modify) — `AlignmentTab` union extend met `'insights'`
- `src/components/brand-alignment/BrandAlignmentPage.tsx` (modify) — 4e tab-button + conditional render

**Documentatie**:
- `tasks/brand-alignment-insights-tab.md` (deze)
- `docs/changelog.md` (entry #247 bij task-finalize)

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — geen schema-wijziging (alle data al beschikbaar via bestaande models)
- `src/lib/brand-fidelity/*` — engine ongewijzigd
- `src/components/brand-alignment/ContentReviewTab.tsx` — Tab 3 UI ongewijzigd
- `src/lib/analytics/posthog*` — geen nieuwe events nodig (DB-aggregaten dekken pilot-verdict)
- `src/features/settings/components/prompt-registry/*` — bestaande dev-dashboard ongewijzigd, dient als template

# Smoke test plan

**Geen server-side smoke nodig** — pure aggregate-endpoint + UI-component, gedragsmatig identiek aan bestaande dashboards. Type-check + lint dekken de implementatie.

**Manual UX-smoke** (user-action vóór live productie):

1. Open Brand Alignment in LINFI workspace → klik 4e tab "Insights"
2. Verifieer 4 KPI-tiles renderen:
   - Total reviews (extern + intern, count)
   - Total findings (severity-mix vermeld)
   - Threshold-pass-rate (% van reviews ≥ threshold)
   - Override-rate (% blocked publishes met override)
3. SparklineChart 7d threshold-pass-rate trend rendert; geen crash bij 0 data
4. Top-3 finding-categories tonen counts (LINFI test data: VOICE en CLAIMS waarschijnlijk hoog)
5. Recent reviews lijst toont laatste 5 met score-badge + bron (paste/url/canvas)
6. Switch naar lege workspace → empty-state placeholder zichtbaar, geen crash
7. Switch terug naar Insights tab via tab-click → data refetcht (niet stale na 60s)

# Risico's

- **Performance bij grote workspaces**: 30d aggregatie over `BrandReviewFinding` kan enkele duizenden rijen scannen. **Mitigatie**: Prisma `groupBy` met indexed columns; `staleTime: 60s` op hook beperkt frequente refetches; per-workspace data is begrensd.
- **Empty workspace UX**: alle KPI-tiles zouden 0 tonen. **Mitigatie**: empty-state placeholder vóór tile-render bij `totalReviews === 0`.
- **Data-divergentie tussen Tab 3 en Insights**: Tab 3 toont specifieke review, Insights toont aggregaten. Beide gebruiken dezelfde DB. Geen risico.
- **Tab-state niet persistent over page-refresh**: tab-state in Zustand-store, geen URL-sync. Acceptable, consistent met andere tabs.

# Out of scope

- Per-finding drill-down vanuit Insights → separate task wanneer gebruikers dit vragen
- Export Insights als PDF/CSV → Δ-1 v2
- Real-time updates via WebSocket → 60s staleTime is voldoende
- Vergelijking tussen workspaces (org-overview) → andere persona, separate task
- AI-suggested patterns op findings ("je hebt 8x VOICE gefaald — overweeg X") → Δ-1 v2
- Surface C vs D onderscheid in metrics → user gekozen voor combineren; future task indien nodig
- PostHog event-extensie voor adoption-tracking → DB-aggregaten dekken pilot-verdict
- Threshold per-content-type breakdown → KPI is overall pass-rate; per-type is Δ-1 v2

# Notes

**Phase -1 Gates resultaat**:
- Simplicity Gate: PASS (5 nieuwe/modified files, geen abstracties, hergebruik bestaande KPI-tile + SparklineChart patterns)
- Anti-Abstraction Gate: PASS (directe Prisma `groupBy` + `count` + `aggregate`, geen wrapper-layer)
- Integration-First Gate: PASS (GET endpoint mirror van bestaande `/api/admin/prompt-registry/dashboard`; UI-component pattern al gevestigd)

**ADR-noodzaak**: NEE
- Geen schema-wijziging
- Geen nieuwe `src/lib/<module>/` directory
- Geen nieuwe library-install (geen Recharts; SparklineChart bestaat al)
- Geen pattern-introductie buiten conventies (volgt PromptUsageDashboard model)

**Cross-links**:
- Surface C/D/E tasks in `tasks/done/`
- ADR-1 BrandReviewFinding XOR-relatie: `docs/adr/2026-05-08-fval-output-schema-bevindingen.md`
- Pattern-precedent: `src/features/settings/components/prompt-registry/PromptUsageDashboard.tsx`
- SparklineChart: `src/features/business-strategy/components/detail/SparklineChart.tsx`
