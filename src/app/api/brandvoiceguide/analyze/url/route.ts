// =============================================================
// POST /api/brandvoiceguide/analyze/url
//
// Body: { url?: string, pastedSamples?: string[] }
//   - URL mode: scrape the site and analyze. Pastedsamples is ignored.
//   - Paste mode: use the provided samples (3+, 30+ chars each).
//
// Returns: { jobId } — poll /analyze/status/{jobId} for progress.
//
// Fire-and-forget: pipeline runs in the background, progress map updated
// in voice-analyzer-engine.
// =============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import {
  initVoiceAnalysisJob,
  startVoiceAnalysisPipeline,
} from "@/lib/brandvoice/voice-analyzer-engine";

const bodySchema = z
  .object({
    url: z.string().url().optional(),
    pastedSamples: z.array(z.string().min(30)).min(1).optional(),
  })
  .refine(
    (v) => !!v.url || (v.pastedSamples?.length ?? 0) >= 1,
    { message: "Provide either a URL or at least one pasted sample (≥ 30 chars)." },
  );

export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    const jobId = `voice_${randomUUID()}`;
    initVoiceAnalysisJob(jobId);

    // Fire-and-forget — engine updates the in-memory progress map.
    void startVoiceAnalysisPipeline({
      jobId,
      workspaceId,
      brandName: workspace?.name ?? null,
      url: parsed.data.url,
      pastedSamples: parsed.data.pastedSamples,
    });

    return NextResponse.json({ jobId });
  } catch (error) {
    console.error("[POST /api/brandvoiceguide/analyze/url]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
