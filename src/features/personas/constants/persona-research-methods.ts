import type { PersonaResearchMethodType, ResearchMethodSummary } from '../types/persona.types';

export const PERSONA_RESEARCH_METHODS: {
  method: PersonaResearchMethodType;
  icon: string;
  label: string;
  type: string;
  time: string;
  isFree?: boolean;
  isPaid?: boolean;
  priceLabel?: string;
}[] = [
  { method: 'AI_EXPLORATION', icon: 'Bot', label: 'AI Exploration', type: 'AI', time: 'Instant', isFree: true },
  { method: 'INTERVIEWS', icon: 'MessageCircle', label: 'Interviews', type: '1-on-1', time: 'Variable', isPaid: false },
  { method: 'QUESTIONNAIRE', icon: 'ClipboardList', label: 'Questionnaire', type: 'Quantitative', time: '1-2 weeks', isPaid: true, priceLabel: 'From $500' },
  { method: 'USER_TESTING', icon: 'Smartphone', label: 'User Testing', type: 'Observational', time: 'Variable', isPaid: false },
];

export const PERSONA_VALIDATION_WEIGHTS: Record<PersonaResearchMethodType, number> = {
  AI_EXPLORATION: 0.15,
  INTERVIEWS: 0.30,
  QUESTIONNAIRE: 0.30,
  USER_TESTING: 0.25,
};

export function calculatePersonaValidation(methods: ResearchMethodSummary[]): number {
  let total = 0;
  for (const m of methods) {
    if (m.status === 'COMPLETED' || m.status === 'VALIDATED') {
      total += (PERSONA_VALIDATION_WEIGHTS[m.method] ?? 0) * 100;
    }
  }
  return Math.min(100, Math.round(total));
}
