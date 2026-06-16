// =============================================================
// W5 logo L-Fase 3 (plan §5) — opt-in hero-logo-overlay toggle.
//
// GET → { enabled }   PUT { enabled } → zet de toggle.
//
// Default UIT: het échte merklogo wordt alleen post-gen op de hero
// gestempeld wanneer de workspace dit expliciet aanzet (beslispunt 4:
// eerst L-Fase 1+2 meten, dán de overlay aanzetten).
// =============================================================

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveWorkspaceId } from '@/lib/auth-server';
import {
  resolveHeroLogoOverlayEnabled,
  setHeroLogoOverlayEnabled,
} from '@/lib/landing-pages/hero-logo-config';

const putSchema = z.object({ enabled: z.boolean() }).strict();

export async function GET() {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const enabled = await resolveHeroLogoOverlayEnabled(workspaceId);
  return NextResponse.json({ enabled });
}

export async function PUT(request: Request) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { enabled } = putSchema.parse(await request.json());
    await setHeroLogoOverlayEnabled(workspaceId, enabled);
    return NextResponse.json({ enabled });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid body', details: err.issues }, { status: 400 });
    }
    console.error('[PUT /api/workspace/hero-logo-overlay]', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
