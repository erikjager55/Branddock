import type { Data } from '@puckeditor/core';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { SpikePuckProps } from '../puck-config';
import type { FilledFields } from './template-helpers';
import { buildLandingPageTemplate } from './landing-page';
import { buildProductPageTemplate } from './product-page';
import { buildFaqPageTemplate } from './faq-page';
import { buildComparisonPageTemplate } from './comparison-page';
import { buildMicrositeTemplate } from './microsite';

type SpikeData = Data<SpikePuckProps>;

type TemplateBuilder = (filled: FilledFields, ctx: CanvasContextStack | null) => SpikeData;

const TEMPLATE_BY_CONTENT_TYPE: Record<string, TemplateBuilder> = {
  'landing-page': buildLandingPageTemplate,
  'product-page': buildProductPageTemplate,
  'faq-page': buildFaqPageTemplate,
  'comparison-page': buildComparisonPageTemplate,
  microsite: buildMicrositeTemplate,
};

const DEFAULT_TEMPLATE: TemplateBuilder = buildLandingPageTemplate;

/**
 * Resolve the per-content-type template builder. Unknown content-types
 * fall back to the landing-page layout (a sensible default that covers
 * generic web-page output even when the dispatcher is wrong).
 */
export function resolveTemplateBuilder(contentTypeId: string | null | undefined): TemplateBuilder {
  if (!contentTypeId) return DEFAULT_TEMPLATE;
  return TEMPLATE_BY_CONTENT_TYPE[contentTypeId] ?? DEFAULT_TEMPLATE;
}

export type { FilledFields } from './template-helpers';
