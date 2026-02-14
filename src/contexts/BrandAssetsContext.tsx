/**
 * Brand Assets Context
 * 
 * Global state management for brand assets data.
 * Provides CRUD operations and asset-related queries.
 * Includes localStorage persistence and change tracking.
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { BrandAsset } from '../types/brand-asset';
import { mockBrandAssets } from '../data/mock-brand-assets';
import { saveToStorage, loadFromStorage, StorageKeys } from '../utils/storage';
import { logger } from '../utils/logger';
import { ChangeType } from '../types/change-impact';

interface BrandAssetsContextType {
  brandAssets: BrandAsset[];
  setBrandAssets: (assets: BrandAsset[]) => void;
  getBrandAsset: (id: string) => BrandAsset | undefined;
  updateBrandAsset: (id: string, updates: Partial<BrandAsset>, changeType?: ChangeType, changeDescription?: string) => void;
  addBrandAsset: (asset: BrandAsset) => void;
  removeBrandAsset: (id: string) => void;
  
  // Change tracking callback - set by ChangeImpactContext
  setOnAssetChange: (callback: (asset: BrandAsset, previous: BrandAsset | undefined, changeType: ChangeType, description: string) => void) => void;
}

const BrandAssetsContext = createContext<BrandAssetsContextType | undefined>(undefined);

export function BrandAssetsProvider({ children }: { children: ReactNode }) {
  const [brandAssets, setBrandAssets] = useState<BrandAsset[]>(() => {
    // Load from localStorage on mount
    const stored = loadFromStorage<BrandAsset[]>(StorageKeys.BRAND_ASSETS, []);
    
    // If no stored data, use mock data
    if (stored.length === 0) {
      logger.info('No stored brand assets found, using mock data');
      return mockBrandAssets;
    }
    
    logger.info(`Loaded ${stored.length} brand assets from storage`);
    return stored;
  });

  // Change tracking callback - using useRef to store the callback function
  const onAssetChangeRef = useRef<
    ((asset: BrandAsset, previous: BrandAsset | undefined, changeType: ChangeType, description: string) => void) | undefined
  >(undefined);

  // Persist to localStorage whenever brandAssets changes
  useEffect(() => {
    if (brandAssets && brandAssets.length > 0) {
      saveToStorage(StorageKeys.BRAND_ASSETS, brandAssets);
      logger.debug(`Persisted ${brandAssets.length} brand assets`);
    }
  }, [brandAssets]);

  const getBrandAsset = (id: string): BrandAsset | undefined => {
    return brandAssets.find(asset => asset.id === id);
  };

  const setOnAssetChange = useCallback((
    callback: (asset: BrandAsset, previous: BrandAsset | undefined, changeType: ChangeType, description: string) => void
  ) => {
    onAssetChangeRef.current = callback;
  }, []);

  const updateBrandAsset = useCallback((
    id: string, 
    updates: Partial<BrandAsset>,
    changeType: ChangeType = 'content-update',
    changeDescription?: string
  ) => {
    const previousAsset = brandAssets.find(asset => asset.id === id);
    
    setBrandAssets(prev =>
      prev.map(asset => {
        if (asset.id === id) {
          const updatedAsset = { ...asset, ...updates };
          
          // Track the change if callback is set
          if (onAssetChangeRef.current) {
            const description = changeDescription || generateChangeDescription(updates, changeType);
            // Use setTimeout to avoid state updates during render
            setTimeout(() => {
              onAssetChangeRef.current?.(updatedAsset, previousAsset, changeType, description);
            }, 0);
          }
          
          return updatedAsset;
        }
        return asset;
      })
    );
  }, [brandAssets]);

  const addBrandAsset = useCallback((asset: BrandAsset) => {
    setBrandAssets(prev => [...prev, asset]);
  }, []);

  const removeBrandAsset = useCallback((id: string) => {
    setBrandAssets(prev => prev.filter(asset => asset.id !== id));
  }, []);

  return (
    <BrandAssetsContext.Provider
      value={{
        brandAssets,
        setBrandAssets,
        getBrandAsset,
        updateBrandAsset,
        addBrandAsset,
        removeBrandAsset,
        setOnAssetChange,
      }}
    >
      {children}
    </BrandAssetsContext.Provider>
  );
}

export function useBrandAssets() {
  const context = useContext(BrandAssetsContext);
  if (context === undefined) {
    throw new Error('useBrandAssets must be used within a BrandAssetsProvider');
  }
  return context;
}

/**
 * Genereert automatisch een beschrijving van de wijziging
 */
function generateChangeDescription(updates: Partial<BrandAsset>, changeType: ChangeType): string {
  switch (changeType) {
    case 'research-added':
      return 'Nieuw onderzoek toegevoegd';
    case 'validation':
      return 'Asset gevalideerd';
    case 'status-change':
      return `Status gewijzigd naar ${updates.status}`;
    case 'content-update':
    default:
      if (updates.content) return 'Content geüpdatet';
      if (updates.title) return 'Titel gewijzigd';
      return 'Asset geüpdatet';
  }
}