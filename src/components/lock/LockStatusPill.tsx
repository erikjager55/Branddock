'use client';

import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/components/ui/utils';

interface LockStatusPillProps {
  isLocked: boolean;
  lockedBy?: { id: string; name: string } | null;
  lockedAt?: string | null;
  className?: string;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60) return 'zojuist';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min geleden`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} uur geleden`;
  const days = Math.floor(hours / 24);
  return `${days} dag${days > 1 ? 'en' : ''} geleden`;
}

export function LockStatusPill({
  isLocked,
  lockedBy,
  lockedAt,
  className,
}: LockStatusPillProps) {
  const tooltipText =
    isLocked && lockedBy && lockedAt
      ? `Vergrendeld door ${lockedBy.name} — ${timeAgo(lockedAt)}`
      : undefined;

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      title={tooltipText}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors',
        isLocked
          ? 'bg-amber-50 text-amber-800 border-amber-200'
          : 'bg-emerald-50 text-emerald-800 border-emerald-200',
        className,
      )}
    >
      {isLocked ? (
        <ShieldAlert className="w-3.5 h-3.5" />
      ) : (
        <ShieldCheck className="w-3.5 h-3.5" />
      )}
      {isLocked ? 'Vergrendeld' : 'Bewerkbaar'}
    </motion.span>
  );
}
