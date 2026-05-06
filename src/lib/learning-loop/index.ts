/**
 * Learning Loop — barrel export voor de leerlus-utility services.
 *
 * Status sessie 2 (2026-05-05):
 * - ✅ snapshot-hasher (canonical-stringify + sha256)
 * - ✅ diff-builder (paragraph-level plain-text diff)
 * - ✅ edit-classifier (heuristische editType-toewijzing)
 * - ✅ event-emitter (LearningEvent persistence)
 * - 📋 call-tracker (Phase 2 — `withAi` middleware integration)
 * - 📋 fidelity-scorer (Phase 4 — depends on call-tracker)
 * - 📋 fidelity-rules (Phase 4 — deterministic rule-engine)
 * - 📋 prompt-registry (Phase 6 — Settings UI backend)
 *
 * Zie: IMPLEMENTATIEPLAN-LEARNING-LOOP.md
 */

export {
  canonicalStringify,
  sha256,
  hashContent,
} from "./snapshot-hasher";

export type { DiffEntry, DiffResult } from "./diff-builder";
export { buildDiff, buildPlainTextDiff } from "./diff-builder";

export { classifyEdit, describeEdit } from "./edit-classifier";

export type { EmitEventInput } from "./event-emitter";
export { emitLearningEvent, emitLearningEvents } from "./event-emitter";

export type {
  TrackAICallStartInput,
  TrackAICallStartResult,
  TrackAICallCompleteInput,
} from "./call-tracker";
export { trackAICallStart, trackAICallComplete } from "./call-tracker";

export type { RuleContext, RuleResult } from "./fidelity-rules";
export { runDeterministicRule, DETERMINISTIC_CRITERIA } from "./fidelity-rules";

export type {
  ScoreContentFidelityInput,
  ScoreContentFidelityResult,
} from "./fidelity-scorer";
export { scoreContentFidelity } from "./fidelity-scorer";

export type { AICallTracking } from "./track-helpers";
export {
  tryTrackStart,
  tryTrackComplete,
  buildErrorMetadata,
} from "./track-helpers";
