'use client';

import { ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/components/ui/utils';

interface CardLockIndicatorProps {
  isLocked: boolean;
  className?: string;
}

export function CardLockIndicator({ isLocked, className }: CardLockIndicatorProps) {
  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.5, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          className={cn(
            'w-7 h-7 rounded-full bg-amber-100 border border-amber-200 flex items-center justify-center shadow-sm',
            className,
          )}
          title="Vergrendeld"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
