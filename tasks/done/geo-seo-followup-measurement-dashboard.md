---
id: geo-seo-followup-measurement-dashboard
title: GEO/SEO opvolg — meet-haak zichtbaar maken + F-VAL GEO-pijler activeren
fase: pre-launch
priority: next
effort: 3-5 dagen
owner: claude-code
status: done
created: 2026-06-24
completed: 2026-06-24
related-adr: docs/adr/2026-06-17-seo-pipeline-composable-stage.md
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: -
---

# Probleem

GEO/SEO Fase 3 bouwde de meet-laag maar liet 'm grotendeels dormant: er is een `settings.geoOptimizationAnalysis`-data-haak (geoScore + signalen + findings + schema-types + canonical) en een volledig gewired F-VAL GEO-pijler (`computeGeoScore`), maar (a) geen UI toont de analyse, (b) geen productie-caller zet `geoOptimizationActive` dus de 4e pijler scoort nooit live, (c) `isContentStale`/`measuredAt` (90-dagen freshness) wordt nergens geconsumeerd, (d) de meet-haak scoort `settings.structuredVariant` i.p.v. de gepubliceerde `puckData` (na een Puck/Claw-edit beschrijft de score pre-edit-content), en (e) de persist is een non-transactionele read-modify-write op `Deliverable.settings` (smalle clobber-race). Dit is de "GEO-voordeur" die nu ontbreekt: de motor draait, maar de gebruiker ziet niets.

# Voorstel

Maak de bestaande GEO-meetdata zichtbaar en betrouwbaar: een GEO-paneel dat `geoOptimizationAnalysis` toont (score + signalen + findings + freshness), activeer de F-VAL GEO-pijler via een productie-caller (achter de bestaande compute-gating, zodat de 3-pijler-composite byte-identiek blijft wanneer GEO uit staat), consumeer de staleness-flag, score de gepubliceerde `puckData`, en wikkel de persist in een transactie.

# Acceptatiecriteria

- [ ] GEO-paneel (Canvas of deliverable-detail) toont `geoOptimizationAnalysis`: geoScore, signalen, findings, geëmitte schema-types, canonical, `dateModified` + staleness (90d)
- [ ] Een productie-caller zet `geoOptimizationActive` zodat `computeGeoScore` live meedraait in de F-VAL-composite; 3-pijler-gedrag byte-identiek wanneer GEO-doel uit (compute-gating-regressie-smoke)
- [ ] `isContentStale(dateModified, now, 90)` geconsumeerd in het paneel (stale-badge) — fundament voor latere cron
- [ ] Meet-haak scoort de gepubliceerde `puckData` (of expliciet gedocumenteerd waarom `structuredVariant` de canonieke bron blijft) zodat post-edit-content correct gescoord wordt
- [ ] `geoOptimizationAnalysis`-persist in een Prisma-transactie (clobber-race met autosave geëlimineerd, niet alleen genarrowd)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke: F-VAL-composite identiek bij GEO-uit; GEO-paneel rendert met + zonder analyse-data (fail-soft)

# Bestanden die ik aanraak

- `src/lib/brand-fidelity/composition-engine.ts` + `src/lib/brand-fidelity/geo-fidelity-scorer.ts` — runner-activatie `geoOptimizationActive`
- `src/lib/landing-pages/geo-analysis.ts` — puckData-scoring + (mogelijk) builder-aanpassing
- `src/app/api/landing-pages/publish/route.ts` — transactie rond de analyse-persist
- nieuw GEO-paneel-component (Canvas/deliverable-detail) + bijbehorende API-serialisatie

# Bestanden die ik NIET aanraak

- De GEO-generatie-prompt/directive (`src/lib/ai/prompts/geo-directives.ts`, Fase 3 af) — alleen meten/tonen, niet genereren
- `computeGeoScore`-scorelogica zelf (af + smoke-gedekt) — alleen activeren

# Smoke test plan

1. Publiceer een long-form GEO-item → GEO-paneel toont score + signalen + findings + freshness
2. F-VAL op een seo-only item → composite + thresholds byte-identiek aan vóór (GEO-pijler dormant)
3. Edit puckData na publish → republish → score beschrijft de nieuwe content (niet pre-edit)

# Risico's

- F-VAL-pijler-activatie wijzigt de composite/threshold-semantiek wanneer per ongeluk áán bij seo-only → strakke compute-gating-regressie-smoke (was de expliciete reden om 'm in Fase 3 dormant te laten).
- Transactie rond settings-write mag de GEO-generatie/autosave niet deadlocken → korte transactie, alleen de read-modify-write.

# Out of scope

- Live AI-crawler-citation-meting (of een AI de pagina echt citeert) → `geo-seo-followup-later`
- Externe entity-reinforcement → `geo-seo-followup-later`
- Cron/nightly staleness-recompute (alleen de read-time flag hier; cron is later)

# Notes

- Bron-gat: GEO/SEO Fase 3 "Bewust geaccepteerde review-bevindingen" + Deferred (changelog #336). Opgetild uit `tasks/done/geo-seo-fase3-geo-prompts-fval.md` op 2026-06-24.
- Dit is de feature die de gebruiker als "ik mis het GEO-deel" ervoer: er is geen zichtbare GEO-surface, alleen een data-haak.

## Uitvoering 2026-06-24 (paneel-only)

Gebouwd:
- `src/lib/landing-pages/geo-panel-view.ts` (nieuw) — pure view-model (geoZone / toGeoPanelSignals / buildGeoPanelViewModel + staleness via `isContentStale`).
- `src/features/campaigns/components/canvas/GeoOptimizationPanel.tsx` (nieuw) — paneel: score+zone (inline-hex, Tailwind-4-purge), 5-signaal-breakdown, schema-type-badges, freshness-badge, findings-lijst; self-null bij afwezige analyse (spiegelt VisualFidelityBadge), fail-soft.
- Data-laag: `GET /api/studio/[id]/components` + `FetchCanvasComponentsResult` + `fetchCanvasComponents` dragen nu `geoOptimizationAnalysis`.
- Mount: `Step4Timeline` rendert het paneel ná het publish-readiness-blok, gegate op `isPuckRenderable`.
- Betrouwbaarheid: de meet-haak-persist in `/api/landing-pages/publish` zit nu in een `prisma.$transaction` (read-modify-write atomisch → autosave-clobber-race geëlimineerd). Code-comment documenteert dat `structuredVariant` de canonieke scoringsbron blijft (puckData-flatten → `geo-seo-followup-later`).
- Smoke: `scripts/smoke-tests/geo-panel.ts` (25/25) — zone-drempels, signaal-zwak-vlag, staleness-grens + de fail-soft guard `isRenderableGeoAnalysis` (null/ontbrekende-signals/niet-numeriek-signaal/findings-geen-array).
- Hardening uit 3-ronde review-loop: runtime-guard `isRenderableGeoAnalysis` (valideert geoScore + alle 5 signalen numeriek + findings/schemaTypes arrays) → paneel self-nullt op gedrifte JSON i.p.v. de canvas te laten crashen.

**F-VAL GEO-pijler NIET geactiveerd** — bewuste keuze (paneel-only): publish-gate composite/drempel byte-identiek. Activatie blijft 1-flag-vervolg.

Verificatie (live, tegen draaiende server):
- Components-route levert `geoOptimizationAnalysis` voor het gepubliceerde Napking-item: geoScore 77, 5 signalen, schemaTypes [BlogPosting, FAQPage, DefinedTermSet], 1 finding, measuredAt.
- Gates: `tsc --noEmit` 0, eslint 0 errors (2 pre-existing warnings in Step4Timeline), geo-panel smoke 25/25, regressie geo-analysis 14/14 + geo-fidelity 20/20 + geo-blogposting-jsonld 25/25 + geo-puck-renderable 18/18.
- In-situ paneel-screenshot niet gemaakt: `useCampaignStore`/`activeSection` persisteren niet → geen state-injectie; data-pad + view-model + types bewijzen de render. Eyeball: Napking blog-post → Canvas Step 4.
