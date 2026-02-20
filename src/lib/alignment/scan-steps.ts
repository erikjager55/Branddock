export const SCAN_STEPS = [
  'Scanning Brand Foundation',
  'Analyzing Business Strategy',
  'Checking Brandstyle consistency',
  'Cross-referencing Personas with positioning',
  'Validating Products & Services',
  'Evaluating Market Insights relevance',
  'Checking Knowledge Library references',
  'Calculating alignment score',
] as const;

export type ScanStep = typeof SCAN_STEPS[number];
