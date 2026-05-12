---
id: pre-launch-browser-smoke-batch
title: Browser-smoke batch — Δ-1 Surface C + claw-page-awareness + Visual Brief + locale-picker
fase: pre-launch
priority: now
effort: 1-2u
owner: user (UI-manual)
status: open
created: 2026-05-12
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Sprint #3 leverde 7 task-finalizations (entries #243-251) plus side-iteraties, maar de bijbehorende browser-smokes zijn telkens uitgesteld omdat code-completion vóór UI-validation prioriteit had. Memory `branddock-pre-launch-smoke-batch` bevestigt: "Δ-1 Surface C 9-stappen browser-smoke uitgesteld naar pre-launch sprint #3 batch met deployment/billing/onboarding". Daarna bleef het uitgesteld.

Status nu: 4 batches code op `main` zonder hands-on UI-validation. Pre-launch sprint #4 is de natuurlijke plek om dit alsnog te doen vóór nieuwe features bovenop een ongeverifieerde basis komen.

# Voorstel

Eén batch van 4 browser-smokes, achter elkaar uitvoerbaar in ~1-2u op een gewarmde dev-server.

# Acceptatiecriteria

- [ ] **Δ-1 Surface C** — Brand Alignment Tab 3 "Content Review" UI: paste content + URL + composite-score render + findings-tabel + click-through naar deliverable
- [ ] **claw-page-awareness vervolg** (5 stappen uit `tasks/done/claw-page-awareness-vervolg.md`):
  - [ ] Step1Context: "vul keyMessage met 'X'" → confirm-card → veld gevuld + textarea reflecteert
  - [ ] PersonaDetail: "vul behaviors met 3 voorbeelden" → 1 confirm-card → 1 PATCH (geen burst) → refresh persistent
  - [ ] BrandAssetDetail: "vul proofPoints met 3 voorbeelden" → confirm → round-trip naar DB
  - [ ] Canvas Step 4 "review deze draft" → Surface D `review_content` werkt (geen regressie door nieuwe formFillFields)
  - [ ] Edge: PersonaDetail "Vul name met '' en clear quote" → name PATCH met `""`, quote PATCH met `null`
- [ ] **Visual Brief Compose** — Goed-Bouw workspace (10 library images READY): pick 2-9 images + instruction → generate → check output reflecteert composition
- [ ] **Visual Brief Trained-Style** — Goed-Bouw (1 ConsistentModel READY): pick trained model → generate → check output gebruikt trained style
- [ ] **Locale-picker UI** — LINFI Voice DNA tab: dropdown wisselt locale, "Currently active" pill refresht na Save, auto-detected suggestion zichtbaar
- [ ] Bug-log gepopuleerd met `[surface] severity: beschrijving → verwachte fix` voor elke P1/P2

# Bestanden die ik aanraak

- Geen code-bestanden — pure UI-smoke
- `gotchas.md` — bij gevonden issues toevoegen
- Bugfix-files volgen alleen voor P1/P2 hits, met expliciete commit-link

# Bestanden die ik NIET aanraak

- Andere browser-flows buiten deze 4 surfaces — apart in `content-items-test-coverage` of post-launch

# Smoke test plan

**Setup**:
- Dev server draait op `localhost:3000` (`npm run dev`)
- DevTools → Network + Console open
- Workspaces ready: LINFI (locale-picker + auto-detected nl-NL), Goed-Bouw (Visual Brief), Better Brands (algemeen)

**Volgorde**:
1. **claw-page-awareness vervolg** eerst (5 stappen, ~20min) — sprint #3 net afgerond, freshest in geheugen
2. **Locale-picker** (~10min)
3. **Δ-1 Surface C** (~20min)
4. **Visual Brief Compose** (~15min)
5. **Visual Brief Trained-Style** (~15min)

# Risico's

- **Stale dev-server**: vorige sessies kunnen orphaned next-server hebben (memory `branddock-dev-server-recovery`). Mitigatie: pkill -9 + .next/dev/lock cleanup vóór start als ChunkLoadError.
- **Workspace-data drift**: workspaces hebben evt geen library-images (better-brands compose). Mitigatie: smoke-test scripts gerund (`learning-loop-e2e` + `visual-brief-readiness`) bewezen ready-state.

# Out of scope

- 53-types content-test (apart in `content-items-test-coverage`)
- Performance-meting (gewoon check dat het werkt, niet timing)
- Cross-browser (Chrome only voor pilot)

# Notes

**Workspace readiness** per smoke (verified door scripts/smoke-tests/visual-brief-readiness.ts):
- LINFI: 125 images, 0 trained models — geschikt voor compose + locale-picker
- Goed-Bouw: 10 images, 1 trained model READY — perfecte test-workspace voor Visual Brief beide flows
- Better Brands: 1 image, 1 trained model — alleen trained-style test (compose needs ≥2)
