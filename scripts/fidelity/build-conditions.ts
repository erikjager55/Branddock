/**
 * scripts/fidelity/build-conditions.ts
 *
 * Bouwt per (merk, content-type, conditie) de volledige system-prompt
 * voor de drift-meting. Output naar research/fidelity-week1/conditions/.
 *
 * Conditie A: huidige BVD via buildBrandVoiceDirective() + briefing
 * Conditie B: gestructureerde BVD via formatConditionB() + briefing
 *
 * Run:
 *   npx tsx scripts/fidelity/build-conditions.ts \
 *     --brands wra-juristen,linfi,better-brands \
 *     --types case-study,thought-leadership \
 *     --conditions A,B
 *
 * Output: research/fidelity-week1/conditions/{brand}-{type}-{A|B}.md
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// ─── Env loading ────────────────────────────────────────────

const envPath = resolve(process.cwd(), '.env.local');
try {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!value.startsWith('"') && !value.startsWith("'")) {
      const hashIdx = value.indexOf('#');
      if (hashIdx !== -1) value = value.slice(0, hashIdx).trim();
    }
    if (value) process.env[key] = value;
  }
} catch (err) {
  console.warn(`(could not read ${envPath}: ${(err as Error).message})`);
}

// ─── Dynamic imports (after env load) ───────────────────────

let prisma: typeof import('../../src/lib/prisma').prisma;
let buildBrandVoiceDirective: typeof import('../../src/lib/studio/brand-voice-directive').buildBrandVoiceDirective;
let formatConditionB: typeof import('./format-condition-b').formatConditionB;
let PATHS: typeof import('./config').PATHS;
let CONFIG: typeof import('./config');

// ─── Constants ──────────────────────────────────────────────

/** Brand slug → channel key mapping for long-form content */
const CONTENT_TYPE_CHANNEL: Record<string, { channelKey: string; channelLabel: string }> = {
  'case-study': { channelKey: 'website', channelLabel: 'Website (long-form case study)' },
  'thought-leadership': { channelKey: 'website', channelLabel: 'Website (long-form thought leadership)' },
};

/** Brand display names + workspace slugs */
const BRAND_DISPLAY: Record<string, string> = {
  'wra-juristen': 'WRA Juristen',
  'linfi': 'Linfi',
  'better-brands': 'Better Brands',
};

// ─── Prompt assembly ────────────────────────────────────────

function buildSystemPrompt(directive: string, briefing: string, contentType: string, brandName: string): string {
  return `You are an expert content writer producing long-form business content for ${brandName}.

${directive}

---

## CONTENT TYPE

You are writing a ${contentType.replace('-', ' ')}.

## BRIEFING

${briefing}

---

Write the full piece now. Use markdown headings (##, ###) for structure. Aim for 2700-3300 words. Output the content directly without preamble or commentary.`;
}

// ─── Main ───────────────────────────────────────────────────

interface BuildArgs {
  brands: string[];
  types: string[];
  conditions: ('A' | 'B')[];
}

function parseArgs(): BuildArgs {
  const args = process.argv.slice(2);
  let brands: string[] = [];
  let types: string[] = [];
  let conditions: ('A' | 'B')[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--brands' && args[i + 1]) {
      brands = args[++i].split(',');
    } else if (args[i] === '--types' && args[i + 1]) {
      types = args[++i].split(',');
    } else if (args[i] === '--conditions' && args[i + 1]) {
      conditions = args[++i].split(',') as ('A' | 'B')[];
    }
  }
  if (brands.length === 0) brands = ['wra-juristen', 'linfi', 'better-brands'];
  if (types.length === 0) types = ['case-study', 'thought-leadership'];
  if (conditions.length === 0) conditions = ['A', 'B'];
  return { brands, types, conditions };
}

async function buildConditionA(workspaceId: string, channelKey: string): Promise<string> {
  return await buildBrandVoiceDirective(workspaceId, { channel: channelKey });
}

async function buildConditionBDirective(workspaceId: string, brandName: string, channelKey: string, channelLabel: string): Promise<string> {
  // Fetch raw BrandPersonality + ToV + BrandVoice + workspace lang
  const personalityAsset = await prisma.brandAsset.findFirst({
    where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
    select: { frameworkData: true },
  });
  // Guidelines verhuisd van Brandstyleguide naar BrandVoiceguide (ADR 2026-05-15).
  const voiceguide = await prisma.brandVoiceguide.findUnique({
    where: { workspaceId },
    select: { contentGuidelines: true, writingGuidelines: true, guidelinesSavedForAi: true },
  });
  const brandVoice = await prisma.brandVoice.findFirst({
    where: { workspaceId, isDefault: true },
    select: { voiceTone: true, voicePrompt: true },
  });
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { contentLanguage: true },
  });

  const personality = (personalityAsset?.frameworkData ?? {}) as import('./format-condition-b').BrandPersonalityRaw;

  return formatConditionB({
    brandName,
    contentLanguage: workspace?.contentLanguage ?? 'en',
    channelKey,
    channelLabel,
    personality,
    toneOfVoice: voiceguide
      ? {
          contentGuidelines: voiceguide.contentGuidelines,
          writingGuidelines: voiceguide.writingGuidelines,
          toneSavedForAi: voiceguide.guidelinesSavedForAi,
        }
      : undefined,
    brandVoice: brandVoice ?? undefined,
  });
}

async function main() {
  const { brands, types, conditions } = parseArgs();

  // Dynamic imports after env load
  ({ prisma } = await import('../../src/lib/prisma'));
  ({ buildBrandVoiceDirective } = await import('../../src/lib/studio/brand-voice-directive'));
  ({ formatConditionB } = await import('./format-condition-b'));
  CONFIG = await import('./config');
  PATHS = CONFIG.PATHS;

  console.log(`→ Brands: ${brands.join(', ')}`);
  console.log(`→ Types: ${types.join(', ')}`);
  console.log(`→ Conditions: ${conditions.join(', ')}`);
  console.log('');

  mkdirSync(PATHS.conditions, { recursive: true });

  for (const brandSlug of brands) {
    const workspace = await prisma.workspace.findFirst({ where: { slug: brandSlug }, select: { id: true, slug: true, name: true } });
    if (!workspace) {
      console.warn(`  ⚠ Workspace "${brandSlug}" not found, skipping`);
      continue;
    }
    const brandName = BRAND_DISPLAY[brandSlug] ?? workspace.name;

    for (const contentType of types) {
      const channelInfo = CONTENT_TYPE_CHANNEL[contentType];
      if (!channelInfo) {
        console.warn(`  ⚠ Unknown content type "${contentType}", skipping`);
        continue;
      }
      const briefingPath = join(PATHS.briefings, `${brandSlug}-${contentType}.md`);
      if (!existsSync(briefingPath)) {
        console.warn(`  ⚠ Briefing not found: ${briefingPath}, skipping`);
        continue;
      }
      const briefing = readFileSync(briefingPath, 'utf8');

      for (const condition of conditions) {
        const directive =
          condition === 'A'
            ? await buildConditionA(workspace.id, channelInfo.channelKey)
            : await buildConditionBDirective(workspace.id, brandName, channelInfo.channelKey, channelInfo.channelLabel);

        const systemPrompt = buildSystemPrompt(directive, briefing, contentType, brandName);

        const filename = `${brandSlug}-${contentType}-${condition}.md`;
        const filepath = join(PATHS.conditions, filename);
        writeFileSync(filepath, systemPrompt, 'utf8');

        const tokens = Math.round(systemPrompt.length / 4);
        console.log(`  ✓ ${filename} — ${systemPrompt.length} chars (~${tokens} tokens)`);
      }
    }
  }

  console.log('');
  console.log(`✓ Done. Conditions written to ${PATHS.conditions}`);
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  if (prisma) await prisma.$disconnect();
  process.exit(1);
});
