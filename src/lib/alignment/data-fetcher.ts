import { prisma } from "@/lib/prisma";
import type { AlignmentModule } from "@/types/brand-alignment";

// =============================================================
// Per-module data fetchers for AI alignment analysis
// =============================================================

export type ModuleData = {
  moduleName: AlignmentModule;
  items: Record<string, unknown>[];
  itemCount: number;
};

/**
 * Fetch module-specific data from Prisma for AI analysis.
 */
export async function fetchModuleData(
  workspaceId: string,
  module: AlignmentModule
): Promise<ModuleData> {
  switch (module) {
    case "BRAND_FOUNDATION":
      return fetchBrandFoundation(workspaceId);
    case "BUSINESS_STRATEGY":
      return fetchBusinessStrategy(workspaceId);
    case "BRANDSTYLE":
      return fetchBrandstyle(workspaceId);
    case "PERSONAS":
      return fetchPersonas(workspaceId);
    case "PRODUCTS_SERVICES":
      return fetchProducts(workspaceId);
    case "MARKET_INSIGHTS":
      return fetchMarketInsights(workspaceId);
    default:
      return { moduleName: module, items: [], itemCount: 0 };
  }
}

/**
 * Fetch all 6 modules in parallel.
 */
export async function fetchAllModuleData(
  workspaceId: string
): Promise<ModuleData[]> {
  const modules: AlignmentModule[] = [
    "BRAND_FOUNDATION",
    "BUSINESS_STRATEGY",
    "BRANDSTYLE",
    "PERSONAS",
    "PRODUCTS_SERVICES",
    "MARKET_INSIGHTS",
  ];
  return Promise.all(modules.map((m) => fetchModuleData(workspaceId, m)));
}

/**
 * Fetch a single entity by type and ID (for fix generation).
 */
export async function fetchEntityById(
  entityType: string | null,
  entityId: string | null
): Promise<Record<string, unknown> | null> {
  if (!entityType || !entityId) return null;

  try {
    switch (entityType) {
      case "BrandAsset": {
        const asset = await prisma.brandAsset.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            slug: true,
            content: true,
            description: true,
            frameworkType: true,
            frameworkData: true,
            category: true,
          },
        });
        return asset as Record<string, unknown> | null;
      }
      case "BusinessStrategy": {
        const strategy = await prisma.businessStrategy.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            description: true,
            vision: true,
            rationale: true,
            keyAssumptions: true,
            type: true,
            status: true,
            objectives: {
              select: { title: true, status: true },
              take: 10,
            },
          },
        });
        return strategy as Record<string, unknown> | null;
      }
      case "Brandstyle": {
        // Try direct ID lookup first
        const styleguide = await prisma.brandStyleguide.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            contentGuidelines: true,
            writingGuidelines: true,
            primaryFontName: true,
            colors: { select: { name: true, hex: true, category: true } },
          },
        });
        return styleguide as Record<string, unknown> | null;
      }
      case "Persona": {
        const persona = await prisma.persona.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            tagline: true,
            age: true,
            gender: true,
            location: true,
            occupation: true,
            personalityType: true,
            coreValues: true,
            interests: true,
            goals: true,
            motivations: true,
            frustrations: true,
            behaviors: true,
            preferredChannels: true,
          },
        });
        return persona as Record<string, unknown> | null;
      }
      case "Product": {
        const product = await prisma.product.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            features: true,
            benefits: true,
            useCases: true,
            pricingModel: true,
            pricingDetails: true,
          },
        });
        return product as Record<string, unknown> | null;
      }
      case "DetectedTrend": {
        const trend = await prisma.detectedTrend.findUnique({
          where: { id: entityId },
          select: {
            id: true,
            title: true,
            description: true,
            category: true,
            relevanceScore: true,
            aiAnalysis: true,
            whyNow: true,
            direction: true,
            impactLevel: true,
          },
        });
        return trend as Record<string, unknown> | null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// ─── Per-module fetchers ─────────────────────────────────────

async function fetchBrandFoundation(
  workspaceId: string
): Promise<ModuleData> {
  const assets = await prisma.brandAsset.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      slug: true,
      content: true,
      description: true,
      frameworkType: true,
      frameworkData: true,
      category: true,
    },
  });
  return {
    moduleName: "BRAND_FOUNDATION",
    items: assets as unknown as Record<string, unknown>[],
    itemCount: assets.length,
  };
}

async function fetchBusinessStrategy(
  workspaceId: string
): Promise<ModuleData> {
  const strategies = await prisma.businessStrategy.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      description: true,
      vision: true,
      rationale: true,
      keyAssumptions: true,
      type: true,
      status: true,
      progressPercentage: true,
      objectives: {
        select: {
          title: true,
          status: true,
          keyResults: { select: { description: true, status: true } },
        },
        take: 20,
      },
      focusAreas: {
        select: { name: true },
        take: 10,
      },
    },
  });
  return {
    moduleName: "BUSINESS_STRATEGY",
    items: strategies as unknown as Record<string, unknown>[],
    itemCount: strategies.length,
  };
}

async function fetchBrandstyle(workspaceId: string): Promise<ModuleData> {
  const styleguide = await prisma.brandStyleguide.findFirst({
    where: { workspaceId },
    select: {
      id: true,
      contentGuidelines: true,
      writingGuidelines: true,
      primaryFontName: true,
      typeScale: true,
      photographyStyle: true,
      graphicElements: true,
      colors: {
        select: { name: true, hex: true, category: true },
      },
    },
  });
  return {
    moduleName: "BRANDSTYLE",
    items: styleguide
      ? [styleguide as unknown as Record<string, unknown>]
      : [],
    itemCount: styleguide ? 1 : 0,
  };
}

async function fetchPersonas(workspaceId: string): Promise<ModuleData> {
  const personas = await prisma.persona.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      tagline: true,
      age: true,
      gender: true,
      location: true,
      occupation: true,
      personalityType: true,
      coreValues: true,
      interests: true,
      goals: true,
      motivations: true,
      frustrations: true,
      behaviors: true,
      preferredChannels: true,
    },
  });
  return {
    moduleName: "PERSONAS",
    items: personas as unknown as Record<string, unknown>[],
    itemCount: personas.length,
  };
}

async function fetchProducts(workspaceId: string): Promise<ModuleData> {
  const products = await prisma.product.findMany({
    where: { workspaceId },
    select: {
      id: true,
      name: true,
      description: true,
      category: true,
      features: true,
      benefits: true,
      useCases: true,
      pricingModel: true,
      pricingDetails: true,
    },
  });
  return {
    moduleName: "PRODUCTS_SERVICES",
    items: products as unknown as Record<string, unknown>[],
    itemCount: products.length,
  };
}

async function fetchMarketInsights(
  workspaceId: string
): Promise<ModuleData> {
  const trends = await prisma.detectedTrend.findMany({
    where: { workspaceId, isActivated: true },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      relevanceScore: true,
      aiAnalysis: true,
      direction: true,
      impactLevel: true,
      whyNow: true,
    },
  });
  return {
    moduleName: "MARKET_INSIGHTS",
    items: trends as unknown as Record<string, unknown>[],
    itemCount: trends.length,
  };
}
