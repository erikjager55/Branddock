---
id: content-flow-improvements-7a
title: Content-flow verbeteringen — friction-tickets uit #7.A flow-analyse
fase: pre-launch
priority: next
effort: "gemengd — zie per ticket"
owner: claude-code
status: open
created: 2026-05-29
completed: -
related-adr: -
related-spec: docs/specs/content-flow-synthesis.md
worktree: -
---

# Probleem

De #7.A flow-analyse (8 categorie-rapporten + `docs/specs/content-flow-synthesis.md`) heeft concrete, code-bevestigde frictie blootgelegd die geen documentatie maar code-werk vraagt. Dit bestand bundelt die tickets zodat #7.A puur analyse blijft (geen autonome code-fixes). Er bestond nog geen `code-debt-pre-launch-cleanup.md`, vandaar een eigen task-file.

# Voorstel

Per ticket een afgebakende fix; aanpakken in prio-volgorde (HIGH eerst). HIGH-items raken merkbare output-kwaliteit pre-launch.

# Tickets

## HIGH
- [ ] **CF-1 — 5 untemplated kerntypes → generieke prompt.** `whitepaper`, `ebook`, `article` (long-form), `newsletter` (email), `microsite` (website) hebben **geen** entry in TEMPLATE_REGISTRY → `getPromptTemplate()` valt stil terug op de generieke prompt (`prompt-templates/index.ts:56-74`). Schrijf dedicated templates (in resp. `long-form.ts`/`email.ts`/`website.ts`) **en** voeg een `console.warn` toe op de generic-fallback hit zodat dit nooit meer stil gebeurt.
- [ ] **CF-2 — `twitter-thread` afmaken.** Routing + preview-map gaten + ontbrekende content-templates-fallback. Volgende open Ronde 1-representant. (`social-media.ts` + preview-map dispatch + `component-templates-fallback.ts`.)

## MED
- [ ] **CF-3 — Plan-and-Solve generaliseren.** Verruim conditie `contentTypeCategory === 'long-form'` (`canvas-orchestrator.ts:396`) naar een `LONG_OUTPUT_TYPES`-set zodat lange types buiten long-form ook PLAN→EXECUTE→ASSEMBLY kunnen nemen: `microsite`/`faq-page`/`comparison-page` (website), `proposal-template` (sales), `impact-report` (pr-hr). ADR-waardig (raakt orchestrator-pad).
- [ ] **CF-4 — `TYPE_TO_CATEGORY` synchroniseren.** `prompt-version-registry.ts` mist ~17 echte types en bevat ~9 phantom-IDs (`battle-card`, `objection-handler`, `product-demo`, `company-announcement`, `job-description`, `recruitment-post`, `employee-newsletter`, `crisis-statement`, `thought-leadership-bio`). Daardoor geeft `getCategoryForType()` de fallback `'long-form'` voor echte types (bv. `internal-comms`, `proposal-template`, `testimonial-video`) → verkeerde prompt-versie-tracking/routing. Genereer de map idealiter uit TEMPLATE_REGISTRY-keys zodat hij niet opnieuw kan divergeren.
- [ ] **CF-5 — Few-shot uitbreiden advertising + email.** Advertising (strengste format, ≈7) en email (≈5) ondergevoed. 1→2-3 anchors per type, met name ad-format slots en email subject/preheader.
- [ ] **CF-6 — Email sequence-coherentie-pass.** `welcome-sequence`/`nurture-sequence` per-email zonder cross-email consistentie. Lichte siblings-context check; sluit aan op `studio-siblings-context-variation`.
- [ ] **CF-7 — Elevated review public-facing pr.** `press-release` + `impact-report` verhoogde fidelity-threshold + human-review-flag via `per-type-thresholds.ts` (mechanisme bestaat al — waarde + UX-flag instellen).
- [ ] **CF-8 — Categorie-grens ad/long-form templates.** `linkedin-ad`/`facebook-ad` (UI advertising) en `linkedin-article` (UI long-form) leven in `social-media.ts`. Documenteer expliciet of verplaats naar het categorie-bestand dat de UI suggereert.
- [ ] **CF-9 — landing-page Step 2 brand-fidelity wiring verifiëren** op `main` (FidelityScoreBar gap gevonden in web-page-builder worktree — bevestigen of het ook op main speelt).

## LOW / defer
- [ ] **CF-10 — Per-categorie F-VAL threshold-profielen** — uitstellen tot pilot-data (geen preventieve tuning).

# Bestanden die ik aanraak

Per ticket verschillend — zie inline file-refs in de categorie-rapporten. Géén bulk-refactor.

# Out of scope

- Video-categorie her-activeren (hangt op `video-chain-explainer-showcase`).
- Carousel multi-slide pipeline (eigen task).

# Notes

Bron: `docs/specs/content-flow-synthesis.md` §F. Friction-secties (§6) in de categorie-rapporten zijn deels *pending Ronde 1* — nieuwe tickets kunnen hier bijkomen zodra het handmatige testplan vordert.
