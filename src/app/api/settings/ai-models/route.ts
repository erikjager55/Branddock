import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession, resolveWorkspaceId } from "@/lib/auth-server";
import {
  AI_FEATURES,
  AVAILABLE_MODELS,
  type AiFeatureKey,
} from "@/lib/ai/feature-models";

// Valid feature keys for validation
const VALID_FEATURE_KEYS = new Set(AI_FEATURES.map((f) => f.key));

// ─── GET /api/settings/ai-models ─────────────────────────────
// Returns all feature configs merged with defaults
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // Fetch all workspace overrides
    const overrides = await prisma.workspaceAiConfig.findMany({
      where: { workspaceId },
    });
    const overrideMap = new Map(overrides.map((o) => [o.featureKey, o]));

    // Merge defaults with overrides
    const features = AI_FEATURES.map((feature) => {
      const override = overrideMap.get(feature.key);
      return {
        key: feature.key,
        label: feature.label,
        description: feature.description,
        category: feature.category,
        supportedProviders: feature.supportedProviders,
        defaultProvider: feature.defaultProvider,
        defaultModel: feature.defaultModel,
        // Active config (override or default)
        provider: override?.provider ?? feature.defaultProvider,
        model: override?.model ?? feature.defaultModel,
        isCustomized: !!override,
      };
    });

    return NextResponse.json({ features, availableModels: AVAILABLE_MODELS });
  } catch (error) {
    console.error("[GET /api/settings/ai-models]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── PATCH /api/settings/ai-models ───────────────────────────
// Update a single feature's provider/model
const patchSchema = z.object({
  featureKey: z.string(),
  provider: z.string(),
  model: z.string(),
});

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await resolveWorkspaceId();
    if (!workspaceId) {
      return NextResponse.json({ error: "No workspace found" }, { status: 403 });
    }

    // Only owners and admins can change AI model settings
    const activeOrgId = (session.session as Record<string, unknown>).activeOrganizationId as string | undefined;
    if (activeOrgId) {
      const membership = await prisma.organizationMember.findUnique({
        where: { userId_organizationId: { userId: session.user.id, organizationId: activeOrgId } },
      });
      if (!membership || !["owner", "admin"].includes(membership.role)) {
        return NextResponse.json({ error: "Only owners and admins can change AI model settings" }, { status: 403 });
      }
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { featureKey, provider, model } = parsed.data;

    // Validate feature key
    if (!VALID_FEATURE_KEYS.has(featureKey as AiFeatureKey)) {
      return NextResponse.json({ error: `Unknown feature key: ${featureKey}` }, { status: 400 });
    }

    const feature = AI_FEATURES.find((f) => f.key === featureKey)!;

    // Validate provider is supported for this feature
    if (!feature.supportedProviders.includes(provider as typeof feature.supportedProviders[number])) {
      return NextResponse.json(
        { error: `Provider "${provider}" is not supported for "${featureKey}"` },
        { status: 400 },
      );
    }

    // Validate model exists for this provider
    const modelExists = AVAILABLE_MODELS.some((m) => m.id === model && m.provider === provider);
    if (!modelExists) {
      return NextResponse.json(
        { error: `Model "${model}" is not a valid ${provider} model` },
        { status: 400 },
      );
    }

    // Check if this is a reset to default
    const isDefault = provider === feature.defaultProvider && model === feature.defaultModel;

    if (isDefault) {
      // Remove override — use defaults
      await prisma.workspaceAiConfig.deleteMany({
        where: { workspaceId, featureKey },
      });
    } else {
      // Upsert override
      await prisma.workspaceAiConfig.upsert({
        where: { workspaceId_featureKey: { workspaceId, featureKey } },
        create: { workspaceId, featureKey, provider, model },
        update: { provider, model },
      });
    }

    return NextResponse.json({
      featureKey,
      provider: isDefault ? feature.defaultProvider : provider,
      model: isDefault ? feature.defaultModel : model,
      isCustomized: !isDefault,
    });
  } catch (error) {
    console.error("[PATCH /api/settings/ai-models]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
