---
id: feature-planner-setup
title: Feature-planner sparring-partner — twee subagents + pipeline
fase: pre-launch
priority: now
effort: 2 uur
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-07
related-adr: docs/adr/2026-05-07-feature-planner-architecture.md (te schrijven)
related-spec: -
worktree: -
---

# Probleem

Bij nieuwe feature-ideeën ontbreekt een gestructureerd discovery-proces. Solo-dev valkuilen geïdentificeerd via onderzoek (mei 2026):
- Echo-chamber risico zonder team-feedback
- Premature technical design (springen naar "hoe gaan we het bouwen?" voor "wat is het probleem?")
- Sycophancy — AI valideert alles wat user zegt
- Scope-creep tijdens planning
- Over-documentation voor kleine features

Bestaande Claude Code plan-mode is voor implementatie-planning, niet feature ideation.

# Voorstel

Twee subagents met split PM-AI / Tech-Lead-AI rollen + staging area + 5-punts stop-conditie. Forced commitment moment tussen fases voorkomt premature technical design.

# Acceptatiecriteria

- [x] `.claude/agents/feature-planner.md` — PM-mode subagent met 6-assen discovery
- [x] `.claude/agents/technical-planner.md` — Tech-Lead-mode subagent met Phase -1 Gates
- [x] `tasks/_drafts/_README.md` — staging-area uitleg
- [x] `tasks/_drafts/_idea-template.md` — template voor PM-output
- [x] `docs/playbooks/feature-discovery.md` — gids voor user
- [x] Stream Deck prompts gedefinieerd (2 knoppen) + opgenomen in CLAUDE.md
- [x] `START_HERE.md` pointer naar nieuwe workflow
- [x] ADR `2026-05-07-feature-planner-architecture.md` voor twee-subagents keuze
- [x] Setup-deliverables klaar — smoke-test (echte feature-idee aanroepen) is handover-stap voor user, niet blokkerend voor task-completion

# Bestanden die ik aanraak

- `.claude/agents/feature-planner.md` (nieuw)
- `.claude/agents/technical-planner.md` (nieuw)
- `tasks/_drafts/_README.md` (nieuw)
- `tasks/_drafts/_idea-template.md` (nieuw)
- `docs/playbooks/feature-discovery.md` (nieuw)
- `docs/adr/2026-05-07-feature-planner-architecture.md` (nieuw)
- `CLAUDE.md` — Stream Deck triggers tabel updaten met 2 nieuwe knoppen
- `START_HERE.md` — pointer naar feature-discovery workflow

# Bestanden die ik NIET aanraak

- Bestaande skills, agents, hooks, routines — geen wijzigingen
- Code-bestanden — pure agent-tooling
- Andere task-files

# Smoke test plan

1. `ls .claude/agents/` toont 5 agents (3 bestaand + 2 nieuw)
2. `ls tasks/_drafts/` toont _README + _idea-template
3. Roep feature-planner subagent aan met test-prompt: "Ik wil een feature waarbij gebruikers content kunnen plannen op een kalender"
4. Subagent voert 6-assen discovery uit met doorvraag-rondes
5. Subagent eindigt met 5-punts stop-conditie checklist
6. Output verschijnt in `tasks/_drafts/idea-<id>.md`
7. Roep technical-planner aan met die idea-file als input
8. Tech-planner produceert `tasks/<id>.md` volgens template

# Risico's

- **Subagent te chatty**: vraagt 20 vragen zonder te concluderen. Mitigatie: hard limit op 8 vragen per ronde, expliciete stop-conditie
- **Tech-planner negeert idea-context**: produceert generieke tasks. Mitigatie: prompt verplicht expliciete verwijzingen naar idea-file
- **Twee subagents = dubbele kosten**: ~2 calls per feature. Mitigatie: Sonnet ipv Opus voor planner-werk, eerste sessie token-budget monitoren

# Out of scope

- Persistent memory voor planner subagent (toevoegen na 5-10 sessies indien waardevol)
- Auto-promote idea → task zonder user-actie (forced commitment is feature)
- ADR auto-creatie (tech-planner suggereert, user keurt goed via adr-create skill)
- GitHub Spec Kit installatie (we volgen pattern zonder dependency)

# Notes

Onderzoek-bronnen: 2 parallelle research-runs (Claude Code-specifiek + industrie best practices).

Belangrijkste industrie-bevinding: PM-AI en Tech-Lead-AI **moeten** gescheiden zijn. Eén-agent met twee modi is fragiel.

5-punts stop-conditie als verplichte checklist (uit LogRocket + MVP-literatuur synthese):
1. Probleem in 1 zin formuleerbaar
2. Eén primaire success-metric
3. Out-of-Scope > In-Scope
4. MVP-acceptance-criteria concreet
5. Eerste taak morgen startbaar
