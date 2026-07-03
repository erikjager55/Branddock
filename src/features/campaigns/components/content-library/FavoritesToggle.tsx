"use client";

import React from "react";
import { Heart } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useContentLibraryStore } from "../../stores/useContentLibraryStore";

// ─── Component ────────────────────────────────────────────

export function FavoritesToggle() {
  const { t } = useTranslation("campaigns-content-library");
  const showFavorites = useContentLibraryStore((s) => s.showFavorites);
  const toggleShowFavorites = useContentLibraryStore(
    (s) => s.toggleShowFavorites,
  );

  return (
    <button
      type="button"
      onClick={toggleShowFavorites}
      className={`p-1.5 rounded-lg transition-colors ${
        showFavorites
          ? "bg-red-50 text-red-500"
          : "bg-white text-gray-400 hover:text-gray-600 hover:bg-gray-50 border border-gray-200"
      }`}
      title={showFavorites ? t("favorites.showAll") : t("favorites.showFavorites")}
    >
      <Heart
        className="w-4 h-4"
        fill={showFavorites ? "currentColor" : "none"}
      />
    </button>
  );
}

export default FavoritesToggle;
