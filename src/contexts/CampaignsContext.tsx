import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Campaign } from '../data/mock-campaigns';
import { apiCampaignsToMockFormat } from '../lib/api/campaign-adapter';

interface CampaignsContextType {
  campaigns: Campaign[];
  campaignsMap: Record<string, Campaign>;
  getCampaign: (id: string) => Campaign | undefined;
  getAllCampaigns: () => Campaign[];
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, campaign: Campaign) => void;
  isLoading: boolean;
}

const CampaignsContext = createContext<CampaignsContextType | undefined>(undefined);

// ---- Mock fallback ----
let mockFallback: Campaign[] | null = null;
async function getMockFallback(): Promise<Campaign[]> {
  if (!mockFallback) {
    const mod = await import('../data/mock-campaigns');
    mockFallback = Object.values(mod.mockCampaigns);
  }
  return mockFallback;
}

export function CampaignsProvider({ children }: { children: ReactNode }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const workspaceId = process.env.NEXT_PUBLIC_WORKSPACE_ID;
    if (!workspaceId) {
      getMockFallback().then(data => {
        setCampaigns(data);
        setIsLoading(false);
      });
      return;
    }

    fetch(`/api/campaigns?workspaceId=${workspaceId}`)
      .then(res => res.json())
      .then(data => {
        if (data.campaigns && data.campaigns.length > 0) {
          setCampaigns(apiCampaignsToMockFormat(data.campaigns));
        } else {
          return getMockFallback().then(setCampaigns);
        }
      })
      .catch(err => {
        console.warn('[CampaignsContext] API fetch failed, using mock data:', err.message);
        getMockFallback().then(setCampaigns);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const campaignsMap = React.useMemo(() => {
    const map: Record<string, Campaign> = {};
    campaigns.forEach(c => { map[c.id] = c; });
    return map;
  }, [campaigns]);

  const getCampaign = (id: string) => campaigns.find(c => c.id === id);
  const getAllCampaigns = () => campaigns;
  const addCampaign = (campaign: Campaign) => setCampaigns(prev => [...prev, campaign]);
  const updateCampaign = (id: string, campaign: Campaign) =>
    setCampaigns(prev => prev.map(c => (c.id === id ? campaign : c)));

  return (
    <CampaignsContext.Provider value={{ campaigns, campaignsMap, getCampaign, getAllCampaigns, addCampaign, updateCampaign, isLoading }}>
      {children}
    </CampaignsContext.Provider>
  );
}

export function useCampaignsContext() {
  const context = useContext(CampaignsContext);
  if (!context) {
    throw new Error('useCampaignsContext must be used within a CampaignsProvider');
  }
  return context;
}
