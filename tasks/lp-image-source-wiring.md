---
id: lp-image-source-wiring
title: LP image-source-opties — gekozen foto landt in puckData.hero (library/compose/trained)
fase: pre-launch
priority: now
effort: library ~0.5d (klaar) · compose+trained ~1d (follow-up)
owner: claude-code
status: in-review
created: 2026-06-08
related-task: lp-step3-rendering-bugs, web-page-builder-canvas-step-mvp
related-audit: orphaned-hero gotcha 2026-06-08 (gotchas.md)
worktree: main (fix/lp-hero-sections-cta)
---

# Probleem

Test 2026-06-08 (vervolg op orphaned-hero-fix): van de 10 Visual-Brief foto-bronnen in Stap 2 landen niet alle gekozen beelden in de LP. De Puck Medium-renderer leest beeld **uitsluitend** uit `puckData` (hero: `BrandHero.heroVisualUrl`, features: genest `imageUrl`). Een bron werkt alleen als z'n URL daar belandt.

**Uitslag test:**
- ✅ Werken: `generate` (server `target:'hero'`-wiring + `generateFeatureVisuals`), `upload`/`url`/`stock`/`smart-search` (via `onSelected`→`handleImageSelected`→`selectedHeroImageUrl`→gevouwen in variant→puckData), `none`.
- ❌ Kapot: `library` (schreef alleen hero-image-`DeliverableComponent` + store, niet puckData), `compose` + `trained-style` (source-gate 400 — `visualBrief.source` wordt nooit gepersisteerd — én routes missen de `target:'hero'` puckData-wiring → orphaned-image, zelfde klasse als de hero-bug).

# Fix library (✅ GEDAAN, browser-verificatie open)

De embedded `LibraryAssetPicker` surfacet nu de eerst-gekozen asset naar de host via een nieuwe optionele `onHeroSelected`-callback, die in de LP-flow op `handleImageSelected` (het bewezen upload/url/stock-pad) is gewired. Daardoor loopt de keten:

`library-pick → onHeroSelected → handleImageSelected → selectedHeroImageUrl → handleChooseVariant → hero.heroVisualUrl → variantToPuckDataFromStructured → BrandHero.heroVisualUrl → render`

Beschermd tegen re-hydrate-clobber door `preserveHeroVisual` (fix van 2026-06-08).

**Bestanden:**
- `LibraryAssetPicker.tsx` — `onHeroSelected?`-prop; in `handleConfirm` aangeroepen met de eerste asset; skip de eigen `persistHeroImage` wanneer de host die overneemt (geen dubbele write).
- `ImageSourcePanel.tsx` — embedded library-branch geeft `onHeroSelected={onSelected}` door.

**Verificatie:** `tsc` 0 errors, `eslint` 0 errors. Keten end-to-end getraceerd (`landing-page-from-structured.ts:62` mapt hero.heroVisualUrl → BrandHero). Callback-plumbing is React → browser-verificatie het juiste niveau.

**Browser-test-recept** (Linfi/Zwarthout/Better Brands hebben 50-265 IMAGE-assets):
1. Open een LP-deliverable → Stap 2 → tab "Library".
2. Kies een afbeelding → "Use selected".
3. Kies een content-variant → ga naar Stap 3.
4. Verwacht: de gekozen library-foto staat als hero-image. Reload → blijft staan (clobber-guard).

# Follow-up: compose + trained-style (OPEN)

Beide hebben twee defecten:
1. **Source-gate**: `generate-visual-compose/route.ts:161` eist `source==='compose'`, trained `:160` eist `'trained-style'` — maar `visualBrief.source` wordt in de LP-flow nooit gepersisteerd (`onSourceChange` zet alleen lokale state) → 400 vóór er beeld ontstaat.
2. **Geen puckData-wiring**: beide routes persisteren alleen `DeliverableComponent variantGroup='visual'`, geen `target:'hero'` puckData/structuredVariant-mutatie (orphaned-image-klasse).

**Voorgestelde aanpak:** (a) `visualBrief.source` wél persisteren bij bronkeuze (of de gate versoepelen voor web-page-types), én (b) dezelfde host-surfacing als library: de compose/trained-pickers laten hun resultaat-URL via `onHeroSelected`/`handleImageSelected` in puckData vouwen — i.p.v. de `target:'hero'`-wiring in elke route te dupliceren. Eén consistent client-pad voor alle niet-generate bronnen.

# Acceptatiecriteria

- [x] library-pick in Stap 2 landt in `puckData.BrandHero.heroVisualUrl` (code + keten-trace)
- [ ] Browser: library-foto zichtbaar als LP-hero + blijft na reload
- [ ] compose-pick landt in LP-hero (follow-up)
- [ ] trained-style-pick landt in LP-hero (follow-up)
- [x] `tsc` + `eslint` 0 errors
- [ ] 0 regressie op niet-LP library-gebruik (hero-image-component pad blijft via else-tak)

# Out of scope
- De source-gate-architectuur herontwerpen (alleen persisteren/versoepelen waar nodig).
