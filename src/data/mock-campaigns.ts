/**
 * Mock Campaign Data - Single Source of Truth
 * 
 * Dit bestand bevat alle campaign data die wordt gebruikt in de applicatie.
 * Wijzigingen hier worden automatisch gesynchroniseerd tussen:
 * - ActiveCampaignsPage (overzichtspagina)
 * - CampaignWorkspace (detailpagina)
 */

export interface CampaignDeliverable {
  id: string;
  name: string;
  description?: string;
  type: 'document' | 'image' | 'video' | 'email' | 'website' | 'social';
  status: 'completed' | 'in-progress' | 'not-started';
  progress?: number;
  dueDate?: string;
  assignee?: string;
}

export interface CampaignAsset {
  id: string;
  name: string;
  type: 'brand' | 'product' | 'persona' | 'trend' | 'research';
  trustLevel: 'high' | 'medium' | 'low';
  trustLabel: string;
  locked?: boolean;
}

export interface Campaign {
  id: string;
  name: string;
  type: 'campaign-strategy' | 'brand-refresh' | 'content-strategy';
  status: 'ready' | 'draft' | 'generating';
  objective?: string;
  budgetRange?: [number, number];
  channels?: {
    social?: boolean;
    email?: boolean;
    ooh?: boolean;
  };
  assets: CampaignAsset[];
  deliverables: CampaignDeliverable[];
  modifiedTime?: string;
  modifiedBy?: string;
}

export const mockCampaigns: Record<string, Campaign> = {
  '1': {
    id: '1',
    name: 'Summer Launch 2025',
    type: 'campaign-strategy',
    status: 'ready',
    objective: 'Brand Awareness',
    budgetRange: [50, 100],
    channels: { social: true, email: true, ooh: false },
    assets: [
      { id: 'brand-1', name: 'TechNova Brand Identity', type: 'brand', trustLevel: 'high', trustLabel: 'Human Validated', locked: true },
      { id: 'persona-1', name: 'Gen-Z Early Adopter', type: 'persona', trustLevel: 'medium', trustLabel: 'Research Validated' },
      { id: 'persona-2', name: 'Tech Enthusiast', type: 'persona', trustLevel: 'medium', trustLabel: 'Research Validated' },
      { id: 'product-1', name: 'Smart Home Hub', type: 'product', trustLevel: 'high', trustLabel: 'Manual Add' }
    ],
    deliverables: [
      { id: 'd1', name: 'Campaign Brief', description: 'Core strategy document outlining campaign objectives and approach', type: 'document', status: 'completed', dueDate: 'Jan 15', assignee: 'Mark' },
      { id: 'd2', name: 'Social Media Assets', description: '15+ graphics for Instagram and TikTok', type: 'image', status: 'completed', dueDate: 'Jan 18', assignee: 'Sarah' },
      { id: 'd3', name: 'Landing Page', description: 'Responsive campaign landing page with conversion tracking', type: 'website', status: 'in-progress', progress: 65, dueDate: 'Jan 22', assignee: 'Alex' },
      { id: 'd4', name: 'Email Campaign', description: '5-email drip campaign for existing customers', type: 'email', status: 'completed', dueDate: 'Jan 20', assignee: 'Jenny' },
      { id: 'd5', name: 'Video Ad', description: '30-second promotional video for social media', type: 'video', status: 'in-progress', progress: 40, dueDate: 'Jan 25', assignee: 'Mike' },
      { id: 'd6', name: 'Content Calendar', description: '90-day content scheduling and planning document', type: 'document', status: 'not-started', dueDate: 'Jan 28', assignee: 'Lisa' }
    ],
    modifiedTime: 'Today, 10:30 AM',
    modifiedBy: 'Mark'
  },
  '2': {
    id: '2',
    name: 'Q4 Rebranding Concept',
    type: 'brand-refresh',
    status: 'draft',
    objective: 'Brand Awareness',
    budgetRange: [30, 70],
    channels: { social: true, email: false, ooh: true },
    assets: [
      { id: 'brand-2', name: 'Legacy Corp Brand', type: 'brand', trustLevel: 'high', trustLabel: 'Human Validated', locked: true }
    ],
    deliverables: [
      { id: 'd7', name: 'Brand Guidelines', description: 'Complete brand guidelines document', type: 'document', status: 'in-progress', progress: 30, dueDate: 'Feb 10', assignee: 'Tom' },
      { id: 'd8', name: 'Logo Variations', description: 'Primary and secondary logo variations', type: 'image', status: 'not-started', dueDate: 'Feb 15', assignee: 'Sarah' },
      { id: 'd9', name: 'Brand Website', description: 'New corporate website design', type: 'website', status: 'not-started', dueDate: 'Mar 1', assignee: 'Alex' }
    ],
    modifiedTime: 'Yesterday',
    modifiedBy: 'Sarah'
  },
  '3': {
    id: '3',
    name: 'Go-to-Market: New Service',
    type: 'campaign-strategy',
    status: 'generating',
    objective: 'Lead Generation',
    budgetRange: [70, 120],
    channels: { social: true, email: true, ooh: false },
    assets: [
      { id: 'brand-3', name: 'ServicePro Brand', type: 'brand', trustLevel: 'high', trustLabel: 'Human Validated', locked: true },
      { id: 'persona-3', name: 'Enterprise Decision Maker', type: 'persona', trustLevel: 'high', trustLabel: 'Research Validated' }
    ],
    deliverables: [
      { id: 'd10', name: 'GTM Strategy Doc', description: 'Go-to-market strategy and execution plan', type: 'document', status: 'not-started', dueDate: 'Feb 5', assignee: 'Mark' },
      { id: 'd11', name: 'Sales Deck', description: 'Executive sales presentation', type: 'document', status: 'not-started', dueDate: 'Feb 12', assignee: 'Jenny' }
    ],
    modifiedTime: '2 hours ago',
    modifiedBy: 'Alex'
  }
};

// Helper functie om campaign op te halen per ID
export function getCampaign(id: string): Campaign | undefined {
  return mockCampaigns[id];
}

// Helper functie om alle campaigns als array te krijgen
export function getAllCampaigns(): Campaign[] {
  return Object.values(mockCampaigns);
}

// Helper om campaign te converteren naar strategy format voor ActiveCampaignsPage
export function campaignToStrategy(campaign: Campaign) {
  // Tel assets per type
  const assetCounts = campaign.assets.reduce((acc, asset) => {
    if (asset.type === 'brand') acc.brand = (acc.brand || 0) + 1;
    if (asset.type === 'persona') acc.persona = (acc.persona || 0) + 1;
    if (asset.type === 'product') acc.product = (acc.product || 0) + 1;
    return acc;
  }, {} as { brand?: number; persona?: number; product?: number });

  // Haal eerste asset van elk type op voor context inputs
  const brandAsset = campaign.assets.find(a => a.type === 'brand');
  const personaAsset = campaign.assets.find(a => a.type === 'persona');
  const productAsset = campaign.assets.find(a => a.type === 'product');

  return {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    assets: assetCounts,
    contextInputs: {
      ...(brandAsset && { brand: { name: brandAsset.name, count: assetCounts.brand || 0 } }),
      ...(personaAsset && { persona: { name: personaAsset.name, count: assetCounts.persona || 0 } }),
      ...(productAsset && { product: { name: productAsset.name, count: assetCounts.product || 0 } }),
    },
    deliverables: campaign.deliverables,
    modifiedTime: campaign.modifiedTime || 'Unknown',
    modifiedBy: campaign.modifiedBy || 'Unknown'
  };
}
