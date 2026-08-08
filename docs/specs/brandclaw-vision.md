# Brandclaw-visie — het marketing-organisme

> **Status**: voorstel v2 (toekomstvisie) — herschreven na richting-feedback Erik (2026-08-08): meer databron-integratie en -fusie, inzichten → strategieën, geen vaste agent-catalogus maar een organisch geheel waarin agents ontstaan wanneer nodig, actieradius tot buiten het platform, en eigen initiëring.
> **Datum**: 2026-08-08 (v2; v1 in git-historie van dit bestand).
> **Context**: dit bestand was aangekondigd in `docs/specs/_README.md` maar bestond niet. Het absorbeert het archief-eindbeeld (`docs/archive/old-lists/BRANDCLAW-ROADMAP.md` §F), de P3.6-herijking en de bevindingen van de code/docs-audit van 2026-08-08.

---

## 1. De kern in één zin

**Brandclaw is één zelf-initiërend marketing-organisme dat alles hoort wat er over en rond het merk gebeurt, die signalen samensmeedt tot strategieën, zichzelf de specialisten geeft die elke strategie nodig heeft, handelt binnen én buiten het platform, en met elk resultaat aantoonbaar beter wordt — een lean, mean marketing machine met het merk-DNA als onvervreemdbare identiteit en de mens als bestuurder.**

Niet "een set agents met een goedkeurings-inbox", maar een levend systeem. Agents zijn geen product-features; het zijn tijdelijke organen die het organisme laat ontstaan wanneer een strategie erom vraagt — en weer oplost wanneer het werk gedaan is of de les geleerd.

---

## 2. Vijf breuken met de huidige opzet

De audit van 2026-08-08 laat zien dat de huidige lijn (10 vaste agents, propose→confirm, BC-trap) een solide motor heeft opgeleverd — maar de visie erboven was te klein. Vijf bewuste breuken:

1. **Van modules naar zenuwstelsel.** Databronnen (F-VAL-scores, ad-snapshots, competitor-scans, trends, PostHog) bestaan nu als losse silo's die elk door één agent worden bekeken. Er komt één **Signaalweb**: elke bron — intern én extern — voedt dezelfde graph, en inzichten ontstaan juist op de krúispunten van bronnen.
2. **Van inzichten naar strategie-synthese.** De huidige agents rapporteren observaties. Het organisme krijgt een **Strategiekamer** die inzichten combineert tot concurrerende strategie-hypothesen met verwachte impact, kosten en confidence — en die als portfolio beheert.
3. **Van catalogus naar genesis.** De 10 persona's zijn geen grens meer. Een strategie wordt een **missie**; het organisme stelt per missie zelf het team samen — bestaande specialisten hergebruiken, of een nieuwe laten ontstaan. Agents ontstaan, bewijzen zich, worden geïnstitutionaliseerd als playbook, of verdwijnen.
4. **Van platform-acties naar wereld-acties.** De actieradius stopt niet bij de eigen database of zelfs de gekoppelde kanalen. Het organisme mag adviseren én (binnen mandaat) regelen dat er buiten het platform iets gebeurt: een telemarketingbureau inschakelen, een panel-onderzoek inkopen, data verwerven die het mist.
5. **Van reageren naar initiëren.** Niets in het organisme wacht op een prompt of een weekschema als de wereld daar geen aanleiding toe geeft — en andersom: als de wereld wél beweegt, beweegt het organisme, ongevraagd. Eigen initiëring is de default, niet de uitzondering.

---

## 3. Anatomie van het organisme

### 3.1 De zintuigen — het Signaalweb

Eén open, uitbreidbare waarnemingslaag. Alles wat het organisme kan waarnemen wordt een **Signal** in één graph, gekoppeld aan de merk-entiteiten die er al zijn (persona's, producten, kanalen, concurrenten, campagnes, brand assets):

- **Interne bronnen** (bestaan al, worden gefuseerd): F-VAL/fidelity-trends, content-productie, edits & rejects, campagne-stand, alignment-scans, Ada's ad-snapshots, competitor-events, trend-radar.
- **Gekoppelde systemen**: GA4/PostHog, social-platforms, e-mail/CRM (HubSpot), Ads-accounts, e-commerce, reviews, search console — via native connectors én een generieke **MCP-client-laag**, zodat elke bron die een MCP- of API-oppervlak heeft aansluitbaar is zonder eigen bouwwerk per bron.
- **De buitenwereld**: nieuws, markt- en sectorsignalen, merkvermeldingen, concurrent-bewegingen (Exa/scraping/feeds).
- **De mensenwereld**: sales-notities, klantgesprekken, geüploade documenten, meeting-verslagen — alles wat de klant erin wil gooien wordt signaal.

Twee eigenschappen maken dit een zenuwstelsel in plaats van een data-lake:

- **Fusie**: entity-resolution over bronnen heen — dezelfde campagne, persona of concurrent herkend in ads-data, web-analytics én CRM, zodat een inzicht als "persona X klikt wel maar converteert alleen na een telefonisch contactmoment" überhaupt kán bestaan. Dit is het CDP-principe (unified data layer + identity graph), maar dan merk-centrisch in plaats van alleen klant-centrisch.
- **Zelfkennis over blinde vlekken**: het organisme weet welke zintuigen het mist en maakt daar werk van. "Zonder web-analytics ben ik half blind — koppel GA4" is een actie-item dat het zelf agendeert; en als een vraag niet uit bestaande bronnen te beantwoorden is, is *data verwerven* een legitieme actie (zie 3.5).

### 3.2 Het wereldbeeld

Uit het Signaalweb onderhoudt het organisme een continu bijgewerkt **wereldbeeld van merk-in-markt**: wat weten we, hoe zeker zijn we ervan, wat is er sinds vorige week veranderd, en wat begrijpen we nog niet. Technisch bouwt dit op wat er ligt (immutable `DataSnapshot`s, pgvector, versioned observations) — het verschil is dat het één samenhangend, bevraagbaar beeld wordt in plaats van per-agent-queries. Het wereldbeeld is ook het product-oppervlak: de klant kijkt in het hoofd van zijn marketing-machine.

### 3.3 De Strategiekamer — van inzicht naar strategie

Het denkende centrum, en het directe antwoord op "inzichten combineren naar strategieën":

1. **Inzicht-vorming**: signalen uit verschillende bronnen kruisen → inzichten met evidence en confidence (de bestaande two-reasons-toets blijft de lat).
2. **Strategie-synthese**: inzichten combineren tot **strategie-hypothesen** — niet "maak een LinkedIn-post" maar "persona X wordt bereikt maar converteert niet; de data wijst op een vertrouwensdrempel; drie kandidaat-strategieën: (a) case-study-programma, (b) webinar-reeks, (c) outbound-belcampagne via een extern bureau — met per kandidaat verwachte impact, kosten, doorlooptijd, benodigde zintuigen en confidence."
3. **Portfolio-management**: strategieën concurreren om budget en aandacht. Het organisme draait meerdere strategieën tegelijk, meet ze als experimenten, verschuift inzet naar wat werkt (bandit-allocatie op strategie-niveau, niet alleen op content-varianten) en stopt wat niet werkt — expliciet, met een geleerde les als restwaarde.

Hiermee worden de lege enum-leden `campaign_builder`, `measurement_eval` en `optimization` niet drie losse nodes, maar functies van één kamer: bouwen, meten en optimaliseren zijn fasen van elke strategie in het portfolio.

### 3.4 Missies en genesis — agents ontstaan, bestaan niet

Een goedgekeurde (of binnen mandaat zelf-gestarte) strategie wordt een **missie**. Het organisme stelt per missie het team samen:

- Een agent is een **instantie van (missie, context, tools, model, budget)** — configuratie op de bestaande motor (`runAgentLoop`), geen nieuwe code per agent. De huidige code-registry evolueert van "de catalogus" naar een **template-bank**: beproefde specialist-profielen waaruit het organisme put.
- **Genesis**: vraagt een missie om een specialisme dat er niet is (een B2B-outbound-strateeg, een webinar-producent, een marktonderzoek-begeleider), dan stelt het organisme een nieuw agent-profiel samen uit tools + prompt + context en laat het zich bewijzen op de missie. Dit is het "agent factory"-patroon dat in agent-onderzoek inmiddels standaard wordt (on-the-fly samengestelde sub-agents in plaats van vaste rollen).
- **Levenscyclus**: ontstaan → bewijzen (elke output blijft F-VAL-gevalideerd en ge-audit) → institutionaliseren (een profiel dat herhaald werkt wordt template; zijn werkwijze wordt playbook) → verdwijnen. Geen agent is heilig; **lessen zijn van het organisme, agents zijn vergankelijk**. Het geheugen (pgvector, playbooks) hangt daarom aan workspace + missietype, niet aan de individuele agent.
- **Persona's blijven als gezicht, niet als grens.** Ada, Bo en Vera zijn waardevolle, herkenbare gezichten voor terugkerende functies — de UX-laag. Onder water zijn ook zij instanties van de motor, en naast hen ontstaan naamloze of nieuw-gedoopte specialisten wanneer het werk daarom vraagt.

### 3.5 De actieradius — vier ringen

Het organisme handelt zo ver als zijn mandaat reikt, in vier ringen:

| Ring | Actie-type | Voorbeelden |
|---|---|---|
| **1. Eigen platform** | maken en beheren | content, campagnes, strategie-documenten, merkbewaking |
| **2. Gekoppelde systemen** | uitvoeren via connectors/MCP | publiceren, ads bijsturen, e-mails versturen, CRM-taken aanmaken, landingspagina's plaatsen |
| **3. De mensenwereld** | adviseren → laten uitvoeren | "schakel een telemarketingbureau in voor persona X" — inclusief shortlist van bureaus, briefing-pakket, belscript on-brand, doellijst en meetplan; een influencer briefen; drukwerk of een beurs-stand regelen; later (binnen mandaat): de opdracht daadwerkelijk uitzetten en de terugkoppeling als signaal binnenhalen |
| **4. Data-acquisitie** | waarnemen als actie | een klantpanel of survey uitzetten, interviews plannen, een dataset of tool-koppeling aanschaffen, een concierge-test draaien — omdat het wereldbeeld een gat heeft dat geld waard is om te dichten |

Ring 3 is de kern van "buiten de eigen omgeving": een advies van het organisme is nooit een losse zin maar een **uitvoerbaar pakket** — wie, wat, waarom (evidence uit het Signaalweb), verwachte uitkomst, kosten, en hoe het resultaat teruggemeten wordt. Eerst doet de mens de handeling; naarmate vertrouwen groeit kan het organisme de opdracht zelf uitzetten binnen een budget-mandaat. Agentic procurement (RFQ's, offertes vergelijken, leveranciers voordragen binnen guardrails) is in de markt al realiteit — Brandclaw past het toe op marketing-diensten.

### 3.6 Geheugen en leren — organisme-breed

De leerlus uit visie-v1 blijft integraal, maar wordt organisme-breed in plaats van per-agent:

- **Elk mensbesluit is leersignaal**: accepts, rejects (met reden), edits (edit-distance als impliciete correctie) — automatisch teruggevoerd, niet alleen geregistreerd.
- **Elke uitkomst is leersignaal**: publicatie → performance → attributie terug naar de missie en strategie die het voortbracht. Ook ring-3-acties: het belresultaat van het bureau is net zo goed een outcome als een CTR.
- **De retro-functie**: periodiek en na elke missie evalueert het organisme zichzelf — hypothesen bevestigd/verworpen, memories geconsolideerd tot lessen, playbooks bijgewerkt, template-bank verrijkt (Reflexion-patroon: talige zelfreflectie in persistent geheugen).
- **Het merk-playbook**: gedistilleerde, cureerbare lessen per workspace — leesbaar, bewerkbaar, verwijderbaar door de klant. Geleerde regels kunnen F-VAL-criteria worden: het merkbewijs wordt scherper naarmate de machine langer draait. Geleerd kapitaal is de switching cost.

### 3.7 Identiteit en geweten — waarom dit geen los kanon wordt

De ambitie groeit; de grenzen blijven hard, en worden juist het product:

- **Merk-DNA + F-VAL is de identiteit, geen filter achteraf.** Het organisme kán niet off-brand handelen: elke output, ook een belscript voor een extern bureau, gaat door dezelfde fidelity-poort.
- **Mandaten in plaats van vrijheid**: autonomie is per workspace × ring × missietype begrensd (budget, volume, types, F-VAL-ondergrens) en wordt **verdiend** met track-record — en bij een incident automatisch teruggeschroefd. De verdiende-autonomie-ladder uit v1 blijft, maar hangt aan missietypes in plaats van aan vaste agents.
- **Volledige auditability**: elke actie herleidbaar tot signalen, inzicht, strategie en mandaat (de bestaande DataSnapshot/versioning-fundamenten, nu end-to-end).
- **Kill-switch en budget-hard-stop** op elk niveau; geen auto-confirm-sluiproutes; cross-workspace-leren alleen opt-in.
- **De mens verschuift van operator naar bestuurder**: geen per-item-goedkeuring als eindbeeld, maar sturen op strategieën, mandaten en lessen.

---

## 4. De groeistadia — van luisterend object naar lean, mean marketing machine

Zes stadia, elk met een eigen belofte aan de klant. De bestaande BC-treden mappen erin; geen bestaande gate wordt versoepeld.

| Stadium | Het organisme… | Klant-belofte | Bevat |
|---|---|---|---|
| **1. Luisteraar** | hoort alles: zintuigen gekoppeld, Signaalweb + wereldbeeld live, benoemt eigen blinde vlekken | "Het ziet wat ik niet zie" | signaalweb-foundation, MCP-client-laag, gap-detectie |
| **2. Duider** | verklaart: cross-source-inzichten, eerste strategie-hypothesen als advies | "Het begrijpt waaróm" | Strategiekamer v1, leerlus dicht (feedback + outcomes) |
| **3. Tester** | probeert: missies, experimenten, varianten, eerste genesis van specialisten; publiceert binnen goedkeuring | "Het bewijst wat werkt" | BC-2, bandit-allocatie, retro-functie, template-bank |
| **4. Bewijzer** | verdient: track-record per missietype, mandaten binnen envelopes, ring-3-adviezen als uitvoerbare pakketten | "Het verdient mijn vertrouwen" | BC-3 (bestaande go-criteria), trust-dashboard, playbooks |
| **5. Operator** | draait: portfolio van strategieën grotendeels zelfstandig, ring-2 volledig, ring-3 binnen opdracht-mandaat, data-acquisitie op eigen initiatief | "Het draait mijn marketing" | zelfkalibratie (F-VAL-re-tuning, prompt-evolutie), budget-mandaten ring 3/4 |
| **6. Machine** | initieert: signaleert kansen, formuleert strategieën, stelt teams samen, handelt binnen én buiten het platform, en wordt daar meetbaar elke cyclus beter in — de mens bestuurt op doelen en budget | "Lean, mean marketing machine" | volwaardig zelf-initiërend portfolio-management; opt-in segment-leren als koud-start-versneller |

**Volgorde-rationale**: stadium 1-2 eerst — de Strategiekamer is maar zo goed als het Signaalweb eronder, en de leerlus moet dicht zijn vóórdat volume en autonomie groeien (het kostbaarste signaal ontstaat vroeg en wordt vandaag weggegooid). Genesis (stadium 3) vóór brede autonomie (4-5): eerst laten zien dat ontstane specialisten zich bewijzen onder dezelfde F-VAL/audit-tucht, dan pas mandaten verruimen.

---

## 5. Architectuur-richting (op hoofdlijnen, alles op de bestaande motor)

| Nieuw | Bouwt op |
|---|---|
| `Signal` + `SourceAdapter`-registry + entity-resolution (merk-graph) | DataSnapshot, bestaande query-tools, Prisma/pgvector |
| Generieke MCP-client-laag voor externe bronnen én ring-2-acties | bestaande connector-aanpak (P3.5), tool-registry |
| `Insight` en `StrategyHypothesis` (evidence, confidence, verwachte impact/kosten) + portfolio-stand | StrategyObservation-shape, two-reasons-toets |
| `Mission` + `AgentInstance` (missie, context, tools, model, budget) — registry wordt template-bank; `AgentDefinition` van code naar data | `runAgentLoop`, agent-loop-guards, artifact-contract |
| Ring-3-artefact "uitvoerbaar pakket" (briefing, shortlist, meetplan) + opdracht-mandaat-model | proposal→confirm-flow, F-VAL-poort |
| Gap-detectie + data-acquisitie-acties (survey, panel, koppeling) | Research Hub / validation-bundles (bestaand product!), Exa |
| Feedback-ledger, outcome-attributie, retro-run, playbook, verdiende mandaten, trust-dashboard | (ongewijzigd uit v1 — zie git-historie voor detail) |

Wat er níet komt: geen extern orchestrator-framework (ADR 2026-05-08 Alt D blijft verworpen — genesis is configuratie op de eigen motor), geen model-finetuning op klantdata in deze horizon, geen autonomie zonder verdiend en expliciet aangezet mandaat.

---

## 6. Noordster

**Zelfgedragen marketingwaarde**: het aandeel van de gerealiseerde marketing-uitkomst (gewogen naar outcome, niet naar volume) dat het organisme zelf initieerde én uitvoerde zonder menselijke correctie — per workspace, stijgend per cyclus, zonder incident.

Ondersteunend: idee→gevalideerd-marktresultaat-doorlooptijd (daalt per stadium), accept-rate-trend, F-VAL-verloop zonder correctie, kosten per gerealiseerde uitkomst, dekkingsgraad van het Signaalweb (hoeveel blinde vlekken resteren).

---

## 7. Open besluiten (voor Erik)

1. **Ambitieniveau als workspace-instelling**: elke klant kiest zijn stadium-plafond (sommige klanten willen een Duider, andere een Machine). Akkoord dat het product alle stadia bedient in plaats van iedereen naar 6 te duwen?
2. **Ring-3-mandaat-grens**: waar ligt de eerste lijn — advies-met-pakket altijd, opdracht-uitzetten pas na welk track-record en tot welk budget?
3. **Genesis-tucht**: mag het organisme zelf nieuwe agent-profielen instantiëren binnen een missie-budget (voorstel), of blijft elke nieuwe specialist een menselijke goedkeuring (strenger)?
4. **Volgorde**: Signaalweb-foundation + leerlus-dicht als eerstvolgende Brandclaw-increment (stadium 1-2), vóór verdere autonomie-treden?
5. **Naamgeving en frame**: "het organisme" intern versus wat de klant ziet — één Brandclaw-entiteit met gezichten, of blijven de persona's het primaire frame?
6. **Dit document canoniek maken** en het convergentie-epic + roadmap erop herijken.

---

## 8. Bronnen

**Intern**: `docs/reports/p36-brandclaw-herijking-2026-07-17.md` · `docs/adr/2026-05-08-brandclaw-agent-architectuur.md` · `docs/adr/2026-07-05-agents-architectuur.md` · `docs/archive/old-lists/BRANDCLAW-ROADMAP.md` (§F) · `docs/archive/implementatieplannen/IMPLEMENTATIEPLAN-LEARNING-LOOP.md` · `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` · `tasks/agents-brandclaw-convergentie.md` · `tasks/_drafts/idea-competitive-intelligence-loop.md` · codebase-audit `src/lib/agents/**`, `src/lib/brandclaw/**`, `src/lib/learning-loop/**` (2026-08-08).

**Extern** (geraadpleegd 2026-08-08): dynamische sub-agent-creatie / agent-factory-patronen (AOrchestra: on-the-fly executors uit instructie+context+tools+model; LangChain Dynamic Subagents; agent-swarm-RL), unified data layer / identity-resolution als fusie-principe (CDP-architectuur), Reflexion-stijl zelfreflectie en memory-frameworks voor productie-agents, multi-armed-bandit-allocatie voor content- en strategie-experimenten, agentic procurement (RFQ/vendor-selectie binnen guardrails) als precedent voor ring-3-acties, en agentic-governance-kaders met autonomie-tiers en HITL-gates. URL-lijst in de sessie-samenvatting bij deze revisie.
