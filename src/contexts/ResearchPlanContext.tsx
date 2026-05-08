import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { saveToStorage, loadFromStorage, StorageKeys } from '../utils/storage';
import { useWorkspace } from '../hooks/use-workspace';

/**
 * Polymorphic research-plan configuration. Two production code paths emit different shapes:
 * - Tool-flow (StrategicResearchPlanner.tsx:362): primaryTool + toolConfig + bundle + questionnaire/interview counts
 * - Bundle-flow (StrategicResearchPlanner.tsx:636): planName + methods + totalAssets + scoreBoost
 * All fields optional to accommodate both paths via a single union-style type.
 */
export interface ResearchPlanConfiguration {
  primaryTool?: string;
  toolConfig?: Record<string, unknown>;
  bundle?: string | null;
  numberOfQuestionnaires?: number;
  numberOfInterviews?: number;
  planName?: string;
  methods?: string[] | Record<string, string>;
  totalAssets?: number;
  scoreBoost?: number;
}

export interface ResearchPlan {
  id: string;
  method: string;
  unlockedMethods: string[];
  unlockedAssets: string[];
  entryMode: 'asset' | 'bundle' | 'questionnaire';
  rationale?: Record<string, string>;
  configuration?: ResearchPlanConfiguration;
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

export function ResearchPlanProvider({ children }: { children: ReactNode }) {
  const { workspaceId, isLoading: wsLoading } = useWorkspace();
  const [activeResearchPlan, setActiveResearchPlan] = useState<ResearchPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [sharedSelectedAssets, setSharedSelectedAssets] = useState<SharedAssetSelection>(() => {
    return loadFromStorage<SharedAssetSelection>(StorageKeys.SHARED_ASSETS, {
      interviews: [],
      questionnaire: [],
      workshop: [],
    });
  });

  useEffect(() => {
    if (wsLoading) return;

    if (!workspaceId) {
      setActiveResearchPlan(null);
      setIsLoading(false);
      return;
    }

    fetch('/api/research-plans?status=active')
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
          setActiveResearchPlan(null);
        }
      })
      .catch((err) => {
        console.warn('[ResearchPlanContext] API fetch failed:', err.message);
        setActiveResearchPlan(null);
      })
      .finally(() => setIsLoading(false));
  }, [workspaceId, wsLoading]);

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
