---
id: hooks-routines-week-3
title: Hooks + skills + subagents + eerste autonome routine
fase: pre-launch
priority: now
effort: 1 week
owner: claude-code
status: done
created: 2026-05-07
completed: 2026-05-07
related-adr: -
related-spec: docs/playbooks/working-flow.md
worktree: -
---

# Probleem

Quality gates uit `docs/playbooks/working-flow.md` zijn beschreven maar niet geïmplementeerd. Zonder hooks moeten type-check + lint handmatig na elke edit gerund worden. Zonder skills (behalve `task-finalize`) moet elke repeterende workflow telkens uitgelegd worden. Geen autonome routine = gemiste leverage 's nachts/weekends.

# Voorstel

Drie infrastructuur-stukken bouwen:
1. **Hooks** in `.claude/settings.json` — automatic type-check + lint na Edit, Bash safety, Stop summary
2. **Skills** in `.claude/skills/` — `pre-commit`, `adr-create` (task-finalize bestaat al)
3. **Subagents** in `.claude/agents/` — `code-reviewer` (gebruikt door task-finalize), `regression-detector`, `doc-keeper`
4. **Eerste autonome routine** — nightly doc-sync (lager risico dan triage)

# Acceptatiecriteria

## Stap 1 — Hooks (uitgevoerd 2026-05-07)
- [x] `.claude/settings.json` configureerd met PostToolUse Edit hook
- [x] PostToolUse Edit hook (tsc + eslint via `post-edit-typecheck.sh`)
- [x] PreToolUse Bash hook met `check-dangerous-bash.sh` — getest: blokkeert `rm -rf /`
- [x] Stop hook met `session-summary.sh` — getest: schrijft naar `~/.claude/sessions/<date>.md`
- [x] Permissions: allow lijst (~35 entries)
- [x] Permissions: deny lijst voor destructieve operaties (~14 entries)
- [x] Hooks executable (`chmod +x`)
- [x] Smoke-test alle 3 hooks PASS

## Stap 2 — Skills (uitgevoerd 2026-05-07)
- [x] `.claude/skills/pre-commit/SKILL.md` — type-check + lint + commit-message validatie
- [x] `.claude/skills/adr-create/SKILL.md` — vraag context, schrijf ADR via template

## Stap 3 — Subagents (uitgevoerd 2026-05-07)
- [x] `.claude/agents/code-reviewer.md` — TypeScript/React/Next.js/Prisma focus, Branddock-specifieke checks
- [x] `.claude/agents/regression-detector.md` — git-history + ADR + gotchas cross-reference
- [x] `.claude/agents/doc-keeper.md` — drift-detectie tussen code en docs

## Stap 4 — Eerste routine (uitgevoerd 2026-05-07)
- [x] `.claude/routines/nightly-doc-sync.yml` — runt doc-keeper subagent, schrijft `tasks/triage-<date>.md`
- [x] Cost-budget: max 50K tokens per run, daily cap 1
- [x] Schedule: 02:00 NL tijd, daily
- [ ] Handmatige eerste run + output review _(handover-stap voor user)_
- [ ] Cost-monitoring opzetten _(handover-stap voor user)_

## Cross-cutting
- [ ] Worktree-conventie testen: maak een worktree voor een vervolg-task — verschoven naar volgende task wanneer worktree-werk relevant is
- [x] `npx tsc --noEmit` 0 errors voor configfiles (geen TS-changes)
- [x] Smoke-test alle 4 stappen geslaagd

# Bestanden die ik aanraak

- `.claude/settings.json` (nieuw of update)
- `.claude/hooks/check-dangerous-bash.sh` (nieuw)
- `.claude/hooks/session-summary.sh` (nieuw)
- `.claude/skills/pre-commit/SKILL.md` (nieuw)
- `.claude/skills/adr-create/SKILL.md` (nieuw)
- `.claude/agents/code-reviewer.md` (nieuw)
- `.claude/agents/regression-detector.md` (nieuw)
- `.claude/agents/doc-keeper.md` (nieuw)
- `.claude/routines/nightly-doc-sync.yml` (nieuw)

# Bestanden die ik NIET aanraak

- `.claude/skills/task-finalize/` — al af
- `tasks/` files — alleen lezen
- Code-bestanden — pure agent-tooling

# Smoke test plan

## Hooks
1. Edit een TS-bestand → type-check runt automatisch in background
2. Push opzettelijke type-error → hook geeft melding zichtbaar
3. Probeer `rm -rf src/` via Bash → PreToolUse blocked
4. End sessie → check `~/.claude/sessions/<date>.md` bestaat

## Skills
1. Run `pre-commit` skill op werkend uncommitted werk → groene gates
2. Run `adr-create` skill → genereert nieuwe ADR met juiste template

## Subagents
1. Trigger code-reviewer subagent op een diff → leverage CRITICAL/WARNING/MINOR rapport
2. Trigger doc-keeper op repo → identificeert drift (bv ADR ontbreekt voor recent feature)

## Routine
1. Handmatige first-run van nightly-doc-sync
2. Verify output in `tasks/triage-<date>.md`
3. Verify cost binnen 50K-token budget
4. Wait 24u, verify auto-trigger om 02:00

# Risico's

- **Hook-failure breekt elke Edit**: type-check fail blokkeert verdere actie. Mitigatie: `blocking: false` voor non-critical hooks
- **Subagent kosten**: extra context per run = extra tokens. Mitigatie: subagent-prompts compact, alleen essentiële context
- **Routine cost overrun**: doc-sync zonder budget cap kan duur worden. Mitigatie: hard `max_tokens` cap, monitoring
- **Permission deny te restrictief**: blokkeert legitieme acties. Mitigatie: start met allow-lijst, voeg deny incrementeel toe

# Out of scope

- Per-feature hooks (bv specifiek voor Prisma changes)
- 2e+ routine — eerst de eerste werkend krijgen
- Cursor/Copilot integratie — Claude Code only
- Stream Deck UI voor routine-management — handmatig in YAML

# Notes

Voorbeeld `.claude/settings.json` skeleton in `docs/playbooks/working-flow.md` sectie "Hooks die je nu instelt".

Routine YAML pattern:
```yaml
name: Nightly Doc-Sync
schedule: "0 2 * * *"
prompt: |
  Lees alle .ts/.tsx files gewijzigd in de laatste 7 dagen.
  Check tegen docs/adr/ — ontbreekt een ADR voor architecturale wijzigingen?
  Check tegen tasks/done/ — match de implementatie de acceptatiecriteria?
  Schrijf bevindingen naar tasks/triage-<date>.md.
  NIET fixen — alleen rapporteren.
budget:
  max_tokens: 50000
  max_runtime_minutes: 30
```
