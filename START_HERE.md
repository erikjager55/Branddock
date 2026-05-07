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

> **2026-05-07**: studio-content-generation-real-ai (P0) afgerond — content-flow levert nu echte AI-output. Volgende kritische pad: versioning + brand-voice + QA-gating.

1. **`content-versioning-crud`** ([task](tasks/content-versioning-crud.md)) — 3 dagen. ContentVersion CRUD-routes + version history UI. Unblockt `auto-trigger-fidelity-scoring` (1 uur, blocked). Dependency op studio-real-ai is nu satisfied.
2. **`brand-voice-content-integration`** ([task](tasks/brand-voice-content-integration.md)) — 3 dagen. BrandVoiceGuide injectie in generation prompts + voice-consistency score. Onafhankelijk parallel uitvoerbaar met #1.
3. **`posthog-sentry-browser`** ([task](tasks/posthog-sentry-browser.md)) — quick win 1 dag. Observability moet staan vóór eerste pilot. Onafhankelijk van content-pad.

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

- 2026-05-07 — [Studio component generation — echte AI in 3 routes](tasks/done/studio-content-generation-real-ai.md) (P0)
- 2026-05-07 — [Feature-planner sparring-partner (PM + Tech-Lead subagents)](tasks/done/feature-planner-setup.md)
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
