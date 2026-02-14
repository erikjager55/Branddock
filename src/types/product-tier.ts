/**
 * TYPE: Product Tier
 * 
 * Commerciële structuur met drie niveaus van besliszekerheid.
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
    tagline: 'Ontdek waar je staat',
    description: 'Krijg snel inzicht in de kwaliteit van je strategische besluitvorming',
    certaintyLevel: 'Awareness',
    certaintyDescription: 'Begrijp je risico\'s en weet wat je moet valideren',
    price: 'Gratis',
    features: [
      'Complete decision status scan',
      'Top 3 strategische risico\'s',
      'Gepersonaliseerd actieplan',
      'Voorbeeld campagne strategie'
    ],
    limitations: [
      'Eenmalige scan zonder updates',
      'Geen toegang tot research tools',
      'Geen campagne generatie',
      'Geen stakeholder rapportage'
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
    tagline: 'Neem controle over je beslissingen',
    description: 'Volledig platform voor continue strategische validatie en besluitvorming',
    certaintyLevel: 'Control',
    certaintyDescription: 'Real-time inzicht en gevalideerde beslissingen',
    price: '€499',
    billingCycle: 'per maand',
    features: [
      'Volledige Decision Engine',
      'Onbeperkte campagne generatie',
      'Research planning & tracking',
      'Executive & stakeholder views',
      'Professional rapportage',
      'Change impact monitoring',
      'Brand asset management',
      'Persona development'
    ],
    cta: 'Upgrade naar Strategic Control',
    color: {
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      text: 'text-purple-700 dark:text-purple-400',
      badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
    }
  },
  'advisory-services': {
    id: 'advisory-services',
    name: 'Advisory & Services',
    tagline: 'Expertbegeleiding voor maximale zekerheid',
    description: 'Strategic Control + dedicated ondersteuning voor kritieke beslissingen',
    certaintyLevel: 'Confidence',
    certaintyDescription: 'Expert-gevalideerde strategie en hands-on begeleiding',
    price: 'Op maat',
    features: [
      'Alles van Strategic Control',
      'Dedicated strategy advisor',
      'Kwartaal strategic reviews',
      'Begeleide research validaties',
      'Expert campagne evaluatie',
      'Prioritaire ondersteuning',
      'Custom onderzoeksontwerp',
      'Stakeholder presentaties'
    ],
    cta: 'Plan Adviesgesprek',
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
