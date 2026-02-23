'use client';

import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/ui/utils';

interface LockShieldProps {
  isLocked: boolean;
  isToggling?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function LockShield({ isLocked, isToggling, onClick, size = 'md' }: LockShieldProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <button
      onClick={onClick}
      disabled={isToggling}
      role="switch"
      aria-checked={isLocked}
      aria-label={isLocked ? 'Ontgrendel dit item' : 'Vergrendel dit item'}
      className={cn(
        'inline-flex items-center gap-2 group',
        isToggling && 'opacity-60 cursor-wait',
      )}
    >
      <div
        className={cn(
          'relative w-14 h-7 rounded-full transition-colors duration-300 border',
          isLocked
            ? 'bg-amber-100 border-amber-300'
            : 'bg-gray-200 border-gray-300',
        )}
      >
        <motion.div
          animate={{ x: isLocked ? 28 : 2 }}
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            'absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full shadow-sm flex items-center justify-center',
            isLocked ? 'bg-amber-500' : 'bg-gray-500',
          )}
        >
          {isLocked ? (
            <ShieldAlert className="w-3 h-3 text-white" />
          ) : (
            <ShieldCheck className="w-3 h-3 text-white" />
          )}
        </motion.div>
      </div>
    </button>
  );
}
