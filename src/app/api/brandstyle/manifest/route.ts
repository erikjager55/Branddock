import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, requireAuth } from "@/lib/auth-server";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";
import {
  buildBrandManifest,
  renderBrandManifestMarkdown,
  type BrandManifest,
} from "@/lib/brandstyle/manifest-builder";

// =============================================================
// /api/brandstyle/manifest — Brand Manifest (W1)
//
// GET  → huidig opgeslagen manifest + markdown-render (of 404 als er
//        nog geen gegenereerd is; de digest-UI biedt dan "Genereer").
// POST → (her)genereer deterministisch uit de huidige styleguide +
//        voiceguide, bump manifestVersion en persisteer.
// =============================================================

async function loadStyleguide(workspaceId: string) {
  return prisma.brandStyleguide.findUnique({
    where: { workspaceId },
    include: { colors: true, fonts: true, logos: true },
  });
}

export async function GET() {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const styleguide = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: { brandManifest: true, manifestGeneratedAt: true, manifestVersion: true },
    });
    if (!styleguide) return NextResponse.json({ error: "No styleguide found" }, { status: 404 });
    if (!styleguide.brandManifest) {
      return NextResponse.json({ error: "No manifest generated yet" }, { status: 404 });
    }

    const manifest = styleguide.brandManifest as unknown as BrandManifest;
    return NextResponse.json({
      manifest,
      markdown: renderBrandManifestMarkdown(manifest),
      generatedAt: styleguide.manifestGeneratedAt,
      version: styleguide.manifestVersion,
    });
  } catch (error) {
    console.error("[GET /api/brandstyle/manifest]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await requireAuth();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) return NextResponse.json({ error: "No workspace" }, { status: 400 });

    const [styleguide, voiceguide, workspace] = await Promise.all([
      loadStyleguide(workspaceId),
      prisma.brandVoiceguide.findUnique({ where: { workspaceId } }),
      prisma.workspace.findUnique({ where: { id: workspaceId }, select: { name: true } }),
    ]);
    if (!styleguide) return NextResponse.json({ error: "No styleguide found" }, { status: 404 });

    const manifest = buildBrandManifest(styleguide, voiceguide, workspace?.name ?? "Brand");

    await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: {
        brandManifest: manifest as unknown as object,
        manifestGeneratedAt: new Date(),
        manifestVersion: manifest.manifestVersion,
      },
    });

    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));

    return NextResponse.json({
      manifest,
      markdown: renderBrandManifestMarkdown(manifest),
      version: manifest.manifestVersion,
    });
  } catch (error) {
    console.error("[POST /api/brandstyle/manifest]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
