// ============================================================
// FidelityConfig — workspace-level fidelity scoring + Human Voice toggle
//
// Eén record per workspace (unique). Auto-aangemaakt-on-read als hij niet
// bestaat: defaults uit DEFAULT_FIDELITY_CONFIG. Geen migratie nodig
// voor bestaande workspaces — eerste read triggert creation.
// ============================================================

import { prisma } from '@/lib/prisma';
import { Prisma, type HumanVoiceMode, type FidelityConfig } from '@prisma/client';

const DEFAULT_RUBRIC_WEIGHTS = {
  strategicAnchoring: 0.2,
  audienceFit: 0.15,
  brandRecognition: 0.15,
  antiPattern: 0.3,
  coherence: 0.1,
  concreteness: 0.1,
} as const;

export const DEFAULT_FIDELITY_CONFIG = {
  styleWeight: 0.35,
  judgeWeight: 0.45,
  ruleWeight: 0.2,
  humanVoiceMode: 'BASELINE' as HumanVoiceMode,
  aiLeaningThreshold: 30,
  disabledContentTypes: [] as string[],
};

/**
 * Get-or-create the FidelityConfig for a workspace.
 *
 * Idempotent: returns existing config if present, otherwise creates one
 * with sane defaults. Fail-soft: if DB unreachable, returns default
 * config (canvas-orchestrator should not crash on FidelityConfig issues).
 */
export async function getOrCreateFidelityConfig(workspaceId: string): Promise<FidelityConfig> {
  try {
    const existing = await prisma.fidelityConfig.findUnique({ where: { workspaceId } });
    if (existing) return existing;

    return await prisma.fidelityConfig.create({
      data: {
        workspaceId,
        ...DEFAULT_FIDELITY_CONFIG,
        rubricWeights: DEFAULT_RUBRIC_WEIGHTS as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    // Fail-soft: log but return defaults so generation pipeline continues
    console.warn(
      `[fidelity-config] Could not get/create config for workspace ${workspaceId}:`,
      (err as Error).message,
    );
    return {
      id: 'default',
      workspaceId,
      createdAt: new Date(),
      updatedAt: new Date(),
      rubricWeights: DEFAULT_RUBRIC_WEIGHTS as Prisma.JsonValue,
      ...DEFAULT_FIDELITY_CONFIG,
    } as FidelityConfig;
  }
}

/**
 * Lightweight resolver: return only the humanVoiceMode for a workspace.
 * Used by canvas-orchestrator to decide HVD injection without fetching
 * the full config record.
 */
export async function resolveHumanVoiceMode(workspaceId: string): Promise<HumanVoiceMode> {
  try {
    const config = await prisma.fidelityConfig.findUnique({
      where: { workspaceId },
      select: { humanVoiceMode: true },
    });
    return config?.humanVoiceMode ?? DEFAULT_FIDELITY_CONFIG.humanVoiceMode;
  } catch {
    return DEFAULT_FIDELITY_CONFIG.humanVoiceMode;
  }
}
