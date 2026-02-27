import type { BrandAssetDetail } from '../types/brand-asset-detail.types';

export function exportBrandAssetPdf(asset: BrandAssetDetail) {
  const lines: string[] = [];
  lines.push(`Brand Asset: ${asset.name}`);
  lines.push(`Category: ${asset.category}`);
  lines.push(`Status: ${asset.status}`);
  lines.push(`Validation: ${Math.round(asset.validationPercentage)}%`);
  lines.push('');

  if (asset.description) {
    lines.push(`Description: ${asset.description}`);
    lines.push('');
  }

  const contentStr = typeof asset.content === 'string'
    ? asset.content
    : asset.content ? JSON.stringify(asset.content, null, 2) : '';

  if (contentStr) {
    lines.push('Content:');
    lines.push(contentStr);
    lines.push('');
  }

  if (asset.frameworkType && asset.frameworkData) {
    lines.push(`Framework: ${asset.frameworkType}`);
    lines.push(JSON.stringify(asset.frameworkData, null, 2));
    lines.push('');
  }

  // Create downloadable text file (true PDF generation requires a library)
  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${asset.name.toLowerCase().replace(/\s+/g, '-')}-export.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
