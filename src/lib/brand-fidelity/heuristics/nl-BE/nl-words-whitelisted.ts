// nl-BE NL-words whitelisted — Δ-2 sub-cluster B-3
//
// 16 woorden die in nl-NL als gewoon-nederlands gelden maar in nl-BE een
// formeel-correcte BE-Nederlandse betekenis hebben. Heuristiek-pakket
// nl-BE filtert deze uit het inherited nl-NL pakket zodat ze géén false-
// positive flag triggeren in BE-content. Per ADR-3 bron-research 2026-05-08.

export const NL_BE_WHITELIST_FROM_NL_NL: ReadonlySet<string> = new Set([
  'job',
  'onthaal',
  'verlof',
  'dossier',
  'kinesist',
  'hospitalisatie',
  'werf',
  'zetel',
  'schepen',
  'immo',
  'camion',
  'fusioneren',
  'syndicaat',
  'technieker',
  'domiciliëring',
  'kader',
]);
