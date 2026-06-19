'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  KnowledgeContextSelectorModal,
  type SelectedContextEntry,
  type InlineAddConfig,
} from '@/components/shared/KnowledgeContextSelectorModal';
import { useCanvasStore } from '../../stores/useCanvasStore';
import { useCanvasContextItems } from '../../hooks/useCanvasContextItems';
import { useWorkspace } from '@/hooks/use-workspace';
import { useCreateResource, useUploadFile } from '@/features/knowledge-library/hooks';
import { persistAdditionalContext } from '../../api/canvas.api';

// Upload route ceiling. Accept ONLY the formats whose text body is actually
// extracted into AI context (extractContent handles PDF + plain text); office
// docs/images would attach but contribute nothing to generation, so they are
// intentionally not offered here as "knowledge context" (the full Knowledge
// Library page still accepts the broader set for record-keeping).
const UPLOAD_MAX_BYTES = 20 * 1024 * 1024;
const UPLOAD_ACCEPT_EXTENSIONS = ['.pdf', '.txt', '.md', '.csv'];

/**
 * Canvas knowledge context selector.
 * Thin wrapper around the shared KnowledgeContextSelectorModal that reads/writes
 * context items to the canvas Zustand store, persists the selection on the
 * deliverable, and offers inline add (link/file) into the Knowledge Library.
 */
export function CanvasContextSelector() {
  const { workspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const isOpen = useCanvasStore((s) => s.contextSelectorOpen);
  const existingItems = useCanvasStore((s) => s.additionalContextItems);

  const { data, isLoading } = useCanvasContextItems(isOpen ? (workspaceId ?? undefined) : undefined);

  const createResource = useCreateResource();
  const uploadFile = useUploadFile();

  // After an inline add, both the Library list (['knowledge-resources'], done by
  // the hooks) AND the canvas picker (['canvas-context-items'], separate query
  // key) must refetch — otherwise the new item won't appear in this modal.
  const refreshPickerList = () => {
    queryClient.invalidateQueries({ queryKey: ['canvas-context-items'] });
  };

  const inlineAdd: InlineAddConfig = {
    onAddLink: async ({ title, url, description }) => {
      const created = await createResource.mutateAsync({
        title,
        author: 'Manual',
        category: 'Content',
        type: 'WEBSITE',
        url,
        description,
      });
      refreshPickerList();
      return { sourceType: 'knowledge_resource', sourceId: created.id, title: created.title };
    },
    onAddFile: async (file) => {
      const created = await uploadFile.mutateAsync(file);
      refreshPickerList();
      return { sourceType: 'knowledge_resource', sourceId: created.id, title: created.title };
    },
    maxFileSizeBytes: UPLOAD_MAX_BYTES,
    acceptExtensions: UPLOAD_ACCEPT_EXTENSIONS,
  };

  const handleApply = (items: Map<string, SelectedContextEntry>) => {
    useCanvasStore.getState().setAdditionalContextItems(items);
    // NOTE: do NOT toggle the selector closed here. The modal's own handleApply
    // calls resetAndClose() → onClose (handleClose, which toggles) right after
    // onApply. Toggling here too would double-toggle and re-open the modal.
    // F4: persist the selection on the deliverable so it survives reload /
    // tab-switch / server-side regeneration. Fire-and-forget — non-fatal.
    const deliverableId = useCanvasStore.getState().deliverableId;
    if (deliverableId) {
      void persistAdditionalContext(deliverableId, Array.from(items.values()));
    }
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
      initialSelected={existingItems}
      inlineAdd={inlineAdd}
    />
  );
}
