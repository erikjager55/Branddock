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
3. **Puck-bug-report indienen**: `docs/audits/puck-external-field-typing-issue.md`
   staat klaar ("ready to file"); `@puckeditor/core` staat nog op `^0.21.2`. ~15 min,
   extern werk onder Eriks GitHub-identiteit — expliciete user-go vereist. Check vóór
   indienen of de issue in een nieuwere Puck-release al gefixt is.

# Acceptatiecriteria

- [ ] Bundle-meting `/p/[slug]` + beslissing split ja/nee (met cijfers)
- [ ] Perf-meting gedaan óf expliciet geskipt met reden (geen ≥50-component-LP's)
- [ ] Puck-issue ingediend (na user-go) óf obsoleet verklaard na release-check
- [ ] `npx tsc --noEmit` 0 errors (alleen relevant bij de bundle-split)

# Out-of-scope

- Nieuwe Puck-componenten of builder-features
- De browser-smoke-LP-matrix (staat als [USER]-item op de sessie-takenlijst)
