---
id: page-render-own-loop
title: E1 — eigen PageRender + PageData + registry-contract (Puck-exit stap 1)
fase: launch
priority: now
effort: 2-3 dagen
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-07-puck-exit-sectie-editor.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: claude/puck-editor-improvement-y9ep4x (remote sessie)
---

# Probleem

Het datamodel én de render-loop van de webpage-builder waren eigendom van
`@puckeditor/core` (16 type-only `Data`-imports + ~6 `<Render>`-call-sites),
terwijl de audit aantoonde dat Puck alleen als platte render-loop gebruikt
wordt. Zolang Pucks `<Render>` het publieke pad bepaalt is compile-to-static
(P2) onbereikbaar en lekt de editor-chunk naar `/p/*`.

# Voorstel

Eigen `PageData`-type (structureel identiek aan de bestaande puckData-JSON —
géén datamigratie) + eigen hook-vrije `<PageRender>`-loop met
`data-section-id`/`data-section-type`-provenance (`display:contents`,
layout-neutraal; basis voor select-and-tell) + registry-contract
(`SECTION_TYPE_IDS` stabiel, `SECTION_REGISTRY_VERSION`,
`validatePageDataShape`). Alle call-sites + type-imports geswapt.

# Acceptatiecriteria

- [x] `PageData`/`PageContentItem`/`SECTION_TYPE_IDS` in `src/lib/landing-pages/page-data.ts`
- [x] `<PageRender>` in `src/lib/landing-pages/page-render.tsx` — RSC- én client-bruikbaar (geen hooks)
- [x] **Byte-gelijke HTML met Pucks `<Render>`** op alle 5 template-trees (nieuwe smoke phase46: 15/15 PASS, in `smoke:web-page-builder`-chain)
- [x] Alle 6 `<Render>`-call-sites geswapt (Step 3-preview, Step 2-variant-previews, beide diff-modals, `/p/[workspace]/[slug]`, screenshot-worker) + 3 dev-render-scripts
- [x] 17 type-only `Data`-imports + 1 inline-cast geswapt naar `PageData`
- [x] `npx tsc --noEmit` 0 errors
- [x] Fase-smokes groen (phase2 67/67, phase46 15/15)

# Out-of-scope

- `<Puck>`-editor-modal (E2) en dependency-verwijdering (E3)
- Per-sectie Zod-prop-schema's (B1 — AI-tool-laag)

# Notes

- Bijvangst: de screenshot-worker (child-process) bestond alléén omdat Pucks
  `Render` hooks gebruikt die in de RSC-laag crashen. `PageRender` is
  hook-vrij → P2 (statische compile) kan straks in-proces server-side
  renderen; worker-mechanisme bewust intact gelaten tot P2.
- `puck`-compat-stub in de render-aanroep verdwijnt bij E3.
