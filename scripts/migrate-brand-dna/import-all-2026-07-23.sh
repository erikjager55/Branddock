#!/usr/bin/env bash
# =============================================================================
# All-in-one prod-import van de 8 offline workspaces (peildatum 2026-07-23).
# Loopt de BEWEZEN import.ts over alle bundles + doet de nazorg (contenttaal +
# styleguide publiceren) in één run. Erik draait dit — Claude heeft geen
# prod-DB-toegang. Volledige context: tasks/workspaces-online-migratie.md
#
# VOORAF (in de app — GEEN terminal):
#   Maak de 8 workspaces aan (namen als hieronder). De app leidt de slug van de
#   naam af; matcht die niet, dan meldt de dry-run dat en zet je het prod-
#   workspace-id in de mapping (het `ref`-veld begint met 'cm').
#
# DRAAIEN (2 commando's):
#   export PROD_URL="postgresql://<user>:<pw>@<host>/<db>?sslmode=require"   # DIRECTE (unpooled) Neon-URL
#   bash      scripts/migrate-brand-dna/import-all-2026-07-23.sh            # 1) DRY-RUN — schrijft niets
#   GO=1 bash scripts/migrate-brand-dna/import-all-2026-07-23.sh            # 2) ECHT — import + nazorg
#
# Als de ECHTE run afketst op een host-mismatch: kopieer de host uit de dry-run
# ('[import] DB-host=…') en draai met CONFIRM_HOST=<die-host> ervoor.
# =============================================================================
set -uo pipefail

: "${PROD_URL:?Zet PROD_URL naar de prod Neon DIRECTE (unpooled) URL}"
HOST="${CONFIRM_HOST:-$(printf '%s' "$PROD_URL" | sed -E 's#^[^@]*@([^:/?]+).*#\1#')}"
BDIR=scripts/migrate-brand-dna/bundles
DATE=2026-07-23
GO="${GO:-0}"

# ref | bundle-slug | contentLanguage (leeg = niet zetten, want en = default)
#   ref = de workspace-slug op prod, OF een prod-workspace-id (begint met 'cm')
# Ids vastgelegd 2026-07-23 uit de prod-dry-run (typo-proof; slug van Zwarthout
# werd op prod 'zarthout'). Napking was niet aangemaakt → aparte regel onderaan.
ROWS=(
  "cmrxl2faq000004jp4miaax1r|linfi|nl"              # Linfi
  "cmrxl2nlh00000akvjbkzzwr8|dts-ede|"             # DTS Ede
  "cmrxl31lc00000akj853tz94l|zwarthout|nl"          # Zwarthout (prod-slug 'zarthout')
  "cmrxl3n7q000p0akj9a9shatr|goed-bouw|nl"          # Goed-Bouw
  "cmrxl3vos001e0akjds3y73u0|partnerselect|"        # PartnerSelect
  "cmrxl41sm00230akjshqksl17|het-nieuwe-golfen|"    # Het Nieuwe Golfen
  "cmrxl45y7000004jj89ex6cxo|wra-juristen|nl"       # WRA Juristen
  "cmrxm1i2g000004l8zg759cqi|napking|nl"            # Napking (later aangemaakt + apart geïmporteerd)
)

echo "== prod-host: $HOST  |  modus: $([ "$GO" = 1 ] && echo 'ECHT (schrijft naar prod)' || echo 'DRY-RUN (schrijft niets)') =="

ok=0; fail=0; failed=()
for row in "${ROWS[@]}"; do
  IFS='|' read -r ref bslug lang <<<"$row"
  bundle="$BDIR/$bslug-$DATE.json"
  if [[ "$ref" == cm* ]]; then sel=(--workspace-id "$ref"); else sel=(--slug "$ref"); fi
  echo; echo "==================== $ref ===================="

  if [ ! -f "$bundle" ]; then echo "  ! bundle ontbreekt: $bundle"; fail=$((fail+1)); failed+=("$ref"); continue; fi

  if [ "$GO" = 1 ]; then
    if DATABASE_URL="$PROD_URL" npx tsx scripts/migrate-brand-dna/import.ts "$bundle" "${sel[@]}" --confirm-host "$HOST"; then
      DATABASE_URL="$PROD_URL" npx tsx scripts/migrate-brand-dna/nazorg.ts "${sel[@]}" ${lang:+--lang "$lang"} --publish \
        || echo "  ! nazorg (taal/publish) mislukt voor $ref — handmatig in de app afronden"
      ok=$((ok+1))
    else
      fail=$((fail+1)); failed+=("$ref")
    fi
  else
    if DATABASE_URL="$PROD_URL" npx tsx scripts/migrate-brand-dna/import.ts "$bundle" "${sel[@]}" --dry-run; then
      ok=$((ok+1))
    else
      fail=$((fail+1)); failed+=("$ref")
    fi
  fi
done

echo
echo "== KLAAR: $ok ok, $fail mislukt ${failed[*]:+(${failed[*]})} =="
[ "$GO" = 1 ] || echo "== Dit was een DRY-RUN. Klopt alles? Draai opnieuw met:  GO=1 bash $0 =="
