---
id: golden-set-gate-decouple
title: De golden-sets-nightly faalt structureel op main — flakey promptfoo-gate ontkoppelen of fixen
fase: launch
priority: next
effort: 0.5-1 dag
owner: claude-code
status: done
created: 2026-07-17
completed: 2026-08-16
related-adr: -
related-spec: -
worktree: branddock-golden-set-gate-decouple
---

# Probleem

De `Content Golden-Sets`-workflow (job `evaluate`) faalt op `main` **structureel**. Gemeten
2026-07-17 over de laatste 5 nightlies:

| Datum | Branch | |
|---|---|---|
| 17-07 | main (schedule) | **failure** |
| 16-07 | main | success |
| 15-07 | main | **failure** |
| 14-07 | main | **failure** |
| 13-07 | main | **failure** |

Falende stap is steeds `Enforce golden-set pass-rate threshold (70%)` — de
promptfoo-blogpost-set dobbert rond de drempel (gezien: **6/10 = 60%**). Het is een live
LLM-eval met llm-rubric-judges; per-case flake is inherent, en de gate zet daar één harde
drempel op.

**Dit is niet nieuw en niet opgelost**: `tasks/done/ci-golden-set-e2e-fixes.md` staat op
**done** terwijl de nightly gewoon doorfaalt. Die task heeft iets anders gefixt.

**Twee kosten, en de tweede is nieuw:**

1. **De nightly is betekenisloos geworden.** Een gate die 4 van de 5 nachten rood staat,
   wordt genegeerd. Als er ooit een échte prompt-regressie in zit, ziet niemand 'm — dat is
   letterlijk de gotcha van 2026-07-07 ("een gate die al lang rood staat...").
2. **Ik heb de ruis erger gemaakt (2026-07-17, #409).** Het LP-prompt-pad is aan het
   `paths`-filter toegevoegd + `scripts/eval/lp-variant-golden` draait nu als CI-stap. Dat
   was nodig: dat pad was sinds mei onbewaakt, terwijl de runner juist dáárvoor gebouwd was
   en nooit ingehaakt werd. Maar nu kleurt **élke LP-prompt-PR** rood door een gate die er
   niets mee te maken heeft. PR #173 is met precies die rode check gemerged (terecht —
   pre-existing, mijn eigen stap was groen — maar het traint mensen om `evaluate` te negeren).

# Bevindingen (2026-08-16)

## 1. Het voorgeschreven diagnose-pad was onuitvoerbaar

Dit task-file schrijft "download het artifact (`golden-set-results-<sha>`)" voor als eerste
stap. **Dat artefact heeft nooit bestaan** — nul artefacten op élke run, ook de verse.

De upload-stap meldde `success`. In de log stond alleen een warning:
`No files were found with the provided path: .promptfoo-results/`. Oorzaak: de map begint met
een punt, en `actions/upload-artifact` slaat hidden files standaard over. Vermoedelijk precies
waarom deze taak een maand stil lag: stap 1 was niet uit te voeren, en het falen was stil.

## 2. Het zijn geen flakes — steeds dezelfde cases

Log-analyse over vijf nachten (10 cases per run):

| Case | 08-08 | 10-08 | 13-08 | 15-08 ✅ | 16-08 |
|---|---|---|---|---|---|
| Napking — SEO-focus extreem | ✗ | ✗ | ✗ | ✗ | ✗ |
| NieuweBrand — lege knowledge context | ✗ | ✗ | ✗ | ✗ | — |
| Napking — adversarial vage brief | ✗ | ✗ | ✗ | — | ✗ |
| Better Brands — thought-leadership | ✗ | ✗ | ✗ | — | ✗ |
| LINFI — vakmanschap | ✗ | ✗ | — | — | ✗ |
| **totaal falend** | 5 | 5 | 4 | 2 | 4 |

Eén case faalt 5/5, drie falen 4/5; de geslaagde nacht haalde 8/10. Echt niveau ~50-60% tegen
een drempel van 70%. Frequentie ook bijgesteld: **6 failures op 14 nachten (43%)**, niet de
4-op-5 uit de meting van 17-07.

Dit task-file schreef zijn eigen antwoord al voor: *"Zijn het steeds dezelfde 3-4? Dan is het
geen flake maar een echte, stabiele bevinding — en dan is de drempel niet het probleem maar de
prompt."* Puur ontkoppelen zou dus een echt signaal wegmoffelen.

## 3. De drempel is op de rand gekalibreerd

`tasks/done/ci-golden-set-e2e-fixes.md` stelde de set bij tot lokaal 7/10 = **precies** de
drempel, met de notitie *"70% is de rand — nightly kan flappen"*. Een gate op de exacte
gemeten waarde is per constructie een muntworp. Die v2 is nooit gekomen; de taak ging op done.

# Wat er gebouwd is

**Twee jobs i.p.v. één** in `.github/workflows/golden-sets.yml`:

- **`deterministic`** — property-evals, plan-and-solve, tree-of-thoughts, position-swap,
  LP-variant-golden. Key-loos, snel, harde exit-codes. Blokkeert PR's.
- **`live-eval`** — promptfoo blog-post + 70%-gate + artefact. Draait op `schedule` en
  `workflow_dispatch`, **nooit** op een pull request. Faalt daar nog steeds hard.

Verder: artefact-map hernoemd naar `promptfoo-results/` (geen punt) mét
`include-hidden-files: true` én `if-no-files-found: error`, zodat een leeg artefact voortaan
hard faalt i.p.v. stil te slagen. De gate print nu de falende cases bij naam in de log, zodat
je niet meer van het artefact afhankelijk bent voor de eerste diagnose. `permissions`
teruggebracht naar `contents: read` (de PR-comment-stap is weg — die kon niet meer vuren).

**De drempel is niet verlaagd.** De stabiele faalgevallen zijn vastgelegd als
[`golden-set-blogpost-quality`](../golden-set-blogpost-quality.md).

# Acceptatiecriteria

- [x] Uitgezocht of de falende cases stabiel dezelfde zijn (artifact-analyse over ≥3 runs) —
      gedaan via log-analyse over 5 runs; het artefact bestond niet en is nu gerepareerd
- [x] Deterministische checks blokkeren PR's; de flakey live-eval doet dat niet
- [x] Een rode `evaluate` betekent voortaan iets — de nightly `live-eval` faalt alleen op de
      pass-rate, en de faalgevallen staan bij naam in de log
- [x] `tasks/done/ci-golden-set-e2e-fixes.md` aangevuld (stond op done terwijl dit doorliep)

# Smoke test plan

- YAML-validatie (`js-yaml`) ✅
- Branch-protection gecontroleerd vóór de splitsing: required check is **`check`**, niet
  `evaluate` — hernoemen/splitsen blokkeert dus geen PR's ✅
- Beide smokes die in `deterministic` blijven zijn key-loos geverifieerd (position-swap draait
  op `ANTHROPIC_API_KEY=mock`, lp-variant-golden is default deterministisch) ✅
- Echte bevestiging komt van de eerstvolgende nightly: `deterministic` groen, `live-eval` rood
  met benoemde cases + een artefact dat daadwerkelijk downloadt.

# Risico's

- **Verleiding om te versoepelen.** Als de 4 falende cases echte kwaliteitsproblemen zijn, is
  ontkoppelen het verkeerde antwoord. Eerst kijken, dan knippen. → Gedaan: gekeken, cases
  blijken stabiel, drempel ongemoeid gelaten en doorgezet naar een eigen taak.

# Out of scope

- De bredere observatie dat de promptfoo-sets **eigen inline prompts** hebben en de
  productiecode niet referencen — ze testen dus een handmatige benadering van de prompt en
  kunnen een productie-prompt-regressie per definitie niet vangen. `lp-variant-golden` is de
  enige die het échte pad test, en dekt alleen LP; de prompts in
  `src/lib/studio/prompt-templates/**` hebben geen golden-dekking op hun werkelijke prompt.
  Dat is een grotere vraag ("wat testen onze golden-sets eigenlijk?") en verdient een eigen
  beslissing. → Meegenomen als kernvraag in `golden-set-blogpost-quality`.
