'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageCircleQuestion, Sparkles, X } from 'lucide-react';
import { openClawWithPrompt } from '../lib/open-with-prompt';

interface CanvasHelpButtonProps {
  /** Current deliverable contentType (e.g. "linkedin-post"). Used to
   *  personalize the example prompts so Claw gets specific context. */
  contentType?: string | null;
  /** Current deliverable title — included in the "about this" phrasing
   *  when present; falls back to the contentType otherwise. */
  deliverableTitle?: string | null;
}

/**
 * Sprint B · Step 3.C — floating contextual help on Canvas.
 *
 * A fixed-position "?" button in the bottom-right corner of the Canvas
 * that opens a small popover with 3 canned prompts. Each prompt, when
 * clicked, preloads the Claw input with a contentType-aware phrasing and
 * opens the overlay — so the user can get inline edits, tone changes,
 * or length rewrites without leaving the page.
 *
 * This relies on Claw's page-awareness (already wired in App.tsx via
 * `setCurrentPage`) to pick up the active deliverable as context —
 * no additional wiring needed here.
 */
export function CanvasHelpButton({
  contentType,
  deliverableTitle,
}: CanvasHelpButtonProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click / Escape so it behaves like other
  // popovers in the app (QuickPublishMenu, date pickers, etc.).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Use the title when we have it, fall back to a friendly form of the
  // contentType (e.g. "linkedin-post" → "linkedin post"). This shows up
  // in the popover header and makes every prompt specific enough that
  // Claw's context scope is unambiguous.
  const subject = deliverableTitle?.trim()
    ? `"${deliverableTitle.trim()}"`
    : contentType
      ? contentType.replace(/-/g, ' ')
      : 'this deliverable';

  const prompts: Array<{ label: string; prompt: string }> = [
    {
      label: 'Rewrite in a more formal tone',
      prompt: `Rewrite the selected variant of ${subject} in a more formal, professional tone. Keep the core message intact.`,
    },
    {
      label: 'Shorten it',
      prompt: `Shorten the selected variant of ${subject} by about 30%. Keep the hook and the call to action — cut supporting detail.`,
    },
    {
      label: 'Make it more direct',
      prompt: `Rewrite the selected variant of ${subject} to be more direct and punchy. Lead with the benefit, drop filler words.`,
    },
  ];

  return (
    <div ref={wrapRef} className="fixed bottom-6 right-6 z-30">
      {open && (
        <div
          role="menu"
          className="mb-3 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden"
          style={{ width: 320 }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-teal-50/40">
            <span className="text-xs font-semibold text-gray-900">
              Ask about this deliverable
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-gray-100 text-gray-400"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="p-2 space-y-1">
            {prompts.map(({ label, prompt }) => (
              <li key={label}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    openClawWithPrompt(prompt);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-md text-[13px] text-gray-700 hover:bg-teal-50 flex items-start gap-2 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5 text-teal-500 flex-shrink-0 mt-0.5" />
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500">
            Or type your own question in the assistant.
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-12 w-12 rounded-full shadow-lg flex items-center justify-center transition-colors hover:brightness-110"
        style={{ backgroundColor: open ? '#0f766e' : '#0d9488' }}
        aria-label="Ask the Brand Assistant about this deliverable"
        aria-expanded={open}
        title="Ask the Brand Assistant"
      >
        <MessageCircleQuestion className="h-6 w-6 text-white" />
      </button>
    </div>
  );
}
