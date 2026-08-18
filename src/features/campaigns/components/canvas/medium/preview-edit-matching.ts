/**
 * Pure matching-helpers voor inline tekst-edit in de webpage-preview (A3,
 * verbeterplan 2026-08-07 §5 Fase B). Vertaalt een klik in de gerenderde
 * preview (sectie-id + textContent van het geklikte element) naar het exacte
 * veld-pad in de puckData-tree, via de bestaande
 * `collectEditableTextFields`-whitelist (puck-text-fields.ts).
 *
 * Bewust hook- en DOM-vrij zodat de smoke-suite (phase48) dit puur kan
 * testen; `PreviewEditingLayer` levert de DOM-kant aan (welke occurrence
 * van identieke teksten binnen één sectie is aangeklikt).
 */
import { collectEditableTextFields } from '@/lib/landing-pages/puck-text-fields';
import { sectionContentIndex } from '@/lib/landing-pages/section-edit-tools';

/** Resultaat van een geslaagde match: pad + huidige waarde uit de tree. */
export interface EditableTextMatch {
  /** Bracket-notatie pad, bv. `content[2].props.headline` — deepSet-compatibel. */
  path: string;
  /** Huidige (ongetrimde) waarde in de tree — basis voor cancel/restore. */
  value: string;
}

/** Minimale tree-shape — zelfde losse vorm als PageRender/section-edit-tools. */
interface TreeLike {
  content?: Array<{ type?: string; props?: Record<string, unknown> } | null>;
}

/**
 * Re-export: de id-resolutie woont in de kernel (`section-edit-tools`), zodat
 * de preview-laag en de edit-operaties per constructie dezelfde sectie
 * aanwijzen. Stond hier eerder als eigen kopie — dat was precies de tweede
 * waarheid die de kernel-module wil voorkomen.
 */
export { sectionContentIndex };

/**
 * Match de geklikte tekst op de bewerkbare tekstvelden van één sectie.
 *
 * Regels (A3): kandidaten zijn de `collectEditableTextFields`-entries van
 * precies deze sectie waarvan de getrimde waarde exact gelijk is aan de
 * getrimde kliktekst. Bij meerdere identieke waarden binnen de sectie kiest
 * `occurrence` (0-based, DOM-volgorde — aangeleverd door de caller); valt de
 * occurrence buiten de kandidatenlijst dan is de klik ambigu en volgt géén
 * match (do nothing, nooit gokken).
 */
export function findEditableTextPath(
  tree: unknown,
  sectionId: string,
  clickedText: string,
  occurrence = 0,
): EditableTextMatch | null {
  const idx = sectionContentIndex(tree, sectionId);
  if (idx < 0) return null;
  const needle = clickedText.trim();
  if (needle.length === 0) return null;
  const prefix = `content[${idx}].props.`;
  const candidates = collectEditableTextFields(tree).filter(
    (field) => field.path.startsWith(prefix) && field.value.trim() === needle,
  );
  if (occurrence < 0 || occurrence >= candidates.length) return null;
  return { path: candidates[occurrence].path, value: candidates[occurrence].value };
}
