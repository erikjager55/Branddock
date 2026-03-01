# Brand Assets — Velddefinities & Completeness Specificatie

## Overzicht

Dit document bevat de exacte veldspecificaties voor de 11 kern brand assets in Branddock. Per asset is gespecificeerd: het framework/model waarop het gebaseerd is, de exacte velden met types, de completeness check logica, en een voorbeeld. Assets die hier niet in staan mogen verwijderd worden.

---

## 1. Purpose Statement

**Gebaseerd op:** IDEO Purpose Wheel (Kristin Kelly & Nate Carter, 2019)

**Concept:** De Purpose Wheel engineering benadering: eerst het "waarom" (impact type) bepalen, dan het "hoe" (mechanisme), en uiteindelijk het statement formuleren als poëtische synthese.

**Framework type:** `PURPOSE_WHEEL`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `statement` | text (lang) | Het uiteindelijke purpose statement. Bijv. "We're in business to save our home planet." (Patagonia) |
| `impactType` | select | Hoe het merk impact maakt (inner wheel): `Enable Potential` / `Reduce Friction` / `Foster Prosperity` / `Encourage Exploration` / `Kindle Happiness` |
| `impactDescription` | text | Concrete beschrijving van hoe deze impact er voor het merk uitziet |
| `mechanism` | text | Het "hoe" — het mechanisme waarmee de impact wordt bereikt (outer wheel). Bijv. "through AI-powered brand strategy tools" |
| `pressureTest` | text | Resultaat van de druktest: wat zou dit purpose unlockken voor medewerkers? Hoe beïnvloedt het beslissingen? |

**Completeness checks:**
- ✅ Statement
- ✅ Impact Type
- ✅ Impact Description
- ✅ Mechanism
- ✅ Pressure Test

---

## 2. Golden Circle

**Gebaseerd op:** Simon Sinek's Golden Circle (bestaand framework in Branddock)

**Framework type:** `GOLDEN_CIRCLE` (reeds aanwezig)

| Veld | Type | Omschrijving |
|------|------|-------------|
| `why.statement` | text | Kernovertuiging — waarom het merk bestaat. Bijv. "To empower brands to communicate authentically" |
| `why.details` | text | Uitgebreide toelichting op het Why |
| `how.statement` | text | Unieke aanpak — hoe het merk zijn Why realiseert. Bijv. "Through AI-powered brand strategy tools" |
| `how.details` | text | Uitgebreide toelichting op het How |
| `what.statement` | text | Concrete output — wat het merk feitelijk doet. Bijv. "A platform for brand strategy and content generation" |
| `what.details` | text | Uitgebreide toelichting op het What |

**Completeness checks:**
- ✅ Why (statement)
- ✅ How (statement)
- ✅ What (statement)

*Bestaand framework — geen wijzigingen nodig.*

---

## 3. Brand Essence

**Gebaseerd op:** Aaker & Joachimsthaler's Brand Identity Model + HubSpot Brand Essence framework

**Concept:** Brand Essence is de kern-DNA van het merk, samengevat in 2-5 woorden. Het is de tijdloze, onderscheidende emotionele kern — niet een tagline, maar de ziel van het merk. Bijv. Disney = "Magical", Volvo = "Safety", Nike = "Authentic Athletic Performance".

**Framework type:** `BRAND_ESSENCE`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `essenceStatement` | text (kort, 2-5 woorden) | De essentie in 2-5 woorden. Bijv. "Authentic Athletic Performance" |
| `emotionalBenefit` | text | Het emotionele voordeel dat klanten ervaren. Bijv. "Feeling empowered to push personal limits" |
| `functionalBenefit` | text | Het functionele voordeel. Bijv. "High-quality sports gear engineered for performance" |
| `brandPersonalityTraits` | text / tags | 3-5 persoonlijkheidskenmerken die de essentie ondersteunen. Bijv. "Bold, Innovative, Driven" |
| `proofPoints` | text | Bewijs — hoe de essentie zichtbaar wordt in acties, producten, communicatie |

**Completeness checks:**
- ✅ Essence Statement
- ✅ Emotional Benefit
- ✅ Functional Benefit
- ✅ Personality Traits
- ✅ Proof Points

---

## 4. Brand Promise

**Gebaseerd op:** BrandHouse© model (Marc van Eck) — "merkbelofte" component

**Concept:** De Brand Promise is het emotionele "wat" — niet het functionele product, maar wat het merk oproept bij klanten. Het beschrijft de functionele én emotionele meerwaarde die het merk biedt. Het stuurt innovatie, communicatie, en tagline.

**Framework type:** `BRAND_PROMISE`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `promiseStatement` | text | De kernbelofte. Bijv. "You feel enriched by the local color" (VVV) |
| `functionalValue` | text | De functionele meerwaarde — wat het merk concreet levert |
| `emotionalValue` | text | De emotionele meerwaarde — wat het merk oproept, hoe het voelt |
| `targetAudience` | text | Voor wie deze belofte geldt — de primaire doelgroep |
| `differentiator` | text | Waarom deze belofte anders is dan die van concurrenten |

**Completeness checks:**
- ✅ Promise Statement
- ✅ Functional Value
- ✅ Emotional Value
- ✅ Target Audience
- ✅ Differentiator

---

## 5. Mission Statement

**Gebaseerd op:** Klassiek strategisch model — "Wat doen we, voor wie, en hoe?"

**Concept:** Een Mission Statement beschrijft het huidige bestaansrecht: wat het merk nu doet, voor wie, en via welke aanpak. Het is concreet en actiegericht (vs. Vision die aspirationeel is).

**Framework type:** `MISSION_STATEMENT`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `missionStatement` | text | Het volledige mission statement. Bijv. "To organize the world's information and make it universally accessible and useful" (Google) |
| `whatWeDo` | text | Kernactiviteit — wat het merk doet |
| `forWhom` | text | Doelgroep — voor wie het merk het doet |
| `howWeDoIt` | text | Aanpak — hoe het merk het anders doet dan anderen |
| `impactGoal` | text | Beoogde impact — welk verschil het merk maakt |

**Completeness checks:**
- ✅ Mission Statement
- ✅ What We Do
- ✅ For Whom
- ✅ How We Do It
- ✅ Impact Goal

---

## 6. Vision Statement

**Gebaseerd op:** Collins & Porras "Built to Last" vision framework

**Concept:** Vision beschrijft een ambitieus toekomstbeeld — waar het merk over 5-15 jaar wil staan. Het is aspirationeel, inspirerend en tijdsgebonden (in tegenstelling tot Purpose dat tijdloos is).

**Framework type:** `VISION_STATEMENT`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `visionStatement` | text | Het volledige vision statement. Bijv. "A world where every brand communicates with authenticity" |
| `timeHorizon` | select | Termijn: `3 years` / `5 years` / `10 years` / `15+ years` |
| `desiredFutureState` | text | Concreet toekomstbeeld — hoe ziet de wereld eruit als de visie gerealiseerd is? |
| `boldAspiration` | text | De gedurfde, ambitieuze component (BHAG — Big Hairy Audacious Goal) |
| `successIndicators` | text | Meetbare indicatoren — waaraan herken je dat je de visie nadert? |

**Completeness checks:**
- ✅ Vision Statement
- ✅ Time Horizon
- ✅ Desired Future State
- ✅ Bold Aspiration
- ✅ Success Indicators

---

## 7. Brand Archetype

**Gebaseerd op:** Carl Jung's archetypen, gestructureerd door Margaret Mark & Carol Pearson ("The Hero and the Outlaw", 2001)

**Concept:** Het merk wordt gepositioneerd op basis van universele karakterpatronen die emotionele resonantie creëren. Er is één dominant archetype en optioneel een secundair archetype.

**Framework type:** `BRAND_ARCHETYPE`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `primaryArchetype` | select | Dominant archetype: `Innocent` / `Everyman` / `Hero` / `Outlaw` / `Explorer` / `Creator` / `Ruler` / `Magician` / `Lover` / `Caregiver` / `Jester` / `Sage` |
| `secondaryArchetype` | select (optioneel) | Ondersteunend archetype dat het primaire versterkt |
| `coreDesire` | text | De fundamentele menselijke behoefte die het merk vervult. Bijv. "Mastery and competence" (Hero) |
| `brandVoiceDescription` | text | Hoe het archetype zich vertaalt in communicatiestijl, tone of voice, en visuele identiteit |
| `archetypeInAction` | text | Concrete voorbeelden van hoe het archetype tot uiting komt in producten, marketing, en klantervaring |

**Completeness checks:**
- ✅ Primary Archetype
- ✅ Core Desire
- ✅ Brand Voice Description
- ✅ Archetype in Action

*Secondary Archetype is optioneel en telt niet mee.*

---

## 8. Transformative Goals

**Gebaseerd op:** Massive Transformative Purpose (MTP) framework uit Exponential Organizations (Salim Ismail)

**Concept:** Transformative Goals beschrijven de grote, ambitieuze doelstellingen die het merk nastreeft om de wereld te veranderen. Dit zijn de "moonshot" doelen die verder gaan dan commercieel succes.

**Framework type:** `TRANSFORMATIVE_GOALS`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `massiveTransformativePurpose` | text | Het overkoepelende transformatieve doel. Bijv. "Democratize professional brand strategy for every business" |
| `goals` | array van objecten | 3-5 concrete transformatieve doelen |
| `goals[].title` | text (kort) | Doeltitel. Bijv. "Close the brand strategy gap" |
| `goals[].description` | text | Beschrijving van het doel en waarom het transformatief is |
| `goals[].timeframe` | text | Verwacht tijdsbestek: bijv. "2025-2030" |
| `goals[].measurableOutcome` | text | Meetbaar resultaat. Bijv. "Enable 10,000 SMBs to have validated brand strategies" |

**Completeness checks:**
- ✅ Massive Transformative Purpose
- ✅ Goal 1 (title + description)
- ✅ Goal 2 (title + description)
- ✅ Goal 3 (title + description)

*Minimum 3 goals voor volledige completeness.*

---

## 9. Brand Personality

**Gebaseerd op:** Jennifer Aaker's 5 Dimensions of Brand Personality (1997, Journal of Marketing Research)

**Concept:** Brand Personality beschrijft de menselijke eigenschappen die aan het merk worden toegeschreven. Het Aaker-model definieert 5 dimensies: Sincerity, Excitement, Competence, Sophistication, en Ruggedness. Per merk wordt 1 primaire en optioneel 1 secundaire dimensie gekozen, aangevuld met specifieke traits.

**Framework type:** `BRAND_PERSONALITY`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `primaryDimension` | select | Dominante dimensie: `Sincerity` / `Excitement` / `Competence` / `Sophistication` / `Ruggedness` |
| `secondaryDimension` | select (optioneel) | Ondersteunende dimensie |
| `personalityTraits` | array van strings | 4-6 specifieke adjectieven. Bijv. ["Innovative", "Approachable", "Bold", "Reliable"] |
| `toneOfVoice` | text | Beschrijving van hoe het merk communiceert. Bijv. "Friendly but authoritative; uses clear, jargon-free language" |
| `personalityInPractice` | text | Concrete voorbeelden van hoe de persoonlijkheid tot uiting komt: communicatie, design, klantinteractie |

**Completeness checks:**
- ✅ Primary Dimension
- ✅ Personality Traits (min. 3)
- ✅ Tone of Voice
- ✅ Personality in Practice

*Secondary Dimension is optioneel.*

---

## 10. Brand Story / Elevator Pitch

**Gebaseerd op:** StoryBrand framework (Donald Miller) + klassieke elevator pitch structuur

**Concept:** Een beknopt, overtuigend verhaal dat in 30-60 seconden uitlegt wie je bent, welk probleem je oplost, en waarom het relevant is. Het combineert narratief met positionering.

**Framework type:** `BRAND_STORY`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `elevatorPitch` | text (max ~150 woorden) | De volledige elevator pitch / brand story in beknopte vorm |
| `theChallenge` | text | Het probleem of de uitdaging die het merk adresseert. Bijv. "Most SMBs can't afford enterprise brand strategy agencies" |
| `theSolution` | text | Hoe het merk dit probleem oplost. Bijv. "An AI-powered platform that combines research validation with content generation" |
| `theOutcome` | text | Het resultaat voor de klant. Bijv. "Brands that communicate authentically and consistently across all channels" |
| `originStory` | text | Het oorsprongsverhaal — hoe en waarom het merk is ontstaan |

**Completeness checks:**
- ✅ Elevator Pitch
- ✅ The Challenge
- ✅ The Solution
- ✅ The Outcome
- ✅ Origin Story

---

## 11. Core Values (BrandHouse© Model)

**Gebaseerd op:** BrandHouse© model van Marc van Eck, Ellen Leenhouts & Linda Rutten

**Concept:** Het BrandHouse-model onderscheidt 5 merkwaarden die samen het karakter van het merk beschrijven. De waarden geven richting aan HOE de organisatie dingen doet — ze zijn het kompas, niet de GPS. De spanning tussen de verschillende typen waarden maakt het merk aantrekkelijk.

**Waardetypen:**
- **2 Anchor Values** — de twee benen waarop het merk staat. Geborgd in DNA, worden vandaag al waargemaakt. Vaak bredere, corporate-achtige waarden.
- **2 Aspiration Values** — waarden die potentieel aanwezig zijn maar waar harder aan gewerkt moet worden. Ze geven richting aan de beweging die het merk wil maken.
- **1 Own Value (Eigenwaarde)** — het meest accuraat beschrijft hoe de organisatie dingen doet. Het meest onderscheidende kenmerk.

**Framework type:** `BRANDHOUSE_VALUES`

| Veld | Type | Omschrijving |
|------|------|-------------|
| `anchorValue1.name` | text (kort) | Eerste ankerwaarde. Bijv. "Trustworthy" |
| `anchorValue1.description` | text | Toelichting — hoe deze waarde vandaag al wordt waargemaakt |
| `anchorValue2.name` | text (kort) | Tweede ankerwaarde. Bijv. "Transparent" |
| `anchorValue2.description` | text | Toelichting |
| `aspirationValue1.name` | text (kort) | Eerste aspiratiewaarde. Bijv. "Pioneering" |
| `aspirationValue1.description` | text | Toelichting — welke beweging het merk wil maken |
| `aspirationValue2.name` | text (kort) | Tweede aspiratiewaarde. Bijv. "Empowering" |
| `aspirationValue2.description` | text | Toelichting |
| `ownValue.name` | text (kort) | De eigenwaarde. Bijv. "Refreshingly honest" |
| `ownValue.description` | text | Toelichting — het meest onderscheidende kenmerk |
| `valueTension` | text | Beschrijving van de spanningsrelatie tussen de waarden — hoe ze elkaar in balans houden |

**Completeness checks:**
- ✅ Anchor Value 1 (name + description)
- ✅ Anchor Value 2 (name + description)
- ✅ Aspiration Value 1 (name + description)
- ✅ Aspiration Value 2 (name + description)
- ✅ Own Value (name + description)
- ✅ Value Tension

---

## 12. Social Relevancy

**Gebaseerd op:** ESG Framework (Environmental, Social & Governance)

**Concept:** Social Relevancy beschrijft hoe het merk bijdraagt aan de maatschappij. Het ESG framework structureert dit langs drie pijlers: milieu, sociaal, en bestuur. Het helpt merken om hun maatschappelijke impact te articuleren en te valideren.

**Framework type:** `ESG` (reeds aanwezig in codebase)

| Veld | Type | Omschrijving |
|------|------|-------------|
| `pillars.environmental.impact` | select | Impactniveau: `high` / `medium` / `low` |
| `pillars.environmental.description` | text | Beschrijving van milieu-impact. Bijv. "Sustainable packaging initiatives and carbon-neutral operations" |
| `pillars.environmental.projectCount` | number (optioneel) | Aantal actieve projecten |
| `pillars.social.impact` | select | Impactniveau: `high` / `medium` / `low` |
| `pillars.social.description` | text | Beschrijving van sociale impact. Bijv. "Community engagement programs and diversity initiatives" |
| `pillars.social.programCount` | number (optioneel) | Aantal actieve programma's |
| `pillars.governance.impact` | select | Impactniveau: `high` / `medium` / `low` |
| `pillars.governance.description` | text | Beschrijving van bestuurlijke impact. Bijv. "Transparent reporting and ethical supply chain" |
| `pillars.governance.policyCount` | number (optioneel) | Aantal actief beleid |

**Completeness checks:**
- ✅ Environmental (description)
- ✅ Social (description)
- ✅ Governance (description)

*Bestaand framework — ESGFramework component en seed data al aanwezig.*

---

## Samenvatting: Assets die verwijderd mogen worden

Alle assets die NIET in bovenstaande lijst staan, mogen uit de database verwijderd worden. De 12 assets hierboven vormen een compleet en samenhangend brand strategy framework:

| # | Asset | Beantwoordt | Framework |
|---|-------|-------------|-----------|
| 1 | Purpose Statement | WAAROM bestaan we? (tijdloos) | IDEO Purpose Wheel |
| 2 | Golden Circle | WHY → HOW → WHAT | Simon Sinek |
| 3 | Brand Essence | WAT is onze kern-DNA? (2-5 woorden) | Aaker Brand Identity Model |
| 4 | Brand Promise | WAT beloven we emotioneel? | BrandHouse© (Van Eck) |
| 5 | Mission Statement | WAT doen we nu, voor wie, hoe? | Klassiek strategisch |
| 6 | Vision Statement | WAAR willen we naartoe? | Collins & Porras |
| 7 | Brand Archetype | WIE zijn we als karakter? | Jung / Mark & Pearson |
| 8 | Transformative Goals | WAT willen we veranderen? | MTP / Exponential Orgs |
| 9 | Brand Personality | HOE gedragen we ons? | Aaker 5 Dimensions |
| 10 | Brand Story | HOE vertellen we het? | StoryBrand / Elevator Pitch |
| 11 | Core Values | HOE doen we dingen? (kompas) | BrandHouse© (Van Eck) |
| 12 | Social Relevancy | HOE dragen we bij aan de maatschappij? | ESG Framework |

---

## Technische implementatie-notities

### Framework data structuur (Prisma/JSON)

Elk asset wordt opgeslagen met:
- `frameworkType` (enum): `PURPOSE_WHEEL`, `GOLDEN_CIRCLE`, `BRAND_ESSENCE`, `BRAND_PROMISE`, `MISSION_STATEMENT`, `VISION_STATEMENT`, `BRAND_ARCHETYPE`, `TRANSFORMATIVE_GOALS`, `BRAND_PERSONALITY`, `BRAND_STORY`, `BRANDHOUSE_VALUES`, `ESG`
- `frameworkData` (JSON): Bevat de velden zoals hierboven gespecificeerd

### Completeness berekening

De `getAssetCompletenessFields()` helper moet per `frameworkType` de juiste checks retourneren. Elke asset heeft altijd:
1. `Description` check (van het `description` veld op het BrandAsset model)
2. Framework-specifieke checks (de velden hierboven)

### Seed data

De seed moet 12 assets aanmaken, elk met het juiste `frameworkType` en initiële `frameworkData`. De bestaande assets die niet in deze lijst staan worden verwijderd uit de seed.
