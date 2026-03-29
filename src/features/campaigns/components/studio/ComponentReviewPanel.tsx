'use client';

import React, { useState } from 'react';
import { Check, RotateCcw, Users, MessageSquare, History, Sparkles, Loader2 } from 'lucide-react';
import { Button, Badge } from '@/components/shared';
import { useComponentPipelineStore } from '@/lib/studio/stores/component-pipeline-store';
import { ComponentRatingCard } from './ComponentRatingCard';
import type { PersonaReaction } from '@/types/studio';

export function ComponentReviewPanel() {
  const components = useComponentPipelineStore((s) => s.components);
  const activeComponentId = useComponentPipelineStore((s) => s.activeComponentId);
  const approveComponent = useComponentPipelineStore((s) => s.approveComponent);
  const requestRevision = useComponentPipelineStore((s) => s.requestRevision);
  const isSimulatingPersonas = useComponentPipelineStore((s) => s.isSimulatingPersonas);
  const setIsSimulatingPersonas = useComponentPipelineStore((s) => s.setIsSimulatingPersonas);

  const [revisionFeedback, setRevisionFeedback] = useState('');

  const activeComponent = components.find((c) => c.id === activeComponentId);

  if (!activeComponent) {
    return (
      <div className="p-6 text-center">
        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
        <p className="text-sm text-gray-400">Select a component to review</p>
      </div>
    );
  }

  const hasContent = !!activeComponent.generatedContent || !!activeComponent.imageUrl;
  const isApproved = activeComponent.status === 'APPROVED';
  const canReview = hasContent && !isApproved && activeComponent.status !== 'GENERATING';

  const handleApprove = () => {
    approveComponent(activeComponent.id);
  };

  const handleRequestRevision = () => {
    if (revisionFeedback.trim()) {
      requestRevision(activeComponent.id, revisionFeedback.trim());
      setRevisionFeedback('');
    }
  };

  const handleSimulatePersonas = () => {
    setIsSimulatingPersonas(true);
  };

  const personaReactions: PersonaReaction[] = activeComponent.personaReactions ?? [];

  const STATUS_COLORS: Record<string, string> = {
    PENDING: 'text-gray-500',
    GENERATING: 'text-blue-500',
    GENERATED: 'text-blue-600',
    NEEDS_REVISION: 'text-amber-500',
    APPROVED: 'text-emerald-600',
    SKIPPED: 'text-gray-400',
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Component Status */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Component Review</h3>
          <Badge
            variant={isApproved ? 'success' : activeComponent.status === 'NEEDS_REVISION' ? 'warning' : 'default'}
            size="sm"
          >
            {activeComponent.status.replace(/_/g, ' ')}
          </Badge>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          {activeComponent.label} &bull; v{activeComponent.version}
        </p>
      </div>

      {/* Rating */}
      {canReview && (
        <div className="px-4 py-4 border-b border-gray-200">
          <ComponentRatingCard
            componentId={activeComponent.id}
            rating={activeComponent.rating}
            feedbackText={activeComponent.feedbackText}
          />
        </div>
      )}

      {/* Persona Reactions */}
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Users className="h-4 w-4 text-gray-500" />
            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Persona Reactions
            </h4>
          </div>
          {hasContent && !isApproved && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSimulatePersonas}
              disabled={isSimulatingPersonas}
            >
              {isSimulatingPersonas ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Simulate
                </>
              )}
            </Button>
          )}
        </div>

        {personaReactions.length > 0 ? (
          <div className="space-y-3">
            {personaReactions.map((reaction) => (
              <div key={reaction.personaId} className="p-3 rounded-lg bg-gray-50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-900">
                    {reaction.personaName}
                  </span>
                  <Badge
                    variant={
                      reaction.sentiment === 'positive' ? 'success' :
                      reaction.sentiment === 'negative' ? 'danger' : 'default'
                    }
                    size="sm"
                  >
                    {reaction.relevanceScore}%
                  </Badge>
                </div>
                <p className="text-xs text-gray-600 italic">&ldquo;{reaction.reaction}&rdquo;</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            {hasContent
              ? 'Click "Simulate" to see how personas would react to this content.'
              : 'Generate content first to simulate persona reactions.'}
          </p>
        )}
      </div>

      {/* Revision Feedback */}
      {canReview && (
        <div className="px-4 py-4 border-b border-gray-200">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">
            Revision Feedback
          </label>
          <textarea
            value={revisionFeedback}
            onChange={(e) => setRevisionFeedback(e.target.value)}
            rows={3}
            placeholder="What should be improved..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
        </div>
      )}

      {/* Actions */}
      {canReview && (
        <div className="px-4 py-4 space-y-2">
          <Button
            variant="primary"
            size="sm"
            className="w-full"
            onClick={handleApprove}
          >
            <Check className="h-4 w-4 mr-1.5" />
            Approve Component
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleRequestRevision}
            disabled={!revisionFeedback.trim()}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Request Revision
          </Button>
        </div>
      )}

      {/* Version History */}
      <div className="px-4 py-4">
        <div className="flex items-center gap-1.5 mb-2">
          <History className="h-4 w-4 text-gray-400" />
          <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Versions
          </h4>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium">v{activeComponent.version}</span>
          <span>&bull;</span>
          <span>{activeComponent.generatedAt ? new Date(activeComponent.generatedAt).toLocaleString() : 'Not generated'}</span>
        </div>
      </div>
    </div>
  );
}
