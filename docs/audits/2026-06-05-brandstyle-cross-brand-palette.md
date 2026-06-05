# Cross-brand audit + verbeterplan — Brandstyle palet & kleurcombinaties

> **Datum**: 2026-06-05 · **Bron**: live runs Zwarthout + Napking + DB-inspectie over ~10 merken. Vervolg op `2026-06-05-brandstyle-palette-framework-cleanup.md` (#279/#280) en de observed-combinaties (`color-pairings` / `observed-color-pairings`). Status: diagnose compleet (DB-bewezen over meerdere merken), plan. Implementatie nog niet gestart.

## 1. Vergelijk: Zwarthout (schoon) vs Napking (vervuild)

| | Zwarthout (na #279/#280) | Napking (nieuw) |
|---|---|---|
| Palet | Burnt Orange (PRIMARY/logo) + Soft White + Deep Charcoal | Deep Charcoal (PRIMARY/freq) + Ocean Blue + **WhatsApp Green** + **WordPress Blue** + **7 grijzen** |
| Ruis weg? | ✅ schoon | ❌ third-party + framework + grijs-clutter |
| Combinaties | observed dark+light, kloppen | bevat `Accentknop`/`Accent op donker` op #008ACF (mogelijk widget-blauw) |

**Waarom Zwarthout wél schoon werd en Napking niet:** Zwarthout's ruis was Bootstrap-defaults, getagd `framework`/`bootstrap` + `unused` → gevangen door de framework-gate + usage-filter. Napking's ruis is **anders van aard**: third-party widget-kleuren (WhatsApp) en WordPress-admin-kleuren die (a) niet `framework`/`bootstrap` getagd zijn en (b) wél renderen (de widget staat op de pagina) → de usage-filter houdt ze. De huidige pijplijn herkent alleen *CSS-framework-defaults*, niet *niet-merk-kleuren* in den brede.

## 2. Kern-oorzaak (DB-bewezen over meerdere merken)

De pijplijn beslist op **rendert het** (usage) + **is het een CSS-framework-default**. Maar "is dit een MERK-kleur?" heeft drie assen, waarvan we er nu maar anderhalf afdekken:

| As | Nu | Gat (cross-brand bewijs) |
|---|---|---|
| **Rendert het** | ✅ usage-filter (multi-page) | — |
| **Brand-herkomst** | ⚠️ alleen CSS-framework (bootstrap/wordpress-tag/hex) | **Third-party widgets + social-shares + admin/system** ontsnappen. peoplemasterminds.com: 8 social-netwerk-kleuren (Facebook/Instagram/LinkedIn/Twitter) als SECONDARY/ACCENT; napking: WhatsApp Green + WordPress Blue. De AI tagt ze al `social`/`whatsapp`/`admin`/`system` — maar niets sluit ze uit. |
| **Distinctief** | ❌ geen | **Neutral-overpopulatie is universeel**: dtsede 10 / betterbrands 9 / nobox 8 / napking 7 / linfi 6 grijzen — veel bijna-identiek (#DDDDDD vs #EEEEEE; #C0C6C1 vs #ABB8C3). Geen perceptuele dedup of cap. |

Plus: **Primary uit frequentie** i.p.v. merk-signaal. Napking heeft een logo (logo-vision) maar de PRIMARY is de meest-frequente donkere (#1A171B), niet de logo-kleur.

## 3. Verbeterplan (cross-brand, geprioriteerd op leverage)

`[DET]` = deterministisch testbaar · `[RE-SCRAPE]` = vergt live run om te valideren.

### Fase 1 — Niet-merk-kleur-uitsluiting: third-party / social / admin `[DET]` `[hoogste leverage]`
**Probleem**: widget/social/admin-kleuren overleven (renderen + niet `framework`-getagd). Raakt élk merk met een chat-widget, social-share-knoppen of WordPress.
**Wijzigingen** — verbreed de "non-brand-origin"-herkenning (in de usage-filter / een nieuwe `non-brand-colors.ts`):
- **Tag-signaal (primair, betrouwbaar — de AI zet ze al)**: een kleur met een tag uit {`social`, `whatsapp`, `messenger`, `intercom`, `facebook`, `instagram`, `twitter`, `linkedin`, `youtube`, `tiktok`, `admin`, `system`, `plugin`, `widget`} is geen merk-kleur → **hard uitsluiten, ongeacht usage** (een prominente WhatsApp-knop is nóg steeds niet de merk-kleur).
- **Known-hex-backstop**: bekende widget/social-hexes (WhatsApp #25D366, Facebook #1877F2/#3B5998, Instagram #E4405F, Twitter #1DA1F2/#55ACEE, LinkedIn #0A66C2/#0976B4, YouTube #FF0000, Messenger #0084FF) + WordPress-admin (#007CBA + bestaande WP-set).
- **Onderscheid van framework-defaults**: framework-defaults worden gedropt *tenzij sterk gebruikt*; widget/social/admin worden **altijd** uitgesloten (ze zijn per definitie niet van het merk).
**Dekt**: WhatsApp Green, WordPress Blue (napking); de 8 social-kleuren (peoplemasterminds); breed.
**Risico**: laag — tag-signaal komt van de AI-classificatie; known-hex is exact. Edge: een merk wiens echte kleur toevallig exact een social-hex is (zeldzaam); de tag is dan meestal niet `social`.

### Fase 2 — Neutral-consolidatie: perceptuele dedup + cap `[DET]`
**Probleem**: 5-10 bijna-identieke grijzen per merk verstoppen het palet.
**Wijzigingen** (na de usage-filter, vóór persist):
- **Perceptuele dedup**: cluster NEUTRALs op kleur-afstand (ΔE of RGB-tolerantie ~24); per cluster behoud de meest-gebruikte (hoogste usage/frequency) als representant.
- **Rol-cap**: behoud max ~4 neutrals met duidelijke functie — donkerste (tekst), lichtste (surface), + 1-2 mid-grijzen (borders/muted) op usage. De rest valt of gaat naar een ingeklapte "extra neutrals".
**Dekt**: de universele grijs-clutter (alle merken).
**Risico**: med — niet een legitieme surface-trap wegvouwen; mitigatie = behoud altijd donkerste + lichtste + de sterkst-gebruikte mid.

### Fase 3 — Framework/admin-hex verbreden `[DET]`
**Probleem**: #007CBA (WordPress `--wp-admin-theme-color`) ontbrak in de framework-hex-set → leakte.
**Wijzigingen**: voeg #007CBA + de volledige WP-admin-theme-palette toe; overweeg detectie via CSS-var-naam (`--wp-admin-theme-color`, `--wp--preset--color--*`) i.p.v. alleen hex. Grotendeels gesubsumeerd door Fase 1 (admin-tag), maar de hex/var-backstop vangt ongetagde gevallen.

### Fase 4 — Primary uit merk-signaal i.p.v. frequentie `[RE-SCRAPE]`
**Probleem**: PRIMARY = meest-frequente donkere kleur; een logo-kleur (echte merk-primary) wint niet altijd.
**Wijzigingen**: wanneer logo-kleur-extractie een dominante kleur levert, geef die voorrang voor de PRIMARY-slot boven een frequentie-afgeleide neutrale donkere. (Napking: logo aanwezig, maar primary = #1A171B uit frequentie.) Sluit aan op de bestaande logo-rescue-gate.

### Fase 5 — Combinaties: widget/admin-kleuren weren `[DET]`
**Probleem**: de observed-combinaties kunnen nog widget-kleuren bevatten (napking `Accentknop` op #008ACF / `Accent op donker`). Na Fase 1 zit de ruis niet meer in het palet → de combinaties (die op het palet mappen) erven dat automatisch. Dunne guard: bouw combinaties alleen uit het gefilterde merk-palet (al zo).
**Dekt**: combinaties volgen Fase 1.

## 4. De overkoepelende regel
Een kleur is een **merk-kleur** als: (1) hij rendert (usage — ✅ al), ÉN (2) hij merk-herkomst heeft (géén framework-default / third-party-widget / social-share / admin — **Fase 1+3**), ÉN (3) hij distinctief is (geen bijna-duplicaat neutral — **Fase 2**). De huidige pijplijn dekt alleen (1) + half (2). Dit plan sluit (2) en (3).

## 5. Aanbevolen volgorde
1. **Fase 1** (widget/social/admin-uitsluiting) — hoogste leverage, raakt élk merk; tag-gedreven dus betrouwbaar.
2. **Fase 2** (neutral-consolidatie) — universele clutter.
3. **Fase 3** (framework/admin-hex) — backstop.
4. **Fase 5** volgt automatisch; **Fase 4** (logo-primary) als refinement, `[RE-SCRAPE]`.

## 6. Validatie
- Per fase: tsc+lint 0 + `[DET]`-smoke (fixture-palet met social/admin-tags → uitgesloten; neutral-cluster → geconsolideerd).
- **Re-scrape Napking + peoplemasterminds + Zwarthout** (regressie): Napking zonder WhatsApp/WordPress-kleuren + ≤4 neutrals; peoplemasterminds zonder de 8 social-kleuren; Zwarthout blijft schoon (geen over-drop).

## 7. Validatie-ronde Napking (2026-06-05, re-scrape #281)
Re-scrape ná `ce774935` bevestigde de cross-brand-cleanup: **WhatsApp-groen + WordPress-admin-blauw weg, Ocean Blue (#008ACF) behouden als ACCENT, dark-mode-combinatie aanwezig** (`#008ACF` op `#200707`, "Accent op donker"). Palet 11 → 7.

**Eén residu-leak**: `#ABB8C3` ("Silver Gray", NEUTRAL / LOW / detectorSource `other`) = het **WordPress/Gutenberg core-default-palet neutraal** ("Cyan bluish gray"). De AI tagt 'm niet `framework`, en de `FRAMEWORK_NEUTRAL_HEXES`-gate dekte alléén de Bootstrap-grijs-schaal → #ABB8C3 omzeilde de sterke-gebruik-lat en overleefde als merk-neutral.

**Fix** (extends #281, `palette-usage-filter.ts`): `#ABB8C3` toegevoegd aan `FRAMEWORK_NEUTRAL_HEXES` (het enige neutrale grijs in het WP-core-palet). Géén blinde blocklist — identiek mechanisme als de Bootstrap-grijzen: de kleur moet de **sterke-gebruik-lat** halen. Bij LOW/`other` valt-ie; een merk dat #ABB8C3 bewust sterk gebruikt behoudt 'm (usage wint van de framework-prior). **Bewust NIET toegevoegd**: WP-accent-defaults (#FF6900 oranje / #CF2E2E rood) — die overlappen merk-banden (cross-brand-les: blokkeer nooit een merk-band-kleur). Smoke `phase49` 27→29 (weak→drop, strong→keep). Slate Gray `#6B7280` (Tailwind gray-500, tag `usage:border`) blijft — per user-regel "behoud als werkelijk gebruikt".

**Resteert**: re-scrape Napking → Silver Gray valt; peoplemasterminds (8 social-kleuren weg); Zwarthout (regressie schoon).

## 8. Brand-PRIMARY uit merk-signaal (Fase 4 — gebouwd 2026-06-05)
Napking re-scrape #281 toonde de eerder gedeferde Fase-4-bug live: **PRIMARY = #1A171B Deep Charcoal** (de near-black TEKSTkleur, gewonnen op frequentie) terwijl Napkings échte merk-kleur **Ocean Blue #008ACF** is — letterlijk in de DB-logo-guidelines: *"the blue accent should always use the brand's Ocean Blue (#008ACF)"*. De AI-classifier kent PRIMARY toe aan de meest-prominente kleur; op een merk met achromatisch wordmark + chromatische accent is dat de ubiquitaire tekstkleur. De logo-pixel-rescue ving het niet (`brandImages` null; een overwegend-zwart wordmark levert via histogram tóch charcoal).

**Fix**: `demoteAchromaticPrimary` (`analysis-engine.ts`, array-niveau spiegel van `reclassifySaturatedNeutral`, draait NÁ de usage-filter). Demote een achromatische PRIMARY → NEUTRAL en promote de sterkste chromatische merk-kleur → PRIMARY, alléén met positief merk-bewijs (score-drempel 3: logo-vermelding +5 / detector·vision-primary +4 / vision-cta·accent +2 / sterk-gebruik +2 / core-brand-tag +1). Achromatic = `s≤12 || (s≤20 && (l≤12||l≥92))` — saturatie-gegate zodat verzadigde donker-navy/teal merk-primaries gespaard blijven. Guards: chromatische primary (Zwarthout), monochroom (no-op), detector/logo-asserted zwart (tenzij logo een chromatische hex noemt), nooit framework/social/low-conf/status gepromote.

**Verificatie**: 2 adversariële workflows (`wsti0x7g0` ontwerp + `wix056ht3` geïmplementeerde code), 6 lenzen, unaniem SHIP; 5 design-flaws vooraf ingebouwd. Smoke `phase50` 20/20 (8 archetypes), tsc+lint 0, phase47/48/49 groen. Changelog #282. **Volgende: re-scrape Napking → PRIMARY = Ocean Blue verwacht.**

## 9. Framework-defaults zonder usage-data (Napking-controle 2026-06-05, commit volgt)
Controle van het #282-resultaat tegen de **echte** napking.nl (curl homepage + UCSS): PRIMARY = Ocean Blue #008ACF ✓ correct (logo-accent, merk-kleur). Maar twee framework-leaks resteerden: **ACCENT "Deep Blue #007CBA"** = WordPress-admin-kleur (`--wp-admin-theme-color:#007cba` + `-darker-10/-20`; 0× in gebruikte CSS, alléén de WP-block-var-declaratie) en **Cool Gray #ABB8C3** = Gutenberg core-default ("Cyan bluish gray"). Grondwaarheid: napking.nl = WordPress+WooCommerce+Gutenberg+Tailwind; veel inline-hexes zijn framework-defaults (#7F54B3 Woo-purple, #0693E3/#FF6900/#FCB900/#F78DA7 Gutenberg, #25D366 WhatsApp, #767676 WP, Tailwind-grijzen). Font = Adobe Typekit "effra".

**Root-cause**: deze re-scrape had GÉÉN multi-page usage-data → `keep()` gaf onbemeten kleuren benefit-of-the-doubt (`!known → keep`) vóór de framework-gate, dus #007CBA + #ABB8C3 overleefden.

**Fix** (`palette-usage-filter.ts`, changelog #283): (A) WP-admin-familie (#007CBA/#006BA1/#005A87) toegevoegd aan `isFrameworkOrigin` (usage-gated). (B) `keep()` herordend: framework-default moet POSITIEF sterk gebruik tonen; zonder usage-data vallen alléén de **hex-bevestigde leak-klassen** (`isFrameworkLeakHex` = CMS-neutral-grijzen + WP-admin), een saturated default-primary (#0D6EFD/#20C997) houdt benefit-of-the-doubt (anti-grayscale). Adversariële review ronde-1 ving de over-drop (Bootstrap-merk-paletten grayscaleden) → leak-hex-split; ronde-2 = SHIP. Smoke `phase51` 14/14, `phase47` 24/24. **Volgende: re-scrape Napking → #007CBA + #ABB8C3 weg.**

**Open observatie**: deze re-scrape had geen multi-page usage-data (screenshotter uit/gefaald?) — dat neutert de héle usage-gedreven filter. De #283-fix maakt het resultaat robuust ongeacht usage-data, maar de afwezigheid zelf is het uitzoeken waard (los van deze fix).
