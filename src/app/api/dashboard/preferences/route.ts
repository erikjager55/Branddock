import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';

const DEFAULT_QUICK_START_ITEMS = [
  { key: 'brand_asset', label: 'Create your first brand asset', completed: false, href: 'brand' },
  { key: 'persona', label: 'Define your target persona', completed: false, href: 'personas' },
  { key: 'research', label: 'Plan your first research session', completed: false, href: 'research' },
  { key: 'campaign', label: 'Generate your first campaign strategy', completed: false, href: 'campaign-wizard' },
];

export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    let pref = await prisma.dashboardPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.dashboardPreference.create({
        data: {
          userId,
          workspaceId,
          quickStartItems: DEFAULT_QUICK_START_ITEMS,
        },
      });
    }

    const quickStartItems = (pref.quickStartItems as typeof DEFAULT_QUICK_START_ITEMS) ?? DEFAULT_QUICK_START_ITEMS;

    return NextResponse.json({
      onboardingComplete: pref.onboardingComplete,
      dontShowOnboarding: pref.dontShowOnboarding,
      quickStartDismissed: pref.quickStartDismissed,
      quickStartItems,
    });
  } catch (error) {
    console.error('[GET /api/dashboard/preferences]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const updateSchema = z.object({
  onboardingComplete: z.boolean().optional(),
  dontShowOnboarding: z.boolean().optional(),
  quickStartDismissed: z.boolean().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const session = await getServerSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = session.user.id;

    const body = await request.json();
    const data = updateSchema.parse(body);

    const pref = await prisma.dashboardPreference.upsert({
      where: { userId },
      update: data,
      create: {
        userId,
        workspaceId,
        quickStartItems: DEFAULT_QUICK_START_ITEMS,
        ...data,
      },
    });

    const quickStartItems = (pref.quickStartItems as typeof DEFAULT_QUICK_START_ITEMS) ?? DEFAULT_QUICK_START_ITEMS;

    return NextResponse.json({
      onboardingComplete: pref.onboardingComplete,
      dontShowOnboarding: pref.dontShowOnboarding,
      quickStartDismissed: pref.quickStartDismissed,
      quickStartItems,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.issues }, { status: 400 });
    }
    console.error('[PATCH /api/dashboard/preferences]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
