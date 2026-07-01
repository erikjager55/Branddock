'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, ChevronDown, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '@/lib/ui-i18n/format';
import { Button } from '@/components/shared';
import { getDeliverableTypeById } from '../../lib/deliverable-types';
import type { DeliverableResponse } from '@/types/campaign';

interface RepeatSplitButtonProps {
  /** All deliverables in this campaign. The component filters to COMPLETED
   *  internally so the parent doesn't need to pre-sort. */
  deliverables: DeliverableResponse[];
  disabled?: boolean;
  isPending?: boolean;
  /** Called with the chosen source deliverable. Parent handles creation +
   *  navigation; this component is purely a menu trigger. */
  onRepeat: (source: DeliverableResponse) => void;
}

type LatestByType = Array<{
  contentType: string;
  typeName: string;
  deliverable: DeliverableResponse;
}>;

/**
 * Sprint A · Step 2 — split-button refresh.
 *
 * Main click: repeats the single most recent COMPLETED deliverable (matches
 * the original Sprint A behavior — one click, no decision).
 *
 * Chevron click: opens a dropdown listing the most recent COMPLETED of each
 * distinct contentType in the campaign. Lets the user ask for another of a
 * specific type even when a different type is the overall newest.
 *
 * Auto-inherit (Sprint A · Step 1) takes over once the new deliverable's
 * Canvas opens — this button doesn't explicitly copy settings, it just
 * creates a fresh record with the right contentType.
 */
export function RepeatSplitButton({
  deliverables,
  disabled,
  isPending,
  onRepeat,
}: RepeatSplitButtonProps) {
  const { t } = useTranslation('campaigns-content-library');
  const { formatDate } = useFormat();
  const [menuOpen, setMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // COMPLETED deliverables sorted newest first — this is the source of
  // truth for both the primary button (first entry) and the dropdown.
  const completed = useMemo(
    () =>
      deliverables
        .filter((d) => d.status === 'COMPLETED')
        .sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
        ),
    [deliverables],
  );

  // One entry per unique contentType, using the most recent COMPLETED of
  // that type. Preserves the same newest-first ordering as `completed`
  // because we iterate in order and skip seen types.
  const latestByType: LatestByType = useMemo(() => {
    const seen = new Set<string>();
    const out: LatestByType = [];
    for (const d of completed) {
      if (seen.has(d.contentType)) continue;
      seen.add(d.contentType);
      out.push({
        contentType: d.contentType,
        typeName:
          getDeliverableTypeById(d.contentType)?.name ?? d.contentType,
        deliverable: d,
      });
    }
    return out;
  }, [completed]);

  const latestOverall = completed[0] ?? null;

  // Close menu on outside click / Escape — same pattern used across other
  // popovers in the app for consistency.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (!latestOverall) return null;

  const handlePrimary = () => {
    onRepeat(latestOverall);
  };

  const handleTypeChoice = (source: DeliverableResponse) => {
    setMenuOpen(false);
    onRepeat(source);
  };

  const latestTypeName =
    getDeliverableTypeById(latestOverall.contentType)?.name ??
    latestOverall.contentType;

  // Only show the chevron if there are ≥2 distinct types — otherwise the
  // dropdown would just echo the primary button, which is noise.
  const showChevron = latestByType.length > 1;

  return (
    <div ref={wrapRef} className="relative inline-flex">
      <Button
        variant="secondary"
        size="sm"
        icon={isPending ? undefined : Copy}
        onClick={handlePrimary}
        disabled={disabled || isPending}
        title={t('repeat.duplicateTitle', { type: latestTypeName })}
        className={showChevron ? 'rounded-r-none' : undefined}
      >
        {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
        {t('repeat.repeatLast')}
      </Button>
      {showChevron && (
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          disabled={disabled || isPending}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={t('repeat.specificType')}
          title={t('repeat.specificType')}
          className="inline-flex items-center px-1.5 rounded-r-md border border-l-0 border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      )}

      {menuOpen && showChevron && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{ minWidth: 240 }}
        >
          <div className="px-3 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-100">
            {t('repeat.repeatByType')}
          </div>
          <ul className="py-1 max-h-64 overflow-y-auto">
            {latestByType.map(({ contentType, typeName, deliverable }) => (
              <li key={contentType}>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => handleTypeChoice(deliverable)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 truncate">{typeName}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatDate(deliverable.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
