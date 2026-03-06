/**
 * Change Impact Connector
 * 
 * Connects BrandAssetsContext with ChangeImpactContext so that all asset changes
 * are automatically tracked and analyzed.
 */

import { useEffect } from 'react';
import { useBrandAssets } from '../../contexts/BrandAssetsContext';
import { useChangeImpact } from '../../contexts/ChangeImpactContext';

export function ChangeImpactConnector() {
  const brandAssetsContext = useBrandAssets();
  const changeImpactContext = useChangeImpact();
  
  const { setOnAssetChange } = brandAssetsContext;
  const { trackAssetChange } = changeImpactContext;

  useEffect(() => {
    if (!setOnAssetChange || !trackAssetChange) {
      console.error('ChangeImpactConnector: Missing functions', {
        hasSetOnAssetChange: !!setOnAssetChange,
        hasTrackAssetChange: !!trackAssetChange,
      });
      return;
    }

    // Connect the asset change callback
    setOnAssetChange((asset, previousAsset, changeType, description) => {
      trackAssetChange(asset, previousAsset, changeType, description);
    });
  }, [setOnAssetChange, trackAssetChange]);

  // This component doesn't render anything
  return null;
}