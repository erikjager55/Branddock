import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { saveToStorage, loadFromStorage, StorageKeys } from '../utils/storage';

export interface ResearchPlan {
  id: string;
  method: string;
  unlockedMethods: string[];
  unlockedAssets: string[];
  entryMode: 'asset' | 'bundle' | 'questionnaire';
  rationale?: Record<string, string>;
  configuration?: any;
  createdAt: string;
  updatedAt: string;
}

export interface SharedAssetSelection {
  interviews: string[];
  questionnaire: string[];
  workshop: string[];
}

interface ResearchPlanContextType {
  activeResearchPlan: ResearchPlan | null;
  setActiveResearchPlan: (plan: ResearchPlan | null) => void;
  sharedSelectedAssets: SharedAssetSelection;
  setSharedSelectedAssets: (assets: SharedAssetSelection | ((prev: SharedAssetSelection) => SharedAssetSelection)) => void;
  updateSharedAssets: (tool: keyof SharedAssetSelection, assets: string[]) => void;
  isMethodUnlocked: (methodId: string) => boolean;
  isAssetUnlocked: (assetId: string) => boolean;
  isLoading: boolean;
}

const ResearchPlanContext = createContext<ResearchPlanContextType | undefined>(undefined);

const DEMO_PLAN: ResearchPlan = {
  id: 'demo-plan-1',
  method: 'workshop',
  unlockedMethods: ['ai-agent', 'canvas-workshop', 'interviews', 'questionnaire'],
  unlockedAssets: ['1', '2', '3', '4', '5'],
  entryMode: 'bundle',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function ResearchPlanProvider({ children }: { children: ReactNode }) {
  const [activeResearchPlan, setActiveResearchPlan] = useState<ResearchPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sharedSelectedAssets, setSharedSelectedAssets] = useState<SharedAssetSelection>(() => {
    return loadFromStorage<SharedAssetSelection>(StorageKeys.SHARED_ASSETS, {
      interviews: [],
      questionnaire: [],
      workshop: [],
    });
  });

  // API first, fallback to localStorage/demo
  useEffect(() => {
    const workspaceId = process.env.NEXT_PUBLIC_WORKSPACE_ID;
    if (!workspaceId) {
      const stored = loadFromStorage<ResearchPlan | null>(StorageKeys.ACTIVE_RESEARCH_PLAN, null);
      setActiveResearchPlan(stored ?? DEMO_PLAN);
      setIsLoading(false);
      return;
    }

    fetch(`/api/research-plans?workspaceId=${workspaceId}&status=active`)
      .then((res) => {
        if (!res.ok) throw new Error(`API error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data.plans && data.plans.length > 0) {
          const p = data.plans[0];
          setActiveResearchPlan({
            id: p.id,
            method: p.method,
            unlockedMethods: p.unlockedMethods,
            unlockedAssets: p.unlockedAssets,
            entryMode: p.entryMode as 'asset' | 'bundle' | 'questionnaire',
            rationale: p.rationale ?? undefined,
            configuration: p.configuration ?? undefined,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
          });
        } else {
          const stored = loadFromStorage<ResearchPlan | null>(StorageKeys.ACTIVE_RESEARCH_PLAN, null);
          setActiveResearchPlan(stored ?? DEMO_PLAN);
        }
      })
      .catch((err) => {
        console.warn('[ResearchPlanContext] API fetch failed, using fallback:', err.message);
        const stored = loadFromStorage<ResearchPlan | null>(StorageKeys.ACTIVE_RESEARCH_PLAN, null);
        setActiveResearchPlan(stored ?? DEMO_PLAN);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const updateSharedAssets = (tool: keyof SharedAssetSelection, assets: string[]) => {
    setSharedSelectedAssets((prev) => ({ ...prev, [tool]: assets }));
  };

  const isMethodUnlocked = (methodId: string): boolean => {
    if (!activeResearchPlan) return false;
    return activeResearchPlan.unlockedMethods.includes(methodId);
  };

  const isAssetUnlocked = (assetId: string): boolean => {
    if (!activeResearchPlan) return false;
    return activeResearchPlan.unlockedAssets.includes(assetId);
  };

  // Persist to localStorage as backup
  useEffect(() => {
    if (activeResearchPlan) {
      saveToStorage(StorageKeys.ACTIVE_RESEARCH_PLAN, activeResearchPlan);
    }
  }, [activeResearchPlan]);

  useEffect(() => {
    if (sharedSelectedAssets) {
      saveToStorage(StorageKeys.SHARED_ASSETS, sharedSelectedAssets);
    }
  }, [sharedSelectedAssets]);

  return (
    <ResearchPlanContext.Provider
      value={{
        activeResearchPlan,
        setActiveResearchPlan,
        sharedSelectedAssets,
        setSharedSelectedAssets,
        updateSharedAssets,
        isMethodUnlocked,
        isAssetUnlocked,
        isLoading,
      }}
    >
      {children}
    </ResearchPlanContext.Provider>
  );
}

export function useResearchPlan() {
  const context = useContext(ResearchPlanContext);
  if (context === undefined) {
    throw new Error('useResearchPlan must be used within a ResearchPlanProvider');
  }
  return context;
}
