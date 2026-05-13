# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> Update wekelijks (vrijdagretro) en na elke grote sprint.

---

## Huidige fase

**Pre-launch — peildatum 2026-05-12 EOD: sprint #4 ~95% klaar + sprint #5 Track A vooruitgelopen**

Actuele sprint-status:

- ✅ Sprint #4 quick-wins (4/5): cron-infra ADR, Surface C smoke, claw-page-awareness smoke, locale-picker smoke, code-debt 2/12. **Open**: testplan-representanten 8 stuks + STOP-GATE bug-log review. VB Compose/Trained smoke deferred post-vercel.
- ✅ Sprint #5 Track A vooruitgelopen 2026-05-12: `content-test-foundation-5A`, `content-test-goldens-5B`, `content-test-auto-iterate-6B` (5/7 backend, wiring + dashboard deferred), `compose-pipeline-gemini-migration`, `claw-page-awareness-vervolg`. **In progress**: `content-test-wiring-gates-6A`.
- ⏸️ Track B (worktree `branddock-brandclaw`): 0 eigen commits, **49 commits achter op main**. Rebase nodig voor start.
- ⏸️ Track C (worktree `branddock-launch`): 0 eigen commits, **49 commits achter op main**. Rebase nodig voor start.

Eerdere afronding (sprint #1-3):

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

> Sprint #4 dichten + Track B/C activeren. Track A heeft sprint #5 al deels verlegd. Zie roadmap.md NOW voor volledige sprint-volgorde.

1. **testplan-content-items Ronde 1 — 8 representanten** (~1d) — blog-post / linkedin-post / search-ad / newsletter / landing-page / explainer-video / one-pager / press-release. Sluit sprint #4 af → STOP-GATE bug-log review + sprint #5 scope-bepaling.

2. **Track C activeren — `vercel-deployment`** (3d) — eerst `git rebase main` op worktree `branddock-launch` (49 commits achter). Hard launch-blocker, ontgrendelt `pilot-onboarding-better-brands` (2d).

3. **Track B activeren — `brandclaw-tool-orchestrator`** (3-5d) — eerst `git rebase main` op worktree `branddock-brandclaw` (49 commits achter). Foundation voor `strategy-analyst-stub` (langste kritieke pad, 20-27d).

**Track A vervolg (binnen sprint #5)**:
- `content-test-wiring-gates-6A` (in_progress) — afmaken
- `content-test-auto-iterate-6B` wiring + dashboard panels (deferred deel afmaken)
- `content-items-test-coverage` full 53-types Ronde 1 (parallel met 5.B)

**Track C follow-on**:
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

## Recent afgeronde tasks (sessies 2026-05-10 t/m 2026-05-12)

> Track A op `main`. 243 commits in laatste 7 dagen.

**Sprint #4 quick-wins (2026-05-10/12)**:
- Cron-infra ADR — Vercel Cron continueren (`docs/adr/2026-05-12-cron-infra.md`)
- Browser-smoke partial: Surface C ✅ + claw-page-awareness ✅ + locale-picker ✅. VB Compose/Trained deferred post-vercel.
- Code-debt 2/12 done

**Sprint #5 Track A vooruitgelopen (2026-05-12)**:
- `content-test-foundation-5A` ✅ — Layer 1 generic property evals + Prompt Registry UI v1
- `content-test-goldens-5B` ✅ — chain-of-prompts upgrades (4 batches A-D) + golden sets via Promptfoo
- `content-test-auto-iterate-6B` ✅ partial (5/7 backend) — feedback-compiler + auto-iterate orchestrator + edit-distance + per-type thresholds + Canvas SSE + InsightsTab dashboard. Wiring + dashboard panels deferred.
- `compose-pipeline-gemini-migration` ✅ — FAL Flux Pro Kontext → Gemini nano-banana
- `claw-page-awareness-vervolg` ✅ — Step1Context + PersonaDetail + BrandAssetDetail wiring

**Sprint #3 (eerder afgerond, 2026-05-09/11)** — Δ-1 Content Review surfaces (C/D/E + cleanup + Insights tab), F-VAL rules-pijler audit, Brand-language auto-detect, BrandVoiceguide picker. Details: `tasks/done/` + `docs/changelog.md` entries #243–250.

**Sprint #2 (gemerged 2026-05-09 via PR #5 `618d336`)** — Canvas/Studio 12 tasks + BCP Phase 0/1 + Cowork-pariteit Fase A + Competitive-intel Fase 1. Entries #239–242.

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
