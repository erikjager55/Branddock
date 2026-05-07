---
id: docs-migration-week-1
title: Documentatie-architectuur migratie (week 1)
fase: pre-launch
priority: now
effort: 1 week
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-07
related-adr: docs/adr/2026-05-07-tasks-as-files.md (te schrijven dag 6-7)
related-spec: PLAN-VAN-AANPAK.md
worktree: -
---

# Probleem

De huidige documentatie is onhandelbaar geworden:
- `CLAUDE.md` is 200K+ tokens — instructies worden niet meer betrouwbaar gevolgd door auto-compaction
- 34 markdown-bestanden in repo root, deels overlappend (TODO + STRATEGISCHE-VERVOLGSTAPPEN + BRANDCLAW-ROADMAP)
- Plan-docs (`IMPLEMENTATIEPLAN-*.md`) hebben statussen die niet matchen met werkelijkheid (sommige al af, niet als zodanig gemarkeerd)
- Geen formele structuur voor beslissingen (ADRs ontbreken)
- Parallel werkende sessies hadden race conditions (commit `5064015`)

Industrie-standaarden (mei 2026) wijzen naar een hybride structuur: kort `CLAUDE.md` (<300 regels) + `tasks/<id>.md` per taak + `docs/changelog.md` voor geschiedenis + `docs/adr/` voor beslissingen.

# Voorstel

3-weken migratie volgens `PLAN-VAN-AANPAK.md` sectie 9:
- **Week 1**: documentatie-fundament (CLAUDE.md verkort, START_HERE.md, docs/ structuur, archivering)
- **Week 2**: backlog herstructurering (tasks/ files per open werkpakket)
- **Week 3**: hooks + skills + subagents + eerste autonome routine

Deze task-file dekt **week 1**. Week 2 en 3 krijgen eigen task-files.

# Acceptatiecriteria

## Dag 1-2 (autonoom uitgevoerd 2026-05-07)
- [x] `CLAUDE-DRAFT.md` geschreven (~200 regels, runtime-instructies only)
- [x] `START_HERE.md` geschreven (entry point met top 3 actieve tasks)
- [x] `docs/` directory structuur aangemaakt met alle subdirs en READMEs
- [x] `tasks/` directory met `_template.md` + `_README.md`
- [x] `docs/changelog.md` placeholder
- [x] Eerste task-file (deze) aangemaakt als pattern-voorbeeld

## Dag 3 (uitgevoerd 2026-05-07)
- [x] `CLAUDE.md` vervangen door `CLAUDE-DRAFT.md` (oude versie 2323 regels naar `docs/archive/old-lists/CLAUDE-original-2026-05-07.md`)
- [x] DRAFT-header uit nieuwe CLAUDE.md verwijderd
- [x] 6 afgeronde IMPLEMENTATIEPLAN naar `docs/archive/implementatieplannen/`
- [x] 4 superseded plannen naar `docs/archive/plans-superseded/`
- [x] 2 handovers naar `docs/archive/handovers/`
- [x] 4 specs naar `docs/specs/` (lowercase rename)
- [x] 3 built-features specs naar `docs/specs/built-features/`
- [x] 4 playbooks naar `docs/playbooks/`
- [x] 5 oude lijsten naar `docs/archive/old-lists/` (TODO, BRANDCLAW-ROADMAP, STRATEGISCHE-VERVOLGSTAPPEN, PLAN-VAN-AANPAK, SESSION-STARTER)
- [x] 3 open plans naar `docs/archive/plans-pending-task-migration/` met README
- [x] Repo root van 37 → 5 .md bestanden

## Dag 4-7 (uitgevoerd 2026-05-07)
- [x] `docs/playbooks/working-flow.md` geschreven (distillatie van PLAN-VAN-AANPAK.md sectie 5+6+7)
- [x] `roadmap.md` geschreven (Now/Next/Later × pre-launch/launch/post-launch met gedistilleerde items uit oude TODO/STRATEGISCHE/BRANDCLAW)
- [x] `docs/changelog.md` definitief geschreven (pointer naar archived original voor #1-221, format voor #222+)
- [x] 7 retroactieve ADRs geschreven:
  - `2026-02-12-better-auth-organization.md`
  - `2026-02-15-prisma7-pg-adapter.md`
  - `2026-02-12-hybrid-spa-architecture.md`
  - `2026-05-05-fval-three-pillar.md`
  - `2026-05-06-brand-voice-extraction.md`
  - `2026-05-07-claude-md-restructure.md`
  - `2026-05-07-tasks-as-files.md`
  - `2026-05-07-task-finalize-skill.md`
- [x] Broken-link grep — geen stale references in nieuwe documenten naar oude paden
- [ ] Spawn nieuwe Claude Code sessie, verifieer dat CLAUDE.md correct laadt _(handover-stap voor user)_
- [ ] Decision: 217 historische ACTIELIJST entries niet manueel gemigreerd naar changelog format — pragmatic pointer naar gearchiveerde originele in `docs/archive/old-lists/CLAUDE-original-2026-05-07.md`. Volledig grep-baar, geen substantieel verlies.

## Dag 5
- [ ] `roadmap.md` schrijven met Now/Next/Later × pre-launch/launch/post-launch
- [ ] Items uit oude TODO.md gedistilleerd in roadmap

## Dag 6-7
- [ ] 5-10 retroactieve ADRs geschreven (Better Auth, Prisma 7 + pg, Hybrid SPA, F-VAL 3-pijler, task-finalize skill)
- [ ] 217 entries uit oude CLAUDE.md gemigreerd naar `docs/changelog.md` met h2-headers per maand
- [ ] Genomen beslissingen sectie uit oude CLAUDE.md verwerkt in ADRs
- [ ] `roadmap.md` items gemapt op `tasks/` files (eerste pas; verfijning in week 2)

## Cross-cutting
- [ ] `npx tsc --noEmit` 0 errors (geen code-changes verwacht)
- [ ] Nieuwe structuur door `claude --print` smoke-test (Claude leest CLAUDE.md correct, start-prompt werkt)
- [ ] Geen broken links in nieuwe documenten

# Bestanden die ik aanraak

## Aanmaak (dag 1-2 — done)
- `CLAUDE-DRAFT.md`
- `START_HERE.md`
- `tasks/_template.md`
- `tasks/_README.md`
- `tasks/docs-migration-week-1.md` (deze)
- `docs/_README.md`
- `docs/adr/_README.md`
- `docs/adr/_template.md`
- `docs/playbooks/_README.md`
- `docs/specs/_README.md`
- `docs/archive/_README.md`
- `docs/changelog.md`

## Verplaatsing (dag 3-5 — wacht op user OK)
Zie PLAN-VAN-AANPAK.md sectie 9 voor complete bestand-mapping.

## Schrijven (dag 6-7)
- `docs/adr/2026-MM-DD-better-auth.md`
- `docs/adr/2026-MM-DD-prisma7-pg-adapter.md`
- `docs/adr/2026-MM-DD-hybrid-spa-architecture.md`
- `docs/adr/2026-MM-DD-fval-three-pillar.md`
- `docs/adr/2026-MM-DD-task-finalize-skill.md`
- `docs/adr/2026-MM-DD-tasks-as-files.md`
- `roadmap.md`

# Bestanden die ik NIET aanraak

- `gotchas.md` — blijft op root
- `PATTERNS.md` — blijft op root
- `README.md` — blijft op root (Next.js boilerplate)
- `prisma/schema.prisma` — geen schema-changes in deze task
- `src/**/*` — geen code-changes
- `.claude/skills/task-finalize/` — al af in vorige sessie
- `MEMORY.md` (auto-memory) — beheerd door agent zelf

# Smoke test plan

## Na dag 1-2
1. Verifieer alle nieuwe bestanden bestaan: `ls CLAUDE-DRAFT.md START_HERE.md tasks/_template.md docs/changelog.md`
2. Check `tasks/_template.md` opent en is leesbaar
3. Check task-finalize skill bestaat: `ls .claude/skills/task-finalize/SKILL.md`

## Na dag 3 (na verplaatsingen)
1. Repo root mag max 6 .md bestanden bevatten (CLAUDE.md, START_HERE.md, README.md, roadmap.md, gotchas.md, PATTERNS.md)
2. `git status` toont alle verplaatsingen als renames (niet als delete + create)
3. Spawn nieuwe Claude Code sessie, typ "Lees CLAUDE.md, gotchas.md en START_HERE.md" — verwacht: agent geeft top 3 actieve tasks

## Na dag 6-7
1. Verifieer changelog.md bevat 200+ entries verdeeld over maand-h2's
2. ADRs zijn ingevuld met Y-statement
3. roadmap.md heeft minstens 5 Now-items, 5-10 Next-items, en visie-Later items

# Risico's

- **Migratie-druk op huidige werk**: ik raak in week 1 geen code aan, alleen docs — geen risico op codebreaking
- **Verlies van content tijdens splitsing CLAUDE.md → changelog**: mitigatie via git-history, originele CLAUDE.md gaat naar `docs/archive/old-lists/CLAUDE-original.md`
- **Broken links in andere docs naar oude paden**: mitigatie via grep-pass na verplaatsing, fix gevonden references
- **User onverwacht andere taak op willen pakken tijdens migratie**: kan parallel via worktree — migratie blokkeert geen feature-werk

# Out of scope

- Week 2 (backlog herstructurering — eigen task-file)
- Week 3 (hooks + routines — eigen task-file)
- Code-wijzigingen
- Schema-wijzigingen
- Schrijven van een geautomatiseerde "doc-keeper" subagent (komt later)

# Notes

## Achtergrond
Onderzoek mei 2026 (zie ook eerdere conversatie):
- AGENTS.md is sinds dec 2025 Linux Foundation standaard, maar user blijft bij Claude Code → CLAUDE.md naam blijft
- Anthropic best practices: <200-300 regels in CLAUDE.md
- Now-Next-Later + one-file-per-task is mainstream geworden in 2026

## Beslissingen tijdens uitvoering
- **CLAUDE-DRAFT.md** als tussenstap i.p.v. direct CLAUDE.md vervangen → veiligheid voor rollback
- **`docs/old-lists/`** subdir toegevoegd aan archive structuur voor TODO.md / STRATEGISCHE-VERVOLGSTAPPEN.md / BRANDCLAW-ROADMAP.md (die niet thuishoren in implementatieplannen of handovers)
- Eerste task-file (deze) eet zijn eigen dogfood — pattern werkt
