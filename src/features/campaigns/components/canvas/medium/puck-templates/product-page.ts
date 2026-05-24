import type { Data } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { SpikePuckProps } from '../puck-config';
import {
  defaultBrandHero, defaultBrandCta, defaultFeatureGrid,
  defaultPricingTable, defaultTestimonial, defaultFooter,
  type FilledFields,
} from './template-helpers';

type SpikeData = Data<SpikePuckProps>;

/**
 * product-page template — hero + features + pricing + testimonial + CTA +
 * footer. Heavier than landing-page: pricing is on-page (no separate compare
 * step), social proof sits between pricing and final CTA to lift conversion.
 */
export function buildProductPageTemplate(
  filled: FilledFields,
  ctx: CanvasContextStack | null,
): SpikeData {
  return {
    root: { props: {} },
    content: [
      defaultBrandHero(filled),
      defaultFeatureGrid(filled),
      defaultPricingTable(filled),
      defaultTestimonial(filled, ctx),
      defaultBrandCta(filled, ctx),
      defaultFooter(filled, ctx),
    ],
  } as SpikeData;
}
