---
id: 2026-05-07-task-finalize-skill
title: task-finalize skill als verplichte review-flow voor non-trivial werk
status: accepted
date: 2026-05-07
supersedes: -
superseded-by: -
---

# Context

Code-kwaliteit moet hoog blijven met minimal manual review. Zonder formele review-flow:
- Subtiele regressies sluipen door
- AI-gegenereerde code mist soms edge cases die één paar ogen niet ziet
- Inconsistentie in commit-quality + changelog-update + status-tracking

In `docs/archive/old-lists/CLAUDE-original-2026-05-07.md` is het patroon **"2 onafhankelijke review-agents in loop tot clean"** ~60+ keer toegepast over BSR, BV-WIRE, F-VAL en andere werkstromen. Het was de de-facto standaard, maar nooit formeel vergrendeld.

Probleem: ad-hoc gebruik betekent dat het patroon onder context-druk vergeten kan worden. Daarnaast is "klaar" niet eenduidig — wanneer is een task echt done? (status update? changelog? commit?)

Anthropic Claude Code Skills (gelanceerd okt 2025) bieden een mechanisme voor herhaalde workflows: skills laden on-demand, ~100 tokens overhead in context tot ze worden gebruikt. Perfect voor een gestandaardiseerde review-procedure.

# Decision

Bouw `task-finalize` skill in `.claude/skills/task-finalize/SKILL.md` met **9-stappen flow**:

1. **Identify** active task (uit branch-naam, frontmatter, of vraag user)
2. **Two-subagent parallel review** (round 1) — fresh eyes, categoriseer CRITICAL/WARNING/MINOR
3. **Triage + fix** CRITICAL en WARNING (MINOR deferred)
4. **Re-review loop** met fresh subagents tot 0 CRITICAL en 0 WARNING (max 5 iteraties)
5. **Quality gates**: `tsc --noEmit` + `npm run lint` + smoke test
6. **Update task-file**: status → done, verplaats naar `tasks/done/`
7. **Update changelog**: regel toevoegen aan `docs/changelog.md` met auto-incremented number
8. **Commit** met conventional-commit message + Co-Authored-By footer
9. **Final report** met summary + open MINOR issues voor user-decisie

**Trigger**: user typt "Ik ben klaar. Voer task-finalize skill uit." (Stream Deck knop)

**Wanneer NIET**:
- Bugfixes <30 min (overkill)
- Pure documentation updates (skip review loop, alleen commit)
- Schema-only migraties (vereist manual data integrity check eerst)

# Y-statement

In de context van **task-afronding met behoud van hoge kwaliteit en minimal manual review**, facing **vergetelheid van 2-subagent review-patroon onder context-druk + onduidelijke "done"-definitie**, I decided **task-finalize skill als deterministische 9-stap procedure**, to achieve **kwaliteit-baseline + automatische status/changelog/commit zonder cognitieve overhead**, accepting tradeoff **~5-15 min per task voor review-loop + hard limit 5 iteraties**.

# Consequences

## Positief
- 2-subagent loop is nu baseline gedrag, niet vergeten worden
- Done-definitie is eenduidig: na skill-uitvoering is task gemerged + getrackt
- Stream Deck knop wordt korte trigger ("Ik ben klaar..."), skill regelt complexiteit
- Subagents werken parallel met fresh eyes — vangt blinde vlekken die één agent mist
- Loop tot clean dwingt resolutie af, niet alleen identificatie

## Negatief / tradeoffs
- ~5-15 min overhead per task voor review-loop + quality gates
- Subagent-kosten ~$0.05-0.20 per finalize (twee parallelle calls × meerdere iteraties)
- Hard limit 5 iteraties — als nog steeds issues moet user beslissen
- Pre-migratie staat (`tasks/` + `docs/changelog.md` ontbreken) — skill heeft fallback voor skip met melding
- Werkt niet voor scope-overschrijdend werk — skill stopt bij file-changes buiten task-file's "Bestanden die ik aanraak"

## Neutraal
- Stop conditions: pre-commit hook fail buiten code-issues, scope-creep, externe service down — escalate naar user
- Subagent type: `code-reviewer` indien beschikbaar, anders `general-purpose` met expliciete prompt

# Alternatives considered

- **Single-subagent review**: helft van de cost, maar mist de "twee onafhankelijke meningen" voordeel die in praktijk regressies vond
- **Pre-commit hook met linter only**: te shallow, mist semantic regressions
- **Manual review elke task**: schaalt niet, vermoeiend, leidt tot oppervlakkige reviews
- **External code review service** (Greptile, etc.): dependency op derde partij, latentie, geen brand-context

# Notes

Implementatie: `.claude/skills/task-finalize/SKILL.md` (gemaakt 2026-05-07).

Stream Deck knop "Finalize" gebruikt korte trigger:
```
Ik ben klaar. Voer task-finalize skill uit.
```

Skill werkt al **nu** — fallback voor pre-migratie staat (skip stappen 6-7 als `tasks/` of `docs/changelog.md` ontbreekt).

**Toekomstige uitbreidingen** (niet in v1):
- Screenshot-diff bij UI-changes (Playwright + reg-suit)
- Mutation testing (Stryker TS) als extra quality gate
- promptfoo evals bij AI-flow changes
- Performance budget check (Lighthouse delta)
