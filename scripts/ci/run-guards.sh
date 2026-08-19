#!/usr/bin/env bash
# run-guards — draait de goedkope, deterministische bewakers en meldt ze allemaal.
#
# WAAROM DIT BESTAAT: op 2026-08-19 bleek dat van de 78 smoke-/eval-scripts in
# package.json er maar DRIE in een workflow stonden. De andere 75 bestonden wel,
# maar draaiden nooit — waaronder guards die speciaal waren gebouwd nadat er iets
# stil was misgegaan. Een bewaker die niet draait is geen bewaker.
#
# (78 = 75 `smoke:` + 3 `eval:`, geteld uit package.json. Eerdere versies van deze
# kop noemden 85 en 77: 85 telde de acht `test:`-scripts mee, waarvan `test:e2e` en
# `test:csp` juist wél draaiden, en 77 zat er één naast.)
#
# Bewust GEEN fail-fast: bij een rode CI wil je alle kapotte bewakers in één keer
# zien, niet één per run.
#
# ── Hoe je een kandidaat toetst ──────────────────────────────────────────────
#
# ⚠️ NIET met `env -u VAR`. Vijf van de 78 scripts starten met
# `--env-file-if-exists=.env.local`, en dat bestand bevat zowel DATABASE_URL als
# de API-sleutels: unsetten laat node ze gewoon terugladen en je meet mét, terwijl
# je denkt van niet. Zet de variabele op een ONBRUIKBARE WAARDE — een reeds
# gezette variabele wint wél van --env-file. Zie gotchas.md 2026-08-19.
#
# ⚠️ EN "GROEN" IS NIET GENOEG. smoke:settings-write kwam groen terug zonder iets
# te toetsen (exit 0 bij een ontbrekende SMOKE_DB=1). Tel assertie-regels, niet
# uitkomsten. Daarom draagt elke bewaker hieronder een ondergrens, en faalt de
# gate als een bewaker groen wordt met minder asserties dan verwacht. Zonder die
# ondergrens is dit script niet meer dan een dure manier om exit 0 te lezen.
set -uo pipefail

# ── Waarom hier een dode DATABASE_URL staat ──────────────────────────────────
# 71 van de 78 scripts laden zelf geen env-file. Staat DATABASE_URL niet in de
# omgeving, dan crasht `src/lib/prisma.ts` al bij het importeren — nog vóór er één
# assertie draait. Dat liet elf bewakers met samen 2.315 asserties onterecht als
# "heeft een database nodig" gelden; ze hebben alleen een GEZETTE variabele nodig.
#
# De waarde wijst naar een dode poort, niet naar een echte database: raakt een
# bewaker de DB tóch aan, dan valt hij luid om in plaats van stil iets te doen op
# een echte database. Gemeten dat dit het gedrag van de oorspronkelijke 18
# bewakers niet verandert — zelfde exit-codes, zelfde assertie-aantallen.
export DATABASE_URL="${DATABASE_URL:-postgresql://nobody:x@127.0.0.1:59999/geen-db-in-deze-gate}"
export DIRECT_URL="${DIRECT_URL:-$DATABASE_URL}"

# "bewaker:ondergrens" — de ondergrens is het gemeten aantal assertie-regels met
# marge naar beneden. Hij hoeft niet exact te zijn; hij moet een bewaker vangen
# die opeens niets meer toetst.
GUARDS=(
  smoke:provenance-consumption:10
  smoke:hero-clobber-guard:25
  smoke:i18n-namespaces:1
  smoke:lp-generation-abort:12
  smoke:prompt-contracts:250
  smoke:image-defaults:18
  smoke:image-briefing:9
  smoke:inline-edit:24
  smoke:ad-encryption:12
  smoke:icon-registry:1
  smoke:golden-set-drift:5
  smoke:review-drift:20
  smoke:styleguide-rules:45
  smoke:brandstyle-typography:60
  smoke:pagerender-parity:24
  smoke:feature-visual-gate:20
  smoke:judge-image-prep:7
  smoke:design-sync-drift:40

  # Aangesloten 2026-08-19. Deze elf golden als "heeft een database nodig", maar
  # dat was een meetfout: ze crashten op een ONTBREKENDE DATABASE_URL, niet op een
  # onbereikbare. Twee identieke runs, samen ~17s.
  eval:lp-variant-golden:12
  smoke:deep-research:28
  smoke:geo-analysis:13
  smoke:geo-blogposting-jsonld:24
  smoke:geo-directives:12
  smoke:geo-polish:12
  smoke:heuristics-locales:45
  smoke:lp-text-quality:45
  smoke:mcp-toolset:5
  smoke:page-types:170
  smoke:web-page-builder:1800

  # Aangesloten 2026-08-19 ná reparatie. Beide draaiden nergens en waren daardoor
  # bevroren: geo-generation-prompt eiste een prompt-tekst die in juni bewust was
  # vervallen, en locale hield 30 gratis asserties gevangen achter twee live
  # AI-calls (nu opt-in via SMOKE_AI=1).
  smoke:geo-generation-prompt:14
  smoke:locale:28

  # Stond geclassificeerd als netwerk-bewaker om de URL's in zijn broncode
  # (`images.pexels.com`, `pub-test.r2.dev`). Dat zijn testdata: beide
  # fetch-aanroepen zitten achter SMOKE_R2=1. Zonder die vlag draait hij 16
  # checks pure logica en nul netwerk.
  smoke:storage-url-expiry:14
)

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
  asserts=$(grep -cE "✓|✔|PASS|OK |passed|geslaagd" "$log")

  if [ "$code" -ne 0 ]; then
    cat "$log"
    printf '  ✗ %s (exit %s)\n' "$g" "$code"
    failed+=("$g (exit $code)")
  elif [ "$asserts" -lt "$drempel" ]; then
    cat "$log"
    printf '  ✗ %s — groen, maar %s asserties waar er >=%s werden verwacht\n' \
      "$g" "$asserts" "$drempel"
    failed+=("$g (${asserts} asserties, ondergrens ${drempel})")
  else
    printf '  ✓ %s (%s asserties)\n' "$g" "$asserts"
  fi
done

echo
echo "── ${#GUARDS[@]} bewakers gedraaid, ${#failed[@]} gefaald ──"
if [ "${#failed[@]}" -gt 0 ]; then
  printf '  ✗ %s\n' "${failed[@]}"
  echo
  echo "Een bewaker die groen is met te weinig asserties is GEEN geslaagde run:"
  echo "hij heeft waarschijnlijk zijn voorwaarde niet gevonden en is stil"
  echo "afgehaakt. Zoek uit wat hij oversloeg voordat je de ondergrens verlaagt."
  exit 1
fi
echo "  alle bewakers groen"
