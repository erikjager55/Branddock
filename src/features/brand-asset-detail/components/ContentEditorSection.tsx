"use client";

import { Pencil, Sparkles } from "lucide-react";
import { Button, Card } from "@/components/shared";
import { ContentEditMode } from "./ContentEditMode";
import { useBrandAssetDetailStore } from "../store/useBrandAssetDetailStore";
import { useRegenerateContent } from "../hooks/useBrandAssetDetail";
import type { BrandAssetDetail } from "../types/brand-asset-detail.types";

interface ContentEditorSectionProps {
  asset: BrandAssetDetail;
  isLocked: boolean;
  showRegenerate: boolean;
}

export function ContentEditorSection({
  asset,
  isLocked,
  showRegenerate,
}: ContentEditorSectionProps) {
  const isEditing = useBrandAssetDetailStore((s) => s.isEditing);
  const setIsEditing = useBrandAssetDetailStore((s) => s.setIsEditing);
  const regenerate = useRegenerateContent(asset.id);

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
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Content</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={Pencil}
              onClick={() => setIsEditing(true)}
              disabled={isLocked}
            >
              Edit
            </Button>
            {showRegenerate && (
              <Button
                variant="ghost"
                size="sm"
                icon={Sparkles}
                onClick={() => regenerate.mutate(undefined)}
                isLoading={regenerate.isPending}
                disabled={isLocked}
              >
                Regenerate
              </Button>
            )}
          </div>
        </div>
      </Card.Header>
      <Card.Body>
        {contentStr ? (
          <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
            {contentStr}
          </p>
        ) : (
          <p className="text-gray-400 italic">
            No content yet. Click Edit or Regenerate to add content.
          </p>
        )}
      </Card.Body>
    </Card>
  );
}
