'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';

interface DeletePersonaConfirmDialogProps {
  personaName: string;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeletePersonaConfirmDialog({
  personaName,
  isDeleting,
  onConfirm,
  onCancel,
}: DeletePersonaConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const isConfirmed = confirmText === 'DELETE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onCancel} />

      {/* Dialog */}
      <div className="relative w-[400px] rounded-xl bg-white p-6 shadow-xl mx-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 bg-red-100 rounded-full flex-shrink-0">
            <Trash2 className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Delete Persona</h2>
            <p className="text-sm text-gray-500">This action cannot be undone</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4">
          Are you sure you want to delete <span className="font-semibold text-gray-900">{personaName}</span>? All associated data including chat history, research, and versions will be permanently removed.
        </p>

        {/* Confirm input */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
            autoFocus
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder:text-gray-300"
          />
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={!isConfirmed || isDeleting}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDeleting ? 'Deleting...' : 'Delete Persona'}
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
