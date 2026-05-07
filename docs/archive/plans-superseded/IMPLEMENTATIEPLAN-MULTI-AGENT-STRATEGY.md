# Implementatieplan: Multi-Agent Campaign Strategy

> **Feature**: Upgrade van single-pass 3-variant strategie naar multi-agent debat-architectuur
> **Scope**: Bestaande Campaign Strategy wizard (Step 3)
> **Impact**: `strategy-chain.ts`, `campaign-strategy.ts`, `StrategyStep.tsx`, Zustand store, SSE events
> **Geschatte effort**: 5 sprints (S1–S5)
> **Geschatte extra LLM-kosten per campagne**: €0.30–0.60

---

## Waarom Multi-Agent?

### Huidige beperkingen

De huidige pipeline genereert 3 varianten **parallel en onafhankelijk** (Claude Opus / GPT-5.4 / Gemini). Daarna volgt een eenmalige synthese door Claude Opus met 20K thinking tokens. Dit heeft drie structurele zwaktes:

1. **Geen tegenspraak** — Varianten worden nooit uitgedaagd. Zwaktes in strategie, messaging of persona-fit worden pas ontdekt als de gebruiker ze zelf spot.
2. **Convergentie** — Ondanks 3 verschillende LLMs convergeren varianten regelmatig op vergelijkbare positionering. Er is geen mechanisme dat differentiatie afdwingt.
3. **Oppervlakkige persona-validatie** — Persona's geven een score (1-10) en korte feedback, maar voeren geen dialoog. Er is geen "waarom niet?" of "wat zou je wél overtuigen?".
4. **Eenmalige synthese** — De synthesizer ziet alleen de originele varianten, niet verbeterde versies. Het resultaat is een best-of-3, niet een strategie die kritiek heeft overleefd.

### Wat multi-agent oplost

| Probleem | Oplossing |
|----------|-----------|
| Geen tegenspraak | **Critic Agent** identificeert zwaktes, blinde vlekken en risico's per variant |
| Convergentie | **Adversarial feedback** dwingt varianten om zich te onderscheiden |
| Oppervlakkige validatie | **Persona Panel** simuleert diepgaande reacties vanuit persona-perspectief |
| Eenmalige synthese | Synthesizer krijgt origineel + kritiek + verbeterde versie + persona-debat |

### Toegevoegde waarde voor de gebruiker

1. **Hogere strategiekwaliteit** — Strategie die kritiek heeft overleefd is sterker dan strategie die dat niet heeft
2. **Transparantie** — Gebruiker ziet het denkproces: welke zwaktes zijn gevonden, hoe zijn ze opgelost
3. **Vertrouwen** — "Onze AI daagt zichzelf uit" is een sterk onderscheidend verhaal voor klanten
4. **Betere Effie-scores** — Adversarial feedback verbetert de effieRationale onderbouwing
5. **Diepere persona-inzichten** — Niet alleen "score 8/10" maar "als 34-jarige marketingmanager zou ik hier niet op klikken omdat..."
6. **Stap richting Brandclaw** — Bouwt de orchestratie-patronen die nodig zijn voor de Fase F.1 marketing loop

---

## Architectuur

### Huidige pipeline (5 stappen)

```
Step 1a/1b/1c  →  Step 2           →  Step 4           →  Step 5/6
3 varianten       Persona validatie   Synthese (Opus)     Channel + Asset plan
(parallel)        (scores 1-10)       (20K thinking)
```

### Nieuwe pipeline (8 stappen)

```
Step 1a/1b       →  Step 2          →  Step 3a/3b       →  Step 4          →  Step 5         →  Step 6/7
2 varianten         Critic review      Verdediging &       Persona Panel      Synthese          Channel +
(parallel)          (Gemini)           verbetering         (diep debat)       (rijkere context)  Asset plan
                                       (parallel)
```

### Agent-rollen

| Agent | LLM | Rol | Temperature | Thinking |
|-------|-----|-----|-------------|----------|
| **Strategist** | Claude Opus | Evidence-based strateeg. Binet & Field, COM-B, BCT, Cialdini. | 0.5 | 16K |
| **Creative** | GPT-5.4 | Creatieve provocateur. Culturele spanning, cross-industry analogieën. | 0.5 | reasoning: high |
| **Critic** | Gemini 3.1 Pro | Strategische criticus. Vindt zwaktes, blinde vlekken, risico's. | 0.4 | 16K |
| **Persona Panel** | Claude Sonnet 4.6 | Simuleert elke persona als individu met eigen stem en bezwaren. | 0.7 | 10K |
| **Synthesizer** | Claude Opus | Chief Strategy Officer. Elevation, not combination. | 0.3 | 24K (↑ van 20K) |

> **Let op**: We gaan van 3 naar 2 initiële varianten (Strategist + Creative). Variant C (Gemini) wordt de Critic Agent. Dit houdt het totaal aantal LLM-calls beheersbaar en geeft Gemini een meer onderscheidende rol.

---

## Sprint 1: Types, Schemas & SSE Events

**Doel**: Fundament leggen — nieuwe types definiëren, SSE events uitbreiden, Zustand store voorbereiden.

### S1.1 — Nieuwe types (`strategy-blueprint.types.ts`)

```typescript
// ─── Critique Types ───
export interface AgentCritique {
  targetVariant: 'A' | 'B';
  strengths: CritiquePoint[];         // Wat werkt en waarom
  weaknesses: CritiquePoint[];        // Wat niet werkt en waarom
  blindSpots: string[];               // Wat ontbreekt volledig
  risks: CritiqueRisk[];              // Strategische risico's
  differentiationGap: string;         // Waar overlappen A en B te veel
  overallAssessment: string;          // 2-3 zinnen samenvatting
  confidenceScore: number;            // 1-10 hoe zeker is de criticus
}

export interface CritiquePoint {
  element: string;                    // bijv. "humanInsight", "creativePlatform"
  observation: string;                // Wat is het probleem/de kracht
  evidence: string;                   // Waarom — met verwijzing naar brand context
  severity: 'critical' | 'moderate' | 'minor';  // Alleen bij weaknesses
}

export interface CritiqueRisk {
  risk: string;                       // Beschrijving van het risico
  likelihood: 'high' | 'medium' | 'low';
  impact: string;                     // Wat gebeurt er als dit risico optreedt
  mitigation: string;                 // Hoe op te lossen
}

// ─── Defense Types ───
export interface AgentDefense {
  variant: 'A' | 'B';
  addressedWeaknesses: DefensePoint[];   // Reactie per zwakte
  addressedBlindSpots: string[];         // Hoe blinde vlekken zijn aangepakt
  revisedElements: RevisedElement[];     // Concrete verbeteringen
  revisedStrategy: StrategyLayer;        // Volledige verbeterde strategie
  revisedArchitecture: ArchitectureLayer;
  changeLog: string[];                   // Wat is er veranderd en waarom
}

export interface DefensePoint {
  originalWeakness: string;           // De kritiek
  response: 'accepted' | 'defended' | 'partially_accepted';
  reasoning: string;                  // Waarom geaccepteerd/verdedigd
  action: string;                     // Wat is er aan gedaan
}

export interface RevisedElement {
  field: string;                      // bijv. "creativePlatform"
  before: string;                     // Oude waarde
  after: string;                      // Nieuwe waarde
  reason: string;                     // Waarom veranderd
}

// ─── Deep Persona Panel Types ───
export interface PersonaDebateResult {
  personaId: string;
  personaName: string;
  
  // Per variant — diepere analyse dan huidige PersonaValidationResult
  variantReactions: {
    variant: 'A' | 'B';
    firstImpression: string;          // "Als [persona] zou mijn eerste reactie zijn..."
    wouldEngage: boolean;             // Ja/nee: zou ik hier op reageren?
    engagementReason: string;         // Waarom wel/niet
    emotionalResponse: string;        // Welk gevoel roept dit op
    barriers: string[];               // Wat houdt me tegen
    triggers: string[];               // Wat zou me wél overtuigen
    channelPreference: string;        // Via welk kanaal wil ik dit zien
    messageRewrite: string;           // "Ik zou het zo zeggen: ..."
  }[];
  
  // Eindoordeel
  preferredVariant: 'A' | 'B';
  preferenceStrength: 'strong' | 'slight' | 'indifferent';
  dealbreaker: string | null;         // Is er een absolute afknapper?
  
  // Creative scores (behouden voor backwards compat)
  originalityScore: number;
  memorabilityScore: number;
  culturalRelevanceScore: number;
  talkabilityScore: number;
  creativeVerdict: string;
}

// ─── Agent Debate Round Tracking ───
export interface AgentDebateState {
  round: 'generation' | 'critique' | 'defense' | 'persona_panel' | 'synthesis';
  status: 'pending' | 'running' | 'complete' | 'error';
  startedAt?: Date;
  completedAt?: Date;
}

export interface MultiAgentResult {
  // Ronde 1 — Generatie
  originalStrategyA: StrategyLayer;
  originalArchitectureA: ArchitectureLayer;
  originalStrategyB: StrategyLayer;
  originalArchitectureB: ArchitectureLayer;
  
  // Ronde 2 — Kritiek
  critiqueOfA: AgentCritique;
  critiqueOfB: AgentCritique;
  
  // Ronde 3 — Verdediging & Verbetering
  defenseA: AgentDefense;
  defenseB: AgentDefense;
  
  // Ronde 4 — Persona Panel
  personaDebate: PersonaDebateResult[];
  
  // Ronde 5 — Synthese
  synthesizedStrategy: StrategyLayer;
  synthesizedArchitecture: ArchitectureLayer;
}
```

### S1.2 — Zod schemas (`strategy-blueprint.types.ts`)

Nieuwe Zod schemas voor structured output parsing van elke agent-ronde. Volgt dezelfde patronen als bestaande `strategyLayerSchema` en `personaValidationResultSchema`.

### S1.3 — SSE event extensies (`campaign-wizard.types.ts`)

```typescript
// Nieuwe event types toevoegen aan PipelineEvent union
export type AgentRoundEvent = {
  type: 'agent_round';
  round: 'generation' | 'critique' | 'defense' | 'persona_panel' | 'synthesis';
  agent: string;                    // "strategist" | "creative" | "critic" | "persona_panel" | "synthesizer"
  status: 'running' | 'complete' | 'error';
  label: string;
  preview?: string;                 // Korte preview van resultaat
  data?: Record<string, unknown>;   // Bijv. critique highlights
};

// PipelineEvent wordt:
export type PipelineEvent =
  | PipelineStep
  | EnrichmentEvent
  | AgentRoundEvent;                // ← nieuw
```

### S1.4 — Zustand store uitbreiding (`useCampaignWizardStore.ts`)

```typescript
// Nieuwe state velden
multiAgentEnabled: boolean;                    // Feature toggle
agentDebateRounds: AgentDebateState[];         // Progress per ronde
critiqueOfA: AgentCritique | null;
critiqueOfB: AgentCritique | null;
defenseA: AgentDefense | null;
defenseB: AgentDefense | null;
personaDebate: PersonaDebateResult[] | null;
debateViewMode: 'timeline' | 'comparison';     // UI toggle

// Nieuwe actions
setMultiAgentEnabled: (enabled: boolean) => void;
updateDebateRound: (round: AgentDebateState) => void;
setCritique: (variant: 'A' | 'B', critique: AgentCritique) => void;
setDefense: (variant: 'A' | 'B', defense: AgentDefense) => void;
setPersonaDebate: (results: PersonaDebateResult[]) => void;
```

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/lib/campaigns/strategy-blueprint.types.ts` | Types toevoegen |
| `src/features/campaigns/types/campaign-wizard.types.ts` | SSE events uitbreiden |
| `src/features/campaigns/stores/useCampaignWizardStore.ts` | State + actions toevoegen |

---

## Sprint 2: Critic Agent & Prompt Engineering

**Doel**: Critic Agent bouwen — het hart van de multi-agent architectuur.

### S2.1 — Critic Agent prompts (`campaign-strategy-agents.ts`)

Nieuw bestand: `src/lib/ai/prompts/campaign-strategy-agents.ts`

```typescript
export function buildCriticPrompt(params: {
  strategyA: string;          // JSON van StrategyLayer A
  architectureA: string;      // JSON van ArchitectureLayer A
  strategyB: string;          // JSON van StrategyLayer B
  architectureB: string;      // JSON van ArchitectureLayer B
  brandContext: string;        // Volledige brand context
  personaContext: string;      // Geselecteerde persona's
  goalType: string;
  goalGuidance: string;
}): { system: string; user: string }
```

**Critic System Prompt — kernprincipes:**

```markdown
You are a senior strategic critic and brand auditor with 20+ years of experience
evaluating campaign strategies for Effie Award submissions. Your job is NOT to create
strategy — it is to FIND WEAKNESSES that the strategists missed.

## Your Critical Framework

1. **Evidence Test**: Is every claim backed by brand context, persona data, or
   marketing science? Flag unsupported assertions.
2. **Distinctiveness Test**: Would this strategy work for ANY brand in this category,
   or is it uniquely ownable? If interchangeable, flag as CRITICAL weakness.
3. **Persona Reality Check**: Does this strategy match how the target personas
   actually think, feel, and behave? Or is it what the strategist WISHES they would do?
4. **Blind Spot Detection**: What audiences, channels, objections, or competitive
   responses have the strategists NOT considered?
5. **Risk Assessment**: What could go wrong? Brand safety, cultural sensitivity,
   execution complexity, budget feasibility.
6. **Convergence Alert**: Where do Variant A and B overlap too much? Both variants
   should offer genuinely different strategic paths — flag where they converge.

## Rules
- Be specific. "The messaging is weak" is useless. "The humanInsight in Variant A
  claims [X] but the persona data shows [Y]" is useful.
- Reference actual data from brand context and persona profiles.
- Score your own confidence (1-10) in each critique point.
- For each weakness, suggest a direction for improvement (not a full solution).
```

### S2.2 — Defense prompts (Strategist & Creative responses)

```typescript
export function buildDefensePrompt(params: {
  originalStrategy: string;
  originalArchitecture: string;
  critique: string;            // JSON van AgentCritique
  brandContext: string;
  personaContext: string;
  agentRole: 'strategist' | 'creative';
  goalType: string;
}): { system: string; user: string }
```

**Defense System Prompt — kernprincipes:**

```markdown
You are the original [Strategist/Creative] who created Variant [A/B]. A strategic
critic has reviewed your work and found weaknesses. Your job is to:

1. **Acknowledge valid criticism** — If the critic is right, improve your strategy.
   Don't be defensive about genuine weaknesses.
2. **Defend strong choices** — If the critic missed context or misunderstood your
   intent, explain WHY your choice is deliberate and evidence-based.
3. **Improve** — For every accepted weakness, provide a concrete revision to your
   strategy. Return the FULL revised StrategyLayer and ArchitectureLayer.
4. **Document changes** — List every change you made and why (changeLog).

## Rules
- You MUST return a complete revised strategy, not just patches.
- Your revised strategy should be BETTER than the original — this is your chance
  to strengthen your work.
- Do not abandon your core creative platform unless the critic found a fatal flaw.
  Refine, don't restart.
- The changeLog should be specific: "Changed humanInsight from '[old]' to '[new]'
  because critic correctly identified that persona data contradicts the original."
```

### S2.3 — Pipeline integratie (`strategy-chain.ts`)

Nieuwe functies toevoegen aan `strategy-chain.ts`:

```typescript
export async function runCriticRound(
  strategyA: StrategyLayer,
  architectureA: ArchitectureLayer,
  strategyB: StrategyLayer,
  architectureB: ArchitectureLayer,
  ctx: PhaseContext,
  onProgress?: ProgressCallback,
): Promise<{ critiqueOfA: AgentCritique; critiqueOfB: AgentCritique }>

export async function runDefenseRound(
  originalStrategyA: StrategyLayer,
  originalArchitectureA: ArchitectureLayer,
  critiqueOfA: AgentCritique,
  originalStrategyB: StrategyLayer,
  originalArchitectureB: ArchitectureLayer,
  critiqueOfB: AgentCritique,
  ctx: PhaseContext,
  onProgress?: ProgressCallback,
): Promise<{ defenseA: AgentDefense; defenseB: AgentDefense }>
```

**Implementatiepatroon**: Volgt exact hetzelfde patroon als `generateStrategyVariants`:
- `Promise.all` voor parallelle calls (2 critiques parallel, 2 defenses parallel)
- `withStepContext` wrapper voor timeout/error handling
- `validateOrWarn` met Zod schema
- SSE events via `onProgress` callback

### S2.4 — API route uitbreiding

Optie A (aanbevolen): **Uitbreiding van bestaande `generate-variants/route.ts`**
- Multi-agent als opt-in via request body: `{ multiAgent: true }`
- Bestaande flow blijft werken als fallback
- Nieuwe SSE events (`agent_round`) worden gestuurd naast bestaande `step` events

Optie B: Nieuwe route `generate-variants-multi-agent/route.ts`
- Schonere scheiding maar meer code duplicatie

**Aanbeveling**: Optie A — houd één route, gebruik feature flag.

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/lib/ai/prompts/campaign-strategy-agents.ts` | **Nieuw** — Critic + Defense prompts |
| `src/lib/campaigns/strategy-chain.ts` | `runCriticRound` + `runDefenseRound` toevoegen |
| `src/app/api/campaigns/wizard/strategy/generate-variants/route.ts` | Multi-agent flow integreren |

---

## Sprint 3: Persona Panel Upgrade

**Doel**: Persona-validatie upgraden van scores naar diepgaand debat.

### S3.1 — Persona Panel prompt (`campaign-strategy-agents.ts`)

```typescript
export function buildPersonaPanelPrompt(params: {
  revisedStrategyA: string;       // Verbeterde variant na defense
  revisedArchitectureA: string;
  revisedStrategyB: string;
  revisedArchitectureB: string;
  critiqueOfA: string;            // Context: welke kritiek is gegeven
  critiqueOfB: string;
  defenseA: string;               // Context: hoe is gereageerd
  defenseB: string;
  personas: PersonaProfile[];     // Volledige persona data
  brandContext: string;
  goalType: string;
}): { system: string; user: string }
```

**Persona Panel System Prompt — kernprincipes:**

```markdown
You are simulating a focus group of real people. Each persona is a DISTINCT INDIVIDUAL
with their own voice, vocabulary, emotional triggers, and decision-making patterns.

## For each persona, you must:

1. **Stay in character** — Use language and references that match their demographics,
   psychographics, and communication style. A 24-year-old Gen Z creative talks
   differently than a 52-year-old CFO.

2. **React honestly** — Not every strategy resonates with every persona. It's EXPECTED
   that some personas will reject a variant entirely. Don't be artificially positive.

3. **Explain WHY** — "I wouldn't engage" is not enough. "I wouldn't engage because
   the tone feels corporate and patronizing, and I already get 50 emails like this
   from competitors" IS enough.

4. **Rewrite the message** — For each variant, show how YOU (the persona) would want
   to hear this message. This gives the strategist concrete direction.

5. **Name your dealbreaker** — If there's ONE thing that would make you scroll past
   or unsubscribe, name it explicitly.

## Context awareness
You have access to the full critic-defense cycle. Use this to evaluate whether
weaknesses identified by the critic were adequately addressed, from the persona's
perspective.
```

### S3.2 — Pipeline integratie

```typescript
export async function runPersonaPanelRound(
  defenseA: AgentDefense,
  defenseB: AgentDefense,
  critiqueOfA: AgentCritique,
  critiqueOfB: AgentCritique,
  ctx: PhaseContext,
  onProgress?: ProgressCallback,
): Promise<PersonaDebateResult[]>
```

**Persona Panel draait als ENKELE call** (niet per persona apart) — dit voorkomt inconsistente persona-reacties en houdt het token-budget beheersbaar.

### S3.3 — Synthese upgrade

De bestaande `synthesizeStrategy` functie krijgt extra context:

```typescript
// Huidige input:
// - 3 variant strategies + scores + persona validation

// Nieuwe input:
// - 2 originele variant strategies
// - Critic review van beide
// - 2 verbeterde variant strategies (na defense)
// - Persona panel debat (diepgaand)
// - Change logs (wat is er veranderd en waarom)
```

De synthesizer prompt wordt uitgebreid met:
```markdown
## Additional Context: Agent Debate Results

### Critic Findings
[critiqueOfA + critiqueOfB — zwaktes en risico's]

### Defense Responses
[defenseA + defenseB — wat is geaccepteerd, wat is verdedigd]

### Changes Made
[changeLog A + changeLog B — concrete verbeteringen]

### Persona Panel Reactions
[personaDebate — diepgaande persona reacties met rewrites en dealbreakers]

## Synthesis Instructions (updated)
You now have MUCH richer context than just 3 parallel variants. Use this to:
1. Prefer elements that SURVIVED the critic-defense cycle
2. Incorporate persona message rewrites where they improve resonance
3. Address any remaining risks flagged by the critic that defense didn't resolve
4. The effieRationale should reference the debate: "This strategy was stress-tested
   through adversarial review and persona validation..."
```

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/lib/ai/prompts/campaign-strategy-agents.ts` | Persona Panel prompt toevoegen |
| `src/lib/campaigns/strategy-chain.ts` | `runPersonaPanelRound` + `synthesizeStrategy` uitbreiden |

---

## Sprint 4: Frontend — Agent Debate Visualisatie

**Doel**: Gebruiker kan het hele debat volgen in de wizard.

### S4.1 — AgentDebateView component

Nieuw component: `src/features/campaigns/components/wizard/AgentDebateView.tsx`

**Layout: Timeline-modus (default)**

```
┌─────────────────────────────────────────────────────────┐
│  🔵 Ronde 1: Generatie                     ✓ Compleet   │
│  ├── Strategist (Claude): "Brand as Enabler"            │
│  └── Creative (GPT): "Cultural Disruption"              │
│                                                          │
│  🟡 Ronde 2: Kritiek                       ⟳ Bezig...   │
│  └── Critic (Gemini): Analyseert beide varianten...     │
│                                                          │
│  ⚪ Ronde 3: Verdediging                   Wachtend      │
│  ⚪ Ronde 4: Persona Panel                 Wachtend      │
│  ⚪ Ronde 5: Synthese                      Wachtend      │
└─────────────────────────────────────────────────────────┘
```

**Wanneer een ronde compleet is, klapt deze open:**

```
┌─────────────────────────────────────────────────────────┐
│  🟡 Ronde 2: Kritiek                       ✓ Compleet   │
│  ┌─────────────────────┬─────────────────────┐          │
│  │ Variant A (Strategist)│ Variant B (Creative) │        │
│  ├─────────────────────┼─────────────────────┤          │
│  │ ✅ Sterk:            │ ✅ Sterk:            │          │
│  │ • humanInsight       │ • creativePlatform   │          │
│  │   goed onderbouwd    │   onderscheidend     │          │
│  │                      │                      │          │
│  │ ⚠️ Zwak:             │ ⚠️ Zwak:             │          │
│  │ • creativePlatform   │ • humanInsight       │          │
│  │   te generiek        │   niet evidence-based│          │
│  │                      │                      │          │
│  │ 🔴 Blinde vlekken:   │ 🔴 Blinde vlekken:   │          │
│  │ • Geen competitor    │ • Budget niet        │          │
│  │   defensie           │   realistisch        │          │
│  └─────────────────────┴─────────────────────┘          │
└─────────────────────────────────────────────────────────┘
```

### S4.2 — CritiqueCard component

`src/features/campaigns/components/wizard/CritiqueCard.tsx`

Toont per variant:
- Sterke punten (groen) met evidence
- Zwaktes (oranje/rood) met severity badge
- Blinde vlekken (rood)
- Risico's met likelihood indicator
- Confidence score van de criticus

### S4.3 — DefenseCard component

`src/features/campaigns/components/wizard/DefenseCard.tsx`

Toont per variant:
- Hoe elke zwakte is beantwoord (accepted / defended / partially_accepted)
- Diff-view: voor/na per veranderd element
- Change log

### S4.4 — PersonaDebateCard component

`src/features/campaigns/components/wizard/PersonaDebateCard.tsx`

Toont per persona:
- Eerste indruk (in persona-stem, met avatar)
- Per variant: zou wel/niet engagen + waarom
- Emotionele reactie
- Barriers en triggers
- Herschreven boodschap (quote-stijl)
- Dealbreaker (rood highlight als aanwezig)

### S4.5 — StrategyStep.tsx integratie

Uitbreiding van bestaande `StrategyStep.tsx`:

```typescript
// Nieuwe handler
async function handleGenerateMultiAgent() {
  // 1. Start SSE stream naar /api/campaigns/wizard/strategy/generate-variants
  //    met { multiAgent: true }
  // 2. Ontvang agent_round events
  // 3. Update Zustand store per ronde
  // 4. Toon AgentDebateView tijdens generatie
  // 5. Na synthese → bestaande SynthesisReviewView
}
```

**Conditie**: Als `multiAgentEnabled` in store → toon `AgentDebateView`, anders bestaande `PipelineProgressView`.

### S4.6 — Toggle in wizard

In de **KnowledgeStep** of **SetupStep** een toggle toevoegen:

```
┌──────────────────────────────────────┐
│ ⚡ Multi-Agent Strategy Debate       │
│                                      │
│ Laat AI-agents elkaars strategieën   │
│ uitdagen voor een sterker resultaat. │
│                                      │
│ [Toggle: Uit / Aan]                  │
│                                      │
│ ℹ️ Duurt ~2-3 min langer            │
│ ℹ️ Gebruikt meer AI-credits          │
└──────────────────────────────────────┘
```

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/features/campaigns/components/wizard/AgentDebateView.tsx` | **Nieuw** |
| `src/features/campaigns/components/wizard/CritiqueCard.tsx` | **Nieuw** |
| `src/features/campaigns/components/wizard/DefenseCard.tsx` | **Nieuw** |
| `src/features/campaigns/components/wizard/PersonaDebateCard.tsx` | **Nieuw** |
| `src/features/campaigns/components/wizard/StrategyStep.tsx` | Multi-agent flow toevoegen |
| `src/features/campaigns/components/wizard/SetupStep.tsx` of `KnowledgeStep.tsx` | Toggle toevoegen |

---

## Sprint 5: Testing, Optimalisatie & Feature Flag

**Doel**: Productie-klaar maken, kosten optimaliseren, A/B test opzetten.

### S5.1 — Feature flag

```typescript
// In workspace settings (admin UI)
multiAgentStrategy: boolean    // default: false

// Of via feature-models systeem (resolveFeatureModel)
'campaign-strategy-multi-agent': {
  enabled: boolean;
  provider: string;            // Voor critic agent
  model: string;
}
```

### S5.2 — Kosten-optimalisatie

| Ronde | Huidige kosten | Multi-agent kosten | Verschil |
|-------|---------------|-------------------|----------|
| Generatie | 3 calls (~€0.40) | 2 calls (~€0.28) | -€0.12 |
| Kritiek | — | 1 call (~€0.08) | +€0.08 |
| Verdediging | — | 2 calls (~€0.20) | +€0.20 |
| Persona Panel | 1 call (~€0.06) | 1 call (~€0.10) | +€0.04 |
| Synthese | 1 call (~€0.15) | 1 call (~€0.20) | +€0.05 |
| **Totaal** | **~€0.61** | **~€0.86** | **+€0.25** |

> Kosteninschatting op basis van huidige tokenverbruik. Werkelijke kosten afhankelijk van prompt-lengte en thinking tokens.

**Optimalisaties:**
- Critic prompt compact houden — alleen strategie-highlights, niet volledige architectuur
- Defense prompt mag bestaande strategie refereren i.p.v. dupliceren
- Persona Panel: max 5 persona's (voorkomt token-explosie)
- Caching: brand context + persona profiles hergebruiken tussen rondes (al geïmplementeerd)

### S5.3 — Kwaliteitsmetrieken

Om de meerwaarde te meten, tracking toevoegen:

```typescript
// PostHog events (als PostHog is geïntegreerd, anders in-app)
'campaign_strategy_generated': {
  multi_agent: boolean;
  rounds_completed: number;
  critic_weaknesses_found: number;
  weaknesses_accepted: number;        // Door defense
  weaknesses_defended: number;
  persona_dealbreakers: number;
  synthesis_confidence: number;
  generation_time_ms: number;
}
```

### S5.4 — Error handling & fallback

- Als Critic Agent faalt → skip naar synthese (graceful degradation)
- Als Defense faalt → gebruik originele variant voor synthese
- Als Persona Panel faalt → fallback naar huidige PersonaValidation
- Timeout per ronde: 120s (critic), 180s (defense), 120s (persona panel)
- Gebruiker kan op elk moment "Skip naar synthese" klikken

### S5.5 — Database opslag

Debat-resultaten opslaan in `Campaign.blueprint` JSON:

```typescript
// Uitbreiding van CampaignBlueprint
interface CampaignBlueprint {
  // ... bestaande velden ...
  
  // Multi-agent resultaten (optioneel)
  agentDebate?: {
    enabled: boolean;
    critiqueOfA?: AgentCritique;
    critiqueOfB?: AgentCritique;
    defenseA?: AgentDefense;
    defenseB?: AgentDefense;
    personaDebate?: PersonaDebateResult[];
    generationTimeMs: number;
  };
}
```

### Bestanden

| Bestand | Actie |
|---------|-------|
| `src/lib/ai/feature-models.server.ts` | Feature flag voor multi-agent |
| `src/lib/campaigns/strategy-chain.ts` | Error handling + fallback |
| `src/lib/campaigns/strategy-blueprint.types.ts` | CampaignBlueprint uitbreiden |
| `src/app/api/campaigns/wizard/strategy/generate-variants/route.ts` | Opslag in blueprint |

---

## Samenvatting per sprint

| Sprint | Focus | Nieuwe bestanden | Gewijzigde bestanden | LLM-calls |
|--------|-------|-----------------|---------------------|-----------|
| **S1** | Types & SSE | 0 | 3 | 0 |
| **S2** | Critic + Defense | 1 | 2 | Critic prompt + Defense prompt |
| **S3** | Persona Panel + Synthese | 0 | 2 | Persona Panel prompt + Synthese upgrade |
| **S4** | Frontend | 4 | 2 | 0 |
| **S5** | Testing & Optimalisatie | 0 | 4 | 0 |

**Totaal**: 5 nieuwe bestanden, 13 bestandswijzigingen

---

## Risico's & Mitigatie

| Risico | Impact | Mitigatie |
|--------|--------|-----------|
| Critic is te mild / te streng | Lage kwaliteitsverbetering | Temperature tuning + few-shot examples in prompt |
| Defense negeert kritiek | Rondes zijn zinloos | Prompt dwingt acknowledgment af + Zod schema valideert |
| Persona's klinken allemaal hetzelfde | Geen echte persona-differentiatie | Volledige persona data injecteren + in-character instructies |
| Langere generatietijd (~2-3 min extra) | Gebruiker haakt af | Duidelijke progress UI + "skip" optie + toggle |
| Hogere kosten | Budget overschrijding | Per-workspace toggle + tier-gating (Pro/Agency only) |
| Token-limieten bereikt | Truncated output | Compact prompts + essentiële context only per ronde |

---

## Relatie met Brandclaw Roadmap

Dit implementatieplan bouwt direct naar de **Fase F.1 LangGraph.js Agent Orchestration**:

| Multi-Agent Strategy (nu) | Brandclaw Fase F.1 (later) |
|--------------------------|---------------------------|
| 5 agents met vaste rollen | 6-node marketing loop |
| Sequentiële rondes | State machine met conditional edges |
| Gebruiker ziet debat, kiest | Confidence-based autonomie (0.85+) |
| Geen persistent memory | pgvector agent memory |
| In-request orchestratie | BullMQ job queue |
| Feature toggle per workspace | Autonomy dial (always-ask / threshold / always-auto) |

De **patronen** die we hier bouwen (agent rollen, critique-defense cycles, persona simulation, multi-round orchestratie) worden direct hergebruikt in Brandclaw.
