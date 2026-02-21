import { prisma } from "@/lib/prisma";

interface ContextResult {
  name: string;
  contextData: Record<string, unknown>;
}

/**
 * Fetches context data for a given source type and ID.
 * Returns a snapshot of relevant fields to inject into persona chat context.
 */
export async function fetchContextData(
  sourceType: string,
  sourceId: string,
  workspaceId: string,
): Promise<ContextResult | null> {
  switch (sourceType) {
    case "brand_asset": {
      const asset = await prisma.brandAsset.findFirst({
        where: { id: sourceId, workspaceId },
        select: {
          name: true,
          description: true,
          category: true,
          status: true,
        },
      });
      if (!asset) return null;
      return {
        name: asset.name,
        contextData: {
          description: asset.description,
          category: asset.category,
          status: asset.status,
        },
      };
    }

    case "product": {
      const product = await prisma.product.findFirst({
        where: { id: sourceId, workspaceId },
        select: {
          name: true,
          description: true,
          category: true,
          pricingModel: true,
          features: true,
        },
      });
      if (!product) return null;
      return {
        name: product.name,
        contextData: {
          description: product.description,
          category: product.category,
          pricingModel: product.pricingModel,
          features: product.features,
        },
      };
    }

    case "market_insight": {
      const insight = await prisma.marketInsight.findFirst({
        where: { id: sourceId, workspaceId },
        select: {
          title: true,
          description: true,
          impactLevel: true,
          scope: true,
          relevanceScore: true,
        },
      });
      if (!insight) return null;
      return {
        name: insight.title,
        contextData: {
          description: insight.description,
          impactLevel: insight.impactLevel,
          scope: insight.scope,
          relevanceScore: insight.relevanceScore,
        },
      };
    }

    case "knowledge_resource": {
      const resource = await prisma.knowledgeResource.findFirst({
        where: { id: sourceId, workspaceId },
        select: {
          title: true,
          description: true,
          type: true,
          category: true,
        },
      });
      if (!resource) return null;
      return {
        name: resource.title,
        contextData: {
          description: resource.description,
          type: resource.type,
          category: resource.category,
        },
      };
    }

    case "campaign": {
      const campaign = await prisma.campaign.findFirst({
        where: { id: sourceId, workspaceId },
        select: {
          title: true,
          description: true,
          type: true,
          status: true,
          confidence: true,
        },
      });
      if (!campaign) return null;
      return {
        name: campaign.title,
        contextData: {
          description: campaign.description,
          type: campaign.type,
          status: campaign.status,
          confidence: campaign.confidence,
        },
      };
    }

    case "deliverable": {
      const deliverable = await prisma.deliverable.findFirst({
        where: { id: sourceId },
        include: {
          campaign: {
            select: { workspaceId: true },
          },
        },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== workspaceId) return null;
      return {
        name: deliverable.title,
        contextData: {
          contentType: deliverable.contentType,
          status: deliverable.status,
          generatedText: deliverable.generatedText
            ? deliverable.generatedText.slice(0, 500)
            : null,
        },
      };
    }

    case "strategic_implication": {
      // sourceId format: "personaId:index"
      const [implPersonaId, implIndexStr] = sourceId.split(":");
      const implIndex = parseInt(implIndexStr, 10);
      const implPersona = await prisma.persona.findFirst({
        where: { id: implPersonaId, workspaceId },
        select: { name: true, strategicImplications: true },
      });
      if (!implPersona?.strategicImplications) return null;
      try {
        const implications = JSON.parse(implPersona.strategicImplications);
        if (!Array.isArray(implications) || !implications[implIndex]) return null;
        const impl = implications[implIndex];
        return {
          name: `${impl.category}: ${impl.title}`,
          contextData: {
            category: impl.category,
            title: impl.title,
            description: impl.description,
            priority: impl.priority,
            personaName: implPersona.name,
          },
        };
      } catch {
        return null;
      }
    }

    case "brandstyle": {
      const styleguide = await prisma.brandStyleguide.findFirst({
        where: { id: sourceId, workspaceId },
        select: {
          contentGuidelines: true,
          photographyStyle: true,
          primaryFontName: true,
        },
      });
      if (!styleguide) return null;
      return {
        name: "Brand Styleguide",
        contextData: {
          contentGuidelines: styleguide.contentGuidelines,
          photographyStyle: styleguide.photographyStyle,
          primaryFont: styleguide.primaryFontName,
        },
      };
    }

    default:
      return null;
  }
}
