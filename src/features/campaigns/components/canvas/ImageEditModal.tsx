'use client';

// =============================================================
// F39 (audit 2026-05-13): ImageEditModal — Nano Banana targeted edit
// =============================================================
// Natural-language image-edit via Nano Banana Pro. User selecteert een
// bestaande image-variant en geeft een instructie ("blur background",
// "remove coffee cup", "make lighting warmer"). Backend route doet de
// edit-call; output vervangt de variant of komt als extra variant
// naast.
// =============================================================

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2, Loader2, X } from 'lucide-react';
import { Modal } from '@/components/shared';

interface ImageEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  deliverableId: string | null;
  imageUrl: string | null;
  /** Suggesties als chip-rij in de modal — common edit-patterns. */
  exampleInstructions?: string[];
  /** Callback wanneer edit successed met nieuwe image-URL. */
  onEdited: (editedImageUrl: string) => void;
}

const DEFAULT_EXAMPLES = [
  'Blur the background',
  'Make it lighter / warmer',
  'Remove the text elements',
  'Show more detail in the foreground',
  'Change the time of day to evening',
];

export function ImageEditModal({
  isOpen,
  onClose,
  deliverableId,
  imageUrl,
  exampleInstructions = DEFAULT_EXAMPLES,
  onEdited,
}: ImageEditModalProps) {
  const { t } = useTranslation('campaigns-canvas');
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setInstruction('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!deliverableId || !imageUrl || !instruction.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/studio/${deliverableId}/edit-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          instruction: instruction.trim(),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? t('imageEdit.errFailedStatus', { status: res.status }));
      }
      const data = (await res.json()) as { editedImageUrl: string };
      onEdited(data.editedImageUrl);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('imageEdit.errFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('imageEdit.title')} size="md">
      <div className="space-y-4">
        {imageUrl && (
          <div className="relative rounded-lg overflow-hidden border border-gray-200">
            <img src={imageUrl} alt={t('imageEdit.altToEdit')} className="w-full aspect-video object-cover" />
            <div className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2 py-1 text-[11px] font-medium text-purple-700 shadow-sm">
              <Wand2 className="h-3 w-3" />
              {t('imageEdit.poweredBy')}
            </div>
          </div>
        )}

        <div>
          <label htmlFor="edit-instruction" className="block text-xs font-medium text-gray-700 mb-1.5">
            {t('imageEdit.question')}
          </label>
          <textarea
            id="edit-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={t('imageEdit.placeholder')}
            rows={3}
            className="w-full text-sm px-3 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 resize-y"
            disabled={busy}
          />
          <p className="mt-1 text-[11px] text-gray-500">
            {t('imageEdit.hint')}
          </p>
        </div>

        {exampleInstructions.length > 0 && (
          <div>
            <p className="text-[11px] font-medium text-gray-500 uppercase tracking-wider mb-1.5">
              {t('imageEdit.examples')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {exampleInstructions.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setInstruction(ex)}
                  disabled={busy}
                  className="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-50 border border-gray-200 text-[11px] text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800 flex items-start gap-2">
            <X className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <span className="text-[11px] text-gray-500">{t('imageEdit.cost')}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="text-xs font-medium px-3 py-1.5 rounded-md text-gray-700 hover:bg-gray-100 disabled:opacity-50"
            >
              {t('actions.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || !instruction.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {busy ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  {t('imageEdit.editing')}
                </>
              ) : (
                <>
                  <Wand2 className="h-3.5 w-3.5" />
                  {t('actions.apply')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
