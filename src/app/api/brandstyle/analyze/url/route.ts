import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId, getServerSession } from "@/lib/auth-server";

const analyzeUrlSchema = z.object({
  url: z.string().url("Invalid URL"),
});

// =============================================================
// POST /api/brandstyle/analyze/url — start URL analyse
// =============================================================
export async function POST(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = analyzeUrlSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Delete existing styleguide if present (max 1 per workspace)
    const existing = await prisma.brandStyleguide.findUnique({ where: { workspaceId } });
    if (existing) {
      await prisma.styleguideColor.deleteMany({ where: { styleguideId: existing.id } });
      await prisma.brandStyleguide.delete({ where: { id: existing.id } });
    }

    // Create new styleguide in ANALYZING state
    const styleguide = await prisma.brandStyleguide.create({
      data: {
        status: "ANALYZING",
        sourceType: "URL",
        sourceUrl: parsed.data.url,
        analysisStatus: "SCANNING_STRUCTURE",
        analysisJobId: `job_${Date.now()}`,
        createdById: session.user.id,
        workspaceId,
      },
    });

    // In demo mode: simulate async completion by marking COMPLETE after a delay
    // In production this would start an actual background job
    setTimeout(async () => {
      try {
        await prisma.brandStyleguide.update({
          where: { id: styleguide.id },
          data: {
            status: "COMPLETE",
            analysisStatus: "COMPLETE",
            // Demo: populate with default styleguide data
            logoVariations: [
              { name: "Primary Logo", url: "/assets/logo-primary.svg", type: "primary" },
              { name: "Dark Logo", url: "/assets/logo-dark.svg", type: "dark" },
              { name: "Icon Only", url: "/assets/logo-icon.svg", type: "icon" },
            ],
            logoGuidelines: [
              "Maintain minimum clear space equal to the height of the logomark",
              "Use the primary logo on light backgrounds",
              "Never scale below 24px height for digital",
            ],
            logoDonts: [
              "Don't rotate or skew the logo",
              "Don't change logo colors",
              "Don't add effects",
              "Don't place on busy backgrounds",
              "Don't stretch proportions",
            ],
            primaryFontName: "Inter",
            primaryFontUrl: "https://fonts.google.com/specimen/Inter",
            typeScale: [
              { level: "H1", name: "Heading 1", size: "36px", lineHeight: "44px", weight: "700" },
              { level: "H2", name: "Heading 2", size: "28px", lineHeight: "36px", weight: "600" },
              { level: "H3", name: "Heading 3", size: "22px", lineHeight: "28px", weight: "600" },
              { level: "Body", name: "Body", size: "16px", lineHeight: "24px", weight: "400" },
              { level: "Small", name: "Small", size: "14px", lineHeight: "20px", weight: "400" },
              { level: "Caption", name: "Caption", size: "12px", lineHeight: "16px", weight: "500" },
            ],
            contentGuidelines: [
              "Lead with user benefit, not feature description",
              "Use active voice and present tense",
              "Keep sentences under 25 words",
            ],
            writingGuidelines: [
              "Be confident but not arrogant",
              "Be professional but approachable",
              "Be precise but not overly technical",
            ],
            examplePhrases: [
              { text: "Build your brand strategy with confidence", type: "do" },
              { text: "Your brand, backed by research", type: "do" },
              { text: "Leverage cutting-edge paradigm shifts", type: "dont" },
            ],
            photographyStyle: {
              mood: "Professional yet approachable",
              subjects: "Teams collaborating, clean workspaces",
              composition: "Rule of thirds, natural lighting",
            },
            photographyGuidelines: [
              "Use authentic, unposed imagery",
              "Maintain consistent color grading",
            ],
            illustrationGuidelines: [
              "Use clean, geometric illustrations",
              "Limit palette to brand colors + one accent",
            ],
            imageryDonts: [
              "Don't use generic stock photos",
              "Don't apply filters that distort brand colors",
            ],
            colorDonts: [
              "Don't use brand colors at less than 60% opacity on text",
              "Don't use more than 3 brand colors in a single composition",
            ],
          },
        });

        // Add demo colors
        const demoColors = [
          { name: "Primary", hex: "#0D9488", rgb: "13, 148, 136", category: "PRIMARY" as const, tags: ["brand"], contrastWhite: "AAA", contrastBlack: "AA", sortOrder: 0 },
          { name: "Secondary", hex: "#14B8A6", rgb: "20, 184, 166", category: "PRIMARY" as const, tags: ["hover"], contrastWhite: "AA", contrastBlack: "AAA", sortOrder: 1 },
          { name: "Accent", hex: "#10B981", rgb: "16, 185, 129", category: "ACCENT" as const, tags: ["cta"], contrastWhite: "AA", contrastBlack: "AAA", sortOrder: 2 },
          { name: "Dark", hex: "#111827", rgb: "17, 24, 39", category: "NEUTRAL" as const, tags: ["text"], contrastWhite: "AAA", contrastBlack: "Fail", sortOrder: 3 },
          { name: "Light", hex: "#F3F4F6", rgb: "243, 244, 246", category: "NEUTRAL" as const, tags: ["background"], contrastWhite: "Fail", contrastBlack: "AAA", sortOrder: 4 },
        ];

        for (const color of demoColors) {
          await prisma.styleguideColor.create({
            data: { ...color, styleguideId: styleguide.id },
          });
        }
      } catch (e) {
        console.error("[analyze/url background]", e);
      }
    }, 8000); // 8 second simulated delay

    return NextResponse.json({ jobId: styleguide.analysisJobId }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/brandstyle/analyze/url]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
