---
id: seo-variant-b-differentiatie
title: Variant B van de SEO-pipeline is een bijna-duplicaat van variant A — kost een volledige generatie, levert 95% hetzelfde
fase: post-launch
priority: next
effort: 1-2 dagen (meten eerst, dan pas prompt of schrappen)
owner: unassigned
status: open
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

⚠️ **De maat heeft een gat**: het ijkpunt meet "ander onderwerp, zelfde merk". Er zit géén
ijkpunt in voor "zelfde onderwerp, andere invalshoek" — precies wat variant B hoort te zijn.
Twee eerlijk verschillende invalshoeken op hetzelfde onderwerp zullen bóven de 65% liggen;
hoeveel is onbekend. Lees 95% dus als richting (er valt weinig te kiezen), niet als
afgemeten tekort. Het vaststellen van dát ijkpunt hoort bij stap 1 hieronder.

**Het is waarschijnlijk niet de context.** De hypothese lag voor de hand dat variant B te
weinig te werken had: hij kreeg door een tail-slice-bug nul researchstappen mee (zie
[`seo-pipeline-speedup`](seo-pipeline-speedup.md), gerepareerd 18-08). Een A/B met de
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
2. **Vergelijk met de LP-kant**: de webpage-builder heeft ditzelfde probleem al aangeraakt
   (`scripts/smoke-tests/web-page-builder-phase64-variant-copy-diff.ts` en
   `-phase65-variant-angle-prompt.ts`). Als daar een werkende angle-forcing zit, is die
   waarschijnlijk overdraagbaar.
3. **Dan de keuze** (Erik): variant B echt onderscheidend maken, óf schrappen en de tijd/
   kosten teruggeven. Een derde optie is hem alleen genereren wanneer de gebruiker erom
   vraagt in plaats van standaard.

# Acceptatiecriteria

- [ ] Overlap-meting over ≥4 workspaces en ≥3 content-types, met het ijkpunt ernaast
- [ ] Vastgesteld of de LP-angle-aanpak overdraagbaar is naar de markdown-pipeline
- [ ] Expliciete keuze van Erik vastgelegd (onderscheidend maken / schrappen / on-demand)
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
