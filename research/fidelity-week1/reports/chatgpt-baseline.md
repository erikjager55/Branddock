# F-VAL — ChatGPT-vanille Baseline

> Datum: 2026-05-05
> Status: GPT-4o data compleet (3/3). GPT-5 connection errors — retry later.
> Detector: v2 met softness-labels + uitgebreide tell-definities (na detectie blinde vlekken bij eerste meting).

---

## 1. Methode

Drie briefings (BB / Linfi / WRA case-study) door GPT-4o gegenereerd met:
- System prompt: *"You are an experienced content writer producing long-form business content. Aim for 2700-3300 words."*
- User prompt: alleen de briefing tekst, geen Brand Foundation-context, geen Human Voice Directive
- Geen retries, geen post-processing

Doel: ceiling op de mens↔AI schaal. Wat krijgt een prospect die ChatGPT direct bevraagt zonder Branddock?

---

## 2. Resultaten

### GPT-4o vanille

| Merk | Words | Score/1k | Position | Verdict |
|------|-------|----------|----------|---------|
| Better Brands | 915 | 42.1 | 42 | **AI_LEANING** |
| Linfi | 827 | 58.0 | **58** | **PURE_AI** |
| WRA Juristen | 836 | 16.7 | 17 | HUMAN_BASELINE (uitlier) |

**Gemiddelde**: pos 39, range 17-58.
**Zonder WRA-uitlier**: pos 50, op de PURE_AI grens.

### Output-lengte issue (apart signaal)

GPT-4o produceert structureel **800-915 woorden** bij briefings die om 2700-3300 vragen — slechts ~30% van target. Dat is **óók een tell**: ChatGPT vanille levert ondervolg-aantal content in lange-vorm settings.

Voor demo: dit is een tweede dimensie van demo-belofte. Niet alleen *"meetbaar menselijker"* maar ook *"levert volledige briefings, niet versies van 1/3 lengte"*.

### GPT-5 vanille — niet succesvol

3/3 GPT-5 calls eindigden in connection errors. Mogelijke oorzaken: rate limit, max_completion_tokens 8000 te hoog, OpenAI-side issue. Niet kritiek voor demo (GPT-4o is wat de meeste prospects gebruiken), maar nice-to-have voor range-meting. Retry later.

---

## 3. Volledige demo-curve (alle datapunten)

```
TOP_TIER     HUMAN_BASELINE         AI_LEANING        PURE_AI
   |              |                     |                |
   0──────12─────30────────────────────50──────────────100
   ↑ Erik 2021 (mens, top) ~6
              ↑ Erik 2020 (mens, gem) ~16
              ↑ ChatGPT WRA ~17 (uitlier)
              ↑ Branddock WRA-A ~19
              ↑ Branddock BB-A + HVD ~20
                ↑ Branddock Linfi-A ~28
                       ↑ Branddock BB-A (geen HVD) ~35
                              ↑ ChatGPT BB ~42
                                       ↑ ChatGPT Linfi ~58
```

---

## 4. Demo-belofte gemeten

Drie variabelen voor side-by-side prospect-demo:

### Variabele 1: Tell-density (positie op schaal)

| Setup | Pos | Verdict |
|-------|-----|---------|
| ChatGPT vanille (zonder Branddock) | **39** (gem.) | AI_LEANING / PURE_AI |
| Branddock vanille (BVD only) | **27** (gem.) | HUMAN_BASELINE |
| Branddock + Human Voice Directive | **20** | HUMAN_BASELINE (mens-baseline range) |
| Erik's gepubliceerde mens-werk | **11** (gem.) | TOP_TIER / HUMAN_BASELINE |

**Verschil ChatGPT → Branddock+HVD**: −19 positiepunten naar menselijke baseline.

### Variabele 2: Output-lengte

- ChatGPT vanille: 800-915 woorden bij briefing voor 3000 (30%)
- Branddock: 2820-3030 woorden (target gehaald)

### Variabele 3: Brand-fit

(Niet gemeten in deze ronde, maar onderdeel van pijler 2 G-Eval rubric — komt in week 4-5)

---

## 5. Risico's + caveats

1. **WRA GPT-4o uitlier (pos 17)** — niet alle ChatGPT-output is even slecht. Demo moet eerlijk zijn: "ChatGPT scoort tussen pos 17 en 58, gemiddeld pos 39. Branddock+HVD consistent ~pos 20."
2. **Detector heeft nog blinde vlekken** — zelfs versie-2 mist patronen. Aanvullende patronen vereisen iteratie tijdens pilot.
3. **Lengte-effect** — kortere outputs hebben minder absolute tells maar tell-density (per 1000 woorden) blijft een fair signaal.
4. **GPT-5 onbekend** — connection errors moeten opgelost worden voor volledige range-meting. Mogelijk levert GPT-5 met reasoning betere baseline (lager pos), wat het verschil kleiner maakt.

---

## 6. Conclusie voor F-VAL implementatie

Demo-curve klopt empirisch met drie dataknopen:
- **Mens-baseline**: 6-16 (Erik's eigen werk)
- **Branddock+HVD**: 20 (gepositioneerd in mens-baseline range)
- **ChatGPT vanille**: 39 gemiddeld, tot 58 in worst case

Geeft demo-verhaal een meetbare onderbouwing:
> *"Met de Human Voice Directive levert Branddock content die in dezelfde range scoort als uw eigen gepubliceerde werk. ChatGPT vanille zit gemiddeld 19 positiepunten verder naar pure AI — én levert maar 30% van de gevraagde lengte."*

---

## 7. Volgende stappen

- Retry GPT-5 calls (niet kritiek; nice-to-have)
- Detector v3: aanvullende patronen aan blinde vlekken (parallel aan pilot-feedback)
- Start week 2 implementatie (Track 1 + 4)

*Status: baseline gemeten, demo-curve onderbouwd. Klaar voor week 2 start.*
