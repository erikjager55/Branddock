---
name: pre-commit
description: Use when user typt "commit huidig werk", "stage en commit", of "pre-commit check". Runt type-check + lint + relevante tests + valideert commit-message + voert commit uit. Lichtere variant van task-finalize — geen 2-subagent review loop, geen status update, geen changelog entry. Voor tussentijdse commits binnen een taak. Use task-finalize skill voor end-of-task afronding.
---

# Pre-commit

Lichtgewicht commit-skill voor tussentijdse commits (~elke 30 min logische eenheid). Geen review-loop, geen status updates — alleen kwaliteit-gates en een nette conventional-commit.

## Wanneer wel
- Tussentijds werk binnen een task (~30-60 min werk afgerond)
- Halverwege een feature een logisch checkpoint
- Voor een refactor-stap die je apart wilt isoleren

## Wanneer NIET (gebruik dan `task-finalize`)
- Einde van een complete task — `task-finalize` regelt alles incl. status + changelog + 2-subagent review
- Code-changes > 200 regels — verdient subagent review
- AI-flow / prompt-engineering wijzigingen — extra risico op subtiele regressie

## Stappen

### 1. Diagnose
- `git status` om uncommitted changes te zien
- Als geen wijzigingen: stop met "geen wijzigingen om te committen"
- Als changes uitgebreider zijn dan ~30 min werk: vraag of `task-finalize` skill juister is

### 2. Quality gates
Run in volgorde, halt op failure:
- `npx tsc --noEmit` — must be 0 errors
- `npm run lint` (of `npx eslint .`) — must be 0 errors
- (optioneel) `npm test` — als unit tests bestaan voor gewijzigde files

Bij failure: stop, rapporteer, vraag user wat te doen.

### 3. Stage
- `git add` voor relevante files (niet `git add -A`)
- Vermijd toevoegen van: `.env*`, `*.log`, `node_modules/`, lokale config-files, secrets
- Bij twijfel: vraag user welke files in deze commit horen

### 4. Compose commit message
Conventional-commit format:
```
<type>(<scope>): <korte beschrijving>

<optionele bullet list van key changes>

Task: <task-id indien van toepassing>

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

Types:
- `feat:` nieuwe feature
- `fix:` bugfix
- `refactor:` structurele change zonder gedrag-wijziging
- `docs:` documentatie
- `test:` test additions
- `chore:` tooling, deps, config
- `perf:` performance improvement
- `style:` code style (formatting, geen logic-change)

Subject (eerste regel):
- Max 70 chars
- Imperatieve vorm ("add X" niet "added X")
- Geen punt aan einde

### 5. Commit
- `git commit` met HEREDOC voor multi-line message
- **NOOIT `--no-verify`** — pre-commit hooks moeten passeren
- Als pre-commit hook fail: investigeer root cause, fix, NEW commit (niet amend)

### 6. Verify
- `git log -1 --pretty=format:"%h %s"` toont laatste commit
- `git status` moet schoon zijn

### 7. Final report
```
✅ Commit: <short hash> — <subject line>

Quality gates:
- TypeScript: 0 errors ✓
- Lint: 0 errors ✓

Files: <count>
```

## Stop conditions

- Quality gate fail die niet door 1 fix opgelost wordt → stop, vraag user
- `git status` toont staged files buiten scope van werk → stop, vraag user welke files in commit
- Commit message ambiguïteit (welk type is dit?) → vraag user
- Pre-commit hook fail om niet-code redenen (missing deps, env issues) → stop, vraag user

## Notes

Voor commits aan einde van een task: gebruik `task-finalize` skill. Die roept dit skill effectively impliciet aan in stap 8 + voegt review-loop + status update + changelog entry toe.
