/**
 * One-off data-fix (prompt-audit Fase 5, BV-WIRE W-5): strip de
 * gedeprecate'de voice-dimensies en voice-fieldSuggestions uit BESTAANDE
 * brand-personality ExplorationConfig-rows. De seed en het sync-script zijn
 * al voice-vrij; dit script trekt de live rows gelijk zonder andere
 * admin-edits (prompts, overige dims/velden) aan te raken.
 *
 * Idempotent: rows zonder voice-velden worden geskipt.
 *
 * Usage:
 *   DATABASE_URL="postgresql://erikjager:@localhost:5432/branddock" npx tsx scripts/dev/strip-voice-from-personality-configs.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const VOICE_DIMENSION_KEYS = new Set(['voice', 'voice_tone', 'writing_sample', 'channel_adaptation']);

const VOICE_FIELD_PREFIXES = [
  'frameworkData.brandVoiceDescription',
  'frameworkData.wordsWeUse',
  'frameworkData.wordsWeAvoid',
  'frameworkData.writingSample',
  'frameworkData.toneDimensions',
  'frameworkData.channelTones',
];

function isVoiceField(field: unknown): boolean {
  return typeof field === 'string' && VOICE_FIELD_PREFIXES.some((p) => field.startsWith(p));
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const configs = await prisma.explorationConfig.findMany({
    where: { itemSubType: 'brand-personality' },
    select: { id: true, workspaceId: true, label: true, dimensions: true, fieldSuggestionsConfig: true },
  });

  console.log(`Gevonden brand-personality configs: ${configs.length}${dryRun ? ' (dry-run)' : ''}`);

  for (const config of configs) {
    const dims = Array.isArray(config.dimensions) ? (config.dimensions as Array<Record<string, unknown>>) : [];
    const fields = Array.isArray(config.fieldSuggestionsConfig)
      ? (config.fieldSuggestionsConfig as Array<Record<string, unknown>>)
      : [];

    const cleanDims = dims.filter((d) => !VOICE_DIMENSION_KEYS.has(String(d.key)));
    const cleanFields = fields.filter((f) => !isVoiceField(f.field));

    const removedDims = dims.length - cleanDims.length;
    const removedFields = fields.length - cleanFields.length;

    if (removedDims === 0 && removedFields === 0) {
      console.log(`  SKIP ${config.workspaceId} (${config.id}) — al voice-vrij`);
      continue;
    }

    console.log(
      `  ${dryRun ? 'ZOU FIXEN' : 'FIX'} ${config.workspaceId} (${config.id}): ` +
      `-${removedDims} voice-dims, -${removedFields} voice-fieldSuggestions ` +
      `(dims ${dims.length}→${cleanDims.length}, fields ${fields.length}→${cleanFields.length})`,
    );

    if (!dryRun) {
      await prisma.explorationConfig.update({
        where: { id: config.id },
        data: {
          dimensions: cleanDims as unknown as Record<string, never>[],
          fieldSuggestionsConfig: cleanFields as unknown as Record<string, never>[],
          // Label alleen bijwerken als hij nog de oude seed-naam draagt —
          // een admin-gekozen label blijft staan.
          ...(config.label === 'Brand Personality — Character & Voice'
            ? { label: 'Brand Personality — Aaker Dimensions' }
            : {}),
        },
      });
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
