/**
 * Change Impact Connector
 * 
 * Verbindt BrandAssetsContext met ChangeImpactContext zodat alle asset wijzigingen
 * automatisch worden getracked en geanalyseerd.
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