# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> Update wekelijks (vrijdagretro).

---

## Huidige fase

**Pre-launch** — alle code draait localhost. Stripe + Vercel deployment in voorbereiding.

Pre-launch eindigt bij livegang (Vercel + custom domain operationeel).

---

## Top 3 actieve tasks

> Update na elke afgeronde task.

> **2026-05-07 — fase-shift**: Vercel + Stripe verplaatst naar launch-fase. Pre-launch = product-readiness van content-flow. Inventarisatie leverde 4 nieuwe NOW-tasks op (content-items kritisch pad).

1. **`studio-content-generation-real-ai`** ([task](tasks/studio-content-generation-real-ai.md)) — **P0**, 1 week. TODO-stubs in 3 studio generation-routes vervangen door echte AI-calls + cascading-context builder. Zonder dit werkt content-flow niet.
2. **`content-versioning-crud`** ([task](tasks/content-versioning-crud.md)) — 3 dagen. ContentVersion CRUD-routes + version history UI. Unblockt `auto-trigger-fidelity-scoring`. Dependency op #1 voor hooks.
3. **`posthog-sentry-browser`** ([task](tasks/posthog-sentry-browser.md)) — quick win 1 dag. Observability moet staan vóór pilot. Onafhankelijk van content-pad.

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

- 2026-05-07 — [Hooks + skills + subagents + eerste autonome routine](tasks/done/hooks-routines-week-3.md) (week 3)
- 2026-05-07 — [Backlog herstructurering — open plans + roadmap items naar tasks/](tasks/done/tasks-migration-week-2.md) (week 2)
- 2026-05-07 — [Documentatie-architectuur migratie](tasks/done/docs-migration-week-1.md) (week 1)

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
