import { NextRequest, NextResponse } from "next/server";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { z } from "zod";

const importUrlSchema = z.object({
  url: z.string().url(),
});

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json(
        { error: "No workspace found" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = importUrlSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { url } = parsed.data;

    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    const videoHosts = [
      "youtube.com",
      "www.youtube.com",
      "youtu.be",
      "vimeo.com",
      "www.vimeo.com",
    ];
    const isVideo = videoHosts.some((host) => hostname.includes(host));

    return NextResponse.json({
      detectedType: isVideo ? "VIDEO" : "ARTICLE",
      title: `Imported: ${hostname}`,
      author: null,
      description: null,
      thumbnailUrl: null,
      platform: hostname,
      metadata: {},
    });
  } catch (error) {
    console.error("Error importing URL:", error);
    return NextResponse.json(
      { error: "Failed to import URL" },
      { status: 500 }
    );
  }
}
