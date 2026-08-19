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

  # Aangesloten 2026-08-19. Stond in geen enkele workflow, en dat was geen
  # bewuste keuze: run-db-guards.sh verwijst hem door met "goedkope groep in
  # run-guards.sh, niet hier" — de doorverwijzing was geschreven, de landing niet.
  # Puur: geen database, geen sleutels, geen netwerk (0,3s). Bewaakt dat de
  # sslmode-semantiek van pg expliciet blijft; ná de pg-major betekent dezelfde
  # `require`-string versleuteld ZONDER certificaat- en hostnaamcontrole.
  smoke:db-ssl-mode:30

  # Faalt bij VERGETEN, niet bij toevoegen: wie een publieke pagina bouwt en hem
  # niet indeelt, krijgt hier rood in plaats van stil lang="en" op Nederlandse
  # tekst (de bug van #335). Leest de bestandsboom, niet een lijst.
  smoke:route-language:44

  # Sluit de wortel van de hele slapende-bewakers-survey: `package.json` is niet
  # langer de bron van waarheid voor "welke bewakers bestaan er" — de
  # BESTANDSLIJST is dat. Een nieuw bestand in scripts/smoke-tests/ of
  # scripts/eval/ dat nergens draait, maakt CI rood.
  #
  # Zijn eerste bevinding was hijzelf: hij stond nog niet in deze lijst.
  smoke:guard-wiring:3

  # ── 28 bewakers waarvan MIJN EIGEN label fout was ─────────────────────────
  # Bij het opstellen van NIET_AANGEHAAKT (#419) heb ik 51 redenen ingevuld,
  # deels afgeleid uit eerdere classificaties en deels uit de bestandsnaam.
  # Daarna nagemeten door ze allemaal te draaien met een dode DATABASE_URL en
  # onbruikbare sleutels: **38 van de 51 kwamen groen terug**. De labels
  # "database" en "sleutel" klopten voor de meerderheid niet.
  #
  # Dat is precies waarom een onbewezen label niet in een schuldlijst hoort: hij
  # ziet er compleet uit en niemand toetst hem meer.
  #
  # Ook gecontroleerd op stil overslaan — groen zonder database kan óók betekenen
  # dat een bewaker een deel wegslaat. Twee treffers op "overgeslagen" bleken
  # ASSERTIE-NAMEN te zijn ("sectie zonder props wordt overgeslagen"), dezelfde
  # vals-positieve als een eerdere scan op datzelfde woord. Geen stille
  # overslaan-paden gevonden.
  #
  # De 10 junireeks-wezen zijn hier bewust NIET bij: hun label "gedekt door de
  # ketting" gaat over redundantie, niet over of ze draaien.
  smoke:preserve-user-rows:40
  smoke:content-library-ingest:40
  smoke:rule-violation-stats:40
  smoke:seo-context:38
  smoke:brand-library:33
  smoke:security-residual:33
  smoke:page-seo-metadata:32
  smoke:lp-assistant-edits:29
  smoke:voice-baseline:29
  smoke:brief-render:28
  smoke:brandstyle-provenance:27
  smoke:geo-discovery:27
  smoke:image-coupling:23
  smoke:page-derived-meta:23
  smoke:geo-longform-schema:22
  smoke:geo-panel:22
  smoke:geo-longform-render:18
  smoke:geo-puck-renderable:17
  smoke:geo-optimization-goals:16
  smoke:guard-hooks:16
  smoke:geo-author-profile:15
  smoke:ad-creative-validation:14
  smoke:brand-manifest-golden:13
  smoke:brand-font-substitutes:12
  smoke:geo-claw-gate:11
  smoke:source-image-matcher:10
  smoke:claw-security:8
  smoke:brandstyle-golden:3

  # ── De laatste 10 junireeks-wezen ─────────────────────────────────────────
  # Ze stonden als "gedekt door de ketting" op de schuldlijst — een claim die op
  # MODULE-overlap rustte, en ik schreef er zelf bij dat dat geen GEDRAGS-overlap
  # is. Toen ik de koppeling uitwerkte bleek die waarschuwing terecht:
  #
  #   phase40 toetst "Zwarthout brand is NIET Branddock-teal"  (cross-brand-lek)
  #   phase53 toetst contrastverhoudingen op hero-elementen    (≥3:1 / ≥4,5:1)
  #   phase54 toetst spacing-ondergrenzen per archetype
  #
  # Dat de ketting dezelfde module áánraakt, zegt over dat gedrag niets. Ze als
  # verwijder-kandidaat laten staan op een ongemeten claim is de verkeerde kant
  # van de fout: redundante dekking kost twee seconden, een ten onrechte
  # verwijderde bewaker kost een regressie.
  #
  # Wie ze alsnog wil opruimen, leest eerst per paar wát het kettinglid met
  # diezelfde module toetst. Die leesbeurt heeft niemand gedaan.
  smoke:wpb-accent-reservation:21
  smoke:wpb-lp-contrast:19
  smoke:wpb-brand-fallback-no-leak:18
  smoke:wpb-band-alternation:17
  smoke:wpb-button-reconcile:15
  smoke:wpb-font-assets:12
  smoke:wpb-card-context:11
  smoke:wpb-variant-angle:8
  smoke:wpb-feature-images:7
  smoke:wpb-lp-rhythm:5

  # ── Weesbestanden, aangehaakt 2026-08-19 ───────────────────────────────────
  # Deze drie hadden geen npm-script en waren daardoor ONZICHTBAAR voor de survey:
  # die telde scripts in package.json, niet bestanden op schijf. `ssrf-guard` is
  # gecommit als onderdeel van een SSRF-fix (faf2dbe6, 30-06) en heeft sindsdien
  # nooit gedraaid — 65 asserties op een beveiligingsoppervlak.
  #
  # ⚠️ Ze printen alléén een samenvatting ("65 passed, 0 failed"), geen regel per
  # assertie. Een telling op regels gaf hier 1; vandaar de tel_asserties-functie
  # hierboven. Zonder die correctie zouden hun ondergrenzen 1 zijn geweest, en dat
  # beschermt niets.
  smoke:ssrf-guard:60
  smoke:security-medium:6
  smoke:brand-name-caps:7

  # ── De resterende 25 weesbestanden, aangehaakt 2026-08-19 ──────────────────
  # Uit de triage van #400: 73 bewakerbestanden hebben geen npm-script en waren
  # daardoor onzichtbaar voor een telling die `package.json` leest. Deze 25
  # draaien groen zonder database, sleutels of netwerk — samen 481 asserties.
  #
  # Vóór het aanhaken gedaan, want aanhaken is niet neutraal (gotcha 19-08):
  #  · elk bestand gedraaid met een dode DATABASE_URL en onbruikbare sleutels
  #  · een detector losgelaten die zoekt of `src/` ná de bewaker is bewogen op
  #    een gepinde frase — 13 treffers, vrijwel allemaal ruis (generieke woorden
  #    en fixture-data die de bewaker zelf aanmaakt). Voor GROENE bewakers heeft
  #    die detector lage opbrengst: een groene assertie matcht per definitie de
  #    huidige code, dus de bevriezingsvorm uit #375 kan er niet spelen. Hij is
  #    bedoeld voor de 18 RODE wezen uit #400, en daar hoort hij ook thuis.
  #
  # ⚠️ `brandmd-emitter` en `brandmd-lifecycle` staan bewust op 1. Ze zijn
  # fail-fast: elke fout doet meteen `process.exit(1)` en bij succes printen ze
  # één samenvattingsregel ZONDER getal, dus er valt niets te tellen. Nagekeken
  # dat ze geen enkel overslaan-pad hebben (geen env-gate, geen vroege return),
  # en dáárom is hun exit-code hier het echte signaal. Lees die 1 niet als een
  # vergeten ondergrens.
  smoke:deliverable-content-accessor:48
  smoke:competitor-diff-engine:42
  smoke:photography-token-truncation:30
  smoke:property-evals:28
  smoke:sanitize-strategy-output:27
  smoke:feature-visual-prompts:27
  smoke:heuristic-stem-variants:22
  smoke:plan-and-solve:22
  smoke:section-edit-synthetic-ids:21
  smoke:feature-visual-preserve:18
  smoke:apify-fallback-chain:17
  smoke:auto-iterate:17
  smoke:edit-distance:16
  smoke:tree-of-thoughts-angles:16
  smoke:position-swap-judge:14
  smoke:feedback-compiler:12
  smoke:violation-dedup:10
  smoke:brand-language-detect:9
  smoke:claw-fencing:9
  smoke:agent-schedule-cadence:9
  smoke:plan-enforcement:5
  smoke:compose-pipeline-gemini:2
  smoke:ui-content-locale-separation:2
  smoke:brandmd-emitter:1
  smoke:brandmd-lifecycle:1

  # De enige van de 18 RODE wezen met een echt verouderde assertie. Hij eiste de
  # Nederlandse zin "Workspace heeft 3 persona(s)", die op 2026-06-17 bewust naar
  # het Engels is vertaald (35097c25). Twee maanden ongezien rood. Nu getoetst op
  # gedrag in plaats van op de zin — zie de noot in het bestand zelf.
  smoke:checkpoint-gates:40

  # ── De junireeks: 17 van de 27, aangehaakt 2026-08-19 ──────────────────────
  # `smoke:web-page-builder` ketent 55 phase-bestanden aan elkaar, maar dat is een
  # ANDERE serie met dezelfde nummers: de ketting heeft phase45-typescale-normalizer
  # (augustus), de wezen phase45-result-audit (5 juni). De junireeks 40-68 is nooit
  # aan die ketting toegevoegd.
  #
  # Welke daarvan echte dekking dragen is mechanisch bepaald in plaats van per
  # bestand beoordeeld: de imports van de 55 kettingleden afgetrokken van die van
  # de 27 wezen. Uitkomst — 10 wezen raken UITSLUITEND modules die de ketting al
  # dekt (verwijder-kandidaten, staan in het task-file), en deze 17 raken modules
  # die NERGENS anders getoetst worden:
  #
  #   lib/brandstyle/color-pairings        lib/brandstyle/analysis-engine
  #   lib/brandstyle/palette-usage-filter  lib/brandstyle/non-brand-colors
  #   lib/brandstyle/observed-color-pairings  lib/brandstyle/css-var-resolver
  #   lib/brandstyle/framework-defaults    lib/brandstyle/google-fonts-catalog
  #   lib/landing-pages/brand-images       features/../useBrandFontLoader
  #
  # Dat is de brandstyle-palet-stack, die op productie draait.
  #
  # Vóór het aanhaken door de drift-detector gehaald — juni-bewakers op een stack
  # die in augustus is verbouwd (#255-#259) is precies het risicoprofiel. 8 van 55
  # frases hadden een latere src-wijziging, allemaal fixture-namen ('Ocean Blue')
  # of generieke woorden. Alle 17 draaien groen, samen 401 asserties.
  smoke:wpb-result-audit:54
  smoke:wpb-cross-brand-palette:35
  smoke:wpb-cta-visibility:29
  smoke:wpb-hero-url-wiring:28
  smoke:wpb-variant-count:26
  smoke:wpb-usage-filter:22
  smoke:wpb-framework-no-usage:20
  smoke:wpb-primary-from-signal:19
  smoke:wpb-framework-defaults:18
  smoke:wpb-brand-images-split:18
  smoke:wpb-observed-pairings:17
  smoke:wpb-var-resolution:16
  smoke:wpb-color-pairings:15
  smoke:wpb-fidelity-race:14
  smoke:wpb-lp-fonts:10
  smoke:wpb-recompute-observed:9
  smoke:wpb-variant-copy-diff:8
)

# ── Hoe asserties geteld worden ─────────────────────────────────────────────
#
# Twee vormen, en de tweede kostte bijna een vals oordeel. De meeste bewakers
# printen één regel per assertie (`✓ ...`), maar sommige printen alléén een
# samenvatting: `SSRF-guard: 65 passed, 0 failed`. Een telling op regels gaf daar
# **1** terwijl er 65 toetsen draaien — en een ondergrens van 1 beschermt niets.
#
# Daarom: neem het MAXIMUM van (a) het aantal assertie-regels en (b) het getal uit
# een samenvattingsregel. Onderrapporteren is hier gevaarlijker dan overrapporteren:
# een te lage ondergrens leest als dekking die er niet is.
tel_asserties() {
  local log="$1" per_regel samenvatting
  per_regel=$(grep -cE "✓|✔|PASS|OK |passed|geslaagd" "$log")
  # `65 passed` / `8 pass` / `14/14 checks` / `97 checks groen` / `9 passed (5.0s)`
  samenvatting=$(grep -oiE "[0-9]+ ?(/ ?[0-9]+)? *(passed|pass\b|checks|geslaagd)" "$log" \
    | grep -oE "^[0-9]+" | sort -rn | head -1)
  samenvatting=${samenvatting:-0}
  if [ "$samenvatting" -gt "$per_regel" ]; then
    echo "$samenvatting"
  else
    echo "$per_regel"
  fi
}

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
