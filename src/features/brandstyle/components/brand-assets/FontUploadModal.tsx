"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { Modal, Button } from "@/components/shared";
import { useUploadFont } from "../../hooks/useBrandstyleHooks";
import type { FontRole } from "../../types/brandstyle.types";

interface FontUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName?: string;
  presetRole?: FontRole;
}

const ROLE_OPTIONS: { value: FontRole; label: string }[] = [
  { value: "DISPLAY", label: "Display type (headlines)" },
  { value: "UI", label: "UI type (body, buttons)" },
  { value: "EYEBROW_META", label: "Eyebrow & meta (labels, captions)" },
  { value: "BODY", label: "Body (long-form copy)" },
];

const ALLOWED_EXT = ["woff2", "woff", "ttf", "otf"];

/**
 * Wrapper that only renders the form body when open, so local state resets
 * via remount rather than a state-in-effect reset cascade.
 */
export function FontUploadModal(props: FontUploadModalProps) {
  if (!props.isOpen) {
    return (
      <Modal isOpen={false} onClose={props.onClose} title="Upload font" size="md">
        <div />
      </Modal>
    );
  }
  return <FontUploadForm {...props} />;
}

function FontUploadForm({ onClose, presetName, presetRole }: FontUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState(presetName ?? "");
  const [role, setRole] = useState<FontRole>(presetRole ?? "UI");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  const uploadMut = useUploadFont();

  const handleFile = (f: File | null) => {
    setError(null);
    if (!f) {
      setFile(null);
      return;
    }
    const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      setError(`Unsupported font type. Use ${ALLOWED_EXT.join(", ")}.`);
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File too large. Max 5MB.");
      return;
    }
    setFile(f);
    // Derive a default name from the filename if empty
    if (!name.trim()) {
      const base = f.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
      setName(base);
    }
  };

  const handleSubmit = () => {
    if (!file || !name.trim()) {
      setError("Upload a file and give it a name.");
      return;
    }
    uploadMut.mutate(
      { file, name: name.trim(), role, weight: weight.trim() || undefined },
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
      title="Upload font"
      subtitle="Brand type file that will be used in previews and exports."
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
            disabled={!file || !name.trim()}
          >
            Upload
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Drag-drop zone */}
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
              <p className="text-sm text-gray-700">Click to select a font file</p>
              <p className="text-xs text-gray-500">{ALLOWED_EXT.join(", ")} · max 5MB</p>
            </>
          )}
          <input
            type="file"
            accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>

        {/* Name */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Font name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Poppins"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as FontRole)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {ROLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Weight */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Weight <span className="text-gray-400">(optional)</span>
          </label>
          <input
            type="text"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 400 or 400,700"
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
