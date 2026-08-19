---
id: seo-variant-b-differentiatie
title: Variant B van de SEO-pipeline is een bijna-duplicaat van variant A — kost een volledige generatie, levert 95% hetzelfde
fase: post-launch
priority: later
effort: 1-2 dagen (meten eerst, dan pas prompt of schrappen)
owner: unassigned
status: blocked
created: 2026-08-18
completed:
related-adr: -
related-spec: -
worktree: branddock-seo-variant-b  # geclaimd door sessie 41832dfd, 2026-08-18
---

# Probleem

De SEO-pipeline levert twee varianten. Variant B hoort volgens zijn eigen systemprompt een
**"DIFFERENT creative angle"** te hebben — ander openingshaakje, andere volgorde van
voordelen, andere CTA-framing, ander emotioneel register. Gemeten is hij dat niet.

Woord-overlap (woorden ≥4 tekens, aandeel van B dat ook in A voorkomt), geijkt op het
`AICallSnapshot`-archief van echte runs:

| Vergelijking | overlap |
|---|---:|
| Twee artikelen van verschillende merken | 18,8% (n=320) |
| Twee **verschillende** artikelen (ander onderwerp), zelfde merk | 65,0% (n=145) |
| **Variant B vs variant A** | **90,5-98,3%** (n=16 armen) |

Het ijkpunt is wat dit betekenisvol maakt: twee artikelen over totaal verschillende
onderwerpen voor hetzelfde merk delen al 65% van hun vocabulaire. Dat variant B op 90,5-98,3% zit,
plaatst hem dichter bij "hetzelfde artikel, licht geparafraseerd" dan bij een alternatief
waar een gebruiker echt tussen kiest.

~~⚠️ **De maat heeft een gat**~~ — **gedicht 2026-08-18**, en de verwachting klopte niet.

Het ontbrekende ijkpunt hoefde niet gegenereerd te worden: de **landingspagina-keten produceert
al** varianten met een expliciet benoemde creative angle ("Tijd & Gemak" tegenover "Fouten &
Groei"). Twee varianten van dezelfde deliverable zijn per constructie hetzelfde onderwerp,
hetzelfde merk, en twee bewust verschillende invalshoeken. Gemeten over 35 paren met dezelfde
`overlapRatio` als de andere twee armen:

| Vergelijking | overlap |
|---|---:|
| Twee artikelen van verschillende merken | 18,8% (n=320) |
| Twee **verschillende** artikelen (ander onderwerp), zelfde merk | 65,0% (n=145) |
| **Zelfde onderwerp, bewust ANDERE invalshoek** (LP-varianten) | **65,5% (n=35)** |
| **Variant B vs variant A** | **90,5-98,3%** (n=16 armen) |

Dit task-file voorspelde dat twee eerlijke invalshoeken *"bóven de 65% zullen liggen"*. Dat is
niet zo: ze landen op **65,5%**, praktisch gelijk aan twee artikelen over totaal verschillende
onderwerpen. Een keten die een benoemde invalshoek meegeeft produceert dus varianten die
lexicaal net zo ver uit elkaar liggen als twee losse artikelen.

"95% is te hoog" is daarmee **geen indruk meer maar een bevinding**: het gat is ~30 punten.

⚠️ Wel een proxy over twee media heen — gestructureerde LP-content plat geslagen tegenover
markdown-proza. Het beantwoordt *"hoeveel scheelt een benoemde invalshoek"*, niet *"welk
percentage is goed voor markdown"*. Draai `npm run fidelity:variant-b -- calibrate` om het te
herhalen.

**Het is waarschijnlijk niet de context.** De hypothese lag voor de hand dat variant B te
weinig te werken had: hij kreeg door een tail-slice-bug nul researchstappen mee (zie
[`seo-pipeline-speedup`](done/seo-pipeline-speedup.md), gerepareerd 18-08). Een A/B met de
volledige research erbij liet de overlap niet zakken. De oorzaak ligt dus vermoedelijk in
het promptontwerp, of in het feit dat variant B `originalContent` als vertrekpunt krijgt en
daardoor herschrijft in plaats van herdenkt.

⚠️ Let op de bewijskracht: variant B ligt in **beide** armen rond de 95%, en dát is de
waarneming die staat. De vóór/ná-vergelijking zelf is zwakker dan hij oogt — zie de
A/B-sectie in `seo-pipeline-speedup.md` voor wat er wel en niet uit die paring volgt.

**Wat het kost**: een volledige generatie op het snelle model (11.484-19.054 tekens output,
gemeten over de 16 armen van de A/B) per pipeline-run, plus bij het `seo-geo`-profiel een
tweede GEO-polish-call over variant B.

# Voorstel

Eerst meten, dan pas bouwen — de vraag is een productvraag, geen promptvraag.

1. **Ijk de maat af op de juiste vraag**: naast de bestaande ijkpunten een derde nodig —
   twee menselijk-verschillende invalshoeken op hetzelfde onderwerp. Zonder dat getal is
   "95% is te hoog" een indruk, geen bevinding. Draai daarnaast `calibrate` en de A/B over
   álle 4 workspaces (de round-robin-spreiding is 18-08 gerepareerd) en over meerdere
   content-types, niet alleen `landing-page`.
2. ~~**Vergelijk met de LP-kant**~~ — **gedaan 2026-08-18. Ja, overdraagbaar, en het verschil
   is klein en concreet.**

   De LP-keten geeft **één benoemde invalshoek mét aanpak** mee:
   `## Creative Angle: "Cijfers & verlies"` + `**Approach:** Open met % rejects en spoedkosten.`
   Eén instructie, geen keuze. Valt terug op een generieke as (`problem-led`/`benefit-led`)
   als er geen angle is.

   De SEO-prompt (`generateAlternativeVariant`) doet twee dingen anders:
   - **Hij geeft een menu in plaats van een opdracht.** *"Different hook/opening angle (e.g.,
     question vs. statistic vs. story vs. bold claim)"* — vijf categorieën waaruit het model
     zelf mag kiezen. De weg van de minste weerstand is dan dicht bij het origineel blijven.
   - **Hij ankert expliciet op variant A**: *"Rewrite the provided page content"*. Herschrijven,
     niet herdenken — precies de hypothese die dit task-file al noemde.

   Overdracht zou dus zijn: `generateCreativeAngles` (bestaat al, Gemini Flash) ook voor de
   markdown-pipeline draaien en één benoemde invalshoek in de systemprompt zetten, plus het
   anker op `originalContent` verzwakken. Dat is een **prompt-wijziging in één functie**, geen
   nieuwe machinerie.
3. **Dan de keuze** (Erik): variant B echt onderscheidend maken, óf schrappen en de tijd/
   kosten teruggeven. Een derde optie is hem alleen genereren wanneer de gebruiker erom
   vraagt in plaats van standaard.

# Acceptatiecriteria

- [ ] Overlap-meting over ≥4 workspaces en ≥3 content-types, met het ijkpunt ernaast
- [x] Vastgesteld of de LP-angle-aanpak overdraagbaar is naar de markdown-pipeline — ✅ ja, zie stap 2
- [~] Expliciete keuze van Erik vastgelegd — **19-08: GEPARKEERD, geen van de drie nu.**
      Niet "variant B is goedgekeurd" en niet "variant B gaat eruit": de vraag wordt op dit
      moment niet opgepakt. De meting eronder blijft geldig en maakt de keuze later goedkoop —
      het gat is ~30 punten, en variant B kost een volledige generatie per pipeline-run.
      Heropen dit wanneer die kosten gaan knellen of wanneer iemand de twee varianten naast
      elkaar legt en er niets te kiezen valt.
- [ ] Bij "onderscheidend maken": overlap aantoonbaar richting het 65%-ijkpunt, F-VAL niet lager
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors

# Bestanden die ik aanraak

- `src/lib/ai/seo-pipeline.ts` — `generateAlternativeVariant` (systemprompt + input)
- `scripts/fidelity/variant-b-research-ab.ts` — meetharnas uitbreiden

# Bestanden die ik NIET aanraak

- `src/lib/ai/seo-pipeline-utils.ts` — de contextselectie is af (18-08), niet heropenen
- `src/lib/landing-pages/**` — de LP-variantketen is een eigen keten; alleen lezen ter lering

# Smoke test plan

1. `npm run fidelity:variant-b -- calibrate` → ijkpunt.
2. `npm run fidelity:variant-b -- run 8` → overlap per case (betaalde AI-calls).
3. Verwacht ná een fix: overlap zakt richting het nog te bepalen ijkpunt uit stap 1, zónder
   dat de F-VAL-composite daalt.

# Risico's

- **Meer verschil kan minder kwaliteit betekenen.** Variant B mag afwijken in invalshoek,
  niet in SEO-elementen (keywords, koppenstructuur, meta, interne links, FAQ). Elke
  prompt-wijziging moet tegen F-VAL én tegen een SEO-elementcheck.
- **De overlap-maat is grof** (bag-of-words, geen positie of betekenis). Hij is bruikbaar
  mét het ijkpunt ernaast, maar niet als enige criterium — een menselijke lezing van twee
  varianten hoort erbij vóór er een besluit valt.

# Out of scope

- Prompt-caching en andere kostenoptimalisaties in `src/lib/ai/` — eigen task.
- De 8-staps-pipeline zelf; die is snelheids- en contextmatig afgesloten.
