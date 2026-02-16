import type { Campaign, CampaignDeliverable } from '../types/campaign';

/** Convert a Campaign to the strategy format used by ActiveCampaignsPage */
export function campaignToStrategy(campaign: Campaign) {
  const assetCounts = campaign.assets.reduce((acc, asset) => {
    if (asset.type === 'brand') acc.brand = (acc.brand || 0) + 1;
    if (asset.type === 'persona') acc.persona = (acc.persona || 0) + 1;
    if (asset.type === 'product') acc.product = (acc.product || 0) + 1;
    return acc;
  }, {} as { brand?: number; persona?: number; product?: number });

  const brandAsset = campaign.assets.find(a => a.type === 'brand');
  const personaAsset = campaign.assets.find(a => a.type === 'persona');
  const productAsset = campaign.assets.find(a => a.type === 'product');

  return {
    id: campaign.id,
    name: campaign.name,
    type: campaign.type,
    status: campaign.status,
    assets: assetCounts,
    contextInputs: {
      ...(brandAsset && { brand: { name: brandAsset.name, count: assetCounts.brand || 0 } }),
      ...(personaAsset && { persona: { name: personaAsset.name, count: assetCounts.persona || 0 } }),
      ...(productAsset && { product: { name: productAsset.name, count: assetCounts.product || 0 } }),
    },
    deliverables: campaign.deliverables,
    modifiedTime: campaign.modifiedTime || 'Unknown',
    modifiedBy: campaign.modifiedBy || 'Unknown'
  };
}
