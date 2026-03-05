/**
 * Enhanced Asset Card - Using Unified EntityCard
 * Brand assets displayed with same layout as personas
 */

import React from 'react';
import { BrandAsset, ResearchMethod } from '../../types/brand-asset';
import { EntityCard } from '../unified/EntityCard';
import { brandAssetToEntityCard } from '../../utils/entity-card-adapters';

interface EnhancedAssetCardUnifiedProps {
  asset: BrandAsset;
  onClick?: () => void;
  onMethodClick?: (method: ResearchMethod, mode: 'work' | 'results') => void;
  lockedToolIds?: string[];
  unlockingToolId?: string | null;
  onToolUnlockClick?: (toolId: string, toolName: string) => void;
}

/**
 * Enhanced Asset Card - Uses Unified EntityCard (same as personas)
 */
export function EnhancedAssetCardUnified({
  asset,
  onClick,
  onMethodClick,
  lockedToolIds,
  unlockingToolId,
  onToolUnlockClick,
}: EnhancedAssetCardUnifiedProps) {
  // Locked tools props (lockedToolIds, unlockingToolId, onToolUnlockClick) are
  // not yet passed to EntityCard — add when tool unlocking UI is implemented
  const entityData = brandAssetToEntityCard(asset, onClick, onMethodClick);

  return <EntityCard data={entityData} />;
}