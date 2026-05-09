# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> Update wekelijks (vrijdagretro).

---

## Huidige fase

**Pre-launch — 2026-05-08 (laat)**: scope verbreed via [Brand Control Program](tasks/_drafts/idea-brand-control-program.md) + parallel werkstroom [Competitive Intelligence Loop](tasks/_drafts/idea-competitive-intelligence-loop.md). Pilot-start verplaatst naar +10-14 weken. Vercel + Stripe blijven launch-fase, ná programma-completion.

**Stand van zaken**:
- BCP Phase 0 ✅ done (tech-debt-any-types, claw-page-awareness, bv-wire-w1-full-centroid)
- BCP Phase 1 task-files gepromoot: `heuristics-packages-multilingual` (Δ-2) + `voice-baseline-1pager` (Δ-3) — beide open
- ADR-2 Brandclaw agent-architectuur ✅ accepted (commit `64ebfdb`)
- Canvas-studio-audit ✅ done — spawnde **6 nieuwe canvas-cluster tasks** (3 per-item tweaks + 3 image-briefing)
- Competitive-intel Fase 1 PR-1 ✅ committed (schema toegepast); PR-2/PR-3 open

---

## Top actieve tasks

> Update na elke afgeronde task. **10 priority-now tasks open** — geclusterd hieronder. User kiest wat hij oppakt; mijn top-3 advies bovenaan.

> **2026-05-08 (laat)**: parallel-sessie burst — canvas-studio-audit + bijbehorende plans done, 6 canvas-cluster tasks gepromoot, 2 BCP Phase 1 task-files gepromoot, content-locale-enforcement-fix done. Mijn werk: competitive-intel PR-1 schema in twee commits.

### Top 3 advies

1. **`competitor-snapshot-historie`** ([task](tasks/competitor-snapshot-historie.md)) — 3-4 dagen, status `in-progress`. PR-1 schema gecommit. PR-2 (diff-engine + backfill) en PR-3 (refresh dual-write) open. Worktree `branddock-feat-competitor-snapshot`.
2. **`heuristics-packages-multilingual`** ([task](tasks/heuristics-packages-multilingual.md)) — 5-7 dagen, status `open`. BCP Phase 1 Δ-2: F-VAL Pijler 3 NL-NL / NL-BE / EN-GB / DE-DE pakketten. Blokt Phase 2 Δ-1.
3. **`voice-baseline-1pager`** ([task](tasks/voice-baseline-1pager.md)) — 2-3 dagen, status `open`. BCP Phase 1 Δ-3: afgeleide compact voice-view uit BrandVoiceguide.

### Andere open priority-now tasks (geclusterd)

**Canvas per-item tweaks cluster** (gepromoot uit canvas-studio-audit):
- `canvas-tweaks-conversion-shortform` (2-3d) — social posts, ads, promo-email
- `canvas-tweaks-longform-authority` (2d) — blog, thought-leadership, whitepaper, case-study, press
- `canvas-tweaks-structured-skeleton` (2d) — carousels, web-pages, decks, podcast/webinar + naked-type fixes

**Canvas image-briefing cluster** (gepromoot uit canvas-image-briefing-plan):
- `canvas-image-briefing-defaults` (1d) — per-content-type defaults + suggestie-strook in Visual Brief
- `canvas-image-briefing-textarea` (1d) — briefing-textarea + AI-suggestie
- `canvas-image-content-coupling` (1-1.5d) — content-coupled image-prompt builder

**Cowork-pariteit Fase A**:
- `campaign-brief-output-mapper` (2-3d) — render-only mapper, geen Prisma-wijziging

### Volgende deliverables (geen task-file yet)

- BCP Phase 2: Δ-1 Content Review (3 surfaces) + Δ-4 PublishGate 2nd-opinion + claw-page-awareness vervolg-cluster
- Competitive-intel Fase 2 (`competitor-positioning-frameworks-ui`) — conditional op pilot-validatie
- Competitive-intel Fase 4 (`brandclaw-competitor-monitoring`) — post-launch, eigen cron-infra ADR

---

## Hoe te beginnen

Bij elke sessie:
```
Lees CLAUDE.md, gotchas.md en START_HERE.md.
Bevestig wat je begrijpt over de huidige fase en geef de top 3 actieve tasks.
```

Bij task-werk:
```
Werk aan tasks/<id>.md volgens de regels in CLAUDE.md.
Start in plan-mode. Bevestig file-set en acceptatiecriteria voor je begint.
```

Bij twijfel over wat te doen:
```
Geef me een overzichtelijk overzicht van mijn openstaande werk zodat ik kan kiezen wat ik oppak.
[volledige prompt in Stream Deck knop "Werk overzicht"]
```

Bij **nieuw feature-idee** (sparring nodig vóór code):
```
Ik heb een idee voor X. Run feature-planner subagent.
```
Pipeline: 6-assen discovery → `tasks/_drafts/idea-<id>.md` → technical-planner → `tasks/<id>.md` → uitvoer.
Volledige gids: [`docs/playbooks/feature-discovery.md`](docs/playbooks/feature-discovery.md)

---

## Open beslissingen (blokkers voor werk)

> Items die werk blokkeren tot user beslist.

- _(geen op dit moment)_

---

## Recent afgeronde tasks (laatste 7, week 19)

> Auto-bijgewerkt door `task-finalize` skill.

- 2026-05-08 — [Content-locale enforcement fix](tasks/done/content-locale-enforcement-fix.md)
- 2026-05-08 — [Canvas image-briefing plan](tasks/done/canvas-image-briefing-plan.md) — spawnde 3-task image-briefing cluster
- 2026-05-08 — [Canvas per-item tweaks plan](tasks/done/canvas-per-item-tweaks-plan.md) — spawnde 3-task canvas-tweaks cluster
- 2026-05-08 — [Canvas + Studio audit](tasks/done/canvas-studio-audit.md) — basis voor de 2 plans hierboven
- 2026-05-08 — [Tech-debt any-types cleanup (146 fixes)](tasks/done/tech-debt-any-types.md) — BCP Phase 0
- 2026-05-08 — [Brand Assistant page awareness](tasks/done/claw-page-awareness.md) — BCP Phase 0
- 2026-05-08 — [F-VAL Pijler 1 cosine-similarity](tasks/done/bv-wire-w1-full-centroid.md) — BCP Phase 1, Better Brands Δ+24

---

## Zie ook

- **`roadmap.md`** — volledige Now/Next/Later met fasering
- **`docs/playbooks/working-flow.md`** — operating manual + spelregels
- **`docs/playbooks/feature-discovery.md`** — feature-planner pipeline
- **`CLAUDE.md`** — runtime context voor agent
- **`docs/changelog.md`** — wat is gebouwd (chronologisch)
- **`docs/adr/`** — architecturale beslissingen
- **`tasks/`** — actieve taken (+`_drafts/` staging area voor PM-output)
- **`tasks/done/`** — afgeronde taken
