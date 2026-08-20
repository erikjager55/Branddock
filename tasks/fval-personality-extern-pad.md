---
id: fval-personality-extern-pad
title: score_against_brand draait pijler 1 half — personality staat hardgecodeerd op null
fase: post-launch
priority: next
effort: de codewijziging is 1 regel; het besluit en de hermeting zijn het werk
owner: unassigned
status: open
created: 2026-08-20
completed: -
related-adr: -
related-spec: -
worktree: -
---

# Probleem

`src/lib/brand-fidelity/external-content-runner.ts` (~regel 124) geeft
`personality: null` mee aan de composition-engine. Dat is het pad achter de
MCP-tool `score_against_brand` én de publieke API voor externe content.

Gevolg in `composition-engine.ts:453-464`:

```
hasStringSignal = styleResult.declaredSignalCount > 0   // altijd 0 op dit pad
hasSemanticSignal = voiceSimilarity !== null            // vereist een centroid
skipStyle = !hasStringSignal && !hasSemanticSignal
```

De string-match-helft van pijler 1 staat dus **altijd** uit op dit pad — voor élk
merk, niet alleen merken zonder centroid. Heeft een merk óók geen centroid, dan
valt pijler 1 helemaal weg en wordt de composite herwogen over judge + rules.

Dezelfde functie haalt de volledige `BrandVoiceguide` al op (`findUnique` zonder
`select`), inclusief `wordsWeUse`, `personalityTraits` en `voiceDescription` — precies
de drie velden die `BrandPersonalityInput` vraagt. Ze worden alleen niet doorgegeven.

**Waarom dit meer is dan een schoonheidsfoutje**: de tool-omschrijving belooft
*"dezelfde brand-fidelity-engine als de Branddock-UI: composietscore 0-100
(stijl/judge/regels)"*. Voor een merk zonder centroid levert hij stilzwijgend een
score over twee pijlers, zonder dat de aanroeper dat ziet.

Gemeten 2026-08-20 op de Branddock-workspace: `declaredSignalCount: 0` terwijl er
6 `wordsWeUse` en 5 `wordsWeAvoid` in de DB staan.

# Waarom dit een BESLUIT is en geen bugfix

Het doorgeven van `personality` **verschuift F-VAL-scores** voor alle content die via
MCP of de publieke API gescoord wordt. Dat raakt:

- gepubliceerde drempels en de `thresholdMet`-vlag die klanten zien;
- vergelijkingen met eerder gemeten scores (de pilotclaim is op het *interne* pad
  gemeten, dus die verandert niet — maar externe metingen wél);
- het `score_against_brand`-gedrag dat externe agents al gebruiken.

Het comment bij de regel motiveert alleen het weglaten van persona- en
strategie-samenvattingen ("external content has no campaign-context"). Dat argument
geldt niet voor voice-vocabulaire: dat is merk-niveau, niet campagne-niveau.

# Voorstel

1. Meet eerst: scoor N bestaande teksten met en zonder `personality` en leg de
   verschuiving vast. Zonder dat cijfer is dit niet te beslissen.
2. Besluit van Erik: doorgeven of bewust zo laten, met de reden erbij.
3. Bij doorgeven: bewaker die aantoont dat `declaredSignalCount > 0` is zodra de
   voiceguide vocabulaire heeft, plus een regel in de tool-omschrijving over wanneer
   pijler 1 wél/niet meetelt.

# Acceptatiecriteria

- [ ] Verschuiving gemeten over ≥10 teksten, vastgelegd met de spreiding
- [ ] Besluit van Erik vastgelegd (doorgeven / bewust laten)
- [ ] Bij doorgeven: bewaker + bijgewerkte tool-omschrijving
- [ ] `npx tsc --noEmit` 0 errors

# Out of scope

- De centroid-kant (writingSamples vullen per merk) — dat is losstaand en per merk
- Het interne generatiepad (`fidelity-runner.ts`); dat vult personality wél

# Notes

Gevonden bij het uitzoeken waarom de Branddock-workspace op 2 van de 3 pijlers
scoorde. De eerste verklaring die ik gaf ("de voiceguide is niet gepubliceerd") was
fout: `BrandVoiceguide.publishedAt` wordt nergens geschreven en F-VAL leest het niet.
