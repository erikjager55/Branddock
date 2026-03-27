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

/** Valid step numbers in the 4-step accordion */
export type StepNumber = 1 | 2 | 3 | 4;
