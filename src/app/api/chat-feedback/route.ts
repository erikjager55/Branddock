import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getServerSession, resolveWorkspaceId } from '@/lib/auth-server';
import { requireDeveloper } from '@/lib/developer-access';

const SENTIMENTS = ['positive', 'neutral', 'negative'] as const;
const TAGS = [
  'inaccurate',
  'off-brand',
  'too-verbose',
  'too-generic',
  'unhelpful',
  'other',
] as const;

const createSchema = z.object({
  sentiment: z.enum(SENTIMENTS),
  tags: z.array(z.enum(TAGS)).max(TAGS.length).default([]),
  comment: z.string().trim().min(1).max(5000),
  conversationId: z.string().min(1).max(200).optional().nullable(),
  messageId: z.string().min(1).max(200).optional().nullable(),
  messageContent: z.string().max(20_000).optional().nullable(),
});

/** GET /api/chat-feedback — workspace-scoped list, or ?all=true for developers */
export async function GET(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const allParam = req.nextUrl.searchParams.get('all');

  if (allParam === 'true') {
    const dev = await requireDeveloper();
    if (!dev) {
      return Response.json({ error: 'Developer access required' }, { status: 403 });
    }
    const feedback = await prisma.chatFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, email: true } },
        reviewedBy: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
      },
    });
    return Response.json({ feedback });
  }

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return Response.json({ error: 'No workspace' }, { status: 400 });
  }

  const feedback = await prisma.chatFeedback.findMany({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: { user: { select: { name: true, email: true } } },
  });
  return Response.json({ feedback });
}

/** POST /api/chat-feedback — user submits feedback on an AI response */
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) {
    return Response.json({ error: 'No workspace' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const entry = await prisma.chatFeedback.create({
    data: {
      workspaceId,
      userId: session.user.id,
      sentiment: parsed.data.sentiment,
      tags: parsed.data.tags,
      comment: parsed.data.comment,
      conversationId: parsed.data.conversationId ?? null,
      messageId: parsed.data.messageId ?? null,
      messageContent: parsed.data.messageContent ?? null,
    },
  });

  return Response.json({ feedback: entry }, { status: 201 });
}
