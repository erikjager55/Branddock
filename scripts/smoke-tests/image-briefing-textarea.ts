/**
 * Smoke-test for canvas-image-briefing-textarea — unit-level (no AI).
 *
 * Validates:
 *   1. Builder uses briefingText as subject-seed when present
 *   2. Builder falls back to chip-aware subject when briefingText is empty/null
 *   3. briefingText overrules persona+product subject (highest priority)
 *
 * Live AI route smoke-test: hand-off (requires DB-deliverable + Anthropic key
 * + workspace setup; covered in task-file Smoke Test Plan section).
 *
 * Run: `npx tsx scripts/smoke-tests/image-briefing-textarea.ts`
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
};

const persona: PersonaContext = {
  id: 'p-1',
  name: 'Marketing Director Maria',
  serialized: '37-year-old Marketing Director, B2B SaaS background',
  avatarUrl: null,
};

const product: ProductContext = {
  id: 'pr-1',
  name: 'Brand Voice Analyzer',
  description: 'Voice-fidelity scoring',
  category: 'Brand Tool',
  pricingModel: null,
  pricingDetails: null,
  features: [],
  benefits: [],
  useCases: [],
};

console.log('\n=== image-briefing-textarea smoke ===\n');

// ── briefingText present → overrules everything ──
console.log('## briefingText present → overrules chip + persona + product\n');
{
  const brief: VisualBrief = {
    source: 'generate',
    styleDirection: 'lifestyle',
    styleDirectionFreeText: null,
    briefingText: 'Vrouw rond de 35 in een café, laptop open, koffie in beeld, ochtendlicht door raam',
  };
  const { prompts: [prompt] } = buildVisualBriefImagePrompts(brief, brand, {
    keyMessage: 'Brand consistency wins',
    objective: null,
    personas: [persona],
    products: [product],
  }, 1);
  console.log(`  Prompt (first 250 chars): ${prompt.slice(0, 250).replace(/\n/g, ' ')}…`);
  assert('Subject = briefingText (verbatim)', prompt.includes('Vrouw rond de 35 in een café, laptop open'));
  assert('Subject does NOT use persona name', !prompt.includes('Marketing Director Maria'));
  assert('Subject does NOT use product name', !prompt.includes('Brand Voice Analyzer'));
  assert('Style instruction still present (lifestyle)', prompt.includes('Lifestyle photography'));
}

// ── briefingText empty → fallback to chip-aware ──
console.log('\n## briefingText empty → chip-aware fallback\n');
{
  const brief: VisualBrief = {
    source: 'generate',
    styleDirection: 'lifestyle',
    styleDirectionFreeText: null,
    briefingText: null,
  };
  const { prompts: [prompt] } = buildVisualBriefImagePrompts(brief, brand, {
    keyMessage: 'Fallback message',
    objective: null,
    personas: [persona],
    products: [product],
  }, 1);
  assert('Fallback uses persona name (chip-aware)', prompt.includes('Marketing Director Maria'));
  assert('Fallback uses product name', prompt.includes('Brand Voice Analyzer'));
}

// ── briefingText whitespace-only → treated as empty ──
console.log('\n## briefingText whitespace-only → fallback\n');
{
  const brief: VisualBrief = {
    source: 'generate',
    styleDirection: 'lifestyle',
    styleDirectionFreeText: null,
    briefingText: '   \n   ',
  };
  const { prompts: [prompt] } = buildVisualBriefImagePrompts(brief, brand, {
    keyMessage: 'Whitespace test',
    objective: null,
    personas: [persona],
  }, 1);
  assert('Whitespace-only briefingText falls back to persona', prompt.includes('Marketing Director Maria'));
  assert('Subject does not contain just whitespace', !prompt.includes('Subject:    '));
}

// ── briefingText alone (no chip, no persona/product) ──
console.log('\n## briefingText alone — minimal context\n');
{
  const brief: VisualBrief = {
    source: 'generate',
    styleDirection: null,
    styleDirectionFreeText: null,
    briefingText: 'Hands holding a smartphone, soft window light',
  };
  const { prompts: [prompt] } = buildVisualBriefImagePrompts(brief, brand, {
    keyMessage: null,
    objective: null,
  }, 1);
  assert('Minimal-context briefingText survives', prompt.includes('Hands holding a smartphone'));
}

// ── Backwards compat: briefingText undefined (old payloads) ──
console.log('\n## Backwards compat — briefingText undefined\n');
{
  const brief: VisualBrief = {
    source: 'generate',
    styleDirection: 'product-shot',
    styleDirectionFreeText: null,
    // briefingText omitted → undefined
  };
  const { prompts: [prompt] } = buildVisualBriefImagePrompts(brief, brand, {
    keyMessage: null,
    objective: null,
    products: [product],
  }, 1);
  assert('Without briefingText field → product-shot fallback works', prompt.includes('Brand Voice Analyzer'));
}

console.log(`\n=== TOTAL: ${pass} passed, ${fail} failed ===\n`);
process.exit(fail > 0 ? 1 : 0);
