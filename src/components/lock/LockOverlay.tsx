'use client';

import { Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/utils';

interface LockOverlayProps {
  isLocked: boolean;
  children: React.ReactNode;
  className?: string;
}

export function LockOverlay({ isLocked, children, className }: LockOverlayProps) {
  return (
    <div className={cn('relative', className)} aria-disabled={isLocked || undefined}>
      {children}

      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 z-10 rounded-xl bg-amber-50/30 backdrop-blur-[0.5px] cursor-not-allowed flex items-center justify-center"
          >
            <motion.div
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="w-8 h-8 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shadow-sm"
            >
              <Lock className="w-4 h-4 text-amber-600" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
