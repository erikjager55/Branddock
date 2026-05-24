import type { Data } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { SpikePuckProps } from '../puck-config';
import {
  defaultBrandHero, defaultBrandCta, defaultFeatureGrid,
  defaultPricingTable, defaultRichText, defaultFooter,
  type FilledFields,
} from './template-helpers';

type SpikeData = Data<SpikePuckProps>;

/**
 * comparison-page template — hero + features (side-by-side) + pricing
 * (vs/vs/vs) + rich-text differentiator block + CTA + footer. Optimised for
 * "us vs them" intent traffic where the visitor is mid-funnel and comparing.
 */
export function buildComparisonPageTemplate(
  filled: FilledFields,
  ctx: CanvasContextStack | null,
): SpikeData {
  return {
    root: { props: {} },
    content: [
      defaultBrandHero(filled),
      defaultFeatureGrid(filled),
      defaultPricingTable(filled),
      defaultRichText(filled),
      defaultBrandCta(filled, ctx),
      defaultFooter(filled, ctx),
    ],
  } as SpikeData;
}
