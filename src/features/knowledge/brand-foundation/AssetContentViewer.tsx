"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BrandAssetWithRelations } from "@/types/brand-asset";
import { Edit, Check, Loader2 } from "lucide-react";
import { toStringArray, jsonToString } from "@/lib/json-render";

interface AssetContentViewerProps {
  asset: BrandAssetWithRelations;
  onSave?: (content: Record<string, unknown>) => Promise<void>;
  editable?: boolean;
}

export function AssetContentViewer({
  asset,
  onSave,
  editable = false,
}: AssetContentViewerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [editContent, setEditContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const content = asset.content as Record<string, unknown> | null;

  // Extract the main text content based on asset type
  const getMainText = useCallback((): string => {
    if (!content) return "";
    switch (asset.type) {
      case "MISSION":
      case "VISION":
      case "POSITIONING":
      case "PROMISE":
        return (content.statement as string) || "";
      case "VALUES": {
        const values = content.values;
        if (!Array.isArray(values)) return "";
        return values
          .map((v) => {
            if (typeof v === "string") return v;
            const obj = v as Record<string, unknown>;
            const name = (obj.name || obj.title || "") as string;
            const desc = (obj.description || obj.text || "") as string;
            return name && desc ? `${name}: ${desc}` : name || desc || jsonToString(v);
          })
          .join("\n\n");
      }
      case "STORY":
        return (content.narrative as string) || "";
      default:
        return typeof content === "string"
          ? content
          : JSON.stringify(content, null, 2);
    }
  }, [content, asset.type]);

  useEffect(() => {
    setEditContent(getMainText());
  }, [getMainText]);

  // Auto-save with debounce
  const debouncedSave = useCallback(
    (text: string) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        if (!onSave) return;
        setIsSaving(true);
        try {
          let newContent: Record<string, unknown>;
          switch (asset.type) {
            case "MISSION":
            case "VISION":
            case "POSITIONING":
            case "PROMISE":
              newContent = { ...content, statement: text };
              break;
            case "VALUES": {
              const values = text.split("\n\n").map((block) => {
                const colonIndex = block.indexOf(":");
                if (colonIndex > -1) {
                  return {
                    name: block.slice(0, colonIndex).trim(),
                    description: block.slice(colonIndex + 1).trim(),
                  };
                }
                return { name: block.trim(), description: "" };
              });
              newContent = { ...content, values };
              break;
            }
            case "STORY":
              newContent = { ...content, narrative: text };
              break;
            default:
              newContent = { text };
          }
          await onSave(newContent);
          setSavedAt(new Date());
        } finally {
          setIsSaving(false);
        }
      }, 1000);
    },
    [onSave, asset.type, content]
  );

  const handleEditChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setEditContent(text);
    debouncedSave(text);
  };

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditContent(getMainText());
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleStopEdit = () => {
    setIsEditing(false);
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current && isEditing) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [editContent, isEditing]);

  const mainText = getMainText();
  const typeLabel = asset.type.charAt(0) + asset.type.slice(1).toLowerCase();

  // Render helper fields (secondary content)
  const renderHelperFields = () => {
    if (!content) return null;

    const fields: { label: string; value: string }[] = [];

    switch (asset.type) {
      case "MISSION":
        if (content.purpose) fields.push({ label: "Purpose", value: content.purpose as string });
        if (content.impact) fields.push({ label: "Impact", value: content.impact as string });
        break;
      case "VISION":
        if (content.timeframe) fields.push({ label: "Timeframe", value: content.timeframe as string });
        if (content.aspirations) {
          fields.push({
            label: "Aspirations",
            value: toStringArray(content.aspirations).join(", "),
          });
        }
        break;
      case "POSITIONING":
        if (content.targetAudience) fields.push({ label: "Target Audience", value: content.targetAudience as string });
        if (content.differentiator) fields.push({ label: "Differentiator", value: content.differentiator as string });
        if (content.category) fields.push({ label: "Category", value: content.category as string });
        break;
      case "PROMISE":
        if (content.proof_points) {
          fields.push({
            label: "Proof Points",
            value: toStringArray(content.proof_points).join(", "),
          });
        }
        break;
      case "STORY":
        if (content.origin) fields.push({ label: "Origin", value: content.origin as string });
        break;
    }

    if (fields.length === 0) return null;

    return (
      <div className="mt-4 pt-4 border-t border-border-dark space-y-3">
        {fields.map((field) => (
          <div key={field.label}>
            <label className="text-xs font-medium text-text-dark/60 uppercase tracking-wide">
              {field.label}
            </label>
            <p className="text-sm text-text-dark mt-1">{field.value}</p>
          </div>
        ))}
      </div>
    );
  };

  return (
    <Card padding="lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-dark">
          {typeLabel} Statement
        </h3>
        <div className="flex items-center gap-2">
          {isSaving && (
            <span className="flex items-center gap-1.5 text-xs text-text-dark/60">
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
          {!isSaving && savedAt && (
            <span className="flex items-center gap-1.5 text-xs text-text-dark/40">
              <Check className="w-3 h-3" />
              Saved
            </span>
          )}
          {editable && !isEditing && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Edit className="w-3 h-3" />}
              onClick={handleStartEdit}
            >
              Edit
            </Button>
          )}
          {editable && isEditing && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Check className="w-3 h-3" />}
              onClick={handleStopEdit}
            >
              Done
            </Button>
          )}
        </div>
      </div>

      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={handleEditChange}
          className="w-full min-h-[120px] bg-surface-dark border border-border-dark rounded-lg p-4 text-text-dark text-base leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      ) : mainText ? (
        <div className="prose prose-sm prose-invert max-w-none">
          <p className="text-text-dark/80 whitespace-pre-wrap leading-relaxed">
            {mainText}
          </p>
        </div>
      ) : (
        <p className="text-text-dark/40 italic">
          No content yet. {editable ? "Click Edit to add content." : ""}
        </p>
      )}

      {!isEditing && renderHelperFields()}
    </Card>
  );
}
