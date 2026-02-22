'use client';

import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/utils';

interface LockBannerProps {
  isLocked: boolean;
  onUnlock: () => void;
  lockedBy?: { id: string; name: string } | null;
  className?: string;
}

export function LockBanner({
  isLocked,
  onUnlock,
  lockedBy,
  className,
}: LockBannerProps) {
  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="overflow-hidden"
        >
          <div
            className={cn(
              'flex items-center justify-between gap-3 px-4 py-3 rounded-xl',
              'bg-amber-50 border border-amber-200',
              className,
            )}
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-3 min-w-0">
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="flex-shrink-0"
              >
                <ShieldAlert className="w-5 h-5 text-amber-600" />
              </motion.div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-900">
                  Dit item is vergrendeld
                </p>
                {lockedBy && (
                  <p className="text-xs text-amber-700 truncate">
                    Vergrendeld door {lockedBy.name}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onUnlock}
              className="flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/70 backdrop-blur-sm border border-amber-300 text-amber-800 hover:bg-white transition-colors"
            >
              Ontgrendel
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
