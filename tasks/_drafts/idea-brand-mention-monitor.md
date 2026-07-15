# Idea: brand-mention-monitor — merkvermeldingen-waakhond op Exa

> Discovery-doc (2026-07-15, compact — geschreven bij het research-stack-plan).
> Verdict: **needs-validation-first** → gepromoot naar `tasks/brand-mention-monitor.md`
> mét Fase-0 als blocking gate (zelfde constructie als vera-triggers/ads-watchdog).

## Probleem / kans

Branddock bewaakt het merk náár buiten (F-VAL op eigen content) maar ziet niet wat er
óver het merk gebeurt: vermeldingen in nieuws, blogs, fora, AI-antwoorden. Voor MKB is
losse social-listening-tooling (Brand24, Mention: $79-199/mnd) een aparte aankoop.
Een lichte mentions-waakhond op de bestaande agents-infra + Exa zou een zichtbare,
schedulebare "10e agent" zijn die het merk-DNA-verhaal afmaakt: wij kennen je merk én
letten erop.

## Gebruiker & job

Pilot-agencies en merk-eigenaren: "vertel me wanneer mijn merk (of mijn klant-merk)
ergens opduikt, en of dat on-brand/positief is." Wekelijkse cadence volstaat (geen
realtime-social-listening-ambitie).

## Kleinste geloofwaardige v1

Persona-agent (patroon Iris/Ada) met één deterministische scan-tool:
Exa-search op merknaam(+domein-uitsluiting eigen site) over de laatste 7 dagen →
gefencede mentions-lijst → REPORT met per vermelding: bron, datum, context-snippet,
en een korte brand-fit-duiding door de agent (géén zware sentiment-pipeline).
0-credit (analyse). WEEKLY schedule als beoogd gebruik.

## Red Team (waarom dit kan mislukken)

1. **Exa is geen social-listening-index** — geen Twitter/X, beperkt fora, geen
   real-time. Voor een NL-MKB-merk kan een week-scan structureel leeg zijn →
   de agent voelt dood. *Dit is de kernonzekerheid → Fase 0.*
2. **Naam-ambiguïteit**: "Better Brands" is generiek Engels; ruis kan het rapport
   nutteloos maken. Query-strategie (naam + domein/branche-anker) moet in Fase 0
   op échte merken getest.
3. **Verwachtings-mismatch**: users kennen Brand24-achtige volledigheid; wij leveren
   "web-signalen via neural search". Framing moet eerlijk ("web mentions", niet
   "social listening").
4. Overlap met Marco's web-signals-tool (concurrenten) — zelfde motor, ander
   onderwerp; hergebruik de helper, geen duplicatie.

## Fase-0-validatie (blocking, ~½ dag, geen productie-code)

Handmatige Exa-pulls op 3-5 échte merknamen (BB + 2-4 bekende NL-MKB-merken uit de
pilot-omgeving) over 7/30 dagen: (a) ≥1 merk levert ≥3 relevante vermeldingen/maand,
(b) ruis-ratio < 50% met de naam+anker-querystrategie, (c) één positief usersignaal
("zou je dit wekelijks willen ontvangen?"). Alle drie nodig voor GO; anders task →
blocked met meetdata (en heroverweeg als Exa's index groeit of er een social-bron bijkomt).

## Out of scope v1

Realtime/webhooks, X/LinkedIn-API's, sentiment-scores als getal, reply/engagement-acties,
historische backfill, alerting buiten de bestaande run-notificaties, AI-antwoord-monitoring
("noemt ChatGPT ons merk?" — interessant maar eigen discovery).
