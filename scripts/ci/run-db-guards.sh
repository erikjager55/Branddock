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
# WIE HIER NIET IN HOORT, EN HOE DAT BLEEK.
# Deze lijst begon op vijftien. Acht zijn eruit gegaan nadat ze in de júiste
# omgeving gemeten werden — twee keer omdat mijn lokale omgeving stiller hielp
# dan ik doorhad:
#
#   smoke:seo-wiring        heeft ANTHROPIC_API_KEY nodig. Lokaal slaagde hij
#                           omdat `.env.local` die sleutel meelaadt; in CI viel
#                           hij om met 19 FAIL. Hoort in de sleutelgroep.
#   smoke:claw-security     draaien alle vijf zonder database én zonder
#   smoke:brief-render      sleutels, met 9 tot 32 asserties. Horen in de
#   smoke:db-ssl-mode       goedkope groep in run-guards.sh, niet hier.
#   smoke:source-image-matcher
#   smoke:voice-baseline
#   smoke:web-page-builder  slagen tegen een ONBEREIKBARE database, met 1893
#   smoke:deep-research     resp. 31 asserties. Raken de database dus niet.
#
# De toets die dit uitwees: wijs DATABASE_URL naar een onbereikbare host in
# plaats van hem weg te strippen. Wegstrippen werkt niet — `.env.local` bevat
# zelf een DATABASE_URL en npm laadt die terug. Een reeds gezette variabele
# wint wél van --env-file.
#
# Ook niet hier: smoke:competitor-activities en smoke:competitor-content-discovery.
# Die hebben naast een database ook API-sleutels nodig; zelfde groep als seo-wiring.
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
  smoke:lp-retention:45
  smoke:knowledge-context:8
  smoke:context-priority:9
  smoke:geo-fidelity:19
  smoke:review-drift-reset:14
  smoke:styleguide-rules-fval:16
  smoke:settings-write:18
  # ── toegevoegd 2026-08-19 uit de weesbewaker-triage (tasks/weesbewakers-triage) ──
  # Negen bewakerbestanden zonder npm-script. Ze bestonden, waren groen en
  # draaiden nergens, omdat elke telling package.json leest en een bestand
  # zonder script daar niet in staat. Samen 153 asserties, 36s.
  # Gemeten op een GESEEDE database (zie de waarschuwing bovenaan) en twee keer
  # achter elkaar gedraaid zonder herseeden: idempotent.
  smoke:brandclaw-data:27
  smoke:brandclaw-orchestrator:27
  smoke:content-library-readiness:38
  smoke:content-locale-foundation:12
  smoke:content-locale-picker:8
  smoke:internal-findings:14
  smoke:learning-loop:5
  smoke:strategy-analyst:9
  smoke:visual-brief-readiness:2
  # agents-foundation dekt lib/agents/registry, run-agent, artifact-contract en
  # echo-test — code die op productie draait en tot 19-08 geen enkele bewaker in
  # een gate had. Hij zet zelf een ANTHROPIC_API_KEY-plaatsvervanger als die
  # ontbreekt; zie de toelichting in het bestand waarom dat veilig en kosteloos
  # is, en waarom die plaatsvervanger NIET hier op gate-niveau hoort.
  smoke:agents-foundation:12
  # agents-data-analyst toetst tenant-isolatie: de data-analyst van workspace A
  # mag geen rijen van B zien. Kon tot 19-08 nergens draaien omdat hij twee
  # dev-workspaces op naam zocht. Nu op slug uit de seed, met een tweede
  # gevulde workspace zodat de isolatie iets te vergelijken heeft.
  smoke:agents-data-analyst:21
)

# ── Hoe asserties geteld worden ─────────────────────────────────────────────
#
# Letterlijk overgenomen uit run-guards.sh, bewust niet opnieuw bedacht: twee
# varianten van dezelfde telling lopen gegarandeerd uit elkaar.
#
# Twee vormen. De meeste bewakers printen één regel per assertie (`✓ ...`), maar
# sommige printen alléén een samenvatting (`65 passed, 0 failed`). Een telling op
# regels geeft daar 1, en een ondergrens van 1 beschermt niets. Neem daarom het
# MAXIMUM van beide. Onderrapporteren is hier gevaarlijker dan overrapporteren:
# een te lage ondergrens leest als dekking die er niet is.
tel_asserties() {
  local log="$1" per_regel samenvatting
  per_regel=$(grep -cE "✓|✔|PASS|OK |passed|geslaagd" "$log")
  samenvatting=$(grep -oiE "[0-9]+ ?(/ ?[0-9]+)? *(passed|pass\b|checks|geslaagd)" "$log" \
    | grep -oE "^[0-9]+" | sort -rn | head -1)
  samenvatting=${samenvatting:-0}
  if [ "$samenvatting" -gt "$per_regel" ]; then echo "$samenvatting"; else echo "$per_regel"; fi
}

# ── Ondergrenzen ────────────────────────────────────────────────────────────
#
# Gemeten 2026-08-19 op een VERSE SEED, en met de bestanden uit `origin/main` in
# plaats van uit de werkboom. Dat laatste is niet pedant: de main-worktree liep
# 15 commits achter, kende de nieuwe npm-scripts niet, en `npm run` op een
# ontbrekend script gaf stil niets — waardoor tien bewakers als "0 asserties"
# uit de meting kwamen. Wie deze grenzen herijkt: draai de bestanden, niet de
# scripts, of werk eerst je worktree bij.
#
# De grens ligt iets onder het gemeten aantal, zodat een enkele toegevoegde of
# verwijderde assertie de gate niet rood maakt maar een instorting wél.

log_dir=$(mktemp -d)
trap 'rm -rf "$log_dir"' EXIT

failed=()
for entry in "${GUARDS[@]}"; do
  g="${entry%:*}"
  drempel="${entry##*:}"
  printf '→ %s\n' "$g"
  log="$log_dir/$(printf '%s' "$g" | tr ':' '_').log"

  npm run "$g" --silent > "$log" 2>&1
  code=$?
  asserts=$(tel_asserties "$log")

  if [ "$code" -ne 0 ]; then
    cat "$log"
    printf '  ✗ %s (exit %s)\n' "$g" "$code"
    failed+=("$g (exit $code)")
  elif [ "$asserts" -lt "$drempel" ]; then
    cat "$log"
    printf '  ✗ %s — groen, maar %s asserties waar er >=%s werden verwacht\n' "$g" "$asserts" "$drempel"
    failed+=("$g (${asserts} asserties, ondergrens ${drempel})")
  else
    printf '  ✓ %s (%s asserties)\n' "$g" "$asserts"
  fi
done

echo
echo "── ${#GUARDS[@]} db-bewakers gedraaid, ${#failed[@]} gefaald ──"
if [ "${#failed[@]}" -gt 0 ]; then
  printf '  ✗ %s\n' "${failed[@]}"
  exit 1
fi
echo "  alle db-bewakers groen"
