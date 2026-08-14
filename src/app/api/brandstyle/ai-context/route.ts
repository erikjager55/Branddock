import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { getBrandLibrary } from "@/lib/brand-library";

// =============================================================
// GET /api/brandstyle/ai-context — all saved sections as AI prompt context
//
// Dit is de "what you see is what the AI gets"-oppervlakte uit W1. Sinds W7.1
// leest hij daarom via dezelfde accessor als de AI zelf, in plaats van de
// gates opnieuw na te bouwen. Twee gevolgen:
//   - de publish-gate geldt nu óók hier; voorheen toonde deze route secties
//     van een niet-gepubliceerde styleguide die de AI nooit te zien kreeg;
//   - analyzer-markers (OBSERVED:/RECOMMENDED:) zijn gestript, precies zoals
//     in de prompt.
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // Tone-of-voice content verhuisd naar BrandVoiceguide (ADR 2026-05-15).
    const [library, voiceguide] = await Promise.all([
      getBrandLibrary(workspaceId),
      prisma.brandVoiceguide.findUnique({
        where: { workspaceId },
        select: {
          contentGuidelines: true,
          writingGuidelines: true,
          examplePhrases: true,
          guidelinesSavedForAi: true,
          examplePhrasesSavedForAi: true,
        },
      }),
    ]);

    if (!library.exists) {
      return NextResponse.json({ context: null });
    }

    const sections: Record<string, unknown> = {};

    if (library.sections.logo) {
      sections.logo = {
        variations: library.sections.logo.logos.map((l) => ({
          name: l.description ?? l.fileName,
          url: l.fileUrl,
          type: l.variant,
        })),
        guidelines: library.sections.logo.guidelines,
        donts: library.sections.logo.donts,
      };
    }

    if (library.sections.colors) {
      sections.colors = {
        palette: library.sections.colors.palette.map((c) => ({
          name: c.name,
          hex: c.hex,
          category: c.category,
          tags: c.tags,
        })),
        donts: library.sections.colors.donts,
      };
    }

    if (library.sections.typography) {
      sections.typography = {
        primaryFont: library.sections.typography.primaryFontName,
        typeScale: library.sections.typography.typeScale,
      };
    }

    if (voiceguide?.guidelinesSavedForAi) {
      sections.toneOfVoice = {
        contentGuidelines: voiceguide.contentGuidelines,
        writingGuidelines: voiceguide.writingGuidelines,
        examplePhrases: voiceguide.examplePhrasesSavedForAi ? voiceguide.examplePhrases : null,
      };
    }

    if (library.sections.imagery) {
      sections.imagery = {
        photographyStyle: library.sections.imagery.photographyStyle,
        photographyGuidelines: library.sections.imagery.guidelines,
        illustrationGuidelines: library.sections.imagery.illustrationGuidelines,
        donts: library.sections.imagery.donts,
      };
    }

    const designLanguage = library.sections.designLanguage;
    if (designLanguage) {
      // Type helpers for JSON fields
      const iconography = designLanguage.iconographyStyle as {
        style?: string; strokeWeight?: string; cornerRadius?: string;
        sizing?: string; colorUsage?: string; usageNotes?: string;
      } | null;

      const layout = designLanguage.layoutPrinciples as {
        gridSystem?: string; spacingScale?: string; whitespacePhilosophy?: string;
        compositionRules?: string[]; usageNotes?: string;
      } | null;

      sections.designLanguage = {
        graphicElements: designLanguage.graphicElements,
        graphicElementsDonts: designLanguage.graphicElementsDonts,
        patternsTextures: designLanguage.patternsTextures,
        iconography: {
          ...(iconography ?? {}),
          // Flatten for easier AI consumption
          summary: iconography
            ? [
                iconography.style && `Style: ${iconography.style}`,
                iconography.strokeWeight && `Stroke: ${iconography.strokeWeight}`,
                iconography.cornerRadius && `Corner radius: ${iconography.cornerRadius}`,
                iconography.sizing && `Sizes: ${iconography.sizing}`,
                iconography.colorUsage && `Color usage: ${iconography.colorUsage}`,
              ].filter(Boolean).join('. ') || null
            : null,
        },
        iconographyDonts: designLanguage.iconographyDonts,
        gradientsEffects: designLanguage.gradientsEffects,
        layout: {
          ...(layout ?? {}),
          summary: layout
            ? [
                layout.gridSystem && `Grid: ${layout.gridSystem}`,
                layout.spacingScale && `Spacing: ${layout.spacingScale}`,
                layout.whitespacePhilosophy && `Whitespace: ${layout.whitespacePhilosophy}`,
              ].filter(Boolean).join('. ') || null
            : null,
        },
      };
    }

    return NextResponse.json({ context: sections });
  } catch (error) {
    console.error("[GET /api/brandstyle/ai-context]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
