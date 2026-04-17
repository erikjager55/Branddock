// =============================================================
// Accordion Step Types — Content Canvas vertical accordion
// =============================================================

/** Summary data displayed when a step is collapsed */
export interface StepSummaryData {
  /** Short single-line summary text */
  label: string;
  /** Optional detail items shown as tags/pills */
  details?: string[];
}

/** Visual status of an accordion step */
export type AccordionStepStatus = 'locked' | 'active' | 'completed';

/**
 * Step identifier — string ID matching a step in the canvas flow registry.
 * Examples: 'context', 'variants', 'script', 'medium', 'video-builder', 'planner'
 */
export type StepId = string;

/**
 * @deprecated Use StepId instead. Kept for backward compat during migration.
 */
export type StepNumber = number;
