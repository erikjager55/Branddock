#!/usr/bin/env bash
# run-guards — draait de goedkope, deterministische bewakers en meldt ze allemaal.
#
# WAAROM DIT BESTAAT: op 2026-08-19 bleek dat van de 85 smoke-/eval-scripts in
# package.json er maar DRIE in een workflow stonden. De andere 82 bestonden wel,
# maar draaiden nooit — waaronder guards die speciaal waren gebouwd nadat er iets
# stil was misgegaan. Een bewaker die niet draait is geen bewaker.
#
# Deze lijst bevat alleen scripts die aantoonbaar zonder database, API-sleutels of
# browser draaien: elk is in een schone omgeving (`env -u DATABASE_URL -u
# *_API_KEY`) gedraaid en kwam groen terug, elk binnen een seconde. Samen ~10s.
#
# Bewust GEEN fail-fast: bij een rode CI wil je alle kapotte bewakers in één keer
# zien, niet één per run.
#
# Toevoegen? Draai 'm eerst in een schone omgeving. Faalt hij daar op een
# ontbrekende DATABASE_URL, dan hoort hij hier niet — die groep wacht op een
# aparte job met een database.
set -uo pipefail

GUARDS=(
  smoke:provenance-consumption
  smoke:hero-clobber-guard
  smoke:i18n-namespaces
  smoke:lp-generation-abort
  smoke:prompt-contracts
  smoke:image-defaults
  smoke:image-briefing
  smoke:inline-edit
  smoke:ad-encryption
  smoke:icon-registry
  smoke:golden-set-drift
  smoke:review-drift
  smoke:styleguide-rules
  smoke:brandstyle-typography
  smoke:pagerender-parity
  smoke:feature-visual-gate
  smoke:judge-image-prep
  smoke:design-sync-drift
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
echo "── ${#GUARDS[@]} bewakers gedraaid, ${#failed[@]} gefaald ──"
if [ "${#failed[@]}" -gt 0 ]; then
  printf '  ✗ %s\n' "${failed[@]}"
  exit 1
fi
echo "  alle bewakers groen"
