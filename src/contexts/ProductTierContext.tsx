/**
 * CONTEXT: Product Tier
 * 
 * Beheert gebruiker's product tier en feature access.
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ProductTier, UserSubscription, PRODUCT_TIERS } from '../types/product-tier';

interface ProductTierContextType {
  subscription: UserSubscription;
  currentTier: ProductTier;
  hasAccess: (feature: keyof UserSubscription['features']) => boolean;
  upgradeTier: (tier: ProductTier) => void;
  isFeatureGated: (feature: keyof UserSubscription['features']) => boolean;
  getTierInfo: (tier: ProductTier) => typeof PRODUCT_TIERS[ProductTier];
}

const ProductTierContext = createContext<ProductTierContextType | undefined>(undefined);

export function ProductTierProvider({ children }: { children: ReactNode }) {
  // Mock subscription - in real app would come from API/auth
  const [subscription, setSubscription] = useState<UserSubscription>({
    tier: 'decision-scan',
    startDate: new Date(),
    status: 'active',
    features: {
      decisionEngine: false,
      campaignGeneration: false,
      researchTools: false,
      stakeholderViews: false,
      reporting: false,
      advisoryServices: false
    }
  });

  const hasAccess = (feature: keyof UserSubscription['features']): boolean => {
    return subscription.features[feature];
  };

  const isFeatureGated = (feature: keyof UserSubscription['features']): boolean => {
    return !subscription.features[feature];
  };

  const upgradeTier = (tier: ProductTier) => {
    // Define feature access per tier
    const tierFeatures: Record<ProductTier, UserSubscription['features']> = {
      'decision-scan': {
        decisionEngine: false,
        campaignGeneration: false,
        researchTools: false,
        stakeholderViews: false,
        reporting: false,
        advisoryServices: false
      },
      'strategic-control': {
        decisionEngine: true,
        campaignGeneration: true,
        researchTools: true,
        stakeholderViews: true,
        reporting: true,
        advisoryServices: false
      },
      'advisory-services': {
        decisionEngine: true,
        campaignGeneration: true,
        researchTools: true,
        stakeholderViews: true,
        reporting: true,
        advisoryServices: true
      }
    };

    setSubscription({
      ...subscription,
      tier,
      features: tierFeatures[tier],
      startDate: new Date(),
      status: 'active'
    });
  };

  const getTierInfo = (tier: ProductTier) => PRODUCT_TIERS[tier];

  return (
    <ProductTierContext.Provider
      value={{
        subscription,
        currentTier: subscription.tier,
        hasAccess,
        upgradeTier,
        isFeatureGated,
        getTierInfo
      }}
    >
      {children}
    </ProductTierContext.Provider>
  );
}

export function useProductTier() {
  const context = useContext(ProductTierContext);
  if (context === undefined) {
    throw new Error('useProductTier must be used within a ProductTierProvider');
  }
  return context;
}
