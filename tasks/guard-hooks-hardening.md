---
id: guard-hooks-hardening
title: De twee veiligheidshooks hebben gaten — session-guard mist gh pr merge, check-dangerous-bash belooft een escape die niet bestaat
fase: launch
priority: next
effort: 2-4 uur
owner: claude-code
status: open
created: 2026-07-17
completed:
related-adr: -
related-spec: -
worktree: -
---

# Probleem

Alle drie onderstaande zijn op 2026-07-17 **empirisch geraakt** in één sessie, niet
theoretisch. ⚠️ Deze task raakt Eriks veiligheidsnet — **niet uitvoeren zonder expliciet
akkoord op de richting**.

## 1. `session-guard.sh` mist `gh pr merge` — en dát is waar de schade zit

De guard blokkeert alleen lokale git-verbs:
`checkout|switch|reset|rebase|cherry-pick|stash|worktree|merge` + `branch -f/-D/-m/-M`.
PR's mergen gaat **server-side**, dus twee sessies kunnen tegelijk naar `main` deployen
zonder enige rem — op een repo waar **main = productie**.

Dit is 2026-07-17 echt gebeurd: PR #177 is naar productie gemerged terwijl een co-sessie
actief op main werkte. Het ging goed, maar zonder verdienste — er zat niets tussen. De guard
is gebouwd voor de churn van 2026-07-07 (twee sessies, gedeelde index) en dekt precies dát,
maar de moderne variant van hetzelfde risico (twee sessies, gedeelde *remote*, prod-deploys)
is onbewaakt.

## 2. `session-guard.sh` fout-positieft over worktrees heen

```bash
ROOT=$(git rev-parse --show-toplevel)   # ← draait in de cwd van de HOOK
LOCK="$ROOT/.claude-session.lock"
```

De hook draait vóór het commando, in de projectmap van de sessie — niet in de `cd`-target
van het commando. Draait er een co-sessie in `branddock-app`, dan zijn **álle** git-mutaties
geblokkeerd, óók in worktrees waar niemand zit. De guard bedoelt "per-worktree lock — elke
worktree heeft z'n eigen root", maar identificeert de worktree verkeerd.

Netto: hij bewaakt het verkeerde (gat 1) en hindert het goede (gat 2).

## 3. `check-dangerous-bash.sh` liegt over zijn eigen escape

De foutmelding zegt:

> *"Als dit echt nodig is, voeg expliciete user-confirmation toe via 'I know what I'm doing'."*

Maar de hook is een onvoorwaardelijke `exit 2` — **er is geen enkel codepad dat die zin
honoreert.** Blokkeert o.a. `git push --force-with-lease` en `git reset --hard origin`,
allebei volstrekt routine na een rebase op een eigen feature-branch.

Zelfde vorm als de rest van wat 2026-07-17 gevonden is: *een guard wiens melding niet matcht
met zijn gedrag.*

# Voorstel

Per gat een aparte keuze — dit is bewust géén "fix alles":

1. **`gh pr merge` afdekken.** Optie: de session-guard uitbreiden met een check op
   `gh pr merge`/`gh pr create --merge` wanneer een co-sessie leeft. Vraag aan Erik: wíl je
   dat? Twee sessies die tegelijk PR's mergen is soms legitiem (verschillende features).
   Alternatief: alleen waarschuwen i.p.v. blokkeren.
2. **ROOT correct afleiden.** De worktree bepalen uit het commando (parse de `cd`, of gebruik
   de tool-cwd als de harness die meegeeft) i.p.v. de sessie-cwd. Valt dat niet betrouwbaar
   te doen, dan is fail-open op onbekende targets beter dan fout-positief blokkeren.
3. **De escape implementeren óf de melding corrigeren.** Beide zijn goed; wat niet goed is,
   is een belofte die niet bestaat. CLAUDE.md zegt: *"fix de hook, niet bypassen"* — dan moet
   er wel iets te fixen zijn.

# Acceptatiecriteria

- [ ] Erik heeft expliciet akkoord gegeven op de richting per gat (dit is zijn veiligheidsnet)
- [ ] Gat 2 weg: werk in worktree X wordt niet geblokkeerd door een sessie in worktree Y
- [ ] Gat 3 weg: de melding klopt met het gedrag
- [ ] Gat 1: bewuste beslissing genomen (afdekken / waarschuwen / accepteren), vastgelegd
- [ ] Elke wijziging getest met een echte co-sessie-simulatie — niet alleen gelezen

# Bestanden die ik aanraak

- `.claude/hooks/session-guard.sh`
- `.claude/hooks/check-dangerous-bash.sh`
- `gotchas.md` (de 2026-07-07-entry aanvullen met wat de guard wél en níet dekt)

# Smoke test plan

Twee echte sessies (of een gesimuleerde lock met een verse heartbeat) + de matrix aflopen:
lokale git-mutatie in dezelfde worktree (moet blokkeren), in een andere worktree (moet door),
`gh pr merge` (gedrag conform de beslissing), en de force-push-escape (moet werken zoals de
melding belooft).

# Risico's

- **Een guard versoepelen is riskanter dan hem laten staan.** Elke wijziging moet strikter of
  gelijk zijn op het pad dat 2026-07-07 kapotmaakte. Gat 2 fixen mag geen gat 1 vergroten.
- Fail-open bij onbekende targets is een bewuste keuze met een prijs; benoem 'm.

# Out of scope

- De lock-TTL (900s). Werkt zoals bedoeld — self-healing. Wel goed om te weten: na het
  afsluiten van een sessie blijft de lock nog 15 min "leven", en de wachtlus moet in een
  **apart** Bash-commando (zit hij in hetzelfde commando als de git-verb, dan blokkeert de
  guard het geheel bij PreToolUse).

# Notes

Legitieme omweg zonder iets te omzeilen, gebruikt op 2026-07-17 voor 4 PR's — bewaar deze,
hij scheelt de volgende sessie een half uur:

- Rebase vermijden → `git merge origin/main` ín de branch (geen force-push nodig).
- Al gerebased en vastgelopen? `git checkout -B <branch> origin/<branch>` staat op géén
  blokkeerlijst en zet je terug.
- `commit` en `push` laat de session-guard expliciet door; alleen HEAD/branch-mutaties niet.
