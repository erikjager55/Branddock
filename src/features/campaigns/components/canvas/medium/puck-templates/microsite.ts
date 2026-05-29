import type { Data } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { SpikePuckProps } from '../puck-config';
import {
  defaultBrandHero, defaultBrandCta, defaultRichText,
  defaultFeatureGrid, defaultTestimonial, defaultFooter,
  type FilledFields,
} from './template-helpers';

type SpikeData = Data<SpikePuckProps>;

/**
 * microsite template — hero + 3 content sections + features + testimonial +
 * CTA + footer. Densest of the 5 templates; designed for campaign-specific
 * microsites that need to carry a longer narrative around an event /
 * launch / report.
 */
export function buildMicrositeTemplate(
  filled: FilledFields,
  ctx: CanvasContextStack | null,
): SpikeData {
  return {
    root: { props: {} },
    content: [
      defaultBrandHero(filled),
      defaultRichText(filled),
      defaultFeatureGrid(filled),
      defaultTestimonial(filled, ctx),
      defaultRichText(filled),
      defaultBrandCta(filled, ctx),
      defaultFooter(filled, ctx),
    ],
  } as SpikeData;
}
