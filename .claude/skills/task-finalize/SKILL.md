---
name: task-finalize
description: Use when user signals "ik ben klaar", "task done", "voer task-finalize uit", or "finalize this work". Runs a two-subagent parallel review loop until clean, runs quality gates, updates task status, appends changelog entry, and commits with conventional-commit message. Use after completing any non-trivial task (UI changes, data mutations, AI flows, schema changes). Skip for bugfixes <30 min or pure documentation updates.
---

# Task Finalize

End-to-end finalization of an active task: review → fix → verify → status-update → changelog → commit.

## Goal

Take the active task from "in-progress" to "merged" with hands-off quality assurance. The user should be able to walk away and trust that the work is properly reviewed, tested, persisted, and committed.

---

## Step 1 — Identify the active task

- Look for the task currently being worked on:
  - First: check git branch name (e.g. `feat/campaign-drafts-db-backed` → task-id `campaign-drafts-db-backed`)
  - Then: check `tasks/` directory for `.md` files with frontmatter `status: in-progress`
  - Fallback: ask user "Welke task ben je aan het afronden? Geef task-id of beschrijving."
- If `tasks/<id>.md` does not exist (pre-migration state), continue without it — the skill still runs review + quality gates + commit, just skips status/changelog updates.

## Step 2 — Two-subagent parallel review (round 1)

Run **two independent code-reviewer subagents in parallel** in the same message (multiple Agent tool calls).

Each subagent gets fresh context (no shared instruction). Use this prompt template per subagent:

> "Review the current diff (`git diff main...HEAD` or `git diff` for uncommitted changes) for the task identified as: [task-id or description].
>
> Categorize all findings as:
> - **CRITICAL**: bugs, security issues, broken contracts, data integrity risks, breaking API changes
> - **WARNING**: regressions, missed edge cases, type-safety holes, performance regressions, accessibility violations, missing error handling
> - **MINOR**: style, naming, doc nits, refactoring opportunities
>
> Report findings with `file:line` references and a 1-sentence explanation per finding.
> DO NOT fix anything — only report.
>
> If the diff is clean, return 'No issues found' explicitly."

## Step 3 — Triage and fix

- Aggregate both reports.
- Deduplicate findings (same `file:line` + same problem = one issue).
- Fix all CRITICAL and WARNING issues.
- For MINOR: list them at the end of the run, do NOT auto-fix.

## Step 4 — Re-review loop

After fixing CRITICAL/WARNING:
- Run two **fresh** subagents again (steps 2–3).
- Continue until both subagents return 0 CRITICAL and 0 WARNING.
- **Hard limit: 5 iterations.** If still issues at iteration 5: halt, report to user, ask for guidance.

## Step 5 — Quality gates

Run in sequence; halt on failure and report to user:

1. `npx tsc --noEmit` — must be 0 errors
2. `npm run lint` (or `npx eslint .` if no lint script) — must be 0 errors
3. **Smoke test** from task-file's "Smoke test plan" section (if present):
   - For UI changes: describe what user should manually verify (or run Playwright if test exists)
   - For backend: run relevant unit/integration tests
   - Skip if task-file has no smoke-test plan AND task is purely refactor/cleanup

## Step 6 — Update task file

Only if `tasks/<id>.md` exists:

- Set `status: done` in frontmatter
- Add `completed: <YYYY-MM-DD>` to frontmatter
- Move file: `tasks/<id>.md` → `tasks/done/<id>.md` (create `tasks/done/` directory if missing)

If task-file doesn't exist (pre-migration): skip with note.

## Step 7 — Update changelog

Only if `docs/changelog.md` exists:

Append entry under the current month's `## YYYY-MM` h2 header (create if absent). Format:

```markdown
### <number>. <Task title>

<1-2 sentence summary of what was built and how it works.>

- Task: [tasks/done/<id>.md](tasks/done/<id>.md)
- ADR: <link if created>, otherwise `-`
- Spec: <link if updated>, otherwise `-`
- Commit: <short hash> (filled after step 8)
```

Auto-increment `<number>` based on highest existing entry number.

If `docs/changelog.md` doesn't exist (pre-migration): skip with note.

## Step 8 — Commit

- Stage all changes: `git add -A`
- Compose conventional-commit message based on task title and type:
  - `feat:` for new features
  - `fix:` for bugfixes
  - `refactor:` for structural changes
  - `docs:` for documentation
  - `test:` for test additions
  - `chore:` for tooling
- Commit message format:
  ```
  <type>(<scope>): <short description>

  <bullet list of key changes>

  Task: <task-id>

  Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
  ```
- Run `git commit` — do NOT use `--no-verify`. If pre-commit hook fails: investigate root cause, fix, re-commit (NEW commit, not amend).
- After successful commit: capture commit hash.
- If step 7 was performed: update the changelog entry with the commit hash.

## Step 9 — Final report to user

End with a structured summary:

```
✅ Task finalized: <task-id>

Review:
- <N> iterations needed
- <X> CRITICAL fixed, <Y> WARNING fixed
- <Z> MINOR deferred (see list below)

Quality gates:
- TypeScript: 0 errors ✓
- Lint: 0 errors ✓
- Smoke test: <result> ✓

Persistence:
- Task status: done ✓
- Changelog: entry #<N> added ✓
- Commit: <short hash> — <message first line>

Open MINOR issues for your review:
- [file:line] description
- ...

Next step: review minor issues if any, otherwise PR can be opened.
```

---

## Stop conditions (halt and ask user)

- Quality gate fails (Step 5) and root cause unclear after one fix attempt
- Reviewer iterations >5 still flag CRITICAL or WARNING
- `git status` shows changes outside scope of task-file's "Bestanden die ik aanraak" section (scope creep)
- Pre-commit hook fails for reasons other than fixable code issues (e.g., missing dependencies, environment problems)
- Tests reveal a regression in unrelated code

## When NOT to use this skill

- Bugfixes <30 min — overkill, just commit with descriptive message
- Pure documentation updates (no code changes) — skip review loop, only run commit step
- Schema-only migrations — requires manual verification of data integrity first; run review loop but defer commit until user confirms

## Notes on subagent invocation

- Use the `Agent` tool with `subagent_type: "code-reviewer"` if available, otherwise `subagent_type: "general-purpose"` with explicit code-reviewer prompt.
- For parallel runs: send multiple Agent tool calls in a single message.
- Each subagent is read-only — do not let them edit code. They report; this skill fixes.
- Do not pass earlier review results to fresh subagents — they need clean eyes to catch what previous rounds missed.
