/**
 * Smoke-test for canvas-image-content-coupling — unit-level (no AI).
 *
 * Validates that buildVisualBriefImagePrompts injects persona / product /
 * cta / concept / platform context into the subject seed when provided,
 * and falls back gracefully when missing.
 *
 * Run: `npx tsx scripts/smoke-tests/image-content-coupling.ts`
 */

import { buildVisualBriefImagePrompts } from '@/lib/ai/visual-brief-prompts';
import type {
  PersonaContext,
  ProductContext,
  VisualBrief,
} from '@/lib/ai/canvas-context';
import type { BrandContextBlock } from '@/lib/ai/prompt-templates';

let pass = 0;
let fail = 0;
const warn = 0;

function assert(name: string, cond: boolean, detail?: string) {
  if (cond) {
    console.log(`  ✓ ${name}`);
    pass++;
  } else {
    console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`);
    fail++;
  }
}

const brand: BrandContextBlock = {
  brandName: 'Better Brands',
  contentLanguage: 'nl',
  brandColors: 'Teal #0D9488, deep navy #1E3A8A',
  brandImageryStyle: 'Editorial photography, anti-stock-photo',
  brandVisualSystem: 'Modern minimal, generous whitespace',
};

const persona: PersonaContext = {
  id: 'persona-1',
  name: 'Marketing Director Maria',
  serialized: '37-year-old Marketing Director, working in a coworking space in Amsterdam, B2B SaaS background, prefers data-driven decisions, struggles with brand consistency across her team of 8',
  avatarUrl: null,
};

const product: ProductContext = {
  id: 'product-1',
  name: 'Brand Voice Analyzer',
  description: 'AI-powered tool to detect brand-voice drift in marketing copy',
  category: 'Brand Management Tool',
  pricingModel: 'subscription',
  pricingDetails: '€49/mo per workspace',
  features: ['Voice-fidelity scoring real-time', 'Multi-channel content audit', 'Brand-voice baseline definition'],
  benefits: [],
  useCases: [],
};

const baseBrief: VisualBrief = {
  source: 'generate',
  styleDirection: null,
  styleDirectionFreeText: null,
};

console.log('\n=== image-content-coupling smoke ===\n');

// ── Lifestyle chip with persona + product ──
console.log('## lifestyle chip — persona + product injection\n');
{
  const { prompts } = buildVisualBriefImagePrompts(
    { ...baseBrief, styleDirection: 'lifestyle' },
    brand,
    {
      keyMessage: 'We helpen merken hun strategie scherp krijgen',
      objective: null,
      personas: [persona],
      products: [product],
      callToAction: 'Start een gratis trial',
      creativePlatform: 'Brand-control op AI-snelheid',
      platform: 'linkedin',
      aspectRatio: '1.91:1',
    },
    1,
  );
  const p = prompts[0];
  console.log(`  Generated prompt (truncated): ${p.slice(0, 250).replace(/\n/g, ' ')}…`);
  assert('Prompt mentions persona name', p.includes('Marketing Director Maria'));
  assert('Prompt mentions persona context (Marketing Director)', p.toLowerCase().includes('marketing director'));
  assert('Prompt mentions product name', p.includes('Brand Voice Analyzer'));
  assert('Prompt mentions product category', p.includes('Brand Management Tool'));
  assert('Prompt mentions platform (linkedin)', p.includes('linkedin'));
  assert('Prompt mentions aspect-ratio (1.91:1)', p.includes('1.91:1'));
  assert('Prompt mentions creative-platform/theme', p.includes('Brand-control op AI-snelheid'));
  assert('Prompt mentions call-to-action', p.includes('Start een gratis trial'));
  assert('Prompt has lifestyle style instruction', p.includes('Lifestyle photography'));
  assert('Prompt has brand visual identity', p.includes('Teal #0D9488') || p.includes('Brand colors'));
}

// ── Product-shot chip with product ──
console.log('\n## product-shot chip — product subject\n');
{
  const { prompts } = buildVisualBriefImagePrompts(
    { ...baseBrief, styleDirection: 'product-shot' },
    brand,
    {
      keyMessage: null,
      objective: null,
      products: [product],
    },
    1,
  );
  const p = prompts[0];
  console.log(`  Generated prompt (truncated): ${p.slice(0, 250).replace(/\n/g, ' ')}…`);
  assert('Product-shot prompt mentions product name', p.includes('Brand Voice Analyzer'));
  assert('Product-shot prompt mentions hero composition', p.includes('hero composition'));
  assert('Product-shot prompt does NOT mention persona', !p.includes('Marketing Director'));
}

// ── Product-shot chip WITHOUT product (fallback warning) ──
console.log('\n## product-shot chip — fallback (no product)\n');
{
  const consoleSpy = { calls: [] as string[] };
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => { consoleSpy.calls.push(args.map(String).join(' ')); };

  try {
    const { prompts } = buildVisualBriefImagePrompts(
      { ...baseBrief, styleDirection: 'product-shot' },
      brand,
      {
        keyMessage: 'Brand consistency matters',
        objective: null,
      },
      1,
    );
    const p = prompts[0];
    assert(
      'Fallback emits console.warn',
      consoleSpy.calls.some((c) => c.includes('product-shot') && c.includes('falling back')),
      `warns: ${consoleSpy.calls.join(' | ')}`,
    );
    assert('Fallback prompt still produces output', p.length > 50);
    assert('Fallback uses keyMessage', p.includes('Brand consistency matters'));
  } finally {
    console.warn = originalWarn;
  }
}

// ── Quote-text chip ──
console.log('\n## quote-text chip — uses callToAction or keyMessage\n');
{
  const { prompts } = buildVisualBriefImagePrompts(
    { ...baseBrief, styleDirection: 'quote-text' },
    brand,
    {
      keyMessage: 'Brand consistency wins',
      objective: null,
      callToAction: 'Schedule your brand audit',
    },
    1,
  );
  const p = prompts[0];
  assert('Quote-text prompt features callToAction quote', p.includes('Schedule your brand audit'));
  assert('Quote-text prompt has Typography hint', p.includes('Typography'));
}

// ── No chip, no context — pure fallback ──
console.log('\n## No chip + no context — pure fallback\n');
{
  const { prompts } = buildVisualBriefImagePrompts(
    baseBrief,
    brand,
    { keyMessage: null, objective: null },
    1,
  );
  const p = prompts[0];
  assert('Fallback prompt mentions brand name', p.includes('Better Brands'));
  assert('Fallback prompt is non-empty', p.length > 30);
}

// ── Truncation: persona serialized longer than 200 chars ──
console.log('\n## Truncation — long persona serialized\n');
{
  const longPersona: PersonaContext = {
    id: 'persona-long',
    name: 'Long Persona',
    serialized: 'A'.repeat(500),
    avatarUrl: null,
  };
  const { prompts } = buildVisualBriefImagePrompts(
    { ...baseBrief, styleDirection: 'lifestyle' },
    brand,
    {
      keyMessage: null,
      objective: null,
      personas: [longPersona],
    },
    1,
  );
  const p = prompts[0];
  assert('Long serialized truncated with ellipsis', p.includes('A'.repeat(50)) && p.includes('…'));
  assert('Prompt does NOT contain full 500-char serialized', !p.includes('A'.repeat(300)));
}

// ── Backwards compatibility: no new fields ──
console.log('\n## Backwards compat — minimal call (only keyMessage + objective)\n');
{
  const { prompts } = buildVisualBriefImagePrompts(
    { ...baseBrief, styleDirection: 'lifestyle' },
    brand,
    {
      keyMessage: 'Old call-site keyMessage',
      objective: null,
    },
    2,
  );
  assert('Returns 2 prompts as requested', prompts.length === 2);
  assert('Both prompts contain keyMessage', prompts.every((p) => p.includes('Old call-site keyMessage')));
  assert('No platform-block when not provided', !prompts[0].includes('Intended for'));
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed, ${warn} soft-warnings ===\n`);
process.exit(fail > 0 ? 1 : 0);
