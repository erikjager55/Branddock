---
id: agent-ads-watchdog
title: Ads-waakhond — propose-only agent voor creative-fatigue op gekoppelde Meta-campagnes
status: pending-tech
created: 2026-07-14
verdict: needs-validation-first
---

# Probleemstelling (1 zin)

MKB-adverteerders met Meta Advantage+-campagnes zien hun resultaten verslechteren zonder te begrijpen waarom, en missen het signaal ("je creatives zijn moe") én de capaciteit om tijdig on-brand vervangende creatives te maken.

# WHO — Doelgebruiker

**Rol**: MKB merk-owner / marketeer die zelf Meta-ads draait (typisch via Advantage+, zonder dedicated performance-marketeer of bureau).
**Schaal**: onbekend — pilot is vandaag n=1 (Better Brands); aantal workspaces met een gekoppeld ad-account is **niet geverifieerd en vermoedelijk 0** (de publish-pipeline draaide tot nu toe uitsluitend PAUSED/sandbox). Dit is de belangrijkste openstaande validatie.
**Acuut segment**: MKB dat maandelijks significant ad-budget spendeert via Advantage+ en Meta's automatisering ervaart als black box — ze betalen, maar weten niet wat ze zelf nog kunnen bijdragen.

## JTBD-narratief

> "Toen de campagne na drie weken duurder werd per resultaat, wilde de marketeer weten wat zíj kon doen om bij te sturen, maar Meta's Advantage+-interface gaf geen aanknopingspunt behalve 'budget verhogen' — dus liet ze de campagne doorlopen op vermoeide creatives, of pauzeerde alles uit frustratie."

**Eerlijkheids-flag**: dit narratief komt uit marktonderzoek (tweedehands), niet uit een geobserveerd pilot-verhaal. Er is nog géén Branddock-klant die dit letterlijk verteld heeft. Zie Aannames.

## Evidence

- **Marktonderzoek 2026-07-14** (tweede ring #5, user JA) — kernles: ads-autonomie is de-facto geaccepteerd in de markt, maar PMax/Advantage+-black-box-frustratie is enorm; "zichtbaarheid mét stuurbaarheid" is de kans. ⚠️ Het rapport `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` is bij het schrijven van dit doc **niet in de repo gevonden** — kernles overgenomen uit de opdracht-samenvatting. Committen vóór tech-planning.
- `docs/specs/ad-publishing.md` §Fase C + §8.2 — measurement-foundation (`AdMetricSnapshot`) is bewust vooruit-gebouwd: "lege table, structuur klaar; fetch-job komt in vervolg-spec". De non-scope-lijst noemt "AI improvement-suggestion engine" expliciet als later/eigen spec — dit idee ís die vervolg-spec (product-kant).
- `docs/audits/2026-06-25-sleeping-software-audit.md` — `AdMetricSnapshot` gemarkeerd als "bewust future-wired, wél task-file aanmaken (Tier 4 Meta-ads)". Die task-file bestond nog niet; dit doc vervult dat.
- `docs/archive/old-lists/BRANDCLAW-ROADMAP.md` E-AGT.4 — "waakhond"-concept (continuous monitor) zat al in de oorspronkelijke Brandclaw-visie.
- Agents-initiative (memory + `docs/reports/agents-diepte-analyse-en-plan-2026-07-05.md`) — alle benodigde primitieven zijn live: propose-only confirm-pad, agents-inbox, schedules (Fase 2, live 2026-07-14), run-notificaties, on-brand beeldgeneratie, credits output-only.
- **Ontbrekende evidence**: geen enkele klantvraag, Slack/mail-signaal of pilot-observatie over ads-monitoring. Nul.

# WHAT — Probleem (niet oplossing)

De gebruiker draait Meta-campagnes en ziet performance na verloop van tijd dalen (frequency loopt op, CTR zakt, dezelfde creative draait wekenlang). Advantage+ verbergt wat er onder de motorkap gebeurt, dus de gebruiker merkt verval te laat of helemaal niet, en het maken van een vervangende on-brand creative is precies het werk dat blijft liggen. Waarneembaar resultaat: budget lekt naar vermoeide creatives, of campagnes worden uit frustratie gestopt.

**Wat het probleem NIET is**: bid-/budget-optimalisatie. Daar is de markt vol van en daar is Meta zelf beter in. De white space is de creative-kant: signaleren + on-brand vervanging voorstellen.

# WHY-NOW

Eerlijk antwoord: dit is **niet** why-now — het is expliciet **tweede ring, ná launch, plan-klaar**. Wat het nu plan-klaar maakt (en niet pas over een jaar):

Triggers:
- Marktonderzoek 2026-07-14 bevestigt de kans ("zichtbaarheid mét stuurbaarheid") en user heeft JA gezegd op tweede ring #5.
- Agents-Fase 2 (schedules) is per 2026-07-14 live — de laatste ontbrekende primitief (periodiek draaien) bestaat nu. De bouwkosten van "nog een agent" zijn structureel gedaald.
- Measurement-foundation (Fase C-schema) is al gemigreerd; de spec wachtte expliciet op een vervolg-spec.

Waarom niet eerder bouwen: launch-pad heeft prioriteit, en de activatie-gate (gekoppelde ad-accounts) staat op 0.

# SUCCESS METRICS

**Primaire metric** (één): **acceptance-rate van waakhond-voorstellen** — ≥30% van de PROPOSALs (fatigue-signaal + refresh-voorstel) wordt binnen 14 dagen door de user bevestigd tot een gegenereerde refresh-creative, gemeten over de eerste 60 dagen op accounts met actieve campagnes.

Rationale: voor een propose-only agent is "doet de mens er iets mee" de enige metric die waarde bewijst. Signalen die niemand omzet in actie zijn ruis.

**Counter-metric** (mag NIET kapotgaan): **alert-moeheid** — geen enkele actieve workspace schakelt de waakhond binnen 30 dagen uit of dempt hem wegens ruis; hard plafond van signaal-volume per workspace per week (exacte cap: tech-planning), zodat de agents-inbox geen spam-kanaal wordt.

# CONSTRAINTS

## Hard
- **Propose-only, absoluut**: de agent schrijft NOOIT iets naar Meta. Geen budget-wijziging, geen bid, geen pauzeren/activeren, geen creative-push — ook niet na confirm. Confirm levert een artefact ín Branddock; plaatsen doet de mens zelf. Dit is een product-invariant, geen instelling.
- **Data-realiteit vandaag**: de integratie synct alléén de status van door Branddock gepubliceerde ads (die allemaal PAUSED zijn). Er is géén performance-data-fetch (`AdMetricSnapshot` heeft nul writers in `src/`) en externe campagnes zijn onzichtbaar (`AdCampaign` vereist een `deliverableId`). De MVP vereist dus een nieuwe read-side: campagne-discovery + insights-pull voor het héle gekoppelde account. Zonder dat bewaakt de waakhond een lege tuin.
- **OAuth-scope**: `ads_read` zit al in de bestaande scopes — geen nieuwe toestemmingsvraag aan de user. Wél checken: Meta app-review-status voor deze permissions op de productie-app (platform-gate, kan doorlooptijd hebben).
- **Credits**: monitoring-runs zijn gratis (conform "merkcontext/monitoring nooit meteren"); alleen de gegenereerde refresh-creative op het confirm-pad boekt credits (output-only, bestaand patroon).
- **Timing**: ná launch; niet starten vóór aantoonbare Fase-1-agents-adoptie in de pilot.

## Soft
- Meta insights-API rate-limits — dagelijkse poll volstaat ruim; geen real-time ambitie.
- Advantage+ rapporteert op asset-niveau beperkter dan klassieke campagnes — de drie signalen moeten op campagne-/ad-niveau al zinvol zijn.

## Must NOT do
- Geen bidding-engine worden of lijken: geen "verhoog/verlaag budget"-adviezen, ook niet als tekst in een REPORT.
- Geen autonomie-sluiproute: geen "auto-confirm na X dagen", geen batch-confirm-all als default.
- Geen nieuwe OAuth-scopes vragen voor v1.
- Geen eigen performance-dashboard bouwen "omdat de data er nu toch is".

# SCOPE

## In-Scope (MVP)
1. Read-only insights-sync voor gekoppelde Meta-accounts: dagelijkse pull van actieve campagnes in het account (óók niet-Branddock-campagnes — dat is waar de doelgroep leeft) → `AdMetricSnapshot`-vulling.
2. Waakhond als 7e persona-agent (propose-only) op DAILY schedule met precies **drie signalen**: frequency-drempel, CTR-trend-daling, creative-leeftijd. Drempels als voorbeeld: frequency > 3,5; CTR −25% over 14 dagen; zelfde creative > 45 dagen — kalibratie in validatie/tech-fase.
3. Output via bestaande primitieven: REPORT (wat zag ik) + PROPOSAL (welke creative is moe + refresh-richting) in de agents-inbox, met bestaande run-notificatie.
4. Confirm-pad: PROPOSAL → on-brand refresh-creative (copy + beeld via bestaande pipelines/brandstyle) als deliverable in Branddock; credits geboekt op confirm.
5. Lege-staat: geen gekoppeld account → uitleg + koppel-CTA, geen inbox-ruis.

## Out-of-Scope (expliciet NIET, ook al verleidelijk)
1. Push van de refresh-creative naar Meta (zelfs PAUSED) — v1 eindigt bij het artefact; plaatsen doet de mens.
2. Budget- of bid-voorstellen, in welke vorm dan ook.
3. Autonoom of voorgesteld pauzeren/activeren van ads.
4. Google Ads / PMax en LinkedIn — Meta-only v1, ondanks dat PMax-frustratie in het marktonderzoek zit.
5. Performance-dashboard, grafieken, trend-UI — signalen zijn agent-artefacten, geen nieuw scherm.
6. Brand-fidelity ↔ performance-correlatie (de Fase C-droom uit de spec) — eigen initiatief, later.
7. A/B-test-orkestratie of multi-variant refresh-batches.
8. Conversie-attributie, ROAS-analyse, funnel-advies.
9. Audience-/targeting-voorstellen.
10. Real-time webhooks — dagelijkse poll is de v1-waarheid.

> Out-of-Scope (10) > In-Scope (5) — bewust.

# AANNAMES

Aannames die WAAR moeten zijn voor deze feature te slagen:

- **A1 — MKB-users koppelen hun ad-account aan Branddock** — bewijs: geen. Vermoedelijk 0 gekoppelde accounts vandaag; de hele feature gate't hierop. — onbewezen? **JA — blokkerende validatie.**
- **A2 — De drie signalen zijn berekenbaar én zinvol op Advantage+-campagnes** — bewijs: geen; Advantage+ beperkt asset-level rapportage, frequency/CTR op campagne-niveau kan te grof zijn. — onbewezen? **JA — valideerbaar met één handmatige insights-pull op een echt account, vóór enige bouw.**
- **A3 — Black-box-frustratie vertaalt zich naar behoefte aan creative-voorstellen** (en niet primair naar budget-inzicht of rapportage) — bewijs: tweedehands marktonderzoek. — onbewezen? **JA — 2-3 klantgesprekken.**
- **A4 — Meta app-review staat insights-read op de productie-app toe** — bewijs: scopes worden al gevraagd bij OAuth, maar live app-review-status is niet geverifieerd. — onbewezen? **JA — check, geen bouw.**
- **A5 — Een on-brand refresh-creative zonder push is nuttig genoeg** (de user plaatst hem daadwerkelijk handmatig) — bewijs: geen; frictie-risico dat voorstellen sterven tussen artefact en Meta Ads Manager. — onbewezen? JA — meet via de primaire metric + navraag.

> A1 en A2 zijn samen te valideren in dagen, zonder één regel productie-code. Doen vóór technical-planner.

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een gekoppeld Meta-account met ≥1 actieve campagne (ook niet via Branddock gepubliceerd), When de dagelijkse waakhond-run draait, Then verschijnt in de agents-inbox een REPORT met per campagne frequency, CTR-trend en creative-leeftijd — of expliciet "geen signalen".
- [ ] Given een creative die een fatigue-drempel overschrijdt, When de run afrondt, Then bevat de run een PROPOSAL (signaal + refresh-richting) en ontvangt de run-owner een notificatie via het bestaande kanaal.
- [ ] Given een PROPOSAL, When de user bevestigt, Then wordt via de bestaande pipelines een on-brand refresh-creative (copy + beeld, brandstyle-conform) als deliverable aangemaakt en worden credits uitsluitend op dit confirm-pad geboekt.
- [ ] Given een PROPOSAL, When de user niets doet of afwijst, Then vindt er aantoonbaar géén enkele write richting Meta plaats (verifieerbaar in logs/audit).
- [ ] Given een workspace zonder gekoppeld ad-account, When de user de waakhond opent, Then ziet hij uitleg + koppel-CTA en genereert de agent geen runs of notificaties.
- [ ] Given meerdere signalen in één week, When het weekplafond bereikt is, Then bundelt of onderdrukt de waakhond extra meldingen (geen inbox-spam).

# EERSTE TAAK (morgen startbaar)

**Validatie-sprint, geen bouw** (samen ~1 dag):
1. Tel `ConnectedAdAccount`-rijen op prod (Neon-query) — hoeveel accounts zijn er echt gekoppeld, in welke status?
2. Vraag Better Brands (en eventuele pilot-leads) of ze een Meta-account met actieve Advantage+-campagnes draaien en willen koppelen — plus de A3-vraag: "als iets je zou vertellen dat je ad moe is, wat zou je dan willen krijgen?"
3. Draai één handmatige insights-pull (Graph API Explorer, bestaand token) op een echt account met Advantage+-campagnes en documenteer welke van de drie signalen (frequency, CTR-trend, creative-leeftijd) daadwerkelijk uit de API te halen zijn en op welk niveau.
4. Commit het marktonderzoek-rapport naar `docs/reports/` (ontbreekt in repo).

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel

**A1: er is geen enkel bewijs dat ook maar één klant een ad-account koppelt.** De publish-pipeline heeft nog nooit een niet-PAUSED ad opgeleverd, de pilot is n=1, en de doelgroep (MKB met Advantage+) is een hypothese uit een marktrapport dat niet eens in de repo staat. Alles stroomafwaarts — signalen, voorstellen, refresh-creatives — is waardeloos als de koppel-stap niet gebeurt.

## Pleidooi tegen dit plan

Dit is een monitoring-feature voor een populatie die in het product nog niet bestaat. De refresh-creative kan vandaag al handmatig via Content Canvas zodra een gebruiker zélf ziet dat zijn ad moe is — het unieke deel is alleen de signalering, en juist dat deel hangt aan de meest onbewezen aanname (data-beschikbaarheid op Advantage+ én koppel-bereidheid). Bovendien concurreert elk uur hieraan met het launch-pad en met adoptie van de zes bestaande agents, waarvan de pilot-tractie zelf nog bewezen moet worden. Het risico is een prachtig gebouwde waakhond die blaft in een lege tuin.

## Wat zouden we leren door NIET te bouwen

Een concierge-experiment levert vrijwel dezelfde leerwinst voor ~1 dag werk: koppel (of exporteer) één echt account, analyseer twee weken lang handmatig/via los script op de drie signalen, en mail de voorstellen als mens. Als Better Brands zelfs handmatig aangeleverde "je ad is moe + hier is een on-brand alternatief"-voorstellen niet omzet in actie, redt automatisering het ook niet — en dan is dat voor een dagdeel werk geleerd in plaats van voor weken bouwwerk. Omgekeerd: converteert het concierge-voorstel wél, dan is de business-case ineens hard.

## Verdict van de planner

**needs-validation-first**

Reden: strategisch klopt het (past exact op de bewust vooruit-gebouwde measurement-foundation, alle agent-primitieven bestaan, marktonderzoek bevestigt de white space "creative-kant, niet bidding") en de propose-only-grens is scherp. Maar A1/A2 zijn blokkerend én goedkoop te valideren zonder code. Timing is bovendien expliciet tweede ring — dit doc is "plan-klaar", geen startschot. Pas na een geslaagde validatie-sprint (≥1 echt gekoppeld account + signalen aantoonbaar uit de API + één positief klantgesprek) door naar technical-planner.

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (niet 5)
- [x] Out-of-Scope-lijst langer dan In-Scope-lijst (10 vs 5)
- [x] MVP-acceptance-criteria concreet (Given/When/Then)
- [x] Eerste taak morgen startbaar (validatie-sprint, geen bouw)

# Volgende stap

Wacht op validatie van A1 (gekoppelde accounts + koppel-bereidheid pilot) en A2 (signalen uit Advantage+-API haalbaar) — daarna technical-planner. Timing blijft tweede ring: ná launch, gegate op Fase-1-agents-adoptie.
