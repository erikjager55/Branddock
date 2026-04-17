# QonnecQt.ai — Brand Audit Rapport

**Datum**: 17 april 2026
**Uitgevoerd door**: Branddock AI Platform
**Workspace**: QonnecQt.ai

---

## 1. Proces

Er zijn twee analyses uitgevoerd op de QonnecQt.ai workspace:

### 1.1 Website Scan (Brandstyle Analyzer)
De Branddock Brandstyle Analyzer heeft de website [qonneqt.ai](https://qonneqt.ai) gescraped en geanalyseerd. Hierbij wordt automatisch het volgende gedetecteerd:
- Kleurenpalet (uit CSS variabelen, inline styles, en externe stylesheets)
- Typography (font families, font sizes, type scale)
- Tone of Voice (uit websitetekst)
- Visuele taal (corners, shadows, spacing, depth)
- Logo's en beeldmateriaal

### 1.2 Brand Alignment Check
Na de website scan en het invullen van brand assets (Brand Personality, Brand Story, Core Values, Golden Circle, etc.) is de Brand Alignment AI Scanner gedraaid. Deze analyseert 6 modules op interne consistentie en geeft een alignment score.

**Twee scans zijn gedraaid:**

| Scan | Score | Aligned | Review | Misaligned | Items |
|------|-------|---------|--------|------------|-------|
| Scan 1 (voor fixes) | **57%** | 8 | 4 | 12 | 24 |
| Scan 2 (na fixes) | **83%** | 21 | 5 | 3 | 29 |

**Verbetering: +26 procentpunt** door het invullen van lege brand assets.

---

## 2. Doorgevoerde fixes

### 2.1 Website Scan: WordPress kleurenpalet verwijderd

**Probleem**: De eerste scan toonde 12 kleuren die niet bij QonnecQt hoorden. Dit waren de standaard WordPress/Gutenberg editor kleuren (`--wp--preset--color--vivid-red`, `--wp--preset--color--luminous-vivid-orange`, etc.) die door WordPress automatisch in de CSS worden geplaatst.

**Oorzaak**: De scraper gaf CSS variabelen uit `:root` de hoogste prioriteit. WordPress plaatst 12 standaardkleuren als `:root` variabelen, waardoor echte merkkleuren verdrongen werden.

**Fix (technisch)**:
- `isCmsPresetVariable()` filter toegevoegd dat WordPress (`--wp--preset--*`), Elementor (`--e-global-color-*`), Squarespace (`--sqs-*`), Wix (`--wix-*`) en Shopify (`--color-base-*`) preset variabelen automatisch overslaat
- WordPress standaard hex waarden (#ABB8C3, #F78DA7, #CF2E2E, #FF6900, #FCB900, #7BDCB5, #00D084, #8ED1FC, #0693E3, #9B51E0) toegevoegd aan de framework-kleurenfilter
- Filter werkt op drie niveaus: `:root` variabelen, `var()` referenties, en raw hex waarden

**Resultaat voor na**:

| Voor (WordPress defaults) | Na (echte merkkleuren) |
|---|---|
| #CF2E2E Bold Red | **#D4A853 Golden Amber** (PRIMARY) |
| #FF6900 Vibrant Orange | **#CC3366 Magenta Pink** (ACCENT) |
| #FCB900 Bright Amber | **#69727D Slate Gray** (NEUTRAL) |
| #F78DA7 Soft Pink | **#FFBC7D Peach** (ACCENT) |
| #0693E3 Ocean Blue | **#D9534F Coral Red** (SEMANTIC) |

### 2.2 Website Scan: Timeout fix

**Probleem**: Bij eerdere scanpogingen verscheen "Scan encountered errors — Extraction failed: This operation was aborted".

**Oorzaak**: De fetch timeout stond op 15 seconden. Veel websites (inclusief WordPress-sites met veel plugins) laden trager.

**Fix**:
- Timeout verhoogd van 15s naar 30s
- Automatische retry (1x) bij timeout na 2 seconden wachttijd
- Browser-achtige HTTP headers toegevoegd om bot-detectie te verminderen
- Gemini AI fallback: als directe scraping volledig faalt, wordt Google Gemini met Search grounding ingezet om basale merkdata te extraheren

### 2.3 Brand Foundation: assets ingevuld

Na de eerste alignment scan (57%) zijn de volgende brand assets ingevuld:
- Brand Personality (Sage archetype, Competence dimension, tone dimensions)
- Brand Story (anti-netwerkevenement positionering, "1 match per week")
- Core Values (selectiviteit, kwaliteit boven kwantiteit)
- Golden Circle (WHY/HOW/WHAT)
- Brand Archetype (Sage)
- Personas (3 stuks: Robert, Sophie, Marcus)
- Products (QonneQt Business Membership)

Dit resulteerde in een stijging van 57% → **83%** alignment score.

---

## 3. Huidige staat per module

| Module | Score | Status |
|--------|-------|--------|
| Brand Foundation | **92%** | 9 aligned, 1 review |
| Products & Services | **92%** | 1 aligned |
| Personas | **88%** | 3 aligned |
| Business Strategy | **75%** | Nog geen strategie aangemaakt |
| Market Insights | **75%** | Nog geen trends/insights |
| Brandstyle | **72%** | 8 aligned, 4 review, 3 misaligned |

---

## 4. Openstaande issues (18 stuks)

### CRITICAL (3)

**4.1 Brand Promise ontbreekt**
De Brand Promise — de kernbelofte aan klanten — is nog niet gedefinieerd. Dit is essentieel voor het sturen van klantverwachtingen en het onderscheidend positioneren.

*Advies*: Formuleer een belofte die draait om het kernonderscheid: "Eén kwalitatieve match per week, geen netwerkevenement nodig." De belofte moet authentiek, leverbaar en onderscheidend zijn.

**4.2 Brand Essence ontbreekt**
De Brand Essence — het hart van het merk in 2-3 woorden — is niet ingevuld. Zonder dit centrale element missen alle merkuitingen een verbindende kern.

*Advies*: Definieer de Brand Essence als compact statement. Suggesties op basis van de merkpositionering: "Meaningful Connections", "Selective Networking", of "Quality Over Quantity".

**4.3 Purpose Statement ontbreekt**
Het Purpose Statement — waarom de organisatie bestaat voorbij winst — is leeg.

*Advies*: Formuleer een purpose die aansluit bij de anti-netwerkruis positionering, bijv.: "We believe professionals deserve connections that matter, not contacts that clutter."

---

### WARNING (3)

**4.4 Kleurenpalet mist de "clean blues" uit Brand Personality**
De Brand Personality specificeert: *"Color direction: clean blues or sophisticated neutrals that convey intelligence and trust."* Het huidige palet bevat vooral warme tinten (Golden Amber, Peach, Magenta Pink) zonder prominent blauw.

*Advies*: Overweeg een blauw als primary of secondary kleur toe te voegen. Het huidige goud (#D4A853) kan als accent blijven, maar een professioneel blauw versterkt de Sage-positionering.

**4.5 Fotostijl "premium" conflicteert met felle accentkleuren**
De fotografie-richtlijnen benadrukken een "premium, selectief, kalm" gevoel, maar het palet bevat felle semantische kleuren (Coral Red, Magenta Pink, Sky Blue) die hier niet bij passen.

*Advies*: Documenteer expliciet welke kleuren voor UI-functionaliteit zijn (errors, links, notificaties) en welke voor merkexpressie, zodat ontwerpers ze niet door elkaar gebruiken.

**4.6 Tone of Voice conflict met Brand Personality**
De schrijfrichtlijnen beschrijven een "casual, conversationele" toon (jij/jou, lichte humor), maar de Brand Personality positioneert als "slightly Formal" en "strongly Matter-of-fact".

*Advies*: Kies: pas de Brand Personality aan naar informeel (wat de website uitstraalt), of formaliseer de schrijfrichtlijnen. Gezien de doelgroep (senior professionals) is een consistent "professioneel maar toegankelijk" toon het sterkst.

---

### SUGGESTION (12)

| # | Issue | Kernadvies |
|---|-------|------------|
| 1 | LinkedIn in alle persona's als kanaal | Herformuleer: frustratiekanaal, niet voorkeur |
| 2 | Tone dimensions scores inconsistent | Scores aanpassen aan werkelijke toon |
| 3 | Typography hiërarchie te conventioneel | H1 groter maken, meer contrast |
| 4 | Grafische elementen missen visuele metaforen | "Selectiviteit" visueel vertalen |
| 5 | Marcus — gender specificatie limiteert | Genderneutraal of complementaire persona |
| 6 | Fotostijl: "1 match" concept sterker benadrukken | Eén-op-één beelden, enkelvoud |
| 7 | Product benefits missen anti-oppervlakkigheid | Explicieter positioneren |
| 8 | Pricing ondoorzichtig (Sage verwacht transparantie) | Prijsstructuur tonen |
| 9 | Use cases te generiek | Persona-specifieke scenario's |
| 10 | Robert 45-60 — bovengrens vs. digital-first | Vernauw naar 45-55 |
| 11 | Sophie "work-life integration" vs. "balance" | Terminologie alignen |
| 12 | Roboto te generiek voor premium positionering | Overweeg Proxima Nova / Avenir Next |

---

## 5. Advies: vervolgstappen om QonnecQt.ai een sterker merk te maken

### Prioriteit 1 — Brand Foundation voltooien (impact: hoog, inspanning: laag)

1. **Brand Essence definiëren** — "Meaningful Connections" of vergelijkbaar 2-3 woorden statement
2. **Brand Promise formuleren** — De kernbelofte aan de klant: wat krijg je altijd?
3. **Purpose Statement schrijven** — Waarom bestaat QonnecQt voorbij winst?

*Verwachte impact*: Alignment score van 83% → ~90%+. Deze drie elementen zijn de ankers waar alle andere merkuitingen op leunen.

### Prioriteit 2 — Brandstyle inconsistenties oplossen (impact: hoog, inspanning: medium)

4. **Kleurenpalet herzien** — Voeg een professioneel blauw toe als primary (Sage archetype), behoud goud als warm accent
5. **Tone of Voice uitlijnen** — Kies definitief: formeel-professioneel of informeel-toegankelijk. Pas Brand Personality of schrijfrichtlijnen aan
6. **Typography upgraden** — Roboto is functioneel maar niet onderscheidend. Een serif of premium sans-serif (bijv. Inter, Neue Montreal, of een custom font) versterkt de premium positionering

### Prioriteit 3 — Persona's verfijnen (impact: medium, inspanning: laag)

7. **LinkedIn-vermelding herframen** — Van "preferred channel" naar "frustration point" — dit is precies wat QonnecQt oplost
8. **Use cases persona-specifiek maken** — Robert zoekt kwalitatieve adviesklanten zonder borrelcircuit; Sophie zoekt strategische partners zonder tijdverlies
9. **"Work-life integration" → "balance"** alignen met merkverhaal

### Prioriteit 4 — Visuele identiteit versterken (impact: medium, inspanning: medium)

10. **Fotografierichtlijnen aanscherpen** — Nadruk op enkelvoud, één-op-één, selectie. Visuele metafoor: "één kaart uit vele", "één deur die opent"
11. **Grafische elementen met merkmetaforen** — Filtericons, selectiepijlen, kwaliteitsindicatoren
12. **Pricing transparant maken** — Past bij Sage archetype (duidelijkheid, eerlijkheid)

### Prioriteit 5 — Strategische verdieping (impact: hoog, inspanning: hoog)

13. **Business Strategy aanmaken** — OKR-structuur met concrete doelen (Q2-Q4 2026)
14. **Concurrent analyse uitvoeren** — Gebruik de nieuwe "Discover Competitors" functie om de top 5 concurrenten te identificeren en analyseren
15. **Trend Radar activeren** — Monitor trends in B2B networking, AI-matching, anti-LinkedIn beweging

---

## 6. Samenvatting

QonnecQt.ai heeft een sterke kernpositionering ("kwaliteit boven kwantiteit" in B2B networking) maar mist nog drie fundamentele merkelementen (Brand Essence, Brand Promise, Purpose Statement) en heeft inconsistenties tussen de visuele identiteit en de merkpersoonlijkheid.

De grootste winst op korte termijn: vul de drie ontbrekende brand assets in en lijn het kleurenpalet uit met de Sage/Competence positionering. Dit brengt de alignment score boven 90% en creëert een coherent merkfundament voor alle communicatie-uitingen.

---

*Rapport gegenereerd door Branddock AI Platform — 17 april 2026*
