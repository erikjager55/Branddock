// =============================================================
// Enrich BRAND.md-secties voor bestaande workspaces (2026-08-15)
//
// Niet-destructieve backfill van de verrijking (task #7):
//   1. References & Anti-References-asset aanmaken waar die ontbreekt
//      (leeg, DRAFT — menselijke keuze, wordt nooit auto-gevuld)
//   2. BrandVoiceguide.messagePillars afleiden uit de al-opgeslagen
//      voice-corpus (writingSamples/voiceSample/voiceDescription) via
//      één AI-call — ALLEEN wanneer het veld nog null is
//   3. Rapporteren welke styleguides geen designPhilosophy hebben
//      (Art Direction blijft daar leeg tot een re-analyse draait)
//
// Gereviewde content wordt nooit aangeraakt (zelfde principe als
// rescrape-brand --refresh). Default dry-run; --apply voert uit.
//
// Run (prod):
//   DATABASE_URL="postgresql://…" npx tsx scripts/dev/enrich-brandmd-sections.ts [--apply] [naamFilter]
// =============================================================

// .env.local laden vóór alle imports die env lezen (zelfde patroon als
// rescrape-brand.ts) — al-geëxporteerde vars (bv. een prod-DATABASE_URL
// inline op de command line) winnen: dotenv overschrijft nooit.
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { prisma } from '../../src/lib/prisma';
import { anthropicClient } from '../../src/lib/ai/anthropic-client';
import {
  CANONICAL_BRAND_ASSETS,
  ACTIVE_RESEARCH_METHOD_TYPES,
} from '../../src/lib/constants/canonical-brand-assets';

const apply = process.argv.includes('--apply');
const nameFilter = process.argv.slice(2).find((a) => !a.startsWith('--'));

const referencesAsset = CANONICAL_BRAND_ASSETS.find((a) => a.slug === 'references-anti-references');
if (!referencesAsset) throw new Error('references-anti-references ontbreekt in CANONICAL_BRAND_ASSETS');
const REFERENCES_ASSET: NonNullable<typeof referencesAsset> = referencesAsset;

interface Pillar {
  pillar: string;
  statements: string[];
}

async function derivePillars(corpus: string, brandName: string): Promise<Pillar[]> {
  const result = await anthropicClient.createChatCompletion(
    [
      {
        role: 'system',
        content:
          'You derive message pillars from stored brand-voice material. ' +
          'Message pillars = the 3-6 recurring themes the material keeps returning to: one short pillar name each ' +
          '(one word or short phrase), with 1-2 key statements per pillar taken from or closely paraphrasing the material. ' +
          'Only derive what the material supports — never invent from category conventions. If the material is too thin, return []. ' +
          'Respond with ONLY a JSON array: [{"pillar": string, "statements": string[]}]',
      },
      { role: 'user', content: `Brand: ${brandName}\n\nVoice material:\n${corpus.slice(0, 10_000)}` },
    ],
    { maxTokens: 1200, temperature: 0.2 },
  );
  const raw = result.content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(
      (e): e is { pillar: string; statements?: unknown } =>
        !!e && typeof e === 'object' && typeof (e as Record<string, unknown>).pillar === 'string',
    )
    .map((e) => ({
      pillar: e.pillar.trim(),
      statements: Array.isArray(e.statements)
        ? e.statements.filter((s): s is string => typeof s === 'string').slice(0, 2)
        : [],
    }))
    .filter((e) => e.pillar.length > 0)
    .slice(0, 6);
}

async function main() {
  // Fail-fast: zonder API-key faalt elke pijler-afleiding stilletjes per
  // workspace — dat las in de eerste run als succes (gotcha 2026-08-15).
  if (apply && !process.env.ANTHROPIC_API_KEY) {
    console.error(
      '✗ ANTHROPIC_API_KEY ontbreekt — nodig voor de pijler-afleiding.\n' +
        '  Zet hem in .env.local (wordt automatisch geladen) of exporteer hem in deze shell.',
    );
    process.exit(2);
  }

  const workspaces = await prisma.workspace.findMany({
    where: nameFilter ? { name: { contains: nameFilter, mode: 'insensitive' } } : {},
    select: { id: true, name: true },
    orderBy: { createdAt: 'asc' },
  });
  console.log(`${workspaces.length} workspace(s)${nameFilter ? ` (filter: "${nameFilter}")` : ''} — ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

  for (const ws of workspaces) {
    const notes: string[] = [];

    // 1. References-asset
    const hasReferences = await prisma.brandAsset.findFirst({
      where: { workspaceId: ws.id, slug: REFERENCES_ASSET.slug },
      select: { id: true },
    });
    if (!hasReferences) {
      notes.push('references-asset aanmaken');
      if (apply) {
        await prisma.brandAsset.create({
          data: {
            name: REFERENCES_ASSET.name,
            slug: REFERENCES_ASSET.slug,
            description: REFERENCES_ASSET.description,
            category: REFERENCES_ASSET.category,
            status: 'DRAFT',
            frameworkType: REFERENCES_ASSET.frameworkType,
            workspaceId: ws.id,
            researchMethods: {
              create: ACTIVE_RESEARCH_METHOD_TYPES.map((method) => ({ method })),
            },
          },
        });
      }
    }

    // 2. messagePillars
    const vg = await prisma.brandVoiceguide.findUnique({
      where: { workspaceId: ws.id },
      select: {
        id: true,
        messagePillars: true,
        voiceDescription: true,
        voiceSample: true,
        writingSamples: true,
        contentGuidelines: true,
      },
    });
    if (vg && vg.messagePillars === null) {
      const samples = Array.isArray(vg.writingSamples)
        ? (vg.writingSamples as unknown[]).filter((s): s is string => typeof s === 'string')
        : [];
      const corpus = [vg.voiceDescription, vg.voiceSample, ...samples, ...vg.contentGuidelines]
        .filter(Boolean)
        .join('\n\n');
      if (corpus.length >= 200) {
        if (apply) {
          try {
            const pillars = await derivePillars(corpus, ws.name);
            if (pillars.length > 0) {
              await prisma.brandVoiceguide.update({
                where: { id: vg.id },
                data: { messagePillars: pillars as unknown as import('@prisma/client').Prisma.InputJsonValue },
              });
              notes.push(`messagePillars afgeleid (${pillars.length})`);
            } else {
              notes.push('messagePillars: corpus te dun voor pijlers (AI gaf [])');
            }
          } catch (err) {
            notes.push(`messagePillars FAILED: ${err instanceof Error ? err.message : String(err)}`);
          }
        } else {
          notes.push(`messagePillars afleiden (corpus ${corpus.length} chars)`);
        }
      } else {
        notes.push('messagePillars: geen/te dun voice-corpus — overslaan');
      }
    }

    // 3. Art Direction-dekking rapporteren
    const sg = await prisma.brandStyleguide.findFirst({
      where: { workspaceId: ws.id },
      select: { designPhilosophy: true, photographyStyle: true },
    });
    if (sg && !sg.designPhilosophy && !sg.photographyStyle) {
      notes.push('art direction: styleguide mist designPhilosophy én photographyStyle → re-analyse nodig (rescrape-brand)');
    }

    if (notes.length > 0) {
      console.log(`• ${ws.name}\n    ${notes.join('\n    ')}`);
    }
  }

  console.log(`\nKlaar (${apply ? 'wijzigingen doorgevoerd' : 'dry-run — niets gewijzigd'}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
