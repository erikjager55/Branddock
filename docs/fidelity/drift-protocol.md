# F-VAL Drift-Meting Protocol — v0.2 (pre-registreerbaar)

> Datum v0.2: 2026-05-05
> Auteur: Claude (week 1, dag 3)
> Status: **v0.2 — pre-registreerbaar zodra user-review op briefings akkoord**
> Voorgeschiedenis: v0.1 skeleton (5 mei vroeg), gefinaliseerd na empirische completeness + corpus checks.
> Dependencies: schema-audit.md (sectie 6 empirische verificatie), condition-b-template.md, judge-prompt.md.
> Pre-registratie batch (1e commit): dit document + 6 briefings in `research/fidelity-week1/briefings/` + `toneSavedForAi=true` SQL patch voor LINFI + Better Brands.

---

## 1. Onderzoeksvraag

**Levert de huidige Brand Voice Directive in Branddock voldoende voice-fit op long-form content, of is een uitbreiding (gestructureerde markdown óf corpus-grounded centroid) noodzakelijk om merk-trouw te garanderen voor de F-VAL demo?**

Beslist tussen drie pijler-1 scope-scenarios:
- **Route A**: huidige BVD volstaat → pijler 1 wordt scoring op bestaande data, geen schema-uitbreiding
- **Route B**: gestructureerde BVD wint meetbaar → pijler 1 wordt format-upgrade van BVD, lichte refactor
- **Route C**: corpus-grounded centroid nodig → pijler 1 wordt volledige StyleEmbedding-laag zoals oorspronkelijk gepland

---

## 2. Hypothese

Op basis van schema-audit (sectie 2.2):
- H1: Conditie B haalt meetbaar betere voice-fit dan Conditie A door betere LLM-adherentie aan markdown-structuur (verwacht delta: +0.5 tot +1.5 op 1-10 schaal voor voice-fit dimensie)
- H2: Conditie C levert meetbaar bovenop B als declared brand voice meetbaar afwijkt van approved corpus (alleen testbaar als test-merken corpus hebben)
- H_null: alle drie condities scoren binnen 0.5 punt van elkaar — geen ervan voegt waarde toe → Route A automatisch

---

## 3. Drie condities

### Conditie A — Huidige BVD (baseline)

`buildBrandVoiceDirective(workspaceId, { channel })` zoals nu in productie staat. Platte joined string van alle BrandPersonality + ToneOfVoice + BrandVoice content-velden.

### Conditie B — Gestructureerde BVD

Zelfde 25 velden, herstructureerd in 7 markdown-secties met geïsoleerde anti-patterns en kanaal-filtering.
**Volledig template + worked example: zie `condition-b-template.md`.**

### Conditie C — Corpus-grounded centroid (optioneel)

Embed alle APPROVED content per merk via `text-embedding-3-small`, bereken centroid, meet cosine similarity tussen output-embedding en centroid post-generatie.

**Eligibility**: alleen meegenomen als minimaal één test-merk ≥5 APPROVED stukken heeft. Anders geskipt voor v1, naar v2 verschoven.

---

## 4. Generatie-protocol

### 4.1 Setup

| Parameter | Waarde |
|-----------|--------|
| Generator-model | `claude-opus-4-7-20260301` |
| Max output tokens | 8000 |
| Extended thinking budget | 12000 |
| Temperature | Default (Anthropic standaard, geen override) |
| Briefing-bron | Pre-geregistreerd in `research/fidelity-week1/briefings/` |
| Pre-registratie | Briefings + protocol committed in git vóór generatie |

### 4.2 Briefing-format (per merk × type, identiek over condities)

Eén briefing per merk per content-type — gebruikt voor beide Conditie A én Conditie B (zo blijft alleen de BVD-vorm de variabele). Voorbeeld-shape:

```markdown
# Briefing: {brand} — {contentType}

## Audience
[concrete doelgroep uit Brand Foundation persona's]

## Objective
[één strategisch doel in 1 zin]

## Key message
[centrale boodschap, 2-3 zinnen]

## Structural constraints
- Word count: 2700-3300 woorden
- Format: {case-study | thought-leadership specifieke structuur}
- Output language: {workspace contentLanguage}
- No images, references in text
```

Briefings worden door Claude gemaakt vanuit Brand Foundation + Personas, door user gereviewd op realisme + blinde vlekken vóór commit.

### 4.3 Aantal outputs (v0.2 — definitief)

**12 outputs**: 3 merken × 2 content-types × 2 condities (A + B).

| Merk | Case study A | Case study B | Thought leadership A | Thought leadership B |
|------|:------------:|:------------:|:--------------------:|:--------------------:|
| WRA Juristen | ✓ | ✓ | ✓ | ✓ |
| Linfi | ✓ | ✓ | ✓ | ✓ |
| Better Brands | ✓ | ✓ | ✓ | ✓ |

Conditie C (corpus-grounded) geskipt voor v1 — alleen LINFI eligible (6 APPROVED + 1 PUBLISHED), single-merk corpus-test methodologisch zwak. Doorgeschoven naar v2 zodra meerdere pilot-merken corpus accumuleren.

### 4.4 Reproduceerbaarheid

Identieke briefing per (merk, type) over Conditie A en B, identieke generator-config, alleen BVD-vorm verschilt. Conditie C voegt centroid-meting post-generatie toe (geen invloed op generatie-prompt zelf).

---

## 5. Judge-protocol

Volledige specificatie: zie `judge-prompt.md`.

Samenvatting:
- **Primary judge**: GPT-5 (cross-family met Opus 4.7 generator)
- **Parallel judge**: Claude Sonnet 4.6 (same-family agreement-meting)
- **4 dimensies**: voice-fit, brand-recognition, naturalness, fluency (1-10 elk)
- **Agreement-threshold**: outputs met `|gpt5 - sonnet| > 1.5` mean delta worden gevlagd, niet meegenomen in LLM-aggregaat
- **LLM = parallel signaal, NIET beslissingsbasis**

---

## 6. Human-eval protocol

### 6.1 Distributie

- ≥2 menselijke evaluators per merk (voor inter-rater agreement)
- Evaluators worden door user benaderd bij LINFI / Nobox / WRA — uit het merk-team, idealiter brand stewards die bekend zijn met hun eigen voice
- Outputs blind getoond: nummering (`output-01.md` ... `output-12.md`), géén merk-naam, géén conditie-label, géén informatie over generator
- Evaluators krijgen wel: het merk-naam (om voice-recognition te kunnen scoren), het content-type (case-study of thought-leadership), de briefing

### 6.2 Rubric (identiek aan LLM-judge)

Zelfde 4 dimensies (voice-fit, brand-recognition, naturalness, fluency), zelfde 1-10 schaal, optionele tekst-comment per dimensie.

Form: shared spreadsheet of Google Form, 1 rij per output × evaluator. Resultaten geüpload naar `research/fidelity-week1/scores/humans/`.

### 6.3 Inter-rater agreement

Per output: `|rater1 - rater2|` per dimensie, gemiddeld over 4 dimensies. Bij ≥3 raters: pairwise + simpele kappa.

Outputs met grote rater-disagreement (delta > 2) → niet excluderen, maar markeren in finale rapport (suggereert dat voice-fit zelf ambigu is voor dat merk/type).

### 6.4 Aggregatie

Per conditie: gemiddelde van alle outputs in die conditie, alle evaluators. Drift B vs A = composite_B − composite_A in human-aggregaat. Significantie via paired-comparison test als n ≥ 6.

---

## 7. Drift-metric

Per dimensie en composite, voor zowel LLM als humans:

```
drift_BvsA = mean(scores_B) - mean(scores_A)
```

**Beslissingsregels** (Route A/B/C):

| Voorwaarde | Conclusie |
|------------|-----------|
| Drift_BvsA(human composite voice-fit) < 0.5 én Conditie A composite ≥ 7.5 | Route A — huidige BVD volstaat |
| Drift_BvsA(human composite voice-fit) ≥ 0.5 én ≤ 1.5 | Route B — gestructureerde BVD wint, geen schema-uitbreiding |
| Drift_BvsA < 0.5 én Conditie A composite < 7 én Conditie C beschikbaar én Conditie C composite ≥ A+1.0 | Route C — corpus-centroid noodzakelijk |
| Mixed signals tussen LLM en humans (delta > 1.0) | Re-evaluatie + extra ronde menselijke evaluators |

LLM-scores informeren maar dicteren niet. Bij conflict tussen LLM en human → human wint.

---

## 8. Pre-registratie procedure

Methodologisch verplicht. Voorkomt achteraf bijbuigen van hypothese.

### Wat wordt pre-geregistreerd (committed in git vóór generatie):

1. Dit document, **versie 0.2** (= dit v0.1 + completeness-data + finale merken-aantal + finale Conditie C eligibility)
2. Briefings per merk per type (`research/fidelity-week1/briefings/`)
3. Beslissingsregels (sectie 7) — onveranderbaar na commit
4. Conditie B template (`docs/fidelity/condition-b-template.md`) — al gecommit
5. Judge-prompt (`docs/fidelity/judge-prompt.md`) — al gecommit

### Volgorde

```
1. User stuurt completeness + APPROVED count data
2. Claude finaliseert protocol v0.2 + maakt briefings
3. User reviewt briefings op realisme + blinde vlekken
4. Beide committen pre-registratie batch in één commit
5. PAS DAN: generatie via run-drift.ts
6. Outputs + LLM-scores: 2e commit
7. Human ratings: 3e commit, samen met final-findings.md
```

---

## 9. Pre-registratie batch (v0.2 commit)

Wordt in één commit gepusht zodra user-review op de 6 briefings akkoord is:

1. `docs/fidelity/drift-protocol.md` (v0.2 — dit document)
2. `research/fidelity-week1/briefings/wra-juristen-case-study.md`
3. `research/fidelity-week1/briefings/wra-juristen-thought-leadership.md`
4. `research/fidelity-week1/briefings/linfi-case-study.md`
5. `research/fidelity-week1/briefings/linfi-thought-leadership.md`
6. `research/fidelity-week1/briefings/better-brands-case-study.md`
7. `research/fidelity-week1/briefings/better-brands-thought-leadership.md`
8. `prisma/migrations/research-tov-saved-flag.sql` (UPDATE-statement voor `toneSavedForAi=true` op LINFI + BB — alleen documentatie van research-aanpassing, niet runtime migration)

**Open beslissingen v0.2 — alle gesloten**:
- ✅ 3 pilot-merken: alle ready (12/12 BrandPersonality velden)
- ✅ Conditie C: geskipt voor v1
- ✅ ToV gelijktrekken: `toneSavedForAi=true` voor LINFI + Better Brands (uitgevoerd 2026-05-05)
- ✅ Briefings: opgesteld, klaar voor user-review
- ⏳ Menselijke evaluators: user benadert deze week LINFI + Nobox + WRA voor raters (parallel werk, blokkeert generatie niet)

---

## 10. Timeline (week 1) — v0.2 update

| Dag | Datum | Wie | Werk | Status |
|-----|-------|-----|------|--------|
| Ma | 5 mei | Claude | Schema-audit + Conditie B template + judge-prompt + research-script architectuur + drift-protocol v0.1 + empirische verificatie via build-bvd.ts + 6 briefings + drift-protocol v0.2 | ✅ |
| Ma | 5 mei | Claude | ToV-gelijktrekking SQL patch (LINFI + BB) | ✅ |
| Di | 6 mei | User | Reviewt 6 briefings + protocol v0.2 op realisme + blinde vlekken | ⏳ |
| Di | 6 mei | User | Benadert LINFI + Nobox + WRA voor menselijke evaluators (parallel) | ⏳ |
| Wo | 7 mei | Beide | Pre-registratie commit (1e batch: protocol v0.2 + briefings + ToV-patch documentatie) | ⏳ |
| Wo | 7 mei | Claude | Implementeer `build-conditions.ts` + `run-drift.ts` + `judge.ts` | ⏳ |
| Do | 8 mei | Claude | Run drift-generatie (12 outputs via Opus 4.7) | ⏳ |
| Vr | 9 mei | Claude | LLM-judge dispatch (GPT-5 + Sonnet 4.6) + aggregaat-rapport in `reports/llm-aggregate.md` | ⏳ |
| Vr-Ma | 9-12 mei | User | Verzamel menselijke ratings van pilot-merken | ⏳ |
| Ma | 12 mei | Beide | Synthese: definitieve Route A/B-beslissing in `final-findings.md` | ⏳ |
| Di | 13 mei | Beide | Update F-VAL implementatieplan met definitieve pijler-1 scope | ⏳ |

---

## 11. Wat dit document NIET is

- **Geen productie-implementatie van pijler 1.** Dat komt week 3 op basis van Route A/B/C-uitkomst.
- **Geen volledige F-VAL G-Eval rubric.** De drift-judge gebruikt 4 voice-focused dimensies; de productie-judge in pijler 2 gebruikt 6 dimensies (voice-fit + 5 strategische). Verschillende doelen.
- **Geen statistische significantie-claim.** Met n=6 outputs per conditie (12 totaal) geeft dit indicatieve drift, geen p-waarde. Voor 95% confidence zouden we ~30 outputs per conditie nodig hebben — buiten scope voor v1, mogelijk voor v2 als pijler 2 productie draait en automatisch corpus-data accumuleert.

---

*Status: v0.2 pre-registreerbaar. Wacht op user-review op 6 briefings + protocol-akkoord voor pre-registratie commit.*
