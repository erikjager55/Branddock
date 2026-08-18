---
id: web-page-builder-acceptance-rest
title: Web-page-builder acceptatie-rest — bundle-split, perf-meting, Puck-bug-report
fase: post-launch
priority: later
effort: ~1 dag
owner: claude-code
status: done
created: 2026-07-14
completed: 2026-08-18
related-adr: docs/adr/2026-05-22-landing-page-builder-architectuur.md
related-spec: tasks/done/web-page-builder-canvas-step-mvp.md (triage 2026-07-14)
worktree: branddock-wpb-rest  # geclaimd door sessie 41832dfd, 2026-08-18
---

# Probleem

Bij het afhechten van de umbrella-task `web-page-builder-canvas-step-mvp` (triage
2026-07-14, doc-keeper-audit) bleven drie kleine, niet-blokkerende restpunten over die
geen van alle pre-launch-urgentie hebben maar wél echt zijn.

# Restpunten

> **Alle drie gesloten op 2026-08-18 — gemeten, niet gebouwd.** Twee ervan waren
> achterhaald doordat `@puckeditor/core` op 12-08 volledig verwijderd is (taak E3,
> `tasks/done/puck-dependency-removal.md`). Dit task-file dateert van vóór die
> verwijdering en zou iemand anders op een dood spoor hebben gezet.

1. ~~**Render-route bundle-split**~~ — **VERVALLEN, premisse is weg.** De zorg was dat
   publieke LP-bezoekers Puck-editor-code downloaden. Die code bestaat niet meer.
   Gemeten op een verse productiebuild: **nul van de 263 client-chunks (10 MB totaal)
   bevat een verwijzing naar `puckeditor`**. Alleen twee server-side `.js.map`-bestanden
   noemen het nog; source maps, geen client-code.

   Gekalibreerd, want een lege grep is pas bewijs als hij iets kán vinden: dezelfde
   zoekopdracht vindt `react` in 32 chunks, `lucide` in 10 en `BrandHero` in 3.

   ⚠️ Terzijde voor wie later een bundle-meting wil: **Next 16 print geen `Size`- en
   `First Load JS`-kolommen meer** in de build-uitvoer. De oude reflex ("kijk in de
   route-tabel") werkt niet meer; meet op de chunk-bestanden.

2. ~~**Dual-render perf-meting (≥50 componenten)**~~ — **EXPLICIET GESKIPT, poort niet
   gehaald.** Het item zei: *"alleen doen als de pilot LP's van die omvang oplevert"*.
   Gemeten over **41 pagina's** (39 lokaal, 2 op prod):

   | | max componenten | gemiddeld | ≥50 |
   |---|---:|---:|---:|
   | prod | 17 | 16,5 | 0 |
   | lokaal | 17 | 10,2 | 0 |

   Het plafond ligt op 17 en is in beide omgevingen hetzelfde. Niet in de buurt van 50,
   en er zijn geen perf-klachten. Heropenen zodra een pagina de 40 nadert.

3. ~~Puck-bug-report / upgrade 0.21.2 → 0.22.x~~ — **VERVALLEN.** Al obsoleet verklaard
   op 14-07 (upstream gefixt), en sinds 12-08 dubbel: er is geen `@puckeditor/core`-
   dependency meer om te upgraden. De `external`-velden die de upgrade zou ontgrendelen
   voor de persona-picker zijn daarmee geen Puck-vraag meer maar een eigen ontwerpkeuze
   in de sectie-editor.

# Acceptatiecriteria

- [x] Bundle-meting `/p/[slug]` + beslissing split — ✅ **geen split nodig**: 0 van 263 client-chunks bevat Puck-code (gekalibreerd)
- [x] Perf-meting expliciet geskipt met reden — ✅ max 17 componenten over 41 pagina's, poort was ≥50
- [x] Puck-issue obsoleet verklaard na release-check (0.22.x fixt het; audit-doc bijgewerkt) — vervangen door upgrade-overweging
- [x] `npx tsc --noEmit` — n.v.t., geen codewijziging nodig; wel een volledige `next build` gedraaid (exit 0)

# Out-of-scope

- Nieuwe Puck-componenten of builder-features
- De browser-smoke-LP-matrix (staat als [USER]-item op de sessie-takenlijst)
