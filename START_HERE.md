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

1. **Vercel deployment** ([`tasks/vercel-deployment.md`](tasks/vercel-deployment.md)) — pre-launch must-have, Vercel + Neon Postgres setup, env vars, deploy + smoke-test. Live-gang triggert overgang naar launch-fase.
2. **Stripe billing live** ([`tasks/stripe-billing-live.md`](tasks/stripe-billing-live.md)) — pre-launch must-have. Productie-mode keys, webhooks, checkout-flow getest met echte kaart. Kan parallel met Vercel werk.
3. **Pilot onboarding Better Brands** ([`tasks/pilot-onboarding-better-brands.md`](tasks/pilot-onboarding-better-brands.md)) — eerste echte klant door het volledige flow heen. Friction-punten in `gotchas.md`. Validatie van pre-launch readiness.

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
- **`CLAUDE.md`** — runtime context voor agent
- **`docs/changelog.md`** — wat is gebouwd (chronologisch)
- **`docs/adr/`** — architecturale beslissingen
- **`tasks/`** — actieve taken
- **`tasks/done/`** — afgeronde taken
