import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveWorkspaceId } from "@/lib/auth-server";
import { applyFieldClaims } from "@/lib/brandstyle/preserve-user-rows";
import { invalidateCache } from "@/lib/api/cache";
import { cacheKeys } from "@/lib/api/cache-keys";

// =============================================================
// GET /api/brandstyle — fetch styleguide (max 1 per workspace)
// =============================================================
export async function GET() {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const [styleguide, workspace] = await Promise.all([
      prisma.brandStyleguide.findUnique({
        where: { workspaceId },
        include: {
          colors: { orderBy: { sortOrder: "asc" } },
          logos: { orderBy: { sortOrder: "asc" } },
          fonts: { orderBy: [{ role: "asc" }, { sortOrder: "asc" }] },
          components: { orderBy: [{ type: "asc" }, { sortOrder: "asc" }] },
          reviews: true,
          createdBy: { select: { id: true, name: true, avatarUrl: true } },
          lockedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { adobeFontsKitId: true },
      }),
    ]);

    if (!styleguide) {
      return NextResponse.json({ styleguide: null });
    }

    // Attach workspace-level Adobe Fonts kit so the UI can render live
    // previews for every ADOBE_FONTS font without a second fetch.
    return NextResponse.json({
      styleguide: { ...styleguide, workspaceAdobeFontsKitId: workspace?.adobeFontsKitId ?? null },
    });
  } catch (error) {
    console.error("[GET /api/brandstyle]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// =============================================================
// PATCH /api/brandstyle — update hele styleguide
// =============================================================
const iconographyStyleSchema = z.object({
  style: z.string().optional(),
  strokeWeight: z.string().optional(),
  cornerRadius: z.string().optional(),
  sizing: z.string().optional(),
  colorUsage: z.string().optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

const layoutPrinciplesSchema = z.object({
  gridSystem: z.string().optional(),
  spacingScale: z.string().optional(),
  whitespacePhilosophy: z.string().optional(),
  compositionRules: z.array(z.string()).optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

const graphicElementsSchema = z.object({
  brandShapes: z.array(z.string()).optional(),
  decorativeElements: z.array(z.string()).optional(),
  visualDevices: z.array(z.string()).optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

const patternsTexturesSchema = z.object({
  patterns: z.array(z.string()).optional(),
  textures: z.array(z.string()).optional(),
  backgrounds: z.array(z.string()).optional(),
  usageNotes: z.string().optional(),
}).nullable().optional();

const gradientDefinitionSchema = z.object({
  name: z.string(),
  type: z.string(),
  colors: z.array(z.string()),
  angle: z.string().optional(),
  usage: z.string().optional(),
});

const updateSchema = z.object({
  logoGuidelines: z.array(z.string()).optional(),
  logoDonts: z.array(z.string()).optional(),
  colorDonts: z.array(z.string()).optional(),
  primaryFontName: z.string().optional(),
  primaryFontUrl: z.string().optional(),
  additionalFonts: z.array(z.string()).optional(),
  typeScale: z.any().optional(),
  // contentGuidelines / writingGuidelines / examplePhrases verhuisd naar
  // BrandVoiceguide (ADR 2026-05-15) — PATCH gaat nu via /api/brandvoiceguide.
  photographyStyle: z.any().optional(),
  photographyGuidelines: z.array(z.string()).optional(),
  illustrationGuidelines: z.array(z.string()).optional(),
  imageryDonts: z.array(z.string()).optional(),
  brandImages: z.any().optional(),
  graphicElements: graphicElementsSchema,
  graphicElementsDonts: z.array(z.string()).optional(),
  patternsTextures: patternsTexturesSchema,
  iconographyStyle: iconographyStyleSchema,
  iconographyDonts: z.array(z.string()).optional(),
  gradientsEffects: z.array(gradientDefinitionSchema).nullable().optional(),
  layoutPrinciples: layoutPrinciplesSchema,
  // Semantic tokens overrides — alleen `overrides` key wordt gemerged met
  // de resolver output. UI PATCH'et `{semanticTokens: {overrides: {...}}}`
  // en we behouden `resolved`/`diagnostics` uit de laatste analyzer-run.
  semanticTokens: z.any().optional(),
  // Rendering-profielen (verbeterplan fase B). De analyzer schrijft deze bij
  // elke scrape, maar respecteert de bijbehorende `*Override`-vlag. Die vlag
  // had tot nu toe geen enkele schrijver — de "override-bescherming" waar de
  // analyze-routes naar verwijzen was daarmee een no-op. Wie een profiel via
  // deze route zet, claimt het: we stempelen de vlag hieronder mee.
  buttonProfile: z.any().optional(),
  typographyProfile: z.any().optional(),
  spacingProfile: z.any().optional(),
  elevationProfile: z.any().optional(),
  radiusProfile: z.any().optional(),
  motionProfile: z.any().optional(),
});

/** Profielveld → de vlag die de analyzer ervan weghoudt bij een re-scrape. */
const PROFILE_OVERRIDE_FLAG = {
  buttonProfile: "buttonProfileOverride",
  typographyProfile: "typographyProfileOverride",
  spacingProfile: "spacingProfileOverride",
  elevationProfile: "elevationProfileOverride",
  radiusProfile: "radiusProfileOverride",
  motionProfile: "motionProfileOverride",
} as const;

export async function PATCH(request: NextRequest) {
  try {
    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Convert null → Prisma.JsonNull for nullable JSON fields
    const NULLABLE_JSON_FIELDS = [
      "typeScale", "photographyStyle", "brandImages",
      "graphicElements", "patternsTextures", "iconographyStyle", "gradientsEffects", "layoutPrinciples",
      "semanticTokens",
      "buttonProfile", "typographyProfile", "spacingProfile",
      "elevationProfile", "radiusProfile", "motionProfile",
    ] as const;
    const data: Record<string, unknown> = { ...parsed.data };
    for (const key of NULLABLE_JSON_FIELDS) {
      if (key in data && data[key] === null) {
        data[key] = Prisma.JsonNull;
      }
    }

    // Een handmatig gezet profiel claimt zichzelf: zonder deze stempel schrijft
    // de volgende analyse er gewoon overheen. Een expliciete `null` (= "wis
    // mijn override, laat de scraper het weer bepalen") laat de vlag los.
    for (const [field, flag] of Object.entries(PROFILE_OVERRIDE_FLAG)) {
      if (field in parsed.data) {
        data[flag] = parsed.data[field as keyof typeof parsed.data] !== null;
      }
    }

    // Zelfde principe voor de gecureerde lijsten (logoDonts, colorDonts, …) en
    // het typografieprofiel. Die hebben geen eigen vlag, dus houden we de
    // geclaimde veldnamen bij; `writeResultToDb` slaat ze over bij een
    // re-analyse. Een veld leegmaken geeft het terug aan de scraper.
    const currentClaims = await prisma.brandStyleguide.findUnique({
      where: { workspaceId },
      select: { userEditedFields: true },
    });
    if (currentClaims) {
      data.userEditedFields = applyFieldClaims(currentClaims.userEditedFields, parsed.data);
    }

    // Merge semantic tokens overrides into existing resolved snapshot zodat
    // we resolved/diagnostics niet kwijtraken wanneer de UI alleen een override
    // PATCH'et. Verwacht format uit UI: { semanticTokens: { overrides: {...} } }.
    if (data.semanticTokens && typeof data.semanticTokens === 'object') {
      const incoming = data.semanticTokens as { overrides?: unknown; resolved?: unknown };
      const existing = await prisma.brandStyleguide.findUnique({
        where: { workspaceId },
        select: { semanticTokens: true },
      });
      const existingTokens = (existing?.semanticTokens ?? {}) as Record<string, unknown>;
      data.semanticTokens = {
        ...existingTokens,
        ...(incoming.resolved ? { resolved: incoming.resolved } : {}),
        overrides: incoming.overrides ?? (existingTokens.overrides ?? {}),
      };
    }

    const styleguide = await prisma.brandStyleguide.update({
      where: { workspaceId },
      data,
      include: {
        colors: { orderBy: { sortOrder: "asc" } },
        logos: { orderBy: { sortOrder: "asc" } },
        fonts: { orderBy: [{ role: "asc" }, { sortOrder: "asc" }] },
        components: { orderBy: [{ type: "asc" }, { sortOrder: "asc" }] },
        reviews: true,
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
        lockedBy: { select: { id: true, name: true } },
      },
    });

    // Ontbrak hier als enige van alle brandstyle-mutatieroutes; nu deze route
    // ook de rendering-profielen en de veld-claims schrijft, serveerden de
    // AI-paden tot een minuut lang de oude merkdata.
    invalidateCache(cacheKeys.prefixes.brandstyle(workspaceId));
    invalidateCache(cacheKeys.prefixes.dashboard(workspaceId));
    return NextResponse.json({ styleguide });
  } catch (error) {
    console.error("[PATCH /api/brandstyle]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
