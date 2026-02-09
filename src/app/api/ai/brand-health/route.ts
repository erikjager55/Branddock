import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/../auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/lib/ai/provider";

const brandHealthSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  provider: z.enum(["openai", "anthropic"]).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = brandHealthSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { workspaceId, provider: providerType } = parsed.data;

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const workspace = await prisma.workspace.findFirst({
      where: {
        id: workspaceId,
        OR: [
          { ownerId: user.id },
          { members: { some: { userId: user.id } } },
        ],
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace not found or access denied" },
        { status: 403 }
      );
    }

    // Fetch all brand assets for this workspace
    const brandAssets = await prisma.brandAsset.findMany({
      where: { workspaceId },
      select: {
        name: true,
        description: true,
        type: true,
        status: true,
        content: true,
      },
    });

    const personas = await prisma.persona.findMany({
      where: { workspaceId },
      select: { name: true, role: true, description: true },
    });

    const competitors = await prisma.competitor.findMany({
      where: { workspaceId },
      select: { name: true, description: true, strengths: true, weaknesses: true },
    });

    // Build brand context string
    const brandContext = JSON.stringify(
      {
        brandAssets: brandAssets.map((a) => ({
          name: a.name,
          type: a.type,
          status: a.status,
          description: a.description,
          content: a.content,
        })),
        personas: personas.map((p) => ({
          name: p.name,
          role: p.role,
          description: p.description,
        })),
        competitors: competitors.map((c) => ({
          name: c.name,
          description: c.description,
          strengths: c.strengths,
          weaknesses: c.weaknesses,
        })),
      },
      null,
      2
    );

    const aiProvider = getAIProvider(providerType);
    const result = await aiProvider.brandHealth(brandContext);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error analyzing brand health:", error);
    return NextResponse.json(
      { error: "Failed to analyze brand health" },
      { status: 500 }
    );
  }
}
