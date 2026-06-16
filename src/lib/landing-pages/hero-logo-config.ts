/**
 * W5 logo L-Fase 3 (plan §5) — opt-in workspace-toggle voor de hero-logo-
 * overlay. Default UIT: het échte logo wordt alleen post-gen op de hero
 * gestempeld wanneer de workspace dit expliciet aanzet (beslispunt 4: eerst
 * L-Fase 1+2 meten, dán de overlay aanzetten).
 *
 * Opgeslagen als WorkspaceAiConfig-row met featureKey `hero-logo-overlay`
 * waarvan het model-veld de waarde 'on'|'off' draagt — exact het patroon van
 * resolveFeatureCandidateCount (feature-image-config.ts), geen schema-migratie.
 */
import { prisma } from "@/lib/prisma";

export const HERO_LOGO_OVERLAY_KEY = "hero-logo-overlay";

/** True wanneer de workspace de hero-logo-overlay heeft aangezet (opt-in). */
export async function resolveHeroLogoOverlayEnabled(workspaceId: string): Promise<boolean> {
  try {
    const row = await prisma.workspaceAiConfig.findUnique({
      where: { workspaceId_featureKey: { workspaceId, featureKey: HERO_LOGO_OVERLAY_KEY } },
      select: { model: true },
    });
    return row?.model === "on";
  } catch (err) {
    console.warn(
      "[hero-logo-config] overlay-toggle lookup faalde — default uit:",
      err instanceof Error ? err.message : err,
    );
    return false;
  }
}

/** Zet de hero-logo-overlay aan/uit voor een workspace (upsert). */
export async function setHeroLogoOverlayEnabled(
  workspaceId: string,
  enabled: boolean,
): Promise<void> {
  await prisma.workspaceAiConfig.upsert({
    where: { workspaceId_featureKey: { workspaceId, featureKey: HERO_LOGO_OVERLAY_KEY } },
    // provider is een NOT NULL-kolom; 'system' markeert een tuning-knop-row
    // (geen echte AI-provider), consistent met de candidate-count-knop.
    create: { workspaceId, featureKey: HERO_LOGO_OVERLAY_KEY, provider: "system", model: enabled ? "on" : "off" },
    update: { model: enabled ? "on" : "off" },
  });
}
