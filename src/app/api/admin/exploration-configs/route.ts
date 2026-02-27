import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

// GET /api/admin/exploration-configs — list all configs for workspace
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const configs = await prisma.explorationConfig.findMany({
      where: { workspaceId },
      orderBy: [{ itemType: 'asc' }, { itemSubType: 'asc' }],
    });

    return NextResponse.json({ configs });
  } catch (error) {
    console.error('[GET /api/admin/exploration-configs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/admin/exploration-configs — create new config
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const body = await request.json();

    const config = await prisma.explorationConfig.create({
      data: {
        workspaceId,
        itemType: body.itemType,
        itemSubType: body.itemSubType || null,
        label: body.label || null,
        provider: body.provider || 'anthropic',
        model: body.model || 'claude-sonnet-4-20250514',
        temperature: body.temperature ?? 0.4,
        maxTokens: body.maxTokens ?? 2048,
        systemPrompt: body.systemPrompt,
        dimensions: body.dimensions,
        feedbackPrompt: body.feedbackPrompt,
        reportPrompt: body.reportPrompt,
        fieldSuggestionsConfig: body.fieldSuggestionsConfig || null,
        contextSources: body.contextSources || [],
        isActive: body.isActive ?? true,
      },
    });

    return NextResponse.json({ config }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/admin/exploration-configs]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
