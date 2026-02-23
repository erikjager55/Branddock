'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/ui/utils';

interface LockOverlayProps {
  isLocked: boolean;
  children: React.ReactNode;
  className?: string;
}

export function LockOverlay({ isLocked, children, className }: LockOverlayProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={cn('relative', className)} aria-disabled={isLocked || undefined}>
      {children}

      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            aria-hidden="true"
            className="absolute inset-0 z-10 rounded-xl bg-amber-50/20 cursor-not-allowed"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
