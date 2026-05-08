# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> Update wekelijks (vrijdagretro) en na elke grote sprint.

---

## ⚠️ EERSTE ACTIE BIJ SESSIE-START — BRANCH-STATE OPLOSSEN

**Onopgeloste branch-divergentie van 2026-05-08 sessie**:

| Branch | Inhoud | Status |
|---|---|---|
| `main` | Pre-divergentie. Geen Δ-1 / canvas-sprint werk. Synced met `origin/main`. | active checkout |
| `branddock-feat-competitor-snapshot` | Δ-1 sub-cluster A+B (foundation/engine/POST endpoint) + competitive-intel Fase 1 + canvas pre-launch sprint (12 tasks, 254 smoke-checks groen) — **commits `a8363c0` + `5c9f499` niet gepushed** | local-only |
| `tasks/content-review-tab-3-ui.md` | Δ-1 Surface C UI task-file (in-progress, 1-2d) door technical-planner gepromoot | **untracked op `main`**, dependencies leven op feature-branch |

### Eerste sessie-actie — kies één

**Optie A (aanbevolen)** — switch naar feature-branch + push naar origin voor PR:
```bash
git stash -u                                          # save untracked task-file
git checkout branddock-feat-competitor-snapshot
git stash pop                                          # restore task-file
git push -u origin branddock-feat-competitor-snapshot  # backup naar remote
```

**Optie B** — merge feature-branch naar `main` (lossere history):
```bash
git stash -u
git merge branddock-feat-competitor-snapshot
git stash pop
```

**Optie C** — discard alles (`git stash drop`) en herstart vanuit `main`. Verlies van 2 commits + 14 task-finalizations + 11 smoke-scripts.

→ **Tot deze keuze gemaakt is, blijft Δ-1 Surface C task geblokkeerd** (dependencies ontbreken op `main`).

---

## Huidige fase

**Pre-launch — herzien 2026-05-08, einde sprint #2 (Canvas + BCP Phase 1)**:

- ✅ Pre-launch product-readiness van content-flows (8 NOW-tasks 2026-05-07/08)
- ✅ Canvas + Studio audit + per-item tweaks (3 clusters, 36 content-types) + image-flow (3 layers) + locale-fix (12 tasks deze sessie)
- ✅ Brand Control Program **Phase 0** (claw-page-awareness foundation + tech-debt-any-types)
- ✅ Brand Control Program **Phase 1** (F-VAL extension: bv-wire-w1-full-centroid + heuristics-multilingual + voice-baseline-1pager)
- ✅ Cowork-pariteit Fase A (campaign-brief-output-mapper)
- ✅ Competitive-intel Fase 1 data-laag

**Open Pre-launch werk** (zie volgende sectie voor concrete tasks):
- Brand Control Program **Phase 2** review-surfaces: Δ-1 Surface C/D/E + Δ-4 + claw-vervolg
- Brand Control Program **Phase 3** Strategy Analyst (lange traject)

**Launch-blockers** (separate fase):
- `vercel-deployment` (3d) + `stripe-billing-live` (1w) + `pilot-onboarding-better-brands` (2d) + onboarding-flow-test + marketing-site-pricing

Pilot-start projectie: +6-10 weken (was +10-14, sneller dan verwacht door BCP Phase 1 in 1 sessie).

---

## Top 3 actieve pre-launch tasks (volgorde + branch waar ze leven)

> **Allen op `branddock-feat-competitor-snapshot`** — los eerst branch-state op.

1. **`content-review-tab-3-ui`** ([task](tasks/content-review-tab-3-ui.md)) — **Δ-1 Surface C, 1-2 dagen, status `in-progress`**. UI-tab voor Brand Alignment naast bestaande Δ-1 API. Eerste pilot-zichtbare review-surface. Dependencies (Δ-1 sub-cluster A+B) live op feature-branch, niet op `main`.

2. **Δ-1 Surface D — Brand Assistant chat-tool `add_review_findings`** — task-file nog te maken (idea-doc `tasks/_drafts/idea-content-review.md` had verdict `ready-to-build`, maar idea-doc is verloren bij branch-switch — feature-planner moet opnieuw of we hergebruiken oude voorstel uit Δ-1 idea-doc). 2-3 dagen geschat.

3. **Δ-1 Surface E — PublishGate findings-block** — uitbreiden op bestaande `PublishGate.tsx`. Task-file nog te maken. 2-3 dagen geschat. Per Red Team Review heeft regressie-risico op pilot-demo (eerste publish geblokkeerd door nieuwe gate = slechte ervaring) — **scope-trim aanbeveling**: na Surface C smoke + pilot-feedback bouwen, niet upfront.

**Volgende deliverables na Δ-1**:
- **Δ-4** PublishGate 2nd-opinion (BCP Phase 2)
- **claw-page-awareness vervolg-cluster** — page-wiring voor PersonaDetail / BrandAssetDetail / Step1Context (deferred uit Phase 0.2.A)

---

## Open beslissingen (blokkers voor werk)

1. **Branch-state** — zie EERSTE ACTIE bovenaan. Surface C kan niet uitgevoerd worden tot opgelost.
2. **Δ-1 Surface D + E scope-trim** — bouwen na Surface C pilot-feedback (aanbevolen) of upfront indivisible MVP? Per feature-planner Red Team review: trim aanbevolen.
3. **Pilot LoRA-status Better Brands workspace** — staat trained-style image-flow defaults open op (`canvas-image-briefing-defaults` zette tiktok-script default op lifestyle als pilot-veiligheid; flip naar trained-style mogelijk via runtime check zodra LoRA's geseed zijn).

---

## Hoe te beginnen

**Sessie-start prompt** (Stream Deck "Start sessie" knop):
```
Lees CLAUDE.md, gotchas.md en START_HERE.md.
Bevestig de branch-state warning + huidige top-3 tasks.
```

**Branch-state opgelost? Dan task-werk**:
```
Werk aan tasks/content-review-tab-3-ui.md volgens de regels in CLAUDE.md.
Start in plan-mode. Bevestig file-set en acceptatiecriteria voor je begint.
```

**Twijfel over wat te pakken**:
```
Geef me een overzichtelijk overzicht van mijn openstaande werk zodat ik kan kiezen wat ik oppak.
```

**Nieuw feature-idee** (sparring nodig vóór code):
```
Ik heb een idee voor X. Run feature-planner subagent.
```
Pipeline: 6-assen discovery → `tasks/_drafts/idea-<id>.md` → technical-planner → `tasks/<id>.md` → uitvoer.
Volledige gids: [`docs/playbooks/feature-discovery.md`](docs/playbooks/feature-discovery.md)

---

## Recent afgeronde tasks (sessie 2026-05-08)

> Op `branddock-feat-competitor-snapshot`, niet zichtbaar op `main` tot branch-state opgelost.

**Canvas + Studio sprint (12 tasks, 254/254 smoke-checks)**:
- Locale-fix bug — `content-locale-enforcement-fix` (31/31)
- Per-item tweaks — `canvas-tweaks-conversion-shortform` (8/8) + `-longform-authority` (8/8) + `-structured-skeleton` (13/13)
- Image-track — `canvas-image-briefing-defaults` (20/20) + `-content-coupling` (25/25) + `-briefing-textarea` (10/10)
- Discovery — `canvas-studio-audit` + `canvas-per-item-tweaks-plan` + `canvas-image-briefing-plan`

**BCP Phase 1 + bonus closures**:
- `heuristics-packages-multilingual` (50/50) — 4 locales
- `voice-baseline-1pager` (32/32)
- `campaign-brief-output-mapper` (31/31) — Cowork-pariteit Fase A
- `canvas-inline-edit-overlays` (26/26) — BCP Phase 2 #1

**11 nieuwe `npm run smoke:*` scripts** beschikbaar voor regression-testing.

---

## Zie ook

- **`roadmap.md`** — volledige Now/Next/Later met fasering (mogelijk verouderd t.o.v. branch-state — verifieer per branch)
- **`docs/playbooks/working-flow.md`** — operating manual + spelregels
- **`docs/playbooks/feature-discovery.md`** — feature-planner pipeline
- **`CLAUDE.md`** — runtime context voor agent
- **`docs/changelog.md`** — wat is gebouwd (chronologisch; entry #241 op feature-branch)
- **`docs/audits/2026-05-08-canvas-studio-state.md`** — Canvas/Studio current-state audit (op feature-branch)
- **`docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md`** — per-content-type tweak-plan
- **`docs/audits/2026-05-08-canvas-image-briefing-plan.md`** — image-flow plan
- **`docs/adr/`** — architecturale beslissingen
- **`tasks/`** — actieve taken (`_drafts/` staging area voor PM-output)
