# F-VAL Demo Browser QA Checklist

> Visuele verificatie van het complete F-VAL demo-flow. **Backend is volledig geverifieerd via DB smoke tests** (test-runner-db-smoke.ts + test-strict-mode-db-smoke.ts) — deze checklist dekt UI rendering, SSE event flow, en interaction states.
>
> Demo deadline: 8-15 juli 2026 (LINFI / Nobox / WRA pilots).

## Setup

```bash
# Terminal 1
cd ~/Projects/branddock-app
npm run dev

# Terminal 2 — verify env
grep ANTHROPIC_API_KEY .env.local
grep OPENAI_API_KEY .env.local
```

Login: `erik@branddock.com` / `Password123!`

Workspace: **Branddock Demo** (`demo-workspace-branddock-001`)

## Pre-flight DB state

Optioneel — zet de demo workspace in STRICT mode om de rewrite-flow te zien:

```sql
UPDATE "FidelityConfig"
SET "humanVoiceMode" = 'STRICT'
WHERE "workspaceId" = 'demo-workspace-branddock-001';
```

(Of via `prisma studio` → FidelityConfig → demo workspace → set humanVoiceMode = STRICT)

Na de test-sessie terugzetten naar `BASELINE`.

## Flow 1 — Basic fidelity score (BASELINE mode)

1. Navigeer naar Campaigns → kies een campaign → open een blog-post deliverable in Canvas
2. Stap door naar Step 2 (Content Variants) en klik **Generate**
3. Tijdens streaming:
   - [ ] Tekst variants verschijnen progressief
4. Direct na text_complete (~5ms):
   - [ ] **Position-bar verschijnt** boven de variant tabs
   - [ ] Bar toont 4 zones (emerald 0-12% / teal 12-30% / amber 30-50% / red 50-100%)
   - [ ] Position-pin staat op detector verdict positie (zwart, witte ring, schaduw)
   - [ ] Verdict label rechtsonder ("Top-tier menselijk" / "Mens-baseline" / etc.)
   - [ ] Header toont "composite berekenen…" met spinner
5. Na ~20s (composition):
   - [ ] Composite badge rechts (X/100)
   - [ ] Threshold indicator (groen "boven drempel" of amber "onder drempel")
   - [ ] Spinner verdwijnt, header toont "berekend in Xs"
   - [ ] Per-pijler breakdown collapsible: 3 chips (Pijler 1 / 2 / 3)
   - [ ] Skipped pijlers (typisch pijler 1 in demo workspace) tonen "n.v.t." in plaats van 0
6. Klik op "Per-pijler breakdown" toggle:
   - [ ] Chevron flipt up/down
   - [ ] Chips collapsen/uitklappen

## Flow 2 — Vergelijk met vanille ChatGPT

> Vereist een deliverable met `settings.brief.objective` ingevuld. Als brief leeg is geeft endpoint 400.

1. Met fidelityScore complete:
   - [ ] CTA "Vergelijk met vanille ChatGPT" zichtbaar onder pillar breakdown
2. Klik de CTA:
   - [ ] Loading state: "Vanille ChatGPT genereert…"
   - [ ] Daarna: "Composite berekenen…"
3. Na ~30-60s (totale flow):
   - [ ] **Delta hero** verschijnt — emerald box als Branddock wint, amber als ChatGPT wint
   - [ ] "+XX punten" prominent in groot getal
   - [ ] "X stappen menselijker" / "X stappen meer AI" rechts
   - [ ] **Twee score-mini cards** naast elkaar (Branddock teal-tinted, vanille gray)
   - [ ] Beide hebben mini position-bars met pin
4. Edge case — error pad:
   - Stop dev server tijdens vanilla call
   - [ ] Error state met rode banner + "Opnieuw proberen" knop

## Flow 3 — STRICT mode rewrite (humanVoiceMode = STRICT)

> Zet eerst FidelityConfig.humanVoiceMode = STRICT (zie pre-flight). Werkt alleen als detector verdict AI_LEANING/PURE_AI is — voor BASELINE outputs van Branddock kan het nodig zijn een minder-strenge brief te gebruiken.

1. Genereer een nieuwe variant (zoals Flow 1).
2. Na composition complete + verdict AI_LEANING:
   - [ ] Direct na fidelity_score_complete verschijnt **violet running-banner**: "STRICT mode aan het herschrijven…"
   - [ ] Spinner draait, beschrijving "Verdict was AI-leunend — Branddock verbetert de output automatisch"
3. Na ~30-60s (rewrite + re-score):
   - [ ] **Improved badge** vervangt running banner
   - [ ] Verdict transition zichtbaar: "AI-leunend (pos 35) → Mens-baseline (pos 19)" of vergelijkbaar
   - [ ] **Composite badge boven verschijnt geüpdatet** met nieuwe (hogere) waarde
   - [ ] Position-pin op de hoofd-bar verschuift naar links (richting menselijker)
4. Klik "Bekijk STRICT-verbeterde versie":
   - [ ] Panel klapt open
   - [ ] Toont rewrite tekst (eerste ~1500 chars) in monospace blok
   - [ ] Scrollbaar als content lang is
   - [ ] "Verberg" toggle werkt

## Flow 4 — Regenerate behavior

1. Met fidelityScore complete, klik regenerate of pas feedback toe op een variant
2. Direct bij regeneratie-start:
   - [ ] Position-bar verdwijnt (resetFidelityScore + resetStrictRewrite + resetVanillaBaseline)
3. Na nieuwe text_complete:
   - [ ] Bar verschijnt opnieuw met fresh state
   - [ ] Geen "stale" oude scores zichtbaar

## Flow 5 — Persistence verification

1. Na succesvolle generation, refresh de pagina (Cmd+R)
2. Open Prisma Studio of psql:
   ```sql
   SELECT id, settings->'fidelityScore' as score, settings->'strictRewrite' as strict
   FROM "Deliverable"
   WHERE id = '<deliverable-id>';
   ```
3. Verify:
   - [ ] `fidelityScore` JSON aanwezig met composite/threshold/verdict/pillars/scoredAt
   - [ ] `scorerVersion` = "composition-engine-v1.0"
   - [ ] (Indien STRICT triggerde) `strictRewrite` JSON met text/before/after/rewrittenAt

## Bekende beperkingen

- **Variant content zelf wordt NIET geüpdatet door STRICT** — de rewrite tekst leeft naast de originele variants. Demo-script: "De score reflecteert wat STRICT zou produceren; je kunt de versie zien via de toggle." Volledige variant-replacement is een latere stap.
- **Vanilla baseline vereist brief.objective** — als deliverable geen brief heeft krijg je 400. Demo-data check vooraf.
- **STRICT runtime ~30-60s** — Sonnet rewrite + re-scoring duurt lang. Tijdens demo: praat door de wait.
- **Pijler 1 (style) staat vaak op n.v.t.** — demo workspace heeft geen ingevulde BrandPersonality. Voor BB/LINFI/WRA pilots: vul `wordsWeUse` + `personalityTraits` in via Brand Foundation.

## Demo-script aanbevolen volgorde

1. Open Canvas, klik Generate (~30s wait)
2. **"Hier is de Branddock-output. Branddock geeft direct een fidelity-score: 75/100, boven drempel."**
3. Klik "Vergelijk met vanille ChatGPT" (~30-60s wait, "ondertussen…")
4. **"Zelfde brief naar GPT-4o zonder Branddock-context: 40/100. +35 punten verschil. Meetbaar."**
5. (Optional) Toggle pijler breakdown: **"Drie pijlers: brand voice, AI-judge rubric, anti-tell + rules. Allemaal apart gemeten."**
6. (Indien STRICT mode aan) Wijs op de violet badge: **"En als de output toch te AI-leunend is, schrijft Branddock automatisch om. Hier zie je 'AI-leunend → Mens-baseline'."**

## Issues to flag tijdens QA

Tijdens je QA-doorloop, leg vast:
- Visuele bugs (alignment, kleurmismatch, overflow)
- Interaction issues (knop niet werkbaar, state sticky)
- Performance (langer dan verwacht, jank tijdens streaming)
- Tailwind 4 purge: zijn alle violet/teal/amber/emerald/red kleuren correct gerenderd?

Plaats elk issue als TODO in dit bestand of als git issue.
