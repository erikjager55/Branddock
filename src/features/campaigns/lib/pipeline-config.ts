/**
 * Pipeline Configuration
 *
 * Three independent parameters that control the depth, breadth and rigor
 * of the campaign/content generation pipeline. Replaces the old binary
 * `pipelineDepth: 'full' | 'quick'` toggle.
 *
 * - Strategy Depth: how much analytical homework is done before creative work
 * - Creative Range: how many creative alternatives are explored
 * - Model Rigor: which model tier + how much extended thinking per call
 *
 * Three named presets map specific combinations for one-click selection.
 * Individual sliders override the preset to 'custom'.
 */

import type { WizardMode } from "./wizard-steps";

// ─── Types ────────────────────────────────────────────────

export type StrategyDepth = 'basic' | 'grounded' | 'research-backed';
export type CreativeRange = 'single' | 'multi-variant' | 'critiqued';
export type ModelRigor = 'fast' | 'balanced' | 'deliberate';
export type PipelinePreset = 'quick' | 'standard' | 'award-grade' | 'custom';

export interface PipelineConfig {
  strategyDepth: StrategyDepth;
  creativeRange: CreativeRange;
  modelRigor: ModelRigor;
}

// ─── Presets ──────────────────────────────────────────────

/**
 * Named preset configurations. Order matters for preset detection
 * (first match wins in computePresetFromConfig).
 */
export const PIPELINE_PRESETS: Record<Exclude<PipelinePreset, 'custom'>, PipelineConfig> = {
  'quick': {
    strategyDepth: 'basic',
    creativeRange: 'single',
    modelRigor: 'fast',
  },
  'standard': {
    strategyDepth: 'grounded',
    creativeRange: 'multi-variant',
    modelRigor: 'balanced',
  },
  'award-grade': {
    strategyDepth: 'research-backed',
    creativeRange: 'critiqued',
    modelRigor: 'deliberate',
  },
};

export const PRESET_LABELS: Record<Exclude<PipelinePreset, 'custom'>, string> = {
  'quick': 'Quick',
  'standard': 'Standard',
  'award-grade': 'Award Grade',
};

// ─── Parameter Descriptions ───────────────────────────────

export const STRATEGY_DEPTH_OPTIONS: { value: StrategyDepth; label: string; description: string }[] = [
  { value: 'basic', label: 'Basic', description: 'Briefing validation only' },
  { value: 'grounded', label: 'Grounded', description: 'Briefing + strategy foundation' },
  { value: 'research-backed', label: 'Research-backed', description: 'Foundation + external enrichment' },
];

export const CREATIVE_RANGE_OPTIONS: { value: CreativeRange; label: string; description: string }[] = [
  { value: 'single', label: 'Single', description: '1 concept, fastest path' },
  { value: 'multi-variant', label: 'Multi-variant', description: '3 concepts in parallel' },
  { value: 'critiqued', label: 'Critiqued', description: '3 concepts + AI debate rounds' },
];

export const MODEL_RIGOR_OPTIONS: { value: ModelRigor; label: string; description: string }[] = [
  { value: 'fast', label: 'Fast', description: 'Flash-tier models, no thinking' },
  { value: 'balanced', label: 'Balanced', description: 'Pro-tier models, moderate thinking' },
  { value: 'deliberate', label: 'Deliberate', description: 'Top models, deep thinking' },
];

// ─── Helpers ──────────────────────────────────────────────

/**
 * Returns the preset name that matches the given config, or 'custom'
 * if the combination doesn't match any named preset.
 */
export function computePresetFromConfig(config: PipelineConfig): PipelinePreset {
  for (const [preset, presetConfig] of Object.entries(PIPELINE_PRESETS)) {
    if (
      presetConfig.strategyDepth === config.strategyDepth &&
      presetConfig.creativeRange === config.creativeRange &&
      presetConfig.modelRigor === config.modelRigor
    ) {
      return preset as PipelinePreset;
    }
  }
  return 'custom';
}

/**
 * Returns the default preset for a given wizard mode.
 * Content mode defaults to Quick (fast single-content generation).
 * Campaign mode defaults to Standard (solid multi-variant strategy).
 */
export function getDefaultPresetForMode(mode: WizardMode): PipelineConfig {
  if (mode === 'content') return PIPELINE_PRESETS.quick;
  return PIPELINE_PRESETS.standard;
}

/**
 * Rough wall-clock time estimate in seconds for a given pipeline config.
 * Used to show "~X min" in the UI. These are heuristics, not guarantees.
 *
 * Model rigor multipliers come from OpenAI's reasoning_effort benchmarks
 * (each step ~3x the previous) and our own Claude extended thinking data.
 */
export function estimatePipelineTimeSeconds(config: PipelineConfig, mode: WizardMode, skipConcept?: boolean): number {
  // Base times per phase at 'balanced' model rigor
  const baseTimes = {
    validateBriefing: 30,
    buildStrategyFoundation: 120,
    enrichmentFetch: 30,
    quickConcept: 45,
    generateInsights: 90,     // wall clock of 3 parallel calls
    generateConcepts: 120,    // wall clock of 3 parallel calls
    creativeDebate: 360,      // 3 rounds × 2 calls sequential
    buildConceptStrategy: 120,
    elaborateJourney: 90,     // Gemini Flash, channel + asset plan sequential
    contentGenerate: 60,      // canvas orchestrator in content mode
  };

  // Model rigor multipliers applied to LLM-heavy phases
  const rigorMultiplier = {
    fast: 0.5,
    balanced: 1.0,
    deliberate: 2.3,
  }[config.modelRigor];

  let total = 0;

  // Phase 1: Strategy step
  total += baseTimes.validateBriefing; // always runs
  if (config.strategyDepth !== 'basic') {
    total += baseTimes.buildStrategyFoundation * rigorMultiplier;
    if (config.strategyDepth === 'research-backed') {
      total += baseTimes.enrichmentFetch;
    }
  }

  // Phase 2: Concept step (skipped entirely when skipConcept is true)
  if (!skipConcept) {
    if (config.creativeRange === 'single') {
      // Quick path: single concept via Flash, then concept-driven strategy
      total += baseTimes.quickConcept;
      total += baseTimes.buildConceptStrategy * rigorMultiplier;
    } else {
      // Multi-variant path: insights + concepts + strategy build
      total += baseTimes.generateInsights * rigorMultiplier;
      total += baseTimes.generateConcepts * rigorMultiplier;
      if (config.creativeRange === 'critiqued') {
        total += baseTimes.creativeDebate * rigorMultiplier;
      }
      total += baseTimes.buildConceptStrategy * rigorMultiplier;
    }
  }

  // Phase 3: Elaborate or Content Generate
  if (mode === 'content') {
    total += baseTimes.contentGenerate;
  } else {
    total += baseTimes.elaborateJourney;
  }

  return Math.round(total);
}

/**
 * Formats a time in seconds as a human-readable phrase.
 * 90 → "~2 min", 300 → "~5 min", 1200 → "~20 min"
 */
export function formatEstimatedTime(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return '<1 min';
  if (minutes === 1) return '~1 min';
  return `~${minutes} min`;
}
