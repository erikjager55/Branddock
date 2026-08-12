---
id: lp-publish-gate
title: P6 — publish-gate: deterministische merkvalidatie ín de publish-actie
fase: launch
priority: now
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: claude/puck-editor-improvement-y9ep4x (remote sessie)
---

# Probleem

Publiceren kende geen enkele validatie: template-placeholder-copy, ontbrekende
verplichte secties, dode CTA's of een hero zonder beeld gingen ongemerkt live.
Marktonderzoek: Lovable scant elke publish (security), maar níemand valideert
merk/anatomie — differentiatie-kans (verbeterplan §5 P6).

# Voorstel

`runPublishGate` (puur, <1 ms, geen AI-calls): blockers (ongeldige tree,
placeholder-copy — anti-fabricatie, ontbrekende verplichte secties per type)
weigeren hard; warnings (dode hrefs, hero zonder beeld, kwaliteit onder
drempel, onbekende sectie-types) vereisen expliciete bevestiging via een
twee-fasen-flow: dryRun → bevindingen tonen → "Toch publiceren".

# Acceptatiecriteria

- [x] `src/lib/landing-pages/publish-gate.ts` — 7 checks, severity-model, stabiele codes
- [x] Publish-route: dryRun-modus, 422 bij blockers, 409 bij onbevestigde warnings; server hercheckt altijd
- [x] `WebPagePublishPanel`: twee-fasen-flow + bevindingen-UI (blocker rood / warning amber) + "Toch publiceren"
- [x] i18n en/nl (`webPublish.gate.*`, vertaling op code met server-message als detail)
- [x] Smoke phase50 (7/7) in de chain
- [x] tsc 0 errors, eslint 0 errors

# Out-of-scope

- AI-checks (F-VAL/vision) op het publish-pad — bewust: latency/kosten; die blijven pre-publish surfaces
- Link-bereikbaarheids-checks (extern HTTP) — later, async

# Notes

Files: `src/lib/landing-pages/publish-gate.ts` (nieuw),
`src/app/api/landing-pages/publish/route.ts`,
`src/features/campaigns/components/canvas/WebPagePublishPanel.tsx`,
i18n-catalogs accordion en/nl, `scripts/smoke-tests/web-page-builder-phase50-publish-gate.ts`, `package.json`.
