/**
 * Quality-mode-knop voor LP feature-beelden (follow-up audit §9, 2026-06-10;
 * ADR 2026-06-10-feature-visual-pipeline beslissing 6).
 *
 * Kandidaten per slot: 1 = budget-default (judge-gated retry, ~$0,53-0,79/
 * pagina), 2-3 = quality-mode (num_images=N, beste kandidaat wint via de
 * coherence-judge, runner-up dient als gratis dupe-swap). Per workspace
 * instelbaar via een WorkspaceAiConfig-row met featureKey
 * `lp-feature-image-candidates` waarvan het model-veld de count draagt
 * ('1'|'2'|'3') — bewust een raw read naast het getypte feature-models-
 * register (dat is provider/model-semantiek; dit is een tuning-knop).
 */
import { prisma } from "@/lib/prisma";

export const LP_FEATURE_IMAGE_CANDIDATES_KEY = "lp-feature-image-candidates";

export type FeatureCandidateCount = 1 | 2 | 3;

export async function resolveFeatureCandidateCount(
  workspaceId: string,
): Promise<FeatureCandidateCount> {
  try {
    const row = await prisma.workspaceAiConfig.findUnique({
      where: { workspaceId_featureKey: { workspaceId, featureKey: LP_FEATURE_IMAGE_CANDIDATES_KEY } },
      select: { model: true },
    });
    const parsed = Number.parseInt(row?.model ?? "", 10);
    if (parsed === 2 || parsed === 3) return parsed;
    return 1;
  } catch (err) {
    console.warn(
      "[feature-image-config] candidate-count lookup faalde — default 1:",
      err instanceof Error ? err.message : err,
    );
    return 1;
  }
}
