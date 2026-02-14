// Template Library Types

export type TemplateCategory = 
  | 'product-launch'
  | 'brand-awareness'
  | 'lead-generation'
  | 'customer-retention'
  | 'seasonal-campaign'
  | 'content-marketing'
  | 'social-media'
  | 'email-marketing'
  | 'event-promotion'
  | 'rebranding';

export type TemplateIndustry =
  | 'ecommerce'
  | 'saas'
  | 'b2b'
  | 'b2c'
  | 'healthcare'
  | 'finance'
  | 'education'
  | 'real-estate'
  | 'hospitality'
  | 'technology'
  | 'retail'
  | 'nonprofit';

export interface CampaignTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  industries: TemplateIndustry[];
  
  // Template data
  objective: string;
  duration: string;
  budget?: string;
  targetAudience: string;
  
  // Pre-filled campaign data
  campaignType: string;
  channels: string[];
  kpis: string[];
  timeline: {
    phase: string;
    duration: string;
    activities: string[];
  }[];
  
  // Content suggestions
  messagingFramework?: string;
  contentPillars?: string[];
  creativeBrief?: string;
  
  // Metadata
  thumbnail?: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string; // "2 hours", "1 day", etc.
  
  // Social proof
  usageCount: number;
  rating: number;
  reviews: TemplateReview[];
  
  // Author
  authorId: string;
  authorName: string;
  authorType: 'system' | 'agency' | 'community';
  
  // Marketplace
  price: number; // 0 for free
  featured: boolean;
  
  // Dates
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface TemplateReview {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  helpful: number;
  createdAt: string;
}

export interface TemplateFilter {
  category?: TemplateCategory[];
  industry?: TemplateIndustry[];
  difficulty?: ('beginner' | 'intermediate' | 'advanced')[];
  priceRange?: {
    min: number;
    max: number;
  };
  rating?: number; // minimum rating
  search?: string;
  authorType?: ('system' | 'agency' | 'community')[];
}

export interface SavedTemplate {
  id: string;
  templateId: string;
  userId: string;
  customizations?: Record<string, any>;
  notes?: string;
  savedAt: string;
}

export interface CustomTemplate {
  id: string;
  name: string;
  description: string;
  basedOnTemplateId?: string;
  
  // Full campaign configuration
  config: Record<string, any>;
  
  // Sharing
  visibility: 'private' | 'team' | 'public';
  sharedWith?: string[];
  
  // Marketplace
  isPublished: boolean;
  price?: number;
  
  createdAt: string;
  updatedAt: string;
}
