---
id: tasks-migration-week-2
title: Backlog herstructurering — open plans + roadmap items naar tasks/
fase: pre-launch
priority: now
effort: 3 dagen
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-07
related-adr: docs/adr/2026-05-07-tasks-as-files.md
related-spec: -
worktree: -
---

# Probleem

Week 1 docs-migratie heeft `tasks/_template.md` + `roadmap.md` aangemaakt, maar de meeste roadmap-items zijn nog niet gedistilleerd naar individuele task-files. Zonder task-file kan `task-finalize` skill niet correct lopen, kan parallel werk niet veilig (file-overlap onbekend), en is "Werk overzicht" Stream Deck knop incompleet.

# Voorstel

Distilleer roadmap.md NOW + Next-bucket items naar `tasks/<id>.md` files met gestandaardiseerd template. Later-bucket items (Brandclaw nodes, externe integraties) blijven in roadmap.md visie-niveau — task-file pas wanneer concrete uitvoering aan de orde is.

# Acceptatiecriteria

## Dag 1 — Open plans distilleren (uitgevoerd 2026-05-07)
- [x] `tasks/campaign-drafts-db-backed.md`
- [x] `tasks/claw-page-awareness.md`
- [x] `tasks/power-user-shortcuts.md`

## Dag 2 — NOW + Pre-launch tasks (uitgevoerd 2026-05-07)
- [x] `tasks/hooks-routines-week-3.md` — week 3 migratie
- [x] `tasks/stripe-billing-live.md` — Stripe live billing
- [x] `tasks/vercel-deployment.md` — Vercel + Neon deployment

## Dag 3 — Top Next-bucket tasks (uitgevoerd 2026-05-07)
- [x] `tasks/pilot-onboarding-better-brands.md`
- [x] `tasks/posthog-sentry-browser.md`
- [x] `tasks/canvas-inline-edit-overlays.md`
- [x] `tasks/bv-wire-w1-full-centroid.md`
- [x] `tasks/content-styling-migratie.md`
- [x] `tasks/tech-debt-any-types.md`
- [x] `tasks/auto-trigger-fidelity-scoring.md`

## Cross-cutting
- [x] `roadmap.md` Now/Next links bijgewerkt naar concrete task-files
- [x] Top 5 NOW-tasks reviewen op compleetheid — alle 5 hebben acceptatiecriteria + smoke test plan + bestand-lijst
- [x] Originele 3 plan-docs in `docs/archive/plans-pending-task-migration/` gemarkeerd "✅ gedistilleerd naar tasks/"

## Niet in deze sessie (latere week 2 wenselijk)
- [ ] `tasks/onboarding-flow-test.md` — externe user-test sessie (1 week, launch fase)
- [ ] `tasks/marketing-site-pricing.md` — marketing site + pricing pagina (launch fase)
- [ ] `tasks/learning-loop-dashboard-usage.md` — per-sourceIdentifier dashboard
- [ ] `tasks/weekly-report-email-via-resend.md` — Emailit weekly report

Deze 4 zijn lager-prio binnen Next-bucket en kunnen on-demand gemaakt worden wanneer aan de beurt.

# Bestanden die ik aanraak

- `tasks/<id>.md` (10-12 nieuwe files)
- `roadmap.md` (links updaten)
- `docs/archive/plans-pending-task-migration/_README.md` (status updaten)

# Bestanden die ik NIET aanraak

- Originele plan-docs in archive (referentie blijft, geen wijziging)
- Code, schema, andere bestanden — pure documentatie

# Smoke test plan

1. `ls tasks/` toont 10+ bestanden + `_template.md` + `_README.md`
2. Stream Deck "Werk overzicht" knop → toont gestructureerde Now/Next/Later met links naar task-files
3. Open willekeurige task-file → frontmatter compleet, alle template-secties ingevuld
4. `roadmap.md` links werken (geen broken paths)

# Risico's

- **Detail-verlies bij distillatie**: 500-regel plan → 100-regel task-file. Mitigatie: link naar origineel via `related-spec` zodat volledige context vindbaar blijft
- **Out-of-date plans**: 3 originele plans zijn 1-3 maanden oud, tussentijdse codebase changes kunnen impact hebben. Mitigatie: distillatie noemt aanpak op hoog niveau, executie-sessie verifiëert tegen huidige codebase

# Out of scope

- Brandclaw Later-items (5 nodes) — blijven visie in roadmap.md tot uitvoer
- Externe integraties Later-items (Brandfetch, HubSpot, etc.) — task-file pas bij concrete uitvoer-besluit
- Tech debt Later-items (adapter-pattern, dual-versioning) — niet hoog op prio

# Notes

Pattern check: deze week-2 task-file zelf eet zijn eigen dogfood. Format werkt voor mid-grote werkpakketten met heldere stappen.
