// =============================================================
// User-friendly labels + descriptions voor de 5 AI-judge visual dimensions.
// Gedeelde util tussen `VisualFidelityDetail` (full panel), `VisualFidelityBadge`
// (compact) en eventuele toekomstige UIs (e.g. Brand Alignment Insights tab).
//
// Mapping zit hier zodat er één canonical bron is voor:
//   - User-facing label (NL/EN-neutraal, kort)
//   - 1-zin uitleg (tooltip)
//   - Icon-keuze (voor compact UI)
//
// Houdt visual-ai-judge.ts dimension-keys + UI in sync; bij toevoeging van
// een nieuwe dimensie (bv. `subjectIdentity` in Pattern D) wordt deze tabel
// uitgebreid — typescript dwingt completeness via Record<key, T>.
// =============================================================

import type { VisualDimensionKey } from "./visual-ai-judge";

export interface DimensionLabel {
  /** Korte titel voor in de UI (≤24 chars). */
  label: string;
  /** Eén-zin uitleg voor tooltip / "wat meet dit?". */
  description: string;
}

export const VISUAL_DIMENSION_LABELS: Record<VisualDimensionKey, DimensionLabel> = {
  "style-coherence": {
    label: "Brand-stijl coherentie",
    description:
      "Hoe goed de visuele stijl van de afbeelding matcht met de brand styleguide (kleuren, typografie, design language).",
  },
  "mood-fit": {
    label: "Mood-fit",
    description:
      "Of de sfeer van het beeld past bij de personality + tone-of-voice van het merk (warm vs zakelijk, speels vs ingetogen, etc.).",
  },
  composition: {
    label: "Compositie",
    description:
      "Beeldopbouw: focus, balans, whitespace, rule-of-thirds, hiërarchie van elementen.",
  },
  "text-in-image": {
    label: "Tekst-accuratesse",
    description:
      "Of hallucinated tekst in het beeld (captions, signage, logo-letters) correct gespeld is — of überhaupt aanwezig moet zijn.",
  },
  "logo-fidelity": {
    label: "Logo-getrouwheid",
    description:
      "Bij beelden met merk-elementen: hoe getrouw het logo wordt weergegeven of dat het niet door competitor-logos wordt vervangen.",
  },
  "subject-identity": {
    label: "Subject-identiteit",
    description:
      "Voor compose-flow + consistent-model output: blijft het subject (persoon, product, scene) herkenbaar uit de source-images? Voor pure text-to-image zonder source default 100.",
  },
};

/**
 * Pattern G4: copy-image coherence-dimensie. Wordt geproduceerd door een
 * aparte judge (Claude Haiku met text+image) ipv visual-ai-judge, maar
 * gerendert in UI naast de 6 visual-dimensies via dezelfde getDimensionLabel
 * lookup. Daarom apart geregistreerd buiten VISUAL_DIMENSION_LABELS Record
 * (welke is type-gated op VisualDimensionKey).
 */
const EXTENDED_DIMENSION_LABELS: Record<string, DimensionLabel> = {
  "copy-image-coherence": {
    label: "Copy-image samenhang",
    description:
      "Visualiseert het beeld daadwerkelijk de tekst-boodschap van dezelfde variant (subject-match, audience-match, message-reinforcement)? Aparte AI-judge (Haiku) die text + image samen beoordeelt.",
  },
};

/**
 * Lookup met fallback — wanneer een toekomstige dimensie aan visual-ai-judge
 * wordt toegevoegd vóór deze tabel bijgewerkt wordt, krijgt de UI nog steeds
 * een nette title-cased fallback (geen "undefined" of crash).
 *
 * Resolution-volgorde: VISUAL_DIMENSION_LABELS (6 visual) → EXTENDED_DIMENSION_LABELS
 * (G4 coherence + toekomstige uitbreidingen) → title-case fallback.
 */
export function getDimensionLabel(key: string): DimensionLabel {
  const entry =
    VISUAL_DIMENSION_LABELS[key as VisualDimensionKey] ??
    EXTENDED_DIMENSION_LABELS[key];
  if (entry) return entry;
  return {
    label: key
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" "),
    description: "AI-judge dimensie zonder canonical mapping.",
  };
}
