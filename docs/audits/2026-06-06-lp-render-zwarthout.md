# LP-render verbeterplan — Zwarthout (Medium-renderer)

> Bron: gegenereerde landingspagina (web-page-builder "Medium") voor klant zwarthout.com.
> Onderzoek: 2 workflows / 6 dimensies (`w6s2kowv7` + `w55id9mg1`), adversarieel.
> Brand-tokens: PRIMARY Burnt Orange #E06000, NEUTRAL tekst Deep Charcoal #212529, surface Soft White #F8F9FA.

## Visuele defecten (screenshot)
1. Hero-kop wit-op-licht (~1,07:1) — onleesbaar.
2. Feature-cards: oranje koppen (OK) maar donkere body op zwart — onleesbaar.
3. Overmatige witruimte / schaarse ritmiek.
4. Geen enkel beeld op een hout-/architectuur-pagina.
5. Generieke `system-ui`-typografie, vlakke hiërarchie.
6. Brand-fit-check meldde "2 issues" maar miste de contrast-faal.

## Root-causes + tracks

### Track 1 — Contrast (KRITIEK) ✅ GEBOUWD
Eén bug-klasse: gescrapte per-rol tekstkleuren toegepast zónder her-check tegen de WERKELIJK gerenderde achtergrond. Hero-h1 (`puck-config.tsx`) nam zwarthout's gescrapte witte kop op de licht-gecorrigeerde surface; card-body checkte tegen `tokens.surface` (licht) i.p.v. de echte zwarte card-bg; testimonial oranje-op-perzik zonder clamp. **Fix**: `resolveOnColor(fg, echte-bg, {fallback, minRatio})` in `wcag.ts` (puur/testbaar), toegepast op hero h1/sub, card h3/body, testimonial-quote — display/kop 3.0 (AA-large, houdt merk-oranje), body 5.0. Smoke `phase53` 17/17.

### Track 3 — Typografie laadt niet (HOOG) ✅ GEBOUWD
zwarthout heeft wél een DISPLAY-font ("Sen Bold") + body Roboto, maar beide laadden niet: (a) de canvas-loader behandelde 'roboto' als system → nooit geladen (Roboto staat alleen op Android); (b) de weight-suffix-naam "Sen Bold" werd bij Google opgevraagd terwijl de family "Sen" is → fallback naar system-ui. **Fix**: `stripFontWeightSuffix` in `brand-tokens.wrapFontStack` ("Sen Bold"→"Sen") + 'roboto' uit `SYSTEM_FONTS` + weight-strip in de loader. Smoke `phase55` 11/11.
**Resteert (algemeen, niet zwarthout-blokkerend)**: E-1 per-rol `fontFamily` (display vs body family-fidelity wordt bij `toRoleEntry` weggegooid) + E-3 de canvas-loader Adobe-Typekit-bewust maken (gebruik de gedeelde `font-loading.ts` i.p.v. Google-only) — voor merken met Adobe/geüploade fonts.

### Track 4 — Ritmiek/witruimte (MEDIUM) ✅ GEBOUWD
`sectionPaddingY` las `designSystem.spacing[5]`=64px voor MINIMAL/EXPERIENTIAL → 128px lege band/sectie; hero geforceerd op 100vh met schaarse content; final-CTA in 2 gepadde secties. **Fix**: clamp ALLÉÉN de preset-fallback naar [40,56] (gescrapte waarde passeert ongeclampt); 100vh alleen bij een echte hero-image (anders content-grootte); final-CTA-kop als native `heading`-prop IN de CTA-sectie. Smoke `phase54` 5/5.

### Track 5 — Contrast-gate (verdediging) — GROTENDEELS GEDEKT door Track 1
De "Brand-fit check" is de vision-*vibe*-judge (max 3), géén WCAG; de enige WCAG-check valideert abstracte token-paren (nooit gerenderde combinaties) én is niet bedraad. **Track 1's `resolveOnColor` garandeert nu render-time leesbaarheid op de gefixte plekken** (de `phase53`-invariant bewijst dat). Een volledige tree-walking per-blok-gate (catch nieuwe/toekomstige plekken) is een gedeferde defense-in-depth-enhancement.

### Track 2 — Beeld rendert niet (HOOG) — GEBLOKKEERD voor zwarthout (geen bron)
Verdict: (i) het variant-schema heeft géén beeld-slots behalve `hero.heroVisualUrl` (placeholder; AI geeft null) + (ii) feature-cards hebben géén beeld-veld. **MAAR: zwarthout's `brandImages` is `null`** — er zijn geen gescrapte foto's om te plaatsen, en de hero-gen (`generateCanvasVisual`, fire-and-forget op variant-keuze) is de énige bron. De hero-gen vuurt + surfacet fouten al; het is een timing/AI-gen-betrouwbaarheids-kwestie, geen render-bug. **Beslispunt voor de klant**: zwarthout heeft beeld-bron nodig (AI-generatie laten werken/afwachten, óf beelden uploaden/scrapen) vóór render-infra zin heeft. **Generaliseerbare infra (te bouwen voor beeld-hebbende merken)**: `featureItem.imageUrl`-slot + `<img>` in FeatureGrid + map uit `brandImages` (round-robin) + hero-`brandImages`-fallback. Bouwt geen zichtbaar resultaat op zwarthout (geen bron) maar is de juiste capaciteit.

### Track 6 — Donker-sectie-fidelity (DIEPER, extractie-kant) — GESCOPED
De scraper tagde zwarthout's donkere hero/footer niet als `usage:hero-bg`/`section-bg` → `hasDarkSections=false` → renderer forceert een lichte hero i.p.v. de cinematische donkere. Upstream extractie-fix (scraper donker-sectie-detectie) + re-scrape-validatie. Hoogste fidelity-payoff ná contrast/beeld, maar apart subsysteem.

## Status
GEBOUWD + gemerged: Track 1 (contrast), Track 3 (fonts), Track 4 (ritmiek) + Track 5 grotendeels gedekt. Smokes `phase53/54/55`, tsc+lint 0.
RESTEERT: Track 2 (beeld — beslispunt bron + generaliseerbare infra), Track 6 (donker-sectie extractie), E-1/E-3 (typografie-fidelity).
