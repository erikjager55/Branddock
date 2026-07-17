// =============================================================
// Headless deliverable-read — de inhoud van een content-item als één
// workspace-gescopede aanroep ("merken zijn taal"-batch, vervolg op
// ADR 2026-07-17-public-brand-api).
//
// Gedeeld door de MCP-tool get_deliverable_content en GET /api/v1/deliverable:
// titel/type/status + alle componenten (tekst, image-URL, video-URL,
// variant-info) gesorteerd op order, plus de recentste F-VAL-score
// (ContentFidelityScore via de laatste ContentVersion-keten). Read-only en
// gratis — inhoud kennen van je eigen items kost niets.
// =============================================================

import { prisma } from '@/lib/prisma';

export interface DeliverableContentComponent {
  id: string;
  componentType: string;
  groupType: string;
  groupIndex: number;
  order: number;
  status: string;
  /** Pure tekstinhoud (bij image-/video-componenten is dit de gebruikte prompt). */
  text: string | null;
  imageUrl: string | null;
  videoUrl: string | null;
  isSelected: boolean;
  variantGroup: string | null;
  variantIndex: number;
}

export interface DeliverableContent {
  deliverableId: string;
  campaignId: string;
  title: string;
  contentType: string;
  status: string;
  approvalStatus: string;
  /** Recentste F-VAL-composietscore (0-100); null wanneer nog nooit gescoord. */
  fidelityScore: number | null;
  fidelityThresholdMet: boolean | null;
  components: DeliverableContentComponent[];
}

export type DeliverableContentResult =
  | { ok: true; deliverable: DeliverableContent }
  | { ok: false; code: 'NOT_FOUND'; error: string };

/**
 * Haalt de volledige inhoud van een deliverable op, workspace-gescoped (een
 * id uit een andere workspace gedraagt zich als onbestaand — geen leakage).
 */
export async function getDeliverableContent(
  workspaceId: string,
  deliverableId: string,
): Promise<DeliverableContentResult> {
  const deliverable = await prisma.deliverable.findFirst({
    where: { id: deliverableId, campaign: { workspaceId } },
    select: {
      id: true,
      campaignId: true,
      title: true,
      contentType: true,
      status: true,
      approvalStatus: true,
      components: {
        orderBy: [{ order: 'asc' }, { groupIndex: 'asc' }, { variantIndex: 'asc' }],
        select: {
          id: true,
          componentType: true,
          groupType: true,
          groupIndex: true,
          order: true,
          status: true,
          generatedContent: true,
          imageUrl: true,
          videoUrl: true,
          isSelected: true,
          variantGroup: true,
          variantIndex: true,
        },
      },
    },
  });
  if (!deliverable) {
    return { ok: false, code: 'NOT_FOUND', error: 'Deliverable not found in this workspace' };
  }

  const fidelity = await prisma.contentFidelityScore.findFirst({
    where: { contentVersion: { deliverableId: deliverable.id }, workspaceId },
    orderBy: { scoredAt: 'desc' },
    select: { compositeScore: true, thresholdMet: true },
  });

  return {
    ok: true,
    deliverable: {
      deliverableId: deliverable.id,
      campaignId: deliverable.campaignId,
      title: deliverable.title,
      contentType: deliverable.contentType,
      status: deliverable.status,
      approvalStatus: deliverable.approvalStatus,
      fidelityScore: fidelity?.compositeScore ?? null,
      fidelityThresholdMet: fidelity?.thresholdMet ?? null,
      components: deliverable.components.map((component) => ({
        id: component.id,
        componentType: component.componentType,
        groupType: component.groupType,
        groupIndex: component.groupIndex,
        order: component.order,
        status: component.status,
        text: component.generatedContent,
        imageUrl: component.imageUrl,
        videoUrl: component.videoUrl,
        isSelected: component.isSelected,
        variantGroup: component.variantGroup,
        variantIndex: component.variantIndex,
      })),
    },
  };
}
