import { prisma } from "@/lib/prisma";
import type {
  AlignmentModule,
  FixOptionsResponse,
  FixOption,
  FixOptionChange,
} from "@/types/brand-alignment";
import { fetchEntityById } from "./data-fetcher";
import { getBrandContext, invalidateBrandContext } from "@/lib/ai/brand-context";
import { formatBrandContext } from "@/lib/ai/prompt-templates";
import {
  buildFixGenerationPrompt,
  type FixGenerationResult,
} from "@/lib/ai/prompts/brand-alignment";
import { createClaudeStructuredCompletion } from "@/lib/ai/exploration/ai-caller";
import { createVersion } from "@/lib/versioning";
import { invalidateCache, getCached, setCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// 60-min TTL on cached fix-options. Long enough for the typical review →
// apply pattern (user opens an issue, reviews the 3 options, clicks Apply
// minutes later), short enough that stale entity-state from a parallel
// edit gets re-evaluated on the next preview.
const FIX_OPTIONS_CACHE_TTL_MS = 60 * 60 * 1000;
const fixOptionsCacheKey = (issueId: string) => `fix-options:${issueId}`;
import type { VersionedResourceType } from "@prisma/client";

// =============================================================
// AI-powered fix generator with DB write-back
// =============================================================

// Maps entity type strings to Prisma model names
const MODEL_MAP: Record<string, string> = {
  Persona: "persona",
  Product: "product",
  BrandAsset: "brandAsset",
  BusinessStrategy: "businessStrategy",
  Brandstyle: "brandStyleguide",
  DetectedTrend: "detectedTrend",
};

// Maps entity types to VersionedResourceType enum values
const VERSION_TYPE_MAP: Record<string, VersionedResourceType> = {
  Persona: "PERSONA",
  Product: "PRODUCT",
  BrandAsset: "BRAND_ASSET",
  BusinessStrategy: "STRATEGY",
  Brandstyle: "STYLEGUIDE",
};

/**
 * Generate 3 AI-powered fix options (A/B/C) for a given alignment issue.
 */
export async function generateFixOptions(
  issueId: string,
  workspaceId: string,
  cacheOpts: { bypassCache?: boolean } = {},
): Promise<FixOptionsResponse> {
  // Cache hit short-circuits the AI call. The previously-generated options
  // are what the user saw in the preview, so applyFixOption needs to
  // resolve to the same array to avoid temp 0.3 drift between preview and
  // commit. bypassCache is reserved for explicit regenerate-now requests.
  if (!cacheOpts.bypassCache) {
    const cached = getCached<FixOptionsResponse>(fixOptionsCacheKey(issueId));
    if (cached) return cached;
  }

  const issue = await prisma.alignmentIssue.findFirst({
    where: { id: issueId, workspaceId },
  });

  if (!issue) {
    throw new Error("Issue not found");
  }

  // Fetch source and target entity data
  const [sourceData, targetData, brandContextBlock] = await Promise.all([
    fetchEntityById(issue.sourceItemType, issue.sourceItemId),
    fetchEntityById(issue.targetItemType, issue.targetItemId),
    getBrandContext(workspaceId),
  ]);
  const brandContextStr = formatBrandContext(brandContextBlock);

  // Build prompt and call Claude
  const [systemPrompt, userPrompt] = buildFixGenerationPrompt(
    {
      title: issue.title,
      description: issue.description,
      conflictsWith: issue.conflictsWith,
      sourceItemType: issue.sourceItemType,
      targetItemType: issue.targetItemType,
    },
    sourceData,
    targetData,
    brandContextStr
  );

  const result = await createClaudeStructuredCompletion<FixGenerationResult>(
    systemPrompt,
    userPrompt,
    { maxTokens: 4000, temperature: 0.3, timeoutMs: 60_000 },
    {
      workspaceId,
      parentEntityType: 'AlignmentIssue',
      parentEntityId: issueId,
      brandContext: brandContextBlock,
      sourceIdentifier: 'src/lib/alignment/fix-generator.ts:generateFixOptions',
    },
  );

  // Determine labels from issue data
  const sourceLabel = issue.modulePath || "Source module";
  const targetLabel =
    issue.conflictsWith.length > 0 ? issue.conflictsWith[0] : "Target module";

  // Map AI response to FixOptionsResponse
  const options: FixOption[] = (result.options ?? []).slice(0, 3).map((opt) => ({
    key: opt.key as "A" | "B" | "C",
    title: opt.title,
    description: opt.description,
    preview: opt.preview ?? null,
    affectedModule: validateModule(opt.affectedModule),
    changes: (opt.changes ?? []).map((c) => ({
      entityType: c.entityType,
      entityId: c.entityId,
      field: c.field,
      currentValue: c.currentValue,
      newValue: c.newValue,
    })),
  }));

  // Ensure we always have exactly 3 options
  while (options.length < 3) {
    const key = (["A", "B", "C"] as const)[options.length];
    options.push({
      key,
      title:
        key === "C"
          ? "Acknowledge & Document"
          : `Adjust ${key === "A" ? sourceLabel : targetLabel}`,
      description:
        key === "C"
          ? "Keep both as-is but document the intentional divergence."
          : `Modify the ${key === "A" ? "source" : "target"} to resolve the alignment issue.`,
      preview: null,
      affectedModule: getModuleFromType(issue.sourceItemType),
      changes: [],
    });
  }

  const response: FixOptionsResponse = {
    issueId: issue.id,
    issueSummary: issue.description,
    currentContent: {
      source: {
        label: sourceLabel,
        content: sourceData
          ? summarizeEntity(sourceData)
          : `Content in ${issue.sourceItemType ?? "source"} module`,
      },
      target: {
        label: targetLabel,
        content: targetData
          ? summarizeEntity(targetData)
          : `Content in ${issue.targetItemType ?? "target"} module`,
      },
    },
    options,
  };

  // Persist for subsequent applyFixOption calls — same array, no temp 0.3
  // drift between preview and commit. Cache is shared globally
  // (lib/api/cache uses globalThis) so any later request to apply A/B can
  // resolve to the exact previewed shape.
  setCache(fixOptionsCacheKey(issueId), response, FIX_OPTIONS_CACHE_TTL_MS);
  return response;
}

/**
 * Apply a fix option with actual DB write-back.
 * Creates ResourceVersion snapshots before updating entities.
 */
export async function applyFixOption(
  issueId: string,
  optionKey: "A" | "B" | "C",
  workspaceId: string,
  userId?: string
) {
  const issue = await prisma.alignmentIssue.findFirst({
    where: { id: issueId, workspaceId, status: "OPEN" },
  });

  if (!issue) {
    throw new Error("Issue not found or already resolved");
  }

  // For option C (Acknowledge & Document), just mark as fixed
  if (optionKey === "C") {
    const updated = await prisma.alignmentIssue.update({
      where: { id: issueId },
      data: {
        status: "FIXED",
        fixAppliedAt: new Date(),
        fixOption: optionKey,
      },
    });

    invalidateCache(cacheKeys.prefixes.alignment(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
    invalidateCache(fixOptionsCacheKey(issueId));

    return {
      success: true,
      issueId: updated.id,
      newStatus: "FIXED" as const,
      updatedEntities: [],
    };
  }

  // For options A and B we need the changes array. generateFixOptions
  // caches its output keyed by issueId (see lib/api/cache + the
  // fixOptionsCacheKey helper above) — when the user previews and applies
  // within the 60-min TTL, the cache hit returns the exact array shown in
  // the preview. On cache miss (server restart, TTL expiry) we regenerate;
  // results may differ slightly because temperature 0.3 introduces drift
  // but the user is one cache-window removed from their preview so the
  // mismatch is acceptable.
  const fixResponse = await generateFixOptions(issueId, workspaceId);
  const selectedOption = fixResponse.options.find((o) => o.key === optionKey);

  if (!selectedOption || !selectedOption.changes?.length) {
    // No concrete changes available — fall back to marking as fixed
    const updated = await prisma.alignmentIssue.update({
      where: { id: issueId },
      data: {
        status: "FIXED",
        fixAppliedAt: new Date(),
        fixOption: optionKey,
      },
    });

    invalidateCache(cacheKeys.prefixes.alignment(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
    invalidateCache(fixOptionsCacheKey(issueId));

    return {
      success: true,
      issueId: updated.id,
      newStatus: "FIXED" as const,
      updatedEntities: [],
    };
  }

  // Apply changes within a transaction
  const updatedEntities: {
    type: string;
    id: string;
    field: string;
    oldValue: string;
    newValue: string;
  }[] = [];

  // Velden die zijn verhuisd van BrandStyleguide naar BrandVoiceguide
  // (ADR 2026-05-15). String-array velden die alignment-fix kan targetten.
  // examplePhrases is buiten scope: JSON-shape, niet wijzigbaar via simpele
  // alignment-fix path.
  const STYLEGUIDE_FIELDS_MOVED_TO_VOICEGUIDE = new Set([
    "contentGuidelines",
    "writingGuidelines",
  ]);

  await prisma.$transaction(async (tx) => {
    for (const change of selectedOption.changes ?? []) {
      // Reroute Brandstyle entity updates for voice-fields to BrandVoiceguide.
      // Lock-check + version-snapshot lopen op de originele Brandstyleguide
      // (parity met non-rerouted path) — alleen de write zelf gaat naar
      // BrandVoiceguide.
      if (
        change.entityType === "Brandstyle" &&
        STYLEGUIDE_FIELDS_MOVED_TO_VOICEGUIDE.has(change.field)
      ) {
        try {
          // Lock-check op de Brandstyleguide entity die de alignment-issue
          // origineel target was — voice-fields zijn data-geconsolideerd in
          // voiceguide, maar governance-laag is nog steeds de styleguide-lock.
          const sgEntity = await tx.brandStyleguide.findUnique({
            where: { id: change.entityId },
            select: { id: true, isLocked: true, workspaceId: true },
          });
          if (!sgEntity) {
            console.warn(
              `[fix-generator] Brandstyle not found for voiceguide reroute: ${change.entityId}`,
            );
            continue;
          }
          if (sgEntity.isLocked) {
            console.warn(
              `[fix-generator] Brandstyle is locked, skipping voiceguide reroute: ${change.entityId}`,
            );
            continue;
          }

          // Version-snapshot van huidige voiceguide-state (best-effort, parity
          // met non-rerouted path). Gebruikt eigen VOICEGUIDE resourceType
          // zodat restore-flows correct kunnen routeren — payload bevat
          // BrandVoiceguide JSON, resourceId is de voiceguide-id.
          if (userId) {
            try {
              const currentVoiceguide = await tx.brandVoiceguide.findUnique({
                where: { workspaceId },
              });
              if (currentVoiceguide) {
                await createVersion({
                  resourceType: "VOICEGUIDE",
                  resourceId: currentVoiceguide.id,
                  snapshot: currentVoiceguide as unknown as Record<string, unknown>,
                  changeType: "MANUAL_SAVE",
                  changeNote: `Brand Alignment fix (voiceguide reroute): ${issue.title}`,
                  userId,
                  workspaceId,
                });
              }
            } catch (versionError) {
              console.warn(
                "[fix-generator] Voiceguide version snapshot failed:",
                versionError,
              );
            }
          }

          const updateData = buildUpdateData(change.field, change.newValue);
          await tx.brandVoiceguide.upsert({
            where: { workspaceId },
            update: updateData,
            create: { workspaceId, source: "alignment-fix", ...updateData },
          });
          updatedEntities.push({
            type: "BrandVoiceguide",
            id: workspaceId,
            field: change.field,
            oldValue: change.currentValue,
            newValue: change.newValue,
          });
        } catch (err) {
          console.error(
            `[fix-generator] Voiceguide update failed for ${change.field}:`,
            err,
          );
        }
        continue;
      }

      const modelName = MODEL_MAP[change.entityType];
      if (!modelName) {
        console.warn(
          `[fix-generator] Unknown entity type: ${change.entityType}`
        );
        continue;
      }

      // Check if entity is locked
      try {
        const entity = await (
          tx[modelName as keyof typeof tx] as unknown as { findUnique: (args: { where: { id: string }; select: Record<string, boolean> }) => Promise<Record<string, unknown> | null> }
        ).findUnique({
          where: { id: change.entityId },
          select: { id: true, isLocked: true },
        });

        if (!entity) {
          console.warn(
            `[fix-generator] Entity not found: ${change.entityType}#${change.entityId}`
          );
          continue;
        }

        if (entity.isLocked) {
          console.warn(
            `[fix-generator] Entity is locked: ${change.entityType}#${change.entityId}`
          );
          continue;
        }
      } catch {
        // Some models might not have isLocked (DetectedTrend)
      }

      // Create ResourceVersion snapshot (before-state)
      // Note: createVersion uses global prisma client (not tx), so this
      // runs outside the transaction. Acceptable for snapshots since they
      // are best-effort and don't affect data integrity.
      const versionType = VERSION_TYPE_MAP[change.entityType];
      if (versionType && userId) {
        try {
          const currentEntity = await (
            tx[modelName as keyof typeof tx] as unknown as { findUnique: (args: { where: { id: string } }) => Promise<Record<string, unknown> | null> }
          ).findUnique({
            where: { id: change.entityId },
          });

          if (currentEntity) {
            await createVersion({
              resourceType: versionType,
              resourceId: change.entityId,
              snapshot: currentEntity as Record<string, unknown>,
              changeType: "MANUAL_SAVE",
              changeNote: `Brand Alignment fix: ${issue.title}`,
              userId,
              workspaceId,
            });
          }
        } catch (versionError) {
          console.warn(
            "[fix-generator] Version creation failed:",
            versionError
          );
        }
      }

      // Apply the update
      try {
        const delegate = tx[modelName as keyof typeof tx] as unknown as {
          findUnique: (args: { where: { id: string }; select: Record<string, boolean> }) => Promise<Record<string, unknown> | null>;
          update: (args: { where: { id: string }; data: Record<string, unknown> }) => Promise<unknown>;
        };
        // Dot-notation fields target a sub-path inside a Json column and
        // need read-modify-write so sibling keys survive the update.
        const updateData = change.field.startsWith("frameworkData.")
          ? await buildJsonPathUpdate(
              delegate,
              change.entityId,
              change.field,
              change.newValue,
            )
          : buildUpdateData(change.field, change.newValue);
        if (!updateData) {
          console.warn(
            `[fix-generator] Entity not found for JSON merge: ${change.entityType}#${change.entityId}`,
          );
          continue;
        }
        await delegate.update({
          where: { id: change.entityId },
          data: updateData,
        });

        updatedEntities.push({
          type: change.entityType,
          id: change.entityId,
          field: change.field,
          oldValue: change.currentValue,
          newValue: change.newValue,
        });
      } catch (updateError) {
        console.error(
          `[fix-generator] Failed to update ${change.entityType}#${change.entityId}.${change.field}:`,
          updateError
        );
      }
    }

    // Only mark issue as FIXED if at least one update succeeded
    if (updatedEntities.length > 0) {
      await tx.alignmentIssue.update({
        where: { id: issueId },
        data: {
          status: "FIXED",
          fixAppliedAt: new Date(),
          fixOption: optionKey,
        },
      });
    }
  });

  // Invalidate caches
  invalidateCache(cacheKeys.prefixes.alignment(workspaceId));
  invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
  invalidateCache(cacheKeys.prefixes.personas(workspaceId));
  invalidateCache(cacheKeys.prefixes.products(workspaceId));
  invalidateCache(fixOptionsCacheKey(issueId));
  invalidateBrandContext(workspaceId);

  if (updatedEntities.length === 0) {
    return {
      success: false,
      issueId: issue.id,
      newStatus: "OPEN" as const,
      updatedEntities: [],
    };
  }

  return {
    success: true,
    issueId: issue.id,
    newStatus: "FIXED" as const,
    updatedEntities,
  };
}

// ─── Helpers ─────────────────────────────────────────────────

function getModuleFromType(itemType: string | null): AlignmentModule {
  switch (itemType) {
    case "BrandAsset":
      return "BRAND_FOUNDATION";
    case "BusinessStrategy":
      return "BUSINESS_STRATEGY";
    case "Brandstyle":
      return "BRANDSTYLE";
    case "Persona":
      return "PERSONAS";
    case "Product":
      return "PRODUCTS_SERVICES";
    case "DetectedTrend":
      return "MARKET_INSIGHTS";
    default:
      return "BRAND_FOUNDATION";
  }
}

function validateModule(module: string): AlignmentModule {
  const valid: AlignmentModule[] = [
    "BRAND_FOUNDATION",
    "BUSINESS_STRATEGY",
    "BRANDSTYLE",
    "PERSONAS",
    "PRODUCTS_SERVICES",
    "MARKET_INSIGHTS",
  ];
  return valid.includes(module as AlignmentModule)
    ? (module as AlignmentModule)
    : "BRAND_FOUNDATION";
}

/**
 * Build Prisma update data for a simple (non-dot-notation) field.
 * Dot-notation JSON paths like "frameworkData.toneDimensions" are handled
 * by buildJsonPathUpdate, which does a read-modify-write merge.
 */
function buildUpdateData(
  field: string,
  newValue: string
): Record<string, unknown> {
  // Handle string array fields
  if (
    [
      "goals",
      "features",
      "benefits",
      "useCases",
      "interests",
      "coreValues",
      "motivations",
      "frustrations",
      "behaviors",
      "keyAssumptions",
      "conflictsWith",
      // Verhuisd van Brandstyleguide naar BrandVoiceguide (ADR 2026-05-15) —
      // blijven string-array shape, alleen target-model verschoven.
      "contentGuidelines",
      "writingGuidelines",
    ].includes(field)
  ) {
    try {
      const parsed = JSON.parse(newValue);
      if (Array.isArray(parsed)) {
        return { [field]: parsed };
      }
    } catch {
      // Not valid JSON array, treat as single item
    }
    return { [field]: [newValue] };
  }

  return { [field]: newValue };
}

/**
 * Build Prisma update data for a dot-notation path into a Json column
 * (e.g. "frameworkData.toneDimensions") via read-modify-write: the current
 * column value is fetched and only the addressed sub-path is replaced, so
 * sibling keys are preserved. Returns null when the entity cannot be read
 * (caller should skip the change).
 */
async function buildJsonPathUpdate(
  delegate: {
    findUnique: (args: {
      where: { id: string };
      select: Record<string, boolean>;
    }) => Promise<Record<string, unknown> | null>;
  },
  entityId: string,
  field: string,
  newValue: string,
): Promise<Record<string, unknown> | null> {
  const [column, ...subPath] = field.split(".");
  const record = await delegate.findUnique({
    where: { id: entityId },
    select: { [column]: true },
  });
  if (!record) return null;

  const current = record[column];
  const base =
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};
  return { [column]: setByPath(base, subPath, parseJsonValue(newValue)) };
}

/**
 * Immutably set a value at a dot-notation path inside a JSON-like object.
 * Missing or non-object intermediate values are replaced by fresh objects
 * so arbitrarily deep paths always resolve.
 */
function setByPath(
  target: Record<string, unknown>,
  path: string[],
  value: unknown,
): Record<string, unknown> {
  if (path.length === 0) return target;
  const [head, ...rest] = path;
  if (rest.length === 0) {
    return { ...target, [head]: value };
  }
  const current = target[head];
  const child =
    current && typeof current === "object" && !Array.isArray(current)
      ? (current as Record<string, unknown>)
      : {};
  return { ...target, [head]: setByPath(child, rest, value) };
}

/**
 * Parse an AI-provided value string: JSON when valid (objects, arrays,
 * numbers, booleans), otherwise the raw string.
 */
function parseJsonValue(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

/**
 * Create a human-readable summary of entity data for the currentContent display.
 */
function summarizeEntity(data: Record<string, unknown>): string {
  const parts: string[] = [];

  if (data.name) parts.push(`Name: ${data.name}`);
  if (data.title) parts.push(`Title: ${data.title}`);
  if (data.description)
    parts.push(
      `Description: ${String(data.description).slice(0, 200)}${String(data.description).length > 200 ? "..." : ""}`
    );
  if (data.content)
    parts.push(
      `Content: ${String(data.content).slice(0, 200)}${String(data.content).length > 200 ? "..." : ""}`
    );
  if (data.occupation) parts.push(`Occupation: ${data.occupation}`);
  if (data.category) parts.push(`Category: ${data.category}`);
  if (data.tagline) parts.push(`Tagline: ${data.tagline}`);
  if (Array.isArray(data.goals) && data.goals.length > 0)
    parts.push(`Goals: ${data.goals.join(", ")}`);
  if (Array.isArray(data.features) && data.features.length > 0)
    parts.push(`Features: ${data.features.join(", ")}`);
  if (Array.isArray(data.coreValues) && data.coreValues.length > 0)
    parts.push(`Core Values: ${data.coreValues.join(", ")}`);
  if (data.frameworkType) parts.push(`Framework: ${data.frameworkType}`);

  return parts.length > 0 ? parts.join("\n") : "No detailed content available";
}
