import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { requireDeveloper } from "@/lib/developer-access";
import { resolveAuthorProfile } from "@/lib/landing-pages/author-profile";

/**
 * GEO/SEO Fase 3 — workspace E-E-A-T author-profiel.
 *
 * Voedt het Person+sameAs-knooppunt in BlogPosting JSON-LD op gepubliceerde
 * GEO-artikelen. Developer-only (mirror van /api/settings/ai-models): het is een
 * workspace-brede authority-instelling, geen per-gebruiker-veld.
 */

// ─── GET /api/settings/author-profile ────────────────────────
export async function GET() {
  try {
    const session = await requireDeveloper();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { authorProfile: true },
    });

    // Geef het genormaliseerde profiel terug (of null als leeg/ongeldig).
    return NextResponse.json({ authorProfile: resolveAuthorProfile(workspace?.authorProfile) });
  } catch (error) {
    console.error("[GET /api/settings/author-profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/settings/author-profile ──────────────────────
const patchSchema = z.object({
  name: z.string().trim().max(120),
  jobTitle: z.string().trim().max(120).optional(),
  // http(s) afdwingen op de write zodat opgeslagen data == wat resolveAuthorProfile
  // bij read emit (Zod's .url() accepteert anders ftp:/mailto:).
  sameAs: z
    .array(z.string().trim().url().refine((u) => /^https?:\/\//i.test(u), 'Alleen http(s)-URLs'))
    .max(10)
    .optional(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireDeveloper();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    // Lege naam → profiel wissen (null), zodat de JSON-LD geen author meer emit.
    const name = parsed.data.name.trim();
    const value =
      name.length === 0
        ? null
        : {
            name,
            ...(parsed.data.jobTitle ? { jobTitle: parsed.data.jobTitle } : {}),
            ...(parsed.data.sameAs && parsed.data.sameAs.length > 0 ? { sameAs: parsed.data.sameAs } : {}),
          };

    await prisma.workspace.update({
      where: { id: workspaceId },
      // DbNull wist de Json-kolom (≠ undefined, dat het veld zou overslaan).
      data: { authorProfile: value === null ? Prisma.DbNull : value },
    });

    return NextResponse.json({ authorProfile: resolveAuthorProfile(value) });
  } catch (error) {
    console.error("[PATCH /api/settings/author-profile]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
