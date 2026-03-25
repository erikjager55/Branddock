'use client';

import { KnowledgeContextSelectorModal, type SelectedContextEntry } from '@/components/shared/KnowledgeContextSelectorModal';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCanvasContextItems } from '../../hooks/useCanvasContextItems';
import { useWorkspace } from '@/hooks/use-workspace';

/**
 * Canvas knowledge context selector.
 * Thin wrapper around the shared KnowledgeContextSelectorModal
 * that reads/writes context items to the canvas Zustand store.
 */
export function CanvasContextSelector() {
  const { workspaceId } = useWorkspace();
  const isOpen = useCanvasStore((s) => s.contextSelectorOpen);
  const existingItems = useCanvasStore((s) => s.additionalContextItems);

  const { data, isLoading } = useCanvasContextItems(isOpen ? (workspaceId ?? undefined) : undefined);

  const handleApply = (items: Map<string, SelectedContextEntry>) => {
    useCanvasStore.getState().setAdditionalContextItems(items);
    useCanvasStore.getState().toggleContextSelector();
  };

  const handleClose = () => {
    useCanvasStore.getState().toggleContextSelector();
  };

  return (
    <KnowledgeContextSelectorModal
      isOpen={isOpen}
      onClose={handleClose}
      onApply={handleApply}
      groups={data?.groups}
      isLoading={isLoading}
      initialSelected={existingItems.size > 0 ? existingItems : undefined}
    />
  );
}
