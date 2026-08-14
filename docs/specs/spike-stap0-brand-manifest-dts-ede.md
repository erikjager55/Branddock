# Stap 0 — validatie-spike: handgemaakt Brand Manifest (DTS Ede)

> **Datum**: 2026-08-13 · **Onderdeel van**: `brandstyle-designbibliotheek-verbeterplan.md` (Stap 0)
> **Status**: manifest-voorbeeld af (§2); **A/B-run uitgevoerd 2026-08-14 via de Branddock
> MCP-koppeling tegen prod** (workspace DTS Ede) — resultaten en verdict in §4.
> **Doel**: (a) het ontwerpvoorbeeld voor `src/lib/brandstyle/manifest-builder.ts` — dit is hoe
> een gegenereerd manifest eruit hoort te zien; (b) het protocol om de kernaanname te toetsen
> dat manifest-injectie de AI-outputkwaliteit meetbaar verbetert.

---

## 1. Herkomst van dit voorbeeld

Handmatig geassembleerd uit de DTS Ede-materialen: de Branddock brand-kit-export
(`docs/experiments/DTS Ede Design System/uploads/dts-ede-brand-book-2026-05-19.pdf`), de door
Claude Design gebouwde bibliotheek (README/SKILL/colors_and_type.css in dezelfde map) en de
structuur uit §1.3 M5/M6 van het verbeterplan. Elke waarde hieronder is herleidbaar tot die
bronnen — niets is verzonnen (exacte-waarden-doctrine, M1). Provenance-notatie: `[observed]`
uit merkboek/site, `[substitutie]` = aanname die user-bevestiging vraagt.

## 2. Het manifest (ontwerpvoorbeeld voor manifest-builder v1)

Wat hieronder staat is de **agent-representatie** — exact wat `getBrandContext` als primaire
merkbron zou injecteren. De digest-view (mens) rendert dezelfde data met specimens erbij.

```markdown
# Brand Manifest — V.V. DTS '35 Ede (v1)

## Quick facts
| | |
|---|---|
| Merk | V.V. DTS '35 Ede (Door Training Sterker, opgericht 1935) |
| Essentie | Community Through Football |
| Archetype | Everyman (primair), Competence (secundair) |
| Locatie | Sportpark Peppelensteeg, Inschoterweg 2, 6715 CS Ede |
| Palet | Royal Blue #0060A0 + Deep Blue #0040A0 + grijze ramp op off-white — géén andere kleuren |
| Typografie | HelveticaNeue (300/400/500/700/900), body op Light 300 |
| Voice | Nederlands, derde persoon, feitelijk, "trusted neighbor" — nooit marketing-speak |

## Harde regels (BLOCKING — overtreding = afkeuren)
1. Verzin nooit accentkleuren. Geen groen voor succes, geen rood voor fouten — status via
   blauw + grijs + gewicht. [observed: merkboek definieert uitsluitend blauw+grijs]
2. Geen gradients in UI-chrome. Enige toegestane gradient: Royal Blue-scrim
   rgba(0,96,160,0.55) over hero-fotografie. [observed]
3. Kaarten zijn plat: 1px border #DFDFDF, radius 4px, géén drop-shadow. [observed]
4. Geen emoji, uitzondering: teamnaam "DTS Ede 6 🍺" (letterlijke naam). [observed: live site]
5. Nederlands, informeel "je" (nooit "u"), derde persoon in redactionele copy. [observed]

## Tokens (semantisch — gebruik deze namen, nooit losse hexcodes)
- Surfaces: bg-page #F1F1F1 · bg-surface #FFFFFF · bg-dark #0040A0
- Tekst: fg1 #222222 (koppen) · fg2 #464646 (body) · fg3 #666666 · fg4 #999999
- Brand: primary #0060A0 (CTA/links/focus) · primary-hover #0040A0
- Lijnen: border-default #DFDFDF · border-strong #CCCCCC
- Radius: chip 2 / card 4 / input 4 / pill 999 (alleen score-chip)
- Spacing (4px-basis): 4 8 12 16 20 24 32 48 64 96
- Motion: 150-250ms ease-out; geen bounce, geen parallax [observed]
- Type-scale: 12 / 18 / 20 / 30 / 40 / 64 / 88 px; body weight 300, H1/H2 700, display 900

## States
- Hover primair: #0060A0 → #0040A0; links krijgen underline, geen kleurwissel.
- Focus: 2px outline #0060A0, offset 2px — altijd zichtbaar.
- Disabled: fill #DFDFDF, tekst #999999. [observed: merkboek + kit]

## Voice-baseline
Feitelijk, tegenwoordige tijd in koppen, verleden tijd in verslagen. Collectief ("DTS Ede
heeft gewonnen", nooit sterspeler-framing). Zinnen 15-20 woorden, belangrijkste feit eerst.
Verboden vocabulaire: exclusive, premium, elite, world-class, revolutionary, state-of-the-art.
Voorbeeld goed [observed, live site]: "Magere zege DTS Ede tegen degradant DOS Kampen."
Voorbeeld fout: "Sluit je vandaag nog aan bij de DTS Ede familie en transformeer je voetbalreis!"

## Imagery
Authentieke actie- en communitymomenten, 60% actie / 40% community, natuurlijk licht,
true-to-life kleur (licht koel), alle leeftijden en teams. Nooit: stock, studio, handshakes,
zware filters. [observed]

## Substituties & Known Gaps (bevestiging nodig)
- [substitutie] Icon-set: merkboek specificeert geen iconografie; Lucide (stroke, 24px grid,
  1.5px) is een aanname — vervang bij voorkeur-set van de club.
- [gap] Geen motion-specificatie in het merkboek; de 150-250ms-waarden komen uit de
  Claude Design-kit, niet uit een merkbron.
- [gap] Fotografie-licentie/beeldbank onbekend — placeholders gebruiken tot echte
  DTS-fotografie is aangeleverd.

## Iteration Guide (voor de consumerende agent)
- Werk per component; gebruik uitsluitend de semantische tokennamen hierboven.
- Status uitdrukken? Blauw + gewicht + border — introduceer géén nieuwe kleur (harde regel 1).
- Twijfel over toon? Herlees de twee voorbeelden onder Voice-baseline; kies het saaiere.
```

**Bouwlessen voor `manifest-builder.ts`** (uit het handwerk gedestilleerd):
1. De quick facts-tabel is volledig af te leiden uit bestaande velden (styleguide + voiceguide
   + brand assets) — geen AI nodig.
2. Harde regels v1 = `*Donts`-velden + de vaste "never"-set die uit paletsamenstelling volgt
   (mono-palet ⇒ "verzin geen accentkleuren"). Elke regel draagt zijn bewijs.
3. Tokens komen 1-op-1 uit `semanticTokens.resolved` — het manifest hernoemt niets.
4. Substituties/Known Gaps komen uit provenance (confidence != high, `recommended`-markers)
   en het kalibratie-rapport.
5. De voice-sectie is `voiceBaseline1Pager` + 1 goed/fout-voorbeeldpaar uit
   `vocabularyDo/Dont` of `examplePhrases`.

## 3. A/B-protocol (lokaal uit te voeren — vereist DB + API-keys)

1. Kies de DTS Ede-workspace (of een andere volledig geanalyseerde workspace).
2. Draai 5 opdrachten in twee condities: (A) huidige context-injectie, (B) manifest van §2
   als vervangende merkcontext. Opdrachten: LP-hero-sectie · social-post wedstrijdverslag ·
   nieuwsbrief-intro · image-prompt hero-foto · CTA-microcopy.
3. Meet per output: F-VAL-score, aantal harde-regel-overtredingen (§2-regels 1-5, handmatig
   tellen), en eigen oordeel (welke van de twee is meer "dit merk"?).
4. Beslisregel (uit het verbeterplan): duidelijk verschil → W1 bouwen zoals gespecificeerd en
   deze outputs bevriezen als eerste golden-set-fixture (W7.4). Klein/geen verschil → eerst
   het extractie-spoor (analyzer-plan A2-A4).

## 4. Resultaten A/B-run (2026-08-14, uitgevoerd via Branddock MCP tegen prod)

**Methode zoals daadwerkelijk gedraaid** (variant op §3, mogelijk gemaakt door de MCP-koppeling):
generator constant (Claude, zelfde model beide condities), alleen de merkcontext verschilde —
(A) de letterlijke output van `get_brand_context` voor DTS Ede, (B) het §2-manifest. Alle 10
outputs blind gescoord door de productie-F-VAL-engine via `score_against_brand`. Geen dubbel-
blinde opzet (dezelfde agent schreef beide varianten); de judge was wél blind voor conditie.

### F-VAL composietscores

| Opdracht | A (huidige context) | B (manifest) |
|---|---|---|
| 1. LP-hero | 78 | **83** |
| 2. Social wedstrijdverslag | **80** | 78 |
| 3. Nieuwsbrief-intro toernooi | 83 | 83 |
| 4. Image-prompt hero | **82** | 81 |
| 5. CTA-microcopy | 79 | 79 |
| **Gemiddeld** | **80,4** | **80,8** |

### Harde-regel-overtredingen (manifest §2, handmatig geteld)

| Output | Overtredingen |
|---|---|
| A1 | 2 — superlatief/marketing-frame ("dé voetbalfamilie", "meest verbonden … van Nederland"), wij-vorm in redactionele copy |
| A2 | 2+ — emoji (💪⚽, verboden), wij-vorm ("samen zijn we DTS") |
| A3/A4/A5 | 0 |
| **A totaal** | **4+** |
| **B totaal** | **0** |

### Interpretatie & verdict

1. **F-VAL-composiet ziet vrijwel geen verschil (+0,4)** — maar kan het verschil ook niet
   zien: `rulesEvaluated: 0` in élke scoring (er zijn geen actieve BrandRule-records voor
   deze workspace) en de judge kent de merkboek-regels (geen emoji, geen superlatieven,
   derde persoon) niet. Off-brand output scoort daardoor gewoon 80+.
2. **De regel-overtredingen tonen het werkelijke verschil**: conditie A produceerde 4+
   overtredingen van regels die alléén in het merkboek staan; conditie B nul. Het manifest
   levert precies de laag die de huidige context mist.
3. **Beslisregel-verdict**: W1 doorzetten (gebeurd) én **W2-doorvoer naar de scoring-engine
   naar voren halen** — zolang StyleguideRule-regels F-VAL's rules-pijler niet bereiken,
   blijft regel-overtredende content hoog scoren. Dit is de belangrijkste bevinding van de
   spike: het gat zit niet alleen in de generatie-context maar ook in de meting.
4. **Databevinding**: de prod-brandcontext zegt "U13 Top Tournament / Tweede Paasdag";
   het merkboek (mei 2026) zegt "U15 / 23e editie / maandag 25 mei". Eén van beide is
   verouderd — corrigeren in de DTS Ede-workspace vóór de volgende contentronde.
5. **Beperkingen**: n=5 per conditie; generator niet geblindeerd; de tekst-judge kan
   image-prompt-uitvoerbaarheid (exacte hex, kleurgrading in B4) niet waarderen; deze
   outputs zijn bruikbaar als eerste golden-set-fixtures (W7.4).
