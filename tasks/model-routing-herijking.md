---
id: model-routing-herijking
title: De model-routing draait op benchmark-scores van modellen die niet meer gebruikt worden
fase: post-launch
priority: next
effort: 1-2 dagen
owner: claude-code
status: done
created: 2026-08-20
completed: 2026-08-20
related-adr: -
related-spec: -
worktree: -
---

# Probleem

`src/lib/ai/canvas-model-routing.ts` kiest per content-type-categorie een
generatiemodel. De onderbouwing staat als comment bovenaan het bestand:

```
//   Long-Form Content       → Opus 4.7    (91, runner-up GPT-5.4 87)
//   Social Media            → GPT-5.4     (91, runner-up Sonnet 4.6 88)
//   Website & Landing Pages → Sonnet 4.6  (91, runner-up Opus 4.7 89)
```

Die scores komen uit een eigen experiment van **2026-05-13** (8 content-types ×
6 modellen). Op **2026-07-21** heeft `#226` (modellen-refresh fase 1) de modellen
ververst:

```
claude-opus-4-7  → claude-opus-4-8
gpt-5.4          → gpt-5.6
claude-sonnet-4-6 → claude-sonnet-5
```

**De comment is niet meegegaan.** De keuze "Social Media → GPT" rust dus op een
meting van `gpt-5.4`, terwijl de code `gpt-5.6` draait. Datzelfde geldt voor alle
acht de categorieën: geen enkele score in dat blok is gemeten op het model dat er
nu onder hangt.

# Waarom dit meer is dan een verouderde comment

Er is inmiddels hard bewijs dat zo'n wissel gedrag verandert. `smoke:structured-
tweaks` toetst of een aangeleverde `slideSkeleton` letterlijk wordt overgenomen.
Twee onafhankelijke runs op 2026-08-20 (nachtelijk 03:40 en handmatig 05:24),
beide keren identiek:

```
carousel      → gpt-5.6          3/5 titels letterlijk
landing-page  → claude-sonnet-5  4/4 titels letterlijk
```

Zelfde `buildSkeletonRender`-instructie, zelfde run, zelfde prompt-fragment —
byte-identiek sinds 2026-05-08. Het verschil is het model. `gpt-5.6` neemt de
narratieve slides letterlijk over en herschrijft consequent de oplossings- en
CTA-slide.

Dat is één datapunt op één instructie, maar het is precies het soort verschil dat
een composite-score van 91 niet vangt: een model kan hoger scoren op kwaliteit en
tegelijk slechter zijn in het volgen van structurele instructies.

# Voorstel

1. Het experiment van 2026-05-13 herhalen op de juli-generatie (opus-4-8,
   gpt-5.6, sonnet-5, gemini 3.1 pro). Zelfde 8 categorieën, zelfde opzet, zodat
   de scores vergelijkbaar zijn met het origineel.
2. **Structuur-trouw als eigen as meenemen**, naast de composite-score. De
   skeleton-bevinding laat zien dat "beste content" en "volgt de instructie" niet
   hetzelfde zijn, en de huidige tabel meet alleen het eerste.
3. De comment in `canvas-model-routing.ts` bijwerken met de nieuwe scores én de
   meetdatum, zodat de volgende lezer ziet waar de keuze op rust.
4. `smoke:structured-tweaks` terug op een harde assertie zetten (nu `softCheck`,
   met verwijzing naar deze taak).

# Acceptatiecriteria

- [ ] Alle acht categorieën opnieuw gemeten op de modellen die de code draait
- [ ] Structuur-trouw is als aparte as gemeten, niet alleen composite-kwaliteit
- [ ] De comment noemt de meetdatum en de gemeten modelversies
- [ ] `smoke:structured-tweaks` staat weer op `assert` en is groen — óf de
      routing voor Social Media is gewijzigd met de meting als onderbouwing
- [ ] Er staat een regel bij die zegt wat er moet gebeuren bij de VOLGENDE
      modelwissel, zodat dit niet opnieuw stil verloopt

# Risico's

- **Een herhaling is niet gratis**: 8 categorieën × 4+ modellen aan echte
  generaties. Budget vooraf afstemmen met Erik.
- **De uitkomst kan zijn dat de huidige routing blijft.** Dat is een geldige
  uitkomst, maar dan mét een meting eronder in plaats van een verouderde.
- ⚠️ **Niet de scores overschrijven zonder de oude te bewaren.** De vergelijking
  mei → augustus is zelf een bevinding: hij laat zien of een modelgeneratie
  vooruitgang is op ónze content, niet op een publieke benchmark.

# Notes

De aanleiding: `linkedin-carousel` (het type waarop de bewaker faalt) staat op
`hidden: true` sinds 19-05 omdat de carousel-pipeline niet productie-klaar is.
Het defect zelf raakt dus geen gebruiker. **De onderliggende vraag wel** — die
routingtabel bedient alle zichtbare content-types.


---

# UITGEVOERD 2026-08-20 — en de uitkomst is een andere dan de vraag

Het experiment is herhaald op de juli-generatie: 8 content-types × 6 modellen,
**dezelfde judge** (`claude-sonnet-4-6`) als in mei.

## De controles zijn het antwoord

Twee modellen draaiden ongewijzigd mee (Haiku 4.5, Gemini 3.1 Pro). Hun drift
tussen mei en augustus is pure meetruis: **gemiddeld 4,0 punten, uitschieter 13**.
De winnaars in de tabel liggen 1-4 punten uit elkaar.

**Deze methode kan de verschillen waarop de routing is gebouwd dus niet
onderscheiden** — niet nu, en met dezelfde opzet ook niet in mei. De twee
categorieën die van winnaar wisselden (Advertising & Paid, Website & Landing
Pages) deden dat op **nul punten verschil**.

## Besluit: routing ongewijzigd

Geen gemeten reden om iets te verplaatsen. Bovendien zou Website & Landing Pages
naar GPT-5.6 verplaatsen het skeleton-gedrag slopen dat daar vandaag werkt
(`claude-sonnet-5` 4/4 tegen `gpt-5.6` 3/5, zelfde run, zelfde instructie) —
zonder dat de composite-score dat ziet.

De comment in `canvas-model-routing.ts` draagt nu de ruismarge, het gelijkspel
en die waarschuwing.

## Wat er open blijft: de METHODE, niet de tabel

Eén generatie per model per content-type is te weinig om 1-4 punten te
onderscheiden. Wie hier weer op wil sturen, moet eerst:

- [ ] meerdere samples per conditie draaien en een **spreiding** rapporteren
- [ ] de controle-opzet behouden — zonder ongewijzigde modellen is drift niet
      van signaal te scheiden
- [ ] pas daarna conclusies over winnaars trekken

⚠️ Twee valkuilen die deze run bijna verpestten, allebei stil:

1. Het script schreef standaard naar de bestandsnamen van **13 mei** — het zou
   de oorspronkelijke meting hebben overschreven.
2. Een globale replace van `'claude-sonnet-4-6'` → `'claude-sonnet-5'` raakte
   ook **de judge**. Dat zou de vergelijking met mei stilzwijgend ongeldig
   hebben gemaakt: andere meetlat, zelfde ogende getallen. Gevonden doordat een
   crash dwong te kijken waar `temperature` vandaan kwam.

**Rapporten**: `docs/experiments/2026-08-20-per-content-type-herijking-report.md`
(+ `-raw.json`). Het mei-rapport is intact gebleven.

---

# VERVOLG 2026-08-20 — de methode is nagemeten, en het antwoord is hard

De open methodevraag ("één sample per conditie is te weinig") is beantwoord met
**5 samples per conditie**: 240 generaties, 8 content-types × 6 modellen, nul
fouten, $4,00, zelfde judge.

## Uitkomst

**In 7 van de 8 content-types is het verschil tussen winnaar en nummer 2 niet
aantoonbaar.** Gemiddelde sd over 48 condities: **2,9 punten**, dus een verschil
is pas hard vanaf ~5,9. De winnaars liggen 1-4 punten uit elkaar. Alleen
`one-pager` haalt het.

Extreemste conditie: **61-86 op identieke invoer**, sd 9,4. Eén generatie daaruit
is geen score maar een greep — en zo is de tabel in mei tot stand gekomen.

## Besluit

Routing blijft ongewijzigd. De comment in `canvas-model-routing.ts` draagt nu
deze uitkomst, zodat niemand de tabel nog leest als een gemeten optimum.

⚠️ **Dit zegt niet dat de routing fout is**, alleen dat ze niet door deze meting
wordt gedragen. Bij het eerste is er niets te doen; bij het tweede weet je dat je
het niet weet.

## Wat er nu open blijft — een keuze, geen taak

- [x] ~~**Of** een meting die het wél kan dragen~~ — vervallen, zie besluit onderaan: bij sd 2,9 en gewenste
      detectie van 2 punten is dat ruwweg **35 samples per conditie** — 1.680
      generaties, ordegrootte $30. Haalbaar, maar een bewuste investering.
- [x] ~~**Of** stoppen met per-categorie optimaliseren~~ — vervallen, zie besluit onderaan en kiezen op iets dat wél
      stabiel meet: kosten, latency, of instructie-trouw. Dat laatste is de
      sterkste kandidaat — bij de skeleton-bevinding was het verschil 4/4 tegen
      3/5, en dat verdween niet in de ruis.

De tweede is mijn voorkeur: hij is goedkoper én meet iets waarvan we hebben
gezien dat het gebruikers raakt.

---

# BESLUIT 2026-08-20 — routing blijft staan, taak dicht

Erik heeft gekozen: **de routing blijft ongewijzigd en er komt geen vervolgmeting.**
De twee openstaande opties hierboven (35 samples per conditie, of een tweede
as uitmeten) vervallen daarmee.

**Waarom dat een verdedigbare eindstand is**: er is geen gemeten reden om iets te
verplaatsen. Wat er lag was geen aanwijzing dat de routing fout is, maar dat ze
niet is aangetoond — en dat repareer je niet door hem alsnog te verzetten op
dezelfde ruis.

**Wat deze taak wél heeft opgeleverd**, en waarom hij niet voor niets was:

- de comment in `canvas-model-routing.ts` claimt geen gemeten optimum meer, maar
  draagt de ruismarge en de 7-van-8-uitkomst. De volgende die ernaar kijkt hoeft
  de meting niet over te doen om te weten wat ze waard is.
- twee rapporten in `docs/experiments/` (spreiding + instructie-trouw) met de
  ruwe data, zodat een toekomstige meting een vergelijkingspunt heeft in plaats
  van een nieuw nulpunt.
- de mei-meting is intact gebleven; de vergelijking mei → augustus blijft
  mogelijk.

⚠️ **Wat expliciet NIET is opgelost en bij een volgende modelwissel terugkomt**:
er is nog steeds geen mechanisme dat merkt dat de onderbouwing van deze tabel
veroudert. #226 verving in juli drie modellen zonder de meting te herhalen, en
dat viel pas in augustus op — bij toeval, via een bewaker die nergens draaide.
Wie de modellen weer ververst, ververst deze comment niet vanzelf.

Heropenen heeft zin bij: een volgende modelwissel, of wanneer instructie-trouw
een concrete keuze moet dragen (dan eerst meer samples op DIE as, niet op de
kwaliteitsas — dat is de goedkopere en beter discriminerende meting).
