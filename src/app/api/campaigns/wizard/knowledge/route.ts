import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// GET /api/campaigns/wizard/knowledge — List knowledge assets available for campaign wizard
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const assets = await prisma.brandAsset.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        category: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(assets);
  } catch (error) {
    console.error("[GET /api/campaigns/wizard/knowledge]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
