"use client";

import { useState } from "react";
import { ImagePlus, Link, Upload } from "lucide-react";
import { Modal, Button, Input } from "@/components/shared";
import { Select } from "@/components/shared";
import { useAddProductImage } from "../../hooks";
import { IMAGE_CATEGORY_SELECT_OPTIONS } from "../../constants/product-constants";

type TabId = "url" | "upload";

// ─── Component ────────────────────────────────────────────

interface AddImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
}

export function AddImageModal({
  isOpen,
  onClose,
  productId,
}: AddImageModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("url");
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  // Safe cast: Select options are constrained to IMAGE_CATEGORY_SELECT_OPTIONS values
  const [altText, setAltText] = useState("");
  const [previewError, setPreviewError] = useState(false);

  const addImage = useAddProductImage(productId);

  const handleSubmit = () => {
    if (!url.trim()) return;

    addImage.mutate(
      {
        url: url.trim(),
        category: (category ?? undefined) as import("../../types/product.types").ProductImageCategory | undefined,
        altText: altText.trim() || undefined,
      },
      {
        onSuccess: () => {
          handleReset();
          onClose();
        },
      },
    );
  };

  const handleReset = () => {
    setUrl("");
    setCategory(null);
    setAltText("");
    setPreviewError(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isValidUrl =
    url.trim().startsWith("https://") || url.trim().startsWith("http://");

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Product Image" size="md">
      {/* Tab header */}
      <div className="flex gap-4 border-b border-gray-200 mb-4">
        <button
          onClick={() => setActiveTab("url")}
          className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${
            activeTab === "url"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Link className="h-4 w-4" />
          Image URL
        </button>
        <button
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors ${
            activeTab === "upload"
              ? "border-b-2 border-primary text-primary"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {activeTab === "url" ? (
        <div className="space-y-4">
          {/* URL input */}
          <Input
            label="Image URL"
            placeholder="https://example.com/product-image.jpg"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              setPreviewError(false);
            }}
            required
          />

          {/* Live preview */}
          {isValidUrl && (
            <div className="rounded-lg border border-gray-200 p-2">
              <p className="text-xs text-gray-500 mb-2">Preview</p>
              {previewError ? (
                <div className="flex h-32 items-center justify-center rounded bg-gray-50 text-sm text-gray-400">
                  Could not load image
                </div>
              ) : (
                <img
                  src={url}
                  alt="Preview"
                  className="h-32 w-full rounded object-contain bg-gray-50"
                  onError={() => setPreviewError(true)}
                />
              )}
            </div>
          )}

          {/* Category */}
          <Select
            label="Category"
            value={category}
            onChange={setCategory}
            options={IMAGE_CATEGORY_SELECT_OPTIONS}
            placeholder="Select category..."
          />

          {/* Alt text */}
          <Input
            label="Alt Text"
            placeholder="Describe the image..."
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={ImagePlus}
              onClick={handleSubmit}
              disabled={!isValidUrl}
              isLoading={addImage.isPending}
            >
              Add Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upload placeholder */}
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
            <Upload className="h-10 w-10 text-gray-400 mb-3" />
            <p className="text-sm font-medium text-gray-700">
              Drag & drop an image here
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, WEBP up to 5MB
            </p>
            <p className="text-xs text-gray-400 mt-4">
              File upload coming soon — use Image URL tab for now
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
