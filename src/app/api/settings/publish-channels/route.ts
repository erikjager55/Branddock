import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

// ---------------------------------------------------------------------------
// GET /api/settings/publish-channels — List all publish channels for workspace
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const channels = await prisma.publishChannel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        platform: true,
        provider: true,
        label: true,
        accountName: true,
        isActive: true,
        lastPublishedAt: true,
        settings: true,
        createdAt: true,
        // Exclude credentials from list response for security
      },
    });

    return NextResponse.json({ channels });
  } catch (error) {
    console.error('[GET /api/settings/publish-channels]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ---------------------------------------------------------------------------
// POST /api/settings/publish-channels — Create a new channel connection
// ---------------------------------------------------------------------------
const createSchema = z.object({
  platform: z.enum(['linkedin', 'instagram', 'facebook', 'tiktok', 'email', 'wordpress', 'youtube']),
  provider: z.enum(['linkedin-direct', 'instagram-direct', 'facebook-direct', 'tiktok-direct', 'resend', 'wordpress-rest', 'youtube-api', 'direct']),
  label: z.string().max(200).optional(),
  accountName: z.string().max(200).optional(),
  credentials: z.record(z.string(), z.unknown()).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten() }, { status: 400 });
    }

    const { platform, provider, label, accountName, credentials, settings } = parsed.data;

    const channel = await prisma.publishChannel.create({
      data: {
        workspaceId,
        platform,
        provider,
        label: label ?? `${platform.charAt(0).toUpperCase() + platform.slice(1)} Channel`,
        accountName: accountName ?? null,
        credentials: credentials as object ?? undefined,
        settings: settings as object ?? undefined,
      },
      select: {
        id: true,
        platform: true,
        provider: true,
        label: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ channel }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/settings/publish-channels]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
