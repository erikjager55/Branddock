---
id: 2026-05-07-tasks-as-files
title: One-file-per-task in tasks/<id>.md (vervangt TODO.md)
status: accepted
date: 2026-05-07
supersedes: -
superseded-by: -
---

# Context

Het oude `TODO.md` was 790 regels, georganiseerd in 9 fases met checkbox-items. Symptomen:
- Parallelle Claude Code sessies leidden tot merge-conflicten op TODO.md (zie commit `5064015`)
- Status per item moeilijk te queryen — alleen `[x]` of `[ ]`
- Geen file-ownership specificatie → scope-creep ontstond
- Geen frontmatter → grep op fase/priority onmogelijk
- IMPLEMENTATIEPLAN-*.md bestanden hadden eigen format dat niet aansloot

Industrie-mainstream 2026 (zie `docs/archive/old-lists/PLAN-VAN-AANPAK.md` sectie 2):
- Single TODO.md is uit
- Now-Next-Later prioritisering met one-file-per-task is dominant
- Task Master pattern (eyaltoledano) is meest geadopteerde Claude/Cursor integratie
- Plain markdown in `tasks/` met conventie volstaat voor solo-dev

# Decision

Adopteer **one-file-per-task pattern**:

- **Locatie**: `tasks/<id>.md` (kebab-case id)
- **Frontmatter verplicht**: `id`, `title`, `fase` (pre-launch/launch/post-launch), `priority` (now/next/later), `effort`, `owner`, `status` (open/in-progress/blocked/done), `created`, `completed`, `related-adr`, `related-spec`, `worktree`
- **Standaard secties**: Probleem, Voorstel, Acceptatiecriteria, Bestanden die ik aanraak, Bestanden die ik NIET aanraak, Smoke test plan, Risico's, Out of scope, Notes
- **Status-flow**: `open` → `in-progress` → `done` (met tussenoptie `blocked`)
- **Afgeronde tasks**: verplaatsen naar `tasks/done/<id>.md` automatisch via `task-finalize` skill
- **Geen werk zonder task-file** — uitzondering bugfixes <30 min
- **Roadmap.md** consolideert overzicht: Now (max 5) / Next (RICE-ranked) / Later (visie)
- Template: `tasks/_template.md`

# Y-statement

In de context van **solo-dev met parallelle Claude Code sessies en groeiende backlog**, facing **race conditions op TODO.md + onleesbare prioritering + scope-creep**, I decided **one-file-per-task in `tasks/` met gestandaardiseerd frontmatter**, to achieve **isolatie + standaardisatie + queryability**, accepting tradeoff **initiële migratie + discipline om template te volgen**.

# Consequences

## Positief
- Parallelle agents kunnen ieder hun eigen task-file bewerken zonder merge conflict
- Status per taak in frontmatter is queryable (grep `^status: in-progress` over `tasks/`)
- "Bestanden die ik aanraak" sectie voorkomt scope-creep en parallel-werk overlap
- `task-finalize` skill heeft duidelijk anchor om naar `tasks/done/` te verplaatsen
- Roadmap.md hoeft niet alle details te dragen — referentie via task-id

## Negatief / tradeoffs
- Drempel om nieuwe taak te starten ietsje hoger (template moeten invullen)
- Voor heel kleine taken voelt template als overkill — vandaar uitzondering bugfixes <30 min
- 3 bestaande IMPLEMENTATIEPLAN-* (Campaign Drafts, Claw Page Awareness, Power User Shortcuts) staan nog in `docs/archive/plans-pending-task-migration/` — distillatie naar tasks/ format is week 2 task

## Neutraal
- Old TODO.md bewaard in `docs/archive/old-lists/TODO.md` voor referentie
- Update-cadans: Now continu, Next wekelijks (vrijdagretro), Later maandelijks

# Alternatives considered

- **Task Master MCP-server (eyaltoledano)**: meest geadopteerde Claude integratie, JSON-schema, complexity-rating. Afgewezen voor solo-dev: te zwaar, plain markdown in `tasks/` met conventie volstaat
- **Linear/Notion/Jira**: externe SaaS, vereist API-bridge naar Claude — overkill voor solo-werk
- **GitHub Issues**: prima voor publieke feedback, maar geen native task-template enforcement

# Notes

Eerste task-file (dogfood): `tasks/docs-migration-week-1.md` — de migratie-taak zelf gevolgd het patroon dat het introduceerde.

Migratie-pad voor bestaande backlog:
1. `roadmap.md` als overzicht
2. Open IMPLEMENTATIEPLAN-* in `docs/archive/plans-pending-task-migration/` distillaten naar `tasks/<id>.md` in week 2
3. Items uit oude TODO.md/STRATEGISCHE-VERVOLGSTAPPEN.md verspreid in roadmap.md, daadwerkelijke uitvoering vereist eerst task-file
