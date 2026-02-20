'use client';

import { Heart } from 'lucide-react';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
}

export function FavoriteButton({ isFavorite, onToggle }: FavoriteButtonProps) {
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
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
    </button>
  );
}
