---
id: publish-static-compile
title: P2 — compile-to-static bij publish (bevroren artifact per versie)
fase: launch
priority: now
effort: 4-6 dagen (gerealiseerd compacter — E1's hook-vrije render maakte in-proces compile mogelijk)
owner: claude-code
status: done
created: 2026-08-12
completed: 2026-08-12
related-adr: docs/adr/2026-08-12-compile-to-static-publish.md
related-spec: docs/specs/2026-08-07-webpage-builder-verbeterplan.md
worktree: claude/puck-editor-improvement-y9ep4x (remote sessie)
---

# Probleem

Publieke pagina's renderden per ISR-miss runtime React + volledige
context-assembly; de snapshot bevroor content maar niet styling (styleguide-
wijziging herstijlde live pagina's stilzwijgend); AI-crawlers voeren geen JS
uit. Webflow/Framer-kamp (marktonderzoek): compile bij publicatie.

# Voorstel

`compilePageArtifact` (renderToStaticMarkup over de hook-vrije PageRender +
a11y-styles + font-links + ge-escapede JSON-LD) → `PagePublish.compiledHtml`
per versie; fail-soft in de publish-route; de publieke route serveert het
artifact van de live pointer en slaat context-assembly/config/render over —
rollback serveert automatisch de bevroren staat van díe versie (token-freeze,
ADR-besluit 2).

# Acceptatiecriteria

- [x] ADR `2026-08-12-compile-to-static-publish` (token-freeze + DB-kolom-v1 + R2-migratietrigger)
- [x] Schema: `PagePublish.compiledHtml String?` (additief; ⚠️ `prisma db push` op Neon bij deploy)
- [x] Compiler: sectie-body byte-gelijk aan PageRender-output; JSON-LD XSS-safe embedded (gedeelde `serializeJsonLdForHtml` in import-vrije `html-escape.ts`); font-links alleen voor niet-systeem-fonts
- [x] Publish-route compileert fail-soft ná snapshot, vóór revalidate; JSON-LD mee-bevroren (`page-json-ld-server.ts`-extractie, gedrag route ongewijzigd)
- [x] `/p/[workspace]/[slug]` short-circuit op artifact; runtime-fallback voor pre-P2-publishes intact
- [x] Smoke phase51 8/8; tsc + eslint 0 errors
- [ ] [DEPLOY] TTFB-/`x-vercel-cache`-meting op prod (verbeterplan §7-metriek)

# Out-of-scope (expliciet, per ADR)

- R2/edge-serving (migratietrigger gedocumenteerd), batch-"republish met nieuw thema" (C/D-spoor), forms-island (P3), zip-export (D3 — zelfde compiler).

# Notes

Files: ADR, `prisma/schema.prisma`, `src/lib/landing-pages/{static-compile,html-escape,page-json-ld-server,publish-page}.ts`,
`src/app/api/landing-pages/publish/route.ts`, `src/app/p/[workspace]/[slug]/page.tsx`,
`scripts/smoke-tests/web-page-builder-phase51-static-compile.ts`.
Chain-registratie phase51 in package.json volgt in de B2/B4-commit (gedeeld bestand met lopend parallel werk).
