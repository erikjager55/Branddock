'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '../../../stores/useCanvasStore';
import { PublishSuggestion } from '../previews/PublishSuggestion';
import { STUDIO } from '@/lib/constants/design-tokens';
import { Calendar, Clock, CheckCircle2, Send, AlertCircle } from 'lucide-react';

interface Step4TimelineProps {
  deliverableId: string;
}

export function Step4Timeline({ deliverableId }: Step4TimelineProps) {
  const scheduledDate = useCanvasStore((s) => s.scheduledDate);
  const scheduledTime = useCanvasStore((s) => s.scheduledTime);
  const isTimeBound = useCanvasStore((s) => s.isTimeBound);
  const publishSuggestion = useCanvasStore((s) => s.publishSuggestion);
  const approvalStatus = useCanvasStore((s) => s.approvalStatus);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => { abortControllerRef.current?.abort(); };
  }, []);

  const handleSchedule = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const store = useCanvasStore.getState();
    const date = store.scheduledDate;
    const time = store.scheduledTime;

    // Build scheduled datetime
    let scheduledAt: string | null = null;
    if (date) {
      scheduledAt = time ? `${date}T${time}:00` : `${date}T09:00:00`;
    }

    try {
      // Save scheduled date to deliverable
      const patchRes = await fetch(`/api/campaigns/deliverables/${deliverableId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledPublishDate: scheduledAt }),
        signal: controller.signal,
      });
      if (!patchRes.ok) throw new Error('Failed to save scheduled date');

      // Trigger publish
      const pubRes = await fetch(`/api/studio/${deliverableId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledPublishDate: scheduledAt }),
        signal: controller.signal,
      });
      if (!pubRes.ok) throw new Error('Failed to publish');

      store.setApprovalState({
        approvalStatus: 'PUBLISHED',
        publishedAt: new Date().toISOString(),
      });

      store.setStepSummary(4, {
        label: scheduledAt
          ? `Scheduled: ${formatDate(date!)}${time ? ` at ${time}` : ''}`
          : 'Ready for publishing',
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[Step4Timeline] Failed to schedule:', err);
      setError('Failed to schedule publication. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [deliverableId]);

  const handleReadyToPublish = useCallback(async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(`/api/studio/${deliverableId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Failed to approve');

      const store = useCanvasStore.getState();
      store.setApprovalState({ approvalStatus: 'APPROVED' });
      store.setStepSummary(4, { label: 'Ready for publishing' });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[Step4Timeline] Failed to approve:', err);
      setError('Failed to approve content. Please try again.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [deliverableId]);

  const isPublished = approvalStatus === 'PUBLISHED';
  const isApproved = approvalStatus === 'APPROVED';

  return (
    <div className="space-y-6">
      {/* Error feedback */}
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700" role="alert">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Success state */}
      {(isPublished || isApproved) && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-800">
              {isPublished ? 'Content scheduled for publishing' : 'Content approved and ready'}
            </p>
            {scheduledDate && (
              <p className="text-xs text-emerald-600 mt-0.5">
                {formatDate(scheduledDate)}{scheduledTime ? ` at ${scheduledTime}` : ''}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Publish suggestion from AI */}
      {!isPublished && !isApproved && (
        <PublishSuggestion suggestion={publishSuggestion} isGenerating={false} />
      )}

      {/* Time-bound scheduling */}
      {!isPublished && !isApproved && isTimeBound && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-gray-700">Schedule Publication</h3>

          <div className="grid grid-cols-2 gap-4">
            {/* Date picker */}
            <div>
              <label htmlFor="schedule-date" className="block text-xs font-medium text-gray-600 mb-1">
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                Date
              </label>
              <input
                id="schedule-date"
                type="date"
                value={scheduledDate ?? ''}
                onChange={(e) => useCanvasStore.getState().setScheduledDate(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            {/* Time picker */}
            <div>
              <label htmlFor="schedule-time" className="block text-xs font-medium text-gray-600 mb-1">
                <Clock className="h-3.5 w-3.5 inline mr-1" />
                Time
              </label>
              <input
                id="schedule-time"
                type="time"
                value={scheduledTime ?? ''}
                onChange={(e) => useCanvasStore.getState().setScheduledTime(e.target.value || null)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Schedule button */}
          <button
            type="button"
            onClick={handleSchedule}
            disabled={!scheduledDate || isSubmitting}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Send className="h-4 w-4" />
            {scheduledDate ? 'Schedule Publication' : 'Select a date to schedule'}
          </button>
        </div>
      )}

      {/* Not time-bound — ready to publish */}
      {!isPublished && !isApproved && !isTimeBound && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This content is ready for publishing. You can set it as ready or schedule it for a specific date.
          </p>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => useCanvasStore.getState().setIsTimeBound(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-gray-700 font-medium border border-gray-200 hover:bg-gray-50"
            >
              <Calendar className="h-4 w-4" />
              Schedule for Later
            </button>

            <button
              type="button"
              onClick={handleReadyToPublish}
              disabled={isSubmitting}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-medium ${STUDIO.generateButton} disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <CheckCircle2 className="h-4 w-4" />
              Ready for Publishing
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr + 'T00:00:00');
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}
