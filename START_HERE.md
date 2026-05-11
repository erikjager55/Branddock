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

**Open Pre-launch werk** (resterend om BCP Phase 2 te sluiten):
- **Δ-4 PublishGate 2nd-opinion** — task-file nog te maken
- **claw-page-awareness vervolg-cluster** — page-wiring PersonaDetail / BrandAssetDetail / Step1Context

**Launch-track** (separate fase, na BCP Phase 2 closure):
- `vercel-deployment` (3d) + `stripe-billing-live` (1w) + `pilot-onboarding-better-brands` (2d) + onboarding-flow-test + marketing-site-pricing

Pilot-start projectie: **+4-6 weken** (was +6-10 begin sprint #3; review-surfaces sneller dan verwacht klaar).

---

## Top 3 actieve pre-launch tasks

> Δ-1 review-surfaces zijn allemaal landed op `main`. NOW-pipeline focust nu op Phase 2 closures plus optionele backlog-smokes.

1. **Δ-4 PublishGate 2nd-opinion** — task-file maken via feature-planner subagent. Scope: extra review-pass na initiële F-VAL composite om edge-cases en multi-pillar conflicten te vangen vóór publish. Effort onbekend.

2. **claw-page-awareness vervolg-cluster** — page-wiring voor PersonaDetail / BrandAssetDetail / Step1Context (deferred uit Phase 0.2.A). Task-file nog te maken. ~2 dagen.

3. **Backlog smoke-tests** (~1 uur totaal) — learning-loop end-to-end (item #3 cross-sessie backlog) + Visual Brief Compose / Trained-Style (item #4). Korte runway-check vóór launch-track.

**Daarna (launch-track activering)**:
- `vercel-deployment` (3d) ontgrendelt `pilot-onboarding-better-brands` (2d)
- `stripe-billing-live` (1w) parallel mogelijk
- `marketing-site-pricing` + `onboarding-flow-test` afsluitend

---

## Open beslissingen (blokkers voor werk)

1. **Δ-4 scope** — feature-planner moet bepalen: is dit een aparte AI-call (extra latency + cost) of een verfijning van bestaande F-VAL? Red Team check vóór technical-planner.
2. **Pilot LoRA-status Better Brands workspace** — trained-style image-flow defaults open op (`canvas-image-briefing-defaults` zette tiktok-script default op lifestyle als pilot-veiligheid; flip naar trained-style mogelijk via runtime check zodra LoRA's geseed zijn).
3. **Pre-launch sprint #3 browser-smokes uitgesteld** (per memory `branddock-pre-launch-smoke-batch`): Δ-1 Surface C 9-stappen browser-smoke bundelen met deployment/billing/onboarding smokes in sprint #4 batch.

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
