---
id: geo-seo-followup-live-ai-e2e
title: GEO/SEO opvolg — live-AI E2E van de hele long-form GEO/SEO-keten (lokaal)
fase: pre-launch
priority: now
effort: 0,5-1 dag
owner: claude-code
status: open
created: 2026-06-24
completed: -
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
