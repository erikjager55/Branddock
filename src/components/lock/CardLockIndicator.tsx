'use client';

import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/ui/utils';

interface CardLockIndicatorProps {
  isLocked: boolean;
  className?: string;
}

export function CardLockIndicator({ isLocked, className }: CardLockIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { scale: 1, opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shadow-sm',
            className,
          )}
          title="Locked"
          role="img"
          aria-label="Locked"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
