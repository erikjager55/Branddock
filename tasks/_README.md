# Tasks

Eén markdown-file per actieve taak. Vervangt de oude `TODO.md` + `IMPLEMENTATIEPLAN-*.md` aanpak.

## Conventies

- **Bestandsnaam**: kebab-case task-id (bv `campaign-drafts-db-backed.md`)
- **Frontmatter verplicht**: zie `_template.md`
- **Status flow**: `open` → `in-progress` → `done` (met tussenoptie `blocked`)
- **Afgeronde tasks**: verplaatsen naar `tasks/done/<id>.md` (gebeurt automatisch via `task-finalize` skill)
- **Geen werk zonder task-file**: uitzondering bugfixes <30 min

## Workflow per task

1. **Maak file** vanuit `_template.md` met geschikte `id`, `title`, `fase`, `priority`, `effort`
2. **Status `in-progress`** wanneer werk begint
3. **Vul "Bestanden die ik aanraak"** vooraf in (voorkomt scope-creep en parallel-werk conflicten)
4. **Werk uitvoeren** — frontmatter `status` reflecteert voortgang
5. **Trigger `task-finalize` skill** wanneer klaar — die regelt 2-subagent review loop, quality gates, status update, changelog entry, commit

## Parallel werk

Bij parallelle Claude Code sessies:
- Eén worktree per task (`git worktree add ../branddock-feat-<id> -b feat/<id>`)
- Lees andere actieve task-files vóór je begint — geen file-overlap toegestaan
- DB-isolatie: per worktree eigen lokale Postgres (bv `branddock_<id>`)
- Port-isolatie: 3000, 3001, 3002

## Prioriteringskader

- **Now**: deze 2-4 weken, max 5 items, prioriteit op pre-launch dependencies
- **Next**: 1-3 maanden, RICE-gerangschikt
- **Later**: 3-12 maanden, visie-niveau

Zie `roadmap.md` voor de volledige indeling.

## Voorbeelden

- `_template.md` — start hier voor nieuwe task
- `done/<id>.md` — voorbeelden van afgeronde tasks (na de eerste finalize)
