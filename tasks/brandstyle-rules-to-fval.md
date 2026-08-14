---
id: brandstyle-rules-to-fval
title: StyleguideRule → F-VAL rules-pijler — doorvoer, modaliteit-scheiding en vulling
fase: post-launch
priority: now
effort: 4-6 dagen
owner: claude-code
status: in-progress
created: 2026-08-14
completed: -
related-adr: docs/adr/2026-08-14-styleguide-rules-in-fval.md
related-spec: docs/specs/brandstyle-designbibliotheek-verbeterplan.md (W2, §5.3)
worktree: branddock-brandstyle-rules-to-fval
---

# Probleem

De Stap-0-spike (`docs/specs/spike-stap0-brand-manifest-dts-ede.md` §4) mat het gat: conditie A
produceerde 4+ overtredingen van merkboek-regels (emoji, superlatieven, wij-vorm) en scoorde tóch
80+, omdat `score_against_brand` in élke run `rulesEvaluated: 0` rapporteerde. Merkregels staan
sinds W2 in `StyleguideRule`, maar F-VAL's rules-pijler leest uitsluitend `BrandRule` — er bestaat
geen enkel codepad tussen die twee modellen.

Verificatie op de lokale DB (2026-08-14) laat zien dat het gat breder is dan alleen de ontbrekende
doorvoer:

| Bevinding | Cijfer |
|---|---|
| `StyleguideRule`-records | 346 lokaal / 311 prod — 100% `DONT` + `ADVISORY`, `constraint` overal `null` |
| Secties waarin ze staan | uitsluitend `colors` / `logo` / `imagery` / `design-language` — allemaal visueel |
| Workspaces met ≥1 `BrandRule` | 6 van 18; DTS Ede heeft er 0 (lege voiceguide) |
| `BrandVoiceguide.vocabularyDont` → scoring | nooit gesynct — Barneveld 22, Zwarthout 10, Lookaal 10 termen bereiken F-VAL niet |

Een kale doorvoer levert daarom opnieuw nul op: er zijn geen tekst-checkbare regels om door te
voeren. Dat is de "dode feature verbergt zijn eigen gaten"-klasse uit `gotchas.md` (2026-07-22):
een pijp bouwen waarvan de eindtoestand onbereikbaar is, betekent dat de handhaving ongetest blijft.

# Voorstel

Drie fasen in één taak; A+B zijn los mergebaar vóór C.

- **Fase A — de pijp.** `StyleguideRule` wordt een derde violation-bron in `mergeRuleResults`, naast
  `evaluateBrandRules` en `evaluateHeuristics`. Een regel telt alleen mee als zijn `constraint` een
  *tekst*-constraint is; visuele constraints worden herkend, geteld en overgeslagen (die horen bij de
  renderer, analyzer-plan fase D). Nul is nooit stil: de compiler rapporteert `skippedVisual` en
  `skippedUnconstrained`.
- **Fase B — vulling uit bestaande data.** `vocabularyDont` alsnog naar `BrandRule` syncen; een
  deterministische afleiding die bestaande regeltitels van een constraint voorziet; de drie
  merkboek-regels uit de spike als herhaalbare fixture op DTS Ede.
- **Fase C — structurer.** Eén AI-pass die bestaande regelteksten *classificeert* naar een constraint
  (nooit auteurt), met dry-run-backfill over bestaande workspaces en een fail-softe haak in de
  analyse-keten.

Ontwerpbeslissingen D1-D5 staan in de ADR.

# Acceptatiecriteria

- [ ] Een `HARD_RULE` met `{ modality: 'text', check: 'no-emoji' }` op een testworkspace levert bij
      emoji-content aantoonbaar violations, `rulesEvaluated > 0`, `ruleScore < 100` én een lagere
      composietscore dan dezelfde tekst zonder emoji (de W2-acceptatie)
- [ ] Een visuele regel (`{ modality: 'visual', property: 'gradient', allowed: false }`) levert nul
      tekst-violations en verschijnt als `skippedVisual`
- [ ] Een regel zónder `constraint` levert nul violations en telt als `skippedUnconstrained`; bij
      ≥1 regel en 0 compileerbare tekstregels volgt één warn-log
- [ ] `BLOCKING` weegt zwaarder dan `ADVISORY` (gewicht 3 vs 1) en mapt naar finding-severity HIGH
- [ ] De `copy`-view van `getBrandLibrary` bevat geen visuele regels meer
- [ ] `vocabularyDont` van Gemeente Barneveld levert na sync ≥22 actieve `BrandRule`-records
- [ ] Een regel-mutatie via de CRUD-route is direct zichtbaar in de scoring (cache geïnvalideerd)
- [ ] `npm run eval:brand-manifest-golden` groen (12 bestaande + 2 nieuwe checks)
- [ ] `npx tsc --noEmit` 0 errors
- [ ] `npm run lint` 0 errors
- [ ] Smoke-test uitgevoerd (zie plan hieronder), inclusief de echte hergescoorde spike-run
- [ ] ADR + changelog-entry bijgewerkt

# Bestanden die ik aanraak

**Nieuw**

- `src/lib/brandstyle/rule-constraints.ts` — constraint-vocabulaire (Zod) + parser
- `src/lib/brandstyle/rule-structurer.ts` — AI-classificatie van bestaande regels (fase C)
- `src/lib/brand-fidelity/text-matchers.ts` — gedeelde matcher-primitieven (pure move)
- `src/lib/brand-fidelity/styleguide-rule-compiler.ts` — `evaluateStyleguideRules`
- `scripts/derive-rule-constraints.ts` — deterministische afleiding (dry-run default)
- `scripts/structure-styleguide-rules.ts` — AI-backfill (dry-run default)
- `scripts/seed-dts-manifest-rules.ts` — spike-regels als fixture op DTS Ede
- `scripts/smoke-tests/styleguide-rule-compiler.ts` — pure smoke
- `scripts/smoke-tests/styleguide-rules-fval.ts` — DB-smoke end-to-end
- `docs/adr/2026-08-14-styleguide-rules-in-fval.md`

**Gewijzigd**

- `src/lib/brand-fidelity/composition-engine.ts` — derde bron in `mergeRuleResults`
- `src/lib/brand-fidelity/rule-compiler.ts` — importeert de verhuisde matchers
- `src/lib/brand-fidelity/violation-to-finding.ts` — `styleguide:`-tak in `inferCategory`
- `src/lib/brand-fidelity/brand-rule-sync.ts` — `vocabularyDont`-stream + cache-clear
- `src/lib/brandstyle/manifest-builder.ts` — `modality` op `ManifestRule` + savedForAi-gate-fix
- `src/lib/brand-library/views.ts` — visuele regels uit de copy/audio-view
- `src/app/api/brandstyle/rules/route.ts` + `[ruleId]/route.ts` — constraint-validatie + cache-clear
- `src/app/api/brandvoiceguide/route.ts` — sync-haak dekt ook `vocabularyDont`
- `src/app/api/brandstyle/finalize/route.ts` — structurer-haak (fail-soft)
- `scripts/eval/brand-manifest-golden/run.ts` — 2 checks erbij
- `package.json` — npm-scripts voor de nieuwe smokes/scripts
- `docs/changelog.md`

# Bestanden die ik NIET aanraak

- `prisma/schema.prisma` — geen schema-wijziging nodig; `constraint` is al `Json?`
- `src/lib/landing-pages/render-constraints.ts` + de Puck-renderers — visuele handhaving is
  analyzer-plan fase D, een eigen spoor
- `src/lib/brand-fidelity/judge*.ts` — de judge-lane (harde regels als checklist in de
  judge-prompt) is bewust een aparte taak
- `src/app/api/brand-rules/preview/route.ts` — derde kopie van de matcher-logica; eigen opruimtaak
- `src/lib/brandstyle/analysis-prompts.ts` — zie ADR D5: structurer-pass i.p.v. 6 gewijzigde
  JSON-outputcontracten

# Smoke test plan

1. **Puur, geen DB** — `npm run smoke:styleguide-rules`
   constraint-parsing (geldig / ongeldig / legacy `{property}` zonder modality), tekst-vs-visueel,
   elk van de checks tegen een voorbeeldtekst, severity-mapping, `ruleId`-vorm, lege-input-guard.
2. **Met DB** — `npm run smoke:styleguide-rules-fval`
   maakt op een scratch-styleguide 4 regels aan (no-emoji BLOCKING, forbidden-words superlatieven,
   forbidden-pattern wij-vorm, gradient VISUAL), scoort de A2-output uit spike §4 via
   `runFidelityForExternalContent`, asserteert violations / `rulesEvaluated` / skipped-tellingen +
   composiet-delta, en ruimt daarna op.
3. **Regressie** — `npm run smoke:violation-dedup` · `npm run smoke:geo-fidelity` ·
   `npm run eval:brand-manifest-golden` · `npm run eval:brandstyle-golden`.
4. **Echte run (het bewijs dat telt)** — DTS Ede lokaal: `seed-dts-manifest-rules.ts --apply`, dan de
   vijf spike-opdrachten hergescoord. Verwacht: conditie A zakt aantoonbaar, conditie B niet.

# Risico's

- **False positives door AI-afgeleide constraints** → dry-run default + diff-rapport vóór `--apply`;
  de AI zet nooit severity (alles blijft ADVISORY = gewicht 1); `derivedBy` in de constraint-JSON
  zodat een foute batch gericht terug te draaien is.
- **Dubbele findings** wanneer een heuristic-pack en een styleguide-regel dezelfde term vangen →
  bestaande `dedupeViolations` dekt dit op `position:snippet`; expliciet geasserteerd in smoke 2.
- **Scores verschuiven voor bestaande workspaces** zodra regels gaan bijten — gewenst, maar het maakt
  pre/post-vergelijking van pilotcijfers appels/peren. Vastleggen in de changelog-entry, net als bij
  de mapper-extend van #248.
- **Regex-injectie via `forbidden-pattern`** → compileren in try/catch met warn (bestaand patroon in
  `compileRule`), plus lengte-cap en een verbod op geneste quantifiers bij validatie.
- **Co-sessie**: er draait een tweede Claude-sessie in de main-worktree; al het werk gebeurt hier.

# Out of scope

- Judge-lane: harde regels als expliciete checklist in de judge-prompt (~45% hefboom i.p.v. ~8%) —
  bewuste keuze van de user, aparte taak.
- Renderer-handhaving van visuele constraints (analyzer-plan fase D / Puck).
- StyleguideRule-UI — die bestaat niet; authoring loopt via API + scripts.
- `BrandRule.contentTypeFilter` activeren (wordt geschreven, nooit gelezen) en de divergente
  severity-gewichten in `rule-compiler.ts` (`error: 2`) vs `composition-engine.ts` (`error: 3`).
- De volgende taken uit het fase-2-pakket: consumer-migratie naar `getBrandLibrary` + lint-regel,
  reviewstatus-reset bij sectie-wijziging, feedback-loop met curatie-suggesties.

# Notes

Werk-log en gevonden gotchas komen hier tijdens de uitvoering.
