---
id: agent-repurposer
title: Repurposing-agent — één long-form bron → on-brand afgeleiden, elk met F-VAL-score
status: pending-tech
created: 2026-07-14
verdict: ready-to-build (conditioneel — zie Red Team Review, voorwaarde 1 is een 10-minuten-validatie vóór tech-planning)
related-research: docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md (advies #3 — user akkoord 2026-07-14; ⚠️ rapport was NIET aanwezig in de working tree tijdens deze discovery, marktcijfers hieronder zijn overgenomen uit de opdracht-context en moeten bij promotie tegen het rapport geverifieerd worden)
related-adr: docs/adr/2026-07-05-agents-architectuur.md (registry, output-contract, F-VAL-poort D5, propose-only confirm — dit idee voegt GEEN nieuwe architectuur toe)
---

# Probleemstelling (1 zin)

Een afgeronde long-form productie (blog, case study) blijft in Branddock single-use: er is geen snelle, merkbewaakte route om er de wekelijkse social-posts uit te trekken, dus herbrieft de gebruiker elk kanaal handmatig of plakt hij de tekst in een generieke chatbot die merkstem noch kwaliteit valideert.

# WHO — Doelgebruiker

**Rol**: (1) SMB-merkeigenaar/marketeer die long-form in Branddock produceert en dezelfde week social-afgeleiden nodig heeft; (2) agency-medewerker die per klant-workspace uit één bron een kanaal-set moet opleveren.
**Schaal (pilotfase)**: 4 pilot-workspaces (Better Brands voorop) + founder-dogfood. Geen bredere userbase vóór launch.
**Acuut segment**: Better Brands — produceert al deliverables in Branddock (confirm-pad-dogfood maakte er echte aan) en heeft het hoogfrequente social-ritme waarvoor dit bedoeld is.

## JTBD-narratief

> "Toen de marketeer een blogpost afrondde in Branddock, wilde hij daar dezelfde dag een LinkedIn-post, X-thread en Instagram-caption uit trekken, maar hij moest per kanaal een nieuw deliverable aanmaken en handmatig briefen — of hij plakte de blog in ChatGPT, dat zijn merkstem niet kent en niets scoort — dus bleef de blog meestal single-use."

Eerlijkheidsclausule: gedestilleerd uit founder-observatie + marktdata, geen letterlijk pilot-citaat. Er ligt geen BB-ticket "bouw een repurposer". De marktvalidatie is indirect maar kwantitatief sterk (zie Evidence).

## Evidence

- `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md`, advies #3 — user heeft 2026-07-14 expliciet JA gezegd. Kerncijfers uit dat advies (⚠️ verifiëren bij promotie, rapport ontbrak in deze tree): repurposing is bewezen hoogfrequent (OpusClip 10M users óndanks ~40% discard-rate); social-assist is de meest-dagelijkse AI-marketing-taak (79% dagelijks gebruik) mits strikt draft→approve.
- `docs/reports/agents-dogfood-2026-07-07.md` — het volledige mechaniek bestaat en is gemeten: Milo's confirm-pad → echte canvas-generatie → linkedin-post met F-VAL **76**, ~$0,10/run. De repurposer voegt geen motor toe, alleen een bron→N-afgeleiden-surface.
- Memory `agents-initiative` — Fase 2 (AgentSchedule + notificaties + AgentMemory) staat sinds 2026-07-14 op productie: een wekelijks repurpose-ritme krijgt scheduling er gratis bij.
- Memory `content-types-picker-scope` + `src/features/campaigns/lib/deliverable-types.ts` — de benodigde afgeleide-typen (linkedin-post, twitter-thread, instagram-post, facebook-post, linkedin-poll) zijn álle zichtbaar en F-VAL-scorebaar; e-mail/newsletter en carrousel-typen zijn bewust verborgen (pre-launch-besluit 2026-06-16) — relevante scope-grens.
- Strategische koppeling: Fase 3 (`agents-brandclaw-convergentie`) is gegate op **pilot-adoptiedata**; de bestaande 6 agents zijn laagfrequent (research, strategie, review). Een hoogfrequente agent is de snelste route naar die adoptiedata.
- Anti-evidence (eerlijk): geen enkele pilot-klant heeft hierom gevraagd; adoptie van de bestaande 6 agents is nog niet gemeten; de OpusClip-analogie komt uit videoclipping — een medium dat dit MVP expliciet uitsluit.

### Anti-sycophancy: drie redenen om dit NIET te bouwen (gewogen tijdens discovery)

1. **Derde uitbreiding op een onbewezen surface.** Agents Fase 1+2 zijn live maar adoptie is nog niet aangetoond — Fase 3 is er zelfs expliciet op gegate. Een 7e agent toevoegen vóór er gebruiksdata van de eerste 6 is, is bouwen op hoop. *Weging: deels weerlegd — juist de laagfrequentie van de huidige catalogus is de reden dat adoptiedata uitblijft; dit is de goedkoopste hoogfrequente kandidaat. Het risico blijft benoemd in de Red Team Review.*
2. **Milo kan dit vandaag bijna al.** "Maak een LinkedIn-post op basis van deliverable X" is één use-case-knop + één read-tool verwijderd. Een aparte persona heeft eigen kosten (catalogus-ruis, onderhoud, uitleg Claw↔Agents↔Milo↔Repurposer). *Weging: legitiem — daarom is de hardste constraint hieronder "géén nieuwe motor" en blijft apart-vs-Milo een omkeerbaar besluit tot de tech-planning-spike. Het advies-argument vóór apart (eigen gebruiksritme: wekelijks/schedulebaar vs request-driven) is plausibel maar onbewezen.*
3. **Bron-schaarste.** Pre-launch hebben pilot-workspaces mogelijk maar een handvol afgeronde long-form deliverables ín Branddock; de echte bronvoorraad (bestaande blogs) staat erbuiten en is out-of-scope in dit MVP. Een repurposer zonder bronnen is een lege agent. *Weging: sterkste tegenargument — daarom is de bron-inventaris de go/no-go-gate in EERSTE TAAK.*

# WHAT — Probleem (niet oplossing)

Wie in Branddock een blog afrondt en er kanaal-afgeleiden van wil, moet per kanaal het Add-Content-pad opnieuw doorlopen: type kiezen, titel bedenken, en zelf een brief destilleren uit content die het systeem al hééft. Dat is per afgeleide minuten handwerk zonder toegevoegde denkkracht, dus gebeurt het vaak niet (blog blijft single-use) of buiten Branddock (chatbot zonder merkstem, zonder score, zonder spoor in de campagne). Het waarneembare gevolg: campagnes met één long-form item en géén social-staart, terwijl de social-behoefte er dagelijks is.

# WHY-NOW

Triggers:
- **User-besluit is genomen**: advies #3 uit het marktonderzoek van 2026-07-14 is expliciet geaccordeerd — deze discovery scherpt scope en risico's aan, het "of" ligt vast.
- **Marginale kosten zijn nét historisch laag geworden**: met Fase 2 live (2026-07-14) bestaat álles wat deze agent nodig heeft — registry, propose-only confirm-keten, canvas-orchestrator, F-VAL-poort (ADR D5), credit-metering op het confirm-pad, én scheduling. Dit is een dunne agent-config + één read-tool, geen motorbouw.
- **De adoptie-gate van Fase 3 heeft frequentie nodig**: de huidige catalogus is laagfrequent van aard; repurposing is marktbreed de hoogst-frequente content-taak. Zonder een frequente use-case blijft de go/no-go-data voor Brandclaw-convergentie dun.
- **Pilot loopt nú**: BB produceert deze weken content in Branddock — elke week zonder repurpose-route is een week waarin het single-use-patroon inslijt (en ChatGPT het gewoontepad wordt).

Niet-triggers (eerlijk): geen klantvraag, geen directe omzet, en dit versnelt niets op het launch-pad. Als de bron-inventaris (EERSTE TAAK) leeg blijkt, is "over 6 weken, ná meer pilot-content" een prima antwoord.

# SUCCESS METRICS

**Primaire metric** (één): **behoud-rate van gegenereerde afgeleiden** — ≥70% van de door de repurposer gegenereerde afgeleiden is 7 dagen na generatie niet verwijderd én minimaal bekeken of geëxporteerd, gemeten over de eerste 30 pilot-dagen. Meting: deliverable-status + PostHog-events (`agent_output_accepted`, view/export-events). Markt-anker: OpusClip's ~40% discard = 60% behoud — de hele these ("F-VAL-per-afgeleide is de anti-discard-differentiator") staat of valt met deze meting.

**Counter-metric (mag NIET kapotgaan)**: **gemiddelde F-VAL-score van repurposer-afgeleiden ≥ de canvas-baseline voor hetzelfde content-type** (dogfood-anker: linkedin-post 76). De snelheids-route mag de kwaliteitsclaim van het platform niet ondermijnen — een repurposer die volume met lagere scores produceert is een regressie, geen feature.

**Guardrails (secundair, bewaken)**:
- Run-frequentie: ≥1 voltooide repurpose-run per actieve pilot-workspace per week (de "hoogfrequent"-aanname zichtbaar maken).
- Milo-kannibalisatie: Milo-runs mogen dalen als repurposer-runs ze 1-op-1 vervangen, niet zonder vervanging.
- Kosten per run ≤ ~$0,15 (dogfood-anker ~$0,10/run; N afgeleiden per run maakt dit de duurste-loop-kandidaat).

### Anti-sycophancy: aannames die WAAR moeten zijn (met bewijsstatus)

- **A1 — Er zíjn bronnen**: pilot-workspaces bevatten voldoende afgeronde long-form deliverables mét gegenereerde tekst-content, en er komen er wekelijks bij. Bewijs: BB-confirm-pad maakte echte deliverables; volume onbekend. **Onbewezen — valideren VÓÓR tech-planning (EERSTE TAAK, 10 min query).**
- **A2 — F-VAL-per-afgeleide verlaagt discard** t.o.v. de markt-baseline (~40%). Bewijs: F-VAL werkt bewezen in de canvas-flow; het causale effect op behoud is onbewezen. Validatie: primaire metric — dit is expliciet een te toetsen hypothese, geen feit.
- **A3 — De bestaande confirm-keten geeft per-afgeleide granulariteit**: Milo attach't al één proposal per content-item, dus N losse proposals per run zou per-item accept/decline gratis geven. Bewijs: Milo's gedragsregel ("ONE create_deliverable per requested content item") + confirm-route bestaat. **Deels bewezen — tech-planner verifieert N-proposals-per-run + de credit-deduct-granulariteit (dogfood: −3 DEDUCT op confirm-pad).**
- **A4 — Bron-gedistilleerde briefs leveren gelijke of betere kwaliteit** dan vrije briefs: de afgeleide-brief bevat de kernboodschap uit de bron-content en de orchestrator's medium-context doet de kanaal-vertaling. Bewijs: geen — brief-lengte/context-injectie kan een gat zijn. Validatie: founder-dogfood vóór pilot-exposure, F-VAL-vergelijking tegen de counter-metric.
- **A5 — Een aparte persona verhoogt gebruiksfrequentie** t.o.v. dezelfde functie als Milo-use-case (het "eigen gebruiksritme"-argument uit het advies). Bewijs: geen — vendor-analogie. **Onbewezen én omkeerbaar**: als de tech-planning-spike uitwijst dat een Milo-uitbreiding 80% goedkoper is, is downgraden naar use-case + latere persona-promotie een geldig besluit.
- **A6 — Credits-pariteit voelt fair**: 4 afgeleiden = 4× de `agent-deliverable`-deduct. Bewijs: geen; risico laag in pilotmodus (credits aan, top-up dicht). Validatie: pilot-feedbackloop; bundelpricing is bewust out-of-scope.

# CONSTRAINTS

## Hard
- **Géén nieuwe generatie-motor.** De enige route naar content is het bestaande propose-only confirm-pad → `orchestrateContentGeneration` → `runFidelityScoring`. De repurposer is een dunne registry-config (zoals `content-creator.ts`) + maximaal één nieuwe read-tool (bron-content lezen). Als tech-planning méér motor nodig acht, is de scope fout.
- **F-VAL op élke afgeleide** — ADR D5-lijn: nooit een stille ongescoorde content-output. Propose-flow-REPORTs worden (net als bij Milo) bewust níet gescoord; echte content scoort op het confirm-pad.
- **Strikt draft→approve**: propose-only, niets wordt aangemaakt of gegenereerd zonder expliciete confirm — dit is bovendien de voorwaarde waaronder het 79%-dagelijks-gebruik-marktbewijs geldt.
- **Alleen zichtbare picker-typen als afgeleide.** Geen `hidden: false`-flips als bijvangst — het unhiden van Email & Automation of carrousel-typen is een apart product-besluit met eigen test-verplichting (elk type moet door de content-test-lat).
- **Billable-pariteit met Milo**: `billable: true`, deduct per gegenereerde afgeleide op het confirm-pad met idempotencyKey, proposal gratis, merkcontext/F-VAL nooit gemeterd (staand besluit).
- **Tijd**: dit hoort een kleine taak te zijn (registry-config + read-tool + batch-proposal-gedrag + smoke). Schat tech-planning dit op >1 week, dan is er scope-lekkage — terug naar dit doc.

## Soft
- Persona-naam en -invulling volgen het bestaande patroon (Nova/Vera/Stella/Milo/Marco/Dana): benoemd, professioneel, Lucide-icoon, geen cartoon. Werknaam: "Repurposer"; definitieve naam is design-werk.
- Catalogus-copy moet de afbakening met Milo in één zin uitleggen ("Milo maakt nieuw; de Repurposer vermenigvuldigt bestaand") — twee content-agents zonder die zin = verwarring.

## Must NOT do
- Geen video-clips of video-afgeleiden (OpusClip-territorium; Video & Audio-categorie is hidden en er is geen motor).
- Geen auto-publish, geen kanaal-integraties, geen posting-API's.
- Geen nieuwe artefact-typen — REPORT/PROPOSAL + deliverables volstaan.
- Geen event-trigger-mechaniek ("bij elke afgeronde blog automatisch draaien") — het bestaande cadence-schedule volstaat in MVP.
- Geen unhide van verborgen content-type-categorieën.

# SCOPE

## In-Scope (MVP)

1. **7e persona-agent** in de code-registry (patroon `content-creator.ts`): eigen persona, mission/behavior gericht op bron→afgeleiden, `featureKey`, `billable: true`, REPORT-output-contract conform Milo.
2. **Bron-selectie**: een afgerond long-form deliverable uit de eigen workspace (zichtbare Long-Form-typen; blog-post is het primaire pad). Ondersteund door `read_deliverables` + één nieuwe read-tool die de gegenereerde bron-content (tekst-varianten) oplevert.
3. **Afgeleide-preset (4, optioneel 5)**: `linkedin-post`, `twitter-thread`, `instagram-post`, `facebook-post` (+ eventueel `linkedin-poll`) — de user kiest per run welke subset; de agent stelt per gekozen type één afgeleide voor.
4. **Propose-only batch**: per afgeleide een eigen proposal (type + titel + uit de bron-content gedestilleerde brief), zodat de user per afgeleide kan accepteren of afwijzen.
5. **Landing in de bron-campagne**: geaccepteerde afgeleiden worden deliverables in dezelfde campagne als de bron, gegenereerd via het bestaande confirm-pad, elk met zichtbare F-VAL-score (onder drempel: bestaande auto-iterate/STRICT of expliciete flag — nooit stil).
6. **Bron-traceerbaarheid**: in elke afgeleide is naspeurbaar uit welke bron hij komt (minimaal in de brief; een echt relatie-veld is een tech-planner-keuze).
7. **Credits**: per gegenereerde afgeleide de bestaande `agent-deliverable`-deduct op het confirm-pad; geen nieuwe metering-class.
8. **Scheduling gratis meenemen**: geen extra bouw, maar één smoke die aantoont dat het generieke `AgentSchedule`-mechanisme (Fase 2, live) op deze agent werkt — bijv. wekelijks "repurpose het nieuwste afgeronde long-form deliverable zonder afgeleiden".

## Out-of-Scope (expliciet NIET, ook al verleidelijk)

1. **Video-clips / video-afgeleiden** — OpusClip-territorium, ander medium, geen motor, categorie hidden.
2. **Auto-publish naar kanalen** — er bestaat geen publish-mechaniek en die komt hier niet binnen.
3. **Kanaal-integraties** (LinkedIn/Meta/X-API's) — Channel Activation blijft LATER-roadmap.
4. **Externe bronnen**: URL-scrape, geplakte tekst, PDF-upload — eerste follow-up-kandidaat, gated op de bron-inventaris-uitkomst en pilot-vraag.
5. **E-mail-afgeleiden** (newsletter, promotional-email) — hele categorie is bewust hidden; unhide is een apart besluit.
6. **Beeld-afgeleiden**: social-carousel, linkedin-carousel, quote-graphics — hidden types + visual-pipeline-complexiteit.
7. **Event-triggers** ("draai automatisch bij elk afgerond blog") — cadence-schedule volstaat; een event-brug is nieuw mechaniek.
8. **Side-by-side bron→afgeleiden-review-UI** — campagne-overzicht + agents-inbox volstaan in MVP.
9. **Bulk-/cross-campagne-repurposing** (hele library in één run) — één bron per run.
10. **Repurpose-bundelpricing of kortingen** — geen nieuwe metering-classes in pilotfase.
11. **Per-kanaal instelbare tone-shift / voice-profielen** — de bestaande medium-context van de orchestrator doet de kanaal-vertaling.
12. **Meertalige afgeleiden** — loopt via het multilingual-initiatief, niet hier.
13. **A/B-varianten per afgeleide** bovenop de bestaande variant-mechaniek.
14. **Hashtag-/mention-strategie per platform als aparte feature** — de type-constraints (maxHashtags) volstaan.

> Out-of-Scope (14) > In-Scope (8) — en de drie zwaarste verleidingen (video, publish, integraties) staan er expliciet bij, conform de opdracht.

# AANNAMES

Zie het anti-sycophancy-blok onder SUCCESS METRICS: A1 (bronnen bestaan — **onbewezen, gate**), A2 (F-VAL verlaagt discard — te toetsen hypothese), A3 (confirm-keten aan N proposals — deels bewezen), A4 (bron-brief-kwaliteit — dogfood vóór pilot), A5 (aparte persona > Milo-use-case — onbewezen, omkeerbaar), A6 (credits-pariteit fair — laag risico in pilotmodus).

> Zwaarste onbewezen aannames: **A1** (wordt vóór tech-planning gevalideerd) en **A5** (wordt als expliciet omkeerbaar beslispunt aan de technical-planner meegegeven).

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een campagne met een afgerond long-form deliverable mét gegenereerde tekst-content, When de user de repurposer via een use-case-knop op die bron richt en 3-5 afgeleide-typen kiest, Then levert de run per gekozen type één propose-only voorstel met type, titel en een uit de bron-content gedestilleerde brief (plus een kort REPORT dat uitlegt wat er is voorgesteld).
- [ ] Given de proposals in de inbox, When de user er een subset van bevestigt en de rest afwijst, Then worden uitsluitend de bevestigde afgeleiden als deliverables in de bron-campagne aangemaakt en gegenereerd via de bestaande canvas-motor — de afgewezen voorstellen muteren niets.
- [ ] Given een gegenereerde afgeleide, Then is de F-VAL-score zichtbaar op dezelfde plekken als bij elk ander deliverable, en volgt onder de drempel de bestaande auto-iterate/STRICT-route of een expliciete flag — nooit een stille ongescoorde afgeleide.
- [ ] Given een bevestigde batch van N afgeleiden, Then zijn er exact N idempotente `agent-deliverable`-credit-deducts geboekt; een run die alleen voorstelt (geen confirm) boekt niets.
- [ ] Given een bron-deliverable zónder gegenereerde content (alleen titel/brief), When de user die als bron kiest, Then legt de agent uit dat er geen bron-content is en stelt hij níets voor (geen afgeleiden gehallucineerd uit een titel).
- [ ] Given een aangemaakte afgeleide, Then is de bron ervan naspeurbaar (minimaal benoemd in de brief).
- [ ] Given de bestaande AgentSchedule-UI, When de user een wekelijks schema op de repurposer zet, Then draait de run via het generieke mechanisme zonder repurposer-specifieke bouw (aangetoond met één smoke).

# EERSTE TAAK (morgen startbaar)

**Bron-inventaris draaien (gate voor A1, ~10 min)**: query op prod-Neon — per pilot-workspace het aantal deliverables in de zichtbare Long-Form-typen mét gegenereerde tekst-varianten, plus de aanwas van de laatste 14 dagen. Resultaat vastleggen in dit doc. **Drempel**: ≥3 bruikbare bronnen in minstens 2 pilot-workspaces óf aantoonbare wekelijkse aanwas bij BB. Onder de drempel → verdict zakt naar needs-validation-first en de paste-bron (out-of-scope #4) moet heroverwogen worden vóór tech-planning. Boven de drempel → direct door naar technical-planner met dit doc; eerste tech-beslispunt: apart-agent vs Milo-uitbreiding (A5, omkeerbaar).

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel

**A1 — bron-schaarste.** Alles aan dit plan is goedkoop behálve het risico dat er niets te repurposen valt: pre-launch workspaces met drie blogposts geven de agent drie runs en daarna stilte. De hele "hoogfrequent"-belofte (en daarmee de adoptiedata-trigger uit WHY-NOW) veronderstelt een gestage long-form-aanwas ín Branddock die nog niet is aangetoond. Sub-zwakke schakel: **A5** — het apart-agent-besluit leunt op een gebruiksritme-argument uit vendor-analogie, terwijl 80% van de functionaliteit als Milo-use-case te testen was geweest.

## Pleidooi tegen dit plan

Dit is de derde uitbreiding op een agents-surface waarvan de adoptie nog nul gemeten datapunten heeft — de eigen roadmap gate't Fase 3 daar niet voor niets op. Het sterkste marktbewijs (OpusClip, 10M users) komt uit videoclipping, precies het medium dat dit MVP uitsluit; wat overblijft is een tekst-naar-tekst-taak die ChatGPT gratis doet en die Milo vandaag al bijna kan. De agent kan bovendien bij oplevering letterlijk niets te doen hebben als de bron-inventaris tegenvalt. De goedkoopste falsificatie was een Milo-use-case-knop geweest, geen zevende persona.

## Wat zouden we leren door NIET te bouwen

- Twee weken pilot-observatie zou tonen of BB überhaupt long-form in Branddock blijft produceren (A1 gratis gevalideerd) en of ze om afgeleiden vrágen.
- Goedkoper tussen-experiment: één Milo-use-case "maak een LinkedIn-post uit deliverable X" (bestaande tools, geen nieuwe agent) — meet de vraag naar bron-gebaseerd werk vóór de persona-investering, en test A4 (bron-brief-kwaliteit) langs dezelfde weg.
- Uitstel zou ook de eerste échte adoptiecijfers van de bestaande 6 agents opleveren als referentiekader voor de primaire metric.
- Dit is gewogen: de user heeft advies #3 expliciet geaccordeerd, de marginale kosten zijn na Fase 2 uitzonderlijk laag, en de Fase-3-gate heeft juist een frequente use-case nodig. Bouwen is verdedigbaar — mits de bron-gate hard blijft.

## Verdict van de planner

**ready-to-build** — conditioneel, met drie voorwaarden in dit doc verankerd:

1. **Bron-inventaris-gate (EERSTE TAAK)** vóór tech-planning: onder de drempel zakt het verdict naar needs-validation-first — geen agent voor een lege bronvoorraad.
2. **Geen-nieuwe-motor-constraint is niet onderhandelbaar**: registry-config + één read-tool + batch-proposal-gedrag; elke scope daarbuiten gaat terug naar dit doc.
3. **A5 blijft omkeerbaar**: de technical-planner behandelt apart-agent vs Milo-uitbreiding als expliciet eerste beslispunt met kostenvergelijking, niet als voldongen feit uit het marktadvies.

Reden: user-besluit ligt vast, de machinerie is volledig aanwezig en dogfood-bewezen (confirm-pad, F-VAL 76, ~$0,10/run, scheduling live), en de strategische koppeling met de Fase-3-adoptie-gate is reëel. Het restrisico is geen bouwrisico maar een vraag-risico (bronnen + frequentie), en dat is met de gate + primaire metric meetbaar gemaakt in plaats van gehoopt.

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (behoud-rate ≥70%; F-VAL-baseline als harde counter)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (14 vs 8)
- [x] MVP-acceptance-criteria concreet (Given/When/Then, 7 stuks)
- [x] Eerste taak morgen startbaar (bron-inventaris-query, ~10 min, met expliciete drempel)

# Volgende stap

Klaar voor technical-planner **ná de bron-inventaris-gate** (EERSTE TAAK). Meegeven aan de tech-planner: (1) beslispunt apart-agent vs Milo-uitbreiding (A5, omkeerbaar, met kostenvergelijking); (2) verificatie N-proposals-per-run + credit-granulariteit (A3); (3) de nieuwe read-tool voor bron-content is de enige toegestane nieuwe machinerie. Marktcijfers verifiëren tegen `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` zodra dat rapport in de tree staat.
