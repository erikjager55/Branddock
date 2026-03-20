export const SCAN_STEPS = [
  'Gathering brand context...',
  'Analyzing Brand Foundation alignment...',
  'Analyzing Business Strategy alignment...',
  'Analyzing Brandstyle consistency...',
  'Cross-referencing Personas with brand positioning...',
  'Validating Products & Services alignment...',
  'Evaluating Market Insights relevance...',
  'Calculating final alignment score...',
] as const;

export type ScanStep = typeof SCAN_STEPS[number];
