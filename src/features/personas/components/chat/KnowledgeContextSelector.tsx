'use client';

import { KnowledgeContextSelectorModal, type SelectedContextEntry } from '@/components/shared/KnowledgeContextSelectorModal';
import { useAvailableContext, useSaveContext } from '../../hooks';

const EXCLUDED_GROUPS = ['brand_asset', 'brandstyle', 'persona'];

interface KnowledgeContextSelectorProps {
  personaId: string;
  sessionId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Persona chat knowledge context selector.
 * Thin wrapper around the shared KnowledgeContextSelectorModal
 * that handles persona-specific save logic.
 */
export function KnowledgeContextSelector({
  personaId,
  sessionId,
  isOpen,
  onClose,
}: KnowledgeContextSelectorProps) {
  const { data, isLoading } = useAvailableContext(isOpen ? personaId : undefined);
  const saveContext = useSaveContext(personaId, sessionId);

  const handleApply = async (items: Map<string, SelectedContextEntry>) => {
    if (items.size === 0 || !sessionId) return;

    const contextItems = Array.from(items.values()).map(({ sourceType, sourceId }) => ({
      sourceType,
      sourceId,
    }));

    try {
      await saveContext.mutateAsync(contextItems);
      onClose();
    } catch {
      // Error handled by mutation
    }
  };

  return (
    <KnowledgeContextSelectorModal
      isOpen={isOpen}
      onClose={onClose}
      onApply={handleApply}
      groups={data?.groups}
      isLoading={isLoading}
      isPending={saveContext.isPending}
      excludedGroups={EXCLUDED_GROUPS}
    />
  );
}
