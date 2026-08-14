import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// /api/brandstyle/rules/[ruleId] — regel bewerken/verwijderen (W2)
//
// Een user-edit stempelt source op 'user' (override — heilig bij
// re-scrape, zelfde semantiek als de token-provenance-laag).
// =============================================================

const updateRuleSchema = z.object({
  section: z.string().min(1).max(64).optional(),
  kind: z.enum(["DO", "DONT", "HARD_RULE"]).optional(),
  severity: z.enum(["BLOCKING", "ADVISORY"]).optional(),
  title: z.string().min(1).max(300).optional(),
  description: z.string().max(2000).nullable().optional(),
  constraint: z.record(z.string(), z.unknown()).nullable().optional(),
  exampleAssetUrl: z.string().url().nullable().optional(),
});

async function loadOwnedRule(ruleId: string) {
  const session = await requireAuth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = await resolveWorkspaceId();
  if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

  const rule = await prisma.styleguideRule.findUnique({
    where: { id: ruleId },
    include: { styleguide: { select: { workspaceId: true } } },
  });
  if (!rule || rule.styleguide.workspaceId !== workspaceId) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
  return { rule, workspaceId };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> },
) {
  try {
    const { ruleId } = await params;
    const loaded = await loadOwnedRule(ruleId);
    if (loaded instanceof NextResponse) return loaded;

    const parsed = updateRuleSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updated = await prisma.styleguideRule.update({
      where: { id: ruleId },
      data: {
        ...parsed.data,
        constraint:
          parsed.data.constraint === null
            ? Prisma.JsonNull
            : (parsed.data.constraint as object | undefined),
        source: "user",
      },
    });

    invalidateCache(cacheKeys.prefixes.brandstyle(loaded.workspaceId));
    return NextResponse.json({ rule: updated });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/rules/[ruleId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ ruleId: string }> },
) {
  try {
    const { ruleId } = await params;
    const loaded = await loadOwnedRule(ruleId);
    if (loaded instanceof NextResponse) return loaded;

    await prisma.styleguideRule.delete({ where: { id: ruleId } });

    invalidateCache(cacheKeys.prefixes.brandstyle(loaded.workspaceId));
    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("[DELETE /api/brandstyle/rules/[ruleId]]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
