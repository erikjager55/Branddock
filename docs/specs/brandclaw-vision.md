# Brandclaw-visie — het marketing-organisme

> **Status**: voorstel v3 (toekomstvisie) — v2 aangescherpt met de uitkomsten van het software-toekomst-onderzoek (2026-08-08): twee gezichten (bestemming én onzichtbare laag), outcome-gebaseerd business-model, moat-discipline (graph + bewijs + leerlus boven features), en F-VAL als zelfstandig product.
> **Datum**: 2026-08-08 (v3; v1/v2 in git-historie van dit bestand).
> **Context**: dit bestand was aangekondigd in `docs/specs/_README.md` maar bestond niet. Het absorbeert het archief-eindbeeld (`docs/archive/old-lists/BRANDCLAW-ROADMAP.md` §F), de P3.6-herijking, het agent-ecosysteem-doc (`docs/marketing/p34-agent-ecosysteem-distributie.md` — vanaf v3 geïntegreerd, geen los eindbeeld meer) en de bevindingen van de code/docs-audit + het externe onderzoek van 2026-08-08.

---

## 1. De kern in één zin

**Brandclaw is één zelf-initiërend marketing-organisme dat alles hoort wat er over en rond het merk gebeurt, die signalen samensmeedt tot strategieën, zichzelf de specialisten geeft die elke strategie nodig heeft, handelt binnen én buiten het platform, en met elk resultaat aantoonbaar beter wordt — een lean, mean marketing machine met het merk-DNA als onvervreemdbare identiteit, de mens als bestuurder, en die overal werkt waar de klant werkt: als eigen cockpit én als onzichtbare merk-laag onder elke andere agent-stack.**

Niet "een set agents met een goedkeurings-inbox", maar een levend systeem. Agents zijn geen product-features; het zijn tijdelijke organen die het organisme laat ontstaan wanneer een strategie erom vraagt — en weer oplost wanneer het werk gedaan is of de les geleerd.

## 1.1 De weddenschap onder de visie

Het externe onderzoek (zie §9) is eenduidig over waar software heen gaat: agents nemen de business-logica-laag over, per-seat-SaaS ontbundelt, software wordt overvloedig (features zijn in weken kopieerbaar), de prijseenheid verschuift van toegang naar uitkomst, en de interface verschuift naar de agent van de klant. Wat verdedigbaar blijft is een korte lijst: proprietary context-graphs die elke dag dieper worden, feedback-loops waardoor het product met gebruik verbetert, vertrouwen/governance, en diepe workflow-verankering.

Brandclaw is de weddenschap dat Branddock precies díe lijst al in huis heeft — de merk-graph, F-VAL, de leerlus — en dat al het andere (schermen, features, generatie) vergankelijk oppervlak is. De visie kiest daarom hard: **investeer in graph, bewijs en leerlus; behandel al het overige als vervangbaar.**

---

## 2. Zes breuken met de huidige opzet

De audit van 2026-08-08 laat zien dat de huidige lijn (10 vaste agents, propose→confirm, BC-trap) een solide motor heeft opgeleverd — maar de visie erboven was te klein. Zes bewuste breuken:

1. **Van modules naar zenuwstelsel.** Databronnen (F-VAL-scores, ad-snapshots, competitor-scans, trends, PostHog) bestaan nu als losse silo's die elk door één agent worden bekeken. Er komt één **Signaalweb**: elke bron — intern én extern — voedt dezelfde graph, en inzichten ontstaan juist op de krúispunten van bronnen.
2. **Van inzichten naar strategie-synthese.** De huidige agents rapporteren observaties. Het organisme krijgt een **Strategiekamer** die inzichten combineert tot concurrerende strategie-hypothesen met verwachte impact, kosten en confidence — en die als portfolio beheert.
3. **Van catalogus naar genesis.** De 10 persona's zijn geen grens meer. Een strategie wordt een **missie**; het organisme stelt per missie zelf het team samen — bestaande specialisten hergebruiken, of een nieuwe laten ontstaan. Agents ontstaan, bewijzen zich, worden geïnstitutionaliseerd als playbook, of verdwijnen.
4. **Van platform-acties naar wereld-acties.** De actieradius stopt niet bij de eigen database of zelfs de gekoppelde kanalen. Het organisme mag adviseren én (binnen mandaat) regelen dat er buiten het platform iets gebeurt: een telemarketingbureau inschakelen, een panel-onderzoek inkopen, data verwerven die het mist.
5. **Van reageren naar initiëren.** Niets in het organisme wacht op een prompt of een weekschema als de wereld daar geen aanleiding toe geeft — en andersom: als de wereld wél beweegt, beweegt het organisme, ongevraagd. Eigen initiëring is de default, niet de uitzondering.
6. **Van bestemming naar laag.** Branddock is vandaag een plek waar je heen gaat. Het organisme werkt óók waar de klant al is: als headless merk-laag (context, verificatie, uitvoering via MCP/API) onder Claude, Copilot of welke agent-stack de klant ook draait. De eigen UI blijft — maar als cockpit, niet als voorwaarde.

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

Het denkende centrum:

1. **Inzicht-vorming**: signalen uit verschillende bronnen kruisen → inzichten met evidence en confidence (de bestaande two-reasons-toets blijft de lat).
2. **Strategie-synthese**: inzichten combineren tot **strategie-hypothesen** — niet "maak een LinkedIn-post" maar "persona X wordt bereikt maar converteert niet; de data wijst op een vertrouwensdrempel; drie kandidaat-strategieën: (a) case-study-programma, (b) webinar-reeks, (c) outbound-belcampagne via een extern bureau — met per kandidaat verwachte impact, kosten, doorlooptijd, benodigde zintuigen en confidence."
3. **Portfolio-management**: strategieën concurreren om budget en aandacht. Het organisme draait meerdere strategieën tegelijk, meet ze als experimenten, verschuift inzet naar wat werkt (bandit-allocatie op strategie-niveau, niet alleen op content-varianten) en stopt wat niet werkt — expliciet, met een geleerde les als restwaarde.

Hiermee worden de lege enum-leden `campaign_builder`, `measurement_eval` en `optimization` niet drie losse nodes, maar functies van één kamer: bouwen, meten en optimaliseren zijn fasen van elke strategie in het portfolio.

### 3.4 Missies en genesis — agents ontstaan, bestaan niet

Een goedgekeurde (of binnen mandaat zelf-gestarte) strategie wordt een **missie**. Het organisme stelt per missie het team samen:

- Een agent is een **instantie van (missie, context, tools, model, budget)** — configuratie op de bestaande motor (`runAgentLoop`), geen nieuwe code per agent. De huidige code-registry evolueert van "de catalogus" naar een **template-bank**: beproefde specialist-profielen waaruit het organisme put.
- **Genesis**: vraagt een missie om een specialisme dat er niet is (een B2B-outbound-strateeg, een webinar-producent, een marktonderzoek-begeleider), dan stelt het organisme een nieuw agent-profiel samen uit tools + prompt + context en laat het zich bewijzen op de missie. Dit is het "agent factory"-patroon dat in agent-onderzoek inmiddels standaard wordt — en het is Software 3.0 in de praktijk: agents worden geprogrammeerd in natuurlijke taal + context, niet in code.
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

De leerlus is geen feature maar een van de drie moats (§5). Organisme-breed in plaats van per-agent:

- **Elk mensbesluit is leersignaal**: accepts, rejects (met reden), edits (edit-distance als impliciete correctie) — automatisch teruggevoerd, niet alleen geregistreerd.
- **Elke uitkomst is leersignaal**: publicatie → performance → attributie terug naar de missie en strategie die het voortbracht. Ook ring-3-acties: het belresultaat van het bureau is net zo goed een outcome als een CTR.
- **De retro-functie**: periodiek en na elke missie evalueert het organisme zichzelf — hypothesen bevestigd/verworpen, memories geconsolideerd tot lessen, playbooks bijgewerkt, template-bank verrijkt (Reflexion-patroon: talige zelfreflectie in persistent geheugen).
- **Het merk-playbook**: gedistilleerde, cureerbare lessen per workspace — leesbaar, bewerkbaar, verwijderbaar door de klant. Geleerde regels kunnen F-VAL-criteria worden: het merkbewijs wordt scherper naarmate de machine langer draait. Geleerd kapitaal is de switching cost.

### 3.7 Identiteit en geweten — en F-VAL als eigen product

De ambitie groeit; de grenzen blijven hard, en worden juist het product:

- **Merk-DNA + F-VAL is de identiteit, geen filter achteraf.** Het organisme kán niet off-brand handelen: elke output, ook een belscript voor een extern bureau, gaat door dezelfde fidelity-poort.
- **F-VAL is daarnaast een zelfstandige omzetlijn.** In een economie waarin elke agent kan genereren, is de partij die kan *verifiëren* schaars. De verificatie-laag (score_against_brand, brand-context, on-brand-generatie) wordt als headless product verkocht aan de agents van anderen (§4) — potentieel het meest toekomstvaste onderdeel van het hele platform. "Elke agent kan content maken; geen enkele weet of het on-brand is" is geen marketingzin maar de kern van het bedrijf.
- **Mandaten in plaats van vrijheid**: autonomie is per workspace × ring × missietype begrensd (budget, volume, types, F-VAL-ondergrens) en wordt **verdiend** met track-record — en bij een incident automatisch teruggeschroefd. De verdiende-autonomie-ladder hangt aan missietypes, niet aan vaste agents.
- **Volledige auditability**: elke actie herleidbaar tot signalen, inzicht, strategie en mandaat (de bestaande DataSnapshot/versioning-fundamenten, nu end-to-end).
- **Kill-switch en budget-hard-stop** op elk niveau; geen auto-confirm-sluiproutes; cross-workspace-leren alleen opt-in.
- **De mens verschuift van operator naar bestuurder**: geen per-item-goedkeuring als eindbeeld, maar sturen op strategieën, mandaten en lessen.

---

## 4. De twee gezichten — bestemming én onzichtbare laag

Het onderzoek is duidelijk over waar de interface heen gaat: naar de agent van de klant. Brandclaw krijgt daarom van meet af aan twee gelijkwaardige gezichten op dezelfde motor:

**Gezicht 1 — de cockpit (bestemming).** De eigen UI, maar bewust klein en stabiel: wereldbeeld, strategie-portfolio, mandaten, trust-dashboard, playbook, inbox. Dit is waar de bestuurder bestuurt. Al het overige scherm-oppervlak (canvases, wizards, editors) is legacy-waardevol maar strategisch vervangbaar — nieuwe weergave-behoeften worden waar mogelijk agent-gedreven (generative UI) opgelost in plaats van met handgebouwde componenten. De hybride SPA met 200+ componenten wordt niet afgebroken, maar er wordt niet meer structureel in geïnvesteerd als moat.

**Gezicht 2 — de merk-laag (onzichtbaar).** Elke capability van het organisme — brand-context leveren, content verifiëren (F-VAL), on-brand genereren, signalen aanleveren, strategie-advies — is óók een headless MCP/API-oppervlak dat de agents van de klant consumeren: de marketeer die in Claude of Copilot werkt en daar "is dit on-brand?" vraagt, krijgt Brandclaw als antwoord zonder Branddock te openen. MCP is hier niet alleen een inkomend zintuig (§3.1) en een actie-kanaal (§3.5), maar een **distributiekanaal**: de merk-laag reist mee naar elke stack. Dit absorbeert het eindbeeld van `docs/marketing/p34-agent-ecosysteem-distributie.md` — "the brand layer for AI agents" is geen apart spoor naast het organisme, het is zijn tweede gezicht.

De twee gezichten versterken elkaar: elk gebruik via gezicht 2 voedt het Signaalweb en de leerlus van gezicht 1; elk stukje geleerd merkkapitaal maakt gezicht 2 waardevoller voor elke externe agent.

---

## 5. De drie moats — en de discipline die erbij hoort

Software wordt overvloedig: elke feature van dit document is door een concurrent met agentic coding in weken na te bouwen. De visie claimt daarom verdedigbaarheid op precies drie assets — en op niets anders:

1. **De merk-graph** (Signaalweb + merk-DNA + wereldbeeld): de context-graph rond de beslissingen van de klant, die elke dag dieper wordt en bij vertrek niet meekan als export alleen — het kapitaal zit in de verbindingen en de historie.
2. **Het bewijs** (F-VAL + track-record + auditability): het gestapelde, verifieerbare bewijs dat output on-brand is en dat mandaten verdiend zijn. Een concurrent kan de scorer kopiëren; niet de jaren aan gekalibreerd track-record.
3. **De leerlus** (feedback + outcomes + playbooks): het product verbetert met gebruik; de playbooks van een klant zijn zijn eigen geleerde kapitaal en tegelijk de switching cost.

**De discipline**: bij elke roadmap-afweging geldt de toets — *versterkt dit een van de drie moats, of bouwt het kopieerbaar oppervlak?* Feature-parity-races, extra deliverable-types en nieuw UI-oppervlak verliezen die toets bijna altijd; elke investering in graph-dekking, bewijs-diepte en lus-snelheid wint hem. De Strategiekamer, genesis en de vier ringen zijn belangrijk, maar ze zijn de *machinerie*; de drie moats zijn de *reden dat de machinerie van Brandclaw meer waard is dan dezelfde machinerie bij een ander*.

---

## 6. Het business-model — betalen voor uitkomst, niet voor toegang

Per-seat sterft in het agent-tijdperk; de eenheid van waarde wordt de uitkomst. Brandclaw's noordster (§8) is bewust zo gekozen dat hij ook de prijs-eenheid kan worden. Richting (definitieve keuzes per apart pricing-besluit):

- **De cockpit** (gezicht 1): een platformbedrag per workspace — de toegang tot merk-graph, wereldbeeld en bestuur. Bescheiden, want toegang is niet meer waar de waarde zit.
- **Het werk**: gestaffeld naar gerealiseerde, geverifieerde uitkomst — per gepubliceerd on-brand item, per afgeronde missie, of als bundel "zelfgedragen marketingwaarde" per maand. De bestaande credits-infrastructuur is het opstapje; de bestemming is prijzen op wat het organisme *oplevert*, niet op wat het *verbruikt*.
- **De merk-laag** (gezicht 2): usage-based per verificatie/context-call voor externe agents — de F-VAL-omzetlijn, met een gratis staffel als distributie-motor.
- **Consequentie voor de stadia** (§7): hoe hoger het stadium van een workspace, hoe groter het outcome-aandeel in de prijs — het business-model groeit mee met het verdiende vertrouwen, en de prikkels van klant en platform blijven gelijkgericht (het platform verdient pas echt als de machine werkt).

---

## 7. De groeistadia — van luisterend object naar lean, mean marketing machine

Zes stadia, elk met een eigen belofte aan de klant. De bestaande BC-treden mappen erin; geen bestaande gate wordt versoepeld.

| Stadium | Het organisme… | Klant-belofte | Bevat |
|---|---|---|---|
| **1. Luisteraar** | hoort alles: zintuigen gekoppeld, Signaalweb + wereldbeeld live, benoemt eigen blinde vlekken | "Het ziet wat ik niet zie" | signaalweb-foundation, MCP-client-laag, gap-detectie |
| **2. Duider** | verklaart: cross-source-inzichten, eerste strategie-hypothesen als advies | "Het begrijpt waaróm" | Strategiekamer v1, leerlus dicht (feedback + outcomes) |
| **3. Tester** | probeert: missies, experimenten, varianten, eerste genesis van specialisten; publiceert binnen goedkeuring | "Het bewijst wat werkt" | BC-2, bandit-allocatie, retro-functie, template-bank |
| **4. Bewijzer** | verdient: track-record per missietype, mandaten binnen envelopes, ring-3-adviezen als uitvoerbare pakketten | "Het verdient mijn vertrouwen" | BC-3 (bestaande go-criteria), trust-dashboard, playbooks |
| **5. Operator** | draait: portfolio van strategieën grotendeels zelfstandig, ring-2 volledig, ring-3 binnen opdracht-mandaat, data-acquisitie op eigen initiatief | "Het draait mijn marketing" | zelfkalibratie (F-VAL-re-tuning, prompt-evolutie), budget-mandaten ring 3/4 |
| **6. Machine** | initieert: signaleert kansen, formuleert strategieën, stelt teams samen, handelt binnen én buiten het platform, en wordt daar meetbaar elke cyclus beter in — de mens bestuurt op doelen en budget | "Lean, mean marketing machine" | volwaardig zelf-initiërend portfolio-management; opt-in segment-leren als koud-start-versneller |

De **merk-laag** (gezicht 2) loopt parallel aan alle stadia en is er niet van afhankelijk: F-VAL-als-product kan al in stadium 1-2 extern verkocht worden — het vergt de headless services die er grotendeels al zijn, geen autonomie.

**Volgorde-rationale**: stadium 1-2 eerst — de Strategiekamer is maar zo goed als het Signaalweb eronder, en de leerlus moet dicht zijn vóórdat volume en autonomie groeien (het kostbaarste signaal ontstaat vroeg en wordt vandaag weggegooid). Genesis (stadium 3) vóór brede autonomie (4-5): eerst laten zien dat ontstane specialisten zich bewijzen onder dezelfde F-VAL/audit-tucht, dan pas mandaten verruimen.

---

## 8. Noordster

**Zelfgedragen marketingwaarde**: het aandeel van de gerealiseerde marketing-uitkomst (gewogen naar outcome, niet naar volume) dat het organisme zelf initieerde én uitvoerde zonder menselijke correctie — per workspace, stijgend per cyclus, zonder incident. Dezelfde eenheid draagt het outcome-gebaseerde business-model (§6).

Ondersteunend: idee→gevalideerd-marktresultaat-doorlooptijd (daalt per stadium), accept-rate-trend, F-VAL-verloop zonder correctie, kosten per gerealiseerde uitkomst, dekkingsgraad van het Signaalweb (hoeveel blinde vlekken resteren), en voor gezicht 2: externe verificatie-calls per maand.

---

## 9. Architectuur-richting (op hoofdlijnen, alles op de bestaande motor)

| Nieuw | Bouwt op |
|---|---|
| `Signal` + `SourceAdapter`-registry + entity-resolution (merk-graph) | DataSnapshot, bestaande query-tools, Prisma/pgvector |
| Generieke MCP-client-laag (inkomend: bronnen; uitgaand: ring-2-acties) | bestaande connector-aanpak (P3.5), tool-registry |
| **MCP-server-oppervlak (gezicht 2)**: brand-context, score_against_brand, on-brand-generate als extern consumeerbare tools | headless services (P3.0a), publieke Brand-API (ADR 2026-07-17) |
| `Insight` en `StrategyHypothesis` (evidence, confidence, verwachte impact/kosten) + portfolio-stand | StrategyObservation-shape, two-reasons-toets |
| `Mission` + `AgentInstance` (missie, context, tools, model, budget) — registry wordt template-bank; `AgentDefinition` van code naar data | `runAgentLoop`, agent-loop-guards, artifact-contract |
| Ring-3-artefact "uitvoerbaar pakket" (briefing, shortlist, meetplan) + opdracht-mandaat-model | proposal→confirm-flow, F-VAL-poort |
| Gap-detectie + data-acquisitie-acties (survey, panel, koppeling) | Research Hub / validation-bundles (bestaand product), Exa |
| Outcome-metering als billing-eenheid | credits-infrastructuur, `AgentRun.totalCostUsd`, outcome-attributie |
| Feedback-ledger, outcome-attributie, retro-run, playbook, verdiende mandaten, trust-dashboard | (ongewijzigd uit v1 — zie git-historie voor detail) |

Wat er níet komt: geen extern orchestrator-framework (ADR 2026-05-08 Alt D blijft verworpen — genesis is configuratie op de eigen motor), geen model-finetuning op klantdata in deze horizon, geen autonomie zonder verdiend en expliciet aangezet mandaat, en geen structurele investering in nieuw handgebouwd UI-oppervlak buiten de cockpit (§4/§5).

---

## 10. Open besluiten (voor Erik)

1. **Ambitieniveau als workspace-instelling**: elke klant kiest zijn stadium-plafond (sommige klanten willen een Duider, andere een Machine). Akkoord dat het product alle stadia bedient in plaats van iedereen naar 6 te duwen?
2. **Ring-3-mandaat-grens**: waar ligt de eerste lijn — advies-met-pakket altijd, opdracht-uitzetten pas na welk track-record en tot welk budget?
3. **Genesis-tucht**: mag het organisme zelf nieuwe agent-profielen instantiëren binnen een missie-budget (voorstel), of blijft elke nieuwe specialist een menselijke goedkeuring (strenger)?
4. **Volgorde**: Signaalweb-foundation + leerlus-dicht als eerstvolgende Brandclaw-increment (stadium 1-2), vóór verdere autonomie-treden?
5. **Gezicht 2 naar voren halen**: F-VAL-als-product (merk-laag voor externe agents) kan vóór de autonomie-stadia — aparte omzetlijn, lage afhankelijkheid. Prioriteren naast of zelfs vóór stadium 3+?
6. **Business-model-besluit**: outcome-gebaseerd prijzen als bestemming bekrachtigen (met credits als overgang), inclusief de staffel-logica van §6 — vergt een eigen pricing-traject.
7. **Moat-toets institutionaliseren**: de drie-moats-toets (§5) opnemen in het prioriteringskader van `roadmap.md` (naast RICE)?
8. **Naamgeving en frame**: "het organisme" intern versus wat de klant ziet — één Brandclaw-entiteit met gezichten, of blijven de persona's het primaire frame?
9. **Dit document canoniek maken** en het convergentie-epic, `roadmap.md` én `docs/marketing/p34-agent-ecosysteem-distributie.md` erop herijken (p34 is vanaf v3 onderdeel van dit eindbeeld).

---

## 11. Bronnen

**Intern**: `docs/reports/p36-brandclaw-herijking-2026-07-17.md` · `docs/adr/2026-05-08-brandclaw-agent-architectuur.md` · `docs/adr/2026-07-05-agents-architectuur.md` · `docs/adr/2026-07-17-public-brand-api.md` · `docs/marketing/p34-agent-ecosysteem-distributie.md` · `docs/archive/old-lists/BRANDCLAW-ROADMAP.md` (§F) · `docs/archive/implementatieplannen/IMPLEMENTATIEPLAN-LEARNING-LOOP.md` · `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` · `tasks/agents-brandclaw-convergentie.md` · `tasks/_drafts/idea-competitive-intelligence-loop.md` · codebase-audit `src/lib/agents/**`, `src/lib/brandclaw/**`, `src/lib/learning-loop/**` (2026-08-08).

**Extern** (geraadpleegd 2026-08-08): (1) agent-architectuur: dynamische sub-agent-creatie / agent-factory-patronen (AOrchestra, LangChain Dynamic Subagents, agent-swarm-RL), Reflexion-stijl zelfreflectie en memory-frameworks, multi-armed-bandit-allocatie (o.a. LOLA), agentic procurement als ring-3-precedent, agentic-governance-kaders met autonomie-tiers en HITL-gates; (2) software-toekomst: het agent-tijdperk-debat rond de business-logica-laag en per-seat-SaaS ("SaaSpocalypse"-analyses, Deloitte TMT 2026), Karpathy's Software 3.0 (natuurlijke taal als programmeerlaag), service-as-software en outcome-based pricing, moat-analyses in het AI-tijdperk (context-graphs, feedback-loops, enterprise memory, governance als verdedigbaarheid), MCP als enterprise-distributiekanaal en headless/generative-UI-verschuiving. URL-lijsten in de sessie-samenvattingen bij v1-v3.
