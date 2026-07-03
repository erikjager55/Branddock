'use client';

import { Heart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
}

export function FavoriteButton({ isFavorite, onToggle }: FavoriteButtonProps) {
  const { t } = useTranslation('knowledge-library');
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      data-testid="favorite-button"
      className={`p-1 rounded transition-colors ${
        isFavorite
          ? 'text-red-500'
          : 'text-gray-300 hover:text-red-400'
      }`}
      aria-label={isFavorite ? t('favorite.remove') : t('favorite.add')}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
    </button>
  );
}
