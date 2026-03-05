import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { resolveWorkspaceId } from '@/lib/auth-server';

// GET single config
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id } = await params;
    const config = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });

    if (!config) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ config });
  } catch (error) {
    console.error('[GET /api/admin/exploration-configs/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update config
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id } = await params;
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const config = await prisma.explorationConfig.update({
      where: { id },
      data: {
        itemType: body.itemType ?? existing.itemType,
        itemSubType: body.itemSubType !== undefined ? (body.itemSubType || null) : existing.itemSubType,
        label: body.label,
        provider: body.provider,
        model: body.model,
        temperature: body.temperature,
        maxTokens: body.maxTokens,
        systemPrompt: body.systemPrompt,
        dimensions: body.dimensions,
        feedbackPrompt: body.feedbackPrompt,
        reportPrompt: body.reportPrompt,
        fieldSuggestionsConfig: body.fieldSuggestionsConfig,
        contextSources: body.contextSources,
        isActive: body.isActive,
      },
    });

    return NextResponse.json({ config });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Er bestaat al een configuratie voor deze combinatie van item type en sub type' },
        { status: 409 },
      );
    }
    console.error('[PUT /api/admin/exploration-configs/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE config
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'No workspace' }, { status: 403 });

    const { id } = await params;
    const existing = await prisma.explorationConfig.findFirst({
      where: { id, workspaceId },
    });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    await prisma.explorationConfig.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DELETE /api/admin/exploration-configs/:id]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
