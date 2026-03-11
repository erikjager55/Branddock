import type { PersonaResearchMethodType, ResearchMethodSummary } from '../types/persona.types';

export const PERSONA_RESEARCH_METHODS: {
  method: PersonaResearchMethodType;
  icon: string;
  label: string;
  description: string;
  type: string;
  time: string;
  isFree?: boolean;
  isPaid?: boolean;
  priceLabel?: string;
  startLabel: string;
  continueLabel: string;
  completedLabel: string;
}[] = [
  { method: 'AI_EXPLORATION', icon: 'Bot', label: 'AI Exploration', description: 'AI-assisted analysis and ideation for brand strategy and positioning', type: 'AI', time: 'Instant', isFree: true, startLabel: 'Start Exploration', continueLabel: 'Continue', completedLabel: 'View Report' },
  { method: 'INTERVIEWS', icon: 'MessageCircle', label: 'Interviews', description: 'One-on-one deep-dive interviews with key stakeholders and customers', type: '1-on-1', time: 'Variable', isPaid: false, startLabel: 'Start', continueLabel: 'Continue', completedLabel: 'View Results' },
  { method: 'QUESTIONNAIRE', icon: 'ClipboardList', label: 'Questionnaire', description: 'Comprehensive surveys distributed to broader audience for quantitative insights', type: 'Quantitative', time: '1-2 weeks', isPaid: true, priceLabel: 'From $500', startLabel: 'Start', continueLabel: 'Continue', completedLabel: 'View Results' },
  { method: 'USER_TESTING', icon: 'Smartphone', label: 'User Testing', description: 'Observe users interacting with product to validate assumptions', type: 'Observational', time: 'Variable', isPaid: false, startLabel: 'Start', continueLabel: 'Continue', completedLabel: 'View Results' },
];

export { PERSONA_VALIDATION_WEIGHTS } from '@/lib/validation-percentage';
import { computeValidationPercentage, PERSONA_VALIDATION_WEIGHTS as _PVW } from '@/lib/validation-percentage';

export function calculatePersonaValidation(methods: ResearchMethodSummary[]): number {
  return computeValidationPercentage(methods, _PVW);
}
