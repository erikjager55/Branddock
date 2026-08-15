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
  { tokens: boolean; voice: boolean; imagery: boolean; visualRules: boolean }
> = {
  copy: { tokens: false, voice: true, imagery: false, visualRules: false },
  web: { tokens: true, voice: false, imagery: false, visualRules: true },
  image: { tokens: true, voice: false, imagery: true, visualRules: true },
  video: { tokens: true, voice: false, imagery: true, visualRules: true },
  audio: { tokens: false, voice: true, imagery: false, visualRules: false },
  social: { tokens: true, voice: true, imagery: true, visualRules: true },
  email: { tokens: true, voice: true, imagery: false, visualRules: true },
};

/**
 * Projecteer het volledige manifest naar een channel-view. Quick facts,
 * substituties en known gaps reizen altijd mee (de governance-kern);
 * tokens/voice/imagery per kanaal.
 *
 * Regels reizen mee, met één uitzondering: een regel die expliciet als
 * `modality: 'visual'` is gemarkeerd hoort niet in een pure tekst-view
 * (copy, audio) — daar kan hij niet nageleefd én niet gehandhaafd worden, en
 * kost hij alleen promptruimte. Regels zonder modaliteit blijven altijd
 * staan: onbekend is geen reden om een merkregel te verzwijgen.
 */
export function projectManifest(
  manifest: BrandManifest,
  view: BrandLibraryView,
): BrandManifest {
  if (view === 'full') return manifest;
  const sections = VIEW_SECTIONS[view];
  return {
    ...manifest,
    hardRules: sections.visualRules
      ? manifest.hardRules
      : manifest.hardRules.filter((r) => r.modality !== 'visual'),
    tokens: sections.tokens ? manifest.tokens : undefined,
    voiceBaseline: sections.voice ? manifest.voiceBaseline : undefined,
    imagery: sections.imagery ? manifest.imagery : undefined,
  };
}
