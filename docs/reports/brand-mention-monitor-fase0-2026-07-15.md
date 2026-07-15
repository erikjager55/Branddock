# Brand-mention-monitor — Fase-0-validatie (2026-07-15)

> **Verdict: NO-GO** (Exa-only, doelsegment NL-MKB). Meetdata hieronder.
> Taak: [`tasks/brand-mention-monitor.md`](../../tasks/brand-mention-monitor.md) → status `blocked`.

## Opzet

Handmatige Exa-neural-search-pulls (scratchpad-script, geen repo-code) op 5 merken, venster
30 én 7 dagen, querystrategie **naam + branche-anker + eigen-domein-uitsluiting**
(`excludeDomains`). Per merk: aantal resultaten, hoeveel de merknaam daadwerkelijk noemen
(titel/snippet), ruis-ratio (= niet-noemend / totaal). Doel: de discovery-kernonzekerheid
toetsen — levert Exa genoeg relevante vermeldingen voor **NL-MKB-merken**?

## Meetresultaat

| Merk | Segment | Rel. vermeldingen / 30d | Ruis 30d | Rel. / 7d |
|---|---|---|---|---|
| **Better Brands** | pilot NL-MKB (generieke naam) | 1 | 90% | 0 |
| **Sterk Merk** | NL-MKB | 1 | 90% | 2¹ |
| **Branding a better world** | NL-MKB | 0 | 100% | 0 |
| Tony's Chocolonely | NL bekend merk (bovengrens) | 2 | 80% | 2 |
| Picnic | NL scale-up (€430M funding) | 6 | 40% | 8 |

¹ De 2 "vermeldingen" bij Sterk Merk zijn ándere bureaus die de generieke frase "sterk merk"
gebruiken (visibledreams.nl, boumandesign.nl) — géén echte merk-vermeldingen. Reële ruis dus
nog hoger; illustreert de naam-ambiguïteit uit de Red Team.

## Gate-toetsing (alle drie vereist voor GO)

1. **≥1 merk met ≥3 relevante vermeldingen/maand** — technisch JA, maar **alleen via Picnic**
   (een goed-gedekte scale-up, géén doelsegment). Onder de échte doelgroep (Better Brands +
   de twee MKB-merken) is het maximum **1/maand**. → Voor het doelsegment: **FAIL**.
2. **Ruis < 50%** — **1/5** merken haalt het (alleen Picnic, 40%). Alle drie NL-MKB-targets
   zitten op **90-100%**. → **FAIL**.
3. **Positief usersignaal** ("wil de pilot dit wekelijks?") — user-held; **moot** geworden nu
   (1) en (2) voor het doelsegment falen: een wekelijks rapport zou voor een MKB-merk
   structureel leeg of ruizig zijn ("de agent voelt dood", Red Team punt 1).

## Conclusie

**NO-GO voor de Exa-only-aanpak op het NL-MKB-segment.** De capability werkt pas vanaf
scale-up/bekend-merk-dekking (Picnic-tier) — niet de pilotgebruikers. Dit is precies de
uitkomst waarvoor de Fase-0-gate bestond; het voorkomt het bouwen van een agent die voor de
doelgroep leeg aanvoelt.

## Heroverweeg-condities (reopen)

- Een **bredere/andere bron** naast Exa (echte social/nieuws-index: Mention/Brand24-API,
  GDELT, of een news-API) die kleine NL-merken wél dekt.
- **Grotere merk-klanten** in de pilot (scale-up-tier) — dan is de capability wél waardevol.
- Exa's index groeit aantoonbaar in NL-MKB-dekking (herhaal deze meting).

Meetscript: `scratchpad/mention-fase0.mjs` (niet in de repo — scratchpad, per Fase-0-regel).
