# F-VAL Implementatieplan — v0.3 (post-drift)

> Datum v0.3: 2026-05-05
> Auteur: Claude (week 1, eind dag 3)
> Voorgangers: v0.1 (oorspronkelijk), v0.2 (na schema-audit). v0.3 verwerkt LLM-drift-uitkomsten + qualitative observations.
> Status: **Voorlopig op LLM-signaal** — definitief na human-eval bevestiging.

---

## 1. Wat verandert in v0.3

Drie scope-aanpassingen ten opzichte van v0.2:

### Aanpassing 1: Pijler 1 verkort van 1 week naar 3 dagen

**Was**: volledige StyleEmbedding-laag met BrandStyleCentroid Prisma-tabel, embedding via `text-embedding-3-small`, auto-switch bij 20+ APPROVED, cosine similarity scoring.

**Wordt**: scoring-laag op bestaande BrandPersonality + ToneOfVoice data. Geen Prisma-tabellen. Geen embedding-API calls. Geen pgvector-dependency voor pijler 1.

**Trigger**: drift-meting LLM-signaal +0.37 onder 0.5-drempel + qualitative observation dat voice-fit verschilt van brand-recognition (Pijler 2 dekt brand-recognition).

**Concreet**:
```
src/lib/brand-fidelity/style-scorer.ts (~250 regels)
  Input: ContentItem text + BrandPersonalityFrameworkData + ToneOfVoiceData
  Output: StyleFidelityScore { 0-100 composite + 4-dimensie breakdown }
  Methode:
    a. Tone-dimensie overlap: vergelijk declared toneDimensions met gedetecteerde tone (via Claude judge call)
    b. Vocabulaire-matching: count occurences van wordsWeUse + wordsWeAvoid in output
    c. Personality-trait coverage: percentage van declared traits dat zichtbaar in output
    d. Composite: gewogen gemiddelde (40% tone + 30% vocab + 30% trait)
  Geen schema-wijziging.
```

### Aanpassing 2: Brand-recognition wordt kerncriterium in pijler 2

**Was**: brand-recognition implicit, ongewogen.

**Wordt**: brand-recognition expliciet 0.20 weight in 6-dimensie G-Eval rubric. Verhoogd van 0.15 (origineel) naar 0.20.

**Trigger**: alle 12 drift-outputs scoren 3-7 op brand-recognition, terwijl voice-fit consistent 7-9 haalt. Dit is precies de discriminator waar de demo-belofte op leunt ("Branddock-output is trouwer aan jouw merk dan ChatGPT").

**Aangepaste rubric weights**:
| Dimensie | v0.2 | v0.3 |
|----------|------|------|
| Strategische verankering | 0.25 | 0.25 |
| Doelgroep-fit | 0.20 | 0.20 |
| **Brand-recognition** | (ontbrak) | **0.20** |
| Boodschap-coherentie | 0.15 | 0.10 |
| Anti-pattern compliance | 0.15 | 0.15 |
| Concretheid | 0.15 | 0.10 |
| Conciseness | 0.10 | (afgevoerd; verdwijnt in length-controlled scoring sectie) |

Brand-recognition kost gewicht aan boodschap-coherentie + concretheid. Conciseness blijft als length-controlled multiplier (bias-mitigatie), niet als rubric-criterium.

### Aanpassing 3: Brand Foundation Coherence Check (nieuw, optioneel)

**Wat**: detector voor interne tegenstrijdigheden binnen één BrandPersonality-record. Voorbeeld uit drift-meting: Better Brands had `toneDimensions: Funny + Enthusiastic` en `spectrumSliders: strongly Reserved + slightly Serious + strongly Traditional` — onverenigbaar. LLM kiest meerderheid en negeert minderheid.

**Waar**: Brand Foundation editor (Settings > Brand Foundation > Brand Personality), realtime warning bij save.

**Effort**: 0.5 dag.

**Niet onderdeel van F-VAL pijler 1/2/3** — naast-feature die direct waarde toevoegt zonder op humans te wachten.

---

## 2. Bijgewerkte timeline

| Week | Datum | Werk | Status |
|------|-------|------|--------|
| 1 | 5-12 mei | Schema-audit + drift-meting + briefings + LLM-judges + human-eval pakket | ✅ |
| 1.5 | 12-14 mei | **Wachten op humans** + schrijf `final-findings.md` | ⏳ blocked |
| 2 | 14-21 mei | Prisma migration + pijler 3 (rules) — onafhankelijk van Route A/B | Klaar voor start |
| 3 | 21-26 mei | **Pijler 1 verkort** (3 dagen scoring-laag) + Foundation Coherence Check (0.5 dag) + Composition engine start (1 dag) | Klaar voor start |
| 4 | 26 mei – 2 juni | Pijler 2 (G-Eval rubric, eigen impl, 6 dimensies) | — |
| 5 | 2-9 juni | Pijler 2 vervolg (judge dispatcher, length-controlled scoring, caching) | — |
| 6 | 9-16 juni | API endpoints + workspace settings backend + telemetry | — |
| 7 | 16-23 juni | UI design + implementatie | — |
| 8 | 23-30 juni | Polish + bug bash + demo-walkthrough met pilots | — |
| 9 | 30 juni – 7 juli | Buffer (1.5 weken vrijgekomen door pijler 1 verkorting) | — |
| Demo | 8-15 juli | LINFI / Nobox / WRA pilot demo | — |

**Demo-buffer**: van 0 → **~1.5 weken**. Comfortabel.

---

## 3. Branchpoint na human-eval

| Scenario humans | Action | Plan |
|-----------------|--------|------|
| Drift < 0.5 (bevestigt LLM) | Route A | Bovenstaande plan staat |
| Drift 0.5–1.5 | Route B | Pijler 1 = format-upgrade BVD (refactor `formatBrandPersonality()` naar markdown) — +1 dag effort |
| Drift > 1.5 | Reconsider | Aanvullende drift-ronde nodig (truncatie elimineren, n vergroten); demo-deadline mogelijk uitstellen |
| Voice-fit OK + brand-recognition zwak (mijn hypothese) | Route A + uitgebreide pijler 2 | Brand-recognition weight verhogen naar 0.25, krijgt expliciete sub-criteria in rubric |

---

## 4. Wat NU gestart kan worden zonder op humans te wachten

Vier laag-risico tracks die geen Route A/B-uitkomst nodig hebben:

### Track 1: Prisma migration voor pijler 3 (rules)

```
prisma/schema.prisma
  + BrandRule model (workspaceId, ruleType enum, pattern, severity, message, contentTypeFilter, isActive)
  + FidelityConfig model (workspaceId @unique, weights, rubricWeights, corpusThreshold, disabledContentTypes)
  + FidelityScore model (workspaceId, deliverableId, contentVersion, scores, breakdown, judgeProvider)
  + 3 nieuwe enums (BrandRuleType, CentroidStatus — laatste vervalt mogelijk bij Route A)
```

Migration is read-only safe — adds tables, geen breaking changes.

### Track 2: Rule-compiler infrastructuur

```
src/lib/brand-fidelity/rule-compiler.ts
  Compiles BrandRule[] naar runtime evaluators (regex, literal, structural)
  Returns RuleViolation[] per ContentItem text

src/lib/brand-fidelity/rule-types.ts
  TypeScript interfaces voor rule evaluation
```

Geen UI-koppeling, geen API-endpoint — pure library.

### Track 3: Settings UI scaffolding voor rules CRUD

```
src/features/settings/components/brand-voice/RulesTab.tsx (skeleton)
  Lijst rules + add/edit/delete UI
  Bulk import via CSV
  Preview-functie: paste content → toon violations
```

Geen routing nog — wel componenten klaar voor wiring.

### Track 4: Brand Foundation Coherence Check

```
src/lib/brand-foundation/coherence-checker.ts
  Detecteer tone vs spectrum mismatches
  Emit warning records bij BrandPersonality save
```

Volledig onafhankelijk van F-VAL, levert directe waarde aan pilot-merken (vooral Better Brands).

---

## 5. Risico-update t.o.v. v0.2

| Risico v0.2 | Status |
|-------------|--------|
| Verbosity bias slipt door | Laag risico — drift-meting toont consistente conciseness scores |
| Self-preference bias bij judges | Laag — cross-family rotatie validated in Linfi-TL-A outlier |
| Cold-start centroid onnauwkeurig | **Vervalt** — geen centroid in Route A |
| Embedding kosten compounden | **Vervalt** — geen embeddings in Route A |
| Judge kosten compounden | Laag — drift-meting kostte ~$1.40 voor 24 calls; productie zou per-deliverable budget hanteren |
| DeepEval Node-support | **Vervalt** — eigen impl gekozen, validated in drift-meting (eigen judge.ts werkt) |

**Nieuw risico**: pijler 1 als scoring-laag is conceptueel zwakker dan corpus-grounded centroid voor sales-narratief ("wij hebben een uniek geheugen van jouw goedgekeurde content"). Mitigatie: framing van pijler 1 als "transparante voice-scoring" + brand-recognition als kern van pijler 2 ("uniek voor jouw merk, niet generiek").

---

## 6. Open beslissingen voor user

1. **Pre-registratie + outputs commit**: één batch (`git add docs/fidelity research/fidelity-week1 scripts/fidelity`) of opgesplitst (pre-reg eerst, outputs later)?
2. **Wat met Better Brands BrandPersonality**: nu fixen (intern conflict tussen tone en spectrum) of laten staan tot na F-VAL launch?
3. **Track 1-4 starten** vóór humans rond zijn, of strict wachten? Aanbeveling: **Track 1 + Track 4** starten, Track 2 + 3 wachten op finalisatie.
4. **Demo-deadline**: 15 juli vasthouden of vervroegen naar ~10 juli (gegeven 1.5 weken buffer)?

---

*Status: v0.3 plan staat. Wacht op humans voor finalisatie + user-akkoord op Track 1 + 4 startpunten.*
