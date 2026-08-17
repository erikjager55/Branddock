---
id: lp-page-prompt-action
title: A2 — vrij promptveld op paginaniveau (strict-rewrite-wiring)
fase: launch
priority: now
effort: 1 dag
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: claude/puck-editor-improvement-y9ep4x (remote sessie)
---

# Probleem

De `strict-rewrite`-route (vrije gebruikersinstructie, "never skips") bestond
sinds Phase 6 zonder UI-knop; het code-comment in PuckPageBuilder beloofde
"Generate-from-prompt" dat nooit gebouwd was. Gebruikers konden alleen via
vaste knoppen (Auto-iterate) AI-wijzigingen doen — de kern van het
"statische" gevoel (verbeterplan §1.2).

# Voorstel

Promptveld in de Step 3-hoofdview ("Beschrijf wat je wilt aanpassen…") →
POST bestaande `/api/landing-pages/strict-rewrite` → voorstel door de
bestaande `PageDiffPreviewModal` (source `strict-rewrite` bestond al in de
modal). Lock-guard, timeout-afhandeling, i18n en/nl.

# Acceptatiecriteria

- [x] Promptveld + submit in PuckPageBuilder (Enter of knop); disabled bij lock/busy/<3 tekens
- [x] Voorstel → PageDiffPreviewModal met per-sectie accept/reject (bestaand mechanisme)
- [x] Fouten en timeout (3 min cap) netjes getoond
- [x] i18n en/nl (`pageBuilder.prompt*`)
- [x] tsc + eslint 0 errors

# Notes

Gecommit samen met E1 (commit "E1 eigen PageRender + PageData + A2 vrij
promptveld"). Accept-ratio-meting per bron (§6 verbeterplan) volgt met P4.
