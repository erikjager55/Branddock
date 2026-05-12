// =============================================================
// Per-type fidelity thresholds API (content-test #6.B).
// GET    — alle thresholds + defaults voor huidige workspace
// PATCH  — upsert threshold voor één content-type
// DELETE — reset (delete row) terug naar default
// =============================================================

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import {
  DEFAULT_FIDELITY_THRESHOLD,
  getWorkspaceThresholdMap,
  setThresholdForType,
  resetThresholdForType,
} from '@/lib/content-test/per-type-thresholds';
import { DELIVERABLE_TYPES } from '@/features/campaigns/lib/deliverable-types';

const upsertSchema = z.object({
  contentTypeId: z.string().min(1),
  threshold: z.number().int().min(0).max(100),
});

const resetSchema = z.object({
  contentTypeId: z.string().min(1),
});

export async function GET() {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
  }
  const map = await getWorkspaceThresholdMap(workspaceId);
  const types = DELIVERABLE_TYPES.map((t) => ({
    id: t.id,
    label: t.name,
    category: t.category,
    threshold: map[t.id] ?? DEFAULT_FIDELITY_THRESHOLD,
    isCustomized: map[t.id] !== undefined,
  }));
  return NextResponse.json({
    defaultThreshold: DEFAULT_FIDELITY_THRESHOLD,
    types,
  });
}

export async function PATCH(req: NextRequest) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', details: parsed.error.flatten() }, { status: 400 });
  }
  const exists = DELIVERABLE_TYPES.some((t) => t.id === parsed.data.contentTypeId);
  if (!exists) {
    return NextResponse.json({ error: 'Unknown contentTypeId' }, { status: 400 });
  }
  await setThresholdForType(workspaceId, parsed.data.contentTypeId, parsed.data.threshold);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'No workspace found' }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  await resetThresholdForType(workspaceId, parsed.data.contentTypeId);
  return NextResponse.json({ success: true });
}
