// =============================================================
// F41 (audit 2026-05-13): DAM auto-tagging via Claude Vision
// =============================================================
// Bij MediaAsset-creation (upload, AI-gen, stock-import) analyseert
// Claude Sonnet Vision de image en extraheert:
//  - description: korte natural-language beschrijving
//  - aiTags: keywords (objecten, scènes, sfeer)
//  - styleTags: photography / illustration / diagram / etc
//  - authenticity: AI_GENERATED | PHOTO_REAL | STOCK | HYBRID
//  - dominantColors: hex-list (vision gokt prominent colors)
//
// Output wordt async geschreven naar bestaande MediaAsset fields
// (aiDescription, aiTags, dominantColors). Niet-blocking — failures
// loggen + continue (asset blijft zonder tags).
// =============================================================

import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';

interface DamAnalysisResult {
  description: string;
  contentTags: string[];
  styleTags: string[];
  authenticity: 'AI_GENERATED' | 'PHOTO_REAL' | 'STOCK' | 'HYBRID' | 'UNKNOWN';
  dominantColors: string[];
}

const DAM_SYSTEM_PROMPT = `Je bent een Digital Asset Management (DAM) analyzer. Je krijgt 1 image en moet structured metadata extraheren voor library-search en cross-content reuse.

Output JSON met deze velden:
- description: 1-2 zinnen, neutraal beschrijvend (wie/wat/waar)
- contentTags: 5-10 keywords — objecten, personen-rollen, locaties, activities, mood
- styleTags: 2-5 keywords — visuele stijl (photography, illustration, diagram, vector, hand-drawn, 3D-render, sketch, etc)
- authenticity: één van AI_GENERATED | PHOTO_REAL | STOCK | HYBRID | UNKNOWN — op basis van visuele signalen (AI-tells, perfect composition, etc)
- dominantColors: 3-5 hex-values van de meest prominente kleuren

Wees kort en precies. Geen subjectieve oordelen. Output ONLY JSON.`;

/**
 * Anthropic's url-source eist publiek bereikbare HTTPS — lokale `/uploads`-
 * paden (dev disk-storage) gaan daarom als base64 via disk-read, zelfde
 * patroon als visual-fidelity-scorer/judges (gotcha localhost 2026-06-10).
 */
async function toImageSource(
  fileUrl: string,
): Promise<
  | { type: 'url'; url: string }
  | { type: 'base64'; media_type: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string }
  | null
> {
  if (/^https:\/\//i.test(fileUrl)) return { type: 'url', url: fileUrl };
  if (fileUrl.startsWith('/')) {
    const { readFile } = await import('fs/promises');
    const { resolve } = await import('path');
    const buf = await readFile(resolve(process.cwd(), 'public' + fileUrl));
    const ext = fileUrl.split('?')[0].split('.').pop()?.toLowerCase();
    const media_type =
      ext === 'png' ? ('image/png' as const)
      : ext === 'webp' ? ('image/webp' as const)
      : ext === 'gif' ? ('image/gif' as const)
      : ('image/jpeg' as const);
    return { type: 'base64', media_type, data: buf.toString('base64') };
  }
  console.warn(`[dam-auto-tagger] niet-ondersteund file-url-schema, skip: ${fileUrl.slice(0, 60)}`);
  return null;
}

export async function analyzeMediaAssetForDam(
  fileUrl: string,
): Promise<DamAnalysisResult | null> {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('[dam-auto-tagger] ANTHROPIC_API_KEY missing — skip analysis');
    return null;
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const imageSource = await toImageSource(fileUrl);
    if (!imageSource) return null;
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      temperature: 0.2,
      system: DAM_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: imageSource,
            },
            {
              type: 'text',
              text: 'Analyseer deze image en geef DAM-metadata in JSON-formaat.',
            },
          ],
        },
      ],
    });

    const textBlock = res.content.find((b) => b.type === 'text');
    const text = textBlock && 'text' in textBlock ? textBlock.text : '';
    const match = text.match(/\{[\s\S]+\}/);
    if (!match) {
      console.warn('[dam-auto-tagger] no JSON in response');
      return null;
    }
    const parsed = JSON.parse(match[0]) as Partial<DamAnalysisResult>;

    return {
      description: typeof parsed.description === 'string' ? parsed.description : '',
      contentTags: Array.isArray(parsed.contentTags)
        ? parsed.contentTags.filter((t): t is string => typeof t === 'string').slice(0, 15)
        : [],
      styleTags: Array.isArray(parsed.styleTags)
        ? parsed.styleTags.filter((t): t is string => typeof t === 'string').slice(0, 10)
        : [],
      authenticity:
        parsed.authenticity === 'AI_GENERATED' ||
        parsed.authenticity === 'PHOTO_REAL' ||
        parsed.authenticity === 'STOCK' ||
        parsed.authenticity === 'HYBRID'
          ? parsed.authenticity
          : 'UNKNOWN',
      dominantColors: Array.isArray(parsed.dominantColors)
        ? parsed.dominantColors
            .filter((c): c is string => typeof c === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(c))
            .slice(0, 8)
        : [],
    };
  } catch (err) {
    console.warn(
      '[dam-auto-tagger] vision call failed:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Run DAM analysis voor een MediaAsset en update de DB-record met
 * aiDescription + aiTags + dominantColors. Fire-and-forget — caller
 * await't niet noodzakelijk. authenticity + styleTags worden in aiTags
 * geprefixt zodat ze searchable zijn zonder schema-uitbreiding.
 */
export async function tagMediaAssetIfPossible(mediaAssetId: string): Promise<void> {
  try {
    const asset = await prisma.mediaAsset.findUnique({
      where: { id: mediaAssetId },
      select: { id: true, fileUrl: true, mediaType: true, aiTags: true, workspaceId: true },
    });
    if (!asset || asset.mediaType !== 'IMAGE') return;
    // Skip wanneer al getagged (idempotent)
    if (asset.aiTags && asset.aiTags.length > 0) return;

    const analysis = await analyzeMediaAssetForDam(asset.fileUrl);
    if (!analysis) return;

    // Combineer contentTags + styleTags + authenticity-prefix als aiTags.
    // Prefix-pattern (`style:photography`, `auth:AI_GENERATED`) maakt
    // filtering downstream eenvoudiger zonder schema-uitbreiding.
    const aiTags = [
      ...analysis.contentTags,
      ...analysis.styleTags.map((s) => `style:${s}`),
      `auth:${analysis.authenticity}`,
    ];

    await prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        aiDescription: analysis.description,
        aiTags,
        dominantColors: analysis.dominantColors.length > 0
          ? analysis.dominantColors
          : undefined,
      },
    });

    // Pattern G2 image-quality-chain — genereer semantic-search embedding
    // van aiDescription voor reuse-detection in Canvas Step 2. Fire-and-
    // forget; failures spoilen tagging-flow niet (embedding is verrijking).
    void import('@/lib/media/embedding-search').then(({ generateAndStoreMediaAssetEmbedding }) => {
      void generateAndStoreMediaAssetEmbedding(mediaAssetId, asset.workspaceId).catch((err) => {
        console.warn(
          '[dam-auto-tagger] embedding generation failed:',
          err instanceof Error ? err.message : err,
        );
      });
    });
  } catch (err) {
    console.warn(
      '[dam-auto-tagger] tagMediaAssetIfPossible failed:',
      err instanceof Error ? err.message : err,
    );
  }
}
