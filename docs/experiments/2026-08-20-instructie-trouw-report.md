# Instructie-trouw per model — 2026-08-20

**Nul nieuwe AI-calls.** Deze meting hergebruikt de 240 generaties uit de
spreidingsmeting van dezelfde dag. De briefs in dat experiment stelden zelf een
woordbereik (`"300-400 woorden"`, `"150-220 woorden"`), en dat is een expliciet
gegeven instructie — dus deterministisch toetsbaar, zonder judge.

**Waarom dit ertoe doet**: de composite-kwaliteitsscore kon in 7 van de 8
content-types de winnaar niet van de nummer 2 onderscheiden (sd 2,9 punten,
winnaars 1-4 punten uit elkaar). Instructie-trouw spreidt over **54
procentpunten**. Wat de ene meting niet kan, kan de andere wel.

## Resultaat

180 van de 240 generaties zijn meetbaar (6 van de 8 content-types noemden een
expliciet woordbereik), 30 per model.

| Model | binnen bereik | 95%-interval | gem. overschrijding |
|---|---:|:---:|---:|
| Claude Opus 4.8 | **87%** | 75–99 | 1% |
| Claude Sonnet 5 | **80%** | 66–94 | 4% |
| Gemini 3.1 Pro | **70%** | 54–86 | 4% |
| GPT-5.6 | **67%** | 50–84 | 2% |
| Gemini 3.5 Flash | **63%** | 46–81 | 2% |
| Claude Haiku 4.5 | **33%** | 16–50 | 10% |

## ⚠️ Wat n=30 wél en niet draagt

**Aangrenzende modellen zijn niet te scheiden.** Elk 95%-interval overlapt met
zijn buur; de volgorde in de tabel is dus geen rangorde.

**De uitersten wél**: `opus-4-8` [75–99] en `haiku-4-5` [16–50] overlappen niet.
Dat verschil is hard.

Dit levert dus **tiers op, geen ranking** — maar dat is meer dan de
kwaliteitsscore gaf, waar zelfs de uitersten per content-type binnen de ruis
lagen.

## Wat dit betekent voor de routing

De huidige tabel stuurt vijf categorieën naar Opus, één naar GPT, één naar
Sonnet en één naar Gemini. Op instructie-trouw is Opus de duidelijke bovenkant en
Haiku de duidelijke onderkant; het middenveld (Sonnet, Gemini Pro, GPT) is met
deze n niet te ordenen.

⚠️ **Dat is geen reden om nu te herverdelen.** Het is een reden om een volgende
keuze op deze as te maken in plaats van op een composite-score — en om, als je
het middenveld écht wilt ordenen, meer samples te draaien op déze meting in
plaats van op de kwaliteitsmeting. Dat is bovendien goedkoper: het scoren is
gratis, alleen de generaties kosten iets.

## Beperkingen, expliciet

- **Eén dimensie.** Woordbereik is niet de enige structurele instructie. De
  skeleton-instructie (`USE EXACTLY`) is een tweede, en daar was het verschil
  4/4 tegen 3/5 tussen sonnet-5 en gpt-5.6 — een andere ordening dan hier. Meer
  dimensies zouden het beeld kunnen kantelen.
- **Zes van de acht content-types.** `search-ad` en `landing-page` noemden geen
  expliciet woordbereik en vallen buiten deze meting.
- **De brief, niet de content-type-spec.** Er is getoetst tegen wat de prompt
  daadwerkelijk vroeg, niet tegen `deliverable-types.ts`. Dat is bewust: een
  model afrekenen op een eis die het nooit kreeg, meet niets.
