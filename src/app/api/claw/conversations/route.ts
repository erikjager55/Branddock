import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';
import type { ClawMessage } from '@/lib/claw/claw.types';

/** GET /api/claw/conversations — list conversations for current user */
export async function GET(_req: NextRequest) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return new Response('No workspace', { status: 400 });

  const conversations = await prisma.clawConversation.findMany({
    where: { workspaceId, userId: session.user.id },
    select: {
      id: true,
      title: true,
      messages: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  const meta = conversations.map((c) => {
    const msgs = (c.messages as unknown as ClawMessage[]) || [];
    return {
      id: c.id,
      title: c.title,
      messageCount: msgs.length,
      lastMessageAt: msgs.length > 0 ? msgs[msgs.length - 1].createdAt : c.createdAt.toISOString(),
      createdAt: c.createdAt.toISOString(),
    };
  });

  return Response.json({ conversations: meta });
}
