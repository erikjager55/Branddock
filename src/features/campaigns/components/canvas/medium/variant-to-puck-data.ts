import type { Data } from '@puckeditor/core';
import type { PreviewContent } from '../../../types/canvas.types';
import type { CanvasContextStack } from '@/lib/ai/canvas-context';
import type { SpikePuckProps } from './puck-config';

type SpikeData = Data<SpikePuckProps>;

/**
 * Seed-mapper from Canvas Step 2 variant output to an initial Puck data tree.
 *
 * Heuristic: pull the first text-entry whose key contains "headline"/"hero"
 * into BrandHero, the next text-entry containing "sub"/"description" into
 * the sub field, and the first "cta"/"button" entry into the CTA. The rest
 * is dropped — spike scope is intentionally narrow.
 *
 * The MVP version of this mapper would handle all 8 component types and
 * support per-content-type templates. For the spike we only need landing-page.
 */
export function variantToPuckData(
  previewContent: PreviewContent,
  ctx: CanvasContextStack | null,
): SpikeData {
  const textEntries = Object.entries(previewContent).filter(
    ([, v]) => v.type === 'text' && v.content,
  );

  const find = (...needles: string[]) =>
    textEntries.find(([key]) =>
      needles.some((n) => key.toLowerCase().includes(n)),
    )?.[1]?.content ?? null;

  const headline =
    find('headline', 'hero', 'title') ??
    ctx?.concept?.campaignTheme ??
    'Welcome';
  const sub =
    find('sub', 'description', 'value', 'tagline') ??
    ctx?.concept?.positioningStatement ??
    'A short subtitle that explains the value.';
  const ctaLabel = find('cta', 'button') ?? 'Get started';
  const personaId = ctx?.personas?.[0]?.id ?? '';

  return {
    root: { props: {} },
    content: [
      {
        type: 'BrandHero',
        props: {
          id: 'BrandHero-seed',
          headline: stripMarkers(headline),
          sub: stripMarkers(sub),
          ctaLabel: stripMarkers(ctaLabel).slice(0, 60),
        },
      },
      {
        type: 'BrandCTA',
        props: {
          id: 'BrandCTA-seed',
          label: stripMarkers(ctaLabel).slice(0, 40),
          href: '#',
          personaId,
        },
      },
    ],
  } as SpikeData;
}

function stripMarkers(text: string): string {
  return text
    .replace(/^#+\s*/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}
