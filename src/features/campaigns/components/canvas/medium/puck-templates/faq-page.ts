import type { Data } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { SpikePuckProps } from '../puck-config';
import {
  defaultBrandHero, defaultBrandCta, defaultFaq, defaultFooter,
  type FilledFields,
} from './template-helpers';

type SpikeData = Data<SpikePuckProps>;

/**
 * faq-page template — hero + accordion + CTA + footer. Minimal layout for
 * support / docs landing; the FAQ block carries 95% of the page weight.
 */
export function buildFaqPageTemplate(
  filled: FilledFields,
  ctx: CanvasContextStack | null,
): SpikeData {
  return {
    root: { props: {} },
    content: [
      defaultBrandHero(filled),
      defaultFaq(filled),
      defaultBrandCta(filled, ctx),
      defaultFooter(filled, ctx),
    ],
  } as SpikeData;
}
