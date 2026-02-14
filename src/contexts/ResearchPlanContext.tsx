/**
 * Research Plan Context
 * 
 * Global state management for research plans, unlocked methods and assets.
 * Provides centralized access control across the application.
 * Includes localStorage persistence.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { saveToStorage, loadFromStorage, StorageKeys } from '../utils/storage';
import { logger } from '../utils/logger';

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
}

const ResearchPlanContext = createContext<ResearchPlanContextType | undefined>(undefined);

export function ResearchPlanProvider({ children }: { children: ReactNode }) {
  const [activeResearchPlan, setActiveResearchPlan] = useState<ResearchPlan | null>(() => {
    // Load from localStorage on mount
    const stored = loadFromStorage<ResearchPlan | null>(StorageKeys.ACTIVE_RESEARCH_PLAN, null);
    
    // If no stored plan, return demo plan
    if (!stored) {
      return {
        id: 'demo-plan-1',
        method: 'workshop',
        unlockedMethods: ['ai-agent', 'canvas-workshop', 'interviews', 'questionnaire'],
        unlockedAssets: ['1', '2', '3', '4', '5'],
        entryMode: 'bundle' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    
    return stored;
  });

  const [sharedSelectedAssets, setSharedSelectedAssets] = useState<SharedAssetSelection>(() => {
    return loadFromStorage<SharedAssetSelection>(StorageKeys.SHARED_ASSETS, {
      interviews: [],
      questionnaire: [],
      workshop: [],
    });
  });

  const updateSharedAssets = (tool: keyof SharedAssetSelection, assets: string[]) => {
    setSharedSelectedAssets(prev => ({
      ...prev,
      [tool]: assets
    }));
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