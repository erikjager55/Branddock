---
id: content-test-flow-analyse-7A
title: Content-test sub-sprint #7.A — Flow-analyse per content-categorie (8 rapporten)
fase: pre-launch
priority: now
effort: ~3 dagen
owner: claude-code
status: done
created: 2026-05-12
completed: 2026-05-29
related-adr: -
related-spec: docs/specs/content-test-improvement-plan.md §3.4 + §4 #7.A
worktree: -
---

# Probleem

8 content-categorieën (long-form / social / advertising / email / website / video / sales / PR), 53 types — geen per-categorie analyse van waar in de 6-staps flow elke categorie breekt. Quick-wins door categorie-brede fixes worden gemist.

# Voorstel

Per categorie een ~3u audit → rapport in `docs/specs/content-flow-<categorie>.md`. 8 categorieën × ~3u = ~3 dagen.

Per rapport:
- Pipeline-doorloop: welke checkpoints zijn category-specific?
- Prompt-quality: hoeveel few-shot examples per type? Plan-and-Solve vs single-prompt?
- Output-format: markdown / HTML / structured-JSON / video-script
- Asset-pattern: hero / inline / carousel / no-asset
- Recent gotchas voor deze categorie (uit `gotchas.md`)
- Friction-points uit testplan-content-items resultaten
- Concrete verbeter-aanbevelingen

# Acceptatiecriteria

- [x] 8 categorie-rapporten in `docs/specs/content-flow-<categorie>.md`
- [x] Per rapport: friction-points + prompt-tuning recs + asset-status + cross-type patterns
- [x] Cross-category synthesis-doc: welke types delen prompt-templates en kunnen DRY'd worden
- [x] Bekende friction → ticket gemaakt in code-debt-pre-launch-cleanup OF nieuwe task

# Bestanden die ik aanraak

**Nieuw**:
- `docs/specs/content-flow-long-form.md`
- `docs/specs/content-flow-social.md`
- `docs/specs/content-flow-advertising.md`
- `docs/specs/content-flow-email.md`
- `docs/specs/content-flow-website.md`
- `docs/specs/content-flow-video.md`
- `docs/specs/content-flow-sales.md`
- `docs/specs/content-flow-pr-hr.md`
- `docs/specs/content-flow-synthesis.md` (cross-cutting patterns)

# Risico's, scope, notes

Zie plan-doc §3.4 + §4 #7.A. **Sprint-positie**: in #7 — na alle code-werk uit #5/#6, gebruikt resultaten als input voor analyse. Parallel mogelijk met #7.B regression-werk.
