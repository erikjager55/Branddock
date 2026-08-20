# Per-content-type model comparison — HERIJKING 2026-08-20

> Herhaling van het experiment van 2026-05-13 op de juli-2026-modelgeneratie
> (#226). **Zelfde judge** (`claude-sonnet-4-6`) en zelfde prompts, zodat het
> verschil aan de generatie-modellen is toe te schrijven en niet aan de meetlat.
>
> ⚠️ **Lees eerst de ruismarge onderaan.** Twee modellen zijn ongewijzigd
> gebleven en dienen als controle; hun drift bepaalt wat een verschil in deze
> tabel waard is.
>
> ⚠️ Methodologische afwijking t.o.v. mei: de mei-run stuurde `temperature: 0.7`
> mee bij de generatie, deze niet — dat is geen keuze maar een API-wijziging
> (`temperature` is deprecated voor claude-sonnet-5). Kostenkolom gebruikt
> mei-prijzen en is indicatief.

Autonoom experiment om per content-type categorie het beste model te identificeren. 8 representanten (1 per categorie) × 6 modellen = 48 condities.

## Setup
- **Brand**: Napking (real fingerprint uit DB)
- **Modellen**: Claude Opus 4.8 + thinking, Claude Sonnet 5 + thinking, Claude Haiku 4.5 (CONTROLE — ongewijzigd), GPT-5.6, Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd), Gemini 3.5 Flash (vervangt GPT-5.4 Mini)
- **Judge**: Claude Sonnet 4.6 met 4-dim scoring (style 30 / essence 35 / rules 15 / format 20)

## Per-content-type winnaars

| Content-type | Categorie | Winnaar | Composite | Cost | Latency |
|---|---|---|---:|---:|---:|
| blog-post | Long-Form Content | **Claude Opus 4.8 + thinking** | 90 | $0.0928 | 21.8s |
| linkedin-post | Social Media | **GPT-5.6** | 90 | $0.0106 | 11.2s |
| search-ad | Advertising & Paid | **GPT-5.6** | 90 | $0.0256 | 28.4s |
| newsletter | Email & Automation | **Claude Opus 4.8 + thinking** | 90 | $0.0657 | 12.8s |
| landing-page | Website & Landing Pages | **GPT-5.6** | 91 | $0.0129 | 11.8s |
| explainer-video | Video & Audio | **Claude Opus 4.8 + thinking** | 92 | $0.0604 | 11.3s |
| press-release | PR, HR & Communications | **Claude Opus 4.8 + thinking** | 89 | $0.0887 | 16.4s |
| one-pager | Sales Enablement | **Claude Opus 4.8 + thinking** | 91 | $0.0626 | 12.2s |

## Per-content-type details

### blog-post — Blog post body (Long-Form Content)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.8 + thinking | **90** | 91 | 90 | 93 | 88 | $0.0928 | 21.8s |
| Claude Sonnet 5 + thinking | **85** | 84 | 85 | 90 | 82 | $0.0175 | 17.8s |
| GPT-5.6 | **84** | 82 | 83 | 91 | 85 | $0.0131 | 14.8s |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **81** | 79 | 80 | 85 | 83 | $0.0082 | 27.3s |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **76** | 72 | 74 | 80 | 80 | $0.0016 | 10.8s |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **71** | 68 | 70 | 78 | 72 | $0.0040 | 8.0s |

### linkedin-post — LinkedIn post (Social Media)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| GPT-5.6 | **90** | 91 | 89 | 92 | 87 | $0.0106 | 11.2s |
| Claude Sonnet 5 + thinking | **89** | 87 | 91 | 93 | 85 | $0.0121 | 9.5s |
| Claude Opus 4.8 + thinking | **85** | 88 | 85 | 90 | 78 | $0.0586 | 11.1s |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **83** | 83 | 82 | 88 | 80 | $0.0059 | 16.6s |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **77** | 78 | 75 | 85 | 72 | $0.0011 | 9.0s |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **71** | 68 | 72 | 82 | 65 | $0.0021 | 3.6s |

### search-ad — Google Search Ad (Advertising & Paid)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| GPT-5.6 | **90** | 90 | 88 | 93 | 92 | $0.0256 | 28.4s |
| Claude Opus 4.8 + thinking | **88** | 88 | 85 | 92 | 90 | $0.0313 | 4.2s |
| Claude Sonnet 5 + thinking | **87** | 87 | 84 | 92 | 90 | $0.0092 | 6.5s |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **82** | 80 | 78 | 85 | 90 | $0.0007 | 9.5s |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **81** | 78 | 76 | 88 | 90 | $0.0036 | 20.2s |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **64** | 62 | 70 | 80 | 45 | $0.0015 | 1.6s |

### newsletter — Customer newsletter section (Email & Automation)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.8 + thinking | **90** | 91 | 90 | 93 | 88 | $0.0657 | 12.8s |
| Claude Sonnet 5 + thinking | **87** | 85 | 87 | 90 | 90 | $0.0122 | 10.5s |
| GPT-5.6 | **83** | 80 | 82 | 88 | 85 | $0.0142 | 18.7s |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **78** | 76 | 74 | 82 | 87 | $0.0058 | 17.9s |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **71** | 68 | 65 | 75 | 83 | $0.0012 | 8.0s |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **65** | 62 | 60 | 72 | 75 | $0.0024 | 4.6s |

### landing-page — Landing-page hero (Website & Landing Pages)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| GPT-5.6 | **91** | 90 | 91 | 93 | 92 | $0.0129 | 11.8s |
| Claude Opus 4.8 + thinking | **89** | 88 | 85 | 92 | 95 | $0.0333 | 3.8s |
| Claude Sonnet 5 + thinking | **85** | 85 | 88 | 90 | 78 | $0.0080 | 4.8s |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **85** | 84 | 82 | 89 | 88 | $0.0008 | 9.1s |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **78** | 78 | 76 | 88 | 72 | $0.0039 | 13.6s |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **76** | 72 | 74 | 85 | 80 | $0.0016 | 2.6s |

### explainer-video — Explainer video script (Video & Audio)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.8 + thinking | **92** | 92 | 91 | 94 | 90 | $0.0604 | 11.3s |
| Claude Sonnet 5 + thinking | **89** | 87 | 89 | 93 | 88 | $0.0116 | 9.6s |
| GPT-5.6 | **81** | 82 | 86 | 90 | 62 | $0.0094 | 9.4s |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **76** | 75 | 78 | 80 | 72 | $0.0063 | 11.2s |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **75** | 74 | 76 | 82 | 68 | $0.0012 | 12.2s |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **69** | 68 | 72 | 85 | 55 | $0.0026 | 4.1s |

### press-release — Press release (PR, HR & Communications)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.8 + thinking | **89** | 88 | 87 | 92 | 90 | $0.0887 | 16.4s |
| Claude Sonnet 5 + thinking | **85** | 83 | 84 | 90 | 88 | $0.0169 | 13.2s |
| GPT-5.6 | **81** | 80 | 78 | 88 | 82 | $0.0264 | 29.0s |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **78** | 76 | 79 | 82 | 78 | $0.0086 | 15.9s |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **73** | 72 | 75 | 80 | 68 | $0.0044 | 8.9s |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **73** | 70 | 72 | 74 | 80 | $0.0020 | 10.4s |

### one-pager — Sales one-pager (Sales Enablement)

| Model | Composite | Style | Essence | Rules | Format | Cost | Latency |
|---|---:|---:|---:|---:|---:|---:|---:|
| Claude Opus 4.8 + thinking | **91** | 92 | 91 | 93 | 90 | $0.0626 | 12.2s |
| Claude Sonnet 5 + thinking | **85** | 85 | 84 | 90 | 82 | $0.0119 | 10.6s |
| GPT-5.6 | **83** | 80 | 82 | 88 | 85 | $0.0359 | 36.6s |
| Gemini 3.1 Pro + thinking (CONTROLE — ongewijzigd) | **75** | 74 | 75 | 78 | 72 | $0.0070 | 20.8s |
| Claude Haiku 4.5 (CONTROLE — ongewijzigd) | **72** | 72 | 70 | 85 | 68 | $0.0028 | 5.1s |
| Gemini 3.5 Flash (vervangt GPT-5.4 Mini) | **72** | 70 | 72 | 75 | 74 | $0.0014 | 15.0s |


## ⚠️ Ruismarge — lees dit vóór je een winnaar gelooft

Twee modellen draaiden ongewijzigd t.o.v. 13-05: **Claude Haiku 4.5** en
**Gemini 3.1 Pro**. Zelfde model, zelfde judge, zelfde prompts. Hun verschil
tussen mei en augustus is dus pure meetruis:

| content-type | Haiku Δ | Gemini Δ |
|---|---:|---:|
| blog-post | +5 | +4 |
| linkedin-post | −1 | +3 |
| search-ad | **−13** | **−9** |
| newsletter | +4 | +2 |
| landing-page | −2 | −5 |
| explainer-video | 0 | −3 |
| press-release | −1 | — |
| one-pager | +6 | +2 |

**Gemiddelde absolute drift: 4,0 punten. Uitschieter: 13 punten (search-ad).**

De winnaars in de tabel hierboven liggen 1 tot 4 punten uit elkaar. Dat is
binnen de ruis. Concreet: de twee categorieën die t.o.v. mei van winnaar
wisselen — Advertising & Paid en Website & Landing Pages — doen dat op **0
punten verschil**. Dat is gelijkspel, geen bevinding.

**Conclusie: deze meting kan de verschillen waarop de routingtabel is gebouwd
niet betrouwbaar onderscheiden.** Niet in augustus, en op grond van dezelfde
methode ook niet in mei. Eén generatie per model per content-type is te weinig.

Wie hier ooit weer op wil sturen: meerdere samples per conditie, en rapporteer
een spreiding in plaats van één getal. Zie `tasks/model-routing-herijking.md`.
