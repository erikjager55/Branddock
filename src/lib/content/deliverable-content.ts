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
//
// `components` alléén was niet genoeg: voor de 11 keten-B-types (PUCK-webpages
// + long-form GEO) is die lijst STRUCTUREEL leeg, dus een externe agent kreeg
// een volle pillar-page als leeg item terug. Daarom gaat de tekst er ook als
// `text` uit, via de accessor die alle drie de ketens kent
// (tasks/content-chain-accessor.md #23).
// =============================================================

import { prisma } from '@/lib/prisma';
import { resolveDeliverableContent } from '@/lib/content/resolve-deliverable-content';

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
  /**
   * De platte tekst van het item, ongeacht in welke keten die woont — voor de 11
   * keten-B-types (PUCK-webpages + long-form GEO) staat die NIET in `components`.
   * `null` bij een leeg item én bij `awaiting-choice`: een nog niet gekozen versie
   * geven we niet uit, want de gebruiker kan hem nog weggooien.
   */
  text: string | null;
  /**
   * `ready` — er is tekst · `awaiting-choice` — versies gegenereerd, gebruiker koos
   * er nog geen · `empty` — niets gegenereerd. Zonder dit onderscheid leest een
   * externe agent "geen tekst" als "leeg item" en genereert hij eroverheen.
   */
  contentState: 'ready' | 'awaiting-choice' | 'empty';
  /** Aantal versies dat op een keuze wacht; 0 buiten `awaiting-choice`. */
  variantOptionCount: number;
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
      // Keten B en C: zonder deze twee velden ziet de accessor alleen componenten,
      // en die zijn voor de 11 keten-B-types structureel leeg.
      settings: true,
      generatedText: true,
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

  // Alle drie de content-ketens via één deur (tasks/content-chain-accessor.md #23).
  // Voorheen gaf deze reader alleen `components` terug, en die zijn voor de 11
  // keten-B-types structureel leeg — de MCP-tool en GET /api/v1/deliverable
  // meldden dus een lege pillar-page aan externe agents.
  const resolved = resolveDeliverableContent(deliverable);

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
      text: resolved.kind === 'components' || resolved.kind === 'structured' ? resolved.text : null,
      contentState:
        resolved.kind === 'structured-unchosen'
          ? 'awaiting-choice'
          : resolved.kind === 'empty'
            ? 'empty'
            : 'ready',
      variantOptionCount: resolved.kind === 'structured-unchosen' ? resolved.optionCount : 0,
    },
  };
}
