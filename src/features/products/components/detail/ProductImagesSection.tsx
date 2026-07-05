"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ImagePlus, Pencil, Trash2 } from "lucide-react";
import { Button, Badge, EmptyState } from "@/components/shared";
import { Select } from "@/components/shared";
import { useUpdateProductImage, useDeleteProductImage } from "../../hooks";
import { IMAGE_CATEGORY_OPTIONS, IMAGE_CATEGORY_SELECT_OPTIONS } from "../../constants/product-constants";
import type { ProductImage } from "../../types/product.types";

// ─── Component ────────────────────────────────────────────

interface ProductImagesSectionProps {
  images: ProductImage[];
  productId: string;
  isEditing?: boolean;
  isLocked?: boolean;
  onAddImage: () => void;
}

export function ProductImagesSection({
  images,
  productId,
  isEditing = false,
  isLocked = false,
  onAddImage,
}: ProductImagesSectionProps) {
  const { t } = useTranslation(["products", "products-registry"]);
  const updateImage = useUpdateProductImage(productId);
  const deleteImage = useDeleteProductImage(productId);
  const [editingImageId, setEditingImageId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const imageCategoryOptions = useMemo(
    () =>
      IMAGE_CATEGORY_SELECT_OPTIONS.map((opt) => ({
        value: opt.value,
        label: t(`products-registry:imageCategory.${opt.value}`, { defaultValue: opt.label }),
      })),
    [t],
  );

  const handleCategoryChange = (imageId: string, category: string | null) => {
    if (!category) return;
    // Safe cast: Select options are constrained to IMAGE_CATEGORY_SELECT_OPTIONS values
    updateImage.mutate({ imageId, category: category as import("../../types/product.types").ProductImageCategory });
  };

  const handleDelete = (imageId: string) => {
    if (!window.confirm(t("images.confirmDelete"))) return;
    setDeleteError(null);
    deleteImage.mutate(imageId, {
      onError: (err) => {
        const message = err instanceof Error ? err.message : t("images.deleteFailed");
        setDeleteError(message);
      },
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-gray-900">
            {t("images.title")}
          </h2>
          {images.length > 0 && (
            <Badge variant="default">{images.length}</Badge>
          )}
        </div>
        {!isLocked && (
          <Button
            variant="secondary"
            size="sm"
            icon={ImagePlus}
            onClick={onAddImage}
          >
            {t("actions.addImage")}
          </Button>
        )}
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {deleteError}
        </div>
      )}

      {/* Grid */}
      {images.length === 0 ? (
        <EmptyState
          icon={ImagePlus}
          title={t("images.empty.title")}
          description={t("images.empty.description")}
          action={isLocked ? undefined : { label: t("actions.addImage"), onClick: onAddImage }}
        />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {images.map((image) => (
            <div
              key={image.id}
              className="group relative overflow-hidden rounded-lg border border-gray-200 bg-white"
            >
              {/* Thumbnail */}
              <div className="relative" style={{ aspectRatio: "4/3" }}>
                <img
                  src={image.url}
                  alt={image.altText ?? t("images.imageAlt")}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />

                {/* Hover overlay with actions (hidden when locked) */}
                {!isLocked && (
                  <div className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/40 transition-opacity ${
                    isEditing ? "opacity-0 group-hover:opacity-100 focus-within:opacity-100" : "opacity-0 group-hover:opacity-100"
                  }`}>
                    {isEditing && (
                      <button
                        aria-label={t("images.editCategory")}
                        onClick={() =>
                          setEditingImageId(
                            editingImageId === image.id ? null : image.id,
                          )
                        }
                        className="rounded-full bg-white p-2 text-gray-700 shadow-sm hover:bg-gray-100 transition-colors"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      aria-label={t("images.deleteImage")}
                      onClick={() => handleDelete(image.id)}
                      className="rounded-full bg-white p-2 text-red-600 shadow-sm hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Category badge */}
              <div className="p-2">
                {editingImageId === image.id && isEditing ? (
                  <Select
                    value={image.category}
                    onChange={(val) => {
                      handleCategoryChange(image.id, val);
                      setEditingImageId(null);
                    }}
                    options={imageCategoryOptions}
                    placeholder={t("fields.categoryShort")}
                  />
                ) : (
                  <Badge variant="default">
                    {image.category
                      ? t(`products-registry:imageCategory.${image.category}`, {
                          defaultValue:
                            IMAGE_CATEGORY_OPTIONS.find((c) => c.value === image.category)
                              ?.label ?? image.category,
                        })
                      : image.category}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
