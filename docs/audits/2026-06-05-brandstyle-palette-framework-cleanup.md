# Verbeterplan — Brandstyle palet & kleur-presentatie (framework-cleanup)

> **Datum**: 2026-06-05 · **Bron**: verse re-scrape Zwarthout ná de #278-fixes (14 screenshots, `test-screenshots/brandstyle/nieuwe screenshots/`) + DB-inspectie van het werkelijke palet. **Vervolg op** `2026-06-05-brandstyle-result-audit.md` (#278). Status: diagnose compleet (DB-bewezen), plan. Implementatie nog niet gestart.

## 1. User-observaties (verse run)

1. Kleurcombinaties die niet op de site zichtbaar zijn.
2. Buttons die niet op de site zichtbaar zijn.
3. Overbodige kleuren.
4. Dezelfde kleuren twee keer ("System Roles" én "Color System") — voorkeur: **één overzicht**.
5. "Effects & Applications" gebruikt kleuren die niet op de site voorkomen.

## 2. Kern-oorzaak (DB-bewezen) — één bron voor alle vijf

Het gepersisteerde Zwarthout-palet is **100% Bootstrap/WordPress framework-defaults**. Alle 12 kleuren dragen de tag `bootstrap` of `wordpress`; **zes zijn expliciet `unused`**:

| Naam | Hex | Categorie | Tags |
|---|---|---|---|
| Bootstrap Blue | #0D6EFD | ACCENT | bootstrap, default, **unused** |
| Slate Gray | #6C757D | SECONDARY | bootstrap, secondary |
| Forest Green | #198754 | SEMANTIC | bootstrap, success |
| Cyan Blue | #0DCAF0 | ACCENT | bootstrap, info, **unused** |
| Amber Gold | #FFC107 | SEMANTIC | bootstrap, warning |
| Crimson Red | #DC3545 | SEMANTIC | bootstrap, danger |
| Soft White | #F8F9FA | NEUTRAL | bootstrap, background |
| Charcoal Black | #212529 | NEUTRAL | bootstrap, text, primary-text |
| Vivid Purple | #7A00DF | NEUTRAL | wordpress, synced, **unused** |
| Deep Blue | #0A58CA | NEUTRAL | bootstrap, **unused** |
| Pine Green | #146C43 | ACCENT | bootstrap, **unused** |
| Teal Blue | #087990 | ACCENT | bootstrap, **unused** |

Dit zijn letterlijk Bootstrap 5's default theme-kleuren (`--bs-primary/-secondary/-success/-info/-warning/-danger` + tekst-emphasis-varianten). Zwarthout's **werkelijke** merk-kleur — het oranje/rust uit het logo (#FF5722-achtig, door de vision-logo-analyse wél herkend) — **ontbreekt volledig in het palet**.

**Het systeem wéét al dat ze niet renderen** (de `unused`-tag + `bootstrap`-tag zijn al gezet), maar ze worden niet uitgefilterd. Daardoor:

| Observatie | Mechanisme |
|---|---|
| #1 kleurcombinaties niet-op-site | `buildColorPairings` (#277 Fase 5) bouwt paren uit het héle palet → "Accentknop" voor Bootstrap Blue/Teal Blue |
| #2 buttons niet-op-site | dezelfde framework-ACCENT-kleuren renderen als accent-knoppen in de kleurcombinaties |
| #3 overbodige kleuren | 12 framework-kleuren, 6 `unused` |
| #4 dubbel overzicht | System Roles + Color System tonen béíde het (zelfde) palet |
| #5 effects-kleuren niet-op-site | `analysis-prompts.ts:465` instrueert de AI om bij géén observed gradients "RECOMMENDED" gradients te genereren **uit het Brand Color Palette** = de framework-teal/-purple |

**Verzwarend**: #278 Fase 4a (chroma-gate) verplaatste verzadigde NEUTRALs → ACCENT, maar de framework-guard (`isFrameworkDefaultPrimary`, smalle 14-hex focusset) miste #0DCAF0/#087990/#146C43/#7A00DF → die zijn nú ACCENT i.p.v. NEUTRAL, dus prominénter in pairings/gradients. De chroma-gate moet samengaan met framework-drop.

## 3. Wat de #278-fixes WÉL opleverden (validatie verse run)

- **Fase 3a ✓**: primary-font is nu **"Roboto"** (schone familie) i.p.v. de `system-ui,…`-stack-string.
- **Fase 1c ✓**: Product cards **0 → 1** (`.product-item` herkend; de 9 identieke worden door styleHash-dedup tot 1 representant samengevat).
- **Fase 1a/1b ✗ (deels)**: Form inputs blijven **0**. De multi-page static-scrape bezoekt /contact wél, maar de statische component-extractor vangt de Gravity-Forms-`<input>`s niet (CSS-lookup-afhankelijkheid → 0 props → MIN_CONFIDENCE-drop). Backfill heeft dus niets om terug te zetten. **Diepere oorzaak dan #278 aannam** — zie Fase D hieronder.

## 4. Verbeterplan

`[DET]` = deterministisch testbaar. `[RE-SCRAPE]` = vergt live re-scrape om te valideren.

### Fase A — Palet de-frameworken (KERN, lost #1/#2/#3 + voedt #5) `[DET]`
**Probleem**: `unused`+framework-kleuren blijven in het palet; de usage-enforce (`analysis-engine.ts:476`) verlaagt alleen confidence, dropt niet; cap is `.slice(0,12)` (`:1119`).
**Wijzigingen**:
- Vóór persist: **drop** kleuren die (`tags` bevat `unused` OF `usageEvidence==='none'`) **én** framework-herkomst (`bootstrap`/`wordpress`/`synced`/`default`-tag of `isFrameworkDefaultPrimary`) hebben **én** niet uit logo/detector-met-usage komen. Behoud altijd: logo-kleuren, kleuren met `usageEvidence` `strong`/`weak`, en de donkerste neutral (tekstkleur).
- Verbreed `isFrameworkDefaultPrimary` (`framework-defaults.ts`) naar de **volledige Bootstrap-palette** incl. tekst-emphasis-varianten (#0DCAF0, #087990, #146C43, #7A00DF, #0A58CA, #0A58CA) + de Gutenberg/WP-preset-hexes.
- Koppel #278 Fase 4a: promoot NEUTRAL→ACCENT **alleen** voor niet-framework, gebruikte kleuren.
**Effect**: het palet valt terug op de echt-renderende kleuren (Charcoal Black + — na Fase B — het logo-oranje). Pairings/accent-buttons/gradients erven automatisch een schoon palet.
**Risico**: Med — een echte merk-kleur die toevallig een Bootstrap-hex deelt kan sneuvelen; mitigatie = de `usageEvidence`/logo-uitzondering + behoud-bij-twijfel (demote i.p.v. drop als fallback-modus). **Beslissing nodig: hard droppen vs. "gedetecteerd maar ongebruikt"-collapsible** (zie §5).

### Fase B — Logo-kleur-rescue: het echte merk-oranje terugbrengen `[RE-SCRAPE]`
**Probleem**: Zwarthout's oranje/rust staat in de logo-richtlijnen (vision) maar niet in het palet. De rescue draait alleen bij `!frameworkHasPrimary` (`analysis-engine.ts:1224-1227`); op een all-Bootstrap-site is dat fragiel, en `scraped.logoColors` lijkt leeg (de logo-kleur-extractie haalde het oranje niet uit de logo-afbeelding).
**Wijzigingen**: wanneer ná Fase A het palet géén echte brand-primary/-accent overhoudt, forceer logo-kleur-extractie (uit de vision-logo of `logo-color-extractor` op de logo-asset) en geef het de PRIMARY/ACCENT-slot. Verifieer dat `scraped.logoColors` gevuld wordt voor raster-logo's.
**Effect**: het palet bevat het herkenbare merk-oranje i.p.v. alleen framework-ruis.

### Fase C — Kleurcombinaties: alleen echte merk-kleuren `[DET]`
**Probleem**: `buildColorPairings` (`color-pairings.ts`) krijgt het volledige palet.
**Wijzigingen**: voed `buildColorPairings` alleen met kleuren die `usageEvidence !== 'none'` én niet-framework zijn (of: post-Fase-A is het palet al schoon → een dunne guard volstaat). Geen "Accentknop" voor `unused`/framework-kleuren.
**Effect**: lost #1 + #2 (kleur-kant) volledig.

### Fase D — Form-inputs echt vangen (open sinds #278) `[RE-SCRAPE]`
**Probleem**: de statische extractor mist Gravity-Forms-`<input>`s (CSS-lookup → 0 props → confidence-drop), dus backfill heeft niets. De Playwright-screenshotter zou ze wél computed-styled zien — mits /contact in de screenshot-set zit (Fase 1b zet 'm vooraan, maar de FORM_INPUT-styling-gate vereist `solidBg||radius||border`; een kale tekst-input met alleen een border-bottom kan sneuvelen).
**Wijzigingen**: (a) verifieer dat /contact nu gescreenshot wordt; (b) versoepel de FORM_INPUT-styling-gate (een input met alleen `border`/`border-bottom` of een achtergrond-tint telt); (c) als static de bron blijft: geef de form-input-extractie een computed-style-fallback i.p.v. pure class-CSS-lookup.

### Fase E — Eén kleur-overzicht (#4) `[DET]`
**Probleem**: `ColorsSection.tsx` toont **drie** overzichten: System Roles (`:552`), Hero Palette (`:555`), Color System (`:573`) — System Roles en Color System overlappen.
**Wijzigingen**: consolideer naar één hiërarchie:
- **Hero Palette** (de 3-5 merk-bepalende kleuren) — behouden als "at-a-glance".
- **Eén "Color System"** dat de semantische rollen (primary/secondary/accent/neutral/semantic) én de swatches+hex+usage combineert — vervangt de aparte System Roles-sectie. De DESIGN.md-export-data blijft beschikbaar, maar niet als losse dubbele UI-sectie.
- Kleurcombinaties + Semantic Tints blijven als aparte panelen (andere functie).
**Beslissing nodig**: welke van de twee structuren leidend is (System-Roles-stijl rol-lijst vs Color-System-categorie-buckets) — zie §5.

### Fase F — Gradient/effects-provenance (#5, was #278 6d) `[DET]` mechanisme / `[RE-SCRAPE]` e2e
**Probleem**: zonder observed gradients genereert de AI "RECOMMENDED" gradients uit het palet (`analysis-prompts.ts:465`); het schema/UI tonen geen provenance, dus ze ogen als echte merk-gradients.
**Wijzigingen**: (a) `source: 'observed' | 'recommended'`-veld in het gradient-schema; (b) UI-badge "Aanbevolen" op recommended gradients (`VisualSystemSection`); (c) onderdruk recommendations wanneer het palet low-confidence/all-framework is (na Fase A is het palet schoon → recommendations gebruiken dan echte merk-kleuren). Idem voor de iconography-tint die nu teal toont.
**Effect**: lost #5 — geen verzonnen niet-merk-kleuren meer gepresenteerd als feit.

## 5. Beslissingen (door user vastgesteld 2026-06-05)
1. **Framework-kleuren → VOLLEDIG DROPPEN.** Geen inklapbare "framework-defaults"-rij; framework-default + `unused`/`usageEvidence==='none'`-kleuren verdwijnen volledig uit de styleguide (palet, pairings, gradients, exports). Behoud-uitzonderingen blijven: logo-kleuren, kleuren met positief `usageEvidence`, donkerste neutral (tekst). → Fase A dropt hard.
2. **Eén overzicht → "Color System" (categorie-buckets) is leidend.** De aparte `SystemRolesSection` (`ColorsSection.tsx:552`) wordt **verwijderd**; rol-labels worden in de Color-System-buckets geïntegreerd. Hero Palette + Kleurcombinaties + Semantic Tints blijven losse panelen. → Fase E.

## 6. Aanbevolen volgorde
1. **Fase A** (de-framework) — kern; lost #1/#2/#3 en saneert de input voor #5. Hoogste leverage.
2. **Fase C** (pairings-guard) — direct gevolg, klein.
3. **Fase E** (één overzicht) — #4, UI-consolidatie.
4. **Fase F** (gradient-provenance) — #5.
5. **Fase B** (logo-rescue) — brengt het echte merk-oranje terug; `[RE-SCRAPE]`.
6. **Fase D** (form-inputs) — vervolg op #278, `[RE-SCRAPE]`.

## 7. Validatie-protocol
1. Per fase: `npx tsc --noEmit` + lint 0; nieuwe `[DET]`-smoke (fixture-palet met `unused`/`bootstrap`-tags → assert gedropt; pairings-guard; chroma-gate × framework).
2. **Re-scrape zwarthout.com** na Fase A+B+C+F: verwacht een palet zónder de 6 `unused`-Bootstrap-kleuren, mét het logo-oranje; kleurcombinaties alleen uit echte merk-kleuren; gradients observed-of-"Aanbevolen"-gelabeld; één kleur-overzicht.
