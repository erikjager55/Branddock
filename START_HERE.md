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

> **2026-05-08**: pre-pilot UI-wiring afgerond — VersionHistorySidebar + PublishGate live in Step4Timeline. 7 NOW-tasks done deze week; pre-launch is functioneel + zichtbaar voor pilot-users. Alleen content-styling-migratie open in NOW-bucket.

1. **`content-styling-migratie`** ([task](tasks/content-styling-migratie.md)) — 3-5 dagen. Content-styling velden naar Content Brief (8 categorieën). Laatste open NOW-task.
2. **`pilot-onboarding-better-brands`** ([task](tasks/pilot-onboarding-better-brands.md)) — 2 dagen, NEXT/launch-fase. Eerste echte klant door volledige flow heen, friction-punten in `gotchas.md`. Functioneel staat alles klaar voor pilot-start.
3. **`vercel-deployment`** ([task](tasks/vercel-deployment.md)) — 3 dagen, NEXT/launch-fase. Vercel + Neon DB + custom domain + monitoring. Voorwaarde voor pilot-publicatie aan externe gebruikers.

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

- 2026-05-08 — [Campaign drafts DB-backed](tasks/done/campaign-drafts-db-backed.md) (absorbed by 3 eerdere sessies)
- 2026-05-08 — [PostHog browser + Sentry frontend observability](tasks/done/posthog-sentry-browser.md)
- 2026-05-08 — [Content publish QA-gate](tasks/done/content-item-qa-gating.md) (manual + channel routes)
- 2026-05-08 — [Brand-voice content integration](tasks/done/brand-voice-content-integration.md) (absorbed by BV-1 + fidelity-scorer + #227)
- 2026-05-07 — [ContentVersion CRUD + studio hooks + version-history sidebar](tasks/done/content-versioning-crud.md)

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
