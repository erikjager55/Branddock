# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> Update wekelijks (vrijdagretro).

---

## Huidige fase

**Pre-launch** — product-readiness van de content-flow. Vercel + Stripe zijn launch-fase.

Pre-launch eindigt bij volledige content-flow zonder blocker-bugs (Brief → Strategy → Concept → Canvas → Export) + observability live.

---

## Top 3 actieve tasks

> Update na elke afgeronde task.

> **2026-05-08**: brand-voice-content-integration absorbed (BV-1 + fidelity-scorer + #227 leveren samen al voice-injectie + voice-scoring). Pre-launch content-flow-foundation staat compleet — focus verschuift naar gates + observability + de pre-pilot tracks.

1. **`content-item-qa-gating`** ([task](tasks/content-item-qa-gating.md)) — 2-3 dagen. Publish-readiness gate die lage consistency/persona/voice scores blokkeert vóór publicatie. Dependency op voice-score is nu satisfied (via `brand-fidelity` criterion).
2. **`posthog-sentry-browser`** ([task](tasks/posthog-sentry-browser.md)) — quick win 1 dag. Activation tracking + frontend errors live krijgen. Belangrijk vóór de eerste pilot.
3. **`campaign-drafts-db-backed`** ([task](tasks/campaign-drafts-db-backed.md)) — 1.5 dag. Multi-device persistence voor campaign drafts. Onafhankelijk parallel uitvoerbaar.

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

## Recent afgeronde tasks (laatste 5)

> Auto-bijgewerkt door `task-finalize` skill.

- 2026-05-08 — [Brand-voice content integration](tasks/done/brand-voice-content-integration.md) (absorbed by BV-1 + fidelity-scorer + #227)
- 2026-05-07 — [ContentVersion CRUD + studio hooks + version-history sidebar](tasks/done/content-versioning-crud.md)
- 2026-05-07 — [Auto-trigger fidelity-scoring](tasks/done/auto-trigger-fidelity-scoring.md) (absorbed in content-versioning)
- 2026-05-07 — [Studio component generation — echte AI in 3 routes](tasks/done/studio-content-generation-real-ai.md) (P0)
- 2026-05-07 — [Feature-planner sparring-partner (PM + Tech-Lead subagents)](tasks/done/feature-planner-setup.md)

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
