'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('personas');
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
            <h2 className="text-base font-semibold text-gray-900">{t('deleteDialog.title')}</h2>
            <p className="text-sm text-gray-500">{t('deleteDialog.cannotUndo')}</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-600 mb-4">
          <Trans
            i18nKey="deleteDialog.confirm"
            ns="personas"
            values={{ name: personaName }}
            components={{ b: <span className="font-semibold text-gray-900" /> }}
          />
        </p>

        {/* Confirm input */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            <Trans
              i18nKey="deleteDialog.typeToConfirm"
              ns="personas"
              components={{ code: <span className="font-mono font-bold text-red-600" /> }}
            />
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
          {isConfirmed ? (
            <button
              onClick={onConfirm}
              style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
              className="w-full px-4 py-2.5 text-sm font-semibold rounded-lg transition-opacity hover:opacity-90"
            >
              {isDeleting ? t('deleteDialog.deleting') : t('deleteDialog.title')}
            </button>
          ) : (
            <div
              style={{ backgroundColor: '#f3f4f6', color: '#9ca3af', borderColor: '#e5e7eb' }}
              className="w-full px-4 py-2.5 text-sm font-medium text-center rounded-lg border cursor-not-allowed select-none"
            >
              {t('deleteDialog.title')}
            </div>
          )}
          <button
            onClick={onCancel}
            style={{ borderColor: '#e5e7eb' }}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors border"
          >
            {t('actions.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
