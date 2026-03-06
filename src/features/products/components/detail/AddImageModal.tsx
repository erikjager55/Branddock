"use client";

import { useState, useRef, useCallback } from "react";
import { ImagePlus, Link, Upload, X } from "lucide-react";
import { Modal, Button, Input } from "@/components/shared";
import { Select } from "@/components/shared";
import { useAddProductImage, useUploadProductImage } from "../../hooks";
import { IMAGE_CATEGORY_SELECT_OPTIONS } from "../../constants/product-constants";

type TabId = "url" | "upload";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

  // URL tab state
  const [url, setUrl] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [altText, setAltText] = useState("");
  const [previewError, setPreviewError] = useState(false);

  // Upload tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string | null>(null);
  const [uploadAltText, setUploadAltText] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addImage = useAddProductImage(productId);
  const uploadImage = useUploadProductImage(productId);

  // ─── URL Tab handlers ──────────────────────────────────

  const handleUrlSubmit = () => {
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

  // ─── Upload Tab handlers ───────────────────────────────

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "Invalid file type. Allowed: PNG, JPG, WEBP";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "File too large (max 5MB)";
    }
    return null;
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      setFilePreview(null);
      return;
    }

    setFileError(null);
    setSelectedFile(file);

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setFilePreview(objectUrl);
  }, [validateFile]);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const clearSelectedFile = () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    setFileError(null);
  };

  const handleUploadSubmit = () => {
    if (!selectedFile) return;

    uploadImage.mutate(
      {
        file: selectedFile,
        category: uploadCategory ?? undefined,
        altText: uploadAltText.trim() || undefined,
      },
      {
        onSuccess: () => {
          handleReset();
          onClose();
        },
      },
    );
  };

  // ─── Shared handlers ──────────────────────────────────

  const handleReset = () => {
    setUrl("");
    setCategory(null);
    setAltText("");
    setPreviewError(false);
    if (filePreview) URL.revokeObjectURL(filePreview);
    setSelectedFile(null);
    setFilePreview(null);
    setUploadCategory(null);
    setUploadAltText("");
    setDragOver(false);
    setFileError(null);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const isValidUrl =
    url.trim().startsWith("https://") || url.trim().startsWith("http://");

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Product Image" size="md" className="mt-6">
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
              onClick={handleUrlSubmit}
              disabled={!isValidUrl}
              isLoading={addImage.isPending}
            >
              Add Image
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Drop zone or preview */}
          {selectedFile && filePreview ? (
            <div className="relative rounded-lg border border-gray-200 p-2">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500 truncate flex-1">
                  {selectedFile.name} ({(selectedFile.size / 1024).toFixed(0)} KB)
                </p>
                <button
                  onClick={clearSelectedFile}
                  className="ml-2 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <img
                src={filePreview}
                alt="Preview"
                className="h-40 w-full rounded object-contain bg-gray-50"
              />
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                dragOver
                  ? "border-primary bg-emerald-50"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <Upload className={`h-10 w-10 mb-3 ${dragOver ? "text-primary" : "text-gray-400"}`} />
              <p className="text-sm font-medium text-gray-700">
                Drag & drop an image here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                or click to browse
              </p>
              <p className="text-xs text-gray-400 mt-2">
                PNG, JPG, WEBP up to 5MB
              </p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* File error */}
          {fileError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {fileError}
            </div>
          )}

          {/* Upload error from API */}
          {uploadImage.isError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              {uploadImage.error.message}
            </div>
          )}

          {/* Category */}
          <Select
            label="Category"
            value={uploadCategory}
            onChange={setUploadCategory}
            options={IMAGE_CATEGORY_SELECT_OPTIONS}
            placeholder="Select category..."
          />

          {/* Alt text */}
          <Input
            label="Alt Text"
            placeholder="Describe the image..."
            value={uploadAltText}
            onChange={(e) => setUploadAltText(e.target.value)}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              icon={ImagePlus}
              onClick={handleUploadSubmit}
              disabled={!selectedFile}
              isLoading={uploadImage.isPending}
            >
              Upload Image
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
