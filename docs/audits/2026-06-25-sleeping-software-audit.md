# Sleeping Software Audit — pre-launch schoon-schip

> **Datum**: 2026-06-25
> **Doel**: alle "slapende software" in kaart brengen — code die gebouwd is maar nu dormant/inactief is en NIET in roadmap/tasks/track staat — vóór launch.
> **Methode**: 4 parallelle verkenners (feature-flags & demo-surfaces · niet-gewirede UI & orphaned routes · dode lib-modules/scripts/artefacten · schema/data-laag), elk grep-/read-geverifieerd, met uitsluitlijst van al-getrackte items (Research Hub bewust-uit, `studio-cleanup-item-192`, `adapter-pattern-afbouw`, `dual-versioning-cleanup`, post-launch-parked).
> **Status**: in kaart gebracht — nog geen code verwijderd. Acties per tier hieronder.

---

## ⚠️ Eerst: false-positives — NIET aanraken

Deze leken dormant maar zijn aantoonbaar levend. Hier per ongeluk in snijden = productie-breuk.

| Item | Waarom het dood lijkt | Werkelijkheid |
|---|---|---|
| **`src/proxy.ts`** | Heet geen `middleware.ts`; `decideHostRoute` nergens anders gebruikt | **Levende Next.js 16-middleware.** Next 16 hernoemde de conventie `middleware`→`proxy` (`PROXY_FILENAME='proxy'` in next/dist/lib/constants). Draait op élke request: security-headers, auth-rate-limiting, multi-tenant host-routing, API-cache-control. |
| `bct`, `cialdini`, `goldenberg`, `framing`, `effectiveness`, `brand-growth` | "academische" lib-mappen | Levend via `src/lib/campaigns/strategy-chain.ts` → campaign-wizard strategy-API. |
| `arena`, `exa`, `semantic-scholar` | optionele env-keys, vaak skip | Levend, env-guarded enrichment in strategy-chain; `exa` ook in deep-research. |
| `agents`, `bug-analysis`, `ad-validation` | losse mappen | Levend via cron run-jobs / bug-reports / campaign-canvas ad-quality. |
| `ai-studio`, `ai-trainer`, `website-scanner`, `consistent-models` | leken verdacht | Levend via sidebar/onboarding. |

---

## TIER 1 — Killen nu (triviaal, near-zero risico, ongetrackt)

### 1.1 Leftover root-artefacten
- **Wat**: `src/migrate_components.py` (193r, afgeronde Python migratie-tool), `src/test-persona-modal-update.txt` (1-regel scratch), `src/scripts/check-consistency.js` + `src/scripts/progress-tracker.js` (dode design-system-campagne-tools).
- **Completeness**: afgeronde/verlaten one-offs. **Bewijs**: 0 referenties in src/, scripts/, package.json.
- **Restwerk**: n.v.t. **Advies**: **killen** (overweeg `src/scripts/*` te verplaatsen naar `scripts/dev/` als de consistency-check nog waarde heeft boven ESLint).
- **Vervolg**: `git rm src/migrate_components.py src/test-persona-modal-update.txt src/scripts/check-consistency.js src/scripts/progress-tracker.js`.

### 1.2 Wees-Zustand-stores (feature-dir-migratie restant)
- **Wat**: 5 stores in `src/stores/` met levende feature-dir-vervangers en **0 importers**: `useBrandstyleStore`, `useBusinessStrategyStore`, `useBrandAssetDetailStore`, `useInterviewStore`, `useWorkshopStore`.
- **Bewijs**: geen enkele `@/stores/<naam>`- of relatief-pad-import resolvet hiernaartoe (geverifieerd). Restant van de feb-2026 SPA-migratie. NIET hetzelfde als `dual-versioning-cleanup` (= DB-tabel) → ongetrackt.
- **Restwerk**: n.v.t. **Advies**: **killen** — laagste risico in deze audit. `tsc` blijft groen (geen importers).
- **Let op**: in `src/stores/` blijven wél levend: `useClawStore`, `useShellStore`, `useBrandAlignmentStore`, `useBrandAssetStore`, `useFormFillStore`, `useHelpStore`, `useKnowledgeLibraryStore`, `useSettingsStore`, `useDashboardStore`.

---

## TIER 2 — Killen na korte verificatie (laag risico, ongetrackt)

> Eén samenhangende cleanup-task: verlaten v1-ingangen waarvan de levende equivalent al elders draait.

### 2.1 `interviews` feature-dir + API-routes — DORMANT v1
- **Wat**: `src/features/interviews/` (~2570r: `InterviewsPage`, 8-staps wizard, store, api) + routes `src/app/api/brand-assets/[id]/interviews/*` (10) + `src/app/api/interviews/[id]/lock`.
- **Hoe ver**: vrijwel compleet. **Waarom dormant**: switch-case `interviews` (App.tsx:956) heeft **0 navigatie-triggers**. De levende interview-flow draait via de canvas `InterviewsManager` (`src/components/canvases/InterviewsManagerUpdated.tsx`) — ander code-pad, roept deze API's niet aan (0 hits).
- **Restwerk om af te ronden**: 2-4d (wiren + dedupliceren) — maar dat is dubbel werk t.o.v. de levende canvas.
- **Advies**: **killen** (verlaten parallel-implementatie). **Verifieer eerst**: dat de canvas-`InterviewsManager` de canonieke levende flow is en niets in `features/interviews` importeert.
- **Vervolg**: verwijder `src/features/interviews/` + case App.tsx:956-968 + `section==='interviews'`-checks (App.tsx:260, UIStateContext.tsx:59) + de API-routes.

### 2.2 `workshop` feature-dir + API-routes — DORMANT v1
- **Wat**: `src/features/workshop/` (~3646r: purchase/session/complete-pagina's, store, timer, api) + routes `src/app/api/workshops/[workshopId]/*` (15) + `src/app/api/brand-assets/[id]/workshops/*` (bundles/preview-impact/purchase).
- **Hoe ver**: hoog. **Waarom dormant**: cases `workshop-purchase/session/results` (App.tsx:906-955) hebben **0 externe trigger** (alleen onderlinge ketting). Levende workshop-ervaring = canvas `CanvasWorkshopManager_INTEGRATED` in `ResearchDashboard`, roept deze API's niet aan.
- **Restwerk om af te ronden**: 2-4d, overlapt met canvas-flow.
- **Advies**: **killen** (identiek patroon aan 2.1). **Verifieer eerst** idem.
- **Vervolg**: verwijder `src/features/workshop/` + cases App.tsx:906-955 + UIStateContext.tsx:60 + API-routes.
- **NB Research Hub-koppeling**: workshop/interviews zitten in de research-tak die deels achter `RESEARCH_HUB_ENABLED=false` hangt. De *canvas*-flow is de canonieke; de page-route-dirs zijn dode duplicaten ongeacht de flag. Bevestig dit bij twijfel vóór verwijderen.

### 2.3 Onbereikbare demo-cases
- **Wat**: 3 cases met **0 navigatie-callers** (alleen hun eigen `case`-string):
  - `commercial-demo` + `settings-commercial-demo` → `CommercialDemoPage` (537r, mock-only, "Demo page to test all commercial features", `alert()` i.p.v. API).
  - `validation-demo` → `ValidationMethodDemo` (399r, Storybook-achtige component-showcase).
  - `asset-unlock-demo` → `TransformativeGoalsDashboard` (725r).
- **Advies**: `commercial-demo` + `validation-demo` → **killen** (pure demos, onbereikbaar). `asset-unlock-demo` → **case killen**, maar `TransformativeGoalsDashboard` is **productie-kwaliteit** en mogelijk levend via de echte brand-asset-detail-route — **component apart verifiëren** vóór verwijderen.
- **Verifieer**: `UnlockService.initializeDemoState` (in CommercialDemoPage) — `UnlockService` kan elders productief zijn; check vóór verwijderen.
- **Vervolg**: verwijder de cases + lazy-imports + PageHeader/PAGE_ICONS-entries; behoud `ValidationMethodButton` (echte component).

### 2.4 Orphaned API-routes (los)
- `/api/exploration/models` — **0 callers** (`exploration.api.ts` bouwt nooit `/models`). **Killen.**
- `/api/learning-loop/fidelity/rescore/[contentVersionId]` + `.../visual-fidelity/rescore/[componentId]` — 0 UI-callers; JSDoc noemt ze "manual trigger". Waarschijnlijk bewuste curl-bare ops-endpoints → **laten staan, dev bevestigen**.

---

## TIER 3 — Schema/data-laag dormancy (killen via migratie + leegheids-check)

> **Verplicht vóór elke drop**: `SELECT count(*)` per tabel op de live DB → leeg bevestigen. Eens gedropt is data weg.

### Volledig dood — killen
| Model / enum | Wat | Bewijs |
|---|---|---|
| `MarketInsight` + `InsightSourceUrl` (+6 indexen) | workspace markt-inzichten met bron-URL's | 0 writes/reads; "market insights" komen in werkelijkheid uit `DetectedTrend`. Vroege trend-radar-voorganger. |
| `InsertedInsight` + `ImproveSuggestion` + enums `InsertFormat` + `SuggestionStatus` | per-deliverable insights/AI-suggesties | 0 referenties. **Restant oude Content Studio** (studio-cleanup 2026-06-24 liet schema staan). |
| `CampaignTemplate` | herbruikbare campagne-sjablonen | 0 referenties, future-wired zonder flow. |
| `CampaignObjective` | join Campaign↔Objective | 0 referenties (niet te verwarren met de levende `CampaignStrategy`-join). |

### Verifiëren-dan-beslissen (read-only zonder writer, ongetrackt)
- `CampaignTeamMember` — gelezen via Campaign-include, **nooit geschreven** (collaboratie loopt via in-memory `CollaborationContext`). 
- `WorkshopParticipant` / `WorkshopPhoto` / `WorkshopObjective` / `WorkshopAgendaItem` — uitgelezen via Workshop-include, **nooit gevuld** in src/.
- **Actie**: bevestig of er ooit een seed/import-pad was; structureel leeg → killen (na leegheids-check).

### Laten staan (bewust future-wired & goedkoop, of al getrackt)
- `AdMetricSnapshot` — Fase C ad-measurement, schema-comment "lege table, structuur klaar". Additief. **Wél task-file aanmaken** (zie Tier 4 Meta-ads).
- `DataSnapshot` — write-only (4 live writers); consument = `strategy-analyst-stub` Phase C (open, dep vercel). Getrackt. Doorgaan.
- `CompetitorSignalSource` dormant-waarden (`MANUAL`/`WAYBACK`/`REVIEWS`/`GOOGLE_ALERT`) — getrackt (Fase 5 external signals).
- `BrandAssetVersion` — dood, maar getrackt (`dual-versioning-cleanup`, LATER).
- `DomainMapping` — 0-usage future-wired, getrackt (custom-domains post-launch).
- `WorkspacePerformanceBenchmark` — **niet als model in schema gevonden**; alleen LATER-roadmap-concept. (onzekerheid expliciet)

---

## TIER 4 — Beslissen vóór launch: Meta Ads integratie (de substantiële vondst)

- **Wat**: volledige Meta (FB/IG) ad-account OAuth connect/refresh/disconnect + encrypted token-storage + ad-publish-endpoint + 2 cron-jobs (token-refresh daily, campaign-status-sync /5min). Bestanden: `src/lib/ad-providers/meta/*` (6), `src/lib/ad-tokens/*` (3), routes `/api/ad-publish/meta` + `/api/ad-accounts/meta/{connect,callback,select,refresh,disconnect}`, settings-pagina's `src/app/settings/integrations/ad-accounts/*`, jobs `refresh-ad-tokens.ts` + `sync-ad-campaign-status.ts`, crons in `vercel.json`.
- **Hoe ver**: **~70%**. Connect-helft is gewired, maar: (a) `/api/ad-publish/meta` heeft **0 callers** (publish-UI nooit gebouwd, "Fase B" in comments); (b) de `/settings/integrations/ad-accounts`-pagina's zijn **niet gelinkt** in nav (`IntegrationsTab` toont geen Meta Ads); (c) de 2 crons draaien op rijen die alleen de publish-route kan aanmaken → **draaien op lege data**.
- **Getrackt?** **Half** — `meta-ads-integration` staat in roadmap onder **LATER (3-12 mnd, visie)**, dus de code is ~6-9 maanden vóór z'n slot gebouwd en blijft dangling. De dormancy zelf is niet getrackt.
- **Restwerk**: afmaken ~1-2d (nav-link + publish-action in campaign-canvas + e2e). Netjes parkeren ~paar uur (feature-flag + crons uit).
- **Advies**: **NIET killen** (waardevol, grotendeels af, mapt op roadmap) — **wél expliciet parkeren**. Het is een security-/kosten-surface (encrypted OAuth-tokens + crons die Meta's API pollen op lege tabellen) die pre-launch zonder UI meedraait.
- **Vervolg**: (a) task-file `meta-ads-integration-wireup-or-park`; (b) beslis park-vs-finish vóór launch; (c) bij parkeren: zet de 2 ad-crons in `vercel.json` uit zodat ze geen invocations/kosten verbranden.

---

## Aanbevolen volgorde

1. **Tier 1** (artefacten + 5 wees-stores) — ~30 min, near-zero risico. Direct doen.
2. **Tier 2** (interviews + workshop + demo-cases + orphan-routes) — ~half dag, na de 3 verificaties (canvas canoniek, TransformativeGoalsDashboard-liveness, UnlockService). Grote LOC-reductie (~6200r features + ~27 routes).
3. **Tier 3** (4 dode modellen + enums) — ~1-2u, één migratie + leegheids-check. Verifieer-groep apart bevestigen.
4. **Tier 4** (Meta Ads) — beslissing + parkeer-actie (crons uit) of afmaken.

**Crons-noot**: de 2 ad-crons in `vercel.json` worden pas actief ná `vercel-deployment`. Beslis Tier 4 vóór de eerste deploy, anders pollen ze direct op lege data.
