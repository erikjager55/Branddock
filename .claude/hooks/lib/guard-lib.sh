#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# guard-lib.sh — gedeelde helpers voor session-guard.sh en check-dangerous-bash.sh
#
# Beide hooks moeten dezelfde vraag beantwoorden: *welke worktree raakt dit
# commando?* Die vraag werd tot 2026-08-18 in session-guard beantwoord met
# `git rev-parse --show-toplevel` in de cwd van het hook-proces — dus altijd de
# worktree van de sessie, nooit die van het commando. Gevolg: een co-sessie in
# `branddock-app` blokkeerde git-werk in élke andere worktree (gotchas 2026-07-17,
# opnieuw geraakt 2026-08-18).
#
# ONTWERPREGEL: bij twijfel doorlaten. Een guard die legitiem werk blokkeert wordt
# omzeild, en dan bewaakt hij niets meer. Elke functie hieronder echoot daarom een
# lege string zodra de uitkomst niet betrouwbaar vast te stellen is; de aanroeper
# behandelt leeg als "niet blokkeren".
# ─────────────────────────────────────────────────────────────────────────────

# Beschermde branches: hier is force-push / reset --hard wél catastrofaal.
GUARD_PROTECTED_BRANCHES="main master"

# is_protected_branch <branch> → 0 als de branch beschermd is
is_protected_branch() {
  local b="$1" p
  [ -n "$b" ] || return 1
  for p in $GUARD_PROTECTED_BRANCHES; do
    [ "$b" = "$p" ] && return 0
  done
  return 1
}

# _unquote <string> → strip één laag aanhalingstekens
_unquote() {
  local s="$1"
  s=${s%\"}; s=${s#\"}
  s=${s%\'}; s=${s#\'}
  printf '%s' "$s"
}

# resolve_target_worktree <command> <session_cwd> → pad naar de git-worktree, of leeg
#
# Volgorde is bewust: een expliciete `git -C <pad>` wint van een `cd`, want die
# bepaalt het doel van de git-operatie zelf. Pas als geen van beide er is, valt hij
# terug op de cwd van de sessie (het JSON-veld `cwd`, niet de cwd van dit proces).
resolve_target_worktree() {
  local cmd="$1" cwd="$2" cand=""

  # 1. `git -C <pad>` — expliciet doel
  cand=$(printf '%s' "$cmd" | sed -n 's/.*git[[:space:]][[:space:]]*-C[[:space:]][[:space:]]*\([^[:space:];|&]*\).*/\1/p' | head -1)

  # 2. `cd <pad>` aan het begin van het commando
  if [ -z "$cand" ]; then
    cand=$(printf '%s' "$cmd" | sed -n 's/^[[:space:]]*cd[[:space:]][[:space:]]*\([^[:space:];|&]*\).*/\1/p' | head -1)
  fi

  # 3. terugval op de sessie-cwd
  [ -z "$cand" ] && cand="$cwd"

  cand=$(_unquote "$cand")

  # Onbepaalbaar → leeg (fail-open). Een variabele, subshell of glob kunnen we
  # hier niet betrouwbaar uitrekenen, en gokken is erger dan doorlaten.
  case "$cand" in
    ''|*'$'*|*'`'*|*'*'*) return 0 ;;
    '~'|'~/'*) cand="$HOME${cand#\~}" ;;
  esac

  [ -d "$cand" ] || return 0
  git -C "$cand" rev-parse --show-toplevel 2>/dev/null || return 0
}

# normalize_git_cmd <command> → commando met `git -C <pad>` teruggebracht tot `git`
#
# Waarom: elke verb-detectie hieronder zoekt `git <werkwoord>`. Bij `git -C /pad
# checkout` staat het werkwoord niet direct achter `git`, waardoor zo'n commando
# ongezien passeerde — dat gold ook voor de versie vóór 2026-08-18, en de smoke
# (rij 4) viel er meteen over. Normaliseren is betrouwbaarder dan elke regex
# uitbreiden met optionele vlaggen.
normalize_git_cmd() {
  printf '%s' "$1" | sed 's/git[[:space:]][[:space:]]*-C[[:space:]][[:space:]]*[^[:space:]][^[:space:]]*[[:space:]][[:space:]]*/git /g'
}

# strip_heredoc_payload <command> → alles vóór de eerste heredoc-opening
#
# Waarom: een PreToolUse-hook krijgt het HELE commando, inclusief de tekst van een
# heredoc. Een `gh pr create --body-file - <<EOF …` waarin je uitlegt dat `git push
# --force naar main` geblokkeerd wordt, bevat dus letterlijk die woorden — en werd
# daarop geblokkeerd. Gemeten en gereproduceerd op 2026-08-19.
#
# Je kunt zo niet ÓVER een geblokkeerd commando schrijven zonder geblokkeerd te
# worden, en dat duwt je naar omwegen die riskanter zijn dan wat de hook tegenhield
# (in het gemelde geval: de remote branch verwijderen en opnieuw aanmaken).
#
# Payload is data, geen commando. Alles vanaf `<<` valt daarom weg vóór analyse.
strip_heredoc_payload() {
  printf '%s' "$1" | awk '
    { i = index($0, "<<")
      if (i > 0) { printf "%s", substr($0, 1, i - 1); exit }
      print }
  '
}

# unwrap_shell_c <command> → de INHOUD van een shell-wrapper, plus het origineel
#
# Waarom dit moet: de segment-analyse hieronder ziet `bash -c 'git push --force
# origin main'` niet als push, want `git push` staat daar niet aan het begin van
# een segment maar binnen een argument. Zonder deze stap ruilt de guard een vals
# alarm in voor een gemíste echte force-push naar main — slechter dan waar we
# mee begonnen. Gevonden door de eigen testrij, 2026-08-19.
#
# Onderscheid dat hier gemaakt wordt: bij `bash -c` / `sh -c` / `eval` IS de
# gequote string een commando en hoort hij geanalyseerd te worden. Bij
# `gh pr create --body '…'` is het data. Alleen shell-wrappers worden uitgepakt.
unwrap_shell_c() {
  printf '%s\n' "$1"
  case "$1" in
    *bash\ -c\ *|*sh\ -c\ *|*zsh\ -c\ *|*dash\ -c\ *|*eval\ *)
      inner=$(printf '%s' "$1" | sed -e "s/.*-c[[:space:]]*['\"]//" -e "s/['\"][[:space:]]*$//")
      [ -n "$inner" ] && printf '%s\n' "$inner"
      ;;
  esac
}

# git_push_args <command> → de argumenten van een ECHTE `git push`-aanroep,
# of leeg als het commando geen push ís.
#
# Waarom segment-gebaseerd en niet met een substring-zoek: `gh pr create --body
# 'we doen geen git push --force naar main'` bevat die woorden maar is geen push.
# Alleen een `git push` aan het BEGIN van een commando-segment (start, of na
# `;` `&&` `||` `|`) telt. Dat is dezelfde les als gotcha 2026-08-18: match op de
# operatie, niet op de tekst — een guard die je met andere spelling omzeilt
# beschermt niets, en een guard die op tekst aanslaat blokkeert het verkeerde.
#
# Het argument-deel stopt bij de eerstvolgende scheider, zodat
# `git push origin feat/x && echo main` niet als push-naar-main leest.
git_push_args() {
  printf '%s' "$1" | awk '
    {
      n = split($0, seg, /;|&&|\|\||\|/)
      for (i = 1; i <= n; i++) {
        s = seg[i]
        sub(/^[[:space:]]+/, "", s)
        if (s ~ /^git[[:space:]]+push([[:space:]]|$)/) {
          sub(/^git[[:space:]]+push[[:space:]]*/, "", s)
          print s
        }
      }
    }
  '
}

# current_branch_of <worktree> → branchnaam, of leeg (detached / geen repo / onbekend)
current_branch_of() {
  local wt="$1"
  [ -n "$wt" ] || return 0
  git -C "$wt" branch --show-current 2>/dev/null || return 0
}

# read_lock_field <lockfile> <regelnummer> → veldwaarde
read_lock_field() {
  [ -f "$1" ] || return 0
  sed -n "$2p" "$1" 2>/dev/null || return 0
}

# has_live_cosession <worktree> <mijn_sid> <stale_seconds> → 0 als er een ANDERE
# sessie met een verse heartbeat in deze worktree zit. Zet GUARD_CO_SID /
# GUARD_CO_BRANCH / GUARD_CO_AGE voor de melding.
has_live_cosession() {
  local wt="$1" sid="$2" stale="$3" lock hb age
  GUARD_CO_SID=""; GUARD_CO_BRANCH=""; GUARD_CO_AGE=""
  [ -n "$wt" ] || return 1
  lock="$wt/.claude-session.lock"
  [ -f "$lock" ] || return 1

  GUARD_CO_SID=$(read_lock_field "$lock" 1)
  hb=$(read_lock_field "$lock" 2)
  GUARD_CO_BRANCH=$(read_lock_field "$lock" 3)
  case "$hb" in ''|*[!0-9]*) hb=0 ;; esac
  age=$(( $(date +%s) - hb ))
  GUARD_CO_AGE="$age"

  [ -n "$GUARD_CO_SID" ] || return 1
  [ "$GUARD_CO_SID" != "$sid" ] || return 1
  [ "$age" -lt "$stale" ] || return 1
  return 0
}

# find_live_cosessions <repo-root> <mijn_sid> <stale_seconds>
# Echoot één regel per worktree met een levende co-sessie: "<sid>|<branch>|<age>|<pad>".
# Nodig voor repo-brede acties (gh pr merge) — die raken niet één worktree maar de remote.
find_live_cosessions() {
  local root="$1" sid="$2" stale="$3" wt
  [ -n "$root" ] || return 0
  git -C "$root" worktree list --porcelain 2>/dev/null | sed -n 's/^worktree //p' | while read -r wt; do
    if has_live_cosession "$wt" "$sid" "$stale"; then
      printf '%s|%s|%s|%s\n' "$GUARD_CO_SID" "$GUARD_CO_BRANCH" "$GUARD_CO_AGE" "$wt"
    fi
  done
}
