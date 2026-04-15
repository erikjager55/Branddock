import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';

/** GET /api/claw/conversations/:id — load full conversation */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return new Response('No workspace', { status: 400 });

  const { id } = await params;
  const conversation = await prisma.clawConversation.findFirst({
    where: { id, workspaceId, userId: session.user.id },
  });

  if (!conversation) return new Response('Not found', { status: 404 });

  return Response.json({
    id: conversation.id,
    title: conversation.title,
    messages: conversation.messages,
    contextSelection: conversation.contextSelection,
    createdAt: conversation.createdAt.toISOString(),
    updatedAt: conversation.updatedAt.toISOString(),
  });
}

/** DELETE /api/claw/conversations/:id — delete conversation */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return new Response('No workspace', { status: 400 });

  const { id } = await params;
  const conversation = await prisma.clawConversation.findFirst({
    where: { id, workspaceId, userId: session.user.id },
    select: { id: true },
  });

  if (!conversation) return new Response('Not found', { status: 404 });

  await prisma.clawConversation.delete({ where: { id } });
  return Response.json({ success: true });
}
