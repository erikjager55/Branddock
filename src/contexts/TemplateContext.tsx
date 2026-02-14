import React, { createContext, useContext, useState, useCallback } from 'react';
import { CampaignTemplate, SavedTemplate, CustomTemplate, TemplateFilter } from '../types/templates';

interface TemplateContextType {
  // Templates
  templates: CampaignTemplate[];
  savedTemplates: SavedTemplate[];
  customTemplates: CustomTemplate[];
  
  // Actions
  saveTemplate: (templateId: string) => void;
  unsaveTemplate: (templateId: string) => void;
  createCustomTemplate: (template: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCustomTemplate: (id: string, updates: Partial<CustomTemplate>) => void;
  deleteCustomTemplate: (id: string) => void;
  
  // Filtering
  filterTemplates: (filter: TemplateFilter) => CampaignTemplate[];
  
  // Featured
  featuredTemplates: CampaignTemplate[];
  popularTemplates: CampaignTemplate[];
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

// Mock template data
const mockTemplates: CampaignTemplate[] = [
  {
    id: 'template-1',
    name: 'Product Launch Campaign',
    description: 'Comprehensive go-to-market strategy for launching a new product with multi-channel approach',
    category: 'product-launch',
    industries: ['saas', 'technology', 'ecommerce'],
    objective: 'Launch new product and achieve 1000 early adopters in first 30 days',
    duration: '90 days',
    budget: '$50,000 - $150,000',
    targetAudience: 'Early adopters, tech-savvy professionals aged 25-45',
    campaignType: 'Multi-channel launch',
    channels: ['Social Media', 'Email', 'Content Marketing', 'PR', 'Influencer Marketing'],
    kpis: ['Sign-ups', 'Product Activations', 'Social Mentions', 'Press Coverage', 'Demo Requests'],
    timeline: [
      {
        phase: 'Pre-Launch (Weeks 1-4)',
        duration: '4 weeks',
        activities: ['Build landing page', 'Create teaser content', 'Recruit beta users', 'Prepare PR materials']
      },
      {
        phase: 'Launch (Weeks 5-6)',
        duration: '2 weeks',
        activities: ['Press release distribution', 'Social media blitz', 'Influencer campaign', 'Email announcement']
      },
      {
        phase: 'Post-Launch (Weeks 7-12)',
        duration: '6 weeks',
        activities: ['Content marketing', 'Case studies', 'Webinars', 'Community building']
      }
    ],
    messagingFramework: 'Problem-Solution-Future framework highlighting innovation and user benefits',
    contentPillars: ['Innovation', 'User Success', 'Thought Leadership', 'Community'],
    creativeBrief: 'Bold, innovative visuals with customer-centric messaging',
    thumbnail: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop',
    difficulty: 'advanced',
    estimatedTime: '8 hours',
    usageCount: 342,
    rating: 4.8,
    reviews: [],
    authorId: 'system',
    authorName: 'Strategy Hub',
    authorType: 'system',
    price: 0,
    featured: true,
    createdAt: '2024-01-15',
    updatedAt: '2024-12-20',
    publishedAt: '2024-01-20'
  },
  {
    id: 'template-2',
    name: 'Brand Awareness Campaign',
    description: 'Build brand recognition and recall through integrated storytelling across multiple touchpoints',
    category: 'brand-awareness',
    industries: ['b2c', 'retail', 'hospitality'],
    objective: 'Increase brand awareness by 40% in target demographic',
    duration: '60 days',
    budget: '$30,000 - $80,000',
    targetAudience: 'Mass market consumers aged 18-55',
    campaignType: 'Brand building',
    channels: ['Social Media', 'Display Advertising', 'Video Marketing', 'Out-of-Home'],
    kpis: ['Brand Recall', 'Social Reach', 'Video Views', 'Website Traffic', 'Social Followers'],
    timeline: [
      {
        phase: 'Foundation (Weeks 1-2)',
        duration: '2 weeks',
        activities: ['Brand audit', 'Creative development', 'Content production', 'Media planning']
      },
      {
        phase: 'Amplification (Weeks 3-6)',
        duration: '4 weeks',
        activities: ['Launch ad campaigns', 'Social media push', 'Influencer partnerships', 'PR activation']
      },
      {
        phase: 'Sustain (Weeks 7-8)',
        duration: '2 weeks',
        activities: ['Optimize campaigns', 'Community engagement', 'Content amplification', 'Measurement']
      }
    ],
    messagingFramework: 'Emotional connection through authentic brand storytelling',
    contentPillars: ['Brand Story', 'Values', 'Lifestyle', 'Community'],
    thumbnail: 'https://images.unsplash.com/photo-1533750349088-cd871a92f312?w=400&h=300&fit=crop',
    difficulty: 'intermediate',
    estimatedTime: '5 hours',
    usageCount: 567,
    rating: 4.6,
    reviews: [],
    authorId: 'system',
    authorName: 'Strategy Hub',
    authorType: 'system',
    price: 0,
    featured: true,
    createdAt: '2024-01-10',
    updatedAt: '2024-12-15',
    publishedAt: '2024-01-15'
  },
  {
    id: 'template-3',
    name: 'Lead Generation Funnel',
    description: 'Performance-driven campaign optimized for capturing and nurturing qualified leads',
    category: 'lead-generation',
    industries: ['b2b', 'saas', 'finance'],
    objective: 'Generate 500 qualified leads with 15% conversion to sales opportunities',
    duration: '45 days',
    budget: '$20,000 - $60,000',
    targetAudience: 'Decision-makers and influencers in target companies',
    campaignType: 'Performance marketing',
    channels: ['LinkedIn', 'Google Ads', 'Email', 'Content Marketing', 'Webinars'],
    kpis: ['Leads Generated', 'Cost per Lead', 'Lead Quality Score', 'Conversion Rate', 'Pipeline Value'],
    timeline: [
      {
        phase: 'Setup (Week 1)',
        duration: '1 week',
        activities: ['Landing page creation', 'Lead magnet development', 'Email sequences', 'Ad creative']
      },
      {
        phase: 'Acquisition (Weeks 2-5)',
        duration: '4 weeks',
        activities: ['Launch paid campaigns', 'Content promotion', 'Webinar hosting', 'Lead nurturing']
      },
      {
        phase: 'Optimization (Week 6)',
        duration: '1 week',
        activities: ['Campaign optimization', 'A/B testing', 'Lead scoring refinement', 'Sales handoff']
      }
    ],
    messagingFramework: 'Value-driven messaging focused on ROI and business outcomes',
    contentPillars: ['Expertise', 'Results', 'Trust', 'Innovation'],
    thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=300&fit=crop',
    difficulty: 'intermediate',
    estimatedTime: '4 hours',
    usageCount: 891,
    rating: 4.9,
    reviews: [],
    authorId: 'system',
    authorName: 'Strategy Hub',
    authorType: 'system',
    price: 0,
    featured: true,
    createdAt: '2024-02-01',
    updatedAt: '2024-12-18',
    publishedAt: '2024-02-05'
  },
  {
    id: 'template-4',
    name: 'E-commerce Holiday Campaign',
    description: 'Seasonal promotion campaign designed to maximize sales during peak holiday shopping periods',
    category: 'seasonal-campaign',
    industries: ['ecommerce', 'retail'],
    objective: 'Increase holiday sales by 150% compared to previous year',
    duration: '30 days',
    budget: '$40,000 - $100,000',
    targetAudience: 'Online shoppers aged 25-65 looking for holiday gifts',
    campaignType: 'Seasonal promotion',
    channels: ['Email', 'Social Media', 'Google Shopping', 'Display Ads', 'Retargeting'],
    kpis: ['Revenue', 'Average Order Value', 'Conversion Rate', 'ROAS', 'Customer Acquisition Cost'],
    timeline: [
      {
        phase: 'Early Bird (Weeks 1-2)',
        duration: '2 weeks',
        activities: ['Early access promotions', 'Gift guides', 'Email teasers', 'Social previews']
      },
      {
        phase: 'Peak Season (Weeks 3-4)',
        duration: '2 weeks',
        activities: ['Flash sales', 'Daily deals', 'Retargeting campaigns', 'Social shopping']
      }
    ],
    messagingFramework: 'Urgency and value-driven messaging with festive appeal',
    contentPillars: ['Gift Ideas', 'Special Offers', 'Limited Time', 'Joy & Celebration'],
    thumbnail: 'https://images.unsplash.com/photo-1607083206869-4c7672e72a8a?w=400&h=300&fit=crop',
    difficulty: 'beginner',
    estimatedTime: '3 hours',
    usageCount: 1203,
    rating: 4.7,
    reviews: [],
    authorId: 'system',
    authorName: 'Strategy Hub',
    authorType: 'system',
    price: 0,
    featured: false,
    createdAt: '2024-02-15',
    updatedAt: '2024-12-10',
    publishedAt: '2024-02-20'
  },
  {
    id: 'template-5',
    name: 'Content Marketing Strategy',
    description: 'Long-term content strategy to establish thought leadership and drive organic growth',
    category: 'content-marketing',
    industries: ['saas', 'b2b', 'education'],
    objective: 'Grow organic traffic by 200% and establish industry authority',
    duration: '120 days',
    budget: '$25,000 - $70,000',
    targetAudience: 'Industry professionals seeking expertise and solutions',
    campaignType: 'Content-first',
    channels: ['Blog', 'SEO', 'LinkedIn', 'YouTube', 'Podcasts', 'Email Newsletter'],
    kpis: ['Organic Traffic', 'Engagement Rate', 'Backlinks', 'Lead Generation', 'Share of Voice'],
    timeline: [
      {
        phase: 'Foundation (Month 1)',
        duration: '4 weeks',
        activities: ['Content audit', 'Keyword research', 'Content calendar', 'Pillar content creation']
      },
      {
        phase: 'Production (Months 2-3)',
        duration: '8 weeks',
        activities: ['Regular publishing', 'Video content', 'Guest contributions', 'SEO optimization']
      },
      {
        phase: 'Amplification (Month 4)',
        duration: '4 weeks',
        activities: ['Content promotion', 'Influencer outreach', 'Repurposing', 'Community building']
      }
    ],
    messagingFramework: 'Educational and value-first approach building trust through expertise',
    contentPillars: ['Industry Insights', 'How-To Guides', 'Case Studies', 'Trends & Analysis'],
    thumbnail: 'https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=400&h=300&fit=crop',
    difficulty: 'advanced',
    estimatedTime: '10 hours',
    usageCount: 678,
    rating: 4.8,
    reviews: [],
    authorId: 'system',
    authorName: 'Strategy Hub',
    authorType: 'system',
    price: 0,
    featured: true,
    createdAt: '2024-03-01',
    updatedAt: '2024-12-22',
    publishedAt: '2024-03-05'
  }
];

export function TemplateProvider({ children }: { children: React.ReactNode }) {
  const [templates] = useState<CampaignTemplate[]>(mockTemplates);
  const [savedTemplates, setSavedTemplates] = useState<SavedTemplate[]>([]);
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>([]);

  const featuredTemplates = templates.filter(t => t.featured);
  const popularTemplates = [...templates].sort((a, b) => b.usageCount - a.usageCount).slice(0, 5);

  const saveTemplate = useCallback((templateId: string) => {
    setSavedTemplates(prev => {
      if (prev.some(st => st.templateId === templateId)) {
        return prev;
      }
      return [...prev, {
        id: `saved-${Date.now()}`,
        templateId,
        userId: 'current-user',
        savedAt: new Date().toISOString()
      }];
    });
  }, []);

  const unsaveTemplate = useCallback((templateId: string) => {
    setSavedTemplates(prev => prev.filter(st => st.templateId !== templateId));
  }, []);

  const createCustomTemplate = useCallback((template: Omit<CustomTemplate, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newTemplate: CustomTemplate = {
      ...template,
      id: `custom-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setCustomTemplates(prev => [...prev, newTemplate]);
  }, []);

  const updateCustomTemplate = useCallback((id: string, updates: Partial<CustomTemplate>) => {
    setCustomTemplates(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t)
    );
  }, []);

  const deleteCustomTemplate = useCallback((id: string) => {
    setCustomTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  const filterTemplates = useCallback((filter: TemplateFilter): CampaignTemplate[] => {
    return templates.filter(template => {
      if (filter.category && filter.category.length > 0) {
        if (!filter.category.includes(template.category)) return false;
      }
      
      if (filter.industry && filter.industry.length > 0) {
        if (!template.industries.some(ind => filter.industry?.includes(ind))) return false;
      }
      
      if (filter.difficulty && filter.difficulty.length > 0) {
        if (!filter.difficulty.includes(template.difficulty)) return false;
      }
      
      if (filter.priceRange) {
        if (template.price < filter.priceRange.min || template.price > filter.priceRange.max) return false;
      }
      
      if (filter.rating) {
        if (template.rating < filter.rating) return false;
      }
      
      if (filter.search) {
        const searchLower = filter.search.toLowerCase();
        if (!template.name.toLowerCase().includes(searchLower) &&
            !template.description.toLowerCase().includes(searchLower)) {
          return false;
        }
      }
      
      if (filter.authorType && filter.authorType.length > 0) {
        if (!filter.authorType.includes(template.authorType)) return false;
      }
      
      return true;
    });
  }, [templates]);

  return (
    <TemplateContext.Provider
      value={{
        templates,
        savedTemplates,
        customTemplates,
        saveTemplate,
        unsaveTemplate,
        createCustomTemplate,
        updateCustomTemplate,
        deleteCustomTemplate,
        filterTemplates,
        featuredTemplates,
        popularTemplates
      }}
    >
      {children}
    </TemplateContext.Provider>
  );
}

export function useTemplates() {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error('useTemplates must be used within TemplateProvider');
  }
  return context;
}
