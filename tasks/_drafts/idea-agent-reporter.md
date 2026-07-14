---
id: agent-reporter
title: Remi — rapportage-agent (agency-first, wekelijks klant-klaar weekrapport)
status: pending-tech
created: 2026-07-14
verdict: ready-to-build
---

# Probleemstelling (1 zin)

Bureaus moeten wekelijks aan elke klant laten zien wat er rond het merk gebeurd en geleverd is, en stellen dat rapport nu handmatig samen uit versnipperde bronnen — waardoor het laat, inconsistent of helemaal niet komt.

# WHO — Doelgebruiker

**Rol**: account manager / eigenaar van een AGENCY-org (per klant één workspace) die periodiek aan de klant rapporteert. Secundair: marketing-lead in een DIRECT-org die intern aan management rapporteert — zelfde rapport, ander publiek; géén aparte MVP-scope.
**Schaal**: pilot n=1 agency (Better Brands, meerdere klant-workspaces op prod) + het AGENCY-tier (€299/4.000cr) dat bij launch een rechtvaardigende, terugkerende feature nodig heeft. **Eerlijk**: er is nog géén externe agency die hier expliciet om vroeg — het bewijs is marktonderzoek + eigen bureau-praktijk.
**Acuut segment**: agencies met retainer-klanten — het weekrapport is daar de retainer-rechtvaardiging; overslaan = churn-signaal richting de agency-klant.

## JTBD-narratief

> "Toen de wekelijkse klant-update weer moest (retainer-ritme), wilde de account manager in 15 minuten laten zien wat er geproduceerd is, hoe on-brand het was en wat er bij concurrenten speelde — maar moest daarvoor campagne-overzichten, deliverable-lijsten en losse observaties handmatig bij elkaar rapen, waardoor de update naar 'volgende week' schoof of een magere bullet-mail werd."

Dit is de eigen Better Brands-praktijk (Erik rapporteert zelf aan BB-klanten) — geen fictie, maar wel n=1 en de founder zelf. De pilot moet dit narratief bij ≥1 échte BB-klant toetsen.

## Evidence

- `docs/reports/agents-marktonderzoek-en-uitbreidingsadvies-2026-07-14.md` — **advies #1: rapportage-agent, agency-first; user heeft JA gezegd**. ⚠️ Evidence-gap: dit rapport is op het moment van deze discovery **niet op disk vindbaar** (ook niet in worktrees) — commit het, anders is het kernbewijs van deze feature niet citeerbaar. Kernclaim uit de briefing: rapportage = wekelijks ingebakken gebruik, direct factureerbaar.
- `roadmap.md` post-launch tabel — `weekly-report-email-via-resend` ("task-file volgt **na weekly-report generator**"): het latente weekrapport-idee bestond al vóór dit advies; Remi ís die generator. Dat roadmap-item wordt een Remi-follow-up.
- `docs/adr/2026-07-05-agents-architectuur.md` + memory `agents-initiative` — Fase 2 (AgentSchedule DAILY+ op prod, run-notificaties, per-agent memory) is **sinds 2026-07-14 live**; Fase 3 go/no-go is gated op pilot-adoptie van juist dit soort terugkerend gebruik.
- `docs/reports/agents-dogfood-2026-07-07.md` / `-2026-07-12.md` — Dana-achtige query-runs kosten ~$0,10/run; de kosten-guardrail voor een wekelijks rapport is dus realistisch.
- Eigen Branddock-gebruik: BB-pilot-workspaces bevatten productie-, F-VAL-, campagne- en concurrent-data — de grondstof voor het rapport bestaat en stroomt al.

# WHAT — Probleem (niet oplossing)

De data die een klant-update nodig heeft zit al in Branddock (deliverables, F-VAL-scores, campagne-status, concurrent-events), maar is alleen per module raadpleegbaar of via ad-hoc Dana-vragen. Niemand zet dat wekelijks om in één samenhangend, klant-leesbaar verhaal; de gebruiker doet dat handwerk buiten Branddock (of niet), en het platform verliest daarmee zijn meest kansrijke wekelijkse gebruiksmoment — precies het ritme dat retention bij launch moet dragen.

# WHY-NOW

Triggers (alle drie dit kwartaal, niet over 6 maanden):
- **Scheduling-infra is er sinds vandaag** (agents-scheduling live op prod 2026-07-14, golden e2e op de BB-workspace geslaagd). Alle 6 huidige agents zijn ad-hoc persona's; er is nog géén agent waarvoor een schedule het natuurlijke gebruik is. Zonder zo'n agent blijft Fase 2 infra zonder bewoner — en de Fase-3 go/no-go is gated op pilot-adoptie.
- **Launch + AGENCY-tier**: het €299-tier bestaat in pricing maar heeft nog geen agency-specifieke waarde-driver. Rapportage is per marktbewijs de ingebakken wekelijkse habit die trial→paid draagt. MVP moet daarom in de launch mee (user-directive).
- **BB-pilot loopt nú**: de enige plek waar we ingebakken wekelijks gebruik kunnen bewijzen is de lopende pilot — uitstel = geen pilot-data vóór de Fase-3-beslissing.

# SUCCESS METRICS

**Primaire metric** (één): in een 4-weekse pilot op ≥2 workspaces (BB + minimaal één BB-klant-workspace) wordt **≥75% van de wekelijks gescheduelde Remi-rapporten geaccepteerd** (inbox-accept, meetbaar via AgentArtifact-status) — accepteren = "goed genoeg om als basis voor de echte klant-update te gebruiken".

Niet gekozen als primaire metric (bewust, één metric-regel): "doorgestuurd naar echte klant" (self-report, niet in-product meetbaar) en "tijdwinst per rapport" (niet instrumenteerbaar). Beide wél kwalitatief uitvragen in de pilot-feedbackloop.

**Counter-metric** (mag NIET kapotgaan): gemiddelde kosten per Remi-run ≤ $0,15 (AgentRun-cost, dogfood-baseline ~$0,10) — de Deloitte-faalmodus (kosten-onvoorspelbaarheid bij scheduled runs) is de bekende doodsoorzaak van scheduled agents. Zachte waakhond daarnaast: het aantal genegeerde inbox-items mag niet structureel groeien (rapport-spam = adoptie-dood).

# CONSTRAINTS

## Hard
- Tijd: MVP moet in de launch mee — weken, geen maanden. Remi is agent #7 op bestaande rails (registry + query-tools + scheduling + inbox + notificaties bestaan allemaal); alles wat níet op die rails past valt buiten MVP.
- Tech: ADR 2026-07-05 D1-D7 staan — één motor (`runAgentLoop`), code-registry, propose-only, curated read-only tools (géén vrije SQL, ADR D4). Prod-schedule-floor is DAILY+; WEEKLY bestaat al in de cadence-algebra.
- Data: **alleen data die al stroomt.** Kritieke vondst: `AdMetricSnapshot` bestaat in het schema maar wordt nergens in `src/` beschreven — de 5-min-cron (`sync-ad-campaigns`) synct alleen campagne-*status*, geen performance-cijfers. Een ads-performance-blok vereist een nieuwe metrics-sync = eigen feature, niet Remi's MVP.
- Legal/privacy: rapport blijft workspace-scoped (bestaande fencing); Remi verstuurt zelf niets naar externe klant-adressen (propose-only blijft).

## Soft
- Credits: per ADR 2026-07-07 is metering output-only; analyse-runs (Dana) boeken nu niets. Voorstel: Remi-rapporten 0-credit behandelen zoals Dana-analyses (~$0,10/wk/workspace platform-kosten — verwaarloosbaar, en "inzicht is gratis" versterkt de anti-Jasper-positionering). **Open pricing-beslispunt voor user/technical-planner**, geen blocker.
- Dana-tool-hergebruik: registratie zit nu op namespace `agent:data-analyst`; delen met `agent:reporter` is een implementatie-detail voor de technical planner.

## Must NOT do
- Geen vrije SQL of dynamische query-builders (ADR D4).
- Geen autonome verzending naar klanten (no-autonomy-regel blijft tot Fase 3).
- Geen nieuwe data-pipelines bouwen "omdat het rapport dan completer is" — dat is de scope-val van deze feature.
- Geen tweede rapport-motor naast `runAgentLoop`.

# SCOPE

## In-Scope (MVP)
- **Remi als 7e registry-agent** (persona, eigen system-prompt) op (deels) Dana's bestaande query-tools; gedragscontract à la Dana: elk cijfer uit een tool-result, "geen data" expliciet benoemen, nooit verzinnen. Verschil met Dana zit in de job: vast klant-leesbaar narratief i.p.v. analist-antwoord.
- **Vast 4-blokken-rapportskelet** (niet configureerbaar): ① geproduceerd deze periode (deliverables/content), ② merk-fidelity-trend (F-VAL), ③ campagne-status & hoogtepunten, ④ concurrent-signalen + "aanbevolen focus volgende week". Eventueel lichte tool-uitbreiding voor periode-vergelijking (deze week vs vorige) — technical planner beslist of de bestaande 7 tools volstaan.
- **Wekelijkse schedule als default-gebruik** via bestaand `AgentSchedule` + bestaande run-notificatie; daarnaast on-demand via een use-case-knop ("Weekrapport nu") in de bestaande catalogus.
- **Output = één REPORT-artefact** in de bestaande inbox; accept → Knowledge Library (bestaand gedrag); als markdown kopieerbaar — dat is de "verzendmethode" van de MVP.

## Out-of-Scope (expliciet NIET, ook al verleidelijk)
- **White-label/branding van het rapport** (agency-logo, klant-huisstijl) — pas na bewezen acceptatie-ritme.
- **PDF-export** — markdown-copy volstaat om de hypothese te toetsen.
- **Klant-portal / share-links** voor externe lezers — hele auth-surface, raakt `mcp-integration-layer`-territorium.
- **E-mail-render van het rapport** (naar klant óf naar de user zelf) — het bestaande roadmap-item `weekly-report-email-via-resend` wordt de natuurlijke follow-up, niet de MVP.
- **Ads-performance-blok** — `AdMetricSnapshot` wordt niet gevuld; een Meta-metrics-sync is een eigen feature met eigen discovery.
- **Org-breed multi-client roll-up** voor de agency-eigenaar ("alle klanten in één overzicht") — doorbreekt workspace-scoping; aparte feature.
- **Configureerbare rapport-templates / report-builder** — curated skelet of niets (zelfde discipline als de agent-registry).
- **Nieuwe externe databronnen** (GA4, social-analytics, PR/sentiment) — zelfde scope-val als ads.
- **Slack/Teams-integratie**.
- **Per-sectie-regenereren-UI** — bij een tegenvallend blok draait de user de hele run opnieuw.

> Out-of-Scope (10) > In-Scope (4) — bewust.

# AANNAMES

Aannames die WAAR moeten zijn voor deze feature te slagen:

- **A1 — Agencies maken wekelijks klant-updates en dat kost nu merkbaar tijd/discipline** — bewijs: marktonderzoek-advies #1 (⚠️ rapport niet op disk) + eigen BB-praktijk — **extern onbewezen** (0 externe agencies bevraagd). Validatie: pilot-week-1-gesprek met ≥1 BB-klant + de eerstvolgende agency-lead.
- **A2 — Een rapport zónder performance-cijfers (geen ads/traffic/leads) is klant-waardig** — bewijs: géén. Dit is de zwakste aanname: Branddock heeft *output*-data (productie, brand-health, concurrenten), klanten vragen vaak naar *outcomes*. Frame-mitigatie: MVP positioneren als "brand-operations weekly" (wat is er gebouwd, hoe on-brand, wat doet de markt), niet als performance-rapport. Validatie: eerste taak hieronder — vóór de bouw.
- **A3 — Wekelijkse schedule + inbox-notificatie is genoeg trigger voor ingebakken gebruik** — bewijs: infra live en getest (golden e2e), maar adoptie n=0; als het rapport alleen in de inbox verstoft is een e-mail-render nodig (bewust follow-up).
- **A4 — Een 7e persona naast Dana verwart gebruikers niet** — bewijs: geen; de ADR-A6-zorg (twee AI-ingangen) wordt hiermee groter. Mitigatie: catalogus-copy scherp ("Dana beantwoordt vragen, Remi schrijft je weekrapport"); pilot-observatie.
- **A5 — Kosten blijven ~$0,10-0,15/run** — bewijs: dogfood-data (query-tools zijn goedkoop; grootste kost = merkcontext-input en die is niet gemeterd) — grotendeels bewezen.

> A2 is onbewezen én dodelijk als hij faalt — daarom is de eerste taak een validatie-taak, geen code-taak.

# ACCEPTATIECRITERIA (MVP)

- [ ] Given een workspace met deliverables/F-VAL-scores/campagne-activiteit in de afgelopen 7 dagen, When de wekelijkse Remi-schedule afgaat, Then staat er een COMPLETED run in de inbox met precies één REPORT-artefact dat de 4 vaste blokken bevat, geschreven in de content-taal van de workspace, waarin elk cijfer herleidbaar is naar een tool-result uit die run.
- [ ] Given een workspace zonder activiteit in de periode, When Remi draait, Then benoemt het rapport per blok expliciet dat er geen data is — zonder verzonnen of voorbeeld-cijfers.
- [ ] Given een COMPLETED Remi-run, When de user het REPORT accepteert, Then materialiseert het naar de Knowledge Library (bestaand accept-gedrag) en is de volledige rapport-markdown te kopiëren.
- [ ] Given een falende Remi-run uit een schedule, When de laatste attempt faalt, Then ontvangt de schedule-eigenaar de bestaande fout-notificatie met deep-link naar de run.
- [ ] Given de Remi-catalogus-pagina, When de user de use-case-knop "Weekrapport nu" gebruikt, Then draait dezelfde rapport-run on-demand.
- [ ] Given 5 opeenvolgende test-runs op de BB-workspace, Then is de gemiddelde run-kost ≤ $0,15 (AgentRun-cost).

# EERSTE TAAK (morgen startbaar)

**Golden-report-validatie (1 dag, géén productie-code):** roep Dana's bestaande query-tools handmatig aan op de BB-prod-workspace over de afgelopen 7 dagen, schrijf daarmee het beoogde Remi-rapport (4 blokken) met de hand, en gebruik dat als de eerstvolgende échte BB-klant-update. Leg vast: (a) accepteerde de klant het frame zonder performance-cijfers (A2), (b) welke van de 4 blokken droeg niets bij, (c) welke tool-gaten bleken (periode-vergelijking?). Dit golden report wordt tegelijk de kwaliteitsreferentie voor de system-prompt.

---

# Red Team Review

> Onafhankelijke kritiek. Stel: een ervaren PM zou dit plan zien — wat zou ze zeggen?

## Zwakste schakel

**A2: het rapport rapporteert activiteit, geen resultaat.** Zonder ads/traffic/lead-cijfers (en die stromen aantoonbaar niet — `AdMetricSnapshot` is schema-only) is Remi's weekrapport in het slechtste geval een intern productielogboek in klant-verpakking. Als de BB-klant bij de golden-report-test vraagt "leuk, maar wat leverde het op?", dan is niet Remi maar een metrics-sync de echte feature — en is dit plan in zijn huidige vorm dood.

## Pleidooi tegen dit plan

Er heeft nog geen enkele externe klant om deze feature gevraagd; het bewijs is een marktrapport (dat op dit moment niet eens op disk staat) plus de eigen praktijk van de founder — de klassieke echo-chamber-setup. De launch heeft al een lopende launch-blocker (`pricing-credits-billing` user-config) en een pilot die aandacht vraagt; een 7e agent erin persen "omdat de scheduling-infra nu toch live is" is infra-gedreven productdenken, niet probleem-gedreven. En het persona-argument snijdt beide kanten op: Dana kan vandaag al elk van de 4 blokken beantwoorden — een use-case-knop "maak mijn weekrapport" op Dana plus een WEEKLY-schedule was mogelijk 80% van de waarde voor 20% van het werk geweest.

## Wat zouden we leren door NIET te bouwen

De eerste taak (golden report, handwerk) levert 90% van de leerwaarde voor 0% van de bouwkosten: of het frame zonder performance-cijfers klant-waardig is, welke blokken dragen, en of het wekelijkse ritme houdbaar is. Twee tot drie weken handmatige weekrapporten bij BB-klanten zouden bovendien A1 én A3 valideren vóór er een regel registry-code staat. De tegenprijs van uitstel: Remi mist de launch, het AGENCY-tier launcht zonder agency-driver, en Fase 2 blijft zonder bewoner tot ná de Fase-3-beslissing.

## Verdict van de planner

**ready-to-build** — conditioneel, met twee harde randvoorwaarden:

1. **De eerste taak (golden-report-validatie) gaat vóór de registry-code.** Wijst de BB-klant het frame zonder performance-cijfers af → stop, terug naar discovery; de echte feature is dan waarschijnlijk een ads-metrics-sync.
2. **De scope-vals blijven dicht**: geen nieuwe data-pipelines, geen export-formaten, geen portal — de 10 out-of-scope-items zijn net zo bindend als de 4 in-scope-items.

Reden: het user-besluit staat (advies #1, JA), de bouw is klein (agent #7 op volledig bestaande rails: registry, query-tools, scheduling, inbox, notificaties), de kosten-guardrail is dogfood-onderbouwd, en de enige dodelijke aanname (A2) is in één dag en voor nul bouwkosten te toetsen als eerste taak bínnen de build. Los daarvan: commit het marktonderzoek-rapport — het kernbewijs van deze feature hoort in de repo.

# 5-Punts Stop-Conditie (afgevinkt door feature-planner)

- [x] Probleem in 1 zin formuleerbaar
- [x] Eén primaire success-metric (accept-rate ≥75% over 4 pilot-weken; niet 5)
- [x] Out-of-Scope-lijst (10) langer dan In-Scope-lijst (4)
- [x] MVP-acceptance-criteria concreet (Given/When/Then, 6 stuks)
- [x] Eerste taak morgen startbaar (golden-report-validatie op BB-prod-data, 1 dag, geen code)

# Volgende stap

Klaar voor technical-planner — met twee expliciete beslispunten voor die sessie: (1) tool-hergebruik Dana↔Remi (namespace-delen vs her-registreren + evt. periode-vergelijkings-parameter), (2) credits: Remi-rapport 0-credit zoals Dana-analyses (voorstel) of gemeterde output — user-call.
