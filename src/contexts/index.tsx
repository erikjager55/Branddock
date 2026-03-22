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
import { ChangeImpactProvider } from './ChangeImpactContext';
import { ChangeImpactConnector } from '../components/impact/ChangeImpactConnector';
import { ProductTierProvider } from './ProductTierContext';
import { ProductsProvider } from './ProductsContext';
import { KnowledgeProvider } from './KnowledgeContext';
import { CampaignsProvider } from './CampaignsContext';
import { BrandAlignmentProvider } from './BrandAlignmentContext';

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
              <KnowledgeProvider>
              <CampaignsProvider>
              <BrandAlignmentProvider>
              <ResearchPlanProvider>
                <ResearchBundleProvider>
                  <CollaborationProvider>
                    <WhiteLabelProvider>
                        <UIStateProvider>
                          {children}
                        </UIStateProvider>
                    </WhiteLabelProvider>
                  </CollaborationProvider>
                </ResearchBundleProvider>
              </ResearchPlanProvider>
              </BrandAlignmentProvider>
            </CampaignsProvider>
              </KnowledgeProvider>
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
export { useChangeImpact } from './ChangeImpactContext';
export { useProductTier } from './ProductTierContext';
export { useProducts } from './ProductsContext';
export { useKnowledgeContext } from './KnowledgeContext';
export { useCampaignsContext } from './CampaignsContext';
export { useBrandAlignment, useAlignmentModules, useAlignmentHistory, useAlignmentIssues, useAlignmentIssueDetail, useStartAlignmentScan, useDismissIssue, useScanProgress, useFixOptions, useApplyFix, useCancelScan } from './BrandAlignmentContext';
