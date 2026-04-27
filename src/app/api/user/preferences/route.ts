import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession } from '@/lib/auth-server';

// ---------------------------------------------------------------------------
// GET / PATCH /api/user/preferences
//
// Sprint B · Step 3.D — flexible per-user UI preferences blob on UserProfile.
// Known keys today:
//   - brandAssistantTipDismissed: boolean  (first-run tooltip dismiss state)
//
// The shape is deliberately open: new keys can be added by callers without
// changing the Prisma schema. Server-side Zod validation is permissive but
// rejects non-object payloads and oversized blobs so a rogue client can't
// abuse the Json column.
// ---------------------------------------------------------------------------

const MAX_PAYLOAD_BYTES = 8 * 1024; // 8 KB — generous for UI flags

// Accept primitives + shallow arrays/objects. Deep nesting is rejected to
// keep the blob scannable; anything that needs structure deserves its own
// column.
const preferenceValueSchema = z.union([
  z.string().max(500),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.union([z.string().max(500), z.number(), z.boolean()])).max(50),
]);

const preferencesBodySchema = z.record(z.string().max(64), preferenceValueSchema);

// Empty record for users with no profile row (shouldn't normally happen —
// auth creates a profile — but keep the API total so callers aren't forced
// to null-check).
const EMPTY_PREFERENCES: Record<string, unknown> = {};

export async function GET() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { preferences: true },
  });

  const preferences =
    profile?.preferences && typeof profile.preferences === 'object' && !Array.isArray(profile.preferences)
      ? (profile.preferences as Record<string, unknown>)
      : EMPTY_PREFERENCES;

  return NextResponse.json({ preferences });
}

export async function PATCH(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawText = await request.text();
  if (rawText.length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = rawText ? JSON.parse(rawText) : {};
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = preferencesBodySchema.safeParse(parsedJson);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 },
    );
  }
  const patch = parsed.data;

  // Shallow JSON merge — existing keys stay unless explicitly overwritten.
  // Set a key to null to delete it (common pattern).
  const existing = await prisma.userProfile.findUnique({
    where: { userId: session.user.id },
    select: { preferences: true },
  });

  const current =
    existing?.preferences && typeof existing.preferences === 'object' && !Array.isArray(existing.preferences)
      ? (existing.preferences as Record<string, unknown>)
      : {};

  const merged: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete merged[key];
    } else {
      merged[key] = value;
    }
  }

  // Strip null values from the create-time payload too — the merge logic
  // above treats null as "delete", so the create payload should reflect
  // the same semantics (only positive values).
  const createPayload: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== null) createPayload[key] = value;
  }

  // Upsert so a user without a profile row still lands somewhere sensible —
  // Better Auth doesn't always create a UserProfile on signup, and without
  // this branch the dismiss action would silently 404 and the tooltip
  // would re-appear forever. Email comes from the session because the
  // UserProfile schema requires it.
  const updated = await prisma.userProfile.upsert({
    where: { userId: session.user.id },
    update: { preferences: merged as Prisma.InputJsonValue },
    create: {
      userId: session.user.id,
      email: session.user.email ?? '',
      preferences: createPayload as Prisma.InputJsonValue,
    },
    select: { preferences: true },
  });

  return NextResponse.json({
    preferences: updated.preferences ?? EMPTY_PREFERENCES,
  });
}
