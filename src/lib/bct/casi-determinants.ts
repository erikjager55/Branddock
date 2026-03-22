/**
 * CASI (Communicatie Activatie Strategie Instrument) — 9 Behavioral Determinants
 *
 * Dutch government behavioral change model providing granular behavioral diagnosis.
 * Each determinant maps to a COM-B component for international standardization.
 *
 * @see CASI Model — RIVM/Dutch Government Communication Science
 * @see COM-B Model — Michie et al., 2011
 */

import type { CasiDeterminant } from '../campaigns/strategy-blueprint.types';

// ─── Types ────────────────────────────────────────────────

export interface CasiDeterminantDefinition {
  id: CasiDeterminant;
  name: string;
  comBComponent: 'capability' | 'opportunity' | 'motivation';
  comBSubComponent: string;
  description: string;
  diagnosticQuestions: string[];
  marketingRelevance: string;
  exampleBarrier: string;
}

// ─── CASI Determinants ────────────────────────────────────

export const CASI_DETERMINANTS: Record<CasiDeterminant, CasiDeterminantDefinition> = {
  resistance: {
    id: 'resistance',
    name: 'Resistance',
    comBComponent: 'motivation',
    comBSubComponent: 'Reflective Motivation',
    description: 'Active opposition to the desired behavior change. The person consciously pushes back against the new behavior.',
    diagnosticQuestions: [
      'Does the audience actively resist this type of product/service/brand?',
      'Are there ideological or principled objections to the desired behavior?',
      'Has previous negative experience created defensive reactions?',
    ],
    marketingRelevance: 'Resistance requires reframing before persuasion. Direct selling to resistant audiences backfires.',
    exampleBarrier: 'Target audience believes brand strategy tools are "corporate fluff" and actively avoids them.',
  },
  self_image: {
    id: 'self_image',
    name: 'Self-Image',
    comBComponent: 'motivation',
    comBSubComponent: 'Reflective Motivation',
    description: 'Whether the desired behavior fits with how the person sees themselves. Identity alignment drives adoption.',
    diagnosticQuestions: [
      'Does the desired behavior align with how the audience sees themselves?',
      'Would performing this behavior conflict with their professional/personal identity?',
      'Can the brand position the behavior as identity-affirming?',
    ],
    marketingRelevance: 'People adopt behaviors that match their self-concept. Position the brand as an expression of who they already are.',
    exampleBarrier: 'Startup founders see brand strategy as "something big corporates do" — not aligned with their scrappy identity.',
  },
  automatisms: {
    id: 'automatisms',
    name: 'Automatisms',
    comBComponent: 'motivation',
    comBSubComponent: 'Automatic Motivation',
    description: 'Habitual behaviors that compete with the desired new behavior. Existing routines create inertia.',
    diagnosticQuestions: [
      'What existing habits compete with the desired behavior?',
      'How deeply ingrained are current alternatives?',
      'Is the audience on "autopilot" with a competing product/process?',
    ],
    marketingRelevance: 'Breaking habits requires disrupting cues. Insert the brand into existing routines rather than replacing them.',
    exampleBarrier: 'Marketing teams habitually use spreadsheets for brand planning — switching to a new tool requires breaking deep-seated routines.',
  },
  emotions: {
    id: 'emotions',
    name: 'Emotions',
    comBComponent: 'motivation',
    comBSubComponent: 'Automatic Motivation',
    description: 'Emotional associations with the behavior — fear, excitement, anxiety, joy. Emotions drive faster decisions than logic.',
    diagnosticQuestions: [
      'What emotions does the audience associate with this behavior change?',
      'Is there fear, anxiety, or uncertainty about the desired behavior?',
      'Can positive emotions (excitement, pride, relief) be activated?',
    ],
    marketingRelevance: 'Emotional resonance predicts action better than rational arguments. Address fears first, then activate positive emotions.',
    exampleBarrier: 'Decision-makers feel anxiety about committing to a brand strategy — fear of making the wrong strategic choice.',
  },
  social_environment: {
    id: 'social_environment',
    name: 'Social Environment',
    comBComponent: 'opportunity',
    comBSubComponent: 'Social Opportunity',
    description: 'Peer expectations, social norms, and group influences. What do important others think about this behavior?',
    diagnosticQuestions: [
      'Do peers/colleagues support or discourage the desired behavior?',
      'Is there a visible social norm around this behavior?',
      'Would performing this behavior invite social approval or criticism?',
    ],
    marketingRelevance: 'Social proof and normative messaging are powerful. Show that peers already perform the desired behavior.',
    exampleBarrier: 'In the company culture, investing in "brand" is seen as less important than investing in "performance marketing."',
  },
  physical_environment: {
    id: 'physical_environment',
    name: 'Physical Environment',
    comBComponent: 'opportunity',
    comBSubComponent: 'Physical Opportunity',
    description: 'Whether the physical/digital environment supports the desired behavior. Includes accessibility, availability, and friction.',
    diagnosticQuestions: [
      'Is the product/service easily accessible when the audience needs it?',
      'Are there physical or digital barriers to performing the behavior?',
      'Does the environment contain cues that trigger the desired behavior?',
    ],
    marketingRelevance: 'Reduce friction. The easier the behavior, the more likely adoption. Design the environment to nudge.',
    exampleBarrier: 'The brand strategy platform requires a 30-minute onboarding before any value is visible — too much friction.',
  },
  capability: {
    id: 'capability',
    name: 'Capability',
    comBComponent: 'capability',
    comBSubComponent: 'Physical Capability',
    description: 'Whether the person has the physical/practical skills to perform the behavior.',
    diagnosticQuestions: [
      'Does the audience have the technical skills to use the product/service?',
      'Are there practical barriers (time, resources, tools) preventing the behavior?',
      'Would training or simplification enable the behavior?',
    ],
    marketingRelevance: 'If capability is the barrier, education and skill-building content outperform persuasion.',
    exampleBarrier: 'Small business owners lack the marketing expertise to interpret brand strategy recommendations.',
  },
  knowledge: {
    id: 'knowledge',
    name: 'Knowledge',
    comBComponent: 'capability',
    comBSubComponent: 'Psychological Capability',
    description: 'Whether the person knows what to do and how to do it. Includes awareness of the behavior and procedural knowledge.',
    diagnosticQuestions: [
      'Does the audience know this product/solution exists?',
      'Do they understand what steps are required?',
      'Do they know the benefits and how to access them?',
    ],
    marketingRelevance: 'Low awareness campaigns differ fundamentally from behavior change campaigns. Diagnose the knowledge gap first.',
    exampleBarrier: 'Target audience is unaware that AI-powered brand strategy tools exist or what they can do.',
  },
  attitude_risk_perception: {
    id: 'attitude_risk_perception',
    name: 'Attitude / Risk Perception',
    comBComponent: 'motivation',
    comBSubComponent: 'Reflective Motivation',
    description: 'General attitude toward the behavior and perception of associated risks. Cost-benefit analysis the person runs.',
    diagnosticQuestions: [
      'Does the audience perceive the behavior as worth the effort/cost?',
      'What risks do they associate with changing their current behavior?',
      'Is there a perceived downside to adopting the new behavior?',
    ],
    marketingRelevance: 'When attitude is negative, reframing the value proposition matters more than adding features.',
    exampleBarrier: 'Marketers perceive brand strategy tools as expensive and unlikely to deliver measurable ROI.',
  },
} as const satisfies Record<CasiDeterminant, CasiDeterminantDefinition>;

// ─── COM-B Component Grouping ─────────────────────────────

export const CASI_BY_COMB: Record<'capability' | 'opportunity' | 'motivation', CasiDeterminant[]> = {
  capability: ['capability', 'knowledge'],
  opportunity: ['social_environment', 'physical_environment'],
  motivation: ['resistance', 'self_image', 'automatisms', 'emotions', 'attitude_risk_perception'],
};

export const COMB_COLORS: Record<'capability' | 'opportunity' | 'motivation', string> = {
  capability: 'blue',
  opportunity: 'green',
  motivation: 'purple',
};

// ─── Helpers ──────────────────────────────────────────────

export function getCasiDeterminant(id: CasiDeterminant): CasiDeterminantDefinition {
  return CASI_DETERMINANTS[id];
}

export function getCasiByComB(component: 'capability' | 'opportunity' | 'motivation'): CasiDeterminantDefinition[] {
  return CASI_BY_COMB[component].map((id) => CASI_DETERMINANTS[id]);
}

/**
 * Format all CASI determinants as a markdown prompt section for AI consumption.
 */
export function formatCasiDeterminantsForPrompt(): string {
  const lines = ['## CASI Behavioral Determinants (9 dimensions)', ''];
  for (const det of Object.values(CASI_DETERMINANTS)) {
    lines.push(`### ${det.name} (COM-B: ${det.comBComponent} — ${det.comBSubComponent})`);
    lines.push(det.description);
    lines.push('Diagnostic questions:');
    for (const q of det.diagnosticQuestions) {
      lines.push(`- ${q}`);
    }
    lines.push('');
  }
  return lines.join('\n');
}
