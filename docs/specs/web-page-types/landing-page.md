# Landing-page — type-specificatie

> **Doel van dit document**: definieert wat een hoogwaardige landing-page is voor Branddock's web-page builder. Vier secties: onderzoek → anatomie → onderbouwing → doorvertaling. Sectie 4 is de operationele input voor `variantToPuckData()`, `puck-templates/landing-page.ts`, content-generation prompts en de F-VAL judge.
>
> **Created**: 2026-05-26 · **Spec-driver**: web-page-builder-canvas-step-mvp · **Status**: draft (awaiting user review)

**Werkdefinitie van een landing-page**: één bezoeker, één traffic-bron, één gewenste actie. Onderscheidt zich van homepage (multi-purpose) en product-page (catalogus-context).

---

## §1 — Onderzoek

### 16 kerninzichten (10 academisch + 6 praktijk)

#### Academische / industriebrede inzichten

**1. Bezoeker beslist in 3-5 seconden — en doet dat boven de fold**

NN/g eye-tracking studie (Nielsen, 2010) op 21 users, 541 pagina's, 57.453 fixaties: gebruikers besteden **80,3% van hun kijktijd boven de fold**, 19,7% eronder. Topsecties krijgen 5-10 fixaties; middensecties 2-4; onderaan 1 of geen. > "Users will scroll below the fold only if the information above makes them believe the rest of the page will be valuable." — Jakob Nielsen

Implicatie: above-the-fold is geen visuele voorkeur maar een filter. [NN/g 2010](https://www.nngroup.com/articles/scrolling-and-attention-original-research/)

**2. Median conversie = 6,6% — maar industrie bepaalt 3× spread**

Unbounce 2024 Conversion Benchmark Report (41.000 pagina's, 57M conversies, 464M visits):

| Industrie | Mediaan | Top-quartile (P75) |
|---|---:|---:|
| SaaS | 3,8% | 11,6% |
| Ecommerce | 4,2% | 11,4% |
| Professional Services | 6,1% | 14,1% |
| Legal | 6,3% | 13,1% |
| Financial | 8,3% | 26,1% |
| Education | 8,4% | 20% |
| Entertainment | 12,3% | 40,8% |

Implicatie: "good conversion" bestaat niet zonder industrie-context. [Unbounce 2024](https://unbounce.com/landing-pages/whats-a-good-conversion-rate/)

**3. Reading level voorspelt conversie sterker dan copy-lengte**

Unbounce-data: pagina's op 5e-7e graders niveau converteren op 11,1% — 56% beter dan 8e-9e graders niveau. B2B-onderzoek: 5e-7e niveau = **12,9% conversie versus 2,1%** voor "professional-level" copy.

Implicatie: F-VAL judge moet readability-gate hebben. [Unbounce 2024](https://unbounce.com/landing-pages/whats-a-good-conversion-rate/) + [Growth Spree B2B SaaS 2026](https://www.growthspreeofficial.com/blogs/b2b-saas-landing-page-best-practices-demo-conversion-2026)

**4. Body-copy sweet spot: 250-725 woorden, max 50-140 "moeilijke" woorden**

B2B SaaS-benchmarking: pagina's met 250-725 woorden body-copy converteren mediaan 3,8%. Driver: max 50-140 woorden met 3+ lettergrepen. [Growth Spree B2B SaaS 2026](https://www.growthspreeofficial.com/blogs/b2b-saas-landing-page-best-practices-demo-conversion-2026)

**5. Eén CTA wint van meerdere — 13,5% vs 10,5%**

Single-CTA pages converteren mediaan 13,5%, multi-CTA pages 10,5%. No-nav pagina's converteren **2-3× hoger** dan pagina's met volledige navigatie. [Growth Spree 2026](https://www.growthspreeofficial.com/blogs/b2b-saas-landing-page-best-practices-demo-conversion-2026)

**6. Form-velden zijn een conversion-killer — 11 → 4 = +160%**

Reduceren van 11 naar 4 form-velden = +160% conversie. Trade-off: short-form lift volume, long-form lift kwaliteit; B2B-standaard = progressive profiling.

Implicatie: landing-page MVP heeft geen form-component (gap, `forms-builder` v2-task). [Growth Spree 2026](https://www.growthspreeofficial.com/blogs/b2b-saas-landing-page-best-practices-demo-conversion-2026)

**7. Headline is het meest-getoetste element — < 10 woorden, < 44 tekens, benefit-led**

CXL: "If visitors came from an ad, the headline must correspond to the ad text." Optimale headline: benefit-led, 5-10 woorden, max ~44 tekens, resoneert binnen 5 seconden. Falen-patronen: vage abstracties, jargon, generieke superlatieven. [CXL high-converting LP](https://cxl.com/blog/how-to-build-a-high-converting-landing-page/)

**8. Trust-signalen lift conversie 15-32% — testimonials > logos > badges**

A/B-data:
- Klant-logo's (comScore): +69% conversie
- Customer testimonials outperformen logos met 35%
- Trust badges: +32% conversie
- B2B social-proof strategisch geplaatst: +15-30%
- 70% van klanten zoekt trust-signalen vóór ze kopen

Hierarchie: testimonials (concrete quote + foto + naam + functie) > klant-logo's > trust-badges. [Discovered Labs trust signals](https://discoveredlabs.com/blog/social-proof-and-trust-signals-for-conversion-rate-optimization-implementation-and-impact)

**9. Cialdini's 7 principes vertalen direct naar LP-componenten**

| Principe | LP-toepassing | Branddock-component |
|---|---|---|
| Social Proof | Testimonials, klant-logo's | Testimonial (vandaag) + logo-strip (gap) |
| Authority | Credentials, press, statistieken | RichText (geen structureel component) |
| Scarcity | Limited-time offers, countdown | Gap |
| Commitment/Consistency | Multi-step opt-in | Niet relevant zonder forms |
| Reciprocity | Free trial, gratis resource | CTA-aard |
| Liking | Persona-match, taalstijl | Brand-voice + BrandHero |
| Unity | Insider-language | Brand-voice + persona |

Implicatie: huidige 8 componenten dekken 3 van 7 principes goed. [CXL Cialdini 7 principes](https://cxl.com/blog/cialdinis-principles-persuasion/) + [Unbounce 6 principes](https://unbounce.com/landing-pages/six-principles-of-persuasion-landing-pages/)

**10. Hero-formule: 4 elementen + visuele transformatie (2026-standaard)**

Klassieke hero: headline + subhead + CTA + visual. 2026-update (Linear, Notion, Framer): story-driven hero met micro-animatie of workflow-illustratie binnen 3-5 seconden. Branddock's `BrandHero` mist visueel veld → v2-gap. [Growth Spree 2026](https://www.growthspreeofficial.com/blogs/b2b-saas-landing-page-best-practices-demo-conversion-2026)

#### Praktijk-perspectief (Frankwatching + NL conversie-blogs)

**11. De 2-seconden-regel — strenger dan academische 3-5s**

Rosalie Albergati (LeadLogic, 2023): "In 2 seconden moet duidelijk zijn waar de pagina over gaat." 4 elementen die boven de fold zichtbaar moeten zijn: titel + intro + CTA + afbeelding. [Frankwatching 7-stappen 2023](https://www.frankwatching.com/archive/2023/02/16/landingspagina-conversie/)

**12. 4 vragen die elke LP binnen seconden moet beantwoorden**

Marc Overvoorde (2024): "Wie ben ik? Wat biedt de pagina? Wat zijn de voordelen? Wat is de volgende stap?" → directe operationalisatie voor F-VAL judge-rubric. [Frankwatching anatomie 2024](https://www.frankwatching.com/archive/2024/12/10/essentiele-onderdelen-goede-landingspagina/)

**13. Review-score 4.2-4.5 is authentieker dan 5.0**

Overvoorde (2024): perfectie leest als gefingeerd. Niet-evidente inverted heuristic — niet in academische bronnen. [Frankwatching anatomie 2024](https://www.frankwatching.com/archive/2024/12/10/essentiele-onderdelen-goede-landingspagina/)

**14. Bezwaren-ontkrachting als verplichte sectie (NL-practitioner-stijl)**

Albergati: "Door bezwaren te benoemen en weg te nemen, maak je de weg vrij voor aankoop." Niet als FAQ maar als expliciete objection-handling sectie. Dominant in NL B2B-marketing. [Frankwatching 7-stappen 2023](https://www.frankwatching.com/archive/2023/02/16/landingspagina-conversie/)

**15. Scanners vs methodische lezers — bied beide niveaus**

Dual-track architectuur: above-the-fold voor 80% (scanners), below-the-fold voor 20% (methodisch). Niet weglaten, **scheiden** op leesdiepte. [Frankwatching 7-stappen 2023](https://www.frankwatching.com/archive/2023/02/16/landingspagina-conversie/)

**16. 6 cognitieve-bias-principes naast Cialdini**

| Principe | Bron | LP-toepassing |
|---|---|---|
| Paradox of Choice | Barry Schwartz (2004) | Filters/categorieën ipv lange opties-lijst |
| Loss Aversion | Kahneman & Tversky (1979) | "Mis geen kans" framing |
| Decoy Effect | Huber et al. (1982) | 3-prijspunten waarbij middelste wint |
| Pain of Paying | Knutson et al. (2007 fMRI) | €-symbool weglaten/verkleinen |
| Anchoring Effect | Tversky & Kahneman (1974) | Originele prijs vóór korting |
| Goal-Gradient Effect | Hull 1932 → Kivetz 2006 | Voortgangsbalk al deels gevuld |

Vertaalt naar copy-instructies (variant-generator) en F-VAL judge-prompts. [Frankwatching psychologie 2022](https://www.frankwatching.com/archive/2022/07/28/conversie-optimaliseren-psychologie/)

**Bonus frameworks**: LIFT-model (Value Prop / Urgency / Relevance / Clarity / Distraction / Anxiety — WiderFunnel 2009) en Fogg's Behavior Model (Motivation + Ability + Trigger — Stanford 2009).

### Source-tabel

| Bron | Type | Sample / methodologie | Datum | Tier |
|---|---|---|---|---|
| [NN/g — Scrolling and Attention](https://www.nngroup.com/articles/scrolling-and-attention-original-research/) | Eye-tracking | 21 users, 541 pagina's, 57.453 fixaties | 2010 | 1 |
| [Unbounce Conversion Benchmark](https://unbounce.com/landing-pages/whats-a-good-conversion-rate/) | Industriedata | 41.000 pagina's, 57M conversies | 2024 | 1 |
| [Unbounce 6 Cialdini-principes](https://unbounce.com/landing-pages/six-principles-of-persuasion-landing-pages/) | Framework | Practitioner + academisch | n.d. | 1 |
| [CXL — High-converting LP](https://cxl.com/blog/how-to-build-a-high-converting-landing-page/) | Framework + cases | Practitioner-research | n.d. | 1 |
| [CXL — Cialdini 7 principes](https://cxl.com/blog/cialdinis-principles-persuasion/) | Academische toepassing | Cialdini + LP-cases | n.d. | 1 |
| [Growth Spree B2B SaaS Benchmarks](https://www.growthspreeofficial.com/blogs/b2b-saas-landing-page-best-practices-demo-conversion-2026) | Benchmark | Aggregated B2B-data | 2026 | 2 |
| [Discovered Labs Trust signals](https://discoveredlabs.com/blog/social-proof-and-trust-signals-for-conversion-rate-optimization-implementation-and-impact) | A/B-cases | Publieke studies | n.d. | 2 |
| [Klientboost 18 social-proof tactieken](https://www.klientboost.com/landing-pages/landing-page-testimonials/) | Cases | Klant-data + literatuur | n.d. | 2 |
| [Frankwatching — Anatomie (Overvoorde)](https://www.frankwatching.com/archive/2024/12/10/essentiele-onderdelen-goede-landingspagina/) | 8-onderdelen framework | Practitioner | 2024-12-10 | 2 |
| [Frankwatching — 7 stappen (Albergati)](https://www.frankwatching.com/archive/2023/02/16/landingspagina-conversie/) | 7-stappen | Practitioner | 2023-02-16 | 2 |
| [Frankwatching — 6 psychologische trucs (Pot)](https://www.frankwatching.com/archive/2022/07/28/conversie-optimaliseren-psychologie/) | Cognitive biases | Practitioner + academisch | 2022-07-28 | 2 |
| [Frankwatching — Psychologie cruciaal in CRO](https://www.frankwatching.com/archive/2018/10/18/het-waarom-achter-gedrag-psychologie-is-cruciaal-in-cro/) | Framework | n.b. | 2018-10-18 | 2 |
| [Marketingfacts — 10 concrete tips](https://www.marketingfacts.nl/berichten/10-concrete-tips-voor-een-converterende-landingspagina/) | Checklist | Practitioner | n.d. | 2 |

---

## §2 — Anatomie

> Macro-anatomie: 8 secties in vaste conversie-volgorde (Overvoorde 2024). Binnen elke sectie een micro-anatomie van verplichte + optionele elementen. Het geheel volgt de **dual-track architectuur** uit inzicht #15: above-the-fold (80% scanners) → scroll-deep (20% methodische lezers).

### Macro-overzicht — 8 secties in volgorde

| # | Sectie | Fold-positie | Doel | Verplicht? | Onderbouwing (§1) |
|---|---|---|---|---|---|
| 1 | Hero | Above | Bezoeker in 2s overtuigen op juiste plek te zijn | Ja | #1, #7, #10, #11, #12 |
| 2 | Trust-strip | Above (direct onder hero) | Cognitieve drempel verlagen | Ja (1 vorm min) | #8, #9 |
| 3 | Probleem-articulatie | Direct onder fold | Pijn benoemen vóór oplossing | Optioneel | #6 reciprocity, #14 |
| 4 | Oplossing / Features | Mid-scroll | Pijn → uitkomsten vertalen | Ja | #7, #16 anchoring |
| 5 | Social proof (uitgebreid) | Mid-scroll | Beloftes onderbouwen | Ja | #8, #9 |
| 6 | Pricing / Value | Late scroll | Prijs als objection verwijderen | Optioneel | #16 anchoring + decoy |
| 7 | Objection handling (FAQ) | Late scroll | Bezwaren weghalen | Ja | #14 |
| 8 | Final CTA + footer | Bottom | Tweede commitment-moment | Ja | #5 single-CTA |

**Globale regels** (gelden voor alle secties):
- Single CTA-doel door de hele pagina
- Geen sitebrede navigatie
- Sticky CTA-bar of CTA-herhaling above + below fold

### Sectie 1 — Hero

**Doel**: 2-seconden-test doorstaan (4 vragen beantwoorden — inzicht #12).

**Micro-anatomie verplicht**:
- Headline: 5-10 woorden, max ~44 tekens, benefit-led; echo van traffic-bron
- Subhead: 1-2 zinnen, context + pijnpunt-erkenning
- Primary CTA: action-led werkwoord; zichtbaar zonder scrollen
- Visual support: workflow-illustratie of micro-loop (2026-standaard)

**Optioneel**: trust-snippet of secondary CTA (Hobson's Choice +1).

**Best-in-class**: Linear, Notion, Coolblue.

**Veelvoorkomende fouten**: "Welkom bij..." headlines; "Lees meer" CTA; decoratieve stockfoto.

### Sectie 2 — Trust-strip

**Doel**: cognitieve drempel verlagen vóór scroll. Activeert Cialdini Authority + Social Proof.

**Drie patronen (kies 1)**:
1. Klant-logo's (5-7 in horizontale rij)
2. Persoonlijke testimonial met foto + naam + functie + bedrijf
3. Authority-statement (keurmerk + badge)

**Plek**: direct onder hero, vóór scroll.

**Best-in-class**: Stripe (logo-rij), Booking.com (realtime stats), Frank Energie (keurmerken).

**Fouten**: fake 5.0-scores (#13); obscure logo's; 2015-stijl trust-badges.

### Sectie 3 — Probleem-articulatie (optioneel)

**Doel**: pijn benoemen vóór oplossing. Sterk voor considered purchases.

**Micro-anatomie**: heading (pijn als vraag/stelling) + 3-5 frustratie-bullets + bridging-zin naar oplossing.

**Best-in-class**: Slack ("Your team is busy. Your tools shouldn't be."), Tony's Chocolonely (mission-led).

**Fouten**: vage pijn ("uitdagingen in het bedrijfsleven"); doom-and-gloom zonder bridge; mismatch met ad-copy.

### Sectie 4 — Oplossing / Features

**Doel**: product/dienst concretiseren — vertaald naar uitkomsten, niet specs.

**Micro-anatomie**:
- Sectie-heading: uitkomst-belofte herhalen
- 3-5 feature-blokken met icon + heading (2-4 woorden) + body (1-2 zinnen benefit-frame)
- Optioneel: product-screenshot per feature

**Volgorde**: belangrijkste eerst (anchoring #16). Niet alfabetisch.

**Aantallen**: 3 features = scanner-vriendelijk; 4-5 = B2B-standaard; 6+ = paradox of choice risico, splits.

**Best-in-class**: Linear (4 features met scrollende UI), Notion (6 features consistent), HEMA (3-woord-beloftes).

**Fouten**: feature-names ipv benefits; 8+ features zonder hierarchie; generic icons; spec-tekst.

### Sectie 5 — Social proof (uitgebreid)

**Doel**: bewijs voor beloftes uit sectie 1+4.

**Vier vormen (kies 1-2)**:
1. Uitgebreide testimonials: 2-3 quote-blokken met foto + naam + functie + bedrijf + concrete uitkomst
2. Case study card: 1 dieper voorbeeld met logo + 2-3 metrics
3. User-counts / impact-stats: "10.247 bedrijven..." (niet ronde aantallen)
4. Press-mentions

**Best-in-class**: Stripe (case studies), Coolblue (review-score + count), Tony's Chocolonely (impact-stats).

**Fouten**: stockfoto-testimonials; geen achternaam; fake press-logos.

### Sectie 6 — Pricing / Value (conditioneel)

**Doel**: prijs als objection verwijderen. **Alleen** als prijs een bekende koop-barrière is.

**Micro-anatomie**:
- 3 prijsopties (decoy-effect — middelste highlighted)
- Per optie: prijs prominent + 3-5 features + CTA
- Pain-of-paying: €-symbool klein/weg, "vanaf €X" framing, jaar ipv maand
- Anchoring: hoogste prijs of "normaal €X, nu €Y"

**Best-in-class**: Mailchimp, Linear, Notion.

**Fouten**: 6+ tiers; "Contact for pricing" voor self-serve doelgroep; decoy-tier verkeerd geprijsd.

### Sectie 7 — Objection handling / FAQ

**Doel**: bezwaren weghalen vóór CTA (inzicht #14).

**Micro-anatomie**: 5-8 vragen geordend op gewicht; antwoorden 2-4 zinnen, direct.

**Objection-categorieën**: prijs / implementatie-tijd / lock-in / security / vergelijking / geschiktheid.

**Best-in-class**: Linear (accordion, 5 vragen), Stripe (inline), Bol.com (expand-toggle).

**Fouten**: vragen die niemand stelt; antwoorden die herhalen; geen FAQ bij complexe/risico-averse doelgroep.

### Sectie 8 — Final CTA + footer

**Doel**: tweede commitment-moment.

**Micro-anatomie**:
- Heading: belofte herhalen
- Subhead: risico-reductie ("Geen creditcard nodig")
- Primary CTA: IDENTIEK aan hero-CTA
- Footer: minimaal — bedrijf, contact, Privacy, Voorwaarden

**Best-in-class**: Linear (minimaal), Coolblue (retail-rijker), Frank Energie (CTA-strip herhaling).

**Fouten**: footer-als-sitenav; inconsistente CTA-tekst; geen risico-reductie.

### Information-hierarchy samenvattend

```
═══ ABOVE THE FOLD (80% kijktijd) ═══
[ 1. Hero — 4 elementen ]
[ 2. Trust-strip — 1 vorm ]

─── SCROLL START — scanners stoppen hier ───

[ 3. Probleem-articulatie (optioneel) ]
[ 4. Features — 3-5 blokken ]
[ 5. Social proof uitgebreid ]
[ 6. Pricing (conditioneel) ]
[ 7. Objection handling / FAQ ]
[ 8. Final CTA + minimal footer ]

═══ BELOW FOLD (20% kijktijd — methodische lezers) ═══
```

### Best-in-class overzicht

| Brand | Sterkste element | Wat opvalt | Tier |
|---|---|---|---|
| Linear | Hero + minimal footer | Single-CTA streng; story-driven hero | 1 |
| Notion | Features-grid + FAQ | Veel content, consequente layout | 1 |
| Stripe | Social proof | Authority via klantenlijst | 1 |
| Framer | Hero typografie + motion | Bold-statement design | 1 |
| Coolblue.nl | Social proof (4.6 + 24.382 reviews) | Authenticiteit via spread (#13) | 1 |
| Bol.com | Pricing + reviews | Inline product-reviews | 2 |
| Booking.com | Urgency + social proof | Realtime scarcity | 1 |
| Frank Energie | Footer + keurmerken | Minimal nav | 2 |
| Tony's Chocolonely | Mission-driven hero | Probleem als hoofdmessage | 1 |
| HEMA | Brand-consistency | Visual unity | 2 |

---

## §3 — Waarom dit werkt

> §2 beschreef *wat*. §3 verklaart *waarom* deze anatomie consistent emergeert uit cognitieve fundamenten — niet als folklore, maar als directe consequentie van menselijke besluitvorming. Vier overlappende frameworks.

### Vier cognitieve fundamenten

#### Fundament A — Fogg's Behavior Model: B = MAT

BJ Fogg (Stanford 2009): gedrag = motivatie + ability + trigger, **tegelijk aanwezig**. Mist één → geen conversie.

- Motivatie ← hero-belofte + social proof + probleem-articulatie
- Ability ← form-reductie, jargon-vrije copy (5e-7e graders = +56%), no-nav
- Trigger ← CTA-zichtbaarheid above-fold + scarcity-cues + "volgende stap"

Geen sectie mag tegelijk twee van M/A/T verlagen.

#### Fundament B — Cialdini's 7 principes als sociale heuristieken

Cialdini (1984, 2016): high-cognitive-load → System-1 leunt op 7 sociale shortcuts.

| Principe | Cognitief mechanisme | Anatomie-element |
|---|---|---|
| Social Proof | "Anderen kozen → veilig" | Trust-strip + uitgebreide social-proof |
| Authority | "Experts kozen → legitiem" | Press + certificeringen + case studies |
| Scarcity | Loss aversion: missen voelt zwaarder | Urgency-cues + limited availability |
| Reciprocity | "Zij gaven mij → ik geef terug" | Free trial, freemium-CTA |
| Commitment/Consistency | Kleine ja → grotere ja | Multi-step opt-in |
| Liking | Voorkeur voor herkenbare partijen | Brand-voice + persona-targeted copy |
| Unity | Insider-group-bias | Community-signals, "we"-taal |

Sterke LP activeert minimaal 3 principes (idealiter 5+).

#### Fundament C — Kahneman's System 1 & cognitieve biases

Daniel Kahneman (Nobel 2002): mensen denken via System 1 (snel, intuïtief) en System 2 (langzaam, deliberatief). LP-bezoekers staan default in System 1.

| Bias | Wetenschappelijke basis | LP-toepassing |
|---|---|---|
| Loss Aversion | Tversky/Kahneman 1979 (Prospect Theory) | "Verlies geen kans" framing |
| Anchoring | Tversky/Kahneman 1974 | Hoogste prijs eerst |
| Decoy Effect | Huber/Payne/Puto 1982 | 3-prijspunten, middelste sterker |
| Pain of Paying | Knutson et al. 2007 (fMRI insula) | €-symbool weglaten |
| Goal-Gradient | Hull 1932 → Kivetz 2006 | Voortgangsbalk al deels gevuld |
| Paradox of Choice | Schwartz 2004 | Max 3-5 opties |

Niet "tricks" maar architectuur-keuzes.

#### Fundament D — NN/g attention-economics

Nielsen Norman (2010): 80/20 above/below fold + declinerende fixaties. 8-secties-volgorde is **niet inwisselbaar** — secties 1+2 doen 80% van het werk.

### Cross-mapping: fundament → anatomie-sectie

| Sectie | Primair | Secundair | Tertiair |
|---|---|---|---|
| 1. Hero | NN/g attention | Fogg trigger | Liking |
| 2. Trust-strip | Cialdini Social Proof + Authority | Kahneman System-1 | Fogg motivatie |
| 3. Probleem | Liking (empathie) | Loss Aversion | Reciprocity |
| 4. Features | Fogg ability | Anchoring | Processing fluency |
| 5. Social proof | Social Proof + Authority | Cognitive load | Liking |
| 6. Pricing | Anchoring + Decoy + Pain-of-Paying | Paradox of Choice | Reciprocity |
| 7. FAQ | Fogg ability | Authority | Commitment-prep |
| 8. Final CTA | Fogg trigger | Loss Aversion (risico-reductie) | Goal-gradient |

Elke sectie activeert **3 fundamenten tegelijk** — een sectie weghalen zwakt minimaal 3 cognitive-systems af.

### Risico's per sectie weglaten

| Sectie verkeerd doen | Cognitive failure-mode | Wat bezoeker voelt |
|---|---|---|
| Hero geen CTA above-fold | Trigger ontbreekt (Fogg) | "Wat moet ik?" → exit |
| Geen trust-strip | Geen safety-signaal → System-1 wantrouwen | "Klopt dit?" → vertraagde scroll |
| Features als specs ipv benefits | Ability-fail | "Te ingewikkeld" → uitstel |
| Geen social-proof | Beloftes niet onderbouwd | "Marketing-praatjes" → exit |
| Pricing zonder anchor/decoy | Anchoring-fail | "Te duur, geen vergelijking" |
| Geen FAQ | Drempels blijven | "Maar wat als..." → uitstel |
| Final CTA inconsistent | Consistency-bias schending | "Iets klopt niet" → wantrouwen |
| Multi-CTA pagina-breed | Paradox of Choice | "Welke is juist?" → geen keuze |
| Sitebrede navigatie | Distraction (LIFT-model) | Klikt weg → conversie verloren |

### Convergentie

De 8-secties-anatomie is convergente uitkomst van vier onafhankelijke wetenschappelijke tradities (Fogg, Cialdini, Kahneman, NN/g). Drievoudig peer-validated — sterkste reden om dit als basis voor de deterministische mapper te nemen.

---

## §4 — Doorvertaling Branddock

### §4a — Component-gap-analyse

Huidige 8 Puck-componenten (`puck-config.tsx`):

| # | Component | Anatomie-dekking | Gap / actie |
|---|---|---|---|
| 1 | BrandHero | Sectie 1 | **Gap**: geen heroVisual-veld (#10). MVP: image-URL veld toevoegen; v2 animatie-slot |
| 2 | BrandCTA | Final CTA-element | Verifieer riskReducer-subhead. Zo niet: optioneel veld erbij |
| 3 | FeatureGrid | Sectie 4 | OK. Verifieer icon-veld (lucide-enum, geen emoji) |
| 4 | Testimonial | Sectie 5 single | OK voor single. **Gap**: geen multi-grid; case-card met metrics. v2 |
| 5 | PricingTable | Sectie 6 | Verifieer 3-tier decoy + highlighted-flag |
| 6 | FAQ | Sectie 7 | OK. Verifieer order-controle |
| 7 | Footer | Sectie 8 | OK. Verifieer minimal-default |
| 8 | RichText | Generic fallback | OK na markdown-fix. Toezicht: niet alles-eronder-veegt |

**Drie missing componenten — v2-werk** (v2-task `web-page-builder-anatomy-components`):
1. `TrustStrip` — sectie 2 (logo-rij of stat-card)
2. `PainBullets` — sectie 3 (heading + bullets + bridging-zin)
3. `ImpactStats` — sectie 5 (3-4 stat-cards met grote typografie)

**MVP-beslissing**: niet bouwen. Workaround via FeatureGrid + RichText met expliciete variant-mapping.

### §4b — Deterministische variant→component mapping

Vervang heuristic `parseMarkdownArticle()` door expliciete velden-mapping.

**Verplicht variant-schema voor landing-page**:

```typescript
type LandingPageVariantContent = {
  hero: {
    headline: string;           // 5-10 woorden, max 44 tekens
    subhead: string;            // 1-2 zinnen
    primaryCta: string;         // action-led
    secondaryCta?: string;      // Hobson's Choice +1
    heroVisualUrl?: string;     // v2 placeholder
  };
  trust: {
    type: 'logos' | 'testimonial-quote' | 'authority-statement';
    items: Array<{ label: string; mediaUrl?: string }>; // max 7
  };
  problem?: {
    heading: string;
    painBullets: string[];      // 3-5
    bridgingSentence: string;
  };
  features: {
    sectionHeading: string;
    items: Array<{ icon: string; heading: string; body: string }>; // 3-5
  };
  socialProof: {
    testimonials: Array<{
      quote: string;
      authorName: string;
      authorRole: string;
      authorCompany: string;
      outcome?: string;
    }>; // 1-3
    impactStats?: Array<{ value: string; label: string }>; // max 4
  };
  pricing?: {
    tiers: Array<{
      name: string;
      price: string;
      features: string[];
      highlighted: boolean;
    }>; // exactly 3
  };
  faq: {
    items: Array<{ question: string; answer: string }>; // 5-8
  };
  finalCta: {
    heading: string;
    riskReducer: string;
    primaryCta: string;         // IDENTIEK aan hero.primaryCta
  };
};
```

**Mapping naar Puck-componenten**:

| Variant-veld | Puck-component | Prop-mapping |
|---|---|---|
| hero.headline | BrandHero | headline |
| hero.subhead | BrandHero | sub |
| hero.primaryCta | BrandHero | ctaLabel |
| trust.items (logos) | FeatureGrid (workaround) | columns: 3, features[].title |
| trust.items (testimonial) | Testimonial | quote, author, personaId |
| problem.* | RichText (workaround) | content (markdown-formatted) |
| features.items[] | FeatureGrid | features[] met title + description |
| socialProof.testimonials[] | Meerdere Testimonial-componenten | per testimonial 1 component |
| socialProof.impactStats | FeatureGrid (workaround) | columns: 4, features[].title = value |
| pricing.tiers[] | PricingTable | tiers[] met highlighted-flag |
| faq.items[] | FAQ | items[] met question + answer |
| finalCta.* | BrandCTA | label + secondaryLabel (riskReducer) |

**Voordeel**: geen silent content-drop; F-VAL kan completeness controleren; per-type herhaalbaar patroon.

### §4c — Per-type template-skelet

Vervang `puck-templates/landing-page.ts`:

```typescript
import type { Data } from '@puckeditor/core';

export const landingPageTemplate: Data = {
  content: [
    // Sectie 1: Hero
    { type: 'BrandHero', props: { headline: '', sub: '', ctaLabel: '' } },

    // Sectie 2: Trust-strip (MVP via FeatureGrid)
    { type: 'FeatureGrid', props: { columns: '3', features: [] } },

    // Sectie 3: Probleem-articulatie (optional, conditional)
    { type: 'RichText', props: { content: '' } },

    // Sectie 4: Features
    { type: 'FeatureGrid', props: { columns: '3', features: [] } },

    // Sectie 5: Social proof
    { type: 'Testimonial', props: { quote: '', author: '', personaId: '' } },
    // additional Testimonials appended at runtime

    // Sectie 6: Pricing (conditional)
    { type: 'PricingTable', props: { tiers: [] } },

    // Sectie 7: FAQ
    { type: 'FAQ', props: { items: [] } },

    // Sectie 8: Final CTA
    { type: 'BrandCTA', props: { label: '', href: '', personaId: '' } },

    // Footer (minimaal)
    { type: 'Footer', props: { companyName: '', tagline: '', links: [] } },
  ],
  root: { props: { title: 'Landing page' } },
};
```

**Conditional-render-regels** (in `variantToPuckData()`):
- Sectie 3 alleen als variant.problem aanwezig
- Sectie 6 alleen als variant.pricing aanwezig
- Sectie 2 altijd vereist; ontbreekt → generator moet eerst itereren

### §4d — F-VAL judge dimensies

6 type-specifieke dimensies bovenop generieke F-VAL (style 35% / judge 45% / rules 20%):

| # | Dimensie | Score-criteria | Bron |
|---|---|---|---|
| 1 | Hero clarity (2s-test) | Beantwoordt headline+sub+CTA samen 4 vragen binnen 2s? 0-10 | #11, #12 |
| 2 | Single-CTA discipline | Alle CTA's drijven naar zelfde actie? 0=multi, 10=single | #5 |
| 3 | Readability | Flesch-Kincaid 5e-7e graders? Difficult-words <140? | #3, #4 |
| 4 | Social proof presence | Trust-strip above-fold + uitgebreide sectie aanwezig? | #8, #9 |
| 5 | Anatomie-completeness | Alle 8 verplichte secties? (3+6 conditional) | §2 |
| 6 | Objection coverage | FAQ dekt min 3 koop-barrières? | #14 |

**Composite-gewichten** (voorlopig, te tunen na pilot):
- Hero clarity 20%
- Single-CTA discipline 15%
- Readability 15%
- Social proof presence 15%
- Anatomie-completeness 20%
- Objection coverage 15%

Composite <70 → auto-iterate trigger (sluit aan bij Phase 6.11 non-improvement-reject).

**Judge-prompt skelet**:

```
Je bent een conversion-optimization expert. Beoordeel deze landing-page op
6 dimensies. Per dimensie: score 0-10 + 1-zin onderbouwing + concrete
suggestie als score <7.

Pagina-content: {puckData}
Brand-context: {brandContext}
Doelgroep: {persona}

Dimensies:
1. Hero clarity (2s-test, 4 vragen): ...
2. Single-CTA discipline: ...
3. Readability (5e-7e niveau, max 140 difficult words): ...
4. Social proof presence (trust-strip above-fold + uitgebreide sectie): ...
5. Anatomie-completeness (verplichte secties van §2 spec): ...
6. Objection coverage (FAQ adresseert 3+ koop-barrières): ...

Output JSON:
{
  "dimensions": [{ "id": 1, "score": 0-10, "reasoning": "...", "suggestion": "..." }],
  "compositeScore": gewogen-gemiddelde,
  "shouldAutoIterate": compositeScore < 70
}
```

### Implementatie-volgorde (post-spec)

Pas **na akkoord op deze spec**:

1. **`variantToPuckData()` refactor** voor landing-page (vervang `parseMarkdownArticle` door deterministische mapper §4b). Geschat: 4-6u.
2. **Content-generation prompt update** zodat variants in gestructureerde JSON komen (§4b schema). Geschat: 2-3u + 1-2u test op pilot-content.
3. **Template-skelet update** `puck-templates/landing-page.ts` per §4c. Geschat: 1u.
4. **F-VAL judge dimensies** — `evaluatePageQualityViaFVAL` adapter uitbreiden met 6 type-specifieke dimensies + composite-gewichten per §4d. Geschat: 4-6u.

**Niet in MVP**: bouw van TrustStrip / PainBullets / ImpactStats componenten (v2-task).

---

## Referenties

- Idea-doc: [`tasks/_drafts/idea-landing-page-builder.md`](../../../tasks/_drafts/idea-landing-page-builder.md)
- Task-file: [`tasks/web-page-builder-canvas-step-mvp.md`](../../../tasks/web-page-builder-canvas-step-mvp.md)
- ADR: [`docs/adr/2026-05-22-landing-page-builder-architectuur.md`](../../adr/2026-05-22-landing-page-builder-architectuur.md)
- Sister-specs (volgen na review van deze): `product-service-page.md`, `faq-page.md`, `comparison-page.md`, `campaign-microsite.md`
