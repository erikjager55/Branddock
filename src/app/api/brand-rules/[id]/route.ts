import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';

async function getWorkspaceOrError() {
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), workspaceId: null };
  }
  return { error: null, workspaceId };
}

const updateBrandRuleSchema = z.object({
  ruleType: z.enum(['FORBIDDEN_WORD', 'REQUIRED_PHRASE', 'STYLE_LIMIT', 'PILLAR_REFERENCE']).optional(),
  pattern: z.string().min(1).max(500).optional(),
  patternIsRegex: z.boolean().optional(),
  message: z.string().max(500).nullable().optional(),
  severity: z.enum(['info', 'warning', 'error']).optional(),
  contentTypeFilter: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error: authErr, workspaceId } = await getWorkspaceOrError();
    if (authErr) return authErr;
    const { id } = await params;

    const existing = await prisma.brandRule.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }
    if (existing.source.startsWith('auto:')) {
      return NextResponse.json(
        { error: `Cannot edit auto-synced rule (source=${existing.source}). Update the source field instead.` },
        { status: 403 },
      );
    }

    const body = await req.json();
    const parsed = updateBrandRuleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const wantsRegex = parsed.data.patternIsRegex ?? existing.patternIsRegex;
    const finalPattern = parsed.data.pattern ?? existing.pattern;
    if (wantsRegex) {
      try {
        new RegExp(finalPattern);
      } catch (regexErr) {
        return NextResponse.json(
          { error: `Invalid regex pattern: ${(regexErr as Error).message}` },
          { status: 400 },
        );
      }
    }

    const updated = await prisma.brandRule.update({
      where: { id },
      data: parsed.data,
    });

    return NextResponse.json({ rule: updated });
  } catch (err) {
    console.error('[PATCH /api/brand-rules/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { error: authErr, workspaceId } = await getWorkspaceOrError();
    if (authErr) return authErr;
    const { id } = await params;

    const existing = await prisma.brandRule.findFirst({ where: { id, workspaceId } });
    if (!existing) {
      return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
    }
    if (existing.source.startsWith('auto:')) {
      return NextResponse.json(
        { error: `Cannot delete auto-synced rule (source=${existing.source}). Remove the underlying source instead.` },
        { status: 403 },
      );
    }

    await prisma.brandRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[DELETE /api/brand-rules/:id]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
