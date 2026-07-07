/**
 * Merk-DNA model-registry — single source of truth voor de brand-DNA-migratie
 * (lokaal → productie). Zie `scripts/migrate-brand-dna/README.md`.
 *
 * Volgorde = insert-volgorde: parents vóór children, zodat foreign keys
 * (die naar mee-gemigreerde rijen wijzen met behouden IDs) altijd resolven.
 * De wipe-stap in `import.ts` loopt deze lijst in omgekeerde volgorde.
 *
 * Grondwaarheid van scope-veld/parent-FK is geverifieerd tegen
 * information_schema (2026-07-07), niet geraden.
 */

/** Hoe rijen voor één workspace geselecteerd worden. */
export type BrandDnaScope =
  | { kind: 'workspace' }
  | { kind: 'parent'; parentAccessor: string; foreignKey: string };

export interface BrandDnaModel {
  /** Prisma-client accessor (camelCase), bv. 'brandAsset'. */
  accessor: string;
  /** Fysieke tabelnaam voor raw SQL (PascalCase of @@map-naam). */
  table: string;
  /** Leesbare label voor logging. */
  label: string;
  scope: BrandDnaScope;
  /** 1:1-met-workspace singleton (alleen voor logging). */
  singleton?: boolean;
  /** pgvector-kolommen: ge-exporteerd via ::text, hersteld via ::vector. */
  vectorColumns?: string[];
  /**
   * Scalar velden met een GLOBALE `@unique` (niet workspace-scoped). De waarde
   * reist 1-op-1 mee en kan op een gedeelde prod-DB botsen met een andere
   * workspace → bij collision wordt de waarde gesuffixt i.p.v. de hele
   * transactie te laten terugrollen.
   */
  globallyUniqueFields?: string[];
}

/**
 * Scalar velden die naar `User` verwijzen. De lokale maker bestaat niet op
 * productie → bij import geremapt naar de doel-workspace-owner (of blijft null).
 */
export const USER_REF_FIELDS = [
  'createdById',
  'lockedById',
  'changedById',
  'uploadedById',
] as const;

/** De merk-DNA-set in insert-volgorde. */
export const BRAND_DNA_MODELS: BrandDnaModel[] = [
  // Brand assets
  { accessor: 'brandAsset', table: 'BrandAsset', label: 'Brand assets', scope: { kind: 'workspace' } },
  { accessor: 'brandAssetVersion', table: 'BrandAssetVersion', label: 'Brand-asset versies', scope: { kind: 'parent', parentAccessor: 'brandAsset', foreignKey: 'brandAssetId' } },
  // Parent-scoped: workspaceId is nullable (niet-gebackfilde rijen), dus selecteer
  // via de parent zodat niets stil wordt gedropt; workspaceId wordt bij import
  // alsnog geremapt op aanwezigheid.
  { accessor: 'brandAssetResearchMethod', table: 'BrandAssetResearchMethod', label: 'Brand-asset research-methods', scope: { kind: 'parent', parentAccessor: 'brandAsset', foreignKey: 'brandAssetId' } },

  // Brand (1:1) + locale-overlays
  { accessor: 'brand', table: 'Brand', label: 'Brand', scope: { kind: 'workspace' }, singleton: true },
  { accessor: 'brandLocaleProfile', table: 'BrandLocaleProfile', label: 'Brand-locale-profielen', scope: { kind: 'workspace' } },

  // Voice (1:1) — bevat pgvector-centroid
  { accessor: 'brandVoiceguide', table: 'BrandVoiceguide', label: 'Brand voiceguide', scope: { kind: 'workspace' }, singleton: true, vectorColumns: ['centroidEmbedding'] },
  { accessor: 'brandVoice', table: 'BrandVoice', label: 'Brand voices', scope: { kind: 'workspace' } },

  // Style (1:1) + children
  { accessor: 'brandStyleguide', table: 'BrandStyleguide', label: 'Brand styleguide', scope: { kind: 'workspace' }, singleton: true },
  { accessor: 'styleguideColor', table: 'StyleguideColor', label: 'Styleguide kleuren', scope: { kind: 'parent', parentAccessor: 'brandStyleguide', foreignKey: 'styleguideId' } },
  { accessor: 'styleguideFont', table: 'StyleguideFont', label: 'Styleguide fonts', scope: { kind: 'workspace' } },
  { accessor: 'styleguideLogo', table: 'StyleguideLogo', label: 'Styleguide logos', scope: { kind: 'workspace' } },
  { accessor: 'styleguideComponent', table: 'StyleguideComponent', label: 'Styleguide componenten', scope: { kind: 'workspace' } },

  // Fidelity (1:1) + rules + thresholds
  { accessor: 'fidelityConfig', table: 'FidelityConfig', label: 'Fidelity config (STRICT)', scope: { kind: 'workspace' }, singleton: true },
  { accessor: 'brandRule', table: 'BrandRule', label: 'Brand rules', scope: { kind: 'workspace' } },
  { accessor: 'workspaceContentTypeThreshold', table: 'WorkspaceContentTypeThreshold', label: 'Content-type thresholds', scope: { kind: 'workspace' } },

  // Personas
  { accessor: 'persona', table: 'Persona', label: 'Personas', scope: { kind: 'workspace' } },
  { accessor: 'personaResearchMethod', table: 'PersonaResearchMethod', label: 'Persona research-methods', scope: { kind: 'parent', parentAccessor: 'persona', foreignKey: 'personaId' } },

  // Producten. Product.slug is GLOBAAL @unique → collision-resolver bij import.
  { accessor: 'product', table: 'Product', label: 'Producten', scope: { kind: 'workspace' }, globallyUniqueFields: ['slug'] },
  { accessor: 'productImage', table: 'ProductImage', label: 'Product-beelden', scope: { kind: 'parent', parentAccessor: 'product', foreignKey: 'productId' } },
  { accessor: 'productPersona', table: 'ProductPersona', label: 'Product↔persona-links', scope: { kind: 'parent', parentAccessor: 'product', foreignKey: 'productId' } },

  // Strategie
  { accessor: 'businessStrategy', table: 'BusinessStrategy', label: 'Business strategy', scope: { kind: 'workspace' } },
  { accessor: 'focusArea', table: 'FocusArea', label: 'Focus areas', scope: { kind: 'parent', parentAccessor: 'businessStrategy', foreignKey: 'strategyId' } },
  { accessor: 'objective', table: 'Objective', label: 'Objectives', scope: { kind: 'parent', parentAccessor: 'businessStrategy', foreignKey: 'strategyId' } },
  { accessor: 'keyResult', table: 'KeyResult', label: 'Key results', scope: { kind: 'parent', parentAccessor: 'objective', foreignKey: 'objectiveId' } },
  { accessor: 'milestone', table: 'Milestone', label: 'Milestones', scope: { kind: 'parent', parentAccessor: 'businessStrategy', foreignKey: 'strategyId' } },
  { accessor: 'progressSnapshot', table: 'ProgressSnapshot', label: 'Progress snapshots', scope: { kind: 'parent', parentAccessor: 'businessStrategy', foreignKey: 'strategyId' } },

  // Merkcontext-extra (concurrenten + trends horen bij het merk-DNA per CLAUDE.md);
  // historie/snapshots/vectors bewust uitgesloten.
  { accessor: 'competitor', table: 'Competitor', label: 'Concurrenten', scope: { kind: 'workspace' } },
  { accessor: 'competitorProduct', table: 'CompetitorProduct', label: 'Concurrent-producten', scope: { kind: 'parent', parentAccessor: 'competitor', foreignKey: 'competitorId' } },
  { accessor: 'trend', table: 'Trend', label: 'Trends', scope: { kind: 'workspace' } },

  // AI-config (per-feature model-keuze; meerdere rijen per workspace)
  { accessor: 'workspaceAiConfig', table: 'workspace_ai_config', label: 'Workspace AI-config', scope: { kind: 'workspace' } },
];

/** Minimale, dynamisch-toegankelijke Prisma-delegate (vermijdt `any`). */
export interface PrismaDelegate {
  findMany(args?: { where?: Record<string, unknown> }): Promise<Record<string, unknown>[]>;
  findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  deleteMany(args: { where: Record<string, unknown> }): Promise<{ count: number }>;
  count(args?: { where?: Record<string, unknown> }): Promise<number>;
}

/** Resolve een Prisma-delegate op accessor-naam (werkt op client én tx-client). */
export function delegateFor(client: unknown, accessor: string): PrismaDelegate {
  const delegate = (client as Record<string, PrismaDelegate>)[accessor];
  if (!delegate) throw new Error(`Onbekende Prisma-accessor: ${accessor}`);
  return delegate;
}
