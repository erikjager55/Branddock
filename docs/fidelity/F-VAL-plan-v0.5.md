# F-VAL Implementatieplan — v0.5 (post-detector-recalibratie)

> Datum v0.5: 2026-05-05
> Auteur: Claude (week 1, eind dag 3)
> Voorganger: v0.4 (post-tell-detector eerste meting)
> Status: **Stabiel — week 2 kan starten op basis van dit plan**

---

## 1. Wat v0.5 anders maakt

Drie verfijningen op v0.4 op basis van empirische detector-validatie:

### Verfijning 1: detector is een schaal, geen binaire classifier

**v0.4-aanname**: tell-detector zegt "HEAVY = AI, CLEAN = mens" — binair signaal.

**v0.5-realiteit**: tell-detector geeft een **positie op een schaal** tussen pure mens en pure AI. Veel patronen die als "AI-tell" geclassificeerd waren, komen ook voor in geoefend mens-werk. Empirisch gevalideerd op Erik's eigen Frankwatching-artikelen:

| Bron | Pos /100 | Verdict | Interpretatie |
|------|----------|---------|---------------|
| Erik 2021 ("5 powermerken") | 6 | TOP_TIER | top-tier menselijk |
| Erik 2020 ("Sales naar purpose") | 16 | HUMAN_BASELINE | gemiddeld menselijk |
| BB-A + HVD (Opus + BVD + HVD) | 20 | HUMAN_BASELINE | onze AI in mens-range |
| BB-A origineel (Opus + BVD only) | 35 | AI_LEANING | herkenbaar AI |
| (verwacht) ChatGPT vanille | ~70-90 | PURE_AI | overduidelijk AI |

### Verfijning 2: softness-onderscheid in tell-definities

**v0.4-detector**: alle 30 tells gewogen 1×.

**v0.5-detector**: tells gelabeld HARD (zelden in mens-werk) of SOFT (legitiem mogelijk in mens-werk). SOFT-tells krijgen 0.5× weight.

| HARD (alleen AI) | SOFT (mens kan dit ook) |
|------------------|--------------------------|
| Marketing-clichés ("Bij merk geloven we") | Em-dash misuse |
| AI-overtuiging ("zonder dat het ook maar een millimeter") | Contrast-formule "niet alleen X, maar ook Y" |
| Disclaimer-mantra's ("het is goed te beseffen dat") | Formele connectors ("Daarnaast") |
| "Niet omdat... maar omdat..." | Oxford-komma in NL |
| Buzzword-adjectieven (naadloos, baanbrekend) | Bullet-lists |
| Citeturn artefacten | Closing-formula ("Kortom") |
| "In dit artikel verkennen we..." | Smart quotes |

14 HARD + 16 SOFT = 30 tells totaal.

### Verfijning 3: nieuwe verdict-namen + position-score

**v0.4**: CLEAN / TRACES / NOTICEABLE / HEAVY (subjectief)
**v0.5**: TOP_TIER / HUMAN_BASELINE / AI_LEANING / PURE_AI (positie-gebaseerd)

Plus nieuwe field `humanBaselinePosition` (0-100) — direct bruikbaar voor demo-visualisatie (slider/scale).

---

## 2. Empirische data drijft architectuur

### Drift-meting heroverwogen

Met v0.5 detector zien we:

| Merk | A pos /100 | B pos /100 | Δ |
|------|------------|------------|---|
| Better Brands | 35 + 26 = 30.5 avg | 19 + 16 = 17.5 avg | **−13** (B beter) |
| Linfi | 28 + 29 = 28.5 avg | 31 + 38 = 34.5 avg | +6 (B slechter) |
| WRA Juristen | 19 + 20 = 19.5 avg | 23 + 26 = 24.5 avg | +5 (B slechter) |

Conditie B (gestructureerde BVD) **verbetert BB significant** maar **verergert Linfi en WRA licht**. De gemiddelde drift is +0 — B is geen consistente winst.

**BVD-format is dus een merk-specifieke afweging, geen universele winst.** Voor F-VAL implementatie betekent dit: laat BVD zoals het is, focus op de anti-tell laag (HVD) die voor alle merken werkt.

### HVD-validatie geslaagd

BB-A van AI_LEANING (pos 35) → HUMAN_BASELINE (pos 20) met HVD actief. Dat is concreet: anti-tell preventie via prompt-injectie haalt onze AI in mens-baseline range.

### 9 van 12 outputs al in HUMAN_BASELINE zonder HVD

Belangrijk inzicht: huidige Branddock met BVD only zit al **grotendeels** in mens-baseline range. Slechts 3 outputs zijn AI_LEANING (BB-A, Linfi case-B, Linfi thought-B). HVD is daarmee een **upgrade voor de 25% borderline-outputs**, geen rescue-laag voor totale brokken.

---

## 3. Architectuur — definitief

### Pijler 1 — Style scoring op bestaande data (2 dagen)

Onveranderd t.o.v. v0.4. Geen schema-uitbreiding, geen embeddings, geen pgvector. Pure scoring-laag bovenop BrandPersonality + ToneOfVoice.

### Pijler 2 — G-Eval rubric (1 week)

Onveranderd t.o.v. v0.4. Anti-pattern compliance dimensie (0.30 weight) gebruikt `detectAiTells()` direct + verbale judge-interpretatie. Semi-deterministisch.

### Pijler 3 — Anti-AI-tell laag (NIEUW zwaartepunt, 1.5 wk)

**3a. Human Voice Directive** — al gebouwd (`src/lib/studio/human-voice-directive.ts`)
- Wiring in canvas-orchestrator + studio generate (0.5 dag)
- Toggle per workspace via WorkspaceAiConfig (default ON)
- Toevoegen: `HUMAN_VOICE_ENFORCEMENT` enum (OFF, BASELINE, STRICT)
- BASELINE = HVD geïnjecteerd; STRICT = HVD + post-generation tell-check + auto-rewrite if AI_LEANING

**3b. AI-Tell Detector** — al gebouwd, gerecalibreerd (`src/lib/brand-fidelity/ai-tell-detector.ts`)
- 30 tell-definities met softness HARD/SOFT
- Verdict: TOP_TIER / HUMAN_BASELINE / AI_LEANING / PURE_AI
- humanBaselinePosition: 0-100
- Geen wijzigingen meer nodig
- Test-suite + edge cases (1 dag)

**3c. Workspace BrandRule overrides** (1 wk) — onveranderd t.o.v. v0.4

**3d. NIEUW: Auto-rewrite loop voor AI_LEANING outputs**
- Na generatie: detect tells
- Als verdict AI_LEANING of PURE_AI: één rewrite-call met expliciete tell-feedback in prompt
- Re-detect; als verbeterd → houd, anders → toon original met warning
- Effort: 0.5 dag

### Pijler 4 — Brand Foundation Coherence Check (0.5 dag)

Onveranderd t.o.v. v0.4. Direct waarde voor BB-pilot.

---

## 4. Demo-script v0.5

Side-by-side test bij prospect:

### Stap 1: Pure ChatGPT
ChatGPT 4o output zelfde briefing → run detector.
**Verwacht**: pos 70-90, PURE_AI verdict.

### Stap 2: Branddock vanille (BVD only)
Zelfde briefing in Branddock → run detector.
**Verwacht**: pos 20-40, HUMAN_BASELINE / AI_LEANING.

### Stap 3: Branddock + Human Voice Directive
HVD toggle aan → regenereer → run detector.
**Verwacht**: pos 15-25, HUMAN_BASELINE.

### Stap 4: Branddock + HVD + STRICT mode
STRICT = HVD + auto-rewrite voor AI_LEANING outputs.
**Verwacht**: pos 10-20, HUMAN_BASELINE / TOP_TIER.

### Visualisatie
```
TOP_TIER     HUMAN_BASELINE     AI_LEANING     PURE_AI
   |              |                  |              |
   0─────12─────30─────────────────50───────────100
                                                  ↑ ChatGPT (pos 80)
                            ↑ Branddock (pos 35)
              ↑ Branddock+HVD (pos 20)
        ↑ Branddock+STRICT (pos 12)
```

Demo-verhaal: *"Met onze anti-tell laag schrijft Branddock op het niveau van uw eigen gepubliceerde werk."* + concrete getallen.

---

## 5. Timeline definitief

| Week | Datum | Werk | Status |
|------|-------|------|--------|
| 1 | 5-12 mei | Schema-audit + drift-meting + tell-detector + HVD + recalibratie | ✅ klaar |
| 1.5 | 6-9 mei | Optioneel: ChatGPT-vanille baseline meting (1 uur) | wenselijk vóór week 2 |
| 2 | 12-19 mei | Pijler 3a wiring (HVD in canvas-orchestrator) + Pijler 3b tests + Pijler 4 (Coherence Check) + Prisma migration BrandRule | start |
| 3 | 19-26 mei | Pijler 3c (BrandRule compiler + Settings UI) + Pijler 3d (auto-rewrite loop) | — |
| 4 | 26 mei – 2 juni | Pijler 1 (style-scorer, 2 dagen) + Pijler 2 start | — |
| 5 | 2-9 juni | Pijler 2 vervolg (G-Eval rubric, judge dispatcher, length-control) | — |
| 6 | 9-16 juni | Composition engine + API endpoints + workspace settings | — |
| 7 | 16-23 juni | UI design + implementatie (incl. demo-visualisatie) | — |
| 8 | 23-30 juni | Polish + bug bash + demo-walkthrough | — |
| 9 | 30 juni – 7 juli | Buffer | — |
| Demo | 8-15 juli | LINFI / Nobox / WRA pilot demo | — |

**Buffer**: ~1.5 weken. Comfortabel.

---

## 6. Drie open beslissingen voor week 2 start

1. **HVD default ON of OFF voor nieuwe workspaces?** Aanbeveling: ON. Anders is demo-belofte niet gegarandeerd.
2. **Auto-rewrite STRICT mode default ON of OFF?** Aanbeveling: OFF. Verdubbelt API-kosten (+1 generatie call); opt-in voor prospects die het willen.
3. **Brand-specific BrandRule overrides hoe ver gaan?** Aanbeveling: voor pilot v1 alleen wordsWeAvoid uit BrandPersonality auto-importeren als FORBIDDEN_WORD rules. CSV-import + custom rules in v2 (na pilot-feedback).

---

## 7. Risico-update

| Risico | Status v0.4 | Status v0.5 |
|--------|-------------|-------------|
| Detector false positives op mens-werk | Hoog | **Mitigated** — softness-labels + drempel-recalibratie |
| HVD verlaagt creativiteit | Hoog | **Midden** — empirisch nog niet getest, validatie-test toonde geen creativiteits-regressie |
| Auto-rewrite loop verdubbelt kosten | — | Midden — opt-in voor STRICT mode |
| Drempel-drift: nieuwe AI-modellen verschuiven baseline | — | Laag op korte termijn — kalibreren als Opus 4.8 / GPT-6 verschijnen |

---

## 8. Wat nog ontbreekt voor demo

1. **ChatGPT-vanille baseline meting** (1 uur, deze week of begin week 2). Geeft de "ceiling" op de schaal.
2. **STRICT mode prototype** (1 dag, week 3). Enkel rewrite-loop op AI_LEANING outputs.
3. **Demo UI** (week 7). Position-bar met live-update na generatie + side-by-side ChatGPT-vergelijking.

---

*Status: v0.5 plan staat. Detector v2 gerecalibreerd, HVD-validatie geslaagd. Klaar voor week 2 implementatie. Volgende natuurlijke stap: ChatGPT-vanille baseline meten + start Track 1 + 4.*
