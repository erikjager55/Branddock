import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { resolveWorkspaceId, getServerSession } from '@/lib/auth-server';

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
});

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

/** PATCH /api/claw/conversations/:id — rename conversation */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession();
  if (!session) return new Response('Unauthorized', { status: 401 });

  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return new Response('No workspace', { status: 400 });

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.message }, { status: 400 });
  }

  const conversation = await prisma.clawConversation.findFirst({
    where: { id, workspaceId, userId: session.user.id },
    select: { id: true },
  });
  if (!conversation) return new Response('Not found', { status: 404 });

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title;
  if (Object.keys(data).length === 0) {
    return Response.json({ success: true, unchanged: true });
  }

  await prisma.clawConversation.update({ where: { id }, data });
  return Response.json({ success: true });
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
