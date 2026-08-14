import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { resolveFieldClaims } from "@/lib/brandstyle/claim-fields";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// GET /api/brandstyle/typography — typography section
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: {
        primaryFontName: true,
        primaryFontUrl: true,
        additionalFonts: true,
        typeScale: true,
        typographySavedForAi: true,
      },
    });

    if (!styleguide) {
      return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    }

    return NextResponse.json({ typography: styleguide });
  } catch (error) {
    console.error("[GET /api/brandstyle/typography]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle/typography — update typography
// =============================================================
// `nullable`: de UI stuurt `null` zodra een veld leeg is (TypographySection
// `saveFont`), en dat is het normale geval — de meeste fonts hebben geen
// publieke URL. Met een niet-nullable schema 400'de het opslaan van een
// font-naam zonder URL. Sinds W5 is het bovendien de enige manier om een claim
// op een typografieveld weer los te laten.
const updateTypographySchema = z.object({
  primaryFontName: z.string().nullable().optional(),
  primaryFontUrl: z.string().nullable().optional(),
  additionalFonts: z.array(z.string()).nullable().optional(),
  typeScale: z.any().optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateTypographySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // `typeScale` is een nullable Json-kolom: rauwe `null` moet als
    // `Prisma.JsonNull` binnenkomen, anders leest Prisma het als "niet
    // meegegeven" en blijft de oude schaal staan. Zelfde conversie als in
    // route.ts en design-language/route.ts.
    const data: Record<string, unknown> = { ...parsed.data };
    if ("typeScale" in data && data.typeScale === null) {
      data.typeScale = Prisma.JsonNull;
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      // Claim de geschreven velden zodat de volgende re-analyse ze niet
      // overschrijft (W5). Zonder deze regel is `userEditedFields` een vlag
      // zonder schrijver — precies wat de `*Override`-vlaggen waren.
      data: { ...data, ...(await resolveFieldClaims(workspaceId, parsed.data)) },
      select: {
        primaryFontName: true,
        primaryFontUrl: true,
        additionalFonts: true,
        typeScale: true,
        typographySavedForAi: true,
      },
    });

    // CLAUDE.md #10: elke mutatieroute invalideert de brandstyle-cache. Deze
    // sectie-routes deden dat als enige niet, waardoor de AI-paden na een
    // curatie nog een cache-TTL lang met de oude merkdata werkten.
    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));

    return NextResponse.json({ typography: styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle/typography]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
