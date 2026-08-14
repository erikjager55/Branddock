// =============================================================
// Brand Library — channel-view projecties (W7.2)
//
// Pure module (geen IO/Prisma) zodat evals en andere pure consumers
// de projectie kunnen gebruiken zonder database-afhankelijkheid.
// Views zijn projecties van hetzelfde manifest: een nieuw kanaal is
// een nieuwe view-definitie, geen nieuwe DB-velden of ad-hoc reads.
// =============================================================

import type { BrandManifest } from '@/lib/brandstyle/manifest-builder';

/** Consumptiedoel — bepaalt welke doorsnede van het manifest geleverd wordt. */
export type BrandLibraryView =
  | 'full'
  | 'copy'
  | 'web'
  | 'image'
  | 'video'
  | 'audio'
  | 'social'
  | 'email';

const VIEW_SECTIONS: Record<
  Exclude<BrandLibraryView, 'full'>,
  { tokens: boolean; voice: boolean; imagery: boolean }
> = {
  copy: { tokens: false, voice: true, imagery: false },
  web: { tokens: true, voice: false, imagery: false },
  image: { tokens: true, voice: false, imagery: true },
  video: { tokens: true, voice: false, imagery: true },
  audio: { tokens: false, voice: true, imagery: false },
  social: { tokens: true, voice: true, imagery: true },
  email: { tokens: true, voice: true, imagery: false },
};

/**
 * Projecteer het volledige manifest naar een channel-view. Quick facts,
 * regels, substituties en known gaps reizen altijd mee (de governance-
 * kern); tokens/voice/imagery per kanaal.
 */
export function projectManifest(
  manifest: BrandManifest,
  view: BrandLibraryView,
): BrandManifest {
  if (view === 'full') return manifest;
  const sections = VIEW_SECTIONS[view];
  return {
    ...manifest,
    tokens: sections.tokens ? manifest.tokens : undefined,
    voiceBaseline: sections.voice ? manifest.voiceBaseline : undefined,
    imagery: sections.imagery ? manifest.imagery : undefined,
  };
}
