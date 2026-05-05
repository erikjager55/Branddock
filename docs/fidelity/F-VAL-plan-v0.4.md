# F-VAL Implementatieplan — v0.4 (post-tell-detector)

> Datum v0.4: 2026-05-05
> Auteur: Claude (week 1, eind dag 3)
> Voorganger: v0.3 (post-drift)
> Status: **Voorlopig — wacht niet langer op humans**, drift-meting + tell-detector data sturen architectuur

---

## 1. Wat verandert in v0.4

Drie fundamentele heroriëntaties t.o.v. v0.3:

### Heroriëntatie 1: Anti-AI-tell laag wordt het zwaartepunt

**Wat we ontdekten**: 11 van 12 drift-outputs scoren HEAVY op de tell-detector (> 30 score/1000 woorden, ≥ 5 unieke tell-categorieën). Conditie B (gestructureerde BVD) verlaagt het tell-niveau **niet** — voor Linfi en WRA verergert B het zelfs (+12.5 en +10.0 score/1k). Alleen BB ziet verbetering, en daar speelt de bekende interne BrandPersonality-tegenstrijdigheid.

**Implicatie**: het demo-belofte-probleem (*"AI dichter bij jouw merk dan ChatGPT"*) wordt **niet** opgelost door BVD-format. Het wordt wel opgelost door **anti-AI-tell preventie** — een laag die generiek werkt, naast merk-specifieke BVD.

**Was pijler 3 (rule-based)** een ondersteunende component → **wordt nu hoofdcomponent**.

### Heroriëntatie 2: Demo-belofte aangescherpt

**Was**: "Branddock-output is trouwer aan jouw merk dan ChatGPT"
**Wordt**: "Branddock-output is trouwer aan jouw merk **én meetbaar menselijker** dan ChatGPT"

Nieuwe meetbaar bewijs:
- Tell-detector score per 1000 woorden — kwantitatieve onderbouwing
- Per-categorie breakdown — uitlegbaar in demo
- Live test: ChatGPT-output door dezelfde detector haalt waarschijnlijk vergelijkbare HEAVY-score; Branddock-output (met anti-tell laag) haalt CLEAN/TRACES → verschil zichtbaar

Dit is een **harder** demo-verhaal: niet "voelt menselijker" maar "scoort 4× lager op AI-tell-density".

### Heroriëntatie 3: Human eval is niet meer kritiek-pad

**Was**: human-eval bepaalt Route A/B keuze.
**Wordt**: Route A/B is grotendeels irrelevant — beide condities zitten vol tells. De **echte beslissing** is: hoeveel tell-preventie willen we, en hoe meten we het?

Human-eval blijft optioneel als sanity check (jij + 1 collega kan ~30 min besteden), maar blokkeert de implementatie niet meer.

---

## 2. Bijgewerkte pijler-architectuur

### Pijler 1 — Style scoring op bestaande data (verkort van 1 wk → 2 dagen)

Onveranderd t.o.v. v0.3, maar nog kleiner door schrappen van schema-uitbreiding:

```
src/lib/brand-fidelity/style-scorer.ts (~200 regels)
  Tone-dimensie overlap (declared toneDimensions vs gedetecteerde tone)
  Vocabulaire-matching (wordsWeUse / wordsWeAvoid count)
  Personality-trait coverage
  Composite: 0-100, gewogen 40/30/30
```

Geen schema-wijziging. Geen embedding-API. Geen pgvector.

### Pijler 2 — G-Eval rubric (1 week, was 1.5 wk)

Aangescherpt op basis van tell-detector inzichten:

| Dimensie | v0.3 weight | v0.4 weight | Verandering |
|----------|-------------|-------------|-------------|
| Strategische verankering | 0.25 | 0.20 | −0.05 |
| Doelgroep-fit | 0.20 | 0.15 | −0.05 |
| Brand-recognition | 0.20 | 0.15 | −0.05 |
| Anti-pattern compliance (tells) | 0.15 | **0.30** | **+0.15** |
| Boodschap-coherentie | 0.10 | 0.10 | 0 |
| Concretheid | 0.10 | 0.10 | 0 |

**Anti-pattern compliance** wordt het zwaarste criterium — 30% — omdat de tell-detector aantoont dat dit de meetbare zwakte is. De judge-prompt voor deze dimensie kan gewoon `detectAiTells()` aanroepen + verbale interpretatie van het resultaat geven; semi-deterministisch.

Conciseness blijft als length-controlled multiplier (anti-verbosity bias), niet als rubric-criterium.

### Pijler 3 — Anti-AI-tell laag (NIEUW zwaartepunt, 1.5 wk)

**Twee componenten** die naast bestaande BVD draaien:

**3a. Human Voice Directive (`src/lib/studio/human-voice-directive.ts`)** — al gebouwd
- Compacte prompt-module (~500 tokens), brand-agnostic
- Avoid-instructies voor 10 categorieën AI-tells (NL + EN)
- Auto-injectie naast BVD in canvas-orchestrator + studio generate
- Toggle per workspace (default ON)
- Effort: 0.5 dag wiring + tests

**3b. AI-Tell Detector (`src/lib/brand-fidelity/ai-tell-detector.ts`)** — al gebouwd
- 30 tell-definities, severity-gewogen scoring
- 9 categorieën, 4-niveau verdict (CLEAN/TRACES/NOTICEABLE/HEAVY)
- Pure functie zonder externe afhankelijkheden
- Hergebruikt in pijler 2 (G-Eval Naturalness dimensie) én UI (post-generatie waarschuwingen)
- Effort: 0 (klaar)

**3c. Workspace BrandRule overrides (echte rule-based, 1 wk)**
- Prisma `BrandRule` model: per-workspace verboden woorden, vereiste formuleringen, stijlregels
- Vult anti-tell laag aan met merk-specifieke rules (bijv. WRA's "wordsWeAvoid" lijst van 10 termen)
- Settings UI: Settings > Brand Voice > Rules tab
- Bulk import via CSV
- Effort: 1 wk (Prisma migration + compiler + UI)

### Pijler 4 — Brand Foundation Coherence Check (0.5 dag, NIEUW)

Detecteert interne tegenstrijdigheden in BrandPersonality (Better Brands fenomeen). Realtime warning bij save in editor.

Aparte feature, niet F-VAL — direct waarde-toevoegend voor pilots.

---

## 3. Bijgewerkte timeline

| Week | Datum | Werk | Effort | Status |
|------|-------|------|--------|--------|
| 1 | 5-12 mei | Schema-audit + drift-meting + tell-detector + Human Voice Directive | klaar | ✅ |
| 1 | 5-7 mei | Validatie-test: regenereer BB case-A met Human Voice Directive | 0.5 dag | volgende stap |
| 2 | 12-19 mei | **Pijler 3a** (HVD wiring) + **Pijler 4** (Coherence Check) + Prisma migration BrandRule | 1 wk | start na validatie |
| 3 | 19-26 mei | **Pijler 3c** (BrandRule compiler + Settings UI) | 1 wk | — |
| 4 | 26 mei – 2 juni | **Pijler 1** (style-scorer, 2 dagen) + **Pijler 2** start (G-Eval rubric design + judge dispatcher) | 1 wk | — |
| 5 | 2-9 juni | Pijler 2 vervolg (length-control, caching, 6-dimensie scoring incl. tell-integration) | 1 wk | — |
| 6 | 9-16 juni | Composition engine + API endpoints + workspace settings backend | 1 wk | — |
| 7 | 16-23 juni | UI design + implementatie | 1 wk | — |
| 8 | 23-30 juni | Polish + bug bash + demo-walkthrough met pilot-content | 1 wk | — |
| 9 | 30 juni – 7 juli | Buffer | 1 wk | — |
| Demo | 8-15 juli | LINFI / Nobox / WRA pilot demo | — | — |

**Demo-buffer**: ~1.5 weken (onveranderd t.o.v. v0.3). Comfortabel.

---

## 4. Demo-script aangescherpt

Voor het demo-moment 15 juli:

### Stap 1: Live ChatGPT generatie
Prospect ziet ChatGPT direct content genereren voor hun merk (geen brand context, alleen merknaam + briefing).
**Tell-score op die output**: verwacht HEAVY (60+ /1k woorden).

### Stap 2: Live Branddock generatie
Zelfde briefing, maar nu in Branddock met Brand Foundation gevuld + Human Voice Directive actief.
**Tell-score op die output**: doel CLEAN/TRACES (<20 /1k woorden).

### Stap 3: Side-by-side Tell Report
Prospect ziet detector-rapport voor beide outputs naast elkaar:
- ChatGPT: 12 unique tells, 60.1/1k, HEAVY
- Branddock: 2 unique tells, 8.2/1k, CLEAN
- Per-categorie breakdown maakt verschil tastbaar

### Stap 4: Brand-fit overlay
Op Branddock-output: live G-Eval rubric scores (6 dimensies, 0-100 composite).
Brand-recognition + voice-fit + anti-tell-compliance per dimensie zichtbaar.

**Demo-belofte gemeten**: niet "voelt beter", wel "scoort meetbaar 4× lager op AI-tell-density met 90% brand-recognition score".

---

## 5. Wat dit betekent voor de prijsstelling

Aangescherpte demo-belofte rechtvaardigt premium positionering:
- **Branddock = anti-AI-content engine voor merken** (niet "betere AI-content")
- Per-merk Tell Report als zichtbare value-deliverable
- Transparente metingen — klant kan zelf verifiëren

Implicaties voor pricing-tier discussie (uit BRANDCLAW-ROADMAP "Open Beslissingen"):
- Direct-tier moet de anti-tell laag includeren (anders is er geen demo-belofte)
- Agency-tier heeft meerwaarde via per-klant BrandRule overrides (custom anti-tell rules per klant)
- Geen gratis tier — anti-tell laag is core value proposition

---

## 6. Validatie-test (vandaag, ~30 min)

Vóór de v0.4 plan-finalisatie: bewijs dat de Human Voice Directive werkt.

Test-protocol:
1. Pak BB case-study briefing (`research/fidelity-week1/briefings/better-brands-case-study.md`)
2. Bouw nieuwe condition-prompt: BVD (huidige) + **Human Voice Directive** + briefing
3. Genereer via Opus 4.7 (zelfde model als drift-meting)
4. Run tell-detector op output
5. Vergelijk: oude BB-A had 60.1/1k, 5 tells, HEAVY. Doel nieuwe output: <30/1k, ≤3 tells, NOTICEABLE of beter

Als test slaagt → bewijs dat anti-tell laag werkt → v0.4 staat → start week 2.
Als test faalt → herzie Human Voice Directive (sterker maken, voorbeelden toevoegen, etc.) en test opnieuw.

---

## 7. Risico's update

| Risico | Status v0.3 | Status v0.4 |
|--------|-------------|-------------|
| Verbosity bias slipt door | Laag | Onveranderd |
| Self-preference bias bij judges | Laag (cross-family) | Onveranderd |
| Cold-start centroid onnauwkeurig | Vervalt | Vervalt |
| Embedding kosten | Vervalt | Vervalt |
| Judge kosten compounden | Midden | Midden — maar nu meetbaar (tells als pre-filter, judge alleen voor borderline) |
| DeepEval Node-support ontbreekt | Vervalt (eigen impl) | Vervalt |
| **NIEUW**: Anti-tell laag verlaagt creativiteit | — | **Hoog** — over-restrictie kan merk-stem dempen. Mitigatie: HVD is "avoid", niet "verboden"; merk-specifieke BVD mag tegenspraak geven |
| **NIEUW**: Tell-detector false positives | — | **Midden** — em-dash detector pakt mogelijk legitiem gebruik. Mitigatie: per-categorie threshold tuning na pilot-feedback |

---

## 8. Open beslissingen

1. **Validatie-test eerst, of doorgaan?** Aanbeveling: validatie eerst (30 min). Als HVD werkt, bouwt zekerheid op voor week 2.
2. **Pijler 4 (Coherence Check) deze week of week 2?** Aanbeveling: deze week, klein werk, direct value voor BB-pilot.
3. **HVD verplichten of opt-in?** Aanbeveling: default ON, opt-out per workspace via Settings. Anders is de demo-belofte niet houdbaar.
4. **Tell-detector publiek tonen of intern?** Aanbeveling: publiek tonen in Canvas (post-generatie panel) — transparante meting versterkt vertrouwen.

---

*Status: v0.4 plan staat. Volgende stap: validatie-test (BB case-study regenereren met HVD actief).*
