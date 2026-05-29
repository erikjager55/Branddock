import { prisma } from "../src/lib/prisma";
import { extractBrandTokensFromStyleguide } from "../src/lib/landing-pages/brand-tokens";

async function main() {
  const sg = await prisma.brandStyleguide.findUnique({
    where: { workspaceId: "cmnixs78z002g44msjvlyhiqb" },
    select: {
      primaryFontName: true,
      layoutStyle: true,
      archetype: true,
      buttonProfile: true,
      typographyProfile: true,
      spacingProfile: true,
      elevationProfile: true,
      radiusProfile: true,
      motionProfile: true,
      photographyStyle: true,
      colors: { select: { hex: true, category: true, sortOrder: true, tags: true, contrastWhite: true, contrastBlack: true, confidence: true } },
      fonts: { select: { name: true, role: true, fontFamily: true, sortOrder: true } },
    },
  });
  if (!sg) {
    console.log("not found");
    return;
  }

  const buttonProfile = sg.buttonProfile as unknown[];
  console.log(`buttonProfile.length: ${Array.isArray(buttonProfile) ? buttonProfile.length : "not array"}`);
  if (Array.isArray(buttonProfile)) {
    const primaries = (buttonProfile as Array<{ role?: string; paddingY?: string; paddingX?: string; borderRadius?: string; fontSize?: string; textTransform?: string }>).filter((b) => b.role === "primary");
    console.log(`  primary count: ${primaries.length}`);
    primaries.slice(0, 5).forEach((p, i) => {
      console.log(`  [${i}] paddingY=${p.paddingY} paddingX=${p.paddingX} radius=${p.borderRadius} fontSize=${p.fontSize} textTransform=${p.textTransform}`);
    });
  }

  const tokens = extractBrandTokensFromStyleguide(sg as unknown as Parameters<typeof extractBrandTokensFromStyleguide>[0]);
  console.log("\n--- Extracted tokens ---");
  console.log("button:", JSON.stringify(tokens.button));
  console.log("elevation:", JSON.stringify(tokens.elevation));
  console.log("sectionRhythm:", JSON.stringify(tokens.sectionRhythm));
  console.log("iconography:", JSON.stringify(tokens.iconography));
  console.log("motion:", JSON.stringify(tokens.motion));

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
