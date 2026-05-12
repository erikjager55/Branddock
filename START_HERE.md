# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> Update wekelijks (vrijdagretro) en na elke grote sprint.

---

## Huidige fase

**Pre-launch — herzien 2026-05-11, einde sprint #3 (BCP Phase 2 review-surfaces + side-iteraties)**:

- ✅ Pre-launch product-readiness van content-flows (sprint #1, 2026-05-07/08)
- ✅ Canvas + Studio audit + per-item tweaks (3 clusters, 36 types) + image-flow (3 layers) + locale-fix (sprint #2)
- ✅ Brand Control Program **Phase 0** (foundation + tech-debt-any-types)
- ✅ Brand Control Program **Phase 1** (F-VAL extension: W1-full centroid + multilingual heuristics + voice-baseline)
- ✅ Brand Control Program **Phase 2 Δ-1 surfaces** (Surface C Tab 3 UI + Surface D chat-tool + Surface E PublishGate + cleanup-pack + Insights tab)
- ✅ F-VAL rules-pijler audit (mapper + NL-NL packs + stem-variants + violation-dedup)
- ✅ Brand-language auto-detect (`franc-min` + backfill 13 workspaces + runtime mismatch-guard)
- ✅ BrandVoiceguide.contentLocale picker UI (Voice DNA tab manuele override)
- ✅ Cowork-pariteit Fase A + Competitive-intel Fase 1 data-laag

**Open Pre-launch werk** (scope-uitbreiding 2026-05-12 na roadmap-inventaris — 5 items + ~10 code-TODOs uit gaps getrokken):

3 parallelle tracks via worktrees, 4 sprints (~6-8 weken):

- **Track A — Quality + Validation**: content-items-test-coverage (53 types) + browser-smoke batch + code-debt cleanup
- **Track B — Brandclaw + Competitive**: brandclaw-tool-orchestrator → strategy-analyst-stub + competitor-ai-event-classifier + competitor-content-item-discovery + cron-infra ADR
- **Track C — Launch infra**: vercel-deployment → stripe-billing-live → pilot-onboarding-better-brands + onboarding-flow-test + marketing-site-pricing

**Verplaatst naar post-launch (2026-05-12)**:
- **Δ-4 PublishGate 2nd-opinion** — pilot niet live, geen evidence dat huidige 3-pijler F-VAL gaten heeft.

Pilot-start projectie: **+9-11 weken** (content-test verbeterplan Optie B Full geaccepteerd 2026-05-12 — 6 sub-sprints in Track A + chain-of-prompts + multi-modal upgrades, ~40d totaal naast strategy-analyst-stub langste pad).

---

## Top 3 actieve pre-launch tasks

> Sprint #4 start hier — validation + quick wins (~1 week, geen parallelisatie nodig). Zie roadmap.md NOW voor volledige sprint-volgorde.

1. **Browser-smoke batch** (~1-2u) — Δ-1 Surface C 9-stap + claw-page-awareness vervolg 5-stap + Visual Brief Compose/Trained-Style E2E + locale-picker browser-smoke. Confidence-check sprint #3 werk.

2. **Cron-infra ADR + code-debt quick wins** (~2-5u) — Vercel Cron vs Upstash QStash beslissing + design-tokens cleanup + variant-selection persist.

3. **testplan-content-items Ronde 1 — 8 representanten** (~1d) — blog-post / linkedin-post / search-ad / newsletter / landing-page / explainer-video / one-pager / press-release. Eind sprint #4: STOP-GATE bug-log review + sprint #5 scope-bepaling.

**Daarna (launch-track activering)**:
- `vercel-deployment` (3d) ontgrendelt `pilot-onboarding-better-brands` (2d)
- `stripe-billing-live` (1w) parallel mogelijk
- `marketing-site-pricing` + `onboarding-flow-test` afsluitend

---

## Open beslissingen (blokkers voor werk)

1. **Pilot LoRA-status Better Brands workspace** — trained-style image-flow defaults open op (`canvas-image-briefing-defaults` zette tiktok-script default op lifestyle als pilot-veiligheid; flip naar trained-style mogelijk via runtime check zodra LoRA's geseed zijn).
2. **Pre-launch sprint #3 browser-smokes uitgesteld** (per memory `branddock-pre-launch-smoke-batch`): Δ-1 Surface C 9-stappen browser-smoke bundelen met deployment/billing/onboarding smokes in sprint #4 batch.

---

## Hoe te beginnen

**Sessie-start prompt** (Stream Deck "Start sessie" knop):
```
Lees CLAUDE.md, gotchas.md en START_HERE.md.
Bevestig wat je begrijpt over de huidige fase en geef de top 3 actieve tasks.
```

**Bij task-werk**:
```
Werk aan tasks/<id>.md volgens de regels in CLAUDE.md.
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

## Recent afgeronde tasks (sessie 2026-05-08 / 2026-05-09)

> Allemaal op `origin/main` na PR-5 merge (`618d336`) + finalize-commit (`4b0cffe`, entry #242).

**Canvas + Studio sprint (12 tasks, 254/254 smoke-checks)**:
- Locale-fix bug — `content-locale-enforcement-fix` (31/31)
- Per-item tweaks — `canvas-tweaks-conversion-shortform` (8/8) + `-longform-authority` (8/8) + `-structured-skeleton` (13/13)
- Image-track — `canvas-image-briefing-defaults` (20/20) + `-content-coupling` (25/25) + `-briefing-textarea` (10/10)
- Discovery — `canvas-studio-audit` + `canvas-per-item-tweaks-plan` + `canvas-image-briefing-plan`

**BCP Phase 1 + bonus closures**:
- `heuristics-packages-multilingual` (50/50) — 4 locales
- `voice-baseline-1pager` (32/32)
- `campaign-brief-output-mapper` (31/31) — Cowork-pariteit Fase A — incl. 4-round task-finalize review-loop (entry #242)
- `canvas-inline-edit-overlays` (26/26) — BCP Phase 2 #1

**Δ-1 Content Review foundation + engine + API v1** — entry #239 (parallel-sessie commit `f755ccb`); Surface C UI is de eerstvolgende stap.

**11 nieuwe `npm run smoke:*` scripts** beschikbaar voor regression-testing.

---

## Zie ook

- **`roadmap.md`** — volledige Now/Next/Later met fasering
- **`docs/playbooks/working-flow.md`** — operating manual + spelregels
- **`docs/playbooks/feature-discovery.md`** — feature-planner pipeline
- **`CLAUDE.md`** — runtime context voor agent
- **`docs/changelog.md`** — wat is gebouwd (chronologisch; laatste entry #242)
- **`docs/audits/2026-05-08-canvas-studio-state.md`** — Canvas/Studio current-state audit
- **`docs/audits/2026-05-08-canvas-per-item-tweaks-plan.md`** — per-content-type tweak-plan
- **`docs/audits/2026-05-08-canvas-image-briefing-plan.md`** — image-flow plan
- **`docs/adr/`** — architecturale beslissingen
- **`tasks/`** — actieve taken (`_drafts/` staging area voor PM-output)
