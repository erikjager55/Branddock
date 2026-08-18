---
id: guard-hooks-hardening
title: De twee veiligheidshooks hebben gaten — session-guard mist gh pr merge, check-dangerous-bash belooft een escape die niet bestaat
fase: launch
priority: next
effort: 2-4 uur
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-08-18
related-adr: -
related-spec: -
worktree: branddock-guard-hooks-hardening
---

# Probleem

Alle drie onderstaande zijn op 2026-07-17 **empirisch geraakt** in één sessie, niet
theoretisch. ⚠️ Deze task raakt Eriks veiligheidsnet — **niet uitvoeren zonder expliciet
akkoord op de richting**.

## Bewijs uit 2026-08-18 — dit kost nu meetbaar tijd

Een dag met vijf parallelle sessies raakte alle drie de gaten opnieuw, plus twee nieuwe.

1. **Fout-positief over worktrees heen — drie keer geblokkeerd.** Een rebase-commando met een
   expliciete `cd` naar `branddock-settings-write-layer` werd geweigerd met
   `worktree : /Users/erikjager/Projects/branddock-app`. De guard leest de worktree uit de cwd
   van de hook (de projectmap van de sessie), niet uit het commando. Gevolg: elke legitieme
   actie in een andere worktree ligt stil zolang er ergens een co-sessie draait — en die draaide
   de hele dag door, met wisselende sessie-id's (`ea291c87` → `1dadeccb` → `132da379`).
2. **De omweg is duur.** Omdat rebasen niet kon, is PR #293 opnieuw opgebouwd op een verse
   worktree en als #299 heropend. Kosten per omweg: een volledige `npm ci` (2-4 min) plus een
   weggegooide PR. Twee keer gedaan op één dag.
3. **De pull-vorm staat niet op de verb-lijst** maar verzet wél HEAD en voert een merge uit.
   In `branddock-app` liep hij gewoon door terwijl een co-sessie de lock hield. Ging goed
   (schone werkboom, fast-forward), maar het is hetzelfde gat als bij `gh pr merge`: de guard
   dekt de verbs, niet de effecten.
4. **De verbs-lijst nodigt uit tot omzeilen.** Er zijn minstens twee vormen die materieel
   hetzelfde doen als wat wél geblokkeerd wordt en er niet op staan. Zolang dat zo is, is de
   guard een drempel voor wie hem respecteert en geen rem voor wie hem niet kent.
5. **De guard blokkeert het documenteren van zichzelf.** Deze sectie kon niet via een
   shell-heredoc geschreven worden: de regex matcht op de commando-namen *in de tekst*, niet
   alleen op een uitgevoerd commando. Elke task-file, changelog-entry of gotcha die de
   geblokkeerde vormen letterlijk noemt, is onschrijfbaar vanuit een sessie met een co-sessie.
   Een fix hoort de match te beperken tot het daadwerkelijk uit te voeren commando.

**Extra dimensie die deze task nu ook raakt: coördinatie tussen sessies.** De guard beschermt
één werkboom, maar niet tegen twee sessies die hetzelfde task-file oppakken. Op 18-08 leverde
dat drie bijna-dubbelingen op; in alle drie de gevallen zeiden zowel het task-file als de code
op `origin/main` "open", terwijl een **open PR** het al af had. De goedkope mitigatie is geen
blokkade maar een gewoonte: `gh pr list --state open` bij sessie-start. Overweeg of dat in de
`SessionStart`-hook thuishoort naast de bestaande co-sessie-waarschuwing — dat is informeren,
geen blokkeren, en valt daarmee buiten de "raakt het veiligheidsnet"-gevoeligheid.

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

# Opgeleverd (2026-08-18)

Aanleiding voor de uitvoering: **alle drie de gaten zijn op 18-08 opnieuw geraakt** in
één sessie — een merge naar productie terwijl de guard élke lokale git-mutatie blokkeerde,
een fout-positief op `git worktree add` én op een cherry-pick in een verse zijworktree, en
de niet-bestaande escape bij het opruimen van lokale `main`.

**Eriks beslissingen** (18-08, per gat gevraagd):

1. `gh pr merge` → **waarschuwen, niet blokkeren**. Twee sessies die elk hun eigen PR
   mergen is legitiem; de echte faalmodus in beide incidenten was een verouderde
   branch-head, niet gelijktijdigheid. De melding wijst daarom naar `git ls-remote`.
2. `check-dangerous-bash` → **operatie-bewust**. Drie lagen: CRITICAL (altijd blokkeren),
   BRANCH-AWARE (alleen richting main/master), WARNING (melden, doorlaten).
3. Onbepaalbaar doel → **doorlaten** (fail-open, conform het bestaande ontwerp).

**Nieuwe helper** `.claude/hooks/lib/guard-lib.sh` — beide hooks stelden dezelfde vraag
("welke worktree raakt dit commando?") en beantwoordden 'm verkeerd. Nu één implementatie:
doel uit `cd` / `git -C`, anders het JSON-veld `cwd`; onbepaalbaar → leeg → doorlaten.

**Twee vondsten die niet in de oorspronkelijke analyse stonden:**

- **De blokkade was tekstueel, niet operationeel.** De ene schrijfwijze van een harde reset
  werd geblokkeerd, dezelfde operatie met een SHA niet — exact even destructief. Nu kijkt
  de check naar de uitgecheckte branch in plaats van naar de spelling van het argument.
- **`git -C <pad> <verb>` glipte langs béide hooks**, ook in de versie van vóór 18-08:
  elke verb-regex eiste het werkwoord dírect achter `git`. De smoke viel er meteen over
  (rij 4). Opgelost met `normalize_git_cmd`; rij 13 is de regressietest.

**Nagekomen (zelfde dag, aparte PR): de verb-lijst dekte werkwoorden, geen effecten.**
`git pull` stond er niet op terwijl het een merge uitvoert en HEAD verzet — vastgesteld in
memory `guard-hooks-gaps` (gat 1b), maar níet in deze task-file, waardoor het bij het
plannen gemist werd. Toegevoegd: `pull`, `revert`, `am`, `apply`, `restore`. Smoke-rijen 14
en 15. **Les voor de volgende keer: lees bij het plannen niet alleen het task-file maar ook
de memory die eraan hangt** — daar stond het gat al beschreven.

**Een escape implementeren bleek principieel onmogelijk.** Een PreToolUse-hook kent alleen
`allow` en `deny` — er is geen `ask`, dus een hook kán niet om bevestiging vragen. En een
escape-zin ín het commando wordt door Claude getypt, niet door Erik; dat is geen
user-confirmation maar een self-service bypass. De melding zegt nu wat er wél geldt.

# Acceptatiecriteria

- [x] Erik heeft expliciet akkoord gegeven op de richting per gat (dit is zijn veiligheidsnet)
- [x] Gat 2 weg: werk in worktree X wordt niet geblokkeerd door een sessie in worktree Y — smoke rij 3
- [x] Gat 3 weg: de melding klopt met het gedrag
- [x] Gat 1: bewuste beslissing genomen (waarschuwen) en vastgelegd — smoke rij 6
- [~] Elke wijziging getest met een echte co-sessie-simulatie — **`npm run smoke:guard-hooks`
      13/13 tegen echte git-repo's en echte lockfiles, plus drie mutatietests die elk de
      juiste rijen laten omvallen.** Wat er NIET in zit: een tweede échte Claude-sessie.
      De smoke dekt de logica van de hooks, niet de integratie met de harness — en
      specifiek is **niet bewezen via welk kanaal de `gh pr merge`-waarschuwing bij Erik
      aankomt** (stderr bij exit 0 is niet gegarandeerd zichtbaar; daarom óók een
      `systemMessage`). Zie Restwerk hieronder.

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

# Restwerk

- **Waarschuwingskanaal verifiëren.** Draai één keer met een échte tweede sessie een
  `gh pr merge` en kijk of de waarschuwing zichtbaar is. Komt hij niet aan, dan is dit de
  vierde variant van hetzelfde probleem — een guard wiens melding niemand bereikt. Kost
  vijf minuten zodra er weer twee sessies openstaan.
- **Gat 1 blijft bewust een waarschuwing.** Twee sessies kunnen dus nog steeds tegelijk
  naar productie mergen. Dat is Eriks keuze van 18-08, geen omissie — niet opnieuw als
  bug rapporteren.

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
