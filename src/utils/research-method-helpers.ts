import { ResearchMethodType } from '../types/brand-asset';

/**
 * Map research method types to research option IDs used by ResearchDashboard
 */
export function getResearchOptionId(methodType: ResearchMethodType): string {
  switch (methodType) {
    case 'canvas-workshop':
      return 'canvas-workshop';
    case 'interviews':
      return 'interviews';
    case 'questionnaire':
      return 'questionnaire';
    case 'ai-exploration':
      return 'ai-agent'; // Maps to the AI chat interface with dropdown (not AIExplorationManager)
    default:
      return 'ai-agent'; // fallback
  }
}

export type { ResearchMethodType };