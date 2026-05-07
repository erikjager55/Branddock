---
id: 2026-05-07-feature-planner-architecture
title: Feature-planner als twee gescheiden subagents (PM + Tech-Lead)
status: accepted
date: 2026-05-07
supersedes: -
superseded-by: -
---

# Context

Solo-developer wil een sparring-partner voor het uitwerken van feature-ideeën vóór code geschreven wordt. Onderzoek (mei 2026) wees op vier risico's specifiek voor solo-werk:

1. **Echo-chamber**: zonder team-feedback valideert AI alle gebruikersinput → geen kritisch tegenwicht
2. **Premature technical design**: één agent die zowel PM- als Tech-Lead-rol vervult springt te snel naar "hoe gaan we dit bouwen?" voor "wat is het probleem?"
3. **Sycophancy**: AI defaults naar bevestiging in plaats van uitdaging
4. **Scope-creep**: zonder team om "nee" te zeggen wordt MVP-scope steeds breder

Bestaande Claude Code mechanismen:
- `--plan-mode` is voor implementatie-planning, niet voor feature-ideation
- Skills laden in main context (snel maar pollutie-risico bij lange discovery-sessies)
- Subagents hebben eigen context window + isolatie

GitHub Spec Kit's `/specify → /plan → /tasks` pipeline is industrie-mainstream maar vereist zware framework-installatie. Onze setup volgt het pattern zonder dependency.

# Decision

Bouw **twee gescheiden subagents** met expliciete forced commitment-moment ertussen:

1. **`feature-planner`** (PM-mode):
   - Tools: Read, Grep, Glob, Write
   - Geen toegang tot `src/` (codebase-onafhankelijke discovery)
   - 6-assen discovery (WHO/WHAT/WHY-NOW/SUCCESS/CONSTRAINTS/SCOPE-EXIT)
   - Anti-sycophancy stappen na elke ronde (3 redenen tegen, aannames lijst)
   - 5-punts stop-conditie (probleem-1-zin / 1 metric / Out-of-Scope > In-Scope / acceptance criteria / morgen-startbare taak)
   - Verplichte Red Team Review als eindblok
   - Output: `tasks/_drafts/idea-<id>.md`

2. **`technical-planner`** (Tech-Lead-mode):
   - Tools: Read, Grep, Glob, Write, Bash
   - Wel codebase-toegang
   - Phase -1 Gates uit Spec-Kit (Simplicity / Anti-Abstraction / Integration-First)
   - File-list, smoke-test plan, effort, risico's
   - ADR-noodzaak detectie (suggereert, geen auto-creatie)
   - Output: `tasks/<id>.md` volgens `tasks/_template.md`

3. **Staging area** `tasks/_drafts/` voor PM-output. Geen auto-promote naar `tasks/<id>.md` — user moet expliciet groen licht geven.

4. **Stream Deck triggers** voor beide subagents (twee aparte knoppen).

# Y-statement

In de context van **solo-developer met groeiende feature-backlog en risico op echo-chamber AI-validatie**, facing **vier specifieke planning-risico's (echo-chamber, premature design, sycophancy, scope-creep)**, I decided **twee gescheiden subagents (PM + Tech-Lead) met staging area en hardcoded anti-sycophancy + 5-punts stop-conditie**, to achieve **forced split tussen probleem-discovery en technical design + concrete bescherming tegen solo-werk valkuilen**, accepting tradeoff **dubbele subagent-kosten per feature (~$0.05-0.20 totaal) + handover-friction tussen fases**.

# Consequences

## Positief
- Forced commitment moment tussen PM en Tech-Lead voorkomt de #1 valkuil (premature technical design)
- Aparte context-windows per fase voorkomen pollutie van main conversation
- Anti-sycophancy hardcoded in prompts — niet "wees kritisch" maar concreet "geef 3 redenen om NIET te bouwen"
- 5-punts stop-conditie is meetbare end-state — voorkomt over-planning
- `tasks/_drafts/` als staging area — historische ideeën blijven bewaard voor "we hebben dit overwogen"
- ADR-noodzaak gedetecteerd vóór uitvoering — geen retroactieve documentatie
- Volgt Spec-Kit pipeline-pattern zonder framework-dependency

## Negatief / tradeoffs
- Twee subagent-runs per feature ≈ ~$0.05-0.20 (Sonnet, ~5-15 min per fase)
- Handover-friction: user moet bewust technical-planner aanroepen (geen auto-flow)
- Geen persistent memory v1 — agent leert niet uit eerdere sessies (bewust uitgesteld tot na 5-10 sessies indien waardevol)
- 30-60 min per feature voor goede discovery — niet voor elke micro-feature geschikt
- Twee aparte Stream Deck knoppen i.p.v. één combi (gekozen voor clarity)

## Neutraal
- Persistent memory kan later toegevoegd worden zonder breaking change
- Kosten zijn lineair met feature-frequentie — beheersbaar
- Bestaande pipeline (`task-finalize` skill, hooks, code-reviewer subagent) ongewijzigd — feature-planner is additie

# Alternatives considered

- **Eén subagent met twee modi**: afgewezen omdat modus-switch fragiel is. Onderzoek (industrie best practices mei 2026) wees expliciet op deze mengfout als #1 valkuil. Splitsing harder enforced via twee aparte agents.

- **Skill in plaats van subagent**: skills laden in main context. Voor langdurige discovery (3 ronden × 5 vragen) zou main context vervuilen. Subagent-isolatie is nodig.

- **GitHub Spec Kit installeren**: zou dezelfde pipeline geven maar met framework-dependency en heavier setup. Onze pattern volgt het zonder lock-in.

- **Plain plan-mode + slash commands**: Claude Code's built-in plan mode is voor implementatie-planning, niet feature-ideation. Geen 6-assen, geen anti-sycophancy, geen 5-punts stop.

- **Persistent memory vanaf v1**: persistent memory across sessions zou agent leren laten van vorige features. Afgewezen voor v1 vanwege overhead — herevalueren na 5-10 echte sessies.

# Notes

Implementatie geleverd in `tasks/feature-planner-setup.md` (2026-05-07).

Bronnen voor decision:
- Onderzoek-rapport over Claude Code patterns (subagent vs skill, AskUserQuestion, plan-mode beperkingen)
- Onderzoek-rapport over industrie best practices (Spec Kit `/speckit.specify`, anti-sycophancy via Red Team, 5-punts stop, JTBD vs RICE vs Now-Next-Later)
- Pragmatic Engineer's RFC vs ADR vs PRD onderscheid (output-format keuzes per feature-grootte)
- Solo-dev research (Y Combinator RFS Spring 2026, indie-hacker frameworks)

Toekomstige uitbreidingen (niet in v1):
- Persistent memory voor cross-feature learning
- Auto-detection wanneer feature klein genoeg is om planner over te slaan
- Pre-flight check: bestaande task in `roadmap.md` Now/Next dat overlapt
- Visual story-mapping output (Mermaid diagrams) voor multi-stakeholder review wanneer team groeit
