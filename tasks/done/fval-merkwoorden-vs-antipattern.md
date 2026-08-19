---
id: fval-merkwoorden-vs-antipattern
title: INGETROKKEN — de merkwoord/anti-AI-botsing was op 2026-06-10 al gerepareerd; ik vergeleek scores van vóór en ná die fix
fase: post-launch
priority: -
effort: 1 dag meten + de productvraag; de fix hangt van het antwoord af
owner: unassigned
status: done
created: 2026-08-19
completed: 2026-08-19
related-adr: docs/adr/2026-05-05-fval-three-pillar.md
related-spec: -
worktree: -
---

# ⛔ INGETROKKEN 2026-08-19, binnen een dag na aanmaak — het probleem is al opgelost

**Dit task-file beschreef verouderde data. Er is niets te bouwen; Eriks akkoord op optie 3
is hiermee vervallen.** De analyse hieronder blijft staan omdat de meetfout leerzamer is dan
de bevinding was.

## Wat er werkelijk aan de hand was

De botsing bestónd — en is **op 2026-06-10 gerepareerd**, drie maanden vóór ik hem
"ontdekte". `detectAiTells()` heeft een `brandVocabulary`-optie die merkwoorden uit de
tell-matches filtert, en `composition-engine.ts:410` voedt die met `wordsWeUse` +
`brandVocabularyDo`. De comment daarboven noemt letterlijk mijn twee grootste vindplaatsen:

> *"het detector-lexicon bevat letterlijk seed-woorden ('naadloos', 'op maat') waardoor de
> judge hetzelfde woord prees én bestrafte."*

Gemeten effect van die fix, over alle workspaces:

| | n | antiPattern |
|---|---|---|
| Scores vóór 2026-06-10 | 209 | **6,37** |
| Scores ná 2026-06-10 | 98 | **9,13** |

En op Linfi's eigen content nagemeten met de echte detector: mét allowlist gaat de score van
**40,3 → 15,4** per 1000 woorden (40 → 17 matches), en het verdict kantelt van `MIXED` naar
`HUMAN_BASELINE`.

## Waarom mijn analyse er toch uitzag als een bevinding

Mijn "Linfi tegen de rest"-vergelijking was in werkelijkheid **vóór-de-fix tegen ná-de-fix**:

| Workspace | n | periode | scores ná de fix | antiPattern |
|---|---|---|---|---|
| Linfi | 33 | alleen 2026-05-19 | **0** | 4,82 |
| Better brands | 16 | juli | 16 | 8,94 |
| Napking | 20 | mei–juni | 10 | 9,15 |
| Zwarthout | 2 | juli | 2 | 10,00 |

Linfi is de enige workspace waarvan **alle** linkedin-post-scores van vóór de fix zijn. Het
verschil van 4,3 punten is dus geen eigenschap van dat merk maar de leeftijd van zijn scores.
Er was geen workspace-effect en geen ontwerpspanning — er was een datum.

## Twee meetfouten, gestapeld

1. **Ik nam de judge-rationale als bron in plaats van de code.** Mijn eerste claim was "vier van
   de tien voorkeurstermen (`hoogwaardig`, `stijlvol`, `optimaal`, `oogstrelend`) staan
   letterlijk op de buzzword-lijst". Onjuist: géén van die vier staat in `TELL_DEFINITIONS`.
   De judge schreef *"nl_buzzword_adjectives (e.g., 'hoogwaardig', 'stijlvol')"* — dat "e.g."
   was het model dat de categorie illustreerde met eigen voorbeelden, niet een lijst van
   werkelijke matches. Tegen de echte detector gemeten waren het er drie, en andere:
   `vakkundig`, `naadloos`, `op maat`.
2. **Ik vergeleek scores zonder hun datum te bekijken.** Een rij in `ContentFidelityScore` is
   een momentopname van de code van dát moment. Twee workspaces vergelijken is dan alleen
   geldig als hun scores uit dezelfde periode komen.

## Wat hiervan overeind blijft

- De `brandVocabulary`-allowlist werkt aantoonbaar en wordt correct gevoed.
- ⚠️ **Wel echt**: Linfi's 33 scores zijn verouderd en kleuren elke ranglijst waarin ze
  meedoen. Wie F-VAL-cijfers per content-type of workspace rapporteert, filtert op
  `scoredAt >= '2026-06-10'` of hermeet. Dat is de enige actie die uit dit hele onderzoek
  volgt, en hij staat als los eindje in `START_HERE.md`.

---

# Oorspronkelijke analyse (bewaard — de meetfout is de les)

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
