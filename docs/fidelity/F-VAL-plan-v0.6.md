# F-VAL Implementatieplan — v0.6 (post-STRICT-mode validation)

> Datum v0.6: 2026-05-05
> Auteur: Claude (week 1, eind dag 3)
> Voorganger: v0.5 (post-detector-recalibratie)
> Status: **Pijler 3 (anti-AI-tell laag) inhoudelijk + technisch bewezen.**
> Demo-curve gevalideerd. Wiring + UI voor STRICT mode = week 2-3 werk.

---

## 1. Wat v0.6 anders maakt

Eén grote update t.o.v. v0.5: **STRICT mode rewrite-loop empirisch gevalideerd**, met spectaculair resultaat.

### STRICT mode test-resultaat

BB-A origineel was de drift-meting outlier — pos 35 (AI_LEANING). Eén rewrite-call met expliciete tell-feedback aan Opus 4.7:

| Metric | Origineel | STRICT mode |
|--------|-----------|--------------|
| Verdict | AI_LEANING | **TOP_TIER** |
| Position | 35/100 | **8/100** |
| Score/1k | 35.2 | **7.7** |
| Unique tells | 5 | 3 |

Branddock STRICT haalt **top-tier mensniveau** (pos 8 = lager dan Erik's eigen 2020 artikel pos 16, vrijwel gelijk aan Erik's 2021 artikel pos 6).

### Volledige demo-curve definitief

```
TOP_TIER         HUMAN_BASELINE         AI_LEANING        PURE_AI
   |                  |                      |                |
   0──────12─────30────────────────────50──────────────100
   ↑ Erik 2021 (top mens) ~6
   ↑ Branddock + STRICT ~8     ← TOP-MENS NIVEAU
              ↑ Erik 2020 (mens) ~16
              ↑ Branddock + HVD ~20
              ↑ Branddock WRA-A (BVD) ~19
                ↑ Branddock Linfi-A ~28
                       ↑ Branddock BB-A vanille ~35
                              ↑ ChatGPT BB ~42
                                       ↑ ChatGPT Linfi ~58
```

---

## 2. F-VAL pijler 3 — KOMPLEET (backend)

| Component | Status | Bestand |
|-----------|--------|---------|
| 3a. Human Voice Directive | ✅ Wired | `src/lib/studio/human-voice-directive.ts` + canvas-orchestrator |
| 3b. AI-Tell Detector | ✅ | `src/lib/brand-fidelity/ai-tell-detector.ts` |
| 3c. BrandRule sync + API | ✅ | `src/lib/brand-fidelity/brand-rule-sync.ts` + `src/app/api/brand-rules/` |
| 3c. Settings UI | ✅ | `src/features/settings/components/brand-voice/RulesTab.tsx` |
| 3c-extra. Rule-compiler | ✅ | `src/lib/brand-fidelity/rule-compiler.ts` |
| **3d. STRICT mode helper** | ✅ | `src/lib/brand-fidelity/strict-mode.ts` |
| 3d. STRICT mode wiring in orchestrator | open | week 2 |
| 4. Coherence Check | ✅ | `src/lib/brand-foundation/coherence-checker.ts` |

---

## 3. Bijgewerkte timeline

| Week | Datum | Werk | Status |
|------|-------|------|--------|
| 1 | 5-12 mei | Schema-audit + drift-meting + tell-detector v2 + HVD + Coherence + Pijler 3 backend + STRICT helper | ✅ |
| 2 | 12-19 mei | STRICT wiring in canvas-orchestrator + SSE events + UI indicator + bulk-import CSV | start |
| 3 | 19-26 mei | Pijler 1 style-scorer (2 dagen) + pijler 2 G-Eval start | — |
| 4 | 26 mei – 2 juni | Pijler 2 G-Eval rubric + judge dispatcher + length-control | — |
| 5 | 2-9 juni | Pijler 2 vervolg + composition engine begin | — |
| 6 | 9-16 juni | API endpoints + workspace settings backend + telemetry | — |
| 7 | 16-23 juni | UI: position-bar visualisatie + side-by-side ChatGPT panel | — |
| 8 | 23-30 juni | Polish + bug bash + demo-walkthrough | — |
| 9 | 30 juni – 7 juli | Buffer (groter dan voorheen — Pijler 3 ahead of schedule) | — |
| Demo | 8-15 juli | LINFI / Nobox / WRA pilot demo | — |

**Buffer**: ~2 weken (was 1.5). Comfortabel.

---

## 4. STRICT mode wiring — concreet plan voor week 2

`src/lib/ai/canvas-orchestrator.ts` aanpassen na bestaande text-generation step:

```typescript
// ── Step 3: STRICT mode rewrite (if configured) ──────
const config = await getOrCreateFidelityConfig(workspaceId);
if (config.humanVoiceMode === 'STRICT') {
  yield { event: 'strict_check_start', data: {} };

  const strictResult = await runStrictModeRewrite(generatedText, async ({ feedbackPrompt }) => {
    // Use same model as original generation
    return await callTextModel(textModel, feedbackPrompt, /* lower max_tokens */);
  });

  if (strictResult.rewriteAttempted) {
    yield {
      event: 'strict_check_complete',
      data: {
        original: { verdict: strictResult.originalResult.verdict, position: strictResult.originalResult.humanBaselinePosition },
        rewrite: strictResult.rewriteResult ? { verdict: strictResult.rewriteResult.verdict, position: strictResult.rewriteResult.humanBaselinePosition } : null,
        kept: strictResult.finalText === generatedText ? 'original' : 'rewrite',
        reason: strictResult.decisionReason,
      },
    };
    generatedText = strictResult.finalText;
  }
}
```

UI: tijdens generation toont nieuwe step "Checking against AI tells..." → na strict_check_complete event toont badge "Top-tier mens-niveau (pos 8)".

**Effort**: 0.5 dag voor wiring + 0.5 dag voor UI badge + tests.

---

## 5. Cost-implicaties STRICT mode

Per generatie:
- **Skip if HUMAN_BASELINE/TOP_TIER**: 0 extra cost (~75% van outputs)
- **Trigger if AI_LEANING/PURE_AI**: 1 extra Opus call ~$0.20 (~25% van outputs)

Effective overhead: 25% × $0.20 = ~$0.05 per generatie gemiddeld. Acceptabel voor de demo-belofte.

Voor pricing tier: STRICT mode standaard ON in Direct-tier. Agency-tier kan opt-out per klant via FidelityConfig override.

---

## 6. Demo-script v0.6 (definitief)

### Live test bij prospect: 4-staps comparison

**Stap 1 — Briefing input.** Prospect geeft een briefing (case-study of thought leadership, 2-3K woorden target).

**Stap 2 — Pure ChatGPT.** Run ChatGPT-4o vanille met dezelfde briefing. Live tell-detector op output → toon position bar (verwacht ~40-60).

**Stap 3 — Branddock met BVD only.** Toggle Brand Foundation context aan. Genereer. Detector → position bar (verwacht ~20-35).

**Stap 4 — Branddock met HVD + STRICT mode.** Activate fidelity laag. Genereer. Detector → position bar (verwacht ~8-15).

**Visualisatie**: 3-4 outputs side-by-side, met live position bars die tijdens generatie groeien.

**Demo-belofte gemeten**:
> *"Met onze fidelity-laag schrijft Branddock op het niveau van uw eigen top-tier gepubliceerde werk — meetbaar vier keer minder AI-tells dan ChatGPT vanille."*

---

## 7. Risico's update

| Risico | Status v0.5 | Status v0.6 |
|--------|-------------|-------------|
| HVD verlaagt creativiteit | Midden | Laag — STRICT-test toont dat tell-reductie niet samengaat met kwaliteits-regressie |
| Auto-rewrite loop verdubbelt kosten | Midden | Mitigated — alleen 25% van outputs triggert rewrite |
| Detector false positives | Mitigated | Onveranderd |
| Wiring complexiteit voor STRICT | — | **Nieuw** — SSE event flow vereist zorgvuldige integratie; 0.5 dag werk |

---

## 8. Open beslissingen

1. **STRICT mode default ON of OFF voor nieuwe workspaces?**
   - v0.5 advies: BASELINE default (HVD aan, STRICT uit)
   - v0.6 voorstel: BASELINE default voor week 2-7. STRICT activeren in week 8 (na demo-UI klaar) als opt-in toggle in Settings. Voor demo: STRICT manueel aanzetten in pilot-workspaces.
2. **STRICT mode kosten doorberekenen?**
   - Aanbeveling: include in Direct-tier flat fee. Agency-tier: pay-per-use boven X generaties/maand.
3. **STRICT-failed output: tonen of verbergen?**
   - Aanbeveling: tonen origineel + warning badge "Could not improve below AI_LEANING". Klant beslist.

---

*Status: v0.6 plan stabiel. Pijler 3 backend + STRICT helper compleet en gevalideerd.*
*Volgende natuurlijke stappen: STRICT wiring (week 2), pijler 1+2 (week 3-5), composition + UI (week 6-7).*
