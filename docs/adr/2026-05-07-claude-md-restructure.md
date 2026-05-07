---
id: 2026-05-07-claude-md-restructure
title: CLAUDE.md verkort + docs/changelog.md afsplitsing + docs/-structuur
status: accepted
date: 2026-05-07
supersedes: -
superseded-by: -
---

# Context

CLAUDE.md was gegroeid naar 2323 regels (~200K+ tokens) met 6 verschillende soorten content gemengd:
- Runtime instructies (architectuur, conventies, workflow)
- Changelog (217+ ACTIELIJST entries)
- Roadmap (R0, S1-S12 fases)
- Open beslissingen
- Genomen beslissingen
- Detail-secties per module

Symptomen:
- Claude vroeg soms naar dingen die in CLAUDE.md stonden — auto-compaction droppt grote files eerst
- Boven ~300 regels worden instructies onbetrouwbaar gevolgd door LLMs
- Onderhoud onleesbaar — wat is runtime-relevant vs historisch?
- Repo-root telde 34 markdown-bestanden, deels overlappend (TODO, BRANDCLAW-ROADMAP, STRATEGISCHE-VERVOLGSTAPPEN)

Industrie-standaarden mei 2026 (zie `docs/archive/old-lists/PLAN-VAN-AANPAK.md` sectie 2):
- AGENTS.md/CLAUDE.md target <200-300 regels
- Hierarchical structuur (root + per-directory)
- Single source-of-truth per content-type
- Changelog afzonderlijk van runtime context

# Decision

**3-weken migratie** van flat 34-file repo-root naar hierarchische `docs/` structuur:

**Week 1 (deze ADR)**: documentatie-fundament
- `CLAUDE.md` herschreven naar 270 regels (alleen runtime-instructies)
- `START_HERE.md` nieuw — entry point per sessie
- `docs/changelog.md` — pointer naar gearchiveerde origineel + format voor nieuwe entries
- `docs/adr/`, `docs/playbooks/`, `docs/specs/`, `docs/archive/` directory-structuur
- `tasks/` directory met `_template.md`
- 27 bestanden verplaatst naar 8 categorieën in `docs/`
- Originele CLAUDE.md bewaard in `docs/archive/old-lists/CLAUDE-original-2026-05-07.md` voor grep-baarheid

**Week 2 (volgt)**: backlog herstructurering
- 3 open IMPLEMENTATIEPLAN-* distilleren naar `tasks/` files

**Week 3 (volgt)**: hooks + skills + eerste autonome routine

**Naam-keuze**: `CLAUDE.md` blijft (geen rename naar `AGENTS.md`) omdat user blijft bij Claude Code als enige AI tool.

# Y-statement

In de context van **groeiend project met onhandelbare CLAUDE.md (2323 regels)**, facing **onbetrouwbare instructie-volging boven ~300 regels + onleesbare onderhoudssituatie**, I decided **CLAUDE.md → 270 regels runtime-only + history naar `docs/changelog.md` + hierarchische `docs/` structuur**, to achieve **betrouwbare instructies + behoud zoekbaarheid history**, accepting tradeoff **migratie-werk van ~1 week + tijdelijke parallelle sessies (oude+nieuwe paden) tot week 1 done**.

# Consequences

## Positief
- CLAUDE.md leesbaar in 5 min, runtime-instructies betrouwbaar gevolgd
- Repo root van 34 → 5 .md bestanden (CLAUDE.md, README.md, PATTERNS.md, gotchas.md, START_HERE.md)
- History niet verloren — `docs/archive/old-lists/CLAUDE-original-2026-05-07.md` is grep-baar
- ADRs vergrendelen "waarom" van fundamentele keuzes
- `docs/playbooks/working-flow.md` is single source voor spelregels
- `roadmap.md` consolideert eerder verspreide TODO/strategie

## Negatief / tradeoffs
- Migratie kostte ~1 week — anders niet aan feature-werk
- Drempel om CLAUDE.md te updaten ietsje hoger (moeten kiezen tussen CLAUDE.md / changelog / ADR / playbook)
- Per-directory CLAUDE.md (bv `prisma/CLAUDE.md`) niet (nog) toegepast — komt op verzoek

## Neutraal
- 217 historische entries niet manueel gemigreerd naar nieuwe format — pragmatische keuze, originele zit in archief
- 7 retroactieve ADRs geschreven voor fundamentele keuzes (Better Auth, Prisma 7, Hybrid SPA, F-VAL, BV extractie, task-finalize skill, deze migratie)

# Alternatives considered

- **Niet doen**: laat CLAUDE.md groeien — afgewezen, instructie-betrouwbaarheid achteruit
- **CLAUDE.md → AGENTS.md rename**: cross-tool standaard, maar user blijft bij Claude Code → niet relevant
- **Per-directory CLAUDE.md/AGENTS.md vanaf dag 1**: te invasief, beter incrementeel waar nuttig
- **Volledige changelog migratie naar nieuwe format**: 1+ dag werk zonder substantiële winst — zoeken in archief volstaat

# Notes

Bestanden die NIET verplaatst zijn (blijven op root):
- `README.md` — Next.js public-facing
- `gotchas.md` — Claude Code leest deze automatisch elke sessie
- `PATTERNS.md` — UI conventions, blijft autoritatief

Volledige bestand-mapping in `docs/archive/old-lists/PLAN-VAN-AANPAK.md` sectie 9.
Migratie-task in `tasks/docs-migration-week-1.md`.
