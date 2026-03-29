import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId } from '@/lib/auth-server';
import { z } from 'zod';

const exportSchema = z.object({
  deliverableIds: z.array(z.string().min(1)).min(1).max(100),
});

/** POST /api/campaigns/[id]/canvas/export — Export deliverables as plain text */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: campaignId } = await params;

    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, workspaceId },
    });
    if (!campaign) return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });

    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { deliverableIds } = parsed.data;

    const deliverables = await prisma.deliverable.findMany({
      where: { id: { in: deliverableIds }, campaignId },
      include: {
        components: {
          where: { isSelected: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    const exportItems = deliverables.map((d) => {
      const textParts: string[] = [];
      textParts.push(`# ${d.title}`);
      textParts.push(`Type: ${d.contentType}`);
      textParts.push(`Status: ${d.status}`);
      textParts.push(`Approval: ${d.approvalStatus ?? 'DRAFT'}`);
      textParts.push('');

      if (d.components.length > 0) {
        for (const comp of d.components) {
          if (comp.generatedContent) {
            textParts.push(`## ${comp.componentType} (${comp.groupType})`);
            textParts.push(comp.generatedContent);
            textParts.push('');
          }
        }
      } else {
        textParts.push('(No generated content yet)');
        textParts.push('');
      }

      return {
        id: d.id,
        title: d.title,
        text: textParts.join('\n'),
      };
    });

    return NextResponse.json({ items: exportItems });
  } catch (error) {
    console.error('[POST /api/campaigns/:id/canvas/export]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
