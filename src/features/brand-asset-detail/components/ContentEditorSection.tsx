"use client";

import { FileText } from "lucide-react";
import { ContentEditMode } from "./ContentEditMode";
import { useBrandAssetDetailStore } from "../store/useBrandAssetDetailStore";
import type { BrandAssetDetail } from "../types/brand-asset-detail.types";

interface ContentEditorSectionProps {
  asset: BrandAssetDetail;
  isLocked: boolean;
  isEditing: boolean;
}

export function ContentEditorSection({
  asset,
  isLocked,
  isEditing,
}: ContentEditorSectionProps) {
  const setIsEditing = useBrandAssetDetailStore((s) => s.setIsEditing);

  const contentStr =
    typeof asset.content === "string"
      ? asset.content
      : asset.content
        ? JSON.stringify(asset.content)
        : "";

  if (isEditing) {
    return (
      <ContentEditMode
        assetId={asset.id}
        initialContent={contentStr}
        onCancel={() => setIsEditing(false)}
        onSaved={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
          <FileText className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Content</h3>
          <p className="text-sm text-gray-500">Define the core content for this asset</p>
        </div>
      </div>

      {contentStr ? (
        <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
          {contentStr}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-lg p-4 text-gray-500 text-sm">
          No content defined yet. Click &quot;Edit&quot; in the header to add content.
        </div>
      )}
    </div>
  );
}
