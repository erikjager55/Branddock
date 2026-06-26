import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { assertSafeUrl, assertSafeRedirect } from "@/lib/utils/ssrf";

// =============================================================
// GET /api/export/proxy-image?url=xxx
//
// Fetches an image server-side and streams bytes to the client.
// Used by the brand kit ZIP builder to embed logos/avatars
// into the export without running into browser CORS issues.
//
// Security:
// - URL must be whitelisted against the current workspace
//   (BrandStyleguide logo variations, Persona avatars,
//   Product images, Competitor logos)
// - SSRF protection via assertSafeUrl + assertSafeRedirect
// - 10MB size cap
// - Only image/* content types returned
// =============================================================

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BYTES = 10 * 1024 * 1024; // 10MB

async function getWorkspaceImageAllowlist(workspaceId: string): Promise<Set<string>> {
  const [styleguide, personas, products, competitors] = await Promise.all([
    prisma.brandStyleguide.findFirst({
      where: { workspaceId },
      select: { logos: { select: { fileUrl: true } } },
    }),
    prisma.persona.findMany({
      where: { workspaceId, avatarUrl: { not: null } },
      select: { avatarUrl: true },
    }),
    prisma.product.findMany({
      where: { workspaceId },
      select: { images: { select: { url: true } } },
    }),
    prisma.competitor.findMany({
      where: { workspaceId, logoUrl: { not: null } },
      select: { logoUrl: true },
    }),
  ]);

  const allowed = new Set<string>();

  // Logos (StyleguideLogo records)
  for (const logo of styleguide?.logos ?? []) {
    if (logo.fileUrl) allowed.add(logo.fileUrl);
  }

  for (const p of personas) {
    if (p.avatarUrl) allowed.add(p.avatarUrl);
  }
  for (const prod of products) {
    for (const img of prod.images) {
      if (img.url) allowed.add(img.url);
    }
  }
  for (const c of competitors) {
    if (c.logoUrl) allowed.add(c.logoUrl);
  }

  return allowed;
}

export async function GET(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const targetUrl = request.nextUrl.searchParams.get("url");
    if (!targetUrl) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    // SSRF guard
    try {
      await assertSafeUrl(targetUrl);
    } catch {
      return NextResponse.json({ error: "Invalid or unsafe URL" }, { status: 400 });
    }

    // Whitelist check
    const allowlist = await getWorkspaceImageAllowlist(workspaceId);
    if (!allowlist.has(targetUrl)) {
      return NextResponse.json(
        { error: "URL is not part of this workspace" },
        { status: 404 },
      );
    }

    // Fetch with timeout
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(targetUrl, {
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: 502 },
      );
    }

    // SSRF redirect check
    try {
      await assertSafeRedirect(targetUrl, response.url);
    } catch {
      return NextResponse.json({ error: "Redirected to unsafe URL" }, { status: 400 });
    }

    // Content-Type must be image/*
    const contentType = response.headers.get("content-type") ?? "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "Upstream is not an image resource" },
        { status: 415 },
      );
    }

    // Size cap
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ error: "Upstream timed out" }, { status: 504 });
    }
    console.error("[GET /api/export/proxy-image]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
