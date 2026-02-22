'use client';

import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/components/ui/utils';

interface LockShieldProps {
  isLocked: boolean;
  isToggling?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
  entityName?: string;
  className?: string;
}

const SIZE_MAP = {
  sm: { button: 'w-8 h-8', icon: 'w-4 h-4' },
  md: { button: 'w-10 h-10', icon: 'w-5 h-5' },
  lg: { button: 'w-12 h-12', icon: 'w-6 h-6' },
};

export function LockShield({
  isLocked,
  isToggling = false,
  onClick,
  size = 'md',
  entityName,
  className,
}: LockShieldProps) {
  const { button: buttonSize, icon: iconSize } = SIZE_MAP[size];
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.button
      onClick={onClick}
      disabled={isToggling}
      whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      style={{ willChange: 'transform' }}
      className={cn(
        'relative rounded-xl flex items-center justify-center transition-colors overflow-hidden',
        buttonSize,
        isLocked
          ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
        isToggling && 'opacity-60 cursor-wait',
        className,
      )}
      aria-label={isLocked ? `Ontgrendel ${entityName || 'item'}` : `Vergrendel ${entityName || 'item'}`}
      aria-pressed={isLocked}
    >
      {/* Shimmer sweep — hidden when user prefers reduced motion */}
      {!prefersReducedMotion && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          initial={{ x: '-100%' }}
          animate={isToggling ? { x: '100%' } : { x: '-100%' }}
          transition={isToggling ? { duration: 0.8, repeat: Infinity } : { duration: 0 }}
        />
      )}

      {/* Icon swap */}
      <AnimatePresence mode="wait">
        <motion.div
          key={isLocked ? 'locked' : 'unlocked'}
          initial={prefersReducedMotion ? { opacity: 0 } : { rotate: isLocked ? 20 : -20, opacity: 0, scale: 0.8 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { rotate: 0, opacity: 1, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { rotate: isLocked ? -20 : 20, opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
          {isLocked ? (
            <ShieldAlert className={iconSize} />
          ) : (
            <ShieldCheck className={iconSize} />
          )}
        </motion.div>
      </AnimatePresence>
    </motion.button>
  );
}
