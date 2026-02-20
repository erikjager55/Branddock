import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";

// GET /api/ai-context/brand-summary
// Returns aggregate counts for brand context (used by AI Research "Use my brand context" toggle)
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const [assetCount, personaCount, productCount] = await Promise.all([
      prisma.brandAsset.count({ where: { workspaceId } }),
      prisma.persona.count({ where: { workspaceId } }),
      prisma.product.count({ where: { workspaceId } }),
    ]);

    return NextResponse.json({
      brandFoundation: { assetCount },
      personas: { count: personaCount },
      products: { count: productCount },
    });
  } catch (error) {
    console.error("[GET /api/ai-context/brand-summary]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
