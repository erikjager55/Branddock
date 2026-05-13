'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { setHeroImage as persistHeroImage } from '../../api/canvas.api';
import { canvasKeys } from '../../hooks/canvas.hooks';
import { ImageSourcePanel } from './ImageSourcePanel';
import type { VisualBriefSource } from '@/lib/ai/canvas-context';
import type { InsertImageSelection } from './insert-image/types';

/**
 * Modal opened from Step 3 (Medium) of the Content Canvas.
 *
 * F35 (audit 2026-05-13): refactor naar ImageSourcePanel met alle 8
 * VisualBriefSource opties. Default-tab volgt visualBrief.source uit
 * Step 1 (smart-default). Modal-pakket dat tab-switching state houdt
 * en heroImage persistence afhandelt.
 */
export function InsertImageModal() {
  const isOpen = useCanvasStore((s) => s.insertImageModalOpen);
  const setOpen = useCanvasStore((s) => s.setInsertImageModalOpen);
  const setHeroImage = useCanvasStore((s) => s.setHeroImage);
  const deliverableId = useCanvasStore((s) => s.deliverableId);
  const visualBrief = useCanvasStore((s) => s.visualBrief);
  const queryClient = useQueryClient();

  // F35: default-tab = visualBrief.source (Step 1 intent). User kan in
  // modal switchen zonder visualBrief te wijzigen — alleen lokale state.
  const [activeSource, setActiveSource] = useState<VisualBriefSource>(
    visualBrief.source ?? 'generate',
  );

  // Reset active source elke keer dat modal opent zodat user altijd start
  // bij de Step 1-keuze (niet bij de vorige modal-sessie).
  React.useEffect(() => {
    if (isOpen) {
      setActiveSource(visualBrief.source ?? 'generate');
    }
  }, [isOpen, visualBrief.source]);

  const handleSelected = async (selection: InsertImageSelection) => {
    setHeroImage({
      url: selection.url,
      mediaAssetId: selection.mediaAssetId,
      alt: selection.alt,
    });
    setOpen(false);

    if (deliverableId) {
      try {
        const imageSource =
          activeSource === 'library' || activeSource === 'upload'
            ? 'library'
            : activeSource === 'url'
              ? 'url-import'
              : activeSource === 'stock'
                ? 'stock'
                : 'ai-generated';
        await persistHeroImage(deliverableId, {
          imageUrl: selection.url,
          imageSource,
          mediaAssetId: selection.mediaAssetId,
          alt: selection.alt ?? null,
        });
        queryClient.invalidateQueries({ queryKey: canvasKeys.components(deliverableId) });
      } catch (err) {
        console.error('[InsertImageModal] Failed to persist hero image:', err);
      }
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={() => setOpen(false)} title="Insert Image" size="lg">
      <ImageSourcePanel
        deliverableId={deliverableId}
        source={activeSource}
        onSourceChange={setActiveSource}
        variant="modal"
        onSelected={handleSelected}
        onCancel={() => setOpen(false)}
      />
    </Modal>
  );
}
