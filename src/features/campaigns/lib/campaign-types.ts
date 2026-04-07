// =============================================================================
// Campaign Types — 3 types based on Binet & Field IPA, Google Hero/Hub/Hygiene
// Determines creative approach, pipeline routing, and deliverable preferences.
// =============================================================================

import type { CampaignType, CampaignGoalType } from '../types/campaign-wizard.types';
import type { LucideIcon } from 'lucide-react';
import { Sparkles, BookOpen, Target } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────

export interface CampaignTypeDefinition {
  id: CampaignType;
  label: string;
  description: string;
  icon: LucideIcon;
  creativeApproach: string;
  timeHorizon: string;
  /** Ordered list of preferred deliverable categories */
  deliverableCategoryPreferences: string[];
}

// ─── Campaign Type Definitions ──────────────────────────────

export const CAMPAIGN_TYPES: CampaignTypeDefinition[] = [
  {
    id: 'brand',
    label: 'Brand Campaign',
    description: 'Build fame, emotion, and distinctiveness through big creative ideas.',
    icon: Sparkles,
    creativeApproach: 'Emotion & Fame',
    timeHorizon: 'Long-term (3-12+ months)',
    deliverableCategoryPreferences: [
      'Video & Audio',
      'Social Media',
      'PR, HR & Communications',
      'Advertising & Paid',
      'Long-Form Content',
      'Website & Landing Pages',
      'Email & Automation',
      'Sales Enablement',
    ],
  },
  {
    id: 'content',
    label: 'Content Campaign',
    description: 'Build authority and trust through valuable, expert-driven content.',
    icon: BookOpen,
    creativeApproach: 'Expertise & Value',
    timeHorizon: 'Medium-term (always-on)',
    deliverableCategoryPreferences: [
      'Long-Form Content',
      'Social Media',
      'Video & Audio',
      'Email & Automation',
      'PR, HR & Communications',
      'Website & Landing Pages',
      'Advertising & Paid',
      'Sales Enablement',
    ],
  },
  {
    id: 'activation',
    label: 'Activation Campaign',
    description: 'Drive immediate action through targeted conversion mechanics.',
    icon: Target,
    creativeApproach: 'Conversion & Urgency',
    timeHorizon: 'Short-term (days to weeks)',
    deliverableCategoryPreferences: [
      'Website & Landing Pages',
      'Email & Automation',
      'Advertising & Paid',
      'Sales Enablement',
      'Social Media',
      'Long-Form Content',
      'Video & Audio',
      'PR, HR & Communications',
    ],
  },
];

// ─── Lookup Helpers ───────────────────────────────────────

export function getCampaignType(id: string): CampaignTypeDefinition | undefined {
  return CAMPAIGN_TYPES.find((t) => t.id === id);
}

/**
 * Auto-recommend a campaign type based on the selected goal type.
 * Based on Binet & Field effectiveness research:
 * - Brand-building goals → brand campaign
 * - Authority/engagement goals → content campaign
 * - Conversion/activation goals → activation campaign
 */
export function getRecommendedCampaignType(goalType: CampaignGoalType): CampaignType {
  const mapping: Record<string, CampaignType> = {
    // Growth & Awareness → Brand
    BRAND_AWARENESS: 'brand',
    REBRANDING: 'brand',
    MARKET_EXPANSION: 'brand',
    // Engagement & Loyalty → Content
    CONTENT_MARKETING: 'content',
    AUDIENCE_ENGAGEMENT: 'content',
    COMMUNITY_BUILDING: 'content',
    LOYALTY_RETENTION: 'content',
    LINKEDIN_GROWTH: 'content',
    // Brand & Culture → Content
    THOUGHT_LEADERSHIP: 'content',
    EMPLOYER_BRANDING: 'content',
    INTERNAL_BRANDING: 'content',
    CSR_IMPACT: 'content',
    // Conversion & Activation → Activation
    PRODUCT_LAUNCH: 'activation',
    LEAD_GENERATION: 'activation',
    SALES_ACTIVATION: 'activation',
    EVENT_SEASONAL: 'activation',
    // Legacy mappings
    BRAND: 'brand',
    PRODUCT: 'activation',
    CONTENT: 'content',
    ENGAGEMENT: 'content',
  };
  return mapping[goalType] ?? 'brand';
}

// ─── AI Prompt Guidance ─────────────────────────────────

/**
 * Returns campaign-type-specific guidance for injection into AI prompts.
 * Each type steers the creative approach, deliverable tone, and success criteria.
 */
export function getCampaignTypeGuidance(id: string): string {
  const guidance: Record<string, string> = {
    brand: `## Campaign Type: Brand Campaign (Emotion & Fame)

This is a BRAND CAMPAIGN. The primary objective is building long-term mental availability through emotional resonance, distinctive creative, and broad reach.

**Creative Approach:**
- Lead with emotion, not information. Make people FEEL something before asking them to DO something.
- Prioritize fame-driving ideas: work that people talk about, share, and remember.
- Build or reinforce distinctive brand assets (visual identity, sonic branding, characters, taglines).
- Apply Byron Sharp's principles: reach ALL category buyers, not just "your target".
- Use Binet & Field's evidence: emotional campaigns create 2x the profit of rational ones over 3+ years.

**Deliverable Tone:**
- Every touchpoint should express the brand's personality and values, not just features and benefits.
- Hero content (brand films, experiential activations) should anchor the campaign.
- Social and PR should amplify the hero moment, not exist independently.
- Paid media should prioritize reach and frequency over targeting precision.

**Success Criteria:**
- Aided/unaided brand recall lift
- Share of voice vs. competitors
- Brand sentiment and favorability
- Mental availability (being thought of in buying situations)`,

    content: `## Campaign Type: Content Campaign (Expertise & Value)

This is a CONTENT CAMPAIGN. The primary objective is building authority, trust, and organic discoverability through valuable, expert-driven content.

**Creative Approach:**
- Lead with VALUE, not promotion. Every piece of content should teach, inspire, or solve a problem.
- Position the brand (or its leaders) as the go-to expert in the category.
- Follow Google's Hub model: create serialized, returning content that builds an engaged audience.
- Prioritize depth over breadth — one exceptional article outperforms ten mediocre ones.
- Content should be discoverable: optimize for SEO, social sharing, and community distribution.

**Deliverable Tone:**
- Authoritative but accessible. Write for a smart peer, not a student.
- Long-form content (articles, whitepapers, podcasts) should anchor the campaign.
- Social media should tease and distribute long-form content, not replace it.
- Email should nurture with exclusive insights, not promotional blasts.
- Landing pages should focus on content access (downloads, subscriptions) over product CTAs.

**Success Criteria:**
- Organic search rankings and traffic growth
- Content engagement (time on page, completion rate, shares)
- Email subscriber growth and engagement rates
- Thought leadership perception (mentions, invitations, citations)
- Lead quality from content-driven inbound`,

    activation: `## Campaign Type: Activation Campaign (Conversion & Urgency)

This is an ACTIVATION CAMPAIGN. The primary objective is converting existing demand into immediate, measurable action through targeted, rational messaging.

**Creative Approach:**
- Lead with CLARITY and URGENCY. Make the offer, benefit, and next step unmistakably clear.
- Apply Cialdini's principles: scarcity, social proof, authority, reciprocity.
- Structure messaging around the decision funnel: awareness → consideration → conversion → retention.
- Every touchpoint should have a specific, measurable CTA (sign up, download, buy, book).
- A/B test everything: headlines, CTAs, landing page layouts, email subject lines.

**Deliverable Tone:**
- Direct, benefit-focused, action-oriented. No ambiguity about what to do next.
- Landing pages and email sequences should anchor the campaign.
- Ads should be hyper-relevant to audience segment and funnel stage.
- Social media should drive traffic to conversion points, not just engagement.
- Sales enablement materials should arm the team with objection handlers and proof points.

**Success Criteria:**
- Conversion rate at each funnel stage
- Cost per acquisition (CPA) and return on ad spend (ROAS)
- Pipeline velocity and deal closure rate
- Landing page conversion rate
- Email open/click/conversion rates`,
  };

  return guidance[id] ?? '';
}

/**
 * Returns the preferred deliverable categories for a campaign type,
 * ordered by relevance. Used by the asset planner to prioritize suggestions.
 */
export function getDeliverablePriorities(id: string): string[] {
  return getCampaignType(id)?.deliverableCategoryPreferences ?? [];
}
