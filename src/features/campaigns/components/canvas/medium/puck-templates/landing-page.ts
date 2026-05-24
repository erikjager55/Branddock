import type { Data } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { SpikePuckProps } from '../puck-config';
import {
  defaultBrandHero, defaultBrandCta, defaultFeatureGrid,
  defaultFaq, defaultFooter, type FilledFields,
} from './template-helpers';

type SpikeData = Data<SpikePuckProps>;

/**
 * landing-page template — hero + features + CTA + FAQ + footer. The default
 * Branddock landing structure: drives a conversion goal (sign-up / trial /
 * demo) above the fold, supports it with proof + FAQ further down.
 */
export function buildLandingPageTemplate(
  filled: FilledFields,
  ctx: CanvasContextStack | null,
): SpikeData {
  return {
    root: { props: {} },
    content: [
      defaultBrandHero(filled),
      defaultFeatureGrid(filled),
      defaultBrandCta(filled, ctx),
      defaultFaq(filled),
      defaultFooter(filled, ctx),
    ],
  } as SpikeData;
}
