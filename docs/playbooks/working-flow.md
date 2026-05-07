# Working Flow — Operating Manual

> Spelregels voor planning, uitvoering en evaluatie van werk. Distillaat van `docs/archive/old-lists/PLAN-VAN-AANPAK.md` sectie 5-7.
> Gecombineerd met `CLAUDE.md` als runtime context.

---

## 14 spelregels

### Planning (regels 1-5)

**Regel 1 — Plan-mode default voor 3+ stappen**
Elke taak met >2 file-changes of architecturale impact begint met plan-mode. Plan moet bevatten: scope, file-list, acceptatiecriteria, smoke-test, out-of-scope. User approval vóór uitvoering.

**Regel 2 — Eén taak = één task-file**
Open `tasks/<id>.md` met template ingevuld. Geen werk zonder task-file (uitzondering: bugfixes <30 min). Status in frontmatter: `open` / `in-progress` / `blocked` / `done`.

**Regel 3 — Worktree voor parallel werk**
2+ sessies tegelijk = worktrees verplicht. Naming: `branddock-feat-<task-id>`. File-ownership *vooraf* in task-file specificeren (sectie "Bestanden die ik aanraak").

**Regel 4 — ADR voor non-triviale beslissingen**
Bij architectuur, library-keuze of patroon-wijziging: schrijf ADR vóór uitvoering. Y-statement format. Link vanuit task-file naar ADR.

**Regel 5 — Spec-Kit voor grote ongedefinieerde features**
Features groter dan 1 week: gebruik `/specify` flow. Specs naar `docs/specs/<feature>/`. Bugfixes en kleine features: niet nodig.

---

### Uitvoering (regels 6-10)

**Regel 6 — Hooks bewaken kwaliteit per stap**
- PostToolUse Edit → `tsc --noEmit` (gefaald = retry)
- PostToolUse Edit → `eslint --fix`
- PreToolUse Bash gevaarlijke commando's → user-confirm
- Stop → session summary

**Regel 7 — Subagent voor zware exploratie**
- 100+ files te lezen → Explore subagent (geen main loop)
- Code review op groot diff → code-reviewer subagent
- Doc consistency check → doc-keeper subagent

**Regel 8 — Checkpoints elke ~30 min**
Auto-checkpoint in Claude Code (`/rewind` werkt). Plus: git commit elke logische eenheid (~30 min werk). Lange sessie (>2u) zonder commit = red flag.

**Regel 9 — Memory voor cross-sessie context**
Beslissingen + non-triviale leerpunten → `~/.claude/projects/.../memory/`. Plan-doc updates direct in `tasks/<id>.md`.

**Regel 10 — Stop-and-ask conditions**
- Onbekende infra → vraag
- Scope-escalatie buiten task-file → vraag
- Test fail die niet door 1 retry oplost → vraag
- Externe service down → vraag
- Anders: keep-going

---

### Evaluatie (regels 11-14)

**Regel 11 — Done-definitie verplicht**
Elke task is "done" alleen als:
- [ ] Alle acceptatiecriteria afgevinkt
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (manual of automated)
- [ ] Commit + descriptive message
- [ ] `tasks/<id>.md` status → done
- [ ] Indien architectuur-wijziging: ADR aangemaakt
- [ ] Indien spec-doc bestaat: spec bijgewerkt

**Regel 12 — Self-review vóór user-review**
Code-reviewer subagent draait op de diff. Bij issues: fix eerst, dan handover. Voor non-triviaal werk: `task-finalize` skill draait twee parallelle subagents in loop tot clean (max 5 iteraties).

**Regel 13 — Wekelijkse retro**
Vrijdagmiddag 30 min: `tasks/done/` doorlopen. Wat was hard? Wat ging vlot? Welke ADR moet erbij? `START_HERE.md` updaten.

**Regel 14 — Geen opheldering = geen merge**
Test failures, mysterieuze workarounds, "het werkt op mijn machine" → niet mergen. Liever rollback dan technical debt.

---

## Worktree workflow

### Setup (eenmalig)
```bash
cd ~/Projects/branddock-app
git worktree add ../branddock-feat-<task-id> -b feat/<task-id>
cd ../branddock-feat-<task-id>

# Eigen .env (kopieer + pas DB-naam aan zodat sessies elkaar's data niet raken)
cp ~/Projects/branddock-app/.env.local .env.local
# DATABASE_URL aanpassen naar branddock_<task-id> (lokale dev DB)
echo "PORT=3001" >> .env.local

claude
```

### Werkflow
1. **Voor sessie-start**: open `tasks/<id>.md`, lees "Bestanden die ik aanraak"
2. **Vóór parallel werk**: check `git worktree list`. Geen file-overlap = OK
3. **Tijdens werk**: blijf binnen je file-set. Buiten gaan = scope-escalatie = stop-and-ask
4. **Na werk**: PR maken, `task-finalize` skill, mergen naar main
5. **Cleanup**: `git worktree remove ../branddock-feat-<id>`

### Conventies
- Max 3 worktrees tegelijk actief (review-bandbreedte beperkt)
- Eén `CLAUDE.md` + `roadmap.md` als shared-read maar **frozen during run** — wijzigen via separate commits
- DB-isolatie: per worktree eigen lokale DB-instance (`branddock_<task-id>`)
- Port-isolatie: 3000, 3001, 3002

### Wanneer geen worktree
- Bugfixes <30 min: gewoon main branch
- Documentation-only changes: gewoon main branch
- Eén-sessie werk dat sequentieel kan: gewoon main branch

---

## Autonomy framework

### Drie niveaus
| Niveau | Use case | Setup |
|---|---|---|
| **L1: assistive** | Plan-mode + step-by-step approval | Default mode |
| **L2: supervised auto** | Auto-mode tijdens werkdag, jij houdt oog | `claude --permission-mode auto` |
| **L3: routines** | Cron-based nightly werk | Claude Code Routines |

### L2 — Geschikt voor
- Type-fix campagnes (bv `: any` opruimen)
- Test-coverage uitbreiden
- Doc-sync werk

### L3 — Geschikt voor
- Nightly issue-triage
- Daily PR-review pre-pass
- Wekelijkse mutation-testing run + rapport
- Wekelijkse documentation-drift check
- Maandelijkse dependency-update PRs

### L3 — NIET geschikt voor
- Nieuwe features (té veel scope-onzekerheid)
- Multi-file refactors zonder duidelijke spec
- Werk dat externe services nodig heeft die op kunnen vallen

### Cost controls
- `max_tokens` per routine
- Sonnet i.p.v. Opus voor routine-werk
- Off-peak schedules
- Daily caps op routines
- Wekelijkse cost-review
- **Budget**: $20/mnd ceiling eerste 3 maanden, evalueren

### Stop-and-ask beslissingsboom
```
Is het nieuwe scope?
  Ja → STOP, vraag user
  Nee ↓
Is het multi-file?
  Ja → check task-file file-list
    Op de lijst → keep-going
    Niet op de lijst → STOP, vraag user
  Nee ↓
Is er onbekende infra/service?
  Ja → STOP, vraag user
  Nee → keep-going
```

---

## 30-seconden referentie

### "Mag ik nu beginnen met deze taak?"
1. Heeft het een `tasks/<id>.md`? Nee → eerst maken
2. Is het >2 file-changes? Ja → plan-mode eerst, user-approval halen
3. Is iemand anders bezig in dezelfde files? Ja → andere worktree of wacht
4. Is er een ADR nodig (architectuur-keuze)? Ja → eerst ADR
5. Zo niet → keep-going

### "Mag deze task gemerged?"
1. Acceptatiecriteria afgevinkt? Ja
2. `tsc --noEmit` 0 errors? Ja
3. Lint 0 errors? Ja
4. Smoke-test gedraaid? Ja
5. Subagent code-review uitgevoerd? Ja
6. Status in task-file = done? Ja
7. Zo niet → niet mergen

### "Moet ik stop-and-ask?"
1. Nieuwe scope (buiten task-file)? Ja → stop
2. Onbekende infra/service? Ja → stop
3. Test fail die niet door 1 retry oplost? Ja → stop
4. Externe service down? Ja → stop
5. Zo niet → keep-going

---

## Stream Deck triggers

| Knop | Tekst | Wat |
|---|---|---|
| Start sessie | "Lees CLAUDE.md, gotchas.md en START_HERE.md..." | Sessie-opener |
| Werk overzicht | "Geef me een overzichtelijk overzicht..." | Open werk → keuze |
| Bugfix | "Bug: [...]" | Quick fix |
| Finalize | "Ik ben klaar. Voer task-finalize skill uit." | End-of-task ceremonie |
| Commit | "Commit huidig werk met conventional-commit message..." | Tussentijdse commit |
| Retro | "Lees alle tasks/done/..." | Vrijdagretro |
| Doc-sync | "Run nightly-doc-sync routine..." | Autonome routine |
| Help | "Ik weet niet hoe verder. Hier is wat ik probeer: [...]" | Vastloop-hulp |
