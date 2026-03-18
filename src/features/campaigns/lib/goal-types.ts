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

// ─── Strategic Insights per Goal Type ─────────────────────

export interface GoalTypeStrategicInsights {
  label: string;
  recommendedKPIs: Array<{ name: string; description: string; benchmark?: string }>;
  pitfalls: string[];
  channelEmphasis: {
    primary: string[];
    secondary: string[];
    avoid: string[];
  };
  contentFormats: Array<{ format: string; priority: 'high' | 'medium' | 'low'; rationale: string }>;
  timingConsiderations: string;
  funnelEmphasis: {
    awareness: number;
    consideration: number;
    conversion: number;
    retention: number;
  };
}

/**
 * Returns hardcoded strategic insights for all 15 goal types.
 * Data informed by Binet & Field IPA effectiveness research,
 * Google HHH (Hero-Hub-Hygiene) framework, and Percy & Elliott campaign planning model.
 * Includes legacy mappings for backward compatibility.
 */
export function getGoalTypeStrategicInsights(id: string): GoalTypeStrategicInsights | null {
  // Primary insights for all 15 modern goal types
  const primaryInsights: Record<string, GoalTypeStrategicInsights> = {
    BRAND_AWARENESS: {
      label: 'Brand Awareness',
      recommendedKPIs: [
        { name: 'Aided Brand Recall', description: 'Percentage of target audience that recognizes the brand when prompted', benchmark: '40-60% after 3 months' },
        { name: 'Share of Voice', description: 'Brand mentions relative to competitors across media channels', benchmark: 'Exceed market share by 8-10%' },
        { name: 'Brand Search Volume', description: 'Growth in organic branded search queries', benchmark: '+15-25% quarter-over-quarter' },
        { name: 'Reach & Frequency', description: 'Unique audience reached and average exposures per person', benchmark: '60% reach at 3+ frequency' },
      ],
      pitfalls: [
        'Optimizing for clicks instead of reach — awareness campaigns need broad mental availability, not direct response metrics.',
        'Inconsistent brand codes (visual, verbal, sonic) dilute recognition over time.',
        'Cutting spend too early — Binet & Field show brand effects take 6+ months to compound.',
      ],
      channelEmphasis: {
        primary: ['Social media (organic & paid)', 'Display & programmatic', 'Video (YouTube, CTV)'],
        secondary: ['PR & earned media', 'Influencer partnerships', 'Podcast sponsorships'],
        avoid: ['Performance-only channels (affiliate)', 'Cold outbound email'],
      },
      contentFormats: [
        { format: 'Hero video (15-60s)', priority: 'high', rationale: 'Emotional storytelling builds mental availability per Binet & Field IPA data.' },
        { format: 'Social-first short-form video', priority: 'high', rationale: 'Reels/TikTok drive broad organic reach in awareness-phase audiences.' },
        { format: 'Display banners & rich media', priority: 'medium', rationale: 'Repetition at scale reinforces brand codes and visual recognition.' },
        { format: 'Sponsored editorial / thought pieces', priority: 'medium', rationale: 'Contextual placements build credibility alongside awareness.' },
      ],
      timingConsiderations: 'Always-on base layer with hero spikes around key cultural moments. Per Binet & Field, sustained investment over 6-12 months yields compounding brand effects.',
      funnelEmphasis: { awareness: 60, consideration: 25, conversion: 10, retention: 5 },
    },

    PRODUCT_LAUNCH: {
      label: 'Product Launch',
      recommendedKPIs: [
        { name: 'Launch Week Sales / Sign-ups', description: 'Volume of conversions in the first 7 days post-launch', benchmark: '20-30% of quarter target in week 1' },
        { name: 'Product Page Conversion Rate', description: 'Visitors to product page that complete desired action', benchmark: '3-8% depending on category' },
        { name: 'Waitlist / Pre-order Volume', description: 'Number of prospects registered before launch', benchmark: '1,000-5,000 for mid-market B2B' },
        { name: 'Media Mentions', description: 'Coverage in trade press and industry publications', benchmark: '10-20 placements in first month' },
      ],
      pitfalls: [
        'Skipping the pre-launch teaser phase — launches without anticipation-building generate 40-60% less first-week impact.',
        'Treating launch as a single moment instead of a 3-phase arc (tease, launch, sustain).',
        'Failing to arm sales and support teams with launch messaging before go-live.',
        'Over-investing in awareness without conversion-ready landing pages and CTAs.',
      ],
      channelEmphasis: {
        primary: ['Email marketing (segmented)', 'Paid social (targeted)', 'PR & press outreach'],
        secondary: ['Influencer seeding', 'Content marketing (blog, video)', 'Webinars & live demos'],
        avoid: ['Broad display without retargeting', 'Untargeted mass media'],
      },
      contentFormats: [
        { format: 'Product demo / explainer video', priority: 'high', rationale: 'Demonstrates value proposition clearly — highest conversion driver for new products.' },
        { format: 'Teaser campaign (countdown, behind-the-scenes)', priority: 'high', rationale: 'Builds anticipation and waitlist per Percy & Elliott launch model.' },
        { format: 'Customer testimonials / beta reviews', priority: 'medium', rationale: 'Social proof reduces purchase anxiety for unfamiliar products.' },
        { format: 'Comparison / migration guide', priority: 'medium', rationale: 'Reduces switching friction for prospects using competitor solutions.' },
      ],
      timingConsiderations: 'Structure around 3 phases: teaser (2-4 weeks pre-launch), launch moment (concentrated 48-72h burst), and sustain (4-8 weeks post-launch for long-tail conversion).',
      funnelEmphasis: { awareness: 30, consideration: 35, conversion: 30, retention: 5 },
    },

    MARKET_EXPANSION: {
      label: 'Market Expansion',
      recommendedKPIs: [
        { name: 'New Market Penetration Rate', description: 'Percentage of target segment in new market reached', benchmark: '5-10% in first 6 months' },
        { name: 'Local Brand Awareness', description: 'Unaided recall in the new market or segment', benchmark: '15-25% after initial campaign wave' },
        { name: 'Cost Per Acquired Customer (New Market)', description: 'Acquisition cost in the new market vs. core market', benchmark: 'Within 1.5-2x of core market CAC' },
        { name: 'Local Partnership Activations', description: 'Number of strategic partnerships or collaborations established', benchmark: '3-5 in first quarter' },
      ],
      pitfalls: [
        'Copy-pasting core market messaging without local cultural adaptation — what resonates in one market may alienate another.',
        'Underestimating the time needed to build local credibility — new markets require proof points, not just awareness.',
        'Ignoring local competitor landscape and channel preferences.',
      ],
      channelEmphasis: {
        primary: ['Local social media platforms', 'Local PR & media relations', 'Strategic partnerships & co-branding'],
        secondary: ['Localized search (SEO/SEM)', 'Event sponsorships', 'Community engagement'],
        avoid: ['Global campaigns without localization', 'Channels with low penetration in target market'],
      },
      contentFormats: [
        { format: 'Localized case studies & success stories', priority: 'high', rationale: 'Local proof points build trust faster than global brand claims.' },
        { format: 'Market-specific landing pages', priority: 'high', rationale: 'Culturally adapted copy and imagery increase conversion in new segments.' },
        { format: 'Partnership co-content', priority: 'medium', rationale: 'Leverages existing local brand credibility via association.' },
        { format: 'Thought leadership adapted for local context', priority: 'medium', rationale: 'Positions brand as knowledgeable about local market dynamics.' },
      ],
      timingConsiderations: 'Plan for a 6-12 month ramp-up. Initial phase focuses on credibility and partnerships, followed by broader awareness and demand generation once local trust is established.',
      funnelEmphasis: { awareness: 45, consideration: 30, conversion: 20, retention: 5 },
    },

    REBRANDING: {
      label: 'Rebranding / Brand Refresh',
      recommendedKPIs: [
        { name: 'Brand Perception Shift', description: 'Change in key brand attribute associations pre vs. post rebrand', benchmark: '+10-15 points on target attributes within 6 months' },
        { name: 'Employee Brand Alignment', description: 'Internal adoption of new brand language and visual identity', benchmark: '80%+ consistency within 3 months' },
        { name: 'Stakeholder Sentiment', description: 'Positive vs. negative sentiment ratio around the rebrand announcement', benchmark: '3:1 positive-to-negative ratio' },
        { name: 'Touchpoint Consistency Score', description: 'Percentage of customer touchpoints updated to new brand', benchmark: '95% within 60 days of launch' },
      ],
      pitfalls: [
        'Launching externally before internal teams are fully aligned — employees are the first brand ambassadors.',
        'Focusing on visual identity alone without updating brand voice, messaging, and strategic positioning.',
        'Failing to communicate the "why" behind the rebrand to customers and stakeholders.',
        'Rushing the rollout — phased migration prevents customer confusion.',
      ],
      channelEmphasis: {
        primary: ['Internal communications (intranet, town halls)', 'Owned media (website, social profiles)', 'PR & press release'],
        secondary: ['Email to existing customers', 'Partner & stakeholder briefings', 'Paid social announcement'],
        avoid: ['Performance campaigns during transition period', 'Aggressive outbound during brand ambiguity phase'],
      },
      contentFormats: [
        { format: 'Brand story video ("Why We Changed")', priority: 'high', rationale: 'Narrative-driven explanation reduces negative sentiment and builds emotional buy-in.' },
        { format: 'Internal brand toolkit & guidelines', priority: 'high', rationale: 'Ensures consistency — the #1 factor in successful rebrands.' },
        { format: 'Customer FAQ / transition guide', priority: 'medium', rationale: 'Proactively addresses confusion and demonstrates customer care.' },
        { format: 'Before/after visual showcase', priority: 'low', rationale: 'Engages design community and generates organic PR coverage.' },
      ],
      timingConsiderations: 'Phase 1: internal alignment (2-4 weeks), Phase 2: external reveal (concentrated 1-2 week window), Phase 3: sustained storytelling and touchpoint migration (8-12 weeks).',
      funnelEmphasis: { awareness: 50, consideration: 25, conversion: 5, retention: 20 },
    },

    CONTENT_MARKETING: {
      label: 'Content Marketing',
      recommendedKPIs: [
        { name: 'Organic Traffic Growth', description: 'Month-over-month increase in non-paid search traffic', benchmark: '+10-20% MoM in first 6 months' },
        { name: 'Content Engagement Rate', description: 'Average time on page, scroll depth, and interaction rate', benchmark: '2+ min avg. time, 60%+ scroll depth' },
        { name: 'Email Subscriber Growth', description: 'New subscribers acquired through content (newsletter, gated assets)', benchmark: '+500-2,000/month depending on niche' },
        { name: 'Content-Attributed Pipeline', description: 'Revenue pipeline influenced by content touchpoints', benchmark: '20-30% of total pipeline' },
      ],
      pitfalls: [
        'Publishing without a documented content strategy — random acts of content rarely compound.',
        'Over-indexing on SEO hygiene content at the expense of differentiated hero and hub content (Google HHH imbalance).',
        'Treating content as a campaign instead of an always-on engine with sustained investment.',
      ],
      channelEmphasis: {
        primary: ['Blog / website content hub', 'SEO & organic search', 'Email newsletter'],
        secondary: ['LinkedIn (B2B) / Instagram (B2C)', 'YouTube / podcast', 'Guest posting & syndication'],
        avoid: ['Pay-per-click without content strategy', 'Interruptive ad formats'],
      },
      contentFormats: [
        { format: 'Evergreen SEO articles (Hygiene)', priority: 'high', rationale: 'Foundation of Google HHH model — captures ongoing search demand and compounds over time.' },
        { format: 'Regular content series (Hub)', priority: 'high', rationale: 'Builds habit and audience loyalty through predictable, valuable content cadence.' },
        { format: 'Hero content pieces (reports, guides)', priority: 'medium', rationale: 'Tentpole assets drive spikes in traffic, links, and brand authority.' },
        { format: 'Repurposed micro-content (social, email)', priority: 'medium', rationale: 'Extends reach of core content across channels with minimal incremental effort.' },
      ],
      timingConsiderations: 'Always-on publishing cadence: 70% Hygiene (weekly), 20% Hub (bi-weekly series), 10% Hero (quarterly tentpoles). Results compound after 4-6 months of consistent output.',
      funnelEmphasis: { awareness: 35, consideration: 40, conversion: 15, retention: 10 },
    },

    AUDIENCE_ENGAGEMENT: {
      label: 'Audience Engagement',
      recommendedKPIs: [
        { name: 'Engagement Rate', description: 'Likes, comments, shares, and saves divided by reach', benchmark: '3-6% on social, 15-25% on email' },
        { name: 'User-Generated Content Volume', description: 'Number of UGC pieces created by audience per campaign', benchmark: '50-200 pieces per activation' },
        { name: 'Sentiment Score', description: 'Ratio of positive to neutral/negative brand mentions', benchmark: '70%+ positive sentiment' },
        { name: 'Community Growth Rate', description: 'New followers, members, or subscribers per month', benchmark: '+5-10% month-over-month' },
      ],
      pitfalls: [
        'Measuring reach instead of engagement depth — vanity metrics mask lack of genuine interaction.',
        'One-way broadcasting disguised as engagement — true engagement requires two-way dialogue.',
        'Ignoring negative feedback instead of using it as engagement opportunity.',
      ],
      channelEmphasis: {
        primary: ['Social media (Instagram, TikTok, LinkedIn)', 'Community platforms (Discord, Slack)', 'Interactive email'],
        secondary: ['Live events & webinars', 'Polls & surveys', 'User forums'],
        avoid: ['Static display advertising', 'Non-interactive print media'],
      },
      contentFormats: [
        { format: 'Interactive content (polls, quizzes, Q&A)', priority: 'high', rationale: 'Drives direct participation — interactive content gets 2x the engagement of static content.' },
        { format: 'UGC campaigns & challenges', priority: 'high', rationale: 'Turns audience into co-creators, deepening emotional investment in the brand.' },
        { format: 'Behind-the-scenes & real-time content', priority: 'medium', rationale: 'Authenticity drives trust and makes the brand feel approachable.' },
        { format: 'Conversational social posts', priority: 'medium', rationale: 'Question-led posts invite dialogue, boosting algorithm visibility and genuine interaction.' },
      ],
      timingConsiderations: 'Hybrid approach: always-on conversational presence with periodic engagement spikes around interactive campaigns, cultural moments, and community events.',
      funnelEmphasis: { awareness: 25, consideration: 35, conversion: 10, retention: 30 },
    },

    COMMUNITY_BUILDING: {
      label: 'Community Building',
      recommendedKPIs: [
        { name: 'Monthly Active Members', description: 'Members who actively participate (post, comment, react) each month', benchmark: '20-30% of total membership' },
        { name: 'Member-to-Member Interactions', description: 'Conversations initiated between members without brand involvement', benchmark: '40%+ of total conversations' },
        { name: 'Member Retention Rate', description: 'Percentage of members still active after 90 days', benchmark: '60-70% 90-day retention' },
        { name: 'Net Promoter Score (Community)', description: 'Likelihood of members recommending the community to others', benchmark: 'NPS 50+' },
      ],
      pitfalls: [
        'Treating a community like a marketing channel — members detect and resent purely promotional intent.',
        'Over-moderating or under-moderating — both destroy organic culture and member trust.',
        'Expecting immediate ROI — community value compounds over 12-18 months per network effects.',
      ],
      channelEmphasis: {
        primary: ['Owned community platform (Discord, Circle, Slack)', 'Email (community digest)', 'Virtual & in-person meetups'],
        secondary: ['Social media groups', 'Member-only content hub', 'Ambassador program'],
        avoid: ['Paid advertising within the community', 'Aggressive upselling to members'],
      },
      contentFormats: [
        { format: 'Member spotlight stories', priority: 'high', rationale: 'Celebrates members, reinforcing belonging and inspiring participation.' },
        { format: 'Exclusive educational content', priority: 'high', rationale: 'Provides unique value that justifies membership and differentiates from public content.' },
        { format: 'Community challenges & rituals', priority: 'medium', rationale: 'Shared experiences create group identity and habitual engagement.' },
        { format: 'AMA sessions & expert interviews', priority: 'medium', rationale: 'Brings external value to members while positioning the brand as a connector.' },
      ],
      timingConsiderations: 'Always-on with consistent weekly rhythms (e.g., Monday welcome, Wednesday expert thread, Friday showcase). Avoid content gaps — community momentum is hard to rebuild once lost.',
      funnelEmphasis: { awareness: 10, consideration: 15, conversion: 10, retention: 65 },
    },

    LOYALTY_RETENTION: {
      label: 'Loyalty & Retention',
      recommendedKPIs: [
        { name: 'Customer Retention Rate', description: 'Percentage of customers retained over a given period', benchmark: '85-95% annual retention (B2B SaaS)' },
        { name: 'Customer Lifetime Value (CLV)', description: 'Total revenue expected from a customer over the relationship', benchmark: 'CLV:CAC ratio of 3:1 or higher' },
        { name: 'Repeat Purchase Rate', description: 'Percentage of customers who make a second purchase', benchmark: '25-40% within 90 days' },
        { name: 'Net Promoter Score', description: 'Customer willingness to recommend the brand', benchmark: 'NPS 40+ (B2B), 50+ (D2C)' },
      ],
      pitfalls: [
        'Focusing only on discounts and rewards — transactional loyalty erodes margin without building emotional connection.',
        'Ignoring at-risk customer signals until churn is inevitable — proactive outreach at warning signs is 5x more effective.',
        'One-size-fits-all communication instead of behavior-segmented personalization.',
      ],
      channelEmphasis: {
        primary: ['Email (lifecycle & personalized)', 'In-app messaging & notifications', 'Customer success outreach'],
        secondary: ['Loyalty program platform', 'SMS (for time-sensitive offers)', 'Exclusive community or events'],
        avoid: ['Mass media advertising', 'Cold outreach to existing customers'],
      },
      contentFormats: [
        { format: 'Personalized lifecycle emails', priority: 'high', rationale: 'Behavior-triggered emails have 4x the open rate and 5x the click rate of batch campaigns.' },
        { format: 'Exclusive early access / previews', priority: 'high', rationale: 'Makes loyal customers feel valued and creates advocacy through insider status.' },
        { format: 'Customer education (tutorials, tips)', priority: 'medium', rationale: 'Increases product usage depth, which directly correlates with retention.' },
        { format: 'Win-back campaigns', priority: 'medium', rationale: 'Re-engaging lapsed customers is 5-25x cheaper than acquiring new ones.' },
      ],
      timingConsiderations: 'Always-on with lifecycle triggers: onboarding (day 1-30), value realization (day 30-90), expansion (day 90+), and at-risk intervention. Seasonal loyalty events complement the automated base.',
      funnelEmphasis: { awareness: 5, consideration: 10, conversion: 25, retention: 60 },
    },

    EMPLOYER_BRANDING: {
      label: 'Employer Branding',
      recommendedKPIs: [
        { name: 'Application-to-Hire Ratio', description: 'Quality of inbound applications relative to hires made', benchmark: 'Improve by 20-30% year-over-year' },
        { name: 'Glassdoor / Indeed Rating', description: 'Average employer rating on review platforms', benchmark: '4.0+ out of 5.0' },
        { name: 'Employee Referral Rate', description: 'Percentage of hires sourced through employee referrals', benchmark: '30-40% of all hires' },
        { name: 'Career Page Conversion Rate', description: 'Visitors to career page who submit an application', benchmark: '8-12%' },
      ],
      pitfalls: [
        'Portraying an idealized culture that does not match the actual employee experience — this backfires on Glassdoor.',
        'Only targeting active job seekers instead of building passive talent awareness over time.',
        'Treating employer branding as an HR project instead of a brand strategy initiative.',
      ],
      channelEmphasis: {
        primary: ['LinkedIn (organic & ads)', 'Career page & blog', 'Employee advocacy platforms'],
        secondary: ['Glassdoor / Indeed management', 'University partnerships', 'Instagram (culture content)'],
        avoid: ['Performance-only job boards', 'Generic mass recruitment ads'],
      },
      contentFormats: [
        { format: 'Employee story videos', priority: 'high', rationale: 'Authentic employee voices are the most trusted source of employer brand information.' },
        { format: '"Day in the life" content', priority: 'high', rationale: 'Gives candidates a realistic preview, reducing mis-hires and increasing application quality.' },
        { format: 'Culture & values showcase', priority: 'medium', rationale: 'Values alignment is the #1 driver of candidate attraction for knowledge workers.' },
        { format: 'Leadership thought leadership', priority: 'medium', rationale: 'Executives visible in industry discourse signal a learning-oriented, ambitious organization.' },
      ],
      timingConsiderations: 'Always-on employer brand presence with spikes around major hiring seasons, campus recruitment periods, and company milestones (awards, funding rounds, product launches).',
      funnelEmphasis: { awareness: 40, consideration: 35, conversion: 20, retention: 5 },
    },

    INTERNAL_BRANDING: {
      label: 'Internal Branding',
      recommendedKPIs: [
        { name: 'Employee Brand Understanding', description: 'Percentage of employees who can articulate the brand purpose and values', benchmark: '70%+ within 6 months of launch' },
        { name: 'Internal NPS / Engagement Score', description: 'Employee satisfaction with brand alignment and communication', benchmark: 'eNPS 30+' },
        { name: 'Brand Ambassador Participation', description: 'Employees actively participating in brand ambassador programs', benchmark: '15-25% of workforce' },
        { name: 'Internal Content Engagement', description: 'Open rates and interaction with internal brand communications', benchmark: '60%+ open rate on internal comms' },
      ],
      pitfalls: [
        'Top-down mandating of brand values without involving employees in the narrative — co-creation drives adoption.',
        'Treating internal branding as a one-time campaign instead of an ongoing cultural practice.',
        'Disconnect between stated values and actual leadership behavior — the fastest way to erode internal trust.',
      ],
      channelEmphasis: {
        primary: ['Internal comms platform (Slack, Teams, intranet)', 'Town halls & all-hands meetings', 'Manager-led team sessions'],
        secondary: ['Internal newsletter', 'Brand ambassador network', 'Onboarding program'],
        avoid: ['External social media for internal messages', 'Impersonal mass emails without context'],
      },
      contentFormats: [
        { format: 'Brand workshop toolkit', priority: 'high', rationale: 'Interactive team exercises create personal connection to abstract brand values.' },
        { format: 'Leadership video messages', priority: 'high', rationale: 'Leaders modeling brand behavior is the strongest signal of genuine commitment.' },
        { format: 'Employee-generated brand stories', priority: 'medium', rationale: 'Peer stories make brand values tangible and personally relatable.' },
        { format: 'Brand reference cards & wallpapers', priority: 'low', rationale: 'Ambient reminders reinforce brand language in daily work context.' },
      ],
      timingConsiderations: 'Hybrid approach: intensive launch phase (4-6 weeks of workshops and communications) followed by always-on reinforcement through rituals, recognition, and ongoing ambassador activity.',
      funnelEmphasis: { awareness: 30, consideration: 25, conversion: 10, retention: 35 },
    },

    THOUGHT_LEADERSHIP: {
      label: 'Thought Leadership',
      recommendedKPIs: [
        { name: 'Share of Conversation', description: 'Brand or executive mentions in industry discussions, panels, and publications', benchmark: 'Top 5 in category within 12 months' },
        { name: 'Content Authority Metrics', description: 'Backlinks, citations, and re-shares of thought leadership content', benchmark: '50+ backlinks per flagship piece' },
        { name: 'Speaking Engagement Invitations', description: 'Inbound requests for conference talks, podcasts, and panels', benchmark: '2-4 invitations per quarter' },
        { name: 'Qualified Inbound Leads', description: 'Decision-makers who cite thought leadership as their discovery source', benchmark: '10-15% of qualified pipeline' },
      ],
      pitfalls: [
        'Publishing generic industry commentary instead of distinctive, opinionated viewpoints — thought leadership requires a clear point of view.',
        'Prioritizing volume over depth — one well-researched piece outperforms ten shallow posts.',
        'Not amplifying content beyond owned channels — great ideas die without distribution.',
      ],
      channelEmphasis: {
        primary: ['LinkedIn (personal + company)', 'Industry publications & trade press', 'Conference speaking & podcasts'],
        secondary: ['Long-form blog / research hub', 'Email newsletter (curated insights)', 'YouTube (expert interviews)'],
        avoid: ['Paid click campaigns for thought leadership', 'Platform-native short-form without depth'],
      },
      contentFormats: [
        { format: 'Original research reports & white papers', priority: 'high', rationale: 'Data-driven insights are the most cited and shared form of thought leadership content.' },
        { format: 'Opinion articles & industry commentary', priority: 'high', rationale: 'Strong viewpoints generate debate, shares, and position the author as a category voice.' },
        { format: 'Expert interview series (podcast/video)', priority: 'medium', rationale: 'Association with respected peers elevates perceived authority through borrowed credibility.' },
        { format: 'Trend analysis & prediction pieces', priority: 'medium', rationale: 'Forward-looking content attracts decision-makers seeking strategic advantage.' },
      ],
      timingConsiderations: 'Always-on with emphasis on quality over frequency. Publish 1-2 flagship pieces per quarter with ongoing commentary. Align hero content with major industry events and annual planning cycles.',
      funnelEmphasis: { awareness: 35, consideration: 40, conversion: 20, retention: 5 },
    },

    CSR_IMPACT: {
      label: 'CSR & Social Impact',
      recommendedKPIs: [
        { name: 'Impact Metrics', description: 'Measurable social or environmental outcomes (CO2 reduced, people helped, waste diverted)', benchmark: 'Specific to initiative — always quantified' },
        { name: 'Stakeholder Trust Score', description: 'Trust in the brand\'s sustainability claims among key audiences', benchmark: '65%+ "trustworthy" rating' },
        { name: 'Earned Media Value', description: 'PR coverage and organic mentions of CSR initiatives', benchmark: '3-5x the paid media investment' },
        { name: 'Employee Pride & Engagement', description: 'Impact of CSR programs on employee satisfaction and retention', benchmark: '+10-15 points on relevant survey items' },
      ],
      pitfalls: [
        'Leading with claims instead of actions and measurable outcomes — the fastest path to greenwashing accusations.',
        'One-off CSR campaigns without long-term commitment — stakeholders see through performative gestures.',
        'Not involving credible third-party partners or certifications for independent validation.',
      ],
      channelEmphasis: {
        primary: ['Impact report (annual/quarterly)', 'PR & earned media partnerships', 'Owned content hub (sustainability page)'],
        secondary: ['Social media storytelling', 'Employee advocacy', 'Event & community partnerships'],
        avoid: ['Aggressive paid advertising of CSR claims', 'Greenwashing-prone channels (paid advertorials)'],
      },
      contentFormats: [
        { format: 'Impact reports with measurable data', priority: 'high', rationale: 'Quantified outcomes are the most credible form of CSR communication.' },
        { format: 'Documentary-style storytelling', priority: 'high', rationale: 'Shows the human side of impact — beneficiaries and partners, not just the brand.' },
        { format: 'Partner & NGO co-created content', priority: 'medium', rationale: 'Third-party endorsement provides credibility that self-published content cannot.' },
        { format: 'Employee volunteer stories', priority: 'medium', rationale: 'Internal participation makes CSR authentic and inspires further engagement.' },
      ],
      timingConsiderations: 'Hybrid: always-on transparency through owned channels with time-bound campaigns around key dates (Earth Day, World Mental Health Day) and milestone announcements. Impact reporting on annual/quarterly cycles.',
      funnelEmphasis: { awareness: 30, consideration: 25, conversion: 5, retention: 40 },
    },

    LEAD_GENERATION: {
      label: 'Lead Generation',
      recommendedKPIs: [
        { name: 'Marketing Qualified Leads (MQLs)', description: 'Leads that meet qualification criteria and are ready for sales', benchmark: '200-500/month for mid-market B2B' },
        { name: 'Cost Per Lead (CPL)', description: 'Total campaign spend divided by number of qualified leads', benchmark: '$50-150 B2B, $5-25 B2C' },
        { name: 'Lead-to-Opportunity Rate', description: 'Percentage of MQLs that convert to sales opportunities', benchmark: '15-25%' },
        { name: 'Content Download / Webinar Registration', description: 'Volume of lead magnet conversions', benchmark: '3-8% landing page conversion rate' },
      ],
      pitfalls: [
        'Gating all content — over-gating destroys organic reach and brand trust. Balance gated and ungated strategically.',
        'Optimizing for lead volume over lead quality — cheap leads that never convert waste sales capacity.',
        'Neglecting lead nurture after capture — leads that are not nurtured within 48 hours lose 80% of their value.',
      ],
      channelEmphasis: {
        primary: ['Search (SEO + SEM)', 'LinkedIn Ads (B2B)', 'Email nurture sequences'],
        secondary: ['Webinars & virtual events', 'Content syndication', 'Retargeting (display + social)'],
        avoid: ['Brand-only campaigns without conversion paths', 'Untargeted mass outreach'],
      },
      contentFormats: [
        { format: 'Lead magnets (guides, templates, tools)', priority: 'high', rationale: 'Provide tangible value in exchange for contact information — the core lead gen mechanism.' },
        { format: 'Webinars & live demos', priority: 'high', rationale: 'High-intent format with 20-40% attendee-to-lead conversion rates.' },
        { format: 'Case studies & ROI calculators', priority: 'medium', rationale: 'Bottom-of-funnel content that converts consideration into qualified pipeline.' },
        { format: 'Comparison & buyer guide content', priority: 'medium', rationale: 'Captures high-intent search traffic from prospects actively evaluating solutions.' },
      ],
      timingConsiderations: 'Always-on demand generation with optimization cycles every 2-4 weeks. Supplement with quarterly hero campaigns (major content launches, virtual events) to spike pipeline.',
      funnelEmphasis: { awareness: 15, consideration: 35, conversion: 40, retention: 10 },
    },

    SALES_ACTIVATION: {
      label: 'Sales Activation',
      recommendedKPIs: [
        { name: 'Return on Ad Spend (ROAS)', description: 'Revenue generated per unit of advertising spend', benchmark: '4:1 ROAS or higher' },
        { name: 'Conversion Rate', description: 'Percentage of targeted audience that completes purchase', benchmark: '2-5% (e-commerce), 10-20% (promo landing pages)' },
        { name: 'Revenue per Campaign', description: 'Direct revenue attributed to the activation campaign', benchmark: 'Varies — always set pre-campaign target' },
        { name: 'Average Order Value (AOV)', description: 'Average transaction value during the campaign period', benchmark: '+10-20% vs. baseline with upsell tactics' },
      ],
      pitfalls: [
        'Running sales activation without prior brand building — Binet & Field show activation-only strategies decline in effectiveness over time without brand equity.',
        'Overusing discounts as the primary lever — this trains customers to wait for sales and erodes margin.',
        'Not creating genuine urgency — false scarcity damages trust.',
        'Ignoring post-purchase experience during high-volume periods.',
      ],
      channelEmphasis: {
        primary: ['Paid search (SEM)', 'Social media ads (retargeting)', 'Email (segmented offers)'],
        secondary: ['SMS marketing', 'Affiliate & partner channels', 'Marketplace ads (Amazon, etc.)'],
        avoid: ['Brand awareness campaigns during activation window', 'Organic-only distribution for time-sensitive offers'],
      },
      contentFormats: [
        { format: 'Direct response ads with clear CTA', priority: 'high', rationale: 'Per Binet & Field, short-term activation requires direct, rational messaging with urgency cues.' },
        { format: 'Limited-time offer landing pages', priority: 'high', rationale: 'Focused conversion pages with countdown timers increase urgency and reduce decision friction.' },
        { format: 'Social proof (reviews, testimonials)', priority: 'medium', rationale: 'Reduces purchase anxiety at the moment of conversion — 92% of buyers trust peer recommendations.' },
        { format: 'Cart/browse abandonment sequences', priority: 'medium', rationale: 'Recovers 10-15% of lost conversions through timely, personalized follow-up.' },
      ],
      timingConsiderations: 'Strictly time-bound: concentrated bursts of 1-4 weeks with clear start and end dates. Per Binet & Field, activation effects spike fast but decay quickly — pair with sustained brand building between activations.',
      funnelEmphasis: { awareness: 5, consideration: 15, conversion: 70, retention: 10 },
    },

    EVENT_SEASONAL: {
      label: 'Event / Seasonal',
      recommendedKPIs: [
        { name: 'Event-Attributed Revenue', description: 'Direct revenue generated during the event or seasonal window', benchmark: '15-25% of quarterly revenue target' },
        { name: 'Pre-Event Registration / Waitlist', description: 'Anticipation-building sign-ups before the event', benchmark: '2-3x expected attendees/buyers' },
        { name: 'Social Buzz Volume', description: 'Brand mentions and hashtag usage during the event period', benchmark: '3-5x normal mention volume' },
        { name: 'Post-Event Engagement', description: 'Continued engagement rate in the 2 weeks following the event', benchmark: '30-40% of peak engagement sustained' },
      ],
      pitfalls: [
        'Starting too late — effective event campaigns need a 4-8 week build-up for anticipation.',
        'Ending abruptly — failing to plan a follow-up phase leaves revenue and engagement on the table.',
        'Not differentiating from competitor seasonal campaigns — generic seasonal messaging gets lost in the noise.',
      ],
      channelEmphasis: {
        primary: ['Social media (organic + paid)', 'Email (countdown sequences)', 'Paid search (seasonal keywords)'],
        secondary: ['Influencer partnerships', 'In-store / on-site activations', 'PR & partnerships'],
        avoid: ['Always-on channels without seasonal adaptation', 'Long-form content without urgency elements'],
      },
      contentFormats: [
        { format: 'Countdown/teaser campaign', priority: 'high', rationale: 'Builds anticipation and drives early engagement — Percy & Elliott model emphasizes the pre-event phase.' },
        { format: 'Event-day live content', priority: 'high', rationale: 'Real-time content creates FOMO and extends reach beyond physical attendees.' },
        { format: 'Limited-edition / seasonal creative', priority: 'medium', rationale: 'Unique seasonal assets stand out in crowded event periods and create collectibility.' },
        { format: 'Post-event recap & highlights', priority: 'medium', rationale: 'Extends the event lifecycle and provides content for audiences who missed the live moment.' },
      ],
      timingConsiderations: 'Strictly time-bound with 4 phases: teaser (3-4 weeks out), build-up (1-2 weeks), event moment (concentrated 1-3 days), and follow-up/recap (1-2 weeks post-event).',
      funnelEmphasis: { awareness: 25, consideration: 25, conversion: 40, retention: 10 },
    },
  };

  // Build full record with legacy aliases that reference primary entries
  const insights: Record<string, GoalTypeStrategicInsights> = {
    ...primaryInsights,
    // Legacy mappings for backward compatibility (reference primary entries)
    BRAND: primaryInsights.BRAND_AWARENESS,
    PRODUCT: primaryInsights.PRODUCT_LAUNCH,
    CONTENT: primaryInsights.CONTENT_MARKETING,
    ENGAGEMENT: primaryInsights.AUDIENCE_ENGAGEMENT,
  };

  return insights[id] ?? null;
}
