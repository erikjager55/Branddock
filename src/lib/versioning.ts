import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import type { VersionedResourceType, VersionChangeType } from '@prisma/client';

interface CreateVersionOptions {
  resourceType: VersionedResourceType;
  resourceId: string;
  snapshot: Record<string, unknown>;
  changeType: VersionChangeType;
  changeNote?: string;
  label?: string;
  userId: string;
  workspaceId: string;
}

export async function createVersion(opts: CreateVersionOptions) {
  const lastVersion = await prisma.resourceVersion.findFirst({
    where: { resourceType: opts.resourceType, resourceId: opts.resourceId },
    orderBy: { version: 'desc' },
    select: { version: true, snapshot: true },
  });

  const nextVersion = (lastVersion?.version ?? 0) + 1;
  const diff = lastVersion?.snapshot
    ? computeDiff(lastVersion.snapshot as Record<string, unknown>, opts.snapshot)
    : null;

  return prisma.resourceVersion.create({
    data: {
      resourceType: opts.resourceType,
      resourceId: opts.resourceId,
      version: nextVersion,
      snapshot: opts.snapshot as unknown as Prisma.InputJsonValue,
      diff: diff ? (diff as unknown as Prisma.InputJsonValue) : Prisma.JsonNull,
      changeType: opts.changeType,
      changeNote: opts.changeNote,
      label: opts.label ?? `v${nextVersion}.0`,
      createdById: opts.userId,
      workspaceId: opts.workspaceId,
    },
  });
}

export async function restoreVersion(versionId: string, userId: string) {
  const version = await prisma.resourceVersion.findUniqueOrThrow({ where: { id: versionId } });
  const snapshot = version.snapshot as Record<string, unknown>;

  // Remove fields that don't belong in the Prisma model update
  const cleanSnapshot = { ...snapshot };
  delete cleanSnapshot.id;
  delete cleanSnapshot.createdAt;
  delete cleanSnapshot.updatedAt;
  delete cleanSnapshot.workspaceId;

  switch (version.resourceType) {
    case 'PERSONA':
      await prisma.persona.update({ where: { id: version.resourceId }, data: cleanSnapshot as Record<string, unknown> });
      break;
    case 'BRAND_ASSET':
      await prisma.brandAsset.update({ where: { id: version.resourceId }, data: cleanSnapshot as Record<string, unknown> });
      break;
    case 'PRODUCT':
      await prisma.product.update({ where: { id: version.resourceId }, data: cleanSnapshot as Record<string, unknown> });
      break;
    case 'STRATEGY':
      await prisma.businessStrategy.update({ where: { id: version.resourceId }, data: cleanSnapshot as Record<string, unknown> });
      break;
  }

  return createVersion({
    resourceType: version.resourceType,
    resourceId: version.resourceId,
    snapshot,
    changeType: 'RESTORE',
    changeNote: `Restored to version ${version.version}`,
    userId,
    workspaceId: version.workspaceId,
  });
}

export function computeDiff(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): Record<string, { from: unknown; to: unknown }> | null {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  const allKeys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const key of allKeys) {
    if (JSON.stringify(previous[key]) !== JSON.stringify(current[key])) {
      diff[key] = { from: previous[key], to: current[key] };
    }
  }
  return Object.keys(diff).length > 0 ? diff : null;
}
