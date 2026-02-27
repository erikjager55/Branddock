'use client';

import { ShieldAlert, ShieldCheck, Pencil, Trash2, Sparkles, MessageCircle, Eye, EyeOff, Copy, Download } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useCallback } from 'react';

type LockEntityType = 'persona' | 'brand-asset';

interface LockConfirmDialogProps {
  isOpen: boolean;
  isLocking: boolean;
  entityName: string;
  entityType?: LockEntityType;
  onConfirm: () => void;
  onCancel: () => void;
}

function getLockBlockedItems(entityType: LockEntityType) {
  const items = [
    { icon: Pencil, label: 'Edit content' },
  ];
  // Brand assets cannot be deleted — only show delete for other entity types
  if (entityType !== 'brand-asset') {
    items.push({ icon: Trash2, label: 'Delete item' });
  }
  items.push(
    { icon: Sparkles, label: 'AI generation & regeneration' },
    { icon: MessageCircle, label: entityType === 'brand-asset' ? 'Start AI Exploration' : 'Start new conversation' },
    { icon: Pencil, label: 'Start research methods' },
  );
  return items;
}

const LOCK_HIDDEN = [
  { icon: EyeOff, label: 'Empty/incomplete sections' },
  { icon: EyeOff, label: 'AI tools & generation buttons' },
];

const UNLOCK_VISIBLE = [
  { icon: Eye, label: 'Empty/incomplete sections' },
  { icon: Eye, label: 'AI tools & generation buttons' },
];

const ALWAYS_AVAILABLE = [
  { icon: Copy, label: 'Duplicate (creates unlocked copy)' },
  { icon: Download, label: 'Export (PDF, JSON)' },
  { icon: Eye, label: 'View completed sections' },
];

export function LockConfirmDialog({
  isOpen,
  isLocking,
  entityName,
  entityType = 'persona',
  onConfirm,
  onCancel,
}: LockConfirmDialogProps) {
  const blockedItems = getLockBlockedItems(entityType);
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
            aria-label={isLocking ? `Lock ${entityName}` : `Unlock ${entityName}`}
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
                  {isLocking ? 'Lock item' : 'Unlock item'}
                </h2>
                <p className="text-sm text-gray-500">{entityName}</p>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-4 space-y-4">
              {/* Block 1: blocked/enabled */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {isLocking ? 'Will be blocked' : 'Will be enabled'}
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
                  {isLocking ? 'Will be hidden' : 'Will be visible'}
                </p>
                <div className="space-y-1.5">
                  {(isLocking ? LOCK_HIDDEN : UNLOCK_VISIBLE).map(({ icon: Icon, label }) => (
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
                  Always available
                </p>
                <div className="space-y-1.5">
                  {ALWAYS_AVAILABLE.map(({ icon: Icon, label }) => (
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
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                  isLocking
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700'
                }`}
              >
                {isLocking ? 'Lock' : 'Unlock'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
