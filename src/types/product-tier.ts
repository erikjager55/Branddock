/**
 * TYPE: Product Tier
 *
 * Commercial structure with three levels of decision certainty.
 */

export type ProductTier = 'decision-scan' | 'strategic-control' | 'advisory-services';

export interface ProductTierInfo {
  id: ProductTier;
  name: string;
  tagline: string;
  description: string;
  certaintyLevel: string;
  certaintyDescription: string;
  price?: string;
  billingCycle?: string;
  features: string[];
  limitations?: string[];
  cta: string;
  color: {
    bg: string;
    text: string;
    badge: string;
  };
}

export const PRODUCT_TIERS: Record<ProductTier, ProductTierInfo> = {
  'decision-scan': {
    id: 'decision-scan',
    name: 'Decision Scan',
    tagline: 'Discover where you stand',
    description: 'Quickly gain insight into the quality of your strategic decision-making',
    certaintyLevel: 'Awareness',
    certaintyDescription: 'Understand your risks and know what to validate',
    price: 'Free',
    features: [
      'Complete decision status scan',
      'Top 3 strategic risks',
      'Personalized action plan',
      'Sample campaign strategy'
    ],
    limitations: [
      'One-time scan without updates',
      'No access to research tools',
      'No campaign generation',
      'No stakeholder reporting'
    ],
    cta: 'Start Decision Scan',
    color: {
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      text: 'text-blue-700 dark:text-blue-400',
      badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
    }
  },
  'strategic-control': {
    id: 'strategic-control',
    name: 'Strategic Control',
    tagline: 'Take control of your decisions',
    description: 'Complete platform for continuous strategic validation and decision-making',
    certaintyLevel: 'Control',
    certaintyDescription: 'Real-time insight and validated decisions',
    price: '€499',
    billingCycle: 'per month',
    features: [
      'Full Decision Engine',
      'Unlimited campaign generation',
      'Research planning & tracking',
      'Executive & stakeholder views',
      'Professional reporting',
      'Change impact monitoring',
      'Brand asset management',
      'Persona development'
    ],
    cta: 'Upgrade to Strategic Control',
    color: {
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      text: 'text-purple-700 dark:text-purple-400',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    }
  },
  'advisory-services': {
    id: 'advisory-services',
    name: 'Advisory & Services',
    tagline: 'Expert guidance for maximum certainty',
    description: 'Strategic Control + dedicated support for critical decisions',
    certaintyLevel: 'Confidence',
    certaintyDescription: 'Expert-validated strategy and hands-on guidance',
    price: 'Custom',
    features: [
      'Everything in Strategic Control',
      'Dedicated strategy advisor',
      'Quarterly strategic reviews',
      'Guided research validations',
      'Expert campaign evaluation',
      'Priority support',
      'Custom research design',
      'Stakeholder presentations'
    ],
    cta: 'Schedule Consultation',
    color: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      text: 'text-amber-700 dark:text-amber-400',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
    }
  }
};

export interface UserSubscription {
  tier: ProductTier;
  startDate: Date;
  status: 'active' | 'trial' | 'expired' | 'cancelled';
  trialEndsAt?: Date;
  features: {
    decisionEngine: boolean;
    campaignGeneration: boolean;
    researchTools: boolean;
    stakeholderViews: boolean;
    reporting: boolean;
    advisoryServices: boolean;
  };
}
