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
        'group',
        isToggling && 'opacity-60 cursor-wait',
      )}
      style={{ display: 'inline-flex', alignItems: 'center' }}
    >
      <div
        style={{
          position: 'relative',
          width: 52,
          height: 28,
          borderRadius: 14,
          border: '2px solid',
          borderColor: isLocked ? '#f59e0b' : '#34d399',
          backgroundColor: isLocked ? '#fef3c7' : '#d1fae5',
          transition: 'all 0.3s ease',
          cursor: isToggling ? 'wait' : 'pointer',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 2,
            left: isLocked ? 24 : 2,
            width: 20,
            height: 20,
            borderRadius: 10,
            backgroundColor: isLocked ? '#f59e0b' : '#10b981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          }}
        >
          {isLocked ? (
            <ShieldAlert style={{ width: 12, height: 12, color: 'white' }} />
          ) : (
            <ShieldCheck style={{ width: 12, height: 12, color: 'white' }} />
          )}
        </div>
      </div>
    </button>
  );
}
