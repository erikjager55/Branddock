'use client';

import { ShieldAlert, ShieldCheck, Pencil, Trash2, Sparkles, MessageCircle, Eye, EyeOff, Copy, Download, Zap } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';

type LockEntityType = 'persona' | 'brand-asset' | 'trend-radar' | 'competitor';

interface LockConfirmDialogProps {
  isOpen: boolean;
  isLocking: boolean;
  entityName: string;
  entityType?: LockEntityType;
  onConfirm: () => void;
  onCancel: () => void;
}

function getLockBlockedItems(entityType: LockEntityType, t: TFunction) {
  if (entityType === 'trend-radar') {
    return [
      { icon: Pencil, label: t('confirmDialog.blocked.editContent') },
      { icon: Trash2, label: t('confirmDialog.blocked.deleteTrend') },
      { icon: Zap, label: t('confirmDialog.blocked.activateDismissTrend') },
    ];
  }

  const items = [
    { icon: Pencil, label: t('confirmDialog.blocked.editContent') },
  ];
  // Brand assets cannot be deleted — only show delete for other entity types
  if (entityType !== 'brand-asset') {
    items.push({ icon: Trash2, label: t('confirmDialog.blocked.deleteItem') });
  }
  items.push(
    { icon: Sparkles, label: t('confirmDialog.blocked.aiGeneration') },
    { icon: MessageCircle, label: entityType === 'brand-asset' ? t('confirmDialog.blocked.startAiExploration') : t('confirmDialog.blocked.startNewConversation') },
    { icon: Pencil, label: t('confirmDialog.blocked.startResearchMethods') },
  );
  return items;
}

function getHiddenItems(isLocking: boolean, t: TFunction) {
  const icon = isLocking ? EyeOff : Eye;
  return [
    { icon, label: t('confirmDialog.hidden.emptySections') },
    { icon, label: t('confirmDialog.hidden.aiTools') },
  ];
}

function getAlwaysAvailableItems(t: TFunction) {
  return [
    { icon: Copy, label: t('confirmDialog.alwaysAvailableItems.duplicate') },
    { icon: Download, label: t('confirmDialog.alwaysAvailableItems.export') },
    { icon: Eye, label: t('confirmDialog.alwaysAvailableItems.viewSections') },
  ];
}

export function LockConfirmDialog({
  isOpen,
  isLocking,
  entityName,
  entityType = 'persona',
  onConfirm,
  onCancel,
}: LockConfirmDialogProps) {
  const { t } = useTranslation('lock-billing');
  const blockedItems = getLockBlockedItems(entityType, t);
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    // Focus first button
    const btn = contentRef.current?.querySelector<HTMLElement>('button');
    btn?.focus();
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] p-8 bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === overlayRef.current) onCancel();
          }}
        >
          <motion.div
            ref={contentRef}
            initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.95, opacity: 0, y: 10 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            role="alertdialog"
            aria-modal="true"
            aria-label={isLocking ? t('confirmDialog.header.lockAria', { name: entityName }) : t('confirmDialog.header.unlockAria', { name: entityName })}
            className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden"
          >
            {/* Header */}
            <div className={`px-6 pt-6 pb-4 flex items-center gap-3 ${isLocking ? 'bg-amber-50/50' : 'bg-emerald-50/50'}`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isLocking ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                {isLocking ? (
                  <ShieldAlert className="w-6 h-6 text-amber-700" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-emerald-700" />
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {isLocking ? t('confirmDialog.header.lockTitle') : t('confirmDialog.header.unlockTitle')}
                </h2>
                <p className="text-sm text-gray-500">{entityName}</p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Block 1: blocked/enabled */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {isLocking ? t('confirmDialog.sections.willBeBlocked') : t('confirmDialog.sections.willBeEnabled')}
                </p>
                <div className="space-y-1.5">
                  {blockedItems.map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isLocking ? 'text-amber-500' : 'text-emerald-500'}`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Block 2: hidden/visible */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {isLocking ? t('confirmDialog.sections.willBeHidden') : t('confirmDialog.sections.willBeVisible')}
                </p>
                <div className="space-y-1.5">
                  {getHiddenItems(isLocking, t).map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 text-sm text-gray-700">
                      <Icon className={`w-4 h-4 flex-shrink-0 ${isLocking ? 'text-amber-500' : 'text-emerald-500'}`} />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Block 3: always available */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {t('confirmDialog.sections.alwaysAvailable')}
                </p>
                <div className="space-y-1.5">
                  {getAlwaysAvailableItems(t).map(({ icon: Icon, label }) => (
                    <div key={label} className="flex items-center gap-2.5 text-sm text-gray-500">
                      <Icon className="w-4 h-4 flex-shrink-0 text-gray-400" />
                      <span>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('confirmDialog.cancel')}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  isLocking
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                }`}
              >
                {isLocking ? t('confirmDialog.lock') : t('confirmDialog.unlock')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
