# AI Playbook

## Core Principles

- **Simplicity First** → minimal, clean solutions
- **Systems > Prompts** → invest in structural context (CLAUDE.md, skills, folder conventions) over per-prompt instructions
- **Verification > Generation** → prove it works before moving on
- **Iteration > Perfection** → ship, learn, improve
- **No Lazy Fixes** → solve root cause, not symptoms

---

## 1. Plan Mode Default

- Enter plan mode for **any non-trivial task** (3+ steps or architecture)
- Define both execution steps and verification steps
- Write detailed specs to remove ambiguity
- **Define done criteria upfront** — know what "finished" looks like before you start
- If something breaks → **STOP and re-plan**

## 2. Subagent Strategy

- **Use subagents aggressively** for complex problems
- Split tasks: research, execution, analysis
- One primary task per agent for clarity, but allow parallel execution on non-overlapping concerns
- Parallelize thinking, not just execution

## 3. Self-Improvement Loop

- After **any** mistake → log it in `gotchas.md`
- Convert recurring mistakes into rules
- Review past lessons before starting new work
- Iterate until error rate drops

## 4. Verification Before Done

- **Never mark done without proof**
- Run tests, check logs, simulate real usage
- Compare expected vs actual behavior
- Ask: "Would a senior engineer approve this?"

## 5. Demand Elegance

- Ask: "Is there a simpler / cleaner way?"
- Avoid hacky or temporary fixes
- Optimize for long-term maintainability
- Skip overengineering for small fixes

## 6. Autonomous Bug Fixing

- Bugs → fix immediately (no hand-holding)
- Trace logs, errors, failing tests
- Find root cause, not symptoms
- Fix CI failures proactively

## 7. Skills = System Layer

- Skills are **not** just markdown files — they include code, scripts, data, workflows
- Skills = reusable intelligence
- Use skills for:
  - verification
  - automation
  - data analysis
  - scaffolding
- Track changes across skill versions

## 8. File System = Context Engine

- Use folders for progressive disclosure:
  - `references/` — background knowledge, specs
  - `scripts/` — automation, tooling
  - `templates/` — reusable patterns
- Structure > verbosity
- Skip overcomments > conventions
- Structure improves reasoning quality

## 9. Avoid Over-Constraining AI

- Don't force rigid steps
- Provide context, not micromanagement
- Let AI adapt to the problem
- Flexibility > strict instructions
- Plan the *what*, not the *how*

---

## Task Management

1. **Plan first** → write tasks with checklist and done criteria
2. **Verify before execution** → confirm the approach makes sense
3. **Track progress continuously** → no silent failures
4. **Explain changes at each step** → leave a trail
5. **Document results clearly** → future-you will thank you
6. **Capture lessons after completion** → feed the self-improvement loop
