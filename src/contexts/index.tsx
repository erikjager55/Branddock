/**
 * Root Context Provider
 * 
 * Combines all context providers into a single wrapper component.
 * Makes it easy to add/remove context providers in one place.
 */

import React, { ReactNode } from 'react';
import { BrandAssetsProvider } from './BrandAssetsContext';
import { PersonasProvider } from './PersonasContext';
import { ResearchPlanProvider } from './ResearchPlanContext';
import { UIStateProvider } from './UIStateContext';
import { ResearchBundleProvider } from './ResearchBundleContext';
import { CollaborationProvider } from './CollaborationContext';
import { WhiteLabelProvider } from './WhiteLabelContext';
import { TemplateProvider } from './TemplateContext';
import { ChangeImpactProvider } from './ChangeImpactContext';
import { ChangeImpactConnector } from '../components/impact/ChangeImpactConnector';
import { ProductTierProvider } from './ProductTierContext';
import { ProductsProvider } from './ProductsContext';

interface AppProvidersProps {
  children: ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ProductTierProvider>
      <BrandAssetsProvider>
        <ChangeImpactProvider>
          <ChangeImpactConnector />
          <PersonasProvider>
            <ProductsProvider>
              <ResearchPlanProvider>
                <ResearchBundleProvider>
                  <CollaborationProvider>
                    <WhiteLabelProvider>
                      <TemplateProvider>
                        <UIStateProvider>
                          {children}
                        </UIStateProvider>
                      </TemplateProvider>
                    </WhiteLabelProvider>
                  </CollaborationProvider>
                </ResearchBundleProvider>
              </ResearchPlanProvider>
            </ProductsProvider>
          </PersonasProvider>
        </ChangeImpactProvider>
      </BrandAssetsProvider>
    </ProductTierProvider>
  );
}

// Export all hooks for convenience
export { useBrandAssets } from './BrandAssetsContext';
export { usePersonas } from './PersonasContext';
export { useResearchPlan } from './ResearchPlanContext';
export { useUIState } from './UIStateContext';
export { useResearchBundles } from './ResearchBundleContext';
export { useCollaboration } from './CollaborationContext';
export { useWhiteLabel } from './WhiteLabelContext';
export { useTemplates } from './TemplateContext';
export { useChangeImpact } from './ChangeImpactContext';
export { useProductTier } from './ProductTierContext';
export { useProducts } from './ProductsContext';