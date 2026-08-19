#!/usr/bin/env bash
# retry-with-timeout — voert een commando uit met een harde tijdslimiet en
# probeert het bij een hang of fout opnieuw.
#
# WAAROM DIT BESTAAT: `npx playwright install --with-deps chromium` liep op
# 2026-08-18 drie keer vast bij drie verschillende sessies (30, 30 en 93
# minuten). Een vastgelopen stap wordt nooit rood — hij blijft staan tot
# GitHub's standaardlimiet van zes uur. Voor een reviewer ziet dat eruit als
# "nog niet groen" in plaats van "kapot", en zo blokkeert een netwerkhik een PR
# een halve dag zonder dat iemand het als storing herkent.
#
# Een `timeout-minutes` op de stap lost de helft op: hij wordt rood, maar een
# hik kost dan alsnog een handmatige herstart. Dit omhulsel maakt er een
# tijdelijke fout van in plaats van een blokkade.
#
# Gebruik:
#   scripts/ci/retry-with-timeout.sh <seconden> <pogingen> <commando...>
#
# Exit: 0 zodra een poging slaagt; anders de exit-code van de laatste poging,
# waarbij 124 betekent "in de tijdslimiet gelopen" (de conventie van `timeout`).
set -uo pipefail

# `timeout` is coreutils en zit op de GitHub-runner (ubuntu), maar niet op macOS.
# Zonder terugval is dit script alleen op de runner te toetsen — en een bewaker
# die je niet lokaal kunt mutatietesten is precies wat we hier willen vermijden.
run_with_limit() {
  local secs="$1"; shift

  if command -v timeout >/dev/null 2>&1; then
    timeout --kill-after=10s "${secs}s" "$@"
    return $?
  fi
  if command -v gtimeout >/dev/null 2>&1; then
    gtimeout --kill-after=10s "${secs}s" "$@"
    return $?
  fi

  # Terugval in kaal bash. De bewaker laat een markering achter vóór hij
  # ingrijpt; het bestaan daarvan onderscheidt "door ons gedood" van "zelf
  # geeindigd". Raden op de exit-code kan niet: een gedood proces geeft 143,
  # maar 143 is ook een geldige exit-code van een commando dat zelf afsluit.
  local flag
  flag="$(mktemp)"
  rm -f "$flag"

  "$@" &
  local cmd_pid=$!

  (
    sleep "$secs"
    if kill -0 "$cmd_pid" 2>/dev/null; then
      : > "$flag"
      kill -TERM "$cmd_pid" 2>/dev/null
      sleep 10
      kill -KILL "$cmd_pid" 2>/dev/null
    fi
  ) &
  local watch_pid=$!

  wait "$cmd_pid" 2>/dev/null
  local rc=$?

  kill -TERM "$watch_pid" 2>/dev/null
  wait "$watch_pid" 2>/dev/null

  if [ -e "$flag" ]; then
    rc=124
    rm -f "$flag"
  fi
  return "$rc"
}

if [ "$#" -lt 3 ]; then
  echo "gebruik: $0 <seconden> <pogingen> <commando...>" >&2
  exit 2
fi

limit="$1"; shift
attempts="$1"; shift

status=1
for i in $(seq 1 "$attempts"); do
  echo "→ poging $i/$attempts (limiet ${limit}s): $*"
  run_with_limit "$limit" "$@"
  status=$?

  if [ "$status" -eq 0 ]; then
    echo "✓ geslaagd bij poging $i"
    exit 0
  fi
  if [ "$status" -eq 124 ]; then
    echo "✗ poging $i liep in de tijdslimiet van ${limit}s — dit is de hang die we willen vangen"
  else
    echo "✗ poging $i faalde met exit-code $status"
  fi
  # Exponentiële backoff i.p.v. vast 5s. Reden, gemeten 2026-08-19: de
  # faalmodus die we hier het vaakst zien is niet "het commando hangt" maar
  # "een ander proces houdt de apt-lock". Zo'n dpkg/apt-lock duurt makkelijk
  # 30-60s, terwijl drie pogingen met 5s ertussen na ~10s opgaven — in het
  # log liep de ándere apt-get op dat moment gewoon door. Netto zetten we een
  # hang die vanzelf goed kwam om in een harde rode CI.
  if [ "$i" -lt "$attempts" ]; then
    case "$i" in
      1) backoff=15 ;;
      2) backoff=45 ;;
      *) backoff=60 ;;
    esac
    echo "  ... $backoff s wachten voor de volgende poging"
    sleep "$backoff"
  fi
done

echo "✗ alle $attempts pogingen mislukt — laatste exit-code $status" >&2
exit "$status"
