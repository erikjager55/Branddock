// =============================================================
// LINK-artefact navigatie — domain-first write-through (user-directive
// 2026-07-06): elk LINK-artefact navigeert naar de module-pagina van de
// entiteit, via dezelfde section-ids als Claw's navigate_to_page en de
// bestaande detail-store-setters (patroon MutationConfirmCard /
// App.tsx pendingNavigation).
// =============================================================

import { useCompetitorsStore } from '@/features/competitors/stores/useCompetitorsStore';
import { usePersonaDetailStore } from '@/features/personas/stores/usePersonaDetailStore';
import { useProductsStore } from '@/features/products/stores/useProductsStore';
import { useTrendRadarStore } from '@/features/trend-radar/stores/useTrendRadarStore';
import { useCampaignStore } from '@/features/campaigns/stores/useCampaignStore';
import { useContentLibraryStore } from '@/features/campaigns/stores/useContentLibraryStore';
import { useBrandAlignmentStore } from '@/stores/useBrandAlignmentStore';
import type { LinkArtifactContent } from '../types/agents.types';

/**
 * Navigate to the module page of a linked entity. Returns false when the
 * entity type has no navigable surface (viewer shows a muted label).
 */
export function navigateToEntity(
  link: LinkArtifactContent,
  navigate: (section: string) => void,
): boolean {
  switch (link.entityType) {
    case 'deliverable':
      // Canvas heeft campaignId + deliverableId nodig; zonder campaign
      // valt de link terug op de Content Library (deliverable zichtbaar).
      if (link.campaignId) {
        useCampaignStore.getState().setSelectedCampaignId(link.campaignId);
        useCampaignStore.getState().setSelectedDeliverableId(link.entityId);
        navigate('content-canvas');
      } else {
        navigate('content-library');
      }
      return true;
    case 'campaign':
      // Campagne-detail is gemerged in de Content Library (campaign-filter).
      useContentLibraryStore.getState().setFilter('campaigns', [link.entityId]);
      navigate('content-library');
      return true;
    case 'knowledgeResource':
      navigate('knowledge');
      return true;
    case 'competitor':
      useCompetitorsStore.getState().setSelectedCompetitorId(link.entityId);
      navigate('competitor-detail');
      return true;
    case 'persona':
      usePersonaDetailStore.getState().setSelectedPersonaId(link.entityId);
      navigate('persona-detail');
      return true;
    case 'product':
      useProductsStore.getState().setSelectedProductId(link.entityId);
      navigate('product-detail');
      return true;
    case 'trend':
      useTrendRadarStore.getState().setSelectedTrendId(link.entityId);
      navigate('trend-detail');
      return true;
    case 'observationRun':
      // Brand Alignment Tab 5 (Brandclaw-observaties).
      useBrandAlignmentStore.getState().setActiveTab('brandclaw');
      navigate('brand-alignment');
      return true;
    default:
      return false;
  }
}
