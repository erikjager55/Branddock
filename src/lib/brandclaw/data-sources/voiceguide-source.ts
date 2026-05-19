// =============================================================
// Brandclaw — BrandVoiceguide source-accessor (ADR 2026-05-08).
//
// Queryt drift in BrandVoiceguide via ResourceVersion-historie (type
// VOICEGUIDE). Returns versie-rijen binnen time-window + huidige
// voiceguide-state als baseline voor diff-detectie door de agent.
//
// Voor 'voice_drift' dimensie: agent vergelijkt snapshot.payload.current
// met snapshot.payload.versions[N].snapshot om changes in wordsWeUse /
// wordsWeAvoid / antiPatterns te detecteren tussen runs.
//
// Materializeert één DataSnapshot per query (workspace-level, niet
// per versie) omdat de hele drift-context als geheel relevant is —
// snapshotting per versie zou redundant zijn.
// =============================================================

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  BrandclawSourceType,
  DataSourceAccessor,
  DataSourceQueryInput,
  DataSourceQueryResult,
} from "./types";
import { getRegistryForTests } from "./index";

const SOURCE_TYPE: BrandclawSourceType = "voiceguide";

interface VoiceguideVersionEntry {
  versionId: string;
  version: number;
  changeType: string;
  changeNote: string | null;
  /** Volledig snapshot van voiceguide-state op deze versie (uit ResourceVersion.snapshot). */
  snapshot: unknown;
  createdAt: string;
}

interface VoiceguideSnapshotPayload {
  voiceguideId: string | null;
  /** Huidige live state (excl. embedding-velden — agent niet relevant). */
  current: {
    voiceDescription: string | null;
    toneDimensions: unknown;
    wordsWeUse: string[];
    wordsWeAvoid: string[];
    antiPatterns: string[];
    contentGuidelines: string[];
    writingGuidelines: string[];
    contentLocale: string | null;
    updatedAt: string;
  } | null;
  /** Versies binnen time-window, oudste eerst zodat diff-walk natuurlijk loopt. */
  versions: VoiceguideVersionEntry[];
}

class VoiceguideSource implements DataSourceAccessor<VoiceguideSnapshotPayload> {
  readonly sourceType: BrandclawSourceType = SOURCE_TYPE;

  async query(
    input: DataSourceQueryInput,
  ): Promise<DataSourceQueryResult<VoiceguideSnapshotPayload>> {
    const { workspaceId, window } = input;

    // 2026-05-19: voiceguide-primary + legacy BrandPersonality fallback voor
    // unmigrated workspaces. Strategy Analyst data-source moest anders een
    // 'no-voiceguide' snapshot opslaan ondanks dat de workspace wel
    // brand-voice signalen had in de legacy frameworkData structuur.
    const [voiceguide, versions, personalityAsset] = await Promise.all([
      prisma.brandVoiceguide.findUnique({
        where: { workspaceId },
        select: {
          id: true,
          voiceDescription: true,
          toneDimensions: true,
          wordsWeUse: true,
          wordsWeAvoid: true,
          antiPatterns: true,
          contentGuidelines: true,
          writingGuidelines: true,
          contentLocale: true,
          updatedAt: true,
        },
      }),
      prisma.resourceVersion.findMany({
        where: {
          workspaceId,
          resourceType: "VOICEGUIDE",
          ...window.toWhere("createdAt"),
        },
        select: {
          id: true,
          version: true,
          changeType: true,
          changeNote: true,
          snapshot: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      }),
      prisma.brandAsset.findFirst({
        where: { workspaceId, frameworkType: 'BRAND_PERSONALITY' },
        select: { frameworkData: true, updatedAt: true },
      }),
    ]);

    // Legacy fallback: bouw voiceguide-shape uit BrandPersonality.frameworkData
    // wanneer de nieuwe voiceguide-rij ontbreekt of leeg is. Gebruikt zelfde
    // veld-namen waar mogelijk; values zijn defensive-cast naar verwachte types.
    const personalityData = (personalityAsset?.frameworkData ?? null) as
      | Record<string, unknown>
      | null;
    const legacyVoiceShape = personalityData
      ? {
          voiceDescription:
            typeof personalityData.brandVoiceDescription === 'string'
              ? personalityData.brandVoiceDescription
              : typeof personalityData.voiceDescription === 'string'
                ? personalityData.voiceDescription
                : null,
          wordsWeUse: Array.isArray(personalityData.wordsWeUse)
            ? (personalityData.wordsWeUse as unknown[]).filter((v): v is string => typeof v === 'string')
            : [],
          wordsWeAvoid: Array.isArray(personalityData.wordsWeAvoid)
            ? (personalityData.wordsWeAvoid as unknown[]).filter((v): v is string => typeof v === 'string')
            : [],
          contentGuidelines: Array.isArray(personalityData.contentGuidelines)
            ? (personalityData.contentGuidelines as unknown[]).filter((v): v is string => typeof v === 'string')
            : [],
          writingGuidelines: Array.isArray(personalityData.writingGuidelines)
            ? (personalityData.writingGuidelines as unknown[]).filter((v): v is string => typeof v === 'string')
            : [],
        }
      : null;
    const hasLegacyVoiceData =
      legacyVoiceShape !== null &&
      (legacyVoiceShape.voiceDescription !== null ||
        legacyVoiceShape.wordsWeUse.length > 0 ||
        legacyVoiceShape.contentGuidelines.length > 0);

    const payload: VoiceguideSnapshotPayload = {
      voiceguideId: voiceguide?.id ?? null,
      current: voiceguide
        ? {
            voiceDescription: voiceguide.voiceDescription,
            toneDimensions: voiceguide.toneDimensions,
            wordsWeUse: voiceguide.wordsWeUse,
            wordsWeAvoid: voiceguide.wordsWeAvoid,
            antiPatterns: voiceguide.antiPatterns,
            contentGuidelines: voiceguide.contentGuidelines,
            writingGuidelines: voiceguide.writingGuidelines,
            contentLocale: voiceguide.contentLocale,
            updatedAt: voiceguide.updatedAt.toISOString(),
          }
        : hasLegacyVoiceData
          ? {
              voiceDescription: legacyVoiceShape!.voiceDescription,
              toneDimensions: null,
              wordsWeUse: legacyVoiceShape!.wordsWeUse,
              wordsWeAvoid: legacyVoiceShape!.wordsWeAvoid,
              antiPatterns: [],
              contentGuidelines: legacyVoiceShape!.contentGuidelines,
              writingGuidelines: legacyVoiceShape!.writingGuidelines,
              contentLocale: null,
              updatedAt: (personalityAsset?.updatedAt ?? new Date()).toISOString(),
            }
          : null,
      versions: versions.map((v) => ({
        versionId: v.id,
        version: v.version,
        changeType: v.changeType,
        changeNote: v.changeNote,
        snapshot: v.snapshot,
        createdAt: v.createdAt.toISOString(),
      })),
    };

    // Eén workspace-level snapshot — de hele drift-context is één
    // logische unit. SourceId = voiceguide-id of 'no-voiceguide' fallback
    // zodat indexering werkt zelfs voor workspaces zonder voiceguide-rij.
    const snapshotedAt = new Date();
    const snapshotIds: string[] = [];
    const hasContent =
      payload.current !== null || payload.versions.length > 0;
    if (hasContent) {
      const snap = await prisma.dataSnapshot.create({
        data: {
          workspaceId,
          sourceType: SOURCE_TYPE,
          sourceId: payload.voiceguideId ?? "no-voiceguide",
          payload: payload as unknown as Prisma.InputJsonValue,
          snapshotAt: snapshotedAt,
        },
        select: { id: true },
      });
      snapshotIds.push(snap.id);
    }

    return {
      rows: hasContent ? [payload] : [],
      snapshotIds,
      meta: {
        sourceType: SOURCE_TYPE,
        windowLabel: window.label,
        rowCount: hasContent ? 1 : 0,
        snapshotedAt,
      },
    };
  }
}

getRegistryForTests().register(new VoiceguideSource());

export { VoiceguideSource };
