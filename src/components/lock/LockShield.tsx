'use client';

import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { cn } from '@/components/ui/utils';

interface LockShieldProps {
  isLocked: boolean;
  isToggling?: boolean;
  onClick: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function LockShield({ isLocked, isToggling, onClick }: LockShieldProps) {
  return (
    <button
      onClick={onClick}
      disabled={isToggling}
      role="switch"
      aria-checked={isLocked}
      aria-label={isLocked ? 'Unlock this item' : 'Lock this item'}
      className={cn(
        'relative inline-flex h-8 w-[52px] items-center rounded-full border-2 transition-all duration-300 ease-in-out cursor-pointer',
        isLocked
          ? 'bg-amber-100 border-amber-400'
          : 'bg-emerald-100 border-emerald-400',
        isToggling && 'opacity-60 cursor-wait',
      )}
    >
      <span
        className={cn(
          'inline-flex h-6 w-6 items-center justify-center rounded-full shadow-md transition-all duration-300 ease-in-out',
          isLocked
            ? 'translate-x-[22px] bg-amber-500'
            : 'translate-x-[2px] bg-emerald-500',
        )}
      >
        {isLocked ? (
          <ShieldAlert className="w-3.5 h-3.5 text-white" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5 text-white" />
        )}
      </span>
    </button>
  );
}
