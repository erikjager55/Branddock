import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { SELECTION_STATES, ICON_SIZES } from '@/lib/constants/design-tokens';
import type { LucideIcon } from 'lucide-react';

interface SelectionCardProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  selected?: boolean;
  onSelect: () => void;
  /** Extra badges of metadata onder subtitle */
  badges?: ReactNode;
  /** Radio = single select, checkbox = multi select */
  selectionMode?: 'radio' | 'checkbox';
  /** Extra content in de card */
  children?: ReactNode;
  className?: string;
}

export function SelectionCard({
  icon: Icon, title, subtitle, selected = false, onSelect,
  badges, selectionMode = 'radio', children, className,
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        selected ? SELECTION_STATES.selected : SELECTION_STATES.default,
        className
      )}
    >
      <div className="flex items-start gap-3 text-left">
        {Icon && (
          <div className="flex-shrink-0 mt-0.5">
            <Icon className={cn(ICON_SIZES.lg, selected ? 'text-primary' : 'text-muted-foreground')} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium', selected ? 'text-foreground' : 'text-foreground')}>
            {title}
          </p>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
          {badges && <div className="mt-2">{badges}</div>}
          {children}
        </div>
        {/* Selection indicator */}
        <div className={cn(
          'flex-shrink-0 h-5 w-5 border-2 flex items-center justify-center mt-0.5',
          selectionMode === 'radio' ? 'rounded-full' : 'rounded-md',
          selected
            ? 'border-primary bg-primary text-white'
            : 'border-muted-foreground/30'
        )}>
          {selected && <Check className="h-3 w-3" />}
        </div>
      </div>
    </button>
  );
}
