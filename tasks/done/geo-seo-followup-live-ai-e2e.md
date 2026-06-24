---
id: geo-seo-followup-live-ai-e2e
title: GEO/SEO opvolg — live-AI E2E van de hele long-form GEO/SEO-keten (lokaal)
fase: pre-launch
priority: now
effort: 0,5-1 dag
owner: claude-code
status: done
created: 2026-06-24
completed: 2026-06-24
related-adr: -
related-spec: docs/specs/2026-06-17-geo-seo-longform-plan.md
worktree: -
---

# Probleem

De GEO/SEO Fasen 1b/2/3 zijn op code-niveau af + smoke-gedekt, maar de **live-AI end-to-end** is in álle drie de fasen deferred omdat de feature-worktree geen `ANTHROPIC_API_KEY` had. Niemand heeft de volledige keten ooit met een echt model + echte DB-data doorlopen. Dat is de enige openstaande verificatie-stap vóór we GEO/SEO als "werkend" durven claimen.

# Voorstel

Draai lokaal (waar de keys + DB-data wél bestaan) de volledige keten één keer per representatief scenario en leg de uitkomst vast. Vereist eenmalig `prisma db push` (authorProfile-kolom uit Fase 3).

# Acceptatiecriteria

- [ ] `npx prisma db push` gedraaid (authorProfile-kolom aanwezig) — anders 500 op de author-profiel-flow
- [ ] **SEO-only (Fase 1b)**: blog-post met SEO-doel → `settings.seoChecklist` gepersisteerd → `/p/[slug]` toont pagina-specifieke `<title>`/OG/canonical (Fase 1a-metadata werkt voor long-form)
- [ ] **GEO (Fase 2/3)**: blog-post met GEO aangevinkt → `geoArticle`-variant + `puckData` gepersisteerd → publiceren → `/p/[slug]` rendert + emit `BlogPosting` JSON-LD; content bevat answer-first + TL;DR + `[SOURCE]`-markers
- [ ] **seo+geo (Fase 3)**: SEO-pipeline draait + GEO-polish erna (composable), output bevat de directive-kenmerken
- [ ] **Compute-gating**: blog-post zónder GEO → 0 GEO-LLM-calls, geoScore niet berekend
- [ ] **#337-regressie**: het gepubliceerde GEO-item verschijnt in het "online content-items"-overzicht (`approvalStatus=PUBLISHED`)
- [ ] Uitkomst vastgelegd (kort verslag in de Notes hieronder of een `docs/specs/`-notitie)

# Bestanden die ik aanraak

- Geen productiecode verwacht (verificatie-task). Bugfixes die opduiken → eigen bugfix-commit + gotcha.

# Bestanden die ik NIET aanraak

- n.v.t. — dit is een test/verificatie-ronde

# Smoke test plan

1. `npx prisma db push` + dev-server (let op stale `.next` — `rm -rf .next` bij twijfel, zie gotchas)
2. Doorloop de 5 acceptatie-scenario's hierboven in de browser + psql-inspect
3. Leg per scenario pass/fail + eventuele bevindingen vast

# Risico's

- Live-AI kan latente prompt↔schema-mismatches blootleggen die de smokes misten (zie gotcha-familie "AI prompt ↔ TS interface mismatch") → behandel als aparte bugfix, niet als blocker voor het afronden van deze verificatie.

# Out of scope

- Deploy-time verificatie op echte subdomeinen (sitemap/robots per workspace) → `geo-seo-followup-later` (dep `vercel-deployment`)

# Notes

- Opgetild uit de Deferred-secties van `tasks/done/geo-seo-fase1b-*`, `-fase2-*`, `-fase3-*` (changelog #332/#336) op 2026-06-24. Kan nú lokaal, geen dependency.

## Uitkomst live-run 2026-06-24 (Playwright + psql)

Prereqs: `prisma db push` was al gedaan (authorProfile-kolom in DB), maar **`prisma generate` ontbrak** → verse client + dev-server-restart (+ `.next`-clear poging, permissie-geblokkeerd; restart volstond). Stale-client-gotcha 2026-05-29 bevestigd in de praktijk.

Bevonden DB-staat vooraf: **0 gepubliceerde LandingPages + 0 `geoOptimizationAnalysis`** — de publish/meet-keten was nooit gedraaid. Wel 2 GEO-deliverables (geoArticle, Napking) + 38 met puckData.

**PASS (live, echte data) — gepubliceerd `cmqqg6mzt000bw9c9a9tsfk6m` (Napking blog-post):**
- Scenario 2: publish 200 → `/p/[slug]?workspace=napking` rendert (HTTP 200, 480KB); JSON-LD `@graph` = **BlogPosting + FAQPage + DefinedTermSet**; HTML bevat answer-first + TL;DR; visueel: hero/TL;DR/Q&A/stats-rij/vergelijkingstabel/listicle/FAQ/CTA renderen alle GEO Puck-blokken.
- Scenario 5 (#337): deliverable → `approvalStatus=PUBLISHED`, `status=COMPLETED`, `publishedVia=webpage`, `publishedUrl` gezet → verschijnt nu in online content-items.
- Meet-haak: `geoOptimizationAnalysis` gepersisteerd — geoScore **77**; signalen answerFirst 100 / atomicChunking 94 / entityClarity 89 / structuredCues 67 / **citedStats 26** (→ de 1 finding). Levert echte fixture voor het Fase 2-paneel.
- Structureel (scenario 2-content): geoArticle-variant heeft answerFirstIntro + 5 TL;DR + 6 cited-stats-met-bron + 6 secties + 5 Q&A.

**Residu (bewust niet live gedraaid — keuze 2026-06-24, smoke-gedekt):**
- Scenario 1 (SEO-only long-form → seoChecklist → metadata) + 3 (composable seo+geo, beide draaien) + 4 (compute-gating): vergen een verse betaalde long-form generatie via de canvas-flow. Gedekt door bestaande unit/smoke (`shouldRunSeoPipeline`, `shouldApplyGeoPolish`, geo-fidelity compute-gating). Live-fresh-run blijft optioneel oppakbaar.
