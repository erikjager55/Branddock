'use client';

import React, { useState, useCallback } from 'react';
import { Check, X, Pencil, Wrench } from 'lucide-react';
import { useClawStore } from '@/stores/useClawStore';
import type { MutationProposal, ClawMessage } from '@/lib/claw/claw.types';

export function MutationConfirmCard() {
  const { pendingMutation, setPendingMutation, activeConversationId, addMessage } = useClawStore();
  const [isEditing, setIsEditing] = useState(false);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = useCallback(async (approved: boolean) => {
    if (!pendingMutation || !activeConversationId || isSubmitting) return;
    setIsSubmitting(true);

    try {
      const body: Record<string, unknown> = {
        conversationId: activeConversationId,
        toolCallId: pendingMutation.toolCallId,
        approved,
      };

      // If user edited values, send the edited params
      if (approved && Object.keys(editedValues).length > 0) {
        body.editedParams = editedValues;
      }

      const res = await fetch('/api/claw/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // Add result message to chat
      const resultMessage: ClawMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: approved
          ? `Done — ${pendingMutation.description.toLowerCase()}.`
          : 'Change skipped.',
        toolResults: data.result ? [data.result] : undefined,
        createdAt: new Date().toISOString(),
      };
      addMessage(resultMessage);
    } catch (err) {
      console.error('Confirm error:', err);
    } finally {
      setPendingMutation(null);
      setIsSubmitting(false);
      setIsEditing(false);
      setEditedValues({});
    }
  }, [pendingMutation, activeConversationId, editedValues, isSubmitting, setPendingMutation, addMessage]);

  if (!pendingMutation) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 mb-4">
      <div className="rounded-xl border border-amber-200 bg-amber-50/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-amber-200/60">
          <Wrench size={14} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-900">Proposed Change</span>
          {pendingMutation.entityName && (
            <span className="text-xs text-amber-600 ml-auto">
              {pendingMutation.entityType}: {pendingMutation.entityName}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="px-4 py-3">
          <p className="text-sm text-gray-700 mb-3">{pendingMutation.description}</p>

          {/* Changes preview */}
          {pendingMutation.changes && pendingMutation.changes.length > 0 && (
            <div className="space-y-3">
              {pendingMutation.changes.map((change, i) => (
                <ChangeRow
                  key={i}
                  field={change.label}
                  currentValue={change.currentValue}
                  proposedValue={
                    isEditing && editedValues[change.field] !== undefined
                      ? editedValues[change.field]
                      : change.proposedValue
                  }
                  isEditing={isEditing}
                  onEdit={(value) =>
                    setEditedValues((prev) => ({ ...prev, [change.field]: value }))
                  }
                />
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-amber-200/60 bg-amber-50/30">
          <button
            onClick={() => handleConfirm(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors"
          >
            <Check size={14} />
            {isEditing ? 'Apply with edits' : 'Apply'}
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Pencil size={14} />
            Edit
          </button>
          <button
            onClick={() => handleConfirm(false)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors ml-auto"
          >
            <X size={14} />
            Skip
          </button>
        </div>

        {/* Info footer */}
        <div className="px-4 py-2 bg-amber-50/20 text-xs text-amber-600">
          This will update the data and create a version snapshot.
        </div>
      </div>
    </div>
  );
}

function ChangeRow({
  field,
  currentValue,
  proposedValue,
  isEditing,
  onEdit,
}: {
  field: string;
  currentValue: string | null;
  proposedValue: string;
  isEditing: boolean;
  onEdit: (value: string) => void;
}) {
  const truncate = (text: string, max: number) =>
    text.length > max ? text.slice(0, max) + '...' : text;

  return (
    <div className="text-xs">
      <div className="font-medium text-gray-600 mb-1">{field}</div>

      {currentValue && (
        <div className="px-3 py-2 rounded-md bg-red-50/60 text-gray-500 mb-1.5 line-through">
          {truncate(currentValue, 200)}
        </div>
      )}

      {isEditing ? (
        <textarea
          value={proposedValue}
          onChange={(e) => onEdit(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-teal-300 bg-white text-gray-800 text-xs resize-y focus:outline-none focus:ring-1 focus:ring-teal-500"
          rows={3}
        />
      ) : (
        <div className="px-3 py-2 rounded-md bg-teal-50 text-teal-800">
          {truncate(proposedValue, 300)}
        </div>
      )}
    </div>
  );
}
