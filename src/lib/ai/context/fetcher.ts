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
    try {
      // Deliverables don't have workspaceId directly — skip for modal listing
      // They are shown via their parent campaign
      if (config.key === 'deliverable') continue;

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

      if (items.length === 0) continue;

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
      // Model may not exist or relation changed — skip gracefully
      console.warn(`[context-fetcher] Fetch failed for ${config.key}:`, error);
      continue;
    }
  }

  return groups;
}

// ── Serialize selected items for the prompt ───────────────

export async function serializeContextForPrompt(
  selectedItems: { sourceType: string; sourceId: string }[],
  workspaceId: string,
): Promise<string> {
  if (selectedItems.length === 0) return '';

  const sections: string[] = [];

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

      sections.push(serializeToText({ config, record: record as Record<string, unknown> }));
    } catch (error) {
      console.warn(
        `[context-fetcher] Serialize failed for ${item.sourceType}/${item.sourceId}:`,
        error,
      );
      continue;
    }
  }

  if (sections.length === 0) return '';

  return `## ADDITIONAL CONTEXT\nThe following information has been shared with you for discussion:\n\n${sections.join('\n\n')}`;
}
