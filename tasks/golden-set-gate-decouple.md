---
id: golden-set-gate-decouple
title: De golden-sets-nightly faalt structureel op main — flakey promptfoo-gate ontkoppelen of fixen
fase: launch
priority: next
effort: 0.5-1 dag
owner: claude-code
status: open
created: 2026-07-17
completed:
related-adr: -
related-spec: -
worktree: -
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

# Voorstel

Twee sporen, waarschijnlijk allebei nodig:

**A. Ontkoppelen.** De deterministische, key-loze checks (LP-variant-golden, property-evals,
plan-and-solve, tree-of-thoughts, position-swap) horen niet in dezelfde job als een flakey
live-LLM-eval. Splits: één harde, snelle, deterministische gate op PR's; de promptfoo-set als
aparte nightly-only job die rapporteert i.p.v. blokkeert.

**B. De gate zelf.** Vragen die eerst beantwoord moeten worden vóór iemand aan de drempel
draait:
- **Is 60-70% het echte niveau, of is de set kapot?** Download het artifact
  (`golden-set-results-<sha>`) van een paar runs en kijk *welke* cases falen. Zijn het
  steeds dezelfde 3-4? Dan is het geen flake maar een echte, stabiele bevinding — en dan is
  de drempel niet het probleem maar de prompt (of de rubric).
- Is de drempel van 70% ooit gekalibreerd, of gegokt?
- Judge-variantie: hoeveel spreidt dezelfde case over runs? (`position-swap-judge` bestaat al
  voor deze vraag.)

**Niet doen**: de drempel verlagen tot hij groen is. Dat is de lat verlagen tot je 'm niet
meer voelt.

# Acceptatiecriteria

- [ ] Uitgezocht of de falende cases stabiel dezelfde zijn (artifact-analyse over ≥3 runs)
- [ ] Deterministische checks blokkeren PR's; de flakey live-eval doet dat niet
- [ ] Een rode `evaluate` betekent voortaan iets — main is groen of we weten precies waarom niet
- [ ] `tasks/done/ci-golden-set-e2e-fixes.md` gecorrigeerd of aangevuld (staat op done terwijl dit doorloopt)

# Bestanden die ik aanraak

- `.github/workflows/golden-sets.yml`
- eventueel `tests/content-golden-sets/long-form/blog-post.yaml` (rubric/cases)

# Smoke test plan

Artifact-analyse eerst (`gh run download <id> -n golden-set-results-<sha>`), dán pas aan de
workflow zitten. Zonder te weten *wat* faalt is elke ingreep een gok.

# Risico's

- **Verleiding om te versoepelen.** Als de 4 falende cases echte kwaliteitsproblemen zijn, is
  ontkoppelen het verkeerde antwoord. Eerst kijken, dan knippen.

# Out of scope

- De bredere observatie dat de promptfoo-sets **eigen inline prompts** hebben en de
  productiecode niet referencen — ze testen dus een handmatige benadering van de prompt en
  kunnen een productie-prompt-regressie per definitie niet vangen. `lp-variant-golden` is de
  enige die het échte pad test, en dekt alleen LP; de prompts in
  `src/lib/studio/prompt-templates/**` hebben geen golden-dekking op hun werkelijke prompt.
  Dat is een grotere vraag ("wat testen onze golden-sets eigenlijk?") en verdient een eigen
  beslissing.
