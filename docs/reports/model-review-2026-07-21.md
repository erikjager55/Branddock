# LLM-modellen-review — 2026-07-21

> Aanleiding: Erik (2026-07-21): "De afgelopen periode zijn er betere modellen bijgekomen die wellicht bij kunnen dragen aan een hogere kwaliteit van de output." Dit rapport is de inventarisatie + het uitgevoerde fase-1-besluit; fase 2 (judges) volgt met kalibratie.

## Bevindingen vooraf

1. **Fragmentatie over drie generaties.** 60+ hardcoded model-referenties verspreid over ~45 bestanden naast het centrale register (`src/lib/ai/feature-models.ts`, 33 features): Sonnet 4/4.5/4.6 door elkaar, `gpt-4o` naast `gpt-5.4`, `dall-e-3` naast `gpt-image-2`, `gemini-2.5-flash` naast `gemini-3.1-pro-preview`.
2. **Actieve breuk**: Google heeft `gemini-3.1-flash-lite-preview` én `gemini-3-pro-preview` **uitgezet** (shut down volgens de [officiële modellenpagina](https://ai.google.dev/gemini-api/docs/models)) — beide stonden nog in code/pickers. Calls daarnaartoe falen.
3. **Prijstabellen liepen achter**: `model-pricing.ts` en de brandclaw-`cost-calculator` kenden de nieuwe generatie niet (kosten-attributie viel terug op fallbacks) en hadden een first-match-ordering-bug (lite-varianten onbereikbaar).

## Landschap juli 2026 (geverifieerd)

- **Anthropic**: Claude Opus 4.8 (overall-leider), Claude Sonnet 5 (nieuw default-werkpaard, 30 juni), Claude Fable 5 (topmodel Claude 5-familie, 1 juli), Haiku 4.5 (huidige kleine). Bron: [felloai.com](https://felloai.com/best-ai-models/), [lmcouncil.ai](https://lmcouncil.ai/benchmarks).
- **OpenAI**: GPT-5.6-familie GA sinds 9 juli — `gpt-5.6` (alias sol, $5/$30), `gpt-5.6-terra` ($2.50/$15), `gpt-5.6-luna` ($1/$6); 1,05M context. Bron: [tldl.io](https://www.tldl.io/resources/openai-api-pricing), [devtk.ai](https://devtk.ai/en/blog/openai-api-pricing-guide-2026/).
- **Google**: `gemini-3.1-pro-preview` blijft de sterkste (nog geen GA-id); flash-tier: `gemini-3.5-flash` (stable) en `gemini-3.1-flash-lite` (stable). Bron: [ai.google.dev/models](https://ai.google.dev/gemini-api/docs/models).

## Fase 1 — uitgevoerd (deze PR)

Mapping toegepast op alle **generatie-paden** (45 bestanden, incl. register-defaults, beide pickers, campagne-chain, canvas-routing, agents, exploration, knowledge-research, brandstyle-analyse, persona-chat, trend-radar):

| Oud | Nieuw |
|---|---|
| claude-sonnet-4 / 4.5 / 4.6 (alle datumvarianten) | **claude-sonnet-5** |
| claude-opus-4.5 / 4.6 / 4.7 | **claude-opus-4-8** |
| gpt-5.4(-pro) | **gpt-5.6** |
| gpt-5.4-mini/nano, gpt-4o-mini, gpt-4.1-mini/nano | **gpt-5.6-luna** |
| gpt-4o, gpt-4.1 | **gpt-5.6-terra** |
| gemini-2.5-flash | **gemini-3.5-flash** |
| gemini-2.5-flash-lite, gemini-3.1-flash-lite-preview (shut down) | **gemini-3.1-flash-lite** |
| gemini-3-pro-preview (shut down) | **gemini-3.1-pro-preview** |
| claude-haiku-4-5, gemini-3.1-pro-preview, gpt-image-2, gen4.5 | ongewijzigd (actueel) |

Plus: `claude-fable-5` toegevoegd aan de developer-picker (premium-optie, zelfde prijstier als Opus), prijstabellen bijgewerkt (GPT-5.6-prijzen, ordering-fix, legacy-entries behouden voor workspaces met oude overrides).

## Bewust NIET aangeraakt (fase 2 / nooit)

1. **F-VAL-judges** (`src/lib/brand-fidelity/judge-dispatcher.ts`: gpt-5 + claude-sonnet-4-6) en **vanilla-baseline** (de pilot-vergelijkingsmeting): een judge-swap verschuift álle merkscores en de +7-pilotclaim. Fase 2 = golden-set-vergelijking oud vs. nieuw draaien (promptfoo-gate bestaat), drempels herkalibreren, dán pas omzetten.
2. **Embeddings** (`text-embedding-3-small`): wisselen maakt alle opgeslagen pgvector-centroids ongeldig — alleen ooit met her-embedding-migratie.
3. **`dall-e-3`-restanten** in beeldpaden: API-parameters verschillen van gpt-image-2; apart afwegen in de beeld-review (samen met de AI-trainer-ombouw).

## Fase 2 — F-VAL-judges (uitgevoerd 2026-07-21, PR #228)

Gepaarde kalibratie op een vast 10-teksten-corpus (on-brand NL → generiek → AI-slop → off-brand hype), identieke rubric-context (HQ-voice-baseline uit dev-DB + detector-output), oude vs. nieuwe judge (`scripts/experiments/judge-calibration-2026-07.ts`):

| Judge-familie | Swap | Δ gem (pijler 2) | Composite-effect (×0,45) | Besluit |
|---|---|---|---|---|
| OpenAI (judged Anthropic-generators) | gpt-5 → gpt-5.6 | +1,2 | **+0,5** | swap, drempels ongewijzigd |
| Anthropic (judged OpenAI-generators) | claude-sonnet-4-6 → claude-sonnet-5 | −4,0 | **−1,8** | swap, drempels ongewijzigd (binnen ±2-band) |

Opvallend: Sonnet 5 discrimineert scherper — AI-slop zakt tot −18 terwijl on-brand-teksten vrijwel gelijk scoren; het onderscheidend vermogen (spread on-brand↔slop) blijft ~51 punten. Mee omgezet: visual-judge (sonnet-4.5 → sonnet-5; advisory badge-pad, geen publish-gate — zonder beeld-kalibratie, monitoren) en de STRICT-rewrite-generator. **Bewust bevroren**: `vanilla-baseline` op gpt-4o — dat is het meetinstrument onder de +7-pilotclaim; een baseline-swap verandert de claim en is een productbesluit (zie nazorg).

## Risico's / nazorg

- Workspaces met een per-feature override op een oud model-id blijven dat id gebruiken tot de provider het uitzet; de nieuwe pickers tonen alleen de verse lijst. Check `WorkspaceAiConfig`-rijen bij klachten.
- `gemini-3.1-pro-preview` is preview: bij een GA-release het id updaten.
- Prijzen Sonnet 5 / Fable 5 aangenomen op resp. Sonnet-/Opus-tier — verifiëren bij de eerste factuur.
- De nachtelijke promptfoo-golden-set kan verschuiven door de generator-swap (pre-existing flaky, zie gotcha) — gecheckt na merge #226: 6/10 (60%), exact dezelfde score als de fails van 17-07 en 20-07 vóór de swap → geen regressie.
- **Productbesluit Erik (open)**: vanilla-baseline moderniseren (gpt-4o → gpt-5.6)? Verandert de +7-pilotclaim-vergelijking — alleen doen met een her-meting en nieuwe claim.
