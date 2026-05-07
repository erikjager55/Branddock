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

> **2026-05-07**: content-versioning-crud + auto-trigger-fidelity-scoring (geabsorbeerd) afgerond. Versions worden nu auto-aangemaakt bij elke AI-generation, fidelity-scoring fires async. Sidebar-component drop-in klaar (CanvasPage-integratie als handover). Pre-launch content-flow-foundation staat.

1. **`brand-voice-content-integration`** ([task](tasks/brand-voice-content-integration.md)) — 3 dagen. BrandVoiceGuide injectie in generation prompts + voice-consistency score. Dependency op studio-real-ai (✓) satisfied.
2. **`content-item-qa-gating`** ([task](tasks/content-item-qa-gating.md)) — 2-3 dagen. Publish-readiness gate op consistency/persona/voice scores. Dependency op brand-voice (#1) voor voice-score.
3. **`posthog-sentry-browser`** ([task](tasks/posthog-sentry-browser.md)) — quick win 1 dag. Observability vóór eerste pilot. Onafhankelijk van content-pad.

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

- 2026-05-07 — [ContentVersion CRUD + studio hooks + version-history sidebar](tasks/done/content-versioning-crud.md)
- 2026-05-07 — [Auto-trigger fidelity-scoring](tasks/done/auto-trigger-fidelity-scoring.md) (absorbed in content-versioning)
- 2026-05-07 — [Studio component generation — echte AI in 3 routes](tasks/done/studio-content-generation-real-ai.md) (P0)
- 2026-05-07 — [Feature-planner sparring-partner (PM + Tech-Lead subagents)](tasks/done/feature-planner-setup.md)
- 2026-05-07 — [Hooks + skills + subagents + eerste autonome routine](tasks/done/hooks-routines-week-3.md) (week 3)

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
