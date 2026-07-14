# Remi — golden report (Fase-1-validatie, 2026-07-14)

> **Doel** (task `agent-reporter`, Fase 1): het beoogde weekrapport handmatig schrijven op
> échte BB-prod-data (Dana's query-tools, venster 7 dagen) als kwaliteitsreferentie voor de
> system-prompt, plus de drie fase-1-bevindingen. Dit rapport toont bewust ook het
> dunne-data-gedrag: eerlijk "geen data" in plaats van opgevulde cijfers.

---

## Better Brands — Weekrapport (prod-workspace, venster t/m 13 juli)

### 1. Geproduceerd deze periode

Deze week zijn **4 deliverables aangemaakt**; alle vier staan nog op "niet gestart" en er
is niets gepubliceerd. De pijplijn is gevuld maar nog niet in beweging — de eerstvolgende
stap is de vier nieuwe items door de canvas-generatie halen.

### 2. Merkfideliteit (F-VAL)

Er draaiden deze periode **geen content-reviews** op deze workspace, dus er is geen
F-VAL-score te rapporteren. Zodra de eerste content gegenereerd en gereviewd is, verschijnt
hier de weekscore met de trend ten opzichte van de week ervoor.

### 3. Campagnestatus & highlights

Er staan **5 actieve campagnes** (samen 4 deliverables). Kanttekening: vier daarvan zijn
experimenteer-campagnes ("test", "tst", "Generiek") uit de inrichtingsfase — alleen
**"SEO optimalisatie"** oogt als echte werkstroom. Aanbeveling: de testcampagnes archiveren
zodat dit overzicht de werkelijke werkvoorraad toont.

### 4. Marktsignalen & aanbevolen focus

Beide concurrenten (**Branding a better world**, **Sterk Merk**) zijn geanalyseerd maar er
zijn deze periode **geen nieuwe activiteiten gedetecteerd**; de monitoring heeft nog niet
gedraaid sinds de eerste analyse. Aanbevolen focus voor komende week: (1) de vier nieuwe
deliverables genereren en reviewen zodat blok 1 en 2 volgende week inhoud hebben,
(2) testcampagnes opruimen, (3) de concurrent-monitoring een eerste echte ronde laten draaien.

---

## Fase-1-bevindingen

**(a) Frame-acceptatie (aanname A2 — rapport zonder performance-cijfers):** ter beoordeling
aan de BB-stakeholder (Erik). Het frame is bewust "brand-operations weekly" (output +
brand-health + markt), géén performance-rapport; ads-/traffic-cijfers ontbreken per ontwerp
(de metrics-sync bestaat nog niet — zie `agent-ads-watchdog` Fase 0). Wordt het frame
afgewezen → per task-gate terug naar discovery.

**(b) Blok-waarde op de huidige prod-data:** blok 1 en 3 dragen direct (productie +
campagne-hygiëne-signaal); blok 2 en 4 zijn deze week leeg maar juist dáár bewijst het
eerlijke "geen data"-gedrag zijn waarde — het rapport maakt zichtbaar dát review en
monitoring nog niet lopen, wat zelf een actiepunt is. Geen blok geschrapt.

**(c) Tool-gaten:** de maand-granulariteit-gap is bevestigd (bestaande tools kunnen geen
"deze week vs vorige week") → de conditionele **`query_period_activity`-tool is gebouwd**
(venster N dagen vs voorgaand venster: created/published/reviews/avg-F-VAL; bewust géén
"completed in venster" — Deliverable heeft geen completion-timestamp, een updatedAt-proxy
zou stil valse cijfers geven). Dana profiteert automatisch mee.

**Kwaliteitsreferentie:** de eerste échte Remi-run op de lokale BB-workspace (rijke data)
volgde dit skelet exact — 8-vs-1-productievergelijking, F-VAL 72,9 vs 77,4 mét duiding,
campagne-highlights met leeftijd-signalering — voor $0,068 in 32s. Dat rapport is de lat
voor de system-prompt.
