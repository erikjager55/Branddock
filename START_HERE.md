# START HERE

> Entry point voor mens en agent. Lees deze bij elke sessie-start.
> Update wekelijks (vrijdagretro).

---

## Huidige fase

**Pre-launch — herzien 2026-05-08**: scope verbreed via [Brand Control Program](tasks/_drafts/idea-brand-control-program.md). Naast oorspronkelijke product-readiness ook review-side capabilities (Δ-1/2/3/4) + Strategy Analyst-stub. Pilot-start verplaatst van "+/- nu" naar +10-14 weken (strategische product-positioneringskeuze: brand-control instrument vs. content-creatie tool). Vercel + Stripe blijven launch-fase, ná programma-completion.

Pre-launch nu: alle 4 fasen Brand Control Program klaar + content-flow blocker-vrij + observability live.

---

## Top 3 actieve tasks

> Update na elke afgeronde task.

> **2026-05-08**: oorspronkelijke pre-launch NOW-bucket geleegd (8 tasks done deze week). Brand Control Program besloten — Phase 0 voorlopers nu top-prio. ADR-1 + ADR-3 geschreven; idea-doc gelocked-in.

1. **`tech-debt-any-types`** ([task](tasks/tech-debt-any-types.md)) — 1-2 dagen, **Phase 0** voorloper, status `in-progress`. Schema-extensie safety voor ADR-1 (`BrandReviewFinding`) + ADR-3 (`BrandVoiceguide.contentLocale`). Cluster-prioriteit API/hooks/lib/ai eerst. L2 auto-mode kandidaat.
2. **`claw-page-awareness`** ([task](tasks/claw-page-awareness.md)) — 2-3 dagen, **Phase 0** voorloper, status `open`. Brand Assistant pageContext + `inspect_current_entity` + `fill_form_fields`. Acceptance uitgebreid met Δ-1 chat-integratie hooks (3 nieuwe criteria).
3. **`bv-wire-w1-full-centroid`** ([task](tasks/bv-wire-w1-full-centroid.md)) — 4-6 uur, **Phase 1** onderdeel, status `open`. F-VAL Pijler 1 string-match → cosine-similarity. Better Brands regression toonde Δ+24 punten. Harness staat klaar.

**Niet-Phase-0 NOW-task**: [`canvas-studio-audit`](tasks/canvas-studio-audit.md) (1d) — parallel uitvoerbaar binnen Phase 0 wall-clock; informeert per-item tweaks die in Phase 2 review-surfaces meegenomen kunnen worden.

**Volgende deliverables na Phase 0**: Δ-2 (heuristiek-pakketten NL/EN/BE/DE) + Δ-3 (voice 1-pager) → technical-planner promotion vereist; geen task-files yet.

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

- 2026-05-08 — [Content-styling migratie (9 categorieën, validator-driven)](tasks/done/content-styling-migratie.md)
- 2026-05-08 — [Campaign drafts DB-backed](tasks/done/campaign-drafts-db-backed.md) (absorbed by 3 eerdere sessies)
- 2026-05-08 — [PostHog browser + Sentry frontend observability](tasks/done/posthog-sentry-browser.md)
- 2026-05-08 — [Content publish QA-gate](tasks/done/content-item-qa-gating.md) (manual + channel routes)
- 2026-05-08 — [Brand-voice content integration](tasks/done/brand-voice-content-integration.md) (absorbed by BV-1 + fidelity-scorer + #227)

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
