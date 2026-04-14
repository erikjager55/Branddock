'use client';

import { Check, X } from 'lucide-react';

export interface StyleGuidelinesEditorProps {
  /** "Do's" text — what MUST appear in generated images */
  dos: string;
  /** "Don'ts" text — what to AVOID in generated images */
  donts: string;
  onDosChange: (value: string) => void;
  onDontsChange: (value: string) => void;
  /** Optional placeholder override for the Do's textarea */
  dosPlaceholder?: string;
  /** Optional placeholder override for the Don'ts textarea */
  dontsPlaceholder?: string;
}

/**
 * Do's / Don'ts editor for AI image generation.
 * Shared between AI Trainer (reference generation) and AI Studio (ad-hoc generation).
 */
export function StyleGuidelinesEditor({
  dos,
  donts,
  onDosChange,
  onDontsChange,
  dosPlaceholder = 'e.g. Natural lighting, warm tones, eye contact with camera, professional attire...',
  dontsPlaceholder = "e.g. No sunglasses, no hats, no busy backgrounds, no text overlays...",
}: StyleGuidelinesEditorProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-gray-900">Style Guidelines</h3>
      <p className="mt-1 text-sm text-gray-500">
        Describe what the generated images should and should not include.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Do&apos;s
          </label>
          <textarea
            value={dos}
            onChange={(e) => onDosChange(e.target.value)}
            placeholder={dosPlaceholder}
            rows={3}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
          />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-700">
            <X className="h-3.5 w-3.5 text-red-500" />
            Don&apos;ts
          </label>
          <textarea
            value={donts}
            onChange={(e) => onDontsChange(e.target.value)}
            placeholder={dontsPlaceholder}
            rows={3}
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-400 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
