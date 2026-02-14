/**
 * Change Impact Context
 * 
 * Globale state voor change tracking en impact analysis.
 * Zorgt ervoor dat alle wijzigingen worden gelogd en impact wordt geanalyseerd.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  AssetChange, 
  ImpactAnalysis, 
  ChangeNotification,
  ChangeImpactStore,
  ChangeType 
} from '../types/change-impact';
import { BrandAsset } from '../types/brand-asset';
import { ChangeImpactService } from '../services/ChangeImpactService';
import { saveToStorage, loadFromStorage, StorageKeys } from '../utils/storage';
import { logger } from '../utils/logger';

interface ChangeImpactContextType {
  // State
  store: ChangeImpactStore;
  
  // Change tracking
  trackAssetChange: (
    asset: BrandAsset,
    previousAsset: BrandAsset | undefined,
    changeType: ChangeType,
    description: string
  ) => void;
  
  // Notifications
  getNotifications: (location?: 'decision-status' | 'campaign-generator') => ChangeNotification[];
  markNotificationSeen: (notificationId: string) => void;
  dismissNotification: (notificationId: string) => void;
  
  // Impact analysis
  getLatestImpactForAsset: (assetId: string) => ImpactAnalysis | undefined;
  
  // Campaign impact checking
  checkCampaignImpacts: (campaignId: string, selectedAssets: string[]) => ImpactAnalysis[];
}

const ChangeImpactContext = createContext<ChangeImpactContextType | undefined>(undefined);

const STORAGE_KEY = 'change-impact-store';

export function ChangeImpactProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<ChangeImpactStore>(() => {
    // Load from localStorage
    const stored = loadFromStorage<ChangeImpactStore>(STORAGE_KEY as any, {
      changes: [],
      impactAnalyses: [],
      notifications: [],
      lastAnalyzedAt: new Date().toISOString(),
    });
    
    logger.info(`Loaded ${stored.changes.length} changes and ${stored.notifications.length} notifications`);
    return stored;
  });

  // Persist to localStorage
  useEffect(() => {
    saveToStorage(STORAGE_KEY as any, store);
  }, [store]);

  /**
   * Track een asset wijziging en analyseer de impact
   */
  const trackAssetChange = (
    asset: BrandAsset,
    previousAsset: BrandAsset | undefined,
    changeType: ChangeType,
    description: string
  ) => {
    logger.info(`Tracking change for asset ${asset.id}: ${changeType}`);

    // Creëer change record
    const change: AssetChange = {
      id: `change-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      assetId: asset.id,
      assetTitle: asset.title,
      changeType,
      timestamp: new Date().toISOString(),
      description,
      researchAdded: changeType === 'research-added',
      coverageChangeBefore: previousAsset?.researchCoverage,
      coverageChangeAfter: asset.researchCoverage,
    };

    // Analyseer impact
    const impactAnalysis = ChangeImpactService.analyzeAssetChange(
      change,
      asset,
      previousAsset
    );

    // Creëer notificatie als er impact is
    let notification: ChangeNotification | undefined;
    if (impactAnalysis.decisionImpact.impactLevel !== 'none') {
      notification = ChangeImpactService.createNotification(
        impactAnalysis,
        true, // Show in decision status
        true  // Show in campaign generator
      );
    }

    // Update store
    setStore(prev => ({
      ...prev,
      changes: [change, ...prev.changes].slice(0, 100), // Keep last 100 changes
      impactAnalyses: [impactAnalysis, ...prev.impactAnalyses].slice(0, 100),
      notifications: notification 
        ? [notification, ...prev.notifications]
        : prev.notifications,
      lastAnalyzedAt: new Date().toISOString(),
    }));

    logger.debug('Change tracked and analyzed', { change, impactAnalysis });
  };

  /**
   * Haal notificaties op, optioneel gefilterd per locatie
   */
  const getNotifications = (location?: 'decision-status' | 'campaign-generator'): ChangeNotification[] => {
    let notifications = store.notifications.filter(n => !n.dismissed);

    if (location === 'decision-status') {
      notifications = notifications.filter(n => n.showInDecisionStatus);
    } else if (location === 'campaign-generator') {
      notifications = notifications.filter(n => n.showInCampaignGenerator);
    }

    return notifications;
  };

  /**
   * Markeer notificatie als gezien
   */
  const markNotificationSeen = (notificationId: string) => {
    setStore(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId ? { ...n, seen: true } : n
      ),
    }));
  };

  /**
   * Dismiss een notificatie
   */
  const dismissNotification = (notificationId: string) => {
    setStore(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId 
          ? { ...n, dismissed: true, acknowledgedAt: new Date().toISOString() } 
          : n
      ),
    }));
  };

  /**
   * Haal de laatste impact analysis op voor een specifiek asset
   */
  const getLatestImpactForAsset = (assetId: string): ImpactAnalysis | undefined => {
    return store.impactAnalyses.find(ia => ia.change.assetId === assetId);
  };

  /**
   * Check welke assets in een campagne nieuwere strategische input hebben
   */
  const checkCampaignImpacts = (
    campaignId: string,
    selectedAssets: string[]
  ): ImpactAnalysis[] => {
    // Vind alle impact analyses voor de geselecteerde assets
    return store.impactAnalyses.filter(ia => 
      selectedAssets.includes(ia.change.assetId) &&
      (ia.decisionImpact.decisionStatusChanged || ia.change.researchAdded)
    );
  };

  return (
    <ChangeImpactContext.Provider
      value={{
        store,
        trackAssetChange,
        getNotifications,
        markNotificationSeen,
        dismissNotification,
        getLatestImpactForAsset,
        checkCampaignImpacts,
      }}
    >
      {children}
    </ChangeImpactContext.Provider>
  );
}

export function useChangeImpact() {
  const context = useContext(ChangeImpactContext);
  if (context === undefined) {
    throw new Error('useChangeImpact must be used within a ChangeImpactProvider');
  }
  return context;
}
