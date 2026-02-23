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

  const sizes = {
    sm: { track: 'w-14 h-7', thumb: 'w-5 h-5', icon: 'w-3 h-3', translate: 'translate-x-7', label: 'text-xs' },
    md: { track: 'w-16 h-8', thumb: 'w-6 h-6', icon: 'w-3.5 h-3.5', translate: 'translate-x-8', label: 'text-sm' },
    lg: { track: 'w-18 h-9', thumb: 'w-7 h-7', icon: 'w-4 h-4', translate: 'translate-x-9', label: 'text-sm' },
  };

  const s = sizes[size];

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
      {/* Track */}
      <div
        className={cn(
          s.track,
          'relative rounded-full transition-colors duration-300 border',
          isLocked
            ? 'bg-amber-100 border-amber-300'
            : 'bg-emerald-100 border-emerald-300',
        )}
      >
        {/* Thumb */}
        <motion.div
          layout
          transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
          className={cn(
            s.thumb,
            'absolute top-1/2 -translate-y-1/2 rounded-full shadow-sm flex items-center justify-center',
            isLocked
              ? 'left-[calc(100%-4px)] -translate-x-full bg-amber-500'
              : 'left-1 bg-emerald-500',
          )}
        >
          {isLocked ? (
            <ShieldAlert className={cn(s.icon, 'text-white')} />
          ) : (
            <ShieldCheck className={cn(s.icon, 'text-white')} />
          )}
        </motion.div>
      </div>
    </button>
  );
}
