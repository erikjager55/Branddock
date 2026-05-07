# Plan: 3-Variant Strategy + Deep Thinking

## Samenvatting

Uitbreiding van de campaign strategy pipeline van **2 naar 3 parallelle varianten** (Claude Opus 4.6, GPT-5.4, Gemini 3 Pro), allemaal met **deep thinking** ingeschakeld. Hetzelfde geldt voor creatieve concepten (hooks). De synthesizer combineert vervolgens het beste uit 3 varianten.

---

## Huidige Staat

| Stap | Model | Functie |
|------|-------|---------|
| 1a Variant A (Evidence-Based) | Claude Sonnet 4.5 (configureerbaar) | Strategie + Architectuur |
| 1b Variant B (Creative) | Gemini 3.1 Pro (configureerbaar) | Strategie + Architectuur |
| 2 Persona Validation | Zelfde als Variant A | Evalueer A vs B |
| 3 Synthesis | Claude Opus 4.6 (hardcoded) | Combineer A+B |
| 4 Channel Planner | Gemini 2.5 Flash | Kanaalplan |
| 5 Asset Planner | Gemini 2.5 Flash | Deliverables |

**Resultaat:** 2 varianten → synthesized → kanaal + assets

## Nieuwe Staat

| Stap | Model | Deep Thinking | Functie |
|------|-------|---------------|---------|
| 1a Variant A (Evidence-Based) | **Claude Opus 4.6** | `extended_thinking` budget 10K | Strategie + Architectuur |
| 1b Variant B (Creative Provocateur) | **GPT-5.4** | `reasoning_effort: high` | Strategie + Architectuur |
| 1c Variant C (Data-Driven Innovator) | **Gemini 3 Pro** | `thinkingConfig` budget 10K | Strategie + Architectuur |
| 2 Persona Validation | Claude Opus 4.6 | `extended_thinking` budget 8K | Evalueer A vs B vs C |
| 3 Synthesis | Claude Opus 4.6 | `extended_thinking` budget 12K | Combineer A+B+C |
| 4 Channel Planner | Gemini 2.5 Flash | Nee | Kanaalplan |
| 5 Asset Planner | Gemini 2.5 Flash | Nee | Deliverables |

**Resultaat:** 3 varianten → synthesized → kanaal + assets

---

## Wijzigingen per Bestand

### Stap 1: AI Caller Infrastructure — Deep Thinking Support
**Bestanden:** `src/lib/ai/exploration/ai-caller.ts`, `src/lib/ai/gemini-client.ts`

#### 1.1 `ai-caller.ts` — `ClaudeCompletionOptions` uitbreiden
```typescript
interface ClaudeCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  // NEW: Extended thinking
  thinking?: { type: 'enabled'; budgetTokens: number };
}
```

In `createClaudeStructuredCompletion()`:
- Als `options.thinking` aanwezig, voeg `thinking` toe aan de Anthropic API call
- Bij extended thinking: temperature MOET undefined zijn (Anthropic vereiste)
- Parse response: filter `thinking` blocks eruit, pak alleen `text` block
- Verhoog timeout default naar 600s als thinking enabled (denken + genereren duurt langer)

#### 1.2 `ai-caller.ts` — `StructuredCompletionOptions` uitbreiden
```typescript
interface StructuredCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  responseSchema?: Record<string, unknown>;
  // NEW: Deep thinking per provider
  thinking?: {
    anthropic?: { budgetTokens: number };
    openai?: { reasoningEffort: 'low' | 'medium' | 'high' };
    google?: { thinkingBudget: number };
  };
}
```

In `createStructuredCompletion()`:
- Route `thinking.anthropic` → Claude extended_thinking
- Route `thinking.openai` → OpenAI `reasoning_effort` parameter
- Route `thinking.google` → Gemini `thinkingConfig`

#### 1.3 `ai-caller.ts` — OpenAI completion met reasoning support
In de OpenAI branch van `createStructuredCompletion()`:
- Als `thinking.openai` aanwezig, voeg `reasoning_effort` toe
- Temperature: als reasoning enabled, zet op 1 (OpenAI vereiste voor reasoning)

#### 1.4 `gemini-client.ts` — `GeminiCompletionOptions` uitbreiden
```typescript
export interface GeminiCompletionOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Record<string, unknown>;
  timeoutMs?: number;
  // NEW: Thinking config
  thinkingConfig?: { thinkingBudget: number };
}
```

In `createGeminiStructuredCompletion()`:
- Als `thinkingConfig` aanwezig, voeg toe aan `config` object
- Verhoog default timeout naar 600s als thinking enabled

---

### Stap 2: Derde Prompt Perspectief — Variant C
**Bestand:** `src/lib/ai/prompts/campaign-strategy.ts`

#### 2.1 Nieuwe functie: `buildFullVariantCPrompt()`
**Perspectief: "Data-Driven Innovator"** — combineert alle enrichment bronnen (Are.na + Exa + Scholar + BCT) en focust op:
- Data-gedreven consumenteninsights met cross-industry analogieën
- Category Entry Point (CEP) maximalisatie (Byron Sharp)
- Behavioral Nudge Architecture (Thaler & Sunstein)
- Mental Availability + Physical Availability (Sharp's "How Brands Grow")
- Platform-native channel strategie (content dat past bij het platform)

Dit is een onderscheidend derde perspectief dat **alle enrichment data** krijgt (waar Variant A alleen scholar+bct+arena en Variant B alleen exa+arena krijgt), plus een uniek strategisch kader.

Enrichment data:
- arenaContext ✓
- exaContext ✓
- scholarContext ✓
- bctContext ✓

---

### Stap 3: Strategy Chain — 3 Varianten
**Bestand:** `src/lib/campaigns/strategy-chain.ts`

#### 3.1 Constants updaten
```typescript
const CLAUDE_OPUS = 'claude-opus-4-6';
const GPT_54 = 'gpt-5.4';
const GEMINI_3_PRO = 'gemini-3-pro-preview';
```

#### 3.2 `generateStrategyVariants()` uitbreiden
- Resolve 3 models: `campaign-strategy` (A), `campaign-strategy-b` (B), `campaign-strategy-c` (C)
- Overschrijf resolved models met hardcoded deep thinking modellen:
  - A: Claude Opus 4.6 + extended_thinking
  - B: GPT-5.4 + reasoning_effort: high
  - C: Gemini 3 Pro + thinkingConfig
- Run alle 3 parallel via `Promise.all()`
- Bouw `buildFullVariantCPrompt()` met alle enrichment data
- Normaliseer alle 3 varianten met `normalizeArchitectureLayer()`
- Return `VariantPhaseResult` met A+B+C data

#### 3.3 Persona Validation op 3 varianten
- `buildPersonaValidatorPrompt()` krijgt strategyLayerC + variantC
- PreferredVariant uitbreiden naar `'A' | 'B' | 'C'`
- Score berekening: 3-variant voting

#### 3.4 Synthesis uit 3 varianten
- `buildStrategySynthesizerPrompt()` krijgt alle 3 varianten
- System prompt: "Combineer het beste uit 3 varianten"
- Deep thinking enabled voor de synthesizer

#### 3.5 `generateCampaignBlueprint()` updaten
Zelfde wijzigingen als 3.2-3.4 maar voor de non-wizard pipeline.

---

### Stap 4: Prompt Updates voor 3 Varianten
**Bestand:** `src/lib/ai/prompts/campaign-strategy.ts`

#### 4.1 `buildPersonaValidatorPrompt()` — 3 varianten evalueren
- Params uitbreiden: `strategyLayerC`, `variantC`
- System prompt: evalueer A (evidence-based), B (creative provocateur), C (data-driven innovator)
- preferredVariant: `"A"`, `"B"`, of `"C"`

#### 4.2 `buildStrategySynthesizerPrompt()` — 3 varianten synthetiseren
- Params uitbreiden: `strategyLayerC`, `variantC`, `variantCScore`
- User prompt: toon alle 3 varianten + scores
- Instructie: "Pick the strongest elements from ALL THREE variants"

---

### Stap 5: Types Updaten
**Bestand:** `src/lib/campaigns/strategy-blueprint.types.ts`

#### 5.1 `PreferredVariant` uitbreiden
```typescript
export type PreferredVariant = 'A' | 'B' | 'C';
```

#### 5.2 `VariantPhaseResult` uitbreiden
```typescript
export interface VariantPhaseResult {
  strategyLayerA: StrategyLayer;
  strategyLayerB: StrategyLayer;
  strategyLayerC: StrategyLayer;      // NEW
  variantA: ArchitectureLayer;
  variantB: ArchitectureLayer;
  variantC: ArchitectureLayer;         // NEW
  personaValidation: PersonaValidationResult[];
  variantAScore: number;
  variantBScore: number;
  variantCScore: number;               // NEW
  arenaEnrichment: ArenaEnrichmentTracking | null;
}
```

#### 5.3 `CampaignBlueprint` uitbreiden
```typescript
variantCScore: number;                 // NEW
```

#### 5.4 `GenerateBlueprintBody` & `SynthesizeBlueprintBody` uitbreiden
Voeg C-variant velden toe.

#### 5.5 Zod schemas updaten
- `personaValidationSchema`: `preferredVariant: z.enum(['A', 'B', 'C'])`
- `campaignBlueprintSchema`: add `variantCScore`

---

### Stap 6: Feature Models — Default Models Updaten
**Bestand:** `src/lib/ai/feature-models.ts`

#### 6.1 Default models voor strategy varianten
```typescript
// campaign-strategy (Variant A)
defaultProvider: 'anthropic',
defaultModel: 'claude-opus-4-6',          // Was: claude-sonnet-4-5

// campaign-strategy-b (Variant B)
defaultProvider: 'openai',
defaultModel: 'gpt-5.4',                  // Was: gemini-3.1-pro

// campaign-strategy-c (Variant C)
defaultProvider: 'google',
defaultModel: 'gemini-3-pro-preview',      // Was: gpt-5.4
```

---

### Stap 7: Wizard Store Updaten
**Bestand:** `src/features/campaigns/stores/useCampaignWizardStore.ts`

#### 7.1 State uitbreiden
```typescript
// Phase A results — add C variant
strategyLayerC: StrategyLayer | null;
variantC: ArchitectureLayer | null;
variantCScore: number;
```

#### 7.2 `setVariantResults()` updaten
Accepteer en sla C-variant data op.

#### 7.3 `clearPhaseData()` updaten
Reset ook C-variant state.

---

### Stap 8: Wizard API Routes Updaten
**Bestanden:**
- `src/app/api/campaigns/wizard/strategy/generate-variants/route.ts`
- `src/app/api/campaigns/wizard/strategy/synthesize/route.ts`

Geen structurele wijzigingen nodig — de routes geven de result door van `generateStrategyVariants()` en `synthesizeStrategy()`. Die functies returnen al het nieuwe type. De SSE events bevatten automatisch de C-variant data.

---

### Stap 9: Wizard UI — 3-Variant Review
**Bestanden:**
- `src/features/campaigns/components/wizard/StrategyStep.tsx`
- `src/features/campaigns/components/wizard/VariantReviewView.tsx`
- `src/features/campaigns/components/wizard/VariantDetailCard.tsx`
- `src/features/campaigns/components/wizard/PersonaFeedbackCard.tsx`
- `src/features/campaigns/components/wizard/PipelineProgressView.tsx`

#### 9.1 `StrategyStep.tsx`
- `PHASE_A_STEPS[0]`: Label updaten naar "Triple Full Variants" (3 modellen)
- Data doorsturen naar `VariantReviewView` met C-variant

#### 9.2 `VariantReviewView.tsx`
- Props uitbreiden: `strategyLayerC`, `variantC`, `variantCScore`
- 3-kolom layout (of tab-based op smal scherm):
  - Variant A: "Evidence-Based" (Claude Opus 4.6)
  - Variant B: "Creative Provocateur" (GPT-5.4)
  - Variant C: "Data-Driven Innovator" (Gemini 3 Pro)
- Section 1: 3x `VariantDetailCard`
- Section 2: Persona feedback met 3 variant opties

#### 9.3 `PersonaFeedbackCard.tsx`
- `preferredVariant` kan nu `'C'` zijn
- Kleur toevoegen voor Variant C badge (bijv. amber/orange)

#### 9.4 `PipelineProgressView.tsx`
- Step 1 label: "Three AI models generating complete strategy variants..."

---

### Stap 10: LLM Creative Profiles Updaten
**Bestand:** `src/lib/campaigns/llm-creative-profiles.ts`

Geen wijzigingen nodig — de profiles zijn al correct gedefinieerd voor alle 3 providers. De `defaultModel` velden updaten indien gewenst:
- anthropic: `claude-opus-4-6` (was: claude-sonnet-4-5)
- openai: `gpt-5.4` (al correct)
- google: `gemini-3-pro-preview` (was: gemini-3.1-pro)

---

### Stap 11: Compile Structured Feedback Updaten
**Bestand:** `src/features/campaigns/lib/compile-structured-feedback.ts`

Feedback compilatie moet C-variant ratings meenemen.

---

## Verificatie

1. **Type check**: `npx tsc --noEmit` — 0 errors
2. **Build**: `npm run build` — succesvol
3. **Functionele test**: Campaign wizard → Strategy Step → genereer 3 varianten → review → synthesize → journey
4. **SSE events**: Controleer dat alle 3 varianten progress events sturen
5. **Deep thinking**: Controleer Anthropic/OpenAI/Google API logs dat thinking/reasoning parameters worden meegestuurd

## Afhankelijkheden

- `@anthropic-ai/sdk` moet extended_thinking ondersteunen (versie ≥ 0.39+)
- `openai` SDK moet reasoning_effort ondersteunen
- `@google/genai` moet thinkingConfig ondersteunen

## Kostenoverwegingen

- **Opus 4.6 met extended thinking** is significant duurder dan Sonnet 4.5 (~20x)
- **GPT-5.4 met reasoning** is duurder dan standaard GPT-5.4
- **Gemini 3 Pro met thinking** is duurder dan Gemini 2.5 Flash
- **3 parallel calls** in plaats van 2 = ~50% meer API kosten per generatie
- Overweeg: deep thinking alleen voor strategy varianten (stap 1), niet voor persona validation (stap 2)

## Uitvoervolgorde

1. Stap 1 (AI caller infrastructure) — basis voor alles
2. Stap 5 (Types) — nodig voor alle andere stappen
3. Stap 6 (Feature models) — default models updaten
4. Stap 2 (Variant C prompt) — derde perspectief
5. Stap 4 (Prompt updates) — persona validator + synthesizer
6. Stap 3 (Strategy chain) — pipeline orchestrator
7. Stap 7 (Wizard store)
8. Stap 8 (API routes)
9. Stap 9 (Wizard UI)
10. Stap 10-11 (LLM profiles + feedback)
11. Verificatie
