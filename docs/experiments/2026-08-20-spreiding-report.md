# Model-routing — spreidingsmeting 2026-08-20

Vervolg op de herijking van dezelfde dag. Daar draaide **één** generatie per
(content-type, model); hier **5**. Zelfde judge (claude-sonnet-4-6),
zelfde prompts.

**De vraag**: de herijking liet 4,0 punten drift zien op ONGEWIJZIGDE modellen,
terwijl de winnaars 1-4 punten uit elkaar lagen. Kan deze meting dat verschil
überhaupt aantonen? Een standaarddeviatie per conditie beantwoordt dat.

### blog-post — Long-Form Content

| Model | gem. | min–max | sd | n |
|---|---:|:---:|---:|---:|
| Claude Opus 4.8 + thinking | **89.2** | 87–91 | 1.6 | 5 |
| GPT-5.6 | **86.4** | 85–88 | 1.1 | 5 |
| Claude Sonnet 5 + thinking | **84.6** | 84–86 | 0.9 | 5 |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **77.0** | 75–80 | 2.3 | 5 |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **74.6** | 73–78 | 2.1 | 5 |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **69.0** | 66–71 | 2.1 | 5 |

Verschil tussen 1 en 2: **2.8** punt, gepoolde sd **1.4**. **Binnen 2 sd — dit verschil is met 5 samples niet aantoonbaar.**

### linkedin-post — Social Media

| Model | gem. | min–max | sd | n |
|---|---:|:---:|---:|---:|
| Claude Sonnet 5 + thinking | **88.6** | 87–90 | 1.3 | 5 |
| GPT-5.6 | **87.8** | 85–91 | 2.4 | 5 |
| Claude Opus 4.8 + thinking | **86.0** | 81–89 | 3.1 | 5 |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **81.0** | 77–86 | 3.4 | 5 |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **76.4** | 72–81 | 3.9 | 5 |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **69.8** | 66–72 | 2.7 | 5 |

Verschil tussen 1 en 2: **0.8** punt, gepoolde sd **1.9**. **Binnen 2 sd — dit verschil is met 5 samples niet aantoonbaar.**

### search-ad — Advertising & Paid

| Model | gem. | min–max | sd | n |
|---|---:|:---:|---:|---:|
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **87.4** | 83–90 | 2.9 | 5 |
| Claude Opus 4.8 + thinking | **87.2** | 84–88 | 1.8 | 5 |
| GPT-5.6 | **86.4** | 84–90 | 2.3 | 5 |
| Claude Sonnet 5 + thinking | **85.2** | 74–89 | 6.4 | 5 |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **83.0** | 81–85 | 1.6 | 5 |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **73.8** | 61–86 | 9.4 | 5 |

Verschil tussen 1 en 2: **0.2** punt, gepoolde sd **2.4**. **Binnen 2 sd — dit verschil is met 5 samples niet aantoonbaar.**

### newsletter — Email & Automation

| Model | gem. | min–max | sd | n |
|---|---:|:---:|---:|---:|
| Claude Opus 4.8 + thinking | **89.4** | 88–90 | 0.9 | 5 |
| Claude Sonnet 5 + thinking | **88.2** | 85–91 | 2.3 | 5 |
| GPT-5.6 | **79.4** | 72–86 | 5.2 | 5 |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **78.8** | 76–84 | 3.6 | 5 |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **77.8** | 73–82 | 3.4 | 5 |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **69.0** | 65–73 | 3.1 | 5 |

Verschil tussen 1 en 2: **1.2** punt, gepoolde sd **1.7**. **Binnen 2 sd — dit verschil is met 5 samples niet aantoonbaar.**

### landing-page — Website & Landing Pages

| Model | gem. | min–max | sd | n |
|---|---:|:---:|---:|---:|
| Claude Sonnet 5 + thinking | **89.4** | 88–90 | 0.9 | 5 |
| Claude Opus 4.8 + thinking | **88.4** | 84–91 | 2.7 | 5 |
| GPT-5.6 | **87.6** | 82–91 | 4.0 | 5 |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **85.0** | 80–89 | 3.4 | 5 |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **81.4** | 76–85 | 3.6 | 5 |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **78.0** | 72–82 | 4.2 | 5 |

Verschil tussen 1 en 2: **1.0** punt, gepoolde sd **2.0**. **Binnen 2 sd — dit verschil is met 5 samples niet aantoonbaar.**

### explainer-video — Video & Audio

| Model | gem. | min–max | sd | n |
|---|---:|:---:|---:|---:|
| Claude Opus 4.8 + thinking | **89.0** | 86–91 | 2.0 | 5 |
| Claude Sonnet 5 + thinking | **88.0** | 85–90 | 1.9 | 5 |
| GPT-5.6 | **86.4** | 83–89 | 2.4 | 5 |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **76.4** | 73–80 | 2.5 | 5 |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **75.6** | 72–82 | 3.8 | 5 |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **71.6** | 66–74 | 3.3 | 5 |

Verschil tussen 1 en 2: **1.0** punt, gepoolde sd **1.9**. **Binnen 2 sd — dit verschil is met 5 samples niet aantoonbaar.**

### press-release — PR, HR & Communications

| Model | gem. | min–max | sd | n |
|---|---:|:---:|---:|---:|
| Claude Opus 4.8 + thinking | **89.4** | 87–91 | 1.7 | 5 |
| GPT-5.6 | **87.8** | 87–89 | 0.8 | 5 |
| Claude Sonnet 5 + thinking | **86.2** | 84–89 | 2.2 | 5 |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **81.6** | 80–83 | 1.3 | 5 |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **77.2** | 74–81 | 2.6 | 5 |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **72.6** | 69–76 | 2.5 | 5 |

Verschil tussen 1 en 2: **1.6** punt, gepoolde sd **1.3**. **Binnen 2 sd — dit verschil is met 5 samples niet aantoonbaar.**

### one-pager — Sales Enablement

| Model | gem. | min–max | sd | n |
|---|---:|:---:|---:|---:|
| Claude Opus 4.8 + thinking | **88.8** | 85–91 | 2.3 | 5 |
| GPT-5.6 | **84.8** | 84–86 | 0.8 | 5 |
| Claude Sonnet 5 + thinking | **83.8** | 72–88 | 6.8 | 5 |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **73.6** | 69–81 | 4.7 | 5 |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **73.4** | 67–81 | 5.6 | 5 |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **71.6** | 65–76 | 4.7 | 5 |

Verschil tussen 1 en 2: **4.0** punt, gepoolde sd **1.7**. Groter dan 2 sd — dit verschil is aantoonbaar.

## Conclusie

**In 7 van de 8 content-types is het verschil tussen de winnaar en de nummer 2
niet aantoonbaar**, zelfs met vijf samples per conditie. Alleen `one-pager` haalt
het (4,0 punt tegen een gepoolde sd van 1,7).

Gemiddelde standaarddeviatie over alle 48 condities: **2.9 punten**.

Een verschil is pas aantoonbaar bij ruwweg 2 sd, dus **5.9 punten**.
De winnaars in de routingtabel liggen 1-4 punten uit elkaar.

## Wat dit betekent voor de routingtabel

De tabel wijst per categorie één model aan als "optimaal", op basis van één
generatie per model in mei. Deze meting doet er vijf per conditie en laat zien
dat die aanwijzing in **zeven van de acht gevallen geen basis heeft**: het
verschil met de nummer 2 verdwijnt in de ruis van het model zelf.

De extreemste conditie spreidt **61 tot 86** op identieke invoer — 25 punten,
sd 9,4. Eén generatie daaruit trekken en die "de score van dit model" noemen is
geen meting maar een greep.

⚠️ **Dit zegt niet dat de routing fout is.** Het zegt dat de routing niet door
deze meting wordt gedragen. De huidige toewijzingen kunnen prima zijn; ze zijn
alleen niet *aangetoond*. Het verschil is belangrijk: bij de eerste is er niets
te doen, bij de tweede weet je dat je niet weet.

## Wat een bruikbare meting zou vragen

- Bij sd ≈ 2,9 en een gewenste detecteerbaarheid van **2 punten** heb je ruwweg
  **35 samples per conditie** nodig — 8 × 6 × 35 = 1.680 generaties, ordegrootte
  $30. Dat is haalbaar, maar het is een bewuste investering en geen bijvangst.
- Goedkoper alternatief: stop met per-categorie optimaliseren en kies één model
  per provider-tier op grond van iets dat wél stabiel meet — kosten, latency, of
  instructie-trouw (zie de skeleton-bevinding, waar het verschil 4/4 tegen 3/5
  was en dus niet in de ruis verdween).
