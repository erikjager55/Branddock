'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/shared';

interface DeleteConfirmModalProps {
  insightTitle: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ insightTitle, isDeleting, onConfirm, onCancel }: DeleteConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[400px] rounded-xl bg-white p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Delete this insight?</h2>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          Are you sure you want to delete <strong>{insightTitle}</strong>? This action cannot be undone.
        </p>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} isLoading={isDeleting}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
