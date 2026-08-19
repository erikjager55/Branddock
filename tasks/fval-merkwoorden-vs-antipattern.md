---
id: fval-merkwoorden-vs-antipattern
title: Vier van Linfi's tien voorkeurstermen zijn precies de woorden die de anti-AI-pijler bestraft
fase: post-launch
priority: next
effort: 1 dag meten + de productvraag; de fix hangt van het antwoord af
owner: unassigned
status: open
created: 2026-08-19
completed: -
related-adr: docs/adr/2026-05-05-fval-three-pillar.md
related-spec: -
worktree: -
---

# Probleem

`linkedin-post` stond als los eindje in `START_HERE.md` met een score van 69 en de
verklaring "Napkings styleguide staat op `published = false`". Die verklaring is op
2026-08-19 weerlegd. Bij het zoeken naar de echte oorzaak kwam iets structurelers boven:

**Het merk-DNA schrijft woorden voor die de anti-AI-detector als buzzwords markeert. De
generator volgt het merk, wordt daarvoor beloond door de ene pijler en bestraft door de
andere, en de gebruiker ziet alleen een lage totaalscore.**

# De meting

De lage `linkedin-post`-score is geen content-type-probleem maar één workspace:

| Workspace | published | n | composite | style | judge |
|---|---|---|---|---|---|
| **Linfi** | ✅ | 33 | **68,9** | 71,3 | **68,1** |
| Napking | ❌ | 20 | 77,6 | 69,3 | 80,6 |
| Better brands | ❌ | 16 | 78,3 | 66,1 | 82,4 |
| Zwarthout | ❌ | 2 | 92,5 | 100,0 | 84,5 |

⚠️ Hieruit volgt meteen dat de eerdere published/unpublished-vergelijking een
**confounder** had: de "published"-groep bij dit content-type bestáát uit Linfi.

De judge-pijler weegt 45%, dus die 68,1 verklaart het grootste deel. Uitgesplitst naar
sub-criterium (Linfi tegen alle andere workspaces, zelfde content-type):

| Sub-criterium | Linfi | Rest | Verschil |
|---|---|---|---|
| **`antiPattern`** | **4,82** | **9,11** | **−4,29** |
| `strategicAnchoring` | 7,97 | 8,66 | −0,69 |
| `audienceFit` | 7,82 | 8,42 | −0,60 |
| `coherence` | 7,67 | 8,24 | −0,57 |
| `concreteness` | 7,15 | 7,63 | −0,48 |
| `brandRecognition` | 8,09 | 8,08 | **+0,01** |

Eén criterium wijkt af; de rest ligt binnen 0,7. En `brandRecognition` is **gelijk** aan de
rest — de content is dus herkenbaar on-brand én wordt als AI herkend.

# De oorzaak

De judge-rationales bij de laagste scores wijzen consistent drie tells aan:
`nl_buzzword_adjectives`, `ai_overconviction`, `nl_filler_adjectives`, met verdict
`PURE_AI` (position 70-87/100). Genoemde woorden: *"hoogwaardig"*, *"stijlvol"*,
*"oogstrelend"*, *"optimaal ruimtegebruik"*.

Linfi's eigen `wordsWeUse` (voiceguide) en "Voorkeurstermen (top 10)" (styleguide):

> vakkundig, precisiewerk, perfectionisme, **hoogwaardig**, **stijlvol**, **optimaal**,
> naadloos, verzonken, handgemaakt, maatwerk, **oogstrelend**

**Vier van de tien voorkeurstermen zijn exact de woorden die de detector bestraft.** Dit is
geen contentprobleem en geen promptprobleem: twee pijlers van F-VAL geven tegengestelde
instructies over dezelfde woorden.

# De productvraag (voor Erik)

Wat wint er als het merk een woord voorschrijft dat generiek AI-taalgebruik is?

1. **Merk wint** — merkwoorden uit `wordsWeUse` uitsluiten van `nl_buzzword_adjectives`
   voor die workspace. Risico: een merk kan zijn eigen AI-detectie uitzetten door
   buzzwords op te nemen.
2. **Detector wint** — de score is eerlijk, en het signaal hoort terug naar het merk:
   "deze vier voorkeurstermen lezen als AI-taal, overweeg alternatieven". Risico: we
   vertellen een klant dat zijn merktaal fout is.
3. **Zichtbaar maken zonder te kiezen** — de botsing tonen in de F-VAL-uitleg
   ("−4,3 op antiPattern komt door je eigen voorkeurstermen") en de klant laten beslissen.
   Goedkoopst, en het verklaart een score die nu onverklaarbaar laag lijkt.

Optie 3 lijkt het verstandigst als eerste stap: hij verandert geen scores, maar maakt een
onzichtbare botsing zichtbaar. Dat is precies wat hier ontbrak — de score zei 69 en niemand
kon zien waarom.

# Wat dit NIET is

- Geen bewijs dat Linfi's content slecht is. `brandRecognition` 8,09 en `coherence` 7,67
  zijn normaal; het is één criterium.
- Geen gemeten effect op andere workspaces. Of Napking/Better brands dezelfde botsing
  hebben is **niet** onderzocht — hun voorkeurstermen zijn niet nagelopen.
- Geen productie-impact vandaag: Linfi heeft 2 deliverables op prod.

# Acceptatiecriteria

- [ ] Voorkeurstermen van alle workspaces getoetst tegen de `nl_buzzword_adjectives`-lijst
      — hoe breed is de botsing eigenlijk?
- [ ] Productbesluit van Erik uit de drie opties hierboven
- [ ] Bij optie 3: de F-VAL-uitleg noemt de botsing expliciet, met de betrokken woorden
- [ ] Bewijs uit een echte scoring-run, niet alleen uit de detector-lijst

# Notes

Gevonden 2026-08-19 bij het uitzoeken van het losse eindje "F-VAL onder de drempel bij
linkedin-post". De weerlegde Napking-verklaring staat in `START_HERE.md`.
