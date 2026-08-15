import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { clearStyleguideRuleCache } from "@/lib/brand-fidelity/styleguide-rule-compiler";
import { ruleConstraintInputSchema } from "@/lib/brandstyle/rule-constraints";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// /api/brandstyle/rules — StyleguideRule CRUD (W2)
//
// GET  → alle regels van de workspace-styleguide
// POST → nieuwe regel (user-curated: source default 'user')
// =============================================================

const createRuleSchema = z.object({
  section: z.string().min(1).max(64),
  kind: z.enum(["DO", "DONT", "HARD_RULE"]),
  severity: z.enum(["BLOCKING", "ADVISORY"]).default("ADVISORY"),
  source: z
    .enum(["scraped", "logo", "override", "archetype", "preset", "fallback", "recommended", "user", "derived"])
    .default("user"),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).optional(),
  // Afdwingbare constraint — gevalideerd tegen het gedeelde vocabulaire, zodat
  // een regel die niet compileert nooit stil in de DB belandt.
  constraint: ruleConstraintInputSchema.optional(),
  exampleAssetUrl: z.string().url().optional(),
});

async function resolveStyleguideId(): Promise<
  { styleguideId: string; workspaceId: string } | NextResponse
> {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });
  const styleguide = await prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    select: { id: true },
  });
  if (!styleguide) return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
  return { styleguideId: styleguide.id, workspaceId };
}

export async function GET() {
  try {
    const resolved = await resolveStyleguideId();
    if (resolved instanceof NextResponse) return resolved;

    const rules = await prisma.styleguideRule.findMany({
      where: { styleguideId: resolved.styleguideId },
      orderBy: [{ section: "asc" }, { createdAt: "asc" }],
    });
    return NextResponse.json({ rules });
  } catch (error) {
    console.error("[GET /api/brandstyle/rules]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveStyleguideId();
    if (resolved instanceof NextResponse) return resolved;

    const parsed = createRuleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const rule = await prisma.styleguideRule.create({
      data: {
        styleguideId: resolved.styleguideId,
        ...parsed.data,
        constraint: parsed.data.constraint as object | undefined,
      },
    });

    invalidateCache(cacheKeys.prefixes.brandstyle(resolved.workspaceId));
    clearStyleguideRuleCache(resolved.workspaceId);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/rules]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
