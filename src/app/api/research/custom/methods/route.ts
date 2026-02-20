import { NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { METHOD_PRICING } from "@/features/research/constants/research-constants";

// =============================================================
// GET /api/research/custom/methods — available validation methods
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const methods = Object.entries(METHOD_PRICING).map(([type, config]) => ({
      type,
      name: config.name,
      description: config.description,
      price: config.price,
      unit: config.unit,
      confidence: config.confidence,
    }));

    return NextResponse.json({ methods });
  } catch (error) {
    console.error("[GET /api/research/custom/methods]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
