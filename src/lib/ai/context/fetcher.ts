// =============================================================
// Generic Knowledge Context Fetcher
//
// Fetches items from the database based on registry config.
// Knows no specific tables — reads the config dynamically.
//
// Two entry points:
// 1. getAvailableContextItems() — for the selector modal
// 2. serializeContextForPrompt() — for the system prompt
// =============================================================

import { prisma } from '@/lib/prisma';
import { CONTEXT_REGISTRY, type ContextSourceConfig } from './registry';
import { serializeToText } from './serializer';

// ── Types ─────────────────────────────────────────────────

export interface ContextGroup {
  key: string;
  label: string;
  icon: string;
  category: string;
  items: ContextGroupItem[];
  /** True when the source query threw — lets the modal show "couldn't load"
   * instead of silently hiding the category (which reads as "empty"). */
  error?: boolean;
}

export interface ContextGroupItem {
  sourceType: string;
  sourceId: string;
  title: string;
  description?: string;
  status?: string;
}

// ── Fetch all available items (for the modal) ─────────────

export async function getAvailableContextItems(workspaceId: string): Promise<ContextGroup[]> {
  const groups: ContextGroup[] = [];

  for (const config of CONTEXT_REGISTRY) {
    // Deliverables don't have workspaceId directly — skip for modal listing.
    // They are shown via their parent campaign.
    if (config.key === 'deliverable') continue;

    try {
      const model = (prisma as unknown as Record<string, unknown>)[config.prismaModel] as
        | { findMany: (args: Record<string, unknown>) => Promise<Record<string, unknown>[]> }
        | undefined;
      if (!model) continue;

      // Build include object for relations
      const include: Record<string, boolean> = {};
      if (config.includeRelations) {
        for (const rel of config.includeRelations) {
          include[rel] = true;
        }
      }

      const items = await model.findMany({
        where: { [config.workspaceFilter]: workspaceId },
        include: Object.keys(include).length > 0 ? include : undefined,
        orderBy: { [config.titleField]: 'asc' },
      });

      // Emit the group even when empty — the modal shows it as a present-but-
      // empty category (with an inline "add" affordance for knowledge) instead
      // of hiding it, so the user can tell the category exists. (Was: silent
      // `continue` on zero rows — root cause of "library items don't appear".)
      groups.push({
        key: config.key,
        label: config.label,
        icon: config.icon,
        category: config.category,
        items: items.map((item) => ({
          sourceType: config.key,
          sourceId: item.id as string,
          title: (item[config.titleField] as string) || 'Untitled',
          description: config.descriptionField
            ? (item[config.descriptionField] as string | undefined)
            : undefined,
          status: config.statusField
            ? (item[config.statusField] as string | undefined)
            : undefined,
        })),
      });
    } catch (error) {
      // Model may not exist or relation changed — surface as an errored empty
      // group so the UI distinguishes "couldn't load" from "genuinely empty".
      console.warn(`[context-fetcher] Fetch failed for ${config.key}:`, error);
      groups.push({
        key: config.key,
        label: config.label,
        icon: config.icon,
        category: config.category,
        items: [],
        error: true,
      });
    }
  }

  return groups;
}

// ── Serialize selected items for the prompt ───────────────

interface SelectedContextRef {
  sourceType: string;
  sourceId: string;
  /** Optional user guidance on how to use this source. */
  note?: string;
  /** 'primary' = authoritative source material; 'reference' (default) = ambient context. */
  priority?: 'primary' | 'reference';
}

// Primary (user-flagged) sources get a far larger serialization budget so a
// full article the user told the model to "ground its output in" is read in its
// entirety rather than truncated to the generic per-record cap.
const PRIMARY_MAX_SERIALIZED_LENGTH = 16000;

export async function serializeContextForPrompt(
  selectedItems: SelectedContextRef[],
  workspaceId: string,
): Promise<string> {
  if (selectedItems.length === 0) return '';

  const primarySections: string[] = [];
  const referenceSections: string[] = [];

  for (const item of selectedItems) {
    const config = CONTEXT_REGISTRY.find((c) => c.key === item.sourceType);
    if (!config) continue;

    try {
      const model = (prisma as unknown as Record<string, unknown>)[config.prismaModel] as
        | { findFirst: (args: Record<string, unknown>) => Promise<Record<string, unknown> | null> }
        | undefined;
      if (!model) continue;

      const include: Record<string, boolean> = {};
      if (config.includeRelations) {
        for (const rel of config.includeRelations) {
          include[rel] = true;
        }
      }

      // Build where clause — deliverables use campaignId, others use workspaceId
      const where: Record<string, string> = { id: item.sourceId };
      if (config.key !== 'deliverable') {
        where[config.workspaceFilter] = workspaceId;
      }

      const record = await model.findFirst({
        where,
        include: Object.keys(include).length > 0 ? include : undefined,
      });

      if (!record) continue;

      const isPrimary = item.priority === 'primary';
      let section = serializeToText({
        config,
        record: record as Record<string, unknown>,
        // Lift the cap for primary items so a long source isn't half-read.
        ...(isPrimary
          ? { maxLength: Math.max(config.maxSerializedLength ?? 2000, PRIMARY_MAX_SERIALIZED_LENGTH) }
          : {}),
      });

      // Per-item user guidance travels in as an explicit instruction on HOW to
      // use this source (e.g. "emphasize this vision", "play up this tension").
      const note = item.note?.trim();
      if (note) {
        section += `\n- **User guidance on this source:** ${note}`;
      }

      (isPrimary ? primarySections : referenceSections).push(section);
    } catch (error) {
      console.warn(
        `[context-fetcher] Serialize failed for ${item.sourceType}/${item.sourceId}:`,
        error,
      );
      continue;
    }
  }

  if (primarySections.length === 0 && referenceSections.length === 0) return '';

  const blocks: string[] = [];
  if (primarySections.length > 0) {
    // Authoritative framing — user explicitly chose this as source material.
    blocks.push(
      `## PRIORITY SOURCE MATERIAL\nRead the following source material carefully and ground your output in it. Treat it as authoritative — do not contradict or omit its key points.\n\n${primarySections.join('\n\n')}`,
    );
  }
  if (referenceSections.length > 0) {
    // Unchanged framing for non-prioritised items → existing prompts stay
    // byte-identical when nothing is flagged primary (golden-set safety).
    blocks.push(
      `## ADDITIONAL CONTEXT\nThe following information has been shared with you for discussion:\n\n${referenceSections.join('\n\n')}`,
    );
  }

  return blocks.join('\n\n');
}
