'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Zap, Check, CalendarPlus, CalendarDays, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useFormat } from '@/lib/ui-i18n/format';
import { useApproveDeliverable, useUpdateDeliverableSchedule } from '../../hooks';
import {
  nextBusinessDay10am,
  splitDateForInput,
} from '../../lib/publish-scheduler';

interface QuickPublishMenuProps {
  deliverableId: string;
  campaignId: string;
  /** Pre-computed "same as last" datetime from parent; null when no prior item is scheduled. */
  sameAsLastDate: Date | null;
  /** Visual variant — Grid uses a full labeled button, List packs into a 20px icon slot. */
  variant?: 'button' | 'icon';
}

/**
 * Sprint A · Step 3 — Publish shortcut popover. Visible on cards whose
 * deliverable has generated content but is not yet publish-ready. Gives
 * the user three one-click paths to APPROVED state:
 *
 *   • Approve now              — no schedule
 *   • Approve + Schedule...    — inline date/time picker (default 10:00 next business day)
 *   • Schedule same as last    — approve + schedule at (most-recent scheduled + 1 day)
 *
 * Uses the existing approval + schedule endpoints; no new backend work.
 */
export function QuickPublishMenu({
  deliverableId,
  campaignId,
  sameAsLastDate,
  variant = 'button',
}: QuickPublishMenuProps) {
  const { t } = useTranslation('campaigns-content-library');
  const { formatDate } = useFormat();
  const [open, setOpen] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const defaultDate = useMemo(() => nextBusinessDay10am(), []);
  const [dateStr, setDateStr] = useState(() => splitDateForInput(defaultDate).date);
  const [timeStr, setTimeStr] = useState(() => splitDateForInput(defaultDate).time);

  const wrapRef = useRef<HTMLDivElement>(null);

  const approve = useApproveDeliverable();
  const schedule = useUpdateDeliverableSchedule();
  const isLoading = approve.isPending || schedule.isPending;

  // Click-outside + Escape close the popover. Skip when a mutation is
  // in-flight — user expects the menu to stay open until we're done.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (isLoading) return;
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowPicker(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (isLoading) return;
      if (e.key === 'Escape') {
        setOpen(false);
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, isLoading]);

  const handleApproveNow = () => {
    approve.mutate(
      { deliverableId, campaignId },
      { onSuccess: () => { setOpen(false); setShowPicker(false); } },
    );
  };

  const chainSchedule = (isoDate: string) => {
    // Approve first (state machine: DRAFT → APPROVED), then schedule.
    // Running them sequentially keeps the approval audit log clean and
    // means a schedule PATCH never lands on a non-approved deliverable.
    approve.mutate(
      { deliverableId, campaignId },
      {
        onSuccess: () => {
          schedule.mutate(
            { deliverableId, campaignId, scheduledPublishDate: isoDate },
            { onSuccess: () => { setOpen(false); setShowPicker(false); } },
          );
        },
      },
    );
  };

  const handleSameAsLast = () => {
    if (!sameAsLastDate) return;
    chainSchedule(sameAsLastDate.toISOString());
  };

  const handleApproveAndSchedule = () => {
    // Build an ISO string from the local-time picker values. `new Date(yyyy-mm-ddThh:mm)`
    // parses in local TZ when there's no Z or offset — which is what users expect.
    const picked = new Date(`${dateStr}T${timeStr}`);
    if (Number.isNaN(picked.getTime())) return;
    chainSchedule(picked.toISOString());
  };

  const triggerClassName =
    variant === 'button'
      ? 'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors'
      : 'p-1 rounded hover:bg-gray-100 transition-colors text-gray-500 hover:text-gray-700 disabled:opacity-50';

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        disabled={isLoading}
        className={triggerClassName}
        title={t('quickPublish.trigger')}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Zap className="w-3.5 h-3.5" />
        )}
        {variant === 'button' && <span>{t('quickPublish.trigger')}</span>}
      </button>

      {open && (
        <div
          role="menu"
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 bottom-full mb-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
          style={{ minWidth: 260 }}
        >
          {!showPicker ? (
            <>
              <button
                type="button"
                role="menuitem"
                onClick={handleApproveNow}
                disabled={isLoading}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>{t('quickPublish.approveNow')}</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => setShowPicker(true)}
                disabled={isLoading}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
              >
                <CalendarPlus className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <span>{t('quickPublish.approveSchedule')}</span>
              </button>
              {sameAsLastDate && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={handleSameAsLast}
                  disabled={isLoading}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2 border-t border-gray-100 disabled:opacity-50"
                >
                  <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1">{t('quickPublish.sameAsLast')}</span>
                  <span className="text-[10px] text-gray-400 flex-shrink-0">
                    {formatDate(sameAsLastDate)}
                  </span>
                </button>
              )}
            </>
          ) : (
            <div className="p-3 space-y-2">
              <div className="text-xs font-medium text-gray-600">{t('quickPublish.schedulePublish')}</div>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateStr}
                  onChange={(e) => setDateStr(e.target.value)}
                  className="flex-1 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
                <input
                  type="time"
                  value={timeStr}
                  onChange={(e) => setTimeStr(e.target.value)}
                  className="w-24 text-xs px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400"
                />
              </div>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowPicker(false)}
                  disabled={isLoading}
                  className="flex-1 text-xs px-2 py-1.5 rounded hover:bg-gray-50 text-gray-600 disabled:opacity-50"
                >
                  {t('quickPublish.back')}
                </button>
                <button
                  type="button"
                  onClick={handleApproveAndSchedule}
                  disabled={isLoading}
                  className="flex-1 inline-flex items-center justify-center gap-1 text-xs px-2 py-1.5 rounded bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
                  {t('quickPublish.approveScheduleShort')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
