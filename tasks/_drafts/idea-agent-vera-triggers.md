---
id: agent-vera-triggers
title: Vera event-triggered — automatische brand-review bij events (propose-only)
status: pending-tech
created: 2026-07-14
verdict: needs-validation-first
---

# Probleemstelling (1 zin)

Off-brand assets en content komen ongemerkt de workspace binnen omdat brand-review alleen gebeurt als iemand er actief om vraagt — en niemand vraagt erom op het moment dat het ertoe doet.

# WHO — Doelgebruiker

**Rol**: brand manager / marketing lead in een workspace waar méér mensen (of meer momenten) content en assets aanleveren dan er review-discipline is. In de pilot: Erik als merkbewaker van Better Brands.
**Schaal**: pilot n=1 (Better Brands). **Nul gedocumenteerde expliciete klantverzoeken** voor deze feature — de vraag komt uit markt-analogie (Writer-patroon: governance-automatisering als retention-driver, in het uitbreidingsadvies gekoppeld aan ~160% NDR) plus eigen dogfood-observatie. Dit is eerlijk gezegd de zwakste WHO van de tweede-ring-kandidaten.
**Acuut segment**: workspaces met een DAM in actief gebruik en meerdere content-producenten — precies het segment dat Branddock post-launch wil binnenhalen (agencies, AGENCY-orgs).

## JTBD-narratief

> "Toen een teamlid een batch campagne-beelden naar de DAM uploadde, wilde de brand manager erop kunnen vertrouwen dat alles on-brand was, maar niemand draaide handmatig een Vera-review — de off-brand assets werden pas ontdekt toen ze al in een deliverable zaten (of helemaal niet)."

⚠️ Dit narratief is **plausibel maar niet geobserveerd bij een klant**. In de eigen dogfood is Vera alleen handmatig aangeroepen (dogfood-rondes 2026-07-07 / 2026-07-12: review-scores 71-75, altijd op verzoek). Het "te laat ontdekt"-moment is een markt-aanname, geen Branddock-incident.

## Evidence

- `docs/changelog.md` Pattern G2 — DAM heeft al een automatische upload-job (`DAM_AUTO_TAG`: auto-tagging + embedding bij upload). Het patroon "event → achtergrond-AI-job" bestaat en draait.
- `docs/changelog.md` #270 + `docs/adr/2026-05-29-fval-vision-judge-dim8.md` — F-VAL vision-judge (dim 8) bestaat: beelden kúnnen al brand-fit-gescoord worden.
- Memory `agents-initiative` — Fase 2 (scheduling) live op prod 2026-07-14: job-queue met `AGENT_TASK`-brug, instant-kick, run-notificaties, agents-inbox en propose-only confirm-pad bestaan allemaal. Event-triggers zijn de enige ontbrekende schakel.
- Uitbreidingsadvies 2026-07-14 (tweede ring #4, user: JA) — governance-automatisering als retentie-motor, Writer-patroon. ⚠️ Het rapport `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` is **niet in de repo aangetroffen** — deze claim is niet herverifieerbaar en mag niet als hard bewijs gelden tot het rapport gecommit is.
- Ontbrekende evidence (bewust genoteerd): geen `gotchas.md`-entry, geen klant-feedback, geen support-signaal over off-brand assets.

### Drie redenen om dit NIET te bouwen (anti-sycophancy)

1. **Niemand heeft erom gevraagd.** Pilot n=1, nul klantverzoeken. We bouwen op een marktanalogie (Writer) waarvan het bronrapport niet eens in de repo staat.
2. **Handmatige Vera-adoptie is nog niet bewezen.** Fase 3 is gated op pilot-adoptiedata die er nog niet is. Een handeling automatiseren waarvan je niet weet of mensen 'm handmatig waarderen, is de klassieke premature-automation-val.
3. **Ongevraagde AI-kritiek is een vertrouwensrisico.** Als de eerste automatische findings als ruis of betutteling voelen (false positives op geüploade foto's!), beschadigt dat het vertrouwen in álle zes agents — spillover die duurder is dan de feature waard is.

Weerlegging die standhoudt: (1) en (2) zijn timing-argumenten, geen nooit-argumenten — en de timing is expliciet "tweede ring, ná launch, plan-klaar". (3) is reëel en stuurt het ontwerp: opt-in, alleen-bij-issues, batching. Daarom verdict: plan nu, valideer vóór bouw.

# WHAT — Probleem (niet oplossing)

De workspace-eigenaar wil dat alles wat het merk raakt on-brand is, maar de bewaking is puur pull-based: Vera bestaat, scoort betrouwbaar (dogfood 71-75), en wordt alleen gebruikt als iemand eraan denkt. Waarneembaar gevolg: assets en drafts passeren de momenten waarop review goedkoop is (upload, klaar-voor-review) zonder enige merk-check, en de enige systematische check (alignment-scan) is een zwaar, handmatig, workspace-breed instrument. Er zit geen mechanisme tussen "niets" en "alles".

# WHY-NOW

Triggers:
- **Infra-window**: Fase 2 (scheduling) landde 2026-07-14 op prod. Job-queue, notificaties, inbox en propose-only confirm zijn vers en bewezen; event-triggers zijn een kleine delta op warme infra. Over 6 maanden is deze context koud.
- **Markt**: tweede-ring-advies (user: JA) positioneert governance-automatisering als retentie-driver — het is de feature die Branddock's unieke combinatie (merk-DNA + F-VAL) passief waardevol maakt in plaats van alleen on-demand.
- **Pilot-fase**: passieve Vera-waarde kan de agent-adoptiedata genereren waar de Fase-3 go/no-go op wacht.

Eerlijke kanttekening: dit is een why-now voor **plannen**, niet voor bouwen. Er is geen brandend klantincident. Vandaar de tweede-ring-timing: ná launch bouwen, nu plan-klaar maken, validatie intussen laten lopen.

# SUCCESS METRICS

**Primaire metric** (één): **actie-rate op automatische findings** — ≥ 30% van de event-getriggerde Vera-findings leidt binnen 7 dagen tot een user-actie in de inbox (fix doorgevoerd, confirm, of expliciete dismiss-met-reden), gemeten over de eerste 60 dagen na activatie in ≥ 2 workspaces.

Onder ~30% is de feature een notificatie-generator, geen bewaker — dan uitzetten of drempel herzien, niet doorbouwen.

**Counter-metric** (mag NIET kapotgaan): **trigger-disable-rate** — < 25% van de workspaces die de triggers aanzetten schakelt ze binnen 30 dagen weer uit. Uitschakelen ís het gedragssignaal voor notificatie-moeheid; als dit boven de 25% komt, faalt het moeheid-ontwerp ongeacht de actie-rate.

(AI-kosten per run zijn bewust géén metric maar een constraint — zie hieronder; instrumentatie per `AgentRun` bestaat al.)

# CONSTRAINTS

## Hard
- Tijd: tweede ring — **niet bouwen vóór launch**; plan-klaar is de deliverable van nu.
- Kosten: elke event-run is echte AI-spend (dogfood: ~$0,09-0,10/tekst-run; vision ~$0,04/beeld). Zonder gate is een bulk-import van 200 assets een ongevraagde kostenpost. Harde per-workspace daily cap op event-getriggerde runs is een MVP-eis, geen nice-to-have.
- Product-principe: **propose-only + confirm** (ADR agents-architectuur) — Vera stelt voor, wijzigt niets, blokkeert niets. Dit principe is niet onderhandelbaar in deze feature.
- Data-model-realiteit: `DeliverableStatus` kent géén REVIEW-status (alleen NOT_STARTED/IN_PROGRESS/COMPLETED); het "klaar voor review"-moment bestaat wél in de content-pipeline (`PipelineStatus.REVIEW`). Het tweede trigger-event moet dáárop gedefinieerd worden, niet op deliverables — of de event-definitie wordt een open vraag voor technical-planner.

## Soft
- Notificatie-model uit Fase 2 is bewust simpel gehouden (run-owner-only, geen matrix/quiet-hours — aantoonbaar inconsistent model, zie agents-initiative memory). Deze feature mag dat niet alsnog naar binnen trekken.

## Must NOT do
- Geen publicatie-, upload- of statuswissel-blokkade op basis van een Vera-score.
- Geen automatische wijziging van assets, deliverables of brand-DNA.
- Geen notificatie per individueel asset bij een batch-upload.
- Geen default-aan zonder bewezen actie-rate.

# SCOPE

## In-Scope (MVP)
- **Twee event-triggers** (niet drie): (1) DAM media-upload, gebatcht per upload-sessie; (2) content-pipeline-item bereikt REVIEW-status. Beide → één Vera-review-run.
- **Opt-in per workspace, per trigger-type, default UIT** — de toggle is tegelijk de kosten-gate en het moeheid-ventiel.
- **Moeheid-ontwerp in drievoud**: batching (1 event-burst = 1 run = max 1 notificatie), alleen-bij-issues-notificatie (on-brand = stil inbox-item, geen melding), harde daily cap per workspace met eenmalige "cap bereikt"-melding (geen stille drop).
- **Output via bestaande kanalen**: finding als REPORT/PROPOSAL-artefact in de agents-inbox + bestaand run-notificatietype met deep-link — geen nieuw surface.

## Out-of-Scope (expliciet NIET, ook al verleidelijk)
- Auto-fixes: Vera die assets hertagt, content herschrijft of "met één klik" corrigeert.
- Hard gates: publicatie/statuswissel blokkeren onder een score-drempel (PublishGate-achtig) — ander product, ander vertrouwensniveau.
- Brandstyle-import als derde trigger: laagfrequent, en "nieuwe styleguide vs. bestaand merk-DNA" is conflict-detectie — een wezenlijk ander review-type dan brand-fit.
- Default-aan rollout of aan-bij-onboarding.
- Configureerbare score-drempels/gevoeligheid per workspace (MVP = één sane default).
- Notificatie-matrix, quiet-hours, e-mail-digests of wekelijkse samenvattingen.
- Nieuwe review-dimensies of F-VAL-motoraanpassingen (dim 8 is wat het is).
- Event-triggers voor de andere vijf agents (Nova/Stella/Milo/Marco/Dana) — Vera is de bewezen-nuttige governance-case; generaliseren is pas aan de orde ná bewezen actie-rate.
- Externe events (webhooks van social platforms, publicatie-events buiten Branddock).
- Real-time review-overlay tijdens de upload-flow (async inbox volstaat).
- Credit-metering van event-runs (agents zijn vaste-prijs; per-token is een later, apart besluit).

> Out-of-Scope (11) > In-Scope (4) ✓

# AANNAMES

Aannames die WAAR moeten zijn voor deze feature te slagen:

- **Users acteren op ongevraagde brand-feedback** — bewijs: géén. Handmatige Vera-runs waren dogfood, geen klantgedrag. **Onbewezen — dit is dé validatie-vraag.** Valideerbaar vóór bouw met een concierge-test (zie Eerste Taak).
- **F-VAL-vision op geüploade (niet-gegenereerde) assets geeft acceptabel weinig false positives** — bewijs: dim-8 vision-judge bestaat en draait in de compose-flow, maar is nooit systematisch op rauwe DAM-uploads (foto's van events, pakshots van derden) gedraaid. **Deels onbewezen** — false-positive-ruis op uploads is het grootste vertrouwensrisico. Ook concierge-testbaar.
- **Kosten per event-run blijven in de bekende band (~$0,05-0,15)** — bewijs: dogfood-instrumentatie ~$0,09-0,10/run (tekst), ~$0,04/beeld (vision). Redelijk bewezen; cap vangt de staart.
- **Event-frequentie in echte workspaces is laag genoeg dat de cap uitzondering is, geen regel** — bewijs: geen — er is geen upload-/review-frequentiedata per workspace. Onbewezen maar goedkoop meetbaar uit bestaande tabellen (query, geen bouw).

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een workspace met de media-upload-trigger AAN, When een user 5 assets in één sessie uploadt, Then verschijnt binnen 15 minuten precies één Vera-finding in de agents-inbox die de batch als geheel beoordeelt, met maximaal één notificatie.
- [ ] Given de upload-trigger AAN en een batch die volledig on-brand scoort, When de review-run afrondt, Then verschijnt het resultaat stil in de inbox/run-historie en wordt géén notificatie verstuurd.
- [ ] Given een workspace waar beide triggers UIT staan (default), When assets geüpload worden of een pipeline-item naar REVIEW gaat, Then draait er geen Vera-run en wordt er geen AI-kost gemaakt.
- [ ] Given een content-pipeline-item dat naar REVIEW-status gaat met de review-trigger AAN, When de statuswissel plaatsvindt, Then staat er een Vera-finding in de inbox voordat (of terwijl) de menselijke reviewer het item oppakt, propose-only.
- [ ] Given de daily cap voor event-runs is bereikt, When een nieuw trigger-event binnenkomt, Then start er geen run en ontvangt de workspace éénmalig een "cap bereikt"-melding — geen stille drop, geen stapelende meldingen.
- [ ] Given een willekeurige automatische Vera-finding, When de user deze opent en negeert, Then is er aantoonbaar niets aan het asset, deliverable of merk-DNA gewijzigd (propose-only geverifieerd).

# EERSTE TAAK (morgen startbaar)

**Concierge-Vera, 2 weken** (validatie vóór bouw, geen code): bij elk echt event in de Better Brands-workspace (DAM-upload, content-item klaar voor review) handmatig een Vera-review draaien en de finding via de bestaande inbox delen. Meten: (a) actie-rate op de findings, (b) false-positive-ervaring op geüploade beelden, (c) event-frequentie per week (plus één query op bestaande DAM/pipeline-tabellen voor historische frequentie). Kosten: ~$0 bouw, ~$1-2 AI. Dit valideert aannames 1, 2 en 4 in één klap en levert de drempel-/cap-defaults voor de bouw.

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel

Aanname 1: dat gebruikers ongevraagde brand-kritiek waarderen en erop acteren. Alles hangt hieraan — batching, drempels en caps zijn mitigaties voor moeheid, maar als de fundamentele reactie op automatische findings "laat me met rust" is, is dit een perfect uitgevoerde feature die niemand wil. Direct daarachter: false positives van de vision-judge op rauwe uploads (een sfeerfoto van een teamuitje hóéft niet on-brand te zijn), wat aanname 1 actief kan vergiftigen.

## Pleidooi tegen dit plan

We automatiseren een handeling waarvan de handmatige variant nog geen bewezen adoptie heeft, voor een klantenbestand van n=1 dat er niet om gevraagd heeft, op basis van een marktrapport dat niet in de repo terug te vinden is. De agents-inbox is twee dagen live op prod met scheduling; de eerste échte gebruikersdata moet nog binnenkomen. Elke week aan deze feature is een week niet aan het kritieke pad (pilot-adoptie, launch-groei). En het downside-risico is asymmetrisch: één irritante week aan valse meldingen kan het vertrouwen in het hele agents-concept kosten.

## Wat zouden we leren door NIET te bouwen

De concierge-test levert vrijwel alle beslisinformatie voor ~$0: acteert de pilot-user op ongevraagde findings (aanname 1), hoe vaak zijn vision-scores op uploads ruis (aanname 2), en hoeveel events zijn er überhaupt per week (aanname 4 — als het antwoord "3 per maand" is, is een DAILY-schedule van Vera op de bestaande Fase-2-infra misschien al genoeg en is event-infra overkill). Bovendien: 4-6 weken wachten levert echte pilot-adoptiedata van de handmatige agents, wat de hele tweede ring beter informeert.

## Verdict van de planner

**needs-validation-first**

Reden: het plan is scherp genoeg om te bouwen (triggers gekozen, moeheid- en kosten-ontwerp staat, infra-delta is klein), maar de kernaanname — dat ongevraagde reviews tot actie leiden in plaats van irritatie — is met een 2-weekse concierge-test voor bijna niets te valideren. Timing past: tweede ring is per definitie ná launch; de validatie kan intussen draaien. Als de concierge-test ≥ 30% actie-rate laat zien en de vision-false-positives meevallen, promoveert dit zonder verdere discovery naar ready-to-build.

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (niet 5)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (11 > 4)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [x] Eerste taak morgen startbaar (concierge-test, geen code nodig)

# Volgende stap

Concierge-validatie starten (Eerste Taak); bij ≥ 30% actie-rate → technical-planner op dit bestand. Niet naar technical-planner vóór de validatie-uitkomst — of expliciet user-besluit om de validatie over te slaan.
