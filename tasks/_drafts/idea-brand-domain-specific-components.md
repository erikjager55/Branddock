---
id: brand-domain-specific-components
title: Domein-gegronde web-page-componenten (BrandHero → UnitCard/MenuSection/SpecList)
status: pending-tech
created: 2026-06-24
verdict: needs-validation-first
---

# Probleemstelling (1 zin)

De web-page-builder rendert voor élk merk dezelfde generieke blokken (FeatureGrid, PricingTable, FAQ) — alleen anders gekleurd — zodat een opslagverhuurder, een restaurant en een SaaS hun fundamenteel verschillende aanbod in exact dezelfde structuur moeten persen, waardoor de pagina niet voelt als "gemaakt voor dít bedrijf".

> Test: uit te leggen zonder Branddock te kennen? Ja — "elke website krijgt dezelfde IKEA-meubels, alleen in een andere kleur".

# WHO — Doelgebruiker

**Rol**: workspace-owner / brand-manager (direct merk of agency-medewerker namens een merk) die in Canvas Step 3 een landingspagina/web-page bouwt.
**Schaal**: gehele pilot-pipeline raakt de web-page-builder; deze gap raakt iedereen wiens aanbod NIET in een generieke "feature/pricing/FAQ"-mal past. Onbekend hoeveel pilot-merken dat zijn — **dit is exact gat #1 in de aanname-validatie**.
**Acuut segment**: merken met een **gestructureerd, herhaald aanbod-object** dat de generieke blokken slecht modelleren: self-storage (units met m²/prijs/beschikbaarheid), horeca (menu-secties met gerecht/prijs/dieet-iconen), e-commerce/catalogus (producten met specs), vastgoed (panden), automotive (voorraad). Voor een puur-dienstverlenende B2B-SaaS is de gap kléin (FeatureGrid + PricingTable dekken 80%).

## JTBD-narratief

> "Toen een opslagverhuurder via Branddock een landingspagina genereerde, wilde hij zijn drie unit-formaten met m², maandprijs en beschikbaarheid tonen zoals op zijn echte site, maar hij kreeg een generieke FeatureGrid met drie icon-badges en losse tekst — geen prijs-per-eenheid, geen vergelijkbare specs naast elkaar — dus hij moest of handmatig de teksten in feature-cards proppen óf de pagina afkeuren als 'ziet er niet uit als ons bedrijf'."

> Status van dit narratief: **plausibel, afgeleid (Nèjbox-vergelijking + L1-lesson), NIET nog waargenomen bij een echte Branddock-pilot-klant.** Een feature-planner eist normaal een waargenomen narratief. Dit is de zwakste plek van het hele idee — zie Red Team.

## Evidence

- **Lesson L1** (Branddock brandstyle vs. Claude's design-system-builder voor Nèjbox box-verhuur): die builder leverde domein-gegronde `BoxCard` + `SpecList` bovenop generieke primitives; Branddock doet dat niet.
- `src/features/campaigns/components/canvas/medium/puck-config.tsx` — geverifieerd: gesloten, vaste set generieke blokken (`BrandHero`, `FeatureGrid`, `FeatureSplit`, `PricingTable`, `FAQ`, `Footer`, `RichText`, `Testimonial`, stat-band). Alle theming gebeurt render-time uit tokens; géén domein-/aanbod-vorm.
- `src/lib/landing-pages/brand-archetype-classifier.ts` — **precedent**: Branddock classificeert al een workspace (Jung 12-archetype, gecached op `BrandStyleguide.archetype`) om *visuele* render-keuzes te sturen. Een "domein/aanbod-vorm"-classificatie zou ditzelfde patroon volgen, maar voor *component-keuze*.
- `src/lib/landing-pages/variant-generator.ts` — generator pijpt al `brand` + `persona` + `product` (echte naam/prijs/feature→benefit) in gestructureerde JSON, maar mapt naar de vaste blok-library. De grounding-data is er al; alleen de uitkomst-vormen ontbreken.
- `src/lib/ai/brand-context.ts` — `Workspace.industry` bestaat als datapunt maar stuurt geen component-keuze aan.
- **Tegen-evidence (faalmodi)**: `gotchas.md` 2026-03-20 (AI-prompt ↔ TS-interface-mismatch: AI-call enforced niets runtime → alles `undefined`) + 2026-05-17 (Effie-rubric leak: prompt-vocabulaire = output-vocabulaire) + brandstyle-merge-lesson (ground AI in echte data i.p.v. free-form hallucinatie). Dit zijn precies de scherven die vrije component-synthese opnieuw zou produceren.
- **Roadmap**: `vercel-deployment` = hard launch-blocker (kritieke pad). `web-page-builder-v2-custom-domains` + `brand-assistant-standalone-app` staan expliciet post-launch geparkeerd → precedent dat web-builder-uitbreidingen post-launch horen.

# WHAT — Probleem (niet oplossing)

Een merk met een gestructureerd, herhaald aanbod-object (units, gerechten, panden, voertuigen, SKU's) probeert dat aanbod op een gegenereerde pagina te tonen zoals op zijn echte site, maar de builder biedt alleen generieke containers (FeatureGrid = icon + titel + tekst). Het waarneembare gevolg: prijzen, specs en vergelijkbaarheid-naast-elkaar passen niet in de mal, de gebruiker doet handmatig herstelwerk of keurt de pagina af als "niet van ons". Het is geen kleurprobleem (dat is opgelost) — het is een **structuur/relevantie-probleem**: de pagina-anatomie matcht het bedrijfsmodel niet.

# WHY-NOW

Eerlijke conclusie: **dit is NIET now.** Triggers ontbreken voor dit kwartaal:

- Geen waargenomen pilot-klacht (de drive komt uit een externe tool-vergelijking, niet uit Branddock-gebruik).
- Het kritieke pad is `vercel-deployment` (launch-blocker); pre-launch capaciteit is volgeboekt over 3 tracks.
- De web-page-builder is net (5 dagen extra scope, 130 commits) als pre-launch-sprint #6 geland en wordt nog ge-finaliseerd — een fundamentele uitbreiding van de component-architectuur erbovenop is destabiliserend vlak voor launch.

Wat dit later urgent kán maken: (a) als ≥2 pilot-merken aantoonbaar afhaken op "ziet er niet uit als ons", of (b) als de MarTech-positionering ("generator die je merk-DNA door en door kent") een demonstreerbaar onderscheid nodig heeft t.o.v. generieke website-builders. Beide zijn **post-launch** signalen.

# SUCCESS METRICS

**Primaire metric** (één): **% gegenereerde web-pages dat de gebruiker accepteert/publiceert zonder de aanbod-sectie handmatig te herstructureren** — gemeten op merken in de "gestructureerd-aanbod"-cohort, van baseline (te meten) naar +X. Dit meet of de pagina-anatomie het bedrijfsmodel echt beter matcht; een puur esthetische metric zou misleiden.

> Let op: deze metric is nu **niet meetbaar** — er is geen baseline en geen cohort-segmentatie. Dat is op zichzelf een validatie-blokker (zie aannames).

**Counter-metric** (mag NIET kapotgaan): **F-VAL brand-fidelity-score + render-betrouwbaarheid** (geen lege/kapotte secties, geen RSC-crashes). Een nieuw, vrijer component-type mag de bestaande generieke render-zekerheid en de fidelity-poort niet verzwakken. Tweede counter: **generatie-latency/cost per page** (een classificatie + extra synthese-stap mag de pipeline niet onbruikbaar traag/duur maken).

# CONSTRAINTS

## Hard
- Tijd: **pre-launch capaciteit = nul** voor dit idee; `vercel-deployment` + billing + pilot-onboarding hebben voorrang. Realistisch venster: **post-launch.**
- Tech: nieuwe blokken moeten RSC-safe serialiseerbaar zijn (puck-config draait server-side voor screenshotter + `/p/[slug]` RSC; `'use client'` op render-functies brak eerder server-callers). Geen runtime-type-enforcement bij AI-JSON → defense-in-depth Zod-validatie verplicht (gotcha 2026-03-20).
- Data: grounding mag alleen leunen op data die feitelijk in de workspace-DNA zit (producten/persona's/industry/assets). Een component-type dat data eist die het merk niet heeft = hallucinatie-risico.
- Legal/privacy: geen.

## Soft
- De brandstyle/token-/export-voorsprong (canonical `DesignSystemModel`, 7 export-formaten, snapshots) moet behouden blijven — nieuwe blokken moeten in dezelfde export- en snapshot-mechaniek passen, niet ernaast.

## Must NOT do
- **Geen vrije LLM-component-synthese** als MVP (LLM bedenkt zelf JSX/onbekende prop-shapes) — botst frontaal met gotcha 2026-03-20 (geen runtime-enforce → undefined velden) + RSC-grens + F-VAL-poort.
- **Niet de generieke blokken vervangen** — uitsluitend additief naast de bestaande, bewezen set.
- **Geen industrie-taxonomie-explosie** — niet 30 branche-archetypes vooraf modelleren "voor het geval dat".
- Geen technical design / schema-keuzes hier (dat is technical-planner).

# SCOPE

## In-Scope (MVP)
- **Eén** nieuw domein-gegrond blok-type, additief naast de generieke set, achter een typed slot-contract (LLM kiest/vult, bedenkt geen vorm). Kandidaat met hoogste waarde/laagste risico: **`SpecList`/`UnitCard`-achtig "vergelijkbaar-aanbod-naast-elkaar met specs+prijs"** — generaliseert over storage-units, panden, abonnementen, voertuigen; data komt uit bestaande `Product`-context (naam/prijs/feature-paren).
- Selectie-mechanisme dat bepaalt wanneer dit blok past (gegrond in `Product`-shape / `industry`, niet vrij verzonnen) + veilige fallback naar de generieke FeatureGrid als de data niet past.

## Out-of-Scope (expliciet NIET, ook al verleidelijk)
- Vrije LLM-component-synthese (eigen JSX/prop-shapes per merk).
- Meer dan één nieuw blok-type in MVP (geen MenuSection + UnitCard + SpecList tegelijk).
- Een complete branche-archetype-bibliotheek (horeca/vastgoed/automotive/retail templates).
- Het vervangen of herschrijven van bestaande generieke blokken.
- Custom-domain / publicatie-uitbreidingen (`web-page-builder-v2`).
- Een nieuwe F-VAL-dimensie specifiek voor domein-blokken.
- Live "UI-kit recreëert de echte site" (Home → Aanbod → detail) zoals de Nèjbox-builder deed.
- Pre-launch inplannen.

> Out-of-Scope (8) > In-Scope (2). Goed teken — dit idee wil van nature exploderen, en dat is precies het risico.

# AANNAMES

Aannames die WAAR moeten zijn voor deze feature te slagen:

- **Een relevant deel van de pilot/customer-pipeline heeft een "gestructureerd herhaald aanbod"-bedrijfsmodel** — bewijs: GEEN (afgeleid van Nèjbox-voorbeeld). — onbewezen? **JA (kritiek).** Valideren: tel in de huidige pipeline hoeveel merken units/menu's/catalogus/panden verkopen vs. pure dienst/SaaS.
- **De generieke FeatureGrid is een waarneembare afkeur-reden, niet alleen een esthetisch ongemak** — bewijs: GEEN waargenomen pilot-afkeuring. — onbewezen? **JA (kritiek).** Valideren: bekijk afgekeurde/handmatig-herstelde gegenereerde pages; is "aanbod-structuur" een terugkerende reden?
- **Een typed-slot-contract (LLM kiest + vult, bedenkt geen vorm) levert genoeg relevantie zonder de hallucinatie-/render-risico's van vrije synthese** — bewijs: precedent archetype-classifier + variant-generator-JSON werken al binnen vaste schema's. — onbewezen? Deels (concept bewezen voor theming, niet voor component-keuze).
- **De data om het blok te gronden zit al in de workspace-DNA (Product-context)** — bewijs: `variant-generator.ts` pijpt al product-naam/prijs/feature-paren. — onbewezen? Nee, grotendeels waar; randgeval: merken die hun aanbod nooit als `Product` invoerden.

> Twee kritieke onbewezen aannames (pipeline-fit + afkeur-reden) moeten VOOR build gevalideerd worden. Zonder die data bouwen we mogelijk een domein-blok voor een domein dat in onze pipeline niet voorkomt.

# ACCEPTATIECRITERIA (MVP)

> Concept-niveau (technical-planner vertaalt naar implementatie):

- [ ] Given een workspace met een gestructureerd aanbod in `Product`-context (≥2 vergelijkbare items met prijs/specs), When de gebruiker een web-page genereert, Then de aanbod-sectie rendert als het nieuwe domein-blok met de échte item-naam/prijs/specs naast elkaar (geen verzonnen velden).
- [ ] Given een workspace zonder passende aanbod-data (pure dienst/SaaS), When dezelfde generatie draait, Then valt de builder veilig terug op de generieke FeatureGrid (geen leeg/kapot blok).
- [ ] Given het nieuwe blok rendert server-side (screenshotter / `/p/[slug]` RSC), When de pagina wordt opgehaald, Then geen RSC-/serialisatie-crash en geen client-reference-proxy-fout.
- [ ] Given een gegenereerde page met het nieuwe blok, When F-VAL draait, Then de brand-fidelity-score blijft ≥ de baseline van de equivalente generieke render (counter-metric beschermd).
- [ ] Given de AI-JSON voor het blok mist of misvormt velden, When de output wordt geparsed, Then Zod-validatie vangt het en fallt veilig terug (geen `undefined`-velden in de UI — gotcha 2026-03-20).

# EERSTE TAAK (morgen startbaar)

**NIET bouwen — valideren.** Concrete eerste taak: een **pipeline-fit-telling + afkeur-analyse** (PM-werk, geen code): inventariseer de huidige pilot/pipeline-merken en label per merk "gestructureerd-aanbod ja/nee"; verzamel daarnaast de afgekeurde of handmatig-herstructureerde gegenereerde web-pages en codeer de afkeur-reden. Uitkomst bepaalt of dit een echt cohort raakt. (Als en pas als die twee aannames groen zijn, is de eerste bouwtaak een spike: één typed slot-contract + Zod-schema voor het `SpecList`-blok, achter een feature-flag, additief.)

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel

Het hele idee hangt aan één onbewezen aanname: **dat een betekenisvol deel van de Branddock-pipeline een "gestructureerd herhaald aanbod"-bedrijfsmodel heeft.** Het bewijs is een extern voorbeeld (Nèjbox box-verhuur) dat Claude's design-builder toevallig kreeg — geen Branddock-pilot-klant. Als de pijplijn vooral diensten/B2B-SaaS bevat (waar FeatureGrid + PricingTable 80% dekken), bouwen we een prachtig `UnitCard`-blok voor een domein dat niet aan boord is. De drive komt aantoonbaar uit een tool-vergelijking ("die andere AI deed dit cooler"), niet uit waargenomen klantpijn — het klassieke "bouwen voor onszelf / feature-envy" patroon.

## Pleidooi tegen dit plan

Het kleurprobleem is opgelost; het "structuurprobleem" is voorlopig theoretisch. Vrije component-synthese — de meest indrukwekkende vorm — is precies wat de codebase-historie twee keer heeft afgestraft (prompt↔interface-mismatch, rubric-leak): AI-output die niet runtime-geënforced is, breekt stil, en hier komt de RSC-server-grens + de F-VAL-poort er nog bovenop. De getemde variant (typed slot-contract voor één blok) is verdedigbaar, maar levert dan ook maar marginaal meer dan een tweede generieke blok-template, voor een doelgroep waarvan we de omvang niet kennen. En de timing is ronduit verkeerd: dit landt bovenop een net-gestabiliseerde builder, vlak voor een launch waarvan het kritieke pad (vercel-deployment) nog open staat.

## Wat zouden we leren door NIET te bouwen

Door te wachten op pilot-data leren we het enige dat telt: **bestaat het cohort, en is generieke structuur een echte afkeur-reden of cosmetisch gemopper.** Goedkope alternatieve experimenten die geen architectuur-wijziging vereisen: (1) een handmatige "wizard-of-oz" — bouw voor één echte storage-/horeca-pilot de aanbod-sectie met de hand en meet of acceptatie/conversie stijgt; (2) prompt-only experiment — laat de variant-generator de `Product`-data in een rijkere FeatureGrid-variant proppen (specs/prijs-naast-elkaar) zónder nieuw blok-type, en kijk of dat 70% van de waarde levert tegen 10% van het risico. Pas als die signalen positief zijn, is het nieuwe blok-type gerechtvaardigd.

## Verdict van de planner

**needs-validation-first**

Reden: het idee is strategisch coherent (sluit aan op de "merk-DNA door-en-door"-positionering) en technisch begrensbaar (typed slot-contract i.p.v. vrije synthese), maar de twee dragende aannames — bestaat het aanbod-cohort, en is generieke structuur een waargenomen afkeur-reden — zijn volledig onbewezen en uitsluitend afgeleid van een externe tool-vergelijking. Bovendien valt het idee qua fase ondubbelzinnig **post-launch** (capaciteit, builder-stabiliteit, vercel-blocker). Niet promoten naar technical-planner tot de pipeline-fit-telling + afkeur-analyse groen zijn én launch achter de rug is. De juiste eerste stap is meten, niet bouwen — eventueel via het prompt-only / wizard-of-oz experiment dat geen architectuur raakt.

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (niet 5) — **maar nu niet meetbaar (geen baseline/cohort) → zelf een validatie-blokker**
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (8 vs 2)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [ ] Eerste taak morgen startbaar — **bouwen NIET; valideren WEL.** De startbare taak is een validatie-analyse, geen build-taak.

> 4/5 in vorm, maar de twee inhoudelijke gaten (onmeetbare metric + onbewezen cohort-aanname) drukken het verdict naar needs-validation-first ondanks de afgevinkte vorm. Vinkjes meten structuur, niet waarheid.

# Volgende stap

Parkeren als **post-launch + needs-validation-first**. Niet doorzetten naar technical-planner. Eerst: (1) pipeline-fit-telling + afkeur-analyse op bestaande gegenereerde web-pages, (2) optioneel prompt-only / wizard-of-oz experiment om 70%-van-de-waarde-zonder-nieuw-blok te toetsen. Pas bij groene aannames én na launch promoten naar tech-planner voor het typed-slot-contract van één blok-type.
