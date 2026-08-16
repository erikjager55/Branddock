import { prisma } from "@/lib/prisma";
import { getBrandLibrary } from "@/lib/brand-library";
import { getDeliverableText } from "@/lib/content/resolve-deliverable-content";

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

    case "detected_trend":
    case "market_insight": {
      const trend = await prisma.detectedTrend.findFirst({
        where: { id: sourceId, workspaceId },
        select: {
          title: true,
          description: true,
          impactLevel: true,
          scope: true,
          relevanceScore: true,
        },
      });
      if (!trend) return null;
      return {
        name: trend.title,
        contextData: {
          description: trend.description,
          impactLevel: trend.impactLevel,
          scope: trend.scope,
          relevanceScore: trend.relevanceScore,
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
          // Componenten mee: zonder deze keten leest de accessor alleen settings, en
          // dan valt de content van álle component-types weg.
          components: {
            select: {
              componentType: true,
              groupType: true,
              generatedContent: true,
              variantGroup: true,
              variantIndex: true,
              isSelected: true,
              order: true,
            },
          },
        },
      });
      if (!deliverable || deliverable.campaign.workspaceId !== workspaceId) return null;
      // Alle drie de ketens: als knowledge-source kreeg een pillar-page hiervoor
      // alleen titel + contentType mee, want zijn copy staat niet in `generatedText`.
      // De AI kreeg dus een "bron" zonder inhoud (content-chain-accessor, kruising #13).
      const deliverableText = getDeliverableText(deliverable);
      return {
        name: deliverable.title,
        contextData: {
          contentType: deliverable.contentType,
          status: deliverable.status,
          contentSnippet: deliverableText ? deliverableText.slice(0, 500) : null,
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
      // contentGuidelines verhuisd naar BrandVoiceguide (ADR 2026-05-15).
      // Styleguide levert visuele velden, voiceguide levert guidelines.
      //
      // W7.1: via de accessor, want deze context gaat rechtstreeks een prompt
      // in. Voorheen werd `photographyStyle` hier ongegate én met
      // OBSERVED:-markers doorgegeven — de imagery-review had er geen invloed
      // op. Nu levert een gesloten imagery-sectie simpelweg niets.
      const [library, voiceguide] = await Promise.all([
        getBrandLibrary(workspaceId, { view: "image" }),
        prisma.brandVoiceguide.findUnique({
          where: { workspaceId },
          select: { contentGuidelines: true },
        }),
      ]);
      if (!library.exists) return null;
      return {
        name: "Brand Styleguide",
        contextData: {
          contentGuidelines: voiceguide?.contentGuidelines ?? [],
          photographyStyle: library.sections.imagery?.photographyStyle ?? null,
          primaryFont: library.sections.typography?.primaryFontName ?? null,
        },
      };
    }

    default:
      return null;
  }
}
