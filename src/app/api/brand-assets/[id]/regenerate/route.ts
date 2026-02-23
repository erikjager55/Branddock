import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";
import { requireUnlocked } from "@/lib/lock-guard";
import { openaiClient } from "@/lib/ai";
import { parseAIError, getReadableErrorMessage, getAIErrorStatus } from "@/lib/ai/error-handler";

// =============================================================
// POST /api/brand-assets/[id]/regenerate — AI content regeneration
// =============================================================
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const lockResponse = await requireUnlocked("brandAsset", id);
    if (lockResponse) return lockResponse;

    const asset = await prisma.brandAsset.findFirst({
      where: { id, workspaceId },
      include: {
        versions: { orderBy: { version: "desc" }, take: 1 },
        workspace: { select: { name: true } },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const instructions = (body as Record<string, unknown>).instructions as string | undefined;

    const systemPrompt = `You are a brand strategist helping define brand assets for "${asset.workspace.name}". Generate clear, professional content for the brand asset "${asset.name}" (category: ${asset.category}).${instructions ? `\n\nAdditional instructions: ${instructions}` : ""}`;

    const userPrompt = asset.content
      ? `Here is the current content for "${asset.name}":\n\n${typeof asset.content === "string" ? asset.content : JSON.stringify(asset.content)}\n\nPlease improve and regenerate this content. Keep the same general direction but make it more compelling, specific, and actionable.`
      : `Generate professional brand content for "${asset.name}": ${asset.description}. Write 2-3 paragraphs that are specific, actionable, and compelling.`;

    const generatedContent = await openaiClient.createChatCompletion(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { useCase: "ANALYSIS" }
    );

    const nextVersion = (asset.versions[0]?.version ?? 0) + 1;

    const [updatedAsset, version] = await prisma.$transaction([
      prisma.brandAsset.update({
        where: { id },
        data: { content: generatedContent },
      }),
      prisma.brandAssetVersion.create({
        data: {
          brandAssetId: id,
          version: nextVersion,
          content: generatedContent,
          frameworkData: asset.frameworkData ?? undefined,
          changeNote: "AI regenerated content",
          changedById: session.user.id,
        },
      }),
    ]);

    return NextResponse.json({ asset: updatedAsset, version });
  } catch (error) {
    console.error("[POST /api/brand-assets/:id/regenerate]", error);
    const parsed = parseAIError(error);
    return NextResponse.json({ error: getReadableErrorMessage(parsed) }, { status: getAIErrorStatus(parsed) });
  }
}
