// Shared types voor BrandReviewFinding-render in alle Δ-1 surfaces
// (Tab 3 Content Review, Brand Assistant chat-card, PublishGate
// findings-block). Single source-of-truth zodat een uitbreiding
// op het Prisma schema (nieuwe severity-waarde, nieuwe category)
// hier één keer landt en alle hooks gelijk meegaan.
//
// String-unions ipv direct uit `@prisma/client` enum-import zodat
// client-bundles niet de Prisma-runtime artefacten hoeven te
// laden voor wat eigenlijk plain-string-data is.

export type ReviewSeverity = 'HIGH' | 'MEDIUM' | 'LOW';

export type ReviewCategory =
  | 'VOICE'
  | 'TERMINOLOGY'
  | 'CLAIMS'
  | 'STYLE'
  | 'BUSINESS'
  | 'AI_TELL';

export interface ReviewFinding {
  id: string;
  location: string;
  severity: ReviewSeverity;
  category: ReviewCategory;
  description: string;
  suggestion: string | null;
  beforeText: string | null;
  afterText: string | null;
}
