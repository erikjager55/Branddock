#!/usr/bin/env bash
# run-db-guards — draait de bewakers die een échte database nodig hebben.
#
# Tweelingbestand van run-guards.sh. Die draait in de `check`-job zonder
# database; deze hoort in de `e2e`-job, want daar staat al een postgres én heeft
# e2e/global-setup.ts het schema gepusht en geseed.
#
# SEED IS GEEN DETAIL. Op een LEGE database komt een deel van deze bewakers
# groen terug zonder iets te toetsen, of juist rood. Gemeten 2026-08-19, dezelfde
# bewakers op leeg vs. geseed:
#
#   smoke:context-priority      leeg: 30s, 0 toetsen  →  geseed: 1s, 9 toetsen
#   smoke:knowledge-context     leeg:  4 toetsen      →  geseed: 8 toetsen
#   smoke:seo-wiring            leeg: ROOD            →  geseed: groen
#   smoke:review-drift-reset    leeg: ROOD            →  geseed: groen
#   smoke:styleguide-rules-fval leeg: ROOD            →  geseed: groen
#
# Een bewaker op een lege database meten zegt dus niets over wat hij in CI doet.
# Wie hier iets toevoegt: meet op een GESEEDE database, en kijk of het aantal
# toetsen boven nul ligt — "groen" alleen is geen bewijs.
#
# VOLGORDE: deze stap hoort NA de e2e-suite. Sommige bewakers muteren
# (smoke:lp-retention wist rijen, smoke:review-drift-reset zet review-statussen
# terug); ervóór draaien sloopt de fixtures onder de e2e-tests vandaan.
#
# NIET HIER: smoke:competitor-activities en smoke:competitor-content-discovery.
# Die hebben naast een database ook API-sleutels nodig en horen bij de
# sleutel/netwerk-groep.
#
# Bewust geen fail-fast, net als in run-guards.sh: één run laat alle kapotte
# bewakers zien, niet de eerste.
set -uo pipefail

# Deze bewakers SCHRIJVEN en WISSEN. Ze eisen daarom stuk voor stuk een bewuste
# SMOKE_DB=1. Dit script zet die vlag voor je — en neemt in ruil daarvoor de rem
# over die je ermee wegneemt: het weigert tegen alles wat niet lokaal én
# herkenbaar een testdatabase is. Zonder deze poort zou het script precies de
# veiligheid slopen die de losse smokes hadden.
db="${DATABASE_URL:-}"
if [ -z "$db" ]; then
  echo "DATABASE_URL is leeg — deze bewakers hebben een database nodig." >&2
  exit 1
fi
case "$db" in
  *localhost*|*127.0.0.1*) ;;
  *) echo "Weigert: DATABASE_URL wijst niet naar localhost." >&2; exit 1 ;;
esac
case "$db" in
  *test*) ;;
  *) echo "Weigert: databasenaam bevat geen 'test'. Deze bewakers wissen rijen." >&2; exit 1 ;;
esac
export SMOKE_DB=1

GUARDS=(
  smoke:claw-security
  smoke:lp-retention
  smoke:seo-wiring
  smoke:knowledge-context
  smoke:context-priority
  smoke:voice-baseline
  smoke:brief-render
  smoke:web-page-builder
  smoke:source-image-matcher
  smoke:geo-fidelity
  smoke:review-drift-reset
  smoke:styleguide-rules-fval
  smoke:db-ssl-mode
  smoke:settings-write
  smoke:deep-research
)

failed=()
for g in "${GUARDS[@]}"; do
  printf '→ %s\n' "$g"
  if npm run "$g" --silent; then
    printf '  ✓ %s\n' "$g"
  else
    printf '  ✗ %s (exit %s)\n' "$g" "$?"
    failed+=("$g")
  fi
done

echo
echo "── ${#GUARDS[@]} db-bewakers gedraaid, ${#failed[@]} gefaald ──"
if [ "${#failed[@]}" -gt 0 ]; then
  printf '  ✗ %s\n' "${failed[@]}"
  exit 1
fi
echo "  alle db-bewakers groen"
