import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthOrFallback } from "@/lib/auth-dev";

export async function POST(request: NextRequest) {
  try {
    const authData = await getAuthOrFallback();
    if (!authData) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await request.json();
    const { sourceType, sourceUrl } = body;

    // Delete existing styleguide if re-analyzing
    const existing = await prisma.brandStyleguide.findUnique({
      where: { workspaceId: authData.workspaceId },
    });
    if (existing) {
      await prisma.brandStyleguide.delete({ where: { id: existing.id } });
    }

    // Create styleguide with ANALYZING status
    const styleguide = await prisma.brandStyleguide.create({
      data: {
        workspaceId: authData.workspaceId,
        createdById: authData.user.id,
        sourceType: sourceType === "PDF" ? "PDF" : "WEBSITE",
        sourceUrl: sourceUrl || null,
        sourceFileName: body.sourceFileName || null,
        status: "ANALYZING",
      },
    });

    // Simulate AI analysis — populate with default data
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Create logos
    await prisma.styleguideLogo.createMany({
      data: [
        {
          variant: "PRIMARY",
          label: "Primary Logo",
          description:
            "Full color logo for standard use on light backgrounds",
          backgroundColor: "#f5f5f5",
          sortOrder: 0,
          styleguideId: styleguide.id,
        },
        {
          variant: "ICON_MARK",
          label: "Icon Mark",
          description:
            "Standalone brand icon for compact spaces and favicons",
          backgroundColor: "#0d9488",
          sortOrder: 1,
          styleguideId: styleguide.id,
        },
        {
          variant: "SCALE_ONLY",
          label: "Scale Only",
          description:
            "Clean, minimal version for small sizes and watermarks",
          backgroundColor: "#f5f5f5",
          sortOrder: 2,
          styleguideId: styleguide.id,
        },
      ],
    });

    // Create colors
    await prisma.styleguideColor.createMany({
      data: [
        { name: "Teal 600", hex: "#0d9488", rgb: "13, 148, 136", hsl: "175, 84%, 32%", cmyk: "91, 0, 8, 42", tags: ["Brand", "Primary"], category: "PRIMARY", sortOrder: 0, styleguideId: styleguide.id },
        { name: "Teal 700", hex: "#0f766e", rgb: "15, 118, 110", hsl: "175, 77%, 26%", cmyk: "87, 0, 7, 54", tags: ["Brand", "Primary Dark"], category: "PRIMARY", sortOrder: 1, styleguideId: styleguide.id },
        { name: "Teal 400", hex: "#2dd4bf", rgb: "45, 212, 191", hsl: "173, 66%, 50%", cmyk: "79, 0, 10, 17", tags: ["Brand", "Primary Light"], category: "PRIMARY", sortOrder: 2, styleguideId: styleguide.id },
        { name: "Slate 800", hex: "#1e293b", rgb: "30, 41, 59", hsl: "217, 33%, 17%", cmyk: "49, 31, 0, 77", tags: ["Text", "Headings"], category: "SECONDARY", sortOrder: 3, styleguideId: styleguide.id },
        { name: "Slate 600", hex: "#475569", rgb: "71, 85, 105", hsl: "215, 19%, 35%", cmyk: "32, 19, 0, 59", tags: ["Text", "Body"], category: "SECONDARY", sortOrder: 4, styleguideId: styleguide.id },
        { name: "Amber 500", hex: "#f59e0b", rgb: "245, 158, 11", hsl: "38, 92%, 50%", cmyk: "0, 36, 96, 4", tags: ["Accent", "Warning"], category: "ACCENT", sortOrder: 5, styleguideId: styleguide.id },
        { name: "Rose 500", hex: "#f43f5e", rgb: "244, 63, 94", hsl: "350, 89%, 60%", cmyk: "0, 74, 62, 4", tags: ["Accent", "Error"], category: "ACCENT", sortOrder: 6, styleguideId: styleguide.id },
        { name: "Gray 100", hex: "#f3f4f6", rgb: "243, 244, 246", hsl: "220, 14%, 96%", cmyk: "1, 1, 0, 4", tags: ["Background", "Surface"], category: "NEUTRAL", sortOrder: 7, styleguideId: styleguide.id },
        { name: "White", hex: "#ffffff", rgb: "255, 255, 255", hsl: "0, 0%, 100%", cmyk: "0, 0, 0, 0", tags: ["Background"], category: "NEUTRAL", sortOrder: 8, styleguideId: styleguide.id },
      ],
    });

    // Update with typography, tone of voice, imagery data
    await prisma.brandStyleguide.update({
      where: { id: styleguide.id },
      data: {
        status: "COMPLETE",
        primaryFont: "Inter",
        secondaryFont: "Georgia",
        typeScale: [
          { level: "H1", size: "48px", weight: "700", lineHeight: "1.2", preview: "The quick brown fox" },
          { level: "H2", size: "36px", weight: "600", lineHeight: "1.25", preview: "The quick brown fox" },
          { level: "H3", size: "28px", weight: "600", lineHeight: "1.3", preview: "The quick brown fox" },
          { level: "H4", size: "22px", weight: "500", lineHeight: "1.35", preview: "The quick brown fox" },
          { level: "Body", size: "16px", weight: "400", lineHeight: "1.5", preview: "The quick brown fox" },
          { level: "Small", size: "14px", weight: "400", lineHeight: "1.5", preview: "The quick brown fox" },
        ],
        contentGuidelines: [
          "Guidelines that feel on-point and authentic",
          "Material and expressions — descriptive, honest style",
          "Content credible — build trustworthiness",
          "Short and approachable tone throughout",
        ],
        writingGuidelines: [
          "Use active voice",
          "Keep sentences under 20 words",
          "Avoid jargon and complex terms",
          "Write with empathy and honesty",
          "Use contractions where possible",
        ],
        examplePhrases: [
          { text: "We started in a modest lab", type: "DO" },
          { text: "Design tools to help manufacturers", type: "DO" },
          { text: "Create content that resonates", type: "DO" },
          { text: "Utilize a platform to optimize workflow efficiency", type: "DONT" },
          { text: "The system enables content generation capabilities", type: "DONT" },
        ],
        photographyGuidelines: [
          "Natural lighting preferred",
          "Real environments, not staged scenes",
          "Close-up and in-process details/action",
          "Clean, uncluttered backgrounds",
          "Warm imagery, aligned with brand color palette",
        ],
        illustrationGuidelines: [
          "Flat design with subtle gradients",
          "Consistent line weights",
          "Brand colors only",
          "Rounded corners on all shapes",
        ],
        imageryDonts: [
          "Generic stock photos",
          "Heavy filters or effects",
          "Clip art or outdated graphics",
          "Busy or distracting backgrounds",
          "Images that conflict with brand colors",
        ],
        logoUsageGuidelines: [
          "Minimum clear space: 2x the mark logo",
          "Minimum size: 48px width/height, 32px for print",
          "Always provide three color versions of the logo file",
        ],
        logoDonts: [
          "Don't stretch or distort",
          "Don't use wrong colors",
          "Don't place on busy backgrounds",
          "Don't add effects or shadows",
          "Don't make it too small",
        ],
        colorDonts: [
          "Don't use colors outside the palette",
          "Don't reduce opacity below 60%",
          "Don't combine accent colors",
        ],
      },
    });

    return NextResponse.json(
      { data: { id: styleguide.id, status: "COMPLETE" } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error analyzing brandstyle:", error);
    return NextResponse.json(
      { error: "Failed to analyze brandstyle" },
      { status: 500 }
    );
  }
}
