/**
 * Binet & Field IPA Effectiveness Data
 *
 * Based on "The Long and the Short of It" (2013) and subsequent IPA
 * Effectiveness research. Provides evidence-based marketing effectiveness
 * rules derived from analysis of 1,000+ IPA case studies.
 *
 * Used in strategy-phase prompt injection to ground recommendations in proven data.
 */

// ─── Types ──────────────────────────────────────────────

export interface IpaEffectivenessRule {
  id: string;
  name: string;
  finding: string;
  source: string;
  dataPoint: string;
  implication: string;
}

// ─── IPA Effectiveness Rules ────────────────────────────

export const IPA_EFFECTIVENESS: Record<string, IpaEffectivenessRule> = {
  brand_activation_split: {
    id: 'brand_activation_split',
    name: '60/40 Brand vs Activation',
    finding: 'Optimal budget allocation is approximately 60% brand-building, 40% sales activation. This ratio maximizes long-term profit growth.',
    source: 'Binet & Field, "The Long and the Short of It" (2013)',
    dataPoint: 'IPA analysis of 996 campaigns: 60/40 split produces ~2x the profit impact vs activation-only approaches.',
    implication: 'Campaign strategies should balance long-term brand effects with short-term activation. Purely activation-focused campaigns sacrifice future growth.',
  },
  emotional_over_rational: {
    id: 'emotional_over_rational',
    name: 'Emotional > Rational (2x)',
    finding: 'Emotional campaigns produce roughly twice the profit of rational/informational campaigns over the long term.',
    source: 'Binet & Field, IPA DataBank (2007-2013)',
    dataPoint: 'Emotional campaigns: 31% large profit gains vs Rational campaigns: 16% large profit gains. Combined approaches: 26%.',
    implication: 'Lead with emotional resonance, not product features. Rational messaging supports but should not lead the creative strategy.',
  },
  fame_driving: {
    id: 'fame_driving',
    name: 'Fame-Driving Campaigns (4x)',
    finding: 'Campaigns designed to generate fame (cultural conversation, PR, word-of-mouth) are 4x more efficient than those that don\'t.',
    source: 'Binet & Field, "Media in Focus" (2017)',
    dataPoint: 'Fame campaigns: 10% efficiency vs Non-fame: 2.5% efficiency. Fame amplifies media investment return by 4x.',
    implication: 'Design campaigns with built-in talkability and cultural relevance. Aim for earned media amplification beyond paid reach.',
  },
  sov_som: {
    id: 'sov_som',
    name: 'Excess Share of Voice (ESOV)',
    finding: 'Brands that invest above their market share (SOV > SOM) tend to grow. Brands that invest below tend to shrink.',
    source: 'Binet & Field; originally John Philip Jones; confirmed by IPA',
    dataPoint: 'For every 10 percentage points of ESOV, brands grow market share by ~0.5% per year on average.',
    implication: 'Budget should be set relative to market position, not just absolute spend. Challenger brands need disproportionate investment.',
  },
  creative_commitment: {
    id: 'creative_commitment',
    name: 'Creative Commitment',
    finding: 'The most effective campaigns commit to a single creative idea and sustain it over time. Constantly changing creative reduces effectiveness.',
    source: 'Peter Field, "The Crisis in Creative Effectiveness" (2019)',
    dataPoint: 'Campaigns running 3+ years are 3x more effective at driving market share than short-term campaigns.',
    implication: 'Invest in a strong creative platform that can be sustained. Resist the temptation to change creative for novelty.',
  },
  channel_multiplier: {
    id: 'channel_multiplier',
    name: 'Channel Multiplier Effect (3+)',
    finding: 'Using 3 or more channels multiplies campaign effectiveness significantly. Each additional channel amplifies the others.',
    source: 'Binet & Field, "Media in Focus" (2017)',
    dataPoint: 'Campaigns using 3+ channels: 6% average market share gain vs 1 channel: 2.4% gain. Integrated campaigns outperform by 2.5x.',
    implication: 'Plan for multi-channel orchestration, not single-channel execution. Each channel should play a distinct role in the customer journey.',
  },
  long_term_effects: {
    id: 'long_term_effects',
    name: 'Long-Term Brand Effects (6+ months)',
    finding: 'Brand-building effects take 6+ months to materialize and compound over years. Short-term metrics undervalue brand campaigns.',
    source: 'Les Binet, "Effectiveness in Context" (2018)',
    dataPoint: 'Brand campaigns measured at 6 months show 50% of their total effect. Full effect materializes over 2-3 years.',
    implication: 'Set realistic timelines for brand campaigns. Measure both short-term activation metrics and long-term brand health indicators.',
  },
};

// ─── Helpers ────────────────────────────────────────────

export function getEffectivenessRule(id: string): IpaEffectivenessRule | undefined {
  return IPA_EFFECTIVENESS[id];
}

export function formatEffectivenessForPrompt(): string {
  const lines = ['## Marketing Effectiveness (Binet & Field IPA Data)', ''];
  for (const rule of Object.values(IPA_EFFECTIVENESS)) {
    lines.push(`### ${rule.name}`);
    lines.push(rule.finding);
    lines.push(`**Data**: ${rule.dataPoint}`);
    lines.push(`**Implication**: ${rule.implication}`);
    lines.push('');
  }
  return lines.join('\n');
}
