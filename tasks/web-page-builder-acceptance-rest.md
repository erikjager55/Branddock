---
id: web-page-builder-acceptance-rest
title: Web-page-builder acceptatie-rest — bundle-split, perf-meting, Puck-bug-report
fase: post-launch
priority: later
effort: ~1 dag
owner: claude-code
status: open
created: 2026-07-14
completed: -
related-adr: docs/adr/2026-05-22-landing-page-builder-architectuur.md
related-spec: tasks/done/web-page-builder-canvas-step-mvp.md (triage 2026-07-14)
worktree: -
---

# Probleem

Bij het afhechten van de umbrella-task `web-page-builder-canvas-step-mvp` (triage
2026-07-14, doc-keeper-audit) bleven drie kleine, niet-blokkerende restpunten over die
geen van alle pre-launch-urgentie hebben maar wél echt zijn.

# Restpunten

1. **Render-route bundle-split**: `/p/[slug]` deelt vermoedelijk nog de editor-chunk
   (geen `puck-config-render.tsx`-split gevonden) — publieke LP-bezoekers downloaden
   Puck-editor-code. Meet eerst (bundle-analyzer) of de winst de split waard is.
2. **Dual-render perf-meting** (≥50 componenten) in `docs/audits/` — er zijn geen
   perf-klachten bekend; alleen doen als de pilot LP's van die omvang oplevert.
3. ~~Puck-bug-report indienen~~ **VERVALLEN (check 2026-07-14, user-go was gegeven)**:
   de typing-klacht is upstream opgelost in `@puckeditor/core@0.22.x` (issue #506) —
   indienen tegen 0.21.2 zou stale zijn. NIEUW restpunt in de plaats: **upgrade
   0.21.2 → 0.22.x overwegen** — ontgrendelt `external`-velden (async fetch + search)
   voor o.a. de persona-picker die nu op een statische `select` zit; changelog van
   0.22 doornemen op breaking changes vóór de bump.

# Acceptatiecriteria

- [ ] Bundle-meting `/p/[slug]` + beslissing split ja/nee (met cijfers)
- [ ] Perf-meting gedaan óf expliciet geskipt met reden (geen ≥50-component-LP's)
- [x] Puck-issue obsoleet verklaard na release-check (0.22.x fixt het; audit-doc bijgewerkt) — vervangen door upgrade-overweging
- [ ] `npx tsc --noEmit` 0 errors (alleen relevant bij de bundle-split)

# Out-of-scope

- Nieuwe Puck-componenten of builder-features
- De browser-smoke-LP-matrix (staat als [USER]-item op de sessie-takenlijst)
