---
id: lp-select-and-tell
title: B3 — element-level select-and-tell (veld-gerichte AI-edit)
fase: launch
priority: now
effort: 3-4 dagen (gerealiseerd compacter — bouwt op A3/A4-matching + component-edit-route)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: claude/puck-editor-improvement-y9ep4x (remote sessie)
---

# Probleem

A4 geeft prompts op sectie-niveau; het v0/Onlook-patroon uit het
marktonderzoek is fijnmaziger: element aanwijzen → zeggen wat er anders
moet. Zonder veld-scoping herschrijft een sectie-prompt ook velden die de
gebruiker niet bedoelde.

# Voorstel

Tijdens een inline-edit (A3 kent het exacte veld-pad al) verschijnt een
✨-affordance naast het veld → element-promptbar → `component-edit` met
nieuw `targetField`: het model ziet uitsluitend dat ene veld en de server
garandeert dat alle overige velden byte-gelijk terugkomen. Compacte
voor/na-bevestiging (oud doorgestreept → nieuw) op het veld-anker; accept
via de kernel (`setSectionProps`, lock-guard) + live-value-guard.

# Acceptatiecriteria

- [x] Route: `targetField` gevalideerd tegen de per-type tekstveld-set + aanwezige waarde; prompt gescoped op één veld; overige velden gegarandeerd ongewijzigd in `proposedProps`; additieve echo in de response
- [x] Affordance alleen op top-level string-props (geneste array-paden buiten het contract); `onMouseDown`-preventDefault voorkomt blur-commit
- [x] Promptbar (Escape sluit; ≥3 tekens) + busy/error-states; 423-lock vertaald
- [x] Voor/na-bevestiging met accept/reject; accept met live-value-guard + kernel-lock-respect
- [x] i18n en/nl (`pageBuilder.element*`)
- [x] tsc + eslint 0 op geraakte bestanden

# Notes

Files: `src/app/api/landing-pages/component-edit/route.ts`,
`src/features/campaigns/components/canvas/medium/PreviewEditingLayer.tsx`,
i18n medium-catalogs en/nl. Meting accept-ratio per bron (§7 verbeterplan)
loopt mee op de bestaande diff-events zodra P4-analytics landt.
