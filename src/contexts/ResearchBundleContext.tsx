import React, { createContext, useContext, useState, useEffect } from 'react';
import { ResearchBundle, getStrategyToolsUnlockedByBundle } from '../data/research-bundles';

interface ResearchBundleContextType {
  purchasedBundles: string[]; // Array of bundle IDs
  unlockedStrategyTools: string[]; // Array of strategy tool IDs
  purchaseBundle: (bundleId: string) => void;
  isToolUnlocked: (toolId: string) => boolean;
  isBundlePurchased: (bundleId: string) => boolean;
  getUnlockingBundle: (toolId: string) => string | null; // Returns bundle ID that unlocked this tool
}

const ResearchBundleContext = createContext<ResearchBundleContextType | undefined>(undefined);

export function ResearchBundleProvider({ children }: { children: React.ReactNode }) {
  const [purchasedBundles, setPurchasedBundles] = useState<string[]>(() => {
    // Start with empty array to show locked state
    // Load from localStorage on init
    // const stored = localStorage.getItem('purchasedResearchBundles');
    // return stored ? JSON.parse(stored) : [];
    return [];
  });

  // Calculate unlocked strategy tools based on purchased bundles
  const unlockedStrategyTools = React.useMemo(() => {
    const toolsSet = new Set<string>();
    purchasedBundles.forEach(bundleId => {
      const tools = getStrategyToolsUnlockedByBundle(bundleId);
      tools.forEach(toolId => toolsSet.add(toolId));
    });
    return Array.from(toolsSet);
  }, [purchasedBundles]);

  // Persist to localStorage whenever purchasedBundles changes
  useEffect(() => {
    localStorage.setItem('purchasedResearchBundles', JSON.stringify(purchasedBundles));
  }, [purchasedBundles]);

  const purchaseBundle = (bundleId: string) => {
    setPurchasedBundles(prev => {
      if (prev.includes(bundleId)) return prev;
      return [...prev, bundleId];
    });
  };

  const isToolUnlocked = (toolId: string) => {
    // All tools are unlocked by default for demo/development
    // In production, you can enable the bundle requirement
    return true;
    
    // Original logic (commented out for now):
    // return unlockedStrategyTools.includes(toolId);
  };

  const isBundlePurchased = (bundleId: string) => {
    return purchasedBundles.includes(bundleId);
  };

  const getUnlockingBundle = (toolId: string) => {
    for (const bundleId of purchasedBundles) {
      const tools = getStrategyToolsUnlockedByBundle(bundleId);
      if (tools.includes(toolId)) {
        return bundleId;
      }
    }
    return null;
  };

  return (
    <ResearchBundleContext.Provider
      value={{
        purchasedBundles,
        unlockedStrategyTools,
        purchaseBundle,
        isToolUnlocked,
        isBundlePurchased,
        getUnlockingBundle,
      }}
    >
      {children}
    </ResearchBundleContext.Provider>
  );
}

export function useResearchBundles() {
  const context = useContext(ResearchBundleContext);
  if (!context) {
    throw new Error('useResearchBundles must be used within ResearchBundleProvider');
  }
  return context;
}