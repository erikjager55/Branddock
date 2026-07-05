'use client';

import { useTranslation } from 'react-i18next';
import { useFormat } from '@/lib/ui-i18n/format';
import { Heart, Trash2, Image, FileText, Video, Music } from 'lucide-react';
import { MEDIA_TYPE_ICONS, MEDIA_CATEGORY_CONFIG, formatFileSize } from '../constants/media-constants';
import type { MediaAssetWithMeta } from '../types/media.types';
import { getPreviewImageUrl } from '../utils/preview-url';

interface MediaCardListProps {
  assets: MediaAssetWithMeta[];
  onSelect: (id: string) => void;
  onFavorite: (id: string) => void;
  onDelete: (id: string) => void;
}

/** Fallback icon map keyed by media type for assets without a thumbnail. */
const FALLBACK_ICONS: Record<string, typeof Image> = {
  IMAGE: Image,
  DOCUMENT: FileText,
  VIDEO: Video,
  AUDIO: Music,
};

/** Table-style list view of media assets. */
export function MediaCardList({ assets, onSelect, onFavorite, onDelete }: MediaCardListProps) {
  const { t } = useTranslation(['media-library', 'media-registry']);
  const { formatDate } = useFormat();
  return (
    <div>
      {/* Header row */}
      <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-gray-500 uppercase border-b">
        <div className="col-span-4">{t('list.name')}</div>
        <div className="col-span-2">{t('list.type')}</div>
        <div className="col-span-2">{t('list.category')}</div>
        <div className="col-span-1">{t('list.size')}</div>
        <div className="col-span-2">{t('list.date')}</div>
        <div className="col-span-1">{t('list.actions')}</div>
      </div>

      {/* Asset rows */}
      {assets.map((asset) => {
        const typeConfig = MEDIA_TYPE_ICONS[asset.mediaType];
        const categoryConfig = MEDIA_CATEGORY_CONFIG[asset.category];
        const FallbackIcon = FALLBACK_ICONS[asset.mediaType] ?? Image;

        return (
          <div
            key={asset.id}
            className="grid grid-cols-12 gap-4 px-4 py-3 items-center border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            onClick={() => onSelect(asset.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(asset.id);
              }
            }}
          >
            {/* Name */}
            <div className="col-span-4 flex items-center gap-3 min-w-0">
              {(() => {
                const previewUrl = getPreviewImageUrl(asset);
                return previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={asset.name}
                    loading="lazy"
                    className="h-10 w-10 rounded object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <FallbackIcon className={`w-5 h-5 ${typeConfig.color}`} />
                  </div>
                );
              })()}
              <span className="text-sm font-medium text-gray-900 truncate">{asset.name}</span>
            </div>

            {/* Type badge */}
            <div className="col-span-2">
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 ${typeConfig.color}`}
              >
                <typeConfig.icon className="w-3 h-3" />
                {t(`media-registry:type.${asset.mediaType}`, { defaultValue: typeConfig.label })}
              </span>
            </div>

            {/* Category */}
            <div className="col-span-2">
              <span className="text-sm text-gray-600">{t(`media-registry:category.${asset.category}`, { defaultValue: categoryConfig.label })}</span>
            </div>

            {/* Size */}
            <div className="col-span-1">
              <span className="text-sm text-gray-500">{formatFileSize(asset.fileSize)}</span>
            </div>

            {/* Date */}
            <div className="col-span-2">
              <span className="text-sm text-gray-500">{formatDate(asset.createdAt, {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}</span>
            </div>

            {/* Actions */}
            <div className="col-span-1 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onFavorite(asset.id);
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label={asset.isFavorite ? t('actions.removeFavorite') : t('actions.addFavorite')}
              >
                <Heart
                  className={`w-4 h-4 ${
                    asset.isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
                  }`}
                />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(asset.id);
                }}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                aria-label={t('actions.deleteAsset')}
              >
                <Trash2 className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
