import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// POST /api/brandstyle/curation-signals/dismiss
//
// Klikt één curatie-suggestie weg. De sleutel is
// `<lane>::<ruleType>::<pattern>`, dus zodra de regel wordt aangepast
// verandert de sleutel en komt de suggestie vanzelf terug — wegklikken
// bevriest deze regel in deze vórm, niet het onderwerp. Daarom heeft dit geen
// expiry nodig.
//
// DELETE maakt de lijst leeg: "toon me alles weer".
// =============================================================

const dismissSchema = z.object({
  // Ruim: een styleguide-sleutel bevat `describePattern()`, en dat kan een
  // hele woordenlijst zijn. Te krap betekent: die ene suggestie is
  // structureel niet weg te klikken.
  key: z.string().min(1).max(1000),
});

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const parsed = dismissSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: { id: true, dismissedCurationKeys: true },
    });
    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    // `push` is één `array_append` in Postgres. Een read-modify-write op de
    // hele array zou bij twee gelijktijdige klikken de laatste laten winnen en
    // de andere suggestie stilletjes terugbrengen.
    const alreadyDismissed = styleguide.dismissedCurationKeys.includes(parsed.data.key);
    if (!alreadyDismissed) {
      await prisma.brandStyleguide.update({
        where: { id: styleguide.id },
        data: { dismissedCurationKeys: { push: parsed.data.key } },
      });
    }
    const next = alreadyDismissed
      ? styleguide.dismissedCurationKeys
      : [...styleguide.dismissedCurationKeys, parsed.data.key];

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    return NextResponse.json({ dismissed: next.length });
  } catch (error) {
    console.error("[POST /api/brandstyle/curation-signals/dismiss]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }
    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: { id: true },
    });
    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }
    await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: { dismissedCurationKeys: [] },
    });
    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    return NextResponse.json({ dismissed: 0 });
  } catch (error) {
    console.error("[DELETE /api/brandstyle/curation-signals/dismiss]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
