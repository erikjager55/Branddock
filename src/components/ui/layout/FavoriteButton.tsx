import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ICON_SIZES } from '@/lib/constants/design-tokens';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function FavoriteButton({ isFavorite, onToggle, size = 'sm', className }: FavoriteButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className={cn(
        'transition-colors',
        isFavorite
          ? 'text-red-500 hover:text-red-600'
          : 'text-muted-foreground hover:text-red-400',
        className
      )}
      aria-label={isFavorite ? 'Verwijder uit favorieten' : 'Toevoegen aan favorieten'}
    >
      <Heart
        className={size === 'sm' ? ICON_SIZES.sm : ICON_SIZES.md}
        fill={isFavorite ? 'currentColor' : 'none'}
      />
    </button>
  );
}
