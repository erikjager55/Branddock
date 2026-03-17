// =============================================================================
// Campaign Goal Types — 15 types in 4 categories with time-binding behavior
// =============================================================================

import type { CampaignGoalType } from '../types/campaign-wizard.types';
import type { LucideIcon } from 'lucide-react';
import {
  Megaphone,
  Rocket,
  Globe,
  RefreshCw,
  PenTool,
  Users,
  Heart,
  Award,
  Briefcase,
  Building2,
  Lightbulb,
  Leaf,
  Target,
  Zap,
  CalendarDays,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

export type TimeBinding = 'time-bound' | 'always-on' | 'hybrid';

export interface GoalTypeDefinition {
  id: CampaignGoalType;
  label: string;
  description: string;
  icon: LucideIcon;
  timeBinding: TimeBinding;
}

export interface GoalCategory {
  key: string;
  label: string;
  types: GoalTypeDefinition[];
}

// ─── Categories & Goal Types ──────────────────────────────

export const GOAL_CATEGORIES: GoalCategory[] = [
  {
    key: 'growth',
    label: 'Growth & Awareness',
    types: [
      {
        id: 'BRAND_AWARENESS',
        label: 'Brand Awareness',
        description: 'Boost your brand\'s visibility and recognition among your target audience. Ideal for new brands establishing themselves or existing brands looking to increase share of voice.',
        icon: Megaphone,
        timeBinding: 'hybrid',
      },
      {
        id: 'PRODUCT_LAUNCH',
        label: 'Product Launch',
        description: 'Plan and execute the introduction of a new product or service. Covers the full launch timeline from pre-launch teasers through launch moment to post-launch sustain.',
        icon: Rocket,
        timeBinding: 'time-bound',
      },
      {
        id: 'MARKET_EXPANSION',
        label: 'Market Expansion',
        description: 'Enter a new geographic market, customer segment, or industry vertical. Adapts messaging and channel strategy to resonate with a new audience while building local credibility.',
        icon: Globe,
        timeBinding: 'time-bound',
      },
      {
        id: 'REBRANDING',
        label: 'Rebranding / Brand Refresh',
        description: 'Reposition or modernize your brand identity. Guides the phased rollout from internal alignment to external communication, ensuring consistency across all touchpoints.',
        icon: RefreshCw,
        timeBinding: 'time-bound',
      },
    ],
  },
  {
    key: 'engagement',
    label: 'Engagement & Loyalty',
    types: [
      {
        id: 'CONTENT_MARKETING',
        label: 'Content Marketing',
        description: 'Build a sustainable content engine that attracts and retains customers. Focuses on creating valuable, always-on content across Hero, Hub, and Hygiene formats for organic growth.',
        icon: PenTool,
        timeBinding: 'always-on',
      },
      {
        id: 'AUDIENCE_ENGAGEMENT',
        label: 'Audience Engagement',
        description: 'Deepen the connection between your brand and its audience. Prioritizes two-way interaction through polls, UGC campaigns, community events, and conversational content.',
        icon: Users,
        timeBinding: 'hybrid',
      },
      {
        id: 'COMMUNITY_BUILDING',
        label: 'Community Building',
        description: 'Create and nurture a community around your brand\'s shared values. Focuses on long-term member-to-member connections and exclusive content rather than short-term metrics.',
        icon: Heart,
        timeBinding: 'always-on',
      },
      {
        id: 'LOYALTY_RETENTION',
        label: 'Loyalty & Retention',
        description: 'Strengthen relationships with existing customers to increase lifetime value. Designs personalized communication, loyalty programs, and feedback loops to reduce churn.',
        icon: Award,
        timeBinding: 'always-on',
      },
    ],
  },
  {
    key: 'culture',
    label: 'Brand & Culture',
    types: [
      {
        id: 'EMPLOYER_BRANDING',
        label: 'Employer Branding',
        description: 'Attract top talent and strengthen your reputation as an employer. Showcases company culture, employee stories, and career opportunities across recruitment channels.',
        icon: Briefcase,
        timeBinding: 'always-on',
      },
      {
        id: 'INTERNAL_BRANDING',
        label: 'Internal Branding',
        description: 'Align your employees around your brand\'s purpose, values, and culture. Uses internal channels and ambassador programs to make the brand story personally relevant.',
        icon: Building2,
        timeBinding: 'hybrid',
      },
      {
        id: 'THOUGHT_LEADERSHIP',
        label: 'Thought Leadership',
        description: 'Position your brand or key leaders as authorities in your industry. Creates opinion pieces, research reports, and expert commentary that prioritize depth over frequency.',
        icon: Lightbulb,
        timeBinding: 'always-on',
      },
      {
        id: 'CSR_IMPACT',
        label: 'CSR & Social Impact',
        description: 'Communicate your sustainability and social responsibility efforts authentically. Leads with measurable actions and outcomes, partnering with credible organizations.',
        icon: Leaf,
        timeBinding: 'hybrid',
      },
    ],
  },
  {
    key: 'conversion',
    label: 'Conversion & Activation',
    types: [
      {
        id: 'LEAD_GENERATION',
        label: 'Lead Generation',
        description: 'Capture qualified leads through targeted content and conversion funnels. Optimizes lead magnets, landing pages, and nurture sequences for cost-per-lead and quality.',
        icon: Target,
        timeBinding: 'always-on',
      },
      {
        id: 'SALES_ACTIVATION',
        label: 'Sales Activation',
        description: 'Drive immediate conversions and revenue through time-limited campaigns. Uses direct response messaging with clear calls-to-action and measurable ROAS.',
        icon: Zap,
        timeBinding: 'time-bound',
      },
      {
        id: 'EVENT_SEASONAL',
        label: 'Event / Seasonal',
        description: 'Create campaigns around specific events, holidays, or seasons. Builds anticipation through teaser-to-followup phases with urgency-driven messaging.',
        icon: CalendarDays,
        timeBinding: 'time-bound',
      },
    ],
  },
];

// ─── Derived Constants ────────────────────────────────────

/** Flat array of all 15 goal type definitions */
export const ALL_GOAL_TYPES: GoalTypeDefinition[] = GOAL_CATEGORIES.flatMap(
  (cat) => cat.types,
);

/** ID → label mapping (includes legacy IDs for backward compatibility) */
export const GOAL_LABELS: Record<string, string> = {
  // Current 15 types
  ...Object.fromEntries(ALL_GOAL_TYPES.map((t) => [t.id, t.label])),
  // Legacy IDs from before expansion
  BRAND: 'Brand Awareness',
  PRODUCT: 'Product Launch',
  CONTENT: 'Content Marketing',
  ENGAGEMENT: 'Audience Engagement',
};

// ─── Lookup Helpers ───────────────────────────────────────

/** Get the full definition for a goal type ID */
export function getGoalType(id: string): GoalTypeDefinition | undefined {
  return ALL_GOAL_TYPES.find((t) => t.id === id);
}

/** Get the time-binding for a goal type (default: 'hybrid') */
export function getTimeBinding(id: string): TimeBinding {
  return getGoalType(id)?.timeBinding ?? 'hybrid';
}

/** Strategic guidance per goal type — injected into AI prompts */
export function getGoalTypeGuidance(id: string): string {
  const guidance: Record<string, string> = {
    BRAND_AWARENESS:
      'Focus on broad reach and frequency. Prioritize top-of-funnel channels (social, display, PR) and memorable creative that builds mental availability. Measure aided/unaided recall and share of voice.',
    PRODUCT_LAUNCH:
      'Structure the campaign around a clear launch timeline with pre-launch teasers, launch moment, and post-launch sustain phases. Emphasize product differentiation, use cases, and urgency. Include both awareness and conversion-focused touchpoints.',
    MARKET_EXPANSION:
      'Adapt messaging for the new market segment or geography. Research local cultural nuances, competitor landscape, and channel preferences. Build credibility through localized proof points and partnerships.',
    REBRANDING:
      'Plan a phased rollout: internal alignment first, then external reveal. Manage stakeholder expectations and communicate the "why" behind the change. Ensure visual and verbal consistency across all touchpoints.',
    CONTENT_MARKETING:
      'Build an always-on content engine with a mix of Hero (big moments), Hub (regular series), and Hygiene (evergreen SEO) content. Focus on thought leadership, organic search, and audience value over promotion.',
    AUDIENCE_ENGAGEMENT:
      'Prioritize two-way interaction: polls, UGC campaigns, community events, and conversational content. Measure engagement rate, sentiment, and community growth over raw reach.',
    COMMUNITY_BUILDING:
      'Create spaces for your audience to connect with each other and the brand. Focus on shared values, exclusive content, and member-to-member interactions. Think long-term loyalty over short-term metrics.',
    LOYALTY_RETENTION:
      'Design for existing customers: personalized communication, loyalty rewards, exclusive previews, and feedback loops. Reduce churn through proactive engagement and demonstrate ongoing value.',
    EMPLOYER_BRANDING:
      'Showcase company culture, employee stories, and career development opportunities. Target both active job seekers and passive talent. Use LinkedIn, Glassdoor, career pages, and employee advocacy as primary channels.',
    INTERNAL_BRANDING:
      'Align employees around brand purpose and values. Use internal channels (intranet, town halls, Slack, email) and create ambassador programs. Make the brand story personally relevant to every team member.',
    THOUGHT_LEADERSHIP:
      'Position key executives or the brand as industry authority. Create opinion pieces, research reports, speaking engagements, and expert commentary. Prioritize depth and originality over frequency.',
    CSR_IMPACT:
      'Communicate sustainability and social impact authentically. Lead with actions and measurable outcomes, not just claims. Partner with credible organizations and involve stakeholders in the narrative.',
    LEAD_GENERATION:
      'Build a conversion funnel with lead magnets (whitepapers, webinars, tools), landing pages, and nurture sequences. Optimize for cost-per-lead and lead quality. Balance gated and ungated content.',
    SALES_ACTIVATION:
      'Drive immediate action with time-limited offers, promotions, or events. Use direct response messaging with clear CTAs. Measure ROAS, conversion rate, and revenue attribution.',
    EVENT_SEASONAL:
      'Build anticipation with a countdown approach: teaser, announcement, engagement, and follow-up phases. Align creative with the seasonal or event theme. Create urgency through limited-time messaging.',
    // Legacy mappings
    BRAND: 'Focus on broad reach and frequency. Prioritize top-of-funnel channels and memorable creative that builds mental availability.',
    PRODUCT: 'Structure the campaign around a clear launch timeline with pre-launch, launch moment, and post-launch sustain phases.',
    CONTENT: 'Build an always-on content engine with a mix of Hero, Hub, and Hygiene content. Focus on organic search and audience value.',
    ENGAGEMENT: 'Prioritize two-way interaction: polls, UGC campaigns, community events, and conversational content.',
  };

  return guidance[id] ?? 'Create a balanced campaign strategy aligned with the brand positioning and target audience.';
}
