'use client';

import React from 'react';
import { Wand2, Sparkles } from 'lucide-react';
import type { InsertImageTabProps } from './types';

/**
 * Generate Image tab — Fase 2 stub.
 *
 * Fase 2b will replace this with an embedded version of the AI Studio
 * generator (Choice screen → Use Trained Model | Generate Image), and
 * wire its onSuccess callback to forward the new MediaAsset URL/id to
 * onSelected so the modal closes and the canvas store updates.
 *
 * For now this tab shows a placeholder so the modal shell is testable
 * end-to-end with the other 3 tabs (Library / URL / Stock Photos).
 */
export function GenerateImageTab(_props: InsertImageTabProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 mb-3">
        <Wand2 className="h-7 w-7 text-purple-600" />
      </div>
      <h3 className="text-base font-semibold text-gray-900 mb-1">
        AI Image Generation
      </h3>
      <p className="max-w-sm text-sm text-gray-500 mb-4">
        Use a fine-tuned brand model or pick a fal.ai provider with brand
        context tags to generate a fresh hero image.
      </p>
      <div className="inline-flex items-center gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800">
        <Sparkles className="h-3.5 w-3.5" />
        Coming in the next update — for now, generate via AI Studio and pick from the Library tab.
      </div>
    </div>
  );
}
