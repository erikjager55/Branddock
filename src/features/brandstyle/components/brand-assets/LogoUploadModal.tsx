"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Modal, Button } from "@/components/shared";
import { useUploadLogo } from "../../hooks/useBrandstyleHooks";
import type { LogoVariant } from "../../types/brandstyle.types";

interface LogoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetVariant?: LogoVariant;
}

const VARIANT_OPTIONS: { value: LogoVariant; label: string }[] = [
  { value: "PRIMARY", label: "Primary — main logo" },
  { value: "LIGHT", label: "On light — for dark backgrounds" },
  { value: "DARK", label: "On dark — for light backgrounds" },
  { value: "ICON", label: "Icon — monogram / favicon" },
  { value: "WORDMARK", label: "Wordmark — type-only version" },
  { value: "LOCKUP", label: "Lockup — logo with tagline" },
];

const ALLOWED_EXT = ["svg", "png", "jpg", "jpeg"];

export function LogoUploadModal(props: LogoUploadModalProps) {
  if (!props.isOpen) {
    return (
      <Modal isOpen={false} onClose={props.onClose} title="Upload logo" size="md">
        <div />
      </Modal>
    );
  }
  return <LogoUploadForm {...props} />;
}

function LogoUploadForm({ onClose, presetVariant }: LogoUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [variant, setVariant] = useState<LogoVariant>(presetVariant ?? "PRIMARY");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const uploadMut = useUploadLogo();

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      setError(`Unsupported logo type. Use ${ALLOWED_EXT.join(", ")}.`);
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File too large. Max 10MB.");
      return;
    }
    setFile(f);
  };

  const handleSubmit = () => {
    if (!file) {
      setError("Select a logo file.");
      return;
    }
    uploadMut.mutate(
      { file, variant, description: description.trim() || undefined },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err instanceof Error ? err.message : "Upload failed"),
      },
    );
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Upload logo"
      subtitle="Add a logo variant to your brand assets."
      size="md"
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={uploadMut.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={uploadMut.isPending}
            disabled={!file}
          >
            Upload
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <label
          className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
            file ? "border-emerald-300 bg-emerald-50/40" : "border-gray-300 hover:border-primary hover:bg-gray-50"
          }`}
        >
          <Upload className="h-6 w-6 text-gray-400" />
          {file ? (
            <>
              <p className="text-sm font-medium text-gray-900">{file.name}</p>
              <p className="text-xs text-gray-500">
                {(file.size / 1024).toFixed(1)} KB — click to replace
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700">Click to select a logo file</p>
              <p className="text-xs text-gray-500">{ALLOWED_EXT.join(", ")} · max 10MB</p>
            </>
          )}
          <input
            type="file"
            accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Variant</label>
          <select
            value={variant}
            onChange={(e) => setVariant(e.target.value as LogoVariant)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {VARIANT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Description <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Context where this variant should be used"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}
