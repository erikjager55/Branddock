'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderPlus, Package, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { Modal, Button, Badge } from '@/components/shared';
import { useSendAiImageToLibrary } from '@/features/media-library/hooks';
import { useProducts } from '@/features/products/hooks';
import type { GeneratedImageWithMeta } from '@/features/media-library/types/media.types';
import type { ProductListResponse } from '@/features/products/types/product.types';

// ─── Constants ──────────────────────────────────────────────

const MEDIA_CATEGORY_VALUES = [
  'HERO_IMAGE',
  'ADVERTISEMENT',
  'SOCIAL_MEDIA',
  'BANNER',
  'PRODUCT_PHOTO',
  'PHOTOGRAPHY',
  'ILLUSTRATION',
  'LIFESTYLE',
  'PRESENTATION',
  'BACKGROUND',
  'OTHER',
] as const;

const PRODUCT_IMAGE_CATEGORY_VALUES = [
  'HERO',
  'LIFESTYLE',
  'DETAIL',
  'FEATURE',
  'MOCKUP',
  'OTHER',
] as const;

interface SendToLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedImageWithMeta | null;
}

export function SendToLibraryModal({ isOpen, onClose, image }: SendToLibraryModalProps) {
  const { t } = useTranslation('media-library');
  const sendToLibrary = useSendAiImageToLibrary();
  const { data: products } = useProducts();

  const [category, setCategory] = useState('OTHER');
  const [linkToProduct, setLinkToProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productImageCategory, setProductImageCategory] = useState('OTHER');

  const handleClose = useCallback(() => {
    setCategory('OTHER');
    setLinkToProduct(false);
    setSelectedProductId('');
    setProductImageCategory('OTHER');
    sendToLibrary.reset();
    onClose();
  }, [onClose, sendToLibrary]);

  const handleSubmit = useCallback(() => {
    if (!image) return;
    sendToLibrary.mutate(
      {
        id: image.id,
        body: {
          category,
          ...(linkToProduct && selectedProductId
            ? { productId: selectedProductId, productImageCategory }
            : {}),
        },
      },
      { onSuccess: handleClose },
    );
  }, [image, category, linkToProduct, selectedProductId, productImageCategory, sendToLibrary, handleClose]);

  if (!image) return null;

  const productList = (products as ProductListResponse | undefined)?.products ?? [];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={t('sendToLibrary.title')} size="md">
      <div className="space-y-4">
        {/* Image preview */}
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          {image.fileUrl && (
            <img src={image.fileUrl} alt={image.name} className="w-16 h-16 rounded-lg object-cover" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{image.name}</p>
            <p className="text-xs text-gray-500 truncate">{image.prompt.slice(0, 80)}{image.prompt.length > 80 ? '...' : ''}</p>
          </div>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('meta.category')}</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            {MEDIA_CATEGORY_VALUES.map((c) => (
              <option key={c} value={c}>{t(`sendToLibrary.mediaCategories.${c}`)}</option>
            ))}
          </select>
        </div>

        {/* Auto-tags info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('sendToLibrary.autoTags')}</label>
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="teal">{t('badges.aiGenerated')}</Badge>
            <Badge variant="info">{image.provider === 'TRAINED_MODEL' ? 'Trained Model' : image.provider === 'IMAGEN' ? 'Imagen 4' : image.provider === 'DALLE' ? 'DALL-E 3' : image.provider}</Badge>
            {image.quality === 'hd' && <Badge>HD</Badge>}
            {image.style && <Badge>{image.style}</Badge>}
          </div>
        </div>

        {/* Collection info */}
        <div className="rounded-md bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700">
          <FolderPlus className="w-3.5 h-3.5 inline-block mr-1" />
          Will be added to the <span className="font-semibold">AI Generated Images</span> collection.
        </div>

        {/* Link to product toggle */}
        {productList.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setLinkToProduct(!linkToProduct)}
              className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              {linkToProduct ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              <Package className="w-4 h-4" />
              {t('sendToLibrary.linkToProduct')}
            </button>

            {linkToProduct && (
              <div className="mt-3 ml-6 space-y-3 pb-1">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('sendToLibrary.product')}</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="">{t('sendToLibrary.selectProduct')}</option>
                    {productList.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{t('sendToLibrary.productImageCategory')}</label>
                  <select
                    value={productImageCategory}
                    onChange={(e) => setProductImageCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {PRODUCT_IMAGE_CATEGORY_VALUES.map((c) => (
                      <option key={c} value={c}>{t(`sendToLibrary.productCategories.${c}`)}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error */}
        {sendToLibrary.isError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3" role="alert">
            <p className="text-sm text-red-700">
              {(sendToLibrary.error as Error)?.message || t('sendToLibrary.error')}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={sendToLibrary.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button
            icon={Check}
            onClick={handleSubmit}
            disabled={sendToLibrary.isPending}
            isLoading={sendToLibrary.isPending}
          >
            {sendToLibrary.isPending ? t('actions.saving') : t('actions.saveToLibrary')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
